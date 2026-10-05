# 系统总览

## Category

system 树总览。节点定位：跨端共用的系统层知识——玩法系统三节点、脚本与热更子树、通用服务子树；每个系统沿 Design→Client→Server→DB→Operation 链展开。

## Definition

系统层回答「一个具体系统由哪些部件组成、每个部件放哪一层」：玩法系统是撮合、排行这类可独立选型的机制件；脚本与热更回答逻辑如何在运行期被扩展与替换；通用服务是账号、交易、风控这类几乎每款游戏都要重建一次的基础件。系统节点的写法是机制对比与选型口径，实现细节分摊到 client、server、database 各树。

## Related

关系链：玩法系统（机制件选型）→ 脚本与热更（逻辑扩展面）→ 通用服务（基础件清单）。上游：design 树（玩法问题域）、numerical 树（数值口径）；下游：server 树（承载运行时）、database 树（存储面）、operation 树（运营面）。

- 玩法系统：[排行榜](/system/leaderboard)、[队伍匹配](/system/party-matchmaking)、[PVP 匹配](/system/pvp-matchmaking)
- 子树：[脚本与热更](/system/scripting/)、[通用服务](/system/services/)

## Reference

节点清单见各子树导览页与上方节点链接。
