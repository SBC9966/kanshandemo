# 看山不是山 · 交接说明（给下一个继续做的 AI）

> 工程路径：`C:\Users\SZC\XiaomiMiMoProjects\.mimo-sessions\2026-09-14\完善一下ui设计，目前ai味浓，\ksbss\shan-demo-v2`
> 原始来源：用户 zip `看山不是山_Demo_v2.0_完整工程.zip`
> 交接日期：2026-09-14
> 状态：可运行；41 项 domain 测试全过；知乎开放平台已接入；已扩到 6 座山 + 程序化 3D 场景

---

## 1. 这是什么

离线优先的知识考察 Demo：用户选一座「山」，沿五层营地（认识 → 背景 → 核心 → 分歧 → 延伸）向上走。每层有阅读、可选互动实验、理解确认。资料馆挂真实知乎问题/专栏入口与公开参考页。

- 纯前端 + 本地 Node 静态/代理服务
- **无 npm 依赖**；`dist/index.html` 为自包含成品（插画/脚本/样式内嵌）
- 构建：`node scripts/build.mjs`（会改写 `dist/index.html` 与 `index.html`）
- 启动：`node server/index.mjs` → `http://localhost:8787`
- 开发入口：`source.html` + `/src/*.mjs` 原生 ES modules

---

## 2. 本轮已完成的改动（按时间）

### 2.1 UI 去 AI 味（第一轮）

用户原话：「完善一下ui设计，目前ai味浓」。

| 改动 | 说明 |
|---|---|
| 英文营销眉题中文化 | `THREE TERRAINS…`、`READ. ACT. CHECK…`、`THE SOURCES BEHIND…` 等 → 中文 |
| 色板 | 纸色 `#f8f6ef` → `#f3f1ea`；主青加深 `#1f4d43`；印章改暗朱砂 |
| 圆角/阴影 | 按钮/卡片圆角收到 6–8px；去掉浮起 hover |
| 装饰降噪 | 水彩透明度、小羊饱和度、红印章亮度下调 |
| 视觉覆盖层 | 文件末尾 `styles-v2.css` 的「FIELD ATLAS REFINEMENT / De-cute」段 |

**未做完**：小羊吉祥物与水彩全景背景仍在；下一轮可考虑线稿行者 + 等高线，整套去掉可爱插画。

### 2.2 知乎开放平台接入

黑客松文档（飞书）要点：安装 zhihu-cli skill，用 Access Secret 调开放平台。

已完成：

1. Skill 安装到 `C:\Users\SZC\.claude\skills\zhihu`
2. CLI 装到 `%LOCALAPPDATA%\ZhihuCLI\current\zhihu-cli.exe`
3. Secret 已写入工程根目录 **`.env`（已在 .gitignore，勿提交）**：`ZHIHU_API_KEY=...`
4. 服务端代理 `server/zhihu.mjs`，路由：
   - `GET /api/zhihu/status`
   - `GET /api/zhihu/search?q=&count=`
   - `GET /api/zhihu/hot?limit=`
   - `GET /api/zhihu/answers?question=&limit=`
   - `GET /api/zhihu/quota`
5. `GET /api/status` 增加 `zhihu` 字段
6. 资料馆底部「实时搜知乎」UI（`pages-v2.mjs` + `main.mjs` 的 `runZhihuLiveSearch`）

注意：

- 密钥**不要**写进仓库、日志或回复正文
- 该账号额度偏紧（约搜索 10/日、热榜 2/日）；`zhihu.mjs` 有内存缓存 + 分钟级限流
- 前端只拿脱敏后的 `title/type/author/excerpt/url/votes`

### 2.3 三座新山 + 知识库扩展

依据团队讨论 transcript（`C:\Users\SZC\WorkBuddy\2026-09-12-23-38-30\transcript.txt`）中的升级方向：

- 五层爬山，不是刷热搜
- 细分领域先跑通
- **梗文化不适合垂直山，用群岛/漂流**

新增：

| id | 标题 | 地形名 | 知识形状 |
|---|---|---|---|
| `cognitive-biases` | 认知偏差 | 雾林辨径 | 雾中爬坡 |
| `ethics-intro` | 伦理入门 | 岔路盘山 | 每站一个岔口 |
| `meme-culture` | 迷因群岛 | 迷因群岛 | 横向漂流，不是登顶 |

涉及文件：

- `src/data/knowledge.mjs`：新来源（知乎 Z + 公开 P）；`NODE_SOURCES`；`TOPIC_LABELS`
- `src/data/content.mjs`：三座 `MOUNTAINS` 五层内容
- `src/worlds.mjs`：三套 `WORLD_DEFINITIONS` 坐标/路径/交通

当前统计（`knowledgeStats()`）：

- sources **49**（zhihu 33，readable 16）
- units 30（原 15 营地实验仍只覆盖原三山；新山目前是阅读 + 理解确认，无手工实验）

### 2.4 程序化 2D 场景层

`src/worlds.mjs` 新增（`terrainScene` 内注入）：

- `proceduralScenery`：远山剪影、沿路径等高线、种子散布树/石/苇
- 分世界天气：雾林漂移雾团、伦理尘埃与岔路符、迷因潮汐环与浮标
- CSS：`styles-v2.css`「Procedural scenery layers」
- 山页「换一茬场景」按钮：`data-action="proc-reseed"` → `ctx.ui.sceneSeed`

### 2.5 程序化 3D 场景

**零依赖**软件渲染 Canvas（故意不用 three.js，保持离线自包含）。

- 新文件：`src/scene3d.mjs`
  - `buildHeightfield`：由五站路径点 + 多倍频值噪声 + 脊线/峰顶偏置生成高度场
  - `Scene3D`：画家算法四边形、沿坡着色、路径丝带、站点图钉、程序化植被
  - 交互：拖动旋转、滚轮缩放、自动环绕；`reseed()` 重生
  - `mountScene3D(container, plan, options)`
- 山页切换：工具栏山形按钮 `data-action="scene3d-toggle"`
- 深链：`#/mountain/<id>/3d`（`route()` 里 `parts[2]==='3d'`）
- 构建：`scripts/build.mjs` 的 `modules` 数组已加入 **`scene3d.mjs`**（漏了会丢进 dist）

### 2.6 测试与兼容修复

- `defaultActivity(null)` 空安全（`src/data/activities.mjs`）
- `tests/v2-domain.test.mjs`：不再硬编码 36/15/3 山；无活动的山跳过实验循环；来源使用数改为 `KNOWLEDGE_SOURCES.length`
- 结果：**41 pass / 0 fail**

---

## 3. 必须知道的工程约束

1. **`scripts/build.mjs` 的 `modules` 是手写列表**。新增 `src/*.mjs` 且被 `main.mjs` 引用时，必须加进该数组；构建会剥掉 `import/export`，全部拼进一个 IIFE 风格脚本。
2. 样式有两份：`styles.css` + `styles-v2.css`；本轮大量覆盖写在 v2 末尾，**新样式优先追加到 v2 末尾**，避免去改巨型压缩段落。
3. `pages.mjs` / `styles.css` 很多单行压缩，改 DOM 结构时用**精确子串替换**，不要整文件重排。
4. 路由是 hash：`#/`、`#/library`、`#/mountain/:id`、`#/mountain/:id/3d`、`#/read/:id/:node` 等，见 `main.mjs` `route()`。
5. 离线 HTML 不依赖服务器；知乎代理仅在 `node server/index.mjs` 时可用。
6. 中文路径：PowerShell/Python 读文件用 UTF-8；部分 Read 工具对含中文路径不稳定，可复制到 ASCII 临时目录再读截图。

---

## 4. 常用命令

```powershell
cd "<工程根>"
node scripts/build.mjs          # 只重建前端
node server/index.mjs           # 8787
node --test tests/v2-domain.test.mjs
# 可选：知识审计
npm run audit
```

验证 3D（服务已启动时）：

`http://localhost:8787/#/mountain/cognitive-biases/3d`

---

## 5. 建议的下一步（按优先级）

1. **新山手工实验**：三座新山目前无 `ACTIVITIES`；可复用 classify/sequence/lenses 样式做偏差分类、伦理原则对照、迷因变体排序。
2. **迷因群岛非线性**：现在仍是 5 站顺序解锁；讨论要求「群岛漂开」——可做多岛并行入口、船票式解锁，而非严格 prerequisite 链。
3. **信息找人**：首页按兴趣/知识向导把六座山编成推荐流（transcript 核心），不要仍是对称三卡。
4. **3D 航拍**：`Scene3D` 支持 `setCompleted`；可做走到第 N 站时相机飞到该点，并挂该站装置（雾室/岔路/浮标）。
5. **UI 去 AI 味第二轮**：去小羊、重做水彩为等高线/印刷质感、方法区去掉 01/02/03 图标卡。
6. **知乎额度**：产品化前加服务端缓存落盘、失败降级文案；勿把 secret 前端化。
7. **OAuth**（黑客松加分）：见 skill 内 `references/hackathon-oauth.md`，需另配 `oauthAppID/AppKey` 与回调。

---

## 6. 关键文件地图

```
shan-demo-v2/
  .env                         # ZHIHU_API_KEY（本地，勿提交）
  .env.example                 # 含 ZHIHU_API_KEY 说明
  dist/index.html              # 自包含成品
  scripts/build.mjs            # modules 列表在这里
  server/index.mjs             # 静态 + /api/* + zhihu 路由
  server/zhihu.mjs             # 开放平台代理
  src/
    scene3d.mjs                # 本轮新增 3D
    worlds.mjs                 # 地形 + 程序化 2D 层 + 6 套 WORLD_DEFINITIONS
    pages.mjs / pages-v2.mjs   # 页面 HTML
    main.mjs                   # 路由/交互/3D 挂载
    styles-v2.css              # 末尾为本轮视觉与 3D 样式
    data/knowledge.mjs         # 来源 + NODE_SOURCES
    data/content.mjs           # MOUNTAINS 六山
    data/activities.mjs        # 原三山实验
  tests/ui-pass/               # 本轮截图（home-final、scene3d-final、map-*）
  tests/v2-domain.test.mjs     # 已按 6 山调整
```

用户讨论记录（产品方向，非代码）：`C:\Users\SZC\WorkBuddy\2026-09-12-23-38-30\transcript.txt`

---

## 7. 一句话给下一个 Agent

先 `node scripts/build.mjs && node server/index.mjs`，打开首页与 `#/mountain/cognitive-biases/3d` 确认基线；改视觉继续贴「山水志/考察手记」方向；扩山必须同步 `knowledge.mjs` / `content.mjs` / `worlds.mjs` / `build.mjs` modules 四处；有活动就进 `activities.mjs` 并保证 `validateKnowledge().ok === true`。
