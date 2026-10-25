// Sealed mission freight shares the hold but is never part of tradable stock.
export const missionCargo=s=>(s?.missions?.active||[]).reduce((n,m)=>n+(m.cargo||0),0);
export const usedCargo=s=>Object.values(s.cargo).reduce((a,b)=>a+b,0)+missionCargo(s);
