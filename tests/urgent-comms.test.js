import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,depart,crewOrder,validSave,resolveEvent} from '../engine.js';
import {makeEvent} from '../events.js';
import {syncMissions} from '../missions.js';
import {urgentSignals,acknowledgeUrgent,urgentCommsHTML,createUrgentComms,captainChannel} from '../urgent-comms.js';
test('pirates take priority over urgent mission offers; routine contacts stay quiet and acknowledgements persist',()=>{
 const s=freshState(21);assert.equal(urgentSignals(s).length,0);s.hours=96;s.world.nextBroadcast=1e9;syncMissions(s);const missions=urgentSignals(s);assert.equal(missions.length,3);assert.ok(missions.every(m=>m.type==='mission'));assert.ok(missions.every(m=>m.note.includes(captainChannel(s))));
 depart(s,'veil');makeEvent(s,'raiders');const before=structuredClone(s),signals=urgentSignals(s);assert.equal(signals[0].type,'hostile');assert.deepEqual(s,before);
 acknowledgeUrgent(s,signals[0].key);const restored=JSON.parse(JSON.stringify(s));assert.ok(validSave(restored));assert.ok(!urgentSignals(restored).some(m=>m.key===signals[0].key));assert.ok(urgentSignals(restored).some(m=>m.type==='mission'));
});
test('special incidents use actual crew profiles and forecast warnings remain distinct from actual encounters',()=>{
 const s=freshState(22);crewOrder(s,'harin','meet');crewOrder(s,'harin','hire');depart(s,'veil');s.world.forecast={id:'ion',from:s.travel.from,to:s.travel.to,created:s.hours,reporter:'harin'};
 const pre=urgentSignals(s)[0];assert.equal(pre.type,'hazard');assert.equal(pre.sender,'서하린');assert.match(pre.body,/사전 경고/);acknowledgeUrgent(s,pre.key);
 delete s.world.forecast;makeEvent(s,'ion');const actual=urgentSignals(s)[0];assert.ok(actual.key!==pre.key);assert.equal(actual.target.kind,'event');
 resolveEvent(s,'ignore');assert.equal(urgentSignals(s).length,0);makeEvent(s,'relic');const special=urgentSignals(s)[0];assert.equal(special.type,'crew');assert.equal(special.sender,'서하린');
 const html=urgentCommsHTML(s,{...special,title:'<script>',body:'<img onerror=x>'});assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<img onerror'));assert.match(html,/data-urgent-action/);
});
test('urgent controller waits for other dialogs, opens once, pauses on arrival and can dismiss or open the matching mission',()=>{
 const s=freshState(23);s.hours=96;s.world.nextBroadcast=1e9;syncMissions(s);let state=s,paused=0,saved=0;const routed=[],handlers={};
 const dialog={open:false,innerHTML:'',addEventListener(n,f){handlers[n]=f;},showModal(){this.open=true;},close(){this.open=false;handlers.close();}};
 const ui=createUrgentComms({dialog,getState:()=>state,onPresent:()=>paused++,onAcknowledge:()=>saved++,onAction:d=>routed.push(d.target)});
 ui.update(true);assert.equal(dialog.open,false);ui.update();assert.equal(dialog.open,true);ui.update();assert.equal(paused,1);
 handlers.click({target:{closest:q=>q==='[data-urgent-action]'?{}:null}});assert.equal(saved,1);assert.equal(routed[0].kind,'mission');assert.equal(dialog.open,false);
 ui.update();assert.equal(paused,2);dialog.close();assert.equal(saved,2);assert.equal(routed.length,1);
 ui.update();state=freshState(24);ui.update();assert.equal(dialog.open,false);assert.equal(saved,2);assert.equal(state.world.urgentSeen,undefined);
});
test('expired mission requests disappear and corrupt acknowledgement metadata is rejected without breaking old saves',()=>{
 const s=freshState(25);assert.ok(validSave(s));s.hours=96;s.world.nextBroadcast=1e9;syncMissions(s);assert.equal(urgentSignals(s).length,3);s.hours=120;assert.equal(urgentSignals(s).length,0);
 s.world.urgentSeen=[4];assert.equal(validSave(s),false);delete s.world.urgentSeen;assert.ok(validSave(s));
});
