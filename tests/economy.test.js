import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,trade,contract,survey,tick,resolveEvent,validSave} from '../engine.js';
import {PORTS,marketSnapshot,unitPrice,quoteTrade,maxTrade,migrateEconomy,routeOpportunities,removeCargo} from '../economy.js';

test('bulk quotes include price impact and equal sequential unit purchases',()=>{
 const a=freshState(),b=freshState();const q=quoteTrade(a,'tech',15,true),first=unitPrice(a,'haven','tech').buy;assert.ok(q.total>first*15);
 trade(a,'tech',15,true);for(let i=0;i<15;i++)trade(b,'tech',1,true);
 assert.equal(a.credits,b.credits);assert.deepEqual(a.cargo,b.cargo);assert.deepEqual(a.economy.costs,b.economy.costs);assert.deepEqual(a.economy.markets,b.economy.markets);
});
test('failed orders never mutate money, stock, cost basis or ledger',()=>{
 const s=freshState();for(const args of [['tech',36,true],['ore',1,false],['food',1.5,true],['food',0,true],['food',1,'yes'],['missing',1,true]]){const before=structuredClone(s);assert.throws(()=>trade(s,...args));assert.deepEqual(s,before);}
 s.event={id:'test'};const before=structuredClone(s);assert.throws(()=>trade(s,'food',1,true));assert.deepEqual(s,before);
});
test('finite stock and max quantity honor both inventory and affordability',()=>{
 const s=freshState();s.location='terra';s.credits=10000;assert.equal(maxTrade(s,'tech',true),24);assert.throws(()=>trade(s,'tech',25,true));
 s.credits=100;const max=maxTrade(s,'food',true);assert.ok(max>0);assert.ok(quoteTrade(s,'food',max,true).total<=100);assert.throws(()=>quoteTrade(s,'food',max+1,true));
 s.credits=3200;s.cargo.food=40;assert.equal(maxTrade(s,'food',true),0);assert.equal(maxTrade(s,'food',false),40);
});
test('weighted acquisition cost is removed proportionally on sale',()=>{
 const s=freshState();s.cargo.food=0;const q=trade(s,'food',10,true);const saleQuote=quoteTrade(s,'food',4,false);trade(s,'food',4,false);
 assert.equal(s.cargo.food,6);assert.equal(s.economy.costs.food,q.total*100-saleQuote.removedCost);assert.equal(s.economy.profit,Math.round(saleQuote.profit*100));
 trade(s,'food',6,false);assert.equal(s.cargo.food,0);assert.equal(s.economy.costs.food,0);assert.ok(s.economy.profit<0,'same-port flip must lose the spread');
});
test('contract deliveries and rescue support consume basis without counting as sales',()=>{
 const s=freshState();s.cargo.food=0;trade(s,'food',10,true);const cost=s.economy.costs.food;
 contract(s,'accept');s.location='terra';contract(s,'deliver');assert.equal(s.economy.costs.food,cost-Math.round(cost/2));assert.equal(s.economy.profit,0);
 const before=s.economy.costs.food;tick(s,30);resolveEvent(s,'help');assert.equal(s.economy.costs.food,before-Math.round(before*2/5));assert.equal(s.economy.profit,0);assert.equal(s.economy.ledger.length,1);
});
test('recovered cargo has zero acquisition cost and dilutes the average',()=>{
 const s=freshState();trade(s,'ore',4,true);const cost=s.economy.costs.ore;s.location='belt';survey(s);assert.equal(s.cargo.ore,12);assert.equal(s.economy.costs.ore,cost);removeCargo(s,'ore',12);assert.equal(s.economy.costs.ore,0);
});
test('daily replenishment is lazy, read-only and preserves elapsed-day remainder',()=>{
 const s=freshState();trade(s,'food',30,true);const original=structuredClone(s);s.hours=23;assert.equal(marketSnapshot(s).stock.food,50);
 s.hours=25;const snapshot=marketSnapshot(s);assert.equal(snapshot.stock.food,70);assert.equal(snapshot.updated,24);assert.deepEqual(s.economy,original.economy);
 trade(s,'food',1,false);assert.equal(s.economy.markets.haven.updated,24);s.hours=47;assert.equal(marketSnapshot(s).stock.food,71);s.hours=48;assert.equal(marketSnapshot(s).stock.food,80);
});
test('excess stock is gradually consumed and prices follow simulation days',()=>{
 const s=freshState();s.cargo.ore=40;trade(s,'ore',40,false);assert.equal(marketSnapshot(s).stock.ore,100);s.hours=24;assert.equal(marketSnapshot(s).stock.ore,85);
 const a=unitPrice(freshState(),'haven','tech').buy,b=unitPrice({...freshState(),hours:48},'haven','tech').buy;assert.notEqual(a,b);
});
test('old saves migrate without losing progress or inventing historical costs',()=>{
 const s=freshState();delete s.economy;s.hours=41;s.credits=7123;s.cargo.tech=4;assert.ok(validSave(s));migrateEconomy(s);assert.equal(s.hours,41);assert.equal(s.credits,7123);assert.equal(s.cargo.tech,4);assert.equal(s.economy.costs.tech,0);assert.equal(s.economy.markets.terra.updated,41);assert.ok(validSave(s));assert.deepEqual(migrateEconomy(structuredClone(s)),s);
});
test('save validation rejects corrupted economy instead of loading broken totals',()=>{
 const s=freshState();s.economy.costs.food=-1;assert.equal(validSave(s),false);s.economy.costs.food=0;s.economy.markets.haven.stock.food=NaN;assert.equal(validSave(s),false);
});
test('route suggestions subtract fuel replacement cost and refuse unavailable orders',()=>{
 const s=freshState(),before=structuredClone(s),routes=routeOpportunities(s);assert.ok(routes.length);assert.deepEqual(s,before);
 for(const r of routes){assert.equal(r.profit,r.revenue-r.cost-r.fuel*3);assert.equal(r.cost,quoteTrade(s,r.good,5,true).total);assert.ok(PORTS[r.to]);}
 s.cargo.food=40;assert.deepEqual(routeOpportunities(s),[]);s.cargo.food=0;s.credits=0;assert.deepEqual(routeOpportunities(s),[]);
});
test('ledger is capped and persistent trade state round trips through JSON',()=>{
 const s=freshState();s.credits=100000;for(let i=0;i<35;i++){trade(s,'ore',1,true);trade(s,'ore',1,false);}
 assert.equal(s.economy.ledger.length,60);assert.equal(s.cargo.ore,0);assert.equal(s.economy.costs.ore,0);assert.ok(validSave(JSON.parse(JSON.stringify(s))));
});
