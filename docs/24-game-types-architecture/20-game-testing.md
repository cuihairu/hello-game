# 20 Game Testing and Quality Assurance

> I tend to design testing as part of the production gate rather than a standalone activity. This piece records four connected questions: **quality criteria** (which bugs cost the most), **test layering** (what each layer covers, from logic unit tests to bot sessions), **testability design** (determinism, controllable time, replaceable dependencies), and **performance acceptance** (how Chapter 19's budgets become admission gates). The QA collaboration framework draws on the knowledge-base main line and general engineering practice; this piece focuses on the specifics of game projects.
>
> **Reference books**: the methodology for test layering and testability design draws on the testing chapters of *Software Engineering at Google* and *The Art of Unit Testing*; the game-specific quality criteria and bot load-testing practice are synthesized from *Million Online* and online operations practice.

---

## 1. Quality Criteria: Which Bugs Cost the Most in a Game

The severity ordering of a general internet service (financial loss > data corruption > availability) needs two game-specific additions when moved to a game:

1. **Crashes and freezes** are always the highest level — players can tolerate mediocre gameplay, they cannot forgive a flash exit, and on mini-game platforms the crash rate directly affects the channel's rating (Chapter 03's platform constraints).
2. **Financial loss**: duplicated items, negative amounts, over-fulfillment — the cost of fixing an economy-system leak rises exponentially with how long it has spread (Chapter 02's economy system and Chapter 18's risk control both cover this from different angles).
3. **Fairness**: cheating, hacks, inconsistent adjudication — in competitive play a fairness incident is equivalent to financial loss, because what it spends is trust in the game's rules themselves.
4. **Save and progress loss**: to the player this feels exactly like "the money I paid is gone", with both customer-support cost and reputational risk running high.

Judgment: a game bug's fix window is more severe than for an ordinary service — **the version cadence is tied to marketing dates**. The quality bar on launch day, event day, and version livestream day is effectively higher; these dates need to be written into the test plan in advance, not patched in after you hit them.

The boundary also has to be stated plainly: QA is not the producer of quality, it is the measurer of quality. Quality is the output of the whole pipeline (coding standards, review, automation, gray release, monitoring); blaming QA for not testing enough because "a bug shipped" is the same attribution error as blaming monitoring for not being sensitive enough because "the service went down".

---

## 2. Process and Responsibility Boundaries: Submission, Acceptance, Regression, Release

Four quality gates in game development, each with explicit admission and exit criteria:

| Gate | Owner | Admission criteria | Exit criteria |
|------|--------|---------|---------|
| **Submission** | Dev → QA | Self-test passed, smoke checklist green, test environment ready | QA confirms it is testable; send-backs have grounds |
| **Acceptance** | Designer / Product | Feature implementation complete | Each requirement item passed one by one, number curves match the design |
| **Regression** | QA + Automation | Fix merged in | Fix verified + related cases pass, no new failures |
| **Release** | QA + Release | Version frozen, remaining defects reviewed and passed | Smoke passed, package size and permissions review passed (Chapter 17's version determinism) |

The easiest standard to decay is the **submission standard**: devs bring in versions that "roughly work", and QA gets reduced to a free test worker. The engineering fix is to automate the submission smoke checklist (Section 3.4) — "smoke fails, auto send-back" removes the standard from interpersonal negotiation.

Two game-specific handoff points: **numerical acceptance** requires designer and programmer to reconcile together (after config-table export, compare probabilities and output curves against the design values — Chapter 02's probability-verification pipeline becomes the acceptance tool here); **compliance acceptance** (real-name, age rating, privacy copy) runs through a checklist before every release — this is a high-frequency cause of channel review rejection (Chapter 18's compliance checklist).

---

## 3. Automated Test Layering: The Test Pyramid in Game Backends

### 3.1 Logic Unit Tests: Test the Rules, Not the Presentation

Settlement formulas, drop probabilities, state-machine transitions, inventory boundaries — pure logic is the home ground of unit tests. The special discipline of game backends is that **randomness and time must not be scattered** (expanded in Section 5); otherwise the logic cannot be unit-tested at all. Numerical-system unit tests must carry **statistical assertions**: draw 1,000,000 times and verify the drop-rate deviation is within the tolerance band — a single result cannot assert a probability (Chapter 02's probability-verification script is the precedent for statistical assertions wired into CI).

### 3.2 Protocol-Level Replay Testing: The Highest-Value Layer in a Game Backend

Record the communication between client and server (desensitized, then archived), then during testing replay the requests and compare the responses. It solves three problems at once:

- **Regression**: after a refactor, replay old traffic — response drift is evidence of a behavior change.
- **Protocol compatibility**: if a new and an old version changed protocol fields, replaying old recordings directly tells you whether old clients can still work (the automated hook for Chapter 04's protocol evolution and Chapter 17's multi-version coexistence determinism).
- **Reproduction**: a player complaint's operation sequence becomes a replayable recording, cutting the "cannot reproduce" excuse by more than half.

Boundary: replay testing depends on the state at recording time — player data, time, and randomness all cause replay drift — so the replay framework needs a state-injection companion (store snapshots and seeds at recording time, restore them at replay time). This is exactly where Section 5's testability design comes into play.

### 3.3 Bot Sessions: Two Birds with One Stone, But Know What It Cannot Test

Run bot players through a complete session/flow (login → matchmaking → session → settlement), serving two purposes at once:

- **Gameplay regression**: the full chain works end to end, settlement is correct, items are credited — closer to reality than interface unit tests.
- **Load-test traffic**: scaling up the bot population is a load test (Chapter 13's load-test model); the fidelity of bot behavior determines how credible the load-test conclusions are.

The pitfall is overestimating the bot's coverage: **bots can test "whether it is playable", they cannot test "whether it is fun"**. Feel, difficulty curves, pacing — these experiential qualities are beyond bots, and this part must always be left to human testing and playtest sessions. Another pitfall is that bot behavior is too idealized — real players disconnect, idle, and mis-tap; bots do none of these, so load-test conclusions skew systematically optimistic. Adding fault behaviors to bots (random disconnects, timeouts, out-of-order) is the floor for fidelity.

### 3.4 Smoke Tests and Release Gates

Smoke is the minimum passing set for every build: login, enter scene, play one match, buy something, log out — runs automatically in 5–10 minutes. Its role is a **gate, not a guarantee** — a green smoke does not mean good quality, only that it is "worth testing further". There are two hook points: after the CI build (blocking a bad build from reaching submission) and before release (the last gate in Chapter 17's release pipeline). Keep smoke cases extremely restrained — the urge to cram cases into it will inflate it from 5 minutes to 1 hour, and then everyone starts bypassing it.

---

## 4. Compatibility Testing: Device Matrix and Platform Differences

### 4.1 Device Matrix: Derive It Backward from the User Distribution, Not from Vendor Test Devices

The criteria for building the matrix: **top devices from the online user distribution + form-factor coverage (flagship / mid-range / low-end) + OS/container version coverage**. A common mistake is using the flagship phones in the office as the acceptance baseline — crashes, timeouts, and OOM on low-end devices cannot be reproduced on flagships. The first-package monitoring in Chapter 19 that cuts by device-tier percentiles turns right around and becomes the basis for matrix updates: once a device's share after P90 rises past the threshold, it enters the matrix.

### 4.2 Platform Differences: Three Containers, Three Tempers

The platform constraints laid out in Chapter 03 map one-to-one on the testing side: iOS background suspension and review rules, Android fragmentation (vendor ROMs customizing background and permissions), and mini-game container package-size limits and missing APIs. The **attribution ruling** for a compatibility bug is the first step in troubleshooting:

- **Engine layer**: rendering anomalies on a specific GPU/driver — the fix is an engine version change or a workaround pattern, verified by a minimal repro set from the matrix.
- **Asset layer**: texture formats and audio encodings unsupported on specific hardware — the asset pipeline produces by tier at release time (Chapter 19's LOD and texture tiering).
- **Code layer**: timing issues that only surface on a real device (returning from background, an incoming call interrupt, low-memory warning) — automation cannot do this; it goes into the real-device test checklist.

---

## 5. Designing for Testability: Determinism, Time, Dependencies, Replay

Whether server code is testable is designed in. Four design disciplines:

1. **Deterministic randomness**: in-battle randomness uses an independent random source, with the seed written into the battle log (Chapter 02 Section 3.3's full discipline). Reproducibility is the shared prerequisite for replay testing, adjudication, and bug reproduction — the best cure for "I cannot reproduce this bug" is replaying the same seed.
2. **Controllable time**: time is a dependency, not an environment. Every scattered `time.Now()` call in business code is a time bomb that "can only be tested after waiting until tomorrow" (bugs at the exact moment an event starts, cross-day settlement, season switches all live here). Inject a clock interface; turn the clock in tests.
3. **Replaceable dependencies**: external dependencies like payment, platform login, and push go through interfaces in code, and testing and pre-release environments connect to sandboxes. Channel sandbox behavior differs from production (especially payment callbacks) — a sandbox pass does not mean a production pass. Do one more small-value real payment as a spot check in the production environment.
4. **Replayable sessions**: seed (randomness) + input sequence (operations) + state snapshot (start) = the complete reproduction trio. This is also the reuse on the testing side of Chapter 04's frame-sync replay and Chapter 03's snapshot backstop: the same mechanism, normally a gameplay feature, a forensics tool when something goes wrong.

Judgment: the common thread of these four is **pushing uncertainty out of the code to the boundaries**. Randomness, time, and external services are naturally uncertain; business logic should not inherit that uncertainty, otherwise every test you write requires first taming the environment.

---

## 6. Performance Acceptance: How the Budget Sheet Becomes a Gate

Chapter 19 broke performance into four ledgers; this section turns them into acceptance gates:

| Budget | Acceptance gate | When to run |
|------|---------|--------|
| First-package time | Target device-matrix P50/P90 percentiles met | Before version release, run automatically by bots |
| Package size | Main-package / whole-package red line (platform rules prevail) | Every CI build |
| Memory watermark | No continuous growth in N hours of real testing under high-pressure scenarios | Before version release, low-end devices first |
| Server capacity | Load-test pass line (e.g. 3000 players per machine, P95<100ms, Chapter 13's criteria) | Before major versions + after architecture changes |

Two disciplines: **gates must be written into CI and the release checklist**, not into the wiki — a gate written into the wiki gets quietly bypassed by schedule pressure; **performance regression needs a baseline**, comparing percentiles between each version and the previous one, and locating drift before merging when it exceeds the threshold (same criteria as the server-interface load-test baseline, Appendix A4).

---

## 7. Code Examples

The following code blocks are minimal demonstration implementations of this chapter's design decisions (not excerpted from real projects): an injectable clock, a deterministic random source, and a protocol replay comparator. Code blocks within a section, when merged, can be compiled with `go vet` and `go build`, and are covered by the repo-wide code-block regression tests.

**Injectable clock** — making "what time it is now" a dependency (Section 5 discipline 2):

```go
// Clock 抽象时间源：生产用系统时钟，测试用假时钟拨表
type Clock interface {
    Now() time.Time
}

type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now() }

// fakeClock 只在测试代码里用：手动推进，跨天结算/活动切换的时序 bug 全靠它提前暴露
type fakeClock struct {
    current time.Time
}

func (c *fakeClock) Now() time.Time { return c.current }
func (c *fakeClock) Advance(d time.Duration) { c.current = c.current.Add(d) }

// 会话超时判定：不直接调 time.Now，才能被单测覆盖
func sessionExpired(c Clock, lastSeen time.Time, ttl time.Duration) bool {
    return c.Now().Sub(lastSeen) > ttl
}
```

**Deterministic random source** — same discipline as Chapter 02 Section 3.3: the seed determines the sequence, and the sequence can be replayed (the demo uses the simplest mixing algorithm implementable across languages):

```go
// DeterministicRand 确定性随机源：相同种子产生相同序列（回放/裁决的前提）
type DeterministicRand struct {
    state uint64
}

func NewDeterministicRand(seed uint64) *DeterministicRand {
    return &DeterministicRand{state: seed}
}

// next 用 splitmix64：无锁、无依赖、跨语言可复现（客户端用同一算法可校验服务端序列）
func (r *DeterministicRand) next() uint64 {
    r.state += 0x9e3779b97f4a7c15
    z := r.state
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9
    z = (z ^ (z >> 27)) * 0x94d049bb133111eb
    return z ^ (z >> 31)
}

// Roll 先决 d20：返回 [0, n) 的确定性结果
func (r *DeterministicRand) Roll(n int) int {
    return int(r.next() % uint64(n))
}
```

**Protocol replay comparator** — the minimal ruling skeleton for Section 3.2's replay testing (recording parsing omitted, only the comparison logic shown):

```go
// Record 一条脱敏后的录制：请求与当时的服务端响应
type Record struct {
    Seq   int64
    Req   string
    Want  string
}

// Replay 重放录制并比对响应，返回不一致的序号列表
// mismatch 非空 = 行为漂移（回归）或老协议失配（兼容性判定），哪个取决于回放的基线版本
func Replay(recs []Record, handle func(req string) string) []int64 {
    var mismatch []int64
    for _, rec := range recs {
        if got := handle(rec.Req); got != rec.Want {
            mismatch = append(mismatch, rec.Seq)
        }
    }
    return mismatch
}
```

---

## 8. Practical Advice

An action list by role:

- **Server developers**: when reviewing a new module, go through Section 5's four disciplines (randomness / time / dependencies / replay) — testability is cheap at review time and expensive at integration time. When writing settlement logic, add statistical assertions while you are at it.
- **QA**: make automating the submission smoke the first goal; recalibrate the device matrix once a quarter against the online distribution; write performance gates into the release checklist, not the wiki.
- **Backend leads**: after every protocol change, run a round of old-version recording replay (Section 3.2), automate compatibility ruling, and do not rely on humans cross-checking field tables (Chapter 17's version determinism).
- **Coordinating with the client**: put client crash rate, first-package percentiles (Chapter 19), and server load-test reports into the same version quality report — quality is one ledger settled by both ends (Chapter 19 Section 6's same conclusion, still holds on the testing side).

---

## 9. Common Pitfalls Summary

| Pitfall | Description | Mitigation |
|------|------|------|
| Submission standard relies on personal favors | Submit when it "roughly work", QA reduced to a test worker | Automate smoke; auto send-back on failure |
| Randomness/time scattered in business code | Timing and probability bugs can only be caught "when they happen" | Section 5's four disciplines, enforced at review |
| Only testing flagships | Low-end crashes and timeouts all slip through | Derive the device matrix backward from the online distribution |
| Overestimating bot coverage | Feel and pacing problems are never caught by bots | Leave experiential quality to human playtests |
| Idealized bot behavior | Load-test conclusions skew systematically optimistic | Add disconnect/timeout/out-of-order fault injection to bots |
| Replay without state injection | Replay drift, making replay testing exist in name only | Store snapshots and seeds at recording time |
| Performance gates written into the wiki | Quietly bypassed by schedule pressure | Gates go into CI and the release checklist |
| A sandbox pass taken as a production pass | Payment callbacks etc. differ between sandbox and production | Spot check with small-value real payments in production |

---

## 10. Summary

This chapter splits testing into a four-layer production line: unit tests govern the rules, protocol replay governs behavior drift and protocol compatibility, bot sessions govern the full chain and load, and smoke governs the gate; it then turns testability itself into four design disciplines — deterministic randomness, controllable time, replaceable dependencies, and replayable sessions. The throughline carries on from Chapter 19: **quality is not tested in, it is the output of design and the pipeline; how deep the testing can go depends on how cleanly the code handles uncertainty**.

> The next chapter moves to [Chapter 21: Audio and Art Pipeline Collaboration](/24-game-types-architecture/21-art-audio-pipeline): how assets get from art tools to the engine, and what the server does and does not own in this pipeline.

---

## 11. Practical Case: Investigating an Escaped Timing Bug That "Could Only Be Caught When It Happened"

> The case is a demonstration example (not excerpted from a real project), with numbers rounded for simplicity. It takes Section 2's four gates, Section 3's four-layer pyramid, Section 5's four testability disciplines, and Section 9's pitfalls table into deep water: answering layer by layer, "all four layers green, so why did the timing bug still ship on the 4th release" — this is the time-dimension investigation of the testing system, and also the full unfolding of the "randomness/time scattered in business code" pitfall.

**Background and symptoms**: over the past six months there have been **4** timing-related bugs — 2 season switches, 1 limited-time event start, 1 daily shop refresh — all shipped sick, with a 100% escape rate, and all discovered by players at the exact moment of a day boundary or event boundary. What hurts more is fix verification: each time you have to wait for the real calendar to cross days to confirm, averaging **3** rounds × **24h** = **72h** per incident, and **288** hours of cumulative verification across the 4. Yet QA's regression report was green every time: submission passed, acceptance passed, regression passed, smoke passed — four gates, all green the whole way, and the incidents shipped anyway.

### Step One: Symptoms and Criteria — Two 100% Values Are Both True, Because the Denominators Differ

Three criteria laid side by side:

- **QA regression report**: regression pass rate **100%** — the denominator is "the written case set"
- **Online incident criteria**: 4 timing-related escapes, escape rate 100% — the denominator is "all paths along the timeline"
- **The denominator gap** is **31** cases: code scanning found 31 cross-day judgment paths, and not one of them had ever entered the case set

A 100% pass rate and a 100% escape rate are not contradictory: a ruler with no time scale measures everything as full — the measuring ruler itself in Section 1's "QA is the measurer, not the producer" is missing a dimension.

### Step Two: Layered Attribution — Walking the Pyramid Layer by Layer, Each with a Time Blind Spot

First scan the code side: **147** direct `time.Now()` calls, of which **31** are cross-day judgment paths (**21%**). Reconcile the **4** pyramid layers one by one:

```text
单测层   31 条跨天路径全部依赖真实时钟，测试无法快进——覆盖 0 条
回放层   录制快照是「当时时刻」的即时态，没有「快进到 00:00」的注入点——覆盖 0 条
机器人层 bot 会话生命周期 15 分钟，从不经历跨天——覆盖 0 条
冒烟层   冒烟 5 分钟跑完，天然不覆盖零点边界——覆盖 0 条
合计     31 条跨天路径，四层覆盖率 0 / 31
```

The ledgers converge: the four layers' coverage of cross-day paths is **0** / **31**; smoke only runs **5** minutes (within Section 3.4's 5–10 minute window), bot sessions **15** minutes — none reach midnight. This is not that too few cases were written, it is that none of the four layers has a "time fast-forward" injection point.

### Step Three: Root Cause — What Was Missing Was Not Cases, But an Injection Point for the Time Dependency

1. **Direct cause**: all 31 cross-day judgment paths read the system clock directly, with not one that could be turned by a test — judgments at "the exact moment an event starts, cross-day settlement, season switch" can only wait for the calendar to get there
2. **Mechanism cause**: in Section 5's **4** design disciplines, "controllable time" ranks **2nd**, but it stopped at a review recommendation — no gate blocking direct calls; Section 9's pitfalls table item **2** (of **8** items) had long stated "timing and probability bugs can only be caught when they happen", written into a table but not into the process
3. **Deep cause**: among Section 2's **4** gates, the regression exit criterion is "related cases pass" — the related case set had no cross-day cases, so the green was earned with a clear conscience; Section 1's version cadence carries marketing dates, and the closer the date, the less anyone dares to write "wait until tomorrow" into the plan — the criteria missing a dimension, and schedule pressure stomps right through it

### Step Four: Handling and Backfill

Handling ordered by "benefit / cost":

1. Clock-injection refactor: `time.Now()` direct calls **147** → **0** (lint gate blocks direct calls, business code may only depend on the Clock interface — the shape in Section 7's code examples)
2. fakeClock turn-the-clock to backfill **31** cross-day unit tests, one-to-one with the 31 paths
3. Timing regression into CI: turn the clock and run a round per build, verification cycle **72h** → **10** minutes (**432×**)
4. Add a "time-dimension coverage" criterion to the quality report, reconciled with the client performance report on both ends (Section 8's same conclusion)

Re-check: over the next two versions, timing-related escapes **0** (previously 4); cross-day cases entered the regression exit criteria, with a single verification round stable at 10 minutes.

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill item | Owner | Completion criteria |
|--------|------|---------|
| `time.Now()` direct calls into the lint gate, business code only via the Clock interface (echoing Section 5 discipline 2 and Section 7's code examples) | Server | CI interception effective, direct calls at zero |
| Four testability disciplines into the module review checklist (echoing Section 8's server-developer item) | Server / Review | New-module reviews have records |
| Cross-day / event-boundary cases into the regression exit criteria (echoing Section 2's regression gate admission/exit) | QA | Related case set includes the timeline dimension |
| Time-dimension criterion into the version quality report (echoing Chapter 19's both-ends reconciliation) | QA / Data | Report template redesigned |

### Three Lessons from the Case

1. **Time is not an environment, it is a dependency**. Section 5 discipline 2 verbatim — every scattered `time.Now()` call means tests can only use the calendar as a fixture; it is the testing face and the production face of the same coin as Chapter 07's case "time is not a measurement, it is an input"
2. **Every layer of the pyramid can share the same structural blind spot**. Unit tests, replay, bots, and smoke all green and still 0/31 — layers going green independently does not fill in the missing time dimension for each other; adding cases cannot fix a layer that lacks the injection point
3. **A 100% pass rate and a 100% escape rate can both be true**. Section 1 says QA is the measurer: if the denominator is not on the ruler, the more precise the measurement the more misleading — the testing version of Chapter 13's "all-green monitoring" criteria lesson

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [19-client-architecture](19-client-architecture.md)
- [06](/client/web/06.md)
