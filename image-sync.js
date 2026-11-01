import {validArchiveId,validImageCatalog} from './archive-schema.js';
export function validImageChange(seed,change){
 if(!change||!validArchiveId(change.id)||typeof change.target!=='string'||!/^(ship|planet|place|person):[a-zA-Z0-9:_-]{1,160}$/.test(change.target))return false;
 if(change.kind==='add')return validImageCatalog(seed,[{key:seed+':'+change.target,active:null,versions:[change.asset]}]);
 return Number.isSafeInteger(seed)&&seed>0&&seed<=4294967295&&((change.kind==='select'&&(change.version===null||validArchiveId(change.version)))||(change.kind==='delete'&&validArchiveId(change.version)));
}
// Changes are replayed in server acceptance order. Replaying the same add/delete is harmless.
export function applyImageChange(images,seed,change){
 if(!validImageChange(seed,change))throw Error('이미지 변경 기록이 유효하지 않습니다.');
 const key=seed+':'+change.target;let r=images.find(r=>r.key===key);
 if(!r){r={key,active:null,versions:[]};images.push(r);}
 if(change.kind==='add'&&!r.versions.some(v=>v.id===change.asset.id)){
  r.versions.unshift(structuredClone(change.asset));
  // Keep the active version when concurrent generation exceeds the studio limit.
  if(r.versions.length>12){const index=r.versions.findLastIndex(v=>v.id!==r.active);r.versions.splice(index,1);}
 }
 if(change.kind==='delete'){r.versions=r.versions.filter(v=>v.id!==change.version);if(r.active===change.version)r.active=null;}
 if(change.kind==='select'&&(change.version===null||r.versions.some(v=>v.id===change.version)))r.active=change.version;
 return images;
}
export function reconcileImageRecords(seed,remote,local){
 const result=remote.map(({key,active,versions})=>({key,active,versions:structuredClone(versions)}));
 for(const r of local){
  const originals=r.versions.filter(v=>v.data&&!v.object);
  let target=result.find(v=>v.key===r.key);
  if(!target){target={key:r.key,active:r.active,versions:structuredClone(r.versions)};result.push(target);}
  if(originals.length){if(!target){target={key:r.key,active:null,versions:[]};result.push(target);}for(const v of originals)if(!target.versions.some(x=>x.id===v.id))target.versions.push(structuredClone(v));if(originals.some(v=>v.id===r.active))target.active=r.active;}
  for(const change of r.pendingChanges||[])applyImageChange(result,seed,change);
  target=result.find(v=>v.key===r.key);
  if(target)target.pendingChanges=structuredClone(r.pendingChanges||[]);
 }
 return result;
}
