# 数据存储与中间件

> 游戏后端不是"把逻辑跑起来"就结束了。真正的问题是：玩家数据存哪、断线重连后怎么恢复、充值成功怎么补发、经济流水怎么追踪、埋点怎么进分析链路、活动结果怎么回溯、出问题怎么对账补数回滚。没有数据库和中间件，这些都讲不通。
>
> **本章目标**：帮助读者理解游戏数据存储的分层架构设计，掌握热数据/温数据/冷数据的划分原则，理解缓存一致性方案的 trade-off，以及如何用 Kafka + ClickHouse 构建数据分析链路。参考《百万在线》中的数据架构思想。

---

## 1. 游戏数据到底存哪里？

### 存储组件选型：每种工具做它最擅长的事

很多团队把所有数据都塞进 MySQL，结果发现：排行榜查询越来越慢、在线状态同步吃力、埋点数据写入拖垮业务数据库。根本原因是**没有根据数据特性选择合适的存储组件**。

《游戏服务器架构与优化》的核心观点是：**没有万能的数据库，只有适合特定场景的数据库**。就像工具箱里的螺丝刀和锤子——你不会用锤子拧螺丝，也不会用螺丝刀钉钉子。

| 组件 | 定位 | 游戏场景 | 特点 |
|------|------|---------|------|
| **MySQL** | 核心持久化 | 账号、角色、订单、背包、任务 | 事务、ACID、成熟生态 |
| **Redis** | 热点数据 | 在线状态、缓存、排行榜、限流 | 极快、内存、过期机制 |
| **Kafka** | 事件流 | 埋点、异步解耦、削峰填谷 | 高吞吐、持久化、回放 |
| **ClickHouse** | 离线分析 | 行为分析、运营分析、经济分析 | 列存、OLAP、极速聚合 |
| **DuckDB** | 本地分析 | 开发调试、临时报表 | 嵌入式、无需服务 |
| **MongoDB** | 半结构化 | 配置、日志、玩法数据 | Schema灵活、文档型 |

### 一句话定位

```
Redis     → 快（热数据、缓存、计数器）
MySQL     → 稳（核心业务、事务保证）
Kafka     → 流（事件管道、异步解耦）
ClickHouse → 算（分析聚合、报表）
DuckDB    → 轻（本地分析、开发调试）
MongoDB   → 灵（Schema自由、文档存储）
```

### 各组件性能基准

| 组件 | 单实例QPS | 延迟 | 数据量级 | 成本 |
|------|----------|------|---------|------|
| MySQL | 10K-50K | 1-10ms | TB级 | 中 |
| Redis | 100K-500K | <1ms | GB级 | 中 |
| Kafka | 100万+/s | 5-20ms | PB级 | 低 |
| ClickHouse | 10M行/s | 100ms | PB级 | 中 |
| DuckDB | 10K-100K | 1-10ms | GB级 | 极低 |
| MongoDB | 10K-100K | 1-10ms | TB级 | 中 |

> **选型关键**：不要只看 QPS 和延迟，还要看**数据量级**和**成本**。Redis 很快，但内存很贵——把 100GB 数据全放 Redis 不现实。MySQL 很稳，但高并发写入会成为瓶颈。

---

## 2. 典型分层架构：数据如何流动

### 为什么需要分层？

想象一个场景：玩家充值 6 元买 60 钻石。这个操作涉及：

1. 调用支付平台确认扣款（外部 API）
2. 给玩家账户加 60 钻石（业务逻辑）
3. 记录经济流水（审计）
4. 发送埋点事件（分析）

如果所有操作都直接写 MySQL，数据库压力巨大。如果所有操作都走 Kafka，延迟太高，玩家等不及。**分层架构**的核心思想是：**根据数据的实时性要求，选择不同的处理路径**。

### 数据流向全景图

```
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

### 分层架构的三个关键决策

在设计分层架构时，需要做出三个关键决策：

**决策一：哪些数据需要缓存？** 不是所有数据都值得缓存。只有"访问频率高、生成成本高"的数据才值得缓存。比如玩家的在线状态（每秒访问多次、从 Redis 读取很快）值得缓存，但玩家的注册时间（只在登录时读一次、从 MySQL 读取也不慢）不值得缓存。

**决策二：缓存和数据库的一致性怎么保证？** 这是分层架构最棘手的问题。Cache-Aside 模式是常见做法，但仍然存在"缓存和数据库不一致"的窗口期。对于游戏来说，大部分场景可以容忍短暂的不一致（比如排行榜延迟几秒更新），但关键数据（如充值金额）需要强一致。

**决策三：异步写入的延迟可以接受吗？** Kafka 的写入延迟通常在 5-20ms，对于埋点、日志等非实时数据完全够用。但对于"充值成功确认"这种场景，玩家需要立刻看到钻石增加，不能等 Kafka 消费完再显示——这种场景需要同步写入。

### 热数据 vs 温数据 vs 冷数据

| 层级 | 存储 | 生命周期 | 访问频率 | 典型数据 |
|------|------|---------|---------|---------|
| 热数据 | Redis | 分钟~小时 | 极高（每次请求） | 在线状态、Session、排行榜 |
| 温数据 | MySQL | 天~月 | 中等（每次登录） | 玩家档案、背包、装备 |
| 冷数据 | ClickHouse/归档 | 月~年 | 低（按需查询） | 历史记录、日志、统计 |

**划分原则**：数据被访问的频率决定了它应该放在哪一层。在线玩家的位置信息是热数据（每秒更新多次），玩家的注册时间是温数据（登录时读一次），三个月前的登录日志是冷数据（只在分析时查询）。

> **《百万在线》经验**：很多团队把"热数据"定义得太宽——把整个玩家档案都放 Redis。实际上，玩家档案中只有"当前在线状态""背包中正在使用的装备"是热数据，大部分字段（注册时间、历史登录记录）访问频率很低，放 MySQL 就够了。

---

## 3. 游戏里常见的数据模型

### 核心数据表设计原则

游戏数据表的设计要遵循三个原则：

1. **事务性**：涉及钱的操作（充值、交易）需要用事务保证一致性
2. **可扩展**：JSON 字段用于存储不确定结构的数据（如装备属性）
3. **可查询**：为高频查询建立索引，但不要过度索引（影响写入性能）

### 核心表结构

### 为什么游戏数据库设计和 Web 应用不同？

游戏数据库的设计有几个独特之处，和典型的 Web 应用（电商、社交）有本质区别：

**读写比例不同**：Web 应用通常是"读多写少"（商品浏览远多于下单），游戏则是"写多读少"——玩家每秒都在移动、攻击、拾取物品，每次操作都可能触发数据写入。这意味着游戏数据库需要更高的写入吞吐量。

**数据生命周期不同**：Web 应用的数据生命周期通常很长（一个商品可能卖几年），游戏数据的生命周期很短——一个活动可能只持续一周，一批装备可能一个月就过时了。这意味着游戏数据库需要更好的数据归档和清理机制。

**一致性要求不同**：Web 应用对一致性的要求相对宽松（库存少一个可以补发），游戏对一致性的要求极高——充值金额不能错、经济流水不能丢、排行榜不能乱。这意味着游戏数据库需要更强的事务保证。

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

### 数据模型分类

| 数据类型 | 示例 | 存储位置 | 一致性要求 |
|---------|------|---------|-----------|
| 账号数据 | 用户名、密码、绑定 | MySQL | 强一致 |
| 角色数据 | 等级、经验、属性 | MySQL + Redis缓存 | 强一致 |
| 背包数据 | 道具、装备、材料 | MySQL | 强一致 |
| 订单数据 | 充值、交易记录 | MySQL | 强一致（事务） |
| 经济流水 | 金币/钻石变动日志 | MySQL + Kafka | 强一致 |
| 在线状态 | 谁在线、在哪个服 | Redis | 最终一致 |
| 排行榜 | 分数、排名 | Redis ZSet | 最终一致 |
| 埋点事件 | 玩家行为、点击路径 | Kafka | 最终一致 |

### 坑：经济流水表的设计

经济流水是**审计**用的，记录每一次货币变动的前后余额。很多团队设计流水表时只记录"变动了多少"，不记录"变动后余额"。这导致对账时需要从头累加——数据量一大就慢得不行。**推荐做法**：每次变动都记录 `balance_after`，对账时直接比对余额。

---

## 4. 数据一致性与落库策略

### 三种落库策略

游戏数据的写入有三种策略，选择哪种取决于对一致性的要求：

**策略1：同步写库（强一致）**

```
请求 → 写MySQL → 返回成功
适用：充值、交易、关键操作
优点：数据绝对一致
缺点：延迟高，吞吐低
```

**策略2：先写缓存再异步落库（最终一致）**

```
请求 → 写Redis → 异步写MySQL → 返回成功
适用：在线状态、非关键操作
优点：延迟低，吞吐高
缺点：Redis 挂了可能丢数据
```

**策略3：先发事件再处理（事件驱动）**

```
请求 → 发Kafka事件 → 消费者处理 → 返回成功
适用：埋点、日志、异步任务
优点：解耦、削峰
缺点：延迟最高，逻辑分散
```

### 缓存一致性：Cache-Aside 模式

缓存一致性是游戏服务器最常见也最容易出问题的环节。**Cache-Aside** 是最常用的模式：

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

### 缓存穿透/击穿/雪崩：三个需要知道的问题

| 问题 | 现象 | 原因 | 解决方案 |
|------|------|------|---------|
| **穿透** | 查询不存在的数据，每次都打到 DB | 恶意请求或数据删除 | 布隆过滤器 + 空值缓存 |
| **击穿** | 热点 key 过期，大量请求同时查 DB | 并发重建缓存 | 分布式锁，只放一个请求查 DB |
| **雪崩** | 大量 key 同时过期，DB 被压垮 | 过期时间太集中 | 过期时间加随机值 |

```go
// 防穿透：空值缓存（约5行）
if player.ID == 0 {
    redis.Set(ctx, cacheKey, "NULL", 5*time.Minute)
    return nil, ErrPlayerNotFound
}

// 防雪崩：过期时间加随机值（约2行）
ttl := 30*time.Minute + time.Duration(rand.Intn(600))*time.Second
redis.Set(ctx, cacheKey, data, ttl)
```

### 幂等与对账：充值不能发两次

**幂等**是指同一个操作执行多次，结果和执行一次相同。充值是最典型的幂等场景——玩家点了两次"确认支付"，不能给他发两份钻石。

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

> **《游戏服务器架构与优化》建议**：对账脚本应该每天凌晨自动运行，比对 MySQL 订单总额和 Kafka 经济流水总额。差异超过 0.01 元就触发告警。

---

## 5. Redis 在游戏中的典型用法

### Redis 数据结构与游戏场景映射

| 数据结构 | 游戏场景 | 命令 |
|---------|---------|------|
| String | 缓存、Session、计数器 | GET/SET/INCR |
| Hash | 玩家属性、配置 | HGET/HSET/HGETALL |
| List | 消息队列、邮件 | LPUSH/RPOP |
| Set | 好友列表、在线状态 | SADD/SMEMBERS |
| ZSet | 排行榜、延迟队列 | ZADD/ZRANGE |
| Bitmap | 签到、每日任务 | SETBIT/BITCOUNT |

### 排行榜：ZSet 的经典应用

Redis 的 ZSet 天然支持排行榜——按分数排序、获取前 N 名、查询玩家排名，全部 O(log N)。

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

### 在线状态管理

在线状态是 Redis 在游戏中最基础的用法。核心思路是：玩家上线时写入 Redis，下线时删除，通过 TTL 自动清理异常掉线的玩家。

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

### 延迟队列：用 ZSet 实现定时任务

游戏里有大量的延迟任务：邮件延迟发送、buff 到期移除、建筑升级完成。用 Redis ZSet 可以优雅地实现延迟队列：

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

### 坑：Redis 不是万能的

Redis 是内存数据库，内存很贵。不要把所有数据都放 Redis——100GB 的玩家档案全放 Redis 需要 100GB 内存，成本可能比你的服务器还贵。**推荐做法**：只放热数据（在线状态、排行榜、Session），温数据放 MySQL。

---

## 6. Kafka 在游戏中的典型用法

### 为什么游戏需要 Kafka？

Kafka 在游戏中的核心价值是**异步解耦**。举个例子：玩家完成一个任务，需要：

1. 发放奖励（业务逻辑）
2. 记录经济流水（审计）
3. 发送埋点事件（分析）
4. 更新排行榜（运营）

如果这四个操作都同步执行，任务完成的延迟会很高。用 Kafka 的做法是：任务完成后只发一条事件消息，四个消费者各自异步处理。**业务逻辑和非业务逻辑解耦**，主流程延迟极低。

### Kafka 使用场景

| 场景 | Topic | 消费者 | 说明 |
|------|-------|--------|------|
| 埋点收集 | track_events | 数据分析服务 | 玩家行为日志 |
| 经济流水 | economy_logs | 财务系统 | 金币/钻石变动 |
| 操作日志 | audit_logs | 安全系统 | GM操作、敏感操作 |
| 战斗日志 | battle_logs | 分析服务 | 战斗回放、平衡性分析 |
| 异步任务 | async_tasks | 任务处理器 | 邮件发送、补偿任务 |

### 核心代码示例：Kafka 生产者

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

### 坑：Kafka 消费者组的 rebalance

当消费者加入或离开消费者组时，Kafka 会触发 rebalance——重新分配 partition。这个过程可能导致短暂的消息重复消费或延迟。**应对策略**：消费者处理逻辑要幂等（重复消费不会出错），rebalance 期间做好降级。

---

## 7. ClickHouse：游戏数据分析的利器

### 为什么选择 ClickHouse？

游戏数据分析的核心需求是：**对海量数据做复杂聚合查询**。比如"过去 30 天，每天的新增用户数、次日留存率、付费率"——这种查询在 MySQL 上可能要跑几分钟，在 ClickHouse 上只要几秒。

ClickHouse 的秘密武器是**列式存储**：它不按行存储数据，而是按列存储。当你查询"所有玩家的平均等级"时，ClickHouse 只需要读取"等级"这一列，而不是扫描整行数据。

### ClickHouse 的代价：写入延迟和运维复杂度

ClickHouse 不是银弹。它有几个显著的缺点需要在选型时考虑：

**写入不是实时的**：ClickHouse 的写入是批量的——每次写入会生成一个新的数据片段（Part），后台再合并。如果你每秒只写入 1 条数据，ClickHouse 会产生大量小 Part，查询性能反而下降。实践中发现用 Kafka 收集事件，攒够一批（如 1000 条或 5 秒）再批量写入。

**不支持更新和删除**：ClickHouse 的设计哲学是"只追加，不修改"。如果你需要更新或删除数据，需要用特殊的引擎（ReplacingMergeTree）或在查询时过滤。这对"需要修正数据"的场景很不方便。

**运维成本高**：ClickHouse 的集群部署、监控、备份都需要专业知识。对于小团队来说，DuckDB 可能是更务实的选择——它嵌入在你的应用中，不需要额外部署和运维。

**SQL 方言差异**：ClickHouse 的 SQL 和标准 SQL 有一些差异（如 `Array` 类型、`MergeTree` 引擎语法），学习成本比 MySQL 高。

### 什么时候该用 ClickHouse？

当你满足以下条件时，ClickHouse 值得考虑：数据量超过 1 亿行、需要复杂的聚合分析查询、有专业的数据团队负责运维、分析结果需要实时或准实时（秒级延迟可接受）。否则，DuckDB 或者直接用 MySQL + 定期聚合可能是更简单的选择。

### ClickHouse 表设计

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

### 常用分析查询：从数据到洞察

ClickHouse 的分析能力体现在"用 SQL 做复杂聚合"上。以下是最常见的几个分析场景：

**留存分析**：计算"注册次日有多少人回来"。核心思路是：先找出每个玩家的首次登录日期，再 LEFT JOIN 第二天的登录记录。如果第二天有记录就是"留存用户"。这个查询在 MySQL 上可能要跑几分钟（因为需要全表扫描），在 ClickHouse 上只要几秒。

**经济通胀监控**：统计"每天金币产出多少、消耗多少、净变化多少"。核心思路是：按天分组，正数求和是产出，负数求和是消耗，差值就是净变化。如果净变化持续为正，说明经济在通胀——策划需要调整产出/消耗比。

**付费漏斗分析**：计算"浏览商店 → 查看商品 → 点击购买 → 支付成功"的转化率。每一步的流失率都能帮运营找到优化点——如果"点击购买 → 支付成功"的转化率只有 30%，说明支付流程有问题。

这些查询的共同特点是：需要对海量数据做 `GROUP BY` + 聚合计算。ClickHouse 的列式存储和向量化执行引擎让这类查询的速度比 MySQL 快 10-100 倍。

### 坑：ClickHouse 不适合实时写入

ClickHouse 的写入是批量的——每次写入会生成一个新的数据片段（Part），后台再合并。如果你每秒只写入 1 条数据，ClickHouse 会产生大量小 Part，查询性能反而下降。**推荐做法**：用 Kafka 收集事件，攒够一批（如 1000 条或 5 秒）再批量写入 ClickHouse。

---

## 8. DuckDB：轻量分析利器

### 什么时候用 DuckDB？

DuckDB 是一个嵌入式分析数据库，不需要部署服务，直接在代码中使用。它的核心价值是**开发调试**：当你需要分析一个 CSV 文件、验证一个 SQL 查询、生成一个临时报表时，DuckDB 比 ClickHouse 方便得多。

### 核心使用场景

- **本地开发调试**：直接查询 CSV/JSON 文件
- **临时报表**：快速验证数据正确性
- **CI/CD 验证**：自动化测试数据一致性
- **小规模分析**：不需要部署 ClickHouse 的场景

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

### DuckDB vs Pandas 性能对比

| 数据量 | DuckDB | Pandas |
|--------|--------|--------|
| 100万行 CSV | ~0.5秒 | ~2秒 |
| 1000万行 CSV | ~3秒 | ~15秒 |

> **经验**：如果你的数据分析需求不超过 1 亿行，DuckDB 是比 ClickHouse 更好的选择——无需部署、无需运维、性能足够。

---

## 9. 选型决策树

```
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

## 10. 配置表、数据驱动与研发协作

### 为什么配置系统是事故高发区？

配置表表面上只是"策划填数据"，实际上连接着策划、客户端、服务端、测试和发布五个环节。任何一个环节模糊，事故都会以"版本问题"的形式出现。

**配置系统成为事故高发区的条件**：

- 活动频繁（每周都有新活动配置）
- 多人协作（多个策划同时改配置）
- 表量很大（几百张配置表）
- 配置强影响核心资产（掉率、充值比例）

### 成熟做法

**结构化定义**：配置表需要明确的字段类型约束，避免"什么都放字符串"。

**自动校验**：编辑时校验类型、引用完整性；导出时校验跨表一致性；加载时校验版本兼容性。

**代码生成**：从配置表自动生成数据结构定义、加载代码和校验逻辑，减少人工编码错误。

**灰度发布和审计回滚**：配置变更需要有审批流程，关键配置变更需要灰度验证，配置回滚能力需要提前设计。

### 配置发布工作流

1. 策划编辑配置表
2. 自动校验（类型、引用、业务规则）
3. Code Review（至少一人审核）
4. 导出与代码生成
5. 灰度发布到测试环境
6. 验证通过后全量发布

### 常见误区

- **把 Excel 当数据库**：Excel 没有类型约束、没有版本控制、没有审计日志
- **把配置发布当文件替换**：没有校验、没有灰度、没有回滚能力
- **不做血缘追踪**：不知道每个配置影响哪些功能，出问题时无法快速定位

---

## 小结

| 关键概念 | 核心要点 |
|---------|---------|
| 存储选型 | 没有万能数据库，根据数据特性选择 |
| 分层架构 | 热数据 Redis、温数据 MySQL、冷数据 ClickHouse |
| 缓存一致性 | Cache-Aside 模式，防穿透/击穿/雪崩 |
| 幂等性 | 充值、交易等关键操作需要幂等 |
| Kafka | 异步解耦，业务逻辑和非业务逻辑分离 |
| ClickHouse | 列式存储，适合海量数据分析 |
| DuckDB | 嵌入式分析，开发调试利器 |
| 配置系统 | 结构化定义 + 自动校验 + 灰度发布 |

> **最终建议**：《百万在线》告诉我们，数据架构的设计应该"从需求出发，而不是从技术出发"。先搞清楚你的游戏有哪些数据、每种数据的访问模式是什么、一致性要求有多高，然后再选择合适的存储组件。**不要为了用新技术而用新技术**。
