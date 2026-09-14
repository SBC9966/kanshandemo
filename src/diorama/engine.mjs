// 沙盘引擎：唯一渲染循环 + 时间系统 + 画质档与自适应 DPR + 相机。
// 时间语义：day ∈ [1, 1+stages]，循环推进（cycle = stages × stageSeconds）；所有 update 只依赖 day。
import * as T from '../vendor/three.module.js';
import { DioramaCamera } from './camera.mjs';

const QUALITY = {
  high: { dpr: 1.6, shadow: 2048 },
  balanced: { dpr: 1.2, shadow: 1024 },
  fast: { dpr: 1.0, shadow: 0 }
};
const SUN = {
  morning: { color: 0xfff0d2, intensity: 1.85, pos: [-70, 96, 40], ambient: 0.62, fog: 0xd9e0d8 },
  evening: { color: 0xffcf9a, intensity: 1.5, pos: [-52, 88, 52], ambient: 0.5, fog: 0xcfd4cd }
};

export const DioramaTime = {
  stageOf: (day, stages) => Math.min(stages - 1, Math.max(0, Math.floor(day - 1))),
  stageProgress: (day) => (day - 1) % 1
};

export class DioramaEngine {
  constructor(container, createScene, options = {}) {
    this.container = container;
    this.stages = 5;
    this.stageSeconds = options.stageSeconds || 6;
    this.cycle = this.stages * this.stageSeconds;
    this.playing = options.playing !== false;
    this.speed = options.speed || 1;
    this.day = options.day || 1.35;
    this.quality = options.quality || 'balanced';
    this.autoQuality = options.quality === 'auto' || options.quality == null;
    this.scene = options.scene || 'morning';
    this.mode = options.camera === 'director' ? 'director' : 'free';
    this.onStage = options.onStage || null;
    this.reducedMotion = options.reducedMotion === true;

    this.renderer = new T.WebGLRenderer({ antialias: this.quality !== 'fast', alpha: false, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x0e1512, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'diorama-canvas';
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', options.ariaLabel || '桌面微缩沙盘');

    this.world = new T.Scene();
    this.world.name = 'diorama-world';
    this.world.fog = new T.Fog(0xd9e0d8, 220, 520);
    this.root = new T.Group();
    this.root.name = 'diorama-root';
    this.world.add(this.root);

    this.hemi = new T.HemisphereLight(0xfff5dc, 0x2f3a36, 1.35);
    this.world.add(this.hemi);
    this.sun = new T.DirectionalLight(0xfff0d2, 1.85);
    this.sun.position.set(-70, 96, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const cam = this.sun.shadow.camera;
    cam.left = -95; cam.right = 95; cam.top = 95; cam.bottom = -95; cam.near = 10; cam.far = 320;
    cam.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.06;
    this.world.add(this.sun);
    this.world.add(this.sun.target);
    this.fill = new T.DirectionalLight(0xa8c0cc, 0.42);
    this.fill.position.set(60, 36, -58);
    this.world.add(this.fill);

    // 木桌/书架那套机场舞台家具已移除：山体场景自带土层边缘与底盘。

    this.entityDummy = new T.Object3D();
    this.sceneApi = createScene(this.root, { engine: this, day: this.day });
    if (this.sceneApi.cameras) {
      this.cameraPresets = this.sceneApi.cameras;
    } else {
      this.cameraPresets = [
        { id: 'wide', label: '全景', pos: [-58, 42, 66], target: [0, 2, 0] },
        { id: 'close', label: '近景', pos: [-16, 11, 16], target: [0, 2.6, 0] }
      ];
    }
    this.camera = new T.PerspectiveCamera(38, 1, 0.5, 900);
    this.camera.position.set(...this.cameraPresets[0].pos);
    this.camera.lookAt(...this.cameraPresets[0].target);
    this.cameraCtl = new DioramaCamera(this.camera, this.renderer.domElement, {
      presets: this.cameraPresets,
      autoRotate: this.mode !== 'director' && !this.reducedMotion
    });
    if (this.mode === 'director') this.cameraCtl.setDirector(true);

    this.setQuality(this.quality);
    this.resize();
    this.applySceneLighting();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.frameTimes = [];
    this.raf = 0;
    this.last = performance.now();
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  setQuality(q) {
    if (q !== 'auto') this.autoQuality = false;
    this.quality = q === 'auto' ? 'balanced' : q;
    const preset = QUALITY[this.quality] || QUALITY.balanced;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.dpr * (this.dprScale || 1)));
    this.renderer.shadowMap.enabled = preset.shadow > 0;
    if (this.sun) {
      this.sun.castShadow = preset.shadow > 0;
      if (preset.shadow > 0 && this.sun.shadow.mapSize.width !== preset.shadow) {
        this.sun.shadow.mapSize.set(preset.shadow, preset.shadow);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
      }
    }
    return this.quality;
  }

  setPlaying(on) { this.playing = on; return this.playing; }
  setSpeed(v) { this.speed = v; return this.speed; }
  seek(day) { this.day = Math.max(1, Math.min(1 + this.stages, day)); return this.day; }
  seekStage(i) { return this.seek(i + 1.02); }
  nextStage() { return this.seekStage((DioramaTime.stageOf(this.day, this.stages) + 1) % this.stages); }
  setCameraMode(mode) {
    this.mode = mode;
    this.cameraCtl.setDirector(mode === 'director');
    return mode;
  }
  applyPreset(id) { return this.cameraCtl.applyPreset(id); }
  setSceneLighting(name) {
    this.scene = SUN[name] ? name : 'morning';
    this.applySceneLighting();
  }
  applySceneLighting() {
    const s = SUN[this.scene];
    this.sun.color.setHex(s.color);
    this.sun.intensity = s.intensity;
    this.sun.position.set(...s.pos);
    this.hemi.intensity = 1.35 * (s.ambient / 0.62);
    this.world.fog.color.setHex(s.fog);
    this.fill.intensity = this.scene === 'evening' ? 0.3 : 0.42;
  }
  resize() {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  tick(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) {
      this.day += dt * this.speed / this.stageSeconds;
      if (this.day >= this.stages + 1) this.day = 1;
    }
    const stage = DioramaTime.stageOf(this.day, this.stages);
    const progress = DioramaTime.stageProgress(this.day);
    const result = this.sceneApi.update ? this.sceneApi.update(this.day, this.entityDummy) : null;
    this.cameraCtl.focusTarget = result && result.focus ? () => result.focus : (this.sceneApi.focus || null);
    this.cameraCtl.update(stage, progress);
    if (this.onStage && this.lastStage !== stage) {
      this.lastStage = stage;
      this.onStage(stage, this.sceneApi.stageTitles?.[stage] || '');
    }
    this.renderer.render(this.world, this.camera);
    this.trackFrame(dt);
    this.raf = requestAnimationFrame(this.tick);
  }

  trackFrame(dt) {
    if (!this.autoQuality) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    this.qualityCheck = (this.qualityCheck || 0) + 1;
    if (this.qualityCheck < 60) return;
    this.qualityCheck = 0;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1 / Math.max(avg, 1e-4);
    if (fps < 48) {
      this.dprScale = Math.max(0.8, (this.dprScale || 1) - 0.12);
      this.setQuality(this.quality);
    } else if (fps > 58 && (this.dprScale || 1) < 1) {
      this.dprScale = Math.min(1, (this.dprScale || 1) + 0.08);
      this.setQuality(this.quality);
    }
    this.lastFps = Math.round(fps);
  }

  stats() {
    return {
      fps: this.lastFps || null,
      day: this.day,
      stage: DioramaTime.stageOf(this.day, this.stages),
      quality: this.quality,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles
    };
  }

  startRecording() {
    if (!this.renderer.domElement.captureStream || typeof MediaRecorder === 'undefined') throw new Error('当前浏览器不支持录制');
    const stream = this.renderer.domElement.captureStream(60);
    const chunks = [];
    const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    this.recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    this.recorder.onstop = () => {
      this.lastRecording = URL.createObjectURL(new Blob(chunks, { type: mime }));
      stream.getTracks().forEach(t => t.stop());
    };
    this.recorder.start();
    return true;
  }
  stopRecording() { if (this.recorder?.state === 'recording') this.recorder.stop(); }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.stopRecording();
    window.removeEventListener('resize', this.onResize);
    this.cameraCtl.dispose();
    this.world.traverse(o => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
      }
    });
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}

export function mountDiorama(container, createScene, options = {}) {
  const engine = new DioramaEngine(container, createScene, options);
  return { engine, destroy: () => engine.destroy() };
}
