import {factionStanding} from './factions.js';
import {place} from './world-data.js';
import {crewBonuses} from './crew-data.js';
// Fixed, inspectable equipment: rarity is a handcrafted design, not a random stat roll.
export const SLOTS={weapon:'무기',shield:'실드',engine:'엔진'};
export const RARITIES={common:{name:'일반',color:'#a9bac7'},uncommon:{name:'고급',color:'#67ddba'},rare:{name:'희귀',color:'#79aaff'},epic:{name:'영웅',color:'#c79af2'}};
export const STATIONS=['haven','forge','freeport'];
export const WEAPON_FAMILIES={laser:{name:'레이저',desc:'높은 명중률 · 안정적인 피해 · 에너지 사용'},ballistic:{name:'탄환',desc:'직사 화력 · 중간 명중률 · 균형형 전력'},plasma:{name:'플라즈마',desc:'높은 피해 · 높은 발열 · 사격 간 냉각 필요'},missile:{name:'미사일',desc:'유도 명중 · 낮은 발열 · 높은 에너지 사용'}};
const gear=(id,slot,name,level,rarity,price,power,stations,stats,desc)=>({id,slot,name,level,rarity,price,power,stations,stats,desc});
export const EQUIPMENT=[
 gear('w-stock','weapon','N-1 표준 함포',1,'common',0,3,[],{min:20,max:28,accuracy:88,energy:14,heat:16},'노마드 기본 장비. 안정적인 에너지 효율.'),
 gear('w-pulse','weapon','P-2 펄스 레이저',2,'uncommon',1100,3,STATIONS,{min:23,max:31,accuracy:90,energy:16,heat:18},'낮은 전력 부담의 균형형 개량 함포.'),
 gear('w-rail','weapon','R-3 레일건',3,'rare',4200,5,STATIONS,{min:34,max:44,accuracy:82,energy:24,heat:29},'큰 단발 피해. 명중률과 에너지 관리가 필요합니다.'),
 gear('w-beam','weapon','L-3 추적 광선',3,'rare',4600,4,STATIONS,{min:25,max:33,accuracy:97,energy:22,heat:22},'명중률 특화. 레일건보다 낮은 단발 피해.'),
 gear('w-plasma','weapon','H-5 플라스마 랜스',5,'epic',13500,6,STATIONS,{min:42,max:54,accuracy:78,energy:32,heat:37},'최대 화력. 높은 발열로 연속 포격이 어렵습니다.'),
 gear('w-precision','weapon','V-5 정밀 레일 포대',5,'epic',14500,5,STATIONS,{min:31,max:41,accuracy:98,energy:25,heat:25},'확실한 명중과 지속 사격에 투자한 설계.'),
 gear('w-prism','weapon','L-5 프리즘 레이저',5,'epic',14200,5,STATIONS,{min:32,max:42,accuracy:99,energy:29,heat:27},'명중 특화 레이저. 높은 에너지 사용과 전력 배분이 필요합니다.'),
 gear('w-plasma-pulse','weapon','P-2 플라즈마 투사기',2,'uncommon',1200,3,STATIONS,{min:27,max:36,accuracy:80,energy:18,heat:26},'입문 플라즈마. 피해는 크지만 명중률과 발열 관리가 필요합니다.'),
 gear('w-plasma-cannon','weapon','H-3 플라즈마 포',3,'rare',4400,5,STATIONS,{min:37,max:48,accuracy:77,energy:27,heat:34},'중거리 고화력 포대. 연속 집중 포격에는 냉각이 필요합니다.'),
 gear('w-missile','weapon','M-2 유도 미사일',2,'uncommon',1250,3,STATIONS,{min:25,max:33,accuracy:92,energy:23,heat:10},'초기 유도탄 발사기. 낮은 발열 대신 에너지 부담이 큽니다.'),
 gear('w-seeker','weapon','M-3 시커 미사일',3,'rare',4500,4,STATIONS,{min:32,max:42,accuracy:94,energy:32,heat:13},'유도 성능과 단발 피해 향상. 축전 에너지 회복을 병행하세요.'),
 gear('w-storm','weapon','M-5 스톰 미사일',5,'epic',14300,6,STATIONS,{min:40,max:52,accuracy:96,energy:38,heat:16},'고성능 유도탄 포대. 높은 명중률과 낮은 열, 큰 에너지 소모.'),
 gear('s-stock','shield','S-1 표준 방어막',1,'common',0,3,[],{capacity:100,regen:18},'노마드 기본 장비. 방어 명령으로 재충전.'),
 gear('s-patrol','shield','S-2 순찰 방어막',2,'uncommon',1000,3,STATIONS,{capacity:120,regen:20},'방어 용량과 복원량을 함께 개선합니다.'),
 gear('s-bastion','shield','B-3 보루 방어막',3,'rare',4000,5,STATIONS,{capacity:175,regen:16},'큰 용량 대신 전력과 느린 회복을 감수합니다.'),
 gear('s-flux','shield','F-3 순환 방어막',3,'rare',4300,4,STATIONS,{capacity:125,regen:32},'방어 명령을 자주 사용하는 지속전 설계.'),
 gear('s-aegis','shield','A-5 이지스',5,'epic',13000,6,STATIONS,{capacity:220,regen:22},'최고의 초기 방어력. 다른 장비의 전력 배분을 고려하세요.'),
 gear('s-phoenix','shield','P-5 재생 방어막',5,'epic',14000,5,STATIONS,{capacity:155,regen:42},'최상급 방어 회복. 순간 화력에는 주의가 필요합니다.'),
 gear('e-stock','engine','E-1 항행 엔진',1,'common',0,3,[],{speed:1,fuel:1,escape:75},'노마드 기본 장비. 기준 속도와 연료 소모.'),
 gear('e-cruise','engine','C-2 순항 엔진',2,'uncommon',900,3,STATIONS,{speed:1.1,fuel:.9,escape:78},'입문 항해 장비. 속도와 경제성을 소폭 개선합니다.'),
 gear('e-sprint','engine','I-3 요격 추진기',3,'rare',4100,5,STATIONS,{speed:1.45,fuel:1.2,escape:88},'빠른 이동과 탈출. 같은 항로에서 연료를 더 소모합니다.'),
 gear('e-range','engine','R-3 장거리 엔진',3,'rare',3900,4,STATIONS,{speed:.95,fuel:.65,escape:72},'연료 절약 특화. 속도와 탈출 능력은 낮습니다.'),
 gear('e-vector','engine','V-5 벡터 드라이브',5,'epic',12500,6,STATIONS,{speed:1.65,fuel:1.1,escape:94},'최고 속도와 탈출 성능. 전력 배분 부담이 큽니다.'),
 gear('e-horizon','engine','H-5 호라이즌',5,'epic',13500,5,STATIONS,{speed:1.25,fuel:.6,escape:85},'장거리 탐사를 위한 고효율 추진 장치.'),
 {...gear('s-union','shield','연합 시민수호 방어막',3,'rare',5200,4,['haven'],{capacity:165,regen:28},'공인 계약자 전용 · 방어와 복원 균형.'),faction:'union',rank:2},
 {...gear('w-helios','weapon','헬리오스 산업 플라스마',4,'epic',8200,5,['forge'],{min:39,max:50,accuracy:82,energy:28,heat:33},'우호 함장 전용 · 산업 기술을 응용한 고화력 무장.'),faction:'helios',rank:3},
 {...gear('e-free','engine','연맹 개척 항행 엔진',3,'rare',5100,4,['freeport'],{speed:1.25,fuel:.7,escape:85},'공인 계약자 전용 · 장거리 탐사 설계.'),faction:'free',rank:2}
];
const FAMILY_BY_ID={'w-stock':'ballistic','w-pulse':'laser','w-rail':'ballistic','w-beam':'laser','w-plasma':'plasma','w-precision':'ballistic','w-prism':'laser','w-plasma-pulse':'plasma','w-plasma-cannon':'plasma','w-missile':'missile','w-seeker':'missile','w-storm':'missile'};
for(const g of EQUIPMENT)if(g.slot==='weapon')g.family=g.id==='w-helios'?'plasma':FAMILY_BY_ID[g.id];
export const equipment=id=>EQUIPMENT.find(g=>g.id===id);
export const freshEquipment=()=>({version:1,owned:['w-stock','s-stock','e-stock'],equipped:{weapon:'w-stock',shield:'s-stock',engine:'e-stock'}});
export function migrateEquipment(s){if(s.equipment===undefined)s.equipment=freshEquipment();return s.equipment;}
export function shipStats(s){const fitted=s?.equipment?.equipped||freshEquipment().equipped;const w=equipment(fitted.weapon)||equipment('w-stock'),sh=equipment(fitted.shield)||equipment('s-stock'),e=equipment(fitted.engine)||equipment('e-stock');const b=crewBonuses(s);return {weaponFamily:w.family,weapon:{...w.stats,accuracy:Math.min(99,w.stats.accuracy+b.accuracy)},maxShield:sh.stats.capacity,shieldRegen:sh.stats.regen+b.shieldRegen,speed:e.stats.speed*b.speed,fuelFactor:e.stats.fuel*b.fuelFactor,escape:Math.min(98,e.stats.escape+b.escape),energyRegen:9+b.energyRegen,cooling:10+b.cooling,serviceDiscount:b.serviceDiscount,power:w.power+sh.power+e.power,powerMax:12};}
export function validEquipment(e){return e===undefined||(e?.version===1&&Array.isArray(e.owned)&&e.owned.length<=EQUIPMENT.length&&new Set(e.owned).size===e.owned.length&&e.owned.every(id=>!!equipment(id))&&['w-stock','s-stock','e-stock'].every(id=>e.owned.includes(id))&&e.equipped&&Object.keys(SLOTS).every(slot=>e.owned.includes(e.equipped[slot])&&equipment(e.equipped[slot])?.slot===slot)&&shipStats({equipment:e}).power<=12);}
function dockReason(s){return s.event?'긴급 상황에 먼저 대응하세요.':s.travel?'항해 중에는 장비를 변경할 수 없습니다.':place(s.location,s)?.type!=='station'?'정거장 정비 도크에 정박해야 합니다.':'';}
export function gearStatus(s,id,action){const g=equipment(id),e=s.equipment||freshEquipment();let reason=dockReason(s);if(!g)return {reason:'알 수 없는 장비입니다.',eligible:false};if(!reason&&action==='buy'){if(g.faction&&(factionStanding(s,g.faction).rank<g.rank||!g.stations.includes(s.location)))reason='팩션 전용 거점·신뢰 등급 조건이 필요합니다.';else if(e.owned.includes(id))reason='이미 보유한 장비입니다.';else if(!g.stations.includes(s.location)&&!place(s.location,s)?.systemId)reason='이 정거장에서는 판매하지 않습니다.';else if(s.credits<g.price)reason='보유 자금이 부족합니다.';}else if(!reason&&action==='equip'){if(!e.owned.includes(id))reason='먼저 구입해야 합니다.';else if(e.equipped[g.slot]===id)reason='장착 중입니다.';else if(shipStats(s).power-equipment(e.equipped[g.slot]).power+g.power>12)reason='리액터 전력 12를 초과합니다. 다른 슬롯의 전력을 줄이세요.';}else if(!reason&&action==='sell'){if(!e.owned.includes(id))reason='보유하지 않은 장비입니다.';else if(e.equipped[g.slot]===id)reason='먼저 다른 장비로 교체하세요.';else if(!g.price)reason='기본 지급 장비는 판매할 수 없습니다.';}else if(!['buy','equip','sell'].includes(action))reason='알 수 없는 장비 명령입니다.';return {reason,eligible:!reason};}
export function manageEquipment(s,id,action){const status=gearStatus(s,id,action);if(!status.eligible)throw Error(status.reason);const e=migrateEquipment(s),g=equipment(id);if(action==='buy'){s.credits-=g.price;e.owned.push(id);}if(action==='equip'){e.equipped[g.slot]=id;s.shield=Math.min(s.shield,shipStats(s).maxShield);}if(action==='sell'){e.owned=e.owned.filter(x=>x!==id);s.credits+=Math.floor(g.price*.6);}return `${g.name} ${action==='buy'?`구입 · ${g.price} CR`:action==='equip'?'장착 완료':`판매 · ${Math.floor(g.price*.6)} CR`}`;}
export function weaponMode(s,burst=false){const w=shipStats(s).weapon;return {min:burst?Math.round(w.min*1.75):w.min,max:burst?Math.round(w.max*12/7):w.max,accuracy:w.accuracy-(burst?20:0),energy:burst?Math.round(w.energy*30/14):w.energy,heat:burst?w.heat*2:w.heat};}

export function serviceQuote(s,type){return Math.ceil((type==='fuel'?(100-s.fuel)*3:type==='shield'?(shipStats(s).maxShield-s.shield)*2:type==='repair'?(100-s.hull)*6:0)*(1-shipStats(s).serviceDiscount));}
