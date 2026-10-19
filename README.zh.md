[English](README.md) | [中文](README.zh.md)

<div align="center">

<p align="center"><img src="docs/public/logo.svg" width="64" height="64" alt="logo" /> </p>

# 游戏开发笔记

<p align="center">
  <img src="docs/public/badges/topic.svg" alt="topic" />
  <img src="docs/public/badges/docs.svg" alt="docs" />
  <img src="docs/public/badges/license.svg" alt="license" />
  <img src="docs/public/badges/langs.svg" alt="langs" />
</p>

**面向个人开发者整理的游戏开发笔记与经验**——覆盖设计、客户端、服务器、数值、美术、工具与运营，并用成熟商业游戏和开源项目作为参照。

[快速开始](#本地开发) · [目录结构](#目录结构) · [在线阅读](https://cuihairu.github.io/hello-game/)

</div>

---

## 定位

这不是一个可运行的游戏工程，而是**个人游戏开发笔记与经验的开源整理**。内容按主题和记录类型收纳，记录查资料、看项目与做架构取舍时的观察。

- **按主题与内容类型整理**：包括机制笔记、项目调研、架构记录、实践复盘、速查和源码观察；同一主题可从不同角度记录，并通过链接互相参照。
- **记录问题之间的关系**：例如玩家登录链涉及登录、网关、会话、玩家对象、内存状态、持久化与离线恢复。
- **尽量保留可核对的参照**：包括成熟商业游戏、开源项目、官方文档与源码出处，并区分公开事实和个人判断。

数值、策划、美术内容主要从游戏开发者视角记录：例如数值涉及属性模型、伤害公式、客户端显示、服务端计算、配置表与调整；美术内容也会涉及资产从制作到引擎运行的衔接。

主要面向关注游戏开发技术的个人开发者，也欢迎客户端、服务端、策划、产品与测试岗位的同行参照。

## 目录结构

当前主题目录：

```
docs/
├── industry/      # 游戏行业：AAA/独立/手游/端游/主机/网游/Live Service/F2P，类型→技术需求→团队→成本
├── design/        # 策划：Core Loop/机制/关卡/叙事/任务/成长/奖励/玩家心理
├── system/        # 各系统：角色/背包/装备/技能/任务/成就/公会/排行/匹配/商店/支付，每系统 Design→Client→Server→DB→Operation 链
├── numerical/     # 数值：属性/公式/成长/平衡/概率/掉落/模拟/分析（等级经验曲线、战力、经济 Source→Currency→Sink）
├── client/        # 客户端：引擎/渲染/动画/物理/UI/资源管线；预测/插值/服务器校对
├── server/        # 服务器：架构/会话/网关/匹配/World/Zone/Battle/社交/持久化/反作弊/扩展；含样板节点 AOI
├── networking/    # 网络：传输/协议契约/可靠性/弱网
├── database/      # 数据：玩家数据/背包/排行/经济/回放的存储与中间件
├── production/    # 生产：版本/构建/发布/本地化/QA/流水线
├── operation/     # 运营：分析/活动/热更/GM/客服/社区
├── research/      # 调研：书籍/官方文档/应用场景三维度覆盖审计 + 覆盖差异表
├── knowledge.md   # 调研知识点总览：核心概念/书籍与文档要点/应用场景/常见坑误区
└── glossary/      # 术语
```

旧分类中的经济内容目前分布在 `numerical/`、`system/`、`database/` 与 `operation/`；美术、音频和工具内容按主题收录在 `client/`、编号专题笔记及相关工程页中。以上旧分类目录当前不存在，不代表独立一级目录。

**调研与知识点**：[调研知识点总览](https://cuihairu.github.io/hello-game/knowledge) 收拢三份覆盖审计调研（[权威书籍](https://cuihairu.github.io/hello-game/research/01-authoritative-books)、[引擎与中间件官方文档](https://cuihairu.github.io/hello-game/research/02-engine-middleware-docs)、[应用场景对照](https://cuihairu.github.io/hello-game/research/03-application-scenarios)）——核心概念、书籍与文档要点、应用场景、常见坑误区，逐条给来源标注与站内落点。

内容有两种常用入口：`24-game-types-architecture/` 收录 27 篇编号专题笔记，主题目录则按领域组织相关记录；两处会涉及相同主题，但侧重各异，页面之间保留互链。历史线和游戏库提供按时间与案例浏览的角度。具体目录入口以站内侧边栏为准。

```
docs/
├── 24-game-types-architecture/       # 编号专题笔记（27 篇 + 选型对照总览 + expansion.md 记录）
│   ├── 01 游戏后端技术全景
│   ├── 02 数值与经济系统
│   ├── 03 前端引擎与客户端
│   ├── 04 通信协议设计
│   ├── 05 并发模型：七种常见并发思路与适用场景
│   ├── 06 常见框架：从最轻到最重
│   ├── 07 架构总览
│   ├── 08 数据存储与中间件
│   ├── 09 游戏编程模式
│   ├── 10 玩法系统设计
│   ├── 11 辅助系统设计
│   ├── 12 游戏数据分析
│   ├── 13 运维与基础设施实战
│   ├── 14 研发组织与项目管理
│   ├── 15 参考资料与经验记录
│   ├── 16 脚本热更新与逻辑扩展
│   ├── 17 版本发布、配置与研发管线
│   ├── 18 安全、风控与合规
│   ├── 19 客户端架构与性能基础
│   ├── 20 游戏测试与质量保障
│   ├── 21 音频与美术管线协作
│   ├── 22 匹配功能开源项目选型
│   ├── 23 玩家匹配与自建架构落位
│   ├── 24 属性同步与持久化
│   ├── 25 属性 DB 映射与设计哲学
│   ├── 26 MMO 引擎调研
│   └── 27 MMO 引擎设计亮点
│
├── history/                          # 横向入口：游戏发展历史线（八轨交互时间线 + 设计稿与节点清单）
├── games/                            # 横向入口：知名游戏库（条目 + 后端技术栏 + 多维筛选）
│
└── 主题目录
    ├── 行业、类型、方法论与问题模型
    ├── 策划、数值与通用游戏系统
    ├── 网络、客户端、服务端与运行时
    ├── 脚本、版本、数据、基础设施与生产协作
    ├── 运营、商业化、平台生态、性能与安全
    └── Web 前端、调研、术语、案例与横向索引
```

> `24-` 是沿用的目录名与 URL 前缀，不代表篇数；目录当前收录 01–27 共 27 篇编号专题笔记。

> 注：编号专题笔记与主题目录会从不同角度涉及相同主题；具体页面入口以站内侧边栏为准。

## 技术栈

- **文档框架**：VitePress
- **部署**：GitHub Pages（Actions 自动构建，推 main 即发布）
- **代码示例**：Go / Python / Lua / Java / SQL / JS / HTML / TS / C / C++ / C# 等——全站围栏语言白名单 22 种，`tests/code-blocks` 回归约束（围栏必须标注语言、Go 代码块过 gofmt 语法检查）
- **架构图**：ASCII + Mermaid（`tests/mermaid-syntax` 语法兜底回归）
- **交互动画**：GSAP（历史线时间轴）

## 测试与门禁

- **源码覆盖**：`npm test`（vitest）+ 主题源码 11 个文件 100% 覆盖率门槛（`vitest.config.mjs` 的 `coverage.include`：config + theme 组件与数据层）
- **内容回归**：`tests/site-links` 六项对账（站内链接、Markdown 总数、编号专题笔记数量、案例覆盖与台账一致性）、`tests/code-blocks`、`tests/mermaid-syntax`
- **案例检查**：编号专题笔记与主题页面各有配套用例（`tests/case-*.test.mjs` / `tests/kb-case-*.test.mjs`），校验结构、数字闭环、声称对账与引用闭合

改内容先跑 `npm test` 与 `npm run docs:build`，全绿再提交推送。

## 参考书籍

| 书名 | 作者 | 重点 |
|------|------|------|
| 《游戏编程模式》 | Robert Nystrom | 设计模式 |
| 《游戏数据分析的艺术》 | 于洋等 | 数据分析 |
| 《百万在线》 | 罗培羽 | 大型游戏服务端开发 |
| 《游戏服务器架构与优化》 | 蔡能 | 架构优化 |
| 《网络游戏核心技术与实战》 | 中嶋谦互 | 全面架构 |

## 本地开发

```bash
npm install
npm run docs:dev     # 开发服务器
npm run docs:build   # 构建（站内死链检查）
npm run docs:preview # 预览构建结果
npm test             # 测试 + 覆盖率（见「测试与门禁」）
```

## 许可证

Apache License 2.0
