import {FACTIONS} from './factions.js';
export function outcomeSnapshot(s){return {credits:s.credits,fuel:s.fuel,hull:s.hull,shield:s.shield,cargo:{...s.cargo},honor:s.diplomacy?.honor||0,reputation:{...s.diplomacy?.reputation},remaining:s.travel?.remaining??null,location:s.location};}
export function validOutcomeSnapshot(v){return !!v&&['credits','fuel','hull','shield','honor'].every(k=>Number.isFinite(v[k])&&v[k]>=0)&&['food','ore','tech'].every(k=>Number.isFinite(v.cargo?.[k])&&v.cargo[k]>=0)&&FACTIONS.every(f=>Number.isFinite(v.reputation?.[f.id]))&&(v.remaining===null||(Number.isFinite(v.remaining)&&v.remaining>=0))&&typeof v.location==='string'&&v.location.length<=100;}
export function outcomeChanges(before,after){
 const changes=[],add=(label,a,b,unit='')=>{const delta=Math.round((b-a)*100)/100;if(delta)changes.push({label,delta,unit,beneficial:label==='남은 항해 시간'?delta<0:delta>0});};
 for(const [key,label,unit]of [['credits','크레딧',' CR'],['fuel','연료',''],['hull','선체',''],['shield','실드',''],['honor','명예','']])add(label,before[key],after[key],unit);
 for(const [key,label]of [['food','식량'],['ore','광물'],['tech','기술 부품']])add(label,before.cargo[key],after.cargo[key],'t');
 for(const f of FACTIONS)add(f.name+' 신뢰',before.reputation[f.id]||0,after.reputation[f.id]||0);
 if(before.remaining!==null&&after.remaining!==null)add('남은 항해 시간',before.remaining,after.remaining,'h');
 return changes;
}
