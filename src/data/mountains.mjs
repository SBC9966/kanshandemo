// 每座山的 3D 资产规格（运行时的唯一事实来源）。
// 资产本身由 scripts/mountains/generate.mjs 按这里的 spec 生成，产物是 src/assets/mountains/*.glb。
// 调色板 / 天气沿用原场景设计；几何生成逻辑全部在资产工序中，运行时只做加载与展示。
export const MOUNTAIN_3D = {
  'cognitive-biases': {
    label: '雾林 · 竹径 · 校准灯',
    archetype: 'misty-bamboo-ridge',
    palette: [0x23463d, 0x6f927e, 0xd7c58c],
    weather: 'mist',
    // 五站在 [0,1] 高度上的位置，与 GLB 中的 station 锚点一致
    stations: [0.14, 0.36, 0.52, 0.73, 0.9],
    variantSeeds: [104729, 130363]
  },
  'ethics-intro': {
    label: '石门 · 庙宇 · 权衡台',
    archetype: 'stone-gate-temple-peak',
    palette: [0x463627, 0x92795d, 0xc25e49],
    weather: 'dust',
    stations: [0.14, 0.36, 0.52, 0.73, 0.9],
    variantSeeds: [7919, 104729]
  },
  'meme-culture': {
    label: '潮汐 · 浮岛 · 漂流语库',
    archetype: 'tidal-floating-islands',
    palette: [0x20495c, 0x4e93a7, 0xd48655],
    weather: 'tide',
    stations: [0.12, 0.34, 0.52, 0.72, 0.9],
    variantSeeds: [31337, 65537]
  },
  'ai-agents': {
    label: '机房 · 轨道 · 调度塔',
    archetype: 'machine-orbit-mountain',
    palette: [0x213943, 0x547783, 0xe1bd63],
    weather: 'rain',
    stations: [0.14, 0.36, 0.52, 0.73, 0.9],
    variantSeeds: [524287, 999983]
  },
  'critical-thinking': {
    label: '石阶 · 观测台 · 证据林',
    archetype: 'evidence-forest-ridge',
    palette: [0x36433e, 0x78816f, 0xc09b69],
    weather: 'cloud',
    stations: [0.14, 0.36, 0.52, 0.73, 0.9],
    variantSeeds: [271828, 314159]
  },
  existentialism: {
    label: '孤峰 · 风口 · 回声站',
    archetype: 'wind-swept-lone-peak',
    palette: [0x263b3a, 0x687a74, 0xb79777],
    weather: 'cloud',
    stations: [0.16, 0.38, 0.54, 0.74, 0.92],
    variantSeeds: [161803, 141421]
  }
};

export const MOUNTAIN_3D_IDS = Object.keys(MOUNTAIN_3D);
export const mountain3DFor = id => MOUNTAIN_3D[id] || MOUNTAIN_3D[MOUNTAIN_3D_IDS[MOUNTAIN_3D_IDS.length - 1]];
