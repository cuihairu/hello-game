# 08 Data Storage and Middleware

> A game backend is not done once "the logic runs." The real questions are: where player data is stored, how to recover after disconnect and reconnection, how to re-grant a successful top-up, how to track economic transaction records, how event tracking flows into the analytics pipeline, how to trace back event results, and how to reconcile, backfill, and roll back when something goes wrong. Without databases and middleware, none of this holds together.
>
> On game data storage I focus on a few sets of practical trade-offs: how hot/warm/cold data is tiered, what cache consistency costs, and how Kafka + ClickHouse carry the data analytics pipeline. I also reference the data architecture discussions in "One Million Online".

---

## 1. Where does game data actually live?

### Storage component selection: let each tool do what it does best

Many teams stuff everything into MySQL, only to find leaderboard queries getting slower and slower, online-status synchronization struggling, and event-tracking writes dragging down the business database. The root cause is **failing to pick the right storage component for each data characteristic**.

The core point of "Game Server Architecture and Optimization" is: **there is no universal database, only databases that fit specific scenarios**. Like a screwdriver and a hammer in a toolbox — you don't use a hammer to drive a screw, nor a screwdriver to nail a nail.

| Component | Positioning | Game scenarios | Characteristics |
|------|------|---------|------|
| **MySQL** | Core persistence | Accounts, characters, orders, inventory, quests | Transactions, ACID, mature ecosystem |
| **Redis** | Hot data | Online status, cache, leaderboards, rate limiting | Extremely fast, in-memory, expiration mechanism |
| **Kafka** | Event streams | Event tracking, async decoupling, peak shaving | High throughput, persistent, replayable |
| **ClickHouse** | Offline analytics | Behavior analysis, operations analysis, economy analysis | Column store, OLAP, blazing aggregation |
| **DuckDB** | Local analytics | Development debugging, ad-hoc reports | Embedded, no server needed |
| **MongoDB** | Semi-structured | Configuration, logs, gameplay data | Flexible schema, document-oriented |

### One-line positioning

```text
Redis     → 快（热数据、缓存、计数器）
MySQL     → 稳（核心业务、事务保证）
Kafka     → 流（事件管道、异步解耦）
ClickHouse → 算（分析聚合、报表）
DuckDB    → 轻（本地分析、开发调试）
MongoDB   → 灵（Schema自由、文档存储）
```

### Performance baseline of each component

| Component | Single-instance QPS | Latency | Data scale | Cost |
|------|----------|------|---------|------|
| MySQL | 10K-50K | 1-10ms | TB-level | Medium |
| Redis | 100K-500K | <1ms | GB-level | Medium |
| Kafka | 1M+/s | 5-20ms | PB-level | Low |
| ClickHouse | 10M rows/s | 100ms | PB-level | Medium |
| DuckDB | 10K-100K | 1-10ms | GB-level | Very low |
| MongoDB | 10K-100K | 1-10ms | TB-level | Medium |

> **Key to selection**: don't just look at QPS and latency — also look at **data scale** and **cost**. Redis is fast, but memory is expensive — putting 100GB of data entirely in Redis is unrealistic. MySQL is stable, but high-concurrency writes become a bottleneck.

---

## 2. A typical layered architecture: how data flows

### Why layering?

Imagine a scenario: a player tops up 6 yuan for 60 diamonds. This operation involves:

1. Calling the payment platform to confirm the charge (external API)
2. Adding 60 diamonds to the player's account (business logic)
3. Recording an economic transaction record (audit)
4. Sending an event-tracking event (analytics)

If all operations write directly to MySQL, the database is under enormous pressure. If all operations go through Kafka, latency is too high and players can't wait. The core idea of a **layered architecture** is: **choose different processing paths based on each piece of data's real-time requirements**.

### Full data-flow panorama

```text
  玩家请求                                                      告警
    │                                                            ▲
    ▼                                                            │
┌────────┐    ┌────────┐    ┌────────┐    ┌────────────────────┐
│ 网关层 │───▶│ 业务层 │───▶│  缓存  │───▶│   MySQL 主从集群    │
│(负载均衡)│   │(Go/C++)│    │(Redis) │    │   (读写分离)        │
└────────┘    └───┬────┘    └────────┘    └────────┬───────────┘
                  │                                 │
                  │ 发送事件                        │ 同步Binlog
                  ▼                                 ▼
            ┌──────────┐                    ┌──────────────┐
            │  Kafka   │                    │    Canal     │
            │ (事件流)  │                    │ (数据同步)     │
            └────┬─────┘                    └──────┬───────┘
                 │                                 │
        ┌────────┼────────┐                       │
        ▼        ▼        ▼                       ▼
  ┌──────────┐ ┌─────┐ ┌──────┐          ┌──────────────┐
  │ClickHouse│ │Flink│ │告警  │          │ ClickHouse   │
  │(分析存储) │ │(实时)│ │系统  │          │ (业务数据)    │
  └──────────┘ └─────┘ └──────┘          └──────────────┘
```

### Three key decisions in a layered architecture

When designing a layered architecture, three key decisions must be made:

**Decision one: which data needs caching?** Not all data is worth caching. Only data that is "frequently accessed and expensive to produce" is worth caching. For example, a player's online status (accessed multiple times per second, fast to read from Redis) is worth caching, but a player's registration time (read only once at login, and not slow to read from MySQL) is not.

**Decision two: how is consistency between cache and database guaranteed?** This is the thorniest problem in a layered architecture. The Cache-Aside pattern is the common practice, but a window where "cache and database are inconsistent" still exists. For games, most scenarios can tolerate brief inconsistency (for example, a leaderboard updating a few seconds late), but critical data (such as top-up amounts) requires strong consistency.

**Decision three: is asynchronous write latency acceptable?** Kafka's write latency is usually 5-20ms, which is entirely sufficient for non-real-time data such as event tracking and logs. But for scenarios like "top-up success confirmation", the player needs to see the diamonds added immediately and cannot wait for Kafka consumption to finish before displaying — such scenarios need synchronous writes.

### Hot data vs warm data vs cold data

| Tier | Storage | Lifecycle | Access frequency | Typical data |
|------|------|---------|---------|---------|
| Hot data | Redis | Minutes to hours | Extremely high (every request) | Online status, sessions, leaderboards |
| Warm data | MySQL | Days to months | Medium (every login) | Player profiles, inventory, equipment |
| Cold data | ClickHouse/archives | Months to years | Low (on-demand queries) | Historical records, logs, statistics |

**Partitioning principle**: how often data is accessed determines which tier it belongs in. An online player's position is hot data (updated multiple times per second), a player's registration time is warm data (read once at login), and login logs from three months ago are cold data (queried only during analysis).

> **"One Million Online" lesson**: many teams define "hot data" too broadly — putting the entire player profile in Redis. In fact, only "current online status" and "equipment currently in use in the inventory" within a player profile are hot data; most fields (registration time, historical login records) have very low access frequency and MySQL is enough.

---

## 3. Common data models in games

### Core data table design principles

Game data table design should follow three principles:

1. **Transactional**: operations involving money (top-ups, trades) need transactions to guarantee consistency
2. **Extensible**: JSON fields for storing data with uncertain structure (such as equipment attributes)
3. **Queryable**: build indexes for high-frequency queries, but don't over-index (it hurts write performance)

### Core table structures

### Why is game database design different from web apps?

Game database design has several unique aspects that fundamentally differ from typical web apps (e-commerce, social):

**Different read/write ratios**: web apps are usually "read-heavy, write-light" (product browsing far exceeds ordering), while games are "write-heavy, read-light" — players are moving, attacking, and picking up items every second, and every operation may trigger a data write. This means game databases need higher write throughput.

**Different data lifecycles**: web app data lifecycles are usually long (a product may sell for years), while game data lifecycles are short — an event may last only a week, and a batch of equipment may be obsolete in a month. This means game databases need better data archiving and cleanup mechanisms.

**Different consistency requirements**: web apps have relatively loose consistency requirements (one less item in stock can be re-issued), while games have extremely high consistency requirements — top-up amounts must not be wrong, economic transaction records must not be lost, leaderboards must not be scrambled. This means game databases need stronger transactional guarantees.

```sql
-- 玩家账号（约10行核心字段）
CREATE TABLE account (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TINYINT DEFAULT 1  -- 1正常 0封禁
);

-- 角色档案
CREATE TABLE player (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    server_id INT NOT NULL,
    nickname VARCHAR(32),
    level INT DEFAULT 1,
    coin BIGINT DEFAULT 0,
    diamond INT DEFAULT 0,
    INDEX idx_account (account_id),
    INDEX idx_server (server_id)
);

-- 经济流水（审计用，不可修改）
CREATE TABLE economy_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    currency_type VARCHAR(32) NOT NULL,
    change_amount BIGINT NOT NULL,    -- 正数增加 负数减少
    reason VARCHAR(64) NOT NULL,      -- task/purchase/drop/gm
    balance_after BIGINT NOT NULL,    -- 变动后余额
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_time (player_id, created_at)
);
```

### Data model classification

| Data type | Examples | Storage location | Consistency requirement |
|---------|------|---------|-----------|
| Account data | Username, password, bindings | MySQL | Strong consistency |
| Character data | Level, experience, attributes | MySQL + Redis cache | Strong consistency |
| Inventory data | Items, equipment, materials | MySQL | Strong consistency |
| Order data | Top-ups, trade records | MySQL | Strong consistency (transactions) |
| Economic transaction records | Gold/diamond change logs | MySQL + Kafka | Strong consistency |
| Online status | Who is online, on which server | Redis | Eventual consistency |
| Leaderboards | Scores, rankings | Redis ZSet | Eventual consistency |
| Tracking events | Player behavior, click paths | Kafka | Eventual consistency |

### Pitfall: designing the economic transaction table

Economic transaction records exist for **audit** purposes, recording the balance before and after every currency change. Many teams design the transaction table to record only "how much changed", not "the balance after the change". This forces reconciliation to accumulate from the very beginning — painfully slow once data volume grows. **Recommended practice**: record `balance_after` on every change, and compare balances directly during reconciliation.

---

## 4. Data consistency and persistence strategies

### Three persistence strategies

Game data writes have three strategies; which to choose depends on consistency requirements:

**Strategy 1: synchronous writes (strong consistency)**

```text
请求 → 写MySQL → 返回成功
适用：充值、交易、关键操作
优点：数据绝对一致
缺点：延迟高，吞吐低
```

**Strategy 2: write cache first, then persist asynchronously (eventual consistency)**

```text
请求 → 写Redis → 异步写MySQL → 返回成功
适用：在线状态、非关键操作
优点：延迟低，吞吐高
缺点：Redis 挂了可能丢数据
```

**Strategy 3: publish event first, then process (event-driven)**

```text
请求 → 发Kafka事件 → 消费者处理 → 返回成功
适用：埋点、日志、异步任务
优点：解耦、削峰
缺点：延迟最高，逻辑分散
```

### Cache consistency: the Cache-Aside pattern

Cache consistency is the most common and most failure-prone link in a game server. **Cache-Aside** is the most used pattern:

```go
// 读取：先查缓存，未命中查DB
func GetPlayer(playerID uint64) (*Player, error) {
    cacheKey := fmt.Sprintf("player:%d", playerID)
    data, err := redis.Get(ctx, cacheKey).Bytes()
    if err == nil {
        var player Player
        json.Unmarshal(data, &player)
        return &player, nil
    }

    var player Player
    db.Where("id = ?", playerID).First(&player)
    data, _ = json.Marshal(player)
    redis.Set(ctx, cacheKey, data, 30*time.Minute)
    return &player, nil
}

// 写入：先更新DB，再删缓存
func UpdatePlayer(player *Player) error {
    db.Save(player)
    cacheKey := fmt.Sprintf("player:%d", player.ID)
    redis.Del(ctx, cacheKey)
    return nil
}
```

### Cache penetration / breakdown / avalanche: three problems you need to know

| Problem | Symptom | Cause | Solution |
|------|------|------|---------|
| **Penetration** | Queries for non-existent data hit the DB every time | Malicious requests or deleted data | Bloom filter + null-value caching |
| **Breakdown** | A hot key expires and a flood of requests hits the DB simultaneously | Concurrent cache rebuilds | Distributed lock; let only one request query the DB |
| **Avalanche** | Large numbers of keys expire at once and the DB is crushed | Expiration times too concentrated | Add random jitter to expiration times |

```go
// 防穿透 + 防雪崩：上表两个问题在同一处代码里的守卫形态
func getWithGuards(ctx context.Context, cacheKey string, player *Player, data []byte) (any, error) {
    if player.ID == 0 {
        redis.Set(ctx, cacheKey, "NULL", 5*time.Minute) // 防穿透：空值也缓存，穿透请求不再打到 DB
        return nil, ErrPlayerNotFound
    }
    // 防雪崩：过期时间加随机值（约2行），避免整片缓存同时失效
    ttl := 30*time.Minute + time.Duration(rand.Intn(600))*time.Second
    redis.Set(ctx, cacheKey, data, ttl)
    return data, nil
}
```

### Idempotency and reconciliation: a top-up must not be granted twice

**Idempotency** means executing the same operation multiple times yields the same result as executing it once. Top-up is the most typical idempotency scenario — a player tapping "confirm payment" twice must not be granted two sets of diamonds.

```go
// 幂等处理：检查订单状态（约10行）
func ProcessPayment(orderNo string) error {
    var order PaymentOrder
    db.Where("order_no = ?", orderNo).First(&order)
    if order.Status >= 2 {
        return ErrOrderAlreadyProcessed  // 已处理，直接返回
    }

    tx := db.Begin()
    tx.Model(&order).Update("status", 2)
    tx.Model(&Player{}).Where("id = ?", order.PlayerID).
        UpdateColumn("diamonds", gorm.Expr("diamonds + ?", 60))
    return tx.Commit().Error
}
```

> **"Game Server Architecture and Optimization" advice**: the reconciliation script should run automatically every day in the early morning, comparing the total of MySQL orders against the total of Kafka economic transaction records. A difference of more than 0.01 yuan triggers an alert.

---

## 5. Typical Redis usage in games

### Mapping Redis data structures to game scenarios

| Data structure | Game scenario | Commands |
|---------|---------|------|
| String | Cache, sessions, counters | GET/SET/INCR |
| Hash | Player attributes, configuration | HGET/HSET/HGETALL |
| List | Message queues, mail | LPUSH/RPOP |
| Set | Friend lists, online status | SADD/SMEMBERS |
| ZSet | Leaderboards, delay queues | ZADD/ZRANGE |
| Bitmap | Check-in, daily quests | SETBIT/BITCOUNT |

### Leaderboards: the classic ZSet application

Redis ZSet natively supports leaderboards — sort by score, fetch top N, query a player's rank, all O(log N).

```go
// 排行榜核心操作（约10行）
func UpdateRank(rankType string, playerID uint64, score float64) {
    key := fmt.Sprintf("rank:%s", rankType)
    redis.ZAdd(ctx, key, &redis.Z{Score: score, Member: playerID})
}

func GetTopN(rankType string, n int) []RankEntry {
    key := fmt.Sprintf("rank:%s", rankType)
    results, _ := redis.ZRevRangeWithScores(ctx, key, 0, n-1).Result()
    // ... 转换为 RankEntry 切片
}
```

### Online status management

Online status is the most basic Redis usage in games. The core idea: write to Redis when a player comes online, delete on logout, and use TTL to automatically clean up players who drop off abnormally.

```go
// 在线状态管理核心逻辑（约10行）
func PlayerOnline(playerID, serverID uint64) {
    pipe := redis.Pipeline()
    pipe.SAdd(ctx, "online:players", fmt.Sprintf("%d", playerID))
    pipe.Set(ctx, fmt.Sprintf("online:heartbeat:%d", playerID), time.Now().Unix(), 5*time.Minute)
    pipe.Exec(ctx)
}

func IsOnline(playerID uint64) bool {
    return redis.SIsMember(ctx, "online:players", fmt.Sprintf("%d", playerID)).Val()
}
```

### Delay queues: scheduled tasks with ZSet

Games have plenty of delayed tasks: delayed mail delivery, buff expiration removal, building upgrade completion. A delay queue can be elegantly implemented with a Redis ZSet:

```go
// 延迟队列核心逻辑（约10行）
func AddDelayTask(queue string, taskID string, delay time.Duration) {
    executeAt := time.Now().Add(delay).Unix()
    redis.ZAdd(ctx, queue, &redis.Z{Score: float64(executeAt), Member: taskID})
}

// 消费：轮询获取到期任务
func ConsumeDelayTasks(queue string) {
    now := time.Now().Unix()
    tasks, _ := redis.ZRangeByScore(ctx, queue, "0", fmt.Sprintf("%d", now)).Result()
    for _, task := range tasks {
        redis.ZRem(ctx, queue, task)
        processTask(task)
    }
}
```

### Pitfall: Redis is not omnipotent

Redis is an in-memory database, and memory is expensive. Don't put all data in Redis — putting a 100GB player profile entirely in Redis takes 100GB of memory, which may cost more than your servers. **Recommended practice**: only put hot data (online status, leaderboards, sessions) there; warm data goes to MySQL.

---

## 6. Typical Kafka usage in games

### Why do games need Kafka?

Kafka's core value in games is **asynchronous decoupling**. For example: when a player completes a quest, you need to:

1. Grant rewards (business logic)
2. Record an economic transaction (audit)
3. Send a tracking event (analytics)
4. Update the leaderboard (operations)

If all four operations execute synchronously, quest-completion latency will be high. The Kafka approach: after the quest completes, publish a single event message and let four consumers each process asynchronously. **Business logic is decoupled from non-business logic**, and the critical-path latency is extremely low.

### Kafka usage scenarios

| Scenario | Topic | Consumer | Description |
|------|-------|--------|------|
| Tracking collection | track_events | Analytics service | Player behavior logs |
| Economic transaction records | economy_logs | Finance system | Gold/diamond changes |
| Operation logs | audit_logs | Security system | GM operations, sensitive operations |
| Battle logs | battle_logs | Analytics service | Battle replays, balance analysis |
| Asynchronous tasks | async_tasks | Task processor | Mail delivery, compensation tasks |

### Core code example: Kafka producer

```go
// Kafka 生产者核心逻辑（约10行）
func SendTrackEvent(event TrackEvent) error {
    data, _ := json.Marshal(event)
    msg := &sarama.ProducerMessage{
        Topic: "track_events",
        Key:   sarama.StringEncoder(fmt.Sprintf("%d", event.PlayerID)),
        Value: sarama.ByteEncoder(data),
    }
    _, _, err := producer.SendMessage(msg)
    return err
}
```

### Pitfall: Kafka consumer-group rebalance

When a consumer joins or leaves a consumer group, Kafka triggers a rebalance — reassigning partitions. This process can cause brief duplicate consumption or latency. **Coping strategy**: consumer processing logic must be idempotent (duplicate consumption must not cause errors), and degrade gracefully during rebalance.

---

## 7. ClickHouse: a sharp tool for game data analytics

### Why ClickHouse?

The core requirement of game data analytics is: **complex aggregate queries over massive data**. For example, "over the past 30 days, daily new users, next-day retention, and payment rate" — such a query may take minutes on MySQL but only seconds on ClickHouse.

ClickHouse's secret weapon is **columnar storage**: it stores data by column, not by row. When you query "the average level of all players", ClickHouse only needs to read the "level" column instead of scanning entire rows.

### ClickHouse's costs: write latency and operational complexity

ClickHouse is not a silver bullet. It has several notable drawbacks to weigh during selection:

**Writes are not real-time**: ClickHouse writes are batched — each write produces a new data part, merged in the background later. If you write only 1 row per second, ClickHouse produces hordes of small parts and query performance actually drops. In practice, collect events with Kafka, accumulate a batch (say 1000 rows or 5 seconds), then write in bulk.

**No UPDATE or DELETE**: ClickHouse's design philosophy is "append-only, no modification". If you need to update or delete data, you must use a special engine (ReplacingMergeTree) or filter at query time. This is very inconvenient for "fix the data" scenarios.

**High operational cost**: ClickHouse cluster deployment, monitoring, and backup all require specialized knowledge. For small teams, DuckDB may be the more pragmatic choice — it embeds into your application with no extra deployment or ops.

**SQL dialect differences**: ClickHouse SQL differs from standard SQL in places (such as the `Array` type and `MergeTree` engine syntax), so the learning cost is higher than MySQL.

### When should you use ClickHouse?

ClickHouse is worth considering when: data exceeds 100 million rows, you need complex aggregation analytics queries, you have a dedicated data team for operations, and analysis results need to be real-time or near-real-time (seconds-level latency acceptable). Otherwise, DuckDB or plain MySQL + periodic aggregation may be the simpler choice.

### ClickHouse table design

```sql
-- 玩家行为宽表（约10行核心字段）
CREATE TABLE player_events (
    event_time DateTime,
    player_id UInt64,
    event_name String,
    level UInt32,
    server_id UInt32,
    properties String  -- JSON
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_name, event_time, player_id);
```

### Common analytics queries: from data to insight

ClickHouse's analytics power shows in "complex aggregation via SQL". Here are the most common analytics scenarios:

**Retention analysis**: computing "how many registrants come back the next day". The core idea: first find each player's first login date, then LEFT JOIN the next day's login records. If a record exists on day two, it is a "retained user". This query may take minutes on MySQL (full table scan required) but only seconds on ClickHouse.

**Economic inflation monitoring**: tallying "how much gold is produced each day, how much consumed, and the net change". The core idea: group by day; the sum of positives is production, the sum of negatives is consumption, and the difference is net change. If net change stays positive, the economy is inflating — designers need to adjust the production/consumption ratio.

**Payment funnel analysis**: computing the conversion rate of "browse shop → view item → click buy → payment success". The churn rate at each step helps operations find optimization points — if the "click buy → payment success" conversion is only 30%, something is wrong with the payment flow.

These queries share a common trait: `GROUP BY` plus aggregate computation over massive data. ClickHouse's columnar storage and vectorized execution engine make such queries 10-100x faster than MySQL.

### Pitfall: ClickHouse is not suited to real-time writes

ClickHouse writes are batched — each write produces a new data part, merged in the background later. If you write only 1 row per second, ClickHouse produces hordes of small parts and query performance actually drops. **Recommended practice**: collect events with Kafka, accumulate a batch (say 1000 rows or 5 seconds), then write to ClickHouse in bulk.

---

## 8. DuckDB: a lightweight analytics tool

### When to use DuckDB?

DuckDB is an embedded analytics database requiring no deployed service — use it directly in code. Its core value is **development and debugging**: when you need to analyze a CSV file, validate a SQL query, or generate an ad-hoc report, DuckDB is far more convenient than ClickHouse.

### Core usage scenarios

- **Local development debugging**: query CSV/JSON files directly
- **Ad-hoc reports**: quickly validate data correctness
- **CI/CD validation**: automated testing of data consistency
- **Small-scale analytics**: scenarios that don't justify deploying ClickHouse

```python
# DuckDB 核心用法（约5行）
import duckdb

conn = duckdb.connect(':memory:')
result = conn.execute("""
    SELECT event_name, COUNT(*) as cnt
    FROM read_csv_auto('player_events.csv')
    GROUP BY event_name ORDER BY cnt DESC
""").fetchall()
```

### DuckDB vs Pandas performance comparison

| Data volume | DuckDB | Pandas |
|--------|--------|--------|
| 1M-row CSV | ~0.5s | ~2s |
| 10M-row CSV | ~3s | ~15s |

> **Experience**: if your analytics needs stay under 100 million rows, DuckDB is a better choice than ClickHouse — no deployment, no ops, sufficient performance.

---

## 9. Selection decision tree

```text
数据存哪里？
│
├── 需要事务保证？
│   ├── 是 → MySQL / PostgreSQL
│   └── 否 ↓
│
├── 需要极低延迟？
│   ├── 是 → Redis
│   └── 否 ↓
│
├── 需要高吞吐写入？
│   ├── 是 → Kafka
│   └── 否 ↓
│
├── 需要复杂分析聚合？
│   ├── 是 → ClickHouse
│   └── 否 ↓
│
├── 需要Schema灵活？
│   ├── 是 → MongoDB
│   └── 否 ↓
│
├── 本地快速分析？
│   ├── 是 → DuckDB
│   └── 否 → MySQL（默认选择）
```

---

## 10. Config tables, data-driven development, and R&D collaboration

### Why is the configuration system an accident hotspot?

Config tables look like "designers filling in data", but they actually connect five links: design, client, server, testing, and release. Any vague link and incidents surface as "version problems".

**Conditions that make a configuration system an accident hotspot**:

- Frequent events (new event configs every week)
- Multi-person collaboration (multiple designers editing configs simultaneously)
- Large table volume (hundreds of config tables)
- Configs strongly affecting core assets (drop rates, top-up ratios)

### Mature practices

**Structured definitions**: config tables need explicit field-type constraints, avoiding "everything as strings".

**Automated validation**: validate types and referential integrity at edit time; cross-table consistency at export time; version compatibility at load time.

**Code generation**: auto-generate data-structure definitions, loading code, and validation logic from config tables, reducing manual coding errors.

**Gray release and audit rollback**: config changes need an approval flow, critical config changes need gray-release validation, and config rollback capability must be designed in advance.

### Config release workflow

1. Designers edit config tables
2. Automated validation (types, references, business rules)
3. Code review (at least one reviewer)
4. Export and code generation
5. Gray release to the test environment
6. Full release after validation passes

### Common pitfalls

- **Treating Excel as a database**: Excel has no type constraints, no version control, no audit logs
- **Treating config release as file replacement**: no validation, no gray release, no rollback capability
- **No lineage tracking**: not knowing which features each config affects, making quick localization impossible when problems occur

---

## 11. Practical case: a top-up backfill investigation after a "primary/replica switchover rollback"

> The case is a demonstration example (not taken from a real project); numbers are rounded and simplified. The Chapter 12 case covers "data definitions", the Chapter 10 case covers "data duplication", and this case covers "data loss" — the three investigations share one discipline: first reconcile against external facts, then go into the system to find the root cause.

**Background and symptoms**: Monday 02:15 AM, the daily reconciliation script recommended in section 4.4 raised an alert: **11** successful charges on the channel side, **0** credited on the game side, a difference of **11**. In the same window, the primary had an automatic primary/replica switchover at 02:07 due to a disk failure and recovered externally at 02:12 — at the time it was classified as "an availability incident, recovered". From the morning peak onward, player tickets followed up on "last night's top-up never arrived", and the incident escalated into a data incident.

### Step one: reconcile and lock the loss window (echoing 4.4)

The payment times of the discrepant orders all fall in **02:00–02:07** (a 7-minute window). The same window averages about 3 orders daily; these 11 coincided with the last wave of a cross-day limited-time event, so the volume itself is normal — not a business-volume anomaly, but lost writes. The 02:00 starting point is not a guess: it is the moment the primary's semi-synchronous replication **silently degraded to asynchronous**.

### Step two: root cause — silent semi-sync degradation, and a restart turned the window into loss

```text
02:00  主库 IO 负载升高，半同步降级为异步（无告警——阈值设在「完全异步」才触发）
02:07  主库磁盘故障重启，自动主从切换；从库按最后确认的同步位点晋升
02:12  对外恢复；02:00–02:07 未获从库确认的 binlog 随故障主库一起消失
02:15  对账脚本告警：11 笔充值有扣款、无到账
```

Section 4.4's "a top-up must not be granted twice" solves duplication; this time it is the mirror problem: **not a single top-up may be lost**. The semi-sync degradation quietly lowered write durability from "wait for replica acknowledgment" to "primary only"; at that point a database failure is no longer an availability incident but a data-loss incident — and the degradation itself raised no alert, so a routine restart silently amplified into 7 minutes of loss.

### Step three: recovery boundary — what can be backfilled and what cannot

- **Backfillable: top-ups**. The external facts (channel bills) live outside the database, and all 11 charges in the loss window are verifiable one by one — replaying the backfill with the channel order number as the idempotency key (the idempotency idea from 4.4, reused in reverse) succeeded **11/11**
- **Not backfillable one by one: the 26 free grants in the same window** (check-ins, mail claims). The evidence (claim records) lived inside the lost database and vanished with the writes — they can only be compensated collectively per the official grant list, with the impact scope pinned precisely to the window rather than to individual grants

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill item | Owner | Done standard |
|--------|------|---------|
| Alert on semi-sync degradation: trigger when degraded over 30 seconds, don't wait for fully async | DBA/Ops | One alert drill |
| Force reconciliation within 2 hours of recovery, don't wait for the daily T+1 | Data/Ops | Write a failure runbook |
| Write strategy when semi-sync is unavailable: wait for replica acknowledgment or degrade to read-only, don't silently keep writing | DBA | Config review passed |
| Solidify the top-up backfill script (idempotent replay by channel order number) | Payment service | Backfill drill passes 11/11 |

### Three lessons from the case

- **The backfill basis must live outside the system**: top-ups are backfillable because channel bills are outside the database; free grants are not individually backfillable because the evidence was inside — when designing a recovery plan, first ask "where is the external source of truth", then talk about how to recover
- **Degradation is a state, not a failure**: the silent semi-sync → async degradation amplified a routine restart into data loss; degradation itself must be alerted as an event, not archived only after the failure happens
- **The earlier the reconciliation, the tighter the loss window can be bounded**: the 02:15 reconciliation pinned the loss window to exactly 7 minutes, giving the 26 free grants a compensation basis; if you wait for player complaints and work backwards, the window's boundaries have long since blurred

---

## Summary

| Key concept | Core points |
|---------|---------|
| Storage selection | No universal database; choose by data characteristics |
| Layered architecture | Hot data in Redis, warm data in MySQL, cold data in ClickHouse |
| Cache consistency | Cache-Aside pattern; guard against penetration/breakdown/avalanche |
| Idempotency | Critical operations like top-ups and trades need idempotency |
| Backfill and recovery | Top-ups are backfillable: channel bills are out-of-database facts (idempotent replay by order number); alert on degradation, reconcile within 2 hours of recovery (see the section 11 case) |
| Kafka | Asynchronous decoupling, separating business logic from non-business logic |
| ClickHouse | Columnar storage, suited to massive-data analytics |
| DuckDB | Embedded analytics, a sharp tool for development and debugging |
| Configuration system | Structured definitions + automated validation + gray release |

> **Final advice**: as "One Million Online" tells us, data architecture design should "start from requirements, not from technology". First figure out what data your game has, what each kind's access pattern is, and how strict its consistency requirements are — then choose the right storage components. **Don't use new technology for the sake of new technology**.

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related pages

- [expansion](expansion.md)
