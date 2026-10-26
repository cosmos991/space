import {validArchive,validObject} from './archive-schema.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function archiveRequest(code,action,body){
 const response=await fetch('/api/archive?action='+action,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-game-access-code':code},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'클라우드 요청 실패');return data;
}
export async function saveArchive(code,state,records,settings,onProgress=()=>{}){
 const images=[];let done=0,total=records.reduce((n,r)=>n+r.versions.length,0);
 for(const r of records){const versions=[];for(const v of r.versions){const uploaded=await archiveRequest(code,'upload',{action:'upload',image:v.data});if(!validObject(uploaded.object))throw Error('이미지 업로드 결과가 유효하지 않습니다.');const {data,...meta}=v;versions.push({...meta,object:uploaded.object});onProgress('이미지 보관 '+(++done)+' / '+total);}images.push({key:r.key,active:r.active,versions});}
 const archive={version:1,state:structuredClone(state),images,settings:structuredClone(settings)};
 if(!validArchive(archive))throw Error('저장할 기록이 유효하지 않습니다.');onProgress('DB에 저장본 기록 중…');
 return archiveRequest(code,'save',{action:'save',archive});
}
export async function readArchive(code,id,onProgress=()=>{}){
 const response=await archiveRequest(code,'get&id='+encodeURIComponent(id));if(!validArchive(response.archive))throw Error('저장본 검증에 실패했습니다.');
 const a=response.archive,cache=new Map(),records=[];let done=0,total=a.images.reduce((n,r)=>n+r.versions.length,0);
 for(const r of a.images){const versions=[];for(const v of r.versions){if(!cache.has(v.object)){const result=await archiveRequest(code,'image&object='+encodeURIComponent(v.object));if(typeof result.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(result.image)||result.image.length>4100000)throw Error('저장본 이미지를 불러오지 못했습니다.');cache.set(v.object,result.image);}const {object,...meta}=v;versions.push({...meta,data:cache.get(object)});onProgress('이미지 불러오기 '+(++done)+' / '+total);}records.push({key:r.key,active:r.active,versions});}
 return {state:a.state,records,settings:a.settings};
}
export function cloudHTML({configured=false,checked=false,busy=false,progress='',error='',archives=[],review='',code=''}={}){
 const selected=archives.find(a=>a.id===review);
 return `<section class="cloud-archive"><h3>개인 클라우드 보관함</h3><p class="hint">게임 통신 접근 코드를 사용하는 개인 저장소입니다. 게임 진행·인물·대화, 이 우주의 이미지 원본·선택 상태와 프롬프트를 함께 보관합니다. 저장본은 새 버전으로 추가되며 다른 기기에서 선택해 복원할 수 있습니다.</p><p class="${configured?'gain':'muted'}">${!checked?'연결 설정 확인 중':configured?'Supabase 연결 설정 준비됨 · 목록 확인으로 실제 연결 점검':'DB 연결 대기 · Supabase와 Vercel 연결 설정 필요'}</p><label>게임 통신 접근 코드<input id="cloud-code" type="password" ${busy?'disabled':''} autocomplete="off" value="${esc(code)}"></label><div class="actions"><button data-cloud-save class="primary" ${busy||!configured?'disabled':''}>현재 기록을 클라우드에 저장</button><button data-cloud-list ${busy||!configured?'disabled':''}>저장본 목록 확인</button><button data-cloud-status ${busy?'disabled':''}>연결 설정 다시 확인</button></div>${busy?`<p role="status">${esc(progress||'처리 중…')}</p>`:''}${error?`<p class="loss" role="alert">${esc(error)}</p>`:''}${selected?`<div class="event-card"><h3>이 저장본을 복원할까요?</h3><p>${esc(selected.summary)} · ${esc(selected.created_at)}</p><p>현재 게임 진행과 해당 우주의 이미지·프롬프트를 선택한 저장본으로 바꿉니다. 복원 전에 현재 기록을 클라우드에 먼저 보관합니다.</p><button data-cloud-restore="${esc(selected.id)}" ${busy?'disabled':''}>현재 기록 백업 후 이 저장본 복원</button><button data-cloud-cancel ${busy?'disabled':''}>취소</button></div>`:''}<h3>최근 저장본 · 최대 20개 표시</h3>${archives.map(a=>`<article class="asset-card"><strong>${esc(a.summary)}</strong><p>${esc(new Date(a.created_at).toLocaleString('ko-KR'))}</p><button data-cloud-review="${esc(a.id)}" ${busy?'disabled':''}>복원 내용 검토</button></article>`).join('')||'<p class="hint">저장본 목록을 확인해 주세요. 저장하지 않은 브라우저 기록은 다른 기기에서 보이지 않습니다.</p>'}<p class="hint">자동 동기화는 하지 않습니다. 이미지 생성·적용 또는 프롬프트 편집 후 직접 저장해 주세요. API 키와 접근 코드는 저장본에 포함하지 않습니다. 다른 기기의 게임을 불러올 때는 같은 통신 접근 코드를 사용합니다.</p></section>`;
}
