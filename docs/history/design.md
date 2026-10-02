# 「历史线」八轨时间线 · 设计稿

> 本文是 `docs/history/index.md` 八轨交互时间线的设计存档：布局、交互、动画选型与数据结构。首批节点清单见同目录 `nodes.md`；运行时数据在 `docs/.vitepress/theme/data/timeline.mjs`，组件为 `HistoryAxis.vue` 与 `HistoryTimeline.vue`。

## 1. 布局

```text
页头
  标题 + 口径说明（真实可查 / 年份不一标「约」/ 三硬字段说明）
  轨道图例 chips: 游戏  硬件  前端  后端  引擎  玩法  美术  公司   ← 点击=单轨聚焦，再点恢复
  概览轴 1955 ──────●──────────────── 2026                       ← 滚轮缩放 / 拖动平移 / 年代直达
年代分段（六段分页，防超载；#s-1970s … #s-2020s 六个锚点原样保留）
  ┌────┬────┬────┬────┬────┬────┬────┬────┐
  │游戏│硬件│前端│后端│引擎│玩法│美术│公司│   ← 8 轨并列（flex 栅格）
  │  ▾ │  ▾ │  ▾ │  ▾ │  ▾ │  ▾ │  ▾ │  ▾ │   ← 列头按钮折叠该轨
  │card│card│  … │    │    │    │    │    │   ← 卡片=年份徽标+标题+三硬字段+互链徽标
  └────┴────┴────┴────┴────┴────┴────┴────┘
```

- **卡片结构**：年份徽标（不一者带「约」）· 标题 · 三硬字段 `硬件背景` / `解决了什么` / `弊端` · 互链徽标（`→ 催生/代表作…` 与 `← 受…影响`，tooltip 带目标条目标题）· 公司轨附代表作列表（works）
- **聚焦态**：点图例 → 该轨加宽全量展示；其余轨道只保留与其有互链的关联条目（卡片带「关联」标记），完全无关联的列收为窄色条（仅留列头）
- **折叠**：列头按钮折叠/展开该轨卡片；与聚焦互不干扰；空轨与折叠轨都始终显示列头，全折叠也不产生死路
- **响应式**：≥1280px 八轨并列；1024–1280px 四列折两行；<768px 单列顺排（互链徽标仍可读）

## 2. 交互

1. **单轨聚焦**：图例 chips 点击切换，`store.focus` 为模块级单例，概览轴与六个年代段同步响应；再点同一轨或「全部轨道」恢复全览。聚焦时关联条目保留，跨轨因果顺着 key 可对上（「受 X 影响 / 催生 Y」双向成对铺设）。
2. **概览轴**：滚轮以指针位置为锚缩放（跨距夹取在 30–71 年，年份夹取在 1955–2026）；按住拖动平移（未按下的 mousemove 直接忽略）；年代导航直达六个锚点；缩放后显示视窗年份与「复位」按钮。
3. **折叠**：`store.collapsed` 按轨记录，六个年代段共享同一折叠状态。
4. **关联可见**：轨道间相互影响全部落在条目互链上，不靠散落正文——聚焦是「看一条线」，互链是「看线与线之间」。

## 3. 动画方案：选 GSAP + ScrollTrigger（备选 Motion for Vue）

| 判据 | GSAP + ScrollTrigger | Motion for Vue（@vueuse/motion） |
|---|---|---|
| 滚动 scrub 驱动概览轴游标 | ✅ 原生 `scrub`，声明式绑定滚动进度 | ❌ 无滚动绑定，需自搭滚动监听桥 |
| 年代段进出的淡入滑入 | ✅ `from` + ScrollTrigger 批量绑定 | ✅ 声明式更轻 |
| 站点生态 | 官方核心 + ScrollTrigger 免费，按需约 50KB gzip | 更小 |

**结论**：本页核心动效是「随页面滚动推进的概览轴游标」，这正是 ScrollTrigger 的主场；Motion for Vue 做进入动画更轻，但缺滚动进度绑定，选它就得手写滚动桥——以复杂度换体积不划算。

**落地纪律**：

- 全部动画在 `onMounted` 之后动态 `import('gsap')`（模块顶层零依赖，SSR 构建安全）；
- `prefers-reduced-motion: reduce` 时跳过全部 tween，直接呈现终态（组件挂载与数据层双重判断）；
- 动画仅三处：卡片随滚动淡入、概览轴游标随滚动 scrub 推进、聚焦切换的宽度过渡（CSS transition）——克制，无装饰动效；
- CSS 侧同步提供 `prefers-reduced-motion` 媒体查询关停过渡。

## 4. 数据结构

`docs/.vitepress/theme/data/timeline.mjs`：

```js
export const SEGMENTS = [
  { id: 's-1970s', decade: '1970s', from: 1970, to: 1979, title: '多人在场的起点' },
  { id: 's-1980s', decade: '1980s', from: 1980, to: 1989, title: '榜单、存档与虚拟世界雏形' }
  // …1990s / 2000s / 2010s / 2020s；早于 1970 的条目（如 1962 Spacewar!）归入 1970s 段并标「约」
]

export const AXIS = { minYear: 1955, maxYear: 2026, minSpan: 30, maxSpan: 71 }

export const TRACKS = [
  { id: 'games',    name: '游戏发展', color: '#e0894e', items: [/* 10 条 */] },
  { id: 'hardware', name: '硬件',     color: '#5b8dd6', items: [/* 10 条 */] },
  { id: 'frontend', name: '前端技术', color: '#3fae8f', items: [/* 10 条 */] },
  { id: 'backend',  name: '后端技术', color: '#7c6fd0', items: [/* 9 条 */] },
  { id: 'engines',  name: '知名引擎', color: '#d0568e', items: [/* 9 条 */] },
  { id: 'gameplay', name: '玩法',     color: '#d99a2b', items: [/* 9 条 */] },
  { id: 'art',      name: '美术风格', color: '#8a9a4a', items: [/* 9 条 */] },
  { id: 'company',  name: '公司与代表作', color: '#c2544a', items: [/* 10 条 */] }
]

// 条目（ITEM）：
// {
//   key: 'hw-2001-shader',        // 全局唯一，前缀 ga/hw/fe/be/en/gp/ar/co 对应轨道
//   year: 2001, approx: false,    // 年份或起始年；资料不一 → approx: true → 展示「约」
//   title: 'GeForce 3 与可编程着色器',
//   hardware: '…当时硬件/环境到什么水平',   // 硬要求① 硬件背景
//   solved:   '…解决了什么问题',           // 硬要求② 解决了什么
//   limits:   '…有哪些弊端',               // 硬要求③ 弊端
//   works: [{ year, title, why }],         // 仅公司轨：代表作 + 为什么代表
//   links: [{ track, key, dir: 'in'|'out', note }]  // 由 RELATIONS 双向装配
// }
```

- **三硬字段为门禁**：`tests/timeline-data.test.mjs` 逐条断言非空，缺一即红——「缺一不算完成」是可执行口径，不是口头约定。
- **互链双向装配**：`RELATIONS` 以 `[源 key, 目标 key, 源侧注记, 目标侧注记]` 一行登记一条因果，模块加载时自动生成源侧 `out` 与目标侧 `in` 两条 links，保证 `受 X 影响 / 催生 Y` 永远成对；测试断言 key 可解析、方向与注记闭合。

## 5. 门禁与影响面

- **覆盖白名单**：`vitest.config.mjs` 的 `coverage.include` 纳入 `data/timeline.mjs`、`components/HistoryAxis.vue`、`components/HistoryTimeline.vue`（四项 100% 阈值）；`theme/index.js` 全局注册三增，`tests/theme.test.mjs` 同步断言。
- **新测试**：
  - `tests/timeline-data.test.mjs` —— 八轨、每轨 8–10 条、三字段非空、approx 布尔、key 唯一且前缀匹配轨道、年份归段、works 仅公司轨、互链双向闭合、与 `nodes.md` 清单一致、helpers 全分支；
  - `tests/HistoryTimeline.test.mjs` —— 八列渲染、聚焦保留关联/隐藏无关、折叠与全折叠、三字段与互链徽标渲染、works 渲染、reduced-motion 跳过动画；
  - `tests/HistoryAxis.test.mjs` —— 图例聚焦与恢复、滚轮缩放双向夹取、视窗锚点、拖动平移与无效 mousemove、复位、年代导航、缩放中游标数据点进出视窗。
- **依赖**：`gsap ^3.15.0`（`package.json` + `package-lock.json` 同步入列，CI `npm ci` 可复现）。
- **站内口径**：`index.md` 六个年代锚点与「总览」行原样保留（锚点内链数不变）；旧三线静态表里的 10 条绝对内链收缩为收束段的 2 条章节互链（绝对内链 66 → 58，`expansion.md` §6 已入档）；`design.md` 与 `nodes.md` 不引入任何内链；md 总数 209 → 211，`expansion.md` §6 同步重算。

## 6. 与旧页的关系

旧版是三线静态表（技术线 / 引擎线 / 名作线）：六个年代锚点与「历史不会重复，但会押韵」的收束保留在新页，旧表 10 条绝对内链收缩为收束段 2 条章节互链（引擎分工与同步模型两讲）；旧表条目作为素材融入八轨数据（如 QuakeWorld、UO 分片、WOW 副本实例化在游戏/硬件/引擎轨互链可见）。存疑口径由「存疑」改为「约」，与清单口径一致。
