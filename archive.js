// ---------- 아카이빙 (discover more) ----------
// 아카이빙1: 참여자들의 결과지가 3D 공간에 떠다니는 화면 (스크롤을 내리면) → 아카이빙2: 3D 책을 넘기면 결과지가 한 장씩 나타남.
// 결과지가 완성되면 앞·뒷면을 그림으로 찍어 서버(/api/archive)에 순서대로 저장하고, 책은 최신 결과지부터 펼쳐짐. 맨 끝에는 예시 결과지 한 장이 남음.
// 책에서 결과지를 누르면 앞면 ↔ 뒷면이 번갈아 보이고, 장은 양옆 화살표·키보드·손가락 좌우 동작으로 넘김.
(function () {
  const FRONT = 'assets/archive/example-front.png';
  const BACK = 'assets/archive/example-back.webp';
  const EXAMPLE = { id: 'example', front: FRONT, back: BACK };
  const BOOK_MAX_SHEETS = 200;              // 책에 넣는 최신 결과지 최대 수 (예시 한 장은 별도로 맨 끝)

  // 아카이빙1에 떠 있는 결과지들: 시안(1440×1024)에서 보이는 위치·크기. face = 보이는 면. 크기가 클수록 가까이 있다고 보고 깊이(z)를 정함. 가까운(큰) 자리일수록 더 최근 결과지가 들어감
  const FLOATING = [
    { x: 842, y: 390, w: 96, h: 128, face: 'front' },
    { x: 389, y: 727, w: 234, h: 313, face: 'front' },
    { x: 122, y: -38, w: 152, h: 204, face: 'front' },
    { x: 503, y: 370, w: 74, h: 100, face: 'front' },
    { x: 938, y: 124, w: 153, h: 204, face: 'front' },
    { x: 1091, y: 876, w: 244, h: 327, face: 'front' },
    { x: 198, y: 443, w: 151, h: 202, face: 'back' },
    { x: 439, y: 296, w: 93, h: 124, face: 'back' },
    { x: 1021, y: 500, w: 216, h: 289, face: 'back' },
  ];
  // 스크롤로 전진할 때 앞쪽에서 다가오는 먼 곳의 결과지들 (처음엔 보이지 않다가 나타남). z: 깊이(−가 멀리)
  const DEEP = [
    { x: 40, y: 280, w: 190, h: 254, face: 'back', z: -2100 },
    { x: 1190, y: 230, w: 200, h: 268, face: 'front', z: -2250 },
    { x: 640, y: 40, w: 170, h: 228, face: 'front', z: -2400 },
    { x: 1260, y: 640, w: 210, h: 281, face: 'back', z: -1900 },
    { x: 70, y: 760, w: 200, h: 268, face: 'front', z: -1800 },
    { x: 660, y: 800, w: 180, h: 241, face: 'back', z: -2000 },
  ];
  const FOCAL = 1500;                       // 원근(perspective) 거리
  const VP = { x: 720, y: 512 };            // 소실점 = 화면 중앙
  const Z_NEAR = 350;                       // 가장 큰 결과지의 깊이 (카메라 쪽 +)
  const Z_FAR = -1000;                      // 가장 작은 결과지의 깊이 (먼 쪽 −)
  const CAMERA_TRAVEL = 1850;               // 스크롤을 끝까지 내렸을 때 카메라가 앞으로 가는 거리
  const RUNWAY_VH = 2;                      // 아카이빙1에 머무르며 카메라가 전진하는 스크롤 길이 (화면 높이의 배수)
  const PARALLAX = { x: 70, y: 46, rotY: 3.2, rotX: 2.4 };   // 마우스를 따라 시점이 움직이는 정도
  const FAN_COUNT = 5;                    // 촤라락 넘어가는 빈 장 수
  const FAN_FLIP_MS = 740;                // 한 장이 넘어가는 시간
  const FAN_STAGGER_MS = 120;             // 장과 장 사이 간격
  const PAGE = { w: 394, h: 528 };        // 책 한 쪽 크기 (시안 px)
  const SPINE = { x: 718, y: 228 };       // 책등 위치

  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.append(n); return n; };
  let layer = null;
  let spread = 0;
  let stopWatch = null;

  // ---------- 저장된 결과지 목록 ----------
  const LIVE_API = 'https://failure-dictionary.onrender.com';
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  let serverSheets = [];                   // 서버에서 받은 목록 (최신이 맨 앞): { id, front, back }
  let mine = null;                         // 방금 내가 만든 결과지 (서버 목록에 올라오기 전에도 책에 바로 보이게)
  let pendingSave = null;                  // 저장 중인 요청 (아카이빙을 열 때 기다림)
  let sheets = [EXAMPLE];                  // 책에 들어가는 결과지: 최신 → 오래된 순, 맨 끝은 예시. 한 장 = 책 한 쪽
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 이 서버에 API 가 없으면(내 컴퓨터에서 정적 서버로만 열었을 때) 배포된 서버를 대신 씀. 응답한 서버 주소(base)도 함께 돌려줌
  async function api(path, init) {
    const bases = IS_LOCAL ? ['', window.__LIVE_API || LIVE_API] : [''];
    let lastErr = new Error('no server');
    for (const base of bases) {
      try {
        const res = await fetch(base + path, init);
        if (res.ok) return { base, json: await res.json() };
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }

  const compose = () => {
    const list = serverSheets.map((x) => ({ ...x }));
    if (mine && !(mine.id && list.some((x) => x.id === mine.id))) list.unshift({ id: mine.id || 'mine', front: mine.front, back: mine.back });
    list.splice(BOOK_MAX_SHEETS);
    list.push({ ...EXAMPLE });
    return list;
  };

  async function fetchList() {
    try {
      const { base, json } = await api('/api/archive', { cache: 'no-store' });
      serverSheets = (json.sheets || []).map((x) => ({ id: x.id, front: base + x.front, back: base + x.back }));
    } catch (err) { console.warn('아카이빙 목록을 불러오지 못했어요', err.message); }
  }

  // ---------- 결과지 저장: 앞·뒷면을 그림으로 찍어 서버에 올림 ----------
  const SHEET_PX = { w: 1050, h: 1407 };
  let libPromise = null;
  const loadLib = () => libPromise || (libPromise = new Promise((resolve, reject) => {
    if (window.htmlToImage) { resolve(); return; }
    const sc = document.createElement('script');
    sc.src = 'assets/vendor/html-to-image.js';
    sc.onload = resolve; sc.onerror = () => { libPromise = null; reject(new Error('html-to-image')); };
    document.head.append(sc);
  }));

  // 글자 모양으로 뚫린 종이(앞면의 큰 글자 SVG)는 mask 를 쓰는데, 그림으로 찍을 때 mask 주소(#id)가 풀리지 않아 뚫리지 않음.
  // → 찍는 동안만 같은 모습의 독립된 그림(SVG 그림 파일)으로 바꿔 두고, 끝나면 원래대로 되돌림
  async function freezeMasks(face) {
    const swaps = [];
    for (const svg of face.querySelectorAll('svg.rs-word')) {
      const xml = new XMLSerializer().serializeToString(svg);
      if (!xml.includes('url(#')) continue;
      const img = new Image();
      img.className = svg.getAttribute('class');
      img.setAttribute('width', svg.getAttribute('width')); img.setAttribute('height', svg.getAttribute('height'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      try { await img.decode(); } catch (err) { continue; }
      svg.replaceWith(img);
      swaps.push(() => img.replaceWith(svg));
    }
    return () => swaps.forEach((undo) => undo());
  }

  async function capture(root) {
    await loadLib();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const out = {};
    for (const side of ['front', 'back']) {
      const restore = await freezeMasks(root.faces[side]);
      let raw;
      try {
        raw = await window.htmlToImage.toCanvas(root.faces[side], {
          width: SHEET_PX.w, height: SHEET_PX.h, canvasWidth: SHEET_PX.w, canvasHeight: SHEET_PX.h, pixelRatio: 1,
          style: { transform: 'none', left: '0px', top: '0px', backfaceVisibility: 'visible' },   // 3D 카드에서 뒤집혀 있던 뒷면도 똑바로
        });
      } finally { restore(); }
      const cv = document.createElement('canvas');                                       // 투명한 곳이 검게 변하지 않게 흰 바탕 위에 그림
      cv.width = SHEET_PX.w; cv.height = SHEET_PX.h;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(raw, 0, 0);
      out[side] = cv;
    }
    let format = 'image/webp';
    if (!out.front.toDataURL(format, 0.9).startsWith('data:image/webp')) format = 'image/jpeg';   // webp 로 못 저장하는 브라우저(사파리)는 jpeg
    return { front: out.front.toDataURL(format, 0.92), back: out.back.toDataURL(format, 0.92) };
  }

  // 완성된 결과지(ResultSheet 가 만든 root)를 저장. 실패해도 결과지 화면에는 영향 없음
  function save(root) {
    pendingSave = (async () => {
      try {
        const shot = await capture(root);
        mine = { id: null, front: shot.front, back: shot.back };
        const { json } = await api('/api/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shot) });
        mine.id = json.id;
        return json.id;
      } catch (err) {
        console.warn('결과지를 아카이빙에 저장하지 못했어요', err.message);
        return null;
      }
    })();
    return pendingSave;
  }

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
    const slots = [...FLOATING, ...DEEP];
    const rankBySize = slots.map((_, i) => i).sort((x, y) => slots[y].w - slots[x].w);   // 큰(가까운) 자리부터 최신 결과지
    layer.slotRank = slots.map((_, i) => rankBySize.indexOf(i));
    layer.sheets = slots.map((f, i) => {
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
      img.src = floatingSrc(f, i); img.alt = ''; img.draggable = false;
      return { node: sheet, bob, img, f, z, deep: f.z !== undefined };
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
    const book = el('div', 'bk-book is-closed', stage);
    book.style.left = `${SPINE.x}px`;
    book.style.top = `${SPINE.y}px`;
    el('div', 'bk-cover', book);
    // 책장 옆면(쌓인 종이 가장자리)
    for (let i = 4; i >= 1; i--) {
      const l = el('div', 'bk-edge bk-edge--l', book); l.style.setProperty('--i', i);
      const r = el('div', 'bk-edge bk-edge--r', book); r.style.setProperty('--i', i);
    }
    // 바닥에 깔린 쪽: 왼쪽(표지 안쪽에 붙은 빈 쪽)·오른쪽(빈 쪽)
    layer.baseLeft = el('div', 'bk-leaf bk-leaf--left bk-face--l', book);
    layer.baseRight = el('div', 'bk-leaf bk-leaf--rightbase bk-face--r', book);
    // 표지: 앞면 = 닫힌 책, 뒷면 = 펼쳤을 때 왼쪽에 놓이는 빈 쪽
    const coverBoard = el('div', 'bk-board', book);
    const cf = el('div', 'bk-board__face bk-board__front', coverBoard);
    const cimg = el('img', '', cf); cimg.src = 'assets/book.png'; cimg.alt = ''; cimg.draggable = false;
    layer.coverBoard = coverBoard;
    el('div', 'bk-board__face bk-board__back', coverBoard);
    // 촤라락 넘어가는 빈 장들: 마지막 장의 뒷면이 최신 결과지(왼쪽 쪽)가 됨
    const fans = [];
    for (let i = FAN_COUNT - 1; i >= 0; i--) {
      const f = el('div', 'leaf bk-fan', book);
      f.dataset.front = 'assets/face-right-blank.png';
      f.dataset.back = i === FAN_COUNT - 1 ? sheets[0].front : 'assets/face-left-blank.png';
      f.dataset.fan = i;
      f.style.cssText = `--lw:${PAGE.w}px;--lh:${PAGE.h}px;--sw:${PAGE.w / LEAF_STRIPS}px;top:0;left:0;visibility:hidden;`;
      buildLeaf(f); updateCurl(f, 0);
      fans[i] = f;
    }
    layer.fans = fans;
    layer.book = book;
    layer.board = coverBoard;
    layer.bookState = 'closed';
    layer.ready = Promise.resolve();
    const cap = el('p', 'bk-caption', c2);
    cap.textContent = '결과지를 누르면 앞뒷면이 바뀌어요  ·  양옆 화살표나 손가락 좌우 동작으로 넘겨 보세요';
    layer.cap = cap;
    // 양옆 화살표: 이전/다음 장
    const nav = (dir, label, d) => {
      const b = el('button', `bk-nav bk-nav--${dir < 0 ? 'prev' : 'next'}`, c2);
      b.type = 'button'; b.setAttribute('aria-label', label);
      b.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      b.addEventListener('click', () => go(dir));
      return b;
    };
    layer.navs = [nav(-1, '이전 장', 'M15 4l-8 8 8 8'), nav(1, '다음 장', 'M9 4l8 8-8 8')];
    makeLeaves();

    // 눌러서: 닫힌 책은 펼치고, 펼쳐진 책에서는 누른 쪽(왼쪽/오른쪽)의 결과지 앞면 ↔ 뒷면
    stage.addEventListener('click', (e) => {
      if (layer.bookState === 'closed') { openBook(); return; }
      if (layer.bookState !== 'open') return;
      const hit = (node) => { const r = node.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
      if (hit(layer.baseLeft)) togglePage(2 * spread);
      else if (hit(layer.baseRight)) togglePage(2 * spread + 1);
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
      if (scroll.scrollTop > (RUNWAY_VH + 0.55) * vh && layer.bookState === 'closed') openBook();   // 책 화면이 보이기 시작하면 덮여 있던 책이 펼쳐짐
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

  // 떠 있는 결과지에 들어갈 그림: 큰(가까운) 자리부터 최신 결과지, 결과지가 모자라면 처음부터 다시
  const floatingSrc = (f, i) => { const sh = sheets[layer.slotRank[i] % sheets.length]; return sh[f.face]; };

  // 책의 넘길 수 있는 장들: 한 장 = 앞뒤 2쪽. 앞면 = 오른쪽에 보이는 쪽, 뒷면 = 넘긴 뒤 왼쪽에 보이는 쪽. 첫 장의 앞면이 펼쳐졌을 때 오른쪽 쪽이 됨
  // 쪽 번호 n 은 sheets[n] (0 = 최신). 0번 쪽은 촤라락 넘어온 마지막 장의 뒷면이 보여 주고, 1번 쪽부터 이 장들이 보여 줌
  function makeLeaves() {
    (layer.leaves || []).forEach((l) => l.remove());
    if (layer.p0host) layer.p0host.remove();
    layer.pageImgs = new Map();
    layer.pageFrames = new Map();                       // 쪽 번호 → 결과지 네모칸 위에 덮는 칸 (뒷면 그림이 여기에만 보임)
    layer.leaves = [];
    const count = Math.max(1, Math.ceil((sheets.length - 1) / 2));
    const page = (parent, cls, n) => {
      const f = el('div', `bk-face ${cls}`, parent);
      if (sheets[n]) {
        const img = el('img', 'bk-sheet', f);
        img.alt = ''; img.draggable = false;
        layer.pageImgs.set(n, img);
        layer.pageFrames.set(n, el('div', 'bk-frame', f));
      }
    };
    // 0번 쪽은 촤라락 넘어온 마지막 장이 보여 주므로, 그 위(왼쪽 쪽 자리)에 네모칸 덮개를 따로 둠
    layer.p0host = el('div', 'bk-frame-host', layer.book);
    layer.pageFrames.set(0, el('div', 'bk-frame', layer.p0host));
    for (let j = 0; j < count; j++) {
      const leaf = el('div', 'bk-leaf');
      layer.book.insertBefore(leaf, layer.coverBoard);
      page(leaf, 'bk-face--r', 2 * j + 1);
      page(leaf, 'bk-face--l bk-face--back', 2 * j + 2);
      layer.leaves.push(leaf);
    }
  }
  const pageSrc = (n) => { const sh = sheets[n]; return sh ? sh.front : ''; };            // 쪽 전체는 늘 앞면 그림 (뒷면은 네모칸에만 덮어 보임)
  function setFanBack(src) {
    const f = layer.fans[FAN_COUNT - 1];
    f.dataset.back = src;
    f.querySelectorAll('.lf-back').forEach((i) => { i.style.backgroundImage = `url('${src}')`; });
  }
  // 가까운 장의 그림만 불러옴 (결과지가 많아도 한꺼번에 받지 않게)
  function loadNear() {
    layer.leaves.forEach((leaf, j) => {
      if (j < spread - 2 || j > spread + 2) return;
      [2 * j + 1, 2 * j + 2].forEach((n) => { const img = layer.pageImgs.get(n); if (img && !img.getAttribute('src')) img.src = pageSrc(n); });
    });
  }
  // 새 목록으로 책·떠 있는 결과지를 다시 채움 (책이 아직 닫혀 있을 때만)
  function applySheets() {
    sheets = compose();
    layer.sheets.forEach((s, i) => { s.img.src = floatingSrc(s.f, i); });
    makeLeaves();
    setFanBack(pageSrc(0));
    setSpread(0);
  }
  const preload = (src) => new Promise((resolve) => { const im = new Image(); im.onload = im.onerror = resolve; im.src = src; });
  // 쪽을 누르면 그 결과지의 가운데 네모칸 안의 그림만 앞면 ↔ 뒷면으로 번갈아 바뀜 (머리띠·표 등 나머지는 그대로)
  async function togglePage(n) {
    const sh = sheets[n];
    const frame = layer.pageFrames.get(n);
    if (!sh || !frame || sh.flipping) return;
    sh.flipping = true;
    if (!sh.showBack) {
      await preload(sh.back);                                       // 다 받은 뒤에 보여 줌 (깜빡임 방지)
      frame.style.backgroundImage = `url('${sh.back}')`;
      frame.classList.add('is-on');
    } else {
      frame.classList.remove('is-on');
    }
    sh.showBack = !sh.showBack;
    await sleep(320);
    sh.flipping = false;
  }

  // 책 상태 갱신: spread 장만큼 넘어간 상태
  function setSpread(n) {
    const LEAVES = layer.leaves.length;
    spread = Math.max(0, Math.min(LEAVES, n));
    layer.leaves.forEach((leaf, j) => {
      const flipped = j < spread;
      leaf.classList.toggle('is-flipped', flipped);
      // 겹친 종이가 서로 파묻히지 않게 아주 조금씩 높이를 다르게 함
      leaf.style.setProperty('--z', flipped ? 5 + j * 0.8 : (LEAVES - j) * 0.14);   // 오른쪽에 있을 땐 촤라락 장들보다 아래, 왼쪽으로 넘어가면 그 위
    });
    layer.classList.toggle('is-first', spread === 0);
    layer.classList.toggle('is-last', spread === LEAVES);
    loadNear();
  }
  // 닫혀 있던 책이 3D 로 펼쳐짐: 위에서 내려다보는 시점 → 표지가 열림 → 빈 장들이 촤라락 넘어가며 최신 결과지가 왼쪽에 펼쳐짐
  const easeFlip = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // 저장된 목록이 오기를 잠깐(최대 2.5초) 기다렸다가 펼침 → 방금 만든 결과지가 맨 먼저 나오게
  function openBook() {
    if (layer.bookState !== 'closed') return;
    layer.bookState = 'waiting';
    Promise.race([layer.ready, sleep(2500)]).then(() => { layer.bookState = 'closed'; startOpening(); });
  }
  function startOpening() {
    if (layer.bookState !== 'closed') return;
    layer.bookState = 'opening';
    const book = layer.book;
    book.classList.add('is-opening');
    book.classList.remove('is-closed');                                    // 표지가 열리며 책이 가운데에서 제자리로 이동
    const COVER_DELAY = 350; const COVER_MS = 1500;
    const fans = layer.fans;
    const FZ = (i, p) => {                                                  // 오른쪽에서는 먼저 넘어갈 장이 위, 왼쪽에서는 나중에 넘어온 장이 위
      const right = 1 + (FAN_COUNT - i) * 0.25 - 0.5;
      const left = 1 + (i + 1) * 0.25 + 0.5;
      const t = Math.min(1, Math.max(0, (p - 0.35) / 0.3));
      return right + (left - right) * t * t * (3 - 2 * t) + 2.2 * Math.sin(Math.PI * p);
    };
    fans.forEach((f) => { f.style.visibility = 'visible'; f.style.transform = `translateZ(${FZ(+f.dataset.fan, 0)}px)`; });
    const t0 = performance.now() + COVER_DELAY + 550;                       // 표지가 열리는 도중부터 넘기기 시작
    const total = (FAN_COUNT - 1) * FAN_STAGGER_MS + FAN_FLIP_MS;
    const step = (now) => {
      const el_ = now - t0;
      fans.forEach((f) => {
        const i = +f.dataset.fan;
        const p = easeFlip(Math.min(1, Math.max(0, (el_ - i * FAN_STAGGER_MS) / FAN_FLIP_MS)));
        if (Math.abs(p - (f._p ?? -1)) > 0.0003) { f._p = p; f.dataset.p = p.toFixed(4); updateCurl(f, p); f.style.transform = `translateZ(${FZ(i, p).toFixed(3)}px)`; }
      });
      layer.fanShadow = Math.max(...fans.map((f) => { const p = f._p || 0; return p > 0.001 && p < 0.985 ? Math.sin(Math.PI * p) : 0; }));
      if (el_ < total + 60) requestAnimationFrame(step);
      else { layer.bookState = 'open'; layer.cap.classList.add('is-on'); book.classList.remove('is-opening'); }
    };
    requestAnimationFrame(step);
  }

  const go = (dir) => { if (layer && layer.bookState === 'open') setSpread(spread + dir); };

  function watch(on) {
    if (on && !stopWatch && window.ResultSheet && window.ResultSheet.watchSwipe) {
      // 오른쪽으로 긋기 = 이전 장, 왼쪽으로 긋기 = 다음 장 (책을 넘기는 방향과 같게)
      stopWatch = window.ResultSheet.watchSwipe((dir) => go(dir > 0 ? -1 : 1), document.createElement('p'));
    } else if (!on && stopWatch) { stopWatch(); stopWatch = null; }
  }

  function open() {
    if (window.ResultSheet && window.ResultSheet.stopWatching) window.ResultSheet.stopWatching();
    document.body.querySelectorAll('.bar__side').forEach((n) => n.remove());
    if (!layer) {
      sheets = compose();
      build();
      // 저장 중인 결과지가 있으면 끝나길 기다린 뒤 목록을 새로 받아 책에 반영
      layer.ready = (async () => {
        if (pendingSave) await Promise.race([pendingSave, sleep(12000)]);
        await fetchList();
        if (layer.bookState === 'closed' || layer.bookState === 'waiting') {
          const wasWaiting = layer.bookState === 'waiting';
          if (!wasWaiting) layer.bookState = 'closed';
          applySheets();
        }
      })();
    }
    document.body.classList.add('is-archive');
    layer.querySelector('.ar-scroll').scrollTop = 0;
    requestAnimationFrame(() => { layer.classList.add('is-on'); layer.start(); });
    setTimeout(() => { const r = document.getElementById('result-layer'); if (r) r.classList.remove('is-on'); }, 800);   // 결과지 화면은 아카이빙이 다 덮은 뒤 치움
  }

  // 키보드로 넘기기 (한 번만 등록)
  window.addEventListener('keydown', (e) => {
    if (!layer || !layer.classList.contains('is-on')) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  window.Archive = { open, go, save, sheets: () => sheets };
  // 상단 archive 버튼: 어느 화면에서든 눌러서 바로 아카이빙1 로 이동
  const archiveBtn = document.getElementById('archive-btn');
  if (archiveBtn) archiveBtn.addEventListener('click', (e) => { e.preventDefault(); open(); });
  if (/[?&]archive=1/.test(location.search)) window.addEventListener('load', open);   // 확인용: ?archive=1
})();
