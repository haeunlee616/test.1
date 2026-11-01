const express = require('express');
const path = require('path');
const Interpretation = require('./interpretation-prompt');

const app = express();
const PORT = process.env.PORT || 3000;

// 결과지 '해석' 칸을 쓰는 AI (OpenAI). 키는 서버 환경변수에만 둠 — 코드·깃·브라우저에 절대 넣지 않음
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

app.set('trust proxy', 1);              // Render 앞단 프록시 뒤에서도 방문자 IP 를 제대로 읽음
app.use(express.json({ limit: '10kb' }));

// 내 컴퓨터(localhost)에서 열어 본 화면이 이 서버의 AI 를 쓸 수 있게 허용 (다른 사이트는 허용하지 않음)
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// 같은 방문자가 AI 를 마구 부르지 못하게: IP 당 1분에 10번
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const hits = new Map();
function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [key, list] of hits) if (!list.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
  return recent.length > RATE_MAX;
}

const isStringList = (v, maxItems, maxLen) => Array.isArray(v) && v.length <= maxItems && v.every((s) => typeof s === 'string' && s.length > 0 && s.length <= maxLen);

// OpenAI 에 { system, messages } 를 보내고 답 문장을 돌려줌. 실패하면 null
async function askOpenAI({ system, messages }, maxTokens) {
  try {
    const ai = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'system', content: system }, ...messages],
        max_completion_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!ai.ok) {
      console.error('OpenAI 오류', ai.status, (await ai.text()).slice(0, 300));
      return null;
    }
    const data = await ai.json();
    return String(data.choices?.[0]?.message?.content || '').replace(/^["“‘'\s]+|["”’'\s]+$/g, '').trim() || null;
  } catch (err) {
    console.error('OpenAI 호출 실패', err.message);
    return null;
  }
}

// 공통: 키·요청 횟수를 확인한 뒤 build(body) 로 안내문을 만들어 AI 에게 묻고 { text } 로 답함
function aiRoute(path, build, maxTokens) {
  app.post(path, async (req, res) => {
    if (!OPENAI_API_KEY) return res.status(503).json({ error: 'AI 키가 서버에 설정되지 않았어요.' });
    if (overLimit(req.ip)) return res.status(429).json({ error: '잠시 뒤에 다시 시도해 주세요.' });
    const prompt = build(req.body || {});
    if (!prompt) return res.status(400).json({ error: '응답 형식이 올바르지 않아요.' });
    const text = await askOpenAI(prompt, maxTokens);
    if (!text) return res.status(502).json({ error: 'AI 해석을 받지 못했어요.' });
    return res.json({ text });
  });
}
const isShortText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

// 결과지 '해석' 칸: 설문 2·3·4 응답 → 해석 두 문장
aiRoute('/api/interpret', ({ sentence, situation, criteria }) => {
  if (!isShortText(sentence, 200) || !isStringList(situation, 24, 20) || !isStringList(criteria, 13, 20)) return null;
  return Interpretation.prompt({ sentence: sentence.trim(), situation, criteria });
}, 400);

// 결과지 큰 글자: 설문7 첫 칸(한국어) → 영어 단어
aiRoute('/api/translate', ({ word }) => (isShortText(word, 30) ? Interpretation.translatePrompt(word.trim()) : null), 40);

// 결과지 'Now' 표 예문: 설문7 첫 칸 + 뜻풀이 → 예문 한 문장
aiRoute('/api/example', ({ word, meaning }) => (
  isShortText(word, 30) && isShortText(meaning, 60) ? Interpretation.sentencePrompt({ word: word.trim(), meaning: meaning.trim() }) : null
), 200);

// index.html, style.css, script.js를 그대로 정적 파일로 내려줌
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
