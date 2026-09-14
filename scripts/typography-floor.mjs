// 生成「字号下限」覆盖层：扫出 CSS 里所有 font-size ≤ 11.5px 的规则，按层级抬到 12.5/13px。
// 说明：项目原有大量 9–11px 的小标签，可读性差；这里统一设下限，交互类再大一档。
import fs from 'node:fs';

const files = ['F:/看山不是山1/src/styles.css', 'F:/看山不是山1/src/styles-v2.css'];
const css = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const rules = new Map();   // selector -> 最小字号
const re = /([^{}@]+)\{([^}]*)\}/g;
let m;
while ((m = re.exec(css))) {
  const sel = m[1].trim().replace(/\s+/g, ' ');
  const body = m[2];
  const fm = body.match(/font-size:\s*([0-9.]+)px/);
  if (!fm) continue;
  const n = parseFloat(fm[1]);
  if (n > 11.5) continue;
  if (/sr-only|skip-link|::|:before|:after/i.test(sel)) continue;
  if (/svg|icon\b/i.test(sel)) continue;
  // atRuleGuard：排除被正则截到的 at-rule 前奏（如 media(max-width:760px)）与不成形的片段
  if (/^(media|supports|keyframes|font-face|import|charset|layer|container|page)\b/i.test(sel)) continue;
  if (!/^[.#\[:*]/.test(sel) && !/^[a-z][a-z0-9-]*(\s|$|[.#:\[])/i.test(sel)) continue;
  if (!rules.has(sel) || rules.get(sel) > n) rules.set(sel, n);
}

const INTERACTIVE = /button|btn|chip|pill|link|tab|input|textarea|select|nav|breadcrumb|tool/i;
const groups = { inter: [], label: [] };
for (const [sel] of rules) {
  const clean = sel.replace(/\s*>\s*/g, '>');
  (INTERACTIVE.test(clean) ? groups.inter : groups.label).push(clean);
}
groups.inter.sort();
groups.label.sort();

const out = [];
out.push('');
out.push('/* ═══════════════════════════════════════════════════════════════════════');
out.push('   字号下限层：把原来的 9–11px 小字抬到可读区间（交互类 13px / 标签类 12.5px）');
out.push(`   —— 由 scripts/typography-floor.mjs 生成，覆盖 ${rules.size} 个选择器`);
out.push('   ═══════════════════════════════════════════════════════════════════════ */');
out.push(groups.inter.join(',\n') + '{font-size:13px!important}');
out.push(groups.label.join(',\n') + '{font-size:12.5px!important}');
out.push('/* 长字距的小标签一并收敛，避免稀疏难读 */');
out.push('.eyebrow,.method-head .eyebrow,.recommend-heading .eyebrow,.materials-head .eyebrow,.works-head .eyebrow{letter-spacing:.12em}');
out.push('/* 小屏不动：媒体查询里更小的字号仍然生效，只是不会低于上面的下限 */');
out.push('');

fs.writeFileSync('F:/tmp/type-floor.css', out.join('\n'));
console.log(`生成 ${rules.size} 个选择器的字号下限（交互 ${groups.inter.length} / 标签 ${groups.label.length}）`);
