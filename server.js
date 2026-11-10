const express = require('express');
const fs = require('fs');
const path = require('path');
const Interpretation = require('./interpretation-prompt');

const app = express();
const PORT = process.env.PORT || 3000;

// 결과지 '해석' 칸을 쓰는 AI (OpenAI). 키는 서버 환경변수에만 둠 — 코드·깃·브라우저에 절대 넣지 않음
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

app.set('trust proxy', 1);              // Render 앞단 프록시 뒤에서도 방문자 IP 를 제대로 읽음
app.use('/api/archive', express.json({ limit: '12mb' }));   // 아카이빙 저장은 결과지 그림(앞·뒷면)이 들어와서 더 크게 받음 (나머지 API 는 아래의 10kb)
app.use(express.json({ limit: '10kb' }));

// 내 컴퓨터(localhost)에서 열어 본 화면이 이 서버의 AI 를 쓸 수 있게 허용 (다른 사이트는 허용하지 않음)
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// 같은 방문자가 AI 를 마구 부르지 못하게: IP 당 1분에 10번
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const hits = new Map();
function overLimit(ip, store = hits, max = RATE_MAX) {
  const now = Date.now();
  const recent = (store.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  store.set(ip, recent);
  if (store.size > 5000) for (const [key, list] of store) if (!list.some((t) => now - t < RATE_WINDOW_MS)) store.delete(key);
  return recent.length > max;
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

// ---------- 아카이빙: 참여자가 만든 결과지(앞면·뒷면 그림)를 순서대로 저장하고, 책에 넣을 목록을 내려줌 ----------
// 저장 위치는 ARCHIVE_DIR (기본: 이 폴더의 archive-data/). 파일: <id>-front.<확장자>, <id>-back.<확장자>, 순서 목록 index.json
// ※ Render 무료 서비스의 디스크는 다시 배포하거나 서버가 잠들었다 깨면 비워짐 → 오래 보관하려면 아래 둘 중 하나:
//    (1) Render 'Disk' 를 붙이고 ARCHIVE_DIR 를 그 경로로 지정
//    (2) 별도 GitHub 비공개 저장소에 함께 저장: 환경변수 ARCHIVE_GITHUB_REPO('계정/저장소') + ARCHIVE_GITHUB_TOKEN (그 저장소 Contents 읽기·쓰기 권한 토큰)
//        → 저장할 때 그 저장소의 sheets/ 폴더에도 올리고, 서버가 새로 켜질 때 거기서 목록을 복원함 (디스크는 캐시로만 씀)
const ARCHIVE_DIR = path.resolve(process.env.ARCHIVE_DIR || path.join(__dirname, 'archive-data'));
const GH_REPO = process.env.ARCHIVE_GITHUB_REPO || '';
const GH_TOKEN = process.env.ARCHIVE_GITHUB_TOKEN || '';
const GH_BRANCH = process.env.ARCHIVE_GITHUB_BRANCH || 'main';
const GH_API = process.env.ARCHIVE_GITHUB_API || 'https://api.github.com';
const GH_ON = !!(GH_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(GH_REPO));
const ghShas = new Map();                        // 파일 이름 → GitHub blob sha (내려받을 때 씀)
const ARCHIVE_INDEX = path.join(ARCHIVE_DIR, 'index.json');
const ARCHIVE_MAX_SHEETS = 1000;                 // 이보다 많이 쌓이면 더 받지 않음
const ARCHIVE_MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 그림 한 장 최대 크기
const ARCHIVE_SAVES_PER_MIN = 6;                 // 같은 IP 가 1분에 저장할 수 있는 횟수
const saveHits = new Map();
let archiveSheets = null;                        // [{ id, t, ext }] 오래된 것 → 최신 순
let archiveQueue = Promise.resolve();            // 저장을 한 번에 하나씩 (순서·목록 파일이 꼬이지 않게)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ARCHIVE_FILE = /^([a-z0-9]+)-(front|back)\.(png|webp|jpg)$/;
const newArchiveId = () => Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 6).padEnd(4, '0');   // 시간(9자) + 무작위(4자) — 이름순 = 저장순

function ghRequest(method, urlPath, { body, accept } = {}) {
  return fetch(`${GH_API}/repos/${GH_REPO}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'failure-dictionary-archive',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// GitHub 저장소의 sheets/ 폴더에서 저장된 결과지 목록을 복원 (앞·뒷면이 모두 있는 것만, 저장 순)
async function ghLoadList() {
  const res = await ghRequest('GET', `/git/trees/${encodeURIComponent(GH_BRANCH)}?recursive=1`);
  if (res.status === 404 || res.status === 409) return [];       // 아직 비어 있는 저장소
  if (!res.ok) throw new Error(`GitHub 목록 ${res.status}`);
  const data = await res.json();
  const found = new Map();
  (data.tree || []).forEach((n) => {
    const m = n.type === 'blob' ? /^sheets\/(.+)$/.exec(n.path) : null;
    const f = m && ARCHIVE_FILE.exec(m[1]);
    if (!f) return;
    ghShas.set(m[1], n.sha);
    const e = found.get(f[1]) || {};
    e[f[2]] = f[3];
    found.set(f[1], e);
  });
  return [...found.entries()]
    .filter(([, e]) => e.front && e.front === e.back)
    .map(([id, e]) => ({ id, t: parseInt(id.slice(0, 9), 36), ext: e.front }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

async function ghPut(name, buf) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await ghRequest('PUT', `/contents/sheets/${name}`, { body: { message: `archive ${name}`, content: buf.toString('base64'), branch: GH_BRANCH } });
      if (res.ok) { const j = await res.json(); if (j.content && j.content.sha) ghShas.set(name, j.content.sha); return; }
      last = new Error(`GitHub 저장 ${res.status}`);
    } catch (err) { last = err; }
    await sleep(600 * (i + 1));
  }
  throw last;
}

const ghPulls = new Map();
function ghPull(name, file) {
  if (!ghPulls.has(name)) {
    ghPulls.set(name, (async () => {
      const res = await ghRequest('GET', `/git/blobs/${ghShas.get(name)}`, { accept: 'application/vnd.github.raw+json' });
      if (!res.ok) throw new Error(`GitHub 파일 ${res.status}`);
      await fs.promises.mkdir(ARCHIVE_DIR, { recursive: true });
      await fs.promises.writeFile(`${file}.tmp`, Buffer.from(await res.arrayBuffer()));
      await fs.promises.rename(`${file}.tmp`, file);
    })().finally(() => ghPulls.delete(name)));
  }
  return ghPulls.get(name);
}

async function loadArchive() {
  if (archiveSheets) return archiveSheets;
  if (GH_ON) {
    try {
      archiveSheets = await ghLoadList();
    } catch (err) {
      console.error('아카이빙 목록을 GitHub 에서 불러오지 못함', err.message);
      return [];                                                  // 저장해 두지 않고 다음 요청 때 다시 시도
    }
    return archiveSheets;
  }
  try {
    const data = JSON.parse(await fs.promises.readFile(ARCHIVE_INDEX, 'utf8'));
    // 그림 파일이 실제로 있는 것만 남김 (파일이 지워졌는데 목록에만 있으면 책에 깨진 쪽이 생기므로)
    archiveSheets = Array.isArray(data.sheets)
      ? data.sheets.filter((x) => x && /^[a-z0-9]+$/.test(x.id) && /^(png|webp|jpg)$/.test(x.ext)
        && fs.existsSync(path.join(ARCHIVE_DIR, `${x.id}-front.${x.ext}`)) && fs.existsSync(path.join(ARCHIVE_DIR, `${x.id}-back.${x.ext}`)))
      : [];
  } catch {
    archiveSheets = [];
  }
  return archiveSheets;
}

// 'data:image/webp;base64,....' → { ext, buf }. 그림이 아니거나 너무 크면 null (앞부분 바이트로 실제 형식까지 확인)
function decodeImage(dataUrl) {
  const m = /^data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(typeof dataUrl === 'string' ? dataUrl : '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length < 100 || buf.length > ARCHIVE_MAX_IMAGE_BYTES) return null;
  const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isWebp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  if (m[1] === 'png' && isPng) return { ext: 'png', buf };
  if (m[1] === 'jpeg' && isJpg) return { ext: 'jpg', buf };
  if (m[1] === 'webp' && isWebp) return { ext: 'webp', buf };
  return null;
}

// 최신 결과지가 맨 앞 (책은 최신부터 펼쳐짐)
app.get('/api/archive', async (req, res) => {
  const list = await loadArchive();
  res.set('Cache-Control', 'no-store');
  res.json({
    sheets: [...list].reverse().map((x) => ({ id: x.id, t: x.t, front: `/archive-data/${x.id}-front.${x.ext}`, back: `/archive-data/${x.id}-back.${x.ext}` })),
  });
});

app.post('/api/archive', (req, res) => {
  if (overLimit(req.ip, saveHits, ARCHIVE_SAVES_PER_MIN)) return res.status(429).json({ error: '잠시 뒤에 다시 시도해 주세요.' });
  const front = decodeImage(req.body && req.body.front);
  const back = decodeImage(req.body && req.body.back);
  if (!front || !back || front.ext !== back.ext) return res.status(400).json({ error: '결과지 그림 형식이 올바르지 않아요.' });   // 앞·뒷면은 같은 형식으로 받음
  archiveQueue = archiveQueue.then(async () => {
    const list = await loadArchive();
    if (list.length >= ARCHIVE_MAX_SHEETS) return res.status(507).json({ error: '아카이빙이 가득 찼어요.' });
    if (GH_ON && !archiveSheets) return res.status(503).json({ error: '저장소에 연결하지 못했어요.' });   // 목록을 못 불러온 채로 저장하면 이전 기록과 어긋날 수 있어 받지 않음
    const id = newArchiveId();
    const files = [[`${id}-back.${back.ext}`, back.buf], [`${id}-front.${front.ext}`, front.buf]];   // 앞면이 마지막: 둘 다 올라가야 목록에 나타남
    await fs.promises.mkdir(ARCHIVE_DIR, { recursive: true });
    await Promise.all(files.map(([name, buf]) => fs.promises.writeFile(path.join(ARCHIVE_DIR, name), buf)));
    if (GH_ON) {
      try {
        for (const [name, buf] of files) await ghPut(name, buf);
      } catch (err) {
        await Promise.all(files.map(([name]) => fs.promises.rm(path.join(ARCHIVE_DIR, name), { force: true })));
        throw err;
      }
    }
    const entry = { id, t: Date.now(), ext: front.ext };
    const next = [...list, entry];
    if (!GH_ON) {
      await fs.promises.writeFile(`${ARCHIVE_INDEX}.tmp`, JSON.stringify({ sheets: next }));
      await fs.promises.rename(`${ARCHIVE_INDEX}.tmp`, ARCHIVE_INDEX);
    }
    archiveSheets = next;
    return res.json({ id, t: entry.t, front: `/archive-data/${id}-front.${entry.ext}`, back: `/archive-data/${id}-back.${entry.ext}` });
  }).catch((err) => {
    console.error('아카이빙 저장 실패', err.message);
    if (!res.headersSent) res.status(500).json({ error: '저장하지 못했어요.' });
  });
});

// 결과지 그림 내려주기: 디스크에 없고 GitHub 에 있으면 받아 와서 디스크에 캐시해 두고 보냄
app.get('/archive-data/:name', async (req, res) => {
  const name = req.params.name;
  if (!ARCHIVE_FILE.test(name)) return res.sendStatus(404);
  const file = path.join(ARCHIVE_DIR, name);
  try {
    if (!fs.existsSync(file) && GH_ON) {
      await loadArchive();
      if (ghShas.has(name)) await ghPull(name, file);
    }
  } catch (err) {
    console.error('아카이빙 그림을 GitHub 에서 받지 못함', err.message);
    return res.sendStatus(502);
  }
  if (!fs.existsSync(file)) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  return res.sendFile(file);
});

// index.html, style.css, script.js를 그대로 정적 파일로 내려줌
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
