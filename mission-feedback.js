import {missionRecord,missionTemplate,missionOffers} from './missions.js';
import {faction,factionStanding} from './factions.js';
import {place} from './world-data.js';
import {imageSource} from './image-assets.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function prepareMissionFeedback(s,id,action){
 if(!['accept','complete'].includes(action))return null;
 const record=missionRecord(s,id),t=id==='legacy-supply'?{title:'테라 노바 보급 계약',faction:'union',type:'delivery',from:'haven',to:'terra',reward:s.contract?.reward||650,honor:10,trust:3}:record?missionTemplate(record.template):missionOffers(s).find(m=>m.offerId===id);
 if(!t)return null;
 return {action,template:{...t},credits:s.credits,honor:s.diplomacy.honor,standing:factionStanding(s,t.faction)};
}
export function finishMissionFeedback(s,prepared,message){
 if(!prepared)return null;
 const {action,template:t}=prepared,f=faction(t.faction),standing=factionStanding(s,t.faction),done=action==='complete';
 return {done,title:t.title,faction:f.name,officer:f.contact.name,portrait:imageSource(s,'person:faction-'+f.id),message,
  credits:done?s.credits-prepared.credits:t.reward,honor:done?s.diplomacy.honor-prepared.honor:t.honor,trust:done?standing.total-prepared.standing.total:t.trust,
  rank:standing.name,progress:standing.progress,promoted:done&&standing.rank>prepared.standing.rank,
  destination:done?'보수 지급과 담당관 보고가 완료되었습니다.':t.type==='delivery'?place(t.from,s).name+'에서 화물 준비 → '+place(t.to,s).name+'에 전달':place(t.to,s).name+'에서 '+(t.type==='survey'?'정밀 스캔':'표적 추적')+' → '+place(t.from,s).name+'에 귀환 보고'};
}
export function missionFeedbackHTML(d){return `<article class="mission-receipt ${d.done?'mission-success':'mission-issued'}"><button type="button" class="mission-receipt-close" data-feedback-close aria-label="임무 알림 닫기">✕</button><div class="mission-receipt-signal">${d.done?'MISSION ACCOMPLISHED':'INCOMING ASSIGNMENT'}</div><div class="mission-receipt-stamp" aria-hidden="true">${d.done?'✓':'◇'}</div><h2 id="mission-feedback-title">${d.done?'임무 완료':'임무 하달 · 수락 완료'}</h2><h3>${esc(d.title)}</h3><div class="mission-receipt-officer">${d.portrait?`<img src="${esc(d.portrait)}" referrerpolicy="no-referrer" alt="${esc(d.officer)} 초상화">`:''}<span>${esc(d.faction)}<strong>${esc(d.officer)}</strong></span></div><p class="mission-receipt-message">${esc(d.message)}</p><div class="mission-receipt-rewards" aria-label="${d.done?'지급된 보상':'완료 시 예상 보상'}"><small>${d.done?'보상 지급 완료':'완료 시 보상'}</small><strong>+${Number(d.credits).toLocaleString('ko-KR')} <span>CR</span></strong><span>명예 +${d.honor} · 신뢰 +${d.trust}</span></div>${d.done?`<p class="mission-receipt-rank">${d.promoted?'새로운 등급으로 승급 · ':''}${esc(d.rank)} · ${d.progress}/100</p>`:''}<p class="mission-receipt-next">${esc(d.destination)}</p><button type="button" class="primary mission-receipt-confirm" data-feedback-close autofocus>${d.done?'보상 확인 · 계속':'임무 확인 · 계속'}</button></article>`;}
export function showMissionFeedback(dialog,data){
 if(!data)return;
 dialog.innerHTML=missionFeedbackHTML(data);
 dialog.onclick=e=>{if(e.target.closest('[data-feedback-close]'))dialog.close();else if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
 if(!dialog.open)dialog.showModal();
}
