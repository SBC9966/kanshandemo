// Vercel 无服务器函数：把 server/zhihu.mjs 的知乎代理挂到 /api/zhihu/* 上。
// 与本地 Node 服务的差别：serverless 的文件系统只读（除 /tmp），所以磁盘缓存写不进去，
// 但 zhihu.mjs 里的写盘是 try/catch 的（静默失败），并且前端本来就带离线快照兜底，
// 因此这里退化为"实例内内存缓存 + 前端快照"，不会报错也不会假装成功。
import * as zhihu from '../../server/zhihu.mjs';

const json = (res, status, value) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).send(JSON.stringify(value));
};

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // /api/zhihu/<...path>  →  parts
  const parts = url.pathname.replace(/^\/api\/zhihu\/?/, '').split('/').filter(Boolean);
  const route = parts[0] || '';
  const q = url.searchParams;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'vercel';
  try {
    if (req.method !== 'GET') return json(res, 405, { error: '只支持 GET。' });
    switch (route) {
      case 'status':
        return json(res, 200, zhihu.status());
      case 'search':
        return json(res, 200, await zhihu.searchZhihu(q.get('q') ?? '', q.get('count') ?? 8, { ip }));
      case 'global':
        return json(res, 200, await zhihu.globalSearch(q.get('q') ?? '', q.get('count') ?? 6, { db: q.get('db') ?? 'all', ip }));
      case 'questions':
        return json(res, 200, await zhihu.topicQuestions(q.get('topic') ?? '', q.get('count') ?? 5, { ip }));
      case 'answers':
        return json(res, 200, await zhihu.questionAnswers(q.get('question') ?? '', q.get('limit') ?? 8, { ip }));
      case 'hot': {
        const topic = (q.get('topic') ?? '').replace(/[^a-z-]/g, '');
        if (topic) return json(res, 200, await zhihu.hotFor(topic, { limit: Number(q.get('limit') ?? 4) || 4, ip }));
        return json(res, 200, await zhihu.hotList(q.get('limit') ?? 10, { ip }));
      }
      case 'answer':
        return json(res, 200, await zhihu.directAnswer(q.get('q') ?? '', { model: q.get('model') || 'zhida-fast-1p5', ip }));
      case 'works':
        return json(res, 200, await zhihu.hackathonWorks(q.get('kind') ?? 'knowledge', q.get('limit') ?? 8));
      case 'quota':
        return json(res, 200, await zhihu.quota({ ip }));
      case 'topic': {
        const id = (parts[1] ?? '').replace(/[^a-z-]/g, '');
        if (!id) return json(res, 400, { error: '缺少山 id。' });
        return json(res, 200, await zhihu.topicDigest(id, { ip }));
      }
      default:
        return json(res, 404, { error: '接口不存在。' });
    }
  } catch (err) {
    return json(res, err.status || 502, { error: err.message, code: err.code || null });
  }
}
