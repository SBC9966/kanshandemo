// 沙盘相机：OrbitControls 环绕 + 机位预设 + 导演自动运镜（阶段机位表 + 平滑混合）。
import * as T from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { lerp, smoothstep, clamp } from './core.mjs';
const clampNum = (v, a, b) => clamp(v, a, b);

export class DioramaCamera {
  constructor(camera, domElement, { presets, autoRotate = true }) {
    this.camera = camera;
    this.presets = presets;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 90;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotate = autoRotate;
    this.controls.autoRotateSpeed = 0.32;
    this.controls.target.set(...presets[0].target);
    // 用户一上手就交还控制权：退出自动导览，改成自由环绕（可再点「自动导览」回来）
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      this.userTouched = true;
      if (this.mode === 'director') this.setDirector(false);
      this.onUserTakeover?.();
    });
    this.mode = 'free';      // free | director
    this.focusTarget = null; // 跟随目标（返回 [x,y,z] 的函数）
    this.lastPos = presets[0].pos.slice();
    this.lastTarget = presets[0].target.slice();
  }
  applyPreset(id) {
    const p = this.presets.find(x => x.id === id) || this.presets[0];
    this.camera.position.set(...p.pos);
    this.controls.target.set(...p.target);
    this.lastPos = p.pos.slice();
    this.lastTarget = p.target.slice();
    this.controls.update();
    return p;
  }
  setDirector(on) {
    this.mode = on ? 'director' : 'free';
    this.controls.autoRotate = !on && !this.userTouched;
    this.userTouched = false;
  }
  /** 按钮缩放：沿着当前视线方向拉近/推远（保持自动导览与自由模式都能用） */
  zoomBy(factor) {
    const c = this.camera, t = this.controls.target;
    const dir = c.position.clone().sub(t);
    const len = clampNum(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    c.position.copy(t).add(dir.setLength(len));
    this.controls.update();
    this.lastPos = c.position.toArray();
    return len;
  }
  get directorOn() { return this.mode === 'director'; }
  // 导演机位表：每阶段一个机位，切换时按 0.28 的阶段比例平滑过渡；动态阶段可跟随主体
  directorPose(stageIndex, stageProgress) {
    const poses = this.presets.length ? this.presets : [{ pos: [10, 8, 12], target: [0, 2, 0] }];
    const a = poses[stageIndex % poses.length], b = poses[(stageIndex + 1) % poses.length];
    const blend = smoothstep(Math.max(0, stageProgress - 0.72) / 0.28);
    const pos = [lerp(a.pos[0], b.pos[0], blend), lerp(a.pos[1], b.pos[1], blend), lerp(a.pos[2], b.pos[2], blend)];
    const target = [lerp(a.target[0], b.target[0], blend), lerp(a.target[1], b.target[1], blend), lerp(a.target[2], b.target[2], blend)];
    return { pos, target };
  }
  update(stageIndex, stageProgress) {
    if (this.mode === 'director') {
      const pose = this.directorPose(stageIndex, stageProgress);
      this.lastPos = pose.pos.slice();
      this.lastTarget = pose.target.slice();
      this.camera.position.set(...pose.pos);
      this.controls.target.set(...pose.target);
    } else if (this.focusTarget) {
      const t = this.focusTarget();
      if (t) {
        const delta = [t[0] - this.controls.target.x, t[1] - this.controls.target.y, t[2] - this.controls.target.z];
        this.controls.target.x += delta[0] * 0.06;
        this.controls.target.y += delta[1] * 0.06;
        this.controls.target.z += delta[2] * 0.06;
        this.camera.position.x += delta[0] * 0.06;
        this.camera.position.y += delta[1] * 0.06;
        this.camera.position.z += delta[2] * 0.06;
      }
    }
    this.controls.update();
  }
  dispose() { this.controls.dispose(); }
}
