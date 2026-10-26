export const SHIP_CLASSES=[{id:'scout',name:'소형 탐사선',capacity:2,role:'낮은 유지비 · 특화 운용'},{id:'frigate',name:'호위함',capacity:3,role:'균형형 독립 항해'},{id:'destroyer',name:'구축함',capacity:4,role:'전투 · 전문 임무'},{id:'cruiser',name:'순양함',capacity:5,role:'장거리 다목적 작전'},{id:'capital',name:'주력함',capacity:5,role:'대형 모듈 · 지휘 작전'}];
export const DEPARTMENTS={command:{name:'지휘·협업',effect:'실드 방어 회복 +2 · 추진 철수 +4%p'},tactical:{name:'전술·방어',effect:'명중 +4%p · 실드 방어 회복 +3'},engineering:{name:'기관·동력',effect:'교전 턴 종료 에너지 +2 · 냉각 +2'},navigation:{name:'항해·탐사',effect:'항해 연료 −8% · 항해 속도 +5%'},support:{name:'군수·정비',effect:'보급·수리·실드 충전 비용 −12%'}};
export const CREW_CANDIDATES=[
 {id:'harin',mbti:'INTP',values:'미지의 발견과 관측의 정확성',risk:'근거가 있으면 새로운 항로를 시도하지만 복귀 연료는 지킵니다.',speech:'조용한 질문과 관측 근거를 곁들입니다.',recruit:'broker',name:'서하린',title:'항해·탐사 전문가',role:'navigation',secondary:'command',fee:420,wage:24,color:'#82c9de',personality:'차분하고 호기심이 많으며 관측 기록을 소중히 여깁니다.',bio:'독립 측량선에서 항로 지도를 작성했습니다. 아직 이름 붙지 않은 신호를 찾아 독립 항해에 나설 동료를 찾고 있습니다.',greeting:'함장님, 서하린입니다. 항해 AI가 놓치기 쉬운 작은 신호까지 살펴보겠습니다.',story:'처음 맡았던 측량선은 같은 구역을 세 번이나 돌아갔어요. 마지막 항해에서야 작은 구조 신호를 찾았죠. 그 뒤로는 서두르더라도 센서 기록만큼은 다시 확인합니다.'},
 {id:'gaon',mbti:'ISTP',values:'현장 검증과 동료의 안전',risk:'직접 점검한 장비의 한계 안에서만 위험을 감수합니다.',speech:'짧고 솔직하게 원인과 해결책을 짚습니다.',recruit:'broker',name:'윤가온',title:'기관·동력 전문가',role:'engineering',secondary:'support',fee:460,wage:26,color:'#e9b477',personality:'솔직하고 실용적이지만 동료의 안전에는 세심합니다.',bio:'헬리오스 정비 도크 출신입니다. 현장에서 직접 문제를 해결하는 항해를 원합니다.',greeting:'윤가온, 승함했습니다. 엔진은 AI가 돌려도 무리하고 있는지는 제가 보겠습니다.',story:'조선소에서는 수리한 배가 떠나는 뒷모습만 봤습니다. 그 배가 어디로 가는지, 거기서 무엇을 만나는지 늘 궁금했어요. 이제는 저도 끝까지 함께 가보고 싶습니다.'},
 {id:'taeo',mbti:'ISTJ',values:'책임과 전원 귀환',risk:'불확실한 전과보다 확보된 퇴로를 우선합니다.',speech:'절차와 확인 사항을 차분하게 정리합니다.',recruit:'broker',name:'강태오',title:'전술·방어 전문가',role:'tactical',secondary:'command',fee:540,wage:30,color:'#df968e',personality:'말수가 적고 침착하며 무리한 교전보다 확실한 귀환을 중시합니다.',bio:'민간 수송선 호위 경험이 있습니다. 함장의 결정을 존중하며 사격 각도와 철수로를 함께 확인합니다.',greeting:'강태오입니다. 사격 통제와 방어 배분을 맡겠습니다. 퇴로도 늘 확보해 두죠.',story:'호위 임무의 성공은 적을 몇 척 격퇴했는지보다 모두가 도착했는지로 판단했습니다. 화려한 전과는 없어도 제 배의 귀환 기록은 자랑할 만합니다.'},
 {id:'yuri',mbti:'ESFJ',values:'상호 돌봄과 공정한 분배',risk:'동료에게 부담을 떠넘기는 선택을 피합니다.',speech:'상대의 상태를 먼저 묻고 구체적인 준비를 제안합니다.',recruit:'broker',name:'민유리',title:'군수·정비 전문가',role:'support',secondary:'navigation',fee:360,wage:20,color:'#a7d6a0',personality:'정리가 빠르고 다정하며 작은 낭비를 잘 찾아냅니다.',bio:'프리포트 공동 창고와 수리 접수 업무를 맡았습니다. 보급·정비 단가 협상과 장비 점검이 특기입니다.',greeting:'민유리입니다. 보급과 정비 일정을 정리해 둘게요. 함장님은 다음 목적지를 골라 주세요.',story:'공동 창고에서는 남는 물건이 다른 사람에게 꼭 필요한 물건이 되곤 했어요. 그래서 저는 물자를 아끼는 것과 사람을 돕는 일이 멀리 떨어져 있다고 생각하지 않습니다.'},
 {id:'dohyun',mbti:'INFJ',values:'의견의 존중과 함께 살아남는 선택',risk:'충분히 의견을 듣되 구조가 필요하면 결단합니다.',speech:'차분하게 의도를 묻고 여러 사람의 관점을 연결합니다.',recruit:'rescue',name:'이도현',title:'지휘·협업 전문가',role:'command',secondary:'tactical',fee:580,wage:32,color:'#b8a2e4',personality:'온화하고 신중하며 다른 사람의 의견을 끝까지 듣습니다.',bio:'소규모 탐사 원정의 운항 조정을 맡았습니다. 부서 간 동력 배분과 위기 시 판단을 돕습니다.',greeting:'이도현입니다. 각 모듈의 보고를 정리하고 함장님의 결정을 지원하겠습니다.',story:'서로 다른 전문가들이 같은 답을 내는 일은 드뭅니다. 하지만 각자가 무엇을 지키려는지 듣고 나면 함께 선택할 수 있는 길이 보이더군요. 그런 순간에 보람을 느낍니다.'}
];
export const crewCatalog=s=>[...CREW_CANDIDATES,...Object.values(s?.galaxy?.systems||{}).flatMap(g=>g.people)];
export const crewMember=(id,s)=>crewCatalog(s).find(c=>c.id===id);
export const crewCapacity=s=>SHIP_CLASSES.find(c=>c.id===(s.crew?.shipClass||'scout'))?.capacity||2;
export function assignmentStrength(id,assignment,s){const c=crewMember(id,s);return c?.role===assignment?1:(c?.secondary===assignment?0.5:0);}
export function crewBonuses(s){const b={accuracy:0,shieldRegen:0,energyRegen:0,cooling:0,fuelFactor:1,speed:1,escape:0,serviceDiscount:0};if((s?.crew?.payroll?.owed||0)>1e-6)return b;for(const m of s?.crew?.roster||[]){const k=assignmentStrength(m.id,m.assignment,s);if(m.assignment==='tactical'){b.accuracy+=4*k;b.shieldRegen+=3*k;}if(m.assignment==='engineering'){b.energyRegen+=2*k;b.cooling+=2*k;}if(m.assignment==='navigation'){b.fuelFactor-=.08*k;b.speed+=.05*k;}if(m.assignment==='command'){b.escape+=4*k;b.shieldRegen+=2*k;}if(m.assignment==='support')b.serviceDiscount+=.12*k;}return b;}
export const dailyWages=s=>(s?.crew?.roster||[]).reduce((sum,m)=>sum+(crewMember(m.id,s)?.wage||0),0);

// Candidate identity and personality never reroll with the broker schedule.
export const BROKER_PERIOD=48;
export function recruitmentPort(s,id){
 const c=crewMember(id,s);if(!c)return null;
 if(c.generated)return c.home;
 if(c.recruit==='rescue')return s.crew?.recruitment?.rescued||s.crew?.records?.[id]?.met?'haven':null;
 if(id==='gaon')return 'forge';if(id==='yuri')return 'terra';
 const phase=Math.floor(s.hours/BROKER_PERIOD)%2;return (id==='harin')===(phase===0)?'haven':'freeport';
}
export function recruitmentCandidates(s){if(s.travel||s.event)return [];return crewCatalog(s).filter(c=>!s.crew?.roster.some(m=>m.id===c.id)&&recruitmentPort(s,c.id)===s.location);}
