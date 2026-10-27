# 12 Game Data Analytics

> I view game data analytics as one chain from event-tracking collection to decision execution: metric-definition governance, funnel / retention / monetization analysis, trustworthy A/B testing, and the pipelines that keep the data reliable. Definition drift at any link of the chain affects every downstream judgment.
>
> Reference: the analytical framework in *The Art of Game Data Analytics* (Yu Yang et al.).

Game data analytics is the "eyes" of game operations — it helps the team understand player behavior, find problems and optimize the experience. Game operations without data analytics is like driving with your eyes closed, able only to move forward on instinct.

But data analytics is not merely "looking at data". It has to answer three layers of questions: **what happened** (descriptive analysis), **why it happened** (diagnostic analysis) and **what to do next** (predictive analysis). Many teams stay at the first layer, only reading DAU and revenue reports, and miss the real insight behind the data.

**Core principle**: the purpose of data analytics is not "looking at data" but "making decisions". Every analysis should point to a concrete action. And the precondition for all of this is that the numbers must first be trustworthy — the most common failure of a data system is not a lack of data, but that everyone can produce a chart while no one dares to guarantee that the numbers in it represent business reality.

---

## 1. Data Analytics Fundamentals

### 1.1 The Complete Loop

Data analytics is not a one-time task but a continuous loop: data collection → data cleansing → data storage → data analysis → visualization → decision execution → effect evaluation → feedback into data collection.

Many teams' problems sit at the "collection" and "execution" ends: collection is not comprehensive enough, so the analysis lacks key data; analysis produces conclusions but they are not converted into action, so the analysis becomes "armchair theorizing".

### 1.2 Data Classification and Value

Different kinds of data have different analytical value:

| Data type | Description | Examples | Storage | Analytical value |
|---------|------|------|---------|---------|
| Behavior data | Player action records | Clicks, movement, browsing | Logs / warehouse | Understand player behavior paths |
| Status data | Player's current state | Level, equipment, currency | Database | Assess player growth |
| Transaction data | Top-up and spending records | Top-up amounts, item purchases | Database | Analyze paying behavior |
| Social data | Player relationships and interactions | Friends, guilds, chat | Database | Assess social health |
| Performance data | System runtime metrics | Latency, frame rate, errors | Monitoring system | Safeguard system stability |

### 1.3 Five Dimensions of Data Quality

Data quality is the foundation of data analytics. Garbage in, garbage out — if the collected data has heavy missing values, duplicates or anomalies, the analytical conclusions are unreliable.

Data quality checks need to attend to five dimensions: **completeness** (are required fields empty), **accuracy** (is the data correct), **consistency** (do different sources agree), **timeliness** (does data arrive on time) and **uniqueness** (are there duplicates).

```go
// 数据质量检查 - 完整性与唯一性（ClickHouse）
func (c *Checker) CheckDaily(table, date string) (*QualityReport, error) {
    query := fmt.Sprintf(`
        SELECT
            count()                                        AS total,
            countIf(event_name = '')                       AS missing_name,
            countIf(player_id = 0)                         AS missing_player,
            total - uniqExact((event_name, player_id,
                               event_time, seq_id))        AS duplicates
        FROM %s
        WHERE toDate(event_time) = ?`, table)

    var r QualityReport
    if err := c.ch.QueryRow(query, date).Scan(
        &r.Total, &r.MissingName, &r.MissingPlayer, &r.Duplicates); err != nil {
        return nil, err
    }
    r.Date = date
    return &r, nil // 报表推送数据群，完整率/重复率连续下滑即告警
}
```

Quality checks should be a **daily routine task** rather than something done only after a problem appears — the cost of one SQL statement buys you early detection of "the event tracking quietly broke".

### 1.4 Common Data Problems

| Problem | Cause | Detection method | Handling |
|------|------|---------|---------|
| Duplicate data | Network retries | Unique-key duplicate statistics | Idempotent de-duplication by event ID |
| Missing data | Lost event tracking | NULL value checks | Interpolation / flagging |
| Anomalous data | Cheats / errors | Statistical anomaly detection | Flag / filter |
| Delayed data | Kafka backlog | Event time vs processing time | Wait / alert |
| Format error | Event-tracking bug | Regex validation | Correct / discard |

> **Pitfall**: the most common data quality problem is not "the data is wrong" but "event tracking is missing" — key behaviors were never recorded, so the analysis lacks data. It is recommended to review the event-tracking checklist before every version release to make sure all critical paths are covered (see the event-tracking acceptance in section 2.4).

---

## 2. Event-Tracking Design and Definition Governance

This section comes first because it is the foundation for all the analysis that follows. Problems with event tracking and definitions do not erupt at collection time; they erupt at the first big argument over a decision — "which report should we actually trust".

### 2.1 Event Tiering

Many teams' early habit when doing event tracking is "whoever needs a number just has the client track it on the side". Fast short-term, but it keeps manufacturing problems: the same behavior gets defined redundantly across clients, event names look similar but field meanings differ, nobody cleans up old tracking points, and client events and server-side facts contradict each other.

A steadier approach is to tier the events first:

| Tier | Content | Examples | Collection side |
|------|------|------|--------|
| Behavior events | Front-end interaction | Click, enter, exit, browse | Client |
| Business events | Key facts | Match completed, reward claimed, payment succeeded, character created | Server |
| System events | Technical anomalies | Load failure, network error, stutter, crash | Both sides |

One important division-of-labor principle: **conclusions about settlement, revenue and assets should be built primarily on server-side verifiable facts.** Client behavior data is suited to explaining paths and experience (at which step the player hesitated), but is not suited to single-handedly carry conclusions like "how much is the revenue" or "how many rewards were granted" — client tracking points get lost (network, crashes, tampering), while server-side facts (payment callbacks, fulfillment ledgers) are the reconciliation baseline. When a revenue report cannot reconcile with the channel, the first thing to confirm is "which side is authoritative", and the answer is almost always the server.

### 2.2 Definition Governance Matters More than Charts

Daily reports, weekly reports and event dashboards are all just presentation layers; what actually determines analytical quality is the definition of each metric:

- Is a "new user" by first login, first character creation, or first completion of the tutorial?
- Is an "active user" counted by login, or by producing a meaningful action?
- Is a "paying user" counted by successful payment, or by successful fulfillment?
- Is "churn" days without login, or days without core behavior?

As long as these definitions are unstable, the more reports there are, the more severe the misleading. Many classic disputes are not algorithm problems but definition problems:

- The marketing side says acquisition brought a high volume of new users, while the product side says tutorial churn is abnormal — one counted by registration, the other by character creation
- Operations says the event lifted retention, the analyst says there is no significant change — one looked at next-day login, the other at day-7 core behavior
- The payment dashboard shows revenue growth, but finance reconciliation finds a discrepancy — the dashboard included unconfirmed orders

**The governance instrument is a metric dictionary**: one record per core metric, stating the definition, the calculation SQL, the source tables and the owner. Metric changes go through a process (changing a definition requires notifying everyone + a note on historical data about whether to backfill). The dictionary can be a wiki or a built-in BI platform feature; the form does not matter, "each definition has one authoritative source" is what matters.

### 2.3 Event-Tracking Conventions

Event-tracking events need unified naming and field conventions; a common minimal set:

```json
{
  "event_name": "gacha_draw",       // 模块_动作，蛇形命名
  "seq_id": "9f86d081-...",          // 事件唯一 ID，用于幂等去重
  "player_id": 10086,
  "server_id": 3,
  "ts": 1726977600,                  // 事件发生时间（客户端时间）
  "server_ts": 1726977601,           // 服务端接收时间（延迟分析用）
  "props": {
    "pool_id": 202,
    "cost_currency": "diamond",
    "cost_amount": 280,
    "result": [30211]
  }
}
```

`seq_id` deserves special emphasis: client retries and queue replays both cause duplicates, and a unique event ID is the precondition for all downstream de-duplication. Without it, "de-duplication" can only rely on approximate rules (same player, same event, same second), with a discount on accuracy.

### 2.4 Event-Tracking Acceptance

The event-tracking acceptance checklist before a new version goes live:

- **Critical-path coverage check**: compare the new feature's event list against the design document, neither may be missing
- **Field validation**: sample real reports to check types, enum values and required fields
- **Cross-side consistency**: client events and server-side business facts line up (e.g. the count of "match ended" events and the server settlement count are within the threshold of error)
- **Old tracking-point cleanup**: mark no-longer-used events as deprecated and stop depending on them on the data side

---

## 3. Core Metric System

### 3.1 User Metrics

User metrics are the "thermometer" of game health. The most core metrics are DAU (daily active users) and retention rate.

| Metric | Definition | Formula | Empirical reference |
|------|------|---------|--------|
| DAU | Daily active users | De-duplicated users who logged in on the day | - |
| MAU | Monthly active users | De-duplicated users who logged in during the month | - |
| DAU/MAU | User stickiness | DAU ÷ MAU × 100% | > 20% |
| D1 retention | New users returning on day 2 | Day-2 logins / new users × 100% | > 40% |
| D7 retention | New users returning on day 7 | Day-7 logins / new users × 100% | > 20% |
| D30 retention | New users returning on day 30 | Day-30 logins / new users × 100% | > 10% |

(Reference values vary greatly by genre; hyper-casual and heavy MMOs cannot borrow from each other, and same-genre competitors should be the benchmark.)

**Retention is the most important metric** — it directly reflects how attractive the game is to players. D1 retention below 30% usually indicates a problem with the onboarding experience; D7 retention below 15% indicates the core gameplay lacks stickiness.

### 3.2 Revenue Metrics

Revenue metrics reflect a game's commercial value. But you cannot look only at total revenue; the revenue structure also needs analysis.

| Metric | Definition | Formula | Notes |
|------|------|---------|------|
| ARPU | Average revenue per user | Total revenue ÷ DAU | Overall paying capacity |
| ARPPU | Average revenue per paying user | Total revenue ÷ paying users | Value of paying users |
| Payment rate | Share of paying users | Paying users ÷ DAU × 100% | Paying-conversion capacity |
| LTV | Lifetime value of a user | ARPU × average lifetime | Long-term value; basis for acquisition decisions |
| First-purchase rate | Share of new users making a first top-up | First-time paying users ÷ new users × 100% | Effect of first-purchase guidance |

**ARPU vs ARPPU**: low ARPU but high ARPPU means the payment rate is low but paying users are highly loyal — you need to optimize payment guidance; high ARPU but low ARPPU means the payment rate is high but the average order value is low — you need to optimize payment depth. LTV is the anchor on the acquisition side: when the cost per acquisition (CPA) is higher than the expected LTV, the scale of buying needs to be pulled back.

### 3.3 Real-Time Metric Computation

During operations events, key metrics need real-time monitoring. Redis HyperLogLog is a powerful tool for computing DAU — with tiny memory (12KB) it can count de-duplicated users at the scale of hundreds of millions, with a standard error of about 0.81%.

```go
// 实时 DAU 计算 - HyperLogLog
func (c *Metrics) RecordLogin(playerID uint64) {
    key := fmt.Sprintf("dau:hll:%s", time.Now().Format("2006-01-02"))
    pipe := c.redis.Pipeline()
    pipe.PFAdd(c.ctx, key, strconv.FormatUint(playerID, 10))
    pipe.Expire(c.ctx, key, 48*time.Hour) // 保留两天供跨天查询
    pipe.Exec(c.ctx)
}

func (c *Metrics) GetDAU() (int64, error) {
    key := fmt.Sprintf("dau:hll:%s", time.Now().Format("2006-01-02"))
    return c.redis.PFCount(c.ctx, key).Result()
}
```

Two boundaries of HLL need attention: it is an **estimate** (0.81% error means a million DAU can be off by eight thousand), so externally published revenue-related data must not be reconciled with HLL; also `PFCount` supports merging multiple keys (`PFCOUNT dau:hll:2026-09-21 dau:hll:2026-09-22`), but the merged result is a de-duplicated estimate and cannot be used for exact "two-day overlapping users" analysis — that needs an exact set (Bitset or the warehouse).

### 3.4 Reading the "Temperature" of Metrics

Data metrics need to be interpreted with context. The same 5% DAU drop means something completely different in different situations:

- **A 5% drop after a version update**: possibly caused by a bug in the new version; needs urgent investigation
- **A 5% drop after a holiday**: possibly a normal fall back; no overreaction needed
- **A 2% drop every day for a week straight**: possibly declining game stickiness; needs in-depth analysis

> **Pitfall**: the most common data misconception is the "average trap" — an average ARPU of 50 looks fine, but in reality 99% of players do not pay and 1% of whale players contribute most of the revenue. The average masks the true shape of the distribution, so revenue metrics need quantile and tiered analysis (see section 6).

---

## 4. Funnel Analysis

### 4.1 What Is Funnel Analysis

Funnel analysis breaks a player's behavior path into a series of steps, analyzes the conversion rate at each step, and finds the segment with the most severe drop-off.

The core value of funnel analysis is **quantifying drop-off**: not "feeling that players drop off at some step" but "knowing exactly how many people drop off at each step and what the drop-off rate is".

### 4.2 Registration Funnel and Payment Funnel

The registration funnel is the core tool for evaluating acquisition effectiveness:

```text
广告曝光 → 点击下载 → 安装 → 打开 → 注册 → 完成新手 → 首次付费
  100%      30%       20%   15%   10%    5%      1%
```

Every step has an industry benchmark. When one step falls significantly below benchmark, analyze in depth: is the ad creative unappealing (low impression → click)? Is the install package too large (low click → install)? Is the splash screen too slow (low install → open)?

The payment funnel works the same way:

```text
浏览商店 → 查看商品 → 点击购买 → 确认支付 → 支付成功
  100%      60%       30%       20%       15%
```

> **Pitfall**: the most common error in funnel analysis is "unclear step definitions" — is the definition of "browse the shop" "open the shop page" or "browse for more than 3 seconds"? Different definitions can yield completely different conclusions. Back to definition governance in section 2.2: the event definition of every step must first be written into the metric dictionary.

### 4.3 ClickHouse Funnel Queries

The semantics of a funnel is "**the same player completes the steps in order**", not "the de-duplicated count of each step on its own". The ratio of the latter is inflated (player A looked at the shop and did not buy, player B did not look at the shop and bought directly, and both count as conversion). ClickHouse's built-in `windowFunnel` is exactly the former:

```sql
-- 付费漏斗：窗口 1 天内按顺序完成 view → click → pay 的玩家
SELECT
    max_step,
    count() AS users
FROM (
    SELECT
        player_id,
        windowFunnel(86400)(
            toDateTime(event_time),
            event_name = 'shop_view',
            event_name = 'pay_click',
            event_name = 'pay_success'
        ) AS max_step   -- 0=一步未完成, 1=只完成第1步, ...
    FROM player_events
    WHERE event_time >= now() - INTERVAL 7 DAY
    GROUP BY player_id
)
GROUP BY max_step
ORDER BY max_step;
```

The distribution of `max_step` is the funnel: the number of people who completed step 1, the number who reached step 2... The difference between each adjacent pair of layers is the drop-off at that step. The window parameter (86400 seconds) defines "within how long it must be completed to count as conversion", and this window itself is part of the definition, so it needs to be written into the metric dictionary.

### 4.4 Differences by Game Type

| Game type | Key funnel | Conversion bottleneck | Optimization direction |
|---------|---------|---------|---------|
| Card mobile game | Gacha funnel | First pull → repeat pulls | Card pool design, probability display |
| MMO | Onboarding funnel | Tutorial → daily routine | Onboarding guidance, sense of goals |
| Idle game | Offline earnings funnel | Login → claim | Push reminders, earnings display |
| Tower defense game | Level funnel | Normal stage → hard stage | Difficulty curve, payment guidance |
| Blockchain game | On-chain interaction funnel | Registration → first on-chain action | Wallet guidance, gas fee optimization |

---

## 5. Retention Analysis

### 5.1 Three Stages of the Retention Curve

A game with 50% D1 retention is more valuable than a game with 20% D1 retention and 50,000 DAU, even if the former only has 10,000 DAU — the former's players have longer lifetimes and higher LTV.

Retention curves usually present three stages:

1. **Days 1-3 rapid drop**: onboarding experience problems; players have not yet found the core fun
2. **Days 3-7 tending toward a plateau**: the core user base forms, and what remains are players who genuinely like the game
3. **Day 7 onward slow decline**: long-term stickiness problems, content exhausted

When analyzing, watch the curve's "inflection point": the earlier the inflection point appears (the steeper the drop in the first few days), the more the problem concentrates in onboarding guidance; if the curve's overall slope is steep, the problem is in the long-term driving force of the core gameplay.

### 5.2 Retention Attribution

Retention analysis has to answer: which channels retain best? Which onboarding behaviors predict long-term retention?

| Predictive feature | Description | Predictive power |
|---------|------|--------|
| Day-1 play time | How long they played on the first day | High |
| Day-1 social behavior | Whether they added friends / joined a guild | High |
| Day-1 payment behavior | Whether they made a first top-up | Medium-high |
| Day-1 stage progress | How many stages completed | Medium |
| Device info | Phone model, OS version | Low |

Features with high predictive power correspond directly to actionable levers: day-1 social behavior is highly predictive → turn "add friends / join a guild" into onboarding tasks; day-1 play time is highly predictive → optimize day-1 content density. The value of retention analysis lies in "attribution to actionable levers", not in the precision of the prediction model itself.

### 5.3 ClickHouse Retention Queries

The performance key for retention queries is **not doing JOINs on the detail table**. Raw event tables run to billions of rows per day, and a 30-day detail JOIN per player will drag the cluster down. The common practice is to compute against a pre-aggregated "user daily behavior table" (one row per person per day):

```sql
-- 7 日留存（基于用户日表 user_daily，每人每天一行）
WITH first_login AS (
    SELECT player_id, min(dt) AS reg_date
    FROM user_daily WHERE login_cnt > 0
    GROUP BY player_id
)
SELECT
    fl.reg_date,
    count()                                      AS cohort,
    round(countIf(ud.dt = fl.reg_date + 1) * 100.0
          / count(), 2)                          AS d1_retention,
    round(countIf(ud.dt = fl.reg_date + 7) * 100.0
          / count(), 2)                          AS d7_retention
FROM first_login fl
LEFT JOIN user_daily ud ON fl.player_id = ud.player_id
WHERE fl.reg_date >= today() - 30
GROUP BY fl.reg_date ORDER BY fl.reg_date
```

A lightly aggregated layer like `user_daily` (the DWS tier in warehouse layering) is the standard base for retention and activity analysis — aggregate once, reuse across all retention reports, and queries drop from the minute scale to sub-second.

> **Pitfall**: the most common error in retention analysis is "survivorship bias" — analyzing only the behavior of retained users and ignoring churned users. Churned users' behavior data is equally important, because it reveals "why players leave": the last few behaviors before churn (stuck on a stage, consecutive losses, resources exhausted) are often the cause of churn itself.

---

## 6. Monetization Analysis

### 6.1 Tiering Paying Users

Paying users are not a monolith. Tiering by payment amount lets you set operations strategy more precisely:

| Tier | Payment amount | User share | Revenue share | Operations strategy |
|------|---------|---------|---------|---------|
| Whale users | ≥1000 yuan | 1% | 50% | Dedicated support, custom content |
| Dolphin users | 100-999 yuan | 5% | 30% | Monthly card guidance, limited-time events |
| Small-fish users | 1-99 yuan | 15% | 15% | First-top-up discounts, small packages |
| Free users | 0 yuan | 79% | 5% | Conversion guidance, experience optimization |

**Key fact**: a tiny fraction of big spenders contribute most of the revenue. This determines two things: the experience of whale users needs dedicated maintenance (the churn of one whale may have more impact than a hundred free users); at the same time, the "per capita" metrics of revenue data are almost meaningless — looking at structure matters more than looking at averages.

Beyond amount, the tiering dimension should also look at **trends**: players who moved up from dolphin to whale this month (a positive signal, worth nurturing) and players who dropped from whale to dolphin (an early signal of declining willingness to pay). Tiering is a static slice; tier migration is what reflects business trends.

### 6.2 Payment Cadence Analysis

Payment-interval analysis reveals a player's payment cadence: how often do they repurchase? What kind of event stimulates repurchase? Is the repurchase amount stable?

```sql
-- 复购间隔分布：同一玩家相邻两次支付的间隔
SELECT
    multiIf(day_diff <= 1,   '1天内',
            day_diff <= 7,   '1-7天',
            day_diff <= 30,  '7-30天',
            '30天以上')       AS interval_group,
    count() AS occurrences
FROM (
    SELECT dateDiff('day',
        lagInFrame(pay_time) OVER (PARTITION BY player_id ORDER BY pay_time
                                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
        pay_time) AS day_diff
    FROM pay_records
)
WHERE day_diff >= 0
GROUP BY interval_group ORDER BY interval_group
```

The healthy shape of an interval distribution is "the share of short intervals is stable": repurchase concentrates within 7 days (the natural rhythm of monthly / weekly cards), while a rising share of the 30-day-plus long tail indicates declining payment drive. Reading interval changes alongside the event calendar lets you locate "which kind of event actually drove repurchase".

Payment time slots also follow type patterns: card mobile games peak at 20:00-22:00 (evening limited-time packages), idle games at 12:00-14:00 at midday (claiming earnings during the lunch break), MMOs before and after guild events. Time-slot analysis directly serves the scheduling of pushes and limited-time events.

> **Pitfall**: the most common error in monetization analysis is "looking only at the total and not the structure" — total revenue grew, but the growth all came from whale users, while the payment rate was actually falling. Without tiered analysis you will mistakenly believe "everything is normal". Also beware of "front-loaded growth": large packages front-run spending in later versions (expanded in the knowledge-base piece "Operations, Monetization and Data Analytics"), where the short-term revenue curve looks good but the next version's revenue dives.

---

## 7. A/B Testing

### 7.1 Value and Principles

A/B testing is the core tool of data-driven decision making: by comparing randomized groups, it scientifically verifies "which option is better". Without A/B testing, product decisions become "whoever shouts loudest decides".

Suitable scenarios: UI rework (old vs new interface), numerical tuning (old vs new probabilities), feature add / remove (with vs without a feature). Unsuitable scenarios also need to be recognized: long-tail features with too small a sample (conclusions untrustworthy), compliance changes that must take effect for everyone, and extremely long-cycle metrics (LTV-class metrics cannot afford the test period).

Four key principles:

1. **Sufficient sample size**: too few samples make conclusions unreliable; small conversion-rate differences (e.g. 2% → 2.2%) need tens of thousands of samples per group to be detectable
2. **Long enough test time**: at least covering one full cycle (a week), avoiding special periods such as holidays
3. **Single variable**: test only one variable at a time, otherwise attribution is impossible
4. **Random grouping**: use a stable player-ID hash as the grouping key (not a random number — players re-entering the experiment across days must land in the same group), and check whether each group's baseline metrics are balanced after grouping

### 7.2 Statistical Significance

A/B results must pass a significance test. Proportion metrics (click rate, payment rate) use a two-proportion z-test:

```go
// A/B 测试统计显著性（两比例 z 检验）
func CalculateSignificance(c1, t1, c2, t2 int64) (float64, bool) {
    p1, p2 := float64(c1)/float64(t1), float64(c2)/float64(t2)
    p := float64(c1+c2) / float64(t1+t2)
    se := math.Sqrt(p * (1 - p) * (1/float64(t1) + 1/float64(t2)))
    z := (p2 - p1) / se
    pValue := 2 * (1 - normalCDF(math.Abs(z)))
    return pValue, pValue < 0.05 // 95% 置信度
}
```

Metric type determines the test method: proportions use a z-test; amount metrics (ARPU, average order value) are severely right-skewed, so a Mann-Whitney U test or a t-test on log-transformed data is more stable; and pay attention to the **effect size**, not just the p-value — significant but only a 0.1% lift may not be worth the risk of the change.

### 7.3 Common Pitfalls

| Pitfall | Description | Solution |
|------|------|---------|
| Insufficient sample size | Results lack statistical significance | Compute the minimum sample size in advance with power analysis |
| Test time too short | Affected by periodicity | Run at least 1-2 full cycles |
| Peeking mid-test | Ending early as soon as it becomes significant | Fix the test duration in advance, or use a sequential test |
| Simpson's paradox | Overall and grouped conclusions contradict | Tiered analysis, controlling confounding variables such as channel / platform |
| Multiple comparisons | Testing multiple groups / metrics at once increases false positives | Bonferroni correction, or specify the primary metric in advance |
| Novelty effect | Short-term attraction of a new feature is inflated | Extend observation and check whether the week-2 trend falls back |

> **Pitfall**: the most common error in A/B testing is "drawing conclusions too early" — running a test for only 2 days and announcing results. "Peeking mid-test + stopping as soon as it is significant" pushes the false-positive rate far above 5%: the longer it runs, the easier it is to "stumble into" significance, which is not a real effect. The sound practice is to fix the duration and sample size in advance and only analyze when the period expires.

---

## 8. Data Warehouse and ETL

### 8.1 Layered Architecture

The data warehouse uses a layered architecture with clear responsibilities per layer:

```text
┌─────────────────────────────────────┐
│           数据应用层 ADS             │
│   (报表、仪表盘、分析模型)           │
├─────────────────────────────────────┤
│           数据服务层                 │
│   (API、数据接口)                    │
├─────────────────────────────────────┤
│           数据仓库层                 │
│   (ODS 原始层 → DWD 明细层 →        │
│    DWS 汇总层 → ADS 应用层)          │
├─────────────────────────────────────┤
│           数据采集层                 │
│   (埋点日志、数据库、第三方)          │
└─────────────────────────────────────┘
```

The `user_daily` that the retention query in section 5.3 depends on is a product of the DWS layer — **analysis queries should in principle not touch the ODS / DWD detail layers**, which is a double safeguard for query performance and unified definitions (definitions are held in the aggregation layer; if every report computes detail on its own they are bound to conflict).

### 8.2 Three Disciplines of ETL

The core design principles of ETL (Extract-Transform-Load):

- **Incremental processing**: partition by day / hour and only process new data, never reprocessing history
- **Idempotency**: re-running the same batch multiple times yields the same result — common practice is **partition overwrite** (on rerun, delete the partition first, then write), plus de-duplication by `seq_id` (duplicates caused by client retries are uniformly cleaned at the DWD layer)
- **Error tolerance**: a single dirty record does not block the whole batch; it goes into a quarantine table for manual investigation

### 8.3 A Typical Pipeline

A typical chain for game data: client / server event tracking → log collection (Fluentd / Filebeat) → message queue (Kafka) → real-time processing (Flink) → warehouse (ClickHouse).

The division of labor between real-time and batch: the real-time chain serves operations monitoring (real-time DAU, real-time revenue alerts, event participation progress), and batch serves deep analysis (retention, funnels, payment structure). The two chains share the same data sources, but **the definitions must be consistent** — the real-time dashboard's "revenue today" not matching the T+1 report is a common incident, usually because the real-time chain counted orders that were not successfully paid (back to section 2.2: revenue takes the server-side successful-payment fact as authoritative).

> **Pitfall**: the most common problem in ETL is "data delay" — Kafka backlog delays analysis by hours. Consumer lag needs monitoring and alerting; when backlog exceeds a threshold, automatically scale out consumers or throttle upstream.

---

## 9. Visualization and Dashboards

### 9.1 Dashboard Categories

A good dashboard is "at a glance" — key metrics prominent, filtering supported, drill-down supported.

| Dashboard | Target user | Core metrics | Refresh frequency |
|--------|---------|---------|---------|
| Operations dashboard | Operations team | DAU, retention, revenue, event progress | Real-time / hourly |
| Product dashboard | Product team | Conversion rates, feature usage rates | Daily |
| Technical dashboard | Technical team | Latency, error rate, capacity | Real-time |
| Management dashboard | Management | Revenue trend, user growth | Weekly |

### 9.2 Chart Choice

Choosing the right chart type lets data "speak":

- **Comparing data**: bar / column chart
- **Trend changes**: line chart
- **Share distribution**: pie / donut chart (use a sorted bar chart when there are many categories)
- **Conversion flow**: funnel chart
- **Geographic distribution**: map
- **Real-time monitoring**: number cards + real-time line chart

> **Pitfall**: the most common error in a dashboard is "information overload" — every metric piled onto one page and no one can see anything clearly. Each dashboard should hold only 5-8 core metrics, with the rest on drill-down sub-pages. Another hidden error is "absolute values without comparison": looking at "today's revenue 320k" alone carries no information; paired with the same period yesterday and the same period last week it becomes meaningful.

---

## 10. Data-Driven Decision Making

### 10.1 Analysis Framework

Data analytics is not "looking at data" but "making decisions". The standard analysis framework:

```text
问题定义 → 数据收集 → 数据分析 → 结论验证 → 行动执行 → 效果评估
    ↑                                                          ↓
    └──────────────────── 反馈循环 ←──────────────────────────────┘
```

"Problem definition" is the step most easily skipped — "let's see what's going on" is not a problem definition; "the drop-off rate at stage 3 of the tutorial rose 15% versus the previous period, find the cause" is.

### 10.2 Common Analysis Scenarios

| Scenario | Analysis method | Output |
|------|---------|------|
| Onboarding churn | Funnel analysis + pre-churn behavior analysis | Onboarding optimization plan |
| Payment conversion | Payment funnel + A/B testing | Shop optimization plan |
| Event effectiveness | Event period vs baseline comparison | Event postmortem report |
| Version evaluation | Before / after comparison + retention tiering | Version iteration recommendations |

Event effectiveness evaluation has an easily overlooked control-group problem: revenue rising during an event period may simply be a weekend effect or a version bonus. "Up 30% versus last week" is not the same as "the event brought 30%" — you need non-event servers as a control group, or a historical same-period baseline to subtract natural fluctuation. Any "effect" without a control deserves skepticism.

### 10.3 Rate Limiting and Attribution for Outreach

Analytical conclusions often land on "reaching out to players" (pushes, mail, popups). The two capabilities of an outreach system that are most often underestimated:

- **Rate limiting**: a cap on the number of outreach touches per player per unit of time (quota shared across channels). Without rate limiting, the onboarding period gets hammered by multiple systems pushing in turn and churn actually accelerates, while paying players are still repeatedly promoted the same package.
- **Attribution**: each outreach touch records "delivered / opened / clicked / returned / converted", attributing the effect to a specific outreach action. Without attribution the team never knows which outreach actually works, and budget can only be allocated by feel.

Outreach effectiveness is in turn a data source for the analytics system: the return rate of recall pushes is the validation set for the "churn early-warning model".

### 10.4 Report Template

A good analysis report contains: analysis background, core findings, supporting data, conclusions and recommendations, next-step plan. The key is that **conclusions must be actionable** — "retention dropped" is not a conclusion; "the drop-off rate at step 3 of onboarding guidance is 40%, recommend simplifying the flow and verifying with an A/B test" is.

The sound positioning of AI assistance at this stage is "first-draft generator": summarizing themes in player feedback, generating draft event postmortems, tagging and routing support tickets — these high-repetition, text-heavy scenarios with a human review loop suit the model; whereas high-risk actions such as ban rulings, price changes and executing bulk outreach can only produce candidates from AI, with the final decision needing a person. Treating AI as an assistant rather than an arbiter is the boundary for introducing AI on the operations side.

---

## 11. Code Example: The Minimal Skeleton for Event-Tracking De-duplication and Significance Testing

Section 2.3 stresses that `seq_id` is the precondition for all downstream de-duplication — client retries and queue replays both send the same event up twice; the z-test snippet in section 7.2 leaves a `normalCDF` with no implementation. This section fills in both pieces and installs them into a minimal Go demonstration implementation (not taken from a real project): a receiving side with dual-window idempotent de-duplication, and a complete significance computation. The code blocks within a subsection compile through `go vet` and `go build` after being merged, and are covered by the repo-wide code block regression tests.

### Receiving Side: seq_id Dual-Window Idempotent De-duplication

```go
// EventHub：埋点接收侧的 seq_id 幂等去重（2.3 节）。
// 难点不是「判重」而是「记住多少」：seen 集合无限增长会拖垮内存。
// 双窗口：当前窗口记新事件，上一窗口保留作过渡期——
// 跨窗口重试（客户端积压几分钟后重发）落在过渡期里，仍能挡住
type EventHub struct {
    mu       sync.Mutex
    active   map[string]struct{}
    draining map[string]struct{}
    observed uint64 // 窗口轮换节奏计数
}

var ErrDuplicate = errors.New("duplicate event")

const windowSize = 10000

func NewEventHub() *EventHub {
    return &EventHub{
        active:   make(map[string]struct{}),
        draining: make(map[string]struct{}),
    }
}

// Accept：返回 nil 表示首次收到，事件进入下游流水；
// 返回 ErrDuplicate 表示重复上报，直接丢弃
func (h *EventHub) Accept(seqID string) error {
    h.mu.Lock()
    defer h.mu.Unlock()

    if _, seen := h.active[seqID]; seen {
        return ErrDuplicate
    }
    if _, seen := h.draining[seqID]; seen {
        return ErrDuplicate
    }
    h.active[seqID] = struct{}{}

    h.observed++
    if h.observed%windowSize == 0 { // 每 windowSize 条轮换一次窗口
        h.draining = h.active
        h.active = make(map[string]struct{})
    }
    return nil
}
```

In a real system, the window size is derived from the "longest client retry interval", and extreme backlog is caught by a unique index after the data lands in the database (the cross-side consistency reconciliation in section 2.4) — the in-memory window seeks speed, the database unique key seeks ultimate correctness, and the two layers each cover a segment.

### Significance: Completing normalCDF

```go
// normalCDF：标准正态累积分布函数，用误差函数表示——
// Φ(x) = ½·[1 + erf(x/√2)]，math 包原生提供 Erf
func normalCDF(x float64) float64 {
    return 0.5 * (1 + math.Erf(x/math.Sqrt2))
}

// pValueOf：双侧 p 值。由 z 值算「比观察更极端」的概率，
// 与 7.2 节的 z 检验拼起来就是完整的显著性链路
func pValueOf(z float64) float64 {
    return 2 * (1 - normalCDF(math.Abs(z)))
}
```

---

## 12. Data Security and Compliance

### 11.1 Security Principles

Game data contains large amounts of player private information and requires strict security practices:

| Principle | Description |
|------|------|
| Least privilege | Grant only the necessary data access permissions (per table / per column) |
| Data masking | Mask sensitive fields (phone numbers, ID numbers, payment accounts) before analysis |
| Encrypted storage | Encrypt important data at rest |
| Audit logs | Record all data access and export actions |
| Regular cleanup | Clean up expired data in time (retention periods compliant with regulations) |

### 11.2 Privacy Compliance

With the implementation of the Personal Information Protection Law (PIPL), the Data Security Law (DSL) and overseas GDPR, privacy compliance has become a hard constraint on event-tracking design. Core requirements: obtain explicit user consent (privacy policy), provide a data deletion interface (delete upon account cancellation), collect only the minimum necessary, do not over-share with third parties, and run periodic privacy audits.

> **Pitfall**: the most common compliance problem is "over-tracking" — collecting large amounts of unnecessary user data (contacts, precise location, clipboard), driving both compliance risk and storage cost up. Periodically review the event-tracking list and delete the collection items "nobody uses now"; pass new event tracking through compliance review before it goes live.

---

## 13. Practical Case: A Complete Investigation of a "Report Revenue Down 12%"

> This case is a demonstration example (not taken from a real project), with numbers rounded and simplified. It strings the chapter's definition governance, tiering and dimension splitting, funnel analysis, data quality and backfill discipline into one complete timeline — each section alone is a knowledge point; strung together they form a real investigation.

**Background and symptom**: at the Tuesday morning meeting, the T+1 report shows yesterday's revenue at **-12%** versus the previous period. At the same time three "unusual silences" appear: the real-time dashboard's revenue curve is nearly flat, customer support has received no payment-related complaints, and the overall payment success rate is normal.

### Step 1: Align the Definitions Before Drilling Down (echoing 2.2)

The T+1 report's revenue definition is **server-side completed order amount**; the real-time dashboard uses the **order-placement definition** (it does not filter unpaid orders), so the two numbers were never supposed to be equal. But this time the directional divergence — one flat, one plunging — is itself a clue: the gap is concentrated on the "after payment, before crediting" segment of the chain, not just definition noise.

Run data quality first (the five dimensions of 1.3): no tracking interruption, ODS partitions complete, no reruns that day — the data pipeline is ruled out; this is a **business fact**, not a data incident.

### Step 2: Dimension Splitting Locates the Population (echoing 6.1)

- **Tiering**: the payment rate is flat, and the entire drop is in ARPPU — a money-side problem, not a traffic or headcount problem.
- **Channel split**: the drop comes entirely from channel A (30% of revenue, -40% within the channel; 30% × 40% ≈ 12%, exactly explaining the site-wide drop), with the other channels flat in aggregate.
- **Version cross-check**: channel A fully rolled out a new client package last Thursday, covering about 80% of that channel's paying users; the crediting rate for new-package users was cut in half while old-package users were normal (80% × 50% ≈ 40%, the chain closes).

### Step 3: The Payment Funnel Locates the Step (echoing 4.2)

Splitting the payment funnel for channel A's new package down to the "callback signature verification" step, the problem takes shape:

| Funnel step | Behavior |
|---------|------|
| Checkout raised | Normal |
| Payment callback arrives | Normal |
| **Callback signature verification passes** | **Dropped from nearly 100% to about 50%** |
| Order credited | Halved (50%, matching the dimension-splitting estimate) |

Signature-verification failures had been piling up in the server's debug logs all along, but with **no alert of any kind** — a silent failure.

### Step 4: Root Cause and Remediation

The root cause is **out-of-sync multi-artifact releases**: the new SDK of channel A changed the callback signature format for a newly integrated payment method — every callback going through that payment method (about half of the package's payments) failed verification, while the server-side verification logic was not updated in sync. The client package and the server are two artifacts on two release cadences (the core thesis of the versioning system in chapter 17).

Qualifying the loss (per chapter 18's definitions): players were already charged by the channel while the game side never delivered — this is not "earning less", it is "took the money, shipped nothing", P0. Remediation order:

1. Signature-verification compatibility hotfix: accept both old and new signatures, restoring crediting for the new package first;
2. Idempotent backfill: restore orders from the channel's reconciliation transaction records, idempotency key = channel order number — the same transaction backfilled repeatedly only hits once (a direct application of settlement idempotency in chapter 10 and transaction-records-first in chapter 2's 6.3);
3. Compensation outreach: re-delivery + item compensation via mail, source labeled "system auto-grant" (the three grant paths in chapter 11's section 6);
4. Customer-support scripts and announcements in sync, getting ahead of social-media fermentation.

That day the channel's new package had about 22k payments, about 11k of them uncredited, all restored within 48 hours.

### Step 5: Backfill Checklist (echoing the retrospective backfill discipline of chapter 14)

| Backfill item | Type |
|-------|------|
| Alert on callback signature-verification failure rate (threshold >0.5%) | Monitoring gap fill — this time the anomaly was visible only via debug logs |
| Channel reconciliation daily report: channel transaction records vs server-side completed order amount, alert on difference >1% | Definitions and monitoring |
| Add one item to the release checklist: channel SDK changes must jointly test callback signature verification (chapter 17's unified release checklist) | Process |
| Register in the metric dictionary: "revenue = completed order amount; channel reconciliation difference under constant monitoring" (2.2) | Documentation |

### Three Lessons from the Case

1. **The divergence itself is the clue**. The definition gap between real-time and T+1 is standing noise, but a directional divergence (one flat, one plunging) shrinks the investigation scope from "the whole chain" to "after payment, before crediting" — explain the divergence first, then drill down.
2. **Silent failures cost more than crashes**. The verification anomalies were in fact being logged all along; what was missing was the one hop that turns a log into a signal (the stance of monitoring and alerting in chapter 13: every alert added through a retrospective is a rule that should have existed earlier).
3. **Reconciliation is the last line of defense for analysis**. Reports can only tell you "it is less"; reconciliation can tell you "where it went missing" — difference monitoring between channel transaction records and server-side orders should be standing practice, not something pulled together only after an incident.

---

## Summary

| Question | Short answer |
|------|------|
| The most common data-system failure? | Not having no data, but inconsistent definitions — every metric must have a single authoritative definition (the metric dictionary) |
| Which conclusions must defer to server-side data? | Settlement, revenue, asset-type data; client-side tracking only explains paths and experience |
| The semantics of funnel analysis? | The same player completes the steps in order (windowFunnel), not the ratio of independent per-step counts |
| The performance key to retention queries? | Build on the pre-aggregated user daily table (DWS layer); no JOINs on detail tables |
| Why must revenue analysis be tiered? | Whales contribute most revenue and distort averages; tier migration reflects trends better than static slices |
| The biggest invisible A/B testing error? | Peeking mid-test and stopping as soon as it is significant — the false-positive rate far exceeds expectations; duration and sample size must be fixed in advance |
| How is ETL idempotency achieved? | Partition overwrite + de-duplication by event seq_id; a single dirty record goes to a quarantine table without blocking the batch |
| Real-time dashboard disagrees with the T+1 report? | Inconsistent definitions (e.g. the real-time side counted unpaid orders); revenue always defers to the successful-payment fact |
| The most underestimated capabilities of an outreach system? | Rate limiting (against spamming) and attribution (against blind spends) |
| First reaction to a report revenue drop? | Explain the definition divergence before drilling down (one flat and one plunging = "after payment, before crediting"); silent failures are backstopped by alerts and reconciliation |

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01](/numerical/01.md)
- [06](/numerical/06.md)
- [08](/numerical/08.md)
