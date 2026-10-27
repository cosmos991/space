import {recipe,knownRecipe,craftStatus} from './crafting.js';
import {quantity,ITEMS,icon,missionMaterials} from './materials.js';
import {missionOffers,missionTemplate} from './missions.js';
import {placesFor} from './world-data.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('ko-KR');
// Shared stock is consumed once across the entire dependency tree.
export function goalPlan(s){
 const target=recipe(s.fabrication?.target);if(!target)return null;
 const owned=target.gear?s.equipment.owned.includes(target.gear):quantity(s,target.output)>=1;
 const stock=Object.fromEntries(Object.keys(ITEMS).map(k=>[k,quantity(s,k)])),rows=new Map();let fee=owned?0:target.fee;
 function need(k,n,path=[]){
  if(path.includes(k))throw Error('순환 제작법입니다.');
  const row=rows.get(k)||{key:k,required:0,used:0,craft:0,missing:0};rows.set(k,row);row.required+=n;
  const used=Math.min(stock[k]||0,n);stock[k]-=used;row.used+=used;const left=n-used;if(!left)return;
  const r=recipe('part:'+k);if(!r){row.missing+=left;return;}
  row.craft+=left;fee+=r.fee*left;
  for(const [child,count] of Object.entries(r.inputs))need(child,count*left,[...path,k]);
 }
 if(!owned)for(const [k,n]of Object.entries(target.inputs))need(k,n);
 const status=craftStatus(s,target.id);return {target,owned,rows:[...rows.values()],fee,locked:!knownRecipe(s,target),ready:!owned&&status.eligible,reason:status.reason};
}
export function materialSources(s,key){
 const types=key==='ore'?['belt']:['tech','scrap'].includes(key)?['belt','ruin','nebula']:[];
 const locations=placesFor(s).filter(p=>types.includes(p.type));
 const active=(s.missions?.active||[]).map(m=>({mission:missionTemplate(m.template),id:m.id,active:true}));
 const offers=missionOffers(s).map(m=>({mission:m,id:m.offerId,active:false}));
 return {locations,missions:[...active,...offers].filter(x=>x.mission&&missionMaterials(x.mission)[key]>0)};
}
function sourceHTML(s,key){const src=materialSources(s,key);return `<div class="goal-sources">${src.locations.map(p=>`<button data-place="${esc(p.id)}">${key==='ore'?'채굴':'인양'} · ${esc(p.name)}${s.location===p.id?' · 현재 구역':''} ↗</button>`).join('')}${src.missions.slice(0,3).map(x=>`<button data-mission-open="${esc(x.id)}" data-mission-faction="${x.mission.faction}">${x.active?'진행 중':'수락 가능'} · ${esc(x.mission.title)} · +${missionMaterials(x.mission)[key]} ↗</button>`).join('')}${!src.missions.length&&!src.locations.length?'<span class="hint">현재 받을 수 있는 보상 임무가 없습니다. 다음 게임 날짜에 목록을 확인하세요.</span>':''}</div>`;}
export function goalSummaryHTML(s){const p=goalPlan(s);if(!p)return '';const missing=p.rows.filter(r=>r.missing),parts=p.rows.filter(r=>r.craft);return `<div class="goal-summary"><span><small>제작 목표 · 1개</small><strong>${p.target.name}</strong></span><span>${p.owned?'✓ 보유 목표 달성':p.ready?'✓ 제작 가능':missing.length?'원재료 '+missing.length+'종 부족':parts.length?'하위 부품 제작 필요':p.locked?'설계도 해금 필요':'정거장·자금 확인'}</span><button data-goal-open>재료 추적 →</button></div>`;}
export function goalDetailsHTML(s){const p=goalPlan(s);if(!p)return '';return `<section class="goal-plan" aria-label="제작 목표 재료 추적"><div class="goal-title"><div><small>TRACKED FABRICATION · 1개 기준</small><h3>${p.target.name}</h3></div><button data-craft-track="clear">목표 해제</button></div>${p.owned?'<p class="goal-complete">✓ 목표 아이템을 보유하고 있습니다.</p>':`<p class="hint">보유 부품을 먼저 사용한 뒤 부족한 부품의 하위 재료를 합산합니다. 재료는 예약·소모되지 않습니다.</p><div class="goal-rows">${p.rows.map(row=>`<article class="goal-row ${row.missing?'goal-missing':''}"><div class="goal-material"><img src="${icon(row.key)}" width="40" height="40" alt=""><span><strong>${ITEMS[row.key].name}</strong><small>필요 ${fmt(row.required)} · 보유분 충당 ${fmt(row.used)}${row.craft?' · 추가 제작 '+fmt(row.craft):''}${row.missing?' · 부족 '+fmt(row.missing):''}${!row.craft&&!row.missing?' · ✓ 확보':''}</small></span>${row.craft?`<button data-craft-recipe="part:${row.key}">제작법 →</button>`:''}</div>${row.missing?sourceHTML(s,row.key):''}</article>`).join('')}</div><p>하위 부품 포함 제작비 <strong>${fmt(p.fee)} CR</strong> · 보유 ${fmt(Math.floor(s.credits))} CR</p><p class="hint">설계도 해금비·이동·임무 비용은 별도입니다. ${p.locked?'목표 설계도 해금이 필요합니다. ':''}${p.ready?'지금 목표 제작을 진행할 수 있습니다.':esc(p.reason||'')}</p>`}<button data-craft-recipe="${p.target.id}">목표 제작법 →</button></section>`;}
