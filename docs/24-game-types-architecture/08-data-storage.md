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

### 3.2 数据模型分类

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

### 4.3 幂等与对账

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

---

## 8. ClickHouse 在游戏中的典型用法

### 8.1 表设计

```sql
-- 玩家行为宽表
CREATE TABLE player_events (
    event_time DateTime,
    player_id UInt64,
    event_name String,
    event_type String,
    level UInt32,
    server_id UInt32,
    properties String  -- JSON
) ENGINE = MergeTree()
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
ORDER BY (reason, time, player_id);
```

### 8.2 分析查询示例

```sql
-- 次日留存率
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
GROUP BY reg_date;

-- 经济通胀监控
SELECT 
    DATE(time) AS day,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS total_cost,
    total_income - total_cost AS net_change
FROM economy流水
GROUP BY day;
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
3. 搭建数据链路（Kafka → ClickHouse）
4. 建立分析仪表盘
