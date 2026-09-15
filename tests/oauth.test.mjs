// 知乎 OAuth 的 Mock 测试：不碰真实网络，验证 state 生命周期与协议细节。
// 重点（对应 OAuth 接入文档的要求）：
//   · state 用密码学安全随机数、一次性、绑定会话、10 分钟过期
//   · 缺失 / 不匹配 / 过期 / 重复使用 四种情况都必须被拒绝
//   · 回调既接受 authorization_code（当前实测主路径），也兼容 code
//   · 换成 token 与读取用户信息只发生在服务端，email/phone_no 之类敏感字段不外带
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ZHIHU_OAUTH_APP_ID = 'test-app-id';
process.env.ZHIHU_OAUTH_APP_KEY = 'test-app-key';
process.env.ZHIHU_OAUTH_REDIRECT_URI = 'https://example.com/api/zhihu/oauth/callback';

const oauth = await import('../server/oauth.mjs');

test('未配置凭证时不发起授权，并给出可读错误', () => {
  const keep = process.env.ZHIHU_OAUTH_APP_ID;
  delete process.env.ZHIHU_OAUTH_APP_ID;
  assert.equal(oauth.oauthConfigured(), false);
  assert.throws(() => oauth.startAuth('sid-1'), /未配置/);
  process.env.ZHIHU_OAUTH_APP_ID = keep;
  assert.equal(oauth.oauthConfigured(), true);
});

test('授权 URL：参数齐全且 state 是密码学随机（两次不同）', () => {
  oauth._reset();
  const a = oauth.startAuth('sid-1');
  const b = oauth.startAuth('sid-1');
  const ua = new URL(a.url);
  assert.equal(ua.origin + ua.pathname, 'https://openapi.zhihu.com/authorize');
  assert.equal(ua.searchParams.get('response_type'), 'code');
  assert.equal(ua.searchParams.get('app_id'), 'test-app-id');
  assert.equal(ua.searchParams.get('redirect_uri'), 'https://example.com/api/zhihu/oauth/callback');
  assert.equal(ua.searchParams.get('state'), a.state);
  assert.equal(a.state.length >= 32, true);
  assert.notEqual(a.state, b.state);
});

test('state：正确值可以通过，且只能消费一次', () => {
  oauth._reset();
  const { state } = oauth.startAuth('sid-a');
  assert.deepEqual(oauth.consumeState(state, 'sid-a'), { ok: true });
  assert.equal(oauth.consumeState(state, 'sid-a').ok, false, '重复回调必须失败');
  assert.equal(oauth.consumeState(state, 'sid-a').reason, 'missing');
});

test('state：缺失 / 不匹配 / 别的会话 都被拒绝', () => {
  oauth._reset();
  assert.equal(oauth.consumeState('', 'sid-a').reason, 'missing');
  assert.equal(oauth.consumeState('不存在', 'sid-a').reason, 'missing');
  const { state } = oauth.startAuth('sid-a');
  assert.equal(oauth.consumeState(state, 'sid-b').reason, 'session');
  // 会话不匹配时也被消费掉了，不能再用
  assert.equal(oauth.consumeState(state, 'sid-a').ok, false);
});

test('state：过期后拒绝（把时间推后 11 分钟）', async () => {
  oauth._reset();
  const { state } = oauth.startAuth('sid-a');
  const realNow = Date.now;
  Date.now = () => realNow() + 11 * 60 * 1000;
  try {
    assert.equal(oauth.consumeState(state, 'sid-a').reason, 'expired');
  } finally {
    Date.now = realNow;
  }
});

test('交换 token：表单参数与协议一致，解析 expires_in', async () => {
  oauth._reset();
  let seen = null;
  const fakeFetch = async (url, opts) => {
    seen = { url, opts, body: Object.fromEntries(new URLSearchParams(opts.body)) };
    return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'tok-123', token_type: 'Bearer', expires_in: 3600 }) };
  };
  const out = await oauth.exchangeCode('code-abc', fakeFetch);
  assert.equal(seen.url, 'https://openapi.zhihu.com/access_token');
  assert.equal(seen.opts.method, 'POST');
  assert.equal(seen.opts.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(seen.body, {
    app_id: 'test-app-id',
    app_key: 'test-app-key',
    grant_type: 'authorization_code',
    redirect_uri: 'https://example.com/api/zhihu/oauth/callback',
    code: 'code-abc'
  });
  assert.equal(out.token, 'tok-123');
  assert.equal(out.expiresIn, 3600);
});

test('交换 token：失败时抛出可读错误，不假装成功', async () => {
  oauth._reset();
  const bad = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'invalid code' } }) });
  await assert.rejects(() => oauth.exchangeCode('bad', bad), /invalid code/);
  const junk = async () => ({ ok: true, status: 200, text: async () => '<html>502</html>' });
  await assert.rejects(() => oauth.exchangeCode('x', junk), /HTTP 200/);
});

test('读取用户信息：只带出公开字段，email/phone_no 不外传', async () => {
  oauth._reset();
  let auth = null;
  const fakeFetch = async (url, opts) => {
    auth = opts.headers.Authorization;
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({
        uid: 969570047710216200, hash_id: 'abc', fullname: '山中客', gender: 'male',
        headline: '在知乎上问问题', description: '个人介绍', avatar_path: 'https://picx.zhimg.com/x.jpg',
        email: 'leak@example.com', phone_no: '13800000000'
      })
    };
  };
  const user = await oauth.fetchProfile('tok-123', fakeFetch);
  assert.equal(auth, 'Bearer tok-123');
  assert.equal(user.fullname, '山中客');
  assert.equal(user.avatar, 'https://picx.zhimg.com/x.jpg');
  assert.equal('email' in user, false);
  assert.equal('phone_no' in user, false);
});

test('会话：只回公开字段，过期即失效，退出后拿不到', () => {
  oauth._reset();
  oauth.createSession('sid-x', { token: 'tok', expiresIn: 3600, user: { uid: 1, fullname: '山中客' } });
  const st = oauth.status('sid-x');
  assert.equal(st.loggedIn, true);
  assert.equal(st.user.fullname, '山中客');
  assert.equal(JSON.stringify(st).includes('tok'), false, '会话状态里不允许出现令牌');
  assert.equal(oauth.status('sid-y').loggedIn, false);
  oauth.dropSession('sid-x');
  assert.equal(oauth.status('sid-x').loggedIn, false);

  oauth.createSession('sid-z', { token: 'tok', expiresIn: 1, user: { fullname: '短暂' } });
  const realNow = Date.now;
  Date.now = () => realNow() + 5000;
  try {
    assert.equal(oauth.status('sid-z').loggedIn, false, '过期会话必须失效');
  } finally {
    Date.now = realNow;
  }
});

test('status() 回显回调地址（公开配置），但绝不回显 App Key', () => {
  oauth._reset();
  const st = oauth.status('');
  assert.equal(st.configured, true);
  assert.equal(st.redirectUri, 'https://example.com/api/zhihu/oauth/callback');
  assert.equal(JSON.stringify(st).includes('test-app-key'), false);
});

test('会话标识是随机且足够长', () => {
  const a = oauth.newSid(), b = oauth.newSid();
  assert.notEqual(a, b);
  assert.equal(a.length >= 20, true);
  assert.match(a, /^[A-Za-z0-9_-]+$/, '必须是 URL 安全的 base64url');
});
