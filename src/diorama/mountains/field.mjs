// 知识山山体高度场（移植自 diorama-lab 的 mountainCore.ts，保持全部调参与不变量）。
// 骨架：一座瘦高主峰 + 五座副峰 + 峰间鞍部相连 + 四条支脊外扩；深谷穿插制造纵深。
// 台地规则：不做"圆盘整平"造平台，只在坡面凿出小半径、强羽化的壁龛，整平强度只到 0.62，
// 所以不会出现圆柱 / 树桩 / 平顶台柱。本文件不依赖 three，也不碰 DOM，可直接在 node 里测。
export const MOUNTAIN = {
  size: [110, 110],
  segments: [204, 204],
  baseHeight: 2.2,
  summit: 46.0,
  turns: 2.2,
  startAngle: -Math.PI * 0.62,
  trailWidth: 2.3
};

const fClamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fLerp = (a, b, t) => a + (b - a) * t;
const fSmoothstep = (t) => { const x = fClamp(t, 0, 1); return x * x * (3 - 2 * x); };
const gauss2 = (x, z, cx, cz, sx, sz) => {
  const dx = (x - cx) / sx, dz = (z - cz) / sz;
  return Math.exp(-(dx * dx + dz * dz));
};
const nz = (i, salt) => {
  const h = Math.sin((i * 12.9898 + salt * 78.233) * 43758.5453) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
};
const hash = (i, j, seed) => {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fbm = (x, z, seed, oct = 4) => {
  let s = 0, amp = 0.5, norm = 0, f = 1;
  for (let o = 0; o < oct; o++) {
    const i = Math.floor(x * f), j = Math.floor(z * f);
    const fx = x * f - i, fz = z * f - j;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash(i, j, seed + o * 131), b = hash(i + 1, j, seed + o * 131);
    const c = hash(i, j + 1, seed + o * 131), d = hash(i + 1, j + 1, seed + o * 131);
    s += amp * (fLerp(fLerp(a, b, u), fLerp(c, d, u), v) * 2 - 1);
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return s / norm;
};
const ridged = (x, z, seed, oct = 4) => 1 - Math.abs(fbm(x, z, seed, oct));

// ── 群峰骨架（相互咬合，不是并列的柱子）──────────────────────────────────
export const MAIN_PEAK = { x: 1.5, z: -3.0, h: 46.0, sx: 10.5, sz: 9.5 };
export const SUB_PEAKS = [
  { x: -20.5, z: -16.0, h: 30.0, sx: 9.5, sz: 9.0 },   // 北肩（高处）
  { x: 21.0, z: 15.0, h: 27.0, sx: 9.0, sz: 8.5 },     // 东肩
  { x: 23.5, z: -18.0, h: 24.0, sx: 8.5, sz: 8.0 },    // 东北
  { x: -24.0, z: 14.0, h: 21.0, sx: 8.5, sz: 8.0 },    // 西南
  { x: -3.5, z: 26.5, h: 19.0, sx: 9.5, sz: 8.0 }      // 南
];
const SPURS = [
  { x: -30, z: -2, h: 12.0, sx: 7.0, sz: 12.0 },
  { x: 32, z: 4, h: 11.0, sx: 7.5, sz: 11.0 },
  { x: 5, z: -30, h: 10.0, sx: 10.0, sz: 7.5 },
  { x: -8, z: 34, h: 9.0, sx: 11.0, sz: 7.0 }
];
export const VALLEYS = [
  { x: -12, z: 21, r: 14.5, depth: 9.5 },
  { x: 27, z: -22, r: 13.0, depth: 7.5 },
  { x: -33, z: 6, r: 12.0, depth: 6.0 },
  { x: 10, z: 30, r: 11.0, depth: 5.0 }
];
const CLIFF_BANDS = [
  { y: 18.5, drop: 6.0, sharp: 4.6 },
  { y: 9.5, drop: 5.2, sharp: 3.8 }
];

const R_OUT = MOUNTAIN.size[0] / 2 * 1.02;
const rAtG = (g) => {
  const t = fClamp(Math.abs(g), 0, 1);
  // 半径：平滑四次方收束（末段很快到 0），保证顶部 15m 内没有路径
  const base = R_OUT * Math.pow(1 - t, 1.6) * Math.pow(1 - t * t, 1.2);
  return base * (1 + 0.06 * nz(Math.round(g * 26), 3));
};
const angAtG = (g) => {
  const t = fClamp(g, 0, 1);
  // 末段角向平滑减速到 0，避免在峰脚绕完整圈把峰体绕平
  const spin = MOUNTAIN.turns * Math.PI * 2 * (t - 0.35 * t * t);
  return MOUNTAIN.startAngle + spin + 0.08 * nz(Math.round(g * 26), 5);
};

// 弧长比例 ↔ 几何参数（曲线按弧长取点，必须口径一致）
let _geomOfArc = null, _arcOfGeom = null;
function buildArcTables() {
  if (_geomOfArc && _arcOfGeom) return;
  const N = 600;
  const cum = new Float32Array(N + 1);
  let len = 0, px = 0, pz = 0;
  for (let i = 0; i <= N; i++) {
    const g = i / N;
    const rr = rAtG(g), aa = angAtG(g);
    const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
    if (i > 0) len += Math.hypot(x - px, z - pz);
    cum[i] = len; px = x; pz = z;
  }
  const total = len || 1;
  const arcOfGeom = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) arcOfGeom[i] = cum[i] / total;
  const geomOfArc = new Float32Array(N + 1);
  let j = 0;
  for (let i = 0; i <= N; i++) {
    const target = i / N;
    while (j < N && arcOfGeom[j + 1] < target) j++;
    const span = (arcOfGeom[Math.min(j + 1, N)] - arcOfGeom[j]) || 1;
    geomOfArc[i] = (j + (target - arcOfGeom[j]) / span) / N;
  }
  _geomOfArc = geomOfArc; _arcOfGeom = arcOfGeom;
}
export function geomOfArc(arc) {
  buildArcTables();
  const u = fClamp(arc, 0, 1) * 600;
  const i = Math.min(599, Math.floor(u));
  return fLerp(_geomOfArc[i], _geomOfArc[i + 1], u - i);
}

// 小径高度表：沿螺旋内→外采样天然山面，再限坡平滑（路面贴着山势，坡度可控）
let _trailY = null;
function buildTrailY() {
  if (_trailY) return;
  const N = 720;
  const xz = [];
  const nat = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const g = i / N;
    const rr = rAtG(g), aa = angAtG(g);
    const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
    xz.push([x, z]);
    nat[i] = naturalHeight(x, z);
  }
  // ① 高斯平滑（σ≈8 采样点）——去掉局部起伏，保留整体走势
  const K = 8, sig = 6.5;
  const wts = [];
  let wsum = 0;
  for (let k = -K; k <= K; k++) { const w = Math.exp(-(k * k) / (2 * sig * sig)); wts.push(w); wsum += w; }
  const sm = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    let acc = 0;
    for (let k = -K; k <= K; k++) acc += nat[fClamp(i + k, 0, N)] * wts[k + K];
    sm[i] = acc / wsum;
  }
  // ② 双向可行约束：任何一处都必须 ≤ min(前向可达, 后向可达)
  const stepAt = (i) => Math.max(0.05, Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]));
  const MAXG = 0.32;
  const yF = new Float32Array(N + 1);
  yF[0] = sm[0];
  for (let i = 1; i <= N; i++) yF[i] = Math.min(sm[i], yF[i - 1] + stepAt(i) * MAXG);
  const yB = new Float32Array(N + 1);
  yB[N] = Math.max(sm[N], naturalHeight(MAIN_PEAK.x, MAIN_PEAK.z) - 6);
  for (let i = N - 1; i >= 0; i--) yB[i] = Math.min(sm[i], yB[i + 1] + stepAt(i + 1) * MAXG);
  for (let i = 0; i <= N; i++) sm[i] = Math.min(yF[i], yB[i]);
  _trailY = sm;
}

let _poly = null;
/** 路面折线：等弧长采样 + 曲线空间限坡 + 末端贴向峰脚，几何与高度同源 */
export function trailPolyline(seg = 640) {
  if (_poly) return _poly;
  buildTrailY();
  const raw = [];
  let acc = 0;
  let px = 0, pz = 0;
  const N = 1200;
  const cumS = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const g = i / N;
    const rr = rAtG(g), aa = angAtG(g);
    const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
    if (i > 0) acc += Math.hypot(x - px, z - pz);
    cumS[i] = acc; px = x; pz = z;
    raw.push([x, z]);
  }
  const total = acc || 1;
  const xs = [], zs = [], ys = [];
  let cursor = 0;
  for (let i = 0; i <= seg; i++) {
    const target = (i / seg) * total;
    while (cursor < N - 1 && cumS[cursor + 1] < target) cursor++;
    const s0 = cumS[cursor], s1 = cumS[cursor + 1] ?? s0;
    const k = s1 > s0 ? (target - s0) / (s1 - s0) : 0;
    const x = fLerp(raw[cursor][0], raw[Math.min(cursor + 1, N)][0], k);
    const z = fLerp(raw[cursor][1], raw[Math.min(cursor + 1, N)][1], k);
    xs.push(x); zs.push(z);
    // 高度取"该点所在弧长比例"的剖面值（同一张表，口径一致）
    ys.push(trailHeightAt(target / total));
  }
  // 曲线空间限坡：以真实步长换算允许高差
  const allow = (total / seg) * 0.35;
  for (let k = 0; k < 24; k++) {
    for (let i = 1; i <= seg; i++) ys[i] = Math.min(Math.max(ys[i], ys[i - 1] - allow), ys[i - 1] + allow);
    for (let i = seg - 1; i >= 0; i--) ys[i] = Math.min(Math.max(ys[i], ys[i + 1] - allow), ys[i + 1] + allow);
  }
  _poly = { pts: xs.map((x, i) => [x, ys[i], zs[i]]), total };
  return _poly;
}

export function trailHeightAt(t) {
  buildTrailY();
  // 480 步长采样 720 点表是刻意保留的：五站高度与审计阈值都依赖这个口径，不要"修"成 720
  const u = fClamp(t, 0, 1) * 480;
  const i = Math.min(479, Math.floor(u));
  return fLerp(_trailY[i], _trailY[i + 1], u - i);
}

export function trailPoint(t) {
  const g = geomOfArc(fClamp(t, 0, 1));
  const rr = rAtG(g), aa = angAtG(g);
  return { x: Math.cos(aa) * rr, z: Math.sin(aa) * rr, y: trailHeightAt(t), angle: aa, radius: rr };
}

// 五个节点：小半径壁龛（只够放建筑与落脚），沿小径分布；高度直接取小径剖面 → 必然一致
const NODE_SEED = [
  { id: 1, t: 0.20, title: '竹海入口', subtitle: '偏差不是愚蠢，而是捷径' },
  { id: 2, t: 0.42, title: '垭口观景台', subtitle: '你只看见返航的飞机' },
  { id: 3, t: 0.62, title: '半崖小屋', subtitle: '确认偏误：只收集让你安心的材料' },
  { id: 4, t: 0.80, title: '崖顶亭台', subtitle: '事实、观点与可核查性' },
  { id: 5, t: 0.90, title: '主峰校准台', subtitle: '校准：知道自己知道多少' }
];

export const NODES = NODE_SEED.map(n => {
  const p = trailPoint(n.t);
  const inner = 1.0;
  return {
    ...n,
    x: p.x + Math.cos(p.angle) * inner,
    z: p.z + Math.sin(p.angle) * inner,
    y: trailHeightAt(n.t),
    angle: p.angle,
    radius: 3.1
  };
});

/** 把五站文案换成本项目该座山的营地内容（几何不动，只换铭牌用的字） */
export function nodesWithLabels(labels) {
  return NODES.map((n, i) => ({ ...n, ...(labels[i] || {}) }));
}

export const RIDGE_TOPS = NODES.map(n => [n.x, n.y, n.z]);

// 支路中心线（供地表染色用）
function branchLine(kind) {
  const a = [NODES[0].x, NODES[0].z];
  if (kind === 'stone') {
    const b = [NODES[2].x, NODES[2].z];
    const c = [NODES[3].x, NODES[3].z];
    const list = [[a[0] + 6, a[1] + 5]];
    for (let i = 1; i <= 10; i++) list.push([fLerp(a[0], b[0], i / 10) + Math.sin(i) * 1.6, fLerp(a[1], b[1], i / 10) + Math.cos(i * 0.8) * 1.6]);
    for (let i = 1; i <= 8; i++) list.push([fLerp(b[0], c[0], i / 8) + Math.sin(i * 1.3) * 1.4, fLerp(b[1], c[1], i / 8) + Math.cos(i) * 1.4]);
    return list;
  }
  const b2 = [NODES[1].x, NODES[1].z];
  const v = VALLEYS[0];
  const list = [];
  for (let i = 0; i <= 14; i++) list.push([fLerp(a[0], b2[0], i / 14) + Math.sin(i * 0.9) * 3.2, fLerp(a[1], b2[1], i / 14) + Math.cos(i * 0.7) * 3.0]);
  for (let i = 1; i <= 12; i++) list.push([fLerp(b2[0], v.x, i / 12) + Math.sin(i * 1.1) * 2.6, fLerp(b2[1], v.z, i / 12) + Math.cos(i * 0.9) * 2.6]);
  return list;
}
export const BRANCH_LINES = { stone: branchLine('stone'), earth: branchLine('earth') };

/** 到支路的最近水平距离（地表染色与清障用） */
export function branchDistance(x, z) {
  const res = { stone: Infinity, earth: Infinity };
  for (const kind of ['stone', 'earth']) {
    for (const [lx, lz] of BRANCH_LINES[kind]) {
      const d = Math.hypot(x - lx, z - lz);
      if (d < res[kind]) res[kind] = d;
    }
  }
  return res;
}

/** 真实峰顶：在峰体范围内扫描最高点（灯塔与对齐台的落点） */
export const SUMMIT = (() => {
  let best = [MAIN_PEAK.x, macroHeight(MAIN_PEAK.x, MAIN_PEAK.z), MAIN_PEAK.z];
  for (let x = MAIN_PEAK.x - 14; x <= MAIN_PEAK.x + 14; x += 0.6) {
    for (let z = MAIN_PEAK.z - 14; z <= MAIN_PEAK.z + 14; z += 0.6) {
      const h = macroHeight(x, z);
      if (h > best[1]) best = [x, h, z];
    }
  }
  return best;
})();
export const PEAKS = [MAIN_PEAK, ...SUB_PEAKS];

export function lateral(x, z) {
  const r = Math.max(Math.hypot(x, z), 0.7);
  const a = Math.atan2(z, x);
  const t = 1 - Math.min(r / R_OUT, 1);
  const gGuess = Math.round(((a - MOUNTAIN.startAngle) / (Math.PI * 2) / MOUNTAIN.turns + t) * 26) / 26;
  let best = Infinity, bestG = gGuess;
  for (let d = -2; d <= 2; d++) {
    const g = gGuess + d / 26;
    const rr = rAtG(g), aa = angAtG(g);
    const dd = Math.hypot(x - Math.cos(aa) * rr, z - Math.sin(aa) * rr);
    if (dd < best) { best = dd; bestG = g; }
  }
  return { dist: best, g: bestG };
}

export function naturalHeight(x, z) {
  const r = Math.hypot(x, z);
  const R = MOUNTAIN.size[0] / 2;
  const foot = 1 - fSmoothstep((r / (R * 1.02) - 0.68) / 0.32);
  let h = MOUNTAIN.baseHeight;
  h += (MAIN_PEAK.h - MOUNTAIN.baseHeight) * gauss2(x, z, MAIN_PEAK.x, MAIN_PEAK.z, MAIN_PEAK.sx, MAIN_PEAK.sz);
  {
    const rr = Math.hypot(x - MAIN_PEAK.x, z - MAIN_PEAK.z);
    const cone = Math.max(0, 1 - rr / (MAIN_PEAK.sx * 1.5));
    h += (MAIN_PEAK.h - MOUNTAIN.baseHeight) * 0.11 * Math.pow(cone, 1.5);
  }
  h += (MAIN_PEAK.h - MOUNTAIN.baseHeight) * 0.14 * Math.pow(ridged(x * 0.075 + 4.2, z * 0.075 - 2.6, 71, 4), 1.7)
    * gauss2(x, z, MAIN_PEAK.x, MAIN_PEAK.z, MAIN_PEAK.sx * 1.4, MAIN_PEAK.sz * 1.4);
  for (const p of SUB_PEAKS) h += p.h * 0.88 * gauss2(x, z, p.x, p.z, p.sx, p.sz);
  for (const s2 of SPURS) h += s2.h * 0.55 * gauss2(x, z, s2.x, s2.z, s2.sx, s2.sz);
  for (const p of SUB_PEAKS) {
    const mx = (MAIN_PEAK.x + p.x) / 2, mz = (MAIN_PEAK.z + p.z) / 2;
    const d = Math.hypot(p.x - MAIN_PEAK.x, p.z - MAIN_PEAK.z);
    h += Math.min(p.h, 12.0) * 0.42 * gauss2(x, z, mx, mz, d * 0.5, d * 0.42);
  }
  h += (MAIN_PEAK.h - MOUNTAIN.baseHeight) * 0.11 * fbm(x * 0.05, z * 0.05, 211, 4);
  h -= (MAIN_PEAK.h - MOUNTAIN.baseHeight) * 0.06 * Math.pow(ridged(x * 0.085 - 3.1, z * 0.085 + 5.7, 307, 3), 1.4);
  for (const v of VALLEYS) h -= v.depth * gauss2(x, z, v.x, v.z, v.r, v.r);
  for (const c of CLIFF_BANDS) {
    const d = (h - c.y) / c.sharp;
    h -= c.drop * (1 / (1 + Math.exp(-d)) - 0.5);
  }
  return h * foot;
}

/** 自然群山高度场：自然山面 + 小径路肩 + 节点壁龛（都在坡面上就地削出） */
function macroHeight(x, z) {
  let h = naturalHeight(x, z);
  // 小径路肩：只在路廊内削平
  {
    const { dist } = lateral(x, z);
    const w = MOUNTAIN.trailWidth;
    const shoulder = dist <= w ? 1 : 1 - fSmoothstep((dist - w) / (w * 1.2));
    if (shoulder > 0) {
      const arcT = fClamp(1 - Math.max(Math.hypot(x, z), 0.7) / R_OUT, 0, 1);
      h = fLerp(h, trailHeightAt(arcT), shoulder * 0.92);
    }
  }
  // 节点壁龛：小半径 + 强羽化 + 强度 0.62
  for (const n of NODES) {
    const d = Math.hypot(x - n.x, z - n.z);
    const r0 = n.radius, feather = r0 * 1.5;
    const w = d <= r0 ? 1 : 1 - fSmoothstep((d - r0) / feather);
    const nat = naturalHeight(n.x, n.z);
    const cut = Math.abs(nat - n.y);
    // 落差越大越保守：小落差做平台，大落差只做"壁龛"（防台柱），目标也往自然面回拉
    const k = cut > 4 ? 0.72 : cut > 2 ? 0.85 : 0.98;
    h = fLerp(h, n.y, w * k);
  }
  return h;
}

export const heightAt = (x, z) => macroHeight(x, z);
export const slopeAt = (x, z) => {
  const e = 0.9;
  return Math.hypot((heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e));
};
