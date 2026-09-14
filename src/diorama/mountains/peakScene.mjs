// 知识山微缩沙盘场景：山体 + 盘山小径 + 五站（营地）景物，自动循环。
// 山形与五站几何移植自 diorama-lab 的 SpiralMountainWorld（mountainCore/mountainMesh/nodeProps）；
// 这里只保留山本身：不挂木桌与书架，山自带土层边缘与底盘。
// 时间语义：引擎 day ∈ [1, 6) 循环，5 个阶段各 6 秒；本文件所有动画都是 day 的纯函数。
import * as T from '../../vendor/three.module.js';
import { group, mat, clamp, smoothstep, TAU } from '../core.mjs';
import { MOUNTAIN, nodesWithLabels, heightAt, trailPoint } from './field.mjs';
import { terrainMesh, soilEdge, trailRibbon, rockScatter } from './shell.mjs';
import { buildStations, plantVegetation } from './stations.mjs';
import { STAGES } from '../../domain.mjs';
import { MOUNTAIN_3D } from '../../data/mountains.mjs';

export const PEAK_STAGES = 5;

// 每座山的观感：地形配色 + 天气 + 植被密度 + 雾。
// 取值以 src/data/mountains.mjs 的 MOUNTAIN_3D（label/archetype/palette/weather）为锚。
const LOOKS = {
  'cognitive-biases': {
    grass: 0x5f7c4c, rock: 0x6f6a5e, scree: 0x8b8578, moss: 0x4b6b45, cliff: 0x655d52,
    slab: 0xa89678, rail: 0x8a7250, fog: 0xd7e2da, fogNear: 70, fogFar: 300,
    weather: 'mist', veg: 1.0, haze: 0xdcebe2, hazeCount: 14, mountain: 'bamboo'
  },
  'ethics-intro': {
    grass: 0x7d7a52, rock: 0x8a7f6b, scree: 0xa3987d, moss: 0x5f5c3d, cliff: 0x6b5f4c,
    slab: 0xbcae90, rail: 0x8f7d5e, fog: 0xe8dfc9, fogNear: 80, fogFar: 340,
    weather: 'dust', veg: 0.7, haze: 0xe9d9b6, hazeCount: 18, mountain: 'temple'
  },
  'meme-culture': {
    grass: 0x5a7d78, rock: 0x5f6f74, scree: 0x8fa3a6, moss: 0x3f6360, cliff: 0x4d5a60,
    slab: 0xb0a68c, rail: 0x7d8a83, fog: 0xd8e8ec, fogNear: 60, fogFar: 280,
    weather: 'tide', veg: 0.55, haze: 0xd3e6ea, hazeCount: 22, mountain: 'island'
  },
  'ai-agents': {
    grass: 0x4a6258, rock: 0x5a6560, scree: 0x7c8480, moss: 0x3c4f45, cliff: 0x4a4f4c,
    slab: 0x9aa0a0, rail: 0x6f7a78, fog: 0xc6cfcc, fogNear: 55, fogFar: 260,
    weather: 'rain', veg: 0.45, haze: 0xbfcbc8, hazeCount: 12, mountain: 'machine'
  },
  'critical-thinking': {
    grass: 0x66795a, rock: 0x7b7566, scree: 0x9c9384, moss: 0x4f6349, cliff: 0x635c50,
    slab: 0xb3a68a, rail: 0x877a5f, fog: 0xdfe6e1, fogNear: 90, fogFar: 360,
    weather: 'cloud', veg: 0.85, haze: 0xe2eae6, hazeCount: 16, mountain: 'forest'
  },
  existentialism: {
    grass: 0x6a7a6e, rock: 0x6d6f68, scree: 0x939489, moss: 0x4e5c50, cliff: 0x5a5b55,
    slab: 0xb4ab97, rail: 0x8b8471, fog: 0xd9dfe1, fogNear: 85, fogFar: 340,
    weather: 'cloud', veg: 0.5, haze: 0xdfe5e7, hazeCount: 20, mountain: 'windpeak'
  }
};
const DEFAULT_LOOK = {
  ...LOOKS.existentialism, fog: 0xd9e0d8, weather: 'cloud', veg: 0.7, hazeCount: 16
};

const lookFor = (id) => LOOKS[id] || DEFAULT_LOOK;

/** 五站机位：第 i 个阶段停在 presets[i]，所以数组顺序就是阶段顺序（一站一张，不插全景）。
 *  引擎的导演运镜在每个阶段末 28% 平滑滑向下一站，第 5 站滑回第 1 站 → 30 秒无缝循环。
 *  每张机位都往后退到 ~30 m，站点在前景、山体在背景。 */
function cameraPresets(nodes) {
  const shots = [
    { off: [19, 10, -19], tgt: [0, 2.0, 0] },     // ① 山脚石门：入口 + 身后升起的山体
    { off: [20, 10, 18], tgt: [0, 2.4, 0] },      // ② 垭口观景台
    { off: [19, 11, 19], tgt: [0, 2.8, 0] },      // ③ 半崖长屋
    { off: [-18, 14, 18], tgt: [0, 5.5, 0] },     // ④ 校准灯塔：看塔身中段
    { off: [-17, 9, -20], tgt: [0, 1.6, 0] }      // ⑤ 山顶对齐台：压低目标，留住天际线
  ];
  return nodes.map((n, i) => {
    const s = shots[i] || shots[0];
    return {
      id: `node-${i + 1}`,
      label: STAGES[i] || `第 ${i + 1} 站`,
      pos: [n.x + s.off[0], n.y + s.off[1], n.z + s.off[2]],
      target: [n.x + s.tgt[0], n.y + s.tgt[1], n.z + s.tgt[2]]
    };
  });
}

/** 天气图层：漂移的雾团与雨丝（位置只依赖循环相位，首尾无缝） */
function buildWeather(root, look) {
  const layers = { haze: [], rain: null, sea: null, discs: [] };
  const hazeMat = new T.MeshStandardMaterial({
    color: look.haze, transparent: true, opacity: 0.22, roughness: 1, depthWrite: false
  });
  const geo = new T.SphereGeometry(1, 14, 9);
  const spots = [];
  for (let i = 0; i < look.hazeCount; i++) {
    const a = (i / look.hazeCount) * TAU * 1.618;
    const rr = 16 + (i % 5) * 9;
    const baseY = look.weather === 'cloud' ? 16 + (i % 4) * 5 : 2 + (i % 5) * 3.4;
    const mesh = new T.Mesh(geo, hazeMat.clone());
    mesh.renderOrder = 5;
    root.add(mesh);
    spots.push({ mesh, a, rr, baseY, phase: (i % 7) / 7 });
  }
  layers.haze = spots;

  if (look.weather === 'rain') {
    const dropMat = new T.MeshStandardMaterial({ color: 0xcfe0e4, transparent: true, opacity: 0.34, roughness: 0.6 });
    const drops = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), dropMat, 420);
    drops.castShadow = false; drops.receiveShadow = false;
    layers.rain = drops;
    root.add(drops);
  }
  if (look.weather === 'tide') {
    // 潮线：贴山脚的一圈浅浅水面
    const water = new T.Mesh(
      new T.CircleGeometry(58, 72),
      new T.MeshStandardMaterial({ color: 0x4e93a7, transparent: true, opacity: 0.32, roughness: 0.25, metalness: 0.1 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.6;
    root.add(water);
    layers.discs.push(water);
  }
  if (look.weather === 'cloud') {
    const seaMat = new T.MeshStandardMaterial({ color: 0xeef2f2, transparent: true, opacity: 0.24, roughness: 1, depthWrite: false });
    const sea = new T.InstancedMesh(new T.SphereGeometry(1, 16, 10), seaMat, 12);
    sea.renderOrder = 5;
    root.add(sea);
    layers.sea = sea;
  }
  return layers;
}

export function createPeakScene(root, ctx = {}) {
  const plan = ctx.plan || { id: 'existentialism', nodes: [] };
  const look = lookFor(plan.id);
  const spec = MOUNTAIN_3D[plan.id] || {};
  const seed = (spec.variantSeeds && spec.variantSeeds[0]) || 161803;

  // 大气：雾色与可见距离随山而变（引擎默认的 220/520 对 110 m 的山太远，等于没有空气感）。
  // 注意引擎构造函数在 createScene 之后还会跑一次 applySceneLighting() 覆盖雾色，所以推迟到第一帧再落。
  let atmosphereApplied = false;
  const applyAtmosphere = () => {
    if (atmosphereApplied) return;
    const world = ctx.engine?.world;
    if (world?.fog) {
      world.fog.color.setHex(look.fog);
      world.fog.near = look.fogNear;
      world.fog.far = look.fogFar;
      ctx.engine.renderer?.setClearColor(look.fog, 1);
    }
    atmosphereApplied = true;
  };

  // 站牌文案来自本项目的五营地（title/short + 阶段名）
  const nodes = nodesWithLabels((plan.nodes || []).map((node, i) => ({
    stage: STAGES[i] || '',
    title: node?.title || '',
    short: node?.short || node?.title || ''
  })));

  // 山体 + 土层边缘 + 底盘
  const terrain = terrainMesh(plan.id, look);
  terrain.mesh.position.y = 0;
  root.add(terrain.mesh);
  root.add(soilEdge());
  {
    const base = new T.Mesh(
      new T.CircleGeometry(210, 64),
      new T.MeshStandardMaterial({ color: 0x2b2723, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -14.2;
    base.receiveShadow = true;
    root.add(base);
  }

  // 盘山小径 + 碎石 + 植被
  const trail = trailRibbon({ slabColor: look.slab, railColor: look.rail });
  root.add(trail.group);
  let rocks = rockScatter({ seed: seed + 70123, color: look.rock });
  root.add(rocks);
  let veg = plantVegetation(root, { seed, density: look.veg });
  root.add(veg);

  // 五站
  const stations = buildStations(root, nodes);

  // 每站两盏暖灯笼（强度随该站的活动期起伏，光点随导览爬上山顶）
  const lanterns = [];
  for (const n of nodes) {
    for (const side of [-1, 1]) {
      const lx = n.x + Math.cos(n.angle + Math.PI / 2) * (n.radius + 0.6) * side;
      const lz = n.z + Math.sin(n.angle + Math.PI / 2) * (n.radius + 0.6) * side;
      const ly = heightAt(lx, lz);
      const post = group(root, lx, ly, lz);
      const shaft = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 2.2, 7), mat(0x8a7250, 0.9));
      shaft.position.set(0, 1.1, 0);
      shaft.castShadow = true;
      post.add(shaft);
      // 每盏灯一盏自己的材质：灯笼强度要按站点各自起伏，不能共用缓存的材质
      const lampMat = new T.MeshStandardMaterial({ color: 0xffd79a, roughness: 0.4 });
      lampMat.emissive = new T.Color(0xffb44f);
      lampMat.emissiveIntensity = 1.2;
      const bulb = new T.Mesh(new T.SphereGeometry(0.28, 10, 7), lampMat);
      bulb.position.set(0, 2.3, 0);
      post.add(bulb);
      const light = new T.PointLight(0xffc46a, 6, 26, 2);
      light.position.set(lx, ly + 2.3, lz);
      root.add(light);
      lanterns.push({ mat: lampMat, light });
    }
  }

  // 沿径而上的行者光点（走到哪里，哪一段路亮起来）
  const walkerMat = mat(0xffe6ae, 0.5);
  walkerMat.emissive = new T.Color(0xffcf82);
  walkerMat.emissiveIntensity = 1.6;
  const walker = new T.Mesh(new T.SphereGeometry(0.42, 12, 8), walkerMat);
  const walkerLight = new T.PointLight(0xffe0a8, 12, 22, 2);
  root.add(walker, walkerLight);

  // 天气图层
  root.updateWorldMatrix(true, true);
  const weather = buildWeather(root, look, plan.id);

  const cin = (x) => { const m = ((x % PEAK_STAGES) + PEAK_STAGES) % PEAK_STAGES; return Math.min(m, PEAK_STAGES - m); };
  const dropDummy = new T.Object3D();

  function update(day) {
    applyAtmosphere();
    const stageFloat = clamp(day - 1, 0, PEAK_STAGES - 1e-4);
    const loop = stageFloat / PEAK_STAGES;                 // [0,1)
    // 每站的活动期：本站阶段内为 1，向两侧平滑淡出（环形，首尾无缝）
    const act = (i) => 1 - smoothstep((cin(stageFloat - i) - 0.35) / 0.45);

    stations.updates.forEach((fn, i) => fn(loop, act(i)));

    lanterns.forEach((l, k) => {
      const a = act(k >> 1);
      l.mat.emissiveIntensity = 0.5 + a * 1.7;
      l.light.intensity = 2 + a * 14;
    });

    // 行者：沿小径从第一站爬到第五站（循环末回到起点）
    const tt = 0.20 + 0.70 * loop;
    const p = trailPoint(tt);
    walker.position.set(p.x, p.y + 0.75, p.z);
    walkerLight.position.set(p.x, p.y + 1.1, p.z);
    walkerMat.emissiveIntensity = 1.3 + Math.sin(loop * TAU * 5) * 0.3;

    // 雾团：绕山漂移 + 缓慢起伏
    weather.haze.forEach((s, i) => {
      const a = s.a + loop * TAU * (0.6 + (i % 3) * 0.2);
      const bob = Math.sin(loop * TAU * (2 + (i % 4)) + s.phase * TAU) * 1.6;
      s.mesh.position.set(Math.cos(a) * s.rr, s.baseY + bob, Math.sin(a) * s.rr);
      const size = 7 + (i % 5) * 2.6;
      s.mesh.scale.set(size, size * 0.34, size * 0.8);
      s.mesh.material.opacity = (look.weather === 'mist' ? 0.26 : 0.18) * (0.7 + 0.3 * Math.sin(loop * TAU * 3 + i));
    });

    if (weather.rain) {
      const span = 46;
      for (let i = 0; i < weather.rain.count; i++) {
        const a = (i * 2.399963) % TAU;
        const rr = 8 + ((i * 37) % 100) / 100 * 42;
        const yPhase = ((i * 13) % 100) / 100;
        const y = 44 - (((yPhase + loop * 4) % 1) * span);
        dropDummy.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
        dropDummy.rotation.set(0, a, 0.12);
        dropDummy.scale.set(0.045, 2.6, 0.045);
        dropDummy.updateMatrix();
        weather.rain.setMatrixAt(i, dropDummy.matrix);
      }
      weather.rain.instanceMatrix.needsUpdate = true;
    }
    if (weather.sea) {
      for (let i = 0; i < weather.sea.count; i++) {
        const a = (i / weather.sea.count) * TAU + loop * TAU * 0.25;
        const rr = 44 + (i % 3) * 9;
        dropDummy.position.set(Math.cos(a) * rr, 7.5 + (i % 3) * 2.6, Math.sin(a) * rr);
        dropDummy.rotation.set(0, a, 0);
        const s = 13 + (i % 4) * 3.4;
        dropDummy.scale.set(s, s * 0.22, s * 0.7);
        dropDummy.updateMatrix();
        weather.sea.setMatrixAt(i, dropDummy.matrix);
      }
      weather.sea.instanceMatrix.needsUpdate = true;
    }
    if (weather.discs.length) {
      weather.discs[0].position.y = -0.6 + Math.sin(loop * TAU) * 0.35;
    }
  }

  // 重新布景：山形骨架不变，只换植被与碎石（换一批山林的疏密与落石）
  let reseedCount = 0;
  function reseed(nextSeed) {
    reseedCount++;
    const s2 = typeof nextSeed === 'number' && Number.isFinite(nextSeed)
      ? Math.abs(Math.floor(nextSeed)) % 1000000
      : (seed + 7919 * reseedCount) % 1000000;
    root.remove(veg); root.remove(rocks);
    rocks = rockScatter({ seed: s2 + 70123, color: look.rock });
    veg = plantVegetation(root, { seed: s2, density: look.veg });
    root.add(rocks, veg);
    return s2;
  }

  return {
    cameras: cameraPresets(nodes),
    stageTitles: STAGES.slice(),
    stageDetail: (plan.nodes || []).map(n => n?.short || ''),
    nodes,
    update,
    reseed,
    // 供调试/测试读取
    stats: () => ({ mountain: plan.id, look: look.weather, height: MOUNTAIN.summit })
  };
}
