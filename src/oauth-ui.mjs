// 知乎 OAuth 登录（可选能力）：凭证只在服务端，前端只读昵称/头像这些公开字段。
// 没配置 App ID / App Key 时（例如 GitHub Pages 静态版）这里什么也不渲染，不会出现点不动的假按钮。
import { escapeHTML, icon } from './ui.mjs';

export const oauthUser = (ctx) => ctx?.ui?.oauth?.user || null;
export const oauthName = (ctx) => oauthUser(ctx)?.fullname || '';

export function zhAccountHTML(ctx) {
  const st = ctx?.ui?.oauth;
  if (!st || !st.configured) return '';
  const u = st.user;
  if (st.loggedIn && u) {
    const face = u.avatar
      ? `<img src="${escapeHTML(u.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<i class="zh-face">知</i>`;
    return `<button class="zh-account on" data-action="zh-account" title="已用知乎账号登录：${escapeHTML(u.fullname)}${u.headline ? ' · ' + escapeHTML(u.headline) : ''}（点开可退出）">${face}<span>${escapeHTML(u.fullname)}</span></button>`;
  }
  if (st.expired) {
    return `<button class="zh-account" data-action="zh-login" title="知乎授权已过期，重新登录即可">${icon('user')}<span>重新登录知乎</span></button>`;
  }
  return `<button class="zh-account" data-action="zh-login" title="用知乎账号登录（只读昵称与头像，不读你的创作与收藏）">${icon('user')}<span>用知乎登录</span></button>`;
}

/** 登录后的说明卡片：放在「我的理解图谱」里，讲清拿到了什么、没拿什么 */
export function zhAccountCardHTML(ctx) {
  const st = ctx?.ui?.oauth;
  if (!st || !st.configured) return '';
  const u = st.user;
  if (!(st.loggedIn && u)) {
    return `<section class="zh-account-card" id="zh-account-card">
      <div><span class="eyebrow">可选 · 知乎账号</span><h2>${icon('user')} 用知乎登录</h2>
      <p>登录后这一页会显示你的知乎昵称与头像；<b>你的学习进度、笔记与收藏仍然只保存在这台设备上</b>，不会上传。</p>
      <p class="tiny muted">授权只用读取你的公开资料（昵称、头像、一句话介绍），不读取创作、关注与收藏。随时可以退出。</p>
      <button class="btn secondary" data-action="zh-login">${icon('user')} 用知乎登录 ${icon('arrow')}</button></div>
    </section>`;
  }
  return `<section class="zh-account-card on" id="zh-account-card">
    <div>${u.avatar ? `<img class="zh-account-face" src="${escapeHTML(u.avatar)}" alt="" referrerpolicy="no-referrer">` : ''}
    <span class="eyebrow">已连接 · 知乎账号</span><h2>${escapeHTML(u.fullname)}</h2>
    ${u.headline ? `<p class="zh-account-headline">${escapeHTML(u.headline)}</p>` : ''}
    <p class="tiny muted">这份授权只读到了公开资料（昵称、头像、一句话介绍）；你的山途进度仍然只存在本地浏览器，退出登录也不会丢。</p>
    <div class="zh-account-actions">
      <button class="btn secondary" data-action="zh-account">查看授权范围</button>
      <button class="btn secondary" data-action="zh-logout">退出登录</button>
    </div></div>
  </section>`;
}

export function zhAccountDialogHTML(ctx) {
  const u = oauthUser(ctx);
  if (!u) return '<p>当前没有登录知乎账号。</p>';
  return `<p>已授权：<b>${escapeHTML(u.fullname)}</b>${u.uid ? `（uid ${escapeHTML(String(u.uid))}）` : ''}</p>
    <p class="tiny muted">读取范围：知乎账号的公开资料（昵称、头像、一句话介绍与个人介绍）。</p>
    <p class="tiny muted">没有读取：你的创作、关注、收藏、私信与手机号/邮箱；这些字段即使返回也会在服务端被丢弃。</p>
    <p class="tiny muted">服务端只保存一个 HttpOnly 会话 Cookie，App Key 与授权令牌都不会下发到浏览器。</p>`;
}
