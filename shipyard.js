import {SHIPS,shipDesign,activeDesign,cargoCapacity,YARDS,MATERIALS} from './ships-data.js';
import {usedCargo} from './cargo.js';
import {removeCargo} from './economy.js';
import {shipStats} from './equipment.js';
import {place} from './world-data.js';
export function migrateFleet(s){if(!s.fleet)s.fleet={version:1,active:'nomad',owned:[{design:'nomad',port:s.location,hull:s.hull,shield:s.shield,fuel:s.fuel}],blueprints:['nomad'],materials:{scrap:0,alloy:0,core:0,special:0},job:null};return s.fleet;}
export function validFleet(f,s){if(f===undefined)return true;const ids=Array.isArray(f?.owned)?f.owned.map(o=>o?.design):[];return f?.version===1&&Array.isArray(f.owned)&&f.owned.length>0&&f.owned.length<=5&&new Set(ids).size===ids.length&&ids.includes(f.active)&&f.owned.every(o=>o&&shipDesign(o.design)?.released&&place(o.port,s)&&['hull','shield','fuel'].every(k=>Number.isFinite(o[k])&&o[k]>=0&&o[k]<=(k==='shield'?1000:100)))&&Array.isArray(f.blueprints)&&new Set(f.blueprints).size===f.blueprints.length&&f.blueprints.length<=5&&f.blueprints.every(id=>shipDesign(id)?.released)&&f.materials&&typeof f.materials==='object'&&!Array.isArray(f.materials)&&Object.keys(MATERIALS).every(k=>Number.isSafeInteger(f.materials[k])&&f.materials[k]>=0&&f.materials[k]<=1000000)&&(f.job===null||(f.job&&shipDesign(f.job.design)?.released&&f.blueprints.includes(f.job.design)&&!ids.includes(f.job.design)&&YARDS.includes(f.job.port)&&Number.isFinite(f.job.started)&&f.job.started>=0&&f.job.started<=s.hours&&f.job.ready===f.job.started+shipDesign(f.job.design).hours));}
const dock=s=>s.event?'사건에 먼저 대응하세요.':s.travel?'항해 중에는 이용할 수 없습니다.':!YARDS.includes(s.location)?'헤이븐·헬리오스·프리포트 조선소에 정박하세요.':'';
const amount=(s,k)=>Object.hasOwn(MATERIALS,k)?s.fleet.materials[k]:s.cargo[k];
export const sellPrice=(d,o)=>Math.floor(d.price*.6*Math.max(.2,o.hull/100));
export function yardStatus(s,action,id){const d=shipDesign(id),f=s.fleet;let reason=action==='mine'||action==='salvage'?(s.event?'사건에 먼저 대응하세요.':s.travel?'구역 도착 후 작업하세요.':''):dock(s);
 if(!f)return {eligible:false,reason:'함선 등록 정보를 불러오세요.'};
 if(!reason&&['buy','blueprint','build','switch','sell'].includes(action)){if(!d?.released)reason='상위 등급은 설계 예고이며 아직 제작할 수 없습니다.';else if(action==='buy'||action==='build'){if(f.owned.some(o=>o.design===id)||f.job?.design===id)reason='보유 중이거나 건조 중인 함선입니다.';else if(s.credits<(action==='buy'?d.price:d.fee))reason='자금이 부족합니다.';else if(action==='build'){if(!f.blueprints.includes(id))reason='설계도를 먼저 구입하세요.';else if(f.job)reason='현재 건조 작업을 마친 뒤 발주하세요.';else if(Object.entries(d.recipe).some(([k,n])=>amount(s,k)<n))reason='건조 재료가 부족합니다.';}}else if(action==='blueprint'){if(f.blueprints.includes(id))reason='이미 보유한 설계도입니다.';else if(s.credits<d.blueprint)reason='설계도 구입 자금이 부족합니다.';}else{const o=f.owned.find(o=>o.design===id);if(!o)reason='보유하지 않은 함선입니다.';else if(id===f.active)reason='현재 기함입니다.';else if(o.port!==s.location)reason='함선이 보관된 조선소로 이동하세요.';else if(action==='switch'){if(usedCargo(s)>d.cargo)reason='화물을 줄여야 기함을 교체할 수 있습니다.';else if(s.crew.roster.length>d.crew)reason='승무원 정원을 초과합니다. 승무원을 조정하세요.';else if(shipStats(s).power>d.power)reason='현재 장비 전력이 새 함선의 리액터 한도를 초과합니다.';}}}
 if(!reason&&action==='claim'){if(!f.job)reason='인수할 건조 작업이 없습니다.';else if(f.job.port!==s.location)reason='발주한 조선소에서 인수하세요.';else if(s.hours<f.job.ready)reason='아직 건조 중입니다.';}
 if(!reason&&action==='alloy'){if(f.materials.alloy>=1000000)reason='자재 창고 한도에 도달했습니다.';else if(s.cargo.ore<4||s.credits<50)reason='광물 4t과 50 CR이 필요합니다.';}
 if(!reason&&action==='core'){if(f.materials.core>=1000000)reason='자재 창고 한도에 도달했습니다.';else if(f.materials.alloy<2||s.cargo.tech<3||s.credits<150)reason='합금 2개·기술 부품 3t·150 CR이 필요합니다.';}
 if(!reason&&action==='mine'){if(place(s.location,s)?.type!=='belt')reason='소행성대에서 채굴할 수 있습니다.';else if(s.fuel<5)reason='연료 5가 필요합니다.';else if(usedCargo(s)+Math.floor(6*activeDesign(s).mining)>cargoCapacity(s))reason='광물을 적재할 공간이 부족합니다.';}
 if(!reason&&action==='salvage'){if(f.materials.scrap+3+activeDesign(s).salvage>1000000)reason='자재 창고 한도에 도달했습니다.';else if(!['belt','ruin','nebula'].includes(place(s.location,s)?.type))reason='소행성대·유적·성운에서 일반 잔해를 인양하세요.';else if(s.fuel<4)reason='연료 4가 필요합니다.';}
 if(!['buy','blueprint','build','switch','sell','claim','alloy','core','mine','salvage'].includes(action))reason='알 수 없는 조선소 작업입니다.';
 return {eligible:!reason,reason};
}
export function manageYard(s,action,id){migrateFleet(s);const status=yardStatus(s,action,id);if(!status.eligible)throw Error(status.reason);const f=s.fleet,d=shipDesign(id);let message='',hours=0;
 if(action==='buy'){s.credits-=d.price;f.owned.push({design:id,port:s.location,hull:100,fuel:100,shield:0});message=d.name+' 구매 완료. 현재 조선소에 보관했습니다.';}
 if(action==='blueprint'){s.credits-=d.blueprint;f.blueprints.push(id);message=d.name+' 설계도 구입 완료.';}
 if(action==='build'){s.credits-=d.fee;for(const [k,n]of Object.entries(d.recipe))if(Object.hasOwn(MATERIALS,k))f.materials[k]-=n;else removeCargo(s,k,n);f.job={design:id,port:s.location,started:s.hours,ready:s.hours+d.hours};message=d.name+' 건조 발주. '+d.hours+'게임시간 뒤 발주 조선소에서 인수하세요.';}
 if(action==='claim'){const job=f.job;f.owned.push({design:job.design,port:job.port,hull:100,fuel:100,shield:0});message=shipDesign(job.design).name+' 건조 완료 · 인수했습니다.';f.job=null;}
 if(action==='switch'){const old=f.owned.find(o=>o.design===f.active),next=f.owned.find(o=>o.design===id);Object.assign(old,{port:s.location,hull:s.hull,shield:s.shield,fuel:s.fuel});f.active=id;s.hull=next.hull;s.fuel=next.fuel;s.shield=Math.min(next.shield,shipStats(s).maxShield);message=d.name+' 기함 등록. 화물·승무원·장착 장비를 이전했습니다.';}
 if(action==='sell'){const o=f.owned.find(o=>o.design===id),price=sellPrice(d,o);s.credits+=price;f.owned=f.owned.filter(o=>o.design!==id);message=d.name+' 매각 · '+price+' CR.';}
 if(action==='alloy'){removeCargo(s,'ore',4);s.credits-=50;f.materials.alloy++;message='정제 합금 1개 제작 완료.';hours=1;}
 if(action==='core'){removeCargo(s,'tech',3);f.materials.alloy-=2;s.credits-=150;f.materials.core++;message='동력 코어 1개 제작 완료.';hours=2;}
 if(action==='mine'){const n=Math.floor(6*activeDesign(s).mining);s.fuel-=5;s.cargo.ore+=n;message='반복 채굴 · 광물 '+n+'t 확보 · 연료 5 소모.';hours=3;}
 if(action==='salvage'){const n=3+activeDesign(s).salvage;s.fuel-=4;f.materials.scrap+=n;message='일반 잔해 인양 · 금속 스크랩 '+n+'개 확보 · 연료 4 소모. 임무용 봉인 화물은 사용하지 않습니다.';hours=2;}
 return {message,hours};
}
