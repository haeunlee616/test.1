// ---------- 설문 (질문 7개: 닉네임 + 설문2~7 시안) ----------
// type: 'nick'(닉네임, 한 줄) | 'text'(글로 답함) | 'choice'(박스를 골라서 답함) | 'colors'(당시·지금 색 고르기) | 'define'(이름과 뜻풀이 쓰기)
// theme: 선택한 박스·질문 번호의 색 — 'black'(Q1~Q4, 선택하면 회색 → 검정) / 'lime'(Q5~, 선택하면 회색 → 라임색)
// bg: 페이지 배경 — 'f1'(#F1F1F1) / 'ed'(#EDEDED) / 'white'(#FFFFFF)
// 질문 문구와 선택지는 시안(설문1_추가.svg, 설문2~7.svg) 그대로입니다. title 의 \n 은 줄바꿈입니다.
// qTop: 질문 번호 박스의 위쪽 위치(시안 px)
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
    type: 'nick',                       // 사전에 입력할 닉네임 (한 줄, 10자까지)
    theme: 'black',
    bg: 'f1',
    title: '사전에 입력할 닉네임을 적어주세요.',
    sub: '꼭 실명이 아니어도 괜찮아요 :)',
    max: 10,
    qTop: 306,
  },
  {
    type: 'text',
    theme: 'black',
    bg: 'f1',
    title: "최근 몇 년 사이,\n‘실패'라고 생각했던 경험이 있나요?",
    sub: '그 때 무슨 일이 있었는지 자유롭게 적어주세요.',
    placeholder: '원하는 회사에 지원했지만 최종 면접에서 떨어졌어요.',
    max: 30,                            // 띄어쓰기를 뺀 글자 수
    skipSpaces: true,
    qTop: 211,
  },
  {
    type: 'choice',
    theme: 'black',
    bg: 'ed',
    title: '그 때 나는 어떤 상황에 있었나요?',
    sub: '그 때의 나와 가장 가까운 단어를 <u>모두</u> 골라주세요.',
    qTop: 219,
    top: 415,
    rows: ROW6(Q2_OPTIONS),
    boxW: 87,
  },
  {
    type: 'choice',
    theme: 'black',
    bg: 'ed',
    title: "그 경험을 ‘실패'라고 생각하게 된 계기가 있나요?",
    sub: '해당되는 키워드를 <u>모두</u> 골라주세요.',
    qTop: 219,
    top: 421,
    rows: [
      ['타인과의 비교', '나만의 기준', '취업·합격 여부'],
      ['타인의 평가', '주변의 기대', '목표 도달률', '자기 실망'],
      ['정해진 나이와 시기', '기대와의 불일치', '사회적 기준'],
      ['경제적 성취', '조직이나 집단의 인정', '후회와 미련'],
    ],
  },
  {
    type: 'choice',
    theme: 'lime',
    bg: 'white',
    title: '반대로, 그 경험이 나에게 남긴 또다른 의미나 영향이 있나요?',
    sub: '지금의 나에게 남아 있는 변화나 의미와 가까운 것을 모두 골라주세요.',
    qTop: 231,
    top: 430,
    rows: ROW6(Q4_OPTIONS),
    boxW: 63,
  },
  {
    type: 'colors',
    theme: 'lime',
    bg: 'white',
    title: '실패를 겪었던 당시와 지금, 각각 어떤 색이 떠오르나요?\n한 가지씩 선택해 주세요.',
    sub: '',
    qTop: 220,
    panels: [{ key: 'then', label: '당시' }, { key: 'now', label: '지금' }],
  },
  {
    type: 'define',
    theme: 'lime',
    bg: 'white',
    title: "사전에 있는 ‘실패'라는 단어가 당신의 경험을 모두 설명하지 못한다면,\n지금의 당신은 이 경험에 어떤 이름을 붙이고 싶나요?",
    sub: '',
    qTop: 282,
    fields: [
      { key: 'word', label: '실패:', placeholder: '재시작, 새로운 시작' },
      { key: 'meaning', label: 'ㄴ뜻풀이:', placeholder: '끝인줄 알았지만 또다른 기회의 시작' },
    ],
  },
];

// 7페이지에 걸쳐 진행 바의 조각이 맨 왼쪽(Q1)에서 맨 오른쪽(Q7)까지 한 칸씩 이동
const MAX_CHARS = 100;     // 글로 답하는 질문의 기본 글자 수 (질문마다 max 로 바꿈)
const isTextual = (q) => q.type === 'text' || q.type === 'nick';        // 글자를 입력해서 답하는 질문
const maxChars = () => QUESTIONS[qi].max || MAX_CHARS;
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
const backBtn = document.getElementById('back-btn');
const qEl = document.getElementById('survey-q');
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
// 글자 수: skipSpaces 질문은 띄어쓰기(공백)를 세지 않음
const textLength = (q, text) => (q.skipSpaces ? chars(text).filter((c) => !/\s/.test(c)).length : chars(text).length);
// max 글자를 넘는 부분 자르기 (skipSpaces 질문은 max 번째 글자 뒤의 글자부터 자름)
function clampText(q, text, max) {
  if (!q.skipSpaces) return chars(text).slice(0, max).join('');
  let n = 0;
  let out = '';
  for (const c of chars(text)) {
    if (!/\s/.test(c) && ++n > max) break;
    out += c;
  }
  return out;
}

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

// 색 고르기 (Q6): 스와치 + 색상판(채도·명도) + 색상 막대 + HEX 입력 — 색을 세밀하게 고를 수 있음
// 맨 위 동그란 칸: 처음엔 비어 있고, 참여자가 그 패널에서 고른 마지막 색들이 왼쪽부터 쌓임 (최대 9개)
// '당시'와 '지금'은 각자 따로 기록하고, 참여자가 바뀌면(페이지를 새로 열면) 비워짐
const RECENT_MAX = 9;
const recentColors = { then: [], now: [] };
const recentRenderers = { then: new Set(), now: new Set() };
function pushRecent(key, hex) {
  const list = recentColors[key];
  const at = list.indexOf(hex);
  if (at !== -1) list.splice(at, 1);
  list.unshift(hex);
  list.length = Math.min(list.length, RECENT_MAX);
  recentRenderers[key].forEach((fn) => fn());
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}
function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
const normHex = (t) => {
  let x = t.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(x)) x = x.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(x) ? `#${x.toLowerCase()}` : null;
};
const EYEDROPPER_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M20.7 3.3a2.4 2.4 0 0 0-3.4 0l-2.4 2.4-1-1-1.4 1.4 1 1-8.2 8.2a2 2 0 0 0-.6 1.4V19l-1 2 2-1h2.3a2 2 0 0 0 1.4-.6l8.2-8.2 1 1 1.4-1.4-1-1 2.4-2.4a2.4 2.4 0 0 0 0-3.4zM8.9 18.1l-.4.4H6.3v-2.2l.4-.4 8.2-8.2 2.2 2.2-8.2 8.2z"/></svg>';

function buildColors(i, q) {
  const picked = { ...(answers[i] || {}) };
  colorsEl.innerHTML = '';
  Object.values(recentRenderers).forEach((set) => set.clear());
  q.panels.forEach((panel) => {
    const box = document.createElement('div');
    box.className = 'pc';
    box.innerHTML = `
      <div class="pc__label">${panel.label}</div>
      <div class="pc__swatches" role="group" aria-label="최근에 고른 색"></div>
      <div class="pc__main">
        <div class="pc__sv" tabindex="0" role="slider" aria-label="${panel.label} 채도와 명도"><div class="pc__knob"></div></div>
        <div class="pc__hue" tabindex="0" role="slider" aria-label="${panel.label} 색상"><div class="pc__bar"></div></div>
      </div>
      <div class="pc__hexrow">
        <button class="pc__eye" type="button" aria-label="화면에서 색 가져오기">${EYEDROPPER_SVG}</button>
        <input class="pc__hex" type="text" maxlength="7" spellcheck="false" placeholder="#E2453B" aria-label="${panel.label} HEX 색상 코드">
        <span class="pc__chip" aria-hidden="true"></span>
      </div>`;
    const swWrap = box.querySelector('.pc__swatches');
    const sv = box.querySelector('.pc__sv');
    const knob = box.querySelector('.pc__knob');
    const hue = box.querySelector('.pc__hue');
    const bar = box.querySelector('.pc__bar');
    const hexIn = box.querySelector('.pc__hex');
    const chip = box.querySelector('.pc__chip');
    const eye = box.querySelector('.pc__eye');

    const state = picked[panel.key] ? { ...hexToHsv(picked[panel.key]), set: true } : { h: 8, s: 0.7, v: 0.9, set: false };
    // 최근에 고른 색 칸: 고른 색이 있을 때만 동그라미가 생김 (누르면 그 색으로)
    function renderRecents() {
      swWrap.innerHTML = '';
      const now = state.set ? hsvToHex(state.h, state.s, state.v) : null;
      recentColors[panel.key].forEach((hex) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pc__sw';
        b.style.background = hex;
        b.setAttribute('aria-label', `최근에 고른 색 ${hex}`);
        b.classList.toggle('is-on', hex === now);
        b.addEventListener('click', () => { Object.assign(state, hexToHsv(hex), { set: true }); commit(true); });
        swWrap.appendChild(b);
      });
    }
    recentRenderers[panel.key].add(renderRecents);

    function paint(updateInput) {
      const hex = hsvToHex(state.h, state.s, state.v);
      sv.style.setProperty('--hue', `hsl(${state.h}, 100%, 50%)`);
      knob.style.left = `${state.s * 100}%`;
      knob.style.top = `${(1 - state.v) * 100}%`;
      bar.style.top = `${(state.h / 360) * 100}%`;
      box.classList.toggle('is-set', state.set);
      chip.style.background = state.set ? hex : 'transparent';
      if (updateInput) hexIn.value = state.set ? hex.toUpperCase() : '';
      [...swWrap.children].forEach((b, n) => b.classList.toggle('is-on', state.set && recentColors[panel.key][n] === hex));
      return hex;
    }
    function commit(updateInput) {
      const hex = paint(updateInput);
      picked[panel.key] = hex;
      answers[i] = { ...picked };
      updateNext();
    }
    // 색상판·색상 막대: 누르고 끌어서 고르기
    const drag = (el, move) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.focus({ preventScroll: true });
        const run = (ev) => { const r = el.getBoundingClientRect(); move(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height)); state.set = true; commit(true); };
        run(e);
        const onMove = (ev) => run(ev);
        const end = () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); pushRecent(panel.key, hsvToHex(state.h, state.s, state.v)); };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
      });
    };
    drag(sv, (x, y) => { state.s = x; state.v = 1 - y; });
    drag(hue, (x, y) => { state.h = y * 360; });
    // 키보드·HEX 입력은 잠깐 멈췄을 때의 색을 '고른 색'으로 기록
    let settleTimer = null;
    const settle = () => { clearTimeout(settleTimer); settleTimer = setTimeout(() => pushRecent(panel.key, hsvToHex(state.h, state.s, state.v)), 700); };
    // 키보드: 화살표로 조금씩
    sv.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] }[e.key];
      if (!d) return;
      e.preventDefault();
      state.s = clamp01(state.s + d[0]); state.v = clamp01(state.v + d[1]); state.set = true; commit(true); settle();
    });
    hue.addEventListener('keydown', (e) => {
      const d = { ArrowUp: -4, ArrowDown: 4 }[e.key];
      if (!d) return;
      e.preventDefault();
      state.h = (state.h + d + 360) % 360; state.set = true; commit(true); settle();
    });
    // HEX 직접 입력
    hexIn.addEventListener('input', () => {
      const hex = normHex(hexIn.value);
      if (!hex) return;
      Object.assign(state, hexToHsv(hex), { set: true });
      commit(false);
      settle();
    });
    hexIn.addEventListener('blur', () => { if (state.set) hexIn.value = hsvToHex(state.h, state.s, state.v).toUpperCase(); });
    // 스포이드: 화면의 색 가져오기 (지원하는 브라우저만)
    eye.addEventListener('click', async () => {
      if (!window.EyeDropper) { hexIn.focus(); return; }
      try {
        const r = await new window.EyeDropper().open();
        const hex = normHex(r.sRGBHex);
        if (hex) { Object.assign(state, hexToHsv(hex), { set: true }); commit(true); pushRecent(panel.key, hex); }
      } catch (e) { /* 취소 */ }
    });

    renderRecents();
    paint(true);
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

// Q8 배경에 흩어져 있는 단어 박스 (시안 위치 그대로)
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
    el.className = `deco-word ${color} f-pretendard`;
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
  surveyEl.dataset.kind = q.type;
  qEl.style.top = `calc(${q.qTop} * var(--u))`;
  backBtn.hidden = i === 0;
  layerEl.dataset.bg = q.bg;
  badgeEl.textContent = `Q${i + 1}`;
  titleEl.textContent = q.title;
  subEl.innerHTML = q.sub || '';
  subEl.hidden = !q.sub;

  answerBox.hidden = !isTextual(q);
  countEl.hidden = !isTextual(q);
  choicesEl.hidden = q.type !== 'choice';
  colorsEl.hidden = q.type !== 'colors';
  defineEl.hidden = q.type !== 'define';
  decoEl.hidden = q.type !== 'define';

  if (isTextual(q)) {
    answerEl.placeholder = q.placeholder || '';
    answerEl.value = answers[i] || '';
    countEl.textContent = `(${textLength(q, answerEl.value)}/${maxChars()})`;
  } else if (q.type === 'choice') {
    buildChoices(i, q);
  } else if (q.type === 'colors') {
    buildColors(i, q);
  } else if (q.type === 'define') {
    buildDefine(i, q);
    buildDeco();
  }
  nextBtn.textContent = i === QUESTIONS.length - 1 ? 'done' : 'next';
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
    if (isTextual(QUESTIONS[i])) answerEl.focus({ preventScroll: true });
    if (QUESTIONS[i].type === 'define') defineEl.querySelector('input').focus({ preventScroll: true });
  }, 260);
}

// ---------- 다음 버튼: 답이 있어야 켜짐 ----------
function isAnswered(i) {
  const q = QUESTIONS[i];
  const a = answers[i];
  if (isTextual(q)) return answerEl.value.trim().length > 0;
  if (q.type === 'choice') return Array.isArray(a) && a.length > 0;
  if (q.type === 'colors') return !!(a && a.then && a.now);
  if (q.type === 'define') return !!(a && a.word && a.word.trim() && a.meaning && a.meaning.trim());
  return false;
}
function updateNext() {
  nextBtn.disabled = !isAnswered(qi) || finished;
}

// ---------- 글 입력: 설문2는 띄어쓰기 빼고 30자까지, 닉네임은 10자 ----------
function enforceLimit() {
  const q = QUESTIONS[qi];
  const max = maxChars();
  if (textLength(q, answerEl.value) > max) {
    const text = clampText(q, answerEl.value, max);
    const pos = Math.min(answerEl.selectionStart, chars(text).length);
    answerEl.value = text;
    answerEl.setSelectionRange(pos, pos);
  }
}
function onAnswerInput() {
  countEl.textContent = `(${textLength(QUESTIONS[qi], answerEl.value)}/${maxChars()})`;
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

// ---------- 배경이 흰색으로 바뀌는 질문(Q5): 라임색 원이 next 버튼에서 퍼졌다가 흰색으로 식음 ----------
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

// ---------- 다음 ----------
function goNext() {
  if (wiping) return;
  if (nextBtn.disabled || finished) return;
  if (qi < QUESTIONS.length - 1) {
    if (QUESTIONS[qi + 1].bg === 'white' && QUESTIONS[qi].bg !== 'white') limeWipe(qi + 1);
    else showQuestion(qi + 1);
  } else {
    finished = true;
    recentColors.then.length = 0;   // 참여자가 끝났으니 최근 색 기록은 비움 (다음 참여자에게 보이지 않게)
    recentColors.now.length = 0;
    setBar(qi, true);
    nextBtn.textContent = 'done ✓';
    nextBtn.disabled = true;
    document.body.classList.add('survey-done');
    window.surveyAnswers = QUESTIONS.map((q, n) => ({ question: q.title.replace(/\n/g, ' '), answer: answers[n] }));
    console.log('survey answers', window.surveyAnswers);
  }
}
nextBtn.addEventListener('click', goNext);

// 이전 질문으로: 답은 그대로 남아 있음
function goBack() {
  if (wiping || finished || qi === 0) return;
  showQuestion(qi - 1);
}
backBtn.addEventListener('click', goBack);
answerEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && QUESTIONS[qi].type === 'nick' && !e.isComposing) { e.preventDefault(); goNext(); }   // 한 줄 입력: 줄바꿈 대신 다음으로
});
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
    if (isTextual(QUESTIONS[qi])) answerEl.focus({ preventScroll: true });
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
