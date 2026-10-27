# Party Matchmaking (Squads)

> Angle note: this page records the shapes of matchmaking where the squad is the matched unit and the squad as the unit of matchmaking; for matchmaking service boundaries and room allocation design see [Self-Built Architecture Placement](/24-game-types-architecture/23-matchmaking-architecture), and for capability trade-offs among open-source components see [Matchmaking Project Selection Survey](/24-game-types-architecture/22-matchmaking-oss). These are different angles on the same topic.

## Category

system / gameplay systems. Node positioning: the squad is the atomic unit of matchmaking — comparing and selecting among four matchmaking shapes (room-based / matchmaking pool / skill-bucket / wait queue + degradation), landing on cross-server sharding.

## Definition

The difference between squad matchmaking and solo matchmaking is structural: **the squad is the atomic unit of matchmaking**. The captain proxying enter/leave, member locking and readiness confirmation, and how the squad score is computed (average or lowest) — three things that add one more state machine to squad matchmaking over solo matchmaking.

## Problem

Captain proxying enter/leave, member locking and readiness confirmation, the squad-score convention — if any one of these is left undefined, even a correctly chosen matchmaking shape cannot land. Nobody fills a room in off-peak hours, a host who never presses start leaves the whole room waiting, a strict skill pool never fills a pair — each of these incidents points at a different shape's weakness. First decide whether the gameplay wants sociality or efficiency, then pick the shape; once the shape is set, only then is there a place for squad state (in-memory pool or entity system).

## Algorithm

### Classic mode: room-based (host creates the room)

The most intuitive shape: host creates a room → sets mode/headcount/entry bar → invites or recruits → full and ready → match starts.

```text
房间状态机：WAITING → READY → STARTING → DESTROYED
成员事件：join / leave / ready / unready / kick / transfer_host
```

- **Pros**: socially visible (friends invite each other, bystanders join in), simple failure handling (no quorum, no start), and players have a sense of control over "slow matchmaking"
- **Cons**: matchmaking efficiency depends on natural population, so rooms spin empty in off-peak hours; if the host never presses start the whole room waits — this needs **host timeout handover** (e.g. auto-transfer or auto-start after 60 seconds of inactivity)
- **Scale ceiling**: in-memory state in a single process per room suffices; the room count is the upper bound of matchmaking complexity

### Variant one: matchmaking pool (whole squad enters the pool)

After forming up, the entire squad enters the matchmaking pool and the pool side completes pairing. The core is a **distance metric**: whether two squads can be paired — define a scalar distance, then find nearest neighbours.

- **Classic distance**: `d = |squad average score gap| + λ·|headcount gap| + μ·latency/region gap`; pairwise scanning inside the pool for the minimum d is O(N²), where N is the number of squads in the pool
- **Reducing complexity**: compare only against "the M most recently entered squads" (sliding window), or filter by headcount + mode first and then compute the score gap — filter conditions press the pool's effective size down to a scannable magnitude
- **Action after pairing**: bidirectional confirmation (both sides agree before the match starts, avoiding the frustration of being assigned) or immediate start (faster, but weaker on fairness)

### Variant two: skill buckets

Slice the continuous rating range into buckets (e.g. one bucket per 100 points); squads pair only with opponents in **adjacent buckets** — matchmaking degrades from a whole-pool scan to a within-bucket scan:

- Within-bucket matchmaking is O(k²) (k being the squad count in the bucket), with no cross-bucket scanning — complexity decouples from total pool size
- Bucket boundary handling: when a squad's score crosses a boundary, cross-bucket pairing has lower priority than within-bucket, avoiding "5 points apart, would be perfect opponents, and never meet"
- **Buckets are the infrastructure of the ranking system**: competitive squad queues (Feature Note 11's matchmaking-system section, with the same segmented K convention applying) are basically all built on this

### Variant three: wait queue + timeout degradation

Waiting time is the second dimension of matchmaking: the longer you wait, the looser the constraints. Degradation ladder (each rung has an explicit trigger time):

```text
T0        严格条件：段位差 Δ0、同地域、同人数
T0+10s    放宽段位：Δ = Δ0 + α·t（线性放宽）或跳桶放宽
T0+30s    放宽地域/延迟：允许跨区，提示「网络可能波动」
T0+60s    机器人补位 / AI 队友：保证秒开，标注人机（合规与体验口径见专题笔记第 18 篇）
T0+90s    拆队降级：整队不齐时允许单人补位进残局池
```

- **Degradation must be one-way and perceivable**: once loosened, never tighten it back; the UI reflects the current matchmaking conditions in sync — "waited 40 seconds and still on strict conditions" is an experience incident
- **Timeout driving hangs uniformly on timers** (see the engine tie-ins at the end): one timeout task per waiting entity, advancing to the next rung when it fires

### Distributed approach: cross-server matchmaking pool

A single server's pool has limited capacity; the common structure for cross-server matchmaking:

- **Matchmaking service as a separate process**: all squads across the server enter a central pool, and the matchmaking result is dispatched to the hosting server to open the room — matchmaking logic is single-point, match computation is distributed
- **Sharded pools**: shard by skill × region, one matchmaking worker per shard, squads routed to the target shard — scaling comes from adding shards, and hot shards (many low-skill players) need a further layer
- **State ownership**: the pool is pure in-memory state; a matchmaking service restart only loses "currently waiting" squads (a client retry is enough). Not persisting to storage is what makes it simpler than a leaderboard.

### Comparison table

| Dimension | Room-based | Matchmaking pool | Skill buckets | Wait queue + degradation |
|------|--------|--------|---------|--------------|
| Matchmaking latency | depends on natural population | O(N²) or window approximation | within-bucket O(k²), fast | fast (timeout guarantees a start) |
| Fairness | host sets the entry bar | controllable via the distance metric | good skill alignment | loosens over time, fairness decreases |
| Sociality | strong (mutual invites / bystander join) | weak (blind pairing) | weak | weak |
| Failure handling | no quorum, no start | pair not found, return to pool | empty bucket triggers cross-bucket | degradation backstop, always succeeds |
| Cross-server scaling | distributing rooms is enough | needs a separate/sharded matchmaking service | naturally sharded by bucket | ladder configuration centralized |
| Implementation complexity | low | medium | medium | medium-high (ladder state) |
| Peak / off-peak hours | idles in off-peak | pool depth decides quality | empty bucket triggers cross-bucket | off-peak relies on degradation to hold experience |

### Trade-offs

Social gameplay (MMO dungeons, party-voice rooms) chooses room-based: what players want is "who to play with," and matchmaking efficiency is a secondary item. Competitive gameplay (MOBA squad queue, 5v5 shooting) wants the balance between fairness and waiting, and uses "buckets + pooling + degradation ladder" — the freedom of room-based actively undermines the seriousness of the ranking. Casual and light-competitive would rather have a wide skill range than a long wait — the effect of wait time on churn is greater than the small fairness loss of a single match.

One red line: for the same mode, never offer both a "strict skill pool" and a "no-bar room" at the same time; the ranking system will be bypassed for score farming. This is one of Feature Note 18's abuse surfaces; the matchmaking side must seal off cross-pool score flow.

### Applicable scale

At thousands of concurrent waiters on a single server, a full-pool scan or buckets is more than enough, and starting with room-based also works. From ten thousand to a hundred thousand you must use buckets + sharded pools, the matchmaking service as a separate process, and a configurable degradation ladder. For cross-server / region-wide, use a central matchmaking service + sharding by skill and region; squad state may be lost (not persisted), and match state lives on the match server.

## Used By

- **skynet**: a matchmaking service is naturally an actor — pool reads and writes are serialized inside the service, lock-free (see [Skynet Source Code Walkthrough](/server/skynet) section 6); the degradation ladder's timed triggers hang on the `skynet.timeout` timer wheel (section 7 of the same page); cross-server matchmaking can go through its cluster component (section 5 of the same page)
- **Pitaya**: matchmaking logic sits in a separate service, called cross-node through cluster RPC (message dispatch and service discovery)
- **KBEngine / BigWorld**: the squad body can attach to the entity system (KBEngine's entities and mailbox, BigWorld's cell/base division of labour), but the matcher is still recommended to stay independent of the match process
- Online matchmaking-quality conventions (win-rate regression, wait P95) land via the two matchmaking-quality metrics of Feature Note 11; anti-oscillation follows the trap table of the same page

- **Colyseus** (commit `e620123`): the room-centric shape of the matchmaking API — `joinOrCreate` queries before creating (`packages/core/src/MatchMaker.ts:201`, `:216`, `:230`), locks per filter condition (`packages/core/src/matchmaker/driver.ts:24-26`), cross-process seat reservation goes through `remoteRoomCall` (`MatchMaker.ts:962`)

## Related

Relationship chain: gameplay shape (social / competitive) → the squad as the atomic matchmaking unit → matchmaking shape (room / pool / buckets / queue) → cross-server sharding → degradation-ladder backstop. Each segment answers "why the next one is needed":

- Only with the squad as the atomic unit can matchmaking shapes be discussed: the squad-score convention decides the distance metric, and the readiness state machine decides the implementation volume of room-based.
- Only with the shape set can cross-server be discussed: failure handling in a single-server shape is "return and re-wait," while in a cross-server shape it is "shard routing" — these are not the same problem.
- The ladder backstop goes last: it solves the "empty pool / few players" experience problem, and must not be used to hide a wrongly chosen shape upstream.

Sister nodes: [PVP Matchmaking](./pvp-matchmaking.md) (solo-competitive ratings and windows, with the squad-score convention hooking into its rating system), [Leaderboard](./leaderboard.md) (bucket width is the board's score granularity).

## Reference

- This page is a synthesis of engineering experience with no single external source; the two matchmaking-quality metrics and the anti-oscillation trap table are in Feature Note 11, "Matchmaking Systems"
- Terminology: Party Matchmaking, Matchmaking Pool, Skill Bucket, Degradation Ladder

## References

- [Wikipedia · Matchmaking](https://en.wikipedia.org/wiki/Matchmaking)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [skynet](/server/skynet.md)
- [genre-coverage](genre-coverage.md)
- [index](index.md)
- [leaderboard](leaderboard.md)
- [pvp-matchmaking](pvp-matchmaking.md)
- [skill](skill.md)
- [voice](voice.md)
