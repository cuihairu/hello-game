# Housing, Territory, and Building Permissions

## Category

system / gameplay systems (spatial gameplay component). Node positioning: housing and territory turn "a space belonging to a player/guild" into a "buildable, authorizable, visitable" container — plot model, placement validation, permission matrix, and access and visiting: four things. The spatial foundation is [AOI](/server/aoi) and [Map and Space Management](/server/map) — the landing point of the research conclusion (BigWorld/KBEngine spatial trigger components are borrowable) is this page: housing and territory are built on AOI/maps as the foundation, without standing up a separate set of space management.

## Definition

Housing is a **personal or guild-private building space**: place furniture, place sets, hang functional buildings on a grid. Territory is a **land-claim declaration in an open world**: a guild claims a piece of land, with ownership and output bound to it. Building has two placement models: **grid-based** (aligned to a grid, simple validation) and **free placement** (any position/rotation, complex validation). Permissions are a three-dimensional matrix: **identity (owner/member/visitor) × object (building/furniture/door) × action (place/move/use/enter)**.

## Problem

Spatial gameplay pitfalls, in order of appearance:

- **Build data bloat**: free placement yields hundreds of items, and full serialization is both large and slow — without incremental storage and sync, one visit pulls the full state.
- **Placement validation done halfway**: the client checks collisions and then persists, so cheats just send "floating furniture" packets — if the server does not replay the validation, the build area becomes a billboard.
- **Territory boundary overlap**: land-claim evaluation uses real-time computation rather than persisted boundary data, so two guilds claim the same piece of land at once and it is unclear who came first.
- **Permission granularity out of control**: questions like "can a visitor open my chest" have no matrix and are a string of ifs in code, so adding an identity requires a code change.
- **Visits drag down the main city**: visiting others' housing loads it as a resident main city does, and with many houses the server memory fills up with inactive spaces.

## Algorithm

### Plot Model: Definition + Object List, Incremental Sync

```text
plot_state:                        # 一块家园/领地
  plot_id:    h-88123
  owner:      u1001               # 或 guild:g201
  grid:       32x32               # 格子制才有；自由放置无 grid
  objects:    [ {uid: o-1, def: sofa-a, pos: [3,4], rot: 0},
                {uid: o-2, def: lamp-b, pos: [3,5], rot: 90} ]
  version:    47                  # 版本号，增量同步的基准

同步口径:
  在园玩家: 收 objects 的增量（增/删/改按 uid）
  进园玩家: 先拉 version 快照，再追增量
```

- Housing is a **low-frequency-modification, low-frequency-access** space: unlike a main city, inactive housing does not reside in memory, and is loaded on demand and unloaded on timeout — the space lifecycle convention is consistent with the dynamic maps in [Map and Space Management](/server/map)
- Objects use `uid` as the increment unit, with `version` as the boundary between snapshots and increments — reconnection/routing changes fill the gap by version comparison
- Build data is **sharded into a separate store** from the player profile: housing data volume is far larger than a normal player profile, so it is stored and loaded independently (the hot/cold tiering convention of [Player Data Storage](/database/01))

### Placement Validation: Server Replays, Client Only Previews

The authoritative placement check is on the server; the client's collision preview is only an experience optimization:

```text
服务端收到放置请求 {plot, def, pos, rot}:
  1. 权限：发送者对该地块有 build 权（查权限矩阵）
  2. 归属：plot 属于该玩家/其公会
  3. 合法：def 存在、pos 在界内、rot 合法档位
  4. 碰撞：与已有 objects 不重叠（格子制查格占位；自由放置查包围盒）
  5. 消耗：材料/货币扣除（走[结算](./settlement.md)凭证）
  6. 落库 + version+1 + 广播增量给在园玩家
```

- The six-step order is the validation chain, with **consumption placed after legality**: if validation fails nothing is deducted, and "deducted but could not place" is a source of complaints
- Free-placement collision validation uses a simplified bounding box (no fine physics on the server); clipping-type problems are self-corrected by the client presentation layer — the server manages "can it be placed", not "does it look good"

### Permission Matrix: Identity × Action, One Table

| Identity \ Action | Build/Move | Use functional building | Open chest/take | Enter |
|------------|----------|------------|----------|------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Guild member (territory) | ✗ (or by rank) | ✓ | ✗ | ✓ |
| Authorized visitor | ✗ | ✓ | ✗ | ✓ |
| Stranger visitor | ✗ | Per convention | ✗ | ✓ (visiting area) |

- Permissions are stored as a **matrix configuration**, not hardcoded: adding an identity (e.g. "tenant") is adding one row of config
- Authorization is an explicit action: a player adds someone to the visitor list and only then does permission change — implicit authorization such as "friends can automatically take" easily becomes a theft dispute, so the convention is better to be inconvenient
- Guild territory permissions resolve by **guild rank** (master/officer/member); the guild organization convention is in the [social services of the system tree](/system/services/)

### Visiting and Territory: On-Demand Loading + Read-Only Replica

- Visiting others' housing: load a **read-only replica** (or read-only view), and any write by the visitor is rejected by the permission matrix; the house owner need not be online (the data is in storage, no owner process needs to be online)
- Territory claims: the boundary is persisted and settled **at the time of the request** (ordered by timestamp), and overlap validation completes inside the persistence transaction — if two requests arrive simultaneously, the transaction order is the claim order
- Entering housing/territory triggers events (first daily entry, visiting quests) through **spatial triggers**: enter-area events at the AOI/map layer, subscribed to by the [Quest System](./quest.md) and [Achievements and Codex](./achievement.md) — housing does not create its own event source

## Used By

- **Minecraft** (commercial game, server implementation publicly inspectable): server-authoritative validation for block placement (legality, permissions, boundaries) is the most direct reference for "server replay validation"; multiplayer permissions (the territory plugin ecosystem) is the practice surface of the permission matrix.
- **Animal Crossing: New Horizons** (commercial game, publicly available Nintendo material): islands and visitors (read-only visiting + limited interaction) are a reference for the housing visiting convention.
- **Genshin Impact** (commercial mobile game): the Serenitea Pot's furnishings, sets, trust levels, and visitor tours — a public reference for mobile housing as "building + collection + visitors".
- **Fantasy Westward Journey** (commercial NetEase PC game): the long-running form of the housing system (houses, furniture, courtyards) — a reference for "housing carrying social and production roles".
- **Shuaitu Zhibin / Three Kingdoms: Tactics Edition** (commercial SLG): territory ownership bound to output — a reference for "territory = an ownership declaration".
- **BigWorld / KBEngine** (open-source engines, source-level facts in the [engine archive of the server tree](/server/map)): space management and regional trigger components are the foundation reference for the housing space layer (commit-anchored facts have been woven into the server tree's nodes).

Reference analysis: Minecraft's placement validation = worth referencing (server-authoritative placement lands directly in the placement validation section); Animal Crossing's visitors = borrowable (read-only visiting and limited interaction land in the visiting convention); Genshin's Serenitea Pot = worth referencing (sets and trust levels, landing in collection design under the design tree); Shuaitu Zhibin territory = borrowable (ownership bound to output, landing in the territory claim section); BigWorld/KBEngine spatial components = borrowable (using AOI/maps as the foundation, with spatial triggers taking on the event source).

## Related

Relationship chain: plot model → placement validation → permission matrix → visiting and territory. Each segment answers "why the next one is needed":

- Only once the plot model fixes the data shape can you talk about placement — incremental sync and version comparison both build on the object list.
- Only with authoritative placement can you talk about permissions — the first step of the validation chain is checking permissions, and without a matrix there is no "who has the right to place".
- Only with a clear permission matrix can you safely open visiting — what a visitor can do is one row of the matrix, not a special case.
- Only once visiting works can you talk about territory — the two share on-demand loading and persistence ordering, and territory only swaps a private space for an ownership declaration.

Upstream: [AOI](/server/aoi) and [Map and Space Management](/server/map) (the spatial foundation), [Settlement](./settlement.md) (build material consumption vouchers), [Player Data Storage](/database/01) (hot/cold tiering for build data); downstream: the [Quest System](./quest.md) and [Achievements and Codex](./achievement.md) (spatial trigger event subscription), [Cosmetics, Skins, and Outfits](./cosmetics.md) (furniture outfits are the spatial variant of the appearance mechanism).

## Reference

- This page is a mechanics synthesis; Minecraft's server implementation and the housing rules of Animal Crossing/Genshin/Fantasy Westward Journey are per each official public source.
- Source-level facts for BigWorld/KBEngine are per the commit-anchored records in the engine archive of the server tree; this page does not repeat line numbers.
- Terminology: Housing, Territory, Plot, Placement Validation, Permission Matrix, Read-only Replica.

## References

- [Wikipedia · Territory (video game)](https://en.wikipedia.org/wiki/Massively_multiplayer_online_game)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [genre-coverage](genre-coverage.md)
