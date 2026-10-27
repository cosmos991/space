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
export const sources={ore:'소행성대 반복 채굴 · 광맥 탐사',tech:'일반 잔해 인양 · 거래소 · 탐사 및 사건',scrap:'운송·현상금·회수 임무 · 일반 잔해 인양',alloy:'현상금·구호 임무 · 기존 조선소 정제',core:'잔해 회수 임무 · 기존 조선소 조립',special:'탐사 임무 · 위험도 높은 임무'};
export const ITEMS={
 ore:{name:'광물',group:'원자재',tone:'copper',description:'소행성대에서 채굴한 원석. 함선 건조와 기존 합금 정제에 사용합니다.'},
 tech:{name:'기술 부품',group:'전자 부품',tone:'blue',description:'회로와 정밀 제어 부품. 함선 건조와 기존 동력 코어 조립에 사용합니다.'},
 scrap:{name:MATERIALS.scrap,group:'회수 자재',tone:'steel',description:'잔해에서 회수한 금속 부품. 조선소에서 함선 건조 재료로 사용합니다.'},
 alloy:{name:MATERIALS.alloy,group:'산업 자재',tone:'gold',description:'정제한 고강도 금속. 함선 건조와 기존 코어 조립에 사용하는 자재입니다.'},
 core:{name:MATERIALS.core,group:'동력 부품',tone:'cyan',description:'에너지를 안정적으로 공급하는 동력 장치. 함선 건조에 사용합니다.'},
 special:{name:MATERIALS.special,group:'특수 자재',tone:'purple',description:'미지의 성질을 가진 결정 소재. 안정화 코어와 고급 장비·상위 함선 개조에 사용합니다.'},
 frame:{name:MATERIALS.frame,group:'제작 부품',tone:'steel',description:'함선 골격과 무기 거치대를 구성하는 구조 부품.'},
 mechanism:{name:MATERIALS.mechanism,group:'제작 부품',tone:'gold',description:'급탄·구동·추진 장치에 사용하는 정밀 기계 부품.'},
 circuit:{name:MATERIALS.circuit,group:'제작 부품',tone:'blue',description:'조준·유도·에너지 제어에 사용하는 공통 전자 부품.'},
 coil:{name:MATERIALS.coil,group:'제작 부품',tone:'cyan',description:'레이저·플라즈마·실드·엔진에 공통으로 사용하는 코일.'},
 armor:{name:MATERIALS.armor,group:'제작 부품',tone:'steel',description:'선체와 장비를 보호하는 복합 방호판.'},
 stable:{name:MATERIALS.stable,group:'제작 부품',tone:'purple',description:'동력을 안정적으로 제어하는 고급 장비용 핵심 부품.'}
};
export const quantity=(s,k)=>['ore','tech'].includes(k)?s.cargo[k]:s.fleet?.materials[k]||0;
export const icon=k=>`/assets/materials/${k}-v1.webp`;
export function materialsHTML(s,{selected='',filter='all'}={}){
 const filters={all:'전체',owned:'보유 중',cargo:'화물칸',store:'자재 창고'};
 if(!Object.hasOwn(filters,filter))filter='all';
 const keys=Object.keys(ITEMS).filter(k=>filter==='all'||filter==='owned'&&quantity(s,k)>0||filter==='cargo'&&['ore','tech'].includes(k)||filter==='store'&&!['ore','tech'].includes(k));
 const id=keys.includes(selected)?selected:keys.find(k=>quantity(s,k)>0)||keys[0],item=ITEMS[id],cargo=['ore','tech'].includes(id),owned=Object.keys(ITEMS).filter(k=>quantity(s,k)>0).length;
 return `<section class="rpg-inventory"><div class="inventory-heading"><div><div class="section-kicker">CARGO / MATERIALS</div><h2>재료 인벤토리</h2></div><span>보유 <strong>${owned}</strong> / ${Object.keys(ITEMS).length}종</span></div><div class="inventory-toolbar" role="group" aria-label="재료 분류">${Object.entries(filters).map(([k,name])=>`<button data-material-filter="${k}" aria-pressed="${filter===k}">${name}</button>`).join('')}</div><div class="inventory-layout"><div class="inventory-bag"><div class="inventory-slot-grid" role="group" aria-label="재료 슬롯">${keys.map(k=>{const m=ITEMS[k],n=quantity(s,k),unit=['ore','tech'].includes(k)?'t':'개';return `<button class="item-slot tone-${m.tone} ${n?'':'item-unowned'}" data-material-select="${k}" aria-pressed="${id===k}" aria-controls="material-detail" aria-label="${m.name} · ${n.toLocaleString('ko-KR')}${unit}${n?'':' · 미보유'}"><img src="${icon(k)}" alt="" width="256" height="256" draggable="false"><span class="item-quantity">${n.toLocaleString('ko-KR')}<small>${unit}</small></span><span class="item-slot-name">${m.name}</span></button>`;}).join('')}${Array.from({length:Math.max(0,12-keys.length)},()=>'<span class="item-slot item-slot-vacant" aria-hidden="true"><i>＋</i></span>').join('')}</div><p class="inventory-grid-hint">아이템을 선택하면 상세 정보를 확인할 수 있습니다.</p>${!keys.length?'<p class="hint">아직 보유한 재료가 없습니다. 임무나 채굴로 재료를 모아 보세요.</p>':''}</div><aside id="material-detail" class="item-inspector" aria-label="선택한 재료 상세 정보">${item?`<div class="item-inspector-art tone-${item.tone}"><img src="${icon(id)}" alt="${item.name}" width="256" height="256"></div><div class="item-inspector-title"><span>${item.group}</span><h3>${item.name}</h3><strong>${quantity(s,id).toLocaleString('ko-KR')} <small>${cargo?'t':'개'} 보유</small></strong></div><p>${item.description}</p>${['alloy','core','frame','mechanism','circuit','coil','armor','stable'].includes(id)?`<button data-craft-recipe="part:${id}">이 부품 제작법 →</button>`:''}<dl><dt>보관 위치</dt><dd>${cargo?'화물칸 · 전체 적재량에 포함':'자재 창고 · 화물 적재량 제외'}</dd><dt>획득처</dt><dd>${sources[id]||'정거장 제작소에서 제작'}</dd></dl>${quantity(s,id)?'':'<p class="item-missing">미보유 · 획득하면 수량이 표시됩니다.</p>'}`:'<p class="hint">표시할 재료가 없습니다.</p>'}</aside></div><div class="inventory-footer"><span>화물 적재 <strong>${usedCargo(s)} / ${cargoCapacity(s)}t</strong></span><span>자재 창고 · 종류별 최대 1,000,000개</span></div><div class="actions"><button data-data-section="crafting">통합 제작소 →</button><button data-tab="missions">재료 보상 임무 →</button><button data-tab="shipyard">채굴·인양 및 조선소 →</button></div><p class="hint">봉인 임무 화물은 제출용 물자입니다. 부품과 장비는 제작소에서 만들 수 있습니다. 부품은 함선별 개조 도크에서도 사용합니다.</p></section>`;
}
