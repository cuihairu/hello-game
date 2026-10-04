# 服务端

## Category

server 树总览。节点定位：服务端知识按问题域分五棵子树——同步与战斗、执行模型与运行时、服务拆分与控制平面、容量扩缩、安全风控合规，加两个横向节点（AOI、Skynet 源码解析）。

## Definition

服务端回答的是「权威状态如何推进与维护」：推进的节奏与裁决方式在 sync 子树，推进的载体与并发面在 runtime 子树，推进者的组织方式在 services 子树，推进规模的伸缩在 capacity 子树，推进过程的对抗与治理在 security 子树。

## Related

五棵子树与横向节点：

- [同步、战斗与实时交互](/server/sync/)——时间 → 模型 → 帧同步 → 追帧重连 → 预测 → 确定性 → 回放 → 技能
- [执行模型与运行时](/server/runtime/)——立场 → 执行模型 → 三件套 → Tick → 背压 → 锁 → 专用运行时
- [服务拆分、分布式与控制平面](/server/services/)——拆分四问 → 角色 → 控制平面 → 路由 → 一致性恢复
- [容量扩缩](/server/capacity/)——容量模型 → 扩缩容 → 迁移合服 → 多地域平台化
- [安全、风控与合规](/server/security/)——结算权威 → 数据治理 → 风控 → 合规 → 依赖
- 横向节点：[AOI：兴趣区域](/server/aoi)、[Skynet：C 内核 + Lua Actor](/server/skynet)

上游：industry、design 树（问题域与归型）；下游：system、networking、database 树（横向展开）、production、operation 树（交付与运行面）。

## Reference

节点清单见各子树导览页。
