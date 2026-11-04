// ---------- 결과지용 이미지 (옵션 ↔ 이미지) ----------
// 설문3 '당시 상태' 옵션 ↔ 스티커 (6번의 '당시' 색을 입힘)
// 이미지는 흰 테두리 + 투명 배경 PNG(회색조 + 알파)입니다. 검정 잉크 = 그래픽, 흰색 = 테두리·하이라이트.
// 색을 입힐 땐 검정 잉크만 골라낸 색으로 바꾸고, 흰색(테두리·종이 바탕)과 투명 영역은 그대로 둡니다.
// → 하프톤 점·질감은 밝기 값 그대로 남습니다.  결과지에서 쓸 땐 Stickers.tint(옵션, 6번 '당시' 색) 를 부르세요.
const STICKER_FILES = {
  challenge: 'assets/stickers/challenge.png',   // 도전
  pause: 'assets/stickers/pause.png',           // 멈춤 · 기다림 · 망설임
  straight: 'assets/stickers/straight.png',     // 직진
  giveup: 'assets/stickers/giveup.png',         // 포기
  hollow: 'assets/stickers/hollow.png',         // 허탈함 · 후회 · 슬픔
  release: 'assets/stickers/release.png',       // 놓음
  hold: 'assets/stickers/hold.png',             // 붙잡음
  alone: 'assets/stickers/alone.png',           // 혼자 · 돌아섬
  together: 'assets/stickers/together.png',     // 함께
  anxious: 'assets/stickers/anxious.png',       // 불안 · 초조 · 막막함(둘 중 하나)
  hope: 'assets/stickers/hope.png',             // 기대 · 설렘
  tense: 'assets/stickers/tense.png',           // 긴장 · 답답함
  fear: 'assets/stickers/fear.png',             // 두려움(둘 중 하나)
  cliff: 'assets/stickers/cliff.png',           // 두려움 · 막막함 (둘 중 하나)
  calm: 'assets/stickers/calm.png',             // 담담함
};
// 값이 배열이면 그 옵션을 고를 때 배열 안의 이미지 중 하나가 무작위로 나옴 (결과지에서 정함)
const OPTION_STICKERS = {
  '도전': STICKER_FILES.challenge,
  '멈춤': STICKER_FILES.pause,
  '기다림': STICKER_FILES.pause,
  '망설임': STICKER_FILES.pause,
  '직진': STICKER_FILES.straight,
  '반복': STICKER_FILES.straight,     // 반복은 직진과 같은 이미지
  '포기': STICKER_FILES.giveup,
  '허탈함': STICKER_FILES.hollow,
  '후회': STICKER_FILES.hollow,       // 후회는 허탈함과 같은 이미지
  '슬픔': STICKER_FILES.hollow,       // 슬픔도 허탈함과 같은 이미지
  '놓음': STICKER_FILES.release,
  '붙잡음': STICKER_FILES.hold,
  '혼자': STICKER_FILES.alone,
  '돌아섬': STICKER_FILES.alone,
  '함께': STICKER_FILES.together,
  '불안': STICKER_FILES.anxious,
  '초조': STICKER_FILES.anxious,
  '막막함': [STICKER_FILES.anxious, STICKER_FILES.cliff],   // 둘 중 하나 무작위
  '기대': STICKER_FILES.hope,
  '설렘': STICKER_FILES.hope,
  '긴장': STICKER_FILES.tense,
  '답답함': STICKER_FILES.tense,
  '두려움': [STICKER_FILES.fear, STICKER_FILES.cliff],      // 둘 중 하나 무작위
  '담담함': STICKER_FILES.calm,
};

// ---------- 설문4 '실패라고 생각한 계기' 옵션 ↔ 선 그림 ----------
// 투명 배경에 검정 선/글씨만 있는 PNG. 6번 color picker 와 상관없이 항상 검정 그대로 씁니다. (tint 를 거치지 않음)
const LINE_FILES = {
  puzzle: 'assets/stickers/puzzle.png',
  person: 'assets/stickers/person.png',
  fail: 'assets/stickers/fail.png',
  regret: 'assets/stickers/regret.png',     // 'Lingering Regret Feelings' 글씨 (받은 파일 그대로)
  compare: 'assets/stickers/compare.png',   // 타인과의 비교 (저울)
  hug1: 'assets/stickers/hug1.png',         // 주변의 기대 · 조직이나 집단의 인정 (둘 중 하나)
  hug2: 'assets/stickers/hug2.png',
  stairs: 'assets/stickers/stairs.png',     // 목표 도달률 · 경제적 성취 (계단)
  eval1: 'assets/stickers/eval1.png',       // 타인의 평가 (둘 중 하나)
  eval2: 'assets/stickers/eval2.png',
  ownrule: 'assets/stickers/ownrule.png',           // 나만의 기준 'My Own Rule' 글씨 (받은 파일 그대로)
  righttime: 'assets/stickers/righttime.png',       // 정해진 나이와 시기 'The Right Time??' 글씨 (받은 파일 그대로)
  notexpected: 'assets/stickers/notexpected.png',   // 기대와의 불일치 'Not As Expected' 글씨 (받은 파일 그대로)
};
const OPTION_LINES = {
  '사회적 기준': LINE_FILES.puzzle,
  '자기 실망': LINE_FILES.person,
  '취업·합격 여부': LINE_FILES.fail,
  '후회와 미련': LINE_FILES.regret,
  '타인과의 비교': LINE_FILES.compare,
  '주변의 기대': [LINE_FILES.hug1, LINE_FILES.hug2],               // 값이 배열이면 그중 하나가 무작위로 나옴 (결과지에서 정함)
  '조직이나 집단의 인정': [LINE_FILES.hug1, LINE_FILES.hug2],
  '목표 도달률': LINE_FILES.stairs,
  '경제적 성취': LINE_FILES.stairs,
  '타인의 평가': [LINE_FILES.eval1, LINE_FILES.eval2],
  '나만의 기준': LINE_FILES.ownrule,
  '정해진 나이와 시기': LINE_FILES.righttime,
  '기대와의 불일치': LINE_FILES.notexpected,
};
const lineFor = (option) => {
  const v = OPTION_LINES[option];
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : (v || null);
};

// ---------- 설문5 '남긴 의미·영향' 옵션 ↔ 이미지 (6번의 '지금' 색을 입힘) ----------
// 기본: '지금' 색을 원본 위에 50% 로 덧입힘 (흰 테두리·하프톤·질감 유지).  box: 사진은 그대로, 사진 뒤 별 모양 상자에 색을 입힘.
const NOW_FILES = {
  experience: { src: 'assets/stickers/experience.png', plain: true },                           // 경험: 색을 입히지 않음 (검정 글자 + 흰 테두리 그대로)
  challenge: { src: STICKER_FILES.challenge },                                                  // 도전 (설문3 '도전' 과 같은 이미지)
  start: { src: 'assets/stickers/start.png' },                                                  // 시작
  power: { src: 'assets/stickers/power.webp', box: 'assets/stickers/power-box.png' },           // 동력: 별 상자 색
};
const OPTION_NOW_STICKERS = {
  '경험': NOW_FILES.experience,
  '도전': NOW_FILES.challenge,
  '시작': NOW_FILES.start,
  '동력': NOW_FILES.power,
};
const nowStickerFor = (option) => OPTION_NOW_STICKERS[option] || null;
const NOW_TINT_STRENGTH = 0.5;   // 설문5 그림: '지금' 색을 원본 위에 50% 로 덧입힘 (검정 하프톤이 완전히 사라지지 않게, 흰 테두리는 그대로)

// 설문5 옵션 → 결과지 가운데 프레임의 큰 사진. 몇 개를 골랐든 아래 목록 앞쪽 옵션이 하나라도 있으면 그 사진을 씀
// (나중에 미드저니 이미지가 들어올 자리 — 지금은 '시작'이면 항상 이 사진으로 고정)
const HERO_IMAGES = [
  { option: '시작', src: 'assets/hero/start.jpg' },
];
const HERO_FALLBACK = 'assets/hero/start.jpg';    // 임시: 해당하는 옵션이 없어도 같은 사진을 계속 씀 (미드저니 이미지가 준비되면 null 로 바꿔 구분)
const heroFor = (selected) => {
  const picked = new Set(selected || []);
  const hit = HERO_IMAGES.find((h) => picked.has(h.option));
  return hit ? hit.src : HERO_FALLBACK;
};

const stickerImages = {};
function loadSticker(src) {
  if (!stickerImages[src]) {
    stickerImages[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  return stickerImages[src];
}

// 옵션 이름 → 이미지 경로 (대응되는 이미지가 없는 옵션은 null). 이미지가 둘인 옵션은 무작위로 하나
function stickerFor(option) {
  const v = OPTION_STICKERS[option];
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : (v || null);
}
// 옵션에 대응되는 이미지 후보 전부 (없으면 빈 배열)
function stickerChoices(option) {
  const v = OPTION_STICKERS[option];
  return Array.isArray(v) ? v.slice() : (v ? [v] : []);
}

const parseHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// 이미지에 색 입히기: 밝기 0(검정) → hex, 밝기 255(흰색) → 흰색, 알파는 그대로. <canvas> 를 돌려줍니다.
async function inkTint(src, hex, strength = 1) {
  const img = await loadSticker(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const color = parseHex(hex);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;
  for (let p = 0; p < px.length; p += 4) {
    const orig = px[p];                            // 회색조 이미지라 R 채널이 곧 밝기
    const lum = orig / 255;
    // 색을 입힌 값과 원본 사이를 strength 만큼 섞음 (1 = 완전히 입힘, 0.5 = 색을 반투명하게 덧입힌 느낌). 흰색은 어느 쪽이든 흰색
    px[p] = orig + (color[0] + (255 - color[0]) * lum - orig) * strength;
    px[p + 1] = orig + (color[1] + (255 - color[1]) * lum - orig) * strength;
    px[p + 2] = orig + (color[2] + (255 - color[2]) * lum - orig) * strength;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

// 별 상자 색 입히기: 상자 모양(알파)을 hex 로 채우고 그 위에 사진을 그대로 얹음
async function boxTint(entry, hex) {
  const [photo, box] = await Promise.all([loadSticker(entry.src), loadSticker(entry.box)]);
  const canvas = document.createElement('canvas');
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(box, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(photo, 0, 0);
  return canvas;
}

// 설문3 이미지 + 6번 '당시' 색
async function tintSticker(option, hex, src) {
  src = src || stickerFor(option);
  return src ? inkTint(src, hex) : null;
}
// 색을 입히지 않고 원본 그대로 <canvas> 로
async function plainSticker(src) {
  const img = await loadSticker(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}
// 설문5 이미지 + 6번 '지금' 색 ('경험'은 사용자가 고른 색과 상관없이 원본 그대로)
async function tintNowSticker(option, hex) {
  const entry = nowStickerFor(option);
  if (!entry) return null;
  if (entry.plain) return plainSticker(entry.src);
  return entry.box ? boxTint(entry, hex) : inkTint(entry.src, hex, NOW_TINT_STRENGTH);
}

window.Stickers = {
  files: STICKER_FILES, byOption: OPTION_STICKERS, forOption: stickerFor, choices: stickerChoices, tint: tintSticker,   // 설문3: 색을 입히는 이미지
  lineFiles: LINE_FILES, lineByOption: OPTION_LINES, lineForOption: lineFor,                    // 설문4: 검정 그대로 쓰는 이미지
  heroFor, heroImages: HERO_IMAGES,                                                               // 설문5: 가운데 프레임의 큰 사진
  nowFiles: NOW_FILES, nowByOption: OPTION_NOW_STICKERS, nowForOption: nowStickerFor, tintNow: tintNowSticker,   // 설문5: '지금' 색을 입히는 이미지
};
