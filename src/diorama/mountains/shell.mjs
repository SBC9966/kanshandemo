// 山体网格、土层边缘、盘山小径与碎石（高度场见 field.mjs）。
// 三个不变量：路面按 heightAt 铺（与地形严丝合缝）；小径两侧留清道；碎岩受坡度与崖带控制。
import * as T from '../../vendor/three.module.js';
import { MOUNTAIN, heightAt, slopeAt, trailPolyline, lateral } from './field.mjs';

const sClamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// 岩面微纹理：程序化噪声，让坡面在近景不至于是一块纯色（宏观结构仍靠顶点色与几何）
function rockTexture(seed = 40917) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < size * size; i++) {
    const v = 168 + Math.floor(rnd() * 74);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v - 4; img.data[i * 4 + 2] = v - 12; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}
let _rockTex = null;
const rockMap = () => (_rockTex || (_rockTex = rockTexture()));

// 同一时刻只缓存一份山体几何（六座山配色不同）；几何是构建成本所在，材质很便宜
let _geoCache = { key: '', geo: null };

/** 山体网格：按坡向与高度着色（草坡/岩壁/碎石/陡坎露岩） */
export function terrainGeometry(paletteKey, colors) {
  if (_geoCache.key === paletteKey && _geoCache.geo) return { geo: _geoCache.geo, bounds: _geoCache.bounds };
  const geo = new T.PlaneGeometry(MOUNTAIN.size[0], MOUNTAIN.size[1], MOUNTAIN.segments[0], MOUNTAIN.segments[1]);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colorsArr = new Float32Array(pos.count * 3);
  const grass = new T.Color(colors.grass), rock = new T.Color(colors.rock), scree = new T.Color(colors.scree),
    moss = new T.Color(colors.moss), cliff = new T.Color(colors.cliff);
  const tmp = new T.Color();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    const slope = slopeAt(x, z);
    const alt = sClamp((y - MOUNTAIN.baseHeight) / (MOUNTAIN.summit - MOUNTAIN.baseHeight), 0, 1);
    const mott = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.3) * Math.cos(z * 0.6 - x * 0.2);
    tmp.copy(rock).lerp(grass, 1 - sClamp((slope - 0.5) / 0.55, 0, 1));
    tmp.lerp(moss, alt * 0.28 * mott);
    tmp.lerp(cliff, sClamp((slope - 1.35) / 0.7, 0, 1) * 0.8);
    tmp.lerp(scree, sClamp((slope - 1.9) / 0.9, 0, 1) * 0.5);
    const shade = 0.84 + 0.22 * (1 - sClamp(slope * 0.28, 0, 1));
    colorsArr[i * 3] = tmp.r * shade;
    colorsArr[i * 3 + 1] = tmp.g * shade;
    colorsArr[i * 3 + 2] = tmp.b * shade;
  }
  geo.setAttribute('color', new T.BufferAttribute(colorsArr, 3));
  // UV：世界坐标投影（岩面贴图 12 m 平铺一次；meso/micro 细节靠它）
  {
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 12; uv[i * 2 + 1] = pos.getZ(i) / 12; }
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setAttribute('uv1', new T.BufferAttribute(uv.slice(), 2));
  }
  geo.computeVertexNormals();
  const bounds = { min: minY, max: maxY };
  _geoCache = { key: paletteKey, geo, bounds };
  return { geo, bounds };
}

export function terrainMesh(paletteKey, colors) {
  const { geo, bounds } = terrainGeometry(paletteKey, colors);
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({
    vertexColors: true, map: rockMap(), roughness: 0.95, metalness: 0.03
  }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'mountain';
  return { mesh, bounds };
}

/** 山体边缘的土层剖面：表土 → 心土 → 母岩 → 深岩 */
export function soilEdge() {
  const R = MOUNTAIN.size[0] / 2;
  const seg = 96;
  const root = new T.Group();
  root.name = 'soil-edge';
  const layers = [
    { color: 0x6d5f4a, depth: 2.6 },
    { color: 0x5b5044, depth: 3.2 },
    { color: 0x4a453f, depth: 3.6 },
    { color: 0x39372f, depth: 4.2 }
  ];
  let top = 0;
  for (const layer of layers) {
    const verts = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const y = heightAt(x, z) - top;
      verts.push(x, y, z, x, y - layer.depth, z);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      idx.push(a, b, d, a, d, c);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: layer.color, roughness: 0.98, flatShading: true }));
    m.receiveShadow = true;
    root.add(m);
    top += layer.depth;
  }
  return root;
}

/** 轮廓破碎与碎石层：三档尺寸（大块/碎石/砂砾），受坡度与小径清道控制 */
export function rockScatter({ seed = 70123, color = 0x6f6a5e } = {}) {
  const group = new T.Group();
  group.name = 'rock-scatter';
  const rockMat = new T.MeshStandardMaterial({ color, map: rockMap(), roughness: 0.94, metalness: 0.03 });
  const buckets = [
    { geo: new T.DodecahedronGeometry(1, 0), list: [] },
    { geo: new T.DodecahedronGeometry(1, 0), list: [] },
    { geo: new T.TetrahedronGeometry(1, 0), list: [] }
  ];
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const dummy = new T.Object3D();
  const R = MOUNTAIN.size[0] / 2;
  const tries = 4200;
  for (let i = 0; i < tries; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd()) * R * 0.99;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const y = heightAt(x, z);
    const slope = slopeAt(x, z);
    const { dist } = lateral(x, z);
    if (dist < MOUNTAIN.trailWidth * 1.3) continue;   // 小径清道
    // 只沿断崖肩、谷缘、崖脚聚集（不再全场平均撒）
    let p = sClamp((slope - 0.7) / 1.3, 0, 1) * 0.85 + 0.05;
    if (slope > 1.2) p = Math.min(0.96, p * 1.5);
    if (y < 4.5) p *= 0.45;   // 山脚林地少石
    if (y > 24) p *= 0.6;     // 峰顶少石
    if (rnd() > p) continue;
    const tier = rnd();
    const scale = tier < 0.08 ? 0.8 + rnd() * 1.6
      : tier < 0.42 ? 0.24 + rnd() * 0.44
        : 0.08 + rnd() * 0.15;
    const idx = tier < 0.08 ? 0 : tier < 0.42 ? 1 : 2;
    dummy.position.set(x, y + scale * (0.22 + 0.3 * rnd()), z);
    dummy.rotation.set(rnd() * 3.14, rnd() * 3.14, rnd() * 3.14);
    dummy.scale.set(scale * (0.8 + rnd() * 0.5), scale * (0.6 + rnd() * 0.6), scale * (0.8 + rnd() * 0.5));
    dummy.updateMatrix();
    buckets[idx].list.push(dummy.matrix.clone());
  }
  for (const b of buckets) {
    if (!b.list.length) continue;
    const im = new T.InstancedMesh(b.geo, rockMat, b.list.length);
    b.list.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true; im.receiveShadow = true;
    group.add(im);
  }
  return group;
}

/** 盘山小径的路面：连续石板 + 外侧护栏（几何与高度同源，所以和地形严丝合缝） */
export function trailRibbon({ slabColor = 0xa89678, railColor = 0x8a7250 } = {}) {
  const group = new T.Group();
  group.name = 'spiral-trail';
  const poly = trailPolyline(640);
  const pts = poly.pts.map(([x, y, z]) => new T.Vector3(x, y + 0.12, z));
  const seg = pts.length - 1;
  const step = poly.total / seg;
  const count = seg;
  const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  const slabMat = new T.MeshStandardMaterial({ color: slabColor, roughness: 0.95 });
  const railMat = new T.MeshStandardMaterial({ color: railColor, roughness: 0.9 });
  const geo = new T.BoxGeometry(1, 1, 1);
  const dummy = new T.Object3D();
  const slabM = [], postM = [], railM = [];
  for (let i = 0; i < count; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, seg)];
    const tan = new T.Vector3(q.x - p.x, 0, q.z - p.z).normalize();
    const yaw = Math.atan2(tan.x, tan.z);
    dummy.position.copy(p);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(MOUNTAIN.trailWidth, 0.14, step * 1.14);
    dummy.updateMatrix();
    slabM.push(dummy.matrix.clone());
    if (i % 3 === 0) {
      const nx = -tan.z, nz = tan.x;
      const outward = (p.x * nx + p.z * nz) > 0 ? 1 : -1;
      const ox = p.x + nx * outward * (MOUNTAIN.trailWidth * 0.5 + 0.16);
      const oz = p.z + nz * outward * (MOUNTAIN.trailWidth * 0.5 + 0.16);
      dummy.position.set(ox, p.y + 0.52, oz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(0.11, 1.04, 0.11);
      dummy.updateMatrix();
      postM.push(dummy.matrix.clone());
      dummy.position.set(ox, p.y + 1.02, oz);
      dummy.scale.set(0.09, 0.1, step * 1.6);
      dummy.updateMatrix();
      railM.push(dummy.matrix.clone());
    }
  }
  const slabs = new T.InstancedMesh(geo, slabMat, slabM.length);
  slabM.forEach((m, i) => slabs.setMatrixAt(i, m));
  slabs.castShadow = true; slabs.receiveShadow = true;
  const posts = new T.InstancedMesh(geo, railMat, postM.length);
  postM.forEach((m, i) => posts.setMatrixAt(i, m));
  posts.castShadow = true;
  const rails = new T.InstancedMesh(geo, railMat, railM.length);
  railM.forEach((m, i) => rails.setMatrixAt(i, m));
  group.add(slabs, posts, rails);
  return { group, curve, length: poly.total };
}
