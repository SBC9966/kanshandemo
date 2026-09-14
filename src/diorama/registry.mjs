// 六座知识山的微缩沙盘场景注册表。
// 六座山共用同一套山体骨架（盘山小径 + 五站营地），差异在配色、天气、植被与本项目自己的营地文案；
// 文案由 mountScene3D 在挂载时从 mountain.nodes 传入。机场机坪那一套（跑道/飞机/木桌书架）已移除。
import { createPeakScene } from './mountains/peakScene.mjs';
import { STAGES } from '../domain.mjs';

const PEAK_ENTRIES = [
  { id: 'cognitive-biases', title: '雾林辨径 · 竹海与校准灯' },
  { id: 'ethics-intro', title: '岔路盘山 · 石门与权衡台' },
  { id: 'meme-culture', title: '迷因群岛 · 潮汐与浮岛' },
  { id: 'ai-agents', title: '云上工坊 · 轨道与调度塔' },
  { id: 'critical-thinking', title: '明证峡谷 · 样本湖与观测台' },
  { id: 'existentialism', title: '孤峰风口 · 松径与回声站' }
];

export const DIORAMAS = Object.fromEntries(PEAK_ENTRIES.map(p => [p.id, {
  title: p.title,
  stageTitles: STAGES.slice(),
  stageDetail: [],
  camera: 'peak',
  create: createPeakScene
}]));

export const dioramaFor = id => DIORAMAS[id] || DIORAMAS[Object.keys(DIORAMAS)[0]];
export const CYCLE_STAGES = 5;
export const STAGE_SECONDS = 6;
