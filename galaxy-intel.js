import {hash} from './galaxy-gen.js';
import {placesFor} from './world-data.js';
import {quantity,MATERIAL_LIMIT} from './materials.js';
import {usedCargo} from './cargo.js';
import {cargoCapacity} from './ships-data.js';
export const SIGNAL_TYPES=[{id:'wreck',name:'표류 폐선 신호',hint:'금속 반사와 잔해 밀집 반응',reward:{scrap:4},report:'무인 폐선의 외부 적재함에서 금속 스크랩을 회수했습니다.'},{id:'beacon',name:'끊어진 구조 비콘',hint:'오래된 자동 구조 주파수',reward:{tech:2},report:'현장을 수색했습니다. 생존자는 없었으며 비콘의 기술 부품을 회수했습니다.'},{id:'anomaly',name:'미확인 에너지 파동',hint:'규칙적으로 반복되는 에너지 반응',reward:{special:2},report:'에너지 파동의 근원에서 특수 소재 표본을 확보했습니다.'}];
export function systemPlaces(s,id){return placesFor({...s,galaxy:{...s.galaxy,current:id}}).filter(p=>p.type!=='gate');}
export function systemSignals(s,id=s.galaxy.current){const list=systemPlaces(s,id),sites=list.filter(p=>['ruin','belt','nebula'].includes(p.type)),pool=sites.length?sites:list;if(!pool.length)return [];return SIGNAL_TYPES.map((t,i)=>({...t,system:id,location:pool[(hash(s.galaxy.seed+':'+id)+i)%pool.length].id,key:id+':'+t.id,done:!!s.galaxy.intel?.some(r=>r.system===id&&r.signal===t.id)}));}
export function signalStatus(s,id){const d=systemSignals(s).find(x=>x.id===id);let reason=!d?'알 수 없는 신호입니다.':d.done?'이미 조사한 신호입니다.':s.event?'긴급 상황에 먼저 대응하세요.':s.travel?'현장 도착 후 조사하세요.':s.location!==d.location?'신호 발생 구역에 도착하세요.':s.mining?.job?'채굴기를 먼저 회수하세요.':s.fuel<4?'조사 연료 4가 필요합니다.':'';
 if(!reason&&Object.entries(d.reward).some(([k,n])=>['ore','tech'].includes(k)?usedCargo(s)+n>cargoCapacity(s):quantity(s,k)+n>MATERIAL_LIMIT))reason='회수품을 보관할 공간이 부족합니다.';return {eligible:!reason,reason,signal:d};}
export function investigateSignal(s,id){const st=signalStatus(s,id);if(!st.eligible)throw Error(st.reason);const d=st.signal;s.fuel-=4;for(const [k,n]of Object.entries(d.reward))if(['ore','tech'].includes(k))s.cargo[k]+=n;else s.fleet.materials[k]+=n;s.galaxy.intel??=[];s.galaxy.intel.push({system:s.galaxy.current,signal:id,at:s.hours});return d;}
export function validIntel(records,s){return records===undefined||Array.isArray(records)&&records.length<=3000&&new Set(records.map(r=>r?.system+':'+r?.signal)).size===records.length&&records.every(r=>r&&typeof r.system==='string'&&(r.system==='home'||!!s?.galaxy?.systems[r.system])&&SIGNAL_TYPES.some(t=>t.id===r.signal)&&Number.isFinite(r.at)&&r.at>=0&&r.at<=s.hours);}
