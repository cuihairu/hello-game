# AOI：兴趣区域（Area of Interest）

> 本页同时是知识图谱的节点样板：固定七段（Category / Definition / Problem / Algorithm / Used By / Related / Reference），节点间的关系链回答「为什么需要下一个节点」。案例只用成熟开源与公开可查的商业实现。

## Category

server / 多人模型 / 可见性管理。一句话：决定「服务器把谁的状态变化发给谁」。

## Definition

AOI（Area of Interest，兴趣区域）是服务器为每个客户端维护的可见实体集合，以及维护这个集合的机制：集合内实体的状态变化才下发，集合外不下发；实体进出集合时产生 enter/leave 事件。BigWorld 与 KBEngine 把玩家侧的观察者叫 Witness，把可见性判定做成空间触发器（RangeTrigger）。

## Problem

场景：MMO 主城里玩家 A 走近玩家 B，A 的屏幕上要出现 B——这个「出现」由谁决定？

先算不做裁剪的账。同屏 N 个实体、每个实体每秒 f 次状态变化、每次变化发给所有客户端：

```text
每秒消息量 = N × f × N = N²·f
N=200、f=2：200² × 2 = 80,000 条/秒，单个 Zone 已经不可行
N=1000、f=2：2,000,000 条/秒，带宽与 CPU 都是平方级
```

AOI 把平方账压成线性账：每个客户端只收「可见集大小 × f」。同屏可见实体通常只有几十个，消息量降一到两个数量级。这也是关系链「Zone Server → AOI」的答案：Zone 把世界切成可承载的块，但单个 Zone 内仍有成百实体，广播仍是平方级；AOI 在块内做第二次裁剪。

## Algorithm

四类主流结构，按「进出场怎么判定」区分：

| 结构 | 进出场判定 | 移动更新成本 | 内存 | 适用 |
|------|-----------|-------------|------|------|
| 均匀网格（九宫格） | 周期性比较格子与视野半径 | O(1) 换格，边界需迟滞带 | 网格数组 | 实体分布均匀、实现要快 |
| 十字链表 | 每轴一条有序链表，视野上下界是触发器节点，移动即滑动、越过即触发 | O(1)~O(log n)，无周期重算 | 每实体每轴前后指针 | MMO 的标准解，BigWorld/KBEngine 同款 |
| 四叉树 / BVH | 树上做视野包围盒查询 | 移动需重插入/重平衡，O(log n) | 树节点 | 实体分布极不均匀的场景 |
| R-tree | 包围盒查询 | 高频移动代价大 | 节点 | 静态对象（地图/碰撞体），不适合移动实体 |

工程参数与出处。BigWorld 默认 AOI 半径 500 米，迟滞区在半径外再扩 5 米，可被 `cellApp/defaultAoIRadius` 配置覆盖（`server/cellapp/witness.cpp:2489-2495`）；进出场不靠定时重算，而是实体在有序链表上滑动、越过边界节点时触发 `crossedX/crossedZ`（`server/cellapp/range_trigger.cpp:146-203`）。KBEngine 同构：坐标节点挂三轴前后指针（`kbe/src/server/cellapp/coordinate_node.h:94-99`），RangeTrigger 带正负边界节点、越界回调 `onEnter/onLeave`（`kbe/src/server/cellapp/range_trigger.h:16-56`）。

迟滞（hysteresis）是必选项：进与出用不同半径，实体在边界上来回走动才不会反复触发 enter/leave。BigWorld 的 5 米外扩就是这个缓冲带；没有它，站在商店门口的玩家会收到成对的重复进出消息。

## Used By

- **BigWorld**（commit `088d3b84`，路径相对 `programming/bigworld/`）：每个「有视野的真实实体」挂一个 Witness，跟踪可见集与逐目标的更新优先级（`server/cellapp/witness.hpp:26-65`）；大实体可声明 AppealRadius，半径小于它的观察者会被反向吸引（`server/cellapp/range_list_appeal_trigger.hpp:10-24`）。
- **KBEngine**（commit `0bc93d5`）：进出场回调链 `onEnterView → addWitnessed`（`kbe/src/server/cellapp/witness.cpp:356`、`:414-415`），把可见集变化交给消息层下发。
- WoW / TrinityCore：grid 分块 + 周期性 Notifier 通知可见性（公开资料口径，本站未做源码级核对）。
- EVE：官方公开资料说明大规模会战采用 time dilation（时间减速）缓解服务器压力——可见性管理不是只有 AOI 一条路，同屏实体压垮服务器时，降时间流速是与裁剪可组合的另一手。

适用判断：数百实体同屏的 MMO、大世界生存类必须有 AOI；16 人以内的房间制对局（MOBA、卡牌、小房间射击）不需要——全量广播更简单，AOI 在这里是纯开销。

## Related

关系链：MMORPG → 持久世界 → Zone Server → AOI → [状态同步](/server/sync/02) → 数据库 → 运营。逐段回答「为什么需要下一个」：

- Zone Server 之后要 AOI：Zone 解决「世界太大单进程扛不住」，块内广播仍是平方级，AOI 解决块内的裁剪。
- AOI 之后要状态同步：可见集只回答「该发给谁」，变化本身要靠增量编码与可靠/不可靠通道下发——AOI 的输出就是[状态同步](/server/sync/02)的输入。
- 单局房间型对局（[房间制问题模型](/industry/models/02)）人数少、全量广播即可，链上直接跳过本节点。

姊妹节点：仇恨与索敌（AI 侧的反向 AOI，索敌半径通常大于玩家视野半径）；进出事件与实体增删消息（AOI 的输出驱动客户端实体表）。实现关系：本节点的 implemented-by = 网格 / 十字链表 / 四叉树，按实体密度与移动频率选。

## Reference

- BigWorld 14.4.1（本站分析基于 cuihairu fork，commit `088d3b84`；上游为 SourceForge 开源的 14.4.1 安装包）：`programming/bigworld/server/cellapp/witness.cpp:2489-2495`、`range_list_node.hpp:25-37`、`range_trigger.cpp:146-203`、`range_list_appeal_trigger.hpp:10-24`
- KBEngine（本站分析基于 cuihairu fork，commit `0bc93d5`；上游 `https://github.com/kbengine/kbengine`）：`kbe/src/server/cellapp/coordinate_node.h:94-99`、`range_trigger.h:16-56`、`witness.cpp:356`
- 术语对照：Interest Management（兴趣管理）、Visibility（可见性）、Witness（观察者）
