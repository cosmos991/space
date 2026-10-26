import {crewMember} from './crew-data.js';
import {FACTIONS} from './factions.js';
import {missionOffers} from './missions.js';
import {imageSource} from './image-assets.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const captainChannel=s=>'NMD-'+Number(s.galaxy.seed).toString(36).toUpperCase().padStart(7,'0');
function reporter(s){const m=s.crew.roster.find(m=>m.assignment==='navigation')||s.crew.roster.find(m=>m.assignment==='engineering')||s.crew.roster[0];return m?crewMember(m.id,s):null;}
function reportLine(c){return !c?'함선 AI가 우선순위 신호를 분리했습니다.':/신중|차분/.test(c.personality)||c.mbti?.startsWith('I')?'함장님, 이상 신호를 확인했습니다. 대응을 결정해 주세요.':'함장님, 전방에 특이 상황입니다! 지금 확인해 주세요.';}
export function urgentSignals(s){
 const seen=new Set(s.world.urgentSeen||[]),out=[],c=reporter(s),e=s.event;
 if(e&&['raiders','ion','debris','gravity','micrometeor','rescue','signal','crew-rescue','relic','cache','probe','wreck','comet'].includes(e.id)){
  const pirate=e.id==='raiders';out.push({key:'event:'+(e.uid||e.id+'-'+e.created),type:pirate?'hostile':['ion','debris','gravity','micrometeor'].includes(e.id)?'hazard':'crew',label:pirate?'긴급 통신 · 적대 함선 접근':'승무원 우선 보고 · 특수 사건',sender:pirate?e.enemy?.name||'미확인 무장 함선':c?.name||'노마드 함선 AI',portrait:!pirate&&c?imageSource(s,'person:'+c.id):'',title:e.title,body:pirate?'외부 무장 함선이 접근하며 노마드의 응답을 요구하고 있습니다. 교전·철수·통행료 중 대응을 선택해야 합니다.':reportLine(c)+' '+e.text,note:pirate?(c?.name||'전술 AI')+' 보고: 무장 신호 포착. 함장님의 대응을 기다립니다.':'보고자 · '+(c?.title||'자율 항로 감시'),action:'상황 확인 · 대응 선택',target:{kind:'event',uid:e.uid,location:e.location}});
 }
 const f=s.world.forecast;if(f&&s.travel&&f.from===s.travel.from&&f.to===s.travel.to)out.push({key:'forecast:'+f.id+':'+f.created,type:'hazard',label:'승무원 긴급 보고 · 항로 사전 경고',sender:c?.name||'노마드 항로 센서',portrait:c?imageSource(s,'person:'+c.id):'',title:f.id==='ion'?'전방 이온 폭풍 징후':'전방 항로 이상 징후',body:reportLine(c)+' 전방 위험 징후를 감지했습니다. 현재는 사전 경고이며, 접근하면 실제 사건으로 이어질 수 있습니다.',note:'지도에 경고가 표시되었습니다. 항해가 일시 정지되었습니다.',action:'위험 항로 확인',target:{kind:'forecast',location:f.to}});
 const offers=new Set(missionOffers(s).map(m=>m.offerId));
 for(const channel of s.comms.channels.filter(c=>c.kind==='direct'))for(const m of channel.messages){if(m.priority!=='urgent'||!offers.has(m.missionId)||Math.floor(m.hours/24)!==Math.floor(s.hours/24))continue;const f=FACTIONS.find(f=>f.id===m.missionFaction);if(!f)continue;out.push({key:'mission:'+channel.id+':'+m.seq,type:'mission',label:'긴급 직통 통신 · 함장 전용 코드 수신',sender:f.contact.name,portrait:imageSource(s,'person:faction-'+f.id),title:'우선 대응 임무 요청',body:m.content,note:'수신 대상 · '+captainChannel(s)+' / '+f.name+' 인증 회선',action:'의뢰 내용 검토',target:{kind:'mission',id:m.missionId,faction:f.id}});}
 return out.filter(m=>!seen.has(m.key));
}
export function acknowledgeUrgent(s,key){s.world.urgentSeen=[...(s.world.urgentSeen||[]).filter(k=>k!==key),key].slice(-120);}
export function urgentCommsHTML(s,d){return `<article class="urgent-transmission urgent-${esc(d.type)}"><div class="urgent-strip"><span class="urgent-beacon" aria-hidden="true"></span><strong>${esc(d.label)}</strong><button type="button" data-urgent-dismiss aria-label="긴급 통신 닫기">✕</button></div><div class="urgent-channel">PRIORITY OVERRIDE <span>${esc(captainChannel(s))}</span></div><div class="urgent-content"><div class="urgent-sender">${d.portrait?`<img src="${esc(d.portrait)}" referrerpolicy="no-referrer" alt="${esc(d.sender)} 초상화">`:'<span aria-hidden="true">◉</span>'}<strong>${esc(d.sender)}</strong><small>연결됨 · 우선 수신</small></div><div class="urgent-message"><h2 id="urgent-comms-title">${esc(d.title)}</h2><p>${esc(d.body)}</p><small>${esc(d.note)}</small></div></div><div class="urgent-wave" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--wave:${i%5}"></i>`).join('')}</div><div class="urgent-actions"><button type="button" data-urgent-dismiss>수신 확인 · 닫기</button><button type="button" class="primary" data-urgent-action autofocus>${esc(d.action)}</button></div></article>`;}
export function createUrgentComms({dialog,getState,onAcknowledge,onAction,onPresent}){
 let active=null,origin=null,follow=false;
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-urgent-action]')){follow=true;dialog.close();}else if(e.target.closest('[data-urgent-dismiss]'))dialog.close();});
 dialog.addEventListener('close',()=>{const d=active,s=origin,action=follow;active=null;origin=null;follow=false;if(d&&s===getState()){acknowledgeUrgent(s,d.key);onAcknowledge();if(action&&urgentTargetValid(s,d))onAction(d);}});
 return {update(blocked=false){const s=getState();if(active&&(s!==origin||!urgentTargetValid(s,active))){active=null;origin=null;follow=false;dialog.close();return;}if(active||blocked)return;const next=urgentSignals(s)[0];if(!next)return;origin=s;active=next;dialog.innerHTML=urgentCommsHTML(s,next);onPresent();dialog.showModal();}};
}
function urgentTargetValid(s,d){if(d.target.kind==='event')return !!s.event&&(s.event.uid===d.target.uid);if(d.target.kind==='forecast')return !!s.world.forecast&&!!s.travel&&d.target.location===s.travel.to&&d.key==='forecast:'+s.world.forecast.id+':'+s.world.forecast.created;return missionOffers(s).some(m=>m.offerId===d.target.id);}
