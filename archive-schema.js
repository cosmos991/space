import {validSave} from './engine.js';
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const key=v=>typeof v==='string'&&!['__proto__','prototype','constructor'].includes(v)&&/^[a-zA-Z0-9:_-]{1,180}$/.test(v);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const validObject=v=>typeof v==='string'&&/^[a-f0-9]{64}\.(png|jpeg|webp)$/.test(v);
export const validArchiveId=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const dict=(v,max)=>plain(v)&&Object.keys(v).length<=600&&Object.entries(v).every(([k,t])=>key(k)&&text(t,max));
export function validArchive(a){
 try{
  if(!plain(a)||a.version!==1||!validSave(a.state)||!a.state.galaxy||!Array.isArray(a.images)||a.images.length>200||new TextEncoder().encode(JSON.stringify(a)).length>2000000)return false;
  const keys=new Set();
  for(const r of a.images){
   if(!plain(r)||!key(r.key)||!r.key.startsWith(a.state.galaxy.seed+':')||keys.has(r.key)||!Array.isArray(r.versions)||r.versions.length>12)return false;keys.add(r.key);
   const ids=new Set();
   for(const v of r.versions){if(!plain(v)||!validArchiveId(v.id)||ids.has(v.id)||!validObject(v.object)||!text(v.prompt,3500)||!text(v.model,100)||!Number.isSafeInteger(v.time)||v.time<0||!['openai','novelai',undefined].includes(v.provider)||(v.negativePrompt!==undefined&&!text(v.negativePrompt,1500))||(v.seed!==undefined&&(!Number.isSafeInteger(v.seed)||v.seed<0||v.seed>4294967295))||v.data!==undefined)return false;ids.add(v.id);}
   if(r.active!==null&&!ids.has(r.active))return false;
  }
  const s=a.settings;return plain(s)&&dict(s.drafts,3500)&&dict(s.negative,1500)&&dict(s.seeds,12)&&['openai','novelai'].includes(s.provider)&&text(s.positiveBase,3500)&&s.positiveBase.trim().length>0&&Object.keys(s).every(k=>['drafts','negative','seeds','provider','positiveBase'].includes(k));
 }catch{return false;}
}
