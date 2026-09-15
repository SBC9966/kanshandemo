// 一键校验：重建 + 解析产物内联脚本 + 跑核心测试。
// 用法：node scripts/check-build.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });

const html = fs.readFileSync('index.html', 'utf8');
const open = html.lastIndexOf('<script>');
const close = html.indexOf('</script>', open);
try {
  new vm.Script(html.slice(open + 8, close), { filename: 'inline.js' });
  console.log('PARSE OK — 内联脚本语法正常，产物', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
} catch (err) {
  console.error('PARSE FAIL —', err.message);
  const m = (err.stack || '').match(/inline\.js:(\d+)/);
  if (m) {
    const lines = html.slice(open + 8, close).split('\n');
    const ln = Number(m[1]);
    for (let i = Math.max(0, ln - 2); i < Math.min(lines.length, ln + 2); i++) console.error((i + 1) + ': ' + lines[i].slice(0, 200));
  }
  process.exit(1);
}

// 顶层重名检查（单闭包打包的致命伤）已内建在 build.mjs 里，这里再跑一遍测试
try {
  const out = execFileSync(process.execPath, ['--test', 'tests/mountain3d.test.mjs', 'tests/v2-domain.test.mjs', 'tests/v2-model.test.mjs', 'tests/oauth.test.mjs'], { encoding: 'utf8' });
  const pass = (out.match(/# pass (\d+)/) || [])[1];
  const fail = (out.match(/# fail (\d+)/) || [])[1];
  console.log(`TESTS pass=${pass} fail=${fail}`);
  if (Number(fail) > 0) process.exit(1);
} catch (err) {
  console.error('TESTS FAILED');
  console.error(String(err.stdout || err.message).split('\n').filter(l => /^not ok|# fail/.test(l)).join('\n'));
  process.exit(1);
}
