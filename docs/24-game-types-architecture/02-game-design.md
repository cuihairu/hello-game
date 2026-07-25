# 策划与数值设计

策划是游戏的"灵魂"，数值是游戏的"骨架"。服务端开发者理解策划思路和数值系统，才能设计出正确的架构、做出合理的技术决策。本章梳理游戏策划中最核心的概念、常见数值系统，以及玩家心理学基础。

## 1. 策划的核心工作

### 1.1 策划的职责

| 策划类型 | 核心工作 | 与服务端的关系 |
|---------|---------|--------------|
| 系统策划 | 设计游戏系统（背包、公会、邮件） | 接口设计、数据结构 |
| 数值策划 | 设计数值公式（伤害、属性、经济） | 计算逻辑、配置表 |
| 关卡策划 | 设计关卡内容（副本、地图） | 关卡配置、怪物刷新 |
| 战斗策划 | 设计战斗系统（技能、AI、平衡） | 战斗逻辑、同步方案 |
| 剧情策划 | 设计故事和对话 | 文本系统、触发条件 |
| 运营策划 | 设计活动和运营策略 | 活动系统、奖励发放 |

### 1.2 策划文档类型

```
策划文档体系：
├── 系统策划案（功能设计）
│   ├── 系统概述
│   ├── 功能列表
│   ├── 交互流程
│   └── 边界条件
├── 数值策划案（数值设计）
│   ├── 属性公式
│   ├── 等级曲线
│   ├── 概率表
│   └── 经济模型
├── 关卡策划案（内容设计）
│   ├── 关卡配置表
│   ├── 怪物配置表
│   └── 掉落配置表
└── 技术对接文档（策划→开发）
    ├── 接口需求
    ├── 数据结构
    └── 异常处理
```

---

## 2. 常见数值系统

### 2.1 属性系统

#### 基础属性

| 属性 | 说明 | 常见公式 |
|------|------|---------|
| HP（生命值） | 生存能力 | base + growth × level |
| MP（魔法值） | 技能消耗 | base + growth × level |
| ATK（攻击力） | 伤害输出 | base + growth × level + 装备加成 |
| DEF（防御力） | 减伤能力 | base + growth × level + 装备加成 |
| SPD（速度） | 行动顺序 | base + buff加成 |
| CRIT（暴击率） | 暴击概率 | base + 装备加成 |
| CRIT_DMG（暴击伤害） | 暴击倍率 | base + 装备加成 |

#### 属性计算公式

```go
type AttributeConfig struct {
    BaseHP      int     `json:"base_hp"`
    GrowthHP    float64 `json:"growth_hp"`
    BaseATK     int     `json:"base_atk"`
    GrowthATK   float64 `json:"growth_atk"`
    BaseDEF     int     `json:"base_def"`
    GrowthDEF   float64 `json:"growth_def"`
    BaseSPD     int     `json:"base_spd"`
    GrowthSPD   float64 `json:"growth_spd"`
}

// 等级属性计算
func (c *AttributeConfig) CalcHP(level int) int {
    return int(float64(c.BaseHP) + float64(level-1) * c.GrowthHP)
}

// 最终属性 = 基础属性 × (1 + 百分比加成) + 固定加成
func CalcFinal(base int, percentBonus float64, flatBonus int) int {
    return int(float64(base) * (1.0 + percentBonus)) + flatBonus
}
```

### 2.2 伤害公式

#### 常见伤害模型

```go
// 模型1：简单减伤
func CalcDamage1(atk, def int) int {
    damage := atk - def/2
    if damage < 1 {
        damage = 1
    }
    return damage
}

// 模型2：百分比减伤
func CalcDamage2(atk, def int) float64 {
    // 伤害 = 攻击力 × (1 - 防御/(防御+常数K))
    K := 100.0
    return float64(atk) * (1.0 - float64(def)/(float64(def)+K))
}

// 模型3：乘算减伤（MMO常用）
func CalcDamage3(atk, def int, defRate float64) float64 {
    // 伤害 = 攻击力 × (1 - 减伤率)
    // 减伤率 = 防御 × 系数 / (防御 × 系数 + 常数K)
    K := 1000.0
    reductionRate := float64(def) * defRate / (float64(def)*defRate + K)
    return float64(atk) * (1.0 - reductionRate)
}

// 模型4：最终伤害 = 基础伤害 × 暴击 × 技能倍率 × 随机浮动
func CalcDamage4(baseDamage, critRate, critDmg, skillRate float64) float64 {
    damage := baseDamage
    
    // 暴击判定
    if rand.Float64() < critRate {
        damage *= critDmg
    }
    
    // 技能倍率
    damage *= skillRate
    
    // 随机浮动 (0.95 ~ 1.05)
    damage *= 0.95 + rand.Float64()*0.1
    
    return damage
}
```

### 2.3 经验值系统

#### 等级经验曲线

```go
// 线性增长（简单游戏）
func LinearExp(level int) int {
    return level * 100
}

// 指数增长（RPG常用）
func ExponentialExp(level int) int {
    return int(100 * math.Pow(1.15, float64(level-1)))
}

// 多段增长（MMO常用）
func MultiStageExp(level int) int {
    switch {
    case level <= 30:
        return level * 100           // 1-30级：线性
    case level <= 60:
        return 3000 + (level-30)*500  // 31-60级：加速
    case level <= 90:
        return 18000 + (level-60)*2000 // 61-90级：大幅加速
    default:
        return 78000 + (level-90)*5000 // 91+级：极高
    }
}
```

#### 经验曲线图

```
经验值
  │
  │                              ●
  │                            ●
  │                          ●
  │                        ●
  │                      ●
  │                  ●
  │              ●
  │          ●
  │      ●
  │  ●
  └──────────────────────────────→ 等级
   1  10  20  30  40  50  60  70  80

设计原则：
- 早期：快速升级，建立成就感
- 中期：节奏放缓，引导付费/社交
- 后期：极慢，延长生命周期
```

---

## 3. 概率系统

### 3.1 概率类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 固定概率 | 每次概率相同 | 抽卡 1% 出SSR |
| 保底概率 | 达到阈值必出 | 90抽保底 |
| 动态概率 | 概率随次数变化 | 越抽越容易出 |
| 条件概率 | 满足条件才触发 | 暴击、连击 |
| 随机种子 | 可重复的随机 | 帧同步确定性 |

### 3.2 抽卡系统

```go
type GachaConfig struct {
    // 基础概率
    BaseRateSSR   float64  // 0.01 (1%)
    BaseRateSR    float64  // 0.05 (5%)
    BaseRateR     float64  // 0.40 (40%)
    
    // 保底系统
    PitySSR       int      // 90抽保底
    PitySR        int      // 10抽保底
    
    // 软保底
    SoftPityStart int      // 75抽开始概率提升
    SoftPityRate  float64  // 75抽后每抽+6%
}

func (g *GachaConfig) Draw(pityCount int) string {
    rate := g.BaseRateSSR
    
    // 软保底：75抽后概率递增
    if pityCount >= g.SoftPityStart {
        rate += float64(pityCount-g.SoftPityStart+1) * g.SoftPityRate
    }
    
    // 硬保底：90抽必出
    if pityCount >= g.PitySSR {
        rate = 1.0
    }
    
    if rand.Float64() < rate {
        return "SSR"
    }
    if rand.Float64() < g.BaseRateSR/(1.0-rate) {
        return "SR"
    }
    return "R"
}
```

### 3.3 概率公示要求

```
根据国家规定，抽卡概率必须公示：
1. 每个品级的基础概率
2. 保底机制说明
3. 概率提升活动的额外概率
4. 概率计算的随机种子说明

服务端必须：
- 服务端计算概率，不能信任客户端
- 概率结果可追溯（日志记录）
- 保底计数准确（不能被刷）
```

---

## 4. 经济系统

### 4.1 货币体系

```
货币金字塔：

        💎 钻石（付费货币）
       /  \
      /    \
     /  1:10 \
    /          \
   💰 金币（游戏货币）
  /              \
 /    1:100       \
/                  \
🎫 代币（活动货币）

设计原则：
- 货币种类不超过3-4种
- 每种货币有明确的产出/消耗场景
- 付费货币和游戏货币不能逆向转换
```

### 4.2 产出-消耗平衡

```go
type EconomyBalance struct {
    // 产出来源
    DailyIncome map[string]float64  // 每日产出
    // 消耗来源
    DailyCost   map[string]float64  // 每日消耗
}

func (e *EconomyBalance) CheckBalance() bool {
    for currency, income := range e.DailyIncome {
        cost := e.DailyCost[currency]
        // 产出应略大于消耗（给玩家成就感）
        // 但不能差距太大（防止通胀）
        ratio := cost / income
        if ratio < 0.8 || ratio > 1.2 {
            return false  // 不平衡
        }
    }
    return true
}
```

### 4.3 通胀控制

```
游戏经济通胀控制：

1. 产出控制
   - 每日产出上限
   - 等级越高产出越少
   - 活动产出有上限

2. 消耗设计
   - 装备强化消耗递增
   - 技能升级消耗递增
   - 交易税（5-15%）

3. 回收机制
   - 装备分解
   - 道具回收
   - 限时道具过期

4. 价值锚定
   - 关键道具固定价格
   - 交易所价格区间
   - 排行榜奖励固定
```

---

## 5. 掉落系统

### 5.1 掉落类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 固定掉落 | 必定掉落 | 金币、经验 |
| 随机掉落 | 概率掉落 | 装备、材料 |
| 首通奖励 | 首次通关额外 | 稀有道具 |
| 成就奖励 | 达成条件触发 | 成就称号 |
| 签到奖励 | 每日登录 | 每日礼包 |

### 5.2 掉落表设计

```go
type DropTable struct {
    ID       int
    GroupID  int
    Items    []DropItem
}

type DropItem struct {
    ItemID   int
    Count    int
    Weight   int     // 权重（越大越容易出）
    MinLevel int     // 最小等级要求
    MaxCount int     // 最大掉落数量
}

// 掉落计算
func RollDrop(table *DropTable) []DropResult {
    var results []DropResult
    totalWeight := 0
    
    for _, item := range table.Items {
        totalWeight += item.Weight
    }
    
    for _, item := range table.Items {
        rate := float64(item.Weight) / float64(totalWeight)
        if rand.Float64() < rate {
            count := item.MinCount + rand.Intn(item.MaxCount-item.MinCount+1)
            results = append(results, DropResult{
                ItemID: item.ItemID,
                Count:  count,
            })
        }
    }
    
    return results
}
```

---

## 6. 玩家心理学

### 6.1 核心驱动力（SDT理论）

| 驱动力 | 心理需求 | 游戏设计 | 服务端支持 |
|--------|---------|---------|-----------|
| **自主性** | 自由选择 | 开放世界、多路线 | 多种玩法入口 |
| **胜任感** | 掌控感 | 难度曲线、技能树 | 难度匹配、成长系统 |
| **归属感** | 社交连接 | 公会、组队、聊天 | 社交系统、匹配系统 |

### 6.2 玩家类型（Bartle分类）

| 类型 | 特征 | 偏好内容 | 付费倾向 |
|------|------|---------|---------|
| **成就者** | 追求目标和数据 | 成就、排行榜、收集 | 高（追求效率） |
| **探索者** | 追求发现和理解 | 隐藏内容、世界观 | 中（追求内容） |
| **社交者** | 追求人际互动 | 聊天、公会、合作 | 中（追求社交） |
| **杀手** | 追求竞争和控制 | PVP、排名、对抗 | 高（追求优势） |

### 6.3 心流理论

```
        焦虑
         │
  高难度 │    ┌─────────┐
         │    │  心流    │
         │    │  区域    │
         │    └─────────┤
  低难度 │              │
         └──────────────┘
           低技能    高技能

设计原则：
- 难度随玩家能力动态调整
- 提供清晰的目标和反馈
- 保持挑战与技能的平衡
- 避免无聊（太简单）和焦虑（太难）
```

### 6.4 变比率强化（赌博心理）

```
变比率强化 = 最强的成瘾机制

固定奖励：每10分钟给100金币 → 习惯但不兴奋
变比率奖励：随机给10-1000金币 → 持续兴奋

应用场景：
- 抽卡（随机SSR）
- 怪物掉落（随机装备）
- 宝箱（随机奖励）
- 竞技场（随机对手）

服务端实现：
- 必须服务端计算概率
- 概率必须公示
- 保底机制必须准确
```

### 6.5 损失厌恶

```
损失厌恶 = 失去100元的痛苦 > 得到100元的快乐

应用场景：
- 限时活动（"错过就没了"）
- 每日签到（"断签损失"）
- 赛季排名（"掉段恐惧"）
- 体力系统（"不用就浪费"）

服务端实现：
- 限时活动的倒计时
- 签到记录和补签机制
- 赛季结算和奖励发放
- 体力恢复和溢出处理
```

### 6.6 社交比较

```
社交比较 = 看到别人比自己强/弱时的心理反应

向上比较（比我强）：
→ 激励追赶 → 付费/肝
→ 设计：排行榜、战力对比

向下比较（比我弱）：
→ 满足感 → 继续玩
→ 设计：匹配系统（匹配相近对手）

横向比较（同级）：
→ 竞争感 → 活跃
→ 设计：公会战、竞技场
```

---

## 7. 策划与服务端的协作

### 7.1 策划需求 → 技术实现

| 策划需求 | 服务端实现 | 技术要点 |
|---------|-----------|---------|
| "玩家等级越高越难升级" | 指数经验曲线 | 公式配置化 |
| "抽卡有保底" | 保底计数器 | 服务端记录、防刷 |
| "活动有时间限制" | 定时器系统 | 精确计时、时区处理 |
| "排行榜实时更新" | Redis 排行榜 | ZSet、异步更新 |
| "公会战500人对战" | 大规模同步 | 分组同步、AOI |
| "装备强化有成功率" | 概率系统 | 服务端计算、日志 |

### 7.2 服务端开发 Checklist

```
接到策划需求时，先问这10个问题：

□ 1. 这个系统的状态需要持久化吗？
□ 2. 这个操作需要事务保证吗？
□ 3. 这个计算应该在客户端还是服务端？
□ 4. 这个功能的并发安全性如何？
□ 5. 这个系统的性能瓶颈在哪里？
□ 6. 这个功能需要跨服支持吗？
□ 7. 这个功能的反作弊策略是什么？
□ 8. 这个功能的数据量预估是多少？
□ 9. 这个功能的上线/下线方案是什么？
□ 10. 这个功能需要灰度发布吗？
```

---

## 8. 常见策划模式

### 8.1 成长设计模式

| 模式 | 说明 | 适用游戏 |
|------|------|---------|
| 等级成长 | 经验值升级 | RPG、MMO |
| 装备成长 | 强化、进阶、精炼 | RPG、卡牌 |
| 技能成长 | 技能树、天赋 | RPG、MOBA |
| 收集成长 | 图鉴、成就 | 卡牌、养成 |
| 社交成长 | 公会等级、好友 | MMO、社交 |

### 8.2 留存设计模式

| 模式 | 机制 | 心理学原理 |
|------|------|-----------|
| 每日签到 | 连续签到奖励 | 损失厌恶 |
| 每日任务 | 完成任务获奖励 | 目标驱动 |
| 体力系统 | 体力恢复、溢出 | 稀缺性 |
| 限时活动 | 倒计时、限量 | 紧迫感 |
| 赛季排名 | 排名结算、奖励 | 竞争心理 |
| 社交绑定 | 公会、好友 | 归属感 |

### 8.3 付费设计模式

| 模式 | 机制 | 适用游戏 |
|------|------|---------|
| 首充奖励 | 首次充值送好礼 | 所有游戏 |
| 月卡/通行证 | 持续付费获取奖励 | 所有游戏 |
| 限时礼包 | 限时折扣 | 手游 |
| 抽卡系统 | 随机获取角色/装备 | 卡牌、RPG |
| 赛季皮肤 | 限定外观 | MOBA、FPS |
| 战斗通行证 | 付费解锁高级奖励 | 所有游戏 |

---

## 9. 版本与活动对经济的影响

### 9.1 新内容对经济结构的冲击

每次版本更新都是一次经济体系的"地震"。新玩法、新道具、新活动都会打破原有的产出-消耗平衡，服务端需要提前做好预案。

#### 常见冲击类型

| 冲击类型 | 典型场景 | 影响范围 | 风险等级 |
|---------|---------|---------|---------|
| 新货币引入 | 活动专属代币 | 与旧货币的汇率波动 | 中 |
| 新装备体系 | 新品质/新词条 | 旧装备贬值、材料过剩 | 高 |
| 新玩法产出 | 新副本掉落 | 特定材料通胀 | 中 |
| 新消耗机制 | 新强化系统 | 金币/材料大量回收 | 低（正面） |
| 通货膨胀叠加 | 多活动同时产出 | 经济体系全面失衡 | 极高 |

#### 版本更新的经济影响评估

```go
type VersionEconomyAudit struct {
    Version      string
    NewItems     []NewItemInfo     // 新增道具
    NewSources   []ProductionSource // 新增产出途径
    NewSinks     []ConsumptionSink  // 新增消耗途径
    PredictedImpact ImpactReport
}

type ImpactReport struct {
    InflationDelta  float64  // 预计通胀变化百分比
    AffectedItems   []int    // 受影响的道具ID列表
    RiskItems       []int    // 高风险道具ID列表
    RecommendedActions []string // 建议的调整措施
}

// 版本更新前的经济影响评估
func AuditVersionImpact(db *EconomyDB, patch *VersionPatch) *ImpactReport {
    report := &ImpactReport{}

    // 1. 计算新增产出
    totalNewOutput := 0.0
    for _, source := range patch.NewSources {
        // 预估参与率 × 单次产出 × 每日频次
        estimatedDaily := source.ParticipationRate *
            float64(source.PerRunOutput) *
            float64(source.DailyRuns)
        totalNewOutput += estimatedDaily
    }

    // 2. 计算新增消耗
    totalNewSink := 0.0
    for _, sink := range patch.NewSinks {
        estimatedDaily := sink.UsageRate *
            float64(sink.PerUseCost) *
            float64(sink.DailyUses)
        totalNewSink += estimatedDaily
    }

    // 3. 评估通胀影响
    currentDailyNet := db.GetDailyNetFlow() // 当前净流量
    newNet := currentDailyNet + totalNewOutput - totalNewSink
    report.InflationDelta = (newNet - currentDailyNet) / math.Abs(currentDailyNet) * 100

    // 4. 识别高风险道具
    for _, itemID := range patch.AffectedItems {
        if db.GetItemInflationRate(itemID) > 0.2 { // 超过20%月通胀
            report.RiskItems = append(report.RiskItems, itemID)
        }
    }

    return report
}
```

### 9.2 节日活动与限时活动的经济设计

#### 活动经济的节奏控制

```
活动经济生命周期：

  投放期          高峰期          衰退期          结算期
  ├──────────────┼──────────────┼──────────────┤
  │ 逐步放量      │ 全量投放      │ 逐步减少      │ 停止产出
  │ 消耗引导      │ 消耗高峰      │ 库存清理      │ 奖励结算
  │              │              │              │
  │ Day 1-3      │ Day 4-10     │ Day 11-13    │ Day 14
  │              │              │              │
  │ 产出: 30%    │ 产出: 100%   │ 产出: 50%    │ 产出: 0%
  │ 消耗: 低     │ 消耗: 高     │ 消耗: 中     │ 消耗: 清零

关键原则：
- 活动期间总产出 ≤ 平时同期总产出的 150%
- 活动货币必须有明确的消耗出口
- 活动结束后，剩余活动货币应能兑换为常规资源
```

#### 活动经济模型

```go
type EventEconomy struct {
    EventID       string
    Duration      time.Duration
    CurrencyType  string           // 活动货币类型
    TotalBudget   int64            // 活动总预算（全服）
    PlayerBudget  int64            // 单人预算上限

    // 产出控制
    DailyOutputCap   int64         // 每日产出上限
    TotalOutputCap   int64         // 总产出上限

    // 消耗设计
    ShopItems        []EventShopItem  // 活动商店
    ExchangeRate     float64          // 活动币→常规币 汇率

    // 通胀控制
    MaxInflationRate float64          // 最大允许通胀率
}

type EventShopItem struct {
    ItemID       int
    Price        int              // 活动货币价格
    Stock        int              // 库存（-1=无限）
    LimitPerDay  int              // 每日限购
    LimitTotal   int              // 总限购
    Category     string           // 分类（核心/消耗品/装饰）
}

// 活动期间的经济监控
func (ee *EventEconomy) MonitorInflation(db *EconomyDB) *InflationAlert {
    currentInflation := db.GetCurrencyInflation(ee.CurrencyType)

    alert := &InflationAlert{
        Currency:     ee.CurrencyType,
        CurrentRate:  currentInflation,
        Threshold:    ee.MaxInflationRate,
    }

    if currentInflation > ee.MaxInflationRate {
        alert.Level = "CRITICAL"
        alert.Actions = []string{
            "降低活动货币产出",
            "增加活动商店消耗品",
            "开放限时兑换（活动币→稀有材料）",
        }
    } else if currentInflation > ee.MaxInflationRate*0.8 {
        alert.Level = "WARNING"
        alert.Actions = []string{
            "监控后续产出",
            "准备应急消耗方案",
        }
    }

    return alert
}
```

#### 投放节奏设计

| 活动类型 | 持续时间 | 产出节奏 | 消耗设计 | 通胀风险 |
|---------|---------|---------|---------|---------|
| 日常活动 | 持续 | 均匀产出 | 每日消耗 | 低 |
| 周活动 | 7天 | 前紧后松 | 阶梯消耗 | 中 |
| 节日活动 | 3-7天 | 集中爆发 | 限时商店 | 高 |
| 赛季活动 | 30天 | 线性产出 | 赛季商店 | 中 |
| 联动活动 | 7-14天 | 爆发+衰减 | 限定兑换 | 高 |

### 9.3 经济失衡的征兆与修复

#### 失衡征兆识别

```
经济失衡的早期信号：

1. 物价异常
   - 关键材料价格持续下跌 → 产出过剩
   - 关键材料价格暴涨 → 消耗不足/被垄断
   - 物价波动超过 ±30% → 市场不稳定

2. 玩家行为异常
   - 大量玩家囤积特定资源 → 预期贬值
   - 交易量骤降 → 市场信心不足
   - 退坑潮 → 经济信心崩溃

3. 系统指标异常
   - 货币总量月增 > 15% → 通胀加速
   - 消耗/产出比 < 0.6 → 严重失衡
   - 基尼系数 > 0.7 → 贫富差距过大
```

#### 修复工具箱

```go
type EconomyFixToolbox struct{}

// 工具1：紧急消耗（水龙头）
func (t *EconomyFixToolbox) EmergencySink(currency string, amount int64) {
    // 开放限时高价值兑换
    // 例如：金币兑换稀有材料，限时24小时
}

// 工具2：产出抑制（关水龙头）
func (t *EconomyFixToolbox) ReduceOutput(source string, reduction float64) {
    // 降低特定途径的产出
    // 例如：降低某个副本的金币掉落 30%
}

// 工具3：价值锚定（稳定器）
func (t *EconomyFixToolbox) AnchorPrice(itemID int, price int64) {
    // NPC商店固定价格回收
    // 例如：系统商店以固定价格收购过剩材料
}

// 工具4：市场干预（托底）
func (t *EconomyFixToolbox) MarketIntervention(itemID int, floorPrice int64) {
    // 设置交易所最低价
    // 或者系统以地板价收购
}

// 工具5：资源转换（疏导）
func (t *EconomyFixToolbox) ResourceConversion(
    fromCurrency string, toCurrency string, rate float64,
) {
    // 开放货币转换通道
    // 例如：过剩金币 → 新活动代币
}

// 工具6：通胀税（长期调控）
func (t *EconomyFixToolbox) InflationTax(currency string, threshold int64, taxRate float64) {
    // 对超过阈值的部分征收累进税
    // 例如：持有超过100万金币的部分，每日扣除1%
}
```

#### 修复优先级矩阵

| 失衡程度 | 修复策略 | 执行速度 | 副作用 |
|---------|---------|---------|-------|
| 轻微（通胀<10%） | 微调产出/消耗参数 | 快（热更新） | 低 |
| 中等（通胀10-30%） | 新增消耗途径+降低产出 | 中（版本更新） | 中 |
| 严重（通胀>30%） | 紧急回收+市场干预 | 慢（需多版本） | 高 |
| 崩溃（恶性通胀） | 货币改版/合服 | 极慢 | 极高 |

---

## 10. 链游经济设计

### 10.1 游戏内资产与链上资产的关系

链游（GameFi）将游戏经济搬到区块链上，玩家真正"拥有"游戏资产。但这带来了全新的设计挑战。

#### 资产分类与关系

```
链游资产金字塔：

          ┌─────────────────┐
          │   💎 Token      │  ← 治理/收益代币（ERC-20）
          │   (可交易价值)   │
          ├─────────────────┤
          │   🖼️ NFT        │  ← 独特游戏资产（ERC-721/1155）
          │   (唯一性+稀缺)  │
          ├─────────────────┤
          │   🎮 游戏内资产   │  ← 道具/装备/角色
          │   (使用价值)      │
          ├─────────────────┤
          │   ⚡ 游戏内货币   │  ← 金币/经验/材料
          │   (流通价值)      │
          └─────────────────┘

资产流转关系：
游戏内货币 → 消耗/产出（中心化控制）
游戏内资产 → 铸造为 NFT（上链）
NFT → 分解为游戏内资产（下链）
Token → 购买/交易 NFT（链上交易）
Token → 质押/治理（链上交互）
```

#### 双代币模型

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 游戏内代币（中心化管理）
contract GameCoin {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    // 铸造：游戏服务器调用
    function mint(address to, uint256 amount) external onlyGameServer {
        balances[to] += amount;
    }

    // 销毁：消耗时调用
    function burn(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
    }

    // 转账：游戏内交易
    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}

// 治理代币（去中心化）
contract GameToken is ERC20 {
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public stakeTimestamp;

    uint256 public totalStaked;
    uint256 public rewardRate = 100; // 每秒奖励 rate

    // 质押
    function stake(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        stakedAmount[msg.sender] += amount;
        totalStaked += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
    }

    // 计算质押收益
    function pendingReward(address user) public view returns (uint256) {
        if (stakedAmount[user] == 0) return 0;
        uint256 elapsed = block.timestamp - stakeTimestamp[user];
        return stakedAmount[user] * rewardRate * elapsed / 1e18;
    }
}
```

### 10.2 产出、销毁、锁仓与手续费

#### 经济飞轮设计

```
链游经济飞轮：

    ┌──────────────┐
    │  玩家游玩     │
    │  (获得奖励)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  产出 Token   │──────→ 💰 流通增加
    │  /NFT         │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  二级市场交易  │──────→ 📈 价格上涨
    │  (OpenSea等)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  质押/锁仓    │──────→ 🔒 流通减少
    │  (获取收益)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  消耗/销毁    │──────→ 🔥 供应减少
    │  (游戏内消耗)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  更多玩家加入  │──────→ 📊 需求增加
    └──────────────┘
```

#### 销毁机制设计

```go
type BurnMechanism struct {
    // 游戏内消耗 → 销毁 Token
    UpgradeCost struct {
        ItemID    int
        TokenBurn int64   // 升级消耗并销毁的Token数量
    }

    // 交易手续费 → 销毁
    TradeFeeRate    float64  // 交易手续费率
    BurnRatio       float64  // 手续费中销毁的比例（其余归国库）

    // NFT 合成/升级 → 销毁
    SynthesisCost   int64    // 合成消耗的Token

    // 赛季结算 → 销毁
    SeasonEndBurn   float64  // 赛季结束时销毁未使用Token的比例
}

// 交易手续费处理
func ProcessTradeFee(trade *Trade, feeRate float64, burnRatio float64) {
    fee := int64(float64(trade.Price) * feeRate)
    burnAmount := int64(float64(fee) * burnRatio)
    treasuryAmount := fee - burnAmount

    // 销毁手续费
    Token.Burn(burnAmount)

    // 归入国库
    Treasury.Deposit(treasuryAmount)
}

// 质押锁仓减少流通
type StakingPool struct {
    TotalStaked     uint256
    LockPeriod      time.Duration  // 锁仓期限
    APR             float64        // 年化收益率
    EarlyWithdraw   float64        // 提前退出惩罚比例
}

// 锁仓设计：
// - 短期锁仓（7天）：低收益，随时可退
// - 中期锁仓（30天）：中等收益
// - 长期锁仓（90天）：高收益，提前退出扣30%
```

### 10.3 二级市场与游戏内经济联动

#### 联动设计原则

```
二级市场与游戏经济的耦合度：

  松耦合（推荐）          紧耦合（高风险）
  ├─ 游戏内产出不直接     ├─ 游戏内产出直接
  │  影响市场价格         │  影响市场价格
  ├─ 交易有冷却期         ├─ 交易无限制
  ├─ 部分道具不可交易     ├─ 所有道具可交易
  └─ 服务端控制铸币       └─ 合约控制铸币

松耦合优势：
- 游戏经济波动不会立即传导到链上
- 可以通过游戏内调整缓冲市场冲击
- 降低被操纵的风险

紧耦合优势：
- 玩家资产自由度更高
- 市场定价更有效
- 去中心化程度更高
```

#### 交易保护机制

```solidity
// NFT 交易合约
contract NFTMarketplace {
    // 交易冷却期
    mapping(uint256 => uint256) public lastTradeTime;
    uint256 public constant TRADE_COOLDOWN = 1 hours;

    // 价格保护
    uint256 public constant MAX_PRICE_MULTIPLIER = 3; // 最高3倍市价
    uint256 public constant MIN_PRICE_MULTIPLIER = 0.3; // 最低3折

    // 每日交易次数限制
    mapping(address => uint256) public dailyTradeCount;
    mapping(address => uint256) public lastTradeDay;
    uint256 public constant MAX_DAILY_TRADES = 10;

    function list(uint256 tokenId, uint256 price) external {
        require(block.timestamp - lastTradeTime[tokenId] > TRADE_COOLDOWN,
            "Trade cooldown not met");

        require(dailyTradeCount[msg.sender] < MAX_DAILY_TRADES,
            "Daily trade limit reached");

        // 价格合理性检查
        uint256 avgPrice = getFloorPrice(tokenId);
        require(price <= avgPrice * MAX_PRICE_MULTIPLIER,
            "Price too high");
        require(price >= avgPrice * MIN_PRICE_MULTIPLIER,
            "Price too low");

        // 上架...
    }

    // 手续费 = 交易额 × 5%
    // 其中 3% 销毁，2% 归国库
    function executeTrade(uint256 tokenId, address buyer) external payable {
        uint256 price = listings[tokenId].price;
        require(msg.value >= price, "Insufficient payment");

        uint256 fee = price * 5 / 100;
        uint256 burnAmount = fee * 3 / 5;
        uint256 treasuryAmount = fee - burnAmount;

        // 销毁
        token.burn(burnAmount);
        // 归国库
        treasury.deposit{value: treasuryAmount}();
        // 卖家收款
        payable(listings[tokenId].seller).transfer(price - fee);
    }
}
```

### 10.4 防刷、防套利与防工作室

#### 风控体系

```
链游风控金字塔：

        ┌─────────────┐
        │  🔒 合约层   │  智能合约安全审计
        │  防重入/防溢出 │
        ├─────────────┤
        │  🛡️ 业务层   │  交易限制/冷却期/限额
        │  防刷/防套利  │
        ├─────────────┤
        │  📊 数据层   │  行为分析/异常检测
        │  防工作室/防bot│
        ├─────────────┤
        │  🔍 监控层   │  实时告警/链上追踪
        │  反洗钱/KYC   │
        └─────────────┘
```

#### 防刷策略

```go
type AntiCheat struct {
    // 每日收益上限
    DailyIncomeCap    map[string]int64  // 不同道具的每日上限

    // 行为特征检测
    BehaviorAnalyzer  *BehaviorAnalyzer

    // 设备指纹
    DeviceFingerprint *DeviceFingerprint
}

type BehaviorAnalyzer struct {
    // 检测维度
    Metrics struct {
        ActionsPerMinute   float64  // 每分钟操作次数
        SessionDuration    float64  // 平均会话时长
        SleepPattern       []time.Time  // 作息时间
        InputConsistency   float64  // 输入一致性（bot特征）
        ProfitPattern      float64  // 收益模式规律性
    }

    // 异常判定
    IsSuspicious(playerID string) bool {
        metrics := GetPlayerMetrics(playerID)

        // Bot特征：操作间隔极其规律
        if metrics.InputConsistency > 0.95 {
            return true
        }

        // 工作室特征：24小时在线 + 高收益
        if metrics.SessionDuration > 20 && metrics.DailyProfit > threshold {
            return true
        }

        // 脚本特征：操作频率异常
        if metrics.ActionsPerMinute > 300 {
            return true
        }

        return false
    }
}
```

#### 防套利机制

```
常见套利攻击与防御：

1. 交易所搬砖
   攻击：在游戏内低价买入，链上高价卖出
   防御：
   - 交易冷却期（上架后1小时才能成交）
   - 价格区间限制（上下浮动不超过3倍）
   - 大额交易人工审核

2. 多账号刷取
   攻击：大量账号刷取奖励后汇总
   防御：
   - 设备指纹检测
   - IP/设备关联分析
   - 行为模式聚类
   - 收益递减机制

3. 价格操纵
   攻击：大量买入拉高价格后抛售
   防御：
   - 交易量限制
   - 价格熔断机制
   - 大额交易通知

4. 合约漏洞利用
   攻击：利用智能合约逻辑漏洞
   防御：
   - 合约审计
   - 权限控制
   - 时间锁
   - 紧急暂停机制
```

### 10.5 可玩性与可盈利性的平衡

#### 设计原则

```
Play-to-Earn vs Play-and-Earn：

Play-to-Earn（P2E）               Play-and-Earn（P&E）
├─ 以赚钱为主要动力                ├─ 以游戏乐趣为主要动力
├─ 经济收益 > 游戏体验            ├─ 游戏体验 ≥ 经济收益
├─ 新玩家需要投入才能回本          ├─ 新玩家可以免费体验
├─ 容易形成死亡螺旋               ├─ 经济模型更可持续
└─ Axie Infinity 模式              └─ 传统游戏+链上资产

最佳实践：
├─ 核心玩法免费
├─ 经济收益是额外奖励，不是主要动力
├─ 付费玩家体验更好，但不付费也能玩
├─ 社交/竞争 > 纯经济激励
└─ 定期调整经济参数保持平衡
```

#### 经济可持续性设计

```go
type SustainableEconomy struct {
    // 基础收益（免费玩家也能获得）
    BaseReward float64

    // 效率收益（付费/高级玩家获得更多）
    EfficiencyBonus float64  // 最高 +50%

    // 收益递减
    DiminishingReturns struct {
        Threshold float64  // 达到阈值后收益递减
        Rate      float64  // 递减速率
        Floor     float64  // 最低收益（不能低于此值）
    }

    // 价值锚定
    ValueAnchors struct {
        MinPlayTime    time.Duration  // 每日最少游玩时间
        MaxPlayTime    time.Duration  // 每日最多游玩时间（防沉迷）
        RewardPerHour  float64        // 每小时基础收益
    }
}

// 收益计算（含递减）
func (se *SustainableEconomy) CalcReward(playTime time.Duration, isPremium bool) float64 {
    base := float64(playTime.Minutes()) / 60.0 * se.ValueAnchors.RewardPerHour

    // 效率加成
    if isPremium {
        base *= (1.0 + se.EfficiencyBonus)
    }

    // 收益递减
    if base > se.DiminishingReturns.Threshold {
        excess := base - se.DiminishingReturns.Threshold
        base = se.DiminishingReturns.Threshold +
            excess*se.DiminishingReturns.Rate
    }

    // 最低收益保障
    if base < se.DiminishingReturns.Floor {
        base = se.DiminishingReturns.Floor
    }

    return base
}
```

### 10.6 经济崩盘与死亡螺旋

#### 死亡螺旋形成过程

```
死亡螺旋（Death Spiral）：

  新玩家涌入 ──→ Token价格上涨
       │              │
       │              ▼
       │         老玩家获得高收益
       │              │
       │              ▼
       │         大量抛售 Token
       │              │
       │              ▼
       ▼         Token价格下跌
  新玩家减少 ←──── 回报率下降
       │              │
       │              ▼
       │         更多玩家离开
       │              │
       │              ▼
       ▼         恐慌性抛售
  经济崩盘 ←──── Token归零

触发条件：
1. 产出远大于消耗（通胀失控）
2. 新玩家增长停滞（无外部资金）
3. 老玩家集中抛售（信心崩溃）
4. 市场操纵/恐慌蔓延
```

#### 流动性枯竭

```
流动性枯竭的信号：

早期信号：
- 交易量持续下降
- 买卖价差扩大
- 挂单深度变浅
- 大额交易无法成交

中期信号：
- 价格大幅波动
- 项目方频繁调整参数
- 社区信心下降
- 媒体负面报道

晚期信号：
- 价格持续阴跌
- 交易量接近零
- 社区沉默/分裂
- 开发团队解散

预防措施：
├─ 流动性池设计（AMM 自动做市）
├─ 回购机制（项目方回购稳定价格）
├─ 限售机制（防止集中抛售）
├─ 梯度解锁（锁仓代币逐步释放）
└─ 应急基金（应对极端情况）
```

#### 经济崩盘的常见原因

| 原因 | 机制 | 案例 | 预防措施 |
|-----|------|------|---------|
| 无限铸币 | 没有产出上限 | Axie SLP | 设置每日/总量上限 |
| 消耗不足 | 只有产出没有消耗 | 多数P2E | 设计多元消耗途径 |
| 外部依赖 | 需要持续新玩家 | Ponzi模型 | 内生价值创造 |
| 过度中心化 | 项目方控制一切 | 部分GameFi | 去中心化治理 |
| 黑客攻击 | 合约漏洞被利用 | Ronin桥 | 安全审计+保险 |
| 市场操纵 | 大户控盘 | 拉高出货 | 限售+监控 |

#### 应急响应机制

```go
type EmergencyResponse struct {
    // 自动触发条件
    Triggers struct {
        PriceDropThreshold float64  // 价格跌幅阈值（如 24h 跌 30%）
        VolumeDropThreshold float64  // 交易量跌幅阈值
        OutflowThreshold   float64  // 大额流出阈值
    }

    // 应急措施
    Responses []EmergencyAction
}

type EmergencyAction struct {
    Level     int          // 1-5 级别
    Name      string
    Execute   func()
    Auto      bool         // 是否自动执行
}

func NewEmergencyResponse() *EmergencyResponse {
    er := &EmergencyResponse{}
    er.Triggers.PriceDropThreshold = 0.3   // 24h 跌 30%
    er.Triggers.VolumeDropThreshold = 0.5  // 交易量跌 50%
    er.Triggers.OutflowThreshold = 100000  // 单笔流出 10万

    er.Responses = []EmergencyAction{
        {
            Level: 1,
            Name:  "降低产出",
            Execute: func() {
                // 降低 Token 产出速率 20%
            },
            Auto: true,
        },
        {
            Level: 2,
            Name:  "增加消耗",
            Execute: func() {
                // 开放限时高价值消耗活动
            },
            Auto: true,
        },
        {
            Level: 3,
            Name:  "回购销毁",
            Execute: func() {
                // 使用国库资金回购并销毁 Token
            },
            Auto: false, // 需要人工确认
        },
        {
            Level: 4,
            Name:  "交易限制",
            Execute: func() {
                // 暂停大额交易，增加冷却期
            },
            Auto: false,
        },
        {
            Level: 5,
            Name:  "紧急暂停",
            Execute: func() {
                // 暂停所有链上交易
                // 启动应急预案
            },
            Auto: false,
        },
    }

    return er
}
```

---

## 下一步

1. 理解伤害公式和属性系统
2. 掌握概率系统和保底机制
3. 理解经济系统的产出-消耗平衡
4. 学习玩家心理学在设计中的应用
