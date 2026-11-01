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
  hollow: 'assets/stickers/hollow.png',         // 허탈함
};
const OPTION_STICKERS = {
  '도전': STICKER_FILES.challenge,
  '멈춤': STICKER_FILES.pause,
  '기다림': STICKER_FILES.pause,
  '망설임': STICKER_FILES.pause,
  '직진': STICKER_FILES.straight,
  '포기': STICKER_FILES.giveup,
  '허탈함': STICKER_FILES.hollow,
};

// ---------- 설문4 '실패라고 생각한 계기' 옵션 ↔ 선 그림 ----------
// 투명 배경에 검정 선/글씨만 있는 PNG. 6번 color picker 와 상관없이 항상 검정 그대로 씁니다. (tint 를 거치지 않음)
const LINE_FILES = {
  puzzle: 'assets/stickers/puzzle.png',
  person: 'assets/stickers/person.png',
  fail: 'assets/stickers/fail.png',
  regret: 'assets/stickers/regret.png',     // 'Lingering Regret Feelings' 글씨 (받은 파일 그대로)
};
const OPTION_LINES = {
  '기대와의 불일치': LINE_FILES.puzzle,
  '자기 실망': LINE_FILES.person,
  '취업·합격 여부': LINE_FILES.fail,
  '후회와 미련': LINE_FILES.regret,
};
const lineFor = (option) => OPTION_LINES[option] || null;

// ---------- 설문5 '남긴 의미·영향' 옵션 ↔ 이미지 (6번의 '지금' 색을 입힘) ----------
// 기본: 검정 잉크만 '지금' 색으로 (흰 테두리·하프톤·질감 유지).  box: 사진은 그대로, 사진 뒤 별 모양 상자에 색을 입힘.
const NOW_FILES = {
  experience: { src: 'assets/stickers/experience.png' },                                         // 경험: 글자색
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

// 옵션 이름 → 이미지 경로 (대응되는 이미지가 없는 옵션은 null)
function stickerFor(option) {
  return OPTION_STICKERS[option] || null;
}

const parseHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// 이미지에 색 입히기: 밝기 0(검정) → hex, 밝기 255(흰색) → 흰색, 알파는 그대로. <canvas> 를 돌려줍니다.
async function inkTint(src, hex) {
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
    const lum = px[p] / 255;                       // 회색조 이미지라 R 채널이 곧 밝기
    px[p] = color[0] + (255 - color[0]) * lum;
    px[p + 1] = color[1] + (255 - color[1]) * lum;
    px[p + 2] = color[2] + (255 - color[2]) * lum;
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
async function tintSticker(option, hex) {
  const src = stickerFor(option);
  return src ? inkTint(src, hex) : null;
}
// 설문5 이미지 + 6번 '지금' 색
async function tintNowSticker(option, hex) {
  const entry = nowStickerFor(option);
  if (!entry) return null;
  return entry.box ? boxTint(entry, hex) : inkTint(entry.src, hex);
}

window.Stickers = {
  files: STICKER_FILES, byOption: OPTION_STICKERS, forOption: stickerFor, tint: tintSticker,   // 설문3: 색을 입히는 이미지
  lineFiles: LINE_FILES, lineByOption: OPTION_LINES, lineForOption: lineFor,                    // 설문4: 검정 그대로 쓰는 이미지
  nowFiles: NOW_FILES, nowByOption: OPTION_NOW_STICKERS, nowForOption: nowStickerFor, tintNow: tintNowSticker,   // 설문5: '지금' 색을 입히는 이미지
};
