// ---------- 결과지 디자인 활용 규칙 (결과지 예시 이미지 기준) ----------
// 설문 응답을 결과지의 어느 자리에, 어떤 모양으로 넣는지 정해 둔 규칙입니다. (아직 결과지 화면은 그리지 않음)
// Result.fromSurvey(응답들) → { nickname, sentence, situation, criteria, interpretation } 로 결과지에 들어갈 값을 만들어 줍니다.
// 응답들: survey.js 의 answers 배열(또는 window.surveyAnswers) — [닉네임, 문장, 설문3 옵션들, 설문4 옵션들, ...]

// ----- 자리 규칙 -----
const RESULT_PLACEMENT = {
  nickname: {                                   // 설문1 → 오른쪽 상단 회색 박스 안
    from: 1, place: '오른쪽 상단 회색 박스', design: 'Nickname.render(닉네임)',
  },
  sentence: {                                   // 설문2 → 가운데 네모 칸의 정중앙, 겹치는 그래픽 중 맨 위(맨 앞)
    from: 2, place: '가운데 네모 칸', align: '정중앙', layer: '맨 위', design: 'Sentence.render(Sentence.segment(문장))',
  },
  situation: {                                  // 설문3 → 왼쪽 하단 'Then' 표의 '상황' 칸
    from: 3, place: "'Then' 표 > 상황", separator: ' • ',
  },
  criteria: {                                   // 설문4 → 왼쪽 하단 'Then' 표의 '판단 기준' 칸
    from: 4, place: "'Then' 표 > 판단 기준", format: '외적 기준 {외적}% • 내적 기준 {내적}%',
  },
  interpretation: {                             // 설문1~4 를 참고한 AI 해석 → 'Then' 표의 '해석' 칸
    from: [1, 2, 3, 4], place: "'Then' 표 > 해석",
  },
};

// ----- 판단 기준: 설문4 옵션 분류 -----
// 아래 8개가 '외적 기준', 나머지(나만의 기준·목표 도달률·자기 실망·기대와의 불일치·후회와 미련)는 모두 '내적 기준'
const EXTERNAL_CRITERIA = [
  '타인과의 비교', '취업·합격 여부', '타인의 평가', '주변의 기대',
  '정해진 나이와 시기', '사회적 기준', '경제적 성취', '조직이나 집단의 인정',
];
// 비율 계산에서 뺄 옵션 (지금은 없음: 고른 옵션을 모두 세서 외적/내적 비율을 냄)
const CRITERIA_IGNORED = [];

const normalizeLabel = (label) => String(label).replace(/[•・‧∙]/g, '·').replace(/\s+/g, '');
const externalSet = new Set(EXTERNAL_CRITERIA.map(normalizeLabel));
const ignoredSet = new Set(CRITERIA_IGNORED.map(normalizeLabel));

// 설문4 에서 고른 옵션들 → 외적/내적 개수와 퍼센트 (퍼센트는 정수, 둘을 합치면 항상 100)
function criteriaShare(selected) {
  const list = (selected || []).filter((label) => !ignoredSet.has(normalizeLabel(label)));
  if (!list.length) return null;
  const external = list.filter((label) => externalSet.has(normalizeLabel(label))).length;
  const internal = list.length - external;
  const externalPercent = Math.round((external / list.length) * 100);
  const internalPercent = 100 - externalPercent;
  const { format } = RESULT_PLACEMENT.criteria;
  return {
    external, internal, externalPercent, internalPercent,
    text: format.replace('{외적}', externalPercent).replace('{내적}', internalPercent),
  };
}

// 설문3 에서 고른 옵션들 → '멈춤 • 포기 • 허탈함' (화면에 나온 순서 그대로)
const situationText = (selected) => (selected || []).join(RESULT_PLACEMENT.situation.separator);

// ----- '해석' 칸: AI 가 설문1~4 응답을 보고 쓰는 문장 -----
// 안내문은 interpretation-prompt.js, AI 호출은 서버(/api/interpret)가 맡습니다. 브라우저는 응답만 보내고 문장만 받습니다.
async function interpret(responses) {
  const { input } = fromSurvey(responses).interpretation;
  try {
    const res = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: input.sentence, situation: input.situation, criteria: input.criteria }),
    });
    if (!res.ok) return null;                 // 서버에 키가 없거나 AI 가 실패하면 null (결과지에서 해석 칸을 비워 두거나 대체 문구를 씀)
    return (await res.json()).text || null;
  } catch (err) {
    return null;
  }
}

// ----- 설문 응답 → 결과지에 들어갈 값 -----
function fromSurvey(responses) {
  const pick = (n) => {                          // answers 배열이든 surveyAnswers([{question, answer}])든 받음
    const item = responses[n];
    return item && typeof item === 'object' && !Array.isArray(item) && 'answer' in item ? item.answer : item;
  };
  const nickname = pick(0) || '';
  const sentence = pick(1) || '';
  const selectedSituation = pick(2) || [];
  const selectedCriteria = pick(3) || [];
  const input = { nickname, sentence, situation: selectedSituation, criteria: selectedCriteria };
  return {
    nickname,                                                         // → Nickname.render(nickname)
    sentence,                                                         // → Sentence.segment(sentence) 로 나눈 뒤 Sentence.render
    situation: situationText(selectedSituation),                      // 'Then' > 상황
    criteria: criteriaShare(selectedCriteria),                        // 'Then' > 판단 기준 (.text)
    interpretation: { input, prompt: InterpretationPrompt.prompt(input) },   // 실제 문장은 Result.interpret(응답) 으로 받음
  };
}

window.Result = {
  placement: RESULT_PLACEMENT, externalCriteria: EXTERNAL_CRITERIA, criteriaIgnored: CRITERIA_IGNORED,
  criteriaShare, situationText, interpretationExample: InterpretationPrompt.EXAMPLE, fromSurvey, interpret,
};
