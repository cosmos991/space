import {removeCargo} from './economy.js';
import {FACTIONS,faction,gainStanding} from './factions.js';
import {place} from './world-data.js';
import {append,migrateComms} from './communications.js';
import {usedCargo} from './cargo.js';
export const MISSION_TYPES={delivery:'운송',survey:'탐사',bounty:'현상금',salvage:'잔해 회수',relief:'긴급 구호'};
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
MISSION_TEMPLATES.push(
 {id:'union-clinic',faction:'union',type:'delivery',title:'조선소 격리 병동 의약품 이송',from:'haven',to:'forge',quantity:4,reward:510,honor:9,trust:3,risk:'낮음',brief:'조선소 의료 구역의 재고가 줄었습니다. 헤이븐에서 봉인된 의료 용기를 받아 의료 담당자에게 전달합니다.'},
 {id:'union-echo',faction:'union',type:'survey',title:'유적 주변 민간 항로 안전 진단',from:'haven',to:'echo',reward:630,honor:11,trust:4,risk:'보통',brief:'민간 선박이 보고한 센서 오작동을 조사합니다. 유적 외곽에서 자료를 수집하고 헤이븐에 보고하세요.'},
 {id:'union-veil',faction:'union',type:'bounty',title:'성운 검문을 사칭한 무장 함선',from:'haven',to:'veil',reward:900,honor:17,trust:5,risk:'높음',target:'가짜 검문정 리지드',hull:100,shield:50,brief:'연합 검문을 사칭하며 통행료를 뜯는 함선입니다. 지정 표적을 확인해 격퇴한 뒤 전투 기록을 제출합니다.'},
 {id:'union-recorder',faction:'union',type:'salvage',title:'실종 수송선 항해 기록장치 회수',from:'haven',to:'belt',quantity:3,reward:640,honor:12,trust:4,risk:'보통',brief:'소행성대에서 실종된 수송선의 기록장치 신호가 포착됐습니다. 봉인 잔해를 회수해 헤이븐 조사관에게 인계합니다.'},
 {id:'union-relief',faction:'union',type:'relief',title:'성운 조난선 긴급 생명유지 지원',from:'haven',to:'veil',reward:760,honor:15,trust:5,risk:'높음',brief:'구조선 도착을 기다리는 민간 함선에 식량을 지원하고 접근 항로를 확보합니다. 현장 지원 후 헤이븐에 보고하세요.'},
 {id:'helios-coolant',faction:'helios',type:'delivery',title:'테라 노바 정수 설비 냉각 모듈',from:'forge',to:'terra',quantity:10,reward:740,honor:10,trust:4,risk:'낮음',brief:'정수 설비 점검에 필요한 봉인 모듈입니다. 조선소에서 물자를 수령해 테라 노바 시설 담당자에게 전달합니다.'},
 {id:'helios-star',faction:'helios',type:'survey',title:'차세대 차폐재 방사선 검증',from:'forge',to:'asterion',reward:620,honor:10,trust:4,risk:'낮음',brief:'새 차폐재의 설계 자료를 보완할 관측 임무입니다. 항성 관측 궤도에서 스캔한 뒤 조선소 분석실에 보고합니다.'},
 {id:'helios-belt',faction:'helios',type:'bounty',title:'채굴 장비 강탈선 추적',from:'forge',to:'belt',reward:840,honor:16,trust:5,risk:'높음',target:'장비 강탈선 래칫',hull:95,shield:45,brief:'운반 중인 산업 장비를 노리는 강탈선을 추적합니다. 지정 표적 격퇴 후 조선소에 증거를 제출하세요.'},
 {id:'helios-core',faction:'helios',type:'salvage',title:'유적 탐사 드론의 연구 코어',from:'forge',to:'echo',quantity:5,reward:880,honor:12,trust:4,risk:'보통',brief:'고장 난 탐사 드론에 연구 자료가 남아 있습니다. 드론 잔해를 봉인 회수해 조선소 연구팀에 인계합니다.'},
 {id:'helios-relief',faction:'helios',type:'relief',title:'고립된 채굴선 보급 지원',from:'forge',to:'belt',reward:820,honor:14,trust:5,risk:'보통',brief:'동력 문제로 고립된 작업선의 보급품이 부족합니다. 식량을 전달하고 구조 접근을 지원한 뒤 조선소에 보고합니다.'},
 {id:'free-seeds',faction:'free',type:'delivery',title:'독립 농업 공동체 종자 교환',from:'freeport',to:'terra',quantity:7,reward:900,honor:11,trust:4,risk:'보통',brief:'독립 농업인들이 교환하기로 한 봉인 종자입니다. 프리포트에서 수령해 테라 노바 공동체에 전달합니다.'},
 {id:'free-echo',faction:'free',type:'survey',title:'잊힌 유적 접근로 지도 복원',from:'freeport',to:'echo',reward:800,honor:13,trust:4,risk:'보통',brief:'탐험 선장들의 오래된 지도에 빈 구간이 남아 있습니다. 유적 접근로를 정밀 관측하고 프리포트에서 자료를 공유합니다.'},
 {id:'free-belt',faction:'free',type:'bounty',title:'영세 채굴자 습격범 수배',from:'freeport',to:'belt',reward:750,honor:16,trust:5,risk:'보통',target:'채굴자 사냥꾼 스플린터',hull:85,shield:40,brief:'소형 작업선만 골라 공격하는 표적입니다. 소행성대에서 추적해 격퇴하고 프리포트에 결과를 보고합니다.'},
 {id:'free-beacon',faction:'free',type:'salvage',title:'성운 속 실종 항로 표지기',from:'freeport',to:'veil',quantity:2,reward:790,honor:12,trust:4,risk:'보통',brief:'항로 표지기가 성운 속으로 떠밀려 갔습니다. 장치를 봉인 회수해 프리포트 항로 기술자에게 인계합니다.'},
 {id:'free-relief',faction:'free',type:'relief',title:'유적 원정대 귀환 지원',from:'freeport',to:'echo',reward:880,honor:15,trust:5,risk:'높음',brief:'장기 탐사 원정대가 귀환 지원을 요청했습니다. 식량을 공급하고 구조 접근을 도운 뒤 프리포트에 보고하세요.'}
);
export const missionTemplate=id=>MISSION_TEMPLATES.find(m=>m.id===id);
const day=s=>Math.floor(s.hours/24);
export const freshMissions=(hours=0)=>({version:1,noticeDay:-1,closedDay:Math.floor(hours/24),closed:[],active:[],history:[],lastClosed:{},completed:{union:0,helios:0,free:0}});
export function migrateMissions(s){if(s.missions===undefined)s.missions=freshMissions(s.hours);if(s.missions.lastClosed===undefined){s.missions.lastClosed={};for(const r of s.missions.history||[]){const previous=s.missions.lastClosed[r.template];if(!previous||r.time>previous.time)s.missions.lastClosed[r.template]={status:r.status,time:r.time};}}return s.missions;}
export const missionSlots=s=>(s.missions?.active.length||0)+(s.contract?1:0);
export const MISSION_REPEAT_HOURS={completed:168,abandoned:48};
export function missionCooldown(s,id){const records=[s.missions?.lastClosed?.[id],...(s.missions?.history||[]).filter(m=>m.template===id)].filter(Boolean);return records.reduce((until,r)=>Math.max(until,r.time+MISSION_REPEAT_HOURS[r.status]),0);}
export function missionOffers(s,id){const d=day(s),closed=s.missions?.closedDay===d?s.missions.closed:[],selected=FACTIONS.flatMap(f=>{if(id&&f.id!==id)return [];const pool=MISSION_TEMPLATES.filter(t=>t.faction===f.id),start=d*3%pool.length;return Array.from({length:Math.min(3,pool.length)},(_,n)=>pool[(start+n)%pool.length]);});return selected.filter(t=>!closed.includes(`${t.id}@${d}`)&&!(s.missions?.active||[]).some(m=>m.template===t.id)&&s.hours>=missionCooldown(s,t.id)).map(t=>({...t,offerId:`${t.id}@${d}`}));}

export function missionNextStep(m,t){
 if(t.type==='delivery')return {target:m.cargo?t.to:t.from,action:m.cargo?'complete':'pickup',label:m.cargo?'봉인 화물 전달 · 보수 수령':'봉인 임무 화물 수령',step:m.cargo?'운송 중':'화물 수령 대기'};
 if(m.progress)return {target:t.from,action:'complete',label:'담당자에게 보고 · 보수 수령',step:'목표 달성 · 보고 대기'};
 const data={survey:['scan','임무용 정밀 스캔 · 연료 5','현장 조사 대기'],bounty:['track','지정 표적 추적 · 연료 3','지정 표적 미격퇴'],salvage:['recover','봉인 잔해 '+t.quantity+'t 회수 · 연료 3','회수 작업 대기'],relief:['assist','식량 2t 지원 · 연료 2','긴급 구호 대기']}[t.type];return {target:t.to,action:data[0],label:data[1],step:data[2]};
}
export function storeMissionBrief(s,id,data){if(!missionTemplate(id)||!data||typeof data.text!=='string'||!data.text.trim()||data.text.length>1600||typeof data.model!=='string'||data.model.length>100)throw Error('의뢰 설명 형식을 확인하세요.');s.missions.briefs??={};s.missions.briefs[id]={text:data.text,model:data.model,createdAt:s.hours};}
export function missionRecord(s,id){return s.missions?.active.find(m=>m.id===id);}
export function notifyMission(s,t,content,missionId,urgent=false){migrateComms(s);append(s.comms,'dm-'+t.faction,{author:faction(t.faction).person,content,role:'npc',kind:'mission',hours:s.hours,missionId,missionFaction:t.faction,...(urgent?{priority:'urgent'}:{})});}
export function syncMissions(s){const m=migrateMissions(s),d=day(s);if(m.closedDay!==d){m.closed=[];m.closedDay=d;}if(m.noticeDay>=d)return;
 const first=m.noticeDay<0;m.noticeDay=d;
 for(const f of FACTIONS){const offers=missionOffers(s,f.id);if(!offers.length)continue;const lead=offers[d%offers.length];notifyMission(s,lead,`${first?`함장님, ${f.person}입니다. 앞으로 ${f.name}의 전담 담당자로 임무 제안과 진행 보고를 맡겠습니다. `:''}${lead.title} 의뢰를 전달합니다. ${place(lead.to,s).name} 구역 · ${MISSION_TYPES[lead.type]} · 임무 보수 ${lead.reward.toLocaleString('ko-KR')} CR. 내용을 확인하고 수락 여부를 결정해 주세요.`,lead.offerId,['bounty','relief'].includes(lead.type));}
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
  else if(action==='recover'){if(t.type!=='salvage'||m.progress)reason='회수할 잔해가 없습니다.';else if(s.location!==t.to)reason=place(t.to,s).name+'에 도착해야 합니다.';else if(s.fuel<3)reason='회수 작업에는 연료 3이 필요합니다.';else if(usedCargo(s)+t.quantity>40)reason='봉인 잔해를 적재할 화물 공간이 부족합니다.';}
  else if(action==='assist'){if(t.type!=='relief'||m.progress)reason='지원할 구호 임무가 없습니다.';else if(s.location!==t.to)reason=place(t.to,s).name+'에 도착해야 합니다.';else if(s.fuel<2||s.cargo.food<2)reason='구호에는 연료 2와 식량 2t이 필요합니다.';}
  else if(action==='track'){if(t.type!=='bounty'||m.progress)reason='추적할 표적이 없습니다.';else if(s.location!==t.to)reason=place(t.to,s).name+'에서 표적을 추적하세요.';else if(s.fuel<3)reason='표적 추적에는 연료 3이 필요합니다.';}
  else if(action==='complete'){if(t.type==='delivery'){if(!m.cargo)reason='발주처에서 임무 화물을 먼저 수령하세요.';else if(s.location!==t.to)reason=place(t.to,s).name+'에 화물을 전달하세요.';}else if(!m.progress)reason=t.type==='survey'?'임무용 정밀 스캔을 먼저 완료하세요.':t.type==='salvage'?'봉인 잔해를 먼저 회수하세요.':t.type==='relief'?'현장 구호를 먼저 완료하세요.':'지정 표적을 먼저 격퇴하세요.';else if(s.location!==t.from)reason=place(t.from,s).name+'에서 담당자에게 보고하세요.';}
  else reason='알 수 없는 임무 행동입니다.';
 }
 return {eligible:!reason,reason};
}
export function executeMission(s,id,action){if(!['accept','pickup','scan','recover','assist','complete','abandon'].includes(action))throw Error('알 수 없는 임무 행동입니다.');const status=missionStatus(s,id,action);if(!status.eligible)throw Error(status.reason);const store=migrateMissions(s);let m=missionRecord(s,id);const t=m?missionTemplate(m.template):missionOffers(s).find(o=>o.offerId===id);
 let text='';if(action==='accept'){m={id,template:t.id,acceptedAt:s.hours,progress:0,cargo:0};store.active.push(m);store.closed.push(id);text=`${t.title} 임무를 등록했습니다. ${t.type==='delivery'?place(t.from,s).name+'에서 봉인 화물을 수령하세요.':place(t.to,s).name+'에서 '+missionNextStep(m,t).label+'을 진행하세요.'}`;}
 if(action==='pickup'){m.cargo=t.quantity;text=`${t.title} · 봉인 임무 화물 ${t.quantity}t 적재. 거래할 수 없으며 ${place(t.to,s).name}에 전달합니다.`;}
 if(action==='scan'){s.fuel-=5;m.progress=1;text=`${t.title} · 정밀 스캔 완료. ${place(t.from,s).name}에 귀환해 보고하세요.`;}
 if(action==='recover'){s.fuel-=3;m.cargo=t.quantity;m.progress=1;text=t.title+' · 봉인 잔해 '+t.quantity+'t 회수 완료. '+place(t.from,s).name+'에 인계하세요.';}
 if(action==='assist'){s.fuel-=2;removeCargo(s,'food',2);m.progress=1;text=t.title+' · 식량 2t 지원과 구조 접근 지원 완료. '+place(t.from,s).name+'에 귀환 보고하세요.';}
 if(action==='complete'||action==='abandon'){
  if(action==='complete'){s.credits+=t.reward;gainStanding(s,t.faction,t.honor,t.trust);store.completed[t.faction]++;text=`${t.title} 완료. ${t.reward} CR · 명예 +${t.honor} · ${faction(t.faction).name} 신뢰 +${t.trust}.`;}
  else text=`${t.title} 임무를 포기했습니다. 보상과 불이익은 없으며 봉인 화물은 발주처 회수 처리됩니다.`;
  store.active=store.active.filter(x=>x.id!==id);store.history.unshift({id,template:t.id,status:action==='complete'?'completed':'abandoned',time:s.hours});store.history=store.history.slice(0,30);store.lastClosed[t.id]={status:action==='complete'?'completed':'abandoned',time:s.hours};
 }
 notifyMission(s,t,text,id);return text;
}
export function recordMissionVictory(s){const c=s.combat,m=missionRecord(s,c?.missionId);if(c?.status!=='victory'||!m||m.progress)return false;const t=missionTemplate(m.template);if(t.type!=='bounty'||c.region!==t.to||c.enemy.name!==t.target)return false;m.progress=1;notifyMission(s,t,`${t.title} · 지정 표적 격퇴를 확인했습니다. ${place(t.from,s).name}에 귀환해 임무 보수를 수령하세요.`,m.id);return true;}
export function validMissions(m,s){if(m===undefined)return true;const hours=s?.hours,d=Math.floor(hours/24);const validId=(id,template)=>typeof id==='string'&&id.startsWith(template+'@')&&/^\d+$/.test(id.slice(template.length+1))&&Number(id.slice(template.length+1))<=d;return m?.version===1&&(m.lastClosed===undefined||(m.lastClosed&&typeof m.lastClosed==='object'&&!Array.isArray(m.lastClosed)&&Object.keys(m.lastClosed).length<=MISSION_TEMPLATES.length&&Object.entries(m.lastClosed).every(([id,r])=>missionTemplate(id)&&r&&['completed','abandoned'].includes(r.status)&&Number.isFinite(r.time)&&r.time>=0&&r.time<=hours)))&&(m.briefs===undefined||(m.briefs&&typeof m.briefs==='object'&&!Array.isArray(m.briefs)&&Object.keys(m.briefs).length<=MISSION_TEMPLATES.length&&Object.entries(m.briefs).every(([id,b])=>missionTemplate(id)&&b&&typeof b.text==='string'&&b.text.length>0&&b.text.length<=1600&&typeof b.model==='string'&&b.model.length<=100&&Number.isFinite(b.createdAt)&&b.createdAt>=0&&b.createdAt<=hours)))&&(m.tracked===undefined||m.tracked===null||(typeof m.tracked==='string'&&m.tracked.length<=100))&&Number.isInteger(m.noticeDay)&&m.noticeDay>=-1&&m.noticeDay<=d&&Number.isInteger(m.closedDay)&&m.closedDay>=0&&m.closedDay<=d&&Array.isArray(m.closed)&&m.closed.length<=MISSION_TEMPLATES.length&&new Set(m.closed).size===m.closed.length&&m.closed.every(id=>MISSION_TEMPLATES.some(t=>id===`${t.id}@${m.closedDay}`))&&m.completed&&FACTIONS.every(f=>Number.isSafeInteger(m.completed[f.id])&&m.completed[f.id]>=0)&&Array.isArray(m.active)&&m.active.length+(s.contract?1:0)<=3&&new Set(m.active.map(x=>x.id)).size===m.active.length&&new Set(m.active.map(x=>x.template)).size===m.active.length&&m.active.every(x=>{const t=missionTemplate(x.template);return t&&validId(x.id,t.id)&&Number.isFinite(x.acceptedAt)&&x.acceptedAt>=0&&x.acceptedAt<=hours&&Math.floor(x.acceptedAt/24)===Number(x.id.split('@')[1])&&[0,1].includes(x.progress)&&Number.isSafeInteger(x.cargo)&&x.cargo>=0&&(t.type==='delivery'?x.progress===0&&[0,t.quantity].includes(x.cargo):t.type==='salvage'?x.cargo===(x.progress?t.quantity:0):x.cargo===0);})&&Array.isArray(m.history)&&m.history.length<=30&&m.history.every(x=>missionTemplate(x.template)&&validId(x.id,x.template)&&['completed','abandoned'].includes(x.status)&&Number.isFinite(x.time)&&x.time>=0&&x.time<=hours)&&(!s.combat?.missionId||s.combat.status!=='active'||m.active.some(x=>x.id===s.combat.missionId&&missionTemplate(x.template).type==='bounty'&&x.progress===0&&s.event?.missionId===x.id));}
