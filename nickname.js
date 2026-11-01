// ---------- 결과지용 닉네임 문구: "(닉네임)’S RE:DEFINITION" ----------
// Nickname.render(닉네임) → 점선 알약(원) 안에 윗줄 "닉네임’S", 아랫줄 "RE:DEFINITION" 이 들어간 <svg> 를 돌려줌 (Promise)
// 시안(닉네임 H.E, 184×50): 원·글자 모두 속이 빈 흰 점선 윤곽선, 글자는 American Typewriter Condensed Bold,
// 알약 안쪽 여백은 닉네임이 뭐든 같음 (위 7 · 아래 6.5 · 양옆 19, 시안 px). 닉네임이 한글이면 닉네임만 Pretendard Medium.
// 색은 currentColor (기본 흰색) 이라 CSS 의 color 로 바꿀 수 있고, 크기는 CSS 의 width 로 한 번에 키우고 줄일 수 있습니다.
const NICK_SIZE = 20.9;              // 글자 크기 (대문자 높이 14)
const NICK_LETTER_SPACING = 0.95;    // 글자 사이 간격
const NICK_BASELINES = [22.5, 42.5]; // 윗줄·아랫줄 글자 바닥선 (줄 간격 20)
const NICK_HEIGHT = 50;
const NICK_MARGIN_X = 19;            // 알약 바깥 선에서 글자 바깥 선까지 (양옆)
const NICK_TEXT_DASH = '4 1.2';      // 글자 윤곽선 점선
const NICK_LATIN = '"American Typewriter Condensed", "American Typewriter", serif';
const NICK_KOREAN = '"Pretendard", "Apple SD Gothic Neo", sans-serif';
const SVG_NS = 'http://www.w3.org/2000/svg';
const HANGUL_RE = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

// 글자 조각들을 이어 놓았을 때 잉크가 차지하는 가로 범위 (캔버스로 잼)
function measureInk(parts) {
  const ctx = document.createElement('canvas').getContext('2d');
  const font = (p) => `${p.weight} ${p.size}px ${p.family}`;
  let total = 0;
  let count = 0;
  parts.forEach((p) => { ctx.font = font(p); total += ctx.measureText(p.text).width; count += Array.from(p.text).length; });
  total += (count - 1) * NICK_LETTER_SPACING;
  const first = parts[0];
  ctx.font = font(first);
  const firstChar = ctx.measureText(Array.from(first.text)[0]);
  const last = parts[parts.length - 1];
  ctx.font = font(last);
  const lastChar = ctx.measureText(Array.from(last.text).pop());
  const left = -firstChar.actualBoundingBoxLeft;                      // 시작점에서 잉크 왼쪽 끝까지
  const right = lastChar.width - lastChar.actualBoundingBoxRight;      // 잉크 오른쪽 끝에서 다음 글자 시작까지
  return { left, width: total - left - right };
}

async function renderNickname(nickname) {
  const nick = String(nickname || '').trim();
  const korean = HANGUL_RE.test(nick);
  const latin = { weight: 700, family: NICK_LATIN, size: NICK_SIZE };
  const nickFont = korean ? { weight: 500, family: NICK_KOREAN, size: NICK_SIZE } : latin;
  await Promise.all([
    document.fonts.load(`700 ${NICK_SIZE}px "American Typewriter Condensed"`),
    korean ? document.fonts.load(`500 ${NICK_SIZE}px "Pretendard"`, nick) : Promise.resolve(),
  ]);
  const lines = [
    [{ ...nickFont, text: nick }, { ...latin, text: '’S' }],
    [{ ...latin, text: 'RE:DEFINITION' }],
  ];
  const ink = lines.map(measureInk);
  const inkWidth = Math.max(...ink.map((m) => m.width));
  const width = Math.round(NICK_MARGIN_X * 2 + inkWidth + 1);          // +1: 글자 윤곽선 굵기

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${NICK_HEIGHT}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', NICK_HEIGHT);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${nick}’S RE:DEFINITION`);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1');
  svg.style.color = '#fff';
  svg.style.overflow = 'visible';
  svg.classList.add('nickname-mark');

  // 알약(원): 둘레를 8px 마다 켜짐 4·꺼짐 4 로 나누되, 둘레가 달라져도 점선이 끊김 없이 이어지게 간격을 조금씩 맞춤
  const r = (NICK_HEIGHT - 1) / 2;
  const perimeter = 2 * (width - 1 - 2 * r) + 2 * Math.PI * r;
  const period = perimeter / Math.round(perimeter / 8);
  const pill = document.createElementNS(SVG_NS, 'rect');
  pill.setAttribute('x', 0.5);
  pill.setAttribute('y', 0.5);
  pill.setAttribute('width', width - 1);
  pill.setAttribute('height', NICK_HEIGHT - 1);
  pill.setAttribute('rx', r);
  pill.setAttribute('stroke-dasharray', `${period / 2} ${period / 2}`);
  svg.append(pill);

  lines.forEach((parts, n) => {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', NICK_MARGIN_X + 0.5 - ink[n].left);        // 잉크 왼쪽 끝이 글자 윤곽선 안쪽(0.5)에 오도록
    text.setAttribute('y', NICK_BASELINES[n]);
    text.setAttribute('stroke-dasharray', NICK_TEXT_DASH);
    text.setAttribute('stroke-linejoin', 'round');
    text.style.letterSpacing = `${NICK_LETTER_SPACING}px`;
    parts.forEach((p) => {
      const span = document.createElementNS(SVG_NS, 'tspan');
      span.setAttribute('font-family', p.family);
      span.setAttribute('font-weight', p.weight);
      span.setAttribute('font-size', p.size);
      span.textContent = p.text;
      text.append(span);
    });
    svg.append(text);
  });
  return svg;
}

window.Nickname = { render: renderNickname };
