import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,missionOrder,validSave} from '../engine.js';
import {MISSION_TEMPLATES,missionNextStep,storeMissionBrief} from '../missions.js';
import {missionCargo,usedCargo} from '../cargo.js';
import {missionsHTML,localMissionsHTML} from '../mission-ui.js';
import {chartPoints} from '../chart-ui.js';
import {createBundle,decodeBundle} from '../save-bundle.js';
const accept=(s,t)=>{const id=t.id+'@0';missionOrder(s,id,'accept');return id;};
test('expanded catalogue has 24 unique missions and every non-combat workflow reaches its canonical goal and pays exactly once',()=>{
 assert.equal(MISSION_TEMPLATES.length,24);assert.equal(new Set(MISSION_TEMPLATES.map(t=>t.id)).size,24);
 for(const t of MISSION_TEMPLATES.filter(t=>t.type!=='bounty')){const s=freshState(90),id=accept(s,t),money=s.credits;s.location=missionNextStep(s.missions.active[0],t).target;const step=missionNextStep(s.missions.active[0],t);missionOrder(s,id,step.action);assert.equal(s.credits,money);assert.ok(validSave(s));const next=missionNextStep(s.missions.active[0],t);assert.equal(next.action,'complete');s.location=next.target;missionOrder(s,id,'complete');assert.equal(s.credits,money+t.reward);assert.equal(missionCargo(s),0);assert.throws(()=>missionOrder(s,id,'complete'));assert.ok(validSave(s));}
});
test('salvage uses the shared hold, rejects remote or underfunded recovery atomically and releases sealed cargo on abandonment',()=>{
 const t=MISSION_TEMPLATES.find(t=>t.id==='helios-core'),s=freshState(91),id=accept(s,t);let before=structuredClone(s);assert.throws(()=>missionOrder(s,id,'recover'));assert.deepEqual(s,before);s.location=t.to;s.fuel=2;before=structuredClone(s);assert.throws(()=>missionOrder(s,id,'recover'));assert.deepEqual(s,before);s.fuel=100;s.cargo.food=39;before=structuredClone(s);assert.throws(()=>missionOrder(s,id,'recover'));assert.deepEqual(s,before);s.cargo.food=5;missionOrder(s,id,'recover');assert.equal(s.fuel,97);assert.equal(missionCargo(s),5);assert.equal(usedCargo(s),10);assert.ok(validSave(JSON.parse(JSON.stringify(s))));const credits=s.credits;missionOrder(s,id,'abandon');assert.equal(s.credits,credits);assert.equal(missionCargo(s),0);
});
test('relief consumes actual provisions and fuel, never recruits a crew member, and requires a return report',()=>{
 const t=MISSION_TEMPLATES.find(t=>t.id==='union-relief'),s=freshState(92),id=accept(s,t);s.location=t.to;s.cargo.food=1;const before=structuredClone(s);assert.throws(()=>missionOrder(s,id,'assist'));assert.deepEqual(s,before);s.cargo.food=5;const roster=structuredClone(s.crew.roster);missionOrder(s,id,'assist');assert.equal(s.cargo.food,3);assert.equal(s.fuel,98);assert.deepEqual(s.crew.roster,roster);assert.throws(()=>missionOrder(s,id,'assist'));assert.throws(()=>missionOrder(s,id,'complete'));s.location=t.from;missionOrder(s,id,'complete');assert.ok(validSave(s));
});
test('AI descriptions survive complete save bundles and cannot change execution conditions; map and local panels use new actions',()=>{
 const s=freshState(93),t=MISSION_TEMPLATES.find(t=>t.id==='union-recorder'),id=accept(s,t);storeMissionBrief(s,t.id,{text:'<script>bonus 999999 CR</script>',model:'mock'});const saved=structuredClone(s),html=missionsHTML(s);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.deepEqual(s,saved);assert.equal(chartPoints(s).find(p=>p.missionId===id).action,'recover');assert.match(localMissionsHTML({...s,location:t.to},t.to),/data-mission-action="recover"/);
 const bundle=decodeBundle(JSON.stringify(createBundle(s,[],{drafts:{},negative:{},seeds:{},provider:'novelai',positiveBase:'style'})));assert.deepEqual(bundle.state.missions.briefs,s.missions.briefs);assert.equal(t.reward,640);s.location=t.to;missionOrder(s,id,'recover');s.location=t.from;missionOrder(s,id,'complete');assert.equal(s.credits,3200+640);s.missions.briefs[t.id].text='x'.repeat(1601);assert.equal(validSave(s),false);
});
