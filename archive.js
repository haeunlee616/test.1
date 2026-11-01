// ---------- 아카이빙 (discover more) ----------
// 아카이빙1: 참여자들의 결과지가 3D 공간에 떠다니는 화면 (스크롤을 내리면) → 아카이빙2: 3D 책을 넘기면 결과지가 한 장씩 나타남.
// 지금은 결과지 예시 1·2 (assets/archive/) 로만 채움. 참여자 결과지를 자동으로 모으는 건 아직 연결하지 않았음 (ARCHIVE_SHEETS 에 목록이 들어갈 자리).
(function () {
  const FRONT = 'assets/archive/example-front.png';
  const BACK = 'assets/archive/example-back.webp';

  // 아카이빙1에 떠 있는 결과지들: 시안(1440×1024)에서 보이는 위치·크기. 크기가 클수록 가까이 있다고 보고 깊이(z)를 정함
  const FLOATING = [
    { x: 842, y: 390, w: 96, h: 128, img: FRONT },
    { x: 389, y: 727, w: 234, h: 313, img: FRONT },
    { x: 122, y: -38, w: 152, h: 204, img: FRONT },
    { x: 503, y: 370, w: 74, h: 100, img: FRONT },
    { x: 938, y: 124, w: 153, h: 204, img: FRONT },
    { x: 1091, y: 876, w: 244, h: 327, img: FRONT },
    { x: 198, y: 443, w: 151, h: 202, img: BACK },
    { x: 439, y: 296, w: 93, h: 124, img: BACK },
    { x: 1021, y: 500, w: 216, h: 289, img: BACK },
  ];
  // 스크롤로 전진할 때 앞쪽에서 다가오는 먼 곳의 결과지들 (처음엔 보이지 않다가 나타남). z: 깊이(−가 멀리)
  const DEEP = [
    { x: 40, y: 280, w: 190, h: 254, img: BACK, z: -2100 },
    { x: 1190, y: 230, w: 200, h: 268, img: FRONT, z: -2250 },
    { x: 640, y: 40, w: 170, h: 228, img: FRONT, z: -2400 },
    { x: 1260, y: 640, w: 210, h: 281, img: BACK, z: -1900 },
    { x: 70, y: 760, w: 200, h: 268, img: FRONT, z: -1800 },
    { x: 660, y: 800, w: 180, h: 241, img: BACK, z: -2000 },
  ];
  const FOCAL = 1500;                       // 원근(perspective) 거리
  const VP = { x: 720, y: 512 };            // 소실점 = 화면 중앙
  const Z_NEAR = 350;                       // 가장 큰 결과지의 깊이 (카메라 쪽 +)
  const Z_FAR = -1000;                      // 가장 작은 결과지의 깊이 (먼 쪽 −)
  const CAMERA_TRAVEL = 1850;               // 스크롤을 끝까지 내렸을 때 카메라가 앞으로 가는 거리
  const RUNWAY_VH = 2;                      // 아카이빙1에 머무르며 카메라가 전진하는 스크롤 길이 (화면 높이의 배수)
  const PARALLAX = { x: 70, y: 46, rotY: 3.2, rotX: 2.4 };   // 마우스를 따라 시점이 움직이는 정도
  // 책에 들어갈 결과지 목록 (지금은 예시 1·2 를 번갈아). 나중에 참여자들의 결과지가 여기에 쌓임
  const ARCHIVE_SHEETS = [FRONT, BACK];
  const LEAVES = 4;                       // 책을 넘길 수 있는 장 수 (한 장 = 앞뒤 2쪽)
  const PAGE = { w: 394, h: 552 };        // 책 한 쪽 크기 (시안 px)
  const SPINE = { x: 718, y: 228 };       // 책등 위치

  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.append(n); return n; };
  let layer = null;
  let spread = 0;
  let stopWatch = null;

  function build() {
    layer = el('div', 'ar-layer', document.body);
    layer.id = 'archive-layer';
    const scroll = el('div', 'ar-scroll', layer);

    // ---- 아카이빙1 ----
    // 스크롤 길이를 늘려 두고(.ar-runway) 그 안에서 화면은 고정(sticky) — 스크롤하면 카메라가 공간 속으로 전진
    const runway = el('section', 'ar-runway', scroll);
    runway.style.setProperty('--runway', RUNWAY_VH + 1);
    const s1 = el('div', 'ar-screen ar-screen--1', runway);
    const c1 = el('div', 'ar-canvas', s1);
    const scene = el('div', 'ar-scene', c1);
    layer.sheets = [...FLOATING, ...DEEP].map((f, i) => {
      // 깊이에 따라 실제 자리·크기를 다시 계산: 원근 투영 뒤에 시안과 똑같은 모습이 되도록 (가까운 것은 작게·가깝게, 먼 것은 크게·멀게 배치)
      const z = f.z !== undefined ? f.z : Z_FAR + (f.w - 74) / (244 - 74) * (Z_NEAR - Z_FAR);
      const k = (FOCAL - z) / FOCAL;
      const cx = VP.x + (f.x + f.w / 2 - VP.x) * k;
      const cy = VP.y + (f.y + f.h / 2 - VP.y) * k;
      const w = f.w * k; const h = f.h * k;
      const sheet = el('div', 'ar-sheet', scene);
      sheet.style.cssText = `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;transform:translateZ(${z}px);`;
      const bob = el('div', 'ar-sheet__bob', sheet);
      bob.style.cssText = `--dur:${(11 + (i * 1.7) % 7).toFixed(1)}s;--delay:${(-i * 1.9).toFixed(1)}s;`
        + `--dx:${((i % 2 ? 1 : -1) * (5 + f.w / 18)).toFixed(0)}px;--dy:${((i % 3 === 0 ? -1 : 1) * (7 + f.w / 20)).toFixed(0)}px;--rz:${((i % 5) - 2) * 0.7}deg;`;
      const img = el('img', '', bob);
      img.src = f.img; img.alt = ''; img.draggable = false;
      return { node: sheet, bob, z, deep: f.z !== undefined };
    });
    layer.scene = scene;
    const veil = el('div', 'ar-veil', c1);                       // 가운데를 하얗게 덮는 흐린 원 (시안)
    const head = el('h2', 'ar-headline', c1);
    head.innerHTML = 'One word cannot define<br>your entire experience.';
    const hint = el('div', 'ar-scrollhint', c1);
    hint.innerHTML = '<span>Scroll to Explore</span><svg viewBox="0 0 20 28" width="20" height="28" aria-hidden="true"><path d="M10 1v24M2 17l8 8 8-8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    const dim = el('div', 'ar-dim', s1);                         // 책 화면으로 넘어가기 직전에 어두워짐
    layer.fx = { veil, head, hint, dim };

    // ---- 아카이빙2 ----
    const s2 = el('section', 'ar-screen ar-screen--2', scroll);
    const c2 = el('div', 'ar-canvas', s2);
    const stage = el('div', 'bk-stage', c2);
    const book = el('div', 'bk-book', stage);
    book.style.left = `${SPINE.x}px`;
    book.style.top = `${SPINE.y}px`;
    el('div', 'bk-cover', book);
    // 책장 옆면(쌓인 종이 가장자리)
    for (let i = 4; i >= 1; i--) {
      const l = el('div', 'bk-edge bk-edge--l', book); l.style.setProperty('--i', i);
      const r = el('div', 'bk-edge bk-edge--r', book); r.style.setProperty('--i', i);
    }
    const sheetAt = (n) => ARCHIVE_SHEETS[n % ARCHIVE_SHEETS.length];
    const page = (parent, cls, n) => {
      const f = el('div', `bk-face ${cls}`, parent);
      const img = el('img', 'bk-sheet', f);
      img.src = sheetAt(n); img.alt = ''; img.draggable = false;
      return f;
    };
    // 왼쪽 맨 아래 쪽(첫 쪽)과 오른쪽 맨 아래 빈 쪽
    const leftBase = el('div', 'bk-leaf bk-leaf--left', book);
    page(leftBase, 'bk-face--l', 0);
    el('div', 'bk-leaf bk-leaf--rightbase bk-face--r', book);
    const leaves = [];
    for (let j = 0; j < LEAVES; j++) {
      const leaf = el('div', 'bk-leaf', book);
      page(leaf, 'bk-face--r', 2 * j + 1);                      // 앞면 = 오른쪽에 보이는 쪽
      const back = page(leaf, 'bk-face--l bk-face--back', 2 * j + 2);   // 뒷면 = 넘긴 뒤 왼쪽에 보이는 쪽
      leaves.push(leaf);
    }
    const cap = el('p', 'bk-caption', c2);
    cap.textContent = '책을 눌러 넘겨 보세요  ·  손가락을 좌우로 그어도 넘어가요';
    layer.leaves = leaves;

    // 눌러서 넘기기: 오른쪽 쪽 = 다음, 왼쪽 쪽 = 이전
    stage.addEventListener('click', (e) => {
      const r = stage.getBoundingClientRect();
      go(e.clientX > r.left + r.width / 2 ? 1 : -1);
    });
    window.addEventListener('keydown', (e) => {
      if (!layer.classList.contains('is-on')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    });

    const fit = () => {
      const u = Math.max(Math.min(window.innerWidth / 1440, window.innerHeight / 1024), 0.6);
      layer.style.setProperty('--ar-u', u);
    };
    fit();
    window.addEventListener('resize', fit);

    // 스크롤(카메라 전진)·마우스(시점 이동)를 부드럽게 따라가며 매 프레임 장면을 그림
    const state = { p: 0, pt: 0, mx: 0, my: 0, tx: 0, ty: 0, running: false };
    layer.state = state;
    const calc = () => {
      const vh = scroll.clientHeight;
      state.pt = Math.max(0, Math.min(1, scroll.scrollTop / (RUNWAY_VH * vh)));
      const dark = state.pt > 0.9;
      document.body.classList.toggle('is-dark', dark);
      watch(scroll.scrollTop > (RUNWAY_VH + 0.5) * vh);
    };
    scroll.addEventListener('scroll', calc, { passive: true });
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    layer.addEventListener('pointermove', (e) => {
      if (reduce) return;
      state.tx = (e.clientX / window.innerWidth) * 2 - 1;
      state.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });
    layer.addEventListener('pointerleave', () => { state.tx = 0; state.ty = 0; });
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const frame = () => {
      if (!layer.classList.contains('is-on')) { state.running = false; return; }
      state.p += (state.pt - state.p) * 0.12;                     // 스크롤을 버터처럼 따라감
      state.mx += (state.tx - state.mx) * 0.07;
      state.my += (state.ty - state.my) * 0.07;
      const p = state.p;
      const cam = easeInOut(p) * CAMERA_TRAVEL;                   // 카메라가 앞으로 간 거리
      // 장면 전체를 카메라 반대로 움직임: 마우스로 옆·위로(깊이에 따라 시차가 저절로 생김), 스크롤로 앞으로
      layer.scene.style.transform = `translate3d(${-state.mx * PARALLAX.x}px, ${-state.my * PARALLAX.y}px, ${cam}px) rotateX(${state.my * PARALLAX.rotX}deg) rotateY(${-state.mx * PARALLAX.rotY}deg)`;
      layer.sheets.forEach((s) => {
        const z = s.z + cam;                                      // 지금 카메라 기준 깊이
        const far = clamp01((-z - 150) / 950);                    // 멀수록 1
        const pass = clamp01((z - 520) / 520);                    // 카메라를 지나칠수록 1
        const blur = far * 3.2 + pass * 6;
        const near = clamp01((z + 400) / 900);                    // 가까울수록 1 → 그림자가 크고 진해짐
        const reveal = s.deep ? clamp01((p - 0.04) / 0.3) : 1;   // 먼 곳의 결과지는 전진하면서 서서히 나타남
        s.node.style.opacity = String((1 - far * 0.5) * (1 - pass) * reveal);
        s.node.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        s.bob.style.boxShadow = `0 ${(3 + near * 22).toFixed(1)}px ${(6 + near * 34).toFixed(1)}px rgba(0,0,0,${(0.2 + near * 0.18).toFixed(2)})`;
      });
      const fx = layer.fx;
      fx.head.style.opacity = fx.hint.style.opacity = String(1 - clamp01(p / 0.22));
      fx.head.style.transform = `translateY(${-p * 120}px) scale(${1 + p * 0.25})`;
      fx.hint.style.transform = `translateY(${-p * 120}px)`;
      fx.veil.style.opacity = String(1 - clamp01(p / 0.45));
      fx.dim.style.opacity = String(clamp01((p - 0.78) / 0.2));
      requestAnimationFrame(frame);
    };
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    layer.start = () => { calc(); if (!state.running) { state.running = true; requestAnimationFrame(frame); } };
    setSpread(0);
  }

  // 책 상태 갱신: spread 장만큼 넘어간 상태
  function setSpread(n) {
    spread = Math.max(0, Math.min(LEAVES, n));
    layer.leaves.forEach((leaf, j) => {
      const flipped = j < spread;
      leaf.classList.toggle('is-flipped', flipped);
      // 겹친 종이가 서로 파묻히지 않게 아주 조금씩 높이를 다르게 함
      leaf.style.setProperty('--z', flipped ? j : LEAVES - j);
    });
    layer.classList.toggle('is-first', spread === 0);
    layer.classList.toggle('is-last', spread === LEAVES);
  }
  const go = (dir) => setSpread(spread + dir);

  function watch(on) {
    if (on && !stopWatch && window.ResultSheet && window.ResultSheet.watchSwipe) {
      // 오른쪽으로 긋기 = 이전 장, 왼쪽으로 긋기 = 다음 장 (책을 넘기는 방향과 같게)
      stopWatch = window.ResultSheet.watchSwipe((dir) => go(dir > 0 ? -1 : 1), document.createElement('p'));
    } else if (!on && stopWatch) { stopWatch(); stopWatch = null; }
  }

  function open() {
    if (window.ResultSheet && window.ResultSheet.stopWatching) window.ResultSheet.stopWatching();
    document.body.querySelectorAll('.bar__side').forEach((n) => n.remove());
    if (!layer) build();
    document.body.classList.add('is-archive');
    const nl = document.getElementById('contact-btn'); const nr = document.getElementById('about-btn');
    if (nl) nl.textContent = 'archive';
    if (nr) nr.textContent = 'publication';
    layer.querySelector('.ar-scroll').scrollTop = 0;
    requestAnimationFrame(() => { layer.classList.add('is-on'); layer.start(); });
    setTimeout(() => { const r = document.getElementById('result-layer'); if (r) r.classList.remove('is-on'); }, 800);   // 결과지 화면은 아카이빙이 다 덮은 뒤 치움
  }

  window.Archive = { open, go, sheets: ARCHIVE_SHEETS };
  if (/[?&]archive=1/.test(location.search)) window.addEventListener('load', open);   // 확인용: ?archive=1
})();
