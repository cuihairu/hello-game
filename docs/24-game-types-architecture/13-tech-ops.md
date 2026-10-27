# 13 Operations and Infrastructure in Practice

> This piece collects my practical observations on game backend capacity planning, monitoring and alerting, release and rollback, launch readiness, and incident response, with the focus on the special constraints that long-term game operations bring, and on how they differ from running ordinary internet services.
>
> Reference books: the operations framework of *Online Game Core Technologies and Practice* (Kenji Nakajima), and the reliability thinking of *SRE: Google Operations Unveiled*.

Launching the game is only the beginning; the real test is sustained operation. Server crashes, traffic spikes, data loss — every operations mistake can cost player churn and revenue. *Million Online* points out that game operations is not "fixing servers"; it is a systems engineering effort that needs continuous optimization and constant improvement.

Many teams treat operations as "technical work" and ignore its "managerial character". In fact, the core challenge of operations is not merely technical; it is a **process problem**: how to anticipate risk, how to respond quickly, how to learn from failures. A team with sound processes, even with average technical ability, is often more stable than a technically strong team with chaotic processes.

Game operations has two special properties that distinguish it from ordinary internet services, and they recur throughout this chapter:

- **Stateful**: player sessions and in-memory state make the routine cloud move of "casually restarting an instance" dangerous; releases and scale-out must consider state migration
- **Extreme peak-to-trough gap**: capacity is planned for the evening peak while capacity idles en masse in the small hours, so both the room and the motivation for elasticity and cost optimization are larger than for web services

---

## 1. Infrastructure Cost Estimation

### 1.1 The Full Cost Picture

The infrastructure cost of an online game is far more than server procurement. A complete cost model includes five dimensions: hardware cost, software cost, data-center cost, operations cost, and disaster-recovery cost. Many teams count only hardware and ignore hidden costs such as bandwidth and headcount, leaving the budget severely short.

```text
┌──────────────────────────────────────────┐
│              基础设施成本结构               │
├──────────────────────────────────────────┤
│  硬件成本 ─── 服务器、存储、网络设备       │
│  软件成本 ─── 操作系统、数据库许可、CDN    │
│  机房成本 ─── 机柜租金、电力、带宽         │
│  运维成本 ─── 人力、监控工具、7x24 值班    │
│  灾备成本 ─── 异地备份、容灾切换           │
└──────────────────────────────────────────┘
```

Beyond the five regular dimensions, games have a category of easily missed **global component costs**: cross-server battlefields, matchmaking services, gateways, chat, leaderboards — these "shared across all servers" components do not grow linearly with the number of zones, but neither are they free — they must be planned against the all-zone online peak, and scaling out any single zone can push up their capacity demand. Omitting global components when counting zone costs is a common cause of budget overruns.

### 1.2 A Bandwidth Estimation Example

Bandwidth is the most frequently underestimated cost. The estimation method is to take "per-player bandwidth × online peak" and multiply by a redundancy factor:

```text
假设：5 万人同时在线的 MMO
├── 每玩家平均带宽：50 Kbps（下行，状态同步场景）
├── 峰值总带宽：50,000 × 50 Kbps = 2.5 Gbps
├── 冗余系数：× 1.5（突发广播、活动高峰）≈ 3.75 Gbps
└── 按 ¥200/Mbps/月 包月计：约 ¥750,000/月
```

Three engineering means of reducing bandwidth, in priority order from high to low:

1. **AOI and tiered-frequency broadcast** (the Chapter 6 framework): only send state to "people who can see it", shrinking one broadcast from 50 thousand players to the few hundred within view
2. **Delta sync and merging** (the Chapter 4 protocols): only send changed fields, and merge multiple changes into one packet
3. **Frequency tiering**: distant players sync at a low frequency and nearby players at a high frequency; idle-time data (leaderboards, offline chat pulls) stays off the real-time channel

Bandwidth estimation should run this layered optimization before quoting — "50 thousand players × 50 Kbps" is a rough estimate for an unoptimized protocol, and the actual cost may be only a fraction of it.

### 1.3 Cloud Services vs a Self-Built Data Center

| Dimension | Cloud services | Self-built data center |
|------|--------|---------|
| Initial investment | Low (monthly billing) | High (millions to start) |
| Scale-out speed | Minutes | Weeks/months |
| Operations headcount | 1-2 people | 5-10 people |
| Long-term cost | Higher | Lower |
| Disaster recovery | Built in (cross-AZ) | Requires separate construction |

**Advice**: small and mid-sized teams should use cloud services; top-tier giants should build their own. For small and mid-sized teams, cloud elasticity and freedom from operations matter far more than long-term unit price — especially in an industry like games where "a successful project grows a hundredfold in a year", and the procurement cycle of a self-built data center often cannot catch up with business growth.

### 1.4 Cost Optimization Strategies

Cost optimization is not "saving money" but "spending money where it counts". Core strategies:

1. **Elastic scaling**: predictive scale-out based on historical curves, automatic scale-in during troughs (biggest payoff for stateless matchmaking, gateway, and chat services)
2. **Reserved instances**: baseline load on reserved/yearly instances (30-50% discount), elastic peaks on on-demand instances
3. **Resource reuse**: stagger dev/test environments, destroy after use, reduce idle resources
4. **Storage tiering**: SSD for hot data, HDD for warm data, object storage for cold data (the routine practice for logs and archives, see Section 3.3)

> **Pitfall**: the most common mistake in cost optimization is "over-optimizing" — to save a few tens of thousands in server costs, capacity falls short, the player experience degrades, and the lost revenue far exceeds the savings. The precondition for optimization is not touching player-perceptible experience; the other hidden mistake is "cutting disaster recovery" — saving the backup money in normal times and paying it all back at the first data incident.

---

## 2. Load Curves and Capacity Planning

### 2.1 The Peak-and-Trough Profile of Game Load

The load curve of an online game shows a clear **peak-and-trough profile**: a small midday peak (12:00-14:00), a large evening peak (20:00-23:00), and an overnight trough (2:00-8:00). Weekend peaks run about 1.5-2x weekdays, and holidays even higher.

This means: servers must be provisioned for the peak but idle most of the time — the value space for elastic scaling is large, yet constrained by the "stateful" property named at the start of this chapter: what can truly be scaled at will are stateless components (gateways, matchmaking, HTTP services); the game servers/room servers where players reside cannot scale in while players are online.

| Game type | Peak-to-trough ratio | Peak window | Scale-out strategy |
|---------|--------|---------|---------|
| MMORPG | 3:1 | 20:00-23:00 | Independent scale per zone, player traffic splitting |
| MOBA | 5:1 | 19:00-24:00 | Elastic room servers (released the moment a match ends) |
| Casual mobile | 2:1 | 12:00-14:00, 20:00-22:00 | Global elastic scaling |
| SLG strategy | 1.5:1 | Fairly even all day | Baseline reserved + a little elasticity |

**MOBA has the largest peak-to-trough ratio** (5:1), but its room servers are naturally highly stateless (rooms are destroyed when a match ends, state can be snapshotted), so the elastic-scaling payoff is also the highest — releasing most room servers overnight is feasible.

### 2.2 Capacity Derivation: From Single-Machine Stress Test to Server Count

The core of capacity planning is **a chain of derivation**: single-machine stress-test data → component capacity ceiling → machine count back-derived from the peak. Skipping the derivation and directly "plucking 20 machines out of thin air" is a common starting point of capacity incidents:

```text
推演链示例（开服 MMO，目标首日峰值 30,000 人在线）：

1. 单机游戏服压测：稳定承载 3,000 人（CPU <70%、P95 <100ms）
2. 会话网关：单机 20,000 长连接
3. 推演：
   ├── 游戏服：30,000 ÷ 3,000 = 10 台 → 留 50% 余量 = 15 台
   ├── 网关：30,000 ÷ 20,000 = 2 台 → 开服洪峰系数 ×3 = 6 台
   ├── 数据库：按每玩家每秒 0.2 次写 × 30,000 = 6,000 写/秒
   │          → 主从架构 + 连接池验证
   └── Redis：每玩家会话 ~2KB × 30,000 ≈ 60MB → 单实例绰绰有余，
              但要按"命令 QPS"而不是内存选型
4. 全局组件按全区峰值校验一遍（跨服、匹配、聊天）
```

Two disciplines of derivation:

- **Headroom is for failures, not for growth**. The first purpose of keeping 50% headroom is "if one machine dies, the traffic can be absorbed"; growth needs are met by elastic scale-out. Do not conflate the two.
- **Memory is estimated as "per-player resident × peak online" and calibrated by measurement**. Per-player memory usage (sessions, inventory cache, AOI lists) is a basic parameter of capacity planning and should come from measured stress tests rather than guesswork; it is also the first constraint on the "single-machine online ceiling" — many game servers hit the memory wall before the CPU wall.

### 2.3 Stress-Test Model Design

Load testing cannot only look at the peak; it must simulate real scenarios. The recommended approach is **stepwise load increase**: raise the load gradually, observe system behavior under different pressures, and find the bottleneck points and the "knee" (where latency starts rising non-linearly). The knee position determines the safe watermark — production load should stay within 60-70% of the knee.

**Core stress-test metrics**:

| Metric | Target | Alert threshold | Notes |
|------|--------|---------|------|
| Average response time | < 50ms | > 100ms | Request processing speed |
| P95 response time | < 100ms | > 200ms | Latency of 95% of requests |
| Error rate | < 0.1% | > 1% | Proportion of failed requests |
| Per-machine player capacity | Reaches design target | Below 80% of target | Input to capacity derivation |
| CPU usage | < 70% | > 80% | Peak CPU |
| GC pause | < 10ms | > 50ms | Garbage-collection impact |

| Game type | Stress-test focus | Special considerations |
|---------|---------|---------|
| MMO | Online population, AOI broadcast | Large-scale state sync, database writes |
| FPS/TPS | Latency, packet loss, sync precision | UDP performance, frame-sync computation |
| MOBA | Matchmaking speed, team-fight performance | Room create/destroy frequency, 5v5 real-time sync |
| Card | Concurrent login, instantaneous card-draw peak | The flood at the instant an event opens (midnight card draws) |
| Idle | Batch processing of scheduled tasks | Offline-reward batch settlement, on-the-hour resets |

Two details that easily distort a stress test:

- **Bot behavior must be realistic**. Stress bots that only send login and heartbeat produce a ceiling several times higher than the real scenario (a mix of movement + combat + chat + trading). Bot scripts should be modeled on the real player behavior distribution (online duration and operation-frequency distributions come from the previous product or industry data).
- **The data must have volume**. A stress test on an empty database and one on a hundred-million-row database behave completely differently. Before stress testing, load data close to production scale, and in particular cover the slowest query paths.

> **Pitfall**: the most common mistake in stress testing is "the test environment differs too much from production" — better hardware, no simulated real network latency, no real data volume. The stress-test result looks great, yet the system cannot hold up after launch. Recommendation: stress test in an environment of the same spec as production, or at least run shadow-traffic verification in production for the "doubtful parts".

---

## 3. Monitoring and Logging Systems

### 3.1 The Three-Layer Monitoring Architecture

Monitoring is the "eyes" of operations. A recommended three-layer monitoring architecture:

```text
┌─────────────────────────────────────────────┐
│  第一层：基础设施监控                          │
│  CPU │ 内存 │ 磁盘 │ 网络 │ 进程 │ 端口       │
│                    ↓ 告警                    │
│  第二层：应用性能监控 (APM)                    │
│  QPS │ 延迟 │ 错误率 │ 在线人数 │ 连接数       │
│                    ↓ 告警                    │
│  第三层：业务指标监控                          │
│  登录成功率 │ 充值成功率 │ 掉线率 │ 活动参与    │
└─────────────────────────────────────────────┘
```

The value division of the three layers: the first tells you "whether the machines are normal", the second "whether the service is normal", and the third "whether the players are normal". **Many failures are discovered first by the third layer** — a sudden drop in top-up success rate or an anomalous slide in a zone's online population can expose an exhausted database connection pool minutes before any CPU alert. Conversely, watching only the first layer leaves large blind spots of "machines normal but players already unable to play".

The three most worthwhile alerts in game business monitoring:

- **Sudden drop in online population** (drop exceeding threshold within 5 minutes): the first signal of a crash, network failure, or version incident, earlier than any technical alert
- **Login success rate** (alert below 99%): the login path covers gateway, account service, and session service; a failure in any link shows up here
- **Top-up success rate** (alert below baseline): directly affects revenue, and it usually moves before technical metrics degrade

### 3.2 Tool Selection

| Layer | Tool | Purpose | Deployment cost |
|------|------|------|---------|
| Metric collection | Prometheus + Exporter | System/application metrics | Low |
| Visualization | Grafana | Monitoring dashboards | Low |
| Log collection | Filebeat / Vector | Log collection | Medium |
| Log storage | Elasticsearch / Loki | Log retrieval | High / Medium |
| Distributed tracing | Jaeger / SkyWalking | Distributed tracing | Medium |
| Alert notification | Alertmanager | Alert routing and silencing | Low |

A note on selection: the cost of a logging system is highly elastic — full ES indexing can cost more in machines than the game servers themselves. Start with a "few indexes, bulk storage" solution like Loki and upgrade only when retrieval needs genuinely grow; distributed tracing pays off clearly in a microservice backend (gateway → account → game server → cross-server), while a monolith can skip it for now.

### 3.3 Logging Conventions

Structured logging is the foundation of efficient operations. A well-formed business log contains: timestamp, level, service name, **trace ID**, player ID, event name, and key data. The trace ID carries the same lineage as the request ID in the Chapter 4 protocol layer: client request → gateway → logic server → downstream services carry it the whole way, so one request can be strung into a single thread through hundreds of thousands of log lines — when troubleshooting across services, this saves hours.

**Log level usage conventions**:

| Level | Purpose | Retention policy |
|------|------|---------|
| DEBUG | Development debug info | Test environments only |
| INFO | Normal business flow | 30 days |
| WARN | Potential problems (retry, degradation triggered) | 90 days |
| ERROR | Error but recoverable | 180 days |
| FATAL | Severe error (process-level failure) | Kept permanently |

**Log volume estimate** (100 thousand online): about 50 lines per player per minute at 500 bytes each, roughly 3.6TB per day. Tiered storage: hot data 7 days on SSD, warm data 30 days on HDD, cold data beyond 90 days into object storage. Log volume itself should be monitored — an anomalous jump in log growth is often the first signal of abnormal behavior (cheat-tool scanning, bug loops).

> **Pitfall**: the most common logging problem is the "log storm" — some exception loop prints logs in bulk, fills the disk, and drags down the whole process (log writes block business threads). Defenses: log rate limiting (per-process per-second cap, drop and count beyond it), ERROR logs with de-duplication (the same error logged only once per minute plus an accumulated count), and separating the log disk from the data disk.

### 3.4 Alert Governance

Once monitoring is up, a new problem appears: **too many alerts, nobody reads them**. The principles of alert governance:

- **Every alert must be actionable** — the person receiving it knows what to do. Alerts that fail this ("CPU spiked and then recovered on its own") get downgraded to dashboard curves and out of notifications
- **Tiered routing**: P0 via phone/on-call hard reminder, P1 via instant message, P2/P3 into tickets. All alerts at one volume equals no alerts at all
- **Inhibition and aggregation**: when a host goes down, automatically inhibit the dozens of derived alerts on it (Alertmanager inhibition rules); aggregate similar alerts within a window into one
- **On-call system**: rotating on-call, handover documents, escalation paths (auto-escalate upward after 15 minutes without response). An alert system without an on-call system is just a historical recorder

A healthy indicator: **weekly P0/P1 alert volume is stable and every alert has a handling record**. Continuously swelling alert volume means thresholds have failed or the system is degrading, which needs a dedicated remediation effort rather than more people staring at screens.

---

## 4. Deployment and Release Management

### 4.1 Gray Release Strategy

Gray release controls risk by ramping up gradually:

```text
阶段1：内部测试（员工+白名单）→ 验证基本功能
    ↓ 无问题
阶段2：小规模灰度（1 个区服 / 5% 流量）→ 种子用户验证
    ↓ 无问题
阶段3：扩大灰度（20-50% 区服）→ 观察一个晚高峰
    ↓ 无问题
阶段4：全量发布（100%）
```

At each stage, watch three groups of metrics: error rate and latency (the technical side), crash rate and disconnect rate (the client side), and key business metrics (top-up, login). On any anomaly, first pause the ramp — the whole point of gray release is "you can always stop in an intermediate state".

Game-version gray release has a constraint that web services do not have: **the compatibility window between client version and server version**. Old client versions linger in the app stores for weeks, and the server must stay compatible with multiple client versions at the same time (see Chapter 4 for the compatibility discipline of protocol evolution). So a game server's "gray release" is often dual-track: the server first ships a compatible version (usable by all old clients), the client then gray-releases by channel, and finally the server removes old-protocol support.

### 4.2 The Special Nature of Releasing Stateful Services

Here lies the biggest difference between releasing game servers and web services: **you cannot casually restart**.

- **Web services**: stateless, rolling restart, traffic switching, players unaware
- **Game services**: player sessions live in memory; a hard restart = everyone disconnected + in-memory state lost

Common countermeasures, ordered from low to high player impact:

1. **Natural sign-off rolling**: the release script marks "stop new players from entering" and waits for online players to sign off naturally (idle games can wait; for hardcore games the wait is uncontrollable)
2. **Announcement + scheduled maintenance**: announce the downtime window in advance; within player expectations. The standard practice for major versions
3. **Fast kick + fast recovery**: persist state first (snapshot), kick players, restart, restore connections — 1-2 minutes end to end. Combined with client reconnection, the player perceives a brief stutter. Players in competitive matches must first wait for the match to end or have the match transferred
4. **In-process hot update** (script/config layer, see 4.3): fix logic bugs without stopping the server; the best experience but limited in capability boundary

Choosing the release window is also a trade-off: releasing in the small hours minimizes player impact but the on-call staff is thinnest; releasing before the evening peak catches the peak but the risk window lands right on it. The common convention is "release in the afternoon, finish verification before the evening peak", leaving prime time for observation rather than operation.

### 4.3 Hot Update and Rollback

A capability ladder for hot updates:

| Type | Impact scope | Server stop required | Typical scenarios |
|------|---------|---------|---------|
| Config hot update | None | Not needed | Numerical tuning, event config, switch toggles |
| Script hot update | Single process | Not needed | Logic fixes, balance tuning |
| Protocol hot update | Client + server | Needed | Protocol changes, new features |
| Full update | All servers | Needed | Major-version updates, engine upgrades |

The core of config hot update is **separating config from logic** (the Chapter 10 event-system practice); the mechanism and boundary of script hot update are in Chapter 16. Here I stress one point from the operations angle: **a config change is a "release" and must be managed as one** — gray (first change one zone and observe), rollback-capable (the old config version kept for one-click switch-back), with a change record (who, when, changed what, why). "A planner changed the live numbers directly leaving no trace" is the hardest kind of numerical incident to investigate.

The principle of the rollback mechanism: **rollback is not "optional" but "required"**. Before a release, the rollback plan must be prepared and rehearsed: binary rollback (keep N historical build artifacts), config rollback (versioned storage), and database-change rollback (schema changes must be designed forward-compatible — the new code first tolerates the old table structure, so a rollback does not need to roll back the table structure — this discipline avoids the dead end of "the code rolls back but the data cannot").

> **Pitfall**: the most common release mistake is "no verification after release" — the release finishes, nobody watches the metrics, and the problem surfaces only when players complain. Recommendation: immediately after release, run a round of automated smoke tests (login, entering a server, core gameplay requests, placing a payment order), and assign someone to watch the key metrics for at least 15 minutes.

---

## 5. Game Launch in Practice

### 5.1 The Pre-Launch Readiness Checklist

Launch is the most critical moment in a game's lifecycle and demands thorough preparation:

```text
□ 基础设施：服务器已部署、数据库已初始化、CDN 已配置、DNS 已生效
□ 客户端准备：已过渠道审核、资源包已上传 CDN、首日补丁已演练
□ 运营准备：活动配置已上传并核对、礼包已配置、公告与客服话术已准备
□ 监控准备：看板已配置、告警规则已设置、值班表已排定
□ 压力测试：单机压测已通过、集群压测已通过、容量推演已评审
□ 应急预案：回滚方案已验证、扩容预案已就绪、降级开关已测试
```

The last item, "degradation switches tested", deserves expansion: degradation is not "find the code at failure time and add an if", it is **a switch buried in advance**. Before launch, the degradation checklist should be written as config and actually rehearsed:

| Degradable item | Degradation action | Player perception |
|---------|---------|---------|
| Leaderboard | Switch to hourly refresh | Data delay |
| Friend online status | Turn off real-time push, poll instead | Slower status updates |
| World chat | Rate limit / temporary shutdown | Typing restricted |
| Cross-server gameplay | Announcement of postponed opening | Feature delayed |
| Client resource verification | Skip verification, let through | Temporarily lower security |

### 5.2 Handling the Launch Traffic Flood

The traffic flood at the moment of launch is the biggest challenge — pre-registered players pour in at the opening instant, and the peak may be 5-10x the steady state. The core strategy is "rate limiting + queuing + degradation + scale-out":

- **Queuing system**: when over capacity, let players wait on a queuing screen instead of rejecting them outright. "Queuing" is a far better experience than "failure" — players will wait 5 minutes to get in, but after three "connection failed" they uninstall. Implementation points of a queuing system: persist queue tokens (the queue survives a process restart), show the estimated wait on a progress bar, anti-abuse (deduplicate repeated queuing from the same device)
- **Rate limiting**: token-bucket rate limiting on the login endpoint (the TokenBucket of Chapter 4); beyond the limit, return "server busy, please try later" instead of letting requests pile up and knock the service down
- **Degradation**: per the switch checklist of 5.1, shut off non-core features and leave the resources to login and core gameplay
- **Scale-out**: automatically scale out gateways and stateless services by CPU/connection count; game servers open one by one per the planned "reserve zones"

> **Pitfall**: the queuing system itself getting knocked over is the black comedy of launch incidents — every player who cannot get in is hammering the queue-status endpoint, so the queuing service actually takes the greatest pressure. Queue-status queries must use caching/static generation (global progress updated once every 5 seconds), not per-player real-time queries.

### 5.3 Post-Launch Monitoring Focus

The first 24 hours after launch is the most critical monitoring window; keep an eye on:

- Online population trend (vs the expected curve)
- Login success rate (target > 99%)
- Queue length and estimated wait time
- New registrations, top-up amount (vs expectations)
- Error log count and top error types
- Server resource usage and capacity watermark

> **Pitfall**: the most common launch mistake is "going live under-prepared" — no stress test, monitoring not configured, rollback not verified. Recommendation: finish all preparation at least one week ahead, and run a full-process rehearsal (including scale-out and rollback drills) the day before launch.

---

## 6. Incident Response

### 6.1 Incident Grading and Response

| Level | Definition | Impact scope | Response time | Resolution deadline |
|------|------|---------|---------|---------|
| P0 | Server down / whole service unavailable | All players | 5 minutes | 30 minutes |
| P1 | Core features unavailable | Large swathe of players | 15 minutes | 2 hours |
| P2 | Features anomalous but usable | Some players | 30 minutes | 8 hours |
| P3 | Experience problems | Few players | 2 hours | 24 hours |

### 6.2 The Emergency Response Process

```text
故障发现（监控告警/玩家反馈）
    ↓
故障确认（5 分钟内）── 确认级别、影响范围、拉起应急群、指定指挥
    ↓
止损优先（15 分钟内）── 快速恢复优先于根因定位：回滚、重启、切流、降级
    ↓
问题定位（恢复后）── 收集日志、分析根因、制定修复方案
    ↓
修复实施 ── 执行修复、验证效果、监控稳定
    ↓
事后复盘（48 小时内）── 编写报告、总结教训、制定改进措施并跟进行
```

The most important principle in the process: **stop the bleeding before locating the cause**. In the first 15 minutes of a live incident, the goal is not "figure out why" but "let players play first". Rolling back a version released 10 minutes ago beats reading 40 minutes of logs to find the root cause — even if it turns out the version was not at fault, the cost of the rollback is far smaller than continued downtime. Conversely, the obsession to "locate first, then act" is the biggest man-made factor in a P0 worsening.

Another frequently ignored point: **keep information synchronized during the emergency**. Designate one person responsible only for communication (external announcements, internal progress broadcasts) and let the handlers focus on handling. The information vacuum of "players already raging on the forums while the company is still investigating" hurts reputation more than the failure itself.

### 6.3 Common Failure Quick Reference

Typical signatures and first reactions for a few high-frequency failures:

| Symptom | Common root cause | First reaction |
|------|---------|---------|
| Cliff-fall in online population | Gateway down / carrier failure / version incident | Layered confirmation: gateway process → data-center network → recent changes |
| Whole service stuttering but not down | Slow queries / log storm / GC degradation | Check database slow queries and disk IO first, then recent changes |
| Falling top-up success rate | Payment callback backlog / channel failure | Check the callback queue backlog first; contact the channel to confirm |
| Concentrated burst of login failures | Session-service failure / exhausted DB connection pool | Watch the connection-pool watermark; restart the session service |
| Localized zone anomalies | Single-server data problem / recent config change on that server | Compare the change delta between normal and anomalous servers |

### 6.4 The Value of Postmortems

A postmortem is not "assigning blame" but "learning". The three standard postmortem questions: what was the root cause? Why was it not caught earlier? How do we prevent recurrence?

Improvement measures must have **an owner and a deadline** ("XX adds slow-query alerting to the database before X/X"), otherwise the postmortem minutes become just another historical document nobody reads. Look at trends across failures: the same kind of failure appearing twice or more means the previous improvement measures never landed — that is a process problem, not a technical one.

> **Pitfall**: the most common mistake in incident handling is "rushing to fix while ignoring the root cause" — the server is down so restart it, the database is slow so add an index. Stopping the bleeding is necessary, but without locating the root cause the same problem recurs endlessly. The right sequence: stop the bleeding first (restore service), then locate (find the root cause), then fix (cure it at the root), documenting throughout.

---

## 7. Operations Automation

### 7.1 The Automation Stack

Automation turns operations from "human firefighters" into "process guarantors". Core components:

- **Configuration management** (Ansible etc.): unified management of server configs, batch changes
- **Continuous integration** (CI): automated build, test, and artifact production
- **Container orchestration** (Kubernetes): auto scale-out/in and failover for stateless services
- **Logging and monitoring** (the Section 3 system): automated alerting and dashboards
- **Ops tickets/approvals**: high-risk operations (server merges, data deletion, config changes) go through an approval flow with an audit trail

One boundary of game operations needs stating: Kubernetes pays off clearly for stateless components (gateways, matchmaking, HTTP services); but **the game servers/room servers where players reside are stateful processes**, and directly applying K8s's "restart and drift at will" model causes incidents. Orchestrating stateful services needs a custom migration flow (persist state → notify → switch → recover); many teams do "K8s manages the stateless layer + a dedicated room scheduler manages the game servers" — do not force stateful services into the standard model just to unify the tech stack.

### 7.2 The Automated Deployment Pipeline

The core of automated deployment is **repeatability and rollback**:

1. Code merged into the release branch
2. CI pipeline triggered: build + automated tests + artifact archiving
3. Gray release (the staged ramp of Section 4.1)
4. Automated smoke verification + metric observation
5. Full release or automatic rollback

Every step has explicit success criteria and rollback conditions — gate rules like "auto-stop when the smoke test fails" and "auto-rollback when the error rate exceeds threshold" are more reliable than any manual gatekeeping.

> **Pitfall**: the most common automation mistake is "automating the wrong process" — if manual deployment is itself flawed, automation only spreads the problem faster. Recommendation: first run the process manually and stably for a while, fill in all the pits, then automate and lock it in.

---

## 8. Code Example: A Minimal Skeleton for Log-Storm Defense and Online-Drop Alerting

The pitfall of Section 3.3 (log storm) and the advice of Section 3.1 (a sudden drop in online population is the first signal of failure) are both "one sentence when written, one layer of skin when done". This section packs them into a minimal Go demo implementation (not taken from a real project): a log gate with rate limiting and ERROR de-duplication, and a sliding-window sentinel detecting sudden online drops. The code blocks in this section, merged, compile under `go vet` and `go build`, and are covered by the repo-wide code-block regression tests.

### Log gate: rate limiting + ERROR de-duplication

```go
// LogGate：日志风暴防御（3.3 节陷阱）。
// 两道闸：每秒总量限流（超限丢弃并计数）+ ERROR 指纹去重
// （同一错误一分钟内只落一条，其余次数累计）。
// 时间用注入函数提供，测试可控
type LogGate struct {
    mu        sync.Mutex
    now       func() int64
    budget    int     // 本秒剩余配额
    sec       int64   // 当前时间片
    lastKey   string  // 最近一条 ERROR 的指纹
    lastSec   int64   // 该 ERROR 落日志的时间片
    errRepeat int     // 同指纹未落日志的累计次数
    dropped   uint64  // 被限流丢弃的条数（应被监控采集——丢弃量跳变本身是信号）
    emit      func(level, line string)
}

const perSecondLimit = 1000

func NewLogGate(now func() int64, emit func(level, line string)) *LogGate {
    return &LogGate{now: now, budget: perSecondLimit, emit: emit}
}

func (g *LogGate) Write(level, line string) {
    g.mu.Lock()
    defer g.mu.Unlock()

    sec := g.now()
    if sec != g.sec { // 跨秒：配额恢复
        g.sec = sec
        g.budget = perSecondLimit
    }

    if level == "ERROR" {
        key := errorFingerprint(line)
        if key == g.lastKey && sec-g.lastSec < 60 {
            g.errRepeat++ // 同一错误一分钟内：只计数，不落日志
            return
        }
        if key == g.lastKey && g.errRepeat > 0 {
            // 窗口结束后的同指纹错误：把上一分钟的重复次数补记进本条
            line = fmt.Sprintf("%s (repeated %d times in last minute)", line, g.errRepeat+1)
            g.errRepeat = 0
        }
        g.lastKey, g.lastSec = key, sec
    }

    if g.budget <= 0 {
        g.dropped++
        return
    }
    g.budget--
    g.emit(level, line)
}

// errorFingerprint：演示版取首 32 字节作指纹；
// 真实实现应做归一化（剥离时间戳/ID 等可变段），否则同一错误变体绕过去重
func errorFingerprint(line string) string {
    if len(line) > 32 {
        return line[:32]
    }
    return line
}
```

### Online sentinel: sliding-window sudden-drop alert

```go
// OnlineGuard：在线人数突降告警（3.1 节——比任何技术告警都早的第一信号）。
// 维护最近 N 个采样的环形窗口：当前值较窗口内峰值跌幅超阈值即触发。
// 窗口未满不告警——避免服务冷启动阶段的误报
type OnlineGuard struct {
    mu        sync.Mutex
    window    []int64
    head      int
    size      int
    threshold float64 // 跌幅阈值，0.3 表示跌 30%
    alert     func(cur, peak int64)
}

func NewOnlineGuard(capacity int, threshold float64, alert func(cur, peak int64)) *OnlineGuard {
    return &OnlineGuard{
        window:    make([]int64, capacity),
        threshold: threshold,
        alert:     alert,
    }
}

// Observe：每次在线人数采样调用一次（如每 30 秒）
func (w *OnlineGuard) Observe(online int64) {
    w.mu.Lock()
    defer w.mu.Unlock()

    peak := w.peak()
    if w.size == len(w.window) && peak > 0 {
        if drop := float64(peak-online) / float64(peak); drop >= w.threshold {
            w.alert(online, peak)
            // 同一故障会连续触发——真实实现要配静默窗口（3.4 节的聚合与抑制）
        }
    }

    w.window[w.head] = online
    w.head = (w.head + 1) % len(w.window)
    if w.size < len(w.window) {
        w.size++
    }
}

func (w *OnlineGuard) peak() int64 {
    if w.size == 0 {
        return 0
    }
    max := w.window[0]
    for i := 1; i < w.size; i++ {
        if w.window[i] > max {
            max = w.window[i]
        }
    }
    return max
}
```

The two pieces share one design stance: the defense logic stands apart from the business write path (`emit` and `alert` are both injected outlets), the storm is stopped outside the gate, and the alert trusts only data — this is a miniature of Section 7's operations automation "let the system speak for itself first".

---

## 9. Design Decision Guide

**When to choose cloud services vs a self-built data center**

- **Cloud services**: small and mid-sized teams, fast iteration, large traffic swings, multi-region operation
- **Self-built data center**: large-DAU products with stable traffic, long-term cost sensitivity, a dedicated operations team

**When you need a full monitoring system**

- Online players exceed 10 thousand
- A paid system has gone live
- Multi-server/multi-zone deployment
- SLA commitments or channel assessments

**When to introduce an on-call system**

- The product enters open beta/launch and needs off-hours response
- Minute-level response to P0 failures is an explicit business requirement
- Automated alerting is already in place and needs people to consume the alerts

**Choosing the release method**

- Changes hot-updatable via config/scripts: hot-update release, zero perception
- Server binary changes: natural sign-off rolling or scheduled maintenance (Section 4.2)
- Client changes: staged gray release by channel, the server keeps the compatibility window

---

## 10. Common Pitfalls Summary

| Pitfall | Symptom | Root cause | Solution |
|------|------|---------|---------|
| Cost underestimate | Budget overrun | Counting only hardware, missing bandwidth and global components | Full cost model + layered bandwidth optimization estimate |
| Distorted stress test | Cannot hold up after launch | Environment gap, unrealistic bots, empty database | Same-spec environment + real behavior distribution + data loading |
| Capacity by gut feel | Knocked over by the launch flood | No derivation chain from single-machine data to machine count | The Section 2.2 derivation chain + headroom review |
| Monitoring blind spots | Failures found late | Monitoring only infrastructure, not the business | Three-layer monitoring + online population/login rate/top-up rate alerts |
| Alert fatigue | Nobody reads the alerts | Too many non-actionable alerts | Tiered routing + inhibition and aggregation + periodic governance |
| Release incidents | Crashes after going live | No gray release, no rollback, no post-release verification | Staged gray release + rehearsed rollback + smoke verification |
| Casual restart | Whole service disconnects, state lost | Bringing stateless ops habits into stateful services | The stateful release process of Section 4.2 |
| Queuing system crash | The launch queue endpoint gets hammered | Queue status queried in real time at high frequency | Static/cached status |
| Recurring failures | The same problem keeps coming back | Only stopping the bleeding without postmortems, or postmortems that never land | Root-cause location + improvement measures with owners and deadlines |

---

## 11. Practical Case: Investigating an On-the-Hour Event Stutter Where "Monitoring Was All Green"

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. The first three cases went after data correctness (criteria/duplication/loss); this one goes after monitoring criteria: the players' "stutter" was smoothed into "normal" by an average, and the investigation chain runs from "monitoring all green" to the wrong metric being chosen.

**Background and symptoms**: a new event opens Friday 20:00. From 20:03, customer support is flooded with tickets: "the event screen freezes when opened, then disconnects". The monitoring dashboard is all green: CPU peak 62%, memory normal, bandwidth normal, server average processing latency **45ms**, normal. The sudden-online-drop alert did not fire either — a 5-minute drop of **6%** (threshold **10%**; disconnects caused by stuttering are gradual, not cliff-like).

### Step 1: Align the Criteria First — Which Metric Does the Players' "Stutter" Actually Refer To (Echoing 3.1)

Three mutually exclusive criteria are on the table: client frame-rate event tracking shows a stutter rate of 0.3% (daily 0.25%) → not rendering stutter; the gateway disconnect rate rises, but lags the latency spike by about 30 seconds → it is an effect, not a cause; server latency — but the right criterion must be picked: the average of **45ms** is perfectly normal, while P99 shot from **80ms** to **3200ms** (71x the average, 40x the pre-incident P99). The dashboard used the average criterion throughout, hence "monitoring all green". Once the criteria are unified, the anomaly goes from invisible to glaring: the problem is in the server processing path, not the client, not the network.

### Step 2: The Layered Investigation Chain (Echoing the 6.2 Emergency Process and the 5.2 Flood Response)

```text
客户端   帧率卡顿率 0.3%（日常 0.25%）        → 排除
网络     网关转发耗时 < 5ms，排队轻微          → 排除
业务服务 活动信息查询接口 P99 3200ms，尖刺集中在 20:00–20:06，其他接口正常
存储     MySQL 慢查询从 0 → 每秒 400+，连接池活跃数顶满 200/200
```

Layer-by-layer elimination locates the storage layer — not the client, not the network; it was the event-info query that punched through the database.

### Step 3: Root Cause — Concentrated Cache Expiry + Three On-the-Hour Sources Piling Up

The root-cause chain has three links:

1. **Concentrated cache expiry**: the event-config cache had a fixed 30-minute TTL, and the last batch happened to expire together at 19:59 (making way for the latest config before the event opened)
2. **Player-peak cache breakdown**: the event opened at 20:00; of the 200 thousand online, about 140 thousand (70%) opened the event screen within 3 minutes, and every cache miss hit MySQL (the real-time version of the Chapter 08 cache breakdown)
3. **On-the-hour task pile-up**: leaderboard snapshot, daily settlement, and event-open broadcast — three scheduled tasks ran at exactly 20:00, fighting with player queries over the same connection pool capped at 200 (the Section 2.1 peak-and-trough feature: peaks are not historical curves, they are piling-up events)

Slow queries 0 → 400/sec, connection pool maxed → P99 3200ms → some requests time out → client timeout retries double the traffic again.

### Step 4: Remediation

1. **Emergency degradation**: the event-info endpoint first returns a degraded version (dropping the personalized-recommendation fields); single-request time roughly -60%
2. **Connection-pool isolation**: the three on-the-hour tasks move to a separate read-only connection pool, physically isolated from player queries
3. **Hot fix**: TTL randomization (30 minutes ± 5 minutes of jitter) + proactive prewarming 10 minutes before the event opens
4. **Retry governance**: add jitter and a retry-count cap to event-endpoint timeout retries, preventing a retry storm from amplifying a second time

Recovered at 20:14: P99 back down to **90ms**, slow queries at zero.

**Backfill checklist** (echoing the Chapter 14 postmortem backfill discipline):

| Backfill item | Owner | Completion criteria |
|--------|------|---------|
| Dashboard criteria rework: averages must come with P99/P999; alert by per-endpoint percentiles | Ops | Dashboard revamp review passed |
| Connection-pool alerts switch to per-second peak triggers, not minute averages | DBA | One alert drill |
| Static scan for fixed-TTL batch expiry + random jitter | Business service | 0 scan hits |
| Add a "sustained low watermark" variant to the online-drop alert (gradual disconnects) | Ops | One drill |
| Put "on-the-hour three-source pile-up" into the stress-test model (echoing 2.3) | QA/Ops | Stress test re-run passed |

### Three Lessons from the Case

1. **Averages are for capacity; percentiles are for players**. A dashboard using averages is not wrong in its data but in its criteria — the player experience is decided by the long tail, and the monitoring criteria must align with the experience criteria (in the metric dictionary, "stutter" is defined as P99, not the mean)
2. **"Monitoring all green" usually means the wrong metric was chosen, not that the system is fine**. Each layer of the three-layer monitoring (3.1) must be asked "is this metric's failure mode visible" — average smoothing is the same class of pitfall as the silent signature-verification failure in Chapter 12
3. **Peaks are not historical curves, they are piling-up events**. On-the-hour moments naturally pile up three sources (player events, scheduled tasks, config expiry) — capacity derivation and the stress-test model (2.1/2.3) must be designed for the "piled-up-event peak", not for the historical average

---

## Chapter Summary

| Question | Short answer |
|------|------|
| The core method of capacity planning? | The derivation chain: single-machine stress test → component ceiling → machine count back-derived from the peak; headroom for failures, elasticity for growth |
| The biggest difference between releasing game services and web services? | Stateful — no casual restarts; dedicated flows needed such as natural sign-off / scheduled maintenance / snapshot fast restart |
| Which business alert is most worth configuring? | Sudden drop in online population — it is the earliest composite signal of crashes, network problems, and version incidents |
| The two key designs of the logging system? | Trace ID running through the full path + rate limiting against log storms |
| The goal of the first 15 minutes of a P0? | Stop the bleeding, not locate — rollback, restart, traffic switching, degradation; let players play first |
| The rollback discipline for database schema changes? | Forward compatibility: the new code tolerates the old table structure; the code can roll back, the table structure does not |
| The four-piece set for the launch flood? | Rate limiting + queuing + degradation + scale-out; queue status must be made static to avoid being hammered |
| The precondition for automation? | First run it manually and stably, then automate and lock it in — do not automate a broken process |

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
