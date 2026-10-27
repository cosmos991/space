import {place} from './world-data.js';
import {activeDesign,cargoCapacity} from './ships-data.js';
import {usedCargo} from './cargo.js';
import {quantity,MATERIAL_LIMIT} from './materials.js';
import {hash} from './galaxy-gen.js';
export const MINING_CYCLE=3;
export const RIGS={
 basic:{name:'D-1 기본 채굴기',hp:80,yield:4,wear:3,resist:0,analysis:1,rare:1,fee:350,inputs:{frame:1,mechanism:1,circuit:1},desc:'저렴한 제작·수리 비용. 광맥 시험 채굴에 적합합니다.'},
 reinforced:{name:'D-2 강화 채굴기',hp:140,yield:5,wear:2,resist:12,analysis:1,rare:1,fee:850,inputs:{frame:2,mechanism:2,armor:2,circuit:1},desc:'두꺼운 장갑과 높은 내구도. 불안정한 광맥의 장기 채굴에 적합합니다.'},
 precision:{name:'D-3 정밀 채굴기',hp:75,yield:3,wear:3,resist:0,analysis:2,rare:1.6,fee:1000,inputs:{frame:1,circuit:3,coil:1,core:1},desc:'빠른 분석과 특수 소재 회수율 향상. 처리량과 내구도는 낮습니다.'}
};
export const freshMining=()=>({version:1,rigs:{basic:null,reinforced:null,precision:null},sites:[],job:null,last:null});
export function migrateMining(s){if(s.mining===undefined)s.mining=freshMining();return s.mining;}
export const miningSite=s=>s.mining?.sites.find(x=>x.system===(s.galaxy?.current||'home')&&x.location===s.location);
const local=s=>s.event?'긴급 상황에 먼저 대응하세요.':s.travel?'구역에 도착한 뒤 이용하세요.':'';
const dock=s=>local(s)||(place(s.location,s)?.type!=='station'?'정거장에 정박하세요.':'');
export function rigQuote(s,type,repair=false){const d=Object.hasOwn(RIGS,type)?RIGS[type]:null;if(!d)return null;const hp=s.mining?.rigs[type],factor=repair?Math.max(0,(d.hp-(hp??d.hp))/d.hp):1;return {fee:Math.ceil(d.fee*(repair ? .35 : 1)*factor),inputs:Object.fromEntries(Object.entries(d.inputs).map(([k,n])=>[k,Math.ceil(n*factor)]))};}
export function miningStatus(s,{action,type='basic',vein=0,safety=30}={}){
 const m=s.mining||freshMining(),d=Object.hasOwn(RIGS,type)?RIGS[type]:null,site=miningSite(s);let reason=local(s);
 if(action==='recover')return {eligible:!!m.job,reason:m.job?'':'투입 중인 채굴기가 없습니다.'};
 if(action==='craft'||action==='repair'){
  reason=dock(s);if(!d)return {eligible:false,reason:'알 수 없는 채굴기입니다.'};
  if(!reason&&m.job?.type===type)reason='채굴기를 회수한 뒤 정비하세요.';
  if(!reason&&(action==='craft'?m.rigs[type]!==null:m.rigs[type]===null||m.rigs[type]===d.hp))reason=action==='craft'?'이미 보유한 채굴기입니다.':'수리할 채굴기가 없습니다.';
  const q=rigQuote(s,type,action==='repair');if(!reason&&s.credits<q.fee)reason='정비 자금이 부족합니다.';
  if(!reason&&Object.entries(q.inputs).some(([k,n])=>quantity(s,k)<n))reason='제작 부품이 부족합니다.';
  return {eligible:!reason,reason,quote:q};
 }
 if(!reason&&place(s.location,s)?.type!=='belt')reason='소행성대에서 광맥을 탐색하세요.';
 if(!reason&&m.job)reason='투입 중인 채굴기를 먼저 회수하세요.';
 if(action==='scan'){
  if(!reason&&site?.veins.some(v=>v.remaining>0))reason='발견한 광맥이 남아 있습니다.';
  if(!reason&&!site&&m.sites.length>=128)reason='광맥 기록 보관 한도입니다.';
  if(!reason&&s.fuel<2)reason='탐색 연료 2가 필요합니다.';
 }else if(action==='deploy'){
  if(!reason&&(!d||m.rigs[type]===null||m.rigs[type]<=0))reason='사용 가능한 채굴기를 제작·수리하세요.';
  if(!reason&&![10,30,50].includes(safety))reason='안전 회수선을 선택하세요.';
  if(!reason&&m.rigs[type]<=Math.ceil(d.hp*safety/100))reason='내구도가 안전 회수선 이하입니다. 수리하거나 회수선을 낮추세요.';
  if(!reason&&(!Number.isInteger(vein)||!site?.veins[vein]||site.veins[vein].remaining<=0))reason='채굴할 광맥을 선택하세요.';
  if(!reason&&usedCargo(s)>=cargoCapacity(s))reason='화물칸이 가득 찼습니다.';
  if(!reason&&s.fuel<3)reason='투입 연료 3이 필요합니다.';
 }else reason='알 수 없는 채굴 명령입니다.';
 return {eligible:!reason,reason};
}
function newSite(s,round){let rng=hash(`${s.galaxy.seed}:${s.galaxy.current}:${s.location}:${round}`)||1;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};return {system:s.galaxy.current,location:s.location,round,veins:Array.from({length:4},(_,id)=>{const danger=10+Math.floor(rand()*81),ratio=5+Math.floor(rand()*41),size=40+Math.floor(rand()*81);return {id,danger,ratio,size,remaining:size,analysis:0,cycles:0,seed:Math.floor(rand()*4294967295)+1};})};}
function stop(s,text){const m=s.mining,j=m.job;if(j)text+=' 운반 합계: 광물 '+j.ore+'t · 특수 소재 '+j.special+'개.';m.last={hours:s.hours,text};m.job=null;return text;}
export function executeMining(s,order){const st=miningStatus(s,order);if(!st.eligible)throw Error(st.reason);const m=migrateMining(s),{action,type='basic',vein=0,safety=30}=order;
 if(action==='recover')return stop(s,'채굴기 수동 회수. 운반 완료한 재료는 모두 보존됩니다.');
 if(action==='craft'||action==='repair'){s.credits-=st.quote.fee;for(const [k,n]of Object.entries(st.quote.inputs))s.fleet.materials[k]-=n;m.rigs[type]=RIGS[type].hp;return RIGS[type].name+(action==='craft'?' 제작 완료.':' 수리 완료.');}
 if(action==='scan'){const old=miningSite(s),next=newSite(s,(old?.round||0)+1);if(old)m.sites[m.sites.indexOf(old)]=next;else m.sites.push(next);s.fuel-=2;return '광맥 4개 발견. 조성과 위험도는 채굴하며 분석합니다.';}
 s.fuel-=3;m.job={system:s.galaxy.current,location:s.location,type,vein,safety,elapsed:0,cycles:0,ore:0,special:0};m.last=null;return RIGS[type].name+' 투입. 채굴 주기 3h · 내구도 '+safety+'%에서 자동 회수.';
}
export function advanceMining(s,hours){const m=s.mining,j=m?.job;if(!j)return [];
 if(s.travel||j.system!==s.galaxy.current||j.location!==s.location)return [stop(s,'위치 변경으로 채굴기를 자동 회수했습니다.')];
 if(s.event||s.combat?.status==='active')return [];
 const v=miningSite(s)?.veins[j.vein],d=RIGS[j.type],messages=[];if(!v)return [stop(s,'광맥 정보를 확인할 수 없어 회수했습니다.')];
 j.elapsed+=hours;
 while(m.job&&j.elapsed>=MINING_CYCLE-1e-9){j.elapsed=Math.max(0,j.elapsed-MINING_CYCLE);
  if(m.rigs[j.type]<=Math.ceil(d.hp*j.safety/100)){messages.push(stop(s,'안전 내구도에 도달해 자동 회수했습니다.'));break;}
  if(usedCargo(s)>=cargoCapacity(s)){messages.push(stop(s,'화물칸이 가득 차 자동 회수했습니다.'));break;}
  if(s.fleet.materials.special>=MATERIAL_LIMIT){messages.push(stop(s,'특수 소재 창고가 가득 차 자동 회수했습니다.'));break;}
  const rand=()=>{v.seed=(Math.imul(v.seed,1664525)+1013904223)>>>0;return v.seed/4294967296;};
  const risk=Math.max(0,v.danger-d.resist),accident=rand()<risk/140,damage=d.wear+(accident?Math.ceil(risk*(.2+rand()*.3)):0);
  m.rigs[j.type]=Math.max(0,m.rigs[j.type]-damage);v.analysis=Math.min(3,v.analysis+d.analysis);v.cycles++;j.cycles++;
  if(m.rigs[j.type]===0){messages.push(stop(s,'채굴기 파손! 이번 주기 수확은 유실되었습니다. 이전 운반분은 보존됩니다. 정거장에서 복구하세요.'));break;}
  const amount=Math.min(v.remaining,Math.floor(d.yield*activeDesign(s).mining));let ore=0,special=0;
  for(let n=0;n<amount;n++){if(rand()<Math.min(.85,v.ratio/100*d.rare)){if(s.fleet.materials.special+special>=MATERIAL_LIMIT)break;special++;}else{if(usedCargo(s)+ore>=cargoCapacity(s))break;ore++;}}
  v.remaining-=ore+special;s.cargo.ore+=ore;s.fleet.materials.special+=special;j.ore+=ore;j.special+=special;
  messages.push(`채굴 ${j.cycles}주기 · 광물 +${ore}t · 특수 소재 +${special} · 내구도 -${damage}${accident?' · 낙석 충격':''}`);
  if(v.remaining===0)messages.push(stop(s,'광맥 고갈. 채굴기를 자동 회수했습니다.'));
  else if(m.rigs[j.type]<=Math.ceil(d.hp*j.safety/100))messages.push(stop(s,'안전 내구도에 도달해 자동 회수했습니다.'));
  else if(usedCargo(s)>=cargoCapacity(s)||s.fleet.materials.special>=MATERIAL_LIMIT)messages.push(stop(s,'보관 공간이 가득 차 자동 회수했습니다.'));
 }
 return messages;
}
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function validMining(m,s){
 if(m===undefined)return true;
 if(!m||m.version!==1||!m.rigs||Object.keys(m.rigs).length!==3||!Object.entries(RIGS).every(([k,d])=>m.rigs[k]===null||integer(m.rigs[k],0,d.hp))||!Array.isArray(m.sites)||m.sites.length>128)return false;
 const sites=m.sites;if(new Set(sites.map(x=>x?.system+':'+x?.location)).size!==sites.length)return false;
 if(!sites.every(x=>x&&typeof x.system==='string'&&x.system.length<=100&&typeof x.location==='string'&&x.location.length<=120&&integer(x.round,1,1000000)&&Array.isArray(x.veins)&&x.veins.length===4&&x.veins.every((v,i)=>v&&v.id===i&&integer(v.danger,10,90)&&integer(v.ratio,5,45)&&integer(v.size,40,120)&&integer(v.remaining,0,v.size)&&integer(v.analysis,0,3)&&integer(v.cycles,0,1000000)&&integer(v.seed,0,4294967295))))return false;
 if(m.last!==null&&(!m.last||typeof m.last.text!=='string'||m.last.text.length>300||!Number.isFinite(m.last.hours)||m.last.hours<0||m.last.hours>s.hours))return false;
 const j=m.job;if(j===null)return true;const site=sites.find(x=>x.system===j?.system&&x.location===j?.location);
 return !!j&&Object.hasOwn(RIGS,j.type)&&m.rigs[j.type]>0&&j.system===s.galaxy?.current&&j.location===s.location&&!s.travel&&!!site&&integer(j.vein,0,3)&&site.veins[j.vein].remaining>0&&[10,30,50].includes(j.safety)&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<MINING_CYCLE&&['cycles','ore','special'].every(k=>integer(j[k],0,1000000));
}
