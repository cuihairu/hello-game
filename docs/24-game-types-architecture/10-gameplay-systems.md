# 10 Gameplay Systems Design

> This piece looks at leaderboards, activities, cross-server, server merge, server rolling, combat, inventory, mail, and trading side by side, recording what problem each class of system has to solve, the common solutions, and the new problems those solutions bring along with the boundaries where they easily trip you up.
>
> Reference books: the State and Component patterns in *Game Programming Patterns* (Robert Nystrom), the large-scale gameplay-system practice in *Million Online*, and the operational data-analysis perspective in *The Art of Game Data Analysis* (Yu Yang et al.).

Gameplay systems are the core skeleton of the player experience. If architecture is the game's "bones," gameplay systems are the "muscles"—they determine the concrete feel of every tap, every battle, every trade. A well-designed gameplay system must not only run correctly; it must also withstand high concurrency, prevent cheating, support hot updates, and keep a consistent design philosophy across game types (tower defense, idle, MMO, blockchain, card).

**Core principle**: gameplay system design is not a question of "how to implement it" but of "why it is designed this way." Once you understand the "why," the code is a natural byproduct.

## 0. The Three Shared Constraints of Gameplay Systems

The nine systems look independent, but they share one set of underlying constraints. Before writing any gameplay system, first confirm these three can be met:

| Constraint | Meaning | Typical incident when violated |
|------|------|----------------|
| **Data is settleable** | Gameplay output must ultimately land as asset changes (currency/items/stats), and the changes must be traceable | Activity rewards are granted but cannot be reconciled, producing "ghost rewards" |
| **State is recoverable** | In-flight gameplay state (activity progress, dungeon floors, matchmaking wait) is not lost after a process restart, or can be rebuilt | The server restarts at 3 a.m. and wipes the whole server's activity progress |
| **Behavior is auditable** | When a dispute arises you can replay "what the player did and what the system adjudicated" | A player complains of being bumped out of a ranking and operations cannot produce evidence |

These three constraints map directly onto the infrastructure from earlier chapters: the currency transaction-records table (Chapter 2), the single writer and state snapshots (Chapter 5), and audit logs (Chapter 2). Most of the work of designing a gameplay system is not inventing new mechanisms but correctly seating gameplay rules onto this existing infrastructure.

---

## 1. Leaderboard System

### 1.1 Why Leaderboards Are Needed

Leaderboards are the foundation of a game's social nature. They solve a fundamental problem: **how to give players a sustained drive to keep pursuing something**. When a player sees their ranking climb from 1000th to 500th, that sense of progress lasts longer than any numerical reward.

But leaderboard design goes far beyond "sorting." It must answer several key questions: how often does it update? How are ties ranked? How is a season reset handled? How is cross-server data aggregated?

*Million Online* points out specifically: the leaderboard is one of the first interfaces players open after launching the game, and its load speed directly shapes the first impression. A stuttering leaderboard can make a player close the game within 3 seconds.

### 1.2 Technology Selection

| Type | Data characteristics | Update frequency | Candidate solutions | Use cases |
|------|---------|---------|---------|---------|
| Real-time leaderboard | Scores change in real time | High (seconds) | Redis Sorted Set | Arena, real-time competitive play |
| Delayed leaderboard | Refreshed on a schedule | Low (minutes) | MySQL + Redis cache | Power ranking, achievement ranking |
| Seasonal leaderboard | Reset per season | Medium | Per-season keys + archiving | Seasonal arena, ladder |
| Cross-server leaderboard | Multi-server aggregation | Medium | Cross-server service + Redis | Server-wide ranking, guild wars |

**Redis Sorted Set** is the common first choice for real-time leaderboards, for three reasons: O(log N) insert and query complexity, native range queries (`ZREVRANGE`), and built-in deduplication (a member keeps only one score).

### 1.3 Core Operations

A leaderboard has only three core operations: update score, query rank, and fetch the board around yourself. These three cover most of a leaderboard's core read/write paths.

```go
const rankKey = "rank:arena"

// 更新分数 - O(log N)。无变化时跳过，避免无效写放大
func (m *RankManager) UpdateScore(playerID uint64, score int64) error {
    old, err := m.redis.ZScore(m.ctx, rankKey, member(playerID)).Result()
    if err == nil && int64(old) == score {
        return nil // 分数未变，不写
    }
    return m.redis.ZAdd(m.ctx, rankKey, &redis.Z{
        Score:  float64(score),
        Member: member(playerID),
    }).Err()
}

// 查询自己的排名与周边玩家（榜上比我高 2 名、低 2 名）
func (m *RankManager) GetAround(playerID uint64) (rank int64, neighbors []uint64, err error) {
    r, err := m.redis.ZRevRank(m.ctx, rankKey, member(playerID)).Result()
    if err != nil {
        return 0, nil, err // 不在榜上
    }
    rank = r + 1 // Redis 排名从 0 开始
    start := max(r-2, 0)
    ids, err := m.redis.ZRevRange(m.ctx, rankKey, start, r+2).Result()
    if err != nil {
        return 0, nil, err
    }
    for _, id := range ids {
        n, _ := strconv.ParseUint(id, 10, 64)
        neighbors = append(neighbors, n)
    }
    return rank, neighbors, nil
}
```

"Query my rank plus my neighbors" is the most frequent query pattern for players—what players care about is "how far am I from the person ahead," not "who is first." A neighborhood query locates with `ZREVRANK` and then takes a window with `ZREVRANGE`, two O(log N) operations, without pulling the whole board back.

### 1.4 Ties and Unique Ranks

Internally a Sorted Set orders by (score, member lexicographic order), so the order of tied players is decided by the member value—usually the player ID, which makes "the larger ID ranks ahead" an implicit rule. This causes disputes at settlement: with the same score, why is he ahead of me?

A common way to handle it is to encode "arrival time" into the score, implementing **first-come-first-served for ties**:

```go
const tsBits = 21 // 时间片位数

// 复合分数：高 32 位存真实分数，低 21 位存"取反后的分钟时间片"。
// 32 + 21 = 53，恰好落在 float64 尾数精度内，整型无损转换。
// 时间片取反后"越晚越小"——同分时先达到的玩家排前面。
// 适用前提：分数不超过 2^32（约 43 亿），超出时需要重新设计编码。
func compositeScore(score int64, reachedAt time.Time) float64 {
    minute := reachedAt.Unix() / 60 // 分钟精度，21 位约 4 年一循环
    ts := uint64(^minute) & ((1 << tsBits) - 1)
    return float64(uint64(score)<<tsBits | ts)
}

func realScore(composite float64) int64 {
    return int64(composite) >> tsBits // 值转换还原真实分数
}
```

Mind the precision ceiling of float64: a float64 mantissa has only 53 bits, and converting a 64-bit integer directly to float64 loses the low bits—so the time slice is compressed to 21 bits (minute granularity) to fit the budget. If scores need to exceed 2^32, the bit budget runs out, and you must switch to a Lua script processed inside Redis, or drop Sorted Set for a database solution.

Competitive games also have a simpler rule: **allow tied ranks**. Tied players share the same rank (for example tied 5th), and rewards are paid out per tie. This turns a technical problem into a design-rule problem—many products actually chose this route because it is friendlier to players.

### 1.5 Seasons and Resets

The key decision for a seasonal leaderboard is **where the old data goes**. Directly `DEL`ing the leaderboard key brings two problems: at the moment of settlement players cannot look up their historical results; if a dispute arises there is nothing to trace back.

A common approach is **per-season keys plus archiving**:

- The season in progress uses `rank:arena:s3` (s3 is the season number); when the season switches, new data naturally writes into `s4`, and the old key is kept for a while
- The settlement job snapshots the Top N once before and once after the switch, and writes them together with the reward-payout records into an archive table
- After the old key expires, historical queries go to the archive table

Settlement itself must be idempotent: when the settlement job crashes and reruns, it must not pay out rewards twice. Like the currency transaction records in Chapter 2, use "season number + player ID" as the idempotency key for payout.

### 1.6 Cross-Server Leaderboards

The cross-server leaderboard is the most complex part of the leaderboard system. The core challenge: **how to aggregate multi-server data efficiently in a distributed environment**.

A common wrong approach is "full sync"—syncing every server's data into one central Redis. This works at small scale, but once there are more than 10 servers each with 100,000 players, the central Redis becomes the bottleneck, and write spikes from any single server ripple through the whole thing.

**The sound approach is layered aggregation**: each server maintains a local leaderboard, and the cross-server service stores only the Top N each server reports (for example each server's top 100). To query a global rank, first filter in the aggregate board; a player's global rank is inferred as "the number of players ahead of me in the aggregate board + the number of players ahead of me on my own server." Only players outside the Top N are told "you are not in the displayed range" when querying a global rank—the vast majority of players do not need an exact global rank.

> **Pitfall**: cross-server leaderboard update latency is usually 5-30 seconds. If the designers ask for "real-time cross-server ranking," you need to communicate this technical limitation to them rather than bruting the performance cost.

### 1.7 Abusing the Ranking

Leaderboards are a hotspot for score farming, because ranking ties directly to rewards. Common defenses:

- **Source validation**: scores can only be produced by specific logic such as battle settlement; no generic "add points" interface is exposed
- **Increment caps**: a per-settlement cap on score change (the most a single match can raise), with abnormally large changes routed to the audit queue
- **Match validity**: PVP score settlement requires the opponent to meet a minimum bar (level gap, match count), preventing "feeding scores through alt accounts"
- **Monotonic rankings** (such as a highest-power ranking): naturally resistant to farming, but still need guarding against "abnormal jumps"

---

## 2. Activity System

### 2.1 The Essence of the Activity System

The activity system is a core tool of game operations. Its essence is a **time-driven state machine**—within a specific time window, it changes game rules, grants rewards, and steers player behavior.

An activity passes through four phases from designer proposal to player participation: teaser (building anticipation), running (steering behavior), settlement (granting rewards), and retrospective (reviewing and optimizing). Each phase has different technical needs: the teaser needs push notifications, the running phase needs real-time statistics, settlement needs batch computation, and the retrospective needs data analysis.

### 2.2 The Activity State Machine

An activity's state flow looks simple, but real operations are full of edge cases: activity time changes, emergency take-downs, reward top-ups, data rollbacks. These "abnormalities" are the real challenge of activity system design.

```text
未开始 ──→ 进行中 ──→ 已结束 ──→ 已归档
   │          │          │
   │          ├──→ 暂停中（紧急修复，恢复后继续计时或延长）
   │          └──→ 回滚中（数据异常，回退进度重新计算）
   └──────────────→ 延期中（运营需求，平移时间窗口）
```

The state machine should be written as a **purely functional judgment**: given (current time, activity config, player data) → determine the state. Avoid storing state as a mutable field—after operations changes the time, the stored old state may contradict the new config. Recompute on every judgment; state is only a derived result.

### 2.3 Config Structure and Hot Updates

The most important technical capability of the activity system is **hot updates**—changing activity config without taking the server down. This is extremely common in operations: a designer finds some activity's rewards too generous and needs an emergency probability adjustment; or an activity's participation rate is too low and needs extra rewards.

The core of hot updates is **separating config from logic**: activity logic is fixed in code, while activity parameters (time, rewards, probabilities) live in the config center. Changing parameters only requires updating the config, not redeploying.

```go
// 活动配置 - 由运营平台下发，可热更
type ActivityConfig struct {
    ID        int32
    Type      string    // "login_reward" / "rank_race" / "limited_shop"
    StartAt   int64     // 服务器时间戳
    EndAt     int64
    Rewards   []Reward  // 奖励内容
    Condition string    // 参与条件表达式，如 "level>=20"
    Version   int32     // 配置版本号，变更时递增
}

// 活动管理器 - 按周期扫描状态转换
func (m *ActivityManager) checkActivities(now time.Time) {
    for _, cfg := range m.configs.Snapshot() { // 读配置快照，避免遍历时热更
        switch {
        case now.Unix() < cfg.StartAt:
            // 未开始：预告期内可推送提醒
        case now.Unix() <= cfg.EndAt:
            m.onActivityActive(cfg)
        default:
            m.settle(cfg) // 触发结算（幂等）
        }
    }
}
```

After a config is pushed it needs **version numbers and effect confirmation**: after loading a new config, the server reports the version back to the config center, and the operations platform counts the release as successful only when all servers have confirmed. Otherwise the gray-release inconsistency of "config center updated, some servers still running the old config" causes activity times to drift across servers.

### 2.4 Time Bases and Server-Launch Activities

Activity time has two baseline questions:

- **Use server time uniformly**. The client's local time is untrustworthy (players can change their phone's clock); activity adjudication always goes by server time, and the client only displays. When pushing activity information, include the server's current time so the client can calibrate its countdown display.
- **Server-launch activities use the server launch time, not calendar time**. "Day 1" of a "7-day check-in since server launch" should count from the moment this server opened. Config for such activities needs to support a "relative anchor" (server launch time + N hours), not just an absolute timestamp.

Cross-timezone operations (such as NA/EU servers) must also decide whether activities open by local time. A common practice is to configure them in the operations timezone's local time (an activity opening at 8 p.m. on the NA server is configured in the NA timezone), convert to UTC for storage when the config center pushes it, and let the server uniformly adjudicate in UTC at runtime.

### 2.5 Player Activity Data and Settlement Idempotency

Activities are global, but each player's participation progress is per-player. Key design points for player-dimension activity data:

```go
// 玩家活动数据 - 记录参与进度与领奖状态
type PlayerActivity struct {
    PlayerID   uint64
    ActivityID int32
    Progress   map[string]int64 // 任务进度，如 "kill_count": 120
    Claimed    map[int32]bool   // 已领取的奖励档位（幂等标记）
    Version    int32            // 乐观锁版本
}

// 领取奖励 - 幂等：重复请求返回同一结果而不是报错
func (s *ActivityService) Claim(p *PlayerActivity, cfg *ActivityConfig, tier int32) (*Reward, error) {
    if p.Claimed[tier] {
        return nil, ErrAlreadyClaimed
    }
    if !s.conditionMet(p, cfg, tier) {
        return nil, ErrConditionNotMet
    }
    p.Claimed[tier] = true // 先置位再发奖，配合流水表保证可追溯
    reward := cfg.Rewards[tier]
    return &reward, s.grantWithLog(p.PlayerID, reward, "activity:"+fmt.Sprint(cfg.ID))
}
```

Two details deserve emphasis:

- **Mark first, then grant** (or put them in the same transaction). The reverse—"grant first, mark later"—duplicates the payout when the grant succeeds but the mark fails; combined with the currency transaction records from Chapter 2 (the RefID idempotency key), even two executions post only one credit.
- **Re-issue after the activity ends**. Players offline at the settlement moment, or players found to have been missed after settlement—operations needs a re-issue capability. Re-issues go through the mail system (see Section 8), also carrying an idempotency key.

### 2.6 Activity Differences Across Game Types

| Game type | Activity frequency | Activity complexity | Technical focus |
|---------|---------|-----------|---------|
| Card mobile | High (1-2 per week) | Medium | Gacha probabilities, limited-time banners |
| MMO | Medium (2-3 per month) | High | Cross-server activities, large-scale battles |
| Idle game | Low (1 per month) | Low | Offline earnings, scheduled resets |
| Tower defense | Medium (1 every two weeks) | Medium | Limited-time stages, leaderboard competition |
| Blockchain game | Low (1 per month) | High | On-chain ownership, token economy |

> **Pitfall**: activity design for blockchain games must account for "on-chain confirmation time"—an Ethereum block confirmation takes about 12 seconds, so if an activity involves on-chain operations, the player experience is noticeably delayed. A common practice puts high-frequency operations off-chain and goes on-chain only at key points (such as reward ownership).

---

## 3. Cross-Server System

### 3.1 Why Cross-Server Is Needed

The core problem the cross-server system solves is **the tension between player base size and matchmaking quality**. A single server has a limited number of players, which means long matchmaking waits and poor match quality. The cross-server system pools players from multiple servers together, greatly improving matchmaking efficiency.

But cross-server also brings huge technical challenges: data consistency, network latency, state ownership. *Million Online* points out that cross-server system design is essentially about finding a balance between "player experience" and "technical complexity."

### 3.2 Data Ownership: Snapshot In, Settle Back

The most important architectural decision in the cross-server system is **data ownership**: during cross-server gameplay, who owns the player's data?

A common reliable pattern is **"snapshot in, settle back"**:

1. **Snapshot in**: when a player enters cross-server gameplay, the home server packages the participation data (lineup, power, equipment) into a read-only snapshot and sends it to the cross-server host. Stat changes on the home server during cross-server play **do not affect** the snapshot.
2. **Cross-server host autonomy**: matches, points, and temporary state all complete inside the cross-server host's memory and storage; the cross-server host never queries back to the home servers—this removes real-time cross-server dependencies and also lets the cross-server host scale independently.
3. **Settle back**: when the gameplay ends, the cross-server host sends the results (ranks, rewards) back to each home server through a reliable message queue, and the home server performs the payout. The cross-server host **never modifies** home-server data directly.

With this design the failure domains are clear: a cross-server host crash only affects the cross-server gameplay itself, and home-server data is never left in an intermediate state by a cross-server failure. Reward payout reuses the home server's existing idempotent payout logic, so duplicate cross-server message delivery cannot double-post.

The snapshot's validity window needs alignment with the designers: a player swaps equipment mid-cross-server-play and the snapshot stays unchanged—this is usually reasonable (changing gear after match registration does not affect a submitted lineup), but the product side must confirm it explicitly.

### 3.3 Cross-Server Matchmaking

The key to cross-server matchmaking is **match-pool design**—how to efficiently find similarly skilled opponents among tens of thousands of players.

The core idea is **dynamically expanding the rating range**: the longer a player waits, the wider the range. This balances "wait time" against "match quality."

```go
// 匹配队列 - 动态扩展评分范围
func (q *MatchQueue) TryMatch() []*MatchRequest {
    q.mu.Lock()
    defer q.mu.Unlock()

    now := time.Now()
    for i := 0; i < len(q.players); i++ {
        p1 := q.players[i]
        // 范围 = 初始范围 + 等待时间(秒) × 扩展速率
        range1 := q.ratingRange + now.Sub(p1.QueueTime).Seconds()*q.expandRate

        for j := i + 1; j < len(q.players); j++ {
            p2 := q.players[j]
            effectiveRange := math.Min(range1,
                q.ratingRange+now.Sub(p2.QueueTime).Seconds()*q.expandRate)

            if math.Abs(p1.Rating-p2.Rating) <= effectiveRange &&
                p1.GameMode == p2.GameMode && p1.Region == p2.Region {
                return []*MatchRequest{p1, p2} // 匹配成功
            }
        }
    }
    return nil
}
```

O(N²) pairwise comparison becomes a bottleneck in a pool of ten thousand. Once the scale grows you need bucketing by rating segment (build buckets over rating intervals, match within the same bucket first, then relax to neighboring buckets after timeout), or introduce a real matchmaking service. Segment bucketing brings an extra benefit: the matching logic is naturally isolated by region/mode, so multi-zone deployments do not interfere with each other.

### 3.4 Design Points for Cross-Server Guild Wars

Guild war is the most complex gameplay in the cross-server system. It must solve several core problems: battlefield allocation (which server hosts the battle), state sync (how to guarantee every player sees a consistent battlefield), and reward settlement (how to pay out rewards across servers).

- **Battlefield allocation**: prefer the server with more participating guild members as the battlefield, reducing cross-server data transfer. If both sides are close in size, pick the least loaded server.
- **State sync**: adopt a "server-authoritative + client-side prediction" model. The server computes all combat logic, and the client does local prediction and presentation. The full trade-offs of sync models are covered in the knowledge base's "Sync, Combat, and Real-Time Interaction" chapter.
- **Reward settlement**: goes through the "settle back" chain in Section 3.2—the battlefield server only produces results, and payout lands on the home server.

> **Pitfall**: the biggest pit of cross-server guild war is "the battlefield server crashes"—if the server hosting the battle goes down, every participating player disconnects. The solution is to snapshot battlefield state periodically (room-level snapshot + input log) and restore it on a standby node on failure; matches that cannot be restored are ruled losses or replayed per the rules, with compensation paid out through mail.

---

## 4. Server Merge System

### 4.1 Business Background

Server merge is an inevitable event in a game's lifecycle. When a server's active population drops below a threshold, the game experience degrades sharply—matchmaking waits get longer, the world channel goes quiet, guild wars cannot fill up. Server merge combines several low-activity servers and restores the game's vitality.

But server merge is one of the most dangerous operations technically. Data migration, conflict handling, rollback plans—a single mistake can lose data for a large number of players.

### 4.2 The Four Phases

A server merge is not a simple "move the data over"; it is an engineering project that needs careful planning:

1. **Preparation** (1-2 weeks): data backup, conflict detection, compensation calculation, merge script rehearsal
2. **Execution** (4-8 hours): downtime notice, stop writes, data migration, conflict handling
3. **Verification** (24 hours): data integrity checks, functional verification, monitoring and alert on-call
4. **Stabilization** (1 week): watch player feedback, handle exceptional tickets, pay out merge compensation

### 4.3 ID Collisions: The Biggest Hidden Pit of Server Merge

Duplicate player names and guild names are explicit conflicts with simple handling rules (append the server number, e.g. "PlayerA·S3"). The genuinely dangerous kind is the **implicit ID collision**: both servers auto-increment player IDs from 1, so after merging they are bound to collide.

If the underlying data uses a globally auto-incrementing ID with no server dimension, the merge requires a **full ID remap**:

```go
// 合服 ID 重映射：3 服玩家 ID 统一加偏移
// 映射表必须持久化——合服后几个月内，玩家客服、日志回溯都需要查旧 ID
type IDMapping struct {
    OldServerID int32
    OldPlayerID uint64
    NewPlayerID uint64
}

func buildMigration(srcServer int32, offset uint64) func(uint64) uint64 {
    return func(oldID uint64) uint64 {
        return oldID + offset // offset = 目标服当前最大 ID + 安全余量
    }
}
```

The hard part of remapping is not the mapping itself but **referential integrity**: mail recipients, friend lists, guild members, leaderboard members, order records... every place that references a playerID must be rewritten in sync. Miss one, and you get an online incident like "mail sent to a nonexistent person."

Two pieces of experience:

- **Prevention at design time beats remediation at merge time**. If the project is still early, encode the server number into every player ID (for example the high 16 bits hold serverID), or add a serverID column to every table; then a merge degrades into a "logical merge" with no ID rewriting.
- **Keep the mapping table permanently** (at least until the game shuts down). It does not participate in business after the merge, but log analysis, customer support tickets, and data repair all rely on it to translate old IDs into new ones.

Handling rules for other data conflicts:

```text
冲突处理规则：
├── 重名玩家     → 后缀服务器编号（如 "玩家A·3服"），免费送改名卡
├── 公会名冲突   → 后缀服务器编号
├── 排行榜       → 合并后重新计算排名
├── 邮件         → 合并到收件人名下，按时间排序
├── 好友/黑名单  → 双向合并；对方未合入时挂"跨服好友"占位
└── 公会战记录   → 历史数据归档，新赛季重新开始
```

### 4.4 Dry Run and Rollback

> **Pitfall**: the biggest risk of a server merge is "irreversible data loss." Take a complete backup before merging, and the merge script must support a **dry-run mode**—first simulate the merge and output a report of "what will be rewritten/merged/deleted," then execute for real only after manual confirmation.

Safety nets during execution:

- **Stop writes before migrating**. After the downtime, confirm all writes have landed (no active MySQL connections, Redis persistence complete), and only then start migrating. Migrating while writes continue is the root of data inconsistency.
- **Row-count verification**. For every table, record a "source A rows + source B rows = target rows" reconciliation report; any inequality aborts the server launch.
- **One-click rollback script**. On migration failure, roll back to the backup, including the database and Redis snapshots. The rollback script matters as much as the migration script, and it must actually have been rehearsed once.

---

## 5. Server Rolling

### 5.1 The Essence of Server Rolling

Server rolling (opening new servers + merging old ones) is the core strategy of mobile-game operations. Its essence: **use new servers to attract new players, and use merges to keep old servers alive**.

Triggers for opening a new server usually include: existing servers' online population has saturated, leaderboard competition has become too fierce, or operations activities need a new server to coordinate with. Merge triggers are: server activity rate below a threshold, and online population declining continuously.

### 5.2 Engineering the Server Launch

"Opening a new server" must be engineered into a **one-click server launch**: the server-creation flow (create the database, seed base data, configure activity anchors, register with the gateway/list server) automated and completed within 10 minutes. A server launch is a peak event—the login surge at the moment of launch often exceeds the usual level several times over, so capacity planning should target the launch peak, not the daily average peak.

Common strategies for launch timing:

- **8 p.m. on a weekday**: players have plenty of time to experience the new server
- **Friday evening**: the weekend is the game's peak period, and a launch works best
- **Avoid major holidays**: during periods like the Spring Festival, players already have fixed gaming habits

> **Pitfall**: launching servers too often causes "server rolling fatigue"—players feel every server is a "short-lived server" and are unwilling to invest time. Keep the interval between new launches at no less than 3 days, so each server has enough time to accumulate core players.

---

## 6. Combat System

### 6.1 Core Challenges

The combat system is the heart of the gameplay and the most technically complex part. It must solve several fundamental problems: real-time performance (millisecond-scale response), fairness (anti-cheat), and extensibility (supporting new modes).

The "Component pattern" proposed in *Game Programming Patterns* fits combat system design well: decompose combat logic into independent components (movement, attack, skills, state) and realize different combat modes by composition. The deep topics of real-time sync—frame sync, prediction and rollback, determinism—are fully covered in the knowledge base's "Sync, Combat, and Real-Time Interaction" chapter; this section focuses on the architecture perspective of the gameplay system.

### 6.2 Design Differences Between PVE and PVP

| Dimension | PVE | PVP |
|------|-----|-----|
| Logic execution location | Server optional | Server authority required |
| Anti-cheat requirements | Low | Extremely high |
| Network latency tolerance | High (200ms+ acceptable) | Low (<100ms recommended) |
| Combat replay needs | Low | High (dispute arbitration) |
| Numerical balance pressure | Low (monsters can be tuned) | High (players compare keenly) |

### 6.3 Architecture Choices

For different game types, combat system architecture differs greatly:

- **Card / turn-based**: request-response; the server computes all logic and the client plays the presentation
- **MOBA / FPS**: frame sync or state sync, requiring UDP long connections and millisecond-scale sync
- **MMO**: AOI + state sync, area-managed broadcast, large-scale state broadcast
- **Idle**: mostly offline computation, with battle results handled at login or by a scheduled task

> **Pitfall**: the most common mistake in turn-based games is "client authority"—letting the client compute the combat result and report it up. This is nearly equivalent to handing players a cheating tool. Every combat that affects assets or rankings must execute its settlement logic on the server.

### 6.4 Tiered Combat Validation

"Server authority" does not mean "fully recompute every battle." Full recomputation may be unacceptable in cost (an MMO raid dungeon takes several minutes to simulate), so the common engineering practice is **tiered validation by risk**:

| Level | Applicable scenarios | Validation method |
|------|---------|---------|
| Full recompute | Ranking-related PVP such as arena and ladder | The server fully simulates once from both sides' snapshots; the recomputed result is authoritative |
| Result validation | Ordinary dungeons | The client reports the result; the server validates legality (minimum duration, damage cap, output cap) |
| Spot-check validation | Low-risk PVE | Replay a sampled proportion; if the anomaly rate exceeds the threshold, escalate to full validation |

These "legality bounds" such as damage caps and minimum battle duration come from the numerical tables: the server knows the players' stat ceilings and skill multiplier ceilings, so any report exceeding the theoretical ceiling can be rejected outright. This validation layer is cheap to implement and intercepts well—the best cost-benefit ratio in anti-cheat.

Combat recordings (input logs or state-snapshot sequences) are the final basis for dispute arbitration; PVP gameplay should retain at least one season of them.

### 6.5 Offline and Idle Settlement

In idle games, "combat" mostly happens outside a live match: offline earnings are computed as "last settlement time × output rate" and re-issued in one shot at login. The points of this kind of settlement are **caps and segmentation**: offline earnings are usually capped (for example at most 12 accumulated hours), and the excess is steered toward item-based recovery—this is both numerical design and the server's defense against a compensation flood.

When computing offline earnings, use **integer minutes or hours as the granularity** to avoid the inconsistency of second-level floating-point accumulation; re-issues go through the same asset pipeline as online earnings (transaction records + idempotency), and offline settlement and online settlement share one set of output rules, avoiding numerical drift between two logics.

---

## 7. Inventory System

### 7.1 Grid Model vs List Model

There are two storage models for inventories:

- **Grid model**: a fixed N grids, each holding one stack of items. The frontend display is intuitive, but expansion and tidying (merging fragments) logic is fiddly, and grid indexes may be referenced by the client, creating a compatibility burden.
- **List model**: the inventory is a set of items, and capacity is only a count ceiling. Extension is flexible and the frontend sorts for display as needed.

Mobile games overwhelmingly use the list model plus client-side virtual sorting. The server does not care "which grid an item is in," only "what there is and how many of each"—sorting is pure presentation logic.

### 7.2 Item Instances and Stacking

The core design decision is **stacking ordinary items as (itemID, count), while items with independent attributes (equipment) get one instance each**:

```go
type StackItem struct { // 可堆叠：材料、消耗品
    ItemID int32
    Count  int64
}

type EquipItem struct { // 不可堆叠：每件装备属性不同
    InstanceID uint64 // 全局唯一实例 ID
    ItemID     int32
    Enhance    int16   // 强化等级
    Affixes    []int32 // 词缀
    Bound      bool    // 绑定状态
}
```

Stacking rules need to be defined carefully: the same itemID can stack, but instances with differing attributes cannot; whether bound and unbound items of the same kind share a stack differs by product—the key is that the rules live in config rather than being scattered through the code. An item's InstanceID is the anchor for its later participation in enhancement, trading, mail attachments, and log tracing: from the moment an item is produced to the moment it is destroyed, every record is chained by InstanceID.

### 7.3 Operation Atomicity

Inventory operations (add, remove, use) must be atomic—either all succeed or all fail. This matters especially under high concurrency: two requests deducting the same item at once can drive the item count negative.

The correct posture for compound operations (such as "synthesis needs 3 kinds of material deducted") is a **two-phase commit**: first pre-check that all deductions are satisfiable, and after the pre-check passes, execute them in one go:

```go
// 扣减材料 - 先全部校验，再统一扣减
func (m *InventoryManager) Consume(inv *Inventory, costs []StackItem) error {
    // 阶段一：预检（只读）
    for _, c := range costs {
        if inv.CountOf(c.ItemID) < c.Count {
            return ErrItemNotEnough
        }
    }
    // 阶段二：执行（inv 已在单写者模型下独占，期间无并发修改）
    for _, c := range costs {
        inv.Remove(c.ItemID, c.Count)
    }
    return m.save(inv)
}
```

This code works only on the premise of the **single-writer model** from Chapter 5: at any moment only one execution flow modifies a given player's inventory. Without a single writer you need database optimistic locking or a distributed lock as a backstop, and the two-phase pre-check remains unreliable under concurrency.

> **Pitfall**: another common problem with inventory systems is "lost items"—a player uses an item, the server crashes, the item is deducted but the effect never takes effect. The solution is a transaction log: record the use intent first, then confirm the deduction only after the effect has taken effect; or put "deduct materials" and "issue output" into the same database transaction (if in the same database).

Change transaction records apply to items too: acquisitions and consumption of important items (high-rarity equipment, limited-time props) are logged (who, when, from where, to where)—account-theft tracing and operations compensation both depend on it.

---

## 8. Mail System

### 8.1 Multiple Roles

The in-game mail system plays several roles: system reward payout, player-to-player communication, operations notices, and compensation. It is one of the most-used tools in game operations.

Designing a mail system requires considering several key questions: atomicity of attachment claiming (preventing duplicate claims), performance of bulk mail (a server-wide compensation may involve a million players), and expiry cleanup policy (preventing unbounded mail accumulation).

### 8.2 Storage Model: Keep Personal Mail and Server-Wide Mail Separate

Storing "an announcement to a million people" and "a compensation to one person" as the same kind of data is the most common root of mail-system performance incidents. A common approach is to **model the two kinds of mail separately**:

- **Personal mail**: one record per recipient, with an attachment and a claim state. The count is manageable and it goes into player data storage.
- **Server-wide mail**: only one template record (title, content, attachment, validity period), and **no pre-generation of a million recipient records**. When a player logs in, compare "my last mail check time" against "the server-wide mail publish time" and the player dynamically sees the mail; on claiming, write (mail ID, player ID) into a claim table as the proof of claim.

The server-wide mail claim table turns an O(N) write (at send time) into an O(1) write (once per claiming player), so a server-wide mail to a million players goes from "taking dozens of minutes to send" to "effective on publish."

When server-wide mail must "send only to players who meet a condition" (such as a 30-day-inactive recall), a common practice is to carry a filter condition on the mail template and judge at login—or use an offline task to pre-generate personal mail for the targeted players. The former saves storage but takes effect with a delay (judged at login); the latter is immediate but write-amplified; choose according to the operations scenario.

### 8.3 Idempotency and Overflow for Attachment Claims

```go
// 领取附件 - 领取状态与发放写入同一事务
func (m *MailService) ClaimAttachment(playerID uint64, mailID int64) (*Reward, error) {
    mail, err := m.load(mailID, playerID)
    if err != nil {
        return nil, err
    }
    if mail.AttachmentClaimed {
        return nil, ErrAlreadyClaimed // 幂等：重复领取返回明确错误
    }
    if err := m.grantWithLog(playerID, mail.Attachment,
        "mail:"+fmt.Sprint(mailID)); err != nil {
        return nil, err
    }
    mail.AttachmentClaimed = true
    return &mail.Attachment, m.saveClaimState(mail)
}
```

Two boundary cases:

- **Attachment overflow**: the mail carries an attachment, but the player's mailbox is full so the claimed attachment cannot fit into the inventory. A common practice is for the mail to keep a "pending extraction" state and prompt the player to clear the inventory, or to support converting the attachment directly into a "temporary inventory / recovery system." Never discard an attachment just because the inventory is full.
- **Expiry cleanup**: when a mail with an unclaimed attachment expires, the common rule is "auto re-issue to the recovery system on expiry" rather than deletion. Deleting a mail that carries an attachment is the operation most likely to draw complaints, so cleanup logic must check the attachment state first.

> **Pitfall**: network jitter causes clients to send duplicate claim requests; the server needs to recognize "duplicate claim" as an idempotent hit (returning success or a clear "already claimed") rather than treating it as a new request and half-processing it.

---

## 9. Trading System

### 9.1 Core Risks

The trading system is the lifeblood of the game economy and a hotspot for cheating and exploits. Core risks include: gold farming (exploiting bugs to obtain currency without limit), money laundering (transferring illegally obtained items through trades), and RMT (real-money trading).

*The Art of Game Data Analysis* points out specifically: the security design of a trading system is not a matter of "plugging holes" but of "establishing rules"—good rule design is far more effective than after-the-fact patching.

### 9.2 Layered Security Mechanisms

Trading security needs multiple layers of protection:

1. **Price band limits**: an item's trade price cannot deviate too far from the system reference price, preventing money laundering through abnormal pricing
2. **Rate limits**: a cap on the number of trades per unit time (the token-bucket idea, see Chapter 4)
3. **Same-person limits**: no trading between the same real-name / device / payment account, preventing alt-account transfers
4. **Handling fees**: trading taxes sink game currency back into the economy, suppressing inflation (echoing the sink-and-faucet balancing in Chapter 2)
5. **Newly acquired item limits**: items just obtained (especially from top-ups) are untradeable for a period, leaving risk control a recovery window
6. **Anomaly detection**: offline analysis identifies abnormal trading patterns (fixed-price high-frequency wash trading, rapid transfers by new accounts); on a hit, freeze pending review

A completed trade is an asset transfer, and its **trade records** (both parties, item instance, price, fee, time) must be stored and auditable—they are the data foundation for economic risk control (Chapter 2's transaction records and reconciliation) in the trading scenario.

### 9.3 Where the Consignment House Belongs Architecturally

An auction / consignment house is more complex than peer-to-peer trading and must handle: listings, competing bids, countdowns, unsold handling, and fee computation. Architecturally there is a key choice: **where does the consignment house live**?

- **On the home server**: simple to implement, but the market is fragmented by server—small per-server economies and volatile prices.
- **A dedicated trading service** (shared server-wide / cross-server): a unified market with strong price discovery; but it becomes a server-wide critical path and needs independent scaling and failure isolation. High-DAU mobile games generally choose a dedicated trading service, for the same reason as the cross-server system—pull high-frequency matching out of the game's main logic and separate the failure domains.

The consignment house's core concurrency points are **concurrent bids on the same item / the same item being delisted at the same time**. Inside a dedicated service, a single-writer queue serializes operations per auction lot; on a deal, "charge the buyer's currency, transfer the item, book it, notify both parties" completes within one transaction, and any failed step rolls the whole thing back.

> **Pitfall**: a blockchain game's trading system must account for "on-chain confirmation delay"—an Ethereum transaction confirmation takes more than 12 seconds. If a trade involves an NFT transfer, the player has to wait for the on-chain confirmation and the experience drops noticeably. A common practice is "optimistic confirmation": complete the trade off-chain first and make it usable, then batch-confirm ownership on-chain periodically.

---

## 10. Code Example: A Minimal Skeleton of Season Settlement and Server-Wide Mail

The three shared constraints of Section 0—settleable data, recoverable state, auditable behavior—sound abstract, but in code they come down to two patterns: "idempotency key + proof table." This section installs them into the two most incident-prone scenarios of this chapter: season settlement payout (Section 1.5) and server-wide mail claiming (Sections 8.2, 8.3). The example is a minimal Go demonstration of this chapter's design decisions (not taken from a real project); merged, the in-section code blocks compile through `go vet` and `go build`, and are governed by the repo-wide code-block regression tests.

### Season Settlement: Crash Reruns Do Not Pay Out Twice

```go
type Reward struct {
    Coin  int64
    Item  int32
    Count int64
}

type RankedPlayer struct {
    UID  uint64
    Rank int
}

// prizeFor：名次 → 奖励。真实实现读数值配置表（可热更，第 17 章），
// 演示版用倒数公式表达「越靠前越厚」即可
func prizeFor(rank int) Reward {
    return Reward{Coin: int64(10000 / rank)}
}

var ErrDuplicateRef = errors.New("reward already granted")

// SettleSeason：赛季结算。幂等键 = 赛季号 + 玩家 ID——
// 结算程序崩溃重跑，重复调用不会重复发奖（1.5 节的纪律）
func SettleSeason(season int32, top []RankedPlayer, grant func(uid uint64, r Reward, refID string) error) error {
    for _, p := range top {
        refID := fmt.Sprintf("season:%d:player:%d", season, p.UID)
        err := grant(p.UID, prizeFor(p.Rank), refID)
        switch {
        case err == nil:
            // 本格发奖成功
        case errors.Is(err, ErrDuplicateRef):
            continue // 幂等命中：这格奖已发过，跳过而不是报错
        default:
            return err // 真实失败：中断并重跑，已发的格子被幂等键挡住
        }
    }
    return nil
}
```

`SettleSeason`'s confidence in rerunning the whole batch comes entirely from the idempotency key: `season + player ID` is baked into `refID`, sitting on top of Chapter 2 Section 6.3's records-first accounting—a second `grant` for the same slot hits `ErrDuplicateRef` and is skipped. Note the asymmetry in failure handling: an idempotent hit means **continue**; a real failure means **abort and rerun**—when rerunning after an abort, already-paid slots are blocked by the idempotency key and unpaid slots are filled from the start, so the settlement program can be built as "stateless + re-entrant at any time," which is the full meaning of Section 1.5's "settlement itself must be idempotent." The Top N snapshot is stored once before and once after the switch (Section 1.5's archiving requirement), so the evidence chain is complete when a dispute arises.

### Server-Wide Mail: One Template + Judged at Login + Claim Proof Table

```go
// GlobalMail：全服邮件只有一份模板记录，不预生成百万条收件记录（8.2 节）
type GlobalMail struct {
    ID        int64
    Title     string
    Reward    Reward // 附件：沿用上一块的 Reward，入账走流水管线
    PublishAt time.Time
    ExpireAt  time.Time
}

// claimKey：领取凭证 (邮件ID, 玩家ID)，生产落库时加唯一约束
type claimKey struct {
    MailID int64
    UID    uint64
}

var (
    ErrNoMail         = errors.New("mail not found")
    ErrMailExpired    = errors.New("mail expired")
    ErrAlreadyClaimed = errors.New("attachment already claimed")
)

type MailBoard struct {
    mails   []GlobalMail
    claimed map[claimKey]struct{}
}

// VisibleTo：登录时对比「我的上次检查时间」与「发布时间」，
// 动态可见、零收件记录——O(N) 写入推迟成 O(1) 的全部秘密
func (b *MailBoard) VisibleTo(lastCheck time.Time) []GlobalMail {
    var out []GlobalMail
    for _, m := range b.mails {
        if m.PublishAt.After(lastCheck) {
            out = append(out, m)
        }
    }
    return out
}

// Claim：领取附件。返回的奖励由调用方走第 2 章的流水管线入账，
// 邮件系统自己绝不碰余额
func (b *MailBoard) Claim(uid uint64, mailID int64, now time.Time) (Reward, error) {
    var mail *GlobalMail
    for i := range b.mails {
        if b.mails[i].ID == mailID {
            mail = &b.mails[i]
            break
        }
    }
    if mail == nil {
        return Reward{}, ErrNoMail
    }
    if now.After(mail.ExpireAt) {
        return Reward{}, ErrMailExpired // 过期走找回系统，绝不静默删除（8.3 节）
    }
    key := claimKey{MailID: mailID, UID: uid}
    if _, ok := b.claimed[key]; ok {
        return Reward{}, ErrAlreadyClaimed // 网络重试在这里被识别，绝不当新请求处理
    }
    b.claimed[key] = struct{}{}
    return mail.Reward, nil
}
```

`VisibleTo` performs a single time comparison, and a million players' "receiving mail" is zero-record—the whole secret of Section 8.2's turning an O(N) write into O(1) lives in this function signature: it requires the caller to bring `lastCheck`, i.e. the player-dimension "last mail check time." The three checks in `Claim` each have a job: the expiry check holds the red line that "cleanup logic must look at attachment state first" (expired goes to the recovery system instead of deletion, Section 8.3); the proof-table dedup recognizes network retries as idempotent hits (Section 8.3's pitfall line); and the claim action writes exactly one `(mail ID, player ID)` proof—which is also audit evidence: when a player complains "I never received it," query this table. Attachment crediting still goes through the records pipeline; the mail system never touches balances itself.

Both scenarios share the same underlying infrastructure: the idempotency key comes from the currency transaction records (Chapter 2), the proof table comes from a database unique constraint (Chapter 8), and state recovery rests on "settlement is rerunnable + mail templates are persisted." Most of the work of a gameplay system is not inventing new mechanisms but seating rules correctly onto this existing infrastructure—the sentence from Section 0 should now be visible.

---

## 11. System Priorities Across Game Types

Different game types differ greatly in their need for gameplay systems, and understanding these differences helps allocate development resources sensibly.

| System | Tower defense | Idle | MMO | Blockchain | Card |
|------|------|------|-----|------|------|
| Leaderboard | ★★★ | ★★ | ★★★ | ★★ | ★★★ |
| Activity system | ★★★ | ★★ | ★★★ | ★★ | ★★★ |
| Cross-server system | ★ | ★ | ★★★ | ★ | ★★ |
| Server merge system | ★ | ★★ | ★★★ | ★ | ★★ |
| Combat system | ★★★ | ★ | ★★★ | ★ | ★★★ |
| Inventory system | ★★ | ★★★ | ★★★ | ★★★ | ★★★ |
| Trading system | ★ | ★★ | ★★★ | ★★★ | ★★ |
| Mail system | ★★ | ★★ | ★★★ | ★★ | ★★★ |

---

## 12. Design Decision Guide

**When to choose Redis Sorted Set for a leaderboard**

- Real-time requirements are high (second-level updates)
- Only Top N, rank, and neighborhood queries are needed
- Data volume is within the millions
- No complex queries are needed (such as "query all players within a score band")

**When to choose MySQL for a leaderboard**

- Complex queries are needed (filtering by condition, multi-dimension sorting)
- Data volume exceeds the tens of millions
- Update frequency is low (refreshed once a day)
- Historical data archiving is needed

**When to introduce a cross-server system**

- Single-server online population stays below the matchmaking threshold
- Matchmaking wait time exceeds 30 seconds
- A seasonal leaderboard needs server-wide competition
- Operations has a clear cross-server gameplay requirement

**When to choose a dedicated trading service**

- The product requirement for a unified server-wide market is clear
- Trading frequency is already affecting main-logic performance
- Professional risk control and audit pipelines are needed

**Adequate preparation for a server merge**

- Full backup + dry-run report manually confirmed
- ID mapping plan settled (preventive design or full remap)
- Rollback script rehearsed
- Compensation plan and support scripts ready

---

## 13. Practical Case: A Complete Investigation of "23 Top-Ups Undelivered After a Server Merge"

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. Chapter 12's case went down the "data criteria" path; this one goes down the "data consistency" path: it chains Section 4.3's ID mapping and Section 4.4's stop-write discipline into one real incident—migration checks all passed, the database was consistent, and yet the books were wrong.

**Background and symptoms**: server 3 and server 7 merged into server 1, with a downtime window of 14:10–18:30. From 19:00 on opening night, customer support was flooded with 23 "top-up not credited" tickets, highly similar: all were top-ups made **after** the downtime notice (14:00) went out, and all from server 3 and server 7. Meanwhile the operations side was perfectly calm—migration row-count checks all passed and not one alert fired (the dead-letter queue was not on the alert list at the time).

### Step 1: Reconcile—First Prove "the Books Are Actually Wrong" (echoing Chapter 08's idempotency and reconciliation)

The channel side had **1060** successful charges that day (server 3: 620 + server 7: 440), and the game side had **1037** successful deliveries—a difference of **23**, exactly matching the ticket count, a difference rate of about 2.2%. The reconciliation aligned three legs—"channel charge ↔ order stored ↔ mail delivered"—rather than only counting rows in the order table: all 23 orders **were** in the order table with status "delivery failed, retries exhausted." Row-count checks guard against "lost rows," and not a single row was lost here.

### Step 2: Find the Common Factor (dimension split to locate the intersection)

The intersection of the 23 discrepant orders was not player profile, not amount, not payment channel—it was **payment time**: all fell within 14:05–14:10. The daily average for that time slot is about 8 orders, and the "final sprint" after the downtime notice lifted it to about 3 times that.

### Step 3: Root Cause—the Stop-Write Discipline Missed "In-Flight Async"

Timeline reconstruction:

```text
14:00       停服公告；运营触发合服前置检查
14:05       前置检查冻结邮件库写入（为快照做准备）
14:05–14:10 冲刺充值 23 笔：订单落库成功，发货任务投递消息队列
14:10       停写：发货 worker 的重试全部被冻结的邮件库拒绝，按退避重试
14:30       数据迁移完成：订单/玩家表 ID 重映射（库内一致，行数校验通过）
14:40       重试依次耗尽，23 条发货消息进死信队列（无告警）
18:30       开服；人工重放死信 → 仍然全部失败
```

That the replay still failed after the launch is the crux: the playerID inside the dead-letter message bodies was the **old ID from before the remap**, and per Section 4.3's design "the mapping table does not participate in business after the merge"—the mapping table was kept only for support and log tracing, and the delivery worker had no translation logic. The old ID no longer existed in the merged database, so inserting the mail was bound to fail.

Three layers of root cause, each more essential than the last:

1. **Direct cause**: old IDs in message bodies became invalid after the remap
2. **Mechanism cause**: the stop-write checklist enumerated writers as "our own services" (game server, gateway, delivery worker) instead of by "data producers"—existing delivered-but-unconsumed messages in the message queue are also a kind of "in-flight write," and a stop-write cannot stop them
3. **Design cause**: Section 4.4's row-count verification can only catch "lost rows," not "writes to the wrong path"—in-database consistency and "consistency between the database and in-flight messages" are two different things

### Step 4: Handling and Retrospective

**Stop the bleeding** (that night): use the mapping table to batch-translate the old IDs of the 23 dead letters into new IDs and replay them; 23/23 were delivered successfully, and support closed the tickets one by one.

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill item | Owner | Completion criteria |
|--------|------|---------|
| Delivery consumers integrate the ID mapping table (tagged with merge batch number, effective only for historical batches) | Delivery service | Dead-letter replay test case passes |
| Stop-write checklist adds "in-flight messages drained to zero": consumer lag must reach zero before migration may begin | Ops | Checklist review passed |
| Three-way reconciliation alerts on any difference > 0 (previously a T+1 manual report) | Data/Ops | Alert drill performed once |
| Dead letters drained to zero within 1 hour of the merge window ending | Ops | Written into the server-merge runbook |

### Three Lessons from the Case

- **"Stop writes" means all data producers, not just your own services**. Channel retries, scheduled tasks, and messages already sitting in the queue are all write sources—only a checklist enumerated by producer makes stop-write completeness possible
- **Design assumptions must have their invalidation conditions annotated**. "The mapping table does not participate in business after the merge" holds only if there is no in-flight reference that crosses the remapping moment; when the assumption breaks, the symptom (delivery failure) and the assumption itself are far apart, making it extremely hard to connect them while debugging
- **Row-count checks guard against "loss"; reconciliation guards against "wrongness"**. Migration checks (row counts, primary-key uniqueness) and business reconciliation (order ↔ delivery ↔ credit) are two independent gates, and a merge cannot do without either—all 23 orders passed the row-count check, and the books were still wrong

---

## Chapter Summary

| Question | Short answer |
|------|------|
| What about tied leaderboard scores? | A composite score encodes a timestamp for first-come-first-served, or allow tied ranks (as a design rule); align with the designers before settlement |
| Where does season-reset old data go? | Key by season, snapshot at settlement into an archive table, pay out with the "season + player" idempotency key |
| Data ownership in cross-server gameplay? | Snapshot in (home server packages a read-only snapshot), cross-server host autonomy, settle back (reliable message back to the home server for payout); failure domains isolated |
| The biggest hidden pit of a server merge? | Player ID collisions. Prevention: encode the server number into IDs; remediation: full remap + keep the mapping table permanently |
| Row-count checks all passed—why did the merge still lose the books? | Row-count checks guard against "lost rows," not in-flight messages—drain in-flight messages to zero by "data producer" (consumer lag zero), and pre-integrate ID-mapping translation in consumers (see the case in Section 13) |
| How to anti-cheat combat settlement without dragging down performance? | Tiered validation: full recompute for ranking-related play, bound checks for ordinary dungeons (damage cap / minimum duration), spot checks for low risk |
| Why is the inventory two-phase commit reliable? | Pre-check is read-only, execution is exclusive—premised on the single-writer model guaranteeing no concurrent modification of one player's data |
| Why can't server-wide mail generate a million records? | One template + judged at login + a claim table recording proofs, deferring an O(N) write into O(1) |
| The trading system's first line of defense? | Rules, not patches: price bands, rate limits, same-person limits, handling fees, newly acquired item limits, anomaly detection |

## Further Reading

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
- [genre-coverage](/system/genre-coverage.md)


