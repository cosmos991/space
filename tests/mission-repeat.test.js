import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,missionOrder,validSave} from '../engine.js';
import {MISSION_TEMPLATES,missionOffers,missionCooldown,migrateMissions,syncMissions} from '../missions.js';
const advance=(s,h)=>{s.hours=h;s.world.nextBroadcast=1e9;syncMissions(s);};
test('daily boards select at most three per faction, change without adjacent repeats and cover the whole catalogue without RNG calls',()=>{
 const s=freshState(3),seen=new Set();let previous=[];for(let d=0;d<8;d++){advance(s,d*24);const before=structuredClone(s),ids=missionOffers(s,'union').map(t=>t.id);assert.equal(ids.length,3);assert.ok(ids.every(id=>!previous.includes(id)));ids.forEach(id=>seen.add(id));assert.deepEqual(s,before);previous=ids;}
 assert.equal(seen.size,MISSION_TEMPLATES.filter(t=>t.faction==='union').length);
});
test('completed missions stay unavailable for seven days, survive history truncation and saves, and never invalidate active missions',()=>{
 const s=freshState(4);missionOrder(s,'union-supply@0','accept');missionOrder(s,'union-supply@0','pickup');s.location='terra';missionOrder(s,'union-supply@0','complete');assert.equal(missionCooldown(s,'union-supply'),168);s.missions.history=[];
 advance(s,48);assert.ok(!missionOffers(s).some(m=>m.id==='union-supply'));assert.throws(()=>missionOrder(s,'union-supply@2','accept'));assert.ok(validSave(JSON.parse(JSON.stringify(s))));
 advance(s,192);assert.ok(missionOffers(s).some(m=>m.offerId==='union-supply@8'));missionOrder(s,'union-supply@8','accept');advance(s,216);assert.ok(!missionOffers(s).some(m=>m.id==='union-supply'));s.location='haven';missionOrder(s,'union-supply@8','pickup');assert.ok(validSave(s));
});
test('abandoned missions have a two-day cooldown and legacy completion history is migrated without resetting resources',()=>{
 const s=freshState(5);missionOrder(s,'union-supply@0','accept');missionOrder(s,'union-supply@0','abandon');assert.equal(missionCooldown(s,'union-supply'),48);delete s.missions.lastClosed;const credits=s.credits,roster=structuredClone(s.crew.roster);assert.ok(validSave(s));migrateMissions(s);assert.equal(missionCooldown(s,'union-supply'),48);assert.equal(s.credits,credits);assert.deepEqual(s.crew.roster,roster);
 s.missions.lastClosed['fake']={status:'completed',time:0};assert.equal(validSave(s),false);
});
