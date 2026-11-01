// ---------- 설문2 문장 → 결과지용 흰 상자 문장 ----------
// 1) Sentence.segment(문장)  : 의미가 이어지는 단어끼리 묶어 문자열 배열로 돌려줌 (예: ['원하는 회사에', '지원했지만', ...])
// 2) Sentence.render(그룹들) : 그 그룹들을 흰 상자 + 검정 선 디자인(엇갈린 계단 모양)으로 그린 <div> 를 돌려줌
// 외부 형태소 분석기 없이 어미·조사 규칙과 작은 단어 목록으로 판단하는 방식이라, 드문 표현은 어색하게 끊길 수 있습니다.

// ----- 분절 규칙 -----
// 띄어쓰기로 나뉜 말마디(어절)를 아래 종류로 가른 뒤 묶습니다.
//   MOD   관형어(원하는·새로운·준비한·이·그·최종 …): 뒤에 오는 명사와 한 그룹
//   NEG   부정 부사(못·안): 뒤에 오는 서술어와 한 그룹
//   NOUN  조사 없는 명사: 바로 뒤에 명사구가 오면 합성어·수식어로 보고 한 그룹 (최종 + 면접에서)
//   NOUNP 조사가 붙은 명사구(회사에·면접에서): 여기서 그룹이 끝남
//   ADV   부사·때 말(오랫동안·갑자기·오늘): 혼자 한 그룹
//   PRED  끝맺는 서술어(떨어졌어요) / CONN 이어지는 서술어(지원했지만): 혼자 한 그룹
//   AUX   보조 용언(싶었지만·않았어요·있었어요): 앞 서술어에 붙음 (시작하고 + 싶었지만)
// 조사·어미는 항상 앞 단어에 붙어 있으므로(어절 단위) 따로 떼지 않습니다.
const ADVERBS = new Set([
  '매우', '아주', '너무', '정말', '진짜', '항상', '계속', '자주', '가끔', '늘', '더', '덜', '꼭', '곧', '이미', '아직', '드디어', '결국',
  '갑자기', '다시', '처음', '오늘', '어제', '올해', '작년', '내년', '요즘', '지금', '당시', '그때', '때때로', '종종', '결코', '절대',
  '전혀', '별로', '거의', '조금', '잠시', '잠깐', '오래', '먼저', '나중', '함께', '같이', '혼자', '다만', '그리고', '그러나', '하지만',
  '그래서', '그런데', '그러면', '또', '또한', '게다가', '특히', '한동안', '마침내', '과연', '역시', '여전히', '제대로', '굳이', '일단',
  '아무리', '비록', '만약', '만일', '어쩌면', '아마', '사실', '솔직히', '다행히', '빨리', '천천히', '열심히', '최근', '요새', '방금', '이제',
  '벌써', '아예', '도저히', '그만', '차라리', '오직', '단지', '다들', '모두', '서로', '직접', '바로', '막', '꽤', '상당히', '훨씬', '조용히',
]);
const DETERMINERS = new Set([
  '이', '그', '저', '새', '헌', '첫', '맨', '각', '매', '모든', '어떤', '어느', '무슨', '여러', '다른', '같은', '이런', '그런', '저런',
  '어떠한', '온갖', '갖은', '옛', '뭇', '순', '총', '전', '현', '구', '본', '약', '몇', '한', '두', '세', '네', '다섯', '여섯', '일곱',
  '여덟', '아홉', '열', '다음', '지난', '마지막', '최초', '최종', '이번', '저번', '모든', '온', '수많은', '많은', '적은', '큰', '작은',
  '긴', '짧은', '좋은', '나쁜', '높은', '낮은', '깊은', '넓은', '좁은', '밝은', '어린', '젊은', '늙은', '없는', '있는', '같은',
]);
const PRONOUNS = new Set(['나', '저', '너', '우리', '저희', '그', '그녀', '내', '제', '누구', '이것', '그것', '저것', '무엇', '뭐']);
const TIME_NOUNS = new Set(['오늘', '어제', '올해', '작년', '내년', '요즘', '지금', '당시', '그때', '이번', '저번', '내일', '요새']);
// '-은'으로 끝나지만 조사가 아니라 관형형 어미인 말의 어간 (좋은·받은·남은 …)
const EUN_STEMS = new Set([
  '좋', '많', '적', '높', '낮', '깊', '얕', '넓', '좁', '짧', '밝', '작', '같', '없', '있', '젊', '늙', '굳', '맑', '짙', '않', '받', '남',
  '잃', '얻', '찾', '읽', '먹', '잡', '닫', '믿', '쌓', '입', '앉', '넣', '겪', '잊', '웃', '울', '숨', '굶', '작', '쓴', '힘든',
]);
const NOUN_EXCEPTIONS = new Set(['바다', '행운', '불운', '영어', '한국어', '외국어', '일본어', '중국어', '언어', '단어', '국어', '역할', '분할', '대한', '북한', '남한']);
const BOUND_NOUNS = new Set(['수', '것', '듯', '양', '뜻']);

const jong = (ch) => (ch.charCodeAt(0) - 0xAC00) % 28;                    // 받침 번호 (0 = 없음, 4 = ㄴ, 8 = ㄹ)
const isHangul = (ch) => ch >= '가' && ch <= '힣';
const lastOf = (w) => w[w.length - 1];
const TENSE = '았었였했갔왔봤줬졌됐겠렸랐쳤냈웠뒀놨췄났셨';
const COMPOUND_PARTICLE = /(에게서|에서는|에서도|에서만|에서|에게는|에게도|에게|으로는|으로도|으로써|으로서|으로|로써|로서|로는|로도|에는|에도|에만|께서|한테|부터|까지|처럼|만큼|보다|마다|조차|마저|밖에|이나|이랑|이란)$/;
const SINGLE_PARTICLE = /[을를은는이가도만에의로과와랑나야]$/;
const CONNECTIVE = /(지만|는데|은데|ㄴ데|으니까|니까|으면서|면서|다가|으려고|려고|도록|거나|더니|으면|이면|라면|다면|아서|어서|해서|라서|고서|이라|든지|는지|은지|인지|ㄹ지|으나|고|서|며|면|데|지|여|해|워|어|아)$/;

// 어절 하나가 어떤 종류인지 (앞뒤 문장부호는 무시)
function classify(core) {
  if (ADVERBS.has(core)) return 'ADV';
  if (DETERMINERS.has(core)) return 'MOD';
  if (core === '못' || core === '안') return 'NEG';
  const last = lastOf(core);
  if (core.length >= 2 && !NOUN_EXCEPTIONS.has(core)) {
    if (COMPOUND_PARTICLE.test(core)) return 'NOUNP';                       // 에서·에게·으로·부터 … (…에서는 '서'로 끝나도 명사구)
    // 관형형 어미: 원하는·했던·중요한·새로운·할 … (대명사·때 말 + 는/은은 조사)
    if (/던$/.test(core)) return 'MOD';
    if (last === '는') {
      const stem = core.slice(0, -1);
      return (PRONOUNS.has(stem) || TIME_NOUNS.has(stem)) ? 'NOUNP' : 'MOD';
    }
    if (last === '은') return EUN_STEMS.has(core.slice(0, -1)) ? 'MOD' : 'NOUNP';
    if (/적인$/.test(core)) return 'MOD';
    if ('한된운른든쁜픈낸닌런'.includes(last) && !/(대한|북한|남한|행운|불운)$/.test(core)) return 'MOD';
    if (/[할될]$/.test(core) && !NOUN_EXCEPTIONS.has(core)) return 'MOD';
    // 서술어: 끝맺음 -요/-다/-죠/-네 … , 과거 -했어/-했지만/-했던
    if (/(요|죠|다|네|군|구나|거든|잖아)$/.test(core)) return 'PRED';
    const t = core.search(new RegExp(`[${TENSE}]`));
    if (t !== -1) {
      const tail = core.slice(t + 1);
      if (/^(어|아|야|지|네|구나|거든|잖아|군|다|요|죠|)$/.test(tail)) return 'PRED';
      if (/^(지만|는데|으나|으니까|으니|니까|고|다가|어서|아서|으면서|다면|더라도|어도|지)/.test(tail)) return 'CONN';
    }
    if (CONNECTIVE.test(core)) return 'CONN';
    if (SINGLE_PARTICLE.test(core)) return 'NOUNP';                         // 회사를·시험이·친구도 …
  }
  return 'NOUN';
}

// 보조 용언이면 true: 앞 서술어(시작하고)·'수'·'것' 뒤에 붙는 말
function isAux(core, prevCore, prevType) {
  const linkable = prevType === 'CONN' || prevType === 'PRED';
  if (/^(싶|않|못하|못했|못해)/.test(core)) return linkable;
  if (/^(보고|보니|보면|보았|봤|봐|보려|보는)/.test(core) || /^(주고|주는|주었|줬|줘|주세요)/.test(core) || /^(버렸|버리|버려|버린)/.test(core)) {
    return linkable && /(고|어|아|해|워|여|서|지)$/.test(prevCore || '');
  }
  if (/^(있|없)/.test(core)) return BOUND_NOUNS.has(prevCore) || (prevType === 'CONN' && /고$/.test(prevCore || ''));
  if (/^같/.test(core)) return BOUND_NOUNS.has(prevCore);
  return false;
}

function segment(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const info = words.map((raw) => {
    const core = raw.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, '');
    return { raw, core, type: core ? classify(core) : 'PUNCT' };
  });
  const groups = [];          // [{ words: [...], lastCore, lastType }]
  let pending = [];           // 뒤 단어와 합쳐질 수식어·합성 명사
  const nominal = (t) => t === 'NOUN' || t === 'NOUNP';
  const push = (word) => {
    groups.push({ words: [...pending, word.raw], lastCore: word.core, lastType: word.type });
    pending = [];
  };
  info.forEach((w, i) => {
    const prev = groups[groups.length - 1];
    const next = info[i + 1];
    if (w.type === 'PUNCT') {                                               // 따로 떨어진 문장부호는 앞 그룹에 붙임
      if (prev) prev.words[prev.words.length - 1] += w.raw;
      return;
    }
    // 앞 그룹이 '싶던·있을'처럼 관형형으로 끝났으면 뒤따르는 명사(회사의·것)도 같은 그룹
    if (!pending.length && prev && prev.open && (nominal(w.type) || w.type === 'NOUN')) {
      prev.words.push(w.raw);
      prev.lastCore = w.core;
      prev.lastType = w.type;
      prev.open = false;
      return;
    }
    if (!pending.length && prev && isAux(w.core, prev.lastCore, prev.lastType)) {
      prev.words.push(w.raw);
      prev.lastCore = w.core;
      prev.lastType = 'PRED';
      const end = lastOf(w.core);
      prev.open = /[던는]$/.test(w.core) || (isHangul(end) && [4, 8].includes(jong(end)));   // 관형형 어미(-ㄴ/-ㄹ/-는/-던)로 끝남
      return;
    }
    if (w.type === 'MOD' || w.type === 'NEG') { pending.push(w.raw); return; }
    if (w.type === 'NOUN' && next && nominal(next.type) && !BOUND_NOUNS.has(next.core) && !isAux(next.core, w.core, w.type)) { pending.push(w.raw); return; }
    push(w);
  });
  if (pending.length) {                                                     // 끝에 수식어만 남은 경우
    if (groups.length) groups[groups.length - 1].words.push(...pending);
    else groups.push({ words: pending });
  }
  return groups.map((g) => g.words.join(' '));
}

// ----- 흰 상자 디자인 -----
// 시안: 상자를 위·아래로 엇갈려 계단처럼 이어 붙이고, 겹치는 부분은 안쪽 선 없이 바깥 윤곽선만 남김 (흰 바탕 + 검정 선)
// 크기는 글자 크기(em) 기준이라 컨테이너의 font-size 로 한 번에 키우고 줄일 수 있습니다. 폰트는 SM Dinaru Std.
const BOX_OVERLAPS = [0.28, 1.32, 2.43];   // 앞 상자와 가로로 겹치는 길이(em) — 시안의 간격을 순서대로 반복
const BOX_TOP_ROW_DROP = 0.35;             // 윗줄 상자 중 첫 번째·세 번째… 는 살짝 아래로 (시안)
const BOX_BOTTOM_ROW_DROP = 1.6;           // 아랫줄 상자가 윗줄보다 내려가는 길이(em)

function render(groups) {
  const wrap = document.createElement('div');
  wrap.className = 'sentence-boxes';
  groups.forEach((text, i) => {
    const box = document.createElement('span');
    box.className = 'sentence-boxes__box';
    box.textContent = text;
    const bottom = i % 2 === 1;
    box.style.marginTop = `${bottom ? BOX_BOTTOM_ROW_DROP : (i / 2) % 2 === 0 ? BOX_TOP_ROW_DROP : 0}em`;
    if (i > 0) box.style.marginLeft = `${-BOX_OVERLAPS[(i - 1) % BOX_OVERLAPS.length]}em`;
    wrap.append(box);
  });
  return wrap;
}

window.Sentence = { segment, render };
