// 盘山小径沿途的五个站点景物（每站一组道具 + 自己的动态元素）。
// 站点安放在小径的台阶地上：沿径走上来，站点就在路内侧。
// 与源工程的差别：铭牌文案由本项目的营地内容传入（title/short/stage），不再写死认知偏差那套。
import * as T from '../../vendor/three.module.js';
import { box, cyl, sphere, beam, group, bake, instances, label, mat, TAU } from '../core.mjs';
import { heightAt, slopeAt, NODES, MOUNTAIN } from './field.mjs';

// ── 植被散布（按海拔与坡度分带成林，不是均匀撒点）────────────────────────
const rndGen = (seed) => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};

/** 沿途植被布局：山脚竹林最密，山腰竹松交错，崖边点景，高处苔原灌木 */
export function vegetationLayout(seed = 90210) {
  const avoid = NODES.map(n => ({ x: n.x, z: n.z, r: n.radius + 2.4 }));
  const R = 52;
  const rnd = rndGen(seed);
  const tryPlace = (count, opts) => {
    const out = [];
    for (let i = 0; i < count * 10 && out.length < count; i++) {
      const cx = (rnd() - 0.5) * R * 2 * 0.95, cz = (rnd() - 0.5) * R * 2 * 0.95;
      const cy = heightAt(cx, cz);
      if (cy < opts.minY || cy > opts.maxY) continue;
      if (slopeAt(cx, cz) > opts.maxSlope) continue;
      if (avoid.some(a => Math.hypot(cx - a.x, cz - a.z) < a.r)) continue;
      for (let k = 0; k < opts.cluster && out.length < count; k++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * opts.clumpR;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        const y = heightAt(x, z);
        if (y < opts.minY || y > opts.maxY) continue;
        if (slopeAt(x, z) > opts.maxSlope) continue;
        if (avoid.some(av => Math.hypot(x - av.x, z - av.z) < av.r)) continue;
        out.push([x, y, z]);
      }
    }
    return out;
  };
  const bambooFoot = tryPlace(190, { minY: 1.6, maxY: 9.0, maxSlope: 1.35, clumpR: 4.6, cluster: 5 });
  const bambooMid = tryPlace(85, { minY: 9.0, maxY: 19.0, maxSlope: 1.5, clumpR: 4.0, cluster: 3 });
  const pines = tryPlace(64, { minY: 10.0, maxY: 27.0, maxSlope: 1.9, clumpR: 5.4, cluster: 3 });
  const accent = tryPlace(22, { minY: 8.0, maxY: 30.0, maxSlope: 3.2, clumpR: 1.2, cluster: 1 });
  const shrubs = tryPlace(70, { minY: 24.0, maxY: 34.0, maxSlope: 2.4, clumpR: 3.0, cluster: 2 });
  const rocks = tryPlace(120, { minY: 4.0, maxY: 26.0, maxSlope: 9, clumpR: 2.6, cluster: 3 });
  return { bamboo: [...bambooFoot, ...bambooMid], pines, rocks, accent, shrubs };
}

// 植被原型：竹 / 山松 / 灌木 / 岩块（程序化，几何带弯曲，不是方块堆叠）
function bambooAsset(seed) {
  const r = rndGen(seed);
  const g = new T.Group();
  const h = 3.2 + r() * 3.6;
  const r0 = 0.055 + r() * 0.05;
  const bend = (r() - 0.5) * 0.16;
  const nodes = 4 + Math.floor(r() * 2);
  const stemMat = mat(r() > 0.5 ? 0x4f6b46 : 0x577446, 0.88);
  const leafMat = mat(r() > 0.4 ? 0x5f8a4e : 0x6b9455, 0.9);
  const nodeMat = mat(0x3f5c3c, 0.9);
  let y = 0;
  for (let i = 0; i < nodes; i++) {
    const seg = h / nodes * (0.85 + r() * 0.3);
    const rad = r0 * (1 - i / nodes * 0.55);
    const seg0 = new T.Mesh(new T.CylinderGeometry(rad * 0.92, rad, seg, 5), stemMat);
    seg0.position.set(Math.sin(i * 1.7) * bend * i * 0.5, y + seg / 2, Math.cos(i * 1.3) * bend * i * 0.35);
    seg0.rotation.z = bend * i * 0.16;
    seg0.castShadow = true;
    g.add(seg0);
    const ring = new T.Mesh(new T.CylinderGeometry(rad * 1.25, rad * 1.25, 0.045, 5), nodeMat);
    ring.position.set(seg0.position.x, y + seg, seg0.position.z);
    g.add(ring);
    y += seg;
  }
  const top = new T.Group();
  top.position.set(Math.sin(4 * 1.7) * bend * 2, y, Math.cos(4 * 1.3) * bend * 1.5);
  for (let k = 0; k < 7; k++) {
    const leaf = new T.Mesh(new T.ConeGeometry(0.11 + r() * 0.07, 0.9 + r() * 0.8, 3), leafMat);
    const a = r() * TAU, tilt = 0.5 + r() * 0.85;
    leaf.position.set(Math.cos(a) * 0.3, 0.35 + r() * 0.3, Math.sin(a) * 0.3);
    leaf.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    leaf.castShadow = true;
    top.add(leaf);
  }
  g.add(top);
  return g;
}
function pineAsset(seed) {
  const r = rndGen(seed);
  const g = new T.Group();
  const h = 3.6 + r() * 3.4;
  const trunkMat = mat(0x5b4636, 0.92);
  const needleMat = mat(r() > 0.5 ? 0x3f6046 : 0x476a4a, 0.9);
  const lean = (r() - 0.5) * 0.28;
  let px = 0, py = 0, pz = 0;
  const segs = 3;
  for (let i = 0; i < segs; i++) {
    const seg = h / segs;
    const rad = 0.22 * (1 - i / segs * 0.5) + 0.05;
    const seg0 = new T.Mesh(new T.CylinderGeometry(rad * 0.8, rad, seg, 6), trunkMat);
    const dx = Math.sin(lean * (i + 1)) * seg * 0.35;
    seg0.position.set(px + dx / 2, py + seg / 2, pz + dx * 0.4);
    seg0.rotation.z = -lean * (i + 1) * 0.4;
    seg0.castShadow = true;
    g.add(seg0);
    px += dx; py += seg; pz += dx * 0.4;
  }
  const layers = 4 + Math.floor(r() * 3);
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const ly = h * (0.42 + t * 0.66);
    const half = 0.9 + (1 - t) * 1.15;
    const pans = 1 + (r() > 0.55 ? 1 : 0);
    for (let k = 0; k < pans; k++) {
      const pan = new T.Mesh(new T.SphereGeometry(half * (0.85 + r() * 0.3), 8, 4), needleMat);
      pan.scale.set(1, 0.32 + r() * 0.14, 1);
      const a = r() * TAU;
      pan.position.set(Math.cos(a) * half * 0.42, ly + r() * 0.3, Math.sin(a) * half * 0.42);
      pan.castShadow = true;
      g.add(pan);
    }
  }
  const crown = new T.Mesh(new T.ConeGeometry(0.42, 1.1, 7), needleMat);
  crown.position.set(px, h + 0.4, pz);
  crown.castShadow = true;
  g.add(crown);
  return g;
}
function shrubAsset(seed) {
  const r = rndGen(seed);
  const g = new T.Group();
  const leafMat = mat(0x59704a, 0.95);
  const darkMat = mat(0x47593c, 0.95);
  const balls = 3 + Math.floor(r() * 3);
  for (let i = 0; i < balls; i++) {
    const s = 0.32 + r() * 0.42;
    const b = new T.Mesh(new T.IcosahedronGeometry(s, 0), i % 2 ? leafMat : darkMat);
    b.position.set((r() - 0.5) * 0.7, s * 0.7, (r() - 0.5) * 0.7);
    b.scale.y = 0.75 + r() * 0.4;
    b.castShadow = true;
    g.add(b);
  }
  for (let i = 0; i < 3; i++) {
    const blade = new T.Mesh(new T.ConeGeometry(0.26, 0.7 + r() * 0.5, 3), leafMat);
    const a = r() * TAU;
    blade.position.set(Math.cos(a) * 0.35, 0.35, Math.sin(a) * 0.35);
    blade.rotation.set((r() - 0.5) * 0.5, a, (r() - 0.5) * 0.5);
    g.add(blade);
  }
  return g;
}
function rockAsset(seed, size) {
  const r = rndGen(seed);
  const geo = new T.IcosahedronGeometry(size, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.72 + r() * 0.58;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * (0.7 + r() * 0.5), pos.getZ(i) * (0.78 + r() * 0.44));
  }
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat(0x7d786c, 0.95));
  m.castShadow = true; m.receiveShadow = true;
  m.rotation.set(r() * 3.14, r() * 3.14, r() * 3.14);
  return m;
}

/** 植被实例化：每种生成少量原型，其余按实例矩阵复用（省显存与 draw call） */
export function plantVegetation(parent, { seed = 90210, density = 1 } = {}) {
  const veg = vegetationLayout(seed);
  const statics = group(parent);
  const take = (list) => list.slice(0, Math.max(0, Math.round(list.length * density)));
  const plant = (kind, list, protoCount, scaleRange) => {
    if (!list.length) return;
    const protos = [];
    for (let i = 0; i < protoCount; i++) {
      const src = kind === 'bamboo' ? bambooAsset(seed + 4100 + i * 977)
        : kind === 'pine' ? pineAsset(seed + 5200 + i * 911)
          : shrubAsset(seed + 6300 + i * 733);
      src.updateWorldMatrix(true, true);
      protos.push(src);
    }
    const perProto = [];
    protos.forEach((proto) => {
      proto.traverse((o) => {
        if (!o.isMesh || Array.isArray(o.material)) return;
        perProto.push({ material: o.material, geo: o.geometry.clone().applyMatrix4(o.matrixWorld), placements: [] });
      });
    });
    let cursor = 0;
    const protoSegs = [];
    protos.forEach(proto => {
      const before = cursor;
      proto.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) cursor++; });
      protoSegs.push({ start: before, count: cursor - before });
    });
    list.forEach(([x, y, z], i) => {
      const pi = i % protoCount;
      const sc = scaleRange[0] + ((i * 37) % 100) / 100 * (scaleRange[1] - scaleRange[0]);
      const rot = ((i * 53) % 360) / 57.3;
      const mtx = new T.Matrix4().compose(
        new T.Vector3(x, y, z),
        new T.Quaternion().setFromEuler(new T.Euler(0, rot, 0)),
        new T.Vector3(sc, sc, sc)
      );
      const seg = protoSegs[pi];
      for (let k = seg.start; k < seg.start + seg.count; k++) perProto[k].placements.push(mtx);
    });
    for (const pp of perProto) {
      const n = pp.placements.length;
      if (!n) { pp.geo.dispose(); continue; }
      if (n === 1) {
        const mesh = new T.Mesh(pp.geo, pp.material);
        mesh.applyMatrix4(pp.placements[0]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        statics.add(mesh);
        continue;
      }
      const im = new T.InstancedMesh(pp.geo, pp.material, n);
      pp.placements.forEach((m2, k) => im.setMatrixAt(k, m2));
      im.castShadow = true; im.receiveShadow = true;
      statics.add(im);
    }
  };
  plant('bamboo', take(veg.bamboo), 5, [0.85, 1.35]);
  plant('pine', take([...veg.pines, ...veg.accent]), 4, [0.9, 1.4]);
  plant('shrub', take(veg.shrubs), 4, [0.8, 1.5]);
  take(veg.rocks).slice(0, 140).forEach(([rx, ry, rz], i) => {
    const size = 0.14 + ((i * 29) % 100) / 100 * 0.5;
    const rk = rockAsset(20000 + i, size);
    rk.position.set(rx, ry + size * 0.35, rz);
    statics.add(rk);
  });
  return statics;
}


/** 悬浮光环 + 光柱：给每站一层「电子虚拟」的发光标记（加法混合，不吃阴影） */
function stationGlow(g, y, radius, tint = 0x7fd4ff) {
  const ringMat = new T.MeshBasicMaterial({
    color: tint, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  });
  const ring = new T.Mesh(new T.TorusGeometry(radius, 0.055, 8, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = y + 0.35;
  ring.renderOrder = 4;
  g.add(ring);

  const ring2 = new T.Mesh(new T.TorusGeometry(radius * 0.62, 0.035, 8, 48), ringMat.clone());
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = y + 1.5;
  ring2.renderOrder = 4;
  g.add(ring2);

  const beamMat = new T.MeshBasicMaterial({
    color: tint, transparent: true, opacity: 0.14, blending: T.AdditiveBlending, depthWrite: false
  });
  const beam = new T.Mesh(new T.CylinderGeometry(radius * 0.26, radius * 0.4, 30, 16, 1, true), beamMat);
  beam.position.y = y + 15;
  beam.renderOrder = 4;
  g.add(beam);

  return {
    ring, ring2, beam,
    set(act, loop) {
      const pulse = 0.55 + 0.45 * Math.sin(loop * TAU * 3);
      ringMat.opacity = 0.2 + act * 0.6 * pulse;
      ring2.material.opacity = 0.15 + act * 0.5;
      ring.scale.setScalar(1 + act * 0.06 * pulse);
      ring2.rotation.z = loop * TAU;
      beamMat.opacity = act * (0.1 + 0.06 * pulse);
    }
  };
}

// ── 站牌：吃项目节点文案（title/short/stage），过长的自动截断 ─────────────
const clip = (text, max = 12) => {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
};
const plate = (parent, text, w, h, x, y, z, bg = '#24544c', fg = '#f0e6c8') =>
  label(parent, clip(text), w, h, x, y, z, bg, fg);

/**
 * 五个站点：石门 / 观景台 / 长屋 / 灯塔 / 对齐台。
 * 每站返回 update(loop, stageAct)，loop 是 [0,1) 的循环相位（整数倍频率 → 首尾无缝）。
 */
export function buildStations(root, nodes) {
  const updates = [];
  const glows = [];

  // ① 石门 + 界碑 + 溪流浅滩
  {
    const n = nodes[0];
    const g = group(root, n.x, 0, n.z);
    const y = heightAt(n.x, n.z);
    const gate = group(g, 0, y, 0);
    gate.rotation.y = -n.angle + Math.PI / 2;
    for (const side of [-1.8, 1.8]) {
      box(gate, 0.72, 4.2, 0.72, side, 2.1, 0, mat(0x8f8577, 0.95));
      box(gate, 1.0, 0.36, 1.0, side, 4.34, 0, mat(0x7c7466, 0.95));
    }
    box(gate, 5.6, 0.6, 0.9, 0, 4.7, 0, mat(0x8f8577, 0.95));
    plate(gate, n.short || n.title, 4.6, 1.2, 0, 5.6, 0);
    box(g, 1.1, 2.4, 0.5, -3.4, y + 1.2, 0.6, mat(0x9c9285, 0.95));
    plate(g, n.stage, 2.6, 0.8, -3.4, y + 2.9, 0.6, '#2b5a63', '#e8f0e6');
    for (let i = 0; i < 10; i++) {
      const a = n.angle + (i - 5) * 0.06;
      const rr = n.radius + 3.6;
      const px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
      box(g, 2.4, 0.22, 3.0, px, heightAt(px, pz) + 0.08, pz, mat(0x88aeb0, 0.24, 0.08));
    }
    bake(g);
    glows.push(stationGlow(g, y, n.radius + 1.1));
    updates.push(() => {});
  }

  // ② 观景台：木平台 + 展台 + 缆车塔
  {
    const n = nodes[1];
    const g = group(root, n.x, 0, n.z);
    const deckY = heightAt(n.x, n.z);
    const yaw = -n.angle + Math.PI / 2;
    const deck = group(g, 0, deckY, 0);
    deck.rotation.y = yaw;
    const w = 8.4, d = 6.2;
    for (const [sx, sz] of [[-w / 2 + 0.6, -d / 2 + 0.6], [w / 2 - 0.6, -d / 2 + 0.6], [-w / 2 + 0.6, d / 2 - 0.6], [w / 2 - 0.6, d / 2 - 0.6]]) {
      const gy = heightAt(n.x + sx * Math.cos(yaw) - sz * Math.sin(yaw), n.z + sx * Math.sin(yaw) + sz * Math.cos(yaw));
      const hgt = Math.max(0.6, deckY - gy + 2.4);
      box(deck, 0.44, hgt, 0.44, sx, -hgt / 2 + 0.2, sz, mat(0xb59a6e, 0.8));
    }
    box(deck, w, 0.34, d, 0, 0.05, 0, mat(0xb59a6e, 0.8));
    box(deck, w + 0.5, 0.14, d + 0.5, 0, 0.25, 0, mat(0xc8b98f, 0.8));
    for (const [rx, rz] of [[0, -d / 2], [0, d / 2], [-w / 2, 0], [w / 2, 0]]) {
      const along = rx === 0 ? w : d;
      const cnt = Math.round(along / 2.2);
      for (let i = 0; i <= cnt; i++) {
        const t = cnt === 0 ? 0.5 : i / cnt;
        const px = rx === 0 ? -w / 2 + t * w : rx;
        const pz = rz === 0 ? -d / 2 + t * d : rz;
        box(deck, 0.15, 1.2, 0.15, px, 0.95, pz, mat(0xb59a6e, 0.8));
      }
      box(deck, rx === 0 ? w : 0.13, 0.1, rz === 0 ? d : 0.13, rx, 1.5, rz, mat(0xb59a6e, 0.8));
    }
    plate(deck, n.short || n.title, 4.2, 1.1, 0, 2.8, -d / 2 + 0.1);
    for (const [ox, oz] of [[-2.4, 1.3], [0, 1.3], [2.4, 1.3]]) {
      box(deck, 2.0, 0.15, 0.9, ox, 1.0, oz, mat(0xd8cba6, 0.85));
      box(deck, 0.16, 0.85, 0.16, ox - 0.85, 0.5, oz, mat(0xb59a6e, 0.8));
      box(deck, 0.16, 0.85, 0.16, ox + 0.85, 0.5, oz, mat(0xb59a6e, 0.8));
    }
    for (const [ox, oz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      beam(deck, [-w / 2 - 1.2 + ox, 0, oz], [-w / 2 - 1.2 + ox * 0.35, 6.4, oz * 0.35], 0.13, mat(0x7c8a84, 0.9));
    }
    box(deck, 1.3, 0.3, 1.3, -w / 2 - 1.2, 6.55, 0, mat(0x6d7a74, 0.9));
    bake(g);
    glows.push(stationGlow(g, deckY, 5.0));
    updates.push(() => {});
  }

  // ③ 长屋：档案架 + 退回台 + 檐雨（雨幕呼吸 = 唯一动效，留在烘焙组之外）
  {
    const n = nodes[2];
    const g = group(root, n.x, 0, n.z);
    const floorY = heightAt(n.x, n.z);
    const yaw = -n.angle + Math.PI / 2;
    const house = group(g, 0, floorY, 0);
    house.rotation.y = yaw;
    const w = 12.4, d = 6.8, h = 4.3;
    for (const sx of [-w / 2 + 0.6, -w / 6, w / 6, w / 2 - 0.6]) {
      for (const sz of [-d / 2 + 0.6, d / 2 - 0.6]) box(house, 0.38, h, 0.38, sx, h / 2, sz, mat(0x8a7250, 0.85));
    }
    box(house, w + 1.6, 0.32, d + 1.6, 0, h + 0.16, 0, mat(0x6f5b3f, 0.9));
    box(house, w + 2.4, 0.22, d + 2.4, 0, h + 0.38, 0, mat(0x5c4a33, 0.92));
    box(house, w - 1, 0.15, d - 1, 0, 0.08, 0, mat(0xcfc4a6, 0.9));
    plate(house, n.short || n.title, 5.4, 1.3, 0, h + 1.2, -d / 2 - 0.2, '#2b5a63', '#e8f0e6');
    for (let i = 0; i < 6; i++) {
      const sx = -w / 2 + 1.6 + (i % 3) * 3.4;
      const sy = 1.0 + Math.floor(i / 3) * 1.5;
      box(house, 1.2, 0.13, 0.95, sx, sy, -1.3, mat(0xb9a882, 0.9));
      box(house, 0.13, 1.4, 0.95, sx - 0.7, sy + 0.7, -1.3, mat(0x8a7250, 0.9));
      box(house, 0.13, 1.4, 0.95, sx + 0.7, sy + 0.7, -1.3, mat(0x8a7250, 0.9));
      box(house, 1.6, 0.11, 0.95, sx, sy + 1.42, -1.3, mat(0x8a7250, 0.9));
    }
    box(house, 2.6, 0.18, 1.15, 4.4, 1.0, 2.1, mat(0xd8cba6, 0.85));
    box(house, 0.18, 1.0, 0.18, 3.4, 0.5, 2.1, mat(0x8a7250, 0.9));
    box(house, 0.18, 1.0, 0.18, 5.4, 0.5, 2.1, mat(0x8a7250, 0.9));
    box(house, 2.8, 0.18, 1.3, -5.2, 1.0, 1.9, mat(0xcfc4a6, 0.85));
    bake(g);
    glows.push(stationGlow(g, floorY, 6.2));
    const rainMat = new T.MeshStandardMaterial({ color: 0xcfe0e4, transparent: true, opacity: 0.3, roughness: 0.6 });
    const local = [];
    for (let i = 0; i < 54; i++) local.push([-w / 2 - 0.6 + (i % 14) * 1.05, 1.4 + Math.floor(i / 14) * 0.55, d / 2 + 0.5]);
    const rain = instances(g, local.map(([lx, ly, lz]) => [
      lx * Math.cos(yaw) - lz * Math.sin(yaw),
      ly,
      lx * Math.sin(yaw) + lz * Math.cos(yaw)
    ]), [0.05, 1.5, 0.05], rainMat);
    updates.push((loop) => {
      rainMat.opacity = 0.22 + Math.abs(Math.sin(loop * TAU * 3)) * 0.12;
      rain.position.y = Math.sin(loop * TAU * 5) * 0.06;
    });
  }

  // ④ 灯塔：塔身 + 反光镜阵列 + 雾海（雾海常漂，镜面与灯罩按本站活动亮起）
  {
    const n = nodes[3];
    const g = group(root, n.x, 0, n.z);
    const topY = heightAt(n.x, n.z);
    const yaw = -n.angle + Math.PI / 2;
    const tower = group(g, 0, topY, 0);
    tower.rotation.y = yaw;
    box(tower, 7.6, 0.45, 7.6, 0, 0.22, 0, mat(0x8d8577, 0.95));
    box(tower, 6.8, 0.14, 6.8, 0, 0.5, 0, mat(0xa9a294, 0.95));
    const towerH = 11.2;
    for (const [ox, oz] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) {
      beam(tower, [ox, 0.6, oz], [ox * 0.42, towerH, oz * 0.42], 0.19, mat(0x7c8a84, 0.9));
    }
    for (let i = 0; i < 4; i++) {
      const yy = 3 + i * 2.3, k = 1 - i * 0.16;
      box(tower, 2.5 * k, 0.13, 2.5 * k, 0, yy, 0, mat(0x6d7a74, 0.9));
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const mx = Math.cos(a) * 1.3 * k, mz = Math.sin(a) * 1.3 * k;
        const mirror = box(tower, 0.85 * k, 0.85 * k, 0.1, mx, yy + 0.55, mz, mat(0xd9dfe0, 0.2, 0.7));
        mirror.rotation.y = -a;
      }
    }
    const head = group(tower, 0, towerH + 0.55, 0);
    cyl(head, 1.9, 0.95, 0, 0.4, 0, mat(0x6d7a74, 0.9));
    const lensMat = mat(0xfff3d0, 0.3);
    lensMat.emissive = new T.Color(0xffe9b0);
    lensMat.emissiveIntensity = 0;
    const dome = sphere(head, 1.6, 0, 1.0, 0, 0xfff3d0);
    dome.scale.y = 0.66;
    dome.material = lensMat;
    bake(g);
    glows.push(stationGlow(g, topY, 5.4));
    // 雾海：绕站点一圈，常驻漂移
    const sea = [];
    for (let i = 0; i < 9; i++) {
      const fogMat = new T.MeshStandardMaterial({ color: 0xeaf0ee, transparent: true, opacity: 0.3, roughness: 1, depthWrite: false });
      const mesh = new T.Mesh(new T.SphereGeometry(1, 16, 10), fogMat);
      const a = (i / 9) * TAU;
      mesh.position.set(n.x + Math.cos(a) * 9, topY - 6.4 + (i % 3) * 1.4, n.z + Math.sin(a) * 9);
      const s = 8 + (i % 4) * 2.2;
      mesh.scale.set(s, s * 0.26, s * 0.8);
      mesh.renderOrder = 6;
      g.add(mesh);
      sea.push({ mesh, phase: i * 0.7 });
    }
    updates.push((loop, act) => {
      lensMat.emissiveIntensity = act * (1.5 + Math.sin(loop * TAU * 6) * 0.12);
      tower.rotation.y = yaw + Math.sin(loop * TAU) * 0.4 * act;
      sea.forEach((s, i) => {
        s.mesh.position.x = n.x + Math.cos(i * 0.7 + loop * TAU) * 9;
        s.mesh.position.z = n.z + Math.sin(i * 0.7 + loop * TAU) * 9;
        s.mesh.material.opacity = (act ? 0.18 : 0.3) * (1 - i * 0.04);
      });
    });
  }

  // ⑤ 对齐台：三座展台 + 八根石柱（依次点亮）+ 结论碑
  {
    const n = nodes[4];
    const g = group(root, n.x, 0, n.z);
    const topY = heightAt(n.x, n.z);
    const yaw = -n.angle + Math.PI / 2;
    const plaza = group(g, 0, topY, 0);
    plaza.rotation.y = yaw;
    box(plaza, 12, 0.45, 9, 0, 0.22, 0, mat(0x8d8577, 0.95));
    box(plaza, 11, 0.14, 8, 0, 0.5, 0, mat(0xb0a99a, 0.95));
    const caps = [];
    for (let i = 0; i < 3; i++) {
      const sx = -4 + i * 4;
      box(plaza, 2.3, 0.95, 1.5, sx, 1.0, -1.1, mat(0xcfc4a6, 0.9));
      box(plaza, 2.5, 0.13, 1.7, sx, 1.53, -1.1, mat(0xd8cba6, 0.85));
      plate(plaza, `0${i + 1} 台`, 1.7, 0.6, sx, 2.05, -1.1, '#2b5a63', '#e8f0e6');
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const px = Math.cos(a) * 4.4, pz = Math.sin(a) * 3.4 + 1.3;
      box(plaza, 0.48, 1.8, 0.48, px, 1.1, pz, mat(0x9c9285, 0.95));
      const capMat = mat(0x7c8a84, 0.9);
      capMat.emissive = new T.Color(0xffe9b0);
      capMat.emissiveIntensity = 0;
      box(plaza, 0.62, 0.2, 0.62, px, 2.05, pz, capMat);
      caps.push(capMat);
    }
    box(plaza, 3.2, 2.5, 0.5, 0, 1.95, 3.4, mat(0x9c9285, 0.95));
    plate(plaza, n.short || n.title, 2.9, 0.85, 0, 2.4, 3.14);
    bake(g);
    glows.push(stationGlow(g, topY, 6.4));
    updates.push((loop, act) => {
      caps.forEach((m2, i) => {
        m2.emissiveIntensity = act * Math.max(0, Math.sin(loop * TAU * 3 - i * 0.55)) * 1.5;
      });
    });
  }

  // 统一收集每站光效，update 时一起驱动（不参与 bake，保持自发光与透明）
  return {
    updates: updates.map((fn, i) => (loop, act) => { fn(loop, act); glows[i]?.set(act, loop); }),
    glows
  };
}
