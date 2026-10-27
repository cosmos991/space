import {migrateFabrication,validFabrication,executeCraft} from './crafting.js';
import {grantMaterials,missionMaterials,materialRewardText} from './materials.js';
import {migrateFleet,validFleet,manageYard} from './shipyard.js';
import {activeDesign,cargoCapacity} from './ships-data.js';
import {freshGalaxy,migrateGalaxy,validGalaxy} from './galaxy.js';
import {freshCrew,migrateCrew,validCrew,executeCrew,advanceCrew,crewSituation,crewBond} from './crew.js';
import {freshMissions,migrateMissions,syncMissions,validMissions,missionSlots,executeMission,missionRecord,missionTemplate,missionStatus,recordMissionVictory} from './missions.js';
import {usedCargo} from './cargo.js';
export {usedCargo};
import {freshEquipment,migrateEquipment,validEquipment,shipStats,serviceQuote,manageEquipment} from './equipment.js';
import {freshNews,migrateNews,validNews} from './news.js';
import {respondToRaiders,combatTurn,validCombat,startCombat} from './combat.js';
import {FACTIONS,freshDiplomacy,migrateDiplomacy,gainStanding,validDiplomacy} from './factions.js';
import {PLACES,place,LOCATION_TYPES,routeFor,planetPurchaseStatus,planetIncome} from './world-data.js';
export {FACTIONS,PLACES,place};
import {eventSettings,freshWorld,migrateWorld,random,checkEvent,makeEvent,applyEventChoice,validWorld,validEvent} from './events.js';
import {freshComms,migrateComms,broadcast,ambientPost,validComms} from './communications.js';
import {newEconomy,validEconomy,removeCargo,executeTrade} from './economy.js';
export const GOODS={ore:'광물',food:'식량',tech:'기술 부품'};
export function freshState(seed=Math.floor(Math.random()*4294967295)+1){const s={galaxy:freshGalaxy(seed),crew:freshCrew(),missions:freshMissions(),equipment:freshEquipment(),news:freshNews(),combat:null,diplomacy:freshDiplomacy(),world:freshWorld(seed),comms:freshComms(),economy:newEconomy(),version:1,hours:0,credits:3200,fuel:100,hull:100,shield:100,location:'haven',travel:null,cargo:{ore:0,food:5,tech:0},survey:{},outpost:false,contract:null,completed:0,event:null,eventAt:6,logs:[{time:0,text:'독립 항해 허가가 승인되었습니다. 노마드의 지휘권은 함장님께 있습니다.',kind:'system'}],chats:{union:[],helios:[],free:[]}};migrateFleet(s);migrateFabrication(s);syncMissions(s);return s;}
export function log(s,text,kind='info'){s.logs.unshift({time:s.hours,text,kind});s.logs=s.logs.slice(0,100);}
export function route(s,id){return routeFor(s,id);}
export function depart(s,id){if(s.travel)throw Error('이미 항해 중입니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');const r=route(s,id);if(!r)throw Error('다른 목적지를 선택하세요.');if(s.fuel<r.fuel)throw Error('연료가 부족합니다. 현재 항구에서 보급하거나 긴급 예인을 요청하세요.');s.fuel-=r.fuel;s.travel=r;crewSituation(s);log(s,`${place(id,s).name} 항로 설정. 예상 ${r.total}시간, 연료 ${r.fuel} 사용.`);}
export function migrateState(s){migrateGalaxy(s);migrateEconomyForWorld(s);migrateWorld(s);migrateComms(s);migrateDiplomacy(s);migrateNews(s);migrateEquipment(s);if(s.combat===undefined)s.combat=null;migrateMissions(s);syncMissions(s);migrateCrew(s);migrateFleet(s);migrateFabrication(s);return s;}
function migrateEconomyForWorld(s){if(!s.economy)s.economy=newEconomy(s.hours);}
export function tick(s,hours){
 if(!Number.isFinite(hours)||hours<0)throw Error('유효하지 않은 진행 시간입니다.');if(s.event||hours===0)return;
 migrateState(s);let left=hours;
 while(left>0&&!s.event){
  const step=Math.min(left,(Math.floor(s.hours/24)+1)*24-s.hours,s.travel?.remaining??left,Math.max(0,s.eventAt-s.hours),Math.max(0,s.world.nextBroadcast-s.hours));
  s.hours+=step;left=Math.max(0,left-step);s.credits+=step*((s.outpost?9:0)+planetIncome(s));advanceCrew(s,step);crewSituation(s);
  syncMissions(s);let arrived=false;if(s.travel){s.travel.remaining=Math.max(0,s.travel.remaining-step);if(s.travel.remaining<1e-9){s.location=s.travel.to;if(s.travel.kind==='jump')s.galaxy.current=s.travel.systemTo;s.travel=null;delete s.world.forecast;s.shield=shipStats(s).maxShield;arrived=true;crewSituation(s,'arrival');log(s,`${place(s.location,s).name}에 도착했습니다.`,'arrival');broadcast(s,{author:'항성계 관제',content:`CSV ${activeDesign(s).name}가 ${place(s.location,s).name}에 도착했습니다.`,kind:'report'});}}
  if(s.hours>=s.world.nextBroadcast){ambientPost(s,random(s));s.world.nextBroadcast=s.hours+3+Math.floor(random(s)*3);}
  if(s.hours>=s.eventAt){s.eventAt=s.hours+eventSettings(s).interval;if(checkEvent(s)){crewSituation(s,s.event.id==='raiders'?'combat':null);log(s,`${s.event.title} · 대응이 필요합니다.`,'alert');}}
  if(arrived)break;
 }
}
export function resolveEvent(s,action){migrateState(s);if(s.event?.id==='raiders'){const result=respondToRaiders(s,action);if(result.status==='active')crewSituation(s,'combat');log(s,result.summary,result.status==='active'?'alert':'info');return result;}const outcome=applyEventChoice(s,action);log(s,outcome,'success');return outcome;}
export function trade(s,good,quantity,buy){const q=executeTrade(s,good,quantity,buy);log(s,`${GOODS[good]} ${quantity}t ${buy?'매수':'매도'} · ${q.total} CR${buy?'':` · 실현 손익 ${q.profit.toFixed(2)} CR`}`,'trade');return q;}
export function service(s,type){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel||!place(s.location,s).market)throw Error('교역항에 정박해야 합니다.');const cost=serviceQuote(s,type);if(!['fuel','repair','shield'].includes(type))throw Error('알 수 없는 서비스입니다.');if(!cost)throw Error('이미 최상의 상태입니다.');if(s.credits<cost)throw Error('보유 자금이 부족합니다.');s.credits-=cost;if(type==='fuel')s.fuel=100;else if(type==='shield')s.shield=shipStats(s).maxShield;else s.hull=100;crewSituation(s);log(s,`${type==='fuel'?'연료 보급':type==='shield'?'실드 재충전':'선체 수리'} 완료 · ${cost} CR`);}
export function survey(s){migrateState(s);if(s.travel)throw Error('도착 후 탐사할 수 있습니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');const id=s.location,p=place(id,s),n=s.survey[id]||0;if(!LOCATION_TYPES[p.type]?.survey)throw Error('정거장에서는 탐사 대신 시설 서비스를 이용하세요.');if(n>=3)throw Error('이 구역의 탐사를 모두 마쳤습니다.');if(s.fuel<5)throw Error('탐사에는 연료 5가 필요합니다.');const cargo=p.type==='belt'?Math.floor(8*activeDesign(s).mining):p.type==='ruin'?2:0;const good=p.type==='belt'?'ore':'tech';if(usedCargo(s)+cargo>cargoCapacity(s))throw Error('회수품을 보관할 화물 공간이 부족합니다.');s.fuel-=5;s.survey[id]=n+1;s.credits+=120;if(cargo)s.cargo[good]+=cargo;log(s,`${p.name} 탐사 ${n+1}/3 완료. 데이터 120 CR${cargo?`, ${GOODS[good]} ${cargo}t 회수`:''}.`,'success');migrateState(s);if(n===0)gainStanding(s,p.factionId||'free',8,2);broadcast(s,{author:'노마드 탐사 보고',topic:'exploration',kind:'report',content:`${p.name} 구역 탐사 ${n+1}/3 완료. 탐사 자료를 갱신했습니다.`});if(!p.market&&checkEvent(s,'survey'))log(s,`${s.event.title} · 탐사 중 추가 발견.`,'alert');}
export function claim(s){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel||s.location!=='belt')throw Error('케플러 소행성대에서 건설할 수 있습니다.');if(s.outpost)throw Error('이미 전초기지를 소유하고 있습니다.');if(!s.survey.belt)throw Error('먼저 이 구역을 탐사하세요.');if(s.credits<2000)throw Error('건설 비용 2,000 CR이 필요합니다.');s.credits-=2000;s.outpost=true;log(s,'케플러 자동 채굴 전초기지 가동. 시간당 9 CR 수익.','success');}
export function contract(s,action){migrateState(s);if(action==='accept'){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(missionSlots(s)>=3)throw Error('동시 임무는 최대 3개입니다.');if(s.contract)throw Error('이미 진행 중인 계약이 있습니다.');s.contract={to:'terra',good:'food',quantity:5,reward:650,acceptedAt:s.hours};log(s,'연합 보급 계약 수락: 테라 노바에 식량 5t 전달. 보수 650 CR.');}else{if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(!s.contract)throw Error('진행 중인 계약이 없습니다.');const c=s.contract;if(s.travel||s.location!==c.to)throw Error('테라 노바에 도착해야 합니다.');if(s.cargo[c.good]<c.quantity)throw Error('식량 5t이 필요합니다.');const materials=missionMaterials({type:'delivery'});grantMaterials(s,materials);removeCargo(s,c.good,c.quantity);s.credits+=c.reward;s.completed++;gainStanding(s,'union',10,3);crewBond(s,3,c.acceptedAt??-1);s.contract=null;log(s,'보급 계약 완료. 650 CR · '+materialRewardText(materials),'success');}}
export function tow(s){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel)throw Error('항해 중에는 예인할 수 없습니다.');if(place(s.location,s).market)throw Error('현재 항구에서 보급하세요.');s.credits=Math.max(0,s.credits-350);s.location='haven';if(s.galaxy)s.galaxy.current='home';s.fuel=Math.max(s.fuel,25);log(s,'긴급 예인 완료. 헤이븐으로 복귀했습니다. 최대 350 CR 정산.','alert');}
export function validSave(s){return validFabrication(s?.fabrication)&&validFleet(s?.fleet,s)&&validGalaxy(s?.galaxy,s)&&validCrew(s?.crew,s)&&validMissions(s?.missions,s)&&validEquipment(s?.equipment,s)&&validCombat(s?.combat,s)&&(!s?.news||validNews(s.news,s.hours,s))&&(!s?.diplomacy||validDiplomacy(s.diplomacy,s))&&validEvent(s?.event,s?.hours)&&(!s?.world||validWorld(s.world,s.hours))&&(!s?.comms||validComms(s.comms,s.hours))&&(!s?.economy||validEconomy(s.economy,s.hours,s))&&s?.version===1&&Number.isFinite(s.hours)&&s.hours>=0&&Number.isFinite(s.credits)&&s.credits>=0&&['fuel','hull','shield'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=(k==='shield'?shipStats(s).maxShield:100))&&!!place(s.location,s)&&s.cargo&&Object.keys(GOODS).every(k=>Number.isInteger(s.cargo[k])&&s.cargo[k]>=0)&&usedCargo(s)<=cargoCapacity(s)&&Array.isArray(s.logs)&&s.survey&&FACTIONS.every(f=>Array.isArray(s.chats?.[f.id]))&&Number.isFinite(s.eventAt)&&(!s.travel||(place(s.travel.to,s)&&place(s.travel.from,s)&&s.travel.total>0&&s.travel.remaining>0&&s.travel.remaining<=s.travel.total));}

export function purchasePlanet(s,id=s.location){migrateState(s);const status=planetPurchaseStatus(s,id);if(!status.eligible)throw Error(status.reason);const p=place(id,s);s.credits-=p.purchasePrice;s.diplomacy.ownedPlanets.push(id);log(s,`${p.name} 소유권 등록. 매입 대금 ${p.purchasePrice.toLocaleString('ko-KR')} CR · 기본 세수 시간당 ${p.income} CR.`,'success');broadcast(s,{author:'항성 연합 행정청',kind:'report',content:`독립 함장에게 ${p.name}의 행정 소유권이 양도되었습니다. 공공 정거장의 소유권은 매각 대상이 아닙니다.`});}
export function deliverOre(s){if(s.travel||s.location!=='forge')throw Error('헬리오스 조선소에 정박해야 합니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.cargo.ore<10)throw Error('광물 10t이 필요합니다.');migrateState(s);grantMaterials(s,{alloy:1});removeCargo(s,'ore',10);s.credits+=600;gainStanding(s,'helios',8,4);log(s,'헬리오스 광물 10t 납품. 600 CR · 명예 +8 · 신뢰 +4 · 정제 합금 +1.','success');}
export function shareSurveys(s){if(s.travel||s.location!=='freeport')throw Error('프리포트에서 탐사 자료를 공유할 수 있습니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');migrateState(s);let count=0;for(const [id,n]of Object.entries(s.survey)){const previous=s.diplomacy.sharedSurveys[id]||0;count+=Math.max(0,n-previous);}if(!count)throw Error('새로 공유할 탐사 자료가 없습니다.');grantMaterials(s,{special:count});for(const [id,n]of Object.entries(s.survey))s.diplomacy.sharedSurveys[id]=n;gainStanding(s,'free',count*5,count*2);log(s,`새 탐사 자료 ${count}단계 공유. 명예 +${count*5} · 자유 항해 연맹 신뢰 +${count*2} · 특수 소재 +${count}.`,'success');return count;}

export function combatOrder(s,action){migrateState(s);const result=combatTurn(s,action);recordMissionVictory(s);if(result.status==='victory')crewBond(s,1,Infinity,'교전을 마치고 귀환 준비를 완료했습니다.');crewSituation(s);log(s,result.summary,result.status==='active'?'combat':result.status==='victory'?'success':'alert');return result;}

export function equipmentOrder(s,id,action){const result=manageEquipment(s,id,action);log(s,result,'trade');return result;}

export function missionOrder(s,id,action){
 migrateState(s);
 if(action==='track'){
  const status=missionStatus(s,id,'track');if(!status.eligible)throw Error(status.reason);
  const m=missionRecord(s,id),t=missionTemplate(m.template);s.fuel-=3;
  s.travel={from:s.location,to:s.location,total:2,remaining:2,fuel:3};
  const e=makeEvent(s,'raiders','mission');e.missionId=id;e.title=t.title+' · 지정 표적 발견';e.text=t.target+'을 포착했습니다. 교전 명령을 선택하세요.';e.enemy={name:t.target,hull:t.hull,shield:t.shield,reward:550};
  startCombat(s);s.combat.missionId=id;crewSituation(s,'combat');
  const message=t.title+' · 표적 추적 개시. 연료 3 · 교전 후 현지 복귀까지 2h.';log(s,message,'alert');return message;
 }
 const acceptedAt=missionRecord(s,id)?.acceptedAt;const message=executeMission(s,id,action);if(action==='complete')crewBond(s,3,acceptedAt);log(s,message,action==='complete'?'success':'mission');return message;
}

export function crewOrder(s,id,action,assignment){migrateState(s);const result=executeCrew(s,id,action,assignment);crewSituation(s);if(action!=='report')log(s,result,'crew');return result;}

export function shipyardOrder(s,action,id){migrateState(s);const result=manageYard(s,action,id);log(s,result.message,'trade');if(result.hours)tick(s,result.hours);return result.message;}

export function craftingOrder(s,order){migrateState(s);const text=executeCraft(s,order);log(s,text,'trade');return text;}
