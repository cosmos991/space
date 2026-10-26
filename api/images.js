import {generateNovelAI} from '../novelai-images.js';
import {timingSafeEqual} from 'node:crypto';
import {validImageRequest} from '../image-request.js';
import {normalizeUsage} from '../usage.js';
const limits=new Map(),inflight=new Set();
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
export default async function handler(req,res){
 const model='gpt-image-2';
 if(req.method==='GET')return send(res,200,{configured:!!(process.env.OPENAI_API_KEY&&process.env.GAME_ACCESS_CODE),model,providers:{openai:{configured:!!(process.env.OPENAI_API_KEY&&process.env.GAME_ACCESS_CODE),model},novelai:{configured:!!(process.env.NOVELAI_API_TOKEN&&process.env.GAME_ACCESS_CODE),model:process.env.NOVELAI_IMAGE_MODEL||'nai-diffusion-4-5-full'}}});
 if(req.method!=='POST')return send(res,405,{error:'POST 요청이 필요합니다.'});
 if(!process.env.GAME_ACCESS_CODE)return send(res,503,{error:'서버 API 키와 GAME_ACCESS_CODE 설정이 필요합니다.'});
 const expected=Buffer.from(process.env.GAME_ACCESS_CODE),actual=Buffer.from(String(req.headers['x-game-access-code']||''));
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return send(res,401,{error:'AI 통신 접근 코드를 확인하세요.'});
 let b=req.body;try{if(typeof b==='string')b=JSON.parse(b);}catch{return send(res,400,{error:'요청 형식을 확인하세요.'});}
 if(!validImageRequest(b))return send(res,400,{error:'이미지 종류·프롬프트·품질을 확인하세요.'});
 const provider=b.provider||'openai',keyName=provider==='novelai'?'NOVELAI_API_TOKEN':'OPENAI_API_KEY';
 if(!process.env[keyName])return send(res,503,{error:provider==='novelai'?'서버에 NOVELAI_API_TOKEN을 설정하고 재배포하세요.':'서버 OPENAI_API_KEY 설정이 필요합니다.'});
 // A shared private game credential has a shared budget gate, independent of spoofable client IP headers.
 const now=Date.now(),key='game',recent=(limits.get(key)||[]).filter(t=>now-t<60000);
 if(inflight.has(key)||recent.length>=3)return send(res,429,{error:'생성 중인 요청을 기다리세요. 이미지 생성은 1분에 3회까지 가능합니다.'});
 limits.set(key,[...recent,now]);inflight.add(key);
 try{
  if(provider==='novelai')return send(res,200,await generateNovelAI(b,process.env.NOVELAI_API_TOKEN,process.env.NOVELAI_IMAGE_MODEL||'nai-diffusion-4-5-full'));
  const result=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(105000),body:JSON.stringify({model,prompt:b.prompt,n:1,size:b.kind==='person'?'1024x1536':'1536x1024',quality:b.quality,output_format:'jpeg',output_compression:75})});
  if(!result.ok)return send(res,502,{error:'이미지 서비스 요청이 실패했습니다. 키·모델 접근 권한·잔액을 확인하세요.',model,mode:'ai'});
  const data=await result.json(),usage=normalizeUsage(data.usage),base64=data.data?.[0]?.b64_json;
  if(typeof base64!=='string'||base64.length>4000000||!base64.length||!/^[A-Za-z0-9+/=]+$/.test(base64))return send(res,502,{error:'이미지 응답이 없거나 크기 한도를 넘었습니다.',model,usage,mode:'ai'});
  return send(res,200,{image:'data:image/jpeg;base64,'+base64,model,usage,mode:'ai'});
 }catch(error){return send(res,502,{error:provider==='novelai'?(error.name==='TimeoutError'?'NovelAI 생성 시간이 초과되었습니다. 자동 재요청하지 않습니다. Anlas가 소비되었을 수 있습니다.':error.message):'이미지 생성이 중단되었습니다. 자동 재요청하지 않습니다. API 비용이 발생했을 수 있습니다.',model:provider==='novelai'?'novelai/'+(process.env.NOVELAI_IMAGE_MODEL||'nai-diffusion-4-5-full'):model,provider,mode:'ai'});}
 finally{inflight.delete(key);}
}
