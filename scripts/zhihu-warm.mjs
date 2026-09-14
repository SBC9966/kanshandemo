// 知乎数据预热：把每座山的真实回答摘要与知乎推荐问题抓一次，落到 .zhihu-cache.json。
// 额度是按日计的（question_answers 10/日、creator 10/日），所以只在需要时手动跑：
//   node scripts/zhihu-warm.mjs              预热六座山（默认每山 1 个问题 + 5 条推荐）
//   node scripts/zhihu-warm.mjs --answers 2  每山抓 2 个问题的回答
//   node scripts/zhihu-warm.mjs --works      顺带抓免额度的知乎知识作品/故事
// 仓库里的 .zhihu-cache.json 已在 .gitignore 中。
import fs from 'node:fs';
import path from 'node:path';
import * as zhihu from '../server/zhihu.mjs';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const args = process.argv.slice(2);
const num = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const answers = num('--answers', 1);
const questions = num('--questions', 5);
const pace = num('--pace', 2500);
const withWorks = args.includes('--works');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!zhihu.status().configured) {
    console.error('未找到知乎 Access Secret（.env 里的 ZHIHU_API_KEY）。');
    process.exitCode = 1;
    return;
  }
  try {
    const q = await zhihu.quota();
    const row = (id) => q.items.find(x => x.id === id);
    const show = (id) => {
      const r = row(id);
      return r ? `${id} 剩 ${r.remaining}/${r.total}` : `${id} 未在额度表里`;
    };
    console.log(`额度：${show('question_answers')} · ${show('creator')} · ${show('zhihu_search')} · ${show('hot_list')}`);
  } catch (err) {
    console.warn('额度查询失败，继续尝试抓取：', err.message);
  }

  // 平台对突发调用会给 30001（频率限制），所以逐座山拉开间隔
  const pending = [];
  for (const topic of zhihu.MOUNTAIN_TOPICS) {
    try {
      const digest = await zhihu.topicDigest(topic, { answers, questionCount: questions });
      console.log(`✓ ${topic}：回答 ${digest.answers.length} 条，推荐问题 ${digest.questions.items.length} 条`);
      if (!digest.answers.length) pending.push(topic);
    } catch (err) {
      console.error(`✗ ${topic}：${err.message}`);
      pending.push(topic);
    }
    await sleep(pace);
  }

  // 第二轮：把没抓到回答的再试一次（缓存里仍为空，说明上一轮多半是被限频）
  for (const topic of pending) {
    await sleep(pace * 2);
    try {
      const digest = await zhihu.topicDigest(topic, { answers, questionCount: questions, tries: 2 });
      console.log(`↻ ${topic}：回答 ${digest.answers.length} 条，推荐问题 ${digest.questions.items.length} 条`);
    } catch (err) {
      console.error(`↻ ${topic} 仍失败：${err.message}`);
    }
  }

  if (withWorks) {
    for (const kind of ['knowledge', 'story']) {
      try {
        const res = await zhihu.hackathonWorks(kind, 8);
        console.log(`✓ 知乎${kind === 'knowledge' ? '知识作品' : '故事'}：${res.items.length} 条（免额度）`);
      } catch (err) {
        console.error(`✗ 知乎${kind}：${err.message}`);
      }
      await sleep(300);
    }
  }

  const cached = Object.keys(JSON.parse(fs.readFileSync(path.join(root, '.zhihu-cache.json'), 'utf8')));
  console.log(`\n缓存键 ${cached.length} 个 → .zhihu-cache.json（页面刷新不会重复消耗额度）`);
}

main();
