// ---------- 결과지 '해석' 칸을 쓰는 AI 에게 줄 안내문 ----------
// 서버(server.js)와 브라우저(result.js)가 같이 쓰는 파일입니다. 실제 안내문은 서버가 직접 만들어 AI 에 보내므로 브라우저에서 바꿀 수 없습니다.
(function (root) {
  const EXAMPLE = {
    nickname: 'H.E',
    sentence: '원하는 회사에 지원했지만 최종 면접에서 떨어졌어요',
    situation: ['멈춤', '포기', '허탈함'],
    criteria: ['취업·합격 여부', '자기 실망', '사회적 기준', '후회와 미련'],
    interpretation: '기대했던 취업이나 합격의 결과에 도달하지 못하며, 스스로에 대한 실망과 허탈함 속에 한동안 멈춰 서게 된 순간. 사회가 정한 기준과 자신의 기대에 미치지 못했다는 생각이 실패라는 판단으로 이어졌다.',
  };
  const SYSTEM = [
    '당신은 "실패 사전"의 뜻풀이를 쓰는 편집자입니다. 참여자가 겪은 실패를 사전 항목의 해석 문장으로 정리합니다.',
    '규칙:',
    '- 두 문장, 공백 포함 100~120자. 첫 문장은 무슨 일이 있었고 그때 어떤 상태였는지, 둘째 문장은 그 일을 왜 실패라고 판단하게 됐는지를 씁니다.',
    '- 설문 응답(문장·당시 상태·실패라고 생각한 계기)에 나온 내용만 근거로 삼고, 없는 사실을 지어내지 않습니다.',
    '- 문체는 사전 뜻풀이처럼 담담한 평서문("~한 순간.", "~으로 이어졌다.")입니다. 존댓말·조언·위로·평가·과장 표현·물음표·느낌표는 쓰지 않습니다.',
    '- 닉네임과 "나·저" 같은 1인칭은 쓰지 않고, 퍼센트 숫자도 쓰지 않습니다.',
    '- 고른 단어(예: 멈춤·허탈함)는 문장 안에 자연스럽게 풀어 쓰되 그대로 나열하지 않습니다.',
    '- 문장만 출력합니다. 따옴표·제목·설명은 붙이지 않습니다.',
  ].join('\n');
  const input = (a) => [
    `겪은 일: ${a.sentence}`,
    `당시 상태: ${(a.situation || []).join(', ')}`,
    `실패라고 생각한 계기: ${(a.criteria || []).join(', ')}`,
  ].join('\n');
  // AI 에 보낼 { system, messages } — 예시 한 쌍을 함께 넣어 문체를 맞춤
  const prompt = (a) => ({
    system: SYSTEM,
    messages: [
      { role: 'user', content: input(EXAMPLE) },
      { role: 'assistant', content: EXAMPLE.interpretation },
      { role: 'user', content: input(a) },
    ],
  });

  const api = { EXAMPLE, SYSTEM, input, prompt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.InterpretationPrompt = api;
})(typeof window !== 'undefined' ? window : globalThis);
