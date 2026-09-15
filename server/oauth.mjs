/**
 * 知乎 OAuth（授权码流程）——服务端实现。
 *
 * 分工：
 *   浏览器只拿到一个随机的会话标识（HttpOnly Cookie），App Key 与用户的 OAuth access_token
 *   全部留在服务端内存里；前端只能读到「昵称/头像/一句话介绍」这些公开字段。
 *
 * state：加密安全随机数生成 → 绑定当前会话 → 10 分钟过期 → 回调时先消费再判断（一次性）。
 *   缺失、不匹配、过期、重复使用都直接拒绝，不进入换 token 的步骤。
 *
 * 没配置 App ID / App Key 时所有接口返回 configured:false，前端隐藏入口，
 * 不假装登录成功、不回落成 Access Secret 所属账号。
 */

import crypto from 'node:crypto';

const AUTH_BASE = 'https://openapi.zhihu.com';
const STATE_TTL = 10 * 60 * 1000;          // state 有效期
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 会话有效期（服务端保存 token 的上限）

const pending = new Map();   // state -> { sid, at }
const sessions = new Map();  // sid -> { token, expiresAt, user }

const env = (k) => String(process.env[k] || '').trim();
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const oauthConfigured = () => Boolean(env('ZHIHU_OAUTH_APP_ID') && env('ZHIHU_OAUTH_APP_KEY'));
export const oauthRedirectUri = () => env('ZHIHU_OAUTH_REDIRECT_URI');
export const newSid = () => b64url(crypto.randomBytes(18));

/** 前端只可能看到这几个字段：不含 token、不含 uid 以外的隐私 */
export const publicUser = (sid) => {
  const s = sessions.get(String(sid || ''));
  if (!s) return { loggedIn: false };
  if (Date.now() > s.expiresAt) { sessions.delete(String(sid)); return { loggedIn: false, expired: true }; }
  return { loggedIn: true, user: s.user, expiresAt: new Date(s.expiresAt).toISOString() };
};

export function status(sid) {
  return {
    configured: oauthConfigured(),
    redirectUri: oauthRedirectUri() || null,   // 回调地址是公开配置，可以回显（App Key 不回显）
    ...publicUser(sid)
  };
}

function prune() {
  const now = Date.now();
  for (const [k, v] of pending) if (now - v.at > STATE_TTL) pending.delete(k);
  for (const [k, v] of sessions) if (now > v.expiresAt) sessions.delete(k);
}

/** 生成授权地址，并把 state 记在服务端绑定到当前会话 */
export function startAuth(sid) {
  if (!oauthConfigured()) {
    const err = new Error('知乎 OAuth 未配置（缺 App ID / App Key）。');
    err.code = 'NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  const redirect = oauthRedirectUri();
  if (!redirect) {
    const err = new Error('缺少回调地址（ZHIHU_OAUTH_REDIRECT_URI）。');
    err.code = 'NO_REDIRECT';
    err.status = 503;
    throw err;
  }
  prune();
  const state = b64url(crypto.randomBytes(24));
  pending.set(state, { sid: String(sid || ''), at: Date.now() });
  const url = new URL(AUTH_BASE + '/authorize');
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('app_id', env('ZHIHU_OAUTH_APP_ID'));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return { url: url.toString(), state };
}

/** 回调校验：先原子消费 state，再判断会话/时效。任何一项不通过都不继续换 token。 */
export function consumeState(state, sid) {
  const key = String(state || '');
  const hit = pending.get(key);
  if (!hit) return { ok: false, reason: 'missing' };
  pending.delete(key);                                   // 一次性：重复回调必然失败
  if (Date.now() - hit.at > STATE_TTL) return { ok: false, reason: 'expired' };
  if (hit.sid !== String(sid || '')) return { ok: false, reason: 'session' };
  return { ok: true };
}

/** 用 authorization_code 换 access_token（只在服务端发生） */
export async function exchangeCode(code, fetchImpl = fetch) {
  if (!oauthConfigured()) {
    const err = new Error('知乎 OAuth 未配置。');
    err.status = 503;
    throw err;
  }
  const body = new URLSearchParams({
    app_id: env('ZHIHU_OAUTH_APP_ID'),
    app_key: env('ZHIHU_OAUTH_APP_KEY'),
    grant_type: 'authorization_code',
    redirect_uri: oauthRedirectUri(),
    code: String(code || '')
  });
  const res = await fetchImpl(AUTH_BASE + '/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await res.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* 非 JSON：按失败处理 */ }
  const token = payload?.access_token;
  if (!res.ok || !token) {
    const err = new Error(payload?.error?.message || payload?.error_description || `换取 access_token 失败（HTTP ${res.status}）`);
    err.status = 502;
    throw err;
  }
  return { token: String(token), expiresIn: Number(payload.expires_in) || 3600 };
}

/** 读取授权用户的基础信息（只取公开字段） */
export async function fetchProfile(token, fetchImpl = fetch) {
  const res = await fetchImpl(AUTH_BASE + '/user', {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const text = await res.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* 同上 */ }
  if (!res.ok || !payload) {
    const err = new Error(payload?.error?.message || `读取用户信息失败（HTTP ${res.status}）`);
    err.status = 502;
    throw err;
  }
  return {
    uid: payload.uid ?? null,
    hashId: payload.hash_id ?? '',
    fullname: String(payload.fullname || '知乎用户').slice(0, 40),
    gender: payload.gender ?? '',
    headline: String(payload.headline || '').slice(0, 80),
    description: String(payload.description || '').slice(0, 200),
    avatar: String(payload.avatar_path || '')
    // email / phone_no 敏感字段一律不带出服务端
  };
}

export function createSession(sid, { token, expiresIn, user }) {
  const key = String(sid || '');
  // 会话不能活得比令牌更久：以 token 的 expires_in 为准，再封顶 7 天
  const seconds = Number(expiresIn) > 0 ? Number(expiresIn) : 3600;
  sessions.set(key, {
    token,
    expiresAt: Date.now() + Math.min(SESSION_TTL, seconds * 1000),
    user
  });
}

export function dropSession(sid) {
  return sessions.delete(String(sid || ''));
}

/** 仅供测试：清空内存态 */
export function _reset() {
  pending.clear();
  sessions.clear();
}
/** 仅供测试：直接塞一个会话，避免测试里真的走网络 */
export function _seedSession(sid, data) {
  sessions.set(String(sid), data);
}
