import {archiveRequest,saveArchive,readArchive,cloudHTML} from './archive-client.js';
import {loadImages,exportWorldImages,replaceWorldImages,getPositiveBase,setPositiveBase,imageTargets,imagePrompt,imageSlot,imagesHTML,imageSource,addImage,selectImage,removeImage} from './image-assets.js';
import {galaxyHTML,generationHTML} from './galaxy-ui.js';
import {currentSystem,beginExploration,completeExploration,failExploration,jumpSystem,updateRules} from './galaxy.js';
import {placesFor} from './world-data.js';
import {dataPanelHTML,contactsHTML,contactHTML} from './data-ui.js';
import {crewHTML,shipCrewHTML,recruitmentHTML} from './crew-ui.js';
import {CREW_CANDIDATES,crewMember,crewCapacity,recruitmentCandidates} from './crew-data.js';
import {aboard,readCrew,crewMessage,crewUnread,canContactCrew,contactCrew} from './crew.js';
import {missionsHTML} from './mission-ui.js';
import {playCombatEffects,cancelCombatEffects} from './combat-effects.js';
import {shipStats} from './equipment.js';
import {equipmentHTML,loadoutHTML} from './equipment-ui.js';
import {regionalIssues,tickerHTML,newsHTML} from './news.js';
import {combatHTML} from './combat-ui.js';
import {systemMapHTML} from './map-ui.js';
import {locationHTML} from './location-ui.js';
import {factionsHTML} from './faction-ui.js';
import {planetIncome,LOCATION_TYPES} from './world-data.js';
import {eventChoices} from './events.js';
import {activeChannel,selectChannel,markRead,unread,addChannel,publicPost,append} from './communications.js';
import {commsHTML,channelMessagesHTML,channelListHTML} from './comms-ui.js';
import {freshUsage,validUsageStore,recordUsage,usageHTML} from './usage.js';
import {quoteTrade,unitPrice,PORTS} from './economy.js';
import {tradingHTML} from './trading-ui.js';
import {PLACES,GOODS,FACTIONS,place,usedCargo,freshState,route,depart,tick,trade,service,survey,claim,contract,tow,resolveEvent,validSave,migrateState,purchasePlanet,deliverOre,shareSurveys,combatOrder,equipmentOrder,missionOrder,crewOrder} from './engine.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='asterion-save-v1';let state=freshState(),selected='terra',tab='navigation',speed=0,busy=false,toastTimer,saveWarning=false,channel='확인 중';
try{const saved=JSON.parse(localStorage.getItem(KEY));if(validSave(saved))state=migrateState(saved);}catch{}
selected=state.location;let focusedFaction='union',confirmPurchase=false;
let combatAnimating=false;
let selectedCrew=state.crew.roster[0]?.id||CREW_CANDIDATES[0].id,crewView='aboard',crewReview='',crewProfileOpen=false;const crewDrafts={},crewAssignments={};
let generating=false,generationPreview=false;
let imageTarget='person:test-navigator',imagePending=false,imageError='',imageQuality='low',imageProvider='novelai',imageProviders={};const imageDrafts={},imageNegative={},imageSeeds={};
try{const preferred=sessionStorage.getItem('asterion-image-provider');if(['openai','novelai'].includes(preferred))imageProvider=preferred;}catch{}
let dataSection='home',dataContact='';
let imagesReady=Promise.resolve();
let cloud={configured:false,checked:false,busy:false,progress:'',error:'',archives:[],review:''};
const PROMPT_KEY='asterion-image-prompts-v1';
function promptSettings(){return {drafts:{...imageDrafts},negative:{...imageNegative},seeds:{...imageSeeds},provider:imageProvider,positiveBase:getPositiveBase()};}
function persistPrompts(){try{localStorage.setItem(PROMPT_KEY,JSON.stringify(promptSettings()));}catch{toast('프롬프트를 브라우저에 저장하지 못했습니다.',true);}}
try{const settings=JSON.parse(localStorage.getItem(PROMPT_KEY));if(settings&&typeof settings==='object'){if(typeof settings.positiveBase==='string'&&settings.positiveBase.trim()&&settings.positiveBase.length<=3500)setPositiveBase(settings.positiveBase);for(const [key,target,max]of [['drafts',imageDrafts,3500],['negative',imageNegative,1500],['seeds',imageSeeds,12]])for(const [k,v]of Object.entries(settings[key]||{}))if(!['__proto__','prototype','constructor'].includes(k)&&/^[a-zA-Z0-9:_-]{1,180}$/.test(k)&&typeof v==='string'&&v.length<=max)target[k]=v;}}catch{}

function crewConversationOpen(id=selectedCrew){return (tab==='crew'&&selectedCrew===id)||(tab==='data'&&dataSection==='contacts'&&dataContact===id);}
let reviewMission='',selectedMission='';
let gearSlot='weapon',gearView='shop',gearFamily='all';
let newsPaused=false,newsSignature='';try{newsPaused=sessionStorage.getItem('asterion-news-paused')==='true';}catch{}
const order={good:'ore',buy:true,quantity:1};
const USAGE_KEY='asterion-api-usage-v1';let usageLog=freshUsage(),usageScope='today',serverInfo={};
try{const previous=JSON.parse(localStorage.getItem(USAGE_KEY));if(validUsageStore(previous))usageLog=previous;}catch{}
function trackRequest(record){try{const latest=JSON.parse(localStorage.getItem(USAGE_KEY));if(validUsageStore(latest))usageLog=latest;}catch{}recordUsage(usageLog,record);try{localStorage.setItem(USAGE_KEY,JSON.stringify(usageLog));}catch{toast('사용량 기록을 저장할 수 없습니다. 현재 화면에서만 집계됩니다.',true);}}
window.addEventListener('storage',e=>{if(e.key!==USAGE_KEY)return;try{const latest=JSON.parse(e.newValue);if(validUsageStore(latest)){usageLog=latest;if(tab==='data'&&dataSection==='usage')renderDetail();}}catch{}});
const radioDrafts={};let radioAddOpen=false,renderedSequence=0;
let accessCode='';try{accessCode=sessionStorage.getItem('asterion-access')||'';}catch{}
const fmt=n=>Math.floor(n).toLocaleString('ko-KR');const time=h=>`D${String(Math.floor(h/24)+1).padStart(3,'0')} ${String(Math.floor(h%24)).padStart(2,'0')}:00`;
function toast(message,error=false){$('#toast').textContent=message;$('#toast').className=`visible${error?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').className='',4000);}
function save(manual=false){try{localStorage.setItem(KEY,JSON.stringify(state));if(manual)toast('항해 기록을 저장했습니다.');return true;}catch{if(!saveWarning||manual)toast('저장 공간에 접근할 수 없습니다. 이 브라우저에서는 자동 저장이 제한됩니다.',true);saveWarning=true;return false;}}
function act(fn){try{fn();save();render();}catch(e){toast(e.message,true);}}
function setSpeed(n){speed=n;renderTime();}
function renderTime(){$('#clock').textContent=time(state.hours);$('#sim-status').textContent=state.event?'긴급 상황 · 대응 대기':speed?`시간 진행 중 · ${speed}×`:'시뮬레이션 정지';document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===speed));}
function renderStats(){if(workspacePanel.open){if(tab==='crew')readCrew(state,selectedCrew);if(tab==='data'&&dataSection==='contacts'&&dataContact)readCrew(state,dataContact);}const stats=[['보유 자금',fmt(state.credits),'CR','assets'],['연료',fmt(state.fuel),'/ 100','ship'],['화물',usedCargo(state),'/ 40t','market'],['탐사',placesFor(state).filter(p=>LOCATION_TYPES[p.type].survey&&(state.survey[p.id]||0)>0).length,'/ '+placesFor(state).filter(p=>LOCATION_TYPES[p.type].survey).length,'log']];$('#stats').innerHTML=stats.map(([label,value,unit,target])=>`<button class="bridge-stat" data-tab="${target}" aria-haspopup="dialog"><span>${label}</span><strong>${value}<small>${unit}</small></strong></button>`).join('');const alert=$('#bridge-alert');alert.hidden=!state.event;alert.dataset.tab=state.combat?.status==='active'?'combat':'navigation';const radioNav=$('#nav [data-tab="comms"] small');if(radioNav){const n=state.comms.channels.reduce((n,c)=>n+unread(c),0);radioNav.textContent=n?'통신 · '+n:'통신';}const crewNav=$('#nav [data-tab="crew"] small');if(crewNav){const count=state.crew.roster.reduce((n,m)=>n+crewUnread(state,m.id),0);crewNav.textContent=count?'승무원 · '+count:'승무원';}if(state.event)alert.textContent=`⚠ ${state.event.title} · 대응 패널 열기 →`;}
const PANEL_META={galaxy:['성간 탐색과 항해','INTERSTELLAR EXPLORATION'],data:['함장 데이터 패드','PERSONAL DATA TERMINAL'],recruitment:['현지 인물과 승함 계약','LOCAL RECRUITMENT'],crew:['승무원과 함내 대화','CREW / PRIVATE COMMS'],missions:['임무와 전담 담당자','FACTION ASSIGNMENTS'],equipment:['함선 장비 도크','SHIP OUTFITTING'],news:['성계 소식','REGIONAL NEWS'],combat:['전투 지휘','TACTICAL COMMAND'],navigation:['구역 정보와 행동','LOCATION SERVICES'],factions:['주요 팩션','FACTION RELATIONS'],market:['거래소','COMMODITY EXCHANGE'],assets:['자산 관리','ASSET MANAGEMENT'],comms:['통신 네트워크','COMMUNICATIONS ARRAY'],ship:['함선 상태','SHIP SYSTEMS'],usage:['API 사용량','API TELEMETRY'],log:['항해 일지','CAPTAIN’S LOG']};
const workspacePanel=$('#workspace-panel');
function syncPanelNavigation(){document.querySelectorAll('[data-tab]').forEach(b=>{const active=workspacePanel.open&&b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-expanded',String(active));});document.querySelectorAll('[data-home]').forEach(b=>b.classList.toggle('active',!workspacePanel.open));}
function openPanel(next){if(['news','usage','log'].includes(next)){dataSection=next;dataContact='';next='data';}if(!PANEL_META[next])return;if(next==='recruitment'){const candidates=recruitmentCandidates(state);if(!candidates.some(c=>c.id===selectedCrew))selectedCrew=candidates[0]?.id||'';if(selectedCrew){crewOrder(state,selectedCrew,'meet');save();}}if(next==='crew'&&!aboard(state,selectedCrew))selectedCrew=state.crew.roster[0]?.id||'';if(next!=='navigation')confirmPurchase=false;setSpeed(0);tab=next;if(!workspacePanel.open)workspacePanel.showModal();renderDetail();$('#detail').scrollTop=0;}
function closePanel(){cancelCombatEffects();if(workspacePanel.open)workspacePanel.close();syncPanelNavigation();}
$('#close-panel').onclick=closePanel;
workspacePanel.addEventListener('close',()=>{cancelCombatEffects();syncPanelNavigation();if(!document.activeElement||document.activeElement===document.body||workspacePanel.contains(document.activeElement))$('#nav [data-home]').focus();});
workspacePanel.addEventListener('click',e=>{if(e.target!==workspacePanel)return;const r=workspacePanel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();});
function renderNews(){const issues=regionalIssues(state),signature=JSON.stringify([issues,newsPaused]);if(signature===newsSignature)return;newsSignature=signature;$('#region-news').innerHTML=tickerHTML(issues,newsPaused);}
function renderMap(){
 $('.bridge-heading h1').textContent=currentSystem(state).name+' 항성계';$('#system-map').setAttribute('aria-label',currentSystem(state).name+' 항성계 지도');$('.map-coordinate').textContent='LOCAL SECTOR / '+placesFor(state).length+' DESTINATIONS · 목적지를 선택하면 항법 패널이 열립니다';
 $('#system-map').innerHTML=systemMapHTML(state,selected);
 const current=place(state.location,state),r=state.travel,button=$('#current-location-button');
 if(button){button.disabled=!!r;button.textContent=r?'항해 중 · 목적지 도착 대기':'현재 구역 행동 ↗';}
 $('#travel').innerHTML=r?`<div class="travel-row"><div><small>현재 항로</small><br><strong>${place(r.from,state).name} → ${place(r.to,state).name}</strong></div><small>도착까지 ${Math.ceil(r.remaining)}h · ${speed?'항해 중':'일시정지'}</small></div><div class="progress"><i style="width:${(1-r.remaining/r.total)*100}%"></i></div>`:`<div class="travel-row"><button data-current-location class="current-place-button"><small>현재 위치 · ${LOCATION_TYPES[current.type].name}</small><strong>⌖ ${current.name} <span>구역 행동 →</span></strong></button><span class="tag">${current.market?'정박 · 서비스 이용 가능':'안전 궤도 · 조사 가능'}</span></div>`;
}
function eventHTML(){if(state.combat?.status==='active')return `<div class="event-card"><h3>⚠ 적 함선과 교전 중</h3><p>항해는 정지되어 있습니다. 전투 지휘 패널에서 다음 명령을 선택하세요.</p><button class="primary" data-tab="combat">전투 지휘로 이동 →</button></div>`;return state.event?`<div class="event-card"><div class="event-label">${state.event.trigger==='survey'?'탐사 중 발견':'항로 사건'} · 시뮬레이션 정지</div><h3>⚠ ${esc(state.event.title)}</h3><p>${esc(state.event.text)}</p><div class="event-options">${eventChoices(state).map(c=>`<button data-action="event-${c.id}" ${c.disabled?'disabled':''}><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small>${c.reason?`<em>${esc(c.reason)}</em>`:''}</button>`).join('')}</div><button class="quiet" data-tab="comms">공개 통신과 사건 보고 확인 ↗</button></div>`:'';}
function refreshRadio(){if(tab!=='comms'||!workspacePanel.open||!$('#radio-feed'))return;const feed=$('#radio-feed'),bottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<60;if(renderedSequence!==state.comms.sequence){feed.innerHTML=channelMessagesHTML(state);if(bottom){feed.scrollTop=feed.scrollHeight;markRead(state);}$('#radio-channel-list').innerHTML=channelListHTML(state);renderedSequence=state.comms.sequence;}}
function renderDetail(){cancelCombatEffects();syncPanelNavigation();if(!workspacePanel.open)return;workspacePanel.dataset.panel=tab;$('#panel-title').textContent=PANEL_META[tab][0];$('#panel-kicker').textContent=PANEL_META[tab][1];const combatTab=$('#combat-tab');if(combatTab)combatTab.hidden=!state.combat;let html=tab==='combat'?'':eventHTML();const dataStart=html.length;
 if(tab==='data'&&dataSection==='contacts'){if(dataContact)readCrew(state,dataContact);html+=dataContact?contactHTML(state,dataContact,{busy,draft:crewDrafts[dataContact]||'',accessCode,channel}):contactsHTML(state);}
 if(tab==='galaxy')html+=galaxyHTML(state,{generating,accessCode});
 if(tab==='data'&&dataSection==='cloud')html+=cloudHTML({...cloud,code:accessCode});
 if(tab==='data'&&dataSection==='images')html+=imagesHTML(state,imageTarget,{pending:imagePending,prompt:imageDrafts[imageProvider+':'+imageTarget],accessCode,quality:imageQuality,error:imageError,provider:imageProvider,negativePrompt:imageNegative[imageTarget],seed:imageSeeds[imageTarget]||'',providers:imageProviders});
 if(tab==='data'&&dataSection==='generation')html+=generationHTML(state,{preview:generationPreview});
 if(tab==='recruitment')html+=recruitmentHTML(state,{id:selectedCrew,review:crewReview});
 if(tab==='crew'){readCrew(state,selectedCrew);html+=crewHTML(state,{id:selectedCrew,view:crewView,review:crewReview,assignment:crewAssignments[selectedCrew],profileOpen:crewProfileOpen,busy,draft:crewDrafts[selectedCrew]||'',accessCode,channel});}
 if(tab==='equipment')html+=equipmentHTML(state,{slot:gearSlot,view:gearView,family:gearFamily});
 if(tab==='data'&&dataSection==='news')html+=newsHTML(state);
 if(tab==='combat')html+=combatHTML(state);
 if(tab==='navigation')html+=locationHTML(state,selected,{confirmPurchase});
 if(tab==='factions')html+=factionsHTML(state,focusedFaction,{review:reviewMission,selectedMission});
 if(tab==='missions')html+=missionsHTML(state,{factionId:focusedFaction,review:reviewMission,selected:selectedMission});
 if(tab==='market')html+=tradingHTML(state,order);
 if(tab==='assets'){html+=`<div class="section-kicker">ASSET MANAGEMENT</div><div class="asset-card"><span class="tag">기함 / OWNED</span><img class="asset-ship-image" src="${esc(imageSource(state,'ship:nomad','/assets/nomad.jpg'))}" width="1536" height="1024" alt="CSV 노마드 탐사선" loading="lazy"><button data-image-target="ship:nomad">이미지 생성·관리</button><h3>CSV 노마드</h3><p>독립 탐사선 · 화물 40t · 연료 100<br>현재 위치: ${state.travel?'항해 중':place(state.location,state).name}</p></div>${state.outpost?'<div class="asset-card"><span class="tag">가동 중</span><h3>케플러 채굴 전초기지</h3><p>자동 채굴 수익이 시뮬레이션 시간에 따라 입금됩니다.</p><div class="income">+9 <small>CR / h</small></div></div>':'<div class="empty">아직 보유한 시설이 없습니다.<br>케플러 소행성대를 탐사한 뒤<br>2,000 CR으로 채굴 전초기지를 건설하세요.</div>'}<div class="facts"><div class="fact"><small>완료한 계약</small><strong>${state.completed} 건</strong></div><div class="fact"><small>정기 수익</small><strong>${fmt((state.outpost?9:0)+planetIncome(state))} CR / h</strong></div></div>${state.diplomacy.ownedPlanets.map(id=>`<div class="asset-card"><span class="tag">행성 소유</span><h3>${place(id,state).name}</h3><p>행정 소유권 등록 완료 · 기본 세수</p><div class="income">+${fmt(place(id,state).income)} CR / h</div></div>`).join('')}<p class="hint">정거장은 구매할 수 없습니다. 행성 소유권은 자금·명예·관할 팩션 신뢰 조건을 충족하면 매입할 수 있습니다.</p>`;}
 if(tab==='comms')html+=commsHTML(state,{busy,channel,accessCode,draft:radioDrafts[state.comms.active]||'',addOpen:radioAddOpen,speed,FACTIONS});
 if(tab==='data'&&dataSection==='usage')html+=usageHTML(usageLog,usageScope,serverInfo);
 if(tab==='ship')html+='<button data-image-target="ship:nomad">함선 이미지 생성·관리</button>'+shipCrewHTML(state)+loadoutHTML(state)+`<figure class="ship-hero"><img src="${esc(imageSource(state,'ship:nomad','/assets/nomad.jpg'))}" width="1536" height="1024" alt="백색 장갑과 청록색 엔진을 갖춘 CSV 노마드 소형 탐사선"><figcaption><div><span class="eyebrow">INDEPENDENT EXPLORER</span><h3>CSV NOMAD</h3></div><span class="tag">SCOUT / CARGO 40t</span></figcaption></figure><div id="ship"></div><div class="facts"><div class="fact"><small>연료</small><strong>${state.fuel} / 100</strong></div><div class="fact"><small>화물 적재</small><strong>${usedCargo(state)} / 40t</strong></div><div class="fact"><small>현재 위치</small><strong>${state.travel?'항해 중':place(state.location,state).name}</strong></div><div class="fact"><small>등록 구분</small><strong>독립 탐사선</strong></div></div><div class="actions"><button data-tab="market">거래소에서 보급 및 수리 →</button><button data-tab="assets">보유 자산 관리 →</button></div>`;
 if(tab==='data'&&dataSection==='log')html+=`<details class="event-rulebook"><summary>랜덤 사건 규칙 · 현재 ${state.world.checks}회 판정 / ${state.world.resolved}건 해결</summary><p>시간 사건은 6시간마다 판정합니다. 항해 기본 확률 28%, 외곽 목적지 +15%p, 선체 50 미만 +8%p. 정박 중에는 강제 선택 대신 10% 확률로 현지 시장 소식이 발생합니다.</p><p>외곽 구역 탐사 완료 시 35% 확률로 추가 발견을 판정합니다. 사건 사이 최소 12시간, 같은 사건은 36시간 재발 제한이 있습니다. 조건과 대기 시간에 따라 실제 발생 빈도는 더 낮아집니다.</p><p>구조 요청·잔해·이온 폭풍·이동 상인·순찰 검문·보급 컨테이너·유적 신호·적대 함선 조우와 특수 승무원 조난 신호의 9종입니다. 적대 함선은 항해 중에만 등장하며 외곽 항로에서 가중치가 높습니다. 사건 선택지에 자원·시간·실패 확률을 표시합니다. 랜덤 판정과 NPC 방송에는 AI를 호출하지 않습니다.</p></details>`;
 if(tab==='data'&&dataSection==='log'&&state.combat)html+='<button data-tab="combat" class="quiet">최근 교전 보고 확인 →</button>';
 if(tab==='data'&&dataSection==='log')html+=`<div class="section-kicker">CAPTAIN'S LOG</div><h2 class="subhead">항해 기록</h2><div class="log-list">${state.logs.map(l=>`<div class="feed-item ${esc(l.kind)}"><time>${time(l.time)}</time><span>${esc(l.text)}</span></div>`).join('')}</div>`;
 if(tab==='data')html=html.slice(0,dataStart)+dataPanelHTML(state,dataSection,html.slice(dataStart));
 $('#detail').innerHTML=html;document.querySelectorAll('[data-portrait-id]').forEach(el=>{const id='person:'+el.dataset.portraitId,src=imageSource(state,id);if(src){el.innerHTML='<img alt="인물 초상화">';el.querySelector('img').src=src;}el.dataset.imageTarget=id;el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label','초상화 이미지 생성·관리');});if(crewConversationOpen(tab==='data'?dataContact:selectedCrew)){const feed=$('#crew-feed');if(feed){feed.scrollTop=feed.scrollHeight;readCrew(state,tab==='data'?dataContact:selectedCrew);}}if(tab==='ship')renderShip();if(tab==='comms'){const list=$('#radio-feed');list.scrollTop=list.scrollHeight;markRead(state);renderedSequence=state.comms.sequence;$('#radio-channel-list').innerHTML=channelListHTML(state);}
}
function renderShip(){if(!$('#ship'))return;$('#ship').innerHTML=`<div class="ship-grid"><div class="ship-silhouette"><svg viewBox="0 0 120 80" aria-label="노마드 탐사선"><path d="M60 4L72 28L78 31L86 21L90 57L78 64L68 60L66 74H54L52 60L42 64L30 57L34 21L42 31L48 28Z" fill="#15333e" stroke="#698e9f"/><path d="M60 14L66 36L60 43L54 36Z" fill="#68d5c0"/><path d="M44 38V53M76 38V53M57 53V67M63 53V67" stroke="#416c7b"/></svg></div><div><small>선체 내구도</small><strong>${state.hull}% <span class="muted">/ 정상</span></strong><div class="meter"><i style="width:${state.hull}%"></i></div><small>동력 장치</small><strong>온라인</strong></div><div><small>실드 출력</small><strong>${state.shield} / ${shipStats(state).maxShield} <span class="muted">/ 정상</span></strong><div class="meter"><i style="width:${state.shield/shipStats(state).maxShield*100}%;background:#769ee1"></i></div><small>승무원</small><strong>${state.crew.roster.length} / ${crewCapacity(state)}명 <span class="muted">/ 함장 별도</span></strong></div></div>`;}

function render(){renderNews();renderStats();renderMap();renderDetail();renderShip();renderTime();}
async function issueCombatOrder(action){
 if(combatAnimating)return;
 const root=$('.combat-console');
 try{
  const result=combatOrder(state,action);save();combatAnimating=true;
  root?.querySelectorAll('[data-combat-order]').forEach(b=>b.disabled=true);
  await playCombatEffects(root,result.effects||[]);
 }catch(e){toast(e.message,true);}
 finally{combatAnimating=false;render();}
}
const actions={warp:()=>openPanel('galaxy'),depart:()=>{depart(state,selected);setSpeed(1);closePanel();toast('출항했습니다. 배속 버튼으로 시간을 조절하세요.');},survey:()=>{survey(state);if(state.event)toast('탐사 중 추가 사건을 발견했습니다. 대응을 선택하세요.');},claim:()=>claim(state),fuel:()=>service(state,'fuel'),shield:()=>service(state,'shield'),repair:()=>service(state,'repair'),contract:()=>contract(state,'accept'),deliver:()=>contract(state,'deliver'),'deliver-ore':()=>deliverOre(state),'share-surveys':()=>shareSurveys(state),tow:()=>{tow(state);selected='haven';}};
document.addEventListener('click',e=>{const b=e.target.closest('button,[data-place],[data-home]');if(!b)return;if(b.hasAttribute('data-home')||b.hasAttribute('data-close-panel')){e.preventDefault();closePanel();return;}if(b.dataset.explore){exploreSector(b.dataset.explore);return;}if(b.hasAttribute('data-explore-resume')){exploreSector(state.galaxy.job.coord,true);return;}if(b.dataset.systemJump){act(()=>{toast(jumpSystem(state,b.dataset.systemJump));closePanel();render();});return;}if(b.hasAttribute('data-generation-preview')){generationPreview=true;renderDetail();return;}if(b.dataset.dataSection){act(()=>{dataSection=b.dataset.dataSection;dataContact='';openPanel('data');});return;}if(b.dataset.contactId){act(()=>{if(!canContactCrew(state,b.dataset.contactId))throw Error('등록되지 않은 연락처입니다.');dataSection='contacts';dataContact=b.dataset.contactId;openPanel('data');});return;}if(b.hasAttribute('data-open-contacts')){dataSection='contacts';dataContact='';openPanel('data');return;}if(b.dataset.crewView){crewView=b.dataset.crewView;crewReview='';openPanel('crew');return;}if(b.dataset.crewSelect){selectedCrew=b.dataset.crewSelect;crewReview='';crewProfileOpen=false;act(()=>{readCrew(state,selectedCrew);openPanel(tab==='recruitment'?'recruitment':'crew');});return;}if(b.hasAttribute('data-open-crew')){selectedCrew=b.dataset.openCrew||state.crew.roster[0]?.id||CREW_CANDIDATES[0].id;crewView='aboard';openPanel('crew');return;}if(b.dataset.crewReview){crewReview=b.dataset.crewReview==='cancel'?'':b.dataset.crewReview;renderDetail();return;}if(b.dataset.crewAction){if(busy){toast('통신 응답 후 승무원을 변경하세요.',true);return;}act(()=>{const action=b.dataset.crewAction,id=b.dataset.crewId||selectedCrew;toast(crewOrder(state,id,action,b.dataset.assignment));crewReview='';if(action==='hire'){selectedCrew=id;crewView='aboard';crewProfileOpen=false;openPanel('crew');}if(action==='dismiss'){selectedCrew=state.crew.roster[0]?.id||id;crewView='aboard';}});return;}if(b.dataset.crewReport){act(()=>crewOrder(state,b.dataset.crewId,'report',b.dataset.crewReport));return;}if(b.id==='news-pause'){newsPaused=!newsPaused;try{sessionStorage.setItem('asterion-news-paused',String(newsPaused));}catch{}renderNews();return;}if(b.dataset.missionOpen){focusedFaction=b.dataset.missionFaction;selectedMission=b.dataset.missionOpen;reviewMission=selectedMission;openPanel('missions');return;}if(b.dataset.openMissions){focusedFaction=b.dataset.openMissions;reviewMission='';selectedMission='';openPanel('missions');return;}if(b.dataset.missionReview){reviewMission=b.dataset.missionReview==='cancel'?'':b.dataset.missionReview;renderDetail();return;}if(b.dataset.missionAction){act(()=>{const action=b.dataset.missionAction;const message=missionOrder(state,b.dataset.missionId,action);reviewMission='';selectedMission='';if(action==='track')openPanel('combat');toast(message);});return;}if(b.dataset.newsLocation){selected=b.dataset.newsLocation;confirmPurchase=false;renderMap();openPanel('navigation');return;}if(b.dataset.combatOrder){issueCombatOrder(b.dataset.combatOrder);return;}if(b.hasAttribute('data-combat-continue')){if(state.combat?.status==='active')return;if(state.travel){closePanel();setSpeed(1);}else{selected=state.location;openPanel('navigation');}return;}if(b.hasAttribute('data-current-location')){if(!state.travel){selected=state.location;confirmPurchase=false;renderMap();openPanel('navigation');}return;}if(b.dataset.openFaction){focusedFaction=b.dataset.openFaction;reviewMission='';selectedMission='';openPanel('factions');return;}if(b.dataset.factionContact){act(()=>{selectChannel(state,'dm-'+b.dataset.factionContact);openPanel('comms');});return;}if(b.hasAttribute('data-purchase-review')){confirmPurchase=true;renderDetail();return;}if(b.hasAttribute('data-purchase-cancel')){confirmPurchase=false;renderDetail();return;}if(b.hasAttribute('data-purchase-confirm')){act(()=>{purchasePlanet(state,selected);confirmPurchase=false;toast('행성 소유권이 등록되었습니다.');});return;}if(b.dataset.gearFamily){gearFamily=b.dataset.gearFamily;renderDetail();return;}if(b.dataset.gearSlot){gearSlot=b.dataset.gearSlot;openPanel('equipment');return;}if(b.dataset.gearView){gearView=b.dataset.gearView;renderDetail();return;}for(const [key,action]of [['gearBuy','buy'],['gearEquip','equip'],['gearSell','sell']]){if(b.dataset[key]){act(()=>toast(equipmentOrder(state,b.dataset[key],action)));return;}}if(b.dataset.localAction){const id=b.dataset.localAction;if(id==='market'||id==='equipment'||id==='missions'||id==='crew'||id==='recruitment'){if(id==='missions')focusedFaction=place(state.location,state).factionId||'union';openPanel(id);}else if(id==='contact'){act(()=>{selectChannel(state,'dm-'+place(state.location,state).factionId);openPanel('comms');});}else act(()=>actions[id]?.());return;}if(b.dataset.tab){openPanel(b.dataset.tab);return;}if(b.dataset.place){selected=b.dataset.place;confirmPurchase=false;renderMap();openPanel('navigation');return;}if(b.dataset.speed!==undefined){if(state.event&&Number(b.dataset.speed)){toast('긴급 상황에 먼저 대응하세요.',true);return;}if(busy){toast('통신 응답을 기다려 주세요.',true);return;}setSpeed(Number(b.dataset.speed));return;}if(b.hasAttribute('data-radio-add')){radioAddOpen=!radioAddOpen;renderDetail();return;}if(b.dataset.radioChannel){act(()=>{selectChannel(state,b.dataset.radioChannel);if(activeChannel(state).kind==='direct')setSpeed(0);});return;}if(b.dataset.radioSubscribe){act(()=>{addChannel(state,{directoryId:b.dataset.radioSubscribe});radioAddOpen=false;});return;}if(b.hasAttribute('data-radio-run')){if(!state.event&&!busy){setSpeed(speed?0:1);renderDetail();}return;}if(b.dataset.usageScope){usageScope=b.dataset.usageScope;renderDetail();return;}if(b.dataset.good){order.good=b.dataset.good;renderDetail();return;}if(b.dataset.orderSide){order.buy=b.dataset.orderSide==='buy';renderDetail();return;}if(b.dataset.orderQuantity){order.quantity=Number(b.dataset.orderQuantity);renderDetail();return;}if(b.dataset.tradeRoute){selected=b.dataset.tradeRoute;renderMap();openPanel('navigation');return;}if(b.dataset.placeOrder!==undefined){setSpeed(0);act(()=>{const q=quoteTrade(state,order.good,order.quantity,order.buy);if(q.total!==Number(b.dataset.placeOrder)){renderDetail();throw Error('시세가 변경되었습니다. 갱신된 주문 금액을 확인해 주세요.');}trade(state,order.good,order.quantity,order.buy);toast(`${order.buy?'매수':'매도'} 체결 · ${order.quantity}t / ${q.total} CR`);});return;}if(b.dataset.action){const action=b.dataset.action;act(()=>{if(action.startsWith('event-')){const raid=state.event?.id==='raiders';resolveEvent(state,action.slice(6));if(raid)openPanel('combat');}else actions[action]?.();});}});
$('#system-map').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.place){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('input',e=>{if(e.target.id==='image-negative'){imageNegative[imageTarget]=e.target.value;persistPrompts();return;}if(e.target.id==='image-seed'){imageSeeds[imageTarget]=e.target.value;persistPrompts();return;}if(e.target.id==='image-prompt'){imageDrafts[imageProvider+':'+imageTarget]=e.target.value;persistPrompts();return;}if(e.target.id==='image-access'){accessCode=e.target.value;try{sessionStorage.setItem('asterion-access',accessCode);}catch{}return;}if(e.target.id==='crew-message'){crewDrafts[tab==='data'?dataContact:selectedCrew]=e.target.value;return;}if(e.target.id==='message'&&tab==='comms'){radioDrafts[state.comms.active]=e.target.value;return;}if(e.target.id!=='order-quantity')return;order.quantity=Number(e.target.value);setSpeed(0);const template=document.createElement('template');template.innerHTML=tradingHTML(state,order);const preview=template.content.querySelector('#order-preview'),next=template.content.querySelector('.place-order'),button=$('.place-order');if(preview&&button){$('#order-preview').innerHTML=preview.innerHTML;button.textContent=next.textContent;button.disabled=next.disabled;button.dataset.placeOrder=next.dataset.placeOrder;}});
document.addEventListener('toggle',e=>{if(e.target.isConnected&&e.target.classList?.contains('crew-profile-details'))crewProfileOpen=e.target.open;},true);
document.addEventListener('change',e=>{if(e.target.dataset.crewAssignment){crewAssignments[e.target.dataset.crewAssignment]=e.target.value;crewProfileOpen=true;renderDetail();return;}if(e.target.id==='access-code'){accessCode=e.target.value;try{sessionStorage.setItem('asterion-access',accessCode);}catch{}}});
document.addEventListener('submit',async e=>{if(cloud.busy){e.preventDefault();return;}
 if(e.target.id!=='chat-form')return;e.preventDefault();if(busy)return;
 const text=$('#message').value.trim();if(!text)return;setSpeed(0);
 const dm=activeChannel(state);if(dm.kind!=='direct')return;const target=dm.contact,channelId=dm.id,runState=state,started=performance.now(),timestamp=Date.now(),requestId=crypto.randomUUID();
 let metadata=null,ok=false;
 append(state.comms,channelId,{author:'CSV 노마드 · 함장',content:text,role:'user',hours:state.hours});radioDrafts[channelId]='';busy=true;renderDetail();
 try{
  const response=await fetch('/api/comms',{method:'POST',headers:{'Content-Type':'application/json',...(accessCode?{'X-Game-Access-Code':accessCode}:{})},body:JSON.stringify({faction:target,messages:dm.messages.filter(m=>['user','assistant'].includes(m.role)).slice(-10).map(m=>({role:m.role,content:m.content.slice(0,2000)})),context:{missions:(state.missions?.active||[]).map(m=>({template:m.template,progress:m.progress,cargo:m.cargo})),ship:shipStats(state),location:place(state.location,state).name,honor:state.diplomacy.honor,reputation:state.diplomacy.reputation,ownedPlanets:state.diplomacy.ownedPlanets,credits:Math.floor(state.credits),fuel:state.fuel,travel:state.travel?place(state.travel.to,state).name:null,cargo:state.cargo,contract:state.contract,outpost:state.outpost,combat:state.combat?{status:state.combat.status,round:state.combat.round,enemy:state.combat.enemy,energy:state.combat.energy,heat:state.combat.heat}:null,event:state.event?{title:state.event.title,text:state.event.text,choices:eventChoices(state)}:null,market:PORTS[state.location]?Object.fromEntries(Object.keys(GOODS).map(g=>[g,unitPrice(state,state.location,g)])):null}}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();metadata=data;
  if(!response.ok)throw Error(data.error||'통신 서버에 연결할 수 없습니다.');
  if(typeof data.reply!=='string'||!data.reply.trim())throw Error('통신 응답이 비어 있습니다.');ok=true;
  if(state!==runState)return;
  append(state.comms,channelId,{author:FACTIONS.find(f=>f.id===target).person,content:data.reply,role:'assistant',hours:state.hours});
  channel=data.mode==='ai'?'AI 통신 연결':'로컬 시뮬레이션';save();
 }catch(e){
  if(state===runState){append(state.comms,channelId,{author:'통신 시스템',content:`통신 실패: ${e.name==='TimeoutError'?'응답 시간이 초과되었습니다.':e.message} 다시 전송해 주세요.`,role:'system',hours:state.hours});save();}
  toast('통신을 완료하지 못했습니다.',true);
 }finally{
  trackRequest({id:requestId,time:timestamp,duration:performance.now()-started,faction:target,mode:metadata?.mode||'unknown',model:metadata?.model||'미확인',usage:metadata?.usage,ok});
  busy=false;if(['comms','data','crew'].includes(tab))renderDetail();
 }
});
document.addEventListener('submit',async e=>{if(cloud.busy){e.preventDefault();return;}
 if(e.target.id!=='crew-chat-form')return;e.preventDefault();if(busy)return;
 const id=tab==='data'?dataContact:selectedCrew,text=$('#crew-message').value.trim(),member=aboard(state,id);if(!text||!canContactCrew(state,id))return;
 setSpeed(0);const runState=state,started=performance.now(),timestamp=Date.now(),requestId=crypto.randomUUID();let metadata=null,ok=false;
 contactCrew(state,id,text);crewDrafts[id]='';busy=true;save();renderDetail();
 try{
  const response=await fetch('/api/comms',{method:'POST',headers:{'Content-Type':'application/json',...(accessCode?{'X-Game-Access-Code':accessCode}:{})},body:JSON.stringify({crewId:id,generatedCrew:crewMember(id,state)?.generated?crewMember(id,state):undefined,messages:state.crew.records[id].messages.filter(m=>['user','assistant'].includes(m.role)).slice(-10).map(m=>({role:m.role,content:m.content.slice(0,2000)})),context:{location:place(state.location,state).name,travel:state.travel?place(state.travel.to,state).name:null,fuel:state.fuel,hull:state.hull,shield:state.shield,credits:Math.floor(state.credits),ship:shipStats(state),crew:{name:crewMember(id,state).name,aboard:!!member,assignment:member?.assignment||null,firstMeeting:state.crew.records[id].met||null,trust:state.crew.records[id].trust,owed:state.crew.payroll.owed},missions:(state.missions?.active||[]).map(m=>({template:m.template,progress:m.progress,cargo:m.cargo})),event:state.event?{title:state.event.title}:null}}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();metadata=data;if(!response.ok)throw Error(data.error||'승무원 통신에 실패했습니다.');if(typeof data.reply!=='string'||!data.reply.trim())throw Error('승무원 응답이 비어 있습니다.');ok=true;
  if(state!==runState)return;crewMessage(state,id,'assistant',data.reply);if(crewConversationOpen(id))readCrew(state,id);channel=data.mode==='ai'?'AI 통신 연결':'로컬 시뮬레이션';save();
 }catch(error){if(state===runState){crewMessage(state,id,'system',`통신 실패: ${error.name==='TimeoutError'?'응답 시간이 초과되었습니다.':error.message} 다시 전송해 주세요.`);save();}toast('승무원 통신을 완료하지 못했습니다.',true);}
 finally{trackRequest({id:requestId,time:timestamp,duration:performance.now()-started,faction:'crew:'+id,mode:metadata?.mode||'unknown',model:metadata?.model||'미확인',usage:metadata?.usage,ok});busy=false;if(['crew','data'].includes(tab))renderDetail();}
});
document.addEventListener('submit',e=>{if(e.target.id==='channel-form'){e.preventDefault();const values=Object.fromEntries(new FormData(e.target));act(()=>{addChannel(state,values);radioAddOpen=false;setSpeed(0);toast('새 통신 채널을 연결했습니다.');});}if(e.target.id==='public-form'){e.preventDefault();const text=$('#message').value;act(()=>{publicPost(state,text);radioDrafts[state.comms.active]='';});}});
document.addEventListener('scroll',e=>{if(e.target.id!=='radio-feed')return;const feed=e.target,c=activeChannel(state);if(feed.scrollHeight-feed.scrollTop-feed.clientHeight<60&&(c.messages.at(-1)?.seq||0)>c.readAt){markRead(state);$('#radio-channel-list').innerHTML=channelListHTML(state);save();}},true);
$('#save').onclick=()=>save(true);
function showHelp(){closePanel();setSpeed(0);$('#modal').innerHTML=`<div class="eyebrow">WELCOME ABOARD, CAPTAIN</div><h2>노마드에 오신 것을 환영합니다.</h2><p>목표는 함장님이 정합니다. 무역으로 자금을 모으거나, 유적을 탐사하거나, 채굴 전초기지를 운영해 보세요.</p><ul><li>지도에서 목적지 선택 → 항로 설정 및 출항</li><li>1× · 4× · 12×로 시간 진행, Ⅱ로 정지</li><li>도착하면 탐사·교역·보급을 진행하세요.</li><li>통신에서 연합 계약을 수락하면 첫 보수 650 CR을 얻을 수 있습니다.</li><li>왼쪽 메뉴를 누르면 전용 패널이 열리고 시간이 정지합니다. ESC 또는 닫기로 지도로 돌아갑니다.</li><li>진행은 이 브라우저에 자동 저장됩니다. 창을 닫으면 시간이 흐르지 않습니다.</li></ul><p class="hint">AI 키가 없으면 로컬 통신으로 플레이합니다. 이번 버전은 자유 항해·교역·탐사·기지 운영 프로토타입입니다.</p><div class="actions"><button class="primary" id="close-modal">함교로 진입 →</button></div>`;$('#modal').showModal();$('#close-modal').onclick=()=>$('#modal').close();}
$('#help').onclick=showHelp;
$('#reset').onclick=()=>{if(busy||generating||imagePending||cloud.busy){toast('통신·탐색 완료 후 새 항해를 시작하세요.',true);return;}setSpeed(0);closePanel();$('#modal').innerHTML='<h2>새로운 항해를 시작할까요?</h2><p>현재 브라우저에 저장된 자산과 항해 기록이 초기화됩니다.</p><div class="actions"><button id="cancel-reset">취소</button><button class="primary" id="confirm-reset">새 항해 시작</button></div>';$('#modal').showModal();$('#cancel-reset').onclick=()=>$('#modal').close();$('#confirm-reset').onclick=()=>{state=freshState();selected=state.location;tab='navigation';confirmPurchase=false;dataSection='home';dataContact='';selectedCrew=CREW_CANDIDATES[0].id;crewView='aboard';crewReview='';for(const key of Object.keys(crewDrafts))delete crewDrafts[key];for(const key of Object.keys(crewAssignments))delete crewAssignments[key];reviewMission='';selectedMission='';save();render();$('#modal').close();};};
let last=performance.now(),saveElapsed=0,marketDay=Math.floor(state.hours/24);setInterval(()=>{const now=performance.now(),elapsed=Math.min((now-last)/1000,1);last=now;if(!speed||busy)return;const wasTravel=!!state.travel;tick(state,elapsed*speed);if(state.event||(wasTravel&&!state.travel)){setSpeed(0);save();if(!state.event){selected=state.location;confirmPurchase=false;openPanel('navigation');toast(`${place(state.location,state).name} 도착. 시간이 정지되었습니다.`);}else{openPanel(state.combat?.status==='active'?'combat':'navigation');toast(`${state.event.title} · 대응을 선택하세요.`);}render();}else{renderNews();renderStats();renderMap();renderTime();if(tab==='assets'||(tab==='market'&&marketDay!==Math.floor(state.hours/24)))renderDetail();marketDay=Math.floor(state.hours/24);refreshRadio();renderShip();}saveElapsed+=elapsed;if(saveElapsed>3){save();saveElapsed=0;}},500);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelCombatEffects();setSpeed(0);save();}});window.addEventListener('pagehide',()=>save());
render();fetch('/api/comms').then(r=>r.json()).then(d=>{serverInfo=d;channel=d.configured?'AI 통신 준비됨':'로컬 시뮬레이션';if(['comms','data','crew'].includes(tab))renderDetail();}).catch(()=>{channel='통신 서버 미연결';});
try{if(!localStorage.getItem('asterion-intro')){toast('목적지 또는 왼쪽 메뉴를 선택하세요. ? 버튼에서 함장 안내를 볼 수 있습니다.');localStorage.setItem('asterion-intro','1');}}catch{}

async function exploreSector(coord,resume=false){
 if(generating)return;let job;try{job=resume?state.galaxy.job:beginExploration(state,coord);if(!job||job.status!=='pending')throw Error('재개할 탐색이 없습니다.');}catch(e){toast(e.message,true);return;}
 const runState=state;generating=true;setSpeed(0);save();openPanel('galaxy');const requestId=crypto.randomUUID(),time=Date.now(),started=performance.now();let metadata=null,ok=false;
 try{const response=await fetch('/api/explore',{method:'POST',headers:{'Content-Type':'application/json',...(accessCode?{'X-Game-Access-Code':accessCode}:{})},body:JSON.stringify({coord:job.coord,seed:job.seed,rules:job.rules}),signal:AbortSignal.timeout(55000)});const data=await response.json();metadata=data;if(!response.ok)throw Error(data.error||'AI 탐색 실패');if(state!==runState)return;const priorGalaxy=structuredClone(state.galaxy);completeExploration(state,job.id,data.system);if(!save()){state.galaxy=priorGalaxy;for(const c of data.system.people)delete state.crew.records[c.id];throw Error('저장 공간이 부족해 새 발견을 보존하지 못했습니다. 기존 세계는 유지했습니다.');}ok=true;toast(data.system.name+' 항성계 발견 완료');}catch(e){if(state===runState){failExploration(state,job.id,e.message);save();}toast(e.message,true);}finally{generating=false;trackRequest({id:requestId,time,duration:performance.now()-started,faction:'exploration',mode:metadata?.mode||'unknown',model:metadata?.model||'미확인',usage:metadata?.usage,ok});if(state===runState)render();}
}
document.addEventListener('submit',e=>{if(e.target.id!=='generation-rules-form')return;e.preventDefault();const values=Object.fromEntries(new FormData(e.target));for(const key of Object.keys(values))if(key!=='tone')values[key]=Number(values[key]);act(()=>{updateRules(state,values);generationPreview=false;toast('새 생성 규칙을 저장했습니다. 다음 탐색부터 적용됩니다.');});});

function openImages(id){imageTarget=id;imageError='';dataSection='images';openPanel('data');}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-image-target],[data-image-apply],[data-image-delete],[data-image-restore]');if(!b)return;
 try{if(b.dataset.imageTarget){openImages(b.dataset.imageTarget);return;}
 if(b.dataset.imageApply)await selectImage(state,imageTarget,b.dataset.imageApply);
 if(b.dataset.imageDelete)await removeImage(state,imageTarget,b.dataset.imageDelete);
 if(b.dataset.imageRestore)await selectImage(state,b.dataset.imageRestore,null);
 renderDetail();
 }catch(err){toast(err.message,true);}
});
document.addEventListener('keydown',e=>{const el=e.target.closest('[data-portrait-id]');if(el&&['Enter',' '].includes(e.key)){e.preventDefault();openImages('person:'+el.dataset.portraitId);}});
document.addEventListener('change',e=>{if(e.target.id==='image-provider'){imageProvider=e.target.value;try{sessionStorage.setItem('asterion-image-provider',imageProvider);}catch{}imageError='';renderDetail();return;}if(e.target.id==='image-target'){imageTarget=e.target.value;imageError='';renderDetail();}if(e.target.id==='image-quality')imageQuality=e.target.value;});
document.addEventListener('submit',async e=>{if(cloud.busy){e.preventDefault();return;}
 if(e.target.id!=='image-generate-form')return;e.preventDefault();if(imagePending)return;
 const target=imageTargets(state).find(t=>t.id===imageTarget);if(!target)return;
 save();const originState=state,id=target.id,prompt=$('#image-prompt').value.trim(),quality=$('#image-quality').value,provider=imageProvider,negativePrompt=$('#image-negative')?.value,seedInput=$('#image-seed')?.value;
 if(!prompt||prompt.length>3500)return;imageDrafts[provider+':'+id]=prompt;persistPrompts();imageQuality=quality;imagePending=true;imageError='';setSpeed(0);renderDetail();
 const started=Date.now(),requestId=crypto.randomUUID();let result={},ok=false;
 try{
  const response=await fetch('/api/images',{method:'POST',headers:{'Content-Type':'application/json','x-game-access-code':accessCode},body:JSON.stringify({kind:target.kind,prompt,quality,provider,...(provider==='novelai'?{negativePrompt,seed:seedInput?Number(seedInput):undefined}:{})}),signal:AbortSignal.timeout(115000)});
  result=await response.json();if(!response.ok)throw Error(result.error||'이미지 생성 실패');
  ok=true;
  try{await addImage(originState,id,result.image,prompt,result.model,{provider,seed:result.seed,negativePrompt});}catch(err){throw Error(err.message+' 생성 비용은 발생했습니다.');}
  toast('이미지를 보관했습니다. 미리보기에서 적용할 이미지를 선택하세요.');
 }catch(err){imageError=err.name==='TimeoutError'?'응답 시간이 초과되었습니다. 자동 재요청하지 않습니다. API 비용이 발생했을 수 있습니다.':err.message||'이미지 생성에 실패했습니다.';toast(imageError,true);}
 finally{trackRequest({id:requestId,time:started,duration:Date.now()-started,mode:result.mode||'unknown',model:result.model||'image-generation',faction:'image:'+target.kind,ok,usage:result.usage});imagePending=false;renderDetail();}
});
imagesReady=loadImages();imagesReady.then(()=>renderDetail()).catch(err=>toast(err.message,true));

document.addEventListener('click',async e=>{if(!e.target.closest('[data-image-copy]'))return;try{await navigator.clipboard.writeText($('#image-prompt').value);toast('프롬프트를 복사했습니다.');}catch{toast('복사하지 못했습니다. 프롬프트를 직접 선택해 복사하세요.',true);}});

fetch('/api/images').then(r=>r.json()).then(data=>{imageProviders=data.providers||{};if(tab==='data'&&dataSection==='images')renderDetail();}).catch(()=>{imageProviders={};});

document.addEventListener('click',e=>{if(!e.target.closest('[data-image-default]')||imagePending)return;delete imageDrafts[imageProvider+':'+imageTarget];imageError='';persistPrompts();renderDetail();toast('기본 긍정 프롬프트를 불러왔습니다.');});

document.addEventListener('click',e=>{if(!e.target.closest('[data-female-crew-test]')||imagePending)return;imageProvider='novelai';imageTarget='person:test-navigator';delete imageDrafts['novelai:'+imageTarget];delete imageNegative[imageTarget];try{sessionStorage.setItem('asterion-image-provider','novelai');}catch{}imageError='';persistPrompts();renderDetail();toast('여자 선원 테스트 기본값을 불러왔습니다.');});

function renderCloud(){if(tab==='data'&&dataSection==='cloud')renderDetail();}
async function cloudStatus(){try{const data=await archiveRequest('','status');cloud.configured=!!data.configured;cloud.checked=true;}catch{cloud.checked=true;cloud.configured=false;}renderCloud();}
const cloudProgress=text=>{cloud.progress=text;renderCloud();};
async function currentArchive(){await imagesReady;if(!save())throw Error('현재 브라우저 저장을 먼저 확인하세요.');return saveArchive(accessCode,structuredClone(state),exportWorldImages(state),promptSettings(),cloudProgress);}
document.addEventListener('input',e=>{if(e.target.id==='cloud-code'){accessCode=e.target.value;try{sessionStorage.setItem('asterion-access',accessCode);}catch{}}});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-cloud-save],[data-cloud-list],[data-cloud-status],[data-cloud-review],[data-cloud-restore],[data-cloud-cancel]');if(!b||cloud.busy)return;
 if(b.hasAttribute('data-cloud-status')){await cloudStatus();return;}
 if(b.hasAttribute('data-cloud-cancel')){cloud.review='';renderCloud();return;}
 if(b.dataset.cloudReview){cloud.review=b.dataset.cloudReview;renderCloud();return;}
 if(b.hasAttribute('data-cloud-save')||b.dataset.cloudRestore){if(imagePending||generating||busy){toast('이미지 생성·탐색·통신이 끝난 뒤 저장·복원하세요.',true);return;}}
 cloud.busy=true;cloud.error='';setSpeed(0);renderCloud();
 try{
  if(b.hasAttribute('data-cloud-save')){await currentArchive();toast('게임·이미지·프롬프트를 클라우드에 보관했습니다.');}
  if(b.dataset.cloudRestore){
   cloudProgress('선택한 저장본 검증 중…');const loaded=await readArchive(accessCode,b.dataset.cloudRestore,cloudProgress);
   cloudProgress('현재 기록을 먼저 백업합니다…');await currentArchive();
   const next=migrateState(loaded.state),previousJSON=localStorage.getItem(KEY),priorImages=exportWorldImages(next);
   try{await replaceWorldImages(next,loaded.records);localStorage.setItem(KEY,JSON.stringify(next));}
   catch(error){await replaceWorldImages(next,priorImages);if(previousJSON!==null)localStorage.setItem(KEY,previousJSON);throw error;}
   state=next;selected=state.location;selectedCrew=state.crew.roster[0]?.id||'';dataContact='';imageTarget='person:test-navigator';newsSignature='';
   for(const [target,source]of [[imageDrafts,loaded.settings.drafts],[imageNegative,loaded.settings.negative],[imageSeeds,loaded.settings.seeds]]){for(const k of Object.keys(target))delete target[k];Object.assign(target,source);}
   imageProvider=loaded.settings.provider;setPositiveBase(loaded.settings.positiveBase);persistPrompts();cloud.review='';toast('저장본의 게임·이미지·프롬프트를 복원했습니다.');render();
  }
  const result=await archiveRequest(accessCode,'list');cloud.archives=result.archives||[];
 }catch(error){cloud.error=error.message||'클라우드 작업 실패';toast(cloud.error,true);}
 finally{cloud.busy=false;cloud.progress='';renderCloud();}
});
cloudStatus();

document.addEventListener('click',e=>{if(cloud.busy&&e.target.closest('button,[data-place],[data-portrait-id]')&&!e.target.closest('.cloud-archive')){e.preventDefault();e.stopImmediatePropagation();toast('클라우드 작업을 마칠 때까지 기다려 주세요.',true);}},true);
document.addEventListener('submit',e=>{if(cloud.busy){e.preventDefault();e.stopImmediatePropagation();}},true);
