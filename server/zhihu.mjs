/**
 * Zhihu Open Platform proxy.
 * 网关侧做三件事：① Access Secret 只留在服务端；② 结果按接口分档缓存到磁盘（日额度只花一次）；
 * ③ 额度耗尽时降级为「用缓存 + 明说是缓存」，不编造成功。
 *
 * 额度档位（以 /api/v1/quota 实时为准）：
 *   zhihu_search 10/日 · global_search 10/日 · hot_list 2/日 · question_answers 10/日 · creator 10/日
 *   knowledge 500/日 · 另有免鉴权免额度的黑客松配套内容接口（知乎知识 / 知乎故事）
 */

import fs from 'node:fs';
import path from 'node:path';
import { KNOWLEDGE_SOURCES } from '../src/data/knowledge.mjs';

const BASE = 'https://developer.zhihu.com';
const HACKATHON_BASE = 'https://api.zhihu.com/km-indep-home/hackathon/v2';
const CACHE_FILE = path.resolve(import.meta.dirname, '..', '.zhihu-cache.json');

// 内存缓存：进程内去重；磁盘缓存：跨次启动，把日额度摊薄成一次
const cache = new Map();
const rate = new Map();

// 各类结果的保鲜期：回答/问题耐久，热榜很短
const TTL = {
  search: 6 * 60 * 60 * 1000,
  global: 6 * 60 * 60 * 1000,
  answers: 7 * 24 * 60 * 60 * 1000,
  questions: 3 * 24 * 60 * 60 * 1000,
  hot: 30 * 60 * 1000,
  hackathon: 12 * 60 * 60 * 1000,
  quota: 60 * 1000
};

let disk = null;
function loadDisk() {
  if (disk) return disk;
  try {
    disk = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (!disk || typeof disk !== 'object') disk = {};
  } catch {
    disk = {};
  }
  return disk;
}
let flushTimer = null;
function saveDisk() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(disk));
    } catch { /* 磁盘不可写就只留内存缓存，不影响接口 */ }
  }, 200);
}

function readCache(key, ttl) {
  const mem = cache.get(key);
  if (mem && Date.now() - mem.at <= ttl) return { value: mem.value, fresh: true, at: mem.at };
  const d = loadDisk()[key];
  if (d && Date.now() - d.at <= ttl) {
    cache.set(key, { at: d.at, value: d.value });
    return { value: d.value, fresh: true, at: d.at };
  }
  if (d) return { value: d.value, fresh: false, at: d.at };   // 过期但仍可用：额度耗尽时兜底
  return null;
}
/** 取回失败时统一退回缓存：文案里如实写明失败原因与快照时间，不假装是实时的 */
/** 按键前缀找缓存：同一目标（同一问题/同一主题）不同 count 的请求共享一份缓存，按需切片 */
function findCache(prefix) {
  const mem = [...cache.entries()].filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => ({ key: k, at: v.at, value: v.value }));
  const diskKeys = Object.keys(loadDisk()).filter(k => k.startsWith(prefix));
  const all = [...mem, ...diskKeys.map(k => ({ key: k, at: loadDisk()[k].at, value: loadDisk()[k].value }))]
    .sort((a, b) => b.at - a.at);
  return all[0] || null;
}
function sliceItems(value, n, extra = {}) {
  if (!value) return null;
  return { ...value, items: (value.items || []).slice(0, n), ...extra };
}

function staleNote(label, err, at) {
  const why = err?.code === 30001
    ? '额度或频率已达上限'
    : (err?.code === 'NOT_CONFIGURED' ? '服务端未配置 Access Secret' : (err?.message || '取回失败'));
  const when = at ? new Date(at).toLocaleString('zh-CN') : '未知时间';
  return `${label}实时取回失败（${why}），这里是 ${when} 的快照；实时内容需要服务端凭据在线。`;
}
function staleResult(hit, err, label) {
  return {
    ...hit.value,
    mode: 'cached',
    cached: true,
    degraded: true,
    snapshotAt: new Date(hit.at).toISOString(),
    note: staleNote(label, err, hit.at)
  };
}

function writeCache(key, value) {
  const at = Date.now();
  cache.set(key, { at, value });
  loadDisk()[key] = { at, value };
  saveDisk();
}

function configured() {
  return Boolean(process.env.ZHIHU_API_KEY || process.env.ZHIHU_ACCESS_SECRET);
}
function secret() {
  return process.env.ZHIHU_API_KEY || process.env.ZHIHU_ACCESS_SECRET || '';
}

function allow(ip, limit, windowMs) {
  const now = Date.now();
  for (const [k, v] of rate) if (now - v.start > windowMs) rate.delete(k);
  const used = rate.get(ip) ?? { start: now, count: 0 };
  if (used.count >= limit) return false;
  used.count++;
  rate.set(ip, used);
  return true;
}

async function call(pathname, params = {}, { timeoutMs = 12000, auth = true, base = BASE } = {}) {
  if (auth && !configured()) {
    const err = new Error('知乎接口未配置（缺少 Access Secret）。');
    err.code = 'NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  const url = new URL(base + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'KanShanDemo/2.0 (educational; zhihu-open-platform)',
      Accept: 'application/json'
    };
    if (auth) {
      headers.Authorization = `Bearer ${secret()}`;
      headers['X-Request-Timestamp'] = String(Math.floor(Date.now() / 1000));
    }
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    const text = await res.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      const err = new Error(`知乎返回了非 JSON（HTTP ${res.status}）。`);
      err.status = res.status;
      throw err;
    }
    if (payload && payload.Code === 30001) {
      const err = new Error(payload.Message || '知乎额度或频率已达上限。');
      err.status = 429;
      err.code = 30001;
      throw err;
    }
    if (!res.ok || (payload && payload.Code && payload.Code !== 0)) {
      const err = new Error(payload?.Message || `知乎接口 HTTP ${res.status}`);
      err.status = res.status;
      err.code = payload?.Code;
      throw err;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = String(raw.Url || raw.url || '').split('?')[0];
  const typeMap = { Answer: '回答', Article: '文章', Question: '问题', Video: '视频', Zhuanlan: '专栏' };
  const contentType = raw.ContentType || raw.Type || '';
  return {
    id: String(raw.ContentID || raw.ContentToken || raw.ID || raw.id || url),
    title: String(raw.Title || raw.title || '').trim(),
    type: typeMap[contentType] || contentType || '内容',
    contentType,
    author: String(raw.AuthorName || raw.AuthorSignature || raw.Author || '').trim(),
    excerpt: String(raw.ContentText || raw.Summary || raw.Excerpt || '')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 420),
    url,
    votes: Number(raw.VoteUpCount || raw.VoteupCount || raw.voteup || 0) || 0,
    comments: Number(raw.CommentCount || 0) || 0,
    editTime: raw.EditTime || raw.updated || null,
    source: 'zhihu-open-api'
  };
}

/** 该话题在本地策展里已有的知乎问题入口（只取「问题讨论」，专栏算文章） */
export function curatedQuestions(topic) {
  return KNOWLEDGE_SOURCES
    .filter(s => s.topic === topic && /(^https?:\/\/)?(www\.)?zhihu\.com\//.test(String(s.url || '')))
    .map(s => ({ id: s.id, title: s.title, url: s.url }))
    .filter(s => /zhihu\.com\/question\//.test(s.url));
}

/** 每座山的热榜关键词：命中即认为"此刻有人在讨论相关的事"。命中词会回传，前端如实标注匹配依据 */
export const HOT_KEYWORDS = {
  'cognitive-biases': ['偏见', '认知', '幸存者', '统计', '直觉', '误判', '刻板印象', '经验', '判断'],
  'ethics-intro': ['伦理', '道德', '该不该', '合法', '判决', '责任', '无偿加班', '画饼', '裁员', '处罚', '获刑', '遗产'],
  'meme-culture': ['梗', '流行语', '玩梗', '表情包', '短视频', '出圈', '模仿', '翻车', '抽象', '实用型'],
  'ai-agents': ['AI', '人工智能', '大模型', 'Agent', '智能体', 'codex', 'claude', '自动化', '提示词', '算法'],
  'critical-thinking': ['科研', '证据', '谣言', '辟谣', '数据', '结论', '实验', '论文', '逻辑', '验证'],
  existentialism: ['自由', '意义', '焦虑', '选择', '自我', '孤独', '处境', '荒诞', '抑郁', '躺平', '民族自决']
};

export const MOUNTAIN_TOPICS = ['cognitive-biases', 'ethics-intro', 'meme-culture', 'ai-agents', 'critical-thinking', 'existentialism'];

/** 问题推荐要中文关键词（用英文 id 查会返回空） */
export const TOPIC_KEYWORDS = {
  'cognitive-biases': '认知偏差 思维偏误',
  'ethics-intro': '伦理学 道德困境',
  'meme-culture': '网络迷因 梗 传播',
  'ai-agents': 'AI Agent 智能体',
  'critical-thinking': '批判性思维 事实与观点',
  existentialism: '存在主义 自由与处境'
};

export async function searchZhihu(query, count = 8, { ip = 'local' } = {}) {
  const q = String(query || '').trim().slice(0, 80);
  if (!q) {
    const err = new Error('需要检索词。');
    err.status = 400;
    throw err;
  }
  const n = Math.min(Math.max(Number(count) || 8, 1), 10);
  const key = `search:${q}:${n}`;
  let hit = readCache(key, TTL.search);
  if (!hit) {
    const wide = findCache(`search:${q}:`);
    if (wide) hit = { value: sliceItems(wide.value, n), fresh: Date.now() - wide.at <= TTL.search, at: wide.at };
  }
  if (hit?.fresh) return { ...hit.value, cached: true };

  if (!allow(`s:${ip}`, 8, 60_000)) {
    const err = new Error('本机每分钟实时检索次数较多，请稍后再试。');
    err.status = 429;
    throw err;
  }
  try {
    const payload = await call('/api/v1/content/zhihu_search', { Query: q, Count: n });
    const items = (payload?.Data?.Items || []).map(sanitizeItem).filter(Boolean);
    const result = {
      ok: true,
      query: q,
      mode: 'live',
      items,
      hasMore: Boolean(payload?.Data?.HasMore),
      fetchedAt: new Date().toISOString(),
      note: '来自知乎开放平台检索；摘要不等于完整原文，观点不代表平台立场。'
    };
    writeCache(key, result);
    return result;
  } catch (err) {
    if (hit) return staleResult(hit, err, '站内检索');
    throw err;
  }
}

/** 全网检索（与站内检索额度分开计） */
export async function globalSearch(query, count = 6, { db = 'all', ip = 'local' } = {}) {
  const q = String(query || '').trim().slice(0, 80);
  if (!q) {
    const err = new Error('需要检索词。');
    err.status = 400;
    throw err;
  }
  const n = Math.min(Math.max(Number(count) || 6, 1), 10);
  const key = `global:${q}:${n}:${db}`;
  let hit = readCache(key, TTL.global);
  if (!hit) {
    const wide = findCache(`global:${q}:`);
    if (wide) hit = { value: sliceItems(wide.value, n), fresh: Date.now() - wide.at <= TTL.global, at: wide.at };
  }
  if (hit?.fresh) return { ...hit.value, cached: true };
  if (!allow(`g:${ip}`, 6, 60_000)) {
    const err = new Error('本机每分钟全网检索次数较多，请稍后再试。');
    err.status = 429;
    throw err;
  }
  try {
    const payload = await call('/api/v1/content/global_search', { Query: q, Count: n, SearchDB: db });
    const items = (payload?.Data?.Items || []).map(sanitizeItem).filter(Boolean);
    const result = {
      ok: true,
      query: q,
      mode: 'live',
      scope: 'web',
      items,
      fetchedAt: new Date().toISOString(),
      note: '全网检索结果来自公开来源，只作参考入口，未做事实核验。'
    };
    writeCache(key, result);
    return result;
  } catch (err) {
    if (hit) return staleResult(hit, err, '全网检索');
    throw err;
  }
}

export async function hotList(limit = 10, { ip = 'local' } = {}) {
  const n = Math.min(Math.max(Number(limit) || 10, 1), 30);
  // 热榜按"一份全量、按需切片"缓存：不管请求几条，平台上只花一次额度
  const ALL = 'hot:all';
  const slice = (value, at, mode, extra = {}) => ({
    ...value,
    items: (value.items || []).slice(0, n),
    mode,
    at,
    ...extra
  });
  const fresh = readCache(ALL, TTL.hot);
  if (fresh?.fresh) return { ...slice(fresh.value, fresh.at, 'live'), cached: true };

  const stale = fresh || largestHotCache();
  if (!allow(`h:${ip}`, 2, 60_000)) {
    const err = new Error('热榜请求过于频繁，请稍后再试。');
    err.status = 429;
    throw err;
  }
  try {
    const payload = await call('/api/v1/content/hot_list', { limit: 30 });
    const items = (payload?.Data?.Items || []).slice(0, 30).map((raw) => ({
      title: String(raw.Title || '').trim(),
      url: String(raw.Url || '').split('?')[0],
      summary: String(raw.Summary || '').trim().slice(0, 220),
      thumbnail: raw.ThumbnailUrl || '',
      source: 'zhihu-hot'
    }));
    const result = {
      ok: true,
      mode: 'live',
      items,
      total: Number(payload?.Data?.Total || items.length),
      fetchedAt: new Date().toISOString(),
      note: '热榜只反映当前时刻热度，不等于可靠结论。'
    };
    writeCache(ALL, result);
    return slice(result, Date.now(), 'live');
  } catch (err) {
    if (stale) {
      const at = stale.at || Date.now();
      return slice(stale.value, at, 'cached', {
        cached: true,
        degraded: true,
        note: staleNote('热榜', err, at)
      });
    }
    throw err;
  }
}

/** 降级兜底：找缓存里条数最多的一份热榜（历史键 hot:<n> 或 hot:all） */
function largestHotCache() {
  const keys = Object.keys(loadDisk()).filter(k => k.startsWith('hot:'));
  let best = null;
  for (const k of keys) {
    const entry = readCache(k, Number.MAX_SAFE_INTEGER);
    if (!entry) continue;
    const count = (entry.value?.items || []).length;
    if (!best || count > (best.value.items || []).length) best = entry;
  }
  return best;
}

/** 把当日热榜匹配到某座山：返回命中的条目与命中词，前端据此如实标注"关键词匹配" */
export async function hotFor(topicId, { limit = 4, ip = 'local' } = {}) {
  const kws = HOT_KEYWORDS[topicId] || [];
  if (!kws.length) return { ok: true, topic: topicId, items: [], mode: 'no-keywords' };
  let hot;
  try {
    hot = await hotList(30, { ip });
  } catch (err) {
    return { ok: false, topic: topicId, items: [], mode: 'error', error: err.message };
  }
  const scored = [];
  for (const it of hot.items || []) {
    const text = `${it.title} ${it.summary || ''}`;
    const hits = kws.filter(k => text.includes(k));
    if (!hits.length) continue;
    scored.push({ ...it, matched: hits.slice(0, 3), score: hits.length });
  }
  scored.sort((a, b) => b.score - a.score);
  return {
    ok: true,
    topic: topicId,
    mode: hot.mode,
    fetchedAt: hot.fetchedAt,
    items: scored.slice(0, limit),
    scanned: (hot.items || []).length,
    note: '按关键词把当日热榜匹配到这座山：只说明话题相邻，不代表立场或结论；点开即到知乎原问题。'
  };
}

/** 某个知乎问题下的真实回答摘要（服务端截取文本，不是全文，也不是 AI 生成） */
export async function questionAnswers(questionUrlOrId, limit = 6, { ip = 'local' } = {}) {
  const raw = String(questionUrlOrId || '').trim();
  if (!raw) {
    const err = new Error('需要知乎问题链接或 ID。');
    err.status = 400;
    throw err;
  }
  const m = raw.match(/question\/(\d+)/) || raw.match(/^(\d+)$/);
  const questionUrl = m ? `https://www.zhihu.com/question/${m[1]}` : raw;
  const questionId = m ? m[1] : raw;
  const n = Math.min(Math.max(Number(limit) || 6, 1), 20);
  const key = `qa:${questionId}:${n}`;
  let hit = readCache(key, TTL.answers);
  if (!hit) {
    const wide = findCache(`qa:${questionId}:`);
    if (wide) hit = { value: sliceItems(wide.value, n), fresh: Date.now() - wide.at <= TTL.answers, at: wide.at };
  }
  if (hit?.fresh) return { ...hit.value, cached: true };
  if (!allow(`q:${ip}`, 6, 60_000)) {
    const err = new Error('问题回答请求过于频繁，请稍后再试。');
    err.status = 429;
    throw err;
  }
  try {
    const payload = await call('/api/v1/content/question_answers', {
      QuestionUrl: questionUrl,
      Offset: 0,
      Limit: n
    });
    const items = (payload?.Data?.Items || payload?.Data?.Answers || [])
      .map((raw2) => sanitizeItem(raw2))
      .filter((x) => x && (x.excerpt || x.url));
    const result = {
      ok: true,
      mode: 'live',
      questionId,
      questionUrl,
      items,
      paging: payload?.Data?.Paging || null,
      fetchedAt: new Date().toISOString(),
      note: '摘要是知乎服务端返回的截取文本，不代表回答全文，也不构成对原问题的统一立场。'
    };
    writeCache(key, result);
    return result;
  } catch (err) {
    if (hit) return staleResult(hit, err, '问题回答');
    throw err;
  }
}

/** 按主题推荐知乎上真实存在的问题（与创作能力共用额度档） */
export async function topicQuestions(query, count = 5, { ip = 'local' } = {}) {
  const q = String(query || '').trim().slice(0, 60);
  const n = Math.min(Math.max(Number(count) || 5, 1), 20);
  const key = `tq:${q || 'profile'}:${n}`;
  let hit = readCache(key, TTL.questions);
  if (!hit) {
    const wide = findCache(`tq:${q || 'profile'}:`);
    if (wide) hit = { value: sliceItems(wide.value, n), fresh: Date.now() - wide.at <= TTL.questions, at: wide.at };
  }
  if (hit?.fresh) return { ...hit.value, cached: true };
  if (!allow(`t:${ip}`, 4, 60_000)) {
    const err = new Error('问题推荐请求过于频繁，请稍后再试。');
    err.status = 429;
    throw err;
  }
  try {
    const payload = await call('/api/v1/user/question_recommendations', q ? { Query: q, Count: n } : { Count: n });
    const items = (payload?.Data?.Items || []).map((raw) => ({
      title: String(raw.Title || '').trim(),
      url: String(raw.Url || '').split('?')[0],
      source: 'zhihu-recommend'
    })).filter((x) => x.title && x.url);
    const result = {
      ok: true,
      mode: 'live',
      topic: q,
      items,
      fetchedAt: new Date().toISOString(),
      note: '知乎按主题推荐的问题清单，只作讨论入口。'
    };
    writeCache(key, result);
    return result;
  } catch (err) {
    if (hit) return staleResult(hit, err, '问题推荐');
    throw err;
  }
}

/** 黑客松配套内容接口：免鉴权、不占额度，内容是真实知乎作品（知识 / 故事） */
export async function hackathonWorks(kind = 'knowledge', limit = 8) {
  const k = kind === 'story' ? 'story' : 'knowledge';
  const n = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const key = `hack:${k}`;
  const hit = readCache(key, TTL.hackathon);
  if (hit?.fresh) return { ...hit.value, cached: true };
  const list = await call(`/${k}/list`, {}, { auth: false, base: HACKATHON_BASE });
  const rows = Array.isArray(list) ? list : (list?.Data?.Items || []);
  const items = rows.slice(0, n).map((raw) => ({
    id: String(raw.work_id || ''),
    title: String(raw.title || '').trim(),
    description: String(raw.description || '').trim().slice(0, 200),
    artwork: String(raw.tab_artwork || raw.artwork || ''),
    labels: Array.isArray(raw.labels) ? raw.labels.slice(0, 3) : [],
    source: `zhihu-hackathon-${k}`
  })).filter((x) => x.title);
  const result = {
    ok: true,
    mode: 'live',
    kind: k,
    items,
    fetchedAt: new Date().toISOString(),
    note: k === 'knowledge'
      ? '知乎知识作品（黑客松配套内容接口，免鉴权、不占额度）。标题与封面来自知乎，未做改写。'
      : '知乎故事（黑客松配套内容接口）。'
  };
  writeCache(key, result);
  return result;
}

/**
 * 一座山的知乎全景：本地策展问题 + 真实回答摘要 + 知乎推荐问题。
 * 策展里可能有个别问题在开放平台已失效，所以按候选顺序往下试；
 * 平台对突发调用会返回 30001（频率限制），命中后停一下再试下一个候选。
 */
export async function topicDigest(topicId, { ip = 'local', answers = 2, questionCount = 5, tries = 3 } = {}) {
  const curated = curatedQuestions(topicId);
  const answerBlocks = [];
  let cursor = 0;
  while (answerBlocks.filter(b => b.excerpt).length < answers && cursor < curated.length) {
    const q = curated[cursor++];
    // 每次都先查缓存/额度：额度用完时不再继续尝试
    let res = null;
    try {
      res = await questionAnswers(q.url, 4, { ip });
    } catch (err) {
      answerBlocks.push({ question: q.title, questionUrl: q.url, error: err.message, mode: 'error' });
      if (err.code === 30001) break;               // 频率或日额度受限：停止这一轮的继续尝试
      if (answerBlocks.length >= tries + answers) break;
      continue;
    }
    const top = (res.items || [])[0];
    answerBlocks.push({
      question: q.title,
      questionUrl: q.url,
      excerpt: top ? top.excerpt : '',
      answerUrl: top ? top.url : '',
      contentType: top ? top.type : '',
      mode: res.mode,
      fetchedAt: res.fetchedAt,
      note: res.note,
      empty: !top
    });
    if (!top) await new Promise(r => setTimeout(r, 400));   // 换下一个候选前稍作停顿
  }
  let reco = { items: [], mode: 'error' };
  try {
    const keyword = TOPIC_KEYWORDS[topicId] || topicId.replace(/-/g, ' ');
    const res = await topicQuestions(keyword, questionCount, { ip });
    reco = { items: res.items || [], mode: res.mode, fetchedAt: res.fetchedAt, note: res.note };
  } catch (err) {
    reco = { items: [], mode: 'error', error: err.message };
  }
  let hot = { ok: false, items: [], mode: 'skipped' };
  try {
    hot = await hotFor(topicId, { ip });
  } catch (err) {
    hot = { ok: false, items: [], mode: 'error', error: err.message };
  }
  return {
    ok: true,
    topic: topicId,
    curated,
    answers: answerBlocks.filter(b => b.excerpt),
    tried: answerBlocks,
    questions: reco,
    hot,
    fetchedAt: new Date().toISOString(),
    note: '知乎内容来自开放平台接口：回答是服务端摘要，问题清单是知乎推荐；本项目只做入口与出处标注，不改写原文。'
  };
}

export async function quota({ ip = 'local' } = {}) {
  const key = 'quota';
  const hit = readCache(key, TTL.quota);
  if (hit?.fresh) return { ...hit.value, cached: true };
  if (!allow(`u:${ip}`, 2, 60_000)) {
    const err = new Error('额度查询过于频繁。');
    err.status = 429;
    throw err;
  }
  const payload = await call('/api/v1/quota', {});
  const items = (payload?.Data || []).map((row) => ({
    id: row.APIID,
    name: row.APIName,
    total: Number(row.TotalQuota || 0),
    used: Number(row.TotalUsed || 0),
    remaining: Number(row.RemainingQuota || 0)
  }));
  const result = { ok: true, mode: 'live', items, fetchedAt: new Date().toISOString() };
  writeCache(key, result);
  return result;
}

export function status() {
  let cachedKeys = 0;
  try {
    cachedKeys = Object.keys(loadDisk()).length;
  } catch { cachedKeys = 0; }
  return {
    configured: configured(),
    mode: configured() ? 'live-available' : 'offline',
    cachedKeys,
    endpoints: [
      '/api/zhihu/search',
      '/api/zhihu/global',
      '/api/zhihu/hot',
      '/api/zhihu/answers',
      '/api/zhihu/questions',
      '/api/zhihu/topic/<id>',
      '/api/zhihu/works',
      '/api/zhihu/quota'
    ]
  };
}
