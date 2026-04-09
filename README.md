# 游戏开发系统化知识地图

这是一个用 `mdBook` 组织的游戏开发知识库，不是可运行的游戏工程。

当前仓库状态：

- 基础骨架是成立的：[`book.toml`](/Users/cui/Workspaces/hello-game/book.toml)、[`src/SUMMARY.md`](/Users/cui/Workspaces/hello-game/src/SUMMARY.md)、[`src/README.md`](/Users/cui/Workspaces/hello-game/src/README.md)、[`.github/workflows/deploy.yml`](/Users/cui/Workspaces/hello-game/.github/workflows/deploy.yml) 彼此一致
- 当前问题不在“文件乱”，而在“章节边界重复”
- 现有 23 章更像第一版铺题地图，适合盘点范围，不适合作为长期稳定目录

已经识别出的主要重叠：

- `02 / 08 / 09` 都在按“类型、问题模型、架构归类”切分
- `10 / 11 / 22` 都在讲“客户端、引擎、脚本、语言、工具链”
- `15 / 16 / 21` 都会碰到“服务能力、运营系统、平台接入”

因此当前处理方式不是“推倒仓库”，而是：

1. 保留现有 mdBook 骨架
2. 先完成信息架构重构
3. 再按新主线重写正文

目录重构方案见 [`src/00-restructure-plan.md`](/Users/cui/Workspaces/hello-game/src/00-restructure-plan.md)。

逐章审查见 [`src/00-chapter-audit.md`](/Users/cui/Workspaces/hello-game/src/00-chapter-audit.md)。

阅读入口见 [`src/00-reading-guide.md`](/Users/cui/Workspaces/hello-game/src/00-reading-guide.md)。

术语约定见 [`src/00-terminology.md`](/Users/cui/Workspaces/hello-game/src/00-terminology.md)。

当前主线目录已经重排为 18 章，重复视角页被降级到附录与横向索引。
