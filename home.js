// contact / about 은 지금은 자리표시 링크(#contact, #about)입니다.
// 연결할 페이지가 정해지면 아래 주소만 바꾸면 됩니다.
const LINKS = {
  'contact-btn': '#contact',
  'about-btn': '#about',
};

for (const [id, href] of Object.entries(LINKS)) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('href', href);
}

// ---------- 넘어가는 장(leaf): 모서리부터 들리며 대각선 접힘선이 쓸고 지나가는 종이 말림 ----------
// 접힘선: n·p = s (p 는 책등 왼쪽 위를 원점으로 한 종이 위의 좌표, y 는 아래쪽이 +).
//  - 시작: 위쪽 오른쪽 모서리를 스치는 대각선(n 이 오른쪽 위를 향함, 45°)
//  - 진행하면서 n 이 점점 수평(0°)으로 눕고 s 가 0 으로 줄어, 마지막엔 접힘선이 책등(x=0)과 겹침
//  - 접힘선 너머 부분(flap)은 접힘선을 기준으로 뒤집어 그리고(반사 행렬), 남은 부분(stay)은 그대로 둠
const CURL_START_ANGLE = Math.PI / 4;

function clipHalfPlane(poly, nx, ny, s, keepGreater) {
  const sign = keepGreater ? 1 : -1;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i];
    const B = poly[(i + 1) % poly.length];
    const da = sign * (nx * A.x + ny * A.y - s);
    const db = sign * (nx * B.x + ny * B.y - s);
    if (da >= 0) out.push(A);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
    }
  }
  return out;
}
const polyCss = (pts) => (pts.length >= 3
  ? `polygon(${pts.map((q) => `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`).join(',')})`
  : 'polygon(0 0, 0 0, 0 0)');

// 종이 두께: 들려 있는 면(flap) 뒤에 같은 모양의 가장자리 층을 조금씩 어긋나게 깔아서, 얇은 종이의 단면이 보이게 함
const RIM_COLORS = ['#8f8a78', '#aaa591', '#cbc6b5']; // 가장 먼 층 → 가장 가까운 층 (종이 단면의 음영)
const RIM_STEP = 2.0;                                 // 층 하나당 두께 (디자인 px) — 들려 있을 때 전체 약 5px

function buildLeaf(leaf) {
  const { front, back } = leaf.dataset;
  const rims = RIM_COLORS.map((color) => `<div class="leaf__flap leaf__rim"><div class="leaf__rim-fill" style="background:${color};-webkit-mask-image:url('${back}');mask-image:url('${back}')"></div></div>`).join('');
  leaf.innerHTML = `
    <div class="leaf__stay"><img src="${front}" alt=""><div class="leaf__crease leaf__crease--stay"><i></i></div></div>
    <div class="leaf__flap-wrap">${rims}<div class="leaf__flap leaf__flap--face"><img src="${back}" alt=""><div class="leaf__crease leaf__crease--flap"><i></i></div></div></div>`;
  leaf._curl = {
    stay: leaf.querySelector('.leaf__stay'),
    wrap: leaf.querySelector('.leaf__flap-wrap'),
    flap: leaf.querySelector('.leaf__flap--face'),
    rims: [...leaf.querySelectorAll('.leaf__rim')],
    creaseStay: leaf.querySelector('.leaf__crease--stay'),
    creaseFlap: leaf.querySelector('.leaf__crease--flap'),
    last: -1,
  };
}

function updateCurl(leaf, p) {
  const c = leaf._curl;
  const W = leaf.offsetWidth;
  const H = leaf.offsetHeight;
  if (!W || !H) return;
  const a = CURL_START_ANGLE * (1 - p);
  const nx = Math.cos(a);
  const ny = -Math.sin(a);
  const s = W * Math.cos(CURL_START_ANGLE) * (1 - p);
  const rect = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const stayPoly = clipHalfPlane(rect, nx, ny, s, false);
  const flapPoly = clipHalfPlane(rect, nx, ny, s, true);
  const hasStay = stayPoly.length >= 3 && p < 0.9995;
  const hasFlap = flapPoly.length >= 3 && p > 0.0005;

  c.stay.style.display = hasStay ? '' : 'none';
  c.stay.style.clipPath = polyCss(stayPoly);
  c.wrap.style.display = hasFlap ? '' : 'none';
  if (hasFlap) {
    // 접힘선을 기준으로 한 반사: p' = p - 2 (n·p - s) n
    const m = [1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, 2 * s * nx, 2 * s * ny];
    const matrix = `matrix(${m.map((v) => v.toFixed(5)).join(',')})`;
    const clip = polyCss(flapPoly);
    c.flap.style.clipPath = clip;
    c.flap.style.transform = matrix;
    const k = Math.sin(Math.PI * Math.min(1, p)); // 들려 있는 정도: 중간에 가장 높고 끝에는 책 위에 납작하게 내려앉음
    // 두께: 들려 있을수록(k) 단면이 더 두껍게 보이고, 책 위에 놓이면 사라짐
    const rimCount = c.rims.length;
    c.rims.forEach((rim, idx) => {
      const d = (rimCount - idx) * RIM_STEP * unit * Math.pow(k, 0.8);
      rim.style.clipPath = clip;
      rim.style.transform = `translate(${(d * -0.8).toFixed(2)}px, ${(d * 0.9).toFixed(2)}px) ${matrix}`;
    });
    c.wrap.style.filter = `drop-shadow(0 ${(5 * unit * k).toFixed(2)}px ${(10 * unit * k).toFixed(2)}px rgba(0,0,0,${(0.42 * k).toFixed(3)}))`;
  }
  const angle = (Math.atan2(ny, nx) * 180) / Math.PI;
  const tr = `translate(${(s * nx).toFixed(2)}px, ${(s * ny).toFixed(2)}px) rotate(${angle.toFixed(3)}deg)`;
  c.creaseStay.style.transform = tr;
  c.creaseFlap.style.transform = tr;
  const shade = Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.04)), 0.7);
  c.creaseStay.style.opacity = shade.toFixed(3);
  c.creaseFlap.style.opacity = shade.toFixed(3);  // 다 넘어가 놓이면 음영이 사라져 왼쪽 페이지가 깨끗하게 남음
}

// ---------- 사전이 펼쳐지는 동시에: 빈 장 여러 개가 한 장씩 촤라락 넘어간 뒤 목표 페이지가 나옴 ----------
// 표지가 열리는 도중부터 FAN_COUNT 장이 짧은 간격으로 차례로 말려 넘어감.
// 마지막 장의 뒷면이 목표(정의) 페이지이고, 그 장이 들리는 순간 아래에서 목표 오른쪽 페이지(노란 장)가 드러남.
const FAN_COUNT = 6;
const FAN_FLIP_MS = 740;      // 한 장이 넘어가는 시간
const FAN_STAGGER_MS = 120;   // 장과 장 사이 간격
const FAN_START_AFTER_OPEN_MS = 600; // 표지가 열리기 시작한 뒤 이만큼 지나면 촤라락 넘기기 시작 (표지가 다 열릴 즈음 마지막 장이 내려앉음)
(function createFanLeaves() {
  const anchor = document.querySelector('.leaf-1');
  for (let i = FAN_COUNT - 1; i >= 0; i--) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf leaf-fan';
    leaf.dataset.fan = i;
    leaf.dataset.front = 'assets/face-right-blank.png';
    leaf.dataset.back = i === FAN_COUNT - 1 ? 'assets/face-left-def.png' : 'assets/face-left-blank.png';
    anchor.insertAdjacentElement('afterend', leaf);
  }
})();

// 오른쪽에서는 먼저 넘어갈 장이 위에, 왼쪽에서는 나중에 넘어온 장이 위에 오도록 높이(z)를 넘어가는 동안 바꿔 줌
function setFanZ(leaf, p) {
  const i = Number(leaf.dataset.fan);
  const right = 1 + (FAN_COUNT - i) * 0.25;
  const left = 1 + (i + 1) * 0.25;
  const t = Math.min(1, Math.max(0, (p - 0.35) / 0.3));
  const mix = t * t * (3 - 2 * t);
  const z = right + (left - right) * mix + 2.2 * Math.sin(Math.PI * p);
  leaf.style.transform = `translateZ(${z.toFixed(3)}px)`;
}

function runFan() {
  const fans = [...document.querySelectorAll('.leaf-fan')];
  const pageNext = document.querySelector('.page-next');
  fans.forEach((leaf, i) => {
    leaf.style.visibility = 'visible';
    leaf.style.transition = `--p ${FAN_FLIP_MS}ms cubic-bezier(0.45, 0.05, 0.3, 1) ${i * FAN_STAGGER_MS}ms`;
  });
  void document.body.offsetWidth; // 보이게 한 직후 전환이 시작되도록 레이아웃 확정
  fans.forEach((leaf) => leaf.style.setProperty('--p', '1'));
  // 마지막 장이 들리기 시작하는 순간, 덮고 있던 빈 쪽을 치워 목표 오른쪽 페이지가 드러나게 함
  setTimeout(() => { pageNext.style.visibility = 'hidden'; }, (fans.length - 1) * FAN_STAGGER_MS + 40);
}

const curlLeaves = [...document.querySelectorAll('.leaf')];
curlLeaves.forEach((leaf) => {
  buildLeaf(leaf);
  updateCurl(leaf, 0);
  leaf._curl.last = 0;
  if (leaf.dataset.fan !== undefined) setFanZ(leaf, 0);
});
(function curlLoop() {
  for (const leaf of curlLeaves) {
    if (leaf.style.visibility !== 'visible') continue;
    const p = parseFloat(getComputedStyle(leaf).getPropertyValue('--p')) || 0;
    if (Math.abs(p - leaf._curl.last) > 0.0003) {
      leaf._curl.last = p;
      updateCurl(leaf, p);
      if (leaf.dataset.fan !== undefined) setFanZ(leaf, p);
    }
  }
  requestAnimationFrame(curlLoop);
})();

// ---------- 단어 박스 폰트: SM Dinaru Std / Pretendard Medium 을 반반 섞어 무작위 배정 ----------
// 두 트랙(이어 붙여 반복되는 두 장)에는 같은 배정을 적용해서 반복 이음매가 튀지 않게 함
const FONT_CLASSES = ['f-dinaru', 'f-pretendard'];
const tracks = document.querySelectorAll('.track');
const count = tracks[0].querySelectorAll('.word').length;
const assignment = Array.from({ length: count }, (_, i) => FONT_CLASSES[i % 2]);
for (let i = assignment.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [assignment[i], assignment[j]] = [assignment[j], assignment[i]];
}
tracks.forEach((track) => {
  track.querySelectorAll('.word').forEach((word, i) => word.classList.add(assignment[i]));
});

// ---------- CLICK TO OPEN ----------
const openBtn = document.getElementById('open-btn');
const stage = document.querySelector('.stage');
const termEl = document.getElementById('caption-term');
const typedEl = document.getElementById('typed');
const defEl = document.querySelector('.caption__def');
const ghostEl = document.querySelector('.caption__ghost');

// 하단 밑줄 문장: 위에서부터 차례로 타이핑 → 잠깐 머문 뒤 지우고 → 다음 문장 타이핑. i:true 는 기울임꼴
// exit: 'fade' = 페이드아웃, 'erase' = 백스페이스로 지움. pauseBefore: 해당 구간을 치기 전에 잠깐 멈추는 시간(ms)
const SENTENCES = [
  // hold/gap: 문장이 완성된 뒤 머무는 시간 / 지워진 뒤 다음 문장 시작까지 (기본값은 아래 HOLD_MS, BETWEEN_MS)
  { exit: 'fade', hold: 1000, gap: 0, segs: [{ t: '(1) the fact of someone or something not succeeding' }] },
  {
    exit: 'erase',
    segs: [
      { t: '(2) the fact of not doing something that.... ' },
      { t: 'blah blah blah', i: true, pauseBefore: 1500 },
    ],
  },
  {
    exit: 'fade',
    segs: [{ t: '(3) ...... But, what about you?' }],
    onStart: () => turnPage(), // (3)이 나오기 시작할 때 책이 한 페이지 넘어가고, 다 넘어가면 빈 페이지 문구 등장 + (3) 사라짐 + 버튼 등장
  },
];
const HOLD_MS = 2400;   // 문장이 완성된 뒤 읽히도록 머무는 시간
const ERASE_MS = 14;    // 백스페이스로 지울 때 글자당 시간
const TYPE_MS = 2000;   // 한 문장을 치는 데 걸리는 시간 (멈춤 제외)
const FADE_MS = 200;    // 페이드아웃 시간
const BETWEEN_MS = 350; // 지워진 뒤 다음 문장을 치기 시작하기까지
const LOOP = false;     // true 로 바꾸면 마지막 문장 뒤에 (1)부터 다시 반복

const WORDS_DURATION = 3200; // 단어 박스가 중앙으로 모이며 사라지는 시간(ms)
let opened = false;

function cssSeconds(name) {
  const v = getComputedStyle(stage).getPropertyValue(name).trim();
  return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
}

// 화면에 보이는 단어 박스들을 그 자리에서 떼어내, 책이 있는 중앙으로 천천히 모이게 하며 투명도를 낮춤.
// 레이어(z-index 1)가 책(z-index 2)보다 아래라서 박스들은 책 뒤로 들어감
function gatherWords() {
  const wordsRoot = document.querySelector('.words');
  const barH = document.querySelector('.bar').getBoundingClientRect().height;
  const u = barH / 60;
  const targetX = window.innerWidth / 2;
  const targetY = window.innerHeight / 2 - 5 - 30 * u;

  const layer = document.createElement('div');
  layer.className = 'words-fly';
  const animations = [];

  wordsRoot.querySelectorAll('.word').forEach((word) => {
    const r = word.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return;

    const cs = getComputedStyle(word);
    const fly = document.createElement('div');
    fly.className = 'fly';
    fly.textContent = word.textContent;
    Object.assign(fly.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      background: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
    });
    layer.appendChild(fly);

    const dx = targetX - (r.left + r.width / 2);
    const dy = targetY - (r.top + r.height / 2);
    const duration = WORDS_DURATION * (0.85 + Math.random() * 0.3);
    animations.push(
      fly.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
          { opacity: 0.9, offset: 0.3 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0, offset: 1 },
        ],
        {
          duration,
          delay: Math.random() * 350,
          easing: 'cubic-bezier(0.45, 0.05, 0.3, 1)',
          fill: 'forwards',
        },
      ),
    );
  });

  document.body.appendChild(layer);
  wordsRoot.style.display = 'none';
  Promise.all(animations.map((a) => a.finished)).then(() => layer.remove());
}

const plain = (segs) => segs.map((s) => s.t).join('');

function paint(el, segs, n) {
  el.textContent = '';
  let left = n;
  for (const s of segs) {
    if (left <= 0) break;
    const part = s.t.slice(0, left);
    left -= part.length;
    if (s.i) {
      const em = document.createElement('em');
      em.textContent = part;
      el.appendChild(em);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  }
}

function playSentence(idx) {
  const { segs, exit, onStart, hold, gap } = SENTENCES[idx];
  if (onStart) onStart();
  const text = plain(segs);
  const isLast = idx === SENTENCES.length - 1;
  paint(ghostEl, segs, text.length); // 전체 문장 폭만 미리 확보(보이지 않음)
  defEl.setAttribute('aria-label', text);
  typedEl.classList.add('is-typing');

  // 글자 수 기준 위치별 추가 멈춤 (구간 시작 직전)
  const pauseAt = new Map();
  let offset = 0;
  for (const seg of segs) {
    if (seg.pauseBefore) pauseAt.set(offset, seg.pauseBefore);
    offset += seg.t.length;
  }

  const next = () => setTimeout(() => playSentence((idx + 1) % SENTENCES.length), gap ?? BETWEEN_MS);

  // 글자 사이 간격: 무작위로 흔들리되 전체 합이 정확히 TYPE_MS 가 되도록 맞춤
  const weights = Array.from({ length: text.length - 1 }, (_, k) =>
    (text[k] === ' ' ? 1.3 : 1) * (0.7 + Math.random() * 0.6));
  const scale = TYPE_MS / weights.reduce((a, b) => a + b, 0);
  const gaps = weights.map((w) => w * scale);

  let n = 0;
  const type = () => {
    n += 1;
    paint(typedEl, segs, n);
    if (n < text.length) {
      setTimeout(type, (pauseAt.get(n) ?? 0) + gaps[n - 1]);
    } else if (!isLast || LOOP) {
      setTimeout(exit === 'fade' ? fade : erase, hold ?? HOLD_MS);
    } else {
      setTimeout(() => typedEl.classList.remove('is-typing'), 900);
    }
  };

  const fade = () => {
    typedEl.style.transitionDuration = `${FADE_MS}ms`;
    typedEl.classList.add('is-fading');
    setTimeout(() => {
      typedEl.textContent = '';
      typedEl.classList.remove('is-fading');
      next();
    }, FADE_MS);
  };

  const erase = () => {
    n -= 1;
    paint(typedEl, segs, n);
    if (n > 0) setTimeout(erase, ERASE_MS);
    else next();
  };

  type();
}

// ---------- 페이지 넘김 + 마지막 화면 ----------
function turnPage() {
  const leaf = document.querySelector('.leaf');
  const next = document.querySelector('.page-next');
  leaf.style.visibility = 'visible';
  next.style.visibility = 'visible';
  void leaf.offsetWidth; // 보이게 한 직후 전환이 시작되도록 레이아웃 확정
  document.body.classList.add('is-turned');
  // 페이지가 다 넘어가자마자(그리고 (3)을 다 치자마자) 책 중앙 문구가 뜸
  setTimeout(revealFinal, Math.max(cssSeconds('--turn-dur'), TYPE_MS));
}

function revealFinal() {
  document.body.classList.add('show-final');
  setTimeout(() => { trailOn = true; }, 900);
}

// ---------- 커서 끝에서 나란히 붙어 있다가 점점 멀어지는 단어 박스 ----------
// 맨 앞 박스는 커서 끝에 붙어 있고, 나머지 박스들은 커서가 실제로 지나간 경로를 따라 일렬로 늘어선다.
// 경로를 따라가므로 커서가 곡선을 그리면 박스들도 유연하게 휘어서 따라오고,
// 커서에서 멀어질수록 박스 사이 간격이 점점 커지며(빠르게 움직이면 더 늘어남) 투명도도 옅어진다.
const TRAIL_COUNT = 8;
const TRAIL_BOX_W = 52;        // 박스 폭(디자인 px)
const TRAIL_HEAD_DX = 14;      // 커서 끝에서 박스 왼쪽 위까지 (디자인 px)
const TRAIL_HEAD_DY = 20;
const TRAIL_STEP = 44;         // 맨 앞에서의 박스 중심 간 거리 — 박스 폭과 비슷해서 서로 붙어 있음
const TRAIL_GAP_GROWTH = 3;    // 멀어질수록 간격이 벌어지는 정도: (j번째 간격) = STEP + growth * (j-1)^2
const TRAIL_STRETCH_MAX = 0.5; // 빠르게 움직일 때 꼬리가 추가로 늘어나는 최대 비율
const SWAP_EVERY_PX = 55;      // 커서가 이만큼 움직일 때마다 박스 하나가 다른 단어로 바뀜
const SWAP_FADE_MS = 280;      // 바뀐 박스가 나타나는 시간

// 단어 풀: 맨 처음 화면에서 배경에 있던 단어 박스들(글자 + 색)
const wordPool = Array.from(document.querySelectorAll('.words .track:first-child .word')).map((w) => ({
  text: w.textContent.trim(),
  color: [...w.classList].find((c) => c.startsWith('c-')),
}));

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const trailEl = document.getElementById('trail');
// 각 박스가 커서 끝에서 경로를 따라 떨어져 있는 거리(디자인 px)
const trailOffsets = [0];
for (let i = 1; i < TRAIL_COUNT; i++) {
  trailOffsets.push(trailOffsets[i - 1] + TRAIL_STEP + TRAIL_GAP_GROWTH * Math.pow(i - 1, 2));
}
const trailBoxes = Array.from({ length: TRAIL_COUNT }, (_, i) => {
  const el = document.createElement('div');
  el.style.zIndex = String(TRAIL_COUNT - i); // 커서에 가까운 박스가 위로
  trailEl.appendChild(el);
  // 투명도: 맨 앞은 살짝 옅게, 가운데는 선명하게, 꼬리로 갈수록 점점 옅어져 사라지듯 이어짐
  const op = i === 0 ? 0.6 : 1 - 0.75 * Math.pow(i / (TRAIL_COUNT - 1), 2);
  return { el, op, ease: Math.max(0.12, 0.42 - i * 0.04), x: 0, y: 0, fade: 1, word: null };
});

function assignWord(box) {
  const inUse = new Set(trailBoxes.map((t) => t.word && t.word.text));
  const candidates = wordPool.filter((w) => !inUse.has(w.text));
  const word = randomFrom(candidates.length ? candidates : wordPool);
  box.word = word;
  box.el.className = `trail__word ${word.color} ${randomFrom(FONT_CLASSES)}`;
  box.el.textContent = word.text;
}
trailBoxes.forEach(assignWord);

let trailOn = false;
let pointer = null;
let path = [];            // 커서가 지나간 점들 (최신이 맨 앞)
let trailStarted = false;
let appear = 0;
let travelled = 0;
let speed = 0;            // 최근 커서 속도(px/프레임, 부드럽게 평균)
let lastFrame = performance.now();
let unit = 1;
const measureUnit = () => { unit = document.querySelector('.bar').getBoundingClientRect().height / 60; };
measureUnit();
window.addEventListener('resize', measureUnit);

// 처음 나타날 때는 시안처럼 커서 오른쪽 아래로 꼬리가 뻗은 일직선 경로를 깔아 둠
function seedPath(p) {
  const dx = 0.95;
  const dy = 0.3;
  path = [];
  for (let d = 12; d < 1600 * unit; d += 12) path.push({ x: p.x + dx * d, y: p.y + dy * d });
}

// 커서(맨 앞)에서 경로를 따라 distance 만큼 떨어진 점
function pointAlongPath(distance) {
  let prev = pointer;
  let remaining = distance;
  for (const pt of path) {
    const seg = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    if (seg >= remaining) {
      const t = seg === 0 ? 0 : remaining / seg;
      return { x: prev.x + (pt.x - prev.x) * t, y: prev.y + (pt.y - prev.y) * t };
    }
    remaining -= seg;
    prev = pt;
  }
  return prev;
}

window.addEventListener('mousemove', (e) => {
  const p = { x: e.clientX, y: e.clientY };
  const first = !pointer;
  const from = pointer;
  pointer = p;
  if (!trailOn) return;
  if (first || path.length === 0) seedPath(p);
  if (from) {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    travelled += d;
    // 지나간 경로를 일정 간격으로 기록 (너무 촘촘하지 않게)
    const newest = path[0];
    if (!newest || Math.hypot(p.x - newest.x, p.y - newest.y) >= 3 * unit) path.unshift({ x: p.x, y: p.y });
    if (path.length > 900) path.length = 900;
  }
  // 움직인 만큼 박스가 하나씩 다른 단어로 교체됨
  while (travelled >= SWAP_EVERY_PX) {
    travelled -= SWAP_EVERY_PX;
    const box = randomFrom(trailBoxes);
    assignWord(box);
    box.fade = 0;
  }
});

let lastPointerForSpeed = null;
function trailFrame(now) {
  const dt = Math.min(64, now - lastFrame);
  lastFrame = now;

  if (trailOn && pointer) {
    if (!trailStarted) {
      if (path.length === 0) seedPath(pointer);
      trailStarted = true;
      trailBoxes.forEach((box, i) => {
        const pt = pointAlongPath(trailOffsets[i] * unit);
        box.x = pt.x + TRAIL_HEAD_DX * unit;
        box.y = pt.y + TRAIL_HEAD_DY * unit;
      });
    }
    appear = Math.min(1, appear + dt / 500);

    const moved = lastPointerForSpeed ? Math.hypot(pointer.x - lastPointerForSpeed.x, pointer.y - lastPointerForSpeed.y) : 0;
    lastPointerForSpeed = { x: pointer.x, y: pointer.y };
    speed += (moved / (dt / 16.67) - speed) * 0.15;
    const stretch = 1 + Math.min(TRAIL_STRETCH_MAX, speed / 60);

    trailBoxes.forEach((box, i) => {
      const pt = pointAlongPath(trailOffsets[i] * unit * stretch);
      const tx = pt.x + TRAIL_HEAD_DX * unit;
      const ty = pt.y + TRAIL_HEAD_DY * unit;
      const k = 1 - Math.pow(1 - box.ease, dt / 16.67);
      box.x += (tx - box.x) * k;
      box.y += (ty - box.y) * k;
      box.fade = Math.min(1, box.fade + dt / SWAP_FADE_MS);
      box.el.style.width = `${TRAIL_BOX_W * unit}px`;
      box.el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
      box.el.style.opacity = String(box.op * appear * box.fade);
    });
  }
  requestAnimationFrame(trailFrame);
}
requestAnimationFrame(trailFrame);

openBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (opened) return;
  opened = true;

  document.body.classList.add('is-open');
  document.querySelector('.page-next').style.visibility = 'visible'; // 열리는 동안 오른쪽에는 빈 쪽이 보이고, 목표 페이지는 촤라락 넘긴 뒤에 나옴
  gatherWords();

  const openEnd = cssSeconds('--open-delay') + cssSeconds('--open-dur');
  setTimeout(runFan, cssSeconds('--open-delay') + FAN_START_AFTER_OPEN_MS); // 표지가 열리는 동시에 촤라락 넘기기 시작
  setTimeout(() => termEl.classList.add('is-visible'), openEnd - 200);
  setTimeout(() => playSentence(0), openEnd + 500);
});

// ---------- 로고: 어느 화면에서든 누르면 맨 처음 화면으로 ----------
// 진행 중인 전환·타이핑·설문 상태가 남지 않도록 페이지를 새로 불러옴 (이미 처음 주소면 새로고침)
document.getElementById('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  const home = new URL('./', window.location.href).href;
  if (window.location.href === home) window.location.reload();
  else window.location.assign(home);
});

// ---------- 마우스에 따라 책을 보는 시점이 살짝 움직임 (3D 시차) ----------
const stageEl3d = document.querySelector('.stage');
const view = { x: 50, y: 50, tx: 50, ty: 50, locked: false };
window.addEventListener('mousemove', (e) => {
  if (view.locked) return;
  view.tx = 50 + (e.clientX / window.innerWidth - 0.5) * 36;
  view.ty = 50 + (e.clientY / window.innerHeight - 0.5) * 30;
});
// Let's start 를 누른 뒤에는 시점을 가운데로 돌려놓고 고정 (찢는 종이를 정확히 겹치기 위해)
window.lockBookView = () => { view.locked = true; view.tx = 50; view.ty = 50; };
(function viewLoop() {
  view.x += (view.tx - view.x) * 0.07;
  view.y += (view.ty - view.y) * 0.07;
  stageEl3d.style.setProperty('--px', `${view.x.toFixed(2)}%`);
  stageEl3d.style.setProperty('--py', `${view.y.toFixed(2)}%`);
  requestAnimationFrame(viewLoop);
})();
