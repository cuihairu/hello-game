# 14 Development Organization and Project Management

> In project collaboration I have seen role division, requirements and documentation workflows, version milestones, change management, cross-functional collaboration, outsourcing, and handoffs all directly affect delivery. Organizational constraints outside technology can just as well decide a project's fate.
>
> Reference books: *Online Game Core Technologies and Practice* (Kenji Nakajima), and the process perspective of *The Phoenix Project*.

Game development is not only a technical problem but an organizational collaboration problem. Team collaboration efficiency, code quality control, project handoff norms — these "soft powers" often decide a project's fate. *Million Online* points out that many technically excellent teams ultimately fail not because the technology was weak but because management was chaotic.

The management challenge of game R&D lies in its **special nature**: requirements change frequently (driven by player feedback), features are highly coupled (experience completeness), quality demands are extremely high (low player tolerance), and content and technology run as dual pipelines in parallel (designers produce designs, artists produce assets, programmers produce features — none can be missing). Traditional software project management methods cannot be applied directly; they must be adapted to the characteristics of game development.

This chapter focuses on organizational collaboration itself. The companion processes on the technical side (release management, incident response) are in Chapter 13; the config-table pipeline is in Chapter 17.

---

## 1. Role Composition of a Game R&D Team

### 1.1 The Four Major Functions

A typical game R&D team is composed of four major functions:

| Function | Core output | Relation to backend technology |
|------|---------|----------------|
| Design | Design docs, numerical tables, level configs | The demand side + config producer |
| Programming | Client/server code, tools | The system implementer |
| Art | Concept art, models, animation, VFX, UI | The asset producer (enters the asset pipeline) |
| QA | Test cases, defect reports, acceptance | The quality gatekeeper |

Where backend engineers most easily develop a cognitive bias: **designers and artists are not "the demanding client side", they are colleagues on the content production line**. From greenlight to launch, a new gameplay feature usually needs designers to produce the plan and numbers, programmers to implement the logic, artists to produce the presentation assets, QA to verify, and config to enter the tables — five pipeline stages, and a delay in any one delays the whole. Understanding this pipeline is what lets a backend engineer correctly answer questions like "why is this feature scheduled three weeks out": the bottleneck may not be lines of code but waiting on art assets or numerical validation.

### 1.2 Breakdown of Designer Roles

Designers are the bridge between creativity and implementation. A typical designer team structure:

| Role | Core responsibility | Skill requirements | Deliverables |
|------|---------|---------|--------|
| Lead designer | Gameplay framework, team coordination | Global vision, decisiveness | System framework doc |
| System designer | Feature design, flow design | Logical thinking, documentation skill | Feature design docs |
| Numerical designer | Numerical balance, economy systems | Math ability, data analysis | Numerical tables, formulas |
| Level designer | Level design, difficulty curves | Creativity, player psychology | Level configs, maps |
| Event designer | Event design, operations support | Creativity, data analysis | Event configs, rules |
| Narrative designer | Story design, worldbuilding | Literary skill | Script docs, dialogue |

Each role maps to five capability dimensions: creativity, numbers, systems, technical understanding, and data. In reality most designers excel at only 1-2 of them, and the key to team management is **getting people of different strengths to complement each other** — pair the numbers-strong with the systems-strong and have them review each other's output.

### 1.3 Breakdown of the Programming Team

Common divisions on the programming side and their collaboration boundaries:

| Role | Core responsibility | Key collaboration points |
|------|---------|-----------|
| Server programmer | Logic, storage, network | Protocol with the client, numerical validation with designers |
| Client programmer | Presentation, interaction, optimization | Protocol with the server, asset intake with art |
| Engine/platform programmer | Engine modification, toolchain, SDK | Supporting both business teams |
| Tools/ops programmer | Editors, GM tools, CI/CD | Serving designer and ops efficiency |

One often-neglected role is the **tools programmer**: designers need level editors and numerical simulators, QA needs automated testing tools, operations needs a GM backend. In teams that underinvest in tools, all efficiency losses get passed to the business programmers (programmers hand-configure data for designers, QA tests everything manually). Mid-to-large teams standardize on 10%-20% tools staffing.

---

## 2. Requirements and Design Documents

### 2.1 Feature Design Document Conventions

The feature design document is the "contract" between designers and developers. A developable design document should contain:

```text
功能设计文档结构：
├── 概述：功能目标、目标用户、成功指标
├── 玩法设计：流程图、规则说明、边界情况
├── 数值设计：数值表、公式、与现有系统的关系
├── 界面/表现：原型图、表现需求（供美术）
├── 异常处理：掉线、并发、边界值的行为定义
├── 数据需求：埋点事件、指标定义（供分析，见第 12 章）
└── 验收标准：QA 可执行的验收用例
```

Of these, "**Exception handling**" is the most frequently missing section, and the one backend engineers need most — what happens when a player disconnects mid-feature? What if reward granting fails halfway through? What if two players trigger the same limited-quantity event at the same moment? Whatever designers do not write and programmers do not ask about turns into production failures after launch. The routine backend move in design reviews is to chase down each exception branch, one by one.

**Key principle**: a design document is not a "write-it-and-toss-it" document but a "living document" that must be maintained throughout development. When development reveals a design is unreasonable, update the document promptly rather than settling it with a verbal exchange — otherwise three months later nobody can answer "why was the code written this way".

> **Pitfall**: the most common collaboration accident is "starting development before requirements are clear" — a few spoken sentences and then code, and the result mismatches designer expectations. Recommendation: insist on "document first, development second"; urgent requirements may simplify the document, but the exception-handling and acceptance-criteria sections must not be omitted.

### 2.2 The Collaboration Workflow for Numerical Tables

Designers' numerical output must eventually become config that takes effect in-game, and the quality of collaboration along this chain directly determines iteration speed:

1. **Designers maintain numbers in tables** (Excel / online sheets), with table structure per the config pipeline's schema conventions (field names, types, enum values fixed)
2. **Validation rules built into the tables**: illegal values (negative prices, out-of-enum) get flagged red in the table itself, rather than erroring out when the program loads
3. **Automated export pipeline**: table → export tool → runtime format (JSON/binary), with humans never touching intermediate formats
4. **Test environment first**: numerical changes go to the test server for validation before production (the gray release and rollback of the Chapter 17 config pipeline)

The common failure along this chain is "designers directly changing production config leaving no trace" (Chapter 13 lists this as a hard-to-investigate class of config incident). The organizational fix is permissions and process: changes to production config go through approval + automatic recording of who changed what and why.

### 2.3 The Technical Review Mechanism

Major features should have a technical review before work starts, with explicit inputs and outputs:

- **Input**: the design doc, a description of the current state of relevant modules, candidate alternatives
- **Review question list**: what is the impact on the existing architecture? where are the performance bottlenecks (capacity derivation in Chapter 13)? is the data structure extensible? how does it degrade on failure? is event tracking covered?
- **Output**: solution conclusion, risk list, task-splitting suggestions

The value of a review is not only "gatekeeping" but **knowledge sharing** — the people in the review sync their understanding of the system, so whoever takes over or maintains it later is not left groping. Review records (the solution, the rationale, the rejected alternatives) should be archived; they are the most valuable documents in Section 9's "project handoff".

---

## 3. Agile Development Practice

### 3.1 Adapting Scrum for Games

The differences between game development and traditional software development dictate that Scrum needs adaptation:

| Dimension | Traditional software | Game development |
|------|---------|---------|
| Requirement stability | Relatively clear | Changes frequently (player-feedback driven) |
| Delivery unit | Features deliverable independently | Features highly coupled (experience completeness) |
| Acceptance criteria | Requirements met suffices | "Runs" does not equal "fun" |
| Quality demands | Usability | Subjective qualities like feel and pacing |

**Adaptation strategies**: shorten the Sprint cycle (1-2 weeks), increase review frequency, establish an experience-review mechanism, and raise the priority of technical debt (games are highly coupled, so debt interest is high too).

### 3.2 Sprint Planning Practice

The core of the Sprint planning meeting is **setting the goal and splitting tasks**:

1. Sprint goal confirmation (15 minutes): revisit the product vision, confirm the Sprint goal
2. User story review (45 minutes): review user stories one by one, confirm story-point estimates
3. Task splitting (45 minutes): split stories into tasks, estimate hours, assign owners
4. Plan confirmation (15 minutes): confirm the Sprint backlog and risk points

**User story template**:

```markdown
## 用户故事 #1234
作为 **一名玩家**，
我想要 **查看自己的战绩统计**，
以便 **了解自己的游戏表现**。

### 验收标准
- [x] 能够查看最近 100 场战斗记录
- [x] 能够查看胜率、击杀数等统计
- [x] 数据实时更新（延迟 < 5 秒）

### 涉及方
- 策划：@系统策划（验收体验）
- 服务端：战绩数据接口 + 存储方案
- 客户端：战绩界面 + 表现
- 美术：界面资源（排期中）

### 故事点估算：5
```

The "stakeholders" row in the template is specific to game projects: one user story spans design, programming, and art across multiple functions; aligning all four parties at planning time saves far more than discovering at integration that art assets were never scheduled.

**Expand acceptance criteria down to implementation level**. At review time all three acceptance boxes were unchecked — not because they cannot be done, but because behind each one sits a design question that must be answered first: "the most recent 100 matches" means details are kept for only 100; what about earlier ones? Which metrics does the "etc." in "win rate, kills, etc." actually include? "Latency < 5 seconds" counted from when? Ticking boxes without expanding is false acceptance; only after expanding into implementation-level design, with every item given a defined criterion and measurement, does ticking mean anything. Staying with this battle-record query story, the expansion yields:

**Data structure — details and aggregates in two layers**. The detail layer serves only the "most recent 100 matches" query window: battle records (match ID, mode, win/loss, kills/deaths/assists, score, end time) are written to a Redis List, with LTRIM after each LPUSH truncating to 100 entries; full details are archived into the offline data warehouse for Chapter 12's analytics criteria — online storage answers only to the query window, not to historical analysis. The aggregate layer is one row of cumulative counters per player (total matches, wins, kills, deaths, assists); win rate is not stored but derived as "wins / total matches" — a later criteria change (say, excluding forfeits) just edits the formula, no need to rewrite historical data.

**API — three endpoints matching three acceptance criteria**. The detail-list endpoint (player ID + cursor pagination, the server guaranteeing at most 100 rows returned), the stats endpoint (reads the single aggregate row), and the real-time update (after settlement completes, the server actively pushes a notification; the client pulls details and stats upon receipt). The point of the push-pull combination shows up in acceptance: a lost push does not affect correctness, it only delays this one refresh — saving traffic versus "client-side periodic polling" while also converging the "latency < 5 seconds" measurement point onto the server.

**Update path — asynchronous decoupling with an idempotent backstop**. Battle settlement cannot synchronously write battle records inside the battle server (one more storage failure point on the settlement path and the battle server's availability is held hostage by record storage); it flows asynchronously through a message queue:

```text
战斗服结算 ──► 消息队列 ──► 战绩服务 ─┬─► 明细 List（LPUSH + LTRIM 截断 100 条）
             （以对局 ID 幂等）       ├─► 聚合行原子自增
                                     └─► 推送网关 ──► 客户端收到通知后拉取
离线归档：明细 ──► 数仓（第 12 章分析口径，与在线查询解耦）
```

**Boundaries — exception branches asked through at review, not turned into failures after launch** (the concretization of Section 2.1's "exception handling is the most-missing section" on this story):

- **Duplicate settlement**: the message queue is at-least-once delivery; the same match's settlement message may be redelivered — both the aggregate increment and the detail write use the match ID as the idempotent key, otherwise one redelivery over-counts a win
- **Out-of-order arrival**: reconnection and compensating settlement make messages arrive out of order — aggregates are pure counters, order-independent; details are displayed sorted by settlement time, not by message arrival order
- **Detail-aggregate drift**: the two paths write independently — momentarily inconsistent in normal operation, permanently drifted on failure — a scheduled reconciliation task recomputes the aggregate from the most recent 100 details, alerts when deviation exceeds a threshold, and repairs with the recomputed result
- **Latency criterion**: "< 5 seconds" runs from the moment the server finishes settlement until the stats endpoint can read the new value, measured by timestamp difference — so QA can write automated assertions (the same idea as Chapter 20's performance acceptance gate); if it instead ran from "the player sees the settlement screen", the measurement point would land on client rendering and acceptance could not be automated
- **The scope of "etc. stats"**: the "etc." inside acceptance criteria is the most dangerous word — whether PVP win rate merges into PVE matches, whether cross-mode totals are combined, must be asked and settled at review and written into the acceptance criteria, otherwise post-launch rework is guaranteed

Back to the template: the three acceptance criteria can now be ticked — not because the code is written, but because each item now has a definite answer, a definite measurement method, and definite boundaries, and QA receives executable acceptance cases. **Writing acceptance criteria so they are executable is the biggest contribution a programmer can make to "aligning the four stakeholder parties".**

### 3.3 Daily Standup and Experience Review

The daily standup stays within 15 minutes, focused on three questions: what was finished yesterday, what is planned today, what is blocked.

**The standup slot specific to game development is the experience review** (about 3 minutes): demo a newly completed feature, gather team feedback, record improvement points. This is an important difference between games and traditional software development — code that runs does not mean the feature is fun; the team playing it first is the cheapest quality assurance.

### 3.4 Sprint Retrospective and Improvement

The Sprint retrospective is the core mechanism of continuous improvement. Each retrospective should produce 2-3 concrete improvement actions, executed in the next Sprint and checked in the one after:

```text
Sprint 回顾改进项跟踪：
├── 问题1：代码评审延迟
│   ├── 改进措施：建立评审 SLA（24 小时内完成）
│   └── 检查时间：Sprint 13 回顾
├── 问题2：测试环境不稳定
│   ├── 改进措施：增加测试环境监控（第 13 章监控体系）
│   └── 检查时间：Sprint 13 回顾
└── 问题3：需求变更频繁
    ├── 改进措施：建立需求冻结期（Sprint 中段后不接受新需求）
    └── 检查时间：Sprint 14 回顾
```

> **Pitfall**: the most common agile mistake is "form without substance" — standups turn into rote status reports, retrospectives into complaint sessions. The core of agile is "continuous improvement", not "going through the motions"; improvements without tracking and rechecking make the retrospective nothing but an emotional vent.

---

## 4. Version Milestones and Stage-Gate Management

The Sprint is a week-level cadence; above the Sprint there is a month-level cadence: **version milestones**. The typical stage-gates of game R&D:

| Stage | Gate deliverable | Server-side work focus | Common delay/termination causes |
|------|---------|--------------|-----------------|
| Prototype | A playable demo of core gameplay | Validate technical feasibility: frame-sync determinism, sync-model selection (selection basis in Chapter 1's game types and backend differences) | "Fun" validation fails — terminating a project during prototyping is a normal outcome, not a failure |
| Vertical slice | A stretch of complete content at mass-production quality | Fix the architecture skeleton, protocol framework, storage plan | Quality bar not aligned (demo polish ≠ mass-production standard) |
| Production | Full content rollout | System development, capacity derivation (Chapter 13), toolchain | Insufficient content throughput, runaway inter-system coupling |
| Wipe test (CBT) | Several rounds of limited testing | Wipe data-cleanup scripts, stress testing, ramp-up scale-out | Server capacity, crash rate, retention below target |
| Open beta / launch | Formal operation | On-call system, launch scale-out, hot-update pipeline | Compatibility, payment reconciliation, platform review |

The meaning of stage gates: **offer the option to stop before sunk costs grow large**. Killing a project during prototyping saves money; killing it on the eve of open beta is a disaster. Server engineers need to understand two companion disciplines:

- **Code standards differ between prototype and production**. Prototype code is allowed to be "discard after validation" (quickly hack together a playability check); only production code demands maintainability. But the technical conclusions validated during prototyping (determinism test results, measured capacity ceilings) are formal inputs to production — document them: throw away the code, not the conclusions
- **Wipe tests have organizational accompaniments of their own**. A wipe means player investment resets to zero, so prepare in advance: data snapshot retention (needed for customer support and dispute tracing), honoring compensation commitments (a promise of "wipe compensation delivered on the live service" must be honored, or stated upfront), and ramp-up pacing (small invite waves → gradual expansion, capacity scaled ahead of the ramp rather than all at once)

### 4.1 The Reality of Milestone Estimation

"When does this version ship?" is a question every role must answer. Server-side estimation experience:

- **Integration and testing take over 1/3 of a feature's schedule**. Estimating by coding time alone guarantees slippage — protocol integration, exception-branch testing, multi-platform compatibility are all real costs
- **Give a range and preconditions, not a point**: "two weeks, provided the numerical tables are locked by day 3 and art assets don't come back for rework". Surfacing unmet preconditions early beats explaining at the deadline
- **Reserve an integration buffer**. With multiple systems developed in parallel, the time to bring them together always exceeds the sum of the parts; the rule of thumb is to reserve 20%-30% of the total feature estimate for integration

---

## 5. Requirement Change Management

Game R&D sees requirement changes more often than typical software (player feedback, competitor moves, and data performance all drive change); the management goal is not to "eliminate change" but to **make change costs visible and tiered**:

| Change level | Example | Handling |
|---------|------|---------|
| Copy level | UI text, prompts, announcements | Change directly, go through normal test submission |
| Numerical level | Drop rates, growth curves, shop prices | Change config tables via the config pipeline (Chapter 17), numerical designer runs regression validation |
| System level | Drop-system structure, matchmaking rules, settlement flow | Full process: impact assessment → technical review → scheduling |

The core move of change management is **quantifying cost**. When a designer says "change this reward to mail delivery", the most valuable programmer answer is not "yes" or "no" but: "The reward path already has a mail channel — half a day for the config change; but the claim table needs a new field, which involves server-merge compatibility — two days total; suggest next version." **Once cost is quantified, the change stops being 'the programmer finds it annoying' and becomes a product decision** — the designer weighing real costs is what healthy collaboration looks like.

Freeze-period discipline pairs with tiering: no system-level changes after the Sprint midpoint (copy and numerical levels stay unrestricted, keeping iteration flexible); system-level freeze 2-3 weeks before a version release (release-period discipline, corresponding to Chapter 17's requirement freeze). Both freeze periods freeze system level only — teams that freeze everything outright usually get forced into private unfreezes, and the discipline backfires.

> **Pitfall**: the two degenerate extremes of change management — "take whatever comes" (the team is chased by changes, Sprint goals never completed, morale collapses) and "everything through the heavy process" (fixing a typo takes a week of approvals, designers start bypassing the process to quietly ask programmers, and the process exists in name only). **The point of tiering is to let most changes take the light path, reserving the heavy process for system-level changes**.

---

## 6. Cross-Functional Collaboration

### 6.1 The Frontend-Backend Collaboration Workflow

Frontend-backend collaboration is the most frequent cross-functional collaboration in game development. Standard flow:

1. **Requirement review**: designers present the requirement, the client assesses UI implementation, the server assesses interface and data design
2. **Protocol design**: the server produces the protocol doc (message definitions, field semantics, error codes — format and compatibility rules in Chapter 4), the client confirms
3. **Parallel development**: the server implements the interface first, the client builds presentation against Mock data
4. **Integration**: on-device integration, fixing protocol-understanding gaps
5. **Testing**: functional testing, performance testing, compatibility testing

The "**Mock data first**" step deserves emphasis: once the protocol is defined, the client is no longer blocked by server progress, and running both sides in parallel can compress the total schedule by over 30%. This requires the protocol doc to precede code — teams that write code first and patch docs later never get the parallelism dividend.

> **Pitfall**: the most common cross-team problem is "interface docs not updated" — the server changed the protocol without syncing the doc, the client developed against the old doc, and the mismatch surfaces at integration. The fix is **docs as code**: define the protocol in Protobuf or another IDL (Chapter 4), generate the docs from the IDL — changing the protocol necessarily changes the IDL, so the docs can never go stale.

### 6.2 Designer-Programmer Collaboration

The key to designer-programmer collaboration is **bidirectional translation**:

- **Designer → programmer**: the design doc must spell out "exception branches"; numbers must come with formulas, not just result tables (the programmer needs to know "why HP at level 10 is 8500" to validate it)
- **Programmer → designer**: translate technical constraints into language the designer can decide with — not "AOI complexity is O(N×M)" but "at 500 players on screen, the server's per-frame cost is 25x that of 100; a same-screen cap of 200 is recommended"

The high-conflict scenario is "the effect the designer wants is technically expensive". The healthy path: the programmer gives quantified cost (performance numbers, schedule numbers, risk description) → the designer reweighs with the cost in hand → the lead designer makes the call. The dangerous paths are the programmer flatly saying "can't be done" (closing the space for trade-offs) or quietly doing it anyway (planting a performance landmine).

### 6.3 Resolving Technical-Solution Conflicts

The process for resolving technical-solution conflicts:

1. **Problem identification**: record the point of conflict and each side's position (in writing, to avoid "you're wrong"-style arguments)
2. **Solution comparison**: each side presents pros and cons, aiming at comparable dimensions where possible (performance data, schedule, maintainability)
3. **Decision mechanism**: the technical lead decides, escalating if necessary. **Execute uniformly after the decision** — dissent may be kept, but must not block execution
4. **Retrospective**: verify how the decision played out, and distill it into the team's architecture decision records (ADR)

"Whoever argues loudest wins" and "if we can't agree, do both" are the two common degenerations. Clear decision authority (architect / technical lead) + decision records that leave a trail are the baseline guarantee that conflict does not burn out in infighting.

---

## 7. Outsourcing and Hybrid Team Management

Art outsourcing is an industry norm (concept, modeling, animation, and VFX lean heavily on external capacity); organizationally, outsourcing must be managed as **an external node on the pipeline**, not as "pay the money and wait for delivery":

- **Specs first**: write acceptance criteria into a doc — poly count, texture specs, naming conventions, animation frame counts, delivery format. Outsourcing without clear specs guarantees rework; the spec doc is maintained by internal art or a technical artist (TA) and updated in step with engine/pipeline upgrades
- **Sample confirmation before batch**: deliver 1-2 samples first to confirm style and spec, then batch-produce. Skipping samples and producing 100 non-conforming assets is the most expensive outsourcing accident
- **Automated pipeline validation**: outsourced delivery → script auto-checks specs (naming, dimensions, poly count) → into the library. Teams that check specs by hand drown in delivery volume during mass production
- **Permission boundaries**: outsourced staff do not touch production environments, player data, or the core code repo; internal tools give outsourcers separate accounts, least privilege, and operation trails (consistent with Chapter 18's data-security requirements)

A server-side special case is **outsourcing GM tools or the operations backend**. Some teams outsource these "non-core" systems; the boundary that must be held: for tools built by outsourcers, deployment and the account-permission system stay under internal control (no backdoor accounts brought in by the outsourcer), and code acceptance includes a security review (Chapter 18's audit requirements). Tools can be outsourced; **the right to access player data cannot be**.

> **Pitfall**: the most common outsourcing pit is the combination of "lowest bid wins + missing spec docs" — rework costs far exceed the price difference saved, and the rework window lands exactly on the mass-production critical path. Outsourcing saves labor cost; manage outsourcing badly and the savings get repaid double in internal coordination time.

---

## 8. Skill Development and Team Building

### 8.1 The Skill Matrix

A team skill matrix helps identify capability gaps and growth directions:

| Member | Go | SQL | Redis | Networking | Architecture | Communication |
|------|-----|-----|-------|------|------|------|
| Lead | 4 | 4 | 4 | 5 | 5 | 4 |
| Member A | 5 | 4 | 4 | 4 | 3 | 3 |
| Member B | 3 | 5 | 3 | 3 | 3 | 4 |
| Member C | 3 | 3 | 3 | 2 | 2 | 3 |
| Newcomer | 2 | 2 | 2 | 1 | 1 | 2 |

Skill levels: 1-beginner, 2-junior, 3-intermediate, 4-senior, 5-expert. Using the matrix: read across (whose gap is where), read down (which capability only one person holds — **single-point risk**: if that person quits or takes leave, that work stalls). When the matrix shows "networking at 5 held by the lead alone", the right move is not to make the lead busier but to designate a second person to go deep, turning a single point into a double point.

### 8.2 Growth Paths and Personal Development Plans

A typical server programmer's growth ladder:

| Stage | Capability marker | Typical tasks |
|------|---------|---------|
| Junior | Can fully implement a feature module from a doc | Inventory, mail, check-in |
| Intermediate | Can design a subsystem's solution and handle boundaries | Event framework, leaderboard, guild |
| Senior | Can lead cross-system design, handle performance and consistency | Battle settlement, trade system, cross-server architecture |
| Staff/Senior+ | Can make architecture decisions, mentor people, drive cross-team efforts | Service decomposition, technology selection, capacity planning |

The key to a personal development plan is not "read 10 books" but "own the architecture design of a module". Practice is the primary way of learning, theory only support — after each training, assign a small practice task so the knowledge lands in the hands.

### 8.3 Knowledge Sharing and Code Review

**Tech-talk sessions** are the core mechanism for a team's knowledge sediment. Recommended: weekly, one hour each, members rotating as presenters. Topics should stay close to practice: Redis data-structure applications, the real cost of locks and the single-writer pattern (Chapter 5), performance-optimization practice, a postmortem of one live incident. Archive the slides — together with review records they form the textbook library for training newcomers.

**Code review conventions**: review checklist items cover logic correctness, potential bugs, performance, security, readability. Make the rules explicit: review the code, not the person; the author owns the code, the reviewer owns the gate; core modules (payment, battle settlement, economy) need two or more reviewers.

> **Pitfall**: the most common mistake in skill development is "training without practice" — the class ends and that is that. The value of training is realized through follow-up project tasks; another hidden mistake is "the capable do more" — strong performers always take the core tasks, no replacements are ever grown, and the single-point risks on the skill matrix keep snowballing.

---

## 9. Project Handoff and Documentation Management

### 9.1 The Project Handoff Workflow

Project handoff is the most easily overlooked part of team management. A botched handoff leads to: slow newcomer ramp-up, recurring historical problems, loss of key knowledge.

**Handoff checklist**:

1. **Code handoff**: repo permissions, code-structure walkthrough, core module docs
2. **Documentation handoff**: architecture design, protocol docs, database design, ops runbook (Chapter 13)
3. **Environment handoff**: dev/test/production environment configuration and access
4. **Knowledge handoff**: business-logic walkthrough, technical difficulties, historical problem records (including every incident postmortem — they are the most honest map of "where the pits are")
5. **People handoff**: introductions to collaborators, a contact list for external dependencies

Handoff period arrangement: at least a 1-2 week overlap, where the newcomer first "shadows" (observes daily operations, reads docs, does small tasks), then "takes over" (the original owner observes). After the handoff, keep a consulting window (the original owner remains on call for questions, 1-3 months).

### 9.2 Documentation Management Conventions

Centralized documentation management with a unified directory structure and naming conventions:

```text
project-docs/
├── README.md                    # 项目概述与文档索引
├── architecture/                # 架构文档与技术决策记录
├── development/                 # 开发规范、协议文档、环境说明
├── operations/                  # 运维手册、应急预案、值班制度
├── postmortems/                 # 故障复盘报告
└── templates/                   # 文档模板（设计文档、复盘报告）
```

Two disciplines that matter more than the directory structure:

- **Every doc has an owner**: each document names the person responsible for keeping it current. A doc without an owner is no doc at all — nobody dares trust that it is still fresh
- **Retire stale docs**: periodic cleanup; mark outdated docs "deprecated" or delete them. The most dangerous thing in a doc library is not a missing doc but a stale one — losses from readers acting on the old plan exceed the losses from having nothing at all

### 9.3 R&D Efficiency Metrics

R&D efficiency metrics help the team spot improvement directions:

| Dimension | Metric | Notes |
|------|------|------|
| Delivery efficiency | Requirement delivery cycle | Time from requirement raised to shipped |
| Code quality | Defect density, live incident count | Defects per KLOC, P0/P1 per version |
| Team efficiency | Sprint completion rate | Share of planned tasks completed |
| Product value | Feature usage rate | Actual usage of new features |

Two red lines for metrics: **never use efficiency metrics in individual performance reviews** (once used for reviews, the metric gets optimized instead of the work — delivery cycles get gamed with splits, defects get under-reported); **watch trends, not absolute values** (absolute values are not comparable across teams; comparing yourself to yourself is what means something).

---

## 10. The Organizational Management of Failures: Blameless Postmortems

Chapter 13 covered the **process** of incident response (stop the bleeding, locate, fix); this section covers the organizational-side **mechanism** — process is executed by policy, and policy survives on culture.

### 10.1 The Blameless Postmortem Culture

The core principle of a postmortem is **blamelessness — judge the event, not the person**: ask "why did the system allow this error to happen", not "who made this error". The reason is pragmatic — the moment a postmortem turns into a blame session, the first move in the next incident becomes concealment and finger-pointing, and an organization where information does not flow learns nothing.

Operational points of a blameless postmortem:

- **Describe the chain of facts, not pass judgment on behavior**: write "the operator executed the delete command and the command had no secondary-confirmation mechanism", not "XX slipped up and dropped the database"
- **Push for systemic causes**: every human error deserves the question "what mechanism would have kept this error from happening or caught it" (tiered permissions, secondary confirmation, gray release, backups)
- **Praise reporting**: promptly reporting a mess you caused yourself should be explicitly affirmed, not punished — information arriving one minute earlier means the bleeding stops one minute earlier

### 10.2 Postmortem Reports and Improvement Tracking

The standard structure of a postmortem report: timeline (when discovered, when the bleeding stopped, when recovered), impact (how many players, how much asset, how long), root cause (technical root cause + process root cause, at least one each), improvement measures (each with an owner and a deadline).

Tracking the improvement measures decides the postmortem's success or failure. The common practice is to take improvement items into the Sprint as formal tasks (not "do it when there's time") and check completion at the next retrospective (the same mechanism as Section 3.4's improvement tracking). When the same class of failure appears a second time, first check why the previous improvement items never landed — usually a tracking-mechanism problem, not a technical one.

### 10.3 Sedimenting Documents from Failures

Every P0/P1 postmortem's output should be backfilled into the knowledge base: runbook updates (this incident's stop-the-bleeding path goes into the playbook), monitoring gap-fills (whatever this time was caught only by player complaints gets an alert), doc errata (fix the outdated ops runbook). Failure is the most expensive teacher — once the tuition is paid, keep the notes.

---

## 11. Design Decision Guide

**When to adopt Scrum vs Kanban**

- **Scrum**: fast-changing requirements, need for a fixed iteration cadence, team of 5-9
- **Kanban**: operations-oriented work (GM tools, event-config type), continuous delivery, highly variable workload

**When you need full design documents**

- Core systems (combat, trade, economy)
- Cross-team collaboration interfaces (protocol docs)
- Features touching asset security
- Features expected to be revised repeatedly and maintained long-term

**When to introduce mandatory code review gates**

- Team larger than 3
- Newcomers joining
- Project entering maintenance (changers are no longer the original authors)
- Asset-sensitive code: payment, economy, battle settlement

**When you need dedicated tools staffing**

- Designers constantly manipulate data by hand (config tables, live lookups)
- QA tests everything manually, regression is costly
- Operations/GM actions lack approval and audit trail (Chapter 17's config pipeline depends on tool support)

**When to tighten the freeze periods**

- 2-3 weeks before a version release (system-level freeze, corresponding to Chapter 17's requirement freeze)
- The ramp-up phase of a wipe test (changes would make data criteria inconsistent before and after, distorting test conclusions)
- The observation window right after a major version launch (hotfixes first, new requirements queue)

**When stage gates must exist**

- Projects greenlit without data support, pushed forward on enthusiasm (the prototype gate is the stop-loss valve)
- The team's first time in the genre (neither technical feasibility nor quality bar ever validated)
- Projects so large that the loss of mid-course termination is unbearable (the slice gate and CBT gate deliver the most value)

---

## 12. Common Pitfalls Summary

| Pitfall | Symptom | Root cause | Solution |
|------|------|---------|---------|
| Developing on unclear requirements | Output mismatches expectations | No design doc | Document first, develop second; exception handling and acceptance criteria are non-optional |
| Serial waiting | Waiting on art, waiting on the server, schedule doubles | No parallelism mechanism | Protocol first + Mock-data parallel development |
| Lost-in-translation tech constraints | "Can't be done" or quietly forcing it | No quantified translation | Programmer gives numbers, designer weighs, the lead decides |
| Agile as empty ritual | Standups turn into rote reports | Process without improvement | Focus on blockers and improvement items; track through recheck |
| Skill single points | Only one person knows a core module | "The capable do more" with no backup | Skill matrix spots single points; designate a second deep-learner |
| Stale interface docs | Mismatch found only at integration | Manually maintained docs | Protocol in IDL, docs generated |
| Insufficient handoff | Slow ramp-up, same pits re-stepped | Handoff window too short | 1-2 week overlap + postmortems as knowledge handoff |
| Postmortems turn into blame | Concealment and finger-pointing, nothing learned | Missing blameless culture | Judge the event not the person + praise reporting |
| Efficiency metrics in performance reviews | Metrics get gamed, data distorted | Metrics misused | Metrics track team trends only; never in individual reviews |
| Stage gates in name only | The project limps forward, sinking deeper | Sunk costs hijack decisions | Gate deliverables quantified and explicit; killing a project is cheapest during prototyping |
| One-size-fits-all change handling | Either chased by changes, or process exists in name only | No change tiering | Copy/numerical take the light path; system level takes the full process |
| Unclear outsourcing specs | Batch rework, delivery lands on the critical path | Acceptance criteria never documented | Specs first + sample confirmation + automated pipeline checks |

---

## 13. Practical Case: A Privately Changed Reward Rule That Blew Up Into 2,100 Anomalous Claims After a Server Merge — Investigating a Change-Tiering Failure

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. It takes Section 5's change tiering and freeze-period discipline, Section 6's cost quantification, and the "one-size-fits-all change handling" row of Section 12's pitfall table into deep water: the enemy of process is not too many changes, it is dead tiering — this is an organization-level investigation of change management, and the full expansion of "the point of tiering is to let most changes take the light path".

**Background and symptoms**: a 30-person project on Sprints. To cure "being chased by changes", the team routed **all** changes through full review (impact assessment → technical review → scheduling) — even fixing a typo waited **3** days. Three months in, review backlog averaged **4** days, and designers began bypassing the process to privately ask programmers for changes (a version retrospective later traced **14** in-Sprint private changes). The incident landed on a "change this reward to mail delivery" request: the formal process scheduled it for the next version, the designer pressed hard, and a programmer privately finished it in a day and shipped it — adding the field to the claim table and server-merge compatibility, "the things the full process was supposed to do", were all skipped. **3** days after a server merge, customer support received **64** anomalous-claim tickets.

### Step 1: Symptoms and Criteria — First Define "Anomalous Claim" as a Reconcilable Transaction Record

Reconciliation criteria: claim records checked three ways against the player and the reward config; every duplicate claim or failed claim counts as anomalous. Two ledgers:

- Anomalous records **2,100** = duplicate grants **1,200** + failed claims **900**
- Timestamps: the **1,200** duplicates cluster in the merge window; the **900** failures are all old-server player IDs

The config layer is clean: mail template and reward amounts are all correct — not a misconfiguration, the **table structure broke in the server-merge scenario**.

### Step 2: Layered Attribution — The Change Ledger from Config to Process

```text
配置层   邮件模板齐全、奖励数额正确——排除配置错误
发放层   重复 1200 笔集中在合服窗口、失败 900 笔全是老服 ID：
         领取表加字段后按新服 ID 去重，合服迁移的老记录不满足新约束——
         同一玩家两条领取记录（重复）或写入被拒（失败）
流程层   该变更走的是「私下通道」：无影响评估单、无技术评审记录、无回归用例
         ——加字段+合服兼容是系统级变更，被当成文案级改掉了
```

### Step 3: Root Cause — Tiering Died, and the Heavy Process Became Decoration

This incident is a chain of change-management decay: to cure chaos the team routed every change through the heavy process (one of the two degenerate extremes) → the heavy process backed up, reviews queued **4** days → designers went privately to programmers (the "process exists in name only" this chapter predicted) → **the system-level change that truly needed the full process was the one that skipped it**. The missing cost quantification is another link: the formal-process line "the reward path already has a mail channel — half a day for the config change; but the claim table needs a new field, which involves server-merge compatibility — two days total; suggest next version" was never offered — the private channel skipped even the assessment; the programmer was not being lazy, there was simply never a chance to turn the hassle into numbers. "Teams that freeze everything outright (route everything through the heavy process) usually get forced into private unfreezes, and the discipline backfires" — that sentence came true on this team, word for word.

### Step 4: Remediation and Backfill — Stop the Bleeding First, Then Put Tiering Back In

Stop the bleeding: the **1,200** duplicate grants fully recovered (the items are clawable), the **900** failed claims re-issued one by one, all **64** tickets closed individually. Organizational repair: change tiering reinstalled — copy-level changes go directly through normal test submission, numerical-level through the config pipeline (Chapter 17) plus numerical regression, system-level through the full process; freeze periods return to two tiers — after the Sprint midpoint and 2-3 weeks before release, freeze system level only, leaving copy and numerical unrestricted. Results (next month): the light path absorbed **82%** of changes, review backlog went **4** days → **0.5** days, code-tracing audits found **0** private changes.

**Backfill checklist**:

| Landing point | Action | Backfilled into |
|-----|------|--------|
| Change-tiering entry | Ticket template with self-selected level + programmer re-verifies the tier; copy/numerical must not stray into the heavy process | Requirement change management (5) |
| Cost-quantification phrasing | Programmer replies to change requests must carry "half a day / two days / suggest next version"-style quantified cost | Cross-functional collaboration (6) |
| Freeze-period calibration | After the Sprint midpoint and 2-3 weeks before release, freeze system level only — not one-size-fits-all | Design decision guide (11) |
| Private-change sentinel | Any version diff that fails to match a ticket triggers root-cause tracing; the launch gate blocks ticket-less changes | Common pitfalls (12) |

### Three Lessons from the Case

1. **The enemy of process is not too many changes, it is dead tiering** — when every change runs the heavy process, the most important system-level changes are exactly the ones that cannot get into the process.
2. **Cost quantification is the fuel of tiering** — without "half a day / two days / next version" numbers, tiering decays into an argument between programmers and designers.
3. **The private channel is the early signal of tiering failure** — a diff that fails to match a ticket tells you the process exists in name only, long before any satisfaction survey could.

---

## Chapter Summary

| Question | Short answer |
|------|------|
| The biggest organizational difference between game R&D and ordinary software? | Dual content-and-technology pipelines (design/art/programming/QA as four functions); one feature spans all four |
| Which design-doc sections are least omittable? | Exception handling (disconnect/concurrency/boundary) and acceptance criteria — whatever is missing becomes a production failure |
| The precondition for frontend-backend parallelism? | Protocol doc first (IDL-ized), client develops against Mock; total schedule compressible by about a third |
| The right way for programmers to express technical constraints? | Quantified cost (performance numbers, schedule, risk), leaving the trade-off space to designers and decision-makers |
| The most important use of the skill matrix? | Spotting single-point risk — a capability held by only one person is an organization-level team risk |
| Why do blameless postmortems matter? | A blame culture makes information go underground and the organization loses its ability to learn; judge the event, not the person + praise reporting |
| How do postmortem improvement items land? | Enter the Sprint as formal tasks, checked at the next retrospective; when the same class of failure recurs, first ask why the items never landed |
| What cadence sits above Sprints? | Version milestones (prototype → slice → production → wipe test → launch); stage gates offer the stop option before sunk costs grow |
| How are requirement changes managed? | Tier them (copy/numerical/system); after cost quantification, hand the call to product decisions; freeze periods freeze system level only |
| The bottom line of outsourcing management? | Specs first + sample confirmation + automated checks; tools can be outsourced, the right to access player data cannot |

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
