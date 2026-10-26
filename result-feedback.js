import {outcomeSnapshot,outcomeChanges} from './outcome-data.js';
import {place} from './world-data.js';
import {showFeedbackDialog} from './mission-feedback.js';
const fmt=n=>Number(Number(n).toFixed(2));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions={
 gravity:{stabilize:'추진기를 사용해 선체 자세를 유지하며 불안정한 중력 구역을 벗어났습니다.',detour:'안정된 항로를 선택해 중력 이상을 우회했습니다.',ignore:'중력 변화가 약해질 때까지 대기했습니다.'},
 micrometeor:{evade:'추력을 집중해 미소 운석의 진행 경로를 피했습니다.',push:'실드로 충격을 받아냈습니다. 실제 실드 소모와 선체 피해를 확인하세요.',ignore:'밀집 구역을 돌아가는 안전 항로를 선택했습니다.'},
 tanker:{refuel:'민간 급유선과 정산하고 탱크 잔여 용량만큼 연료를 보급했습니다.',ignore:'급유 제안을 거절했습니다.'},
 repair:{repair:'기술 부품을 제공해 손상된 선체를 수리했습니다.',share:'정비팀에 진단 기록을 제공하고 협력 보상을 받았습니다.',ignore:'순회 정비선과의 접촉을 종료했습니다.'},
 convoy:{supply:'이주 선단에 식량을 나누고 자유 항해 연맹과의 신뢰를 쌓았습니다.',guide:'선단에 항로 자료를 전달했습니다.',ignore:'보급과 정보 지원 없이 선단과 작별했습니다.'},
 probe:{recover:'접근 추진에 연료를 소비하고 프로브의 기술 부품을 회수했습니다.',download:'원격으로 프로브의 마지막 관측 자료를 복사했습니다.',ignore:'프로브에 접근하지 않고 이동을 계속합니다.'},
 wreck:{salvage:'불안정한 폐선에서 장비를 인양했습니다. 회수품과 실제 충돌 피해를 아래에 정리했습니다.',scan:'폐선에 접근하지 않고 구조 분석 자료를 수집했습니다.',ignore:'폐선에서 안전하게 이탈했습니다.'},
 comet:{observe:'연료를 사용해 관측 위치를 확보하고 혜성 연구 자료를 수집했습니다.',record:'안전 거리에서 혜성의 궤도를 기록했습니다.',ignore:'별도 관측 없이 기존 항로를 유지합니다.'},
 rescue:{help:'지원 물자를 조난선에 전달하고 구조를 도왔습니다.',relay:'직접 접근하는 대신 구조대에 조난 좌표를 전달했습니다.',ignore:'현재 임무를 우선해 조난 신호에서 이탈했습니다.'},
 'crew-rescue':{rescue:'조난자의 안전한 이송을 위해 구조대 접근 항로를 확보했습니다.',ignore:'조난선에 접근하지 않고 현재 항로를 유지했습니다.'},
 ion:{detour:'폭풍 구역을 우회했습니다. 연료와 시간이 더 들었지만 직접 돌파를 피했습니다.',push:'실드에 동력을 집중해 폭풍을 돌파했습니다. 실제 소모와 선체 손상 여부를 아래에서 확인하세요.',ignore:'폭풍이 약해질 때까지 대기했습니다. 자원 소모 대신 도착이 지연됩니다.'},
 debris:{detour:'잔해 구역을 피해 우회 항로로 이동했습니다.',push:'실드를 전개해 잔해 사이를 통과했습니다. 충돌로 인한 실제 피해를 아래에 정리했습니다.',ignore:'안전한 항로를 다시 계산했습니다. 자원 손실 없이 항해 시간이 늘어납니다.'},
 trader:{buy:'이동 상인의 광물을 인수하고 거래 대금을 정산했습니다.',ignore:'상인의 제안을 거절하고 항해를 계속할 준비를 마쳤습니다.'},
 patrol:{papers:'허가증과 화물 명세를 제출해 검문을 통과했습니다.',data:'탐사 자료를 순찰대와 공유하고 협력 보상을 받았습니다.',ignore:'기본 신원 확인 절차를 마쳤습니다.'},
 cache:{recover:'컨테이너에 접근해 사용할 수 있는 부품을 회수했습니다.',scan:'컨테이너에 접근하지 않고 외부 스캔 자료를 판매했습니다.',ignore:'발견 좌표만 기록하고 컨테이너에서 이탈했습니다.'},
 relic:{analyze:'신호 정밀 분석을 시도했습니다. 해독 판정과 그에 따른 실제 보상 또는 피해입니다.',scan:'안전 거리를 유지하며 관측 자료를 수집했습니다.',ignore:'신호와의 접촉을 중단하고 안전 거리로 이탈했습니다.'}
};
export function eventResult(s,event,action,label,before,message){
 const after=outcomeSnapshot(s),id=event.id==='signal'?'rescue':event.id,damaged=after.hull<before.hull;
 return {kind:'event',heading:id==='relic'&&action==='analyze'?(damaged?'신호 해독 실패':'신호 해독 성공'):damaged?'사건 종료 · 손상 발생':'사건 처리 완료',title:event.title,choice:label,message,explanation:descriptions[id]?.[action]||'선택한 대응의 처리가 완료되었습니다.',changes:outcomeChanges(before,after),after,locationName:place(s.location,s)?.name||s.location,scope:'선택 전후의 실제 변화',tone:damaged?'warning':'success',next:s.travel?'항해는 정지 상태입니다. 결과를 확인한 뒤 배속 버튼으로 재개하세요.':'현재 구역에서 다음 행동을 선택할 수 있습니다.'};
}
const endings={victory:['전투 승리','적 함선을 격퇴했습니다. 현상금과 회수품 정산을 마쳤습니다.','success'],escaped:['철수 성공','적의 추격을 벗어나 기존 항로를 유지했습니다.','neutral'],surrendered:['항복 후 이탈','자금과 화물을 넘기고 교전을 끝냈습니다.','warning'],defeated:['전투 패배 · 구조 완료','교전 불능 상태에서 구조선에 예인되어 헤이븐으로 귀환했습니다. 선체 수치는 응급 복구 이후 상태입니다.','warning'],paid:['교전 회피 · 통행료 정산','통행료를 지불해 무장 함선과의 전투를 피했습니다.','neutral']};
export function combatResult(s,fallback){
 const c=s.combat,ending=endings[c?.status];if(!ending)return null;
 const before=c.reportStart||fallback,after=outcomeSnapshot(s),mission=s.missions?.active.find(m=>m.id===c.missionId);
 return {kind:'combat',heading:ending[0],title:c.enemy.name,choice:'교전 '+c.round+'턴',message:c.summary,explanation:ending[1],changes:outcomeChanges(before,after),after,locationName:place(s.location,s)?.name||s.location,scope:c.reportStart?'교전 시작 대비 누적 순변화':'마지막 명령 전후의 변화 · 이전 교전 기록은 집계에서 제외',tone:ending[2],next:mission?.progress?'지정 표적 격퇴를 확인했습니다. 발주처에 귀환 보고해야 임무 보수를 받을 수 있습니다.':c.status==='defeated'?'헤이븐에서 수리와 보급을 확인한 뒤 다시 출항하세요.':s.travel?'항해는 정지 상태입니다. 결과 확인 후 배속 버튼으로 재개하세요.':'현재 구역에서 다음 행동을 선택할 수 있습니다.'};
}
export function resultFeedbackHTML(d){return `<article class="mission-receipt outcome-receipt outcome-${esc(d.tone)}"><button type="button" class="mission-receipt-close" data-feedback-close aria-label="결과 알림 닫기">✕</button><div class="mission-receipt-signal">${d.kind==='combat'?'TACTICAL DEBRIEF':'INCIDENT REPORT'}</div><div class="mission-receipt-stamp" aria-hidden="true">${d.tone==='warning'?'!':d.tone==='neutral'?'◇':'✓'}</div><h2 id="result-feedback-title">${esc(d.heading)}</h2><h3>${esc(d.title)}</h3><p class="outcome-choice">${esc(d.choice)}</p><p class="mission-receipt-message">${esc(d.explanation)}</p><p class="outcome-summary">${esc(d.message)}</p><section class="mission-receipt-rewards outcome-changes" aria-label="실제 결과 변화"><small>${esc(d.scope)}</small>${d.changes.length?d.changes.map(c=>`<div><span>${esc(c.label)}</span><b class="${c.beneficial?'gain':'loss'}">${c.delta>0?'+':''}${c.delta}${esc(c.unit)}</b></div>`).join(''):'<p>자원·함선 상태 변화 없음</p>'}</section><div class="outcome-condition"><span>선체 <strong>${fmt(d.after.hull)}</strong></span><span>실드 <strong>${fmt(d.after.shield)}</strong></span><span>연료 <strong>${fmt(d.after.fuel)}</strong></span><span>현재 구역 <strong>${esc(d.locationName||d.after.location)}</strong></span></div><p class="mission-receipt-next">${esc(d.next)}</p><button type="button" class="primary mission-receipt-confirm" data-feedback-close autofocus>결과 확인 · 계속</button></article>`;}
export function showResultFeedback(dialog,data){if(data)showFeedbackDialog(dialog,resultFeedbackHTML(data));}
