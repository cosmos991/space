import {EQUIPMENT,equipment} from './equipment.js';
import {MATERIALS} from './ships-data.js';
import {place} from './world-data.js';
import {factionStanding,faction} from './factions.js';
import {removeCargo} from './economy.js';
import {quantity,MATERIAL_LIMIT} from './materials.js';
const part=(output,inputs,fee)=>({id:'part:'+output,name:MATERIALS[output],category:'parts',output,inputs,fee});
export const LASER_VARIANTS=['w-pulse','w-focus','w-rapid','w-eco'];
const PARTS=[part('alloy',{ore:4},50),part('core',{alloy:2,tech:3},150),part('frame',{alloy:2,scrap:3},100),part('mechanism',{alloy:1,scrap:2,tech:1},100),part('circuit',{tech:2,alloy:1},120),part('coil',{core:1,circuit:1},180),part('armor',{alloy:2,frame:1},150),part('stable',{core:1,circuit:2,special:2},400)];
export const RECIPES=[...PARTS,...EQUIPMENT.filter(g=>g.price>0).map(g=>{const tier=g.level>=5?3:g.level>=3?2:1;let inputs=g.slot==='weapon'?(g.family==='ballistic'?{frame:tier,mechanism:tier*2,circuit:tier}:g.family==='missile'?{frame:tier,mechanism:tier,circuit:tier*2}:g.family==='plasma'?{coil:tier,core:tier,frame:tier,special:tier}: {coil:tier,circuit:tier,frame:tier}):g.slot==='shield'?{coil:tier,circuit:tier,armor:tier}:{mechanism:tier,coil:tier,frame:tier};
 if(g.id==='w-focus')inputs={coil:2,core:1,frame:1};if(g.id==='w-rapid')inputs={coil:1,circuit:2,mechanism:1};if(g.id==='w-eco')inputs={coil:1,circuit:2,frame:1};if(tier===3)inputs.stable=1;
 const owner=g.faction||(g.slot==='shield'?'union':g.slot==='engine'?'free':'helios');return {id:'gear:'+g.id,name:g.name,category:g.slot,gear:g.id,inputs,fee:Math.ceil(g.price*.65),unlock:g.level>=3?{faction:owner,rank:g.rank|| (tier===3?2:1),fee:Math.ceil(g.price*.12)}:null};})];
export const recipe=id=>RECIPES.find(r=>r.id===id);
export const freshFabrication=()=>({version:1,known:[],target:null});
export function migrateFabrication(s){if(s.fabrication===undefined)s.fabrication=freshFabrication();return s.fabrication;}
export function validFabrication(f){return f===undefined||f?.version===1&&Array.isArray(f.known)&&f.known.length<=RECIPES.length&&new Set(f.known).size===f.known.length&&f.known.every(id=>!!recipe(id)?.unlock)&&(f.target===null||!!recipe(f.target));}
export const knownRecipe=(s,r)=>!r.unlock||!!s.fabrication?.known.includes(r.id);
export function dockCraftReason(s){return s.event?'긴급 상황에 먼저 대응하세요.':s.travel?'항해 중에는 제작소를 이용할 수 없습니다.':place(s.location,s)?.type!=='station'?'정거장 제작소에 정박하세요.':'';}
export function craftQuote(s,id,count=1,source=''){
 const r=recipe(id);if(!r)return null;
 const inputs=Object.fromEntries(Object.entries(r.inputs).map(([k,n])=>[k,(source?Math.ceil(n*.5):n)*count]));return {r,count,source,inputs,fee:(source?Math.ceil(r.fee*.5):r.fee)*count};
}
export function craftStatus(s,id,count=1,source=''){
 const q=craftQuote(s,id,count,source);let reason=dockCraftReason(s);
 if(!q)return {eligible:false,reason:'알 수 없는 제작법입니다.'};
 if(!reason&&(!Number.isSafeInteger(count)||count<1||count>20||q.r.gear&&count!==1))reason='부품은 1~20개, 장비는 1개씩 제작하세요.';
 if(!reason&&!knownRecipe(s,q.r))reason='전문 설계도를 먼저 해금하세요.';
 if(!reason&&source&&(!LASER_VARIANTS.includes(source)||!LASER_VARIANTS.includes(q.r.gear)||source===q.r.gear||!s.equipment.owned.includes(source)||s.equipment.equipped.weapon===source))reason='재개조할 미장착 P-2 레이저를 선택하세요.';
 if(!reason&&q.r.gear&&s.equipment.owned.includes(q.r.gear))reason='이미 보유한 장비입니다.';
 if(!reason&&q.r.output&&quantity(s,q.r.output)+count>MATERIAL_LIMIT)reason='자재 창고 한도를 초과합니다.';
 if(!reason&&s.credits<q.fee)reason='제작 자금이 부족합니다.';
 if(!reason&&Object.entries(q.inputs).some(([k,n])=>quantity(s,k)<n))reason='재료가 부족합니다. 하위 부품 제작법과 획득처를 확인하세요.';
 return {eligible:!reason,reason,quote:q};
}
export function unlockStatus(s,id){const r=recipe(id);let reason=dockCraftReason(s);if(!r?.unlock)return {eligible:false,reason:'기본 제공 설계도입니다.'};const u=r.unlock;
 if(!reason&&knownRecipe(s,r))reason='이미 해금한 설계도입니다.';
 if(!reason&&factionStanding(s,u.faction).rank<u.rank)reason=faction(u.faction).name+' 신뢰 등급 '+u.rank+' 이상이 필요합니다.';
 const port={union:'haven',helios:'forge',free:'freeport'}[u.faction];if(!reason&&s.location!==port)reason=place(port,s).name+' 제작소에서 설계도를 해금하세요.';
 if(!reason&&s.credits<u.fee)reason='설계도 해금 자금이 부족합니다.';return {eligible:!reason,reason};
}
export function salvageQuote(id){const r=recipe('gear:'+id);const refund=r?Object.fromEntries(Object.entries(r.inputs).filter(([k,n])=>Object.hasOwn(MATERIALS,k)&&Math.floor(n*.5)>0).map(([k,n])=>[k,Math.floor(n*.5)])):{};return r&&!Object.keys(refund).length?{scrap:1}:refund;}
export function salvageStatus(s,id){const g=equipment(id),refund=salvageQuote(id);let reason=dockCraftReason(s);
 if(!reason&&(!g?.price||!s.equipment.owned.includes(id)))reason='분해할 보유 장비가 아닙니다.';
 if(!reason&&Object.values(s.equipment.equipped).includes(id))reason='장착 장비는 먼저 교체하세요.';
 if(!reason&&!Object.keys(refund).length)reason='회수 가능한 온전한 부품이 없습니다. 판매 또는 재개조를 이용하세요.';
 if(!reason&&Object.entries(refund).some(([k,n])=>quantity(s,k)+n>MATERIAL_LIMIT))reason='분해 재료를 보관할 창고 공간이 부족합니다.';return {eligible:!reason,reason,refund};
}
export function executeCraft(s,{action,id,count=1,source=''}){
 if(action==='track'){if(id!==null&&!recipe(id))throw Error('유효하지 않은 제작 목표입니다.');migrateFabrication(s).target=id;return id?recipe(id).name+' 제작 목표 등록.':'제작 목표 해제.';}
 if(action==='unlock'){const st=unlockStatus(s,id);if(!st.eligible)throw Error(st.reason);s.credits-=recipe(id).unlock.fee;migrateFabrication(s).known.push(id);return recipe(id).name+' 설계도 해금. 신뢰가 내려가도 유지됩니다.';}
 if(action==='salvage'){const st=salvageStatus(s,id);if(!st.eligible)throw Error(st.reason);s.equipment.owned=s.equipment.owned.filter(k=>k!==id);for(const [k,n]of Object.entries(st.refund))s.fleet.materials[k]+=n;return equipment(id).name+' 분해 · '+Object.entries(st.refund).map(([k,n])=>MATERIALS[k]+' +'+n).join(' · ');}
 if(action!=='craft')throw Error('알 수 없는 제작 작업입니다.');const st=craftStatus(s,id,count,source);if(!st.eligible)throw Error(st.reason);const q=st.quote;
 s.credits-=q.fee;for(const [k,n]of Object.entries(q.inputs))if(['ore','tech'].includes(k))removeCargo(s,k,n);else s.fleet.materials[k]-=n;
 if(source)s.equipment.owned=s.equipment.owned.filter(k=>k!==source);
 if(q.r.output)s.fleet.materials[q.r.output]+=count;else s.equipment.owned.push(q.r.gear);
 return q.r.name+(source?' 재개조':' 제작')+' 완료 · '+count+'개 · '+q.fee+' CR. 장비는 자동 장착되지 않습니다.';
}
