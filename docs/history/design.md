# "History Line" Eight-Track Timeline · Design Draft

> This document is the design archive for the eight-track interactive timeline at `docs/history/index.md`: layout, interaction, animation choice, and data structures. See `nodes.md` in the same directory for the first batch of node entries; runtime data lives at `docs/.vitepress/theme/data/timeline.mjs`, and the components are `HistoryAxis.vue` and `HistoryTimeline.vue`.

## 1. Layout

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

- **Card structure**: year badge (marked "circa" where sources disagree) · title · the three hard fields `hardware context` / `what it solved` / `drawbacks` · cross-link badges (`→ spawned / landmark work…` and `← influenced by…`, with a tooltip carrying the target entry's title) · the company track additionally carries a landmark-works list (works)
- **Focus state**: clicking a legend chip → that track widens and shows everything; the remaining tracks keep only the entries that cross-link with it (cards carry a "related" marker), and columns with no relation at all collapse into a narrow color bar (header only)
- **Collapse**: the column header button collapses/expands that track's cards; independent of focus; empty tracks and collapsed tracks always keep their column header, so collapsing everything never creates a dead end
- **Responsive**: ≥1280px eight tracks side by side; 1024–1280px four columns over two rows; <768px a single column in order (cross-link badges stay readable)

## 2. Interaction

1. **Single-track focus**: legend chips toggle on click, `store.focus` is a module-level singleton, and the overview axis plus the six decade sections respond in sync; clicking the same track again or "all tracks" restores the full view. While focused, related entries are retained and cross-track causality still lines up along the key ("influenced by X / spawned Y" laid down as bidirectional pairs).
2. **Overview axis**: wheel zoom anchors on the pointer position (span clamped to 30–71 years, years clamped to 1955–2026); drag while pressed to pan (unpressed mousemove is ignored outright); decade navigation jumps straight to the six anchors; after zooming, the viewport years and a "reset" button are shown.
3. **Collapse**: `store.collapsed` records state per track, and the six decade sections share the same collapsed state.
4. **Visible relations**: influence between tracks lands entirely on the cross-links between entries rather than in scattered prose — focus is "reading one line", cross-links are "reading between lines".

## 3. Animation plan: GSAP + ScrollTrigger (alternative: Motion for Vue)

| Criterion | GSAP + ScrollTrigger | Motion for Vue (@vueuse/motion) |
|---|---|---|
| Scroll-scrubbed overview axis cursor | ✅ native `scrub`, declaratively bound to scroll progress | ❌ no scroll binding, needs a hand-rolled scroll listener bridge |
| Fade/slide in and out of decade sections | ✅ `from` + ScrollTrigger batch binding | ✅ lighter and declarative |
| Site ecosystem | Official core + ScrollTrigger are free, ~50KB gzip as needed | Even smaller |

**Conclusion**: this page's core motion is the overview axis cursor advancing with page scroll, which is exactly ScrollTrigger's home turf; Motion for Vue is lighter for enter animations but lacks scroll-progress binding, so choosing it would mean writing a scroll bridge by hand — a bad trade of complexity for bundle size.

**Implementation discipline**:

- All animations use a dynamic `import('gsap')` after `onMounted` (zero top-level dependencies in the module, SSR-build safe);
- Skip all tweens and render the end state directly when `prefers-reduced-motion: reduce` (double-checked at component mount and in the data layer);
- Animation appears in only three places: cards fading in on scroll, the overview axis cursor scrubbing forward with scroll, and the width transition on focus switching (CSS transition) — restrained, no decorative motion;
- The CSS side ships a matching `prefers-reduced-motion` media query that turns off transitions.

## 4. Data structures

`docs/.vitepress/theme/data/timeline.mjs`:

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

- **The three hard fields are a gate**: `tests/timeline-data.test.mjs` asserts non-empty per entry; one missing and it goes red — "missing one means not done" is an enforceable standard, not a verbal agreement.
- **Cross-links assembled bidirectionally**: `RELATIONS` registers one causality per line as `[source key, target key, source-side note, target-side note]`; on module load it auto-generates both the source-side `out` and the target-side `in` links, so `influenced by X / spawned Y` always come in pairs; tests assert that keys resolve and that directions and notes close up.

## 5. Gates and impact surface

- **Coverage whitelist**: `coverage.include` in `vitest.config.mjs` includes `data/timeline.mjs`, `components/HistoryAxis.vue`, and `components/HistoryTimeline.vue` (four items at 100% thresholds); `theme/index.js` registers the three additions globally, and `tests/theme.test.mjs` asserts them in sync.
- **New tests**:
  - `tests/timeline-data.test.mjs` —— eight tracks, 8–10 entries per track, three fields non-empty, approx is a boolean, keys unique with prefixes matching their track, years bucketed into the right segment, works only on the company track, cross-links closed in both directions, consistent with the `nodes.md` list, all helper branches covered;
  - `tests/HistoryTimeline.test.mjs` —— eight columns render, focus keeps related / hides unrelated, collapse and collapse-all, three fields and cross-link badges render, works render, reduced-motion skips animation;
  - `tests/HistoryAxis.test.mjs` —— legend focus and restore, wheel zoom clamped both ways, viewport anchoring, drag panning and invalid mousemove, reset, decade navigation, and cursor data points entering/leaving the viewport while zooming.
- **Dependency**: `gsap ^3.15.0` (added to `package.json` + `package-lock.json` in sync so CI `npm ci` reproduces it).
- **Site-internal bookkeeping**: the six decade anchors and the "overview" line in `index.md` are kept as-is (anchor link count unchanged); the 10 absolute internal links in the old three-line static table shrink to 2 section cross-links in the closing section (absolute internal links 66 → 58, already logged in `expansion.md` §6); `design.md` and `nodes.md` introduce no internal links; total md files 209 → 211, with `expansion.md` §6 recomputed in step.

## 6. Relation to the old page

The old version was a three-line static table (technology line / engine line / landmark works line): the six decade anchors and the "history doesn't repeat itself, but it rhymes" closing are kept on the new page, and the old table's 10 absolute internal links shrink to 2 section cross-links in the closing section (the engine-division and sync-model pieces); the old table's entries feed the eight-track data as material (QuakeWorld, UO sharding, and WoW dungeon instancing show up on cross-links across the games/hardware/engine tracks). Uncertain years switch from "uncertain" to "circa", consistent with the list.

## References

- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)
- [Wikipedia · History of video games](https://en.wikipedia.org/wiki/History_of_video_games)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](index.md)
