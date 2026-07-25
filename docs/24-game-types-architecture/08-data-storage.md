# 数据存储与中间件

游戏后端不是"把逻辑跑起来"就结束了，真正的问题是：玩家数据存哪、断线重连后怎么恢复、充值成功怎么补发、经济流水怎么追踪、埋点怎么进分析链路、活动结果怎么回溯、出问题怎么对账补数回滚。没有数据库和中间件，这些都讲不通。

## 1. 游戏数据到底存哪里

### 1.1 存储组件选型

| 组件 | 定位 | 游戏场景 | 特点 |
|------|------|---------|------|
| **MySQL** | 核心持久化 | 账号、角色、订单、背包、任务 | 事务、ACID、成熟生态 |
| **PostgreSQL** | 核心持久化 | 复杂查询、JSON字段、地理数据 | 功能丰富、扩展性强 |
| **Redis** | 热点数据 | 在线状态、缓存、排行榜、限流 | 极快、内存、过期机制 |
| **MongoDB** | 半结构化 | 配置、日志、玩法数据 | Schema灵活、文档型 |
| **Kafka** | 事件流 | 埋点、异步解耦、削峰填谷 | 高吞吐、持久化、回放 |
| **ClickHouse** | 离线分析 | 行为分析、运营分析、经济分析 | 列存、OLAP、极速聚合 |
| **DuckDB** | 本地分析 | 开发调试、临时报表、小规模分析 | 嵌入式、无需服务 |

### 1.2 一句话定位
```
Redis     → 快（热数据、缓存、计数器）
MySQL     → 稳（核心业务、事务保证）
Kafka     → 流（事件管道、异步解耦）
ClickHouse → 算（分析聚合、报表）
DuckDB    → 轻（本地分析、开发调试）
MongoDB   → 灵（Schema自由、文档存储）
```

### 1.3 各组件性能基准

| 组件 | 单实例QPS | 延迟 | 数据量级 | 成本 |
|------|----------|------|---------|------|
| MySQL | 10K-50K | 1-10ms | TB级 | 中 |
| Redis | 100K-500K | <1ms | GB级 | 中 |
| Kafka | 100万+/s | 5-20ms | PB级 | 低 |
| ClickHouse | 10M行/s | 100ms | PB级 | 中 |
| DuckDB | 10K-100K | 1-10ms | GB级 | 极低 |
| MongoDB | 10K-100K | 1-10ms | TB级 | 中 |

---

## 2. 典型分层架构

```
┌─────────────────────────────────────────┐
│           应用层                        │
│   游戏服务器、网关、匹配、聊天           │
├─────────────────────────────────────────┤
│           缓存层（Redis）               │
│   在线状态、Session、排行榜、限流计数     │
├─────────────────────────────────────────┤
│           业务持久化层                   │
│   MySQL/PostgreSQL                      │
│   账号、角色、背包、订单、任务            │
├─────────────────────────────────────────┤
│           事件流层（Kafka）             │
│   埋点事件、经济流水、操作日志            │
├─────────────────────────────────────────┤
│           分析层                        │
│   ClickHouse（线上分析）                │
│   DuckDB（本地/开发分析）               │
└─────────────────────────────────────────┘
```

### 2.1 热数据 vs 温数据 vs 冷数据

| 层级 | 存储 | 生命周期 | 访问频率 |
|------|------|---------|---------|
| 热数据 | Redis | 分钟~小时 | 极高（每次请求） |
| 温数据 | MySQL | 天~月 | 中等（每次登录） |
| 冷数据 | ClickHouse/归档 | 月~年 | 低（按需查询） |

### 2.2 数据流向架构

```
                    ┌──────────────────────────────────────────────┐
                    │                数据流向全景图                   │
                    └──────────────────────────────────────────────┘

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
            │  Kafka   │                    │    Canala     │
            │ (事件流)  │                    │ (数据同步)     │
            └────┬─────┘                    └──────┬───────┘
                 │                                 │
        ┌────────┼────────┐                       │
        ▼        ▼        ▼                       ▼
  ┌──────────┐ ┌─────┐ ┌──────┐          ┌──────────────┐
  │ClickHouse│ │Flink│ │告警  │          │ ClickHouse   │
  │(分析存储) │ │(实时)│ │系统  │          │ (业务数据)    │
  └────┬─────┘ └─────┘ └──────┘          └──────────────┘
       │
       ▼
  ┌──────────┐
  │  BI系统   │
  │ 仪表盘    │
  └──────────┘
```

---

## 3. 游戏里常见的数据模型

### 3.1 核心数据表设计

```sql
-- 玩家账号
CREATE TABLE account (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status TINYINT DEFAULT 1  -- 1正常 0封禁
);

-- 角色档案
CREATE TABLE player (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    server_id INT NOT NULL,
    nickname VARCHAR(32),
    level INT DEFAULT 1,
    exp BIGINT DEFAULT 0,
    coin BIGINT DEFAULT 0,
    diamond INT DEFAULT 0,
    vip_level INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account (account_id),
    INDEX idx_server (server_id)
);

-- 背包
CREATE TABLE inventory (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    item_id INT NOT NULL,
    count INT DEFAULT 1,
    level INT DEFAULT 1,
    extra JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player (player_id)
);

-- 订单
CREATE TABLE payment_order (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(64) UNIQUE NOT NULL,
    player_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    status TINYINT DEFAULT 0,  -- 0待支付 1已支付 2已发货 3已退款
    pay_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player (player_id),
    INDEX idx_status (status)
);

-- 经济流水
CREATE TABLE economy_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    currency_type VARCHAR(32) NOT NULL,  -- coin/diamond/material
    change_amount BIGINT NOT NULL,        -- 正数增加 负数减少
    reason VARCHAR(64) NOT NULL,          -- task/purchase/drop/gm
    reason_id BIGINT DEFAULT 0,          -- 关联ID
    balance_after BIGINT NOT NULL,        -- 变动后余额
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_time (player_id, created_at)
);
```

### 3.2 高级表设计：分库分表

当单表数据超过2000万行时，需要考虑分库分表：

```sql
-- 玩家数据按server_id分库
-- db_game_1.player, db_game_2.player, ...

-- 经济流水按月分表（冷热分离）
CREATE TABLE economy_log_202401 (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    currency_type VARCHAR(32) NOT NULL,
    change_amount BIGINT NOT NULL,
    reason VARCHAR(64) NOT NULL,
    reason_id BIGINT DEFAULT 0,
    balance_after BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_time (player_id, created_at)
) PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
    PARTITION p202401 VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
    PARTITION p202402 VALUES LESS THAN (UNIX_TIMESTAMP('2024-03-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 订单表按月分表
CREATE TABLE payment_order_202401 LIKE payment_order;
-- 每月自动创建新分表 + 迁移旧表到冷存储
```

### 3.3 数据模型分类

| 数据类型 | 示例 | 存储位置 | 一致性要求 |
|---------|------|---------|-----------|
| 账号数据 | 用户名、密码、绑定 | MySQL | 强一致 |
| 角色数据 | 等级、经验、属性 | MySQL + Redis缓存 | 强一致 |
| 背包数据 | 道具、装备、材料 | MySQL | 强一致 |
| 订单数据 | 充值、交易记录 | MySQL | 强一致（事务） |
| 经济流水 | 金币/钻石变动日志 | MySQL + Kafka | 强一致 |
| 在线状态 | 谁在线、在哪个服 | Redis | 最终一致 |
| 排行榜 | 分数、排名 | Redis ZSet | 最终一致 |
| 限流计数 | 请求次数、频率 | Redis | 最终一致 |
| 埋点事件 | 玩家行为、点击路径 | Kafka | 最终一致 |
| 战斗日志 | 战斗回放、伤害记录 | Kafka → ClickHouse | 最终一致 |
| 配置数据 | 怪物表、技能表、活动表 | MySQL/Redis/本地文件 | 启动时加载 |

---

## 4. 数据一致性与落库策略

### 4.1 落库策略选择

```
策略1：同步写库（强一致）
请求 → 写MySQL → 返回成功
适用：充值、交易、关键操作

策略2：先写缓存再异步落库（最终一致）
请求 → 写Redis → 异步写MySQL → 返回成功
适用：在线状态、非关键操作

策略3：先发事件再处理（事件驱动）
请求 → 发Kafka事件 → 消费者处理 → 返回成功
适用：埋点、日志、异步任务
```

### 4.2 缓存一致性方案

```go
// Cache-Aside Pattern（旁路缓存）
func GetPlayer(playerID uint64) (*Player, error) {
    // 1. 先查Redis
    cacheKey := fmt.Sprintf("player:%d", playerID)
    data, err := redis.Get(ctx, cacheKey).Bytes()
    if err == nil {
        var player Player
        json.Unmarshal(data, &player)
        return &player, nil
    }
    
    // 2. 查MySQL
    var player Player
    db.Where("id = ?", playerID).First(&player)
    
    // 3. 写入Redis（设置过期时间）
    data, _ = json.Marshal(player)
    redis.Set(ctx, cacheKey, data, 30*time.Minute)
    
    return &player, nil
}

// 写入时：先更新MySQL，再删除Redis缓存
func UpdatePlayer(player *Player) error {
    // 1. 更新MySQL
    db.Save(player)
    
    // 2. 删除Redis缓存（下次读取时重建）
    cacheKey := fmt.Sprintf("player:%d", player.ID)
    redis.Del(ctx, cacheKey)
    
    return nil
}
```

### 4.3 缓存穿透/击穿/雪崩防护

```go
// 1. 缓存穿透：查询不存在的数据，每次都打到DB
// 方案：布隆过滤器 + 空值缓存
func GetPlayerSafe(playerID uint64) (*Player, error) {
    // 布隆过滤器检查
    if !bloomFilter.Test([]byte(fmt.Sprintf("%d", playerID))) {
        return nil, ErrPlayerNotFound // 直接返回，不查DB
    }
    
    cacheKey := fmt.Sprintf("player:%d", playerID)
    data, err := redis.Get(ctx, cacheKey).Bytes()
    
    // 空值缓存（防穿透）
    if string(data) == "NULL" {
        return nil, ErrPlayerNotFound
    }
    
    if err == nil {
        var player Player
        json.Unmarshal(data, &player)
        return &player, nil
    }
    
    // 2. 缓存击穿：热点key过期，大量请求同时查DB
    // 方案：分布式锁，只放一个请求查DB
    lockKey := fmt.Sprintf("lock:player:%d", playerID)
    if acquired, _ := redis.SetNX(ctx, lockKey, 1, 10*time.Second).Result(); !acquired {
        // 等待其他线程写入缓存
        time.Sleep(100 * time.Millisecond)
        return GetPlayerSafe(playerID) // 重试
    }
    defer redis.Del(ctx, lockKey)
    
    // 查DB并写缓存
    var player Player
    db.Where("id = ?", playerID).First(&player)
    
    if player.ID == 0 {
        // 玩家不存在，缓存空值
        redis.Set(ctx, cacheKey, "NULL", 5*time.Minute)
        return nil, ErrPlayerNotFound
    }
    
    data, _ = json.Marshal(player)
    // 3. 缓存雪崩：大量key同时过期
    // 方案：过期时间加随机值
    ttl := 30*time.Minute + time.Duration(rand.Intn(600))*time.Second
    redis.Set(ctx, cacheKey, data, ttl)
    
    return &player, nil
}
```

### 4.4 幂等与对账

```go
// 幂等处理：同一订单不重复发货
func ProcessPayment(orderNo string, amount float64) error {
    // 1. 检查订单是否已处理
    var order PaymentOrder
    db.Where("order_no = ?", orderNo).First(&order)
    if order.Status >= 2 {
        return ErrOrderAlreadyProcessed
    }
    
    // 2. 开启事务
    tx := db.Begin()
    
    // 3. 更新订单状态
    tx.Model(&order).Update("status", 2)
    
    // 4. 发放钻石
    diamonds := calculateDiamonds(amount)
    tx.Model(&Player{}).Where("id = ?", order.PlayerID).
        UpdateColumn("diamonds", gorm.Expr("diamonds + ?", diamonds))
    
    // 5. 记录经济流水
    tx.Create(&EconomyLog{
        PlayerID:     order.PlayerID,
        CurrencyType: "diamond",
        ChangeAmount: diamonds,
        Reason:       "payment",
        ReasonID:     order.ID,
    })
    
    // 6. 提交事务
    return tx.Commit().Error
}

// 对账脚本：每日凌晨跑
func DailyReconciliation(date string) {
    // 1. 查MySQL订单总额
    var mysqlTotal float64
    db.Model(&PaymentOrder{}).
        Where("DATE(pay_time) = ? AND status = 2", date).
        Select("COALESCE(SUM(amount), 0)").Scan(&mysqlTotal)
    
    // 2. 查Kafka经济流水总额
    var kafkaTotal int64
    // 从ClickHouse查
    clickhouse.Query(`
        SELECT COALESCE(SUM(amount), 0) 
        FROM economy流水 
        WHERE reason = 'payment' AND DATE(time) = ?
    `, date).Scan(&kafkaTotal)
    
    // 3. 对账
    diff := math.Abs(mysqlTotal - float64(kafkaTotal))
    if diff > 0.01 {
        log.Warn("对账差异", "date", date, "mysql", mysqlTotal, "kafka", kafkaTotal)
        // 触发告警 + 生成补数任务
    }
}
```

---

## 5. 数据分析怎么做

### 5.1 数据链路

```
客户端/服务端事件
    ↓
  Kafka（事件收集）
    ↓
  清洗/聚合（Flink/自研）
    ↓
  ClickHouse（存储+分析）
    ↓
  BI/报表/仪表盘

本地开发和验证时：
  DuckDB（直接查询CSV/Parquet，无需部署服务）
```

### 5.2 埋点设计

```go
// 埋点事件结构
type TrackEvent struct {
    EventID   string                 `json:"event_id"`
    PlayerID  uint64                 `json:"player_id"`
    EventName string                 `json:"event_name"`
    Timestamp int64                  `json:"timestamp"`
    Properties map[string]interface{} `json:"properties"`
}

// 常见埋点事件
// 注册、登录、创角、完成新手、首次付费、每日登录
// 任务完成、关卡通过、抽卡、购买、升级、加入公会
// 活动参与、分享、邀请、流失前行为
```

### 5.3 分析场景

| 场景 | 数据源 | 分析工具 | 输出 |
|------|--------|---------|------|
| 留存分析 | 登录日志 | ClickHouse | 留存率曲线 |
| 漏斗分析 | 行为事件 | ClickHouse | 转化率 |
| 经济分析 | 经济流水 | ClickHouse | 通胀率、产出消耗比 |
| 付费分析 | 订单数据 | ClickHouse/DuckDB | ARPU、LTV、付费率 |
| 战斗分析 | 战斗日志 | ClickHouse | 胜率、平衡性 |
| 临时报表 | 任意数据 | DuckDB | 快速验证、开发调试 |

---

## 6. Redis 在游戏中的典型用法

### 6.1 常见数据结构

| 数据结构 | 游戏场景 | 命令 |
|---------|---------|------|
| String | 缓存、Session、计数器 | GET/SET/INCR |
| Hash | 玩家属性、配置 | HGET/HSET/HGETALL |
| List | 消息队列、邮件 | LPUSH/RPOP |
| Set | 好友列表、在线状态 | SADD/SMEMBERS |
| ZSet | 排行榜、延迟队列 | ZADD/ZRANGE |
| Bitmap | 签到、每日任务 | SETBIT/BITCOUNT |
| Stream | 事件流（Redis 5.0+） | XADD/XREAD |

### 6.2 排行榜实现

```go
func UpdateRank(rankType string, playerID uint64, score float64) {
    key := fmt.Sprintf("rank:%s", rankType)
    redis.ZAdd(ctx, key, &redis.Z{Score: score, Member: playerID})
}

func GetRank(rankType string, playerID uint64) (int64, float64) {
    key := fmt.Sprintf("rank:%s", rankType)
    rank, _ := redis.ZRevRank(ctx, key, fmt.Sprintf("%d", playerID)).Result()
    score, _ := redis.ZScore(ctx, key, fmt.Sprintf("%d", playerID)).Result()
    return rank + 1, score
}

func GetTopN(rankType string, n int64) []RankEntry {
    key := fmt.Sprintf("rank:%s", rankType)
    results, _ := redis.ZRevRangeWithScores(ctx, key, 0, n-1).Result()
    var entries []RankEntry
    for i, r := range results {
        entries = append(entries, RankEntry{Rank: int64(i+1), PlayerID: r.Member.(uint64), Score: r.Score})
    }
    return entries
}
```

### 6.3 Redis 实战模式详解

#### 6.3.1 在线状态管理

```go
// 使用 Set 管理在线玩家
type OnlineManager struct {
    redis *redis.Client
}

// 玩家上线
func (m *OnlineManager) PlayerOnline(playerID, serverID uint64) error {
    pipe := m.redis.Pipeline()
    
    // 1. 添加到在线集合
    pipe.SAdd(ctx, "online:players", fmt.Sprintf("%d", playerID))
    
    // 2. 记录所在服务器
    pipe.Set(ctx, fmt.Sprintf("online:server:%d", playerID), serverID, 24*time.Hour)
    
    // 3. 更新最后心跳时间
    pipe.Set(ctx, fmt.Sprintf("online:heartbeat:%d", playerID), time.Now().Unix(), 5*time.Minute)
    
    // 4. 服务器在线计数
    pipe.HIncrBy(ctx, "online:server:count", fmt.Sprintf("%d", serverID), 1)
    
    _, err := pipe.Exec(ctx)
    return err
}

// 玩家下线
func (m *OnlineManager) PlayerOffline(playerID, serverID uint64) error {
    pipe := m.redis.Pipeline()
    
    pipe.SRem(ctx, "online:players", fmt.Sprintf("%d", playerID))
    pipe.Del(ctx, fmt.Sprintf("online:server:%d", playerID))
    pipe.Del(ctx, fmt.Sprintf("online:heartbeat:%d", playerID))
    pipe.HIncrBy(ctx, "online:server:count", fmt.Sprintf("%d", serverID), -1)
    
    _, err := pipe.Exec(ctx)
    return err
}

// 获取在线玩家数
func (m *OnlineManager) GetOnlineCount() (int64, error) {
    return m.redis.SCard(ctx, "online:players").Result()
}

// 检查玩家是否在线
func (m *OnlineManager) IsOnline(playerID uint64) bool {
    return m.redis.SIsMember(ctx, "online:players", fmt.Sprintf("%d", playerID)).Val()
}

// 心跳续约（防断线未检测）
func (m *OnlineManager) Heartbeat(playerID uint64) error {
    key := fmt.Sprintf("online:heartbeat:%d", playerID)
    return m.redis.Set(ctx, key, time.Now().Unix(), 5*time.Minute).Err()
}

// 定期清理过期心跳（由定时任务调用）
func (m *OnlineManager) CleanupStaleConnections() {
    // 扫描所有心跳key，过期的视为掉线
    var cursor uint64
    for {
        keys, nextCursor, _ := m.redis.Scan(ctx, cursor, "online:heartbeat:*", 100).Result()
        cursor = nextCursor
        
        for _, key := range keys {
            ttl, _ := m.redis.TTL(ctx, key).Result()
            if ttl == -2 { // key已过期
                playerID := extractPlayerID(key)
                serverID, _ := m.redis.Get(ctx, fmt.Sprintf("online:server:%d", playerID)).Uint64()
                m.PlayerOffline(playerID, serverID)
            }
        }
        
        if cursor == 0 {
            break
        }
    }
}
```

#### 6.3.2 限流器实现

```go
// 滑动窗口限流器
type RateLimiter struct {
    redis *redis.Client
}

// 检查是否超过频率限制
// 参数：key=限流键, window=时间窗口(秒), maxCount=最大次数
func (r *RateLimiter) IsAllowed(key string, window int64, maxCount int) (bool, error) {
    now := time.Now().UnixMilli()
    windowStart := now - window*1000
    
    pipe := r.redis.Pipeline()
    
    // 1. 移除窗口外的记录
    pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart))
    
    // 2. 添加当前请求
    pipe.ZAdd(ctx, key, &redis.Z{Score: float64(now), Member: fmt.Sprintf("%d", now)})
    
    // 3. 统计窗口内请求数
    countCmd := pipe.ZCard(ctx, key)
    
    // 4. 设置key过期时间
    pipe.Expire(ctx, key, time.Duration(window)*time.Second)
    
    _, err := pipe.Exec(ctx)
    if err != nil {
        return false, err
    }
    
    count := countCmd.Val()
    return count <= int64(maxCount), nil
}

// 使用示例
func (s *Server) HandleChat(playerID uint64, content string) error {
    limiter := &RateLimiter{redis: s.redis}
    
    // 限制：每分钟最多发20条消息
    allowed, _ := limiter.IsAllowed(
        fmt.Sprintf("rate:chat:%d", playerID),
        60,  // 1分钟窗口
        20,  // 最多20条
    )
    if !allowed {
        return ErrRateLimited
    }
    
    // 处理聊天消息...
    return nil
}
```

#### 6.3.3 延迟队列（ZSet实现）

```go
// 使用ZSet实现延迟任务队列
type DelayQueue struct {
    redis *redis.Client
}

// 添加延迟任务
func (d *DelayQueue) AddTask(queue string, taskID string, payload []byte, delay time.Duration) error {
    executeAt := time.Now().Add(delay).Unix()
    
    task := map[string]interface{}{
        "id":      taskID,
        "payload": string(payload),
        "retries": 0,
    }
    data, _ := json.Marshal(task)
    
    return d.redis.ZAdd(ctx, queue, &redis.Z{
        Score:  float64(executeAt),
        Member: data,
    }).Err()
}

// 消费延迟任务（定时轮询）
func (d *DelayQueue) Consume(queue string, handler func(payload []byte) error) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    for range ticker.C {
        now := time.Now().Unix()
        
        // 获取到期任务（原子操作：获取+删除）
        results, err := d.redis.ZRangeByScore(ctx, queue, &redis.ZRangeBy{
            Min:   "0",
            Max:   fmt.Sprintf("%d", now),
            Count: 10, // 每次最多处理10个
        }).Result()
        
        if err != nil || len(results) == 0 {
            continue
        }
        
        for _, result := range results {
            // 尝试获取任务（防止重复消费）
            removed, _ := d.redis.ZRem(ctx, queue, result).Result()
            if removed == 0 {
                continue // 其他消费者已处理
            }
            
            var task map[string]interface{}
            json.Unmarshal([]byte(result), &task)
            
            payload := []byte(task["payload"].(string))
            if err := handler(payload); err != nil {
                // 重新入队，增加重试次数
                retries := int(task["retries"].(float64))
                if retries < 3 {
                    task["retries"] = retries + 1
                    d.AddTask(queue, task["id"].(string), payload, time.Duration(retries+1)*time.Minute)
                }
            }
        }
    }
}

// 使用示例：邮件延迟发送
func (s *Server) SendDelayedMail(playerID uint64, mail Mail, delay time.Duration) {
    payload, _ := json.Marshal(mail)
    s.delayQueue.AddTask("queue:mail", fmt.Sprintf("mail:%d", playerID), payload, delay)
}
```

#### 6.3.4 签到系统（Bitmap）

```go
// 使用Bitmap实现签到系统
type SignManager struct {
    redis *redis.Client
}

// 玩家签到
func (m *SignManager) Sign(playerID uint64, day int) (bool, error) {
    key := fmt.Sprintf("sign:%d:%s", playerID, time.Now().Format("200601"))
    
    // SETBIT: 设置第day位为1
    wasSet, err := m.redis.GetBit(ctx, key, int64(day)).Result()
    if wasSet == 1 {
        return false, nil // 已签到
    }
    
    err = m.redis.SetBit(ctx, key, int64(day), 1).Err()
    return true, err
}

// 获取本月签到天数
func (m *SignManager) GetSignDays(playerID uint64) (int64, error) {
    key := fmt.Sprintf("sign:%d:%s", playerID, time.Now().Format("200601"))
    return m.redis.BitCount(ctx, key, nil).Result()
}

// 检查某天是否签到
func (m *SignManager) IsSigned(playerID uint64, day int) (bool, error) {
    key := fmt.Sprintf("sign:%d:%s", playerID, time.Now().Format("200601"))
    val, err := m.redis.GetBit(ctx, key, int64(day)).Result()
    return val == 1, err
}

// 获取连续签到天数
func (m *SignManager) GetStreak(playerID uint64) int {
    today := time.Now()
    streak := 0
    
    for i := 0; i < 31; i++ {
        day := today.AddDate(0, 0, -i)
        key := fmt.Sprintf("sign:%d:%s", playerID, day.Format("200601"))
        
        val, _ := m.redis.GetBit(ctx, key, int64(day.Day()-1)).Result()
        if val == 0 {
            break
        }
        streak++
    }
    
    return streak
}
```

#### 6.3.5 好友系统（Set + Hash）

```go
// 好友系统实现
type FriendManager struct {
    redis *redis.Client
}

// 添加好友
func (m *FriendManager) AddFriend(playerID, friendID uint64) error {
    pipe := m.redis.Pipeline()
    
    key1 := fmt.Sprintf("friends:%d", playerID)
    key2 := fmt.Sprintf("friends:%d", friendID)
    
    // 双向添加
    pipe.SAdd(ctx, key1, fmt.Sprintf("%d", friendID))
    pipe.SAdd(ctx, key2, fmt.Sprintf("%d", playerID))
    
    // 记录好友关系详情
    detailKey := fmt.Sprintf("friend_detail:%d:%d", playerID, friendID)
    pipe.HSet(ctx, detailKey, map[string]interface{}{
        "intimacy":  0,
        "added_at":  time.Now().Unix(),
        "last_chat": 0,
    })
    
    _, err := pipe.Exec(ctx)
    return err
}

// 删除好友
func (m *FriendManager) RemoveFriend(playerID, friendID uint64) error {
    pipe := m.redis.Pipeline()
    
    pipe.SRem(ctx, fmt.Sprintf("friends:%d", playerID), fmt.Sprintf("%d", friendID))
    pipe.SRem(ctx, fmt.Sprintf("friends:%d", friendID), fmt.Sprintf("%d", playerID))
    pipe.Del(ctx, fmt.Sprintf("friend_detail:%d:%d", playerID, friendID))
    pipe.Del(ctx, fmt.Sprintf("friend_detail:%d:%d", friendID, playerID))
    
    _, err := pipe.Exec(ctx)
    return err
}

// 获取好友列表
func (m *FriendManager) GetFriends(playerID uint64) ([]uint64, error) {
    key := fmt.Sprintf("friends:%d", playerID)
    members, err := m.redis.SMembers(ctx, key).Result()
    if err != nil {
        return nil, err
    }
    
    var friends []uint64
    for _, member := range members {
        id, _ := strconv.ParseUint(member, 10, 64)
        friends = append(friends, id)
    }
    return friends, nil
}

// 检查是否是好友
func (m *FriendManager) IsFriend(playerID, friendID uint64) bool {
    return m.redis.SIsMember(ctx, fmt.Sprintf("friends:%d", playerID), fmt.Sprintf("%d", friendID)).Val()
}

// 获取好友数量
func (m *FriendManager) GetFriendCount(playerID uint64) (int64, error) {
    return m.redis.SCard(ctx, fmt.Sprintf("friends:%d", playerID)).Result()
}

// 获取共同好友
func (m *FriendManager) GetMutualFriends(playerID1, playerID2 uint64) ([]uint64, error) {
    key1 := fmt.Sprintf("friends:%d", playerID1)
    key2 := fmt.Sprintf("friends:%d", playerID2)
    
    // Redis交集操作
    members, err := m.redis.SInter(ctx, key1, key2).Result()
    if err != nil {
        return nil, err
    }
    
    var mutual []uint64
    for _, member := range members {
        id, _ := strconv.ParseUint(member, 10, 64)
        mutual = append(mutual, id)
    }
    return mutual, nil
}
```

---

## 7. Kafka 在游戏中的典型用法

### 7.1 使用场景

| 场景 | Topic | 消费者 | 说明 |
|------|-------|--------|------|
| 埋点收集 | track_events | 数据分析服务 | 玩家行为日志 |
| 经济流水 | economy_logs | 财务系统 | 金币/钻石变动 |
| 操作日志 | audit_logs | 安全系统 | GM操作、敏感操作 |
| 战斗日志 | battle_logs | 分析服务 | 战斗回放、平衡性分析 |
| 异步任务 | async_tasks | 任务处理器 | 邮件发送、补偿任务 |

### 7.2 生产者示例

```go
type KafkaProducer struct {
    producer sarama.Producer
}

func (p *KafkaProducer) SendTrackEvent(event TrackEvent) error {
    data, _ := json.Marshal(event)
    msg := &sarama.ProducerMessage{
        Topic: "track_events",
        Key:   sarama.StringEncoder(fmt.Sprintf("%d", event.PlayerID)),
        Value: sarama.ByteEncoder(data),
    }
    _, _, err := p.producer.SendMessage(msg)
    return err
}
```

### 7.3 Kafka 消费者实战

#### 7.3.1 经济流水消费者

```go
// 经济流水消费者：将Kafka事件写入ClickHouse
type EconomyConsumer struct {
    consumer   sarama.ConsumerGroup
    ch         *sql.DB // ClickHouse连接
    batchSize  int
    batch      []EconomyLog
    flushTimer *time.Ticker
}

func NewEconomyConsumer(brokers []string, groupID string, ch *sql.DB) *EconomyConsumer {
    config := sarama.NewConfig()
    config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
    config.Consumer.Offsets.Initial = sarama.OffsetOldest
    config.Consumer.Return.Errors = true
    
    consumer, _ := sarama.NewConsumerGroup(brokers, groupID, config)
    
    return &EconomyConsumer{
        consumer:   consumer,
        ch:         ch,
        batchSize:  1000,
        batch:      make([]EconomyLog, 0, 1000),
        flushTimer: time.NewTicker(5 * time.Second),
    }
}

// 实现ConsumerGroupHandler接口
func (c *EconomyConsumer) Setup(session sarama.ConsumerGroupSession) error { return nil }
func (c *EconomyConsumer) Cleanup(session sarama.ConsumerGroupSession) error { return nil }

func (c *EconomyConsumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
    for msg := range claim.Messages() {
        var log EconomyLog
        if err := json.Unmarshal(msg.Value, &log); err != nil {
            log.Error("解析经济流水失败", "error", err)
            continue
        }
        
        c.batch = append(c.batch, log)
        
        // 批量写入ClickHouse
        if len(c.batch) >= c.batchSize {
            c.flushBatch()
        }
        
        // 标记消息已消费
        session.MarkMessage(msg, "")
    }
    return nil
}

// 批量写入ClickHouse
func (c *EconomyConsumer) flushBatch() {
    if len(c.batch) == 0 {
        return
    }
    
    tx, _ := c.ch.Begin()
    stmt, _ := tx.Prepare(`
        INSERT INTO economy流水 (time, player_id, currency, amount, reason, balance_after)
        VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    for _, log := range c.batch {
        stmt.Exec(log.Time, log.PlayerID, log.Currency, log.Amount, log.Reason, log.BalanceAfter)
    }
    
    stmt.Close()
    tx.Commit()
    
    log.Info("批量写入经济流水", "count", len(c.batch))
    c.batch = c.batch[:0]
}

// 启动消费者
func (c *EconomyConsumer) Start(ctx context.Context) {
    // 定时刷新剩余数据
    go func() {
        for {
            select {
            case <-c.flushTimer.C:
                c.flushBatch()
            case <-ctx.Done():
                c.flushBatch()
                return
            }
        }
    }()
    
    // 消费消息
    for {
        if err := c.consumer.Consume(ctx, []string{"economy_logs"}, c); err != nil {
            log.Error("消费失败", "error", err)
            time.Sleep(5 * time.Second) // 重试
        }
    }
}
```

#### 7.3.2 埋点事件消费者

```go
// 埋点事件消费者：实时统计关键指标
type TrackEventConsumer struct {
    consumer sarama.ConsumerGroup
    redis    *redis.Client
}

func (c *TrackEventConsumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
    for msg := range claim.Messages() {
        var event TrackEvent
        if err := json.Unmarshal(msg.Value, &event); err != nil {
            continue
        }
        
        pipe := c.redis.Pipeline()
        today := time.Now().Format("2006-01-02")
        
        switch event.EventName {
        case "login":
            // 统计DAU
            pipe.SAdd(ctx, fmt.Sprintf("dau:%s", today), fmt.Sprintf("%d", event.PlayerID))
            pipe.Expire(ctx, fmt.Sprintf("dau:%s", today), 48*time.Hour)
            
        case "register":
            // 统计新增用户
            pipe.SAdd(ctx, fmt.Sprintf("new_users:%s", today), fmt.Sprintf("%d", event.PlayerID))
            pipe.Expire(ctx, fmt.Sprintf("new_users:%s", today), 48*time.Hour)
            
        case "first_pay":
            // 统计首充
            pipe.SAdd(ctx, fmt.Sprintf("first_pay:%s", today), fmt.Sprintf("%d", event.PlayerID))
            pipe.Expire(ctx, fmt.Sprintf("first_pay:%s", today), 48*time.Hour)
            
            // 更新首充时间
            pipe.Set(ctx, fmt.Sprintf("first_pay_time:%d", event.PlayerID), today, 0)
        }
        
        pipe.Exec(ctx)
        session.MarkMessage(msg, "")
    }
    return nil
}
```

#### 7.3.3 消费者组配置最佳实践

```go
// Kafka消费者组配置
func NewConsumerConfig() *sarama.Config {
    config := sarama.NewConfig()
    
    // 消费者组配置
    config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
    config.Consumer.Offsets.Initial = sarama.OffsetOldest
    config.Consumer.Return.Errors = true
    
    // 批量消费配置（提高吞吐）
    config.Consumer.Fetch.Min = 1           // 最小拉取1条
    config.Consumer.Fetch.Default = 1024*1024 // 默认拉取1MB
    config.Consumer.Fetch.Max = 10*1024*1024  // 最大拉取10MB
    
    // 会话超时配置
    config.Consumer.Group.Session.Timeout = 20 * time.Second
    config.Consumer.Group.Heartbeat.Interval = 6 * time.Second
    
    // 偏移量提交
    config.Consumer.Offsets.AutoCommit.Enable = true
    config.Consumer.Offsets.AutoCommit.Interval = 1 * time.Second
    
    return config
}

// 消费者健康检查
type ConsumerHealth struct {
    ConsumerGroup string
    Lag           map[string]int64 // 每个partition的lag
    LastCommit    time.Time
    Status        string // healthy/degraded/unhealthy
}

func (c *ConsumerHealth) Check(brokers []string, group string) *ConsumerHealth {
    admin, _ := sarama.NewClusterAdmin(brokers, sarama.NewConfig())
    
    // 获取消费者组详情
    groupDesc, _ := admin.DescribeConsumerGroups([]string{group})
    
    for _, g := range groupDesc {
        for _, member := range g.Members {
            // 获取每个partition的lag
            // lag = 最新offset - 已消费offset
        }
    }
    
    // 判断健康状态
    totalLag := int64(0)
    for _, lag := range c.Lag {
        totalLag += lag
    }
    
    if totalLag > 100000 {
        c.Status = "unhealthy"
    } else if totalLag > 10000 {
        c.Status = "degraded"
    } else {
        c.Status = "healthy"
    }
    
    return c
}
```

---

## 8. ClickHouse 在游戏中的典型用法

### 8.1 表设计

```sql
-- 玩家行为宽表（分区+排序键优化）
CREATE TABLE player_events (
    event_time DateTime,
    player_id UInt64,
    event_name String,
    event_type String,
    level UInt32,
    server_id UInt32,
    properties String  -- JSON
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_name, event_time, player_id);

-- 经济流水宽表
CREATE TABLE economy流水 (
    time DateTime,
    player_id UInt64,
    currency String,
    amount Int64,
    reason String,
    balance_after Int64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(time)
ORDER BY (reason, time, player_id);

-- 战斗日志表（按天分区，支持回放分析）
CREATE TABLE battle_logs (
    battle_id String,
    start_time DateTime,
    end_time DateTime,
    mode String,          -- pvp/pve/guild_war
    player_ids Array(UInt64),
    winner_side UInt8,
    duration UInt32,       -- 战斗时长(秒)
    damage_stats String,   -- JSON: 伤害统计
    items_used String      -- JSON: 使用的道具
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (mode, start_time, battle_id);

-- 付费分析表
CREATE TABLE payment_analytics (
    order_time DateTime,
    player_id UInt64,
    product_id UInt32,
    amount Decimal(10,2),
    currency String,
    channel String,        -- ios/android/web
    is_first_pay Bool,
    vip_level UInt8,
    player_level UInt32,
    days_since_register UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(order_time)
ORDER BY (player_id, order_time);
```

### 8.2 分析查询示例

```sql
-- 1. 次日留存率（按注册日期）
SELECT 
    DATE(first_login) AS reg_date,
    COUNT(DISTINCT player_id) AS reg_users,
    COUNT(DISTINCT next_day.player_id) AS retained,
    retained / reg_users * 100 AS retention_rate
FROM (
    SELECT player_id, MIN(time) AS first_login 
    FROM player_events 
    WHERE event_name = 'login' 
    GROUP BY player_id
) first_login
LEFT JOIN player_events next_day 
    ON first_login.player_id = next_day.player_id 
    AND DATE(next_day.time) = DATE(first_login) + INTERVAL 1 DAY
GROUP BY reg_date
ORDER BY reg_date;

-- 2. 经济通胀监控（每日产出/消耗/净变化）
SELECT 
    DATE(time) AS day,
    currency,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS total_cost,
    total_income - total_cost AS net_change,
    -- 通胀率 = 净增量 / 总消耗
    round(net_change * 100.0 / total_cost, 2) AS inflation_rate
FROM economy流水
WHERE time >= today() - 30
GROUP BY day, currency
ORDER BY day, currency;

-- 3. 付费漏斗分析（浏览商店→付费成功）
SELECT 
    step,
    COUNT(DISTINCT player_id) AS users,
    round(users * 100.0 / first_value(users) OVER (ORDER BY step), 2) AS conversion_rate
FROM (
    SELECT player_id, 
        CASE 
            WHEN event_name = 'shop_view' THEN 1
            WHEN event_name = 'item_view' THEN 2
            WHEN event_name = 'pay_click' THEN 3
            WHEN event_name = 'pay_success' THEN 4
        END AS step
    FROM player_events
    WHERE event_name IN ('shop_view', 'item_view', 'pay_click', 'pay_success')
    AND event_time >= today() - 7
)
GROUP BY step
ORDER BY step;

-- 4. 玩家LTV分析（按注册天数的累计付费）
SELECT 
    days_since_register,
    COUNT(DISTINCT player_id) AS active_users,
    SUM(amount) AS total_revenue,
    total_revenue / active_users AS arpu,
    -- 累计ARPU
    sum(arpu) OVER (ORDER BY days_since_register) AS cumulative_arpu
FROM payment_analytics
WHERE order_time >= today() - 90
GROUP BY days_since_register
ORDER BY days_since_register;

-- 5. 渠道ROI分析
SELECT 
    channel,
    COUNT(DISTINCT player_id) AS players,
    SUM(amount) AS revenue,
    revenue / players AS arpu,
    -- 假设CPA为10元/用户
    revenue / (players * 10) AS roi
FROM payment_analytics
WHERE order_time >= today() - 30
GROUP BY channel
ORDER BY revenue DESC;

-- 6. 流失预警分析（7天未登录的高价值用户）
SELECT 
    p.player_id,
    p.level,
    p.vip_level,
    max(e.time) AS last_active,
    dateDiff('day', last_active, now()) AS inactive_days,
    COALESCE(SUM(pa.amount), 0) AS total_pay
FROM player p
LEFT JOIN player_events e ON p.id = e.player_id
LEFT JOIN payment_analytics pa ON p.id = pa.player_id
WHERE p.id IN (
    SELECT player_id FROM player_events 
    WHERE time >= today() - 30
    GROUP BY player_id
    HAVING max(time) < today() - 7
)
GROUP BY p.player_id, p.level, p.vip_level
HAVING total_pay > 100 -- 高价值：累计付费>100元
ORDER BY total_pay DESC
LIMIT 100;
```

---

## 9. DuckDB：轻量分析利器

### 9.1 适用场景

- 本地开发调试：直接查询CSV/JSON文件
- 临时报表：快速验证数据
- 小规模分析：不需要部署ClickHouse
- CI/CD验证：自动化测试数据正确性

### 9.2 使用示例

```sql
-- 直接查询CSV
SELECT * FROM read_csv_auto('player_events.csv') 
WHERE event_name = 'login' 
LIMIT 10;

-- 分析留存
SELECT 
    reg_date,
    COUNT(*) AS users,
    SUM(CASE WHEN retained THEN 1 ELSE 0 END) AS retained_users
FROM read_csv_auto('retention_data.csv')
GROUP BY reg_date;

-- 性能对比：DuckDB vs Pandas
-- DuckDB处理100万行CSV：~0.5秒
-- Pandas处理100万行CSV：~2秒
-- DuckDB处理1000万行CSV：~3秒
-- Pandas处理1000万行CSV：~15秒
```

### 9.3 Python集成示例

```python
import duckdb

# 连接数据库（内存模式）
conn = duckdb.connect(':memory:')

# 查询CSV文件
result = conn.execute("""
    SELECT 
        event_name,
        COUNT(*) as event_count,
        COUNT(DISTINCT player_id) as unique_players
    FROM read_csv_auto('player_events.csv')
    WHERE event_time >= '2024-01-01'
    GROUP BY event_name
    ORDER BY event_count DESC
""").fetchall()

# 查询Parquet文件（列存格式，更高效）
result = conn.execute("""
    SELECT 
        DATE_TRUNC('day', event_time) as day,
        COUNT(*) as events
    FROM read_parquet('events/*.parquet')
    GROUP BY day
    ORDER BY day
""").fetchall()

# 导出结果到CSV
conn.execute("""
    COPY (
        SELECT * FROM read_csv_auto('raw_data.csv')
        WHERE score > 1000
    ) TO 'filtered_data.csv' (HEADER, DELIMITER ',')
""")
```

---

## 10. 选型决策树

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

## 下一步

1. 确定每个数据类型用什么存储
2. 设计缓存策略和一致性方案


---

## 附录：配置表、数据驱动与研发协作

> 以下内容整合自《配置表专题》，讨论配置系统的设计、校验与协作流程。

### 配置表驱动开发

配置系统表面上只是数据编辑，实际上连接着策划、客户端、服务端、测试和发布。任何一个环节模糊，事故都会以版本问题的形式出现。

**配置系统成为事故高发区的条件**：

- 活动频繁
- 多人协作
- 表量很大
- 配置强影响核心资产

**成熟做法**：结构化定义、自动校验、导出与代码生成、灰度发布和审计回滚。

### 表结构设计与拆分

配置表的设计直接影响协作成本和事故概率。关键考虑：

- 表的粒度：太粗则策划互相覆盖，太细则维护成本高
- 字段类型：明确类型约束，避免"什么都放字符串"
- 版本管理：配置表需要和代码一样有版本控制和差异比对
- 拆分策略：按功能模块拆分，还是按更新频率拆分

### 校验、导出与代码生成

**校验链路**：

- 编辑时校验：类型检查、引用完整性、范围约束
- 导出时校验：跨表一致性、业务规则验证
- 加载时校验：版本兼容性、数据完整性

**代码生成**：从配置表自动生成数据结构定义、加载代码和校验逻辑，减少人工编码错误。

### 工作流、事故防呆与协作

**配置发布工作流**：

1. 策划编辑配置表
2. 自动校验（类型、引用、业务规则）
3. Code Review（至少一人审核）
4. 导出与代码生成
5. 灰度发布到测试环境
6. 验证通过后全量发布

**事故防呆**：

- 配置变更必须有审批流程
- 关键配置变更需要灰度验证
- 配置回滚能力必须提前设计
- 配置血缘追踪：知道每个配置影响哪些功能

**常见误区**：把 Excel 当数据库；把配置发布当文件替换；不做血缘追踪和权限治理。
