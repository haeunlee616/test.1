// ---------- 설문 (질문 7개) ----------
// type: 'text'(글로 답함) | 'choice'(박스를 골라서 답함) | 'colors'(당시·지금 색 고르기) | 'define'(이름과 뜻풀이 쓰기)
// theme: 선택한 박스·질문 번호의 색 — 'black'(Q1~Q3, 선택하면 회색 → 검정) / 'lime'(Q4~, 선택하면 회색 → 라임색)
// bg: 페이지 배경 — 'f1'(#F1F1F1) / 'ed'(#EDEDED) / 'white'(#FFFFFF)
// 질문 문구와 선택지는 시안(설문페이지/설문1~7.svg) 그대로입니다. title 의 \n 은 줄바꿈입니다.
const ROW6 = (list) => [list.slice(0, 6), list.slice(6, 12), list.slice(12, 18), list.slice(18, 24)];

const Q2_OPTIONS = [
  '멈춤', '직진', '기다림', '도전', '놓음', '돌아섬',
  '망설임', '혼자', '함께', '붙잡음', '포기', '반복',
  '기대', '불안', '긴장', '초조', '막막함', '답답함',
  '후회', '슬픔', '두려움', '허탈함', '담담함', '설렘',
];
const Q4_OPTIONS = [
  '겸손', '인내', '계기', '시작', '확장', '독립',
  '경험', '토대', '성숙', '유연', '인정', '성장',
  '배움', '도전', '이해', '변화', '발견', '태도',
  '동력', '기회', '용기', '수용', '방향', '관점',
];

const QUESTIONS = [
  {
    type: 'text',
    theme: 'black',
    bg: 'f1',
    title: "최근 몇 년 사이,\n‘실패'라고 생각했던 경험이 있나요?",
    sub: '그 때 무슨 일이 있었는지 자유롭게 적어주세요.',
    placeholder: '원하는 회사에 지원했지만 최종 면접에서 떨어졌어요.',
  },
  {
    type: 'choice',
    theme: 'black',
    bg: 'ed',
    title: '그 때 나는 어떤 상황에 있었나요?',
    sub: '그 때의 나와 가장 가까운 단어를 골라주세요.',
    top: 414,
    rows: ROW6(Q2_OPTIONS),
    boxW: 86,
  },
  {
    type: 'choice',
    theme: 'black',
    bg: 'ed',
    title: "그 경험을 ‘실패'라고 생각하게 된 계기가 있나요?",
    sub: '해당되는 키워드를 <u>모두</u> 골라주세요.',
    top: 420,
    rows: [
      ['타인과의 비교', '나만의 기준', '취업 · 합격 여부'],
      ['타인의 평가', '주변의 기대', '목표 도달률', '자기 실망'],
      ['정해진 나이와 시기', '기대와의 불일치', '사회적 기준'],
    ],
  },
  {
    type: 'choice',
    theme: 'lime',
    bg: 'white',
    title: '반대로, 그 경험이 나에게 남긴 또다른 의미나 영향이 있나요?',
    sub: '지금의 나에게 남아 있는 변화나 의미와 가까운 것을 모두 골라주세요.',
    top: 418,
    rows: ROW6(Q4_OPTIONS),
    boxW: 62,
  },
  {
    // 시안의 설문5 는 설문4 와 질문·선택지가 똑같습니다 (질문 번호만 다름)
    type: 'choice',
    theme: 'lime',
    bg: 'white',
    title: '반대로, 그 경험이 나에게 남긴 또다른 의미나 영향이 있나요?',
    sub: '지금의 나에게 남아 있는 변화나 의미와 가까운 것을 모두 골라주세요.',
    top: 418,
    rows: ROW6(Q4_OPTIONS),
    boxW: 62,
  },
  {
    type: 'colors',
    theme: 'lime',
    bg: 'white',
    title: '실패를 겪었던 당시와 지금, 각각 어떤 색이 떠오르나요?\n한 가지씩 선택해 주세요.',
    sub: '',
    panels: [{ key: 'then', label: '당시' }, { key: 'now', label: '지금' }],
  },
  {
    type: 'define',
    theme: 'lime',
    bg: 'white',
    title: "사전에 있는 ‘실패'라는 단어가 당신의 경험을 모두 설명하지 못한다면,\n지금의 당신은 이 경험에 어떤 이름을 붙이고 싶나요?",
    sub: '',
    fields: [
      { key: 'word', label: '실패:', placeholder: '재시작, 새로운 시작' },
      { key: 'meaning', label: 'ㄴ뜻풀이:', placeholder: '끝인줄 알았지만 또다른 기회의 시작' },
    ],
  },
];

// 7페이지에 걸쳐 진행 바의 조각이 맨 왼쪽(Q1)에서 맨 오른쪽(Q7)까지 한 칸씩 이동
const MAX_CHARS = 200;     // Q1 시안의 (0/200)
const BAR_PILL_PX = 54;    // 진행 표시 조각의 길이
const BAR_FULL_PX = 410;   // 바 전체 길이

const surveyEl = document.getElementById('survey');
const layerEl = document.getElementById('survey-layer');
const badgeEl = document.getElementById('survey-badge');
const titleEl = document.getElementById('survey-title');
const subEl = document.getElementById('survey-sub');
const answerBox = document.getElementById('answer-box');
const answerEl = document.getElementById('answer');
const countEl = document.getElementById('count');
const choicesEl = document.getElementById('choices');
const colorsEl = document.getElementById('colors');
const defineEl = document.getElementById('define');
const decoEl = document.getElementById('deco');
const nextBtn = document.getElementById('next-btn');
const barEl = document.getElementById('survey-bar');
const barFill = document.getElementById('bar-fill');

const answers = [];
let qi = 0;
let surveyStarted = false;
let finished = false;

// ---------- 진행 바 ----------
function setBar(index, done = false) {
  const steps = QUESTIONS.length - 1;
  const left = done ? 0 : ((BAR_FULL_PX - BAR_PILL_PX) * index) / steps;
  const width = done ? BAR_FULL_PX : BAR_PILL_PX;
  barFill.style.left = `${(left / BAR_FULL_PX) * 100}%`;
  barFill.style.width = `${(width / BAR_FULL_PX) * 100}%`;
  barEl.setAttribute('aria-valuenow', String(done ? 100 : Math.round(((index + 1) / QUESTIONS.length) * 100)));
}

// ---------- 질문별 화면 만들기 ----------
const chars = (text) => Array.from(text);

function buildChoices(i, q) {
  const picked = new Set(answers[i] || []);
  choicesEl.style.top = `calc(${q.top} * var(--u))`;
  choicesEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'choices__rows';
  if (q.boxW) wrap.style.setProperty('--box-w', `calc(${q.boxW} * var(--u))`);
  q.rows.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'choices__row';
    row.forEach((label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', picked.has(label) ? 'true' : 'false');
      btn.classList.toggle('is-on', picked.has(label));
      btn.addEventListener('click', () => {
        const on = !btn.classList.contains('is-on');
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', String(on));
        if (on) picked.add(label); else picked.delete(label);
        // 화면에 나온 순서대로 저장
        answers[i] = q.rows.flat().filter((l) => picked.has(l));
        updateNext();
      });
      rowEl.appendChild(btn);
    });
    wrap.appendChild(rowEl);
  });
  choicesEl.appendChild(wrap);
}

// 색 고르기: 12개 색상 열 × (흰색→검정 한 줄 + 어두움→밝음 9줄) 의 색 격자
const GRID_HUES = [195, 216, 255, 283, 325, 6, 22, 38, 46, 57, 68, 98];
const GRID_LIGHTS = [15, 24, 33, 42, 50, 60, 70, 80, 91];
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}
const PALETTE = (() => {
  const cells = [];
  for (let c = 0; c < 12; c++) {
    const v = Math.round(255 * (1 - c / 11)).toString(16).padStart(2, '0');
    cells.push(`#${v}${v}${v}`);
  }
  GRID_LIGHTS.forEach((l) => GRID_HUES.forEach((h) => cells.push(hslToHex(h, 100, l))));
  return cells;
})();

function buildColors(i, q) {
  const picked = { ...(answers[i] || {}) };
  colorsEl.innerHTML = '';
  q.panels.forEach((panel) => {
    const box = document.createElement('div');
    box.className = 'cp';
    box.innerHTML = `<div class="cp__head"><span class="cp__label">${panel.label}</span><span class="cp__chip" aria-hidden="true"></span></div><div class="cp__grid" role="radiogroup" aria-label="${panel.label} 색"></div>`;
    const chip = box.querySelector('.cp__chip');
    const grid = box.querySelector('.cp__grid');
    const paint = () => {
      chip.style.background = picked[panel.key] || 'transparent';
      chip.classList.toggle('has-color', !!picked[panel.key]);
    };
    PALETTE.forEach((hex) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cp__cell';
      cell.style.background = hex;
      cell.setAttribute('role', 'radio');
      cell.setAttribute('aria-label', hex);
      cell.setAttribute('aria-checked', picked[panel.key] === hex ? 'true' : 'false');
      cell.classList.toggle('is-on', picked[panel.key] === hex);
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.cp__cell.is-on').forEach((c) => { c.classList.remove('is-on'); c.setAttribute('aria-checked', 'false'); });
        cell.classList.add('is-on');
        cell.setAttribute('aria-checked', 'true');
        picked[panel.key] = hex;
        answers[i] = { ...picked };
        paint();
        updateNext();
      });
      grid.appendChild(cell);
    });
    paint();
    colorsEl.appendChild(box);
  });
}

function buildDefine(i, q) {
  const saved = answers[i] || {};
  defineEl.innerHTML = '';
  q.fields.forEach((f, n) => {
    const row = document.createElement('label');
    row.className = `def-row def-row--${n + 1}`;
    row.innerHTML = '<span class="def-row__label"></span><input class="def-row__input" type="text" maxlength="60" spellcheck="false">';
    row.querySelector('.def-row__label').textContent = f.label;
    const input = row.querySelector('input');
    input.placeholder = f.placeholder;
    input.value = saved[f.key] || '';
    input.addEventListener('input', () => {
      answers[i] = { ...(answers[i] || {}), [f.key]: input.value };
      updateNext();
    });
    defineEl.appendChild(row);
  });
}

// Q7 배경에 흩어져 있는 단어 박스 (시안 위치 그대로)
const DECO = [
  ['실수', 279, 119, 67, 'c-cyan'], ['탈락', 1294, 154, 67, 'c-green'], ['실패', 80, 203, 67, 'c-green'],
  ['불발', 1137, 214, 67, 'c-lilac'], ['낙방', 213, 334, 60, 'c-pink'], ['고배', 1237, 345, 60, 'c-pink'],
  ['패배', 114, 477, 67, 'c-yellow'], ['착오', 1321, 512, 67, 'c-cyan'], ['허탈', 1181, 611, 60, 'c-orange'],
  ['좌절', 54, 661, 60, 'c-lilac'], ['무산', 1211, 786, 67, 'c-yellow'], ['낭패', 245, 796, 67, 'c-orange'],
];
function buildDeco() {
  if (decoEl.childElementCount) return;
  DECO.forEach(([text, x, y, w, color], n) => {
    const el = document.createElement('div');
    el.className = `deco-word ${color} ${n % 2 ? 'f-pretendard' : 'f-dinaru'}`;
    el.textContent = text;
    el.style.left = `calc(${x} * var(--u))`;
    el.style.top = `calc(${y} * var(--u))`;
    el.style.width = `calc(${w} * var(--u))`;
    el.style.animationDelay = `${n * 60}ms`;
    decoEl.appendChild(el);
  });
}

// ---------- 질문 표시 ----------
function renderQuestion(i) {
  const q = QUESTIONS[i];
  qi = i;
  surveyEl.dataset.q = String(i + 1);
  surveyEl.dataset.theme = q.theme;
  layerEl.dataset.bg = q.bg;
  badgeEl.textContent = `Q${i + 1}`;
  titleEl.textContent = q.title;
  subEl.innerHTML = q.sub || '';
  subEl.hidden = !q.sub;

  answerBox.hidden = q.type !== 'text';
  countEl.hidden = q.type !== 'text';
  choicesEl.hidden = q.type !== 'choice';
  colorsEl.hidden = q.type !== 'colors';
  defineEl.hidden = q.type !== 'define';
  decoEl.hidden = q.type !== 'define';

  if (q.type === 'text') {
    answerEl.placeholder = q.placeholder || '';
    answerEl.value = answers[i] || '';
    countEl.textContent = `(${chars(answerEl.value).length}/${MAX_CHARS})`;
  } else if (q.type === 'choice') {
    buildChoices(i, q);
  } else if (q.type === 'colors') {
    buildColors(i, q);
  } else if (q.type === 'define') {
    buildDefine(i, q);
    buildDeco();
  }
  nextBtn.textContent = i === QUESTIONS.length - 1 ? 'Done' : 'Next';
  updateNext();
}

function showQuestion(i, instant) {
  setBar(i);
  if (instant) {
    renderQuestion(i);
    return;
  }
  surveyEl.classList.add('is-swapping');
  setTimeout(() => {
    renderQuestion(i);
    surveyEl.classList.remove('is-swapping');
    if (QUESTIONS[i].type === 'text') answerEl.focus({ preventScroll: true });
    if (QUESTIONS[i].type === 'define') defineEl.querySelector('input').focus({ preventScroll: true });
  }, 260);
}

// ---------- 다음 버튼: 답이 있어야 켜짐 ----------
function isAnswered(i) {
  const q = QUESTIONS[i];
  const a = answers[i];
  if (q.type === 'text') return answerEl.value.trim().length > 0;
  if (q.type === 'choice') return Array.isArray(a) && a.length > 0;
  if (q.type === 'colors') return !!(a && a.then && a.now);
  if (q.type === 'define') return !!(a && a.word && a.word.trim() && a.meaning && a.meaning.trim());
  return false;
}
function updateNext() {
  nextBtn.disabled = !isAnswered(qi) || finished;
}

// ---------- Q1: 공백 포함 200자까지 ----------
function enforceLimit() {
  const list = chars(answerEl.value);
  if (list.length > MAX_CHARS) {
    const pos = Math.min(answerEl.selectionStart, MAX_CHARS);
    answerEl.value = list.slice(0, MAX_CHARS).join('');
    answerEl.setSelectionRange(pos, pos);
  }
}
function onAnswerInput() {
  countEl.textContent = `(${chars(answerEl.value).length}/${MAX_CHARS})`;
  answers[qi] = answerEl.value;
  updateNext();
}
answerEl.addEventListener('input', (e) => {
  if (!e.isComposing) enforceLimit(); // 한글 조합 중에는 자르지 않고, 조합이 끝나면 자름
  onAnswerInput();
});
answerEl.addEventListener('compositionend', () => {
  enforceLimit();
  onAnswerInput();
});

// ---------- 배경이 흰색으로 바뀌는 질문(Q4): 라임색 원이 Next 버튼에서 퍼졌다가 흰색으로 식음 ----------
const WIPE_COVER_MS = 1000;  // 라임 원이 화면을 덮는 시간
const WIPE_HOLD_MS = 450;    // 라임 한 색으로 꽉 찬 채로 머무는 시간
const WIPE_OPEN_MS = 950;    // 같은 자리에서 흰색 구멍이 퍼지며 라임을 밀어내는 시간
let wiping = false;
function limeWipe(next) {
  wiping = true;
  nextBtn.disabled = true;
  setBar(next);
  surveyEl.classList.add('is-swapping');

  const r = nextBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 4;
  const wipe = document.createElement('div');
  wipe.className = 'survey-wipe';
  wipe.style.background = '#e8ff8e';
  layerEl.appendChild(wipe);

  const spread = wipe.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${radius}px at ${x}px ${y}px)` }],
    { duration: WIPE_COVER_MS, easing: 'cubic-bezier(0.6, 0, 0.2, 1)', fill: 'forwards' }
  );
  spread.onfinish = () => {
    renderQuestion(next);                       // 라임에 완전히 덮인 동안 다음 질문·흰 배경으로 교체
    setTimeout(() => {
      const t0 = performance.now();
      let revealed = false;
      const step = (now) => {
        const t = Math.min((now - t0) / WIPE_OPEN_MS, 1);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // easeInOutCubic
        const hole = e * radius;
        const mask = `radial-gradient(circle at ${x}px ${y}px, transparent ${hole}px, #000 ${hole + 1}px)`;
        wipe.style.webkitMaskImage = mask;
        wipe.style.maskImage = mask;
        if (!revealed && t > 0.4) { revealed = true; surveyEl.classList.remove('is-swapping'); }
        if (t < 1) requestAnimationFrame(step);
        else { wipe.remove(); wiping = false; updateNext(); }
      };
      requestAnimationFrame(step);
    }, WIPE_HOLD_MS);
  };
}

// ---------- Q4 -> Q5: 내용(그래픽) 뒤로 라임색 원이 Next 버튼에서 퍼져나감 ----------
const BLOOM_MS = 1300;
const BLOOM_FADE_MS = 500;
function limeBloom(next) {
  wiping = true;
  nextBtn.disabled = true;
  const r = nextBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 4;
  const bloom = document.createElement('div');
  bloom.className = 'survey-wipe survey-wipe--behind';
  bloom.style.background = '#e8ff8e';
  layerEl.insertBefore(bloom, layerEl.firstChild);   // 질문·박스 뒤, 배경 위

  showQuestion(next);                                // 내용은 평소처럼 바뀌고, 그 뒤에서 원이 퍼짐
  bloom.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${radius}px at ${x}px ${y}px)` }],
    { duration: BLOOM_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
  ).onfinish = () => {
    bloom.animate([{ opacity: 1 }, { opacity: 0 }], { duration: BLOOM_FADE_MS, easing: 'ease-out', fill: 'forwards' })
      .onfinish = () => { bloom.remove(); wiping = false; updateNext(); };
  };
}

// ---------- 다음 ----------
function goNext() {
  if (wiping) return;
  if (nextBtn.disabled || finished) return;
  if (qi < QUESTIONS.length - 1) {
    if (QUESTIONS[qi + 1].bg === 'white' && QUESTIONS[qi].bg !== 'white') limeWipe(qi + 1);
    else if (qi === 3) limeBloom(qi + 1);
    else showQuestion(qi + 1);
  } else {
    finished = true;
    setBar(qi, true);
    nextBtn.textContent = 'Done ✓';
    nextBtn.disabled = true;
    document.body.classList.add('survey-done');
    window.surveyAnswers = QUESTIONS.map((q, n) => ({ question: q.title.replace(/\n/g, ' '), answer: answers[n] }));
    console.log('survey answers', window.surveyAnswers);
  }
}
nextBtn.addEventListener('click', goNext);
surveyEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); goNext(); }
});

// ---------- Let's start → 이어지는 설문 페이지가 아래에서 올라옴 ----------
// 책이 있던 화면은 위로 밀려 올라가고, 설문 페이지가 아래에서 같이 올라와 그 자리를 채움. 일정한 속도(가속·튕김 없음).
const LEAVE_MS = 450;   // 버튼이 가운데로 모이며 사라지는 시간 (이후 페이지가 올라오기 시작)
const RISE_MS = 950;    // 페이지가 올라오는 시간

function riseToSurvey() {
  const stage = document.querySelector('.stage');
  const layer = document.getElementById('survey-layer');
  const h = window.innerHeight;

  document.body.classList.add('is-survey');
  const defineLayer = document.getElementById('define-layer');
  if (document.body.classList.contains('is-define')) {
    // 사전 종이 화면이 위로 밀려 올라가고, 그 자리를 설문이 채움 (둘 다 일정한 속도)
    defineLayer.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }],
      { duration: RISE_MS, easing: 'linear', fill: 'forwards' },
    ).onfinish = () => { defineLayer.style.visibility = 'hidden'; };
    setTimeout(() => document.body.classList.remove('is-dark'), RISE_MS * 0.8);   // 설문은 밝은 배경이라 상단 메뉴·로고를 다시 검정으로
  } else {
    stage.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }],
      { duration: RISE_MS, easing: 'linear', fill: 'forwards' },
    );
  }
  const rise = layer.animate(
    [{ transform: `translateY(${h}px)` }, { transform: 'translateY(0)' }],
    { duration: RISE_MS, easing: 'linear' },
  );
  rise.onfinish = () => {
    stage.style.visibility = 'hidden';
    document.body.classList.add('survey-ready');
    surveyEl.setAttribute('aria-hidden', 'false');
    if (QUESTIONS[qi].type === 'text') answerEl.focus({ preventScroll: true });
  };
}

document.getElementById('start-btn').addEventListener('click', (e) => {
  e.preventDefault();
  if (surveyStarted) return;
  surveyStarted = true;
  if (window.lockBookView) window.lockBookView();

  showQuestion(0, true);
  document.body.classList.add('is-leaving'); // 버튼이 가운데로 모이며 사라지고, 가운데 문구도 사라지고, 책이 반듯해짐
  // 책 장면이 위로 올라가고 그 자리를 사전 종이 화면이 채움 → 손동작 → 취소선 → 구겨짐 → 설문 (define.js)
  setTimeout(() => (window.startDefine ? window.startDefine(riseToSurvey) : riseToSurvey()), LEAVE_MS);
});
