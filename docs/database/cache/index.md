# 缓存、中间件与基础设施

## Category

database / cache 子树总览。覆盖：缓存与锁（01）、热点与消息（02）、注册发现与负载（03）、资源分发（04）。

## Definition

这一章讨论那些经常被视作“配件”的基础设施为何会决定系统上限。缓存、MQ、注册发现、对象存储和 CDN 如果定位不清，很容易从助力变成隐患。

这组记录涉及的核心问题：

- 基础设施的职责边界
- 缓存一致性和中间件语义的实际成本
- 基础设施选型与业务链路优先级的关系

## Related

关系链：缓存边界与锁（01）→ 热点与削峰（02）→ 注册发现与负载分配（03）→ 资源分发（04）。上游：数据建模主树（权威源与派生副本语义）；下游：server 树的服务拆分、networking/ipc 子树（消息语义的组件落地）。

## Reference

节点清单见下节；专题笔记侧同题对照见第 08 篇《数据存储与中间件》。

## 本章文章

- [Redis、排行榜与锁](./01.md)：围绕“Redis、排行榜与锁”补足 缓存与中间件 里的关键判断、成本与误区。
- [singleflight、MQ 与事件流](./02.md)：围绕“singleflight、MQ 与事件流”补足 缓存与中间件 里的关键判断、成本与误区。
- [注册中心、负载均衡与一致性哈希](./03.md)：围绕“注册中心、负载均衡与一致性哈希”补足 缓存与中间件 里的关键判断、成本与误区。
- [对象存储、CDN 与资源分发](./04.md)：围绕“对象存储、CDN 与资源分发”补足 缓存与中间件 里的关键判断、成本与误区。

## 参考资料

- [Wikipedia · Cache (computing)](https://en.wikipedia.org/wiki/Cache_(computing))
- [Wikipedia · Database](https://en.wikipedia.org/wiki/Database)

<!-- BACKLINKS-AUTO -->
## 相关页面

- [index](/games/index.md)
