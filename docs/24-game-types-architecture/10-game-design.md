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

## 下一步

1. 理解伤害公式和属性系统
2. 掌握概率系统和保底机制
3. 理解经济系统的产出-消耗平衡
4. 学习玩家心理学在设计中的应用
