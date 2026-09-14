// 山体与五站的几何审计：移植自 diorama-lab 的 node-audit 思路，守住那几条不变量。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MOUNTAIN, NODES, SUMMIT, heightAt, slopeAt, trailPolyline, trailHeightAt, trailPoint,
  geomOfArc, naturalHeight, nodesWithLabels
} from '../src/diorama/mountains/field.mjs';

test('五站沿小径依次升高，且都落在小径剖面上', () => {
  assert.equal(NODES.length, 5);
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    assert.ok(Math.abs(n.y - trailHeightAt(n.t)) < 1e-9, `第 ${i + 1} 站高度必须等于小径剖面值`);
    if (i > 0) assert.ok(n.y > NODES[i - 1].y, `第 ${i + 1} 站应高于第 ${i} 站`);
  }
  assert.ok(NODES[4].y > 17 && NODES[4].y < 18, '第五站高度应落在既有调参范围内');
});

test('站台与地形的高差在阈值内（装置不会浮空或埋进山体）', () => {
  for (const n of NODES) {
    const gap = Math.abs(heightAt(n.x, n.z) - n.y);
    assert.ok(gap < 3.6, `第 ${n.id} 站与地形高差 ${gap.toFixed(3)} m 超阈值`);
  }
});

test('盘山小径：总长固定、按弧长采样、坡度受控', () => {
  const poly = trailPolyline(640);
  assert.equal(poly.pts.length, 641);
  assert.ok(Math.abs(poly.total - 258.10223285792966) < 1e-6, `小径总长 ${poly.total}`);
  const step = poly.total / 640;
  const runs = [];
  let maxRise = 0;
  for (let i = 1; i < poly.pts.length; i++) {
    const [x0, y0, z0] = poly.pts[i - 1], [x1, y1, z1] = poly.pts[i];
    maxRise = Math.max(maxRise, Math.abs(y1 - y0));
    runs.push(Math.hypot(x1 - x0, z1 - z0));
  }
  // 坡度：曲线空间限坡 0.35，逐段爬升不得超过它
  assert.ok(maxRise <= 0.35 * step + 1e-6, `单步爬升 ${maxRise.toFixed(4)} m 超过曲线限坡`);
  // 弧长采样：弦长不会超过一个步长（越界说明采样点错位），且整体贴近步长
  const maxRun = Math.max(...runs);
  assert.ok(maxRun <= step * 1.001, `相邻点间距 ${maxRun.toFixed(4)} 超过一个步长`);
  const sorted = [...runs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // 螺旋末端收束处曲率极大，弦长会明显短于弧长（源工程同样如此），所以看中位数而非最大值
  assert.ok(Math.abs(median - step) < step * 0.05, `中位间距 ${median.toFixed(4)} 偏离步长 ${step.toFixed(4)}`);
});

test('高度场与派生量是纯函数（可重复、无随机）', () => {
  const a = [heightAt(12.5, -8.25), slopeAt(12.5, -8.25), naturalHeight(3.5, 9.75), geomOfArc(0.37)];
  const b = [heightAt(12.5, -8.25), slopeAt(12.5, -8.25), naturalHeight(3.5, 9.75), geomOfArc(0.37)];
  assert.deepEqual(a, b);
  assert.ok(a.every(Number.isFinite));
  const p1 = trailPoint(0.61), p2 = trailPoint(0.61);
  assert.deepEqual(p1, p2);
});

test('峰顶与山体尺度符合规格', () => {
  assert.deepEqual(MOUNTAIN.size, [110, 110]);
  assert.ok(SUMMIT[1] > 50 && SUMMIT[1] < 56, `峰顶高度 ${SUMMIT[1].toFixed(2)}`);
  assert.ok(SUMMIT[1] > NODES[4].y, '峰顶必须高于最高一站');
});

test('换铭牌不动几何：nodesWithLabels 只改文案', () => {
  const labeled = nodesWithLabels([
    { stage: '山脚 · 认识', title: '存在主义，究竟在问什么？', short: '从「我是谁」出发' },
    { stage: '山麓 · 背景', title: '它为什么会出现？', short: '把思想放回时代' },
    { stage: '山腰 · 核心', title: '自由、处境与荒诞', short: '认识不同的思想路径' },
    { stage: '高处 · 分歧', title: '我们究竟有多自由？', short: '在分歧中形成判断' },
    { stage: '山顶 · 延伸', title: '把思考带回自己的生活', short: '不是答案，而是新的起点' }
  ]);
  assert.equal(labeled[0].short, '从「我是谁」出发');
  assert.equal(labeled[4].stage, '山顶 · 延伸');
  labeled.forEach((n, i) => {
    assert.equal(n.x, NODES[i].x, '换文案不应移动站点');
    assert.equal(n.y, NODES[i].y);
  });
});

test('沙盘模块不含 Math.random / Date.now（保证自动循环可重放）', () => {
  const dir = path.join(import.meta.dirname, '..', 'src', 'diorama', 'mountains');
  for (const file of ['field.mjs', 'shell.mjs', 'stations.mjs', 'peakScene.mjs']) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!/Math\.random\s*\(/.test(src), `${file} 不应使用 Math.random`);
    assert.ok(!/Date\.now\s*\(/.test(src), `${file} 不应使用 Date.now`);
  }
});
