import { escapeHTML, STAGES } from './domain.mjs';
import { ASSETS } from './assets.mjs';
export const ICONS = {
 link:'<path d="m10 13 4-2M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
 mountain:'<path d="m3 19 6-13 4 8 3-6 5 11H3Z"/><path d="m6.5 11.5 2.5 2 2-1M14 12l2 2 2-1"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',back:'<path d="M20 12H5m5 5-5-5 5-5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',book:'<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Zm0 0v14"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',unlock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 7.6-1.5M12 15v2"/>',check:'<path d="m5 12 4 4L19 6"/>',
 star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9L12 3Z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',spark:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',flag:'<path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3m0 3h.01"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10h.01"/>',
 leaf:'<path d="M20 3C9 2 3 7 4 14s14 8 16-11Z"/><path d="M3 21 16 8"/>',layers:'<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
 volume:'<path d="M11 4 6 8H3v8h3l5 4V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',mute:'<path d="M11 4 6 8H3v8h3l5 4V4Zm5 5 6 6m-6 0 6-6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',moon:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 share:'<path d="M12 15V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2"/>',external:'<path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/>',refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 2v6h-6"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 pen:'<path d="m16 3 5 5L9 20l-6 1 1-6L16 3Zm-3 3 5 5"/>',chat:'<path d="M21 11a9 9 0 0 1-13 8l-6 2 2-6A9 9 0 1 1 21 11Z"/><path d="M7 10h10m-10 4h6"/>',
 person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',foot:'<path d="M7 3c3 0 4 5 2 8S4 14 3 11 3 3 7 3Zm-1 13v5m12-10c3 0 4 5 2 8s-5 3-6 0 0-8 4-8Z"/>',
 shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',quote:'<path d="M3 11h6v9H2v-8c0-5 2-8 6-9M16 11h6v9h-7v-8c0-5 2-8 6-9"/>',
 chart:'<path d="M4 21V12m8 9V4m8 17V8"/>',coffee:'<path d="M3 7h14v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7Zm14 0h2a3 3 0 0 1 0 6h-2M6 2v2m5-2v2"/>'
};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]??ICONS.mountain}</svg>`;}
export function art(name,cls='',extra=''){return `<img class="${cls}" src="${ASSETS[name]??ASSETS.peak}" alt="" draggable="false" decoding="async" ${extra}>`;}
export function button(text,action,cls='primary',extra='',ico='arrow'){return `<button class="btn ${cls}" data-action="${action}" ${extra}>${text}${ico?icon(ico):''}</button>`;}
export function tag(text,cls=''){return `<span class="tag ${cls}">${escapeHTML(text)}</span>`;}
export function avatar(size=''){return `<span class="traveler-avatar ${size}">${art('traveler-stand')}</span>`;}
export function sectionTitle(kicker,title,description=''){return `<div class="section-heading"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${description?`<p>${description}</p>`:''}</div>`;}
export function emptyState(title,description,action='home',cta='去看看远处的山'){return `<div class="empty-state">${art('peak')}${avatar()}<h2>${title}</h2><p>${description}</p>${button(cta,action)}</div>`;}
export function dialogHTML(title,body,footer=''){return `<div class="dialog-heading"><div class="eyebrow">看山不是山 · MOUNTAIN NOTES</div><button class="icon-button" data-action="close-dialog" aria-label="关闭">${icon('x')}</button></div><h2 id="dialog-title">${title}</h2>${body}${footer?`<div class="dialog-footer">${footer}</div>`:''}`;}
export function sourceLinks(plan,ids){return ids.map(id=>plan.sources?.find(s=>s.id===id)).filter(Boolean).map(s=>`<a class="source-link" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${icon('book')}<span><strong>${escapeHTML(s.title)}</strong><small>${escapeHTML(s.publisher)}</small></span>${icon('external')}</a>`).join('');}
