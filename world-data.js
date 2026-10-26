import {YARDS} from './ships-data.js';
import {shipStats,serviceQuote} from './equipment.js';
export const PLACES=[
 {id:'haven',name:'헤이븐 정거장',en:'HAVEN STATION',x:310,y:180,type:'station',faction:'항성 연합',factionId:'union',color:'#62ddce',desc:'성계의 입출항을 관리하는 연합 공공 정거장. 교역·보급·수리와 연합 연락 업무를 이용할 수 있습니다.',market:true,prices:{ore:34,food:22,tech:96}},
 {id:'terra',name:'테라 노바',en:'TERRA NOVA',x:550,y:240,type:'planet',faction:'항성 연합',factionId:'union',color:'#71aaf5',desc:'푸른 바다와 농업 돔을 가진 거주 행성. 궤도 조사, 현지 교역, 행정청의 소유권 심사를 진행할 수 있습니다.',market:true,prices:{ore:48,food:12,tech:115},purchasePrice:1000000000,requiredHonor:10000,requiredStanding:60,income:5000},
 {id:'forge',name:'헬리오스 조선소',en:'HELIOS FORGE',x:190,y:370,type:'station',faction:'헬리오스 기업',factionId:'helios',color:'#eab16b',desc:'헬리오스가 운영하는 산업 정거장. 광물 납품과 부품 거래, 함선 보급·수리를 지원합니다. 시설 자체는 매각하지 않습니다.',market:true,prices:{ore:56,food:28,tech:65}},
 {id:'belt',name:'케플러 소행성대',en:'KEPLER BELT',x:610,y:385,type:'belt',faction:'자유 항해 연맹',factionId:'free',color:'#eab16b',desc:'독립 채굴자의 광맥이 모인 구역. 광물 탐사와 자동 채굴 전초기지 건설이 가능합니다.',claim:true},
 {id:'echo',name:'에코 유적',en:'ECHO RUINS',x:420,y:425,type:'ruin',faction:'미지정 탐사 구역',factionId:null,color:'#b6a2ec',desc:'고대 구조물에서 불규칙한 신호가 반복됩니다. 유물 조사와 기술 부품 회수, 탐사 정보 공유가 가능합니다.'},
 {id:'veil',name:'장막 성운',en:'THE VEIL',x:670,y:100,type:'nebula',faction:'미지정 탐사 구역',factionId:null,color:'#b6a2ec',desc:'센서가 흐려지는 보랏빛 성운. 센서 탐사와 미확인 신호 조사를 진행할 수 있는 위험 구역입니다.'},
 {id:'freeport',name:'프리포트',en:'FREEPORT',x:115,y:100,type:'station',faction:'자유 항해 연맹',factionId:'free',color:'#62ddce',desc:'자유 항해 연맹의 공동 항구. 현지 교역과 보급, 탐사 자료 교환을 지원합니다. 공동 정거장은 구매할 수 없습니다.',market:true,prices:{ore:40,food:32,tech:88}},
 {id:'asterion',name:'아스테리온 항성',en:'ASTERION',x:375,y:255,type:'star',faction:'공동 관측 구역',factionId:null,color:'#efd397',desc:'항성계 중심의 주계열성. 안전 관측 궤도에서 항성 스펙트럼과 방사선 활동을 조사합니다. 항성 표면에 착륙하거나 교역할 수 없습니다.'}
];
export function warpGate(systemId='home'){return {id:systemId+'-warp-gate',systemId,name:'워프 게이트',en:'WARP GATE',x:745,y:285,type:'gate',faction:'중립 항로 관리망',factionId:null,color:'#8de8ff',desc:'항성계 사이를 연결하는 중립 워프 게이트. 이곳에 도착한 뒤 성간 패널에서 발견한 인접 항성계로 출발할 수 있습니다.',market:false};}
export const allPlaces=s=>[...PLACES,warpGate(),...Object.values(s?.galaxy?.systems||{}).flatMap(g=>[...g.locations,warpGate(g.id)])];
export const placesFor=s=>{const id=s?.galaxy?.current||'home';return id==='home'?[...PLACES,warpGate()]:[...(s.galaxy.systems[id]?.locations||[]),warpGate(id)];};
export const place=(id,s)=>allPlaces(s).find(p=>p.id===id);
export const LOCATION_TYPES={gate:{name:'워프 게이트',icon:'◎',survey:null},station:{name:'정거장',icon:'◇',survey:null},planet:{name:'거주 행성',icon:'◉',survey:'궤도·지표 조사'},star:{name:'항성 관측 궤도',icon:'✦',survey:'항성 스펙트럼 관측'},belt:{name:'소행성대',icon:'⁙',survey:'광맥 탐사'},ruin:{name:'유적',icon:'✧',survey:'유적 정밀 조사'},nebula:{name:'성운',icon:'≈',survey:'센서·신호 탐사'}};
export function routeFor(s,id){const target=place(id,s),from=place(s.location,s);if(!target||id===s.location||!placesFor(s).some(p=>p.id===id))return null;const distance=Math.hypot(from.x-target.x,from.y-target.y),stats=shipStats(s),total=Math.max(1,Math.ceil(distance/17/stats.speed));return {to:id,from:s.location,total,remaining:total,fuel:Math.max(1,Math.ceil(distance/24*stats.fuelFactor))};}
export function planetPurchaseStatus(s,id){const p=place(id,s),d=s.diplomacy;let reason='';if(!p||p.type!=='planet')reason=p?.type==='station'?'정거장은 구매할 수 없습니다.':'행성만 소유권을 매입할 수 있습니다.';else if(d?.ownedPlanets.includes(id))reason='이미 소유한 행성입니다.';else if(s.travel||s.location!==id)reason='해당 행성에 도착해야 합니다.';else if(s.event)reason='긴급 상황에 먼저 대응하세요.';else if(s.credits<p.purchasePrice)reason='행성 매입에 10억 CR이 필요합니다.';else if((d?.honor||0)<p.requiredHonor)reason='성계 명예 10,000이 필요합니다.';else if((d?.reputation[p.factionId||'union']||0)<p.requiredStanding)reason='매도 팩션의 신뢰도 60이 필요합니다.';return {eligible:!reason,reason};}
export function planetIncome(s){return (s.diplomacy?.ownedPlanets||[]).reduce((n,id)=>n+(place(id,s)?.income||0),0);}
export function availableLocalActions(s,id=s.location){const p=place(id,s);if(!p)return [];const type=LOCATION_TYPES[p.type],here=!s.travel&&s.location===id,blocked=!here?'도착 후 이용할 수 있습니다.':s.event?'사건에 먼저 대응하세요.':'';const list=[];const add=(id,title,detail,reason='')=>list.push({id,title,detail,reason:blocked||reason,disabled:!!(blocked||reason)});
 if(YARDS.includes(id)||['belt','ruin','nebula'].includes(p.type))add('shipyard',YARDS.includes(id)?'함선 시장·조선소':'채굴·인양 작업','함선 구매·제작·기함 교체 / 건조 자재 수집');
 if(p.type==='gate')add('warp','워프 항로 접속','성간 패널에서 목적지 선택 · 연료 18 · 18h');
 if(type.survey)add('survey',type.survey,'연료 5 · 조사 자료 120 CR · 구역당 3회',(s.survey[id]||0)>=3?'이 구역의 조사를 완료했습니다.':s.fuel<5?'연료 5가 필요합니다.':'');
 if(p.market){add('market',p.type==='planet'?'현지 시장 접속':'정거장 거래소','상품 매매 · 시세·화물 확인');add('fuel','연료 보급',`완충 비용 ${serviceQuote(s,'fuel')} CR`,s.fuel===100?'연료가 가득합니다.':s.credits<serviceQuote(s,'fuel')?'보급 비용이 부족합니다.':'');add('repair','선체 수리',`완전 수리 ${serviceQuote(s,'repair')} CR`,s.hull===100?'선체가 정상입니다.':s.credits<serviceQuote(s,'repair')?'수리 비용이 부족합니다.':'');}
 if(p.type==='station')add('equipment','함선 장비 도크','무기 · 실드 · 엔진 구입 / 장착 / 판매');
 if(p.market)add('recruitment','현지 인력 중개소','이 장소의 인물 만나기 · 이력 확인 · 승함 계약');
 if(p.type==='station')add('crew','승무원 관리','탑승/하선 · 담당 모듈 배치 · 개인 대화');
 if(p.type==='station'&&!p.systemId)add('missions','담당자 임무 게시판','팩션 의뢰 검토 · 진행 중인 임무 확인');
 if(p.claim)add('claim','자동 채굴 전초기지 건설','2,000 CR · 시간당 9 CR',s.outpost?'이미 전초기지를 소유하고 있습니다.':!s.survey.belt?'광맥을 먼저 탐사하세요.':s.credits<2000?'2,000 CR이 필요합니다.':'');
 if(id==='forge')add('deliver-ore','헬리오스 광물 조달 납품','광물 10t → 600 CR · 명예 +8 · 헬리오스 신뢰 +4',s.cargo.ore<10?'광물 10t이 필요합니다.':'');
 if(id==='freeport')add('share-surveys','연맹에 새 탐사 자료 공유','새 조사 단계당 명예 +5 · 신뢰 +2');
 if(p.factionId)add('contact','관할 팩션과 통신',p.faction+' 연락관 연결');
 if(!p.market)add('tow','헤이븐으로 긴급 예인','최대 350 CR · 최소 연료 25 확보');
 return list;
}
