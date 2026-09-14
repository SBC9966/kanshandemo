// 山页 3D 挂载入口：把微缩沙盘引擎接到山页的 map-viewport 上。
// 场景内容来自 src/diorama/，按山 id 取；山体自带地面，不挂桌面/书架那套舞台家具。
import { mountDiorama } from './diorama/engine.mjs';
import { dioramaFor } from './diorama/registry.mjs';

export function mountScene3D(container, plan, options = {}) {
  const def = dioramaFor(plan.id);
  const engineHandle = mountDiorama(container, (root, ctx) => def.create(root, { ...ctx, plan }), {
    ...options,
    ariaLabel: `${plan.title || plan.id} 微缩沙盘`,
    workbench: false,                        // 只留山：木桌、书架、桌面道具都不要
    stageSeconds: options.stageSeconds || 6,
    camera: options.camera || 'director',    // 自动运镜：五站循环导览
    quality: options.quality || 'auto'
  });
  const sceneApi = engineHandle.engine.sceneApi || {};
  const handle = {
    engine: engineHandle.engine,
    scene: engineHandle.engine,
    stageTitles: def.stageTitles || sceneApi.stageTitles,
    stageDetail: def.stageDetail || sceneApi.stageDetail,
    reseed: (seed) => {
      if (typeof sceneApi.reseed !== 'function') return null;
      const next = sceneApi.reseed(seed);
      engineHandle.engine.seek(1);           // 重新布景后从第一站重新走一遍
      return next;
    },
    destroy: engineHandle.destroy
  };
  // 零构建工程没有 devtools 断点，挂个句柄方便在控制台里检查场景与强制渲染
  if (typeof window !== 'undefined') window.__diorama = handle;
  return handle;
}

export { DioramaTime } from './diorama/engine.mjs';
