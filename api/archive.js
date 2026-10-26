import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {validArchive,validObject,validArchiveId} from '../archive-schema.js';
const bucket='asterion-art';
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
function config(){const url=process.env.SUPABASE_URL;return !!(url&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.GAME_ACCESS_CODE);}
function imageData(data){
 if(typeof data!=='string'||data.length>4100000)return null;
 const m=data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!m)return null;
 const bytes=Buffer.from(m[2],'base64');if(bytes.length>3050000||bytes.toString('base64')!==m[2])return null;
 const mime=m[1],valid=mime==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 return valid?{bytes,mime,object:createHash('sha256').update(bytes).digest('hex')+'.'+mime}:null;
}
export default async function handler(req,res){
 const q=new URL(req.url||'/api/archive','https://game.invalid').searchParams,action=q.get('action')||'status';
 if(req.method==='GET'&&action==='status')return send(res,200,{configured:config(),provider:'Supabase',mode:'private-game'});
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'GET 또는 POST 요청이 필요합니다.'});
 const expected=Buffer.from(process.env.GAME_ACCESS_CODE||''),actual=Buffer.from(String(req.headers?.['x-game-access-code']||''));
 if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))return send(res,401,{error:'게임 통신 접근 코드를 확인하세요.'});
 if(!config())return send(res,503,{error:'DB 연결 대기 · Supabase 설정과 초기 SQL 적용이 필요합니다.'});
 const root=process.env.SUPABASE_URL.replace(/\/$/,''),secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const request=async(path,options={})=>{const r=await fetch(root+path,{...options,headers:{apikey:secret,Authorization:'Bearer '+secret,...options.headers},signal:AbortSignal.timeout(20000)});if(!r.ok&&options.method==='DELETE'&&r.status===403)throw Error('저장본 삭제 권한이 없습니다. Supabase 초기 SQL의 service_role DELETE 권한을 확인하세요.');if(!r.ok)throw Error('DB 요청에 실패했습니다. 연결 설정·초기 SQL·이미지 저장소를 확인하세요.');return r;};
 try{
  if(req.method==='GET'){
   if(action==='usage'){
    const countResponse=await request('/rest/v1/asterion_archives?select=id',{method:'HEAD',headers:{Prefer:'count=exact'}}),range=countResponse.headers.get('content-range')||'',count=Number(range.split('/')[1]);let imageBytes=0,imageCount=0,complete=false,unknownSizes=0;const start=Date.now();
    for(let offset=0;offset<20000&&Date.now()-start<25000;offset+=1000){const r=await request('/storage/v1/object/list/'+bucket,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix:'',limit:1000,offset,sortBy:{column:'name',order:'asc'}})}),files=await r.json();if(!Array.isArray(files))throw Error('이미지 용량 조회 결과가 유효하지 않습니다.');for(const file of files){if(!file.id)continue;imageCount++;const size=Number(file.metadata?.size);if(Number.isFinite(size)&&size>=0)imageBytes+=size;else unknownSizes++;}if(files.length<1000){complete=true;break;}}
    return send(res,200,{usage:{archiveCount:Number.isSafeInteger(count)&&count>=0?count:null,imageCount,imageBytes,complete,unknownSizes,checkedAt:Date.now()}});
   }
   if(action==='list'){const r=await request('/rest/v1/asterion_archives?select=id,created_at,world_seed,summary&order=created_at.desc&limit=20');return send(res,200,{archives:await r.json()});}
   if(action==='get'){
    const id=q.get('id');if(!validArchiveId(id))return send(res,400,{error:'저장본 ID가 유효하지 않습니다.'});
    const r=await request('/rest/v1/asterion_archives?id=eq.'+id+'&select=payload&limit=1'),rows=await r.json();
    if(!rows[0])return send(res,404,{error:'저장본을 찾지 못했습니다.'});
    if(!validArchive(rows[0].payload))return send(res,422,{error:'저장본 검증에 실패했습니다. 현재 게임은 유지됩니다.'});
    return send(res,200,{archive:rows[0].payload});
   }
   if(action==='image'){
    const object=q.get('object');if(!validObject(object))return send(res,400,{error:'이미지 경로가 유효하지 않습니다.'});
    const r=await request('/storage/v1/object/authenticated/'+bucket+'/'+object),declared=Number(r.headers.get('content-length'));
    if(declared>3050000)return send(res,413,{error:'이미지 크기 한도를 넘었습니다.'});
    const reader=r.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3050000){await reader.cancel();return send(res,413,{error:'이미지 크기 한도를 넘었습니다.'});}chunks.push(Buffer.from(value));}
    const bytes=Buffer.concat(chunks),mime=object.split('.').at(-1),data='data:image/'+mime+';base64,'+bytes.toString('base64');
    if(!imageData(data)||createHash('sha256').update(bytes).digest('hex')!==object.split('.')[0])return send(res,422,{error:'보관 이미지 검증에 실패했습니다.'});
    return send(res,200,{image:data});
   }
   return send(res,400,{error:'지원하지 않는 조회입니다.'});
  }
  let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return send(res,400,{error:'잘못된 요청 형식입니다.'});}
  if(body?.action==='delete'){
   if(!validArchiveId(body.id)||body.confirmId!==body.id)return send(res,400,{error:'삭제할 저장본 확인이 필요합니다.'});
   const r=await request('/rest/v1/asterion_archives?id=eq.'+body.id,{method:'DELETE',headers:{Prefer:'return=representation'}}),rows=await r.json();if(!Array.isArray(rows)||!rows.length)return send(res,404,{error:'이미 삭제되었거나 존재하지 않는 저장본입니다.'});return send(res,200,{deleted:body.id,imagesRetained:true});
  }
  if(body?.action==='upload'){
   const image=imageData(body.image);if(!image)return send(res,400,{error:'저장할 이미지 형식·크기를 확인하세요.'});
   // Content-addressed paths make retries idempotent; bytes at this path are identical.
   await request('/storage/v1/object/'+bucket+'/'+image.object,{method:'POST',headers:{'Content-Type':'image/'+image.mime,'x-upsert':'true'},body:image.bytes});
   return send(res,200,{object:image.object});
  }
  if(body?.action==='save'){
   if(!validArchive(body.archive))return send(res,400,{error:'게임·프롬프트·이미지 보관 목록 검증에 실패했습니다.'});
   const a=body.archive,id=randomUUID(),images=a.images.reduce((n,r)=>n+r.versions.length,0),summary='D'+(Math.floor(a.state.hours/24)+1)+' · 이미지 '+images+'장 · 인물 '+Object.keys(a.state.crew.records).length+'명';
   const r=await request('/rest/v1/asterion_archives',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({id,world_seed:a.state.galaxy.seed,summary,payload:a})});
   const [row]=await r.json();return send(res,201,{id:row.id,created_at:row.created_at,summary:row.summary});
  }
  return send(res,400,{error:'지원하지 않는 저장 요청입니다.'});
 }catch(error){return send(res,502,{error:error.name==='TimeoutError'?'DB 연결 시간이 초과되었습니다. 기존 브라우저 기록은 유지됩니다.':error.message||'DB 요청이 실패했습니다.'});}
}
