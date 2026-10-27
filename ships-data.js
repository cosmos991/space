export const SHIP_GRADES=['일반','고급','희귀','영웅','전설'];
export const SHIP_ROLES=['탐사선','수송선','전투선','산업선','다목적선'];
export const SHIPS=[
 {id:'nomad',name:'노마드',grade:0,role:0,released:true,cargo:40,crew:2,power:12,speed:1,fuel:1,damage:1,shield:1,mining:1,salvage:0,price:9000,blueprint:0,fee:5000,hours:12,recipe:{ore:16,tech:3,scrap:8,alloy:2,core:1},desc:'기존 함장님의 독립 탐사선. 균형 잡힌 항해와 낮은 진입 비용.'},
 {id:'caravan',name:'캐러밴',grade:0,role:1,released:true,cargo:70,crew:2,power:12,speed:.85,fuel:1.15,damage:.9,shield:1,mining:1,salvage:0,price:14000,blueprint:1600,fee:7000,hours:18,recipe:{ore:26,tech:4,scrap:12,alloy:4,core:1},desc:'넓은 화물칸을 갖춘 수송선. 느린 항해와 높은 연료 소모를 감수합니다.'},
 {id:'kestrel',name:'케스트럴',grade:0,role:2,released:true,cargo:30,crew:2,power:14,speed:1.1,fuel:1.1,damage:1.12,shield:1.1,mining:1,salvage:0,price:16000,blueprint:1800,fee:8000,hours:20,recipe:{ore:20,tech:6,scrap:10,alloy:5,core:2},desc:'화력과 전력 여유를 확보한 경량 호위함. 적재 공간은 작습니다.'},
 {id:'mole',name:'몰',grade:0,role:3,released:true,cargo:50,crew:2,power:12,speed:.9,fuel:1.1,damage:1,shield:1,mining:1.5,salvage:2,price:15000,blueprint:1600,fee:7500,hours:18,recipe:{ore:24,tech:5,scrap:10,alloy:4,core:1},desc:'채굴량 50% 증가 · 일반 잔해 인양 시 스크랩 2개 추가. 산업 작업에 특화합니다.'},
 {id:'pathfinder',name:'패스파인더',grade:0,role:4,released:true,cargo:45,crew:3,power:13,speed:1,fuel:1,damage:1,shield:1,mining:1,salvage:0,price:18000,blueprint:2000,fee:9000,hours:24,recipe:{ore:24,tech:7,scrap:12,alloy:5,core:2},desc:'승무원 3명과 유연한 장비 운용을 지원하는 다목적선.'}
];
for(const [i,names]of [['보이저','아틀라스','랜서','포지','프런티어'],['오디세이','레비아탄','발키리','헤파이스토스','메리디언'],['호라이즌','아크','이지스','타이탄','소버린'],['스타시커','월드브리지','에클립스','월드포지','아스테리온']].entries())for(const [role,name]of names.entries())SHIPS.push({id:'grade'+(i+1)+'-role'+role,name,grade:i+1,role,released:false});
export const shipDesign=id=>SHIPS.find(d=>d.id===id);
export const activeDesign=s=>shipDesign(s?.fleet?.active)||SHIPS[0];
export const cargoCapacity=s=>activeDesign(s).cargo;
export const YARDS=['haven','forge','freeport'];
export const MATERIALS={scrap:'금속 스크랩',alloy:'정제 합금',core:'동력 코어',special:'특수 소재',frame:'구조 프레임',mechanism:'정밀 기계 부품',circuit:'정밀 회로',coil:'에너지 코일',armor:'복합 장갑판',stable:'안정화 코어'};
