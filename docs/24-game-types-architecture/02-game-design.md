# 02 Numerical Design and Economy Systems

> From a server-side implementation perspective, I record the parts of numerical design and economy systems that most affect engineering: the technical risks exposed during requirement review, the data structures and computation pipelines that system design must absorb, and the data that post-launch troubleshooting depends on.
>
> **Reference books**: the core concepts in this chapter reference the game loop and state patterns in *Game Programming Patterns* (Robert Nystrom), the numerical system design chapters in *Game Server Architecture and Optimization*, and the economy balancing practice in *Million Online*.
>
> **Related records**: the three-layer attribute architecture maps to the computation pipeline, the pity state machine maps to persistence fields, and currency transaction logs map to ledger table design; see Chapters 8, 10, and 17 for data storage, the trading system, and the config pipeline respectively.

---

## 1. Why the Server Side Needs to Understand Designers

Many server-side developers think "designers' business has nothing to do with me" — a dangerous misconception. Every designer decision — XP curves, gacha probabilities, event timing — eventually becomes data structures and computation logic you have to handle. If you do not understand why the designer designed it that way, you cannot judge whether a requirement is reasonable or carries technical risk.

Take a real case: the numerical designer of a card mobile game designed an "equipment enhancement probability decay" system — each enhancement's success rate steps down from 80% to 5%, but failed enhancement does not destroy the equipment. Players discovered that through repeated failure + retry they could max out equipment with a small amount of materials. The numerical designer believed "the probability is already very low", but if the server side had understood the mathematical nature of the probability system, it could have raised the alarm in advance: **when the expected cost of retrying falls below direct purchase, this system becomes a disguised discount shop**. Problems in probability design cannot be judged by "the probability looks low"; they can only be answered by expected value calculation.

Server-side developers need to understand designers' mental framework to achieve this: **spot technical risks at the requirement review stage, instead of being exploited by players through loopholes after launch.**

### 1.1 Designers' Responsibilities and Collaboration

| Designer Type | Core Work | Relationship with the Server Side | What the Server Side Should Watch |
|---------|---------|--------------|------------------|
| System designers | Design game systems (inventory, guild, mail) | Interface design, data structures | Whether the data model is extensible, concurrency safety |
| Numerical designers | Design numerical formulas (damage, attributes, economy) | Computation logic, config tables | Whether formulas risk overflow, whether configs support hot updates |
| Level designers | Design level content (dungeons, maps) | Level configs, monster spawning | Level data volume, loading strategy |
| Combat designers | Design combat systems (skills, AI, balance) | Combat logic, sync solution | Whether computation load is controllable, whether frame sync is needed |
| Operations designers | Design events and operational strategy | Event system, reward distribution | Event data isolation, concurrent distribution safety |

**Key understanding**: the server side is not the designers' "tool man" but their "technical advisor". When you find a design technically infeasible or risky, consider raising it proactively, rather than silently implementing it and cleaning up the mess after launch.

### 1.2 Four Technical Questions When Taking a Numerical Requirement

During numerical requirement review, the server side can quickly locate technical risks with four questions:

1. **Where is this formula computed?** — Computing on the client is a backdoor for cheating; computing on the server means considering performance and hot updates (Section 2.4)
2. **Does this randomness need to be reproducible?** — If replay/arbitration/cross-client consistency is involved, you need deterministic randomness (Section 3.3)
3. **Where is this counter stored?** — Count-based state like pity, check-in, and purchase limits is an asset, persisted on the server (Section 4.3)
4. **Should this numerical change leave a trail?** — Changes involving currency and assets go transaction-log-first (Section 6.3)

---

## 2. The Attribute System: The Foundation of Numerical Calculation

The attribute system is the foundation of all RPG-type games. Understanding the layering of attribute calculation is crucial for designing sound server-side data structures.

### 2.1 The Three-Layer Architecture of Attribute Calculation

Game attribute calculation is usually split into three layers, from inner to outer: **base attributes → percentage bonuses → flat bonuses**. This order matters enormously, because different orders of calculation lead to completely different results.

**Base attributes** come from character level and growth values — the foundation "fixed at birth". **Percentage bonuses** come from equipment, buffs, passive skills, and so on; they amplify base attributes. **Flat bonuses** are the "add-on values" stacked at the end, such as "attack +50".

Why does this order matter? Because it directly affects the speed of numerical inflation. If the percentage and flat orders are reversed (add the flat value first, then amplify), flat bonuses also get amplified by the percentage, and the gap between high-level and low-level players accelerates, causing balance to spiral out of control. *Game Server Architecture and Optimization* emphasizes in particular: **attribute calculation formulas must execute on the server; the client only presents — otherwise you leave a backdoor for cheats.**

| Attribute | Description | Typical Formula |
|------|------|---------|
| HP | Survivability | (base + growth × level) × (1 + percentage bonus) + flat bonus |
| ATK | Damage output | (base + growth × level + equipment base) × (1 + percentage bonus) |
| DEF | Damage reduction | Same as above, affecting the damage-reduction part of the damage formula |
| SPD | Action order | base + buff bonus, usually excluded from percentage calculation |
| CRIT | Critical chance | base + equipment bonus, usually with a cap (e.g. 75%) |

### 2.2 Additive Zone and Multiplicative Zone: Rules for Merging Multiple Sources

When one attribute has multiple bonus sources (equipment A +20%, buff B +30%, guild tech +10%), the merging rule is an explicit designer decision and the server just follows it, but you need to understand how the two rules differ in game feel:

- **Additive zone**: `(1 + 20% + 30% + 10%) = 1.6`. More sources yield more linear returns; designers can easily predict totals
- **Multiplicative zone**: `(1 + 20%) × (1 + 30%) × (1 + 10%) = 1.716`. Marginally increasing returns naturally encourage stacking same-type sources

Damage-reduction attributes almost always merge in a multiplicative zone: multiple reduction sources `(1-20%) × (1-30%)` can never stack reduction past 100%, while additive merging could stack out a "total immunity" loophole. **Do not take it upon yourself to unify everything into one rule when implementing on the server** — using different merge zones for different sources of the same attribute ("critical damage goes additive, all-damage amplification goes multiplicative") is common practice, and each source in the config table needs a "zone" field.

### 2.3 Server-Side Implementation: The Attribute Recalculation Pipeline

The complete value of an attribute does not need recalculating on every access — recalculation happens only when "sources change" (level up, equipping, buff applied/expiring). The standard approach is **dirty flag + lazy recalculation**:

```go
type Character struct {
    base       BaseStats    // 等级成长 + 装备基础
    modifiers  []Modifier   // 所有加成来源：装备、buff、被动、科技
    final      FinalStats   // 重算结果缓存
    dirty      bool         // 任一来源变化时置位
}

// 来源变化时只做一件事：打脏标记
func (c *Character) OnBuffAdded(m Modifier) {
    c.modifiers = append(c.modifiers, m)
    c.dirty = true
}

// 访问最终属性时，脏了才重算
func (c *Character) Stats() FinalStats {
    if c.dirty {
        c.recalc()
        c.dirty = false
    }
    return c.final
}

// 重算管线：整数运算，万分比
func (c *Character) recalc() {
    var pctAtk, flatAtk int64
    for _, m := range c.modifiers {
        if m.Attr != AttrATK {
            continue
        }
        switch m.Zone {
        case ZonePercent:
            pctAtk += m.Value // 万分比，如 2000 = +20%
        case ZoneFlat:
            flatAtk += m.Value
        }
    }
    base := c.base.ATK
    c.final.ATK = (base*(10000+pctAtk))/10000 + flatAtk // 先百分比后固定
}
```

Three implementation disciplines: **integer arithmetic throughout** (basis points of 1/10000, avoiding floating-point accumulation error), **recalculation completes inside the logic thread** (consistent with the single-writer principle in Chapter 5; the modifiers list needs no lock), and **application and expiry of layered sources are driven by a unified buff/timer system** (instead of each piece of code modifying modifiers on its own).

### 2.4 Why Numerical Values Must Be Computed on the Server

A common mistake is letting the client compute attribute values while the server merely "records" the result. This looks convenient but has severe consequences:

1. **Cheating risk**: the client can forge any attribute value, and you cannot verify it
2. **Data inconsistency**: different client versions may compute different results
3. **Difficult hot updates**: changing a formula requires a client update

The right approach: **the client is only responsible for presentation; the server is responsible for computation and validation.** The client may cache computed results for local display, but all attribute values involved in game logic must come from the server.

---

## 3. Damage Formulas: The Core of Designer Design

Damage formulas determine the feel and balance of the combat system. Different game types use completely different damage models; understanding these models helps you design a sound combat service.

### 3.1 Four Mainstream Damage Models

**Model one: simple subtraction** (suitable for casual games). Damage = ATK - DEF/2, minimum 1. The advantage is simplicity and intuitiveness; the disadvantage is that defense returns are linear — at high levels defense is either useless (ATK far exceeds DEF) or overpowered (defense approaches twice the ATK).

**Model two: percentage reduction** (suitable for card games). Damage = ATK × (1 - DEF/(DEF+K)). Here K is a constant that determines the "saturation point" of defense. When defense equals K, damage reduction is 50%. This model gives defense diminishing returns, which is more reasonable.

**Model three: multiplicative reduction** (suitable for MMOs). On top of percentage reduction, stack multiple reduction sources (equipment reduction, buff reduction, passive reduction), merged multiplicatively rather than additively, avoiding reduction rates over 100% (see Section 2.2).

**Model four: multi-multiplier pipeline**. This is the model used by most commercial games:

```text
伤害计算流水线：

  攻击力 × 技能倍率 → 基础伤害
       ↓
  基础伤害 × (1 - 防御减伤率) → 减伤后伤害
       ↓
  减伤后伤害 × 暴击倍率 → 暴击后伤害
       ↓
  暴击后伤害 × 元素/阵营克制倍率 → 克制后伤害
       ↓
  克制后伤害 × (1 ± 随机浮动) → 最终伤害
```

The value of the multi-multiplier design is that **designers can tune each multiplier independently** — when nerfing a class, adjust the counter multiplier without touching skill multipliers; when releasing a limited-time buff, touch only a specific multiplier. The server-side implementation must preserve this structure: the damage calculation function receives a "multiplier parameter pack" instead of kneading all coefficients into a single formula.

### 3.2 Server-Side Implementation Points

Damage calculation looks simple, but there are several pitfalls to mind when implementing on the server:

1. **Floating-point precision**: do not use floating-point for final damage values. Floating-point arithmetic has precision error that can misjudge "1 damage" versus "0 damage". In practice, integer arithmetic throughout (basis points) is recommended, for example:

```go
const RATE = 10000 // 万分比

func calcDamage(p DamageParams) int64 {
    dmg := p.ATK * p.SkillRate / RATE          // 基础伤害
    dmg = dmg * (RATE - p.DefReduce) / RATE    // 防御减伤（万分比）
    if p.IsCrit {
        dmg = dmg * p.CritDamage / RATE        // 暴击倍率（万分比）
    }
    dmg = dmg * (RATE*2 - randRange(p.Min, p.Max)) / (RATE * 2) // 浮动
    if dmg > p.Target.HP*15/100 {              // 伤害封顶：单次 ≤15% 最大生命
        dmg = p.Target.HP * 15 / 100
    }
    if dmg < 1 {
        dmg = 1                                 // 保底 1 点
    }
    return dmg
}
```

2. **Randomness and determinism**: normal gameplay can use a global random source; frame sync or gameplay needing replay/arbitration needs an independent deterministic random source per battle (see Section 3.3)

3. **Damage overflow**: when ATK and skill multipliers are both high, `ATK × SkillRate` may exceed int32. In Go compute in int64 then clamp; in C++ watch the integer promotion rules

4. **Damage caps**: designers usually require "single-hit damage no more than X% of max HP"; this limit must be implemented on the server — it serves both numerical safety and presentation experience (preventing one-shot screen-shaking hits)

### 3.3 Deterministic Randomness: Seed Management and Replay

Whenever battle results must be consistent across clients (frame sync) or re-enacted later (replay, arbitration, offline simulation), randomness needs to be **deterministic**: the same seed sequence produces the same number sequence.

The standard server-side approach:

```go
// 每场战斗独立的随机源（创建战斗时调用）
func newBattle(seedA, seedB uint64, frameInputs []FrameInput, logicVersion string) *Battle {
    battle := &Battle{
        rng:    rand.New(rand.NewPCG(seedA, seedB)), // 独立源，不用全局
        seedA:  seedA,   // seed 由服务器生成：matchID ^ 时间戳等
        seedB:  seedB,
    }
    // 战斗日志里记录种子——回放/裁决时重建完全相同的随机序列
    battleLog := BattleLog{
        Seed:    [2]uint64{seedA, seedB},
        Inputs:  frameInputs, // 帧输入序列（完整、有序、可重放）
        Version: logicVersion, // 数值配置版本，回放必须用当时的配置
    }
    _ = battleLog // 演示代码里仅用于说明；真实代码写入持久层
    return battle
}
```

Three disciplines: **all randomness inside a battle goes through this source** (never mix in `math/rand` global functions or timestamps); **numerical configs carry version numbers** (replays use the config tables of that time, otherwise one numerical adjustment distorts all old replays); **seeds go into the battle log** (this is the foundation of the "server arbitration" capability). This and the determinism requirements of frame sync (the "Sync, Combat, and Real-Time Interaction" chapter of the knowledge base) are two sides of the same coin.

---

## 4. Probability Systems: The Most Player-Sensitive Area

Probability systems are the area most likely to trigger player complaints in games. Chinese law requires gacha probabilities to be published, and the server-side implementation must withstand audit.

### 4.1 Types of Probability and Psychological Effects

| Probability Type | Description | Psychological Effect | Typical Application |
|---------|------|---------|---------|
| Fixed probability | Same probability each time | Clear expected value | 1% SSR rate per pull |
| Pity probability | Guaranteed at threshold | Reduces frustration | Guaranteed within 90 pulls |
| Dynamic probability | Probability changes with count | Growing excitement | Soft pity mechanism |
| Conditional probability | Triggers only when conditions met | Adds strategy | Critical hits, combo hits |

### 4.2 Choosing a Random Source: Independent per Player, Auditable

Asset-related probability like gacha has three requirements for the random source:

1. **No globally shared source**: the global functions of `math/rand` have lock contention across goroutines, and any code consuming random numbers shifts every other player's sequence — an independent source per player/per draw (e.g. PCG) is cleaner
2. **Unpredictable seeds**: a `time.Now()` second-level timestamp as seed can be brute-forced — generate seeds from a crypto-grade entropy source and record them, instead of letting players compute them
3. **Traceable results**: every pull leaves a log (who, which pool, which pull number, random value, result) — this is the evidence chain for handling complaints and regulatory review

### 4.3 Implementing the Pity Mechanism as a State Machine

There are two kinds of pity: **hard pity** (guaranteed drop at a threshold count) and **soft pity** (probability steps up after a threshold count). Take a common mobile-game banner as an example — base 0.6%, +6% per pull starting from pull 74, hard pity at 90 pulls, counter resets after a gold drop, and if the UP item is missed the next one is guaranteed (grand pity):

```go
type PityState struct {
    Count      int  // 距上次出金的抽数（持久化字段）
    Guaranteed bool // 大保底：上次 UP 未中（持久化字段）
}

type GachaPool struct {
    BaseRate  float64 // 0.006
    SoftStart int     // 74
    SoftStep  float64 // 0.06
    HardPity  int     // 90
}

func (p *GachaPool) Roll(state *PityState, rng rand.Source) RollResult {
    state.Count++
    rate := p.BaseRate
    if state.Count >= p.SoftStart {
        rate += float64(state.Count-p.SoftStart+1) * p.SoftStep
    }
    if state.Count >= p.HardPity {
        rate = 1.0
    }
    fiveStar := rand.New(rng).Float64() < rate
    if fiveStar {
        state.Count = 0
    }
    // Guaranteed 的翻转在 UP 判定处进行，此处从略
    return RollResult{FiveStar: fiveStar, Rate: rate}
}
```

Key implementation points: **`Count` and `Guaranteed` are asset-grade state** — they must be persisted in the same transaction as the gacha pull, and pull counts reported by the client must never be trusted (a cheat forging pull counts can directly "skip" pity); **pool-switch rules must be explicit** (whether the count carries over or resets when the banner rotates is a designer decision, but the server must handle it explicitly rather than implicitly carrying on); **probability curve parameters go into config tables** instead of being hard-coded, hot-updated together with the probability disclosure page.

### 4.4 Probability Audit: Every Pull Leaves a Trail

```json
{
  "uid": 10086,
  "pool_id": "pool_2026spring",
  "pull_seq": 37,
  "pity_count_before": 36,
  "rate_at_pull": 0.066,
  "random_value": 0.041923,
  "result_item": 90321,
  "is_guarantee": false,
  "server_time": "2026-09-22T12:00:00+08:00",
  "logic_version": "3.2.1"
}
```

This log serves three needs at once: **re-enacting** a single pull when a player complains (the `random_value` is generated by the server and then written; it is not negotiable by the player); operations checking **actual drop rates vs published probability** (large-sample deviation must be discoverable — real bugs are usually misconfiguration, not "unfair" random numbers); and providing a **probability implementation description** for regulatory review.

### 4.5 Legal Requirements for Probability Disclosure

Per China's *Interim Measures for the Administration of Online Games* and the *Notice on Regulating Online Game Operations and Strengthening In-Process and After-The-Fact Supervision*, gacha probabilities must be published:

1. Base probability of each rarity tier
2. Detailed explanation of the pity mechanism
3. Extra probabilities of probability-boost events
4. Explanation of random seeds for probability calculation (optional)

**The server side must achieve**: probability computed on the server, probability results logged and traceable, pity counts accurate and impossible to farm.

---

## 5. The Drop System: The Art of Randomness

The drop system is the concrete application of probability systems. A good drop system should make players feel "effort pays off" rather than "pure luck".

### 5.1 Choosing Drop Types

| Drop Type | Description | Applicable Scenario | Player Psychology |
|---------|------|---------|--------|
| Fixed drop | Always drops | Coins, XP | Sense of stability |
| Random drop | Drops with probability | Equipment, materials | Sense of anticipation |
| First-clear reward | Extra on first clear | Rare items | Sense of achievement |
| Pity drop | Guaranteed within N | Rare equipment | Sense of security |

### 5.2 Implementing the Weighted Wheel

Weighted drops are the most common random drop implementation. Each item gets a weight; drop rate = item weight / total weight. The implementation uses **prefix sums + binary search**, staying efficient even with thousands of items:

```go
type DropTable struct {
    items    []DropItem
    prefix   []int64 // 前缀和
    total    int64
}

func (t *DropTable) Roll(rng rand.Source) int {
    r := rand.New(rng).Int63n(t.total)
    // 二分找第一个 prefix > r 的位置
    return sort.Search(len(t.prefix), func(i int) bool {
        return t.prefix[i] > r
    })
}
```

The designer-friendly side: change an item's weight from 100 to 50 and its drop rate visually halves — no percentage conversion needed.

### 5.3 The Dilution Trap and Split-Pool Design

The weight scheme has a hidden trap: **adding common items dilutes the actual probability of rare items**. The designer wants SSR to keep a 1% weight; later 50 R-grade items are added one after another, and the SSR's weight share slides from 1% to 0.7% — nobody "changed" its probability at all.

The engineering solution is **split pools**: SSR gets its own pool (fixed 1% first decides whether you enter the pool), and once in the pool, weights decide which SSR; R-grade gets another pool. Pools do not dilute each other, so designers tuning the R pool do not affect the SSR rate. The split-pool structure is also the natural unit for probability disclosure — each pool publishes one probability, mapping one-to-one to the implementation.

Supporting tool: a **probability verification script** wired into CI that, on every drop table change, automatically recomputes each item's final probability (including split pools) and compares it against the designer's expected probability, blocking merges when deviation exceeds a threshold. The detailed pipeline for this kind of mistake-proofing is in Appendix A3.

---

## 6. The Economy System: The Game's Lifeline

The economy system determines a game's long-term vitality. A well-designed economy can run a game for years; a bad one can crash the game within months.

### 6.1 Currency System Design Principles

Game currency systems usually form a pyramid: the top is paid currency (diamonds), the middle is game currency (gold), the bottom is event currency (tokens). Design principles:

- **No more than 3-4 currency types**: too many confuse players, too few constrain design space
- **Each currency has clear sources/sinks**: no currency should be "all-purpose"
- **Paid currency and game currency cannot convert in reverse**: otherwise willingness to pay suffers

### 6.2 A Mathematical Model of Source-Sink Balance

The core formula of economic balance is: **daily net flow = total sources - total sinks**. This value should be slightly above zero (giving players a "profit" feeling), but not too large (inflation), nor below zero (deflation, players feel "poorer the more they play").

A simple monitoring model checks each currency's "sink/source ratio": a value between 0.8 and 1.2 is healthy. Below 0.8 means over-production (inflation risk); above 1.2 means under-consumption (players hoarding; the later release will cause shocks).

### 6.3 Server-Side Implementation: Currency Transaction Logs First

Currency is the most important asset in a game, and the discipline of its implementation deserves more investment than the formulas. Core principle: **for every currency change, write the transaction log first, then update the balance**:

```go
type CurrencyLog struct {
    ID        uint64    // 全局唯一（雪花ID），幂等键
    PlayerID  uint64
    Currency  uint8     // 货币类型：1=钻石 2=金币 3=活动代币...
    Delta     int64     // 变化量：正为产出，负为消耗
    Balance   int64     // 变更后余额快照（对账锚点）
    Reason    uint16    // 原因枚举：1=副本奖励 2=商店购买 3=GM补发...
    RefID     string    // 关联单号（订单号/活动ID/副本ID），幂等去重键
    CreatedAt time.Time
}
```

This table structure carries four key capabilities:

- **Idempotency**: `RefID` with a unique index; duplicate requests with the same order number are rejected outright — network retries and duplicate message delivery cannot cause duplicate grants
- **Reconciliation**: balance at any moment = initial balance + accumulated transaction logs; the `Balance` snapshot field lets incremental reconciliation proceed in segments, with an alarm on any mismatch
- **Audit**: GM re-issues and refund clawbacks all have logs to check; customer dispute arbitration has evidence
- **Statistics**: the source/sink ratio in Section 6.2 needs no separate event tracking — **aggregating transaction logs by Reason + Delta sign is the authoritative economic data**, more accurate than client-side event tracking (client tracking suffers weak-network packet loss and script pollution)

Concurrency discipline: currency changes for the same player must be serialized (single-writer context or row lock); cross-player trades go two-phase (freeze first, then transfer). These distributed details are in the trading system in Chapter 10.

### 6.4 Early Signals of Inflation

Waiting until inflation shows (soaring prices) is too late. Signals visible earlier in the transaction logs:

- **Sink/source ratio trending down**: a currency's sink/source ratio below 0.8 for two consecutive weeks
- **Top-end concentration rising**: the currency share held by the top 1% of players rising fast — possibly farmers entering
- **Hoarding inflection**: per-capita holdings rising while sink participation stays flat — players are "saving up for something"; sink content supply is insufficient

### 6.5 Four Weapons of Inflation Control

| Control Means | Principle | Applicable Scenario | Side Effects |
|---------|------|---------|--------|
| Source control | Daily production caps | All games | Affects player experience |
| Sink design | Escalating equipment enhancement costs | RPG/MMO | High newbie barrier |
| Recycling mechanisms | Equipment salvaging, item recycling | Games with equipment systems | Recycling value needs design |
| Value anchoring | Fixed prices for key items | Games with exchanges | Restricts freedom |

**A real case**: six months after an MMO launched, gold inflation reached 300%; the price of an ordinary weapon went from 1,000 gold to 30,000 gold. The cause was that designers had created too many gold sources (dailies, dungeons, events) while the only sink was equipment enhancement (and its cost did not grow fast enough at high levels). The final solution was introducing a "gold tax" — a 10% transaction fee — plus a limited-time "gold-for-materials" event. This case shows: **the economy system needs its mathematical model validated before launch, not fixed after problems appear.**

---

## 7. Economy, Balance, and Risk Control: Three Sides of One System

Economic analysis, numerical balancing, and risk-control analysis often belong to different roles: designers watch balance, operations watch revenue, the security team watches anomalies. But in long-running projects, all three track **different sides of the same system** — whether resources and behavior are still within a controllable range.

### 7.1 Why They Cannot Be Split Apart

As long as player behavior affects resource distribution, progression speed, and social competition, these three kinds of analysis are naturally coupled:

- An economic anomaly may come from runaway numerical injection, or from cheating or black-market industry
- Payment structure fluctuations may come from event design, or from account washing, refund arbitrage, or proxy top-ups
- A gameplay mode's participation dropping may be a balance problem, or a reward structure gone wrong

If the team splits these analyses completely apart, "everyone sees a local anomaly, but no one can explain the overall change" happens again and again.

### 7.2 Balance Analysis Cannot Rely on Subjective Feel Alone

In many projects numerical adjustment stays stuck in arguments like "feels too grindy" or "feels too hard"; adjustments without behavioral data easily become pendulums: seeing churn, add welfare — and hollow out the core challenge; seeing payments drop, run a promotion — and break the price anchor. More effective balance analysis looks at all of:

- Stratified clear rates and failure rates (which power bracket of players is stuck on which stage)
- Completion time of key progression lines
- Participation depth and drop-off points of core gameplay
- Progression efficiency differences across payment tiers

### 7.3 A Reusable Analysis Framework

Put the three kinds of analysis into a "**facts → deviation → cause → action**" framework:

1. **Facts**: which key metrics changed abnormally (sink/source ratio, concentration, clear rates)
2. **Deviation**: where they deviate versus history, peer cohorts, and target ranges
3. **Cause**: version adjustment, event injection, economic structure change, or abnormal behavior
4. **Action**: tune parameters, change rules, ban accounts, or accept (some deviations are expected)

Risk control especially needs to share the data foundation with the economy (asset transaction logs, order logs, login behavior, device fingerprints) — otherwise risk control can only see "suspicious", not "what was affected". Gold-farming scripts do not just break fairness; they directly amplify inflation and drag down everyone's numerical experience; that is why anti-cheat (Chapter 18) and economy monitoring share the same transaction log table.

---

## 8. The Shock of Version Updates on the Economy System

Every version update is an "earthquake" for the economy. New gameplay, new items, new events all break the existing source-sink balance. The server side needs contingency plans in advance.

### 8.1 Economic Impact Assessment

Before a version update, an economic impact assessment should be done: how many new sources were added? How many new sinks? What is the projected inflation change in percent? Which items will be impacted?

A simple assessment model: **net flow change = new daily sources - new daily sinks**. If the net flow change pushes inflation past 15%, the plan needs adjustment.

### 8.2 A Repair Toolbox for Economic Imbalance

| Imbalance Severity | Repair Strategy | Execution Speed | Side Effects |
|---------|---------|---------|--------|
| Mild (inflation <10%) | Fine-tune source/sink parameters | Fast (hot update) | Low |
| Moderate (inflation 10-30%) | Add sinks + reduce sources | Medium (version update) | Medium |
| Severe (inflation >30%) | Emergency recycling + market intervention | Slow (multiple versions) | High |
| Collapse (hyperinflation) | Currency redesign / server merge | Very slow | Very high |

Note the difference in execution speed of repair means: **parameter-level repairs can hot-update (minutes), structural repairs need a version (weeks), collapse-level repairs need multiple versions (months)**. This requires all numerical parameters on the server to go through the config hot-update pipeline (see Chapter 17), and structural rules to be parameterized as much as possible — putting "everything that might be tuned" into config is the only way to compress month-level response down to minute-level.

---

## 9. Player Psychology: The Underlying Logic of Design

Understanding player psychology is not a designer monopoly; server-side developers need it too — because you implement the technical systems behind these psychological mechanisms.

### 9.1 Self-Determination Theory (SDT)

SDT holds that humans have three basic psychological needs: **autonomy** (free choice), **competence** (mastery), and **relatedness** (social connection). Mapped to the server side: autonomy needs multiple gameplay entrances and freedom; competence needs difficulty-matching and progression systems; relatedness needs social systems like guilds, teaming, and chat.

### 9.2 Variable Ratio Reinforcement: The Strongest Incentive Mechanism

Variable ratio reinforcement is psychology's strongest incentive mechanism — **rewards appear randomly, but the long-term expectation is stable**. Its in-game applications: gacha, monster drops, chests. Server-side implementation notes: probability must be computed on the server, pity mechanisms must be accurate, probability must be published. This is not just a technical requirement but a legal one (see Section 4.5).

### 9.3 Loss Aversion: Implementation Requirements of Time-Sensitive Systems

Loss aversion means **the pain of losing 100 yuan exceeds the joy of gaining 100 yuan**. Games exploit this with many "limited-time" and "daily" mechanisms: limited-time events, daily check-in, the stamina system.

What corresponds on the server side is three classes of **time-sensitive systems**: event countdowns, check-in records and make-ups, stamina recovery and overflow handling. Their shared implementation requirements: **server time is authoritative** (client time can be tampered with; check-in backdating and free stamina refills are common loopholes), **crossing-midnight boundaries handled correctly** (time zones, daylight saving, server downtime spanning midnight), and **make-up/recovery semantics made explicit** (which missed day, what a make-up costs — all config-driven rules, not code branches).

---

## 10. Special Challenges of Blockchain Game Economy Design

Blockchain games (GameFi) move the game economy onto the blockchain, bringing brand-new design challenges. Traditional game economies are centrally controlled and the server can adjust parameters at any time; but blockchain game economic rules are written into smart contracts, and once deployed they are very hard to change.

### 10.1 The Dual-Token Model

Blockchain games usually use a dual-token model: an **in-game token** (centrally managed, for in-game consumption) and a **governance token** (decentralized, for trading and governance). The purpose of this design is to decouple the "in-game economy" from the "on-chain economy", reducing the impact of in-game economic fluctuation on on-chain prices.

### 10.2 The Death Spiral: Blockchain Games' Biggest Risk

The death spiral is a blockchain game's worst nightmare: fewer new players → token price falls → old players dump → price falls further → more players leave → economic collapse.

Axie Infinity is the classic death spiral case: the SLP token fell from a peak of $0.36 to nearly zero. The root cause was **sources far exceeding sinks** — players kept producing SLP, but the game had no sufficient sinks for it.

Keys to preventing the death spiral: **design diversified sinks, cap production, build buyback mechanisms, control the pace of new player growth**. But the most fundamental one: **the game must have "playability" as its base, and cannot attract players purely by "making money".**

---

## 11. Code Example: A Reconcilable Economy Pipeline

This chapter went from attribute calculation to currency transaction logs, with code scattered across sections. This section assembles the economy system's most critical discipline — **transaction log first** — into a minimal closed loop: any asset change first leaves an evidence row (Section 6.3), the idempotency key blocks retries and redelivery, and the sink/source ratio aggregates directly from transaction logs (Sections 6.2, 6.4). The example is a minimal Go demonstration of this chapter's design decisions (not taken from a real project); the code blocks within sections compile through `go vet` and `go build` after merging, and are covered by the repo-wide code block regression test.

### The Accounting Closed Loop: Idempotency First, Then Balance, Then Transaction Log

```go
// accountKey：账户主键 = 玩家 × 货币类型
type accountKey struct {
    UID      uint64
    Currency uint8
}

// CurrencyLog：一行流水 = 一次资产变更的完整证据（6.3 节表结构的精简版）
type CurrencyLog struct {
    RefID    string // 幂等键：订单号/活动ID/副本ID，生产落库时加唯一索引
    UID      uint64
    Currency uint8
    Delta    int64  // 正为产出、负为消耗，全程 int64（3.2 节防溢出纪律）
    Balance  int64  // 变更后余额快照：对账锚点
    Reason   uint16 // 原因枚举：1=副本奖励 2=商店购买 3=GM补发...
}

var (
    ErrDuplicateRef = errors.New("duplicate ref") // 幂等命中
    ErrInsufficient = errors.New("insufficient balance")
)

// Ledger：内存演示版。生产中两个 map 换成数据库表，Apply 的校验顺序不变；
// 整个结构只暴露给玩家的单写者上下文（第 5 章），自身无需加锁
type Ledger struct {
    balances map[accountKey]int64
    seen     map[string]struct{} // RefID 幂等集合（生产为唯一索引）
    logs     []CurrencyLog
}

func NewLedger() *Ledger {
    return &Ledger{
        balances: make(map[accountKey]int64),
        seen:     make(map[string]struct{}),
    }
}

// Apply：流水先行的货币变更。任何调用方都必须带 refID——
// 不给幂等键的资产变更，代码评审阶段就该被打回
func (l *Ledger) Apply(uid uint64, cur uint8, delta int64, reason uint16, refID string) (int64, error) {
    if _, ok := l.seen[refID]; ok {
        return 0, ErrDuplicateRef // 网络重试/消息重投在这里被吸收
    }
    key := accountKey{UID: uid, Currency: cur}
    next := l.balances[key] + delta
    if next < 0 {
        return 0, ErrInsufficient // 余额不为负是账务不变式，不依赖调用方自觉
    }
    l.seen[refID] = struct{}{}
    l.balances[key] = next
    l.logs = append(l.logs, CurrencyLog{
        RefID: refID, UID: uid, Currency: cur,
        Delta: delta, Balance: next, Reason: reason,
    })
    return next, nil
}
```

All three disciplines land in this one function. **Idempotency first**: the `RefID` duplicate check is the first gate; duplicate requests with the same order number are absorbed here — network retries and duplicate message delivery never become duplicate grants. **Balance check in the middle**: the pre-deduction check guarantees the invariant "balance never goes negative". **Transaction log and balance change together**: in production these two steps are one database transaction (Chapter 8); for the in-memory demo, writing the order clearly is enough — mark `seen` first, then change the balance, then append the log; any failure midway cannot produce the intermediate state of "money changed but no evidence row".

### Sink/Source Ratio: No Separate Event Tracking; Aggregating Transaction Logs Is the Authoritative Standard

```go
// produceConsumeRatio：某货币的消耗/产出比（6.2 节健康区间 0.8-1.2）。
// 不做埋点：按 Delta 正负聚合流水就是权威口径，Reason 留作下钻维度
func produceConsumeRatio(logs []CurrencyLog, cur uint8) float64 {
    var produced, consumed int64
    for _, e := range logs {
        if e.Currency != cur {
            continue
        }
        if e.Delta > 0 {
            produced += e.Delta
        } else {
            consumed -= e.Delta // 负数取绝对值累加
        }
    }
    if produced == 0 {
        return 0 // 无产出的货币无从谈比值，交由上层按异常数据排查
    }
    return float64(consumed) / float64(produced)
}
```

The healthy range in Section 6.2 and the early inflation signals in Section 6.4 all rest on "source/sink data being trustworthy". The point of this code is the **uniqueness of the statistical standard**: filter by `Currency`, aggregate by the sign of `Delta`, sources and sinks each computed on their own, with the `Reason` field left as the next drill-down dimension (which gameplay is leaking). Client-side event tracking suffers weak-network packet loss and script pollution; server-side transaction logs do not — this is exactly the landing form of Section 6.3's claim that "aggregating transaction logs by Reason + Delta sign is the authoritative economic data".

None of this pipeline's extension directions shake the structure: wiring in a database transaction merely replaces `seen` with a unique index and the sequenced writes with same-transaction writes; wiring in GM re-issue merely adds one `Reason` enum value; wiring in a reconciliation system merely scans `logs` offline against the `Balance` snapshot chain. What economy monitoring (Section 6.4) and anti-cheat (Chapter 18) share is precisely this transaction log table.

---

## 12. Server-Side Development Checklist

When receiving a designer requirement, ask these 10 questions first:

```text
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

Six more for the numerical specialty:

```text
□ 11. 随机数需要确定性吗？（回放/裁决/跨端一致）
□ 12. 概率结果可追溯吗？（审计日志 + 实际出率监控）
□ 13. 货币/资产变更有流水和幂等键吗？
□ 14. 数值参数全部配置化了吗？（热更能力 = 修复速度）
□ 15. 掉落概率会被新增物品稀释吗？（分池 + CI 概率校验）
□ 16. 上线后看哪些指标？（产消比、集中度、通过率）
```

---

## 13. Summary

| Key Question | Answer |
|---------|------|
| Why must the server side understand numerical design? | Every numerical decision becomes data structures and computation logic; identifying risk at review costs far less than remediating after launch |
| The layers of attribute calculation? | Base → percentage → flat; multi-source merging distinguishes additive/multiplicative zones; damage reduction must be multiplicative |
| Technical disciplines of damage calculation? | Integer arithmetic throughout (basis points), int64 against overflow, server-side caps, deterministic randomness into battle logs |
| How is pity implemented credibly? | The counter is server-side asset-grade state, persisted in the same transaction as the pull; never trust client reports |
| The drop system's dilution trap? | Under weights, new items dilute rare drop rates; isolate with split pools + CI probability verification |
| Implementation discipline for currency changes? | Transaction log first: idempotency key + balance snapshot + reason enum; statistics and reconciliation both aggregate from the log |
| Early signals of inflation? | Sink/source ratio declining, top-end concentration rising, hoarding inflection — all in the transaction log, not waiting for soaring prices |
| How to manage numerical parameters? | Full config-driven hot updates — parameter-level repairs take minutes, structural repairs take a version |
| The economy/balance/risk-control relationship? | Three sides of one system, sharing the transaction-log data foundation, collaborating in the "facts→deviation→cause→action" framework |

---

## 14. Practical Case: Investigating a "45 Saved Pulls Wasted" Pity Reset

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified, focusing on the troubleshooting approach and backfill logic.

**Background and symptoms**

The day after a banner rotation, **2,417** complaints arrived, all concentrated on one sentence: "pity gone after switching banners". The disclosure page stated "pull counts carry over"; players switching banners had saved **45** pulls on average — exactly halfway given a 90-pull hard pity; yet in the new banner everyone started from 0. Operations' first reaction was a display bug; after the client and server reconciled accounts: the new banner's `PityState.Count` really was 0.

### Step 1: Symptoms and Measurement

Three standards gave three answers for the same stretch of pull counts:

- **Disclosure standard**: the rotation disclosure said "pull counts carry over" — of the **4** items published under Section 4.5, item **2**, "detailed explanation of the pity mechanism", promised the pity rule, and this banner's text explicitly said carry-over;
- **Implementation standard**: the rotation logic was a fresh `PityState{}` zero value — both `Count` and `Guaranteed` reset to zero; "carry over" had no corresponding implementation in code;
- **Audit standard**: sampling the trails kept per Section 4.4 — in the **10**-field logs, `pity_count_before` is traceable per player: of **400** sampled players who had counts before switching, **400** (100%) had 0 on the new banner's first pull.

The measurement gap was not in pull counts but in the promise: disclosure said "carry over", audit measured **100**% reset — align this gap first, then talk attribution.

### Step 2: Layered Attribution

Walk the pull-count state layer by layer from surface to contract:

```text
客户端层   新池抽数显示 0，与服务端一致——排除显示 bug 与本地缓存
状态机层   换池 = 新建 PityState 零值：Count 与 Guaranteed 双双归零，继承规则从未被实现
配置层     需求单写「继承」，配置表与代码都没有「换池规则」这个字段——无从显式执行
公示层     公示页按需求单写「继承」，实现按默认零值走——承诺与实现差着一整条规则
审计层     4.4 留痕 10 字段完整，pity_count_before 逐人可回溯——清零前的计数全在日志里
```

**Ledger convergence**: **8,000** players had counts when switching banners, losing **45** pulls on average — exactly half of the **90**-pull hard pity (**90** ÷ 2 = **45**); a total of **360,000** pulls (**8,000** × **45**), worth **2.16** million yuan at **6** yuan per single pull; the **2,417** complaints (**30**% of affected players) were only the vocal corner of this loss.

### Step 3: Root Cause

1. **Direct cause**: the banner-switch implementation was "fresh `PityState{}` zero value" — the carry-over rule existed only in the requirement sheet and the disclosure page; it had never been implemented in code. This was not a lost persistence field (`Count` and `Guaranteed` were written perfectly on every pull); the asset was rebuilt inside the state machine.
2. **Mechanism cause**: the key point of Section 4.3 — "handle explicitly rather than implicitly carry on" — took the most implicit path of default zero values; reconciliation checked probability but not rules — Section 4.4's "actual rate vs published" did not cover the pity rule. Of the **16** items in the Chapter 12 checklist, item **9**, "launch/offline plan", never treated banner rotation as a launch/offline plan for review; the word "carry over" in the requirement sheet had no execution point at all.
3. **Deep cause**: among the **4** questions of Section 1.2, "where is this counter stored" is question **3** — the answer "persisted on the server" was entirely correct, but the four questions covered whether to store and where to store, not who sets the rules for lifecycle events (rotation/merge/rollback); pity count is an asset, a banner switch is that asset's largest transaction, and it had no contract.

### Step 4: Remediation and Backfill

1. **Stop the bleeding and restore**: using the Section 4.4 trails as evidence, restore counts per player by `pity_count_before` — **8,000** players restored one by one, **0** failures; the audit log went from "evidence for responding to complaints" to a repair tool.
2. **Make the rule explicit**: the banner-switch rule (carry over/reset) goes into the config table, explicitly configured by designers and executed by code per config; empty config refuses to launch — aligned with Section 4.3's "handle explicitly rather than implicitly carry on".
3. **Disclosure reconciliation into CI**: the disclosure text's pity rule is compared field by field against the config table; mismatches block — extending Section 4.4's "actual rate vs published" reconciliation from probability to the rule layer.
4. **Review question added**: a 5th question joins the four for taking requirements — "for lifecycle events like banner switches, merges, and rollbacks, what are the rules?" — into the requirement review template.

**Recheck**: complaints **2,417** → **0**; of **400** sampled players, **400** had counts restored (**100**%); the next banner rotation drill had **0** resets — disclosure, config, and implementation matched word for word for the first time.

**Backfill checklist**:

| Backfill item | Landing point | Backlink |
|--------|------|------|
| Banner-switch rule into config table; empty config refuses launch | Numerical config | Chapter 02 Section 4.3 / Chapter 12 checklist |
| CI reconciliation of disclosure text against pity config | Probability reconciliation | Chapter 02 Sections 4.4, 4.5 |
| Pull-count lifecycle events added to the four requirement questions | Requirement review | Chapter 02 Section 1.2 |
| Trail-based restoration process into complaint and risk-control SOP | Complaint handling | Chapter 02 Section 4.4 / Chapter 18 |

### Three Lessons from the Case

1. **The enemy of asset-grade state is not loss but rebuilding** — `Count` and `Guaranteed` persisted normally on every pull; one zero-value rebuild at banner switch wiped them all; state machines need explicit rules for lifecycle events like rotation, merge, and rollback (Section 4.3's "handle explicitly rather than implicitly carry on").
2. **Disclosure is a promise, not copywriting** — probability can be reconciled as "actual vs published" (Section 4.4), and so can the pity rule: what was missing between the disclosure text and the config table was exactly one machine reconciliation — and the gap was exactly this rule.
3. **Trails are the cheapest insurance** — `pity_count_before` let 8,000 players be restored one by one with zero failures; without trails, the same complaints could only be compensated by guesswork (Section 1.2, question 4, "should this leave a trail").

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01](/numerical/01.md)
- [02](/numerical/02.md)
- [04](/numerical/04.md)
- [05](/numerical/05.md)
- [08](/numerical/08.md)
