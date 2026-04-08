# 游戏开发系统化知识地图

这是一个以游戏后端为主轴、同时覆盖客户端技术、平台生态、运营支撑与工程保障的长期知识库。

当前采用 `mdBook` 组织内容，正文入口位于 [src/README.md](/Users/cui/Workspaces/hello-game/src/README.md)，目录定义位于 [src/SUMMARY.md](/Users/cui/Workspaces/hello-game/src/SUMMARY.md)。

当前一级结构：

1. 总论与方法论
2. 游戏类型与问题模型
3. 网络、协议与消息交互
4. 同步、战斗与实时交互
5. 并发、执行模型与运行机制
6. 服务拆分、分布式协作与控制平面
7. 进程间通信与消息系统
8. 游戏类型专题
9. 按问题域归纳各类游戏
10. 客户端技术、引擎与运行时架构
11. 脚本语言、逻辑扩展与热更新
12. 版本体系、灰度与前后端协同发布
13. 数据建模与数据库系统
14. 缓存、中间件与基础设施能力
15. 通用服务系统
16. 运营、商业化与 BI
17. 配置表、数据驱动与研发协作
18. 可观测性、调试与性能工程
19. 压测、容量规划与扩缩容
20. 安全、反作弊与合规
21. 平台生态、渠道与 SDK
22. 引擎选择、语言地图与工具生态
23. 工程实践与经验沉淀

GitHub Pages 部署工作流位于 [.github/workflows/deploy.yml](/Users/cui/Workspaces/hello-game/.github/workflows/deploy.yml)。

当前目录已经细化到“一级主题 + 二级导航”的粒度：

- 一级主题定义在 [src/SUMMARY.md](/Users/cui/Workspaces/hello-game/src/SUMMARY.md)
- 每个一级主题对应一个章节首页
- 二级主题先通过章节内锚点组织，后续再按需要拆成独立页面

这种结构适合先把知识地图搭稳，再逐步把重点专题拆细，而不会一开始就生成过多空文件。
