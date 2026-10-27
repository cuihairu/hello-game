# 11 Auxiliary Systems Design

> Matchmaking and rating, lobby and rooms, relays, chat, friends and player status do not directly produce gameplay content, yet they shape the feel of every interaction a player has. This chapter records the boundaries and implementation trade-offs of these auxiliary systems.
>
> References: the auxiliary-systems framework in *Million Online*, and the state pattern in *Game Programming Patterns* (Robert Nystrom).

Auxiliary systems are the "housekeeping team" of an online game — they do not take part in the battle itself, but they manage every step of a player's journey from login to exit. Matchmaking, lobby, chat, friends, achievements, payment... These systems look independent, but in practice they are tightly interwoven and together form the foundation of the player experience.

A common misconception is to treat auxiliary systems as "simple features". In fact, the design quality of auxiliary systems directly determines the "feel" of the game — whether matchmaking waits 30 seconds or 3, whether a chat message lags by 100ms or 1s, whether the friends list loads smoothly or stutters — these details accumulate into the player's answer to "do I want to keep playing".

Auxiliary systems have another easily underestimated trait: they are **operations amplifiers**. When traffic is calm they look like peripheral capabilities; the moment a new season launches, an event opens, or a streamer brings a wave of users, matchmaking, chat and friends become the traffic center, the controversy center and the failure center at the same time. Capacity design for auxiliary systems must be based on the "operations peak" rather than the "daily average".

---

## 1. Auxiliary Systems Overview

### 1.1 System Categories and Responsibilities

Auxiliary systems can be divided into four categories by function:

| Category | Systems | Core responsibility | Why it matters |
|------|------|---------|-----------|
| Social connectivity | Matchmaking, lobby, friends, chat, voice | Connect players to each other | Social is the core driver of retention |
| Data management | Achievements, leaderboards, player status | Record and display player growth | Achievement is a fundamental player need |
| Operations support | Client update, sensitive-word filtering, mute | Keep the game operable | Safety and compliance are the baseline |
| Commercial monetization | Payment authentication, virtual currency | Support the business model | No revenue means no further development |

Leaderboards, events and mail — these three "operations-heavy" systems are already covered from a gameplay perspective in chapter 10, so this chapter does not repeat them and focuses on the remaining "connectivity" systems.

### 1.2 Dependencies Between Systems

```text
                      ┌──────────────┐
                      │   登录网关    │
                      └──────┬───────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                   ▼
    ┌──────────┐      ┌──────────┐        ┌──────────┐
    │  游戏大厅  │      │ 匹配系统  │        │ 状态系统  │
    └─────┬────┘      └─────┬────┘        └────┬─────┘
          │                  │                  │
   ┌──────┼──────┐           │        ┌─────────┼─────────┐
   ▼      ▼      ▼           ▼        ▼         ▼         ▼
┌──────┐┌──────┐┌──────┐┌──────────┐┌──────┐┌──────┐┌──────┐
│ 聊天  ││ 好友 ││ 公会 ││ 对战服务器││聊天去重││好友在线││禁言   │
└──────┘└──────┘└──────┘└──────────┘└──────┘└──────┘└──────┘
```

**Key dependency**: the status system is the shared data source for several auxiliary systems — chat needs it to deduplicate broadcasts, the friends list needs it to display online state, and matchmaking needs it to judge whether a player is idle. If the status system fails, chat, friends and matchmaking will fail one after another.

This also determines the design goal for the status system: it should be a **degradable** shared dependency. When a status query fails, chat would rather broadcast a few extra messages (treating offline players as online and trying anyway) than refuse chat outright — partial correctness beats total unavailability.

> **Pitfall**: many teams treat auxiliary systems as "attachments" and cut development time for them first when resources are tight. This is short-sighted — a MOBA with high matchmaking latency will lose players no matter how fun the core gameplay is.

---

## 2. Matchmaking and Rating Systems

### 2.1 What Problem Does Matchmaking Solve?

The matching system is responsible for grouping players of similar skill together. The core conflict it solves is **the balance between wait time and match quality**: the longer you wait, the wider the matching range can be and the more controllable the match quality; the shorter you wait, the smaller the candidate pool and the more random the quality. There is no perfect solution to this conflict, only dynamic balance.

Players have a "psychological threshold" for matchmaking wait — roughly 30 seconds for MOBA games, about 15 seconds for FPS games, about 60 seconds for turn-based games. Once the threshold is exceeded, churn rises noticeably. All parameter tuning of the matching system ultimately lands on this constraint.

The implementation of the matching pool (dynamically expanding the rating range, bucketed brokering) is covered in section 3 of chapter 10; this section focuses on the other half: **how to quantify a player's skill**.

### 2.2 Elo: Classic but Limited

The Elo system is the most classic player rating algorithm; its core idea is: **beating a stronger opponent earns many points, beating a weaker opponent earns few**.

Expected win rate = 1 / (1 + 10^((opponent rating − own rating)/400)). The K value determines the size of the rating swing per match — a larger K swings more and suits rapid placement of new players; a smaller K swings less and suits stable ranking for high-level players.

```go
// Elo 评分更新
func UpdateRatings(ratingA, ratingB, k, actualA float64) (newA, newB float64) {
    expA := 1.0 / (1.0 + math.Pow(10, (ratingB-ratingA)/400.0))
    newA = ratingA + k*(actualA-expA)
    newB = ratingB + k*((1.0-actualA)-(1.0-expA))
    return math.Max(newA, 100), math.Max(newB, 100) // 下限 100 分
}
```

**Limitations of Elo**:

- Assumes player skill is fixed and ignores state fluctuation
- Has no concept of "uncertainty" — using the same K value for new and veteran players is unreasonable
- Unsuitable for team games; cannot distinguish "I carried the game" from "I got carried"
- The rating of a player who has not played for a long time does not decay, so the rating is distorted upon return

### 2.3 Glicko-2: Introducing Uncertainty

Glicko-2 introduces two key concepts on top of Elo:

- **Rating deviation RD (Rating Deviation)**: the uncertainty of the rating. For a player who has not played for a long time, RD grows and the system is "unsure" of their true level; players with a large RD also see larger per-match rating changes.
- **Volatility σ (Volatility)**: the stability of a player's performance. Players whose performance swings wildly have a large σ, and their rating changes faster.

This means: new players and returning players are placed faster (large RD), and stable players' ratings are more resistant to disturbance (small RD) — far more reasonable than Elo's fixed K value.

A full Glicko-2 update is a five-step process (the official specification involves a dozen or so intermediate variables); in engineering practice, use an existing implementation directly (mature libraries exist in every language). The key is understanding the business meaning of the parameters:

| Parameter | Meaning | Common value | When to tune |
|------|------|---------|---------|
| Initial rating | Starting rating for a new player | 1500 | Set the baseline by the numerical team |
| Initial RD | Uncertainty for a new player | 350 | Larger places players faster but is jitterier |
| RD growth | Increment per settlement cycle | Correlates with inactivity duration | Decay during the off-season between seasons |
| τ (system constant) | Suppression of volatility change | 0.3-1.2 | Smaller makes the rating more stable |

A practical simplification: if the team only needs the two features "fast placement for new players + stable ratings for veterans", it can approximate Glicko-2 with **tiered-K Elo** (K=64 for <50 matches, K=32 for <100, K=16 thereafter), at an order of magnitude lower implementation cost. Glicko-2 is worth introducing when the competitive stakes are high (season ladder, professional tournaments) and team games need to split out individual contribution.

### 2.4 Rating Handling for Party Matchmaking

Party matchmaking must balance the team's overall rating with individual ratings. A simple average is easily exploited for "rating boosting" — a high-rated player parties with a low-rated player, matches against mid-level opponents, and wins easily.

Available options:

- **Weighted average**: low-rated players get higher weight, pulling the team's matching rating up to counter "rating boosting"
- **Match on the team's highest rating**: fairest, but increases wait time for high-rated players
- **Party penalty factor**: a fixed percentage uplift to the effective rating of partying players

None of the three is absolutely better than the others; it depends on the product's trade-off between "party-friendliness" and "fairness". The common practice is to uplift party effective rating by 5%-10%, which suppresses rating boosting without over-punishing parties.

### 2.5 Evaluating Matchmaking Quality

Matchmaking quality can be measured along two dimensions: **rating gap** (the rating difference between the two sides of a match — smaller is better) and **wait time** (shorter is better). After launch, it is recommended to monitor both continuously:

- **Rating-gap distribution**: a P90 gap above the threshold means matching is too loose (expanding too fast)
- **Wait-time distribution**: a P90 wait above the psychological threshold means matching is too tight or the player base is too small

These two indicators trade off against each other; parameter tuning is just choosing an operating point on the curve.

> **Pitfall**: the most common trap in matchmaking is "matching oscillation" — player A wins and gains rating, then matches against a stronger opponent B and loses and drops rating, then matches a weaker opponent C and wins and gains rating again... in an endless cycle, which is a terrible player experience. Mitigations are capping the per-match rating change, and preferring opponents with "similar recent state" when matching (do not immediately match a win streak against a loss streak).

### 2.6 Scheme Selection

| Scenario | Options | Reason |
|------|---------|------|
| 1v1 competitive | Elo / Glicko-2 | Classic schemes, simple and effective |
| 5v5 MOBA | Tiered-K Elo + party uplift | Team factors must be considered; splitting individual contribution is expensive |
| Battle royale (100 players) | Tiered matching + wait expansion | Large headcount; needs fast game assembly |
| Turn-based card | Simple Elo + async settlement | Does not need real-time matching |

---

## 3. Game Lobby and Rooms

### 3.1 The Dual Role of the Lobby

The game lobby is the first interactive surface a player sees after entering the game, and it carries a dual role: an **information display center** (showing the room list, online players and event info) and a **social hub** (creating rooms, inviting friends, starting matchmaking).

Lobby design directly affects the player's "first impression". A lobby that loads slowly and shows a chaotic mess of information will make players lose interest before they even enter a game.

First answer one architectural question: **should the lobby service and the room service be separated**?

- **Combined** (the lobby process also hosts rooms): simple deployment, suitable for casual games with few rooms. The downside is that heavy room computation drags down lobby responsiveness, and failure domains are not isolated.
- **Separated** (the lobby only handles lists and scheduling, while rooms run on independent room servers): the lobby stays lightweight and stable, and room servers scale elastically with load. The mainstream choice for multi-player online games.

After separation, the lobby's responsibility degenerates to a **room registry + matchmaking entry**: when creating a room it requests resources from a room server and registers the room's metadata (ID, capacity, mode) with the lobby; when a player joins, the registry routes them to the corresponding room server.

### 3.2 Room State Machine and Concurrency Issues

Room management has to solve a few key problems:

1. **Room state consistency**: player A sees that a room still has a free seat, but by the time they click join the room is full — the most common concurrency problem in a lobby
2. **Host transfer**: when the room host leaves, transfer automatically to the next player
3. **Room cleanup**: clean up empty rooms promptly to prevent memory leaks

```go
type RoomState int

const (
    RoomStateWaiting  RoomState = iota // 等待中
    RoomStateStarting                  // 启动中
    RoomStatePlaying                   // 游戏中
    RoomStateFinished                  // 已结束
)
```

The root of "I saw a free seat but the join failed" is **the time gap between the list read and the join action**. The common way to handle this is not to pursue an absolutely real-time list, but rather: when the join request reaches the room, do a second confirmation, and if full return a clear error and trigger the client to refresh the list. A room list is a high-fan-out read by nature, and taking a distributed lock for it is not worth the cost — turning "occasional join failure" into one smooth automatic retry actually yields a better experience.

Both host transfer and joining a full room require **serializing state changes within a room** — dispatch all room operations onto the room's single-writer queue (the single-writer principle from chapter 5 applied at the room level), and the state machine transitions will have no races.

### 3.3 Ghost Rooms

> **Pitfall**: the most common bug in a lobby system is the "ghost room" — the room no longer has any players, but because of concurrency problems in the cleanup logic the room is not deleted correctly, and it keeps occupying memory and showing up in the list. The solution is **periodic scanning as a fallback**, rather than relying only on player-leave events to trigger cleanup.

```go
// 定期巡检：回收异常房间（大厅定时任务，每 30 秒）
func (h *Hall) sweepRooms(now time.Time) {
    for id, r := range h.rooms.Snapshot() {
        if r.MemberCount() == 0 && now.Sub(r.LastActive) > 2*time.Minute {
            h.closeRoom(id, "empty_timeout") // 空置超时，强制回收
        }
        if r.State == RoomStatePlaying && now.Sub(r.StartedAt) > r.MaxDuration {
            h.closeRoom(id, "overtime") // 对局超时（防止死循环对局）
        }
    }
}
```

Event-driven cleanup (deleting when the last player leaves) is the fast path, and timed scanning is the slow-path fallback — you need both. This principle applies to every "resource lifecycle management" scenario: connections, sessions, temporary files.

---

## 4. Relay Server

### 4.1 Why a Relay Is Needed

A relay server is used for NAT traversal and data forwarding in P2P games. When two players cannot establish a direct P2P connection (for example, both are behind symmetric NAT), the relay server acts as a middleman forwarding the packets.

The relay is the "fallback plan" for P2P games — always try a direct connection first, and use the relay only when that fails. This balances low latency (direct) with high availability (relay as a safety net). It should be noted that competitive games pursuing fair play usually do not adopt a P2P topology (server authority requires a dedicated server); relay schemes appear more often in co-op and casual P2P games.

### 4.2 NAT Traversal Strategies

The core idea of NAT traversal is to pick the optimal connection strategy based on both sides' NAT types.

```text
NAT 类型判断：
├── 双方都无 NAT（公网 IP）→ 直连（延迟最低）
├── 一方是完全锥形   → STUN 穿透（成功率高）
├── 双方都是受限锥形 → 同时打洞（概率穿透）
├── 一方是对称 NAT   → 基本需要 TURN 中继
└── 双方都是对称 NAT → 必须 TURN 中继
```

In engineering practice, do not maintain your own NAT type database and decide by hand — adopt the standard protocol stack directly (STUN probing + ICE candidate ordering + TURN fallback, i.e. WebRTC's connection-establishment flow), hand "route selection" to a mature ICE implementation, and focus the self-developed part on relay deployment and cost.

### 4.3 Cost Control of Relays

Relay servers have high bandwidth cost — every pair of players' relayed traffic is billed as bidirectional traffic. Control levers:

- **Prefer direct connections**: relay usage rate is a core monitoring metric (usually kept below 15%); if it rises abnormally, investigate the NAT probing logic
- **Session timeout**: automatically release idle sessions
- **Regional deployment**: place relay nodes close to player clusters so forwarding latency stays controllable
- **Bandwidth alerts**: when a single node's bandwidth exceeds the threshold, refuse new sessions and steer them to idle nodes

> **Pitfall**: the most common problem with relay servers is the "session leak" — when a player exits abnormally the session is not closed correctly, so the relay port stays occupied. The solution is heartbeat detection + timeout cleanup, the same principle as the "timed scan fallback" used for room reclamation.

---

## 5. Chat System

### 5.1 Channel Model

A chat system needs to support multiple channels (world, guild, team, private), real-time message delivery, sensitive-word filtering and message persistence. The core of channel design is **how the subscription relationships are stored**:

| Channel type | Member set | Member change frequency | Subscription storage |
|---------|---------|------------|------------|
| World channel | All online players on the server | Every login/logout | No member table; broadcast to "currently online" |
| Guild channel | Guild members | Low | Stored with guild data |
| Team channel | Team members | Medium | Stored with team data |
| Private chat | Two players | - | No subscription table; directed delivery by ID |
| System channel | All players on the server | - | Same as the world channel |

The world channel's "no member table, broadcast to the online list" is an important simplification: the online list is maintained by the status system anyway (section 8), so chat just takes a snapshot of it at broadcast time, avoiding a consistency problem with a second copy of member data. The cost is that broadcast granularity can only reach "online players" and "partial subscription to the world channel" is impossible — the vast majority of games do not need that capability.

### 5.2 Performance Bottleneck of Broadcasting

The biggest performance bottleneck of a chat system is **world-channel broadcast** — with more than 100,000 online players, one world message means 100,000 deliveries. Synchronous broadcast blocks the message-processing loop, so it must be made asynchronous:

- **Async send**: persist first, then enqueue for broadcast; a send failure does not roll back the message
- **Sharded broadcast**: group by gateway connection; each gateway connection only needs one copy of the message and fans it out to all players behind it — broadcast volume drops from "number of players" to "number of gateway connections", which is the biggest optimization
- **Priority queue**: system announcements take precedence over ordinary chat
- **Client rate limiting**: players have a speak cooldown (e.g. one message per 5 seconds), which is both anti-spam and server self-protection

"Fanning out via the gateway" is worth emphasizing: the broadcast fan-out point should sit as close to the clients as possible (the gateway layer), rather than constructing 100,000 send tasks one by one inside the logic server. The logic server only says "broadcast this message to the world channel"; how to fan it out is the gateway's business.

### 5.3 Sensitive-Word Filtering

Sensitive-word filtering is the safety floor of a chat system and also a compliance requirement (see chapter 18 for the relevant regulatory requirements). The core challenge is **balancing performance and accuracy**: filtering too slowly blocks message sending, while filtering too loosely lets violating content through.

A common scheme is a **Trie tree + text preprocessing**:

```go
// Trie 敏感词匹配：查询耗时与文本长度成正比，与词库大小无关
type node struct {
    children map[rune]*node
    end      bool
}

type Filter struct{ root *node }

func (f *Filter) Match(text string) (hit bool) {
    runes := []rune(normalize(text)) // 预处理：繁转简、全半角统一、去干扰符
    for i := 0; i < len(runes); i++ {
        cur := f.root
        for j := i; j < len(runes) && cur.children != nil; j++ {
            cur = cur.children[runes[j]]
            if cur == nil {
                break
            }
            if cur.end {
                return true // 命中：实际项目中替换为 *** 并记录审计日志
            }
        }
    }
    return false
}
```

Preprocessing matters as much as matching: homoglyph substitution (swapping a character for a visually identical one with a different code point), traditional characters, full-width characters and inserted symbols are all common bypass techniques, so the dictionary needs continuous supplementary variants during operations. When the dictionary is large or variant rules are complex, upgrade to an AC automaton (one traversal matching all words), or hook into a cloud vendor's content-safety API as a fallback re-check.

### 5.4 Mute and Punishment

The first question in mute design is **punishment granularity**: bans should be distinguished across three levels — account, character and device — a character ban restricts only in-game speech, an account ban restricts login, and a device ban targets mass-alt abuse. Chat punishment usually lands at the character level (mute), escalating to the account level for serious violations. Mixing the granularities into a single level (just one "ban" field) is a common root cause of later conflicts between customer support and risk control.

> **Pitfall**: the most common security problem in a chat system is "message injection" — players embed malicious content in chat messages and exploit client-side rich-text parsing vulnerabilities to carry out attacks. Chat content should be treated as plain text: the server strips control characters and formatting markers, and the client escapes everything uniformly when rendering; games that support emoji codes should use a whitelist parser, not general-purpose rich text.

---

## 6. Mail System (From the Auxiliary-System Perspective)

The mail system's storage model (separating personal mail from server-wide templates), idempotency of attachment claiming and expiry cleanup are fully covered in section 8 of chapter 10; this section only adds the two points specific to the auxiliary-system perspective.

**Distinguish the grant source.** Mail is the final outlet for reward delivery, and one compensation mail can come from three paths: automatic system grant (event settlement), operations-console grant (manual operation) and manual customer-support reissue (ticket handling). The transaction ledger should record a source marker — when an "over-grant" incident occurs you can immediately locate whether it was a configuration error, a misoperation or a script replay, and it also makes it easy to configure different approval permissions for the three types of operations.

**Send bulk mail through a queue, not synchronously.** Even with the server-wide template scheme, there are scenarios where mail must be generated per player (targeted compensation filtered by condition). Such bulk jobs should be dispatched to a background queue and consumed at a rate limit, with progress displayed on the operations platform (sent/total, retry count for failures) — "clicking the send button and not knowing what happened" is a breeding ground for operations incidents.

---

## 7. Friends System

### 7.1 Relationship Model

The friends system manages the social relationships between players. Core design decisions:

- **One-way or two-way**: most games use two-way friendship — A adds B, B automatically becomes A's friend, and the relationship is symmetric. The common data practice is to store only one edge record (owner, friend) and query "my friends" by the owner index; alternatively, store two bidirectional records for query efficiency. The two differ little; the key is not to store one edge while also deriving the bidirectional relationship, which causes state inconsistency during server merges or friend deletions.
- **Quantity cap**: a friends cap is both numerical design and storage protection. Typically 50-200.
- **Request queue**: a stranger's request enters a "request list" rather than making them a friend directly; the list has a cap (e.g. 50 entries) to prevent request-spam harassment.

### 7.2 Online Status Sync

Friend status sync is the technical difficulty of the friends system. Assume 1,000,000 online players with 50 friends each; one status change means 50 pushes — total server-wide push volume easily reaches the tens of millions per second.

Optimization strategies, in increasing order of investment:

- **Merged status push**: rather than pushing on every status change, batch-push friend status changes periodically (e.g. every 5-10 seconds). Most scenarios (showing a green dot on the friends list page) are insensitive to second-level latency.
- **Subscribe on demand**: only players with the friends list / social UI open receive real-time pushes, and they unsubscribe when the UI closes. This turns "a permanent fan-out to 50 always-online friends" into "a fan-out to a handful of active UI instances".
- **Tiered status**: push only the three states "online / offline / in game", not finer states (map, room number) — the client queries fine-grained state on demand.

**The blacklist check for status pushes** must happen on the push side, not the display side: after A blocks B, the determination of "can B find out that A is online" should occur in A's status push chain (B is not in A's push targets), rather than waiting for B's client to issue a query and then rejecting it — the latter would let B infer that A is online from the fact that "the query does not error".

---

## 8. Player Status System

### 8.1 Core Responsibilities

The player status system manages a player's online state, game state and activity info. It is the shared data source for many systems — the friends list needs to know whether a player is online, the matching system needs to know whether a player is currently idle, and chat needs to know whether a player is muted.

Data consistency in the status system is critical: if the status system reports a player online but they have actually disconnected, it causes message delivery failures, matchmaking seat occupation and so on. The reverse (actually online but reported offline) is less harmful, at most the message takes the offline path.

**Should the status data key be character or account?** "Session-state" data such as online, position and room is keyed by character (one account may have multiple characters / multiple server regions); "punishment-state" such as mute and ban needs to be pinned to the account or character level (see section 5.4). This distinction gets asked again and again in server merges and multi-character products, so it should be written into the data dictionary at design time.

### 8.2 Online Detection: Heartbeat and TTL

The core of online-state detection is the **heartbeat mechanism**: the client periodically (e.g. every 30 seconds) reports activity to the server, and the server updates the "last active time"; if no update arrives within the threshold (e.g. 90 seconds), the player is judged offline.

When implemented with Redis you can use **TTL auto-expiry** instead of active deletion — one TTL-bearing key per online player, the heartbeat simply renews it, and after a disconnect the key expires naturally:

```go
// 心跳续期：key 的存活即"在线"
func (s *StatusService) Heartbeat(playerID uint64) error {
    return s.redis.Set(s.ctx, onlineKey(playerID), s.now(),
        90*time.Second).Err() // TTL 即离线判定阈值
}

func (s *StatusService) IsOnline(playerID uint64) bool {
    n, err := s.redis.Exists(s.ctx, onlineKey(playerID)).Result()
    return err == nil && n > 0
}
```

The benefit of the TTL scheme is that **offline determination needs no cleanup task at all** — even an abnormal disconnect (power loss, killed process) leaves no "ghost online". The heartbeat-frequency trade-off: too frequent adds load, too sparse makes offline detection latency high. A 30-second heartbeat + 90-second timeout (tolerating 3 missed heartbeats) is a common configuration.

### 8.3 Differences by Game Type

| Game type | Status complexity | Core states | Special considerations |
|---------|-----------|---------|---------|
| MMO | High | Online, map, level | Map switching, party state |
| MOBA | Medium | Online, matchmaking, in game | Matchmaking state, spectating state |
| Card | Low | Online, lobby | Turn-based does not need real-time status |
| Idle | Very low | Online, offline | Offline earnings calculation |

> **Pitfall**: the most common problem in a status system is "status inconsistency" — a player is in a game, but the status system shows "online" rather than "in game", so friends see the wrong state. The mitigation is to turn status changes into events: key transitions such as entering or leaving a match are actively reported by the match server (not by the client) and carry a version number, so an out-of-order arrival has its older version discarded.

---

## 9. Code Example: Out-of-Order Defense for Status Reporting and the Minimal Skeleton for Friend Push

Section 7.2 did the math: 1,000,000 online players with 50 friends each, and one status change means tens of millions of pushes — so merged push, subscribe-on-demand and push-side blacklisting are not optimizations but survival items; the pitfall in section 8.3 additionally requires status changes to carry a version number and out-of-order older samples to be discarded outright. This section puts both ideas into a minimal Go demonstration implementation (not taken from a real project): a status center with version defense, and a friend pusher that accumulates changes and fans them out in batches. The examples are the minimal demonstration of this chapter's design decisions (not taken from a real project); the code blocks within a subsection compile through `go vet` and `go build` after being merged, and are covered by the repo-wide code block regression tests.

### Status Center: Version Numbers Discard Out-of-Order Samples

```go
// 状态中心：关键状态转换由对局服带版本号上报（8.3 节的纪律），
// 版本号不前进的上报一律丢弃——迟到与重试不会让状态回退
type PresenceHub struct {
    mu     sync.RWMutex
    state  map[uint64]string
    ver    map[uint64]uint32
}

var ErrStaleReport = errors.New("stale presence report")

// Report：上报玩家状态。ver 必须由上报方单调递增（如对局序号）
func (p *PresenceHub) Report(playerID uint64, ver uint32, state string) error {
    p.mu.Lock()
    defer p.mu.Unlock()
    if cur, ok := p.ver[playerID]; ok && ver <= cur {
        return ErrStaleReport // 乱序/重复样本：丢弃，状态不被旧值回退
    }
    p.ver[playerID] = ver
    p.state[playerID] = state
    return nil
}

// Snapshot：读某玩家当前状态（好友列表展示等读路径）
func (p *PresenceHub) Snapshot(playerID uint64) (string, bool) {
    p.mu.RLock()
    defer p.mu.RUnlock()
    s, ok := p.state[playerID]
    return s, ok
}
```

### Friend Pusher: Merged Fan-Out + Push-Side Blacklist

```go
// FriendNotifier：把状态变化攒进缓冲，定期批量扇出（7.2 节的状态合并推送）；
// 拉黑过滤发生在推送侧——被拉黑者的变化根本不进对方的待推送集合，
// 而不是等对方查询时再拒绝（避免借「查询不报错」反推在线）
type FriendNotifier struct {
    mu      sync.Mutex
    subs    map[uint64]map[uint64]struct{} // playerID → 订阅者集合
    blocked map[uint64]map[uint64]struct{} // 订阅者 → 拉黑名单
    pending map[uint64]map[uint64]string   // 订阅者 → 待推送 {playerID: 最新状态}
    flush   func(observer uint64, updates map[uint64]string) // 投递出口（测试桩/网关队列）
}

func NewFriendNotifier(flush func(uint64, map[uint64]string)) *FriendNotifier {
    return &FriendNotifier{
        subs:    make(map[uint64]map[uint64]struct{}),
        blocked: make(map[uint64]map[uint64]struct{}),
        pending: make(map[uint64]map[uint64]string),
        flush:   flush,
    }
}

// Subscribe：订阅者关注某玩家的状态变化
func (n *FriendNotifier) Subscribe(observer, playerID uint64) {
    n.mu.Lock()
    defer n.mu.Unlock()
    if n.subs[playerID] == nil {
        n.subs[playerID] = make(map[uint64]struct{})
    }
    n.subs[playerID][observer] = struct{}{}
}

// Blacklist：observer 拉黑 target——target 的状态变化从此不再推给 observer
func (n *FriendNotifier) Blacklist(observer, target uint64) {
    n.mu.Lock()
    defer n.mu.Unlock()
    if n.blocked[observer] == nil {
        n.blocked[observer] = make(map[uint64]struct{})
    }
    n.blocked[observer][target] = struct{}{}
}

// Change：状态中心收到变化后编入各订阅者的待推送缓冲。
// 同一玩家短时间多次变化，缓冲里只保留最新一份——这正是「合并」的含义
func (n *FriendNotifier) Change(playerID uint64, state string) {
    n.mu.Lock()
    defer n.mu.Unlock()
    for observer := range n.subs[playerID] {
        if n.isBlocked(observer, playerID) {
            continue
        }
        if n.pending[observer] == nil {
            n.pending[observer] = make(map[uint64]string)
        }
        n.pending[observer][playerID] = state
    }
}

func (n *FriendNotifier) isBlocked(observer, playerID uint64) bool {
    b := n.blocked[observer]
    if b == nil {
        return false
    }
    _, hit := b[playerID]
    return hit
}

// Flush：定期（如每 5 秒）批量投递，返回本轮实际推送的变更条数。
// 大多数订阅场景（好友列表的小绿点）对秒级延迟不敏感——5 秒一批，
// 推送量从「每次变化 × 好友数」降为「订阅界面数 × 批次数」
func (n *FriendNotifier) Flush() int {
    n.mu.Lock()
    defer n.mu.Unlock()
    total := 0
    for observer, updates := range n.pending {
        if len(updates) == 0 {
            continue
        }
        n.flush(observer, updates)
        total += len(updates)
        delete(n.pending, observer)
    }
    return total
}
```

Read the two together: `PresenceHub` is only responsible for "the status can be trusted" (version defense), and `FriendNotifier` is only responsible for "delivery economics" (merging + blacklist) — the status center does not care who is subscribed, and the pusher does not arbitrate whether a status is true, so the boundary matches the responsibility split in section 1.

---

## 10. Design Decision Guide

**When to choose Elo vs Glicko-2**

- **Elo (or tiered-K Elo)**: simple scenarios, 1v1 matches, no uncertainty modeling needed
- **Glicko-2**: high competitive stakes, team games needing individual contribution splitting, heavy churn of new players in and out

**Separate lobby and rooms?**

- Few rooms, light logic: combine them to reduce deployment complexity
- Heavy room computation, needs elastic scaling: separate them for failure-domain isolation

**When to introduce a relay server**

- A P2P product with diverse player NAT environments
- Direct-connection success rate below 80%
- The latency gain outweighs the relay bandwidth cost

**Fan-out layer for chat broadcast**

- Hundreds online: the logic server can deliver one by one directly
- Tens of thousands and up: fan out via the gateway, the logic server sends one broadcast instruction
- 100,000 and above: gateway sharding + priority queue + client rate limiting

**Status storage selection**

- Online state: Redis TTL key (auto-expiry, no cleanup)
- Complex session state (rooms, matchmaking progress): in-memory in the status system + snapshots, or attached directly to each business system
- Do not write high-frequency state into a relational database — the write amplification is not worth it

---

## 11. Common Pitfalls Summary

| Pitfall | Symptom | Root cause | Solution |
|------|------|---------|---------|
| Matching oscillation | Players gain and lose rating in a loop | Rating swings too large | Cap the per-match change + match similar recent state |
| Ghost room | Empty rooms occupy resources | Defect in concurrent cleanup logic | Event cleanup + timed scan fallback |
| Joining a full room | List shows a free seat but the join fails | Time gap between the list and live state | Second confirmation on join + clear error code + automatic refresh |
| Status inconsistency | Friends see the wrong state | Client reporting with no version control | Server-side reporting + version numbers discard older state |
| Duplicate mail claim | Players claim an attachment multiple times | Missing idempotency | Claim marker + idempotency key (see chapter 10) |
| Chat injection | Malicious content spreads through chat | Loose content validation | Plain text + whitelisted emoji + escaping |
| Sensitive-word bypass | Variant characters bypass the filter | Missing preprocessing | Traditional/Simplified and full/half-width normalization + ongoing dictionary maintenance |
| Relay session leak | Relay ports fill up | Abnormal exit not cleaned up | Heartbeat detection + timeout cleanup |
| Blacklist information leak | The blocked player can still infer the other is online | Blacklist check not on the push side | Filter on the push side, not reject on the display side |

---

## 12. Practical Case: A "Win Once, Get Queued Against Monsters" Matchmaking Oscillation Investigation

> The case is a demonstration example (not taken from a real project); numbers are rounded and simplified, and the focus is on the investigation approach and the backfill logic.

**Background and symptoms**

After the season update, player feedback converged on a single line: "win once and I get queued against someone I cannot beat, lose once and I get queued against someone I can beat anyone" — the results swing like a pendulum. **815** support tickets; in a sample of **2000** matches, **1260** had alternating wins and losses, an alternation rate of **63**%. Matchmaking wait did not get longer, yet players felt "the system is targeting me".

### Step 1: Symptoms and Definitions

Align the definitions against the **2** quality indicators from section 2.5, from three angles:

- **Wait definition**: P90 wait of **28** seconds, within the **30**-second MOBA psychological threshold — "matching is not slow, the system is healthy";
- **Gap definition**: P90 rating gap of **96**, exceeding the threshold by **60%** — "matching is too loose";
- **Rating-ledger definition**: a fixed K=**64** across all tiers, with a balanced match moving the rating by **32** per match — the rating itself is swinging widely.

**Definition gap**: of the **2** quality indicators, the project only monitored **1** — wait made it onto the dashboard, gap did not, so the matchmaking system's definition of health was missing half.

### Step 2: Layered Attribution

```text
匹配层   等待 P90 28 秒，在 30 秒阈值内——窗口扩展节奏没有失控
评分层   固定 K=64 全段位：均衡对局单场变化 32 分，评分围绕真实水平大幅摆动
窗口层   匹配按瞬时评分取窗，三场累计摆幅 96 分被如实撮合——分差是评分摆出来的，不是窗口扩出来的
观测层   等待 P90 进了面板，分差 P90 没进——质量的另一半从未被度量
```

**Ledger converges**: with a fixed K=64, the expected 50% balanced match moves the rating by = 64 × 0.5 = **32**; three consecutive matches accumulate a swing of 32 × 3 = **96**, which is exactly the measured P90 rating gap. Substituting a 96-point gap into the expected formula from section 2.2: expected win rate slides from **50**% to **37**% (1/(1+10^(96/400))) — after winning this match, the next has a **63**% probability of a loss, which fits the measured alternation rate of 1260/2000 = **63**% exactly: it is not that the system is targeting anyone, it is that the K value pushed the rating to the point where "win one and you should lose one".

### Step 3: Root Cause

1. **Direct cause**: a fixed K=64 across all tiers — the **2**nd of the **4** Elo limitations in section 2.2, "using the same K value for new and veteran players is unreasonable", was hit directly: new accounts should use a large K for fast placement, but veterans' 64-point budget was entirely spent on jitter in stable tiers.
2. **Mechanistic cause**: neither of the **2** mitigations in the pitfall block of section 2.5 was implemented — no cap on the per-match change, and no "similar recent state" matching; the 32-point swing per match expanded over three matches into a 96-point gap, and the window matched honestly against the instantaneous rating, so oscillation was an inevitable result.
3. **Deeper cause**: section 2.5 says the two indicators trade off against each other and tuning is choosing an operating point on the curve, but the project treated only wait P90 as its north star; the **1**st row of the **9**-row pitfall table in section 11, "matching oscillation" — symptom, root cause and solution all written out plainly across three columns — but it was sitting in the table with no corresponding monitoring or gate.

### Step 4: Remediation and Backfill

1. **Segment the K**: three K tiers — <50 matches use **64**, <100 use **32**, the rest use **16** — fast placement for new accounts, stable ranking for veterans, consistent with the tiered scheme in section 2.3.
2. **Cap + similar state**: set a cap on the per-match rating change and prefer opponents with "similar recent state" when matching — both mitigations from section 2.5 landed; for the veteran tier, 8 points per match × 3 matches = **24** points, and the P90 gap drops from **96** to **24**, below the **60**-point threshold.
3. **Dual-indicator alerting**: the P90 gap threshold of **60** enters alerting, on the same dashboard as P90 wait — the tuning operating point is now defined jointly by two dimensions.
4. **Repositioning for returnees**: during the off-season between seasons, start RD growth per the parameter table in section 2.3, so returning players enter a high-uncertainty period and are quickly repositioned — the rating is no longer "set once for life".

**Recheck**: support tickets **815** → **0**; in a recheck sample of **2000** matches, **1060** alternated = **53%** (substituting a 24-point gap into the expected formula, the probability of a loss after a win is 100 − 47 = 53%); P90 wait is still **28** seconds — the gap came down while wait was not tuned worse.

**Backfill checklist**:

| Backfill item | Landing point | Back-reference |
|--------|------|------|
| Tiered K and the per-match cap implemented | Rating service | Chapter 11, sections 2.2 and 2.3 |
| Similar-state matching enters the window strategy | Matching strategy | Chapter 11, section 2.5 pitfall block |
| Dual-indicator alerting on P90 gap and P90 wait | Monitoring and alerting | Chapter 11, section 2.5 / Chapter 13 |
| Off-season RD decay enters the rating configuration | Rating configuration | Chapter 11, section 2.3 parameter table / Chapter 17 |

### Three Lessons from the Case

1. **Conflicting indicators must be read together** — wait and gap trade off against each other; if you only watch half, the other half's oscillation becomes your bill (the two indicators in section 2.5).
2. **The K value is a volatility budget** — a fixed K=64 spent the entire budget on veterans' stable tiers; tiered K grades the budget by match count (the tiered scheme in section 2.3).
3. **Only a formula that reconciles counts as a diagnosis** — 37% and 63% are not feelings; they come out of substituting a 96-point gap into the expected formula from section 2.2, then matching it against the measured 1260/2000, so the root cause was "computed" rather than "guessed".

---

## Summary

| Question | Short answer |
|------|------|
| What is the core conflict of the matchmaking system? | The balance between wait time and match quality; parameter tuning picks an operating point around the player's psychological threshold |
| How to choose between Elo and Glicko-2? | Tiered-K Elo is enough for simple scenarios; go to Glicko-2 for high competitive stakes or when team contribution splitting is needed |
| Should the lobby and rooms be separated? | Separate them when room computation is heavy and elastic scaling is needed; the lobby degrades to a room registry + matchmaking entry |
| The general principle for resource cleanup (rooms / relay sessions)? | Event-driven fast path + timed-scan slow-path fallback; neither alone is sufficient |
| How to broadcast a 100,000-player world channel? | The logic server issues one broadcast instruction and the gateway layer fans out in shards — the fan-out point sits as close to the clients as possible |
| Key points of sensitive-word filtering? | Trie matching (independent of dictionary size) + preprocessing to resist variants, with ongoing dictionary maintenance |
| How to determine online status? | Heartbeats renew a Redis TTL key; expiry means offline, so no cleanup is needed and abnormal disconnects are handled |
| Why should bans be tiered? | Account / character / device have different granularities; mixing them into one level makes customer support and risk control fight each other |

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [genre-coverage](/system/genre-coverage.md)
