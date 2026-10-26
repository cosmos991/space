import {CREW_CANDIDATES} from './crew-data.js';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function normalizeUsage(raw){
 if(!raw||!integer(raw.input_tokens)||!integer(raw.output_tokens))return null;
 const input=raw.input_tokens,output=raw.output_tokens,cached=raw.input_tokens_details?.cached_tokens??0,reasoning=raw.output_tokens_details?.reasoning_tokens??0,total=raw.total_tokens??input+output;
 const usage={input,output,cached,reasoning,total};
 if(raw.input_tokens_details?.text_tokens!==undefined&&raw.input_tokens_details?.image_tokens!==undefined){const text=raw.input_tokens_details.text_tokens,image=raw.input_tokens_details.image_tokens;if(integer(text)&&integer(image)&&text+image===input){usage.modalities={text,image};}}
 return validUsage(usage)?usage:null;
}
export function validUsage(u){return !!u&&['input','output','cached','reasoning','total'].every(k=>integer(u[k]))&&u.cached<=u.input&&u.reasoning<=u.output&&u.total===u.input+u.output&&(!u.modalities||(integer(u.modalities.text)&&integer(u.modalities.image)&&u.modalities.text+u.modalities.image===u.input));}
// Standard USD / 1M tokens. Official pricing checked 2026-10-26.
export const PRICING_DATE='2026-10-26';
const TEXT_PRICES={'gpt-4.1-mini':[.4,.1,1.6],'gpt-4.1-mini-2025-04-14':[.4,.1,1.6],'gpt-6-astra':[10,1,50],'gpt-6.1-sol':[2,.1,10],'gpt-6-luna':[.1,.01,.5]};
export function estimateNanoUsd(model,u,mode='ai'){
 if(mode==='local')return 0;
 if(!u||!validUsage(u))return null;
 if(u.total===0)return 0;
 const rates=Object.hasOwn(TEXT_PRICES,model)?TEXT_PRICES[model]:null;
 if(rates)return Math.round(((u.input-u.cached)*rates[0]+u.cached*rates[1]+u.output*rates[2])*1000);
 // Current generation requests contain text input only; never assume a mixed cache breakdown.
 if(model==='gpt-image-1-mini'&&u.modalities&&u.modalities.image===0)return Math.round(((u.input-u.cached)*2+u.cached*.2+u.output*8)*1000);
 return null;
}
const emptyCost=()=>({nanoUsd:0,priced:0,unpriced:0});
const validCost=c=>!!c&&['nanoUsd','priced','unpriced'].every(k=>integer(c[k]));
function legacyCost(model,t){
 const c=emptyCost(),local=t.local,remaining=t.requests-local;
 const value=estimateNanoUsd(model,{input:t.input,output:t.output,cached:t.cached,reasoning:t.reasoning,total:t.total});
 c.priced=local+(value===null?0:t.known);c.unpriced=remaining-(value===null?0:t.known);c.nanoUsd=value??0;return c;
}
function sumCosts(list){return list.reduce((c,m)=>{for(const k of Object.keys(c))c[k]+=m.totals.cost[k];return c;},emptyCost());}
export function migrateUsageCosts(s){
 for(const m of s.models)if(!m.totals.cost)m.totals.cost=legacyCost(m.model,m.totals);
 if(!s.totals.cost)s.totals.cost=sumCosts(s.models);
 for(const d of s.days){for(const m of d.models)if(!m.totals.cost)m.totals.cost=legacyCost(m.model,m.totals);if(!d.totals.cost)d.totals.cost=sumCosts(d.models);}
 return s;
}
export const costLabel=c=>c?.priced?'$'+(c.nanoUsd/1e9).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:6}):c?.unpriced?'산정 불가':'$0.0000';
const emptyTotals=()=>({requests:0,ai:0,local:0,failed:0,known:0,unknown:0,input:0,output:0,cached:0,reasoning:0,total:0,latency:0});
export const usageDay=timestamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
export function freshUsage(now=Date.now()){return {version:1,since:now,totals:emptyTotals(),days:[],models:[],history:[]};}
function validTotals(t){return !!t&&Object.keys(emptyTotals()).every(k=>integer(t[k]))&&(!t.cost||validCost(t.cost));}
export function validUsageStore(s){return s?.version===1&&integer(s.since)&&validTotals(s.totals)&&Array.isArray(s.days)&&s.days.length<=90&&s.days.every(d=>typeof d.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.day)&&validTotals(d.totals)&&Array.isArray(d.models)&&d.models.length<=50&&d.models.every(m=>typeof m.model==='string'&&m.model.length<=100&&validTotals(m.totals)))&&Array.isArray(s.models)&&s.models.length<=50&&s.models.every(m=>typeof m.model==='string'&&m.model.length<=100&&validTotals(m.totals))&&Array.isArray(s.history)&&s.history.length<=100&&s.history.every(r=>r&&typeof r.id==='string'&&integer(r.time)&&integer(r.duration)&&['ai','local','unknown'].includes(r.mode)&&typeof r.ok==='boolean'&&typeof r.model==='string'&&typeof r.faction==='string'&&(!r.usage||validUsage(r.usage)));}
function add(t,r){if(!t.cost)t.cost=emptyCost();const cost=estimateNanoUsd(r.model,r.usage,r.mode);if(cost===null)t.cost.unpriced++;else{t.cost.priced++;t.cost.nanoUsd+=cost;}t.requests++;t.latency+=r.duration;if(!r.ok)t.failed++;if(r.mode==='local')t.local++;else if(r.mode==='ai')t.ai++;if(r.usage){t.known++;for(const k of ['input','output','cached','reasoning','total'])t[k]+=r.usage[k];}else if(r.mode!=='local')t.unknown++;}
export function recordUsage(s,record){
 if(s.history.some(r=>r.id===record.id))return false;
 migrateUsageCosts(s);
 const r={id:String(record.id),time:Math.max(0,Math.floor(record.time)),duration:Math.max(0,Math.round(record.duration)||0),mode:['ai','local'].includes(record.mode)?record.mode:'unknown',ok:!!record.ok,model:String(record.model||'미확인').slice(0,100),faction:String(record.faction||'unknown').slice(0,40),usage:validUsage(record.usage)?{input:record.usage.input,output:record.usage.output,cached:record.usage.cached,reasoning:record.usage.reasoning,total:record.usage.total,...(record.usage.modalities?{modalities:{text:record.usage.modalities.text,image:record.usage.modalities.image}}:{})}:null};
 const day=usageDay(r.time);let d=s.days.find(d=>d.day===day);if(!d){d={day,totals:emptyTotals(),models:[]};s.days.push(d);s.days.sort((a,b)=>b.day.localeCompare(a.day));s.days=s.days.slice(0,90);}
 const bucket=list=>{let m=list.find(m=>m.model===r.model);if(!m){const model=list.length>=49?'기타 모델':r.model;m=list.find(m=>m.model===model);if(!m){m={model,totals:emptyTotals()};list.push(m);}}return m.totals;};
 add(s.totals,r);add(d.totals,r);add(bucket(s.models),r);add(bucket(d.models),r);s.history.unshift(r);s.history=s.history.slice(0,100);return true;
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR');
export function usageHTML(s,scope='today',server={},now=Date.now()){
 s=migrateUsageCosts(structuredClone(s));
 const day=usageDay(now),t=scope==='today'?(s.days.find(d=>d.day===day)?.totals||emptyTotals()):s.totals;
 const history=s.history.filter(r=>scope!=='today'||usageDay(r.time)===day),factions={union:'항성 연합',helios:'헬리오스',free:'자유 항해 연맹',...Object.fromEntries(CREW_CANDIDATES.map(c=>['crew:'+c.id,'승무원 '+c.name]))};
 const models=scope==='today'?(s.days.find(d=>d.day===day)?.models||[]):s.models;
 return `<div class="usage-panel"><div class="usage-heading"><div><span class="tag">${server.configured?'AI 연결 준비됨':'AI 연결 대기 / 로컬 사용 가능'}</span><p class="hint">서버 기본 모델 · ${esc(server.model||'확인 중')} · 채널별 선택 모델은 아래 통신 기록에 표시됩니다.</p></div><div class="usage-scope"><button data-usage-scope="today" class="${scope==='today'?'active':''}" aria-pressed="${scope==='today'}">오늘</button><button data-usage-scope="all" class="${scope==='all'?'active':''}" aria-pressed="${scope==='all'}">누적</button></div></div>
 <div class="usage-cards"><div><small>총 요청</small><strong>${fmt(t.requests)} <em>회</em></strong><span>AI ${fmt(t.ai)} · 로컬 ${fmt(t.local)}</span></div><div><small>확인된 토큰</small><strong>${fmt(t.total)}</strong><span>사용량 확인 ${fmt(t.known)}회</span></div><div><small>실패한 요청</small><strong class="${t.failed?'loss':''}">${fmt(t.failed)} <em>회</em></strong><span>토큰 미확인 ${fmt(t.unknown)}회</span></div><div><small>평균 응답 시간</small><strong>${t.requests?(t.latency/t.requests/1000).toFixed(2):'—'} <em>초</em></strong><span>실패·로컬 요청 포함</span></div></div>
 <div class="usage-cost"><small>예상 API 비용 · USD</small><strong>${costLabel(t.cost)}</strong><span>산정 가능 ${fmt(t.cost?.priced||0)}회 · 산정 불가 ${fmt(t.cost?.unpriced||0)}회${t.cost?.unpriced?' · 표시 금액은 확인 가능한 요청의 소계입니다.':''}</span></div>
 <div class="usage-breakdown"><div><span>입력 토큰</span><strong>${fmt(t.input)}</strong></div><div><span>출력 토큰</span><strong>${fmt(t.output)}</strong></div><div><span>입력 중 캐시</span><strong>${fmt(t.cached)}</strong></div><div><span>출력 중 추론</span><strong>${fmt(t.reasoning)}</strong></div></div><p class="hint">캐시는 입력에, 추론은 출력에 포함되어 있습니다. 합계에 중복해서 더하지 않습니다.</p>
 <div class="usage-note">이 브라우저의 대화·항성계·이미지 생성 요청을 기록합니다. 예상 비용은 확인된 토큰과 공식 표준 요금 기준이며 세금·환율·할인·실제 청구액과 다를 수 있습니다. 요금표 기준 ${PRICING_DATE}. NovelAI는 Anlas 기반으로 토큰·USD를 산정하지 않습니다. 지원하지 않는 모델이나 이미지 토큰 내역이 없는 과거 요청은 산정 불가입니다. 다른 기기·앱의 사용량과 API 잔액은 포함하지 않습니다. 실패·시간 초과로 토큰 수를 받지 못한 요청은 과금 여부를 확인할 수 없습니다. 게임을 새로 시작해도 이 기록은 유지됩니다.</div>
 <h3 class="subhead">모델별 사용량${scope==='today'?' · 오늘':' · 누적'}</h3><div class="table-scroll"><table class="trade-table"><thead><tr><th>모델</th><th>요청</th><th>토큰</th><th>실패</th><th>예상 USD</th></tr></thead><tbody>${models.length?models.map(m=>`<tr><td>${esc(m.model)}</td><td>${fmt(m.totals.requests)}</td><td>${fmt(m.totals.total)}</td><td>${fmt(m.totals.failed)}</td><td>${costLabel(m.totals.cost)}${m.totals.cost.unpriced?' · 일부 미산정':''}</td></tr>`).join(''):'<tr><td colspan="5">아직 기록된 요청이 없습니다.</td></tr>'}</tbody></table></div>
 <h3 class="subhead">최근 통신 기록 · 최대 100건</h3><div class="usage-history">${history.length?history.map(r=>`<div class="usage-record"><div><strong>${esc(factions[r.faction]||({exploration:'항성계 생성','image:ship':'함선 이미지','image:planet':'행성 이미지','image:person':'인물 이미지'}[r.faction]||(r.faction.startsWith('public:')?'공개 주파수':'통신')))} · ${esc(r.model)}</strong><small>${esc(new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(r.time)))} KST · ${(r.duration/1000).toFixed(2)}초</small></div><div><span class="${r.ok?'gain':'loss'}">${r.ok?(r.mode==='local'?'로컬 응답':'응답 완료'):'요청 실패'}</span><small>${r.model.startsWith('novelai/')?'Anlas · 토큰 집계 없음':r.usage?fmt(r.usage.total)+' tokens':r.mode==='local'?'API 토큰 없음':'토큰 미확인'}</small><small>예상 ${estimateNanoUsd(r.model,r.usage,r.mode)===null?'산정 불가':costLabel({priced:1,nanoUsd:estimateNanoUsd(r.model,r.usage,r.mode)})}</small></div></div>`).join(''):'<div class="empty">세력 통신에서 메시지를 보내면<br>요청과 토큰 사용량이 여기에 기록됩니다.</div>'}</div>
 <div class="usage-footer"><span class="hint">집계 기준: 한국 시간(KST) · 기록 시작 ${esc(usageDay(s.since))}</span><a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer">OpenAI 사용량 대시보드 ↗</a><a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener noreferrer">공식 요금표 ↗</a></div></div>`;
}
