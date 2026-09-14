// 山顶收束：把一座山的五层脉络摊成一张可看的思维图，再把六座山的进度摆成一览。
// 用 HTML/CSS 而不是 SVG：中文文本不需要手算宽度，换行、字号、无障碍都交给浏览器。
import { MOUNTAINS } from './data/content.mjs';
import { CONCEPT_LABELS, CROSS_PATHS } from './knowledge-engine.mjs';
import { STAGES, nodeDone, doneCount } from './domain.mjs';
import { icon } from './ui.mjs';

const mmEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmClip = (s, n) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n) + '…' : t; };

/** 这条山途的脉络图：峰顶问句 → 五层节点（左/右交替挂在脊线上） */
export function summitMapHTML(ctx) {
  const m = ctx.mountain;
  const j = ctx.state.journeys[m.id];
  const peak = m.kicker || m.reason || m.subtitle || '';
  const nodes = m.nodes.map((n, i) => {
    const done = nodeDone(j, i);
    const chips = (CONCEPT_LABELS[m.id]?.[i] ?? []).slice(0, 3);
    return `<li class="mm-node ${i % 2 ? 'right' : 'left'} ${done ? 'is-done' : ''}" style="--i:${i}">
      <span class="mm-dot">${done ? icon('check') : i + 1}</span>
      <div class="mm-card">
        <span class="mm-stage">${mmEsc(STAGES[i])}</span>
        <h3>${mmEsc(n.title)}</h3>
        <p class="mm-take">${mmEsc(mmClip(n.takeaway, 46))}</p>
        ${chips.length ? `<div class="mm-chips">${chips.map(c => `<span>${mmEsc(c)}</span>`).join('')}</div>` : ''}
        <button class="mm-go" data-action="reader-station" data-index="${i}">重访这一站 ${icon('arrow')}</button>
      </div>
    </li>`;
  }).join('');

  const others = MOUNTAINS.filter(x => x.id !== m.id).map(x => {
    const jj = ctx.state.journeys[x.id];
    const n = doneCount(jj);
    return `<button class="mm-mountain ${n >= 5 ? 'is-full' : n ? 'is-part' : ''}" data-action="open-topic" data-id="${x.id}">
      <strong>${mmEsc(x.title)}</strong>
      <span class="mm-bar"><i style="width:${n * 20}%"></i></span>
      <small>${n >= 5 ? '已走完 5 / 5' : n ? `已走过 ${n} / 5` : '还没开始'}</small>
    </button>`;
  }).join('');

  const links = CROSS_PATHS.filter(c => (ctx.state.journeys[c.from[0]] ? doneCount(ctx.state.journeys[c.from[0]]) > c.from[1] : false) || (ctx.state.journeys[c.to[0]] ? doneCount(ctx.state.journeys[c.to[0]]) > c.to[1] : false))
    .slice(0, 3).map(c => `<li><button data-action="open-topic" data-id="${c.to[0]}">${mmEsc(c.name)} ${icon('arrow')}</button><small>${mmEsc(mmClip(c.relation, 40))}</small></li>`).join('');

  return `<section class="summit-map page-width">
    <header class="mm-head">
      <span class="eyebrow">一览 · 这座山的脉络</span>
      <h2>从山脚到山顶，你走过的是这样一条路</h2>
      <p>五层不是五个知识点，而是一条把问题说清楚的路径：先看清，再动手，最后回到自己的判断。</p>
    </header>
    <div class="mm-peak">
      <span class="mm-peak-label">${mmEsc(m.title)} · 这座山在问</span>
      <p>${mmEsc(peak)}</p>
    </div>
    <ol class="mm-nodes">${nodes}</ol>
    <section class="mm-range">
      <header><span class="eyebrow">一览众山小</span><h3>六座山，各自走到哪儿了</h3></header>
      <div class="mm-mountains">${others}</div>
      ${links ? `<div class="mm-cross"><span class="eyebrow">从这座山可以去</span><ul>${links}</ul></div>` : ''}
    </section>
  </section>`;
}
