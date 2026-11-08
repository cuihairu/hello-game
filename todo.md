# TODO

- [x] 英文侧对齐 zh 全部页面完成双语（2026-10-27 完成，254/254，review 2 审计页除外）

## 源码分层分析 2026-11-08

- [x] 分析文档已落 docs/analysis/source-layers.md（9 层，glossary 34 条，file:line 证据）
- [x] LAY 拆分候选：4 个跟踪文件 >1000 行（24-game-types-architecture/06-frameworks EN+ZH ~4008/4004 行、09-programming-patterns EN+ZH ~1641/1636 行）；orleans/ 为 vendored 未跟踪（.gitignore:8），其 57 个 >1000 行文件属上游 Orleans，本仓不拆分
- [x] 分类问题：未见——docs 布局与内容一致，唯一异常是 orleans/ 未跟踪 vendored fork（有意为之，.gitignore:8 已注明）
