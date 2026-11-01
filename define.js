// ---------- Let's start 다음 화면: 사전 종이 → (카메라 손동작) → 취소선 → 종이 구겨짐 → 설문 ----------
// survey.js 의 Let's start 가 startDefine(next) 를 부르면:
//  1) 이 화면이 아래에서 올라오고 (책 장면은 위로 밀려남)
//  2) 모니터 카메라로 손가락이 왼쪽→오른쪽으로 움직이는지 지켜보다가
//  3) 동작이 감지되면 failure 위에 취소선이 그어지고
//  4) 종이가 구겨졌다가 → next() (설문이 올라옴)

(function () {
  const layerEl = document.getElementById('define-layer');
  const dfnEl = document.getElementById('dfn');
  const paperEl = document.getElementById('dfn-paper');
  const imgEl = document.getElementById('dfn-img');
  const strikeEl = document.getElementById('dfn-strike');
  const hintEl = document.getElementById('dfn-hint');
  const videoEl = document.getElementById('dfn-video');
  const glEl = document.getElementById('dfn-gl');

  const DARK_AT = 0.8;              // 올라오는 동안 이 지점부터 상단 메뉴·로고가 흰색으로 바뀜
  const STRIKE_MS = 450;            // 취소선이 그어지는 시간 (css: dfn-strike)
  const AFTER_STRIKE_MS = 650;      // 취소선을 보여 준 뒤 구겨지기 시작하기까지
  const CRUMPLE_MS = 1700;          // (WebGL 을 못 쓰는 경우) 대체 모션 길이
  // 스톱모션: 연속으로 구겨지지 않고 6장면을 0.2초씩 툭툭 끊어서 보여 줌. 장면마다 잔주름·위치·각도가 조금씩 달라짐
  const CRUMPLE_STEPS = [
    // c: 구김 정도 · shrink: 크기 · pinch: 가운데로 모아 쥠 · fold: 가로 접힘 · ang/tilt: 자세 · dx,dy,rot: 찍을 때의 흔들림 · fine: 잔주름 모양
    { c: 0.14, shrink: 0.97, pinch: 0.00, fold: 0.00, ang: 0.02, tilt: 0.04, hold: 200, dx: 0,  dy: 0,  rot: 0,      fine: 1.7 },  // 1: 잔주름이 생김
    { c: 0.32, shrink: 0.90, pinch: 0.06, fold: 0.00, ang: 0.05, tilt: 0.10, hold: 200, dx: -4, dy: 3,  rot: -0.03,  fine: 5.3 },  // 2: 가장자리가 물결치고 크기가 줄기 시작
    { c: 0.55, shrink: 0.80, pinch: 0.18, fold: 0.55, ang: 0.10, tilt: 0.22, hold: 200, dx: 5,  dy: -4, rot: 0.035,  fine: 9.1 },  // 3: 가운데가 가로로 접히고 윗부분이 꺾임
    { c: 0.75, shrink: 0.66, pinch: 0.40, fold: 0.60, ang: 0.25, tilt: 0.28, hold: 200, dx: -5, dy: 5,  rot: -0.04,  fine: 13.7 }, // 4: 가운데로 모아 쥐어지고 가장자리가 솟음
    { c: 0.90, shrink: 0.52, pinch: 0.55, fold: 0.45, ang: 0.40, tilt: 0.32, hold: 200, dx: 4,  dy: -3, rot: 0.05,   fine: 17.3 }, // 5: 더 단단히 뭉치고 각이 날카로워짐
    { c: 1.00, shrink: 0.42, pinch: 0.66, fold: 0.30, ang: 0.55, tilt: 0.35, hold: 0,   dx: -2, dy: 2,  rot: -0.02,  fine: 21.9 }, // 6: 작게 뭉친 최종 모양
  ];
  const AFTER_CRUMPLE_MS = 550;     // 구겨진 종이를 보여 준 뒤 던지기 시작하기까지
  // 구겨진 종이를 오른쪽 위로 던짐 (스톱모션 컷): 살짝 뒤로 젖혔다가 → 날아가며 커지고 돌아감 → 화면 밖
  // dx, dy: 이동(px) · rot: 회전(rad) · scale: 크기 배율 · hold: 다음 컷까지(ms) · leave: 이 컷에서 다음 화면(설문)이 올라오기 시작
  const THROW_CUTS = [
    { dx: -16,  dy: 12,   rot: -0.12, scale: 1.0,  hold: 150 },
    { dx: 190,  dy: -170, rot: 0.55,  scale: 1.12, hold: 90 },
    { dx: 560,  dy: -450, rot: 1.15,  scale: 1.28, hold: 80, leave: true },
    { dx: 1500, dy: -1200, rot: 1.9,  scale: 1.4,  hold: 0 },
  ];
  const PAPER_W = 548;              // 정의종이.svg 크기
  const PAPER_H = 477;
  const STRIKE_FROM = [43.2, 114.3];  // 정의종이.svg 안에서 취소선 시작·끝 (홈화면7 의 선)
  const STRIKE_TO = [212.1, 108];

  let state = 'idle';   // idle → rising → waiting → struck → crumpling → done
  let nextFn = null;

  // ================= 올라오기 =================
  window.startDefine = function (next) {
    nextFn = next;
    state = 'rising';
    const stage = document.querySelector('.stage');
    const h = window.innerHeight;
    const dur = typeof RISE_MS === 'number' ? RISE_MS : 950;   // survey.js 와 같은 속도(일정)

    document.body.classList.add('is-define');
    stage.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }],
      { duration: dur, easing: 'linear', fill: 'forwards' },
    );
    setTimeout(() => document.body.classList.add('is-dark'), dur * DARK_AT);
    const rise = layerEl.animate(
      [{ transform: `translateY(${h}px)` }, { transform: 'translateY(0)' }],
      { duration: dur, easing: 'linear' },
    );
    rise.onfinish = () => {
      stage.style.visibility = 'hidden';
      layerEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add('define-ready');
      state = 'waiting';
      startWatching();
    };
  };

  // ================= 손동작 감지 =================
  let stream = null;
  let sampleTimer = null;
  let cleanupPointer = null;

  // 최근 움직임의 가로 위치(0~1, 거울처럼 사용자의 왼쪽이 0) 기록으로 '왼쪽→오른쪽' 쓸기인지 판정
  const SWIPE_WINDOW_MS = 1000;
  const SWIPE_MIN_DX = 0.24;      // 화면 폭의 이 비율 이상 오른쪽으로 이동
  const SWIPE_MIN_SPAN_MS = 220;  // 너무 순간적인 노이즈는 무시
  const SWIPE_MIN_SAMPLES = 5;
  const SWIPE_MIN_FORWARD = 0.62; // 이동 중 오른쪽으로 간 구간의 비율

  function isRightwardSwipe(hist) {
    if (hist.length < SWIPE_MIN_SAMPLES) return false;
    const span = hist[hist.length - 1].t - hist[0].t;
    if (span < SWIPE_MIN_SPAN_MS) return false;
    const third = Math.max(1, Math.floor(hist.length / 3));
    const avg = (arr) => arr.reduce((s, p) => s + p.x, 0) / arr.length;
    const dx = avg(hist.slice(-third)) - avg(hist.slice(0, third));
    if (dx < SWIPE_MIN_DX) return false;
    let fwd = 0;
    let steps = 0;
    for (let i = 1; i < hist.length; i++) {
      const d = hist[i].x - hist[i - 1].x;
      if (Math.abs(d) < 0.004) continue;
      steps++;
      if (d > 0) fwd++;
    }
    return steps >= 3 && fwd / steps >= SWIPE_MIN_FORWARD;
  }
  window.__isRightwardSwipe = isRightwardSwipe;

  async function startWatching() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera api');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      if (state !== 'waiting') { stopCamera(); return; }
      videoEl.srcObject = stream;
      await videoEl.play();
      watchMotion();
    } catch (err) {
      // 카메라가 없거나 권한을 거절한 경우: 마우스(손가락 대신)로 쓸어도 되게 함
      hintEl.textContent = '카메라를 사용할 수 없어요. 마우스를 왼쪽에서 오른쪽으로 움직여 보세요.';
      watchPointer();
    }
  }

  function watchMotion() {
    const W = 64;
    const H = 48;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    let prev = null;
    let hist = [];
    sampleTimer = setInterval(() => {
      if (state !== 'waiting' || videoEl.readyState < 2) return;
      cx.drawImage(videoEl, 0, 0, W, H);
      const data = cx.getImageData(0, 0, W, H).data;
      const gray = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) gray[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
      if (prev) {
        let n = 0;
        let sx = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (Math.abs(gray[y * W + x] - prev[y * W + x]) > 28) { n++; sx += x; }
          }
        }
        const now = performance.now();
        // 손가락·손 정도 크기의 움직임만 사용 (조명이 바뀌거나 몸 전체가 흔들리면 무시)
        if (n >= 6 && n < W * H * 0.35) hist.push({ t: now, x: 1 - sx / n / W });   // 거울 반전: 사용자의 왼쪽→오른쪽 = 0→1
        hist = hist.filter((p) => now - p.t <= SWIPE_WINDOW_MS);
        if (isRightwardSwipe(hist)) onSwipe();
      }
      prev = gray;
    }, 40);
  }

  // 카메라를 쓸 수 없을 때를 위한 대체 입력: 마우스를 왼쪽에서 오른쪽으로
  function watchPointer() {
    let hist = [];
    const onMove = (e) => {
      if (state !== 'waiting') return;
      const now = performance.now();
      hist.push({ t: now, x: e.clientX / window.innerWidth });
      hist = hist.filter((p) => now - p.t <= SWIPE_WINDOW_MS);
      if (isRightwardSwipe(hist)) onSwipe();
    };
    window.addEventListener('mousemove', onMove);
    cleanupPointer = () => window.removeEventListener('mousemove', onMove);
  }

  function stopCamera() {
    if (sampleTimer) { clearInterval(sampleTimer); sampleTimer = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    videoEl.srcObject = null;
    if (cleanupPointer) { cleanupPointer(); cleanupPointer = null; }
  }

  // ================= 취소선 → 구겨짐 =================
  function onSwipe() {
    if (state !== 'waiting') return;
    state = 'struck';
    stopCamera();
    dfnEl.classList.add('is-struck');
    setTimeout(startCrumple, STRIKE_MS + AFTER_STRIKE_MS);
  }
  window.__defineSwipe = onSwipe;   // 테스트용

  async function startCrumple() {
    state = 'crumpling';
    let ok = false;
    let left = false;
    const leave = () => { if (left) return; left = true; if (nextFn) nextFn(); };   // 설문이 올라오기 시작
    try { ok = await crumpleGL(leave); } catch (e) { ok = false; window.__glerr = String(e && e.message || e); console.warn('crumple: WebGL 구겨짐 실패, 대체 모션 사용', e); }
    if (!ok) {
      await crumpleFallback();
      await new Promise((r) => setTimeout(r, AFTER_CRUMPLE_MS));
      paperEl.animate(
        [{ transform: 'translate(0,0) rotate(14deg) scale(0.45, 0.42)' }, { transform: 'translate(120vw,-100vh) rotate(90deg) scale(0.6)' }],
        { duration: 350, easing: 'steps(3, jump-end)', fill: 'forwards' },
      );
      await new Promise((r) => setTimeout(r, 200));
      leave();
    }
    state = 'done';
  }

  // WebGL2 를 쓸 수 없을 때: 종이를 줄이고 돌리는 간단한 구겨짐
  function crumpleFallback() {
    return new Promise((resolve) => {
      const a = paperEl.animate(
        [
          { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' },
          { transform: 'scale(0.9, 0.7) rotate(6deg)', filter: 'brightness(0.85)', offset: 0.5 },
          { transform: 'scale(0.45, 0.42) rotate(14deg)', filter: 'brightness(0.7)' },
        ],
        { duration: CRUMPLE_MS, easing: 'steps(6, jump-end)', fill: 'forwards' },
      );
      a.onfinish = resolve;
    });
  }

  // 종이를 격자 메쓰로 만들어 셰이더에서 접힘·주름·수축을 계산해 구겨 보이게 함
  const VERT = `#version 300 es
precision highp float;
in vec2 aUV;
uniform vec2 uCenter;   // 종이 중심 (캔버스 px)
uniform vec2 uSize;     // 종이 크기 (px)
uniform vec2 uRes;      // 캔버스 크기 (px)
uniform float uC;       // 구겨진 정도 0~1
uniform float uSeed;
uniform float uSeed2;   // 잔주름만 단계마다 바뀜
uniform float uShrink;  // 종이 전체가 줄어든 정도
uniform float uPinch;   // 가운데로 모아 쥐는 정도
uniform float uFold;    // 가로 접힘 각도 (rad)
uniform float uAng;     // 전체 회전 (rad)
uniform float uTilt;    // 앞으로 기울어짐 (rad)
uniform vec3 uJit;      // 단계마다 종이를 찍을 때의 흔들림 (x, y 이동 px / 회전 rad)
out vec2 vUV;
out vec3 vPos;
out float vRidge;

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash22(i).x, b = hash22(i + vec2(1, 0)).x, c = hash22(i + vec2(0, 1)).x, d = hash22(i + vec2(1, 1)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// 보로노이 면들의 평면 높이를 부드럽게 섞음: 면마다 기울기가 달라서 각진 접힘이 생기지만 경계에서도 끊기지 않고 이어짐
// crease: 면과 면의 경계에서 1 (접힌 선), tilt: 가장 가까운 면의 기울기
float planes(vec2 q, float K, float seed, out float crease, out vec2 tilt) {
  vec2 ip = floor(q);
  float sw = 0.0, sh = 0.0, d1 = 8.0, d2 = 8.0;
  tilt = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = ip + vec2(float(i), float(j));
      vec2 pt = g + 0.15 + hash22(g + seed) * 0.7;
      vec2 tl = (hash22(g + 11.0 + seed) - 0.5) * 2.0;
      float d = distance(q, pt);
      float w = exp(-K * d);
      sw += w;
      sh += w * dot(tl, q - pt);
      if (d < d1) { d2 = d1; d1 = d; tilt = tl; }
      else if (d < d2) { d2 = d; }
    }
  }
  crease = 1.0 - smoothstep(0.0, 0.22, d2 - d1);
  return sh / sw;
}

void main() {
  vec2 p0 = (aUV - 0.5) * uSize;                 // 평평한 종이 위의 위치 (px, 중심 기준)
  float u = uSize.y;
  float k = u / 380.0;                            // 화면 크기에 비례해서 주름 깊이를 맞춤
  vec2 q = p0 / u * 1.8;

  // 큰 면(접힌 판)들 + 잔주름: 면마다 기울기가 달라 각진 구김이 생김
  float crease, crease2;
  vec2 tilt, tilt2;
  float facet = planes(q, 42.0, uSeed, crease, tilt);
  float facet2 = planes(q * 2.4 + 5.0, 46.0, uSeed2, crease2, tilt2);
  float z = (facet * 92.0 + facet2 * 6.0) * uC * k;
  vRidge = clamp(crease * 0.7 + crease2 * 0.25, 0.0, 1.0) * uC;

  // 종이 가장자리가 물결치듯 휘어짐
  vec2 warp = (vec2(vnoise(q * 0.8 + 2.0), vnoise(q * 0.8 + 9.0)) - 0.5) * 46.0 * uC * k;

  // 가운데로 모아 쥐는 힘: 바깥쪽일수록 더 안으로 끌려 들어오고, 끌려온 가장자리는 위로 솟음(날개처럼)
  float r = clamp(length(p0) / (0.5 * length(uSize)), 0.0, 1.0);
  float pull = uPinch * smoothstep(0.1, 1.0, r);
  float lift = pull * (vnoise(q * 0.6 + 3.0) * 2.0 - 0.55) * 70.0 * k;
  z += lift;

  vec2 p = p0 * vec2(uShrink * (1.0 + 0.18 * sin(q.y * 1.3 + uSeed) * uC), uShrink * (1.0 + 0.2 * cos(q.x * 1.1) * uC));
  p *= 1.0 - 0.5 * pull;
  p += warp + tilt * 7.0 * uC * k;
  p += normalize(p0 + 0.001) * -crease * 6.0 * uC * k;   // 접히는 선에서 살짝 모임

  // 가로로 접힌 선: 접힌 선 위쪽 반이 앞으로 꺾여 올라옴
  float foldY = -0.06 * u * uShrink;
  float dy = p.y - foldY;
  if (dy < 0.0) {
    p.y = foldY + dy * cos(uFold);
    z += -dy * sin(uFold);
  }

  // 전체 자세: 돌아가고 앞으로 기울어짐
  float ang = uAng + uJit.z;
  float cs = cos(ang), sn = sin(ang);
  p = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);
  float ax = uTilt;
  vec3 w = vec3(p.x, p.y * cos(ax) - z * sin(ax), p.y * sin(ax) + z * cos(ax));
  vPos = w;
  vUV = aUV;

  float persp = 1100.0 / (1100.0 - clamp(w.z, -600.0, 900.0));
  vec2 s = uCenter + uJit.xy + w.xy * persp;
  gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, -w.z / 900.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vPos;
in float vRidge;
uniform sampler2D uTex;
uniform float uC;
out vec4 outColor;
void main() {
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.02) discard;
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  if (n.z < 0.0) n = -n;
  vec3 L = normalize(vec3(-0.55, -0.62, 0.56));
  float d = max(dot(n, L), 0.0);
  float shade = mix(1.0, 0.46 + 0.62 * d, smoothstep(0.0, 0.35, uC));
  shade *= 1.0 - 0.16 * vRidge;
  outColor = vec4(t.rgb * min(shade, 1.0), t.a);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  async function crumpleGL(leave) {
    const gl = glEl.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) return false;

    // 종이 그림(취소선 포함)을 텍스처로
    const TS = 2;
    const tex = document.createElement('canvas');
    tex.width = PAPER_W * TS;
    tex.height = PAPER_H * TS;
    const tx = tex.getContext('2d');
    await imgEl.decode().catch(() => {});
    tx.drawImage(imgEl, 0, 0, tex.width, tex.height);
    tx.strokeStyle = '#000';
    tx.lineWidth = 4 * TS;
    tx.beginPath();
    tx.moveTo(STRIKE_FROM[0] * TS, STRIKE_FROM[1] * TS);
    tx.lineTo(STRIKE_TO[0] * TS, STRIKE_TO[1] * TS);
    tx.stroke();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    glEl.width = Math.round(window.innerWidth * dpr);
    glEl.height = Math.round(window.innerHeight * dpr);
    const rect = paperEl.getBoundingClientRect();
    const center = [(rect.left + rect.width / 2) * dpr, (rect.top + rect.height / 2) * dpr];
    const size = [rect.width * dpr, rect.height * dpr];

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    // 격자 메쓰
    const COLS = 170;
    const ROWS = 148;
    const uvs = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
    let k = 0;
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) { uvs[k++] = c / COLS; uvs[k++] = r / ROWS; }
    const idx = new Uint32Array(COLS * ROWS * 6);
    k = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = r * (COLS + 1) + c;
        const b = a + 1;
        const d = a + COLS + 1;
        const e = d + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = d;
        idx[k++] = b; idx[k++] = e; idx[k++] = d;
      }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform2f(U('uCenter'), center[0], center[1]);
    gl.uniform2f(U('uSize'), size[0], size[1]);
    gl.uniform2f(U('uRes'), glEl.width, glEl.height);
    gl.uniform1i(U('uTex'), 0);
    const uC = U('uC');
    const uSeed2 = U('uSeed2');
    const uJit = U('uJit');
    const uShrink = U('uShrink');
    const uPinch = U('uPinch');
    const uFold = U('uFold');
    const uAng = U('uAng');
    const uTilt = U('uTilt');
    const baseSeed = 3.0 + Math.random() * 20.0;
    gl.uniform1f(U('uSeed'), baseSeed);

    gl.viewport(0, 0, glEl.width, glEl.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const draw = (step) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uC, step.c);
      gl.uniform1f(uShrink, step.shrink * (step.scale || 1));
      gl.uniform1f(uPinch, step.pinch);
      gl.uniform1f(uFold, step.fold);
      gl.uniform1f(uAng, step.ang);
      gl.uniform1f(uTilt, step.tilt);
      gl.uniform1f(uSeed2, baseSeed + step.fine);
      gl.uniform3f(uJit, step.dx * dpr, step.dy * dpr, step.rot);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
    };

    draw({ c: 0, shrink: 1, pinch: 0, fold: 0, ang: 0, tilt: 0, hold: 0, dx: 0, dy: 0, rot: 0, fine: 0 });
    layerEl.classList.add('is-crumpling');   // 평평한 종이 대신 캔버스를 보여 줌 (같은 모습으로 시작)

    // 보간 없이 단계에서 단계로 바로 넘어감 (멈춘 장면을 이어 붙인 스톱모션)
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        draw(CRUMPLE_STEPS[i]);
        const hold = CRUMPLE_STEPS[i].hold * (window.__crumpleHoldScale || 1);   // (테스트용 배율)
        i++;
        if (i < CRUMPLE_STEPS.length) setTimeout(next, hold);
        else setTimeout(throwAway, AFTER_CRUMPLE_MS);   // 최종 모양을 잠깐 보여 준 뒤 던짐
      };
      // 구겨진 종이를 던짐: 최종 모양 그대로 위치·회전·크기만 컷마다 바뀜
      const throwAway = () => {
        const base = CRUMPLE_STEPS[CRUMPLE_STEPS.length - 1];
        let j = 0;
        const cut = () => {
          const c = THROW_CUTS[j];
          draw({ ...base, dx: base.dx + c.dx, dy: base.dy + c.dy, rot: base.rot + c.rot, scale: c.scale });
          if (c.leave) leave();
          j++;
          if (j < THROW_CUTS.length) setTimeout(cut, c.hold * (window.__crumpleHoldScale || 1));
          else resolve(true);
        };
        cut();
      };
      next();
    });
  }
})();
