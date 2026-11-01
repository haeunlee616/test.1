// ---------- 결과지 화면 (앞면 · 뒷면) ----------
// ResultSheet.show(응답들, { demo }) : 설문이 끝나면 결과지를 띄움. 앞면은 '지금' 색 바탕 + 사진이 든 큰 글자,
// 뒷면은 사진 바탕 + '지금' 색 큰 글자. 손가락을 카메라에 대고 왼쪽→오른쪽으로 쓸면 뒤집힘 (카메라가 없으면 마우스).
// 규칙(어느 응답이 어디 들어가는지)은 result.js, 이미지·색 입히기는 stickers.js, 문장 상자는 sentence.js, 닉네임은 nickname.js.
(function () {
  const SHEET_W = 1050;
  const SHEET_H = 1407;
  const FRAME = { x: 40, y: 268, w: 970, h: 654 };       // 가운데 네모 칸 (결과지 시안 px)
  const WORD_FONT = '"American Typewriter", serif';
  const CAP_HEIGHT = 0.672;                              // American Typewriter Bold 대문자 높이 / 글자 크기
  const LINE_PITCH = 0.73;                               // 줄 사이 간격 / 글자 크기 (윗줄 아래와 아랫줄 위가 조금 겹침)
  const DESCENDER = 0.25;                                // 맨 아랫줄 g·p 꼬리
  const WORD_FILL = 1.02;                                // 가로 줄 때 칸을 살짝 넘겨 꽉 차 보이게 (넘친 부분은 칸 밖에서 잘림)
  const BEAD = { width: 9.5, gap: 6.5 };                 // 글자 둘레 점선: 둥근 점(굵기) · 점 사이 간격 — 시안의 몽글몽글한 가장자리

  // 옵션 그림의 너비(시안 px). 위치·기울기는 매번 무작위로 정함 (placeStickers)
  const SIZES = {
    fail: 115, hollow: 100, challengeNow: 105, start: 70, pause: 93, puzzle: 230, person: 95,
    regret: 300, experience: 230, power: 108, straight: 130, giveup: 110, challengeThen: 130,
  };
  const TILT_MAX = 5;                                    // 기울기: -5° ~ +5° 무작위
  const ZONE = { left: [0.02, 0.52], right: [0.48, 0.98] };   // 그림 가운데가 놓일 가로 범위(칸 너비 비율): 설문3·4 는 왼쪽, 설문5 는 오른쪽 (겹치는 구간은 있음)
  const MAX_WORD_OVERLAP = 0.08;                         // 그림이 큰 글자를 덮어도 되는 비율 (넘으면 다른 자리를 찾음)
  const MAX_STICKER_OVERLAP = 0.06;                      // 그림끼리 겹쳐도 되는 비율
  // 설문 응답 → 보여줄 그림. kind: tint(설문3·당시색) / line(설문4·검정 그대로) / now(설문5·지금색)
  const STICKER_OF = {
    tint: { '도전': 'challengeThen', '멈춤': 'pause', '기다림': 'pause', '망설임': 'pause', '직진': 'straight', '포기': 'giveup', '허탈함': 'hollow' },
    line: { '사회적 기준': 'puzzle', '자기 실망': 'person', '취업·합격 여부': 'fail', '후회와 미련': 'regret' },
    now: { '경험': 'experience', '도전': 'challengeNow', '시작': 'start', '동력': 'power' },
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.append(n); return n; };
  const svgEl = (tag, attrs) => { const n = document.createElementNS(SVG_NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

  // ----- 큰 글자: 줄 나누기 + 크기 -----
  // 단어를 줄로 나누는 모든 경우 중 칸(가로·세로)을 넘지 않으면서 글자가 가장 커지는 경우를 고름 (같으면 줄이 적은 쪽). 모든 줄의 글자 크기는 같고 가운데 정렬.
  function layoutWord(text, boxW, boxH) {
    // 관사 A / An 은 바로 뒤 단어와 한 덩어리로 묶어 같은 줄에 둠 (예: 'A New' / 'Beginning')
    const raw = text.split(/\s+/).filter(Boolean);
    const words = [];
    for (let i = 0; i < raw.length; i++) {
      if (/^an?$/i.test(raw[i]) && i + 1 < raw.length) { words.push(`${raw[i]} ${raw[i + 1]}`); i++; } else words.push(raw[i]);
    }
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `700 100px ${WORD_FONT}`;
    const ink = (line) => {
      const m = ctx.measureText(line);
      return m.actualBoundingBoxLeft + m.actualBoundingBoxRight;      // 100px 일 때 잉크 너비
    };
    let best = null;
    const n = words.length;
    for (let mask = 0; mask < (1 << Math.max(n - 1, 0)); mask++) {     // 단어 사이마다 줄바꿈 할지 여부
      const lines = [];
      let cur = [words[0]];
      for (let i = 1; i < n; i++) {
        if (mask & (1 << (i - 1))) { lines.push(cur.join(' ')); cur = [words[i]]; } else cur.push(words[i]);
      }
      lines.push(cur.join(' '));
      const widest = Math.max(...lines.map(ink));
      const byWidth = (boxW * WORD_FILL) / widest * 100;
      const heightUnits = CAP_HEIGHT + DESCENDER + (lines.length - 1) * LINE_PITCH;
      const byHeight = boxH / heightUnits;
      const size = Math.min(byWidth, byHeight);
      if (!best || size > best.size + 0.01 || (Math.abs(size - best.size) <= 0.01 && lines.length < best.lines.length)) best = { lines, size };
    }
    return best;
  }

  // 글자 줄마다의 위치 (칸 안 좌표): SVG 그리기와 '글자가 차지하는 자리' 계산이 같은 값을 씀
  function wordGeometry(layout) {
    const { lines, size } = layout;
    const blockH = (CAP_HEIGHT + (lines.length - 1) * LINE_PITCH) * size;
    const top = (FRAME.h - blockH - DESCENDER * size * 0.5) / 2;       // 위아래 가운데 (꼬리는 절반만 계산)
    return lines.map((text, i) => ({ text, x: FRAME.w / 2, y: top + CAP_HEIGHT * size + i * LINE_PITCH * size, size }));
  }

  // 큰 글자 SVG 조각: 글자(채움 + 둥근 점 둘레)를 mask/채움 양쪽에서 같이 쓰도록 <g> 를 만들어 줌. line 으로 둘레 모양을 바꿀 수 있음
  function wordGroup(layout, attrs, line) {
    const g = svgEl('g', attrs);
    const stroke = line || { width: BEAD.width, dash: `0 ${BEAD.gap}`, cap: 'round' };
    wordGeometry(layout).forEach((ln) => {
      const t = svgEl('text', {
        x: ln.x, y: ln.y,
        'text-anchor': 'middle', 'font-family': WORD_FONT, 'font-weight': 700, 'font-size': ln.size,
        'stroke-width': stroke.width, 'stroke-dasharray': stroke.dash, 'stroke-linecap': stroke.cap, 'stroke-linejoin': 'round',
      });
      t.textContent = ln.text;
      g.append(t);
    });
    return g;
  }

  // 글자 한 자 한 자를 따로 떨어뜨리기 위한 조각 (글자 줄마다 위치를 재서 한 글자씩 <text> 로 만듦)
  function charPieces(layout, color) {
    const ctx = document.createElement('canvas').getContext('2d');
    const g = svgEl('g', { class: 'rs-pieces' });
    wordGeometry(layout).forEach((ln) => {
      ctx.font = `700 ${ln.size}px ${WORD_FONT}`;
      const total = ctx.measureText(ln.text).width;
      const startX = ln.x - total / 2;
      Array.from(ln.text).forEach((ch, i) => {
        if (/\s/.test(ch)) return;
        const right = ctx.measureText(ln.text.slice(0, i + 1)).width;
        const t = svgEl('text', {
          x: startX + right - ctx.measureText(ch).width, y: ln.y,
          'font-family': WORD_FONT, 'font-weight': 700, 'font-size': ln.size,
          fill: color, stroke: color, 'stroke-width': BEAD.width + 2, 'stroke-linejoin': 'round',
        });
        t.style.transformBox = 'fill-box';
        t.style.transformOrigin = 'center';
        t.textContent = ch;
        g.append(t);
      });
    });
    return g;
  }

  // ----- 그림들 -----
  // 그림 노드만 만들어 둠 (위치·기울기는 큰 글자 모양이 정해진 뒤 placeStickers 가 정함)
  async function stickerNodes(resp, colors) {
    const pick = (n) => { const it = resp[n]; return it && typeof it === 'object' && !Array.isArray(it) && 'answer' in it ? it.answer : it; };
    const S = window.Stickers;
    const jobs = [];
    const seen = new Set();
    const add = (key, kind, make) => { if (seen.has(key)) return; seen.add(key); jobs.push({ key, kind, make }); };
    (pick(2) || []).forEach((o) => { const key = STICKER_OF.tint[o]; if (key && S.forOption(o)) add(key, 'tint', () => S.tint(o, colors.then || '#000000')); });
    (pick(3) || []).forEach((o) => { const key = STICKER_OF.line[o]; const src = S.lineForOption(o); if (key && src) add(key, 'line', async () => { const img = new Image(); img.src = src; await img.decode().catch(() => {}); return img; }); });
    (pick(4) || []).forEach((o) => { const key = STICKER_OF.now[o]; if (key && S.nowForOption(o)) add(key, 'now', () => S.tintNow(o, colors.now || '#000000')); });
    return Promise.all(jobs.map(async ({ key, kind, make }) => {
      const node = await make();
      const w = SIZES[key];
      const ratio = node.tagName === 'CANVAS' ? node.height / node.width : node.naturalHeight / node.naturalWidth;
      node.classList.add('rs-sticker');
      node.dataset.kind = kind;                          // line(설문4 선 그림)은 큰 글자보다 아래, 나머지는 위
      node.style.cssText = `width:${w}px;visibility:hidden`;
      return { key, kind, node, w, h: w * (ratio || 1) };
    }));
  }

  // 작은 난수 생성기 (같은 seed 면 같은 배치 — 확인용)
  function makeRng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // 큰 글자(둘레 포함)와 가운데 문장 상자가 차지하는 자리를 0/1 격자로 만들고, 어느 사각형이 얼마나 덮는지 바로 셀 수 있게 누적합을 만듦
  function occupancy(layout, obstacle) {
    const W = FRAME.w; const H = FRAME.h;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (layout) {
      c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineWidth = BEAD.width; c.lineJoin = 'round';
      c.textAlign = 'center';
      wordGeometry(layout).forEach((line) => { c.font = `700 ${line.size}px ${WORD_FONT}`; c.fillText(line.text, line.x, line.y); c.strokeText(line.text, line.x, line.y); });
    }
    if (obstacle) c.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    const px = c.getImageData(0, 0, W, H).data;
    const sat = new Int32Array((W + 1) * (H + 1));
    for (let y = 1; y <= H; y++) {
      let row = 0;
      for (let x = 1; x <= W; x++) {
        row += px[((y - 1) * W + (x - 1)) * 4 + 3] > 40 ? 1 : 0;
        sat[y * (W + 1) + x] = sat[(y - 1) * (W + 1) + x] + row;
      }
    }
    return (x, y, w, h) => {                              // 이 사각형 안에서 글자·문장이 차지한 비율
      const x0 = Math.max(0, Math.round(x)); const y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)); const y1 = Math.min(H, Math.round(y + h));
      if (x1 <= x0 || y1 <= y0) return 0;
      const S = (xx, yy) => sat[yy * (W + 1) + xx];
      return (S(x1, y1) - S(x0, y1) - S(x1, y0) + S(x0, y0)) / (w * h);
    };
  }

  // 그림 자리 정하기: 설문3·4 그림은 왼쪽, 설문5 그림은 오른쪽 구역에서 무작위로 골라, 큰 글자·가운데 문장·다른 그림을 너무 덮지 않는 자리를 찾음. 기울기도 -5°~5° 무작위
  function placeStickers(items, layout, obstacle, rng) {
    const covered = occupancy(layout, obstacle);
    const placed = [];
    const margin = 8;
    const pad = 6;                                        // 그림 둘레 여유
    const order = [...items].sort((a, b) => b.w * b.h - a.w * a.h);   // 큰 그림부터 자리를 잡음
    order.forEach((item) => {
      const zone = item.kind === 'now' ? ZONE.right : ZONE.left;
      const w = item.w; const h = item.h;
      let best = null;
      for (let tries = 0; tries < 600; tries++) {
        const cx = FRAME.w * (zone[0] + rng() * (zone[1] - zone[0]));
        const cy = FRAME.h * (0.03 + rng() * 0.94);
        const x = Math.min(Math.max(cx - w / 2, margin), FRAME.w - w - margin);
        const y = Math.min(Math.max(cy - h / 2, margin), FRAME.h - h - margin);
        const wordCover = covered(x - pad, y - pad, w + pad * 2, h + pad * 2);
        let stickerCover = 0;
        placed.forEach((p) => {
          const ox = Math.max(0, Math.min(x + w, p.x + p.w) - Math.max(x, p.x));
          const oy = Math.max(0, Math.min(y + h, p.y + p.h) - Math.max(y, p.y));
          stickerCover = Math.max(stickerCover, (ox * oy) / Math.min(w * h, p.w * p.h));
        });
        const score = wordCover * 3 + stickerCover * 5;
        if (!best || score < best.score) best = { x, y, score };
        if (wordCover <= MAX_WORD_OVERLAP && stickerCover <= MAX_STICKER_OVERLAP) { best = { x, y, score }; break; }
      }
      item.pos = { x: best.x, y: best.y, rot: (rng() * 2 - 1) * TILT_MAX };
      placed.push({ x: best.x, y: best.y, w, h });
    });
  }

  // 앞면·뒷면에 같은 배치를 적용
  function placeAll(root, layout, seed) {
    const front = root.faces.front;
    const sentence = front.art.querySelector('.rs-sentence');
    const obstacle = sentence ? { x: (FRAME.w - sentence.offsetWidth) / 2, y: (FRAME.h - sentence.offsetHeight) / 2, w: sentence.offsetWidth, h: sentence.offsetHeight } : null;
    placeStickers(front.stickers, layout, obstacle, makeRng(seed));
    ['front', 'back'].forEach((side) => {
      root.faces[side].stickers.forEach((s, i) => {
        const p = front.stickers[i].pos;
        s.node.style.left = `${p.x}px`;
        s.node.style.top = `${p.y}px`;
        s.node.style.transform = `rotate(${p.rot}deg)`;
        s.node.dataset.rot = p.rot;
        s.node.style.visibility = 'visible';
      });
    });
  }

  // ----- 한 면 만들기 -----
  // 앞면은 처음에 '비어 있는' 상태로 만들어 두고 show() 가 차례로 켬: 사진 → 글자 모양으로 뚫린 배경색 → 가운데 문장 → 그림들 → 표 글자
  function buildFace(side, ctx) {
    const face = el('div', `rs-face rs-face--${side}`);
    const frame = el('div', 'rs-frame', face);
    frame.style.cssText = `left:${FRAME.x}px;top:${FRAME.y}px;width:${FRAME.w}px;height:${FRAME.h}px`;
    const art = el('div', 'rs-art', frame);
    if (ctx.hero) {
      if (side === 'front') {
        const photo = el('div', 'rs-photo rs-step', art);        // 앞면: 사진이 먼저 깔리고
        photo.style.backgroundImage = `url(${ctx.hero})`;
        face.photo = photo;
      } else {
        art.style.backgroundColor = '#222';
        art.style.backgroundImage = `url(${ctx.hero})`;          // 뒷면: 사진이 바탕
      }
    }
    face.art = art;
    face.frame = frame;
    return face;
  }

  // 큰 글자를 면에 그려 넣음
  function paintWord(face, side, layout, ctx) {
    face.art.querySelector('.rs-word')?.remove();
    if (!layout) return;
    const svg = svgEl('svg', { class: 'rs-word', viewBox: `0 0 ${FRAME.w} ${FRAME.h}`, width: FRAME.w, height: FRAME.h });
    if (side === 'front') {
      // 앞면: 사진 위에 '지금' 색 종이를 덮되 글자 모양(둘레 점 포함)만 뚫음. 처음엔 뚫린 자리를 글자 조각이 막고 있다가 점선으로 오려낸 뒤 떨어짐
      const color = ctx.color || '#e8ff8e';
      const mask = svgEl('mask', { id: 'rs-word-hole', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: FRAME.w, height: FRAME.h });
      mask.append(svgEl('rect', { x: 0, y: 0, width: FRAME.w, height: FRAME.h, fill: '#fff' }));
      mask.append(wordGroup(layout, { fill: '#000', stroke: '#000' }));
      const clip = svgEl('clipPath', { id: 'rs-cut-clip' });
      clip.append(svgEl('rect', { class: 'rs-cut-rect', x: 0, y: 0, width: 0, height: FRAME.h }));
      const defs = svgEl('defs');
      defs.append(mask, clip);
      svg.append(defs);
      svg.append(svgEl('rect', { x: 0, y: 0, width: FRAME.w, height: FRAME.h, fill: color, mask: 'url(#rs-word-hole)' }));
      svg.append(charPieces(layout, color));
      const cut = wordGroup(layout, { fill: 'none', stroke: '#111', 'clip-path': 'url(#rs-cut-clip)', class: 'rs-cut' }, { width: 2.6, dash: '2.4 4.6', cap: 'round' });
      svg.append(cut);
      svg.classList.add('rs-step', 'rs-wipe');
    } else {
      const c = ctx.color || '#e8ff8e';
      svg.append(wordGroup(layout, { fill: c, stroke: c }));
    }
    face.art.append(svg);
  }

  // 표 한 칸: 왼쪽 제목(label)은 처음부터 보이고, 오른쪽 내용(value)만 나중에 채워짐
  function infoTable(title, rows, fields, side) {
    const box = el('div', 'rs-table');
    el('div', 'rs-table__title', box).textContent = title;
    rows.forEach(({ label, key }) => {
      const row = el('div', 'rs-row', box);
      el('div', 'rs-row__label', row).textContent = label;
      const v = el('div', 'rs-row__value', row);
      fields[side][key] = v;
    });
    return box;
  }

  // ----- 전체 결과지 (앞면·뒷면 + 3D 카드) -----
  async function build(resp) {
    const data = window.Result.fromSurvey(resp);
    const colors = (typeof resp[5] === 'object' && resp[5] && 'answer' in resp[5] ? resp[5].answer : resp[5]) || {};
    const ctx = { color: data.frameColor, hero: data.hero };
    const root = el('div', 'rs-sheet');
    const card = el('div', 'rs-card', root);
    const faces = {};
    const fields = { front: {}, back: {} };
    for (const side of ['front', 'back']) {
      const face = buildFace(side, ctx);
      faces[side] = face;
      card.append(face);
      // 머리 (회색 띠 + failure noun (NO SUCCESS) + 닉네임)
      const head = el('div', 'rs-head', face);
      // failure · (NO SUCCESS) 는 글자와 취소선을 따로 올려 두어 앞면에서는 취소선이 쓱 그어지게 함
      const part = (cls, file) => { const img = el('img', cls, head); img.src = `assets/result/${file}.png`; img.alt = ''; return img; };
      part('rs-head__failure', 'failure-base');
      const strikeA = part('rs-head__failure rs-strike', 'failure-strike');
      part('rs-head__noun', 'noun');
      part('rs-head__no', 'no-success-base');
      const strikeB = part('rs-head__no rs-strike', 'no-success-strike');
      const mark = await window.Nickname.render(data.nickname);
      mark.classList.add('rs-nick');
      mark.style.width = `${mark.getAttribute('width') * 1.5}px`;
      mark.style.height = 'auto';
      head.append(mark);
      if (side === 'front') { face.strikes = [strikeA, strikeB]; face.nick = mark; [strikeA, strikeB, mark].forEach((n) => n.classList.add('is-hidden')); }
      // 그림들
      face.stickers = await stickerNodes(resp, colors);
      face.stickers.forEach((s) => { face.art.append(s.node); if (side === 'front') s.node.classList.add('rs-step', 'rs-pop'); });
      // 문장 상자 (가운데 칸의 정중앙, 가장 위)
      const sentence = window.Sentence.render(window.Sentence.segment(data.sentence));
      sentence.classList.add('rs-sentence');
      if (side === 'front') sentence.classList.add('rs-step');
      face.sentence = sentence;
      face.art.append(sentence);
      // 손잡이 네모
      ['tl', 'tr', 'bl', 'br'].forEach((c) => el('i', `rs-handle rs-handle--${c}`, face.frame));
      // 표 (제목은 바로, 내용은 비워 둠)
      const then = infoTable('Then', [
        { label: '상황', key: 'situation' }, { label: '판단 기준', key: 'criteria' }, { label: '해석', key: 'interpretation' },
      ], fields, side);
      then.classList.add('rs-then');
      const now = infoTable('Now', [
        { label: '의미', key: 'meaning' }, { label: data.now.newStart, key: 'definition' }, { label: '예문', key: 'example' },
      ], fields, side);
      now.classList.add('rs-now');
      const divider = el('div', 'rs-divider', face);
      face.append(then, now, divider);
      face.divider = divider;
      if (side === 'front') divider.classList.add('is-hidden');
      else face.querySelectorAll('.rs-row').forEach((row) => row.classList.add('is-drawn'));
    }
    root.faces = faces;
    root.ctx = ctx;
    root.fields = fields;
    root.nickname = data.nickname;
    root.texts = { situation: data.situation, criteria: data.criteria ? data.criteria.text : '', meaning: data.now.meaning, definition: data.now.definition };
    root.typed = {};
    // 뒷면은 처음부터 완성된 상태로 둠 (앞면의 내용은 타이핑으로 채워짐)
    Object.entries(root.texts).forEach(([k, v]) => { fields.back[k].textContent = v; });
    return root;
  }

  // AI 가 보낸 문장을 저장: 뒷면은 바로, 앞면은 이미 타이핑이 끝난 칸만 바로 채움
  function fillText(root, key, text) {
    if (!text) return;
    root.texts[key] = text;
    root.fields.back[key].textContent = text;
    if (root.typed[key]) root.fields.front[key].textContent = text;
  }

  // ----- 타이핑처럼 글자가 하나씩 나오게 -----
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * (window.__rsSpeed || 1)));
  // 아직 안 나온 글자 자리를 투명하게 미리 잡아 둠 (타이핑 중에 줄 높이가 바뀌어 아래 칸이 밀리지 않게)
  function reserve(node, text) {
    node.textContent = '';
    const typed = el('span', 'rs-typed', node);
    const ghost = el('span', 'rs-ghost', node);
    ghost.textContent = text || '';
    return { typed, ghost };
  }
  function typeInto(node, text, perChar) {
    return new Promise((resolve) => {
      const chars = Array.from(text || '');
      const { typed, ghost } = reserve(node, text);
      node.classList.add('is-typing');
      let i = 0;
      const tick = () => {
        i++;
        typed.textContent = chars.slice(0, i).join('');
        ghost.textContent = chars.slice(i).join('');
        if (i < chars.length) setTimeout(tick, perChar * (window.__rsSpeed || 1));
        else { node.classList.remove('is-typing'); resolve(); }
      };
      if (!chars.length) { node.classList.remove('is-typing'); resolve(); return; }
      tick();
    });
  }

  // ----- 모션 도우미 -----
  const speed = () => window.__rsSpeed || 1;
  // 값을 0→1 로 천천히 바꾸며 fn(t) 를 부름 (SVG 속성처럼 CSS 로 움직이기 어려운 것용)
  function tween(ms, fn) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min((now - t0) / (ms * speed()), 1);
        fn(t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // easeInOutCubic
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  const play = (node, frames, opts) => node.animate(frames, { fill: 'both', ...opts, duration: opts.duration * speed(), delay: (opts.delay || 0) * speed() }).finished.catch(() => {});
  const wipeOn = (node) => { node.classList.remove('is-hidden'); };

  // 점선이 글자를 따라 그려진 뒤, 오려진 글자 조각들이 하나씩 떨어져 나가며 사진이 드러남
  async function cutOutWord(svg) {
    const rect = svg.querySelector('.rs-cut-rect');
    if (rect) await tween(1300, (t) => rect.setAttribute('width', FRAME.w * t));
    await sleep(250);
    const pieces = [...svg.querySelectorAll('.rs-pieces text')];
    const fall = pieces.map((p) => {
      const dx = (Math.random() - 0.5) * 70;
      const dy = 160 + Math.random() * 220;
      const rot = (Math.random() - 0.5) * 70;
      return play(p, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 }],
        { duration: 700 + Math.random() * 400, delay: Math.random() * 600, easing: 'cubic-bezier(0.5, 0, 1, 0.6)' });
    });
    svg.querySelector('.rs-cut')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 * speed(), fill: 'forwards' });
    await Promise.all(fall);
    svg.querySelector('.rs-pieces')?.remove();
    svg.querySelector('.rs-cut')?.remove();
  }

  // 문장 상자가 위에서 하나씩 툭툭 떨어져 붙음
  async function dropBoxes(sentence) {
    const boxes = [...sentence.querySelectorAll('.sentence-boxes__box')];
    boxes.forEach((b) => { b.style.opacity = '0'; });
    sentence.classList.add('is-in');
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      b.style.opacity = '';
      play(b, [
        { transform: 'translateY(-70px) rotate(-3deg)', opacity: 0 },
        { transform: 'translateY(8px) rotate(0.5deg)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
      ], { duration: 380, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
      await sleep(240);
    }
    await sleep(300);
  }

  // 그림이 칸 바깥에서 4~5컷으로 끊어 날아와 붙는 스톱모션 (구겨진 종이 던지기와 같은 호흡)
  function throwIn(node) {
    const rot = parseFloat(node.dataset.rot || '0');
    const cx = parseFloat(node.style.left) + node.offsetWidth / 2 - FRAME.w / 2;
    const cy = parseFloat(node.style.top) + node.offsetHeight / 2 - FRAME.h / 2;
    const len = Math.hypot(cx, cy) || 1;
    const dx = cx / len; const dy = cy / len;
    const spin = Math.random() < 0.5 ? -1 : 1;
    const cuts = [
      `translate(${dx * 260}px,${dy * 260}px) rotate(${rot + spin * 30}deg) scale(1.14)`,
      `translate(${dx * 120}px,${dy * 120}px) rotate(${rot - spin * 16}deg) scale(1.09)`,
      `translate(${dx * 36}px,${dy * 36}px) rotate(${rot + spin * 8}deg) scale(1.04)`,
      `translate(0,0) rotate(${rot}deg) scale(0.94)`,
      `translate(0,0) rotate(${rot}deg) scale(1)`,
    ];
    node.classList.add('is-in');
    return play(node, cuts.map((transform, i) => ({ transform, offset: i / cuts.length, easing: 'steps(1, end)' })), { duration: 520 });
  }

  // 표 한 줄: 위쪽 줄이 쓱 그어진 뒤 내용이 타이핑됨
  const drawRow = async (valueNode) => { valueNode.parentElement.classList.add('is-drawn'); await sleep(480); };

  // 결과지가 도장 찍히듯 쿵 하고 눌렸다 돌아옴
  const thump = (sheet) => play(sheet, [
    { transform: 'scale(1) rotate(0deg)' },
    { transform: 'scale(1.03) rotate(-0.5deg)', offset: 0.3 },
    { transform: 'scale(0.985) rotate(0.35deg)', offset: 0.6 },
    { transform: 'scale(1) rotate(0deg)' },
  ], { duration: 520, easing: 'ease-out' });

  // 마지막 화면: 커서를 올린 곳이 동그란 돋보기로 크게 보임
  function setupLens(layer, root, cardWrap) {
    const D = 230;                                         // 돋보기 지름(px)
    const M = 2.6;                                         // 확대 배율
    const lens = el('div', 'rs-lens', layer);
    const inner = el('div', 'rs-lens__inner', lens);
    let shown = null;
    const load = (side) => {
      if (shown === side) return;
      shown = side;
      inner.innerHTML = '';
      const face = root.faces[side];
      const clone = face.cloneNode(true);
      const from = face.querySelectorAll('canvas');
      clone.querySelectorAll('canvas').forEach((c, i) => {      // 캔버스는 복제되지 않으므로 그림으로 바꿔 줌
        const img = new Image();
        img.src = from[i].toDataURL();
        img.className = c.className;
        img.style.cssText = c.style.cssText;
        c.replaceWith(img);
      });
      clone.style.transform = 'none';
      clone.style.backfaceVisibility = 'visible';
      inner.append(clone);
    };
    const hide = () => lens.classList.remove('is-on');
    layer.addEventListener('pointermove', (e) => {
      if (document.querySelector('.rp').dataset.stage !== '3') return hide();
      const rect = cardWrap.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return hide();
      load(root.dataset.side === 'back' ? 'back' : 'front');
      const k = (rect.width / SHEET_W) * M;
      const px = (e.clientX - rect.left) / rect.width * SHEET_W;
      const py = (e.clientY - rect.top) / rect.height * SHEET_H;
      lens.style.cssText = `left:${e.clientX - D / 2}px;top:${e.clientY - D / 2}px;width:${D}px;height:${D}px`;
      inner.style.transform = `translate(${D / 2 - px * k}px, ${D / 2 - py * k}px) scale(${k})`;
      lens.classList.add('is-on');
    });
    layer.addEventListener('pointerleave', hide);
    root.addEventListener('transitionstart', () => { shown = null; hide(); });   // 뒤집히는 중에는 숨기고, 끝난 뒤 다시 복제
  }

  // ----- 화면에 띄우기: 설문결과1(그림이 쌓임) → 설문결과2(아래로 내려가 표가 타이핑됨) → 설문결과3(작아진 결과지 + 안내) -----
  let stopWatching = null;
  async function show(responses, options) {
    const opts = options || {};
    const R = window.Result;
    const pick = (n) => { const it = responses[n]; return it && typeof it === 'object' && !Array.isArray(it) && 'answer' in it ? it.answer : it; };
    const define = pick(6) || {};
    const demo = opts.demo || {};

    const layer = document.getElementById('result-layer') || el('div', 'result-layer', document.body);
    layer.id = 'result-layer';
    layer.innerHTML = '';
    document.body.classList.add('is-result');
    const rp = el('div', 'rp', layer);
    rp.dataset.stage = '1';
    const scroll = el('div', 'rp-scroll', rp);
    const cardWrap = el('div', 'rp-card', scroll);
    const creating = el('p', 'rp-creating', scroll);
    const guide = el('div', 'rp-guide', rp);
    const g1 = el('p', 'rp-guide__item', guide);
    g1.innerHTML = '<span>1.</span>자세히 보고 싶은 부분에 커서를 올려 보세요.';
    const g2 = el('p', 'rp-guide__item', guide);
    g2.innerHTML = '<span>2.</span>모니터 카메라를 향해 손가락을 좌우로 그어보세요.';
    const more = el('button', 'rp-more', guide);
    more.type = 'button';
    more.textContent = 'discover more';
    more.addEventListener('click', () => { if (window.Archive) window.Archive.open(); });
    const note = el('p', 'rp-note', guide);
    const fit = () => {
      const u = Math.max(Math.min(window.innerWidth / 1440, window.innerHeight / 1024), 0.6);
      rp.style.setProperty('--rs-u', u);
      rp.style.top = `${window.innerHeight / 2 - 512 * u}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    requestAnimationFrame(() => layer.classList.add('is-on'));

    const root = await build(responses);
    cardWrap.append(root);
    creating.textContent = `Creating ${root.nickname}'s RE:FAILURE DICTIONARY...`;
    const front = root.faces.front;
    // 손가락을 오른쪽으로 그으면 +180°, 왼쪽으로 그으면 -180° 돌아감 (앞면 ↔ 뒷면)
    let angle = 0;
    root.dataset.side = 'front';
    window.__flipResult = (dir) => {
      angle += (dir < 0 ? -180 : 180);
      root.querySelector('.rs-card').style.transform = `rotateY(${angle}deg)`;
      root.dataset.side = (Math.round(angle / 180) % 2 === 0) ? 'front' : 'back';
      root.classList.toggle('is-flipped', root.dataset.side === 'back');
    };

    // AI 에게 물어보는 것들은 화면이 쌓이는 동안 미리 요청
    const wordPromise = demo.word ? Promise.resolve(demo.word) : R.translateWord(define.word);
    const interpPromise = demo.interpretation ? Promise.resolve(demo.interpretation) : R.interpret(responses);
    const examplePromise = demo.example ? Promise.resolve(demo.example) : R.exampleSentence(define.word, define.meaning);

    // 큰 글자 모양을 정하고 그림 자리를 잡아 둠 (아직 보이지 않음)
    const english = await wordPromise;
    const text = english || String(define.word || '').trim();
    await document.fonts.load(`700 100px ${WORD_FONT}`);
    const layout = text ? layoutWord(text, FRAME.w, FRAME.h) : null;
    paintWord(root.faces.front, 'front', layout, root.ctx);
    paintWord(root.faces.back, 'back', layout, root.ctx);
    root.dataset.word = text;
    placeAll(root, layout, opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296));
    const rng = makeRng(opts.seed != null ? opts.seed + 1 : Math.floor(Math.random() * 4294967296));
    const wordSvg = front.art.querySelector('.rs-word');

    // 0) 맨 위 회색 띠: 닉네임 점선이 그려지고, failure → (NO SUCCESS) 에 취소선이 쓱 그어짐
    await sleep(500);
    wipeOn(front.nick);
    await sleep(700);
    wipeOn(front.strikes[0]);
    await sleep(650);
    wipeOn(front.strikes[1]);
    await sleep(700);

    // 1) 가운데 박스: 필름이 현상되듯 사진 → 종이를 덮고 글자를 점선으로 오려내 떨어뜨림 → 설문2 문장이 툭툭 붙음 → 나머지 그림이 스톱모션으로 하나씩
    front.photo?.classList.add('is-in');
    await sleep(1900);
    wordSvg?.classList.add('is-in');
    await sleep(1200);
    if (wordSvg) await cutOutWord(wordSvg);
    await sleep(300);
    await dropBoxes(front.sentence);
    const order = front.stickers.map((s) => s.node);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const node of order) { throwIn(node); await sleep(380); }
    await sleep(800);

    // 2) 아래로 내려가 Then 칸 → Now 칸 순서로 줄이 그어지고 내용이 타이핑됨
    rp.dataset.stage = '2';
    await sleep(1300);
    wipeOn(front.divider);
    fillText(root, 'interpretation', await interpPromise);
    fillText(root, 'example', await examplePromise);
    Object.keys(root.texts).forEach((key) => reserve(root.fields.front[key], root.texts[key]));   // 칸 높이를 먼저 잡아 둠
    for (const key of ['situation', 'criteria', 'interpretation', 'meaning', 'definition', 'example']) {
      await drawRow(root.fields.front[key]);
      await typeInto(root.fields.front[key], root.texts[key], 34);
      root.typed[key] = true;
      await sleep(260);
    }
    await sleep(500);
    await thump(root);                       // 도장 찍히듯 쿵
    await sleep(900);

    // 3) 결과지가 작아지며 왼쪽으로, 오른쪽에 안내. 이제 손동작으로 뒤집어 볼 수 있음
    rp.dataset.stage = '3';
    document.body.classList.add('is-result-guide');
    const bar = document.querySelector('footer.bar');
    if (bar && !bar.querySelector('.bar__side')) {
      ['contact', 'about'].forEach((t, i) => { const s = el('span', `bar__side bar__side--${i ? 'right' : 'left'}`, bar); s.textContent = t; });
    }
    setupLens(layer, root, cardWrap);
    layer.addEventListener('click', (e) => { if (e.shiftKey) window.__flipResult(e.altKey ? -1 : 1); });   // (테스트용) Shift+클릭 = 오른쪽, Shift+Alt+클릭 = 왼쪽
    if (stopWatching) stopWatching();
    stopWatching = watchSwipe(window.__flipResult, note);
    return root;
  }

  // 카메라로 '왼쪽 → 오른쪽' 손동작을 지켜봄 (define.js 와 같은 판정). 카메라를 쓸 수 없으면 마우스
  function watchSwipe(onSwipe, hint) {
    let stream = null;
    let timer = null;
    let off = null;
    let cooldown = 0;
    // 한 번 넘긴 뒤 손이 되돌아오는 움직임이 반대 방향으로 오인되지 않도록 잠시 쉼
    const fire = (dir) => { const now = performance.now(); if (now < cooldown) return; cooldown = now + 1800; onSwipe(dir); };
    const rightward = (hist) => window.__isRightwardSwipe && window.__isRightwardSwipe(hist);
    const leftward = (hist) => rightward(hist.map((p) => ({ t: p.t, x: 1 - p.x })));       // 좌우를 뒤집어 같은 판정을 씀
    const detect = (hist) => (rightward(hist) ? 1 : leftward(hist) ? -1 : 0);
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }, audio: false });
        const video = document.createElement('video');
        video.muted = true; video.playsInline = true; video.srcObject = stream;
        await video.play();
        const W = 64; const H = 48;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        let prev = null; let hist = [];
        timer = setInterval(() => {
          if (video.readyState < 2) return;
          cx.drawImage(video, 0, 0, W, H);
          const d = cx.getImageData(0, 0, W, H).data;
          const gray = new Uint8Array(W * H);
          for (let i = 0; i < W * H; i++) gray[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
          if (prev) {
            let n = 0; let sx = 0;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(gray[y * W + x] - prev[y * W + x]) > 28) { n++; sx += x; }
            const now = performance.now();
            if (n >= 6 && n < W * H * 0.35) hist.push({ t: now, x: 1 - sx / n / W });
            hist = hist.filter((p) => now - p.t <= 1000);
            const dir = detect(hist);
            if (dir) { hist = []; fire(dir); }
          }
          prev = gray;
        }, 40);
      } catch (err) {
        if (hint) hint.textContent = '카메라를 사용할 수 없어요. 마우스를 좌우로 움직여 보세요.';
        let hist = [];
        const onMove = (e) => {
          const now = performance.now();
          hist.push({ t: now, x: e.clientX / window.innerWidth });
          hist = hist.filter((p) => now - p.t <= 1000);
          const dir = detect(hist);
          if (dir) { hist = []; fire(dir); }
        };
        window.addEventListener('mousemove', onMove);
        off = () => window.removeEventListener('mousemove', onMove);
      }
    })();
    return () => {
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (off) off();
    };
  }

  window.ResultSheet = { show, layoutWord, SIZES, FRAME, watchSwipe, stopWatching: () => { if (stopWatching) { stopWatching(); stopWatching = null; } } };

  // 확인용: 주소 끝에 ?result=example 을 붙이면 시안 예시 응답으로 결과지를 바로 띄움 (AI 대신 시안의 문장 사용)
  const speedParam = /[?&]rsspeed=([0-9.]+)/.exec(location.search);
  if (speedParam) window.__rsSpeed = parseFloat(speedParam[1]);          // 확인용: 연출 속도 배율 (0.2 = 5배 빠르게)
  if (/[?&]result=example/.test(location.search)) {
    window.addEventListener('load', () => window.ResultSheet.show(
      ['H.E', '원하는 회사에 지원했지만 최종 면접에서 떨어졌어요', ['멈춤', '포기', '허탈함'], ['취업·합격 여부', '자기 실망', '사회적 기준', '후회와 미련'],
        ['시작', '경험', '도전', '동력'], { then: '#000000', now: '#e8ff8e' }, { word: '새로운 시작', meaning: '끝인줄 알았지만 또다른 기회의 시작' }],
      { demo: {
        word: 'A New Beginning',
        interpretation: '기대했던 취업이나 합격의 결과에 도달하지 못하며, 스스로에 대한 실망과 허탈함 속에 한동안 멈춰 서게 된 순간. 사회가 정한 기준과 자신의 기대에 미치지 못했다는 생각이 실패라는 판단으로 이어졌다.',
        example: '모든 것이 끝났다고 생각했던 순간은 어쩌면 새로운 시작을 맞이하기 위한 또 다른 기회의 문턱이었을지도 모른다.',
      } }
    ));
  }
})();
