# 开发与扩展

## 数据流
来源元数据 → 来源ID映射 → 营地与策展问答 → 本地检索 / 资料馆。主题定义 → world geometry → SVG场景和DOM节点 → 沿路径移动。用户操作 → activity reducer → 实验验证 → quiz确认 → completeNode → 持久化receipt → 动画与下一站。

原生ES模块可从 `/source` 打开。`scripts/build.mjs` 按确定的模块图去掉静态导入/导出并合入闭包；它不是通用打包器，新增模块需要在脚本列表中按依赖顺序登记，避免顶层同名变量。不要运行时加载不受信任脚本。

## HTTP接口
- `GET /api/status`：模型配置是否存在，不返回密钥。
- `GET /api/knowledge`：实际知识库审计和数量。
- `GET /api/sources?q=加缪&topic=existentialism&kind=zhihu`：本地元数据搜索。
- `POST /api/query`：`{question,topic?}`，本地策展检索，未匹配返回 `ok:false`。
- `POST /api/generate`：`{topic,preferences}`，需配置模型。只发主题、偏好和少量相关资料元数据；最多五层既定结构，校验外部返回并过滤来源ID。

本地知识功能在离线HTML里直接调用同一套函数，不需要这些API。服务器接口用于之后的接入与调试。这里没有知乎代理、登录绕过、真实用户画像或任意网页抓取。

## 添加新主题
1. 在content加入5站，逐站添加原创导读、问题、答案索引、资料ID。
2. 在knowledge添加真实来源及访问范围，更新NODE_SOURCES与TOPIC_LABELS。
3. 在activities定义有意义的操作、默认态和完成条件，在activity-engine实现纯状态变化。
4. 在worlds增加坐标、路径、地形与交通；路径和节点必须一起设计。
5. 在知识引擎加入策展问答、概念及跨主题联系；新增source只算条目，不自动等于已建立知识。
6. 测试未完成不能解锁、操作后实际数值改变、保存/恢复、减少动画、手机、来源不足和空态。

## 生产部署前
有权使用的内容获取、用户同意、来源更新/删除机制、鉴权、费用/请求预算、持久化限流、日志隐私、CSP和安全审查都还需要按部署环境补齐。`.env`不能静态发布。教学沙盒不执行对外写入；将来接邮件等工具必须增加真实授权和用户确认。
