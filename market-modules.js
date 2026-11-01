// Dependency-free utility definitions also used by cargo and ship calculations.
export const UTILITY_MODULES={
 analyser:{name:'지층 분석기',icon:'scan',path:'채굴',effect:'연료 4로 선택한 광맥의 위험도를 채굴 전에 분석합니다.',cost:'분석 단계 2/3 공개 · 광맥별 1회만 사용 가능'},
 thermal:{name:'고열 드릴 헤드',icon:'drill',path:'채굴',effect:'주기당 처리량 +2 · 특수 소재 회수 확률 ×1.4',cost:'매 주기 내구도 소모 +4 · 사고 피해는 별도'},
 sensor:{name:'심우주 탐사 센서',icon:'sensor',path:'탐사',effect:'항성계마다 숨겨진 신호 2개를 추가로 포착합니다.',cost:'조사 연료·시간 필요 · 각 신호는 한 번만 회수'},
 shroud:{name:'불법 화물 차폐 장치',icon:'shroud',path:'밀수',effect:'암시장 운송 의뢰의 적발 확률 35% → 10%',cost:'장착 중 화물 용량 -8t · 위험을 완전히 제거하지 않음'}
};
export const utility=s=>Object.hasOwn(UTILITY_MODULES,s?.specialMarket?.equipped)?s.specialMarket.equipped:null;
export const hasUtility=(s,id)=>utility(s)===id;
export const utilityCargoPenalty=s=>hasUtility(s,'shroud')?8:0;
