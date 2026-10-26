import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,depart,resolveEvent,validSave} from '../engine.js';
import {makeEvent,eventChoices,eventCategory,eligibleEvents,updateEventSettings,DEFAULT_EVENT_SETTINGS,activeRouteAlert} from '../events.js';
import {outcomeSnapshot} from '../outcome-data.js';
import {eventResult} from '../result-feedback.js';
import {urgentSignals} from '../urgent-comms.js';
const ids=['gravity','micrometeor','tanker','repair','convoy','probe','wreck','comet'];
function setup(id){const s=freshState(482);depart(s,'veil');s.hull=60;s.fuel=40;s.cargo.tech=3;makeEvent(s,id);return s;}
test('every new event choice survives active save/load, gives deterministic results, detailed receipts and no duplicate payouts',()=>{
 for(const id of ids)for(const action of eventChoices(setup(id)).filter(c=>!c.disabled).map(c=>c.id)){
  const s=setup(id),loaded=JSON.parse(JSON.stringify(s));assert.ok(validSave(loaded),id);const event=structuredClone(s.event),before=outcomeSnapshot(s);
  const message=resolveEvent(s,action);resolveEvent(loaded,action);assert.deepEqual(s,loaded,id+':'+action);assert.ok(validSave(s),id+':'+action);
  const report=eventResult(s,event,action,action,before,message);assert.notEqual(report.explanation,'선택한 대응의 처리가 완료되었습니다.');assert.ok(report.message);
  const after=structuredClone(s);assert.throws(()=>resolveEvent(s,action));assert.deepEqual(s,after);
 }
});
test('new hazards produce active and advance warnings, urgent reports, and obey category weights',()=>{
 for(const id of ['gravity','micrometeor']){const s=setup(id);assert.equal(eventCategory(id),'hazard');assert.equal(activeRouteAlert(s).active,true);assert.equal(urgentSignals(s)[0].type,'hazard');s.event=null;s.world.forecast={id,from:s.travel.from,to:s.travel.to,created:s.hours};assert.ok(validSave(s));assert.equal(activeRouteAlert(s).active,false);}
 const s=setup('probe');s.event=null;updateEventSettings(s,{...DEFAULT_EVENT_SETTINGS,hazard:0,discovery:0});assert.ok(eligibleEvents(s).every(e=>!['hazard','discovery'].includes(eventCategory(e.id))));
});
test('new cargo and service choices guard capacity, resources and repair/refuel caps without mutations on failure',()=>{
 for(const [id,action] of [['probe','recover'],['wreck','salvage'],['gravity','stabilize'],['micrometeor','evade'],['comet','observe']]){const s=setup(id);s.fuel=0;const before=structuredClone(s);assert.throws(()=>resolveEvent(s,action));assert.deepEqual(s,before);}
 for(const [id,action] of [['probe','recover'],['wreck','salvage']]){const s=setup(id);s.cargo={food:40,tech:0,ore:0};assert.ok(eventChoices(s).find(c=>c.id===action).disabled);}
 const repair=setup('repair');repair.hull=98;resolveEvent(repair,'repair');assert.equal(repair.hull,100);assert.equal(repair.cargo.tech,2);
 const fuel=setup('tanker');fuel.fuel=98;resolveEvent(fuel,'refuel');assert.equal(fuel.fuel,100);
});
