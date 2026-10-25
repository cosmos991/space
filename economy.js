// Pure market calculations. No wall clock: only the simulation clock changes markets.
export const TRADE_GOODS={ore:'광물',food:'식량',tech:'기술 부품'};
export const PORTS={
 haven:{name:'헤이븐 정거장',prices:{ore:34,food:22,tech:96},stock:{ore:60,food:80,tech:40}},
 terra:{name:'테라 노바',prices:{ore:48,food:12,tech:115},stock:{ore:40,food:120,tech:24}},
 forge:{name:'헬리오스 조선소',prices:{ore:56,food:28,tech:65},stock:{ore:30,food:45,tech:75}},
 freeport:{name:'프리포트',prices:{ore:40,food:32,tech:88},stock:{ore:65,food:35,tech:40}}
};
export function newEconomy(hours=0){return {version:1,costs:{ore:0,food:0,tech:0},profit:0,turnover:0,ledger:[],markets:Object.fromEntries(Object.entries(PORTS).map(([id,p])=>[id,{updated:hours,stock:{...p.stock}}]))};}
export function validEconomy(e,hours){return e?.version===1&&Number.isSafeInteger(e.profit)&&Number.isSafeInteger(e.turnover)&&e.turnover>=0&&Object.keys(TRADE_GOODS).every(g=>Number.isSafeInteger(e.costs?.[g])&&e.costs[g]>=0)&&Array.isArray(e.ledger)&&e.ledger.length<=60&&e.ledger.every(r=>r&&PORTS[r.port]&&TRADE_GOODS[r.good]&&typeof r.buy==='boolean'&&Number.isInteger(r.quantity)&&r.quantity>0&&r.quantity<=40&&Number.isSafeInteger(r.total)&&r.total>0&&Number.isFinite(r.profit)&&Number.isFinite(r.time)&&r.time>=0&&r.time<=hours)&&Object.keys(PORTS).every(id=>{const m=e.markets?.[id];return m&&Number.isFinite(m.updated)&&m.updated>=0&&m.updated<=hours&&Object.keys(TRADE_GOODS).every(g=>Number.isSafeInteger(m.stock?.[g])&&m.stock[g]>=0);});}
export function migrateEconomy(s){if(!s.economy)s.economy=newEconomy(s.hours);return s;}
export function marketSnapshot(s,id=s.location){const p=PORTS[id];if(!p)return null;const stored=s.economy?.markets[id]||{updated:s.hours,stock:p.stock};const cycles=Math.floor(Math.max(0,s.hours-stored.updated)/24);const stock=Object.fromEntries(Object.keys(TRADE_GOODS).map(g=>{const n=stored.stock[g],target=p.stock[g],change=Math.min(Math.abs(target-n),cycles*Math.max(4,Math.ceil(target*.25)));return [g,n+Math.sign(target-n)*change];}));return {stock,updated:stored.updated+cycles*24};}
export function unitPrice(s,id,good,stock=marketSnapshot(s,id)?.stock[good]){const p=PORTS[id];if(!p||!TRADE_GOODS[good])throw Error('알 수 없는 교역 상품입니다.');const g=Object.keys(TRADE_GOODS).indexOf(good),port=Object.keys(PORTS).indexOf(id);const day=Math.floor(s.hours/24);const wave=Math.sin(day*.9+port*1.4+g*2.1)-Math.sin(port*1.4+g*2.1);const scarcity=Math.max(-.25,Math.min(.45,(p.stock[good]-stock)/p.stock[good]*.4));const buy=Math.max(2,Math.round(p.prices[good]*(1+wave*.06+scarcity)));return {buy,sell:Math.max(1,Math.floor(buy*.85))};}
export function quoteTrade(s,good,quantity,buy){
 const p=PORTS[s.location];if(s.travel||!p)throw Error('교역항에 정박해야 합니다.');if(s.event)throw Error('긴급 상황에 먼저 대응하세요.');if(!TRADE_GOODS[good]||!Number.isInteger(quantity)||quantity<1||quantity>40||typeof buy!=='boolean')throw Error('거래 수량은 1~40t의 정수여야 합니다.');
 const market=marketSnapshot(s),units=s.cargo[good],cargo=Object.values(s.cargo).reduce((a,b)=>a+b,0);
 if(buy&&quantity>market.stock[good])throw Error('교역소의 상품 재고가 부족합니다.');
 if(buy&&cargo+quantity>40)throw Error('화물칸이 부족합니다. 최대 40t.');
 if(!buy&&quantity>units)throw Error('판매할 화물이 부족합니다.');
 let total=0;for(let i=0;i<quantity;i++){const price=unitPrice(s,s.location,good,market.stock[good]+(buy?-i:i));total+=buy?price.buy:price.sell;}
 if(buy&&total>s.credits)throw Error('보유 자금이 부족합니다.');
 const removedCost=buy?0:Math.round((s.economy?.costs[good]||0)*quantity/units);
 return {total,quantity,buy,good,removedCost,profit:buy?0:(total*100-removedCost)/100,stockAfter:market.stock[good]+(buy?-quantity:quantity),market};
}
export function maxTrade(s,good,buy){let max=0;for(let q=1;q<=40;q++){try{quoteTrade(s,good,q,buy);max=q;}catch{break;}}return max;}
// Cost is stored in integer hundredths of a credit; deliveries and rescues also
// remove their proportional acquisition cost without counting as trade sales.
export function removeCargo(s,good,quantity){migrateEconomy(s);if(quantity<0||quantity>s.cargo[good])throw Error('화물이 부족합니다.');const removed=s.cargo[good]?Math.round(s.economy.costs[good]*quantity/s.cargo[good]):0;s.economy.costs[good]-=removed;s.cargo[good]-=quantity;return removed;}
export function executeTrade(s,good,quantity,buy){const q=quoteTrade(s,good,quantity,buy);migrateEconomy(s);s.economy.markets[s.location]={updated:q.market.updated,stock:{...q.market.stock,[good]:q.stockAfter}};if(buy){s.credits-=q.total;s.cargo[good]+=quantity;s.economy.costs[good]+=q.total*100;}else{removeCargo(s,good,quantity);s.credits+=q.total;s.economy.profit+=Math.round(q.profit*100);}s.economy.turnover+=q.total;s.economy.ledger.unshift({time:s.hours,port:s.location,good,quantity,buy,total:q.total,profit:q.profit});s.economy.ledger=s.economy.ledger.slice(0,60);return q;}
export function routeOpportunities(s,quantity=5){if(!PORTS[s.location]||s.travel)return [];const from=PORTS[s.location],origin={haven:[310,180],terra:[550,240],forge:[190,370],freeport:[115,100]}[s.location];const candidates=[];for(const id of Object.keys(PORTS)){if(id===s.location)continue;const dest={haven:[310,180],terra:[550,240],forge:[190,370],freeport:[115,100]}[id];const distance=Math.hypot(origin[0]-dest[0],origin[1]-dest[1]),fuel=Math.ceil(distance/24),hours=Math.ceil(distance/17);for(const good of Object.keys(TRADE_GOODS)){try{const q=quoteTrade(s,good,quantity,true);let revenue=0;const m=marketSnapshot(s,id);for(let i=0;i<quantity;i++)revenue+=unitPrice(s,id,good,m.stock[good]+i).sell;const profit=revenue-q.total-fuel*3;candidates.push({to:id,good,quantity,cost:q.total,revenue,profit,fuel,hours,affordableFuel:s.fuel>=fuel});}catch{}}}return candidates.sort((a,b)=>b.profit-a.profit);}
