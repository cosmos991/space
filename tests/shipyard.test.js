import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,migrateState,validSave,shipyardOrder,tick,trade,crewOrder,equipmentOrder,missionOrder,survey} from '../engine.js';
import {SHIPS,SHIP_GRADES,shipDesign,cargoCapacity} from '../ships-data.js';
import {migrateFleet} from '../shipyard.js';
import {shipStats} from '../equipment.js';
import {recruitmentPort,crewCapacity} from '../crew-data.js';
import {updateEventSettings,DEFAULT_EVENT_SETTINGS,makeEvent,eventChoices} from '../events.js';
import {shipyardHTML} from '../shipyard-ui.js';
import {createBundle,decodeBundle} from '../save-bundle.js';
const quiet=()=>{const s=freshState(42);s.credits=100000;updateEventSettings(s,{...DEFAULT_EVENT_SETTINGS,travelChance:0,surveyChance:0});return s;};
const settings={drafts:{},negative:{},seeds:{},provider:'novelai',positiveBase:'style'};
const buy=(s,id)=>shipyardOrder(s,'buy',id);
const select=(s,id)=>shipyardOrder(s,'switch',id);
test('catalogue has five designs per grade, releases only common ships and migrates the original ship without resetting progress',()=>{
 assert.equal(SHIPS.length,25);for(let grade=0;grade<SHIP_GRADES.length;grade++)assert.equal(SHIPS.filter(d=>d.grade===grade).length,5);assert.equal(SHIPS.filter(d=>d.released).length,5);
 const s=quiet();delete s.fleet;s.fuel=43;s.hull=67;const before=structuredClone(s);assert.ok(validSave(s));migrateFleet(s);assert.deepEqual({...s,fleet:undefined},{...before,fleet:undefined});assert.equal(s.fleet.owned[0].fuel,43);assert.equal(s.fleet.owned[0].hull,67);assert.ok(validSave(s));const next=structuredClone(s);migrateState(s);assert.deepEqual(s,next);
});
test('full production loop collects raw resources, refines parts, pays once, builds on game time and claims only at the original yard',()=>{
 const s=quiet();trade(s,'food',5,false);s.location='belt';for(let i=0;i<6;i++)shipyardOrder(s,'mine');assert.equal(s.cargo.ore,36);
 for(let i=0;i<4;i++)shipyardOrder(s,'salvage');assert.equal(s.fleet.materials.scrap,12);s.location='forge';for(let i=0;i<6;i++)shipyardOrder(s,'alloy');assert.equal(s.fleet.materials.alloy,6);
 assert.equal(s.cargo.tech,4);trade(s,'tech',3,true);shipyardOrder(s,'core');assert.equal(s.fleet.materials.core,1);assert.equal(s.fleet.materials.alloy,4);s.location='belt';for(let i=0;i<3;i++)shipyardOrder(s,'mine');s.location='forge';
 shipyardOrder(s,'blueprint','caravan');const before=s.credits,ore=s.cargo.ore;shipyardOrder(s,'build','caravan');assert.equal(s.credits,before-7000);assert.equal(s.cargo.ore,ore-26);assert.equal(s.cargo.tech,0);assert.equal(s.fleet.materials.core,0);assert.ok(validSave(s));
 assert.throws(()=>shipyardOrder(s,'claim'));tick(s,17);assert.throws(()=>shipyardOrder(s,'claim'));tick(s,1);s.location='haven';assert.throws(()=>shipyardOrder(s,'claim'));s.location='forge';shipyardOrder(s,'claim');assert.equal(s.fleet.owned.filter(o=>o.design==='caravan').length,1);assert.throws(()=>shipyardOrder(s,'claim'));assert.ok(validSave(s));
 const oldFuel=s.fuel;select(s,'caravan');assert.equal(s.fuel,100);s.fuel=35;select(s,'nomad');assert.equal(s.fuel,oldFuel);select(s,'caravan');assert.equal(s.fuel,35);
 const bundle=decodeBundle(JSON.stringify(createBundle(s,[],settings)));assert.deepEqual(bundle.state.fleet,s.fleet);assert.ok(validSave(bundle.state));
});
test('cargo limits are shared by trade, sealed mission freight, incidents, surveys and ship switching',()=>{
 const s=quiet();buy(s,'caravan');buy(s,'kestrel');select(s,'caravan');s.location='terra';trade(s,'food',50,true);assert.ok(s.cargo.food>40);assert.ok(validSave(s));s.location='haven';const before=structuredClone(s);assert.throws(()=>select(s,'nomad'));assert.deepEqual(s,before);
 s.cargo.food=60;missionOrder(s,'union-supply@0','accept');missionOrder(s,'union-supply@0','pickup');assert.equal(cargoCapacity(s),70);assert.ok(validSave(s));s.cargo.food=22;select(s,'kestrel');assert.equal(cargoCapacity(s),30);assert.throws(()=>trade(s,'food',1,true));s.location='belt';assert.throws(()=>survey(s));makeEvent(s,'cache');assert.equal(eventChoices(s).find(c=>c.id==='recover').disabled,true);assert.ok(validSave(s));
});
test('crew and reactor checks prevent incompatible swaps and ship roles alter real stats and extraction',()=>{
 const s=quiet();buy(s,'pathfinder');select(s,'pathfinder');for(const id of ['harin','gaon','taeo']){s.location=recruitmentPort(s,id);crewOrder(s,id,'meet');crewOrder(s,id,'hire');}assert.equal(crewCapacity(s),3);s.location='haven';const before=structuredClone(s);assert.throws(()=>select(s,'nomad'));assert.deepEqual(s,before);assert.ok(validSave(s));
 const t=quiet();t.location='forge';buy(t,'kestrel');select(t,'kestrel');for(const id of ['w-plasma-cannon','s-bastion','e-range']){equipmentOrder(t,id,'buy');equipmentOrder(t,id,'equip');}assert.equal(shipStats(t).power,14);assert.equal(shipStats(t).powerMax,14);assert.throws(()=>select(t,'nomad'));assert.ok(validSave(t));
 const m=quiet();buy(m,'mole');select(m,'mole');m.location='belt';shipyardOrder(m,'mine');assert.equal(m.cargo.ore,9);shipyardOrder(m,'salvage');assert.equal(m.fleet.materials.scrap,5);assert.ok(shipStats(m).speed<1);
});
test('invalid commands never spend resources and invalid fleet saves are rejected; previews remain read-only',()=>{
 const s=quiet();for(const action of ['build','claim','switch','sell']){const before=structuredClone(s);assert.throws(()=>shipyardOrder(s,action,'caravan'));assert.deepEqual(s,before);}const before=structuredClone(s);const html=shipyardHTML(s,{review:{action:'buy',id:'caravan'}});assert.match(html,/data-yard-confirm/);assert.match(html,/상위 등급 20척/);assert.deepEqual(s,before);assert.throws(()=>buy(s,'grade1-role0'));
 for(const mutate of [f=>f.owned={},f=>f.owned.push(null),f=>f.active='fake',f=>f.materials.scrap=-1,f=>f.job={design:'caravan',port:'haven',started:0,ready:1}]){const t=quiet();mutate(t.fleet);assert.equal(validSave(t),false);}
 buy(s,'caravan');const credits=s.credits;shipyardOrder(s,'sell','caravan');assert.equal(s.credits,credits+Math.floor(shipDesign('caravan').price*.6));assert.ok(validSave(s));
});
