import {decodeSave} from './save-store.js';
import {validArchive} from './archive-schema.js';
export function validateBundle(bundle){
 if(!bundle||bundle.format!=='asterion-full-save'||bundle.version!==1||!Array.isArray(bundle.images))throw Error('전체 저장본 형식이 올바르지 않습니다.');
 decodeSave(JSON.stringify(bundle.state));let bytes=0;
 const images=bundle.images.map(r=>({...r,versions:r.versions.map(v=>{if(typeof v.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v.data)||v.data.length>4100000)throw Error('저장본 이미지가 손상되었습니다.');bytes+=v.data.length;const {data,...meta}=v;return {...meta,object:'0'.repeat(64)+'.'+data.slice(11,data.indexOf(';'))};})}));
 if(bytes>100000000||!validArchive({version:1,state:bundle.state,images,settings:bundle.settings}))throw Error('이미지 선택 상태·프롬프트·게임 기록 검증에 실패했습니다.');return bundle;
}
export function createBundle(state,images,settings){return validateBundle({format:'asterion-full-save',version:1,time:Date.now(),state:structuredClone(state),images:structuredClone(images),settings:structuredClone(settings)});}
export function decodeBundle(raw){if(typeof raw!=='string'||raw.length>105000000)throw Error('105MB 이하 저장 파일을 선택하세요.');const value=JSON.parse(raw);return value?.format==='asterion-full-save'?validateBundle(value):{state:decodeSave(raw),legacy:true};}
let promise;
function database(){return promise??=new Promise((resolve,reject)=>{const r=indexedDB.open('asterion-full-saves-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('전체 저장소를 열지 못했습니다.'));});}
export async function readBundle(key){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('saves'),request=tx.objectStore('saves').get(key);request.onsuccess=()=>resolve(request.result?validateBundle(request.result):null);tx.onerror=()=>reject(Error('전체 저장본을 읽지 못했습니다.'));});}
export async function writeBundle(key,bundle){validateBundle(bundle);const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');if(key==='auto'){const request=store.get('auto');request.onsuccess=()=>{if(request.result)store.put(request.result,'backup');store.put(bundle,key);};}else store.put(bundle,key);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('게임·이미지 전체 저장에 실패했습니다. 저장 공간을 확인하세요.'));});}
