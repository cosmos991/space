import {cargoCapacity} from './ships-data.js';
import {place} from './world-data.js';
import {portsFor,portFor} from './economy.js';
import {migrateCrew,crewMessage} from './crew.js';
import {usedCargo as used} from './cargo.js';
import {pushIssue} from './news.js';
import {gainStanding} from './factions.js';
import {removeCargo,marketSnapshot,PORTS} from './economy.js';
import {broadcast} from './communications.js';
export const EVENT_RULES={checkHours:6,minGap:12,typeCooldown:36,baseTravelChance:.28,surveyChance:.35};
export const EVENT_CATEGORIES={combat:'전투',encounter:'조우',discovery:'발견',hazard:'항로 이상'};
export const DEFAULT_EVENT_SETTINGS={interval:6,minGap:12,cooldown:36,travelChance:28,surveyChance:35,riskBonus:15,damageBonus:8,warningChance:70,combat:100,encounter:100,discovery:100,hazard:100};
const ranges={interval:[1,48],minGap:[0,96],cooldown:[0,168],travelChance:[0,100],surveyChance:[0,100],riskBonus:[0,100],damageBonus:[0,100],warningChance:[0,100],combat:[0,300],encounter:[0,300],discovery:[0,300],hazard:[0,300]};
export const eventCategory=id=>id==='raiders'?'combat':['ion','debris','gravity','micrometeor'].includes(id)?'hazard':['cache','relic','probe','wreck','comet'].includes(id)?'discovery':'encounter';
export const eventSettings=s=>({...DEFAULT_EVENT_SETTINGS,...s.world?.eventSettings});
export function updateEventSettings(s,values){if(!validSettings(values))throw Error('사건 설정의 숫자 범위를 확인하세요.');migrateWorld(s);s.world.eventSettings={...values};s.eventAt=s.hours+values.interval;}
function validSettings(v){return v&&Object.keys(v).length===Object.keys(ranges).length&&Object.entries(ranges).every(([k,[a,b]])=>Number.isInteger(v[k])&&v[k]>=a&&v[k]<=b);}
export function routeWarning(s){const f=s.world?.forecast;return f&&s.travel&&f.from===s.travel.from&&f.to===s.travel.to?f:null;}
export function activeRouteAlert(s){if(['ion','debris','gravity','micrometeor'].includes(s.event?.id))return {id:s.event.id,title:s.event.title,active:true};const f=routeWarning(s);return f?{...f,title:TYPES[f.id].title,active:false}:null;}
export function freshWorld(seed=123456789,hours=0){return {version:1,rng:(seed>>>0)||1,lastEventAt:hours-12,cooldowns:{},nextBroadcast:hours+3,resolved:0,checks:0};}
export function migrateWorld(s){if(!s.world)s.world=freshWorld(0x51f15e+Math.floor(s.hours),s.hours);return s;}
export function random(s){migrateWorld(s);let x=s.world.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.world.rng=x>>>0;return s.world.rng/4294967296;}
const riskZone=s=>['belt','nebula','ruin'].includes(place(s.travel?.to||s.location,s)?.type);
const TYPES={
 gravity:{title:'불안정한 중력 항로',text:'전방의 국지 중력 변화가 항로를 휘게 만듭니다. 자세 제어에 연료를 쓰거나 안전한 우회 항로를 선택할 수 있습니다.',weight:14},
 micrometeor:{title:'고속 미소 운석대',text:'센서가 작은 금속성 운석의 고속 접근을 포착했습니다. 연료를 사용해 회피하거나 실드로 버틸 수 있습니다.',weight:16},
 tanker:{title:'독립 급유선의 긴급 보급 제안',text:'민간 급유선이 연료를 판매합니다. 정거장보다 비싸지만 먼 항해를 이어갈 수 있습니다.',weight:14},
 repair:{title:'순회 정비선과의 조우',text:'순회 정비팀이 기술 부품을 받아 선체를 수리하겠다고 제안합니다. 정밀 검사 자료만 제공할 수도 있습니다.',weight:14},
 convoy:{title:'민간 이주 선단의 항로 요청',text:'새로운 식민지를 향하는 이주 선단이 안전한 항로 자료와 보급품을 요청합니다. 항로 자료를 전달하거나 식량을 나눌 수 있습니다.',weight:16},
 probe:{title:'수명이 다한 탐사 프로브',text:'구형 탐사 프로브가 마지막 관측 자료를 반복 송신합니다. 접근해 부품을 회수하거나 원격으로 자료를 복사할 수 있습니다.',weight:22},
 wreck:{title:'폐선의 봉인된 장비실',text:'오래된 무인 폐선에서 기술 장비가 감지됩니다. 회수에는 추진 연료가 필요하고, 불안정한 선체 구조가 위험합니다.',weight:18},
 comet:{title:'희귀 혜성의 근접 통과',text:'희귀 휘발성 물질을 품은 혜성이 항로를 가로지릅니다. 근접 관측은 가치가 높지만 연료를 소비합니다.',weight:18},
 'crew-rescue':{title:'외곽 탐사정의 조난 신호',text:'소형 탐사정에서 이도현이 구조 요청을 보냈습니다. 구조대의 접근 항로를 확보하면 생존자를 헤이븐으로 이송할 수 있습니다. 구조 후 현지에서 승함을 제안할 수 있습니다.',weight:28},
 raiders:{title:'항로를 차단한 무장 함선',text:'무등록 무장 함선이 항로를 막고 200 CR의 통행료를 요구합니다. 교전하거나 철수를 시도할 수 있습니다.',weight:20},
 rescue:{title:'민간 수송선 구조 요청',text:'민간 수송선이 생명 유지 장치 고장을 알립니다. 보급품을 지원하거나 구조대에 좌표를 중계할 수 있습니다.',weight:30},
 debris:{title:'항로 위 잔해 구름',text:'항로에 파편이 넓게 흩어져 있습니다. 시간을 들여 우회하거나 실드를 소모해 통과할 수 있습니다.',weight:20},
 ion:{title:'국지 이온 폭풍',text:'외곽 구역에서 이온 활동을 감지했습니다. 연료를 써 우회하거나, 실드와 선체의 손상을 감수하고 돌파할 수 있습니다.',weight:18},
 trader:{title:'이동 상인의 교역 제안',text:'독립 상인이 광물 4t을 100 CR에 판매한다고 제안합니다. 물품을 확인한 뒤 거래할 수 있습니다.',weight:16},
 patrol:{title:'연합 순찰선의 신원 확인',text:'순찰선이 항해 허가와 화물 명세를 요청합니다. 합법적인 독립 함선이므로 서류를 제출하면 통과할 수 있습니다.',weight:16},
 cache:{title:'표류 보급 컨테이너 발견',text:'탐사 센서에 기술 부품 2t이 든 컨테이너가 포착됐습니다. 회수에는 연료와 화물 공간이 필요합니다.',weight:45},
 relic:{title:'고대 유적의 불규칙 신호',text:'해독 가능한 신호가 포착됐습니다. 정밀 분석은 가치가 높지만 탐사 장비와 선체에 부담을 줄 수 있습니다.',weight:35}
};
export function eligibleEvents(s,trigger='time'){
 const region=place(s.travel?.to||s.location,s),outer=riskZone(s);
 const discoveries=['cache','probe','comet',...(['ruin','nebula'].includes(region?.type)?['relic','wreck']:[])];
 const ids=trigger==='survey'?discoveries:s.travel?['rescue','debris','trader','raiders','tanker','repair','convoy','probe',...(outer?['ion','gravity','micrometeor','wreck']:['patrol'])]:['rescue',...discoveries];
 if(['echo','veil'].includes(s.travel?.to||s.location)&&!s.crew?.recruitment?.rescued&&!s.crew?.roster.some(m=>m.id==='dohyun')&&!s.crew?.records?.dohyun?.met)ids.push('crew-rescue');
 return ids.filter(id=>s.hours-(s.world?.cooldowns[id]??-1000)>=eventSettings(s).cooldown).map(id=>({id,weight:id==='raiders'?(riskZone(s)?28:12):TYPES[id].weight})).map(o=>({...o,weight:o.weight*eventSettings(s)[eventCategory(o.id)]/100})).filter(o=>o.weight>0);
}
export function makeEvent(s,id,trigger='time'){
 if(!TYPES[id])throw Error('알 수 없는 사건입니다.');migrateWorld(s);
 const e={id,uid:`${id}-${s.world.checks}-${s.hours}`,title:TYPES[id].title,text:TYPES[id].text,location:s.travel?.to||s.location,created:s.hours,trigger};
 if(id==='raiders'){e.enemy={name:['회색 송곳니','블랙 케스트럴','공허의 가시'][Math.floor(random(s)*3)],hull:70,shield:35,reward:550};}s.event=e;
 const region=place(e.location,s);if(region){const from=s.travel?.kind!=='jump'&&s.travel?place(s.travel.from,s):region,t=s.travel?.kind!=='jump'&&s.travel?1-s.travel.remaining/s.travel.total:1;const kind=eventCategory(id)==='hazard'?'hazard':['cache','relic','probe','wreck','comet'].includes(id)?'discovery':id==='crew-rescue'?'signal':'ship';s.world.chart=(s.world.chart||[]).filter(p=>p.uid!==e.uid);s.world.chart.unshift({id:'event:'+e.uid,uid:e.uid,eventId:id,kind,title:e.title,location:e.location,x:Math.max(35,Math.min(765,from.x+(region.x-from.x)*t+25)),y:Math.max(65,Math.min(470,from.y+(region.y-from.y)*t-25)),created:s.hours});s.world.chart=s.world.chart.slice(0,30);}
 s.world.lastEventAt=s.hours;s.world.cooldowns[id]=s.hours;
 pushIssue(s,{region:e.location,key:'encounter-'+id,title:e.title,level:id==='raiders'?'danger':'warning',duration:24});
 broadcast(s,{author:id==='rescue'?'수송선 리프':'항로 감시망',content:`[사건 수신] ${e.title} · CSV 노마드의 대응 대기.`,topic:id==='trader'?'trade':trigger==='survey'?'exploration':'safety',kind:'report',eventId:e.uid});return e;
}
export function checkEvent(s,trigger='time'){
 migrateWorld(s);s.world.checks++;if(s.event)return false;const settings=eventSettings(s),forecast=routeWarning(s);if(forecast){delete s.world.forecast;makeEvent(s,forecast.id,trigger);return true;}delete s.world.forecast;if(s.hours-s.world.lastEventAt<settings.minGap)return false;
 // Port life remains a non-blocking news feed; it never forces a choice while docked.
 if(trigger==='time'&&!s.travel&&portFor(s)){if(random(s)<.1){const market=marketSnapshot(s),good=['ore','food','tech'][Math.floor(random(s)*3)],drop=Math.min(8,market.stock[good]);s.economy.markets[s.location]={updated:market.updated,stock:{...market.stock,[good]:market.stock[good]-drop}};broadcast(s,{author:portFor(s).name+' 거래소',topic:'trade',kind:'report',content:`현지 구매 수요로 ${good==='ore'?'광물':good==='food'?'식량':'기술 부품'} 재고가 ${drop}t 감소했습니다. 거래소의 최신 시세를 확인하세요.`});pushIssue(s,{region:s.location,key:'market',title:`${good==='ore'?'광물':good==='food'?'식량':'기술 부품'} 재고 ${drop}t 감소 · 최신 시세 확인 권장`,level:'warning',duration:18});}return false;}
 const chance=(trigger==='survey'?settings.surveyChance:settings.travelChance===0?0:Math.min(100,settings.travelChance+(riskZone(s)?settings.riskBonus:0)+(s.hull<50?settings.damageBonus:0)))/100;
 if(random(s)>=chance)return false;const options=eligibleEvents(s,trigger);if(!options.length)return false;let roll=random(s)*options.reduce((n,o)=>n+o.weight,0);let id=options.at(-1).id;for(const o of options){roll-=o.weight;if(roll<0){id=o.id;break;}}if(trigger==='time'&&s.travel&&eventCategory(id)==='hazard'&&s.travel.remaining>settings.interval&&random(s)<settings.warningChance/100){s.world.forecast={id,from:s.travel.from,to:s.travel.to,created:s.hours};const member=s.crew?.roster.find(m=>m.assignment==='navigation')||s.crew?.roster.find(m=>m.assignment==='engineering')||s.crew?.roster[0];const text=`전방 항로에서 ${TYPES[id].title} 징후를 감지했습니다. 다음 사건 판정까지 약 ${settings.interval}시간입니다. 우회 또는 통과 대응을 준비해 주세요.`;if(member){s.world.forecast.reporter=member.id;crewMessage(s,member.id,'npc',text);}broadcast(s,{author:member?'노마드 승무원':'노마드 항로 센서',topic:'safety',content:text,kind:'report'});return false;}makeEvent(s,id,trigger);return true;
}
export function eventChoices(s){
 const id=s.event?.id==='signal'?'rescue':s.event?.id;if(!id)return [];
 const choice=(id,label,detail,reason='')=>({id,label,detail,disabled:!!reason,reason});
 if(id==='gravity')return [choice('stabilize','추력으로 자세 유지','연료 −5',s.fuel<5?'연료 5가 필요합니다.':''),choice('detour','안정 항로로 우회','항해 시간 +3h'),choice('ignore','중력 변화가 잦아들 때까지 대기','항해 시간 +5h')];
 if(id==='micrometeor')return [choice('evade','회피 기동','연료 −3 · 항해 시간 +1h',s.fuel<3?'연료 3이 필요합니다.':''),choice('push','실드로 충격 흡수','실드 −25 · 30% 확률 선체 −7'),choice('ignore','밀집 구역을 우회','항해 시간 +3h')];
 if(id==='tanker')return [choice('refuel','연료 20 보급','240 CR · 최대 20 보급 · 잔여 탱크 용량까지만 충전',s.fuel>=100?'연료가 가득합니다.':s.credits<240?'240 CR이 필요합니다.':''),choice('ignore','급유 제안 거절','변화 없이 항해 계속')];
 if(id==='repair')return [choice('repair','선체 응급 정비','기술 부품 1t · 선체 +18 (최대 100)',s.hull>=100?'선체가 온전합니다.':s.cargo.tech<1?'기술 부품 1t이 필요합니다.':''),choice('share','진단 자료 제공','보상 45 CR'),choice('ignore','정비 제안 거절','자원 변화 없음')];
 if(id==='convoy')return [choice('supply','식량을 나누기','식량 −3t · 180 CR · 자유 항해 연맹 신뢰 +2',s.cargo.food<3?'식량 3t이 필요합니다.':''),choice('guide','항로 자료 전송','60 CR · 자유 항해 연맹 신뢰 +1'),choice('ignore','선단과 작별','자원 변화 없음')];
 if(id==='probe')return [choice('recover','프로브 회수','연료 −2 · 기술 부품 +1t',s.fuel<2?'연료 2가 필요합니다.':used(s)+1>cargoCapacity(s)?'화물 공간 1t이 필요합니다.':''),choice('download','관측 자료 원격 복사','보상 95 CR'),choice('ignore','프로브를 남겨두기','자원 변화 없음')];
 if(id==='wreck')return [choice('salvage','장비실 인양','연료 −3 · 기술 부품 +3t · 35% 확률 선체 −6',s.fuel<3?'연료 3이 필요합니다.':used(s)+3>cargoCapacity(s)?'화물 공간 3t이 필요합니다.':''),choice('scan','안전 거리에서 선체 스캔','보상 100 CR'),choice('ignore','폐선에서 이탈','자원 변화 없음')];
 if(id==='comet')return [choice('observe','근접 관측','연료 −4 · 보상 230 CR',s.fuel<4?'연료 4가 필요합니다.':''),choice('record','원격 궤도 기록','보상 70 CR'),choice('ignore','혜성을 지나보내기','자원 변화 없음')];
 if(id==='raiders')return s.combat?.status==='active'?[]:[choice('fight','교전 태세로 전환','적 선체 70 / 실드 35 · 격퇴 현상금 550 CR'),choice('evade','즉시 철수 시도',s.fuel>=3?'연료 −3 · 탈출 75% · 실패 시 교전':'무추진 탈출 40% · 실패 시 교전'),choice('pay','통행료 지불','200 CR 소비 · 교전 없이 이탈',s.credits<200?'200 CR이 필요합니다.':'')];
 if(id==='crew-rescue')return [choice('rescue','구조대 접근 항로 확보','연료 −2 · 이도현 구조 · 헤이븐에서 영입 가능',s.fuel<2?'연료 2가 필요합니다.':''),choice('ignore','현재 항로 유지','영입 기회는 다음 조난 신호에서 다시 만날 수 있습니다.')];
 if(id==='rescue')return [choice('help','지원 물자 전달','식량 2t 소비 · 보상 260 CR',s.cargo.food<2?'식량 2t이 필요합니다.':''),choice('relay','구조대에 좌표 중계','보상 60 CR · 소모 없음'),choice('ignore','현재 임무에 집중','변화 없이 이탈')];
 if(id==='debris')return [choice('detour','잔해를 피해 우회','항해 시간 +2h'),choice('push','실드로 밀고 통과','실드 −20 · 선체 손상 25% 확률(−6)'),choice('ignore','안전 항로 재계산','항해 시간 +3h · 자원 손실 없음')];
 if(id==='ion')return [choice('detour','폭풍을 우회','연료 −4 · 항해 시간 +2h',s.fuel<4?'연료 4가 필요합니다.':''),choice('push','실드에 동력을 집중해 돌파','실드 −30 · 선체 손상 45% 확률(−10)'),choice('ignore','폭풍이 약해질 때까지 대기','항해 시간 +4h · 자원 손실 없음')];
 if(id==='trader')return [choice('buy','광물 4t 구매','100 CR 지불 · 평균 원가에 반영',s.credits<100?'100 CR이 필요합니다.':used(s)+4>cargoCapacity(s)?'화물 공간 4t이 필요합니다.':''),choice('ignore','제안 거절','거래 없이 항해 계속')];
 if(id==='patrol')return [choice('papers','허가증과 명세 제출','항해 시간 +1h · 벌금 없음'),choice('data','탐사 자료도 함께 제공','이미 탐사한 구역이 있으면 보상 100 CR',!Object.values(s.survey).some(n=>n>0)?'탐사 기록이 필요합니다.':''),choice('ignore','기본 신원 확인만 진행','항해 시간 +2h')];
 if(id==='cache')return [choice('recover','컨테이너 회수','연료 −2 · 기술 부품 +2t',s.fuel<2?'연료 2가 필요합니다.':used(s)+2>cargoCapacity(s)?'화물 공간 2t이 필요합니다.':''),choice('scan','외부 스캔 자료 판매','보상 90 CR · 화물 공간 불필요'),choice('ignore','발견 좌표만 남기기','자원 변화 없음')];
 if(id==='relic')return [choice('analyze','신호 정밀 분석','연료 −3 · 70% 확률 420 CR / 실패 시 선체 −8',s.fuel<3?'연료 3이 필요합니다.':''),choice('scan','안전 거리에서 관측','보상 110 CR · 손상 없음'),choice('ignore','신호에서 이탈','자원 변화 없음')];
 return [];
}
export function applyEventChoice(s,action){
 if(!s.event)throw Error('활성 사건이 없습니다.');const option=eventChoices(s).find(c=>c.id===action);if(!option)throw Error('유효하지 않은 대응입니다.');if(option.disabled)throw Error(option.reason);
 const e=s.event,id=e.id==='signal'?'rescue':e.id;let outcome=option.label+' 완료.';const delay=h=>{if(s.travel){s.travel.total+=h;s.travel.remaining+=h;}else s.eventAt=Math.max(s.eventAt,s.hours+h);};
 const damage=(shield,hull,chance)=>{s.shield=Math.max(0,s.shield-shield);if(random(s)<chance){s.hull=Math.max(1,s.hull-hull);return `선체 ${hull} 손상.`;}return '선체 손상 없이 통과했습니다.';};
 if(id==='gravity'){if(action==='stabilize'){s.fuel-=5;outcome='자세 제어 추력으로 중력 이상 구역을 통과했습니다. 연료 5 소모.';}else{delay(action==='detour'?3:5);outcome=action==='detour'?'안정 항로를 확보했습니다. 도착 3시간 지연.':'중력 변화가 약해질 때까지 대기했습니다. 도착 5시간 지연.';}}
 if(id==='micrometeor'){if(action==='evade'){s.fuel-=3;delay(1);outcome='연료 3을 소모해 운석대를 회피했습니다. 도착 1시간 지연.';}else if(action==='push')outcome='실드로 운석 충격을 흡수했습니다. '+damage(25,7,.3);else{delay(3);outcome='운석 밀집 구역을 우회했습니다. 도착 3시간 지연.';}}
 if(id==='tanker'&&action==='refuel'){const n=Math.min(20,100-s.fuel);s.credits-=240;s.fuel+=n;outcome=`급유선에 240 CR 지불. 연료 ${n} 보급 완료.`;}
 if(id==='repair'){if(action==='repair'){const n=Math.min(18,100-s.hull);removeCargo(s,'tech',1);s.hull+=n;outcome=`기술 부품 1t으로 선체 ${n} 복구. 정비 완료.`;}if(action==='share'){s.credits+=45;outcome='진단 자료 제공. 협력 보상 45 CR.';}}
 if(id==='convoy'){if(action==='supply'){removeCargo(s,'food',3);s.credits+=180;gainStanding(s,'free',0,2);outcome='식량 3t 지원. 감사 보상 180 CR · 자유 항해 연맹 신뢰 +2.';}if(action==='guide'){s.credits+=60;gainStanding(s,'free',0,1);outcome='안전 항로 자료 전송. 60 CR · 자유 항해 연맹 신뢰 +1.';}}
 if(id==='probe'){if(action==='recover'){s.fuel-=2;s.cargo.tech++;outcome='탐사 프로브 회수. 연료 2 소모 · 기술 부품 1t 확보.';}if(action==='download'){s.credits+=95;outcome='관측 자료 원격 복사 완료. 연구 보상 95 CR.';}}
 if(id==='wreck'){if(action==='salvage'){s.fuel-=3;s.cargo.tech+=3;outcome='장비실 인양 완료. 연료 3 소모 · 기술 부품 3t 확보. '+damage(0,6,.35);}if(action==='scan'){s.credits+=100;outcome='폐선 구조 자료 전송. 보상 100 CR.';}}
 if(id==='comet'){if(action==='observe'){s.fuel-=4;s.credits+=230;outcome='혜성 근접 관측 성공. 연료 4 소모 · 연구 보상 230 CR.';}if(action==='record'){s.credits+=70;outcome='원격 궤도 기록 완료. 연구 보상 70 CR.';}}
 if(id==='crew-rescue'&&action==='rescue'){migrateCrew(s);if(s.crew.recruitment.rescued)throw Error('이미 구조한 인물입니다.');s.fuel-=2;s.crew.recruitment.rescued=true;outcome='이도현 구조 지원 완료. 구조대가 헤이븐으로 이송합니다. 헤이븐 거래소에서 계약금 580 CR · 급여 32 CR/일의 승함 제안을 확인하세요.';}
 if(id==='rescue'&&action==='help'){removeCargo(s,'food',2);s.credits+=260;gainStanding(s,'union',15,2);gainStanding(s,'free',0,1);outcome='식량 2t 지원 완료. 구조 감사 보상 260 CR.';}
 if(id==='rescue'&&action==='relay'){s.credits+=60;gainStanding(s,'union',3,1);outcome='구조 좌표 중계 완료. 통신 보상 60 CR.';}
 if(id==='debris'){if(action==='push')outcome='실드 20 소모. '+damage(20,6,.25);else delay(action==='detour'?2:3);}
 if(id==='ion'){if(action==='push')outcome='실드 30 소모. '+damage(30,10,.45);else{if(action==='detour')s.fuel-=4;delay(action==='detour'?2:4);}}
 if(id==='trader'&&action==='buy'){s.credits-=100;s.cargo.ore+=4;s.economy.costs.ore+=10000;outcome='이동 상인에게 광물 4t 구매. 100 CR 정산.';}
 if(id==='patrol'){if(action==='data'){s.credits+=100;gainStanding(s,'union',2,1);outcome='탐사 자료 공유. 협력 보상 100 CR.';}else delay(action==='papers'?1:2);}
 if(id==='cache'){if(action==='recover'){s.fuel-=2;s.cargo.tech+=2;outcome='보급 컨테이너에서 기술 부품 2t 회수.';}if(action==='scan'){s.credits+=90;outcome='컨테이너 스캔 자료 90 CR에 판매.';}}
 if(id==='relic'){if(action==='analyze'){s.fuel-=3;if(random(s)<.7){s.credits+=420;outcome='유적 신호 해독 성공. 연구 보상 420 CR.';}else{s.hull=Math.max(1,s.hull-8);outcome='신호 해독 실패. 역류로 선체 8 손상.';}}if(action==='scan'){s.credits+=110;outcome='안전 관측 자료로 110 CR 수령.';}}
 migrateWorld(s);s.world.resolved++;s.world.lastEventAt=s.hours;s.world.cooldowns[id]=s.hours;s.event=null;
 pushIssue(s,{region:e.location||s.location,key:'encounter-'+id,title:`${e.title} · ${outcome}`,level:'notice',duration:18});
 broadcast(s,{author:'노마드 항해 보고',content:`${e.title} · ${outcome}`,topic:id==='trader'?'trade':e.trigger==='survey'?'exploration':'safety',kind:'report',eventId:e.uid||null});return outcome;
}
export function validWorld(w,hours){return w?.version===1&&(w.urgentSeen===undefined||(Array.isArray(w.urgentSeen)&&w.urgentSeen.length<=120&&w.urgentSeen.every(k=>typeof k==='string'&&k.length<=250)))&&(w.chart===undefined||(Array.isArray(w.chart)&&w.chart.length<=30&&new Set(w.chart.map(p=>p.id)).size===w.chart.length&&w.chart.every(p=>p&&typeof p.id==='string'&&p.id.length<=200&&typeof p.uid==='string'&&p.id==='event:'+p.uid&&TYPES[p.eventId]&&['hazard','discovery','signal','ship'].includes(p.kind)&&typeof p.title==='string'&&p.title.length<=200&&typeof p.location==='string'&&p.location.length<=100&&Number.isFinite(p.x)&&p.x>=0&&p.x<=800&&Number.isFinite(p.y)&&p.y>=0&&p.y<=530&&Number.isFinite(p.created)&&p.created>=0&&p.created<=hours)))&&(w.eventSettings===undefined||validSettings(w.eventSettings))&&(w.forecast===undefined||(w.forecast&&['ion','debris','gravity','micrometeor'].includes(w.forecast.id)&&typeof w.forecast.from==='string'&&typeof w.forecast.to==='string'&&Number.isFinite(w.forecast.created)&&w.forecast.created>=0&&w.forecast.created<=hours))&&Number.isInteger(w.rng)&&w.rng>0&&w.rng<=4294967295&&Number.isFinite(w.lastEventAt)&&w.lastEventAt<=hours&&Number.isFinite(w.nextBroadcast)&&w.nextBroadcast>=hours&&Number.isInteger(w.resolved)&&w.resolved>=0&&Number.isInteger(w.checks)&&w.checks>=0&&w.cooldowns&&Object.entries(w.cooldowns).every(([id,t])=>TYPES[id]&&Number.isFinite(t)&&t<=hours);}

export function validEvent(e,hours){return e==null||(['signal',...Object.keys(TYPES)].includes(e.id)&&typeof e.title==='string'&&typeof e.text==='string'&&e.title.length<=200&&e.text.length<=8000&&(e.id!=='raiders'||(typeof e.uid==='string'&&e.enemy&&typeof e.enemy.name==='string'&&e.enemy.name.length<=100&&['hull','shield','reward'].every(k=>Number.isSafeInteger(e.enemy[k])&&e.enemy[k]>=0)&&e.enemy.hull>0&&e.enemy.hull<=1000&&e.enemy.shield>0&&e.enemy.shield<=1000))&&(e.created===undefined||(Number.isFinite(e.created)&&e.created>=0&&e.created<=hours)));}

const settingLabels={interval:'사건 판정 간격(h)',minGap:'사건 사이 최소 간격(h)',cooldown:'동일 사건 재등장 대기(h)',travelChance:'항해 기본 발생률(%)',surveyChance:'탐사 발생률(%)',riskBonus:'외곽 구역 추가 확률(%p)',damageBonus:'선체 50 미만 추가 확률(%p)',warningChance:'항로 이상 사전 감지 확률(%)',combat:'전투 선택 가중치(%)',encounter:'조우 선택 가중치(%)',discovery:'발견 선택 가중치(%)',hazard:'항로 이상 선택 가중치(%)'};
export function eventSettingsHTML(s){const r=eventSettings(s);return `<section class="generation-settings"><h3>랜덤 사건 설정</h3><p class="hint">판정마다 발생률을 적용한 후, 가능한 사건을 가중치로 선택합니다. 기본 발생률 0%는 항해 사건을 끄며, 분류 가중치 0은 해당 분류를 제외합니다. 외곽·선체 보정은 최대 100%까지 합산합니다. 정박 중 시장 소식은 별도입니다.</p><form id="event-settings-form"><div class="generation-fields">${Object.entries(ranges).map(([k,[min,max]])=>`<label>${settingLabels[k]}<input name="${k}" type="number" min="${min}" max="${max}" step="1" value="${r[k]}" required></label>`).join('')}</div><p class="hint">항로 이상은 사전 감지 시 다음 판정에 실제 사건으로 이어집니다. 남은 항해가 짧으면 즉시 조우합니다. 감지된 사건은 설정 변경 후에도 유지됩니다. 모든 설정은 게임 저장본에 포함됩니다.</p><button class="primary">사건 설정 저장</button></form></section>`;}
