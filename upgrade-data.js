export const UPGRADE_MAX=5;
export const UPGRADE_BRANCHES={
 hull:{name:'선체 보강',icon:'armor',parts:{armor:1,frame:1},effect:'단계당 전투 선체 피해 4% 경감',description:'실드가 흡수하고 남은 적 함포 피해를 줄입니다. 사건·환경 피해에는 적용되지 않습니다.'},
 weapon:{name:'무장 제어',icon:'laser',parts:{circuit:1,mechanism:1},effect:'단계당 함포 피해 +4%',description:'장착 무기에 적용합니다. 무기를 교체해도 이 함선의 개조 효과는 유지됩니다.'},
 shield:{name:'실드 안정화',icon:'coil',parts:{coil:1,circuit:1},effect:'단계당 실드 용량 +5% · 방어 회복 +1',description:'최대 실드와 방어 명령의 회복량을 개선합니다. 개조 시 현재 실드는 충전되지 않습니다.'},
 engine:{name:'추진계 개량',icon:'mechanism',parts:{mechanism:1,coil:1},effect:'단계당 항해 속도 +3% · 연료 소모 −2%',description:'일반 항로의 시간과 연료를 개선합니다. 고정 비용의 성간 워프에는 적용되지 않습니다.'}
};
export const emptyUpgrades=()=>({hull:0,weapon:0,shield:0,engine:0});
export const upgradeLevels=s=>s?.fleet?.owned?.find(o=>o.design===s.fleet.active)?.upgrades||emptyUpgrades();
export function validUpgrades(u){return u===undefined||!!u&&typeof u==='object'&&!Array.isArray(u)&&Object.keys(u).length===4&&Object.keys(UPGRADE_BRANCHES).every(k=>Number.isSafeInteger(u[k])&&u[k]>=0&&u[k]<=UPGRADE_MAX);}
