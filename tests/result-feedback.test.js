import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,depart,resolveEvent,combatOrder,validSave} from '../engine.js';
import {makeEvent,eventChoices} from '../events.js';
import {combatChoices} from '../combat.js';
import {outcomeSnapshot} from '../outcome-data.js';
import {eventResult,combatResult,resultFeedbackHTML} from '../result-feedback.js';
const encounter=(seed=1)=>{const s=freshState(seed);depart(s,'veil');makeEvent(s,'raiders');return s;};
test('every incident choice reports actual deltas and explanation without replaying effects or consuming RNG',()=>{
 for(const id of ['rescue','crew-rescue','debris','ion','trader','patrol','cache','relic']){
  const source=freshState(2);depart(source,'veil');source.survey.echo=1;makeEvent(source,id);
  for(const choice of eventChoices(source).filter(c=>!c.disabled)){
   const s=structuredClone(source),event={...s.event},before=outcomeSnapshot(s),message=resolveEvent(s,choice.id),after=structuredClone(s),data=eventResult(s,event,choice.id,choice.label,before,message),html=resultFeedbackHTML(data);
   assert.match(html,/결과 확인/);assert.ok(data.explanation.length>10);assert.equal(data.after.credits,s.credits);assert.equal(data.changes.find(c=>c.label==='크레딧')?.delta||0,s.credits-before.credits);
   if(choice.id==='detour')assert.equal(data.changes.find(c=>c.label==='남은 항해 시간').beneficial,false);
   assert.deepEqual(s,after);
  }
 }
});
test('relic analysis distinguishes real success and failure instead of showing a probability as a result',()=>{
 const seen=new Set();for(let seed=1;seed<=30;seed++){const s=freshState(seed*1234567);makeEvent(s,'relic');const e={...s.event},b=outcomeSnapshot(s),message=resolveEvent(s,'analyze'),d=eventResult(s,e,'analyze','정밀 분석',b,message);seen.add(d.heading);assert.equal(d.heading,s.hull<b.hull?'신호 해독 실패':'신호 해독 성공');}
 assert.deepEqual(seen,new Set(['신호 해독 성공','신호 해독 실패']));
});
test('combat baseline survives reload and victory reports whole-battle totals without awarding twice',()=>{
 let s=encounter();resolveEvent(s,'fight');const before=structuredClone(s.combat.reportStart);combatOrder(s,'aim');s=JSON.parse(JSON.stringify(s));assert.ok(validSave(s));
 for(let n=0;n<150&&s.combat.status==='active';n++)combatOrder(s,combatChoices(s).find(c=>c.id==='aim').disabled?'guard':'aim');
 assert.equal(s.combat.status,'victory');const saved=structuredClone(s),d=combatResult(s,outcomeSnapshot(s));
 assert.equal(d.heading,'전투 승리');assert.equal(d.changes.find(c=>c.label==='크레딧').delta,s.credits-before.credits);assert.equal(d.changes.find(c=>c.label==='선체')?.delta||0,s.hull-before.hull);assert.match(d.scope,/교전 시작/);resultFeedbackHTML(d);assert.deepEqual(s,saved);assert.ok(validSave(s));
 s.combat.reportStart.hull=-1;assert.equal(validSave(s),false);
});
test('paid encounters, surrender and defeat retain their distinct summaries and actual losses',()=>{
 for(const mode of ['pay','yield','defeat','evade']){const s=encounter(1);if(mode==='defeat'){s.hull=1;s.shield=0;}const fallback=outcomeSnapshot(s);resolveEvent(s,mode==='pay'?'pay':mode==='evade'?'evade':'fight');
  if(mode==='yield')combatOrder(s,'yield');
  if(mode==='defeat')for(let n=0;n<10&&s.combat.status==='active';n++)combatOrder(s,'aim');
  const d=combatResult(s,fallback);assert.ok(d);assert.match(d.heading,mode==='pay'?/통행료/:mode==='yield'?/항복/:mode==='evade'?/철수/:/패배/);assert.equal(d.changes.find(c=>c.label==='크레딧')?.delta||0,s.credits-fallback.credits);if(mode==='defeat'){assert.equal(d.after.hull,25);assert.match(d.explanation,/응급 복구/);}assert.ok(validSave(s));
 }
});
test('ongoing battles produce no terminal popup, old combat saves use an explicit final-turn scope and results escape text',()=>{
 const s=encounter();resolveEvent(s,'fight');assert.equal(combatResult(s,outcomeSnapshot(s)),null);delete s.combat.reportStart;const before=outcomeSnapshot(s);combatOrder(s,'yield');assert.ok(validSave(s));const d=combatResult(s,before);assert.match(d.scope,/마지막 명령/);d.title='<script>';d.message='<img onerror=x>';assert.ok(!resultFeedbackHTML(d).includes('<script>'));assert.match(resultFeedbackHTML(d),/&lt;img/);
});
