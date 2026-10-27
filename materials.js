import {MATERIALS,cargoCapacity} from './ships-data.js';
import {usedCargo} from './cargo.js';
export const MATERIAL_LIMIT=1000000;
export function missionMaterials(t){
 const base={delivery:{scrap:3},survey:{special:1},bounty:{scrap:4,alloy:1},salvage:{scrap:5,core:1},relief:{alloy:2}};
 const reward={...(base[t.type]||{})};
 if(t.risk==='높음')reward.special=(reward.special||0)+1;
 return reward;
}
export const materialRewardText=r=>Object.entries(r).map(([k,n])=>`${MATERIALS[k]} +${n}`).join(' · ');
export function materialRewardReason(s,reward){return Object.entries(reward).some(([k,n])=>!Object.hasOwn(MATERIALS,k)||!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(s.fleet?.materials[k])||s.fleet.materials[k]+n>MATERIAL_LIMIT)?'재료 창고 한도를 확인하세요. 조선소에서 자재를 사용한 뒤 보상을 수령할 수 있습니다.':'';}
export function grantMaterials(s,reward){const reason=materialRewardReason(s,reward);if(reason)throw Error(reason);for(const [k,n]of Object.entries(reward))s.fleet.materials[k]+=n;}
const sources={ore:'소행성대 반복 채굴 · 광맥 탐사',tech:'거래소 · 탐사 및 사건',scrap:'운송·현상금·회수 임무 · 일반 잔해 인양',alloy:'현상금·구호 임무 · 기존 조선소 정제',core:'잔해 회수 임무 · 기존 조선소 조립',special:'탐사 임무 · 위험도 높은 임무'};
export function materialsHTML(s){const labels={ore:'광물',tech:'기술 부품',...MATERIALS};return `<section class="material-inventory"><div class="section-kicker">MATERIAL INVENTORY</div><h2>재료 인벤토리</h2><p class="hint">함선 건조와 향후 업그레이드에 사용할 재료입니다. 채굴·인양 또는 임무 완료로 모으세요. 새 제작 시스템은 추후 추가됩니다.</p><div class="material-storage-summary"><span>화물칸 <strong>${usedCargo(s)} / ${cargoCapacity(s)}t</strong></span><span>자재 창고 <strong>종류별 최대 1,000,000개</strong></span></div><div class="material-grid">${Object.entries(labels).map(([k,name])=>{const cargo=k==='ore'||k==='tech',n=cargo?s.cargo[k]:s.fleet?.materials[k]||0;return `<article class="material-card ${n?'':'material-empty'}"><span class="tag">${cargo?'화물칸':'자재 창고'}</span><h3>${name}</h3><strong class="material-count">${n.toLocaleString('ko-KR')} <small>${cargo?'t':'개'}</small></strong><p>${sources[k]}</p><small>${cargo?'거래·건조 시 같은 화물 수량을 사용합니다.':'화물칸 적재량에 포함되지 않습니다.'}</small></article>`;}).join('')}</div><div class="actions"><button data-tab="missions">재료 보상 임무 찾기 →</button><button data-tab="shipyard">채굴·인양 및 조선소 →</button></div><p class="hint">봉인 임무 화물은 제출용 물자이며 보유 재료에 포함되지 않습니다.</p></section>`;}
