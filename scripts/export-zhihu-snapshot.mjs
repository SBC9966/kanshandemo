// 把已取回的知乎内容固化成前端可用的离线快照（不改写、只搬运，并保留取回时间）。
// 用途：静态托管（如 GitHub Pages）没有服务端代理，前端 fetch /api/zhihu/* 会 404；
//      有快照就能展示真实内容并标注"离线快照 + 取回时间"，而不是一片"暂时取不到"。
// 只读本地 .zhihu-cache.json，不发起任何网络请求，不消耗额度。
// 用法：node scripts/export-zhihu-snapshot.mjs
import fs from 'node:fs';
import path from 'node:path';
import { MOUNTAIN_TOPICS, TOPIC_KEYWORDS, HOT_KEYWORDS, curatedQuestions } from '../server/zhihu.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cachePath = path.join(root, '.zhihu-cache.json');
if (!fs.existsSync(cachePath)) {
  console.error('没有找到 .zhihu-cache.json：先运行 node scripts/zhihu-warm.mjs 取回内容。');
  process.exit(1);
}
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const entry = (key) => {
  const hit = cache[key];
  return hit ? { at: hit.at, value: hit.value } : null;
};
const iso = (t) => new Date(t).toISOString();

const topics = {};
for (const id of MOUNTAIN_TOPICS) {
  // 回答摘要：按该山的策展问题，从缓存里取最匹配的一条
  const answers = [];
  for (const q of curatedQuestions(id)) {
    const key = Object.keys(cache).find(k => k.startsWith('qa:' + (q.url.match(/question\/(\d+)/) || [])[1] + ':'));
    const hit = key ? entry(key) : null;
    const top = hit && (hit.value.items || [])[0];
    if (!top) continue;
    answers.push({
      question: q.title,
      questionUrl: q.url,
      excerpt: top.excerpt,
      answerUrl: top.url,
      contentType: top.type,
      snapshotAt: iso(hit.at)
    });
    if (answers.length >= 2) break;
  }
  // 推荐问题
  const kw = TOPIC_KEYWORDS[id];
  const tqKey = Object.keys(cache).find(k => k.startsWith('tq:') && (k.includes(kw || '') || k.split(':')[1] === id));
  const tqHit = tqKey ? entry(tqKey) : null;
  const questions = tqHit ? (tqHit.value.items || []) : [];
  // 热榜匹配（纯函数，不联网）
  const hotHit = entry('hot:all');
  const hotItems = [];
  if (hotHit) {
    for (const it of hotHit.value.items || []) {
      const text = `${it.title} ${it.summary || ''}`;
      const hits = (HOT_KEYWORDS[id] || []).filter(k => text.includes(k));
      if (hits.length) hotItems.push({ ...it, matched: hits.slice(0, 3), score: hits.length });
    }
    hotItems.sort((a, b) => b.score - a.score);
  }
  topics[id] = {
    answers,
    questions: { items: questions, mode: 'snapshot' },
    hot: hotItems.length ? {
      ok: true, mode: 'snapshot', items: hotItems.slice(0, 4), scanned: (hotHit.value.items || []).length,
      note: '按关键词把当日热榜匹配到这座山：只说明话题相邻；点开即到知乎原问题。'
    } : null,
    snapshotAt: iso(Math.min(...[tqHit?.at, hotHit?.at].filter(Boolean).concat(Date.now())))
  };
}

const worksHit = entry('hack:knowledge');
const hotAllHit = entry('hot:all');

const snapshot = {
  snapshotAt: iso(Date.now()),
  source: '知乎开放平台（经服务端取回后固化为离线快照）',
  note: '这些是取回当时的知乎内容快照：回答为服务端摘要（非全文），热榜为当时快照，均不代表平台立场。实时内容需要服务端代理在线。',
  topics,
  works: worksHit ? { items: worksHit.value.items || [], note: worksHit.value.note, snapshotAt: iso(worksHit.at) } : null,
  hotList: hotAllHit ? { items: (hotAllHit.value.items || []).slice(0, 12), total: (hotAllHit.value.items || []).length, snapshotAt: iso(hotAllHit.at), note: hotAllHit.value.note } : null
};

const out = `// 由 scripts/export-zhihu-snapshot.mjs 生成，请勿手改；重新生成：node scripts/export-zhihu-snapshot.mjs
// 内容来自知乎开放平台（服务端取回后固化），仅作离线快照展示；不含任何凭证。
export const ZHIHU_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};
`;
fs.writeFileSync(path.join(root, 'src/data/zhihu-snapshot.mjs'), out);
const size = Buffer.byteLength(out);
console.log(`已生成 src/data/zhihu-snapshot.mjs（${(size / 1024).toFixed(1)} KB）`);
for (const [id, t] of Object.entries(topics)) {
  console.log(`  ${id}: 回答 ${t.answers.length} 条 · 推荐问题 ${t.questions.items.length} 条 · 热榜匹配 ${(t.hot?.items || []).length} 条`);
}
console.log(`  知乎知识作品：${(snapshot.works?.items || []).length} 条 · 热榜：${(snapshot.hotList?.items || []).length} 条（共 ${snapshot.hotList?.total || 0}）`);
