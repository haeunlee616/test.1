// 마우스를 한 박자 늦게 따라오는 빛 + 지나간 자리가 번지듯 서서히 꺼지는 잔상
// + 화면 중앙의 "얇은 틈" — 커서가 가까워질수록 조용히 벌어지며 밝아지고, 멀어지면 천천히 닫힘
// + 배경의 성긴 별빛 — 거의 정지한 듯 아주 느리게 떠다니다가, 커서가 지나가면 근처만 잠깐 반응
//
// 커서 잔상 / 틈의 반응 / 별빛의 반응이 모두 같은 지수적 easing 규칙을 쓰되,
// 속도(rate)만 요소마다 살짝 다르게 둬서 기계적으로 똑같지 않게 함
//
// 캔버스를 네 장 씀 (뒤에서부터):
//  - starsCanvas: 배경의 성긴 별빛. 가운데 형태보다 뒤에 있고, 커서 반응에 관여하지 않음
//  - shapeCanvas: 중앙의 틈
//  - trailCanvas: 커서와 틈에 남는 잔상
//  - headCanvas : 지금 이 순간의 커서 빛
// (shape/head는 매 프레임 완전히 지우고 새로 그려서 절대 뭉치지 않음)

const starsCanvas = document.getElementById('stars');
const shapeCanvas = document.getElementById('shape');
const trailCanvas = document.getElementById('trail');
const headCanvas = document.getElementById('head');
const starsCtx = starsCanvas.getContext('2d');
const shapeCtx = shapeCanvas.getContext('2d');
const trailCtx = trailCanvas.getContext('2d');
const headCtx = headCanvas.getContext('2d');

// 팔레트는 style.css에 한 곳에만 정의되어 있고, 여기서는 그 값을 그대로 읽어옴
const rootStyle = getComputedStyle(document.documentElement);
const LIGHT_COLOR = hexToRgb(rootStyle.getPropertyValue('--color-warm').trim());
const SHAPE_COLOR = hexToRgb(rootStyle.getPropertyValue('--color-cool').trim());

const FOLLOW_EASE = 0.075;       // 빛이 마우스를 얼마나 느슨하게 따라오는지 (작을수록 더 늦게, 물속처럼) — 더 느긋하게 낮춤
// 커서 잔상 / 틈 / 별빛이 커지고 가라앉는 속도. 셋을 일부러 조금씩 다르게 둬서
// 하나의 기계적인 타이밍이 아니라 서로 살짝 다른 리듬으로 움직이는 것처럼 느껴지게 함
const TRAIL_FADE_PER_SECOND = 0.32; // 커서 잔상이 꺼지는 속도 (이전 0.25보다 느긋함)
const SHAPE_FADE_PER_SECOND = 0.42; // 중앙 틈이 반응하고 가라앉는 속도 — 셋 중 가장 무겁고 느림
const STAR_FADE_PER_SECOND = 0.22;  // 별빛이 반응하고 가라앉는 속도 — 셋 중 가장 가볍고 빠른 잔반응
const ERASE_INTERVAL_MS = 40;    // 잔상을 지우는 주기. 화면 주사율이 높아도 한 번에 지우는 양이 너무 작아 반올림에 묻히지 않도록 일정 간격으로만 지움
const FULL_CLEAR_AFTER_MS = 3800; // 마지막으로 칠한 뒤 이만큼 지나면, 반올림 때문에 희미하게 남아있을 수 있는 자국까지 완전히 지움
const MIN_PAINT_DIST = 1.5;      // 이만큼 움직였을 때만 잔상을 새로 칠함 (멈춰 있으면 잔상이 늘지 않음)
const HEAD_RADIUS = 9;           // 빛 머리(현재 위치) 핵의 크기

const SHAPE_HEIGHT_RATIO = 0.3;   // 화면에서 틈의 높이 비율 (짧은 쪽 기준)
const SHAPE_BASE_WIDTH = 3;       // 평소(반응 없을 때) 틈의 두께
const SHAPE_EXTRA_WIDTH = 6;      // 커서가 바로 붙었을 때 추가되는 두께
const SHAPE_BASE_ALPHA = 0.45;    // 평소 밝기
const SHAPE_EXTRA_ALPHA = 0.5;    // 커서가 바로 붙었을 때 추가되는 밝기
const SHAPE_BASE_GLOW = 14;       // 평소 광원 번짐 정도
const SHAPE_EXTRA_GLOW = 34;      // 커서가 바로 붙었을 때 추가되는 번짐
const SHAPE_INFLUENCE_RATIO = 0.28; // 이 거리(화면 짧은 쪽 기준 비율) 안에서부터 반응하기 시작
const SHAPE_TRACE_RATIO = 0.07;   // 이 거리보다 가까이 지나가면 틈에 흔적을 남김
const SHAPE_BREATHE_PERIOD = 8.5;      // 아무 반응이 없을 때도 이 주기(초)로 아주 살짝 숨 쉬듯 밝기/두께가 오르내림
const SHAPE_BREATHE_ALPHA = 0.05;      // 숨쉬기로 오르내리는 밝기 폭 — 아주 미세하게
const SHAPE_BREATHE_WIDTH = 0.5;       // 숨쉬기로 오르내리는 두께 폭 — 아주 미세하게

const STAR_AREA_PER_PARTICLE = 60000; // 알갱이 하나당 이만한 면적을 차지하게 해서 개수를 성기게 유지
const STAR_COUNT_MIN = 16;
const STAR_COUNT_MAX = 42;
const STAR_BASE_RADIUS_MIN = 0.7;
const STAR_BASE_RADIUS_MAX = 1.8;
const STAR_EXTRA_RADIUS = 2.2;      // 커서가 바로 붙었을 때 추가되는 크기
const STAR_BASE_ALPHA_MIN = 0.12;
const STAR_BASE_ALPHA_MAX = 0.32;
const STAR_EXTRA_ALPHA = 0.55;      // 커서가 바로 붙었을 때 추가되는 밝기
const STAR_INFLUENCE_RATIO = 0.1;   // 이 거리(화면 짧은 쪽 기준 비율) 안에서만 반응
const STAR_DRIFT_AMPLITUDE = 7;     // 떠다니는 폭 (px) — 아주 조금만
const STAR_DRIFT_PERIOD_MIN = 22;   // 떠다니는 한 바퀴에 걸리는 시간(초), 아주 느리게
const STAR_DRIFT_PERIOD_MAX = 40;

let dpr = Math.max(1, window.devicePixelRatio || 1);
let targetX = null, targetY = null;   // 실제 마우스 위치
let lightX = 0, lightY = 0;           // 화면에 그려지는(느슨하게 따라오는) 빛의 위치
let paintedX = null, paintedY = null; // 커서 잔상 캔버스에 마지막으로 칠한 위치
let hasStarted = false;
let lastTime = performance.now();
let eraseAccumMs = 0;
let msSinceLastPaint = Infinity;
let trailIsClear = true;
let shapeReaction = 0;                // 틈의 현재 반응 정도 0~1
let shapeMarkPaintedX = null, shapeMarkPaintedY = null; // 틈 위에 마지막으로 흔적을 남긴 지점
let stars = [];

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// current를 target으로 부드럽게 좇아가게 함. rate(1초 뒤 남는 비율)를 요소마다 다르게 넘겨서
// 커서 잔상 / 틈 / 별빛이 같은 규칙(지수적으로 부드럽게 좇아감)을 쓰되 속도만 살짝씩 다르게 함
function approach(current, target, dt, rate) {
  const remain = Math.pow(rate, dt / 1000);
  return target + (current - target) * remain;
}

function initStars() {
  const area = window.innerWidth * window.innerHeight;
  const count = Math.max(STAR_COUNT_MIN, Math.min(STAR_COUNT_MAX, Math.round(area / STAR_AREA_PER_PARTICLE)));
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      fx: Math.random(),               // 화면 비율(0~1)로 저장 — 창 크기가 바뀌어도 위치가 그대로 유지됨
      fy: Math.random(),
      baseRadius: STAR_BASE_RADIUS_MIN + Math.random() * (STAR_BASE_RADIUS_MAX - STAR_BASE_RADIUS_MIN),
      baseAlpha: STAR_BASE_ALPHA_MIN + Math.random() * (STAR_BASE_ALPHA_MAX - STAR_BASE_ALPHA_MIN),
      color: Math.random() < 0.65 ? SHAPE_COLOR : LIGHT_COLOR,
      driftPhaseX: Math.random() * Math.PI * 2,
      driftPhaseY: Math.random() * Math.PI * 2,
      driftPeriod: STAR_DRIFT_PERIOD_MIN + Math.random() * (STAR_DRIFT_PERIOD_MAX - STAR_DRIFT_PERIOD_MIN),
      reaction: 0,
    });
  }
}

function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  for (const [canvas, ctx] of [[starsCanvas, starsCtx], [shapeCanvas, shapeCtx], [trailCanvas, trailCtx], [headCanvas, headCtx]]) {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // 별의 위치는 화면 비율(fx, fy)로 저장되어 있어서 창 크기가 바뀌어도 다시 뽑을 필요 없이
  // drawStars()에서 매번 현재 화면 크기에 맞춰 계산됨. 개수만 화면 크기에 맞게 다시 정함
  if (stars.length === 0) initStars();
}

function updatePointer(x, y) {
  targetX = x;
  targetY = y;
  if (!hasStarted) {
    // 첫 움직임에서는 화면 구석에서부터 길게 끌려오지 않도록 바로 그 자리에서 시작
    lightX = x;
    lightY = y;
    paintedX = x;
    paintedY = y;
    hasStarted = true;
  }
}

function onPointerMove(e) {
  updatePointer(e.clientX, e.clientY);
}

// 휴대폰 등 터치 화면에서는 손가락이 닿아 있는 자리를 커서 대신 사용
function onTouchMove(e) {
  if (e.touches.length === 0) return;
  e.preventDefault(); // 화면이 스크롤되거나 당겨지지 않게 함
  updatePointer(e.touches[0].clientX, e.touches[0].clientY);
}

function drawGlow(ctx, x, y, alphaScale, color) {
  const c = color || LIGHT_COLOR;
  const r = HEAD_RADIUS * 2.2;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.9 * alphaScale})`);
  glow.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// 틈의 중심선 위에서 (x, y)와 가장 가까운 점, 그리고 그 지점까지의 거리를 계산
function nearestPointOnShape(x, y) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const halfH = (Math.min(window.innerWidth, window.innerHeight) * SHAPE_HEIGHT_RATIO) / 2;
  const ny = Math.max(cy - halfH, Math.min(cy + halfH, y));
  const dist = Math.hypot(x - cx, y - ny);
  return { x: cx, y: ny, dist };
}

function drawShape(reaction, now) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const halfH = (Math.min(window.innerWidth, window.innerHeight) * SHAPE_HEIGHT_RATIO) / 2;
  // 커서 반응이 전혀 없어도 화면이 죽어 보이지 않도록, 아주 느린 주기로 미세하게 숨 쉬듯 변화를 줌
  const breathe = Math.sin((now / 1000 / SHAPE_BREATHE_PERIOD) * Math.PI * 2);
  const width = SHAPE_BASE_WIDTH + SHAPE_EXTRA_WIDTH * reaction + SHAPE_BREATHE_WIDTH * breathe;
  const alpha = Math.min(1, SHAPE_BASE_ALPHA + SHAPE_EXTRA_ALPHA * reaction + SHAPE_BREATHE_ALPHA * breathe);
  const glowBlur = SHAPE_BASE_GLOW + SHAPE_EXTRA_GLOW * reaction;
  const c = SHAPE_COLOR;

  shapeCtx.save();
  shapeCtx.lineCap = 'round';
  shapeCtx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  shapeCtx.lineWidth = width;
  shapeCtx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.min(1, alpha + 0.2)})`;
  shapeCtx.shadowBlur = glowBlur;
  shapeCtx.beginPath();
  shapeCtx.moveTo(cx, cy - halfH);
  shapeCtx.lineTo(cx, cy + halfH);
  shapeCtx.stroke();
  shapeCtx.restore();
}

function drawStars(now, dt) {
  starsCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const influenceRadius = Math.min(window.innerWidth, window.innerHeight) * STAR_INFLUENCE_RATIO;

  for (const s of stars) {
    const driftX = Math.sin(now / 1000 / s.driftPeriod * Math.PI * 2 + s.driftPhaseX) * STAR_DRIFT_AMPLITUDE;
    const driftY = Math.cos(now / 1000 / s.driftPeriod * Math.PI * 2 + s.driftPhaseY) * STAR_DRIFT_AMPLITUDE;
    const x = s.fx * window.innerWidth + driftX;
    const y = s.fy * window.innerHeight + driftY;

    let reactionTarget = 0;
    if (hasStarted) {
      const dist = Math.hypot(lightX - x, lightY - y);
      const t = Math.max(0, Math.min(1, 1 - dist / influenceRadius));
      reactionTarget = t * t * (3 - 2 * t); // smoothstep
    }
    s.reaction = approach(s.reaction, reactionTarget, dt, STAR_FADE_PER_SECOND);

    const radius = s.baseRadius + STAR_EXTRA_RADIUS * s.reaction;
    const alpha = Math.min(1, s.baseAlpha + STAR_EXTRA_ALPHA * s.reaction);

    starsCtx.beginPath();
    starsCtx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha})`;
    starsCtx.arc(x, y, radius, 0, Math.PI * 2);
    starsCtx.fill();
  }
}

function tick(now) {
  const dt = now - lastTime;
  lastTime = now;

  if (hasStarted) {
    lightX += (targetX - lightX) * FOLLOW_EASE;
    lightY += (targetY - lightY) * FOLLOW_EASE;
  }

  // 잔상: 색으로 덮지 않고 투명하게 "지워서" 배경(정적인 빛 두 개, 별빛)이 가려지지 않게 함.
  // 화면 주사율이 아무리 높아도 일정 간격(ERASE_INTERVAL_MS)마다 한 번씩만 지워서,
  // 한 번에 지우는 양이 브라우저의 반올림 때문에 사라지는 일이 없게 함
  eraseAccumMs += dt;
  if (eraseAccumMs >= ERASE_INTERVAL_MS) {
    const remain = Math.pow(TRAIL_FADE_PER_SECOND, eraseAccumMs / 1000);
    trailCtx.globalCompositeOperation = 'destination-out';
    trailCtx.fillStyle = `rgba(0, 0, 0, ${1 - remain})`;
    trailCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    eraseAccumMs = 0;
  }

  let paintedThisFrame = false;
  if (hasStarted) {
    const dist = Math.hypot(lightX - paintedX, lightY - paintedY);
    if (dist > MIN_PAINT_DIST) {
      trailCtx.globalCompositeOperation = 'source-over';
      drawGlow(trailCtx, lightX, lightY, 0.6, LIGHT_COLOR);
      paintedX = lightX;
      paintedY = lightY;
      paintedThisFrame = true;
    }
  }

  // 중앙의 틈: 커서와의 거리에 따라 반응 정도를 부드럽게 좇아가게 함 (가까우면 커지고, 멀어지면 천천히 가라앉음)
  let shapeTouch = null;
  const influenceRadius = Math.min(window.innerWidth, window.innerHeight) * SHAPE_INFLUENCE_RATIO;
  let reactionTarget = 0;
  if (hasStarted) {
    const nearest = nearestPointOnShape(lightX, lightY);
    const t = Math.max(0, Math.min(1, 1 - nearest.dist / influenceRadius));
    reactionTarget = t * t * (3 - 2 * t); // smoothstep — 조용하고 부드러운 곡선

    const traceRadius = Math.min(window.innerWidth, window.innerHeight) * SHAPE_TRACE_RATIO;
    if (nearest.dist < traceRadius) shapeTouch = nearest;
  }
  shapeReaction = approach(shapeReaction, reactionTarget, dt, SHAPE_FADE_PER_SECOND);

  // 틈 위에 커서가 지나간 흔적을 남김 — 커서 자국과 같은 trailCanvas, 같은 속도로 꺼짐
  if (shapeTouch) {
    const moved = shapeMarkPaintedX === null
      ? true
      : Math.hypot(shapeTouch.x - shapeMarkPaintedX, shapeTouch.y - shapeMarkPaintedY) > MIN_PAINT_DIST;
    if (moved) {
      const traceRadius = Math.min(window.innerWidth, window.innerHeight) * SHAPE_TRACE_RATIO;
      const closeness = 1 - Math.hypot(lightX - shapeTouch.x, lightY - shapeTouch.y) / traceRadius;
      trailCtx.globalCompositeOperation = 'source-over';
      drawGlow(trailCtx, shapeTouch.x, shapeTouch.y, 0.5 * Math.max(0.2, closeness), SHAPE_COLOR);
      shapeMarkPaintedX = shapeTouch.x;
      shapeMarkPaintedY = shapeTouch.y;
      paintedThisFrame = true;
    }
  }

  // 위의 퍼센트 방식 지우기는 색이 8비트 정수라서 아주 옅은 값(예: 255 중 8) 근처에서
  // 반올림에 막혀 완전히 지워지지 않고 희미하게 남을 수 있음. 그래서 충분히 멈춰 있었다면
  // 한 번은 화면을 완전히 비워서 그 희미한 얼룩까지 깨끗이 없앰
  if (paintedThisFrame) {
    msSinceLastPaint = 0;
    trailIsClear = false;
  } else {
    msSinceLastPaint += dt;
    if (!trailIsClear && msSinceLastPaint >= FULL_CLEAR_AFTER_MS) {
      trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      trailIsClear = true;
    }
  }

  // 배경 별빛: 가운데 형태보다 뒤에 있고, 커서 반응에는 관여하지 않고 읽기만 함
  drawStars(now, dt);

  // 틈 본체: 매 프레임 전체를 지우고 새로 그려서 항상 깨끗하고 부드러운 상태를 유지
  shapeCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawShape(shapeReaction, now);

  // 머리(지금 위치의 빛): 매 프레임 전체를 지우고 새로 그려서 멈춰 있어도 절대 뭉치지 않음
  headCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (hasStarted) {
    drawGlow(headCtx, lightX, lightY, 1, LIGHT_COLOR);
  }

  requestAnimationFrame(tick);
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('touchstart', onTouchMove, { passive: false });
window.addEventListener('touchmove', onTouchMove, { passive: false });

resize();
requestAnimationFrame(tick);
