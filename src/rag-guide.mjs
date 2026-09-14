// 傍身向导「山犬 · 阿山」：在探索时给解释与帮助。
// 检索侧全部走本地知识库（QA 卡片 + 49 条来源 + 当前营地内容 + 知乎缓存），
// 答案必须带出处；命中不足就如实说"没有足够匹配"，不编造。刻意不接生成式模型：
// 没配置模型时凭空生成只会显得像在编，这里只做「检索 + 归纳 + 引用」。
import { retrieveKnowledge, searchSources } from './knowledge-engine.mjs';
import { SOURCE_BY_ID } from './data/knowledge.mjs';
import { STAGES } from './domain.mjs';
import { icon, escapeHTML } from './ui.mjs';

/** 线稿小狗：一套 SVG 走完全程，动作靠 CSS 类（.is-think 思考、.is-happy 开心） */
export function guideDogSVG(cls = '') {
  return `<svg class="guide-dog ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path class="dog-ear-l" d="M17 22c-3-6-8-9-11-8-2 1-1 7 2 12 2 3 5 5 8 5"/>
    <path class="dog-ear-r" d="M47 22c3-6 8-9 11-8 2 1 1 7-2 12-2 3-5 5-8 5"/>
    <path d="M14 30c0-9 8-14 18-14s18 5 18 14c0 9-8 16-18 16s-18-7-18-16Z"/>
    <circle class="dog-eye-l" cx="25" cy="29" r="2.1" fill="currentColor" stroke="none"/>
    <circle class="dog-eye-r" cx="39" cy="29" r="2.1" fill="currentColor" stroke="none"/>
    <path class="dog-mouth" d="M32 36c-2.4 0-3.6 1.4-3.6 2.6S29.6 41 32 41s3.6-1.2 3.6-2.4S34.4 36 32 36Z"/>
    <path class="dog-tongue" d="M31 41.4h2v3.1a1 1 0 0 1-2 0Z" fill="#E97A6B" stroke="none"/>
    <path d="M22 45c2 2.5 6 3.5 10 3.5" opacity=".5"/>
    <circle class="dog-tail" cx="54" cy="44" r="2.4"/>
  </svg>`;
}

const ctxOf = (ctx) => ({
  view: ctx?.view || 'home',
  mountainId: ctx?.mountain?.id || '',
  mountainTitle: ctx?.mountain?.title || '',
  node: Number(ctx?.node) || 0,
  nodeTitle: ctx?.mountain?.nodes?.[Number(ctx?.node) || 0]?.title || '',
  stage: STAGES[Number(ctx?.node) || 0] || ''
});

export function guideContextLine(ctx) {
  const c = ctxOf(ctx);
  if (c.view === 'read') return `现在在：${c.mountainTitle} · ${c.stage}「${c.nodeTitle.slice(0, 14)}」`;
  if (c.view === 'mountain') return `现在在：${c.mountainTitle} 的地图`;
  if (c.view === 'library') return '现在在：山间资料馆';
  if (c.view === 'fieldbook') return '现在在：我的理解图谱';
  return '现在在：首页';
}

export function guideQuickAsks(ctx) {
  const v = ctxOf(ctx).view;
  if (v === 'read') return ['这一站在讲什么？', '这一站有哪些材料？', '和上一站什么关系？', '知乎上怎么讨论？'];
  if (v === 'mountain') return ['这座山该怎么走？', '哪一站值得先看？', '真实讨论在哪里？'];
  if (v === 'library') return ['怎么判断资料能不能用？', '知乎讨论和公开参考怎么分？', '帮我找一条材料'];
  if (v === 'fieldbook') return ['我走过哪些营地？', '这些判断是怎么留下来的？'];
  return ['这个 Demo 能做什么？', '这些资料是哪来的？', '为什么前三个营地能直接进？'];
}

export function guideTip(ctx) {
  const c = ctxOf(ctx);
  if (c.view === 'read') return '这一站先看材料，再做理解确认——材料就在第一屏。';
  if (c.view === 'mountain') return '前三站已经解锁，可以直接点进去看。';
  if (c.view === 'library') return '每张卡都标了读取范围：知乎讨论只作入口，公开参考用来核对概念。';
  if (c.view === 'fieldbook') return '走过的营地和留下的判断，都在这一页。';
  return '挑一座山，或者用一句话开一条新路。';
}

const chips = (sources) => (sources || []).filter(Boolean).slice(0, 4)
  .map(s => `<button class="guide-cite" data-action="source-detail" data-id="${s.id}">
      <i>${s.publisher === '知乎' ? '知' : '↗'}</i>${escapeHTML(String(s.title).slice(0, 20))}${String(s.title).length > 20 ? '…' : ''}
    </button>`).join('');

function zhihuPart(ctx, question) {
  const id = ctx?.mountain?.id;
  const d = id && ctx?.ui?.zhihuTopics ? ctx.ui.zhihuTopics[id] : null;
  if (!d) return '';
  const wants = /知乎|讨论|怎么看|争议|热榜/.test(question);
  const answers = (d.answers || []).filter(a => a.excerpt).slice(0, wants ? 2 : 1);
  const hot = (d.hot?.items || []).slice(0, 2);
  if (!answers.length && !hot.length) return '';
  const head = wants ? '知乎这边的真实材料（服务端摘要，不代表全文）：' : '顺带一提，知乎上相关讨论：';
  return `<div class="guide-block"><span class="guide-label">知乎</span><p class="guide-lead">${head}</p>
    ${answers.map(a => `<article class="guide-quote"><a href="${escapeHTML(a.questionUrl)}" target="_blank" rel="noopener">${escapeHTML(a.question)}</a>
      <p>${escapeHTML(String(a.excerpt).slice(0, 150))}…</p>
      <a class="guide-more" href="${escapeHTML(a.answerUrl || a.questionUrl)}" target="_blank" rel="noopener">看原回答 ${icon('external')}</a></article>`).join('')}
    ${hot.length ? `<ul class="guide-hot">${hot.map(h => `<li><a href="${escapeHTML(h.url)}" target="_blank" rel="noopener">${escapeHTML(h.title)}</a><span>命中「${(h.matched || []).join('／')}」</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

/** 演示向的本地问答：这些是"这个作品怎么用/数据从哪来"一类问题，
 *  不需要检索也不需要模型，直接写死最诚实（避免把说明书问题也包装成"检索结果"）。 */
const LOCAL_FAQ = [
  { k: /能做什么|干什么用|这是什么|怎么用|介绍/, a: '这是一条"爬山式"的知识路径：六座知识山，每座五层营地（认识 → 背景 → 核心 → 分歧 → 延伸）。每一层先摆材料与出处，再让你亲手做一个互动实验，最后用一次理解确认把话说清。右侧还有一座资料馆，49 条资料都标了读取范围与来处。' },
  { k: /数据|资料.*来|来源|哪来|可靠|编的/, a: '三类来源分得很清：本地策展资料 49 条（33 条知乎问题与专栏入口 + 16 份公开参考页），知乎实时内容经开放平台接口取回（回答是服务端摘要，不是全文），以及本项目自己撰写的导读与实验。哪一条属于哪一类，卡片上都标着；我们不复制全文、不伪造赞同数。' },
  { k: /联网|离线|断网|网络/, a: '页面本身可以离线运行（成品是单文件，插画与脚本都内嵌）。知乎那部分需要本地服务在线才有实时内容；取不到时会显示"暂时取不到"，不会假装成功。' },
  { k: /进度|记录|存在哪|上传|隐私/, a: '你的进度（走过的营地、笔记、收藏）只存在这台设备的浏览器 localStorage 里，不上传、不带账号。可以在"我的理解图谱"里导出成考察手记。' },
  { k: /解锁|为什么能进|前三个|跳着|顺序/, a: '这是路演模式：前三个营地默认开放，方便直接跳进去看内容；后面的营地走完前面的就会依次解锁。进度按"逐站真实完成"统计，跳着走不会把中间的空档算成走过。' },
  { k: /3d|沙盘|视角|缩放|旋转/, a: '山页右上角可以切到 3D 微缩沙盘：拖动旋转、滚轮缩放，镜头会按五站自动导览；你一拖动它就交给手动，点罗盘回到自动导览。旁边的按钮可以换一批山林与落石（山形不变）。' },
  { k: /换.*山|六座|哪几座/, a: '首页六张卡就是六座山：认知偏差、伦理入门、迷因群岛、AI Agent、独立思考、存在主义。山页左侧的路线列表可以在五层营地之间跳，也可以在资料馆按山域筛选资料。' },
  { k: /知乎.*准|摘要|原文|全文/, a: '知乎部分是开放平台返回的服务端摘要，不是全文，也不代表作者或平台立场；它只当作"此刻大家在讨论什么"的入口。要判断内容可不可用，请点进原回答，并对照公开参考页一起看。' }
];
function localFaq(q) {
  for (const item of LOCAL_FAQ) if (item.k.test(q)) return item.a;
  return null;
}

/** 组装回答：先给结论与出处，再给可继续的路。命中不足时明确说没有。 */
export function guideAnswer(ctx, question) {
  const q = String(question || '').trim();
  const c = ctxOf(ctx);
  const node = ctx?.mountain?.nodes?.[c.node];
  const inRead = c.view === 'read';

  // ⓪ 演示向问题（怎么用/数据从哪来）直接答，不包装成检索结果
  const faq = localFaq(q);
  if (faq) return { html: `<p class="guide-lead">${escapeHTML(faq)}</p>`, sources: [], usedLocal: true, faq: true };

  // ① 问「这一站」：直接用当前营地内容回答，不绕检索
  if (inRead && /这一站|这站|这段|在讲什么|讲什么|解释/.test(q)) {
    const points = (node?.points || []).slice(0, 2).map(p => `<li><b>${escapeHTML(p.title)}</b>：${escapeHTML(String(p.text).slice(0, 90))}</li>`).join('');
    return {
      html: `<p class="guide-lead">先把这一站摊开说：<b>${escapeHTML(node?.title || '')}</b>（${escapeHTML(c.stage)}）。</p>
        <p>${escapeHTML(String(node?.intro || '').slice(0, 180))}${String(node?.intro || '').length > 180 ? '…' : ''}</p>
        ${points ? `<ul class="guide-points">${points}</ul>` : ''}
        ${node?.misconception ? `<div class="guide-block"><span class="guide-label">边界</span><p>${escapeHTML(node.misconception)}</p></div>` : ''}
        <p class="guide-takeaway">带得走的一句：${escapeHTML(node?.takeaway || '')}</p>
        <div class="guide-actions"><button class="btn secondary" data-action="guide-chip" data-q="这一站有哪些材料？">看材料 ${icon('arrow')}</button>
        <button class="btn secondary" data-action="guide-chip" data-q="知乎上怎么讨论？">看真实讨论 ${icon('arrow')}</button></div>`,
      sources: [], usedLocal: true
    };
  }

  // ② 问「材料/出处」：列当前营地挂的来源
  if (inRead && /材料|出处|来源|资料|读什么/.test(q)) {
    const srcs = (node?.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean);
    return {
      html: `<p class="guide-lead">这一站挂了 ${srcs.length} 份来源，读取范围都标在卡片上：</p>
        <div class="guide-cites">${chips(srcs)}</div>
        <p class="tiny muted">知乎那几张只作讨论入口（本次仅拿到检索摘要）；公开参考用来核对具体概念。点开卡片能看到它被放在哪一层。</p>
        <div class="guide-actions"><button class="btn secondary" data-action="read-tab" data-tab="sources">在这一站打开资料页 ${icon('arrow')}</button></div>`,
      sources: srcs, usedLocal: true
    };
  }

  // ③ 问「关系」：用内容里的 bridge 回答
  if (/关系|为什么接|上一站|下一站|承接/.test(q)) {
    return {
      html: `<p class="guide-lead">这一站在整条路里的位置：${escapeHTML(c.stage)}。</p>
        <p>${escapeHTML(String(node?.bridge || '').slice(0, 200))}</p>
        <p class="tiny muted">五层是「认识 → 背景 → 核心 → 分歧 → 延伸」，前一站给下一站留下问题，不是知识点清单。</p>`,
      sources: [], usedLocal: true
    };
  }

  // ④ 其余：本地检索（QA 卡片打分）+ 来源检索，命中不足如实说
  // 先按当前山精确检索；没命中就退回全库，并注明这条来自哪座山（免得答非所问还以为在讲这座山）
  let r = retrieveKnowledge(q, c.mountainId || null);
  let fromOther = '';
  if (!r.ok) {
    const wide = retrieveKnowledge(q, null);
    if (wide.ok) {
      r = wide;
      if (wide.topic && wide.topic !== c.mountainId) fromOther = `这条其实来自另一座山：${wide.topic}。`;
    }
  }
  const sHitsScoped = searchSources(q, { topic: c.mountainId || 'all', kind: 'all' }).slice(0, 3);
  const sHits = sHitsScoped.length ? sHitsScoped : searchSources(q, { topic: 'all', kind: 'all' }).slice(0, 3);
  if (!r.ok && !sHits.length) {
    return {
      html: `<p class="guide-lead">本地资料里没有足够匹配的内容，我就不硬凑一个答案了。</p>
        <p class="tiny muted">${escapeHTML(r.reason || '')}</p>
        <div class="guide-actions"><button class="btn secondary" data-action="library-open">去资料馆自己搜 ${icon('arrow')}</button>
        <button class="btn secondary" data-action="guide-chip" data-q="${inRead ? '这一站在讲什么？' : '这个 Demo 能做什么？'}">换个问法 ${icon('arrow')}</button></div>`,
      sources: [], usedLocal: true, missed: true
    };
  }
  const matchedQ = r.ok && r.question && r.question !== q
    ? `<p class="tiny muted">我按本地策展的问题找到最接近的一条：「${escapeHTML(r.question)}」</p>` : '';
  return {
    html: `${fromOther ? `<p class="tiny muted">${escapeHTML(fromOther)}</p>` : ''}${matchedQ}${r.ok ? `<p class="guide-lead">${escapeHTML(r.answer)}</p>` : `<p class="guide-lead">${escapeHTML(r.reason || '本地没有足够的导读。')}</p>`}
      ${r.sources && r.sources.length ? `<div class="guide-block"><span class="guide-label">这条导读的出处</span><div class="guide-cites">${chips(r.sources)}</div></div>` : ''}
      ${sHits.length ? `<div class="guide-block"><span class="guide-label">可能相关的材料</span><div class="guide-cites">${sHits.map(s => `<button class="guide-cite" data-action="source-detail" data-id="${s.id}"><i>${s.publisher === '知乎' ? '知' : '↗'}</i>${escapeHTML(String(s.title).slice(0, 20))}${String(s.title).length > 20 ? '…' : ''}</button>`).join('')}</div></div>` : ''}
      ${zhihuPart(ctx, q)}`,
    sources: r.sources || sHits, usedLocal: true, matched: r.ok
  };
}

/** 面板骨架：浮动小狗 + 右侧抽屉（打开状态由 ctx.ui.guide.open 控制） */
export function guideShellHTML(ctx) {
  const quick = guideQuickAsks(ctx).map(q => `<button class="guide-chip" data-action="guide-chip" data-q="${escapeHTML(q)}">${escapeHTML(q)}</button>`).join('');
  return `<aside class="guide-dock" id="guide-dock" aria-label="向导">
    <button class="guide-dog-btn" data-action="guide-toggle" aria-label="问向导" aria-expanded="false">
      ${guideDogSVG()}<span class="guide-dog-name">问阿山</span>
    </button>
    <div class="guide-tip" id="guide-tip" hidden></div>
    <section class="guide-panel" id="guide-panel" role="dialog" aria-label="向导 · 山犬阿山" hidden>
      <header class="guide-head">
        ${guideDogSVG('is-happy')}
        <div><strong>山犬 · 阿山</strong><small>本地检索 + 出处引用</small></div>
        <button class="icon-button" data-action="guide-close" aria-label="收起向导">${icon('x')}</button>
      </header>
      <p class="guide-ctx" id="guide-ctx">${escapeHTML(guideContextLine(ctx))}</p>
      <div class="guide-log" id="guide-log" aria-live="polite"></div>
      <div class="guide-quick" id="guide-quick">${quick}</div>
      <form class="guide-form" id="guide-form">
        <input id="guide-input" type="text" placeholder="问一句：这一段在讲什么？有哪些材料？" autocomplete="off" aria-label="向向导提问">
        <button type="submit" class="btn primary" aria-label="发送">${icon('arrow')}</button>
      </form>
      <p class="guide-note">我只会引用本地知识库与已取回的知乎摘要，命中不足就说没有；不接生成式模型，不编答案。</p>
    </section>
  </aside>`;
}
