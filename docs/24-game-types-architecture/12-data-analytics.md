# 游戏数据分析

游戏数据分析是游戏运营的"眼睛"——它帮助团队理解玩家行为、发现问题、优化体验。本章基于《游戏数据分析的艺术》（于洋等著）的框架，系统讲解游戏数据分析的核心方法和实践。

## 1. 数据分析基础

### 1.1 数据分析流程

```
数据采集 → 数据清洗 → 数据存储 → 数据分析 → 可视化 → 决策执行
    ↑                                                        ↓
    └────────────────── 反馈循环 ←──────────────────────────────┘
```

### 1.2 数据分类

| 数据类型 | 说明 | 示例 | 存储方式 |
|---------|------|------|---------|
| 行为数据 | 玩家操作记录 | 点击、移动、购买 | 日志文件 |
| 状态数据 | 玩家当前状态 | 等级、装备、货币 | 数据库 |
| 交易数据 | 充值和消费记录 | 充值金额、道具购买 | 数据库 |
| 社交数据 | 玩家关系和互动 | 好友、公会、聊天 | 数据库 |
| 性能数据 | 系统运行指标 | 延迟、帧率、错误 | 监控系统 |

### 1.3 数据质量保障

```go
// 数据质量检查器
type DataQualityChecker struct {
    clickhouse *sql.DB
}

// 检查数据完整性
func (c *DataQualityChecker) CheckCompleteness(table, date string) (float64, error) {
    var total, missing int64
    
    // 检查必填字段是否为空
    query := fmt.Sprintf(`
        SELECT 
            count() as total,
            countIf(event_name = '') as missing_name,
            countIf(player_id = 0) as missing_player
        FROM %s 
        WHERE toDate(event_time) = '%s'
    `, table, date)
    
    row := c.clickhouse.QueryRow(query)
    row.Scan(&total, &missing, &missing_...)
    
    completeness := float64(total-missing) / float64(total) * 100
    return completeness, nil
}

// 检查数据时效性
func (c *DataQualityChecker) CheckTimeliness(table string, maxDelay time.Duration) (bool, error) {
    var latestEvent time.Time
    
    query := fmt.Sprintf(`
        SELECT max(event_time) FROM %s
    `, table)
    
    err := c.clickhouse.QueryRow(query).Scan(&latestEvent)
    if err != nil {
        return false, err
    }
    
    delay := time.Since(latestEvent)
    return delay <= maxDelay, nil
}

// 检查数据一致性
func (c *DataQualityChecker) CheckConsistency(mysqlCount, chCount int64) float64 {
    if mysqlCount == 0 {
        return 100.0
    }
    return float64(chCount) / float64(mysqlCount) * 100
}
```

### 1.4 常见数据问题与处理

| 问题 | 原因 | 检测方法 | 处理方案 |
|------|------|---------|---------|
| 重复数据 | 网络重试 | COUNT(DISTINCT) | 去重处理 |
| 缺失数据 | 埋点丢失 | NULL值检查 | 插值/标记 |
| 异常数据 | 外挂/错误 | 统计异常检测 | 标记/过滤 |
| 延迟数据 | Kafka积压 | 时间戳对比 | 等待/告警 |
| 格式错误 | 埋点bug | 正则校验 | 修正/丢弃 |

---

## 2. 核心指标体系

### 2.1 用户指标

| 指标 | 定义 | 计算公式 | 健康值 |
|------|------|---------|--------|
| DAU | 日活跃用户 | 当日登录去重用户数 | - |
| MAU | 月活跃用户 | 当月登录去重用户数 | - |
| DAU/MAU | 用户粘性 | DAU ÷ MAU × 100% | > 20% |
| 新增用户 | 当日新注册用户 | 新注册去重用户数 | - |
| 次日留存 | 新用户次日回访 | 次日登录 / 新增 × 100% | > 40% |
| 7日留存 | 新用户7日回访 | 第7日登录 / 新增 × 100% | > 20% |
| 30日留存 | 新用户30日回访 | 第30日登录 / 新增 × 100% | > 10% |

### 2.2 收入指标

| 指标 | 定义 | 计算公式 | 说明 |
|------|------|---------|------|
| ARPU | 每用户平均收入 | 总收入 ÷ DAU | 整体付费能力 |
| ARPPU | 每付费用户平均收入 | 总收入 ÷ 付费用户数 | 付费用户价值 |
| 付费率 | 付费用户占比 | 付费用户数 ÷ DAU × 100% | 付费转化能力 |
| LTV | 用户生命周期价值 | ARPU × 平均生命周期 | 长期价值 |
| 首充率 | 新用户首次充值比例 | 首充用户 ÷ 新增 × 100% | 首充引导效果 |

### 2.3 行为指标

| 指标 | 定义 | 说明 |
|------|------|------|
| 人均在线时长 | 平均每日在线时间 | 粘性指标 |
| 人均登录次数 | 平均每日登录次数 | 习惯指标 |
| 人均关卡完成数 | 平均每日完成关卡数 | 进度指标 |
| 人均战斗次数 | 平均每日战斗次数 | 活跃指标 |
| 社交互动率 | 有社交行为的用户占比 | 社交健康度 |

### 2.4 指标实时计算（Redis）

```go
// 实时指标计算器
type MetricsCalculator struct {
    redis *redis.Client
}

// 计算DAU（使用HyperLogLog，精确去重）
func (c *MetricsCalculator) RecordLogin(playerID uint64) {
    today := time.Now().Format("2006-01-02")
    key := fmt.Sprintf("dau:hll:%s", today)
    
    // HyperLogLog去重计数（误差<0.81%）
    c.redis.PFAdd(ctx, key, fmt.Sprintf("%d", playerID))
    c.redis.Expire(ctx, key, 48*time.Hour)
}

func (c *MetricsCalculator) GetDAU() (int64, error) {
    today := time.Now().Format("2006-01-02")
    key := fmt.Sprintf("dau:hll:%s", today)
    return c.redis.PFCount(ctx, key).Result()
}

// 计算实时ARPU
func (c *MetricsCalculator) GetRealtimeARPU() (float64, error) {
    today := time.Now().Format("2006-01-02")
    
    // 从Redis获取实时收入
    revenue, _ := c.redis.Get(ctx, fmt.Sprintf("revenue:%s", today)).Float64()
    
    // 获取DAU
    dau, _ := c.GetDAU()
    
    if dau == 0 {
        return 0, nil
    }
    
    return revenue / float64(dau), nil
}

// 记录付费事件
func (c *MetricsCalculator) RecordPayment(playerID uint64, amount float64) {
    today := time.Now().Format("2006-01-02")
    pipe := c.redis.Pipeline()
    
    // 累加收入
    pipe.IncrByFloat(ctx, fmt.Sprintf("revenue:%s", today), amount)
    pipe.Expire(ctx, fmt.Sprintf("revenue:%s", today), 48*time.Hour)
    
    // 记录付费用户
    pipe.SAdd(ctx, fmt.Sprintf("pay_users:%s", today), fmt.Sprintf("%d", playerID))
    pipe.Expire(ctx, fmt.Sprintf("pay_users:%s", today), 48*time.Hour)
    
    pipe.Exec(ctx)
}

// 计算实时付费率
func (c *MetricsCalculator) GetPayRate() (float64, error) {
    today := time.Now().Format("2006-01-02")
    
    dau, _ := c.GetDAU()
    payUsers, _ := c.redis.SCard(ctx, fmt.Sprintf("pay_users:%s", today)).Result()
    
    if dau == 0 {
        return 0, nil
    }
    
    return float64(payUsers) / float64(dau) * 100, nil
}
```

---

## 3. 漏斗分析

### 3.1 注册漏斗

```
广告曝光 → 点击下载 → 安装 → 打开 → 注册 → 完成新手 → 首次付费
  100%      30%       20%   15%   10%    5%      1%
```

### 3.2 漏斗分析代码

```go
type FunnelStep struct {
    Name  string
    Count int64
}

type FunnelAnalyzer struct {
    db *gorm.DB
}

func (a *FunnelAnalyzer) AnalyzeRegistrationFunnel(startDate, endDate time.Time) []FunnelStep {
    var steps []FunnelStep
    
    // 1. 广告曝光
    var exposureCount int64
    a.db.Model(&Event{}).Where("event = ? AND time BETWEEN ? AND ?", 
        "ad_exposure", startDate, endDate).Count(&exposureCount)
    steps = append(steps, FunnelStep{Name: "广告曝光", Count: exposureCount})
    
    // 2. 点击下载
    var clickCount int64
    a.db.Model(&Event{}).Where("event = ? AND time BETWEEN ? AND ?",
        "ad_click", startDate, endDate).Count(&clickCount)
    steps = append(steps, FunnelStep{Name: "点击下载", Count: clickCount})
    
    // 3. 安装
    var installCount int64
    a.db.Model(&Event{}).Where("event = ? AND time BETWEEN ? AND ?",
        "app_install", startDate, endDate).Count(&installCount)
    steps = append(steps, FunnelStep{Name: "安装", Count: installCount})
    
    // 4. 打开
    var openCount int64
    a.db.Model(&Event{}).Where("event = ? AND time BETWEEN ? AND ?",
        "app_open", startDate, endDate).Count(&openCount)
    steps = append(steps, FunnelStep{Name: "打开", Count: openCount})
    
    // 5. 注册
    var registerCount int64
    a.db.Model(&Player{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&registerCount)
    steps = append(steps, FunnelStep{Name: "注册", Count: registerCount})
    
    // 6. 完成新手
    var tutorialCount int64
    a.db.Model(&Event{}).Where("event = ? AND time BETWEEN ? AND ?",
        "tutorial_complete", startDate, endDate).Count(&tutorialCount)
    steps = append(steps, FunnelStep{Name: "完成新手", Count: tutorialCount})
    
    // 7. 首次付费
    var firstPayCount int64
    a.db.Model(&Payment{}).Where("is_first = ? AND created_at BETWEEN ? AND ?",
        true, startDate, endDate).Count(&firstPayCount)
    steps = append(steps, FunnelStep{Name: "首次付费", Count: firstPayCount})
    
    return steps
}

// 计算转化率
func CalculateConversionRates(steps []FunnelStep) []float64 {
    rates := make([]float64, len(steps))
    if len(steps) == 0 {
        return rates
    }
    
    rates[0] = 100.0
    for i := 1; i < len(steps); i++ {
        if steps[i-1].Count > 0 {
            rates[i] = float64(steps[i].Count) / float64(steps[i-1].Count) * 100
        }
    }
    return rates
}
```

### 3.3 ClickHouse 漏斗查询

```sql
-- 游戏内付费漏斗（浏览商店→选择商品→点击购买→确认支付→支付成功）
WITH funnel AS (
    SELECT 
        player_id,
        maxIf(event_time, event_name = 'shop_view') AS t1,
        maxIf(event_time, event_name = 'item_select') AS t2,
        maxIf(event_time, event_name = 'pay_click') AS t3,
        maxIf(event_time, event_name = 'pay_confirm') AS t4,
        maxIf(event_time, event_name = 'pay_success') AS t5
    FROM player_events
    WHERE event_time >= today() - 7
    AND event_name IN ('shop_view', 'item_select', 'pay_click', 'pay_confirm', 'pay_success')
    GROUP BY player_id
)
SELECT 
    countIf(t1 > 0) AS step1_shop_view,
    countIf(t2 > t1) AS step2_item_select,
    countIf(t3 > t2) AS step3_pay_click,
    countIf(t4 > t3) AS step4_pay_confirm,
    countIf(t5 > t4) AS step5_pay_success,
    round(step2_item_select * 100.0 / step1_shop_view, 2) AS rate_1_2,
    round(step3_pay_click * 100.0 / step2_item_select, 2) AS rate_2_3,
    round(step4_pay_confirm * 100.0 / step3_pay_click, 2) AS rate_3_4,
    round(step5_pay_success * 100.0 / step4_pay_confirm, 2) AS rate_4_5,
    round(step5_pay_success * 100.0 / step1_shop_view, 2) AS overall_rate
FROM funnel;

-- 各渠道注册漏斗对比
WITH channel_funnel AS (
    SELECT 
        channel,
        countIf(event_name = 'install') AS installs,
        countIf(event_name = 'register') AS registers,
        countIf(event_name = 'tutorial_complete') AS tutorials,
        countIf(event_name = 'first_pay') AS first_pays
    FROM player_events
    WHERE event_time >= today() - 7
    GROUP BY channel
)
SELECT 
    channel,
    installs,
    registers,
    round(registers * 100.0 / installs, 2) AS reg_rate,
    round(tutorials * 100.0 / registers, 2) AS tutorial_rate,
    round(first_pays * 100.0 / tutorials, 2) AS pay_rate
FROM channel_funnel
ORDER BY installs DESC;
```

---

## 4. 留存分析

### 4.1 留存类型

| 类型 | 计算方式 | 用途 |
|------|---------|------|
| 新增留存 | 新用户第N天登录 | 评估新手体验 |
| 活跃留存 | 活跃用户第N天回访 | 评估整体粘性 |
| 付费留存 | 付费用户第N天登录 | 评估付费价值 |
| 回流流失 | 流失用户重新登录 | 评估召回效果 |

### 4.2 留存分析代码

```go
type RetentionAnalyzer struct {
    db *gorm.DB
}

type RetentionResult struct {
    Day       int     // 第N天
    Users     int64   // 总用户数
    Retained  int64   // 留存用户数
    Rate      float64 // 留存率
}

func (a *RetentionAnalyzer) AnalyzeNewUserRetention(regDate time.Time, days int) []RetentionResult {
    var results []RetentionResult
    
    // 获取注册日的新用户
    var newUsers []uint64
    a.db.Model(&Player{}).Where("DATE(created_at) = ?", regDate.Format("2006-01-02")).
        Pluck("id", &newUsers)
    
    totalUsers := int64(len(newUsers))
    
    for day := 1; day <= days; day++ {
        targetDate := regDate.AddDate(0, 0, day)
        
        // 统计第N天登录的用户数
        var retainedCount int64
        a.db.Model(&LoginLog{}).
            Where("player_id IN ? AND DATE(login_time) = ?", newUsers, targetDate.Format("2006-01-02")).
            Distinct("player_id").
            Count(&retainedCount)
        
        rate := 0.0
        if totalUsers > 0 {
            rate = float64(retainedCount) / float64(totalUsers) * 100
        }
        
        results = append(results, RetentionResult{
            Day:      day,
            Users:    totalUsers,
            Retained: retainedCount,
            Rate:     rate,
        })
    }
    
    return results
}
```

### 4.3 留存曲线分析

```
留存率
  │
40%├────●
  │     \
30%├      \
  │       \
20%├        ●────●────●
  │              \    \
10%├               \    ●────●
  │                        \    ●────●
 0%├────────────────────────────────────→ 天数
   1  3  7  14  21  30  60  90

特征：
- 1-3天快速下降：新手体验问题
- 3-7天趋于平稳：核心用户形成
- 7天后缓慢下降：长期粘性问题
```

### 4.4 ClickHouse 留存查询

```sql
-- 7日留存率（按注册日期）
WITH first_login AS (
    SELECT 
        player_id,
        toDate(min(event_time)) AS reg_date
    FROM player_events
    WHERE event_name = 'login'
    GROUP BY player_id
),
retention AS (
    SELECT 
        fl.reg_date,
        fl.player_id,
        countIf(toDate(pe.event_time) = fl.reg_date + 1) AS d1,
        countIf(toDate(pe.event_time) = fl.reg_date + 3) AS d3,
        countIf(toDate(pe.event_time) = fl.reg_date + 7) AS d7,
        countIf(toDate(pe.event_time) = fl.reg_date + 14) AS d14,
        countIf(toDate(pe.event_time) = fl.reg_date + 30) AS d30
    FROM first_login fl
    LEFT JOIN player_events pe ON fl.player_id = pe.player_id
    WHERE pe.event_name = 'login'
    GROUP BY fl.reg_date, fl.player_id
)
SELECT 
    reg_date,
    count() AS new_users,
    round(sum(d1) * 100.0 / count(), 2) AS d1_retention,
    round(sum(d3) * 100.0 / count(), 2) AS d3_retention,
    round(sum(d7) * 100.0 / count(), 2) AS d7_retention,
    round(sum(d14) * 100.0 / count(), 2) AS d14_retention,
    round(sum(d30) * 100.0 / count(), 2) AS d30_retention
FROM retention
WHERE reg_date >= today() - 30
GROUP BY reg_date
ORDER BY reg_date;

-- 不同渠道的留存对比
WITH first_login AS (
    SELECT 
        player_id,
        toDate(min(event_time)) AS reg_date,
        argMax(channel, event_time) AS channel
    FROM player_events
    WHERE event_name = 'login'
    GROUP BY player_id
)
SELECT 
    fl.channel,
    count(DISTINCT fl.player_id) AS new_users,
    round(countIf(toDate(pe.event_time) = fl.reg_date + 1) * 100.0 / new_users, 2) AS d1_retention,
    round(countIf(toDate(pe.event_time) = fl.reg_date + 7) * 100.0 / new_users, 2) AS d7_retention
FROM first_login fl
LEFT JOIN player_events pe ON fl.player_id = pe.player_id
WHERE fl.reg_date >= today() - 7
GROUP BY fl.channel
ORDER BY new_users DESC;
```

---

## 5. 付费分析

### 5.1 付费漏斗

```
浏览商店 → 查看商品 → 点击购买 → 确认支付 → 支付成功
  100%      60%       30%       20%       15%
```

### 5.2 付费分层

```go
type PaySegment struct {
    Segment   string  // 用户分层
    MinPay    float64 // 最低付费金额
    MaxPay    float64 // 最高付费金额
    UserCount int64   // 用户数量
    Revenue   float64 // 收入贡献
    Percentage float64 // 收入占比
}

func (a *PayAnalyzer) SegmentUsers(startDate, endDate time.Time) []PaySegment {
    var segments []PaySegment
    
    // 获取时间段内的付费数据
    var payments []struct {
        PlayerID uint64
        Amount   float64
    }
    a.db.Model(&Payment{}).
        Where("created_at BETWEEN ? AND ?", startDate, endDate).
        Select("player_id, SUM(amount) as amount").
        Group("player_id").
        Scan(&payments)
    
    // 分层统计
    layers := []struct {
        Name   string
        Min    float64
        Max    float64
    }{
        {"鲸鱼用户", 1000, 999999},
        {"海豚用户", 100, 999},
        {"小鱼用户", 1, 99},
        {"免费用户", 0, 0},
    }
    
    for _, layer := range layers {
        var count int64
        var revenue float64
        for _, p := range payments {
            if p.Amount >= layer.Min && p.Amount < layer.Max {
                count++
                revenue += p.Amount
            }
        }
        
        segments = append(segments, PaySegment{
            Segment:   layer.Name,
            MinPay:    layer.Min,
            MaxPay:    layer.Max,
            UserCount: count,
            Revenue:   revenue,
        })
    }
    
    return segments
}
```

### 5.3 付费分析指标

| 指标 | 计算方式 | 说明 |
|------|---------|------|
| 鲸鱼用户占比 | 鲸鱼用户数 ÷ 总付费用户 | 核心收入来源 |
| 付费转化率 | 付费用户 ÷ 活跃用户 | 转化能力 |
| 首充转化率 | 首充用户 ÷ 新增用户 | 首充引导效果 |
| 复购率 | 复购用户 ÷ 付费用户 | 付费粘性 |
| ARPU | 总收入 ÷ DAU | 整体付费能力 |

### 5.4 ClickHouse 付费深度分析

```sql
-- 1. 付费用户分层分析（鲸鱼/海豚/小鱼）
WITH pay_users AS (
    SELECT 
        player_id,
        sum(amount) AS total_pay,
        count() AS pay_count,
        min(order_time) AS first_pay_time,
        max(order_time) AS last_pay_time
    FROM payment_analytics
    WHERE order_time >= today() - 30
    GROUP BY player_id
)
SELECT 
    CASE 
        WHEN total_pay >= 1000 THEN '鲸鱼(≥1000元)'
        WHEN total_pay >= 100 THEN '海豚(100-999元)'
        WHEN total_pay > 0 THEN '小鱼(1-99元)'
    END AS segment,
    count() AS users,
    round(users * 100.0 / (SELECT count() FROM pay_users), 2) AS user_pct,
    sum(total_pay) AS revenue,
    round(revenue * 100.0 / (SELECT sum(total_pay) FROM pay_users), 2) AS revenue_pct,
    round(avg(pay_count), 1) AS avg_pay_count,
    round(avg(total_pay), 2) AS avg_pay_amount
FROM pay_users
GROUP BY segment
ORDER BY revenue DESC;

-- 2. 付费间隔分析（多久复购）
WITH pay_intervals AS (
    SELECT 
        player_id,
        dateDiff('day', 
            lag(order_time) OVER (PARTITION BY player_id ORDER BY order_time),
            order_time
        ) AS days_between
    FROM payment_analytics
    WHERE order_time >= today() - 90
)
SELECT 
    CASE 
        WHEN days_between <= 1 THEN '1天内'
        WHEN days_between <= 3 THEN '1-3天'
        WHEN days_between <= 7 THEN '3-7天'
        WHEN days_between <= 30 THEN '7-30天'
        ELSE '30天以上'
    END AS interval_group,
    count() AS occurrences,
    round(occurrences * 100.0 / (SELECT count() FROM pay_intervals WHERE days_between IS NOT NULL), 2) AS pct
FROM pay_intervals
WHERE days_between IS NOT NULL
GROUP BY interval_group
ORDER BY interval_group;

-- 3. 商品购买热度分析
SELECT 
    product_id,
    count() AS buy_count,
    sum(amount) AS total_revenue,
    count(DISTINCT player_id) AS unique_buyers,
    round(total_revenue / buy_count, 2) AS avg_price
FROM payment_analytics
WHERE order_time >= today() - 7
GROUP BY product_id
ORDER BY total_revenue DESC
LIMIT 20;

-- 4. 付费时段分布（什么时间充值最多）
SELECT 
    toHour(order_time) AS hour,
    count() AS pay_count,
    sum(amount) AS revenue,
    count(DISTINCT player_id) AS pay_users
FROM payment_analytics
WHERE order_time >= today() - 7
GROUP BY hour
ORDER BY hour;
```

---

## 6. A/B 测试

### 6.1 A/B 测试流程

```
1. 提出假设 → 2. 设计实验 → 3. 分配流量 → 4. 收集数据 → 5. 统计分析 → 6. 决策执行
```

### 6.2 A/B 测试实现

```go
type ABTest struct {
    ID          string
    Name        string
    Traffic     map[string]float64  // 流量分配比例
    StartTime   time.Time
    EndTime     time.Time
    Status      string
}

type ABTestManager struct {
    redis *redis.Client
}

func (m *ABTestManager) AssignGroup(playerID uint64, testID string) string {
    // 使用一致性哈希确保同一用户总是分到同一组
    key := fmt.Sprintf("abtest:%s:%d", testID, playerID)
    group, err := m.redis.Get(ctx, key).Result()
    if err == nil {
        return group
    }
    
    // 根据玩家ID哈希分配组
    hash := fnv.New32a()
    hash.Write([]byte(fmt.Sprintf("%s:%d", testID, playerID)))
    hashVal := hash.Sum32() % 100
    
    // 根据流量比例分配
    test := m.getTest(testID)
    cumulative := uint32(0)
    for name, ratio := range test.Traffic {
        cumulative += uint32(ratio * 100)
        if hashVal < cumulative {
            m.redis.Set(ctx, key, name, time.Until(test.EndTime))
            return name
        }
    }
    
    return "control"
}
```

### 6.3 统计显著性

```go
// 计算A/B测试的统计显著性
func CalculateSignificance(controlConversions, controlTotal, 
    testConversions, testTotal int64) (float64, bool) {
    
    p1 := float64(controlConversions) / float64(controlTotal)
    p2 := float64(testConversions) / float64(testTotal)
    
    // 合并比例
    p := float64(controlConversions+testConversions) / float64(controlTotal+testTotal)
    
    // 标准误差
    se := math.Sqrt(p * (1 - p) * (1/float64(controlTotal) + 1/float64(testTotal)))
    
    // Z值
    z := (p2 - p1) / se
    
    // 双尾检验 p值
    pValue := 2 * (1 - normalCDF(math.Abs(z)))
    
    // 95% 置信度
    significant := pValue < 0.05
    
    return pValue, significant
}
```

### 6.4 A/B 测试实战案例

```sql
-- 商店UI改版A/B测试效果分析
WITH test_groups AS (
    SELECT 
        player_id,
        group_name,
        event_name,
        event_time
    FROM ab_test_events
    WHERE test_id = 'shop_ui_v2'
    AND event_time >= '2024-01-01'
    AND event_time <= '2024-01-14'
),
conversion AS (
    SELECT 
        group_name,
        count(DISTINCT player_id) AS total_users,
        countIf(event_name = 'shop_view') AS shop_views,
        countIf(event_name = 'pay_success') AS pay_success,
        sumIf(amount, event_name = 'pay_success') AS total_revenue
    FROM test_groups te
    LEFT JOIN payment_analytics pa ON te.player_id = pa.player_id
    GROUP BY group_name
)
SELECT 
    group_name,
    total_users,
    shop_views,
    pay_success,
    round(pay_success * 100.0 / total_users, 2) AS pay_rate,
    round(total_revenue / total_users, 2) AS arpu,
    round(total_revenue / pay_success, 2) AS arppu
FROM conversion
ORDER BY group_name;

-- 使用ClickHouse内置的统计函数
SELECT 
    group_name,
    count() AS samples,
    avg(amount) AS mean_amount,
    stddevPop(amount) AS std_amount,
    -- 95%置信区间
    avg(amount) - 1.96 * stddevPop(amount) / sqrt(count()) AS ci_lower,
    avg(amount) + 1.96 * stddevPop(amount) / sqrt(count()) AS ci_upper
FROM ab_test_events ate
JOIN payment_analytics pa ON ate.player_id = pa.player_id
WHERE test_id = 'shop_ui_v2'
GROUP BY group_name;
```

### 6.5 A/B 测试注意事项

| 注意事项 | 说明 | 解决方案 |
|---------|------|---------|
| 样本量不足 | 结果不具统计显著性 | 使用功效分析计算最小样本量 |
| 测试时间太短 | 可能受周期性影响 | 至少运行1-2个完整周期 |
| 辛普森悖论 | 整体和分组结论矛盾 | 分层分析，控制混杂变量 |
| 多重比较 | 多次检验增加假阳性 | 使用Bonferroni校正 |
| 新奇效应 | 新功能短期吸引力 | 延长测试时间，观察趋势 |

---

## 7. 数据仓库与 ETL

### 7.1 数据分层

```
┌─────────────────────────────────────┐
│           数据应用层                 │
│   (报表、仪表盘、分析模型)           │
├─────────────────────────────────────┤
│           数据服务层                 │
│   (API、数据接口)                    │
├─────────────────────────────────────┤
│           数据仓库层                 │
│   (ODS → DWD → DWS → ADS)          │
├─────────────────────────────────────┤
│           数据采集层                 │
│   (日志、数据库、埋点)               │
└─────────────────────────────────────┘
```

### 7.2 ETL 流程

```go
type ETLJob struct {
    Name      string
    Source    DataSource
    Transform TransformFunc
    Load      DataSink
}

type DataSource interface {
    Read() ([]map[string]interface{}, error)
}

type DataSink interface {
    Write(data []map[string]interface{}) error
}

type TransformFunc func([]map[string]interface{}) ([]map[string]interface{}, error)

func (j *ETLJob) Run() error {
    // 1. Extract
    data, err := j.Source.Read()
    if err != nil {
        return fmt.Errorf("extract failed: %w", err)
    }
    
    // 2. Transform
    transformed, err := j.Transform(data)
    if err != nil {
        return fmt.Errorf("transform failed: %w", err)
    }
    
    // 3. Load
    if err := j.Load.Write(transformed); err != nil {
        return fmt.Errorf("load failed: %w", err)
    }
    
    return nil
}
```

### 7.3 实战ETL：用户行为数据入仓

```go
// 从Kafka消费 → 清洗 → 写入ClickHouse
type BehaviorETL struct {
    kafkaConsumer sarama.ConsumerGroup
    clickhouse    *sql.DB
}

func (e *BehaviorETL) Transform(events []map[string]interface{}) ([]map[string]interface{}, error) {
    var cleaned []map[string]interface{}
    
    for _, event := range events {
        // 1. 过滤无效事件
        if event["player_id"] == nil || event["event_name"] == nil {
            continue
        }
        
        // 2. 补全缺失字段
        if event["event_time"] == nil {
            event["event_time"] = time.Now().Format("2006-01-02 15:04:05")
        }
        
        // 3. 标准化事件名
        event["event_name"] = strings.ToLower(event["event_name"].(string))
        
        // 4. 解析properties JSON
        if props, ok := event["properties"].(string); ok {
            var parsed map[string]interface{}
            json.Unmarshal([]byte(props), &parsed)
            event["properties"] = parsed
        }
        
        cleaned = append(cleaned, event)
    }
    
    return cleaned, nil
}

func (e *BehaviorETL) Load(events []map[string]interface{}) error {
    tx, _ := e.clickhouse.Begin()
    stmt, _ := tx.Prepare(`
        INSERT INTO player_events (event_time, player_id, event_name, event_type, level, server_id, properties)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    for _, event := range events {
        stmt.Exec(
            event["event_time"],
            event["player_id"],
            event["event_name"],
            event["event_type"],
            event["level"],
            event["server_id"],
            event["properties"],
        )
    }
    
    stmt.Close()
    return tx.Commit()
}
```

---

## 8. 可视化与仪表盘

### 8.1 仪表盘设计原则

| 原则 | 说明 |
|------|------|
| 重要信息优先 | 关键指标放在显眼位置 |
| 一目了然 | 避免信息过载 |
| 可交互 | 支持筛选和下钻 |
| 实时更新 | 关键指标实时刷新 |
| 移动友好 | 支持手机查看 |

### 8.2 常用仪表盘

| 仪表盘 | 目标用户 | 核心指标 |
|--------|---------|---------|
| 运营仪表盘 | 运营团队 | DAU、留存、收入 |
| 产品仪表盘 | 产品团队 | 转化率、功能使用率 |
| 技术仪表盘 | 技术团队 | 延迟、错误率、容量 |
| 老板仪表盘 | 管理层 | 收入趋势、用户增长 |

### 8.3 仪表盘数据查询示例

```sql
-- 1. 运营日报数据
SELECT 
    toDate(event_time) AS day,
    uniqExact(player_id) AS dau,
    uniqExactIf(player_id, level = 1) AS new_users,
    round(avg(daily_play_time), 1) AS avg_play_time,
    round(avg(daily_pay_amount), 2) AS arpu
FROM player_daily_summary
WHERE day >= today() - 30
GROUP BY day
ORDER BY day;

-- 2. 收入趋势（按渠道）
SELECT 
    toDate(order_time) AS day,
    channel,
    sum(amount) AS revenue,
    count(DISTINCT player_id) AS pay_users,
    round(revenue / pay_users, 2) AS arppu
FROM payment_analytics
WHERE order_time >= today() - 7
GROUP BY day, channel
ORDER BY day, revenue DESC;

-- 3. 实时在线人数（每分钟）
SELECT 
    toStartOfMinute(event_time) AS minute,
    uniqExact(player_id) AS online_count
FROM player_events
WHERE event_name = 'heartbeat'
AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

### 8.4 可视化图表选择指南

```
┌─────────────────────────────────────────────────────────────┐
│                    图表选择决策树                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  比较数据？                                                  │
│  ├── 多个类别比较 → 柱状图/条形图                             │
│  ├── 随时间变化 → 折线图                                     │
│  └── 部分与整体 → 饼图/环形图                                │
│                                                             │
│  分布分析？                                                  │
│  ├── 单变量分布 → 直方图                                     │
│  ├── 双变量关系 → 散点图                                     │
│  └── 多变量关系 → 热力图                                     │
│                                                             │
│  流程分析？                                                  │
│  ├── 转化漏斗 → 漏斗图                                       │
│  ├── 流向关系 → 桑基图                                       │
│  └── 时间线 → 甘特图                                         │
│                                                             │
│  实时监控？                                                  │
│  ├── 数值变化 → 数字卡片                                     │
│  ├── 趋势变化 → 实时折线图                                   │
│  └── 状态监控 → 仪表盘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 数据驱动决策

### 9.1 数据分析框架

```
问题定义 → 数据收集 → 数据分析 → 结论验证 → 行动执行 → 效果评估
    ↑                                                          ↓
    └──────────────────── 反馈循环 ←──────────────────────────────┘
```

### 9.2 常见分析场景

| 场景 | 分析方法 | 输出 |
|------|---------|------|
| 新手流失 | 漏斗分析 + 留存分析 | 新手引导优化方案 |
| 付费转化 | 付费漏斗 + A/B测试 | 商店优化方案 |
| 活动效果 | 活动数据分析 | 活动复盘报告 |
| 版本评估 | 前后对比分析 | 版本迭代建议 |
| 竞品分析 | 市场数据分析 | 竞品情报报告 |

### 9.3 数据分析报告模板

```markdown
# 数据分析报告

## 1. 分析背景
- 分析目的
- 分析时间范围
- 数据来源

## 2. 核心发现
- 发现1：XXX
- 发现2：XXX
- 发现3：XXX

## 3. 数据支撑
- 图表1：XXX
- 图表2：XXX
- 图表3：XXX

## 4. 结论与建议
- 结论1：XXX
- 建议1：XXX

## 5. 下一步计划
- 行动1：XXX
- 行动2：XXX
```

---

## 10. 数据安全与合规

### 10.1 数据安全原则

| 原则 | 说明 |
|------|------|
| 最小权限 | 只授予必要的数据访问权限 |
| 数据脱敏 | 敏感数据在分析前脱敏 |
| 加密存储 | 重要数据加密存储 |
| 审计日志 | 记录所有数据访问行为 |
| 定期清理 | 过期数据及时清理 |

### 10.2 隐私合规

- 遵守《个人信息保护法》
- 获取用户明确同意
- 提供数据删除接口
- 不向第三方共享用户数据
- 定期进行隐私审计

---

## 下一步

1. 建立数据采集体系
2. 搭建数据仓库
3. 开发核心指标仪表盘
4. 制定A/B测试流程
5. 建立数据分析团队
