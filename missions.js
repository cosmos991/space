import {FACTIONS,faction,gainStanding} from './factions.js';
import {place} from './world-data.js';
import {append,migrateComms} from './communications.js';
import {usedCargo} from './cargo.js';
export const MISSION_TYPES={delivery:'운송',survey:'탐사',bounty:'현상금'};
export const MISSION_TEMPLATES=[
 {id:'union-supply',faction:'union',type:'delivery',title:'테라 노바 의료 식량 수송',from:'haven',to:'terra',quantity:8,reward:420,honor:8,trust:3,risk:'낮음',brief:'헤이븐의 봉인 의료 식량을 테라 노바 민간 의료센터로 전달합니다. 물자는 연합이 제공하며 운송료만 지급합니다.'},
 {id:'union-scan',faction:'union',type:'survey',title:'아스테리온 방사선 관측',from:'haven',to:'asterion',reward:540,honor:10,trust:4,risk:'낮음',brief:'안전 관측 궤도에서 임무용 정밀 스캔을 수행한 뒤 헤이븐으로 귀환해 자료를 보고하세요.'},
 {id:'union-warrant',faction:'union',type:'bounty',title:'케플러 항로의 무장 약탈자',from:'haven',to:'belt',reward:650,honor:16,trust:5,risk:'보통',target:'회색 송곳니 · 연합 수배 표적',hull:80,shield:35,brief:'케플러 구역에 도착해 표적 추적을 시작하세요. 해당 표적을 격퇴한 뒤 헤이븐에 전투 기록을 제출합니다.'},
 {id:'helios-parts',faction:'helios',type:'delivery',title:'헤이븐 정비 부품 수송',from:'forge',to:'haven',quantity:6,reward:680,honor:10,trust:4,risk:'낮음',brief:'헬리오스 조선소의 봉인 정비 모듈을 헤이븐 관제 도크로 전달합니다. 구매 자금은 필요하지 않습니다.'},
 {id:'helios-scan',faction:'helios',type:'survey',title:'에코 구조물 재질 조사',from:'forge',to:'echo',reward:760,honor:12,trust:4,risk:'보통',brief:'에코 유적의 재질을 임무용으로 정밀 스캔하고 헬리오스 조선소로 분석 자료를 가져오세요.'},
 {id:'helios-warrant',faction:'helios',type:'bounty',title:'산업 수송선 습격범 추적',from:'forge',to:'echo',reward:950,honor:18,trust:6,risk:'높음',target:'블랙 케스트럴 · 기업 수배 표적',hull:110,shield:55,brief:'에코 인근에서 산업 수송선 습격범을 추적합니다. 무장과 방어막을 정비한 뒤 교전하고 조선소에 보고하세요.'},
 {id:'free-freight',faction:'free',type:'delivery',title:'케플러 채굴자 생필품 전달',from:'freeport',to:'belt',quantity:5,reward:820,honor:12,trust:4,risk:'보통',brief:'프리포트 공동 창고의 봉인 생필품을 케플러의 독립 채굴자에게 전달합니다.'},
 {id:'free-scan',faction:'free',type:'survey',title:'장막 성운 항로 지도 작성',from:'freeport',to:'veil',reward:920,honor:14,trust:5,risk:'보통',brief:'장막 성운에서 임무용 정밀 스캔을 수행하고 프리포트에 귀환해 새 항로 자료를 공유하세요.'},
 {id:'free-warrant',faction:'free',type:'bounty',title:'독립 항로의 해적 소탕',from:'freeport',to:'veil',reward:850,honor:16,trust:5,risk:'높음',target:'공허의 가시 · 연맹 수배 표적',hull:95,shield:45,brief:'장막 성운에 도착해 독립 선박을 위협하는 지정 표적을 추적하세요. 격퇴 후 프리포트에 보고합니다.'}
];
export const missionTemplate=id=>MISSION_TEMPLATES.find(m=>m.id===id);
const day=s=>Math.floor(s.hours/24);
export const freshMissions=(hours=0)=>({version:1,noticeDay:-1,closedDay:Math.floor(hours/24),closed:[],active:[],history:[],completed:{union:0,helios:0,free:0}});
export function migrateMissions(s){if(s.missions===undefined)s.missions=freshMissions(s.hours);return s.missions;}
export const missionSlots=s=>(s.missions?.active.length||0)+(s.contract?1:0);
export function missionOffers(s,id){const d=day(s),closed=s.missions?.closedDay===d?s.missions.closed:[];return MISSION_TEMPLATES.filter(t=>(!id||t.faction===id)&&!closed.includes(`${t.id}@${d}`)&&!(s.missions?.active||[]).some(m=>m.template===t.id)).map(t=>({...t,offerId:`${t.id}@${d}`}));}
export function missionRecord(s,id){return s.missions?.active.find(m=>m.id===id);}
export function notifyMission(s,t,content,missionId,urgent=false){migrateComms(s);append(s.comms,'dm-'+t.faction,{author:faction(t.faction).person,content,role:'npc',kind:'mission',hours:s.hours,missionId,missionFaction:t.faction,...(urgent?{priority:'urgent'}:{})});}
export function syncMissions(s){const m=migrateMissions(s),d=day(s);if(m.closedDay!==d){m.closed=[];m.closedDay=d;}if(m.noticeDay>=d)return;
 const first=m.noticeDay<0;m.noticeDay=d;
 for(const f of FACTIONS){const offers=missionOffers(s,f.id);if(!offers.length)continue;const lead=offers[d%offers.length];notifyMission(s,lead,`${first?`함장님, ${f.person}입니다. 앞으로 ${f.name}의 전담 담당자로 임무 제안과 진행 보고를 맡겠습니다. `:''}${lead.title} 의뢰를 전달합니다. ${place(lead.to,s).name} 구역 · ${MISSION_TYPES[lead.type]} · 임무 보수 ${lead.reward.toLocaleString('ko-KR')} CR. 내용을 확인하고 수락 여부를 결정해 주세요.`,lead.offerId,lead.type==='bounty');}
}
function blocked(s){return s.event?'긴급 상황에 먼저 대응하세요.':'';}
export function missionStatus(s,id,action){const m=missionRecord(s,id),offer=missionOffers(s).find(o=>o.offerId===id),t=m?missionTemplate(m.template):offer;let reason=blocked(s);if(!t)return {eligible:false,reason:'현재 유효한 임무를 찾을 수 없습니다.'};
 if(!reason&&action==='accept'){if(m)reason='이미 수락한 임무입니다.';else if(!offer)reason='갱신된 제안을 확인하세요.';else if(missionSlots(s)>=3)reason='동시 임무는 기존 보급 계약을 포함해 최대 3개입니다.';}
 else if(!reason&&action!=='accept'){
  if(!m)reason='수락한 임무가 아닙니다.';
  else if(action==='abandon'){}
  else if(s.travel)reason='목적지 도착 후 진행하세요.';
  else if(action==='pickup'){if(t.type!=='delivery'||m.cargo)reason='적재할 임무 화물이 없습니다.';else if(s.location!==t.from)reason=place(t.from,s).name+'에서 화물을 수령하세요.';else if(usedCargo(s)+t.quantity>40)reason=`화물 공간 ${t.quantity}t이 필요합니다.`;}
  else if(action==='scan'){if(t.type!=='survey'||m.progress)reason='새로 스캔할 임무가 아닙니다.';else if(s.location!==t.to)reason=place(t.to,s).name+'에 도착해야 합니다.';else if(s.fuel<5)reason='정밀 스캔에는 연료 5가 필요합니다.';}
  else if(action==='track'){if(t.type!=='bounty'||m.progress)reason='추적할 표적이 없습니다.';else if(s.location!==t.to)reason=place(t.to,s).name+'에서 표적을 추적하세요.';else if(s.fuel<3)reason='표적 추적에는 연료 3이 필요합니다.';}
  else if(action==='complete'){if(t.type==='delivery'){if(!m.cargo)reason='발주처에서 임무 화물을 먼저 수령하세요.';else if(s.location!==t.to)reason=place(t.to,s).name+'에 화물을 전달하세요.';}else if(!m.progress)reason=t.type==='survey'?'임무용 정밀 스캔을 먼저 완료하세요.':'지정 표적을 먼저 격퇴하세요.';else if(s.location!==t.from)reason=place(t.from,s).name+'에서 담당자에게 보고하세요.';}
  else reason='알 수 없는 임무 행동입니다.';
 }
 return {eligible:!reason,reason};
}
export function executeMission(s,id,action){if(!['accept','pickup','scan','complete','abandon'].includes(action))throw Error('알 수 없는 임무 행동입니다.');const status=missionStatus(s,id,action);if(!status.eligible)throw Error(status.reason);const store=migrateMissions(s);let m=missionRecord(s,id);const t=m?missionTemplate(m.template):missionOffers(s).find(o=>o.offerId===id);
 let text='';if(action==='accept'){m={id,template:t.id,acceptedAt:s.hours,progress:0,cargo:0};store.active.push(m);store.closed.push(id);text=`${t.title} 임무를 등록했습니다. ${t.type==='delivery'?place(t.from,s).name+'에서 봉인 화물을 수령하세요.':place(t.to,s).name+'에서 '+(t.type==='survey'?'임무용 정밀 스캔':'표적 추적')+'을 진행하세요.'}`;}
 if(action==='pickup'){m.cargo=t.quantity;text=`${t.title} · 봉인 임무 화물 ${t.quantity}t 적재. 거래할 수 없으며 ${place(t.to,s).name}에 전달합니다.`;}
 if(action==='scan'){s.fuel-=5;m.progress=1;text=`${t.title} · 정밀 스캔 완료. ${place(t.from,s).name}에 귀환해 보고하세요.`;}
 if(action==='complete'||action==='abandon'){
  if(action==='complete'){s.credits+=t.reward;gainStanding(s,t.faction,t.honor,t.trust);store.completed[t.faction]++;text=`${t.title} 완료. ${t.reward} CR · 명예 +${t.honor} · ${faction(t.faction).name} 신뢰 +${t.trust}.`;}
  else text=`${t.title} 임무를 포기했습니다. 보상과 불이익은 없으며 봉인 화물은 발주처 회수 처리됩니다.`;
  store.active=store.active.filter(x=>x.id!==id);store.history.unshift({id,template:t.id,status:action==='complete'?'completed':'abandoned',time:s.hours});store.history=store.history.slice(0,30);
 }
 notifyMission(s,t,text,id);return text;
}
export function recordMissionVictory(s){const c=s.combat,m=missionRecord(s,c?.missionId);if(c?.status!=='victory'||!m||m.progress)return false;const t=missionTemplate(m.template);if(t.type!=='bounty'||c.region!==t.to||c.enemy.name!==t.target)return false;m.progress=1;notifyMission(s,t,`${t.title} · 지정 표적 격퇴를 확인했습니다. ${place(t.from,s).name}에 귀환해 임무 보수를 수령하세요.`,m.id);return true;}
export function validMissions(m,s){if(m===undefined)return true;const hours=s?.hours,d=Math.floor(hours/24);const validId=(id,template)=>typeof id==='string'&&id.startsWith(template+'@')&&/^\d+$/.test(id.slice(template.length+1))&&Number(id.slice(template.length+1))<=d;return m?.version===1&&(m.tracked===undefined||m.tracked===null||(typeof m.tracked==='string'&&m.tracked.length<=100))&&Number.isInteger(m.noticeDay)&&m.noticeDay>=-1&&m.noticeDay<=d&&Number.isInteger(m.closedDay)&&m.closedDay>=0&&m.closedDay<=d&&Array.isArray(m.closed)&&m.closed.length<=9&&new Set(m.closed).size===m.closed.length&&m.closed.every(id=>MISSION_TEMPLATES.some(t=>id===`${t.id}@${m.closedDay}`))&&m.completed&&FACTIONS.every(f=>Number.isSafeInteger(m.completed[f.id])&&m.completed[f.id]>=0)&&Array.isArray(m.active)&&m.active.length+(s.contract?1:0)<=3&&new Set(m.active.map(x=>x.id)).size===m.active.length&&new Set(m.active.map(x=>x.template)).size===m.active.length&&m.active.every(x=>{const t=missionTemplate(x.template);return t&&validId(x.id,t.id)&&Number.isFinite(x.acceptedAt)&&x.acceptedAt>=0&&x.acceptedAt<=hours&&Math.floor(x.acceptedAt/24)===Number(x.id.split('@')[1])&&[0,1].includes(x.progress)&&Number.isSafeInteger(x.cargo)&&x.cargo>=0&&(t.type==='delivery'?x.progress===0&&[0,t.quantity].includes(x.cargo):x.cargo===0);})&&Array.isArray(m.history)&&m.history.length<=30&&m.history.every(x=>missionTemplate(x.template)&&validId(x.id,x.template)&&['completed','abandoned'].includes(x.status)&&Number.isFinite(x.time)&&x.time>=0&&x.time<=hours)&&(!s.combat?.missionId||s.combat.status!=='active'||m.active.some(x=>x.id===s.combat.missionId&&missionTemplate(x.template).type==='bounty'&&x.progress===0&&s.event?.missionId===x.id));}
