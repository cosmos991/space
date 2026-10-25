import {freshWorld,migrateWorld,random,checkEvent,applyEventChoice,validWorld,validEvent} from './events.js';
import {freshComms,migrateComms,broadcast,ambientPost,validComms} from './communications.js';
import {newEconomy,validEconomy,removeCargo,executeTrade} from './economy.js';
export const PLACES = [
 {id:'haven',name:'헤이븐 정거장',en:'HAVEN STATION',x:310,y:180,type:'station',faction:'연합',color:'#62ddce',desc:'자유 함장들이 모이는 항성계의 관문. 보급과 교역, 새로운 계약이 기다립니다.',market:true,prices:{ore:34,food:22,tech:96}},
 {id:'terra',name:'테라 노바',en:'TERRA NOVA',x:550,y:240,type:'planet',faction:'연합',color:'#71aaf5',desc:'푸른 바다와 거대한 농업 돔을 가진 거주 행성. 식량은 풍부하지만 광물과 기술 부품이 부족합니다.',market:true,prices:{ore:48,food:12,tech:115}},
 {id:'forge',name:'헬리오스 조선소',en:'HELIOS FORGE',x:190,y:370,type:'station',faction:'헬리오스',color:'#eab16b',desc:'궤도 용광로가 빛나는 산업 구역. 광물 수요가 높고 기술 부품을 저렴하게 구할 수 있습니다.',market:true,prices:{ore:56,food:28,tech:65}},
 {id:'belt',name:'케플러 소행성대',en:'KEPLER BELT',x:610,y:385,type:'belt',faction:'자유 채굴 연맹',color:'#eab16b',desc:'희귀 광맥이 밀집한 소행성대. 탐사로 광물을 확보하고 자동 채굴 전초기지를 건설할 수 있습니다.',claim:true},
 {id:'echo',name:'에코 유적',en:'ECHO RUINS',x:420,y:425,type:'ruin',faction:'미확인',color:'#b6a2ec',desc:'고대 구조물에서 규칙적인 신호가 반복됩니다. 탐사 데이터와 잔존 기술을 회수할 수 있습니다.'},
 {id:'veil',name:'장막 성운',en:'THE VEIL',x:670,y:100,type:'nebula',faction:'미확인',color:'#b6a2ec',desc:'센서가 흐려지는 보랏빛 성운. 미등록 함선과 잊힌 항로가 숨어 있습니다.'},
 {id:'freeport',name:'프리포트',en:'FREEPORT',x:115,y:100,type:'station',faction:'자유 항해자',color:'#62ddce',desc:'국적을 묻지 않는 외곽 항구. 소문과 거래가 오가는 독립 선장들의 쉼터입니다.',market:true,prices:{ore:40,food:32,tech:88}}
];
export const GOODS={ore:'광물',food:'식량',tech:'기술 부품'};
export const FACTIONS=[{id:'union',name:'항성 연합',person:'윤서진 · 관제관',tone:'질서와 안전을 중시하는 친절한 관제관',color:'#62ddce'}, {id:'helios',name:'헬리오스 기업',person:'레아 · 거래 담당',tone:'실리를 중시하는 차분한 기업 협상가',color:'#eab16b'},{id:'free',name:'자유 항해 연맹',person:'카이 · 독립 선장',tone:'자유와 탐험을 좋아하는 유쾌한 선장',color:'#b6a2ec'}];
export const place=id=>PLACES.find(p=>p.id===id);
export const usedCargo=s=>Object.values(s.cargo).reduce((a,b)=>a+b,0);
export function freshState(seed=Math.floor(Math.random()*4294967295)+1){return {world:freshWorld(seed),comms:freshComms(),economy:newEconomy(),version:1,hours:0,credits:3200,fuel:100,hull:100,shield:100,location:'haven',travel:null,cargo:{ore:0,food:5,tech:0},survey:{},outpost:false,contract:null,completed:0,event:null,eventAt:6,logs:[{time:0,text:'독립 항해 허가가 승인되었습니다. 노마드의 지휘권은 함장님께 있습니다.',kind:'system'}],chats:{union:[],helios:[],free:[]}};}
export function log(s,text,kind='info'){s.logs.unshift({time:s.hours,text,kind});s.logs=s.logs.slice(0,100);}
export function route(s,id){const target=place(id),from=place(s.location);if(!target||id===s.location)return null;const distance=Math.hypot(from.x-target.x,from.y-target.y);return {to:id,from:s.location,total:Math.ceil(distance/17),remaining:Math.ceil(distance/17),fuel:Math.ceil(distance/24)};}
export function depart(s,id){if(s.travel)throw Error('이미 항해 중입니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');const r=route(s,id);if(!r)throw Error('다른 목적지를 선택하세요.');if(s.fuel<r.fuel)throw Error('연료가 부족합니다. 현재 항구에서 보급하거나 긴급 예인을 요청하세요.');s.fuel-=r.fuel;s.travel=r;log(s,`${place(id).name} 항로 설정. 예상 ${r.total}시간, 연료 ${r.fuel} 사용.`);}
export function migrateState(s){migrateEconomyForWorld(s);migrateWorld(s);migrateComms(s);return s;}
function migrateEconomyForWorld(s){if(!s.economy)s.economy=newEconomy(s.hours);}
export function tick(s,hours){
 if(!Number.isFinite(hours)||hours<0)throw Error('유효하지 않은 진행 시간입니다.');if(s.event||hours===0)return;
 migrateState(s);let left=hours;
 while(left>0&&!s.event){
  const step=Math.min(left,s.travel?.remaining??left,Math.max(0,s.eventAt-s.hours),Math.max(0,s.world.nextBroadcast-s.hours));
  s.hours+=step;left=Math.max(0,left-step);if(s.outpost)s.credits+=step*9;
  let arrived=false;if(s.travel){s.travel.remaining=Math.max(0,s.travel.remaining-step);if(s.travel.remaining<1e-9){s.location=s.travel.to;s.travel=null;s.shield=100;arrived=true;log(s,`${place(s.location).name}에 도착했습니다.`,'arrival');broadcast(s,{author:'항성계 관제',content:`CSV 노마드가 ${place(s.location).name}에 도착했습니다.`,kind:'report'});}}
  if(s.hours>=s.world.nextBroadcast){ambientPost(s,random(s));s.world.nextBroadcast=s.hours+3+Math.floor(random(s)*3);}
  if(s.hours>=s.eventAt){s.eventAt=s.hours+6;if(checkEvent(s))log(s,`${s.event.title} · 대응이 필요합니다.`,'alert');}
  if(arrived)break;
 }
}
export function resolveEvent(s,action){migrateState(s);const outcome=applyEventChoice(s,action);log(s,outcome,'success');return outcome;}
export function trade(s,good,quantity,buy){const q=executeTrade(s,good,quantity,buy);log(s,`${GOODS[good]} ${quantity}t ${buy?'매수':'매도'} · ${q.total} CR${buy?'':` · 실현 손익 ${q.profit.toFixed(2)} CR`}`,'trade');return q;}
export function service(s,type){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel||!place(s.location).market)throw Error('교역항에 정박해야 합니다.');const cost=type==='fuel'?(100-s.fuel)*3:(100-s.hull)*6;if(!['fuel','repair'].includes(type))throw Error('알 수 없는 서비스입니다.');if(!cost)throw Error('이미 최상의 상태입니다.');if(s.credits<cost)throw Error('보유 자금이 부족합니다.');s.credits-=cost;if(type==='fuel')s.fuel=100;else s.hull=100;log(s,`${type==='fuel'?'연료 보급':'선체 수리'} 완료 · ${cost} CR`);}
export function survey(s){if(s.travel)throw Error('도착 후 탐사할 수 있습니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');const id=s.location,p=place(id),n=s.survey[id]||0;if(n>=3)throw Error('이 구역의 탐사를 모두 마쳤습니다.');if(s.fuel<5)throw Error('탐사에는 연료 5가 필요합니다.');const cargo=p.id==='belt'?8:p.id==='echo'?2:0;const good=p.id==='belt'?'ore':'tech';if(usedCargo(s)+cargo>40)throw Error('회수품을 보관할 화물 공간이 부족합니다.');s.fuel-=5;s.survey[id]=n+1;s.credits+=120;if(cargo)s.cargo[good]+=cargo;log(s,`${p.name} 탐사 ${n+1}/3 완료. 데이터 120 CR${cargo?`, ${GOODS[good]} ${cargo}t 회수`:''}.`,'success');migrateState(s);broadcast(s,{author:'노마드 탐사 보고',topic:'exploration',kind:'report',content:`${p.name} 구역 탐사 ${n+1}/3 완료. 탐사 자료를 갱신했습니다.`});if(!p.market&&checkEvent(s,'survey'))log(s,`${s.event.title} · 탐사 중 추가 발견.`,'alert');}
export function claim(s){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel||s.location!=='belt')throw Error('케플러 소행성대에서 건설할 수 있습니다.');if(s.outpost)throw Error('이미 전초기지를 소유하고 있습니다.');if(!s.survey.belt)throw Error('먼저 이 구역을 탐사하세요.');if(s.credits<2000)throw Error('건설 비용 2,000 CR이 필요합니다.');s.credits-=2000;s.outpost=true;log(s,'케플러 자동 채굴 전초기지 가동. 시간당 9 CR 수익.','success');}
export function contract(s,action){if(action==='accept'){if(s.contract)throw Error('이미 진행 중인 계약이 있습니다.');s.contract={to:'terra',good:'food',quantity:5,reward:650};log(s,'연합 보급 계약 수락: 테라 노바에 식량 5t 전달. 보수 650 CR.');}else{if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(!s.contract)throw Error('진행 중인 계약이 없습니다.');const c=s.contract;if(s.travel||s.location!==c.to)throw Error('테라 노바에 도착해야 합니다.');if(s.cargo[c.good]<c.quantity)throw Error('식량 5t이 필요합니다.');removeCargo(s,c.good,c.quantity);s.credits+=c.reward;s.completed++;s.contract=null;log(s,'보급 계약 완료. 650 CR 입금.','success');}}
export function tow(s){if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(s.travel)throw Error('항해 중에는 예인할 수 없습니다.');if(place(s.location).market)throw Error('현재 항구에서 보급하세요.');s.credits=Math.max(0,s.credits-350);s.location='haven';s.fuel=Math.max(s.fuel,25);log(s,'긴급 예인 완료. 헤이븐으로 복귀했습니다. 최대 350 CR 정산.','alert');}
export function validSave(s){return validEvent(s?.event,s?.hours)&&(!s?.world||validWorld(s.world,s.hours))&&(!s?.comms||validComms(s.comms,s.hours))&&(!s?.economy||validEconomy(s.economy,s.hours))&&s?.version===1&&Number.isFinite(s.hours)&&s.hours>=0&&Number.isFinite(s.credits)&&s.credits>=0&&['fuel','hull','shield'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=100)&&!!place(s.location)&&s.cargo&&Object.keys(GOODS).every(k=>Number.isInteger(s.cargo[k])&&s.cargo[k]>=0)&&usedCargo(s)<=40&&Array.isArray(s.logs)&&s.survey&&FACTIONS.every(f=>Array.isArray(s.chats?.[f.id]))&&Number.isFinite(s.eventAt)&&(!s.travel||(place(s.travel.to)&&place(s.travel.from)&&s.travel.total>0&&s.travel.remaining>0&&s.travel.remaining<=s.travel.total));}
