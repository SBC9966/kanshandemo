// 微缩沙盘基础：3 个共享几何原语 + 材质缓存 + 按材质合批。
// 手法来自 living-construction-diorama v1-diorama-craft：零外部资产、配置即图纸、动画枢轴独立成组。
import * as T from '../vendor/three.module.js';

export const palette = {
  concrete: 0xc7c9bb, cream: 0xe9e5d3, teal: 0x478c87, yellow: 0xe8ae35, orange: 0xc97536,
  dark: 0x343d3b, steel: 0x718783, glass: 0x537b80, wood: 0xbaa077, ground: 0xc0b89d,
  asphalt: 0x57615c, green: 0x708a48, brass: 0xb08d4f, ink: 0x2c4a46, paper: 0xf1ece0,
  pine: 0x3f6046, signal: 0xd94b3a, mist: 0xa9bcb5, sand: 0xd8c9a3, water: 0x53808c
};

const cube = new T.BoxGeometry(1, 1, 1);
const cylinder = new T.CylinderGeometry(1, 1, 1, 12);
const ball = new T.SphereGeometry(1, 10, 7);
export const primitives = { cube, cylinder, ball };

const materials = new Map();
export function mat(color, roughness = 0.72, metalness = 0.05) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(key);
}

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new T.Mesh(geometry, material);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export const box = (p, w, h, d, x, y, z, c) => mesh(p, cube, typeof c === 'number' ? mat(c) : c, x, y, z, w, h, d);
export const cyl = (p, r, h, x, y, z, c) => mesh(p, cylinder, typeof c === 'number' ? mat(c) : c, x, y, z, r, h, r);
export const sphere = (p, r, x, y, z, c) => mesh(p, ball, mat(c), x, y, z, r, r, r);
export function group(parent, x = 0, y = 0, z = 0) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}
// 两点之间的圆棒（桁架、栏杆、管线、缆绳都用它）
export function beam(p, a, b, r, c) {
  const va = new T.Vector3(...a), vb = new T.Vector3(...b);
  const o = cyl(p, r, va.distanceTo(vb), 0, 0, 0, c);
  o.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return o;
}

// 合并同材质静态件。three 的 Box/Cylinder/Sphere 都是带索引几何，先展开成非索引再拼，
// 否则索引会被丢掉（顶点按顺序当三角形画 → 面片缺失）。
export function mergeGeometries(list) {
  const flat = list.map(g => (g.index ? g.toNonIndexed() : g));
  const total = flat.reduce((n, g) => n + g.attributes.position.count, 0);
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let vp = 0, up = 0;
  for (const g of flat) {
    const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
    position.set(p.array, vp);
    if (n) normal.set(n.array, vp);
    if (t) uv.set(t.array, up);
    vp += p.array.length;
    up += (t ? t.array.length : p.count * 2);
  }
  const merged = new T.BufferGeometry();
  merged.setAttribute('position', new T.BufferAttribute(position, 3));
  merged.setAttribute('normal', new T.BufferAttribute(normal, 3));
  merged.setAttribute('uv', new T.BufferAttribute(uv, 2));
  for (const g of flat) if (!list.includes(g)) g.dispose?.();
  for (const g of list) g.dispose?.();
  return merged;
}

// 把一个静态组按材质烘成少量 Mesh；几何按"相对该组的局部坐标"落位（组自身的位移不会被重复计算）。
// 实例网格（instances()）会逐实例展开；动画枢轴要留在被烘组之外。
export function bake(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const list = buckets.get(o.material) || [];
    if (o.isInstancedMesh) {
      const m4 = new T.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        list.push(o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld).multiply(m4)));
      }
    } else {
      list.push(o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));
    }
    buckets.set(o.material, list);
  });
  root.clear();
  for (const [material, list] of buckets) {
    const geometry = mergeGeometries(list);
    const o = new T.Mesh(geometry, material);
    o.castShadow = true;
    o.receiveShadow = true;
    root.add(o);
  }
  return root;
}

// 重复件（窗格、划线、灯位）用实例合批，静态烘培时会被逐实例展开。
export function instances(parent, placements, size, color) {
  const im = new T.InstancedMesh(cube, typeof color === 'number' ? mat(color) : color, placements.length);
  const dummy = new T.Object3D();
  placements.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0);
    dummy.scale.set(size[0], size[1], size[2]);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

// Canvas 文字牌（机位牌、站名、碑铭）。中文用衬线体，和纸面气质一致。
export function label(p, text, w, h, x, y, z, bg = '#275650', fg = '#f4e8c7') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const c = canvas.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 512, 160);
  c.strokeStyle = fg; c.lineWidth = 3; c.strokeRect(12, 12, 488, 136);
  c.fillStyle = fg; c.font = 'bold 54px "Songti SC",SimSun,serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 256, 84);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const o = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  o.position.set(x, y, z);
  p.add(o);
  return o;
}

export const PI = Math.PI, TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// 阶段窗口：(t - in) / (out - in)，窗口外返回 0/1
export const window01 = (t, enter, leave) => clamp((t - enter) / Math.max(leave - enter, 1e-6), 0, 1);
