import {CREW_CANDIDATES} from './crew-data.js';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function normalizeUsage(raw){
 if(!raw||!integer(raw.input_tokens)||!integer(raw.output_tokens))return null;
 const input=raw.input_tokens,output=raw.output_tokens,cached=raw.input_tokens_details?.cached_tokens??0,reasoning=raw.output_tokens_details?.reasoning_tokens??0,total=raw.total_tokens??input+output;
 const usage={input,output,cached,reasoning,total};return validUsage(usage)?usage:null;
}
export function validUsage(u){return !!u&&['input','output','cached','reasoning','total'].every(k=>integer(u[k]))&&u.cached<=u.input&&u.reasoning<=u.output&&u.total===u.input+u.output;}
const emptyTotals=()=>({requests:0,ai:0,local:0,failed:0,known:0,unknown:0,input:0,output:0,cached:0,reasoning:0,total:0,latency:0});
export const usageDay=timestamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
export function freshUsage(now=Date.now()){return {version:1,since:now,totals:emptyTotals(),days:[],models:[],history:[]};}
function validTotals(t){return !!t&&Object.keys(emptyTotals()).every(k=>integer(t[k]));}
export function validUsageStore(s){return s?.version===1&&integer(s.since)&&validTotals(s.totals)&&Array.isArray(s.days)&&s.days.length<=90&&s.days.every(d=>typeof d.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.day)&&validTotals(d.totals)&&Array.isArray(d.models)&&d.models.length<=50&&d.models.every(m=>typeof m.model==='string'&&m.model.length<=100&&validTotals(m.totals)))&&Array.isArray(s.models)&&s.models.length<=50&&s.models.every(m=>typeof m.model==='string'&&m.model.length<=100&&validTotals(m.totals))&&Array.isArray(s.history)&&s.history.length<=100&&s.history.every(r=>r&&typeof r.id==='string'&&integer(r.time)&&integer(r.duration)&&['ai','local','unknown'].includes(r.mode)&&typeof r.ok==='boolean'&&typeof r.model==='string'&&typeof r.faction==='string'&&(!r.usage||validUsage(r.usage)));}
function add(t,r){t.requests++;t.latency+=r.duration;if(!r.ok)t.failed++;if(r.mode==='local')t.local++;else if(r.mode==='ai')t.ai++;if(r.usage){t.known++;for(const k of ['input','output','cached','reasoning','total'])t[k]+=r.usage[k];}else if(r.mode!=='local')t.unknown++;}
export function recordUsage(s,record){
 if(s.history.some(r=>r.id===record.id))return false;
 const r={id:String(record.id),time:Math.max(0,Math.floor(record.time)),duration:Math.max(0,Math.round(record.duration)||0),mode:['ai','local'].includes(record.mode)?record.mode:'unknown',ok:!!record.ok,model:String(record.model||'미확인').slice(0,100),faction:String(record.faction||'unknown').slice(0,40),usage:validUsage(record.usage)?{...record.usage}:null};
 const day=usageDay(r.time);let d=s.days.find(d=>d.day===day);if(!d){d={day,totals:emptyTotals(),models:[]};s.days.push(d);s.days.sort((a,b)=>b.day.localeCompare(a.day));s.days=s.days.slice(0,90);}
 const bucket=list=>{let m=list.find(m=>m.model===r.model);if(!m){const model=list.length>=49?'기타 모델':r.model;m=list.find(m=>m.model===model);if(!m){m={model,totals:emptyTotals()};list.push(m);}}return m.totals;};
 add(s.totals,r);add(d.totals,r);add(bucket(s.models),r);add(bucket(d.models),r);s.history.unshift(r);s.history=s.history.slice(0,100);return true;
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR');
export function usageHTML(s,scope='today',server={},now=Date.now()){
 const day=usageDay(now),t=scope==='today'?(s.days.find(d=>d.day===day)?.totals||emptyTotals()):s.totals;
 const history=s.history.filter(r=>scope!=='today'||usageDay(r.time)===day),factions={union:'항성 연합',helios:'헬리오스',free:'자유 항해 연맹',...Object.fromEntries(CREW_CANDIDATES.map(c=>['crew:'+c.id,'승무원 '+c.name]))};
 const models=scope==='today'?(s.days.find(d=>d.day===day)?.models||[]):s.models;
 return `<div class="usage-panel"><div class="usage-heading"><div><span class="tag">${server.configured?'AI 연결 준비됨':'AI 연결 대기 / 로컬 사용 가능'}</span><p class="hint">서버 설정 모델 · ${esc(server.model||'확인 중')}</p></div><div class="usage-scope"><button data-usage-scope="today" class="${scope==='today'?'active':''}" aria-pressed="${scope==='today'}">오늘</button><button data-usage-scope="all" class="${scope==='all'?'active':''}" aria-pressed="${scope==='all'}">누적</button></div></div>
 <div class="usage-cards"><div><small>총 요청</small><strong>${fmt(t.requests)} <em>회</em></strong><span>AI ${fmt(t.ai)} · 로컬 ${fmt(t.local)}</span></div><div><small>확인된 토큰</small><strong>${fmt(t.total)}</strong><span>사용량 확인 ${fmt(t.known)}회</span></div><div><small>실패한 요청</small><strong class="${t.failed?'loss':''}">${fmt(t.failed)} <em>회</em></strong><span>토큰 미확인 ${fmt(t.unknown)}회</span></div><div><small>평균 응답 시간</small><strong>${t.requests?(t.latency/t.requests/1000).toFixed(2):'—'} <em>초</em></strong><span>실패·로컬 요청 포함</span></div></div>
 <div class="usage-breakdown"><div><span>입력 토큰</span><strong>${fmt(t.input)}</strong></div><div><span>출력 토큰</span><strong>${fmt(t.output)}</strong></div><div><span>입력 중 캐시</span><strong>${fmt(t.cached)}</strong></div><div><span>출력 중 추론</span><strong>${fmt(t.reasoning)}</strong></div></div><p class="hint">캐시는 입력에, 추론은 출력에 포함되어 있습니다. 합계에 중복해서 더하지 않습니다.</p>
 <div class="usage-note">이 브라우저에서 업데이트 이후 보낸 게임 통신만 기록합니다. 다른 기기·앱의 사용량, 이미지 생성, API 잔액과 실제 청구액은 포함하지 않습니다. 실패·시간 초과로 토큰 수를 받지 못한 요청은 과금 여부를 확인할 수 없습니다. 게임을 새로 시작해도 이 기록은 유지됩니다.</div>
 <h3 class="subhead">모델별 사용량${scope==='today'?' · 오늘':' · 누적'}</h3><div class="table-scroll"><table class="trade-table"><thead><tr><th>모델</th><th>요청</th><th>토큰</th><th>실패</th></tr></thead><tbody>${models.length?models.map(m=>`<tr><td>${esc(m.model)}</td><td>${fmt(m.totals.requests)}</td><td>${fmt(m.totals.total)}</td><td>${fmt(m.totals.failed)}</td></tr>`).join(''):'<tr><td colspan="4">아직 기록된 요청이 없습니다.</td></tr>'}</tbody></table></div>
 <h3 class="subhead">최근 통신 기록 · 최대 100건</h3><div class="usage-history">${history.length?history.map(r=>`<div class="usage-record"><div><strong>${esc(factions[r.faction]||'통신')} · ${esc(r.model)}</strong><small>${esc(new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(r.time)))} KST · ${(r.duration/1000).toFixed(2)}초</small></div><div><span class="${r.ok?'gain':'loss'}">${r.ok?(r.mode==='local'?'로컬 응답':'응답 완료'):'요청 실패'}</span><small>${r.usage?fmt(r.usage.total)+' tokens':r.mode==='local'?'API 토큰 없음':'토큰 미확인'}</small></div></div>`).join(''):'<div class="empty">세력 통신에서 메시지를 보내면<br>요청과 토큰 사용량이 여기에 기록됩니다.</div>'}</div>
 <div class="usage-footer"><span class="hint">집계 기준: 한국 시간(KST) · 기록 시작 ${esc(usageDay(s.since))}</span><a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer">OpenAI 사용량 대시보드 ↗</a></div></div>`;
}
