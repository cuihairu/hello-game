# hello-game 文档目录与内容组织审计

审计日期：2026-10-19。范围：仓库当前 `docs/` Markdown、`docs/.vitepress/config.mjs` 侧边栏、仓库根目录 Markdown。统计在新增本报告前完成，报告本身不计入基线。工作区原有 `HistoryTimeline.vue` 未提交修改不属于本次审计。

## 第一节：量化事实

### 1.1 `docs/` 一级目录数量与行数

| 一级目录 | Markdown 数 | 总行数 |
|---|---:|---:|
| (根目录) | 2 | 259 |
| `00-reading-guide/` | 5 | 333 |
| `24-game-types-architecture/` | 29 | 19,738 |
| `90-appendix/` | 5 | 423 |
| `client/` | 18 | 2,602 |
| `database/` | 10 | 1,162 |
| `design/` | 8 | 831 |
| `games/` | 1 | 50 |
| `glossary/` | 12 | 1,120 |
| `history/` | 3 | 779 |
| `industry/` | 32 | 3,664 |
| `networking/` | 15 | 2,726 |
| `numerical/` | 9 | 662 |
| `operation/` | 14 | 1,615 |
| `production/` | 19 | 2,209 |
| `research/` | 5 | 347 |
| `server/` | 39 | 7,126 |
| `system/` | 27 | 3,324 |
| **合计** | **253** | **48,970** |

说明：按 Markdown 文件换行拆分计行；不含 SVG、Vue、配置和本报告。`24-game-types-architecture/` 一树占约 40% 文档行数，是教程主线内容量明显大于其余单树的直观来源。

### 1.2 并行组织轴

按“读者从什么入口找内容”归纳，当前有 **8 套组织轴**，不是 8 棵互不相关的树；它们有交叉引用，也有并列导航入口。

| 组织轴 / 代表目录 | 条目数 | 命名规律 | 是否编号 | 编号连续性 |
|---|---:|---|---|---|
| 教程主线 `24-game-types-architecture/` | 27 个编号篇目 + `index.md`、`expansion.md` | 两位数字 + 英文 slug；另有专题扩展 | 是 | 01–27 连续；目录名“24”与篇数不符 |
| 知识库学科/工程域主树（`industry/`、`networking/`、`server/`、`system/` 等） | 14 个主要一级内容域（含 `design`、`games`、`history`、`research` 等） | 英文主题目录；有的按子树拆分 | 不统一 | 主树不适用；子目录多数采用独立连续编号 |
| 编号子章节（如 `server/sync/`、`client/web/`） | 28 组连续编号序列 | 子目录内 `01.md`…；少数从 `00.md` 起 | 是 | 28 组均无缺号；`industry/models`、`server/runtime` 从 00 起，其余从 01 起 |
| 阅读指南 / 术语入口（`00-reading-guide/`、`glossary/`） | 4 篇指南 + 11 篇术语 | 前者有 `00-` 目录前缀，后者无 | 部分 | 01–04、01–11 连续 |
| 问题模型与问题域（`industry/models/`、`design/problem-domains/`） | 9 篇模型 + 6 篇问题域速查 | 一处 00–08，一处 01–06；主题交叉但用途不同 | 是 | 各自连续 |
| 历史时间线（`history/`） | 3 篇（index、design、nodes） | 英文主题名，无序号 | 否 | 不适用 |
| 调研 / 来源审计（`research/`） | 4 篇编号报告 + index | 两位数字 + 英文 slug | 是 | 01–04 连续 |
| 附录与游戏索引（`90-appendix/`、`games/`） | 附录 4 篇编号 + index；游戏库 1 篇 index | 附录用 `90-` 前缀及序号，游戏库无序号 | 部分 | 附录 01–04 连续 |

“28 组”编号序列由脚本逐目录抽取仅匹配 `数字.md` 的文件计算；教程 `01-entry.md` 等另按有数字前缀文件名核对。将编号视作各自目录内的局部序号时，没有发现断档、跳号或同一序列内重复。不同目录重复使用 `01` 是各自章节编号，并非冲突。

### 1.2.1 带数字前缀文件名清单（按目录、数值排序）

共 **189 个**。以下为脚本抽取的完整文件名清单；除教程及调研树使用数字加 slug 外，其余多为两位编号文件。

| 目录 | 文件名（升序） |
|---|---|
| `00-reading-guide/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `24-game-types-architecture/` | `01-entry.md`、`02-game-design.md`、`03-frontend-engines.md`、`04-network.md`、`05-concurrency-models.md`、`06-frameworks.md`、`07-core-arch.md`、`08-data-storage.md`、`09-programming-patterns.md`、`10-gameplay-systems.md`、`11-auxiliary-systems.md`、`12-data-analytics.md`、`13-tech-ops.md`、`14-dev-organization.md`、`15-references.md`、`16-scripting-hotfix.md`、`17-versioning-release.md`、`18-security-compliance.md`、`19-client-architecture.md`、`20-game-testing.md`、`21-art-audio-pipeline.md`、`22-matchmaking-oss.md`、`23-matchmaking-architecture.md`、`24-entity-sync-persistence.md`、`25-entity-db-mapping-philosophy.md`、`26-mmo-engine-survey.md`、`27-mmo-engine-design-highlights.md` |
| `90-appendix/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `client/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md` |
| `client/engines/` | `01.md`、`02.md`、`03.md` |
| `client/web/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `database/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `database/cache/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `design/problem-domains/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `glossary/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md`、`08.md`、`09.md`、`10.md`、`11.md` |
| `industry/genres/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `industry/methodology/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md` |
| `industry/models/` | `00.md`、`01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md`、`08.md` |
| `industry/platforms/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `networking/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md` |
| `networking/ipc/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `numerical/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md`、`08.md` |
| `operation/bi/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md` |
| `operation/observability/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `production/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md` |
| `production/config/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `production/retro/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md` |
| `research/` | `01-authoritative-books.md`、`02-engine-middleware-docs.md`、`03-application-scenarios.md`、`04-coverage-diff.md` |
| `server/capacity/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `server/runtime/` | `00.md`、`01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md` |
| `server/security/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md` |
| `server/services/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md` |
| `server/sync/` | `01.md`、`02.md`、`03.md`、`04.md`、`05.md`、`06.md`、`07.md`、`08.md` |
| `system/scripting/` | `01.md`、`02.md`、`03.md`、`04.md` |
| `system/services/` | `01.md`、`02.md`、`03.md`、`04.md` |

### 1.3 编号文件抽取与异常编号

按文件名数字前缀排序后，教程目录有 `01`–`27`；其余编号文件构成上表 28 组目录局部序列，均连续。**没有断档或重复编号异常**。需要解释的编号异常是“标签不匹配”：`24-game-types-architecture/` 实际有 27 个编号篇目，而 README 仍将其描述为 21 讲，侧栏也按 21 讲分段并继续列 22–27。证据：[`config.mjs:31-33`](../.vitepress/config.mjs)、[`config.mjs:96-104`](../.vitepress/config.mjs)、[`README.zh.md:67-92`](https://github.com/cuihairu/hello-game/blob/main/README.zh.md)。目录名本身是否代表曾规划 24 篇，无法仅凭当前文件核实。

### 1.4 侧边栏、死链与孤儿

| 检查项 | 结果 |
|---|---|
| 侧边栏链接目标 | 从 `sidebar` 对象抽取 421 个链接（244 个唯一目标），**配置了但目标文件不存在：0**。 |
| Markdown 相对/站内链接 | 对 `docs/**/*.md` 标准 Markdown 链接做本地目标检查，未发现目标缺失。此脚本不验证网页外链可达性、锚点存在性、Vue 模板动态链接或所有 HTML 链接，不能据此声称全站无死链。 |
| 不在侧边栏但被 Markdown 链接的文件 | 6 个：`docs/design/index.md`、`docs/history/design.md`、`docs/history/nodes.md`、`docs/industry/index.md`、`docs/operation/index.md`、`docs/server/index.md`。它们并非孤儿，均有正文入口或被父页引用。 |
| 孤儿文件 | 在可检查的本地 Markdown 引用图中，未发现既不进侧边栏、也无入链的 Markdown 文件。外部搜索引擎或站外链接未纳入。 |

侧栏配置有两个主要入口（教程前缀与其余知识库路径），与配置注释一致，参见 [`config.mjs:31-35`](../.vitepress/config.mjs)。主要差异不是坏链，而是部分概览/历史支持页不在侧栏中；例如 `history/index.md` 明确链接设计稿和节点清单 [`history/index.md:18-20`](../history/index.md)，而侧栏只提供历史线导航入口 [`config.mjs:26-28`](../.vitepress/config.mjs)。

### 1.5 根目录与非 docs 文件

仓库根目录有 `README.md`（英文）和 `README.zh.md`（中文），属于语言版本，并非重复 README。`orleans/` 是嵌入的独立上游项目，有自己的 `README.md`、贡献指南等，不应算作 hello-game 文档散落。根目录未发现临时 `.tmp`、备份 `~` / `.bak` 文件。当前可见的非 docs Markdown 集中在两个 README 和 `orleans/` 上游项目；`docs/` 内教程扩展台账 `expansion.md` 不是 Markdown 编号篇，作为规划记录存在。

## 第二节：问题清单

### P1. 主题跨轴重复，读者难判断权威页面（严重度：高）

同一主题被教程、行业问题模型、设计问题域、工程专题多次讲到，交叉引用存在，但入口没有统一说明“概念定义 / 推导 / 速查 / 实现”各由哪页负责。匹配是直观例子：教程有“匹配选型”和“匹配架构落位” [`config.mjs:99-100`](../.vitepress/config.mjs)，系统域又有队伍匹配、PVP 匹配 [`config.mjs:212-213`](../.vitepress/config.mjs)；房间/对战问题也同时出现在模型篇与速查篇，且速查页说明其为横向版本 [`design/problem-domains/01.md:10-16`](../design/problem-domains/01.md)、[`design/problem-domains/06.md:53-65`](../design/problem-domains/06.md)。**判断：**交叉本身合理，但当前“谁是规范展开、谁是摘要”主要靠读者自行推断，增加找资料和维护成本。

### P2. 导航与文件树是不同信息架构，部分索引页隐身（严重度：中）

侧栏整体目标存在（421 个链接、244 个唯一目标，目标文件均存在），但 6 篇文件不在侧栏，其中包含 4 个域概览页和 2 篇历史支持文档。比如 `industry/index.md` 自述分工并列出四棵子树 [`industry/index.md:5-21`](../industry/index.md)，`design/index.md` 解释问题模型与问题域关系 [`design/index.md:5-15`](../design/index.md)，但读者要从站内侧栏进入时看不到这些总览。历史设计稿和节点清单则由时间线正文链接而非侧栏访问 [`history/index.md:18-20`](../history/index.md)。前两者是导航缺口；后两者作为附属材料不进侧栏可以是合理取舍。

### P3. 历史说明与当前目录脱节（严重度：中）

项目 README 一处仍描述旧的一级目录（如 `economy/`、`art/`、`audio/`、`tools/`），而当前 `docs/` 一级目录统计中没有这些目录；同一 README 后文已描述教程与知识库并行及编号章目录不一一对应 [`README.zh.md:48-62`](https://github.com/cuihairu/hello-game/blob/main/README.zh.md)、[`README.zh.md:67-122`](https://github.com/cuihairu/hello-game/blob/main/README.zh.md)。这是迁移过程留下的读者预期冲突，不等于这些领域完全没有内容（它们可能并入其他树），应先明确旧分类与现有落点的对应关系。

### P4. 命名约定有多套、个别规模标签过期（严重度：中）

目录名有 `00-`、`24-`、`90-` 数字前缀，也有 `server/`、`history/` 等纯英文主题名；子篇有 `01.md` 这种纯编号、`01-slug.md`、纯语义名（`aoi.md`、`career.md`）三种；英文 slug 大小写混合，如 `mmo-engine-survey.md` 与 `Epoch-driven Actor / Channel Runtime`（侧栏标题）[`config.mjs:159`](../.vitepress/config.mjs)。中英文并用主要出现在标题/slug，而目录名整体英文。最明显的约定漂移是 `24-` 名称与 27 篇，以及 README/注释的“21 讲”过期 [`README.zh.md:67-92`](https://github.com/cuihairu/hello-game/blob/main/README.zh.md)、[`config.mjs:31-33`](../.vitepress/config.mjs)。**判断：**文件命名风格不一致确实增加猜路径成本；但两种语言的标题、外来语和数字序号本身是内容属性，不宜机械统一。

### P5. 内容量和侧栏重复使“看起来很多”加重（严重度：中）

教程目录有 29 个 Markdown、19,738 行，占全 docs 行数约 40%；顶部总览页本身也是长篇内容（`24-game-types-architecture/index.md` 共约 400 行）。侧栏另将教程编号组织为 21 讲注释及多个分组，并在根知识库下重复一部分工程树链接（例如 server 内容在 `'/server/'` 和 `'/'` 两个侧栏定义中都有），见 [`config.mjs:31-35`](../.vitepress/config.mjs)、[`config.mjs:109-194`](../.vitepress/config.mjs)、[`config.mjs:545-620`](../.vitepress/config.mjs)。双入口可以降低“教程/参考”切换成本，但当前 README 旧目录说明、两份侧栏和多套主题入口叠加，容易让人以为存在数套完全独立的知识库。

### P6. 侧栏目标检查通过，但不能等同于链接质量全通过（严重度：低）

脚本没有发现配置目标丢失或常规 Markdown 链接本地目标缺失。脚本范围不含锚点、外网可用性、动态 Vue 链接及全部 HTML 引用；故这是“未发现”，不是对全站链接的绝对保证。侧栏中未直接展示的 6 篇文件有入链，不是死文件。证据入口见 [`config.mjs:26-35`](../.vitepress/config.mjs)、[`history/index.md:18-20`](../history/index.md)。

## 第三节：判断与推荐

### 现在有几套组织轴，应收成几套

现状是 **8 套可识别的组织轴**（见第一节），核心导航体验实际是 **2 套主线 + 2 个横向入口**：教程、知识库、历史线、游戏库；其余指南、术语、研究、附录是知识库的辅助入口。仓库配置本身也明确说明“两套内容、两个侧边栏” [`config.mjs:31-33`](../.vitepress/config.mjs)，README 把历史线与游戏库定位为横向入口 [`README.zh.md:67`](https://github.com/cuihairu/hello-game/blob/main/README.zh.md)。

**建议长期收口为 3 个用户入口，而不是把全部文件硬并成一条目录树：**

1. **学习路径**：保留教程路线，作为按顺序学习的编排层。
2. **主题知识库**：作为唯一的主题分类与权威内容落点；问题模型、工程域、数值等在这里有明确边界。
3. **探索索引**：历史、游戏案例、术语、阅读指南作为知识库的横向索引/工具入口，不建立与主题树竞争的“第二套正文分类”。

这比强行统一所有目录编号更合适：教程回答“怎么学”，知识库回答“按主题查什么”，历史和游戏库提供时间/案例视角，读者任务不同。问题不在于轴多本身，而在轴间的权威归属和导航优先级未清楚表达。

### 真乱与看起来多但合理

**真乱：**旧 README 一级树说明与当前实目录不同；`24-`、21 讲、27 篇三种规模口径冲突；主题重叠时权威页与摘要页边界不显眼；几个有用的域总览未进侧栏；同一主题会在教程、学科树、问题模型/问题域之间跳转。

**看起来多但合理：**序号在独立子目录重复是局部章节号，28 组都连续；英文路径配中文标题利于稳定 URL 与中文阅读；历史设计稿和节点清单通过时间线页链接访问是辅助材料的合理形态；教程与知识库并行不必合并，因为前者是线性课程、后者是查阅导航；英语/中文两份根 README 不是重复文件。

### 严重度汇总

| 严重度 | 事项 | 理由 |
|---|---|---|
| 高 | 主题重复而权威边界不明确 | 让读者难以选入口，增加后续内容重复维护和相互漂移概率。 |
| 中 | README 旧树与当前实树不一致 | 新读者会按不存在的目录理解内容布局。 |
| 中 | 编号/篇数标签陈旧、命名约定不一 | 路径预测和侧栏核对困难；但编号本身没有缺号。 |
| 中 | 域概览不进侧栏、侧栏并行映射复杂 | 用户能通过正文入链抵达，但发现性弱，维护者要理解两套映射。 |
| 低 | 文件不在侧栏或标准死链检查的残余盲区 | 当前六个非侧栏文件有入链；脚本覆盖之外仍需构建/站点级检查。 |

## 第四节：三期收口方案

以下是建议方案，本次审计不执行任何结构调整。

### 一期：不破坏链接的机械整理（估计 1 小时内）

| 动作清单 | 影响范围 | 风险 |
|---|---|---|
| 将 README 目录树更新为当前真实目录，旧分类注明并入落点；统一“教程篇数”描述，或改成“01–27 篇”并说明 22–27 为扩展。 | `README.md`、`README.zh.md`、教程注释/索引说明。 | 不改路径，外链与搜索 URL 不受影响；风险低。需先对“21 讲”是否要扩容口径做编辑判断。 |
| 补充一页维护约定：编号只在目录内连续、index 的角色、slug 规则、权威页/摘要页标注规则；不批量重命名文件。 | 可放在项目维护文档或 README。 | 不动现有路由，低风险；此项不应额外制造第四种内容入口。 |
| 为问题模型/问题域速查页统一明确“总结页/展开页”的互链措辞；先只补说明和返回链接。 | `industry/models/`、`design/problem-domains/`、教程相关入口。 | 只增站内链接，低风险；要防止把合理摘要误判为重复而删内容。 |
| 给 `industry/index.md`、`design/index.md` 等总览页增加可见入口说明；确认 `operation/index.md`、`server/index.md` 是否要作为导航页。 | 侧栏说明文字或首页入口文案，不移动文件。 | 低风险，无 URL 变化。 |

### 二期：侧边栏与重定向结构调整

| 动作清单 | 影响范围 | 风险 |
|---|---|---|
| 按“学习路径 / 主题知识库 / 探索索引”重排主导航与根侧栏，避免两份列表对同一域重复展开；把重要域 overview 纳入恰当位置，历史支持文档保持从时间线正文访问。 | `docs/.vitepress/config.mjs`、`docs/index.md`、README 导航说明。 | 侧栏顺序改变不改 URL；用户书签仍可用，搜索收录通常不受路径影响。若增加或移除菜单入口，站内可发现性有变化。 |
| 在主题入口显式注明教程内容与知识库的关系（对应、补充、摘要、权威展开），必要时在每树 index 放映射表。 | 教程 index、知识域 index、阅读指南。 | 内容链接增补风险低；需要维护对应关系，避免映射表再次漂移。 |
| 若需把旧主题路由重定向到新位置，先保留旧文件为兼容页或使用 VitePress 重定向，再逐步更新站内引用。 | 旧路径页、VitePress 配置及内链。 | 改 URL 会影响外链、书签和搜索引擎收录；需用户拍板。不得仅因目录更整齐就直接改 URL。 |

### 三期：深度重构（必须用户拍板）

| 动作清单 | 影响范围 | 风险 |
|---|---|---|
| 对高重叠主题做“权威正文 + 短摘要/索引”合并评估，例如匹配、客户端架构、问题模型与问题域；逐条确认删除或保留的独特内容。 | 教程、`system/`、`industry/`、`design/` 多处文档与互链。 | 删除/合并章节可能损失独立受众与搜索落点；**删除章节、合并主题必须用户拍板**。 |
| 重新决定 `24-game-types-architecture/` 是否更名或去掉数字前缀，并确定章节是否继续作课程。 | 整棵教程目录、侧栏、README、内链。 | **目录改名即 URL 变化，必须用户拍板**；即便设重定向，也涉及外链和搜索权重。 |
| 决定旧教程主线与知识库是否长期并行；若课程仅作知识库的学习视图，可改为目录/播放列表而不是重复正文。 | 可能影响教程多篇内容、部署页数和站点导航。 | 大范围合并有内容与链接风险；必须先逐篇确认内容归属，不能做机械删除。 |

### 必须用户拍板的事项

- 删除任一现有章节或历史/研究支持材料。
- 将多个主题正文合并、指定单一权威版本并把其他版本降为摘要。
- 更改目录名、slug 或 URL（包括是否接受重定向、旧路径保留多久）。
- 将“教程 21 讲”正式改为 27 篇课程，或把 22–27 重新定位为非课程扩展。

### 最该先做的三件事

1. **修正 README 与配置注释的现状口径**：解释旧分类去向，并解决 21 讲 / 27 篇 / `24-` 命名冲突，不改 URL。
2. **明确跨轴的权威边界**：至少对匹配、问题模型/问题域、客户端架构建立“教程学习 / 知识库展开 / 速查摘要”的映射，先补说明和互链，不删内容。
3. **重排导航发现路径**：让重要总览页从侧栏或首页可达；把历史节点、设计稿等支持文档继续作为时间线的二级材料，不把所有文件一股脑塞入侧栏。

## 结论

当前目录的主要混乱来自多入口之间缺少清晰的内容职责说明和维护口径，并非编号大量出错或链接普遍损坏。建议保留教程、主题知识库、探索索引这三种使用视角，以权威归属、导航层级和迁移说明收口；删除/合并与 URL 改动留到逐项评审并由用户拍板。

## 第五节：重构执行记录

执行日期：2026-10-19。依据本次重构任务的定位要求，对第三节推荐作如下修订：**不采用“学习路径”作为组织主轴，也不把编号专题笔记描述为课程。** 内容入口按“主题 + 内容类型”说明；同主题的不同角度通过短说明与互链并存。文件和 URL 均保留。

### 5.1 重复判定与处理

| 对照组 | 判定 | 文本证据与处理 |
|---|---|---|
| `23-matchmaking-architecture.md` 内部重复尾段 | **真重复，1 组** | 处理前正文与尾段的同一行均为“独立 Session Coordination Service | Party、队列、匹配决策、房间分配、会话生命周期”（处理前 `23:30-43` 与 `23:373-386`）；`type RoomAllocator interface` 与完整策略 YAML 也在正文与尾段重复。现已收敛到一份完整正文，保留接口、原子预留、策略配置、状态机及实施建议；重复尾段改由简介互链承接。现文证据：`23-matchmaking-architecture.md:22-43`（职责表）、`:45-184`（策略、接口与房间分配）。 |
| `22-matchmaking-oss.md`、`23-matchmaking-architecture.md`、`system/party-matchmaking.md`、`system/pvp-matchmaking.md` | **不同角度，1 组，四页全部保留** | 对照原文：22 写“先确认自己缺的是组队、匹配、分配还是进服”，并比较 Nakama / Open Match / Agones / Colyseus 的环节；23 写“固定协议 + 可配置策略 + 可替换适配器”，展开职责表、`AllocationRequest`、席位原子预留和失败恢复。system 两篇分别从“队伍是撮合的原子单位”（party:11）与“评分体系与匹配池两层系统”（pvp:11）展开。关注对象和结论不同，不合并正文；四页互链并注明角度。 |

因此，重复收敛 **1 组**（仅 23 页内重复尾段），不同角度保留 **1 组四页材料**；没有将 22 与 23 或 system 两篇合并。

### 5.2 入口文案与口径

- `README.zh.md:16,26-34`：定位改为个人开发笔记与经验，说明按主题和记录类型整理；去掉旧的“知识图谱节点格式 / 适读人群清单”教学式说明。
- `README.zh.md:38,57,61,65-106`：目录树只列当前存在目录；说明 27 篇编号专题笔记、两种入口各有侧重；明确 `24-` 是保留的目录名和 URL 前缀，不代表篇数；主题树改为主题摘要，不再描述为编号章节。
- `README.zh.md:119-120`：测试介绍中的“教程讲次”改为“编号专题笔记数量 / 案例检查”。英文对应项见 `README.md:16,26-34,38,57,61,65-106,119-120`。
- `docs/.vitepress/config.mjs:4-5,16`：站点名与描述改为“游戏开发笔记”。`config.mjs:18-33`：顶栏和配置注释改为主题、内容类型和案例入口；编号专题仍按既有 URL 列出。
- `config.mjs:35-105`：编号目录侧栏从“入门 / 基础 / 扩展”改为主题与记录类型分组；匹配入口改为“开源项目选型调研 / 自建架构职责与落位”。
- `config.mjs:543-563,567-809,824-894`：根侧栏去除 1–20 章节序号与 A1–A6 附录序号；“推荐阅读顺序”不再单独显示为侧栏项，相关 Markdown 文件及 URL 保留。
- 实际篇数核对：`24-game-types-architecture/` 有 27 个 `01`–`27` 编号 Markdown 文件，另有 `index.md` 与 `expansion.md`；README、侧栏注释、站点介绍统一按 27 篇描述。旧目录前缀 `24-` 未更名，URL 不变。

### 5.3 侧边栏对账

| 指标 | 审计基线 | 重构后 | 变化 |
|---|---:|---:|---:|
| 配置链接总数 | 421 | 424 | +3 |
| 全部路由配置中的唯一目标 | 244 | 247 | +3 |
| 全局合计中的跨侧栏重复 | 177 | 177 | 0 |
| 单一侧栏内重复目标 | 0 | 0 | 0 |
| 配置目标缺失 | 0 | 0 | 0 |

重构后总数净增 3：为 `server/`、`operation/`、`industry/`、`design/` 四个原本有用但未入侧栏的总览增加入口，同时把“推荐阅读顺序”从侧栏移除（文件仍保留、正文索引仍可达）。177 个跨侧栏重复是路由专用侧栏与根路径回退侧栏各自配置同一目标；VitePress 对每个路径选择对应侧栏，逐个侧栏检查均无重复，未新增此类重叠。

### 5.4 验收证据

- `pnpm docs:build`：通过（VitePress 完成 client/server 构建与页面渲染；仅有客户端 chunk 大于 500 kB 的既有提示）。
- 仓库没有 `scripts/` 目录下的独立死链检查脚本；执行了站内自扫：254 篇 Markdown、1,747 个常规 Markdown 本地链接目标，缺失 **0**；424 个侧栏目标，缺失 **0**。该自扫检查本地目标，不覆盖外网可达性、动态 Vue 链接或锚点有效性。
- `git diff --check`：通过；没有删除 Markdown 文件、改动 URL、修改松检查脚本或两个 History 时间线组件。

### 5.5 未处理与须拍板事项

- **须用户拍板：无。** 本次没有删除文件、合并独立 URL 或更改路由。
- `23-matchmaking-architecture.md` 中 Courier 支付与虚拟资产段落仍与匹配主题相邻（现文第六节），为避免丢失内容暂时保留；若以后移入商业化专题，应保留本页摘要与链接。
- 主题正文里原有的“教程第 N 讲”等历史交叉引用，以及 `00-reading-guide/01.md` 的阅读顺序正文未作全站逐句改写，按本次范围仅调整 README、站点侧栏和明显冲突的入口说明。
