// contact / about / click to open 은 지금은 자리표시 링크(#contact, #about, #open)입니다.
// 연결할 페이지가 정해지면 아래 주소만 바꾸면 됩니다.
const LINKS = {
  'contact-btn': '#contact',
  'about-btn': '#about',
  'open-btn': '#open',
};

for (const [id, href] of Object.entries(LINKS)) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('href', href);
}

// 단어 박스: SM Dinaru Std / Pretendard Medium 을 반반 섞어 무작위로 배정.
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
