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
