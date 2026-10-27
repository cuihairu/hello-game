# 18 Security, Risk Control, and Compliance

Security, risk control, and compliance are often put into the same department, the same set of processes, even the same document template on many teams. From an engineering view, though, these three kinds of problems are not the same. Security cares more about whether the system is easy to attack, tamper with, or leak; risk control cares more about whether the business is right now being cheated, arbitraged, account-laundered, or abused; compliance cares about whether the product, content, data processing, and release process satisfy legal and platform rules.

The cost of mixing the three together is high. It makes a team believe that "shipping a security product" or "filling out a compliance checklist" settles the matter, when the truly hard part is precisely here: these capabilities must be bound to concrete business paths — they must land in the daily flows of payment, assets, chat, social, version release, back-office operations, and external integration.

> For a game project, security is never "check it once before launch" work. As soon as the product has real users, real assets, and real external traffic, attacks and abuse have already appeared.

> The framing of this chapter shares its source with the knowledge base main line's "Security, Risk Control, and Compliance" chapter: that chapter concentrates on the judgment and pitfalls of the three problem types, while this chapter completes the engineering landing on the same frame — concrete implementations of anti-cheat, data security, and compliance checks.

When reading this chapter, it is best to carry three main threads:

- **Watch state boundaries**: which data, assets, and permissions are most sensitive, who can read, who can write, who audits
- **Watch adversarial cost**: are attacks and cheating cheaper than defense; if so, where does the system keep bleeding
- **Watch the governance loop**: after a problem is found, can it be handled, held accountable, remediated, and reviewed

---

## 1. Security and Anti-Cheat

Security problems in the game domain are both similar to and different from those of traditional Web systems. The similar part: it likewise has to face account theft, interface abuse, privilege escalation, data leakage, and supply chain risk. The different part: games naturally carry a far stronger adversarial surface, because the client is in the player's hands and many gains convert directly into ranking, virtual assets, even real profit.

### 1.1 Why Game Security Cannot Do Without Anti-Cheat

Many internet products, even without perfect client trust, can still press the damage down through server-side permissions and transaction constraints. Games are different. As long as any of the following holds, cheating directly destroys the product's core value:

- Match fairness affects wins and losses, rank, and retention
- Resource output affects the economic loop and payment conversion
- Leaderboards, social, and guild honor affect public opinion and the ecosystem
- High-value accounts and virtual items can be monetized directly

This means "security" and "anti-cheat" cannot be split apart. Security is not a generic protective shell, and anti-cheat is not a detection script patched on after launch. Both must be designed around the business primary path.

### 1.2 The Client Is Never Trustworthy, but It Cannot Be Fully Abandoned Either

A mature team usually accepts this premise: the client can be tampered with, debugged, injected, packet-captured, replayed, sped up, simulated, and batch-controlled. Key adjudication therefore has to sit on the server side as much as possible. That does not mean client-side protection is worthless.

Client-side protection still serves two purposes:

- Raise the attack threshold, making low-cost scripts and bulk studios hard to scale
- Feed more environment signals to server-side risk control, such as debug state, device fingerprints, integrity check results

The real question is not "whether to do client-side protection" but not to stake final security on client-side protection. Relying only on packing, encryption, and anti-debugging usually blocks only the most superficial attacks.

```text
安全防护分层模型
┌────────────────────────────────────────────────┐
│                   服务端权威判定                 │
│         ┌──────────────────────────────┐       │
│         │  战斗结算 · 资产变动 · 排行   │       │
│         │  支付状态 · 匹配资格 · 交易   │       │
│         └──────────────────────────────┘       │
├────────────────────────────────────────────────┤
│                   业务规则校验                   │
│         ┌──────────────────────────────┐       │
│         │  经济异常 · 行为模式 · 关联分析│       │
│         └──────────────────────────────┘       │
├────────────────────────────────────────────────┤
│                   客户端防护层                   │
│         ┌──────────────────────────────┐       │
│         │  完整性校验 · 环境检测 · 加密  │       │
│         └──────────────────────────────┘       │
│              ↑ 提高门槛，但不提供最终信任        │
└────────────────────────────────────────────────┘
```

### 1.3 What Matters More Is Putting Authoritative Judgment in the Right Place

In a game, what most needs protecting is usually not all data but a handful of key states:

| Key state | Why it needs server-side authoritative adjudication |
|---------|--------------------------|
| Combat results and settlement results | Directly affects rank, rewards, fairness |
| Currency, items, gacha, and trade assets | Directly affects the economic loop and payment revenue |
| Matchmaking eligibility, rank, leaderboards | Directly affects fairness and player retention |
| Payment orders, delivery status, and refund status | Directly involves real money |

If these states are decided by the client, or the server only does token validation, they get exploited quickly. The safer approach is usually:

- The server holds final settlement and the power over key state changes
- Client input is accepted only as "intent" or "candidate action", never as a result
- High-value operations get idempotency, rate limiting, and abnormal-behavior validation

### 1.4 Anti-Cheat Is Not Just Cheat-Tool Detection

When people mention anti-cheat, the first things that come to mind are wallhacks, speed hacks, auto-click, memory editing. In reality cheating and abuse in games go far beyond these:

| Cheat type | Concrete manifestations | Scope of impact |
|---------|---------|---------|
| Cheat tools and scripts | Wallhack, speed hack, auto-combat, memory editing | Match fairness, resource economy |
| Studios and account farming | Bulk account creation, scripted resource farming, piloting | Economic loop, matchmaking quality |
| Payment fraud | Proxy top-up, refund arbitrage, stolen-card payment | Revenue, platform reputation |
| Event vulnerability exploits | Farming resources via config bugs or compensation bugs | Event effectiveness, player fairness |
| Social damage | Malicious chat, scams, traffic diversion | Community ecosystem, player retention |

So an anti-cheat system usually has to split into at least several layers:

1. **Client integrity and environment adversarial measures**: raise the attack threshold
2. **Server-side rule validation and abnormal-behavior detection**: authoritative adjudication
3. **Economic and transaction anomaly detection**: asset protection
4. **Social propagation chain and account-linkage detection**: relationship graphs
5. **Punishment, appeals, and rollback handling**: the governance loop

Only with the last layer done does anti-cheat truly become a governance capability.

### 1.5 Common Build-Out Approaches and Their Costs

#### Relying on a Third-Party Security Shell or Anti-Cheat SDK

Fast to integrate, blocks a share of low-skill attacks, and conveniently meets a channel's or platform's minimum requirements. But it cannot understand your gameplay rules, economic logic, or asset risks, so it can only serve as a baseline threshold, not replace core validation.

#### In-Business Rule Detection

Many projects write large amounts of rules into core modules such as combat, payment, events, and trading. The upside is closeness to the business; the downsides are scattered rules, hard auditing, slow iteration — it easily decays into "whoever breaks something patches an if".

#### A Standalone Risk-Control and Cheat-Governance Platform

The more mature approach is to build high-frequency signals, punishment policy, audit chains, and a manual review platform into one unified capability. But such a platform only truly pays off when a project has enough volume and governance rules are fairly stable; otherwise the platform gets heavy while the business cannot plug in.

```text
安全建设路径建议
┌────────────────────────────────────────────────┐
│  第一阶段：基础安全                              │
│  ├── 服务端权威判定关键状态                      │
│  ├── 第三方安全 SDK 接入（满足渠道要求）          │
│  └── 基础操作审计                               │
├────────────────────────────────────────────────┤
│  第二阶段：业务规则                              │
│  ├── 核心模块内建校验规则                        │
│  ├── 经济异常检测                               │
│  └── 账号关联识别                               │
├────────────────────────────────────────────────┤
│  第三阶段：治理体系                              │
│  ├── 统一风控平台                               │
│  ├── 处罚梯度和申诉机制                         │
│  └── 人工复核和运营协同                         │
└────────────────────────────────────────────────┘
```

### 1.6 Common Mistakes

- Believing that integrating some security product equals finishing security build-out
- Doing only cheat-tool detection, with no protection for assets, trading, and event rules
- Key states still led by the client, the server only doing surface validation
- No punishment, appeal, and rollback plan after an anomaly hits

The true mark of mature game security is not "whether there is a cheat-tool SDK", but whether, when attacks and cheating appear, the system can hold steady the most expensive, most critical chain — the one that most affects fairness and assets.

---

## 2. Audit, Privacy, and Data Security

Many teams read "data security" as database encryption, backups, and permission management, read "audit" as back-office operation logs, and read "privacy" as patching in a privacy policy before launch. In real projects these three things share one core question: who can touch which data, and when something goes wrong, can you explain clearly who used the data and how.

### 2.1 The Point of Audit Is Not Recording but Accountability

A text log saying "some administrator performed some operation at some time" usually does not actually help a team handle an incident. When an incident happens, the more important questions are:

| Key audit question | Why it matters |
|-------------|-----------|
| Which objects were changed | Determine the scope of impact |
| What the values were before and after | Assess loss and recovery approach |
| What the operation was based on | Judge whether it was compliant |
| Whether it was executed in batch | Assess scale |
| Where it stopped on failure | Confirm state consistency |

This is also why high-risk back-office operations need to be as structured as possible. Queries, re-issuance, clawback, unbanning, migration, batch reward grants, config changes, hot-fix tasks — none of these can be traced by "someone clicked a button" alone.

### 2.2 Privacy Is Not a Marginal Issue in Games

Games routinely handle a lot of sensitive or constrained information:

- Account identifiers, phone numbers, real-name information
- Device information, login location, payment information
- Chat content, report records, punishment records
- User behavior traces and tag profiles

Once this information is wired together with monetization, recommendation, risk control, and customer support systems, it easily spreads widely internally. Risk comes not only from external leaks but also from internal over-access, over-retention, and out-of-scope use.

So privacy governance cannot be just legal copy; it has to land in concrete implementation:

- Whether this data really needs collecting
- Whether minimized storage and tiered access are in place
- Who can see plaintext, in which scenarios
- Whether, past the retention period, it can be deleted, masked, frozen

### 2.3 Where Data Security Most Easily Goes Wrong

#### The Back-Office Query System

Many teams concentrate customer support, operations, and R&D queries into one big back office, and the thing gradually becomes a "super data entrance". As soon as the permission model is coarse and the audit incomplete, this kind of system is itself the biggest leak surface.

#### Logs and Exports

Production logs, report exports, and ad-hoc troubleshooting scripts often carry out sensitive fields unintentionally. Especially during incident response and operations reviews, people habitually pass screenshots, CSVs, SQL results around in group chats — usually far harder to govern than formal database access.

#### Third-Party Integration

Analytics SDKs, ad SDKs, login SDKs, payment SDKs, support tools, and marketing platforms all touch part of the user's data. As soon as the integration boundary is unclear, data already masked internally can be reassembled into a complete profile in an external integration.

### 2.4 A More Realistic Governance Approach

For most teams, data security should rather start from a few minimal practices:

```text
数据安全最小实践
┌────────────────────────────────────────────────┐
│  1. 数据分级                                     │
│     ├── 对用户数据和后台操作做分级                │
│     └── 先识别最敏感的那部分                     │
├────────────────────────────────────────────────┤
│  2. 操作管控                                     │
│     ├── 查询、导出、批量操作需要留审计和审批链    │
│     └── 高风险操作需要双人确认                   │
├────────────────────────────────────────────────┤
│  3. 视图隔离                                     │
│     ├── 客服、运营、研发看到不同粒度的数据视图    │
│     └── 最小权限原则                             │
├────────────────────────────────────────────────┤
│  4. 脱敏习惯                                     │
│     ├── 日志、报表和临时脚本建立脱敏工具          │
│     └── 群聊中不传播明文敏感数据                 │
├────────────────────────────────────────────────┤
│  5. 第三方管控                                   │
│     ├── 对第三方 SDK 明确字段边界                │
│     └── 传输边界和保留边界                       │
└────────────────────────────────────────────────┘
```

### 2.5 Why Audit, Privacy, and Data Security Must Be Viewed Together

Because all three answer the same question: when sensitive data is accessed, modified, propagated, or abused, does the team have a way to discover, block, trace, and remedy. Missing any one link, the system fails:

- Permissions without audit: when something happens, nobody knows who touched it
- Audit without least privilege: by default everyone can see
- Privacy copy without actual technical boundaries: in the end it still cannot land

### 2.6 Common Mistakes

- Believing "internal systems" need no fine-grained permissions and audit
- No masking on log, report, and export paths, sensitive data spreading everywhere
- Privacy governance staying in agreement copy, never entering R&D and operations processes
- Treating high-sensitivity data — real-name, payment, support, chat — the same as ordinary business data

The truly mature state of audit, privacy, and data security is not how many policy documents were written, but that when someone queries, exports, modifies, or leaks sensitive data, the system knows what happened, whom it affects, and how to stop the loss.

---

## 3. Behavioral Risk Control and the Governance System

If risk control is understood only as "catching cheaters", it is at most a detection module. A real governance system answers this: when abnormal behavior, malicious exploitation, community damage, and business abuse keep appearing in the system, can the team build a long-term stable mechanism of identification, adjudication, handling, and appeal.

### 3.1 Why Behavioral Risk Control Is Essentially Business Governance

Many high-risk behaviors in games are not intrusions in the traditional sense, but "using system-permitted surface behaviors to reach disallowed outcomes":

| Risk type | Concrete behaviors | Harm |
|---------|---------|------|
| Asset risk | Carding, arbitrage, account laundering, abnormal trades | Economic loss, declining player trust |
| Fairness risk | Cheat tools, piloting, rank manipulation, scripted matches | Deteriorating competitive environment, declining retention |
| Community risk | Abuse, scams, traffic diversion, harassment | Community ecosystem damage, reputation loss |
| Operating risk | Fake new users, fake recall, ad fraud | Distorted operating data, ad fraud |

These behaviors often do not violate interface-layer rules at all, yet continuously damage the economy, fairness, community, and operating data. Risk control therefore naturally belongs to business governance, not to an appendix of the security team.

### 3.2 What Layers a Risk-Control Loop Needs at Minimum

```text
风控治理闭环
┌──────────────────────────────────────────────────────┐
│                    信号采集                           │
│  登录 · 设备 · 支付 · 资产 · 社交 · 匹配 · 聊天 · 举报│
└──────────────────────┬───────────────────────────────┘
                       │
                       v
┌──────────────────────────────────────────────────────┐
│                    判定策略                           │
│  显式规则 · 统计阈值 · 画像对比 · 模型评分             │
└──────────────────────┬───────────────────────────────┘
                       │
                       v
┌──────────────────────────────────────────────────────┐
│                    处置策略                           │
│  禁言 · 冻结 · 限流 · 隔离匹配池 · 限制交易 · 封禁   │
└──────────────────────┬───────────────────────────────┘
                       │
                       v
┌──────────────────────────────────────────────────────┐
│                    人工复核                           │
│  高价值账号 · 误伤争议 · 批量事件升级处理              │
└──────────────────────┬───────────────────────────────┘
                       │
                       v
┌──────────────────────────────────────────────────────┐
│                    申诉与恢复                         │
│  解释依据 · 解除限制 · 补偿和回滚                     │
└──────────────────────────────────────────────────────┘
```

Missing any link, governance deforms. Detection without handling means risk just keeps accumulating; handling without appeals means false positives quickly manufacture public-opinion incidents and support pressure.

### 3.3 Why Many Risk-Control Systems End Up Not Working

Because they only solved "can we score", not "what happens next with this score". Typical problems include:

- Too many rule hits, but nobody knows which are really worth acting on
- Punishment actions too aggressive, hitting normal users
- Punishment actions too conservative, black-market operations treating the rules as an acceptable cost
- At appeal time no evidence can be produced, only mechanical replies

This shows the truly hard part of risk control is not the model but governance policy and organizational coordination.

### 3.4 A More Useful Way to Design It

#### Layer the Objects of Risk Control

Not all risks should be handled the same way:

| Risk tier | Evidence of concern | Tolerance | Punishment policy |
|---------|---------|--------|---------|
| Asset-type risk | Money flow, transaction records | Extremely low | Strict bans, asset freeze |
| Fairness-type risk | Combat data, operation frequency | Low | Restrict matchmaking, demote rank |
| Community-type risk | Chat content, report records | Medium | Mute, restrict social features |
| Operating-type risk | Participation data, device fingerprints | Medium | Restrict event participation, flagging |

The value of layering is that different risks differ in the evidence they concern, their tolerance, and their punishment policy.

#### Grade the Punishment Actions

A mature system generally does not have only "ban" or "not ban" outcomes:

```text
处罚梯度设计
┌────────────────────────────────────────────┐
│  Level 1: 提示或警告                        │
│  Level 2: 限制某项能力                      │
│  Level 3: 冻结部分资产或交易能力             │
│  Level 4: 隔离到特殊匹配池                  │
│  Level 5: 临时封禁（1天 / 7天 / 30天）       │
│  Level 6: 永久封禁                          │
└────────────────────────────────────────────┘
```

The benefit of doing it this way: control risk first while uncertain, escalate punishment after evidence is sufficient.

### 3.5 Why Risk Control Needs to Interlock with Other Systems

Behavioral risk control can hardly close the loop alone; it needs to work with these capabilities:

- **With audit**: preserve evidence chains and operation records
- **With customer support**: handle appeals, communication, and recovery
- **With the economic system**: identify abnormal flows and recover assets
- **With operations analytics**: keep black-market operations from polluting operating judgments

If these systems are siloed, risk control falls into two extremes: either it hits a lot but nobody executes, or it executes a lot but the team cannot explain it.

### 3.6 Common Mistakes

- Watching only cheat tools, ignoring abuse of trading, social, and operational rewards
- Many risk-control signals, but no layered policy and punishment gradient
- No review, appeal, and recovery flow after false positives
- Risk-control data disconnected from support, audit, and economic analysis systems

The true mark of mature behavioral risk control is not how complex the model is, but whether the team can keep abnormal behavior suppressed within an acceptable range over time, while keeping false positives and governance cost under control.

---

## 4. Compliance, Game Licenses, and Platform Constraints

Many technical teams are used to treating compliance as "go over the checklist once more right before launch", but for game projects, compliance and platform constraints keep reverse-shaping the architecture, feature boundaries, and version cadence. If you only patch it up at submission, listing, channel integration, or cross-region publishing, the cost is usually already very high.

### 4.1 Why Compliance Directly Changes the Implementation

A game is not a content product in the generic sense; it is simultaneously subject to multiple constraints:

- Content review and subject-matter restrictions
- Real-name and minor protection requirements
- Payment, probability, disclosure, and virtual transaction constraints
- Chat, social, reporting, and content governance requirements
- Platform rules on SDK, login, payment, ad, and permission usage

These requirements are not just legal documents; they all eventually land in technical implementation:

| Compliance requirement | Technical impact |
|---------|---------|
| Minor restrictions | Login state, online duration, spending capacity, cross-day settlement logic |
| Probability disclosure | Back-office display, data retention, support query capability |
| Channel payment constraints | Account system, version cadence, hot-update headroom |
| Content review | Chat, UGC, announcement, and asset update flows |

### 4.2 Why the Game License and Platform Rules Cannot Be Deferred

In the domestic publishing scenario, the game license (ISBN), real-name verification, anti-addiction, and content compliance usually need to be factored in at design time. The reason is that many requirements cannot be solved by a UI-layer prompt; they enter core flows directly:

- Whether certain feature entrances need gating by age, real-name status, or region
- Whether chat, social, event copy, and assets need a review chain
- Whether probability and payment information needs long-term queryability
- Whether version content is allowed to ship separately via hot update

If all of this is patched up only before launch, the project usually ends up hard-cutting features and building temporary bypasses.

### 4.3 Platform Constraints Change Your Technical Freedom

When integrating different platforms, channels, and regions, teams often find that capabilities taken for granted do not necessarily hold:

- Not all platforms allow the same hot-update policy
- Not all platforms allow the same account interoperability and payment interoperability
- Not all SDKs can stably provide the same fields and callback semantics
- Not all channels allow consistent ad, push, and social capabilities

This means technology selection cannot pursue only "maximum uniformity"; it must also leave room for differences and fallbacks.

```text
合规与平台约束的三层模型
┌────────────────────────────────────────────────┐
│  底层硬约束（全国统一，不可妥协）                │
│  ├── 实名认证与防沉迷                           │
│  ├── 支付安全与概率公示                         │
│  ├── 内容审核与数据处理                         │
│  └── 版号与发行资质                             │
├────────────────────────────────────────────────┤
│  适配层差异（按平台/渠道/地区适配）              │
│  ├── 不同平台的登录/支付 SDK                    │
│  ├── 不同渠道的审核规则                         │
│  └── 不同地区的内容要求                         │
├────────────────────────────────────────────────┤
│  运营与版本策略（按发行进度调整）                │
│  ├── 功能分地区开启                             │
│  ├── 活动分平台发布                             │
│  └── 灰度策略分渠道执行                         │
└────────────────────────────────────────────────┘
```

### 4.4 A More Realistic Approach

Most teams are better off splitting compliance and platform constraints into three layers:

- **Hard constraints at the bottom layer**: real-name, anti-addiction, payment, content review, data processing
- **Adaptation-layer differences**: login, payment, ad, push, and review rules per platform
- **Operating and version policy**: which features turn on by region, by platform, by review stage

The benefit is that hard constraints at the bottom stay stable, the adaptation layer can vary locally, and operating policy can adjust with the publishing schedule.

### 4.5 Common Mistakes

- Treating compliance as purely legal's responsibility, never entering R&D design
- Only sorting out platform differences right before submission or channel integration
- Assuming all regions, platforms, and versions can share one policy set
- Leaving no system entrance for content review, minor restrictions, and probability re-query

The truly mature state of compliance, game licenses, and platform constraints is not how many regulations you know, but that the project can still run stably with clear technical boundaries under different publishing constraints, instead of doing a big temporary rewrite before every launch.

---

## 5. License Risk and Dependency Governance

Many projects can accept technical debt in the code, yet rarely treat third-party dependencies and license risk as a long-term governance object. The usual outcome: during development, for speed, a lot of SDKs, libraries, assets, and tools get integrated first; by the time of launch, financing, M&A, going overseas, or a compliance review, the team finds it can no longer say clearly what it actually uses, what can be used commercially, what requires open-source give-back, and which suppliers would block the release if they went dark.

### 5.1 Why Dependency Risk Is Not Just a Legal Question

Dependency governance matters not only because of license obligations but because it directly affects technical stability and business continuity:

- Third-party SDKs may crash, stall, leak data, or change interfaces
- Open-source components may stop being maintained, break out vulnerabilities, or break compatibility on upgrade
- Commercial licenses may restrict platform, region, concurrency scale, or redistribution
- If the key toolchain is unmaintained, it directly drags down build, release, and operations

That is, dependency risk is a legal problem, a supply chain problem, and an engineering governance problem at once.

### 5.2 Why Game Projects More Easily Lose Control of Dependencies

Game projects usually integrate large amounts of external capability, and these capabilities are scattered across the client, the server, the operations back office, and the toolchain:

| Dependency category | Typical components | Risk level |
|---------|---------|---------|
| Login, payment, ad SDKs | Third-party accounts, payment channels, ad platforms | High |
| Engine plugins and libraries | Physics engines, audio/video libraries, anti-cheat components | High |
| Asset resources | Images, fonts, audio, motion effects, maps | Medium |
| Build toolchain | Packaging scripts, hot-update tools, automation platforms | Medium |

Once these dependencies lack unified registration and version policy, several common problems appear:

- The same capability wired to different suppliers across projects, maintenance cost keeps climbing
- Upgrading one SDK drags out multiple incompatibilities, and nobody knows the affected scope
- When a license dispute arises, the team cannot prove the provenance and license scope of an asset or library

### 5.3 Where License Issues Most Easily Trip You Up

- Copying open-source code into the project without keeping the license notice
- Using components with strong copyleft obligations without assessing distribution mode
- Commercial assets, fonts, audio licensed for a scope inconsistent with the actual publishing platform
- Resources obtained from outsourcing, plugin markets, or forums with no clear provenance record

Many of these traps are not deliberate violations but the result of not treating dependencies as assets early in development.

### 5.4 A More Practical Dependency Governance Approach

For most teams, dependency governance should at least do this:

```text
依赖治理清单模板
┌────────────────────────────────────────────────────────────┐
│  组件名称: XXX SDK                                          │
│  版本: 3.2.1                                               │
│  来源: GitHub / 商业授权 / 内部开发                          │
│  用途: 支付渠道对接                                         │
│  负责人: 张三                                               │
│  许可证类型: MIT / GPL / 商业                                │
│  最近更新: 2024-01-15                                       │
│  维护状态: 活跃 / 停滞 / 已废弃                              │
│  替代方案: ABC SDK                                          │
│  风险评估: 高（涉及支付）                                    │
│  准入审批: 已通过安全评审                                    │
└────────────────────────────────────────────────────────────┘
```

Establish an admission process for high-risk dependencies — for example payment, account, ad, and data SDKs and core open-source libraries.

Run lifecycle management separately for the client, the server, the toolchain, and asset resources.

When upgrading versions and fixing vulnerabilities, know which projects and modules are affected.

If the team is larger, you can go further:

- Dependency tiering and approval
- License scanning and supply chain security scanning
- Fallback plans for alternatives, avoiding a single point of failure on a key supplier

### 5.5 Why Dependency Governance Should Start Early

Because once dependencies have entered multiple projects, multiple release chains, and multiple outsourcing flows, unifying them retroactively is extremely painful. By comparison, spending a bit more effort early recording provenance, version, license, and owner costs far less.

### 5.6 Common Mistakes

- Caring only whether the code runs, not where dependencies come from or whether they are usable long-term
- Third-party SDK integration decided by an individual developer, with no unified registration and upgrade policy
- Managing only the code repository, not the licenses of assets, fonts, audio, and external tools
- Only sorting out license issues when being audited, complained about, or going overseas

The true mark of mature license risk and dependency governance is not how pretty the inventory looks, but that when a library breaks out a vulnerability, an SDK gets delisted, or an asset license is questioned, the team can quickly know the affected scope, the alternative path, and the responsible owner.

---

## Code Examples: A Minimal Implementation of the Risk-Control Loop

This chapter leans toward governance and decision-making and has no code throughout. But "putting authoritative judgment in the right place" from 1.3, the risk-control loop from 3.2, and the layering and gradients from 3.4 all have very concrete code shapes when they land in engineering. This section gives a minimal implementation — it does not constitute a complete risk-control system, but every function corresponds to a core claim of this chapter.

### Authoritative Validation: Beyond Rejecting, Also Emit a Signal

```go
// 客户端上报只是声明：移动包声明"我从 A 走到了 B"，服务端裁决是否可能
func (s *Session) OnMove(report MoveReport) {
    if !s.authority.MovePossible(s.player, report) {
        s.metrics.Inc("move_rejected")                 // 拒绝但不立刻处罚：单次异常可能是网络抖动
        s.risk.Emit(SignalSpeedAbnormal, s.player.ID)  // 作为信号累积，交给风控闭环
        s.player.RollbackTo(s.authority.LastConfirmed(s.player)) // 回滚到服务端已确认位置
        return
    }
    s.authority.Commit(s.player, report)               // 合法才写入权威状态
}

// 数值同理：购买声明"我花 10 钻买礼包"，价格以服务端配置表为准
func (s *Session) OnBuy(req BuyRequest) error {
    goods := s.config.Goods(req.GoodsID)               // 价格、限购次数查表，不信客户端
    if goods == nil || req.Price != goods.Price {
        return ErrIllegalRequest                       // 与表不符：直接拒绝，并记入审计日志
    }
    return s.wallet.Charge(s.player, goods)
}
```

Note the handling in the first snippet: **reject, roll back, and emit a signal are three independent actions**. Banning outright treats "a single anomaly" as "a conviction" and hits players with bad networks; the correct approach is to refuse the effect, roll the state back, and let the signal accumulate into the profile — punishment belongs to the risk-control loop, not to the validator.

### Signal Accumulation and Disposition Gradients

```go
// 信号只是信号：单条不定罪，按层级累积、随时间衰减
type RiskProfile struct {
    fair    float64 // 公平类分数：加速、胜率、操作频率（对应 3.4 的风险分层）
    asset   float64 // 资产类分数：异常交易、资金流向
    signals []Signal
}

func (e *RiskEngine) Evaluate(p *RiskProfile) Disposition {
    switch {
    case p.asset > assetFreezeThreshold:
        return Disposition{Level: 3, Act: e.freezeTrade}          // 冻结交易能力，资产待查
    case p.fair > fairQuarantineThreshold:
        return Disposition{Level: 4, Act: e.isolateToShadowPool}  // 隔离到特殊匹配池
    case p.fair > fairLimitThreshold:
        return Disposition{Level: 2, Act: e.limitMatching}        // 限制匹配，继续观察
    case p.any() > observeThreshold:
        return Disposition{Level: 1, Act: e.auditOnly}            // 证据不足：只记录不处置
    }
    return DispositionNone
}
```

The three key design points map directly onto this chapter's claims: **scores split by tier** (the risk layering of 3.4 — asset-type tolerance is extremely low so even the lowest threshold punishes hard, while fairness-type can be limited and watched first); **dispositions have gradients** (control risk while uncertain, escalate when evidence suffices, every level reversible); **observation is also a disposition** (Level 1 leaves the player alone and only lets audit watch).

### Dispositions Leave a Trace: an Appealable Evidence Chain

```go
// 每一次处置都生成审计事件：谁、为什么、依据什么信号、怎么申诉
func (e *RiskEngine) audit(p *RiskProfile, d Disposition) {
    e.auditLog.Append(AuditEvent{
        PlayerID: p.ID,
        Action:   d.String(),
        Signals:  p.topSignals(3),  // 触发处置的信号及权重——申诉时客服能看懂依据
        RuleVer:  e.ruleVersion,    // 规则版本——复盘时能还原"当时为什么这么判"
        At:       time.Now(),
    })
    d.Act(p) // 先留痕，后执行：处置动作的执行顺序也是可审计的
}
```

Echoing the conclusion of Section 2.1: the point of audit is not recording but **accountability**. A ban log without `Signals` and `RuleVer` equals no log in an appeal scenario — support cannot explain the basis to the player, and the team cannot review false positives after a rule revision.

Together these three snippets are the minimal shape of the 3.2 risk-control loop: **signal collection (rejections from authoritative validation) → profile accumulation → tiered disposition (gradients) → audit trail (appealable)**. The real watershed of a risk-control system is not model accuracy but whether every link is explainable and reversible — which is exactly the root of why "many risk-control systems end up not working" in 3.3.

---

## 6. Common Pitfalls and Summary

### 6.1 Common Pitfalls in Security and Anti-Cheat

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Integrating a security product = security build-out done | Low-skill attacks blocked, advanced attacks pass freely | Security products are only a baseline threshold |
| Doing only cheat-tool detection | Asset, trade, and event exploits ignored | Design security around the business primary path |
| Key states decided by the client | After tampering the server cannot verify | The server holds authoritative adjudication |
| No punishment and appeal mechanism | Detected but nothing can be done | Complete the governance loop |

### 6.2 Common Pitfalls in Audit and Privacy

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Internal systems need no permissions and audit | Insider abuse untraceable | Least privilege + operation audit |
| No masking on log exports | Sensitive data spreads through group chats | Build masking tools and habits |
| Privacy governance only as agreement copy | Cannot land at the technical level | Privacy requirements enter the R&D process |
| High-sensitivity data treated the same as ordinary | Support can see payment information | Data tiering + view isolation |

### 6.3 Common Pitfalls in Risk-Control Governance

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Risk control = cheat-tool detection | Trade, social, operations abuse ignored | Multi-dimensional risk identification |
| Detection without handling | Risk keeps accumulating | Complete the punishment gradient |
| No appeals after false positives | Player complaints, PR crises | Build review and recovery flows |
| Risk-control system isolated | Data disconnected, no loop | Interlock with audit, support, economic systems |

### 6.4 Common Pitfalls in Compliance and Dependencies

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Compliance is legal's job, not R&D's | Emergency feature cuts before launch | Pull compliance requirements into the design stage |
| Platform differences sorted only before submission | Package, permissions, SDK fully reworked | Multi-platform differences enter version design |
| Ignoring dependency provenance and licenses | Passive at overseas launch, financing, audits | Manage dependencies as assets in a unified registry |
| Managing only code, not asset licenses | Fonts, audio hit by infringement complaints | Bring asset resources into dependency governance |

### 6.5 Core Points

> **Security, risk control, and compliance have different focuses but share one goal: when a problem appears, can the system discover, block, trace, and remedy it.**

A mature security governance system needs all of:

1. **Server-side authoritative adjudication**: key states do not trust the client; the server holds final ruling power
2. **Primary business path security**: protections designed around core paths — payment, assets, matchmaking, social
3. **Audit and privacy loop**: data tiering, least privilege, operation audit, masking habits
4. **Risk-control governance loop**: signal collection, adjudication policy, punishment gradient, manual review, appeal and recovery
5. **Compliance designed in up front**: game license, anti-addiction, platform constraints factored in at design stage, not patched at submission
6. **Dependency governance as routine**: unified registration, version management, license scanning, fallback plans

Missing any one of these links, the security governance system will collapse at some pressure point. And the true mark of maturity is not "whether some product exists", but how fast the team can discover, stop the loss, and recover when attacks, cheating, leaks, or compliance problems appear.

---

## 7. Practical Case: Investigating a "15% Gold Inflation" Gold-Farming Studio

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. The previous four batches of cases went through criteria, duplication, loss, and monitoring long tails; this one goes through economic security — the same investigation discipline (align criteria first, then split dimensions) applied to gold farming, with the endpoint in the risk-control signal layer rather than a fix patch.

**Background and symptoms**: at the start of the month, the weekly security report flashed yellow: gold net increase positive for 5 consecutive days, cumulatively exceeding inventory by **15%**; the tradable-item price index up **+12%** week over week; forum complaints of "prices skyrocketing" appearing. Meanwhile three "normals" were present at the same time: anti-cheat samples detected no new trojan, no new event drops that week, no new version — by the "did something break" routine check, everything was normal.

### Step 1: Symptoms and Criteria—Split the Numerator and Denominator of Inflation First (Echoing Chapter 12's Criteria Governance)

Inflation = the accumulation of net increase; net increase = system output − system recycling. Three criteria traps ruled out first: (1) player-to-player trades are **transfers**, not counted as output; (2) auction-house **transaction volume ≠ output** (it is only ownership rotation); (3) compensation and mail grants go into the corresponding output item by "source tag" and must not be mixed into drops. After alignment: output **860M**/day, recycling **710M**/day, net increase **150M**/day, while the baseline net increase was only **40M**/day — an excess of **110M**/day and a clear direction: **the output side is abnormal, recycling is completely normal** (investigating in the "recycling failure" direction would be wrong across the board). The report's 15% re-derived on the spot: 5 days of excess accumulate to **550M**, relative to a market inventory of **3.6B** ≈ inflation of **15%** — criteria closed.

### Step 2: Layered Attribution—From Day-Level Anomaly Down to an Account-Level Profile

- **By output source**: the anomaly concentrates almost entirely in the dungeon "Molten Mine" — drops jumped from a baseline of **10M**/day to **100M**/day (+90M, 82% of the excess); quests, events, and other dungeons flat
- **By account**: the top **312** accounts (0.04% of DAU) contribute **70M**/day, with highly uniform cluster traits: registration concentrated in the last 10 days, average **21.4** hours online per day, fixed 5-person teams, drops flowing to the same set of buyers (heavily overlapping counterparties)
- **"No detection" in anti-cheat samples is not a contradiction**: the scripts ran entirely on "normal operation" paths — no speed hack, no memory editing, no abnormal packets. Behavioral-pattern anomaly rather than program anomaly — exactly the real-world footnote to Section 1.4's "anti-cheat is not just cheat-tool detection"

### Step 3: Root Cause—Gradually Growing Risk That Never Hits a Single-Point Alert

1. **Direct cause**: 312 studio accounts scripted-farming the Molten Mine, whose drops are **tradable** with no output cap
2. **Mechanism cause**: risk-control rules were designed around "single-point features" (speed/memory/packet anomalies), missing the joint rule for "scaled farms of normal operations" (online hours × daily output × trade-flow clustering) — the signal layer of Section 3.2's risk-control loop was absent here
3. **Growth cause**: the dungeon's yield was raised by last month's numerical tuning, growth was week-by-week gradual, crossing the line only became visible this month — gradual risk triggers no alert conditioned on "single-point anomaly"

### Step 4: Remediation and Backfill

Remediation order (stop the increment first, then clean the inventory, then fix the criteria):

```text
T+0 上午   熔岩矿洞可交易掉落临时改绑定（服务端热配），增量止血
T+0 下午   312 账号按证据链批量封禁（Signals + RuleVer 留痕，可申诉）
T+1        异常产出金币双路径回收：异常资产冻结 + 过期邮件回收
T+2        交易流向图移交人工复核队列，下游买家按梯度处置
T+3        净增回落至基线附近，物价指数止涨
```

T+3 recheck: net increase fell back to **50M**/day (close to the 40M baseline); the remediation chain closed.

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill item | Owner | Completion criteria |
|--------|------|---------|
| Gold net-output criteria into the metric dictionary (output/recycling/net-increase columns; trades not counted as output) | Data | Registered in the metric dictionary |
| Daily report alerts: dungeon drop week-over-week + output share of top 0.05% of accounts | Security/Data | One alert drill |
| Joint risk-control rule: daily output threshold × online > 18h × counterparty concentration | Security | False-positive rate review passed |
| Binding/cap review for high-yield tradable drops into the numerical-change checklist | Design/Server | Review passed |
| Ban evidence-chain and appeal process drill (echoing 2.1 accountability) | Security/Support | One drill |

### Three Lessons from the Case

1. **Split the numerator and denominator before talking about anomalies**. The first step of an inflation investigation is always output vs. recycling — here recycling was completely normal; an investigation pointed the wrong way would spin in the monitoring data
2. **"No cheat tool detected" does not mean "no studio"**. Program-anomaly detection cannot cover scaled normal behavior; behavioral clustering (duration × output × flow direction) is the farm-revealing mirror (1.4/3.2)
3. **Gradual risk does not hit single-point alerts**. The yield raise was last month's, growth was gradual, crossing the line was this month's — alerts must be set on "trend and structure", not only on "single-point anomaly"

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
