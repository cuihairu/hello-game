# 17 Version Release, Config and the R&D Pipeline

Version problems in a game project are never just "build the package and then ship it." What is really troublesome is that clients, assets, scripts, config, protocols, server-side logic and event data often change at different cadences, while players, channel review, platform rules, live events and multi-platform coexistence force the system to absorb these changes at the same time. The release system is therefore not just an operational flow but a whole set of long-term governance capabilities.

Many teams lose ground on version problems not because they do not know how to release, but because they have long understood it too narrowly: assuming there is only one "current version" in production; assuming that having CI/CD means having version governance; assuming gray release is just a percentage switch; assuming config tables and event data do not count as a formal release chain.

> In the real world, release stability comes from a deeper capability: can the system describe which set of components a player is actually running, whether those components are mutually compatible, and when a problem appears, can it shrink the blast radius, stop the bleeding quickly and return to a stable state.

> This chapter shares its argumentative framework with the knowledge base's "version release, config and R&D pipeline" chapter: that chapter concentrates on the judgment calls and pitfalls of version governance, while this chapter completes the engineering landing on the same framework, giving concrete implementations for multi-component version management, gray release/rollback and the config pipeline.

---

## 1. Overview of the Version System

"Version" in a game project is never a single number; it is a set of components that exist at the same time, depend on each other, and yet change at different cadences. Client packages, asset patches, the scripting layer, config tables, protocol definitions, server-side logic and operations event data usually all evolve independently. Only by acknowledging this first can the release system have any chance of being designed right.

Many version incidents are hard to investigate not because some component itself is wrong, but because two sets of components that were each individually legitimate mismatched when combined. For example, an old client pulls a new config, a new protocol meets old assets, or a hot-update script runs on host code that is not ready.

### 1.1 Why the Longer a Project Runs, the More Version Problems Become System Problems

Short-cycle projects can sometimes limp along with "everyone releases together, everyone switches together, everyone replaces together." But once a project enters long-term operation, these realities turn version problems from release actions into system problems:

- Parallel multi-platform and multi-channel distribution
- Assets, config and events need high-frequency iteration
- Hot update and gray release become the norm
- Platform review naturally lags client package updates
- Old players and new players run for long periods on different component combinations

At that point, without a formal version model, the team can only rely on experience to guess compatibility relations, and incidents become increasingly hard to contain.

### 1.2 What a Version System Really Has to Answer

A mature version system should at least be able to answer four questions:

1. Which set of components is each player actually running
2. Is that set of components within the officially supported range
3. Which components must be upgraded in sync, and which can be upgraded independently
4. When a problem appears, can you quickly fall back to the previous stable combination

Note that what is truly important here is not the form of the version number, but whether the system has "decidability." If a team cannot clearly judge whether a set of components is legitimate, then gray release, rollback and compatibility that follow have nothing to stand on.

### 1.3 Why the Phrase "Current Production Version" Is Often Harmful

It is harmful not because the phrase cannot be said, but because it masks the real structure. In production there usually is not one absolutely unique version state; at least these coexist at the same time:

```text
线上版本的真实结构
┌────────────────────────────────────────────────┐
│              "当前线上版本"（简化视图）            │
│                  vs                             │
│              实际构件组合（真实视图）              │
├────────────────────────────────────────────────┤
│                                                │
│  客户端包版本：v2.1 / v2.2 / v2.3（多版本共存）   │
│  热更层级：  patch_1 / patch_2 / patch_3        │
│  资源清单：  res_v15 / res_v16                   │
│  配置批次：  config_batch_42 / batch_43          │
│  服务端灰度：group_A(旧) / group_B(新)          │
│                                                │
│  玩家可能处于以上任意合法组合中                    │
└────────────────────────────────────────────────┘
```

If the system still thinks about problems with only one unified version number, many real mismatches and incident paths get masked by the language itself.

### 1.4 A Version Perspective Closer to Reality

A safer approach is to see version as a set of "component combination + dependency relations + effective timing":

- **Component combination** states which variable parts the system consists of
- **Dependency relations** states which combinations are legitimate and which are not allowed
- **Effective timing** states when they actually take effect for players

With this perspective, many originally vague questions become clear, such as "does a certain event require new assets and new config to both exist," "can a certain old package still coexist with the current protocol," or "does the hot update cover the device models currently crashing."

### 1.5 A Version System Is Not a Tool Substitute

CI/CD, package management, hot-update platforms and config platforms are all important, but they themselves do not equal version governance. Tools can execute flows automatically, but they cannot define for the team: what the version boundary is, how long the compatibility window is, which set of components is the rollback target, and which changes can be ramped up independently.

If nobody explicitly makes these judgments, no matter how automated the flow, incidents will simply happen faster, automatically.

---

## 2. Client, Asset, Config and Protocol Versions

Binding all changes to the client package version looks like the least effort in the early stage, but it will almost certainly fail in the long run. The reason is simple: these components are not in service of the same release cadence. The client package is constrained by review and channels, assets and config often need faster iteration, and protocol and server-side logic may be forced to evolve out of sync to preserve a compatibility window. Hard-binding them together means every change has to take the slowest, heaviest path.

### 2.1 What Each of the Four Version Types Really Represents

#### Client Package Version

It usually represents host binary capability, including:

- Native code and the engine runtime
- Platform SDKs and system permissions
- Local host interfaces
- Base rendering and runtime capability

It is the heaviest and hardest to replace frequently, so it is usually better suited as the lower bound of host capability, not as the carrier of all business change.

#### Asset Version

The asset version corresponds to presentation assets and the loading manifest, for example:

- UI atlases
- Scene and effect assets
- Audio and animation
- Sub-packages and hot-update asset sets

Its key is not the version number itself, but asset dependencies, manifest consistency and the matching relation with host capability.

#### Config Version

The config version corresponds to rule data and content parameters, for example:

- Numerical parameters
- Event rules
- Drop and quest tables
- Page and content orchestration

The reason the config version needs independent governance is that its change frequency is usually far higher than the client package's, and once it goes wrong it often does not show up as a crash but as a more subtle rule incident.

#### Protocol Version

The protocol version represents the communication contract and state structure, including:

- Message format
- Field semantics
- Feature-flag support scope
- Whether frontend and backend can reach a shared understanding of the same state

The difficulty of the protocol version is not the upgrade itself, but how old and new clients are both correctly received by the server within the compatibility window.

### 2.2 Why These Versions Need to Be Governed Separately

If they are not separated, the most direct consequences are usually two:

- Lightweight changes are forced down the heaviest release chain, and overall responsiveness slows down more and more
- Heavyweight changes disguise themselves as lightweight changes, and compatibility and risk are systematically underestimated

For example, a small change that only wants to fix an event parameter, if it has to go through client resubmission for review, will have its iteration cost spiral out of control; conversely, if a change that depends on a new host interface disguises itself as "just an asset and config update," very dangerous compatibility incidents will appear in production.

```text
版本拆分前后的发布链路对比
┌────────────────────────────────────────────────────────┐
│  拆分前：所有变化绑在客户端包版本上                      │
│                                                        │
│  任何改动 → 重新打包 → 提审 → 审核 → 上架               │
│  (3-7 天)                                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  拆分后：按构件类型独立发布                              │
│                                                        │
│  配置改动 → 导表 → 灰度发布 → 即时生效    (1-2 小时)     │
│  资源改动 → 打包 → 热更新下载 → 即时生效   (30 分钟)     │
│  脚本改动 → 编译 → 热更新下载 → 即时生效   (30 分钟)     │
│  协议改动 → 服务端发版 → 兼容层处理         (1-2 天)     │
│  客户端改动 → 打包 → 提审 → 审核 → 上架    (3-7 天)     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2.3 After Splitting Versions, What Is Really Added Is Not Numbers but Dependency Relations

Many teams go to another extreme here: since we are splitting, give every class of component a version number. The problem is that version numbers without dependency relations and validation rules only make the system more chaotic.

What really needs to be formally expressed is:

| Dependency relation | Example |
|---------|------|
| Asset → client package | Which package version a given asset version requires at minimum |
| Config → protocol | Whether a given config batch depends on a given protocol field |
| Protocol → client package | Whether a given protocol version is still compatible with a set of historical clients |
| Hot-update patch → host | Whether a given hot-update patch can only run on a specific host capability |

The number of versions is not the problem; losing decidability is the problem.

### 2.4 A Safer Organizational Approach

A safer approach usually involves:

- Use package version to define the host capability baseline
- Use asset version to define the loadable asset set
- Use config version to define a rule data snapshot
- Use protocol version to define the communication compatibility boundary
- Use explicit dependency rules to string them together

The core of this is not splitting concepts finer, but letting the system know which changes can advance independently and which need to advance in lockstep.

### 2.5 The Most Overlooked Testing Difficulty

After splitting versions, the testing difficulty is no longer just "can the current version run," but:

- Can all legitimate combinations run
- Can all illegal combinations be blocked
- Can historical packages still connect stably within the compatibility window
- Do gray and non-gray groups see the correct differences

So multi-version governance essentially also requires upgrading the testing and release platforms; otherwise the team has only moved complexity from the development side to production.

---

## 3. Gray Release, Rollback and the Compatibility Window

Stable release does not mean "this time there will surely be no problems," but that once there is a problem, the system can detect it, contain it and roll it back within a controllable range. Gray release, rollback and the compatibility window are precisely the three pillars built around this goal. Missing any one of them, the release system is hard to call mature.

### 3.1 Why the Release System Needs to Assume Production Will Expose Unknown Problems

No matter how carefully testing is done, production always has variables that cannot be exhausted before testing:

- Device model and system version combinations
- Differences in historical packages and patch chains
- Platform SDK or channel environment differences
- Users' real paths and extreme operations
- Combinations of old cache, new assets and new config

So the release system cannot be built on the assumption that "testing has covered all cases," but on the assumption that "unknown problems will certainly keep appearing."

### 3.2 What Really Makes Gray Release Worth Its Price

Gray release is not as simple as "let 5% of users try it first"; it is more like a risk-slicing capability. A truly valuable gray release can usually slice along these dimensions:

| Gray dimension | Applicable scenario | Value |
|---------|---------|------|
| User grouping | New vs old users, paying vs free users | Locate problems in specific user groups |
| Channel and platform | iOS/Android, each app store | Discover platform-specific compatibility problems |
| Region and network environment | Domestic vs overseas, WiFi/4G | Discover network-environment-related problems |
| Client package version | Old version vs new version | Discover inter-version compatibility problems |
| Feature flag | Independent control of a new feature | Precisely isolate the impact of a new feature |

The significance of doing this is that once a problem appears, the team can learn faster where the blast radius is, rather than having to blindly guess between "all users might be affected" and "we have no idea who is affected."

```text
灰度风险切片示意
┌────────────────────────────────────────────────┐
│                  全量用户                       │
│  ┌──────────────────────────────────────────┐  │
│  │            灰度放量 10%                   │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │      按平台切片：iOS 5% + Android 5%│  │  │
│  │  │  ┌──────────────────────────────┐  │  │  │
│  │  │  │  按包版本切片：               │  │  │  │
│  │  │  │  v2.1(2%) + v2.2(3%)         │  │  │  │
│  │  │  │  + v2.3(5%)                   │  │  │  │
│  │  │  └──────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 3.3 Rollback Is Not Going Back to Old Code, But to an Old Stable Combination

This is the point many teams most easily underestimate. Production problems are often not a single component going wrong, but a combination of components being incompatible. So truly usable rollback needs to be able to answer:

- Whether the rollback target is the client package, assets, config, scripts or server-side logic
- Whether the rollback targets remain mutually compatible
- Whether players' current state and cache need to be cleared or migrated
- Whether the server knows which clients are still on the old combination

```yaml
# 回滚配置示例
rollback_plan:
  trigger: "crash_rate > 1.5% OR revenue_drop > 10%"
  scope:
    - target: "hotfix_v2.1.4"
      action: "disable_and_rollback_to_v2.1.3"
    - target: "config_batch_43"
      action: "revert_to_batch_42"
    - target: "res_pack_v16"
      action: "fallback_to_v15"
  post_rollback:
    - "notify_server_current_versions"
    - "clear_client_cache_for_affected_resources"
    - "restore_user_state_if_needed"
```

### 3.4 Why the Compatibility Window Is Not Better When Shorter, Nor When Longer

The compatibility window refers to the time range during which old versions are still allowed to coexist with the new system. If it is too short, you get these problems:

- Channel review is not yet complete and old clients can no longer connect
- The player upgrade distribution has not converged, and a forced switch to the new version causes mass failures
- The server cannot migrate protocols and data structures smoothly in time

If it is too long, you get another set of problems:

- The server and config carry a bidirectional-compatibility burden for a long time
- New capability cannot quickly clean up old logic
- The test matrix and troubleshooting complexity keep rising

So the compatibility window is not decided off the top of the head; it needs to be set by combining review cycles, upgrade distribution, risk level and operations capability.

```text
兼容窗口的平衡决策
┌──────────────────────────────────────────────────┐
│              兼容窗口太短                         │
│  审核未过 → 旧包无法接入 → 大量玩家掉线           │
│  升级未收敛 → 强切 → 失败率飙升                   │
│  数据未迁移 → 服务端异常                           │
├──────────────────────────────────────────────────┤
│              兼容窗口太长                         │
│  双向兼容负担 → 开发效率下降                       │
│  旧逻辑难清理 → 代码腐化                          │
│  测试矩阵膨胀 → 排障复杂度上升                    │
├──────────────────────────────────────────────────┤
│              合理的兼容窗口                       │
│  = 审核周期 + 升级收敛周期 + 安全余量             │
│  通常 2-4 周，具体取决于渠道和玩家分布             │
└──────────────────────────────────────────────────┘
```

### 3.5 A Safer Release Safety Model

A safer approach usually designs three things together:

- Use gray release to control the exposure surface of new changes
- Use rollback to guarantee that, once a problem appears, the system can return to a known stable combination
- Use the compatibility window to guarantee that the system stays runnable during gray release and rollback

All three need to exist at the same time. Gray release without rollback means that even when a problem is found, you may not be able to stop the bleeding; rollback without a compatibility window means that after going back, the system may still not run stably; a compatibility window without gray release means risk is still exposed in one full sweep.

---

## 4. Frontend-Backend Coordination and Platform Constraints

Game release is never as simple as R&D unilaterally pushing code up. Clients, servers, designers, testing, operations, channels, platform review and external SDK suppliers all leave hard constraints in the same release chain.

### 4.1 Why Platform Constraints Reshape the Technical Approach in Reverse

The client package is heavier than the server not only because it contains host capability, but because it is constrained by these realities:

- Store and channel review cycles
- Permission and privacy rules
- SDK integration requirements for payment, ads, login, etc.
- Package size, asset download and network usage limits
- Capability-launch thresholds of specific platforms

This means many things that "the backend could change today" actually cannot take effect for all players today.

### 4.2 Where Frontend-Backend Coordination Is Really Hard

Many teams understand frontend-backend coordination as interface joint debugging, but what is really hard at the release stage is usually not the interface, but:

| Coordination problem | Typical scenario | Risk |
|---------|---------|------|
| Client dependency | Whether a change depends on a new client package | The server changed but old clients do not recognize it |
| Compatibility window | Whether old clients can still receive new server-side logic | Missing compatibility protocol causes crashes |
| Platform review | How far the server and config can go before review is complete | Features exposed too early or missing assets |
| Rollback coordination | After an incident, how frontend and backend each roll back without stepping on each other | A half-rolled-back state causes a more serious incident |

### 4.3 Which Changes Most Easily Go Wrong Here

The most common are these cross-boundary changes:

- A new protocol field needs to be recognized by the client host
- A new SDK depends on new permission requests or review materials
- A new asset loading approach depends on a new package structure
- A new feature flag looks server-controlled but the client host actually does not yet have the capability to receive it

If these changes are only viewed from the server perspective as "gray-releasable," they easily escalate in production into complex incidents that are triggered only by a specific platform, a specific channel, or a specific historical package.

### 4.4 Why Multi-Platform and Multi-Region Further Amplify the Problems

Once you enter multi-platform, joint-operation, multi-region or mini-game adaptation scenarios, the constraints multiply:

- Different platforms have different review durations
- Different regions have different launch cadences
- External SDK version distributions differ
- Some features are simply unavailable on some platforms

If the release system does not formally model these differences, the team quickly returns to the primitive state of "relying on spreadsheets and experience to keep track of which platforms can enable which switches."

### 4.5 A Safer Coordination Approach

A safer approach usually involves:

1. Front-load platform constraints into the requirements and version design stage
2. Isolate platform differences with an adaptation layer, rather than scattering branches through business code
3. Make clear which changes depend on a new package and which can advance independently via assets, config or the server
4. Let frontend, backend, testing and operations share the same version-window and risk-judgment criteria

The key to this is not making all teams act identically, but making all teams reach a shared understanding of the same set of constraints.

---

## 5. Config Tables and the Data-Driven Pipeline

Many production incidents are not caused by wrong code, but by config flowing to the wrong environment, at the wrong time, in the wrong format. For long-term operation projects, config tables and the data-driven pipeline are themselves the formal primary release path, not a designer tool detail.

### 5.1 Why Config Incidents Are Often Harder to Handle Than Code Incidents

When code goes wrong, the team can usually still rely on the compiler, tests and crash logs to locate it fairly quickly. When config goes wrong, problems more often show up as:

- Abnormal numerics
- Wrong event activation conditions
- Drops and reward granting not matching expectations
- Mismatched page content and asset mapping
- Effective in some environments, ineffective in others

This class of problem does not necessarily crash immediately, nor does it necessarily show up immediately; it often slowly exposes itself through business metrics, player feedback or long-chain data, and the cost of locating it is high.

### 5.2 What a Complete Config Pipeline Really Contains

```text
配置管线全链路
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Schema   │──►│ 编辑与   │──►│ 类型和   │
│ 定义     │   │ 录入     │   │ 引用校验 │
└──────────┘   └──────────┘   └──────────┘
                                    │
                                    v
┌──────────┐   ┌──────────┐   ┌──────────┐
│ 发布审批 │◄──│ 灰度发布 │◄──│ 导出生成 │
│ 和回滚   │   │          │   │ 和环境隔离│
└──────────┘   └──────────┘   └──────────┘
       │
       v
┌──────────────────────────────────────────┐
│            生效与监控                     │
│  灰度观察 → 全量发布 → 异常检测 → 回滚    │
└──────────────────────────────────────────┘
```

A mature config pipeline is not just "export tables to JSON." It usually includes at least:

| Stage | Purpose | Consequence of absence |
|------|------|---------|
| Schema definition and field constraints | Unify data format | Parsing failure |
| Type and reference validation | Prevent illegal data | Broken references |
| Dependency analysis and diff comparison | Identify impact scope | Accidental edits go undetected |
| Export generation and environment isolation | Prevent environment crosstalk | Test data flows to production |
| Release approval, gray release and rollback | Control change risk | Full-scale incident |

### 5.3 Why "Free to Edit" Is Not the Most Important Goal of a Config System

Many config tools emphasize ease of use and flexibility in the early stage, which of course matters, but what really determines system quality is usually not "how fast it is to change," but:

- Which fields allow high-frequency adjustment
- Which fields need stricter review
- Which changes depend on a new client or new server capability
- Which changes can be gray-released and which need a full switch

An excellent config pipeline does not make everything freely changeable; it clearly layers changes by risk level.

### 5.4 Why Config Lineage and Audit Need to Exist

Once a config problem is exposed in production, the team usually needs to answer:

- Who changed this rule
- Which validations the change passed
- In which environments and when it took effect
- Whether it is linked with other tables or assets

If the system cannot answer these questions, later troubleshooting can only rely on chat logs, shared table history and human memory. Config lineage, diff audit and effective-timing records exist precisely to avoid this inefficient way of troubleshooting.

### 5.5 Why Config Systems Most Easily Grow Quietly Into "Half a Programming Language"

In pursuit of generality, many teams keep adding conditional expressions, nested rules, dynamic branches and functional snippets to the config system. In the short term this looks like it reduces code changes, but in the long run it makes config lose its data character and become an intermediate species with neither a programming toolchain nor a config governance toolchain.

### 5.6 A Safer Approach

A safer direction usually involves:

- Let config carry parameters, mappings and static rules
- Let scripts or code carry the real execution logic
- Add schema, diff, approval, gray release and rollback capability to the config system
- Treat config release as a formal version activity, not "just exporting a table on the side"

The core of this is to keep config as governable data, not turn it into invisible code that nobody dares to touch.

---

## 6. R&D Collaboration and the Release Workflow

Whether a release is stable ultimately reflects whether team collaboration can make risk explicit. Without a clear workflow, no matter how good the version system, gray mechanism and rollback design, they get worked around in real organizational operation.

### 6.1 Why the Release Workflow Is Essentially Responsibility-Interface Design

Clients, servers, designers, testing, operations and DevOps often have completely different understandings of "release complete":

| Role | Understanding of "release complete" |
|------|-------------------|
| Client development | Code merged into the main branch counts as complete |
| Server development | Server deployment succeeded counts as complete |
| Design | Config effective and event live counts as complete |
| Testing | Tests pass with no P0 bugs counts as complete |
| Operations | Event observable and containable counts as complete |
| DevOps | Monitoring normal and resources stable counts as complete |

The real value of the workflow is to compress these different perspectives into one shared set of explicit steps, explicit responsibilities and explicit exit conditions.

### 6.2 What Happens Without a Formal Workflow

The most typical symptoms usually include:

- Releases rely on ad-hoc group chats and verbal confirmation
- Branch strategy relies entirely on remembered experience
- Nobody is truly responsible for gray observation
- Rollback conditions are unclear and everyone waits for someone else to decide
- Incident retrospectives stay in chat logs and personal memory

These problems may not be obvious day to day, but when version density is high, cross-team collaboration is heavy and production pressure is intense, they all amplify together.

### 6.3 What an Effective Workflow Usually Contains at Minimum

```text
发布工作流关键阶段
┌──────────────────────────────────────────────────┐
│  1. 需求冻结                                      │
│     ├── 变更准入规则                               │
│     └── 分支策略和合入时机                         │
├──────────────────────────────────────────────────┤
│  2. 测试准入                                      │
│     ├── 测试检查项                                │
│     └── 质量门禁                                  │
├──────────────────────────────────────────────────┤
│  3. 审批与放量                                    │
│     ├── 审批责任人                                │
│     └── 放量条件                                  │
├──────────────────────────────────────────────────┤
│  4. 灰度观察                                      │
│     ├── 观察时间窗                                │
│     └── 指标口径                                  │
├──────────────────────────────────────────────────┤
│  5. 全量发布                                      │
│     ├── 回滚触发条件                              │
│     └── 执行路径                                  │
├──────────────────────────────────────────────────┤
│  6. 事后复盘                                      │
│     ├── 经验归档                                  │
│     └── 流程改进                                  │
└──────────────────────────────────────────────────┘
```

What matters most here is not how many steps there are, but that every step can answer "who is responsible, what to look at, and what state is required to advance to the next step."

### 6.4 Why the Workflow Cannot Rely Only on Meetings and Spreadsheets

Spreadsheets and meetings themselves are not the problem; the problem is that if the process can only be sustained by human memory, stability is very poor. A truly effective workflow should sink key information into the system as much as possible, for example:

- Which changes the current version contains
- Which environments have already been released to
- Which metrics are still under observation
- Whether the current state is still within the gray period
- Whether the rollback plan is ready

The purpose of this is not bureaucratization, but reducing the responsibility vacuum of "I thought someone else already looked."

### 6.5 What Is the Relationship Between the Workflow and Technical Capability

A process cannot replace technical capability, but it can determine whether technical capability gets used reliably. For example:

- Having a rollback mechanism but nobody defining when it triggers is the same as having none
- Having gray capability but nobody continuously watching metrics is the same as having none
- Having version governance but no unified release checklist still ends up relying on guesswork

In other words, the workflow is not an appendage document but the bridge that converts technical systems into organizationally executable capability.

### 6.6 A Safer Organizational Approach

A safer approach usually involves:

1. Use a fixed release checklist to unify the change view
2. Assign explicit owners to each critical stage
3. Use observable metrics to define "whether ramp-up can continue"
4. Use a pre-drilled rollback path to define "when containment is needed"
5. Use a retrospective mechanism to sink incident experience back into the process and tooling

The core of this is not making the process heavier, but making releases stop relying on individual experience and in-the-moment memory.

---

## 7. Common Pitfalls and Summary

### 7.1 Common Version-System Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Outsourcing version problems to pipelines and release platforms | Tools but no governance | Tools execute the flow; the team defines the boundaries |
| Still thinking in a single version number despite multiple independent versions | Compatibility and rollback cannot be judged | Build a component-combination + dependency-relation model |
| Only focusing on "how to ship the new version" | When to retire old versions is out of control | Manage the compatibility window and retirement strategy together |

### 7.2 Common Gray Release / Rollback Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Gray release = simple percentage ramp-up | Even when a problem is found, it cannot be located | Slice along multiple dimensions and precisely isolate the impact |
| Rollback = re-releasing an old version | The incompatible combination still crashes | Restore to a mutually compatible and stable version combination |
| The compatibility window is decided by experience | Too short or too long over the long term | Analyze quantitatively by combining review cycles and upgrade distribution |

### 7.3 Common Config Pipeline Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Config = export scripts and shared spreadsheets | After an incident, tracking relies on chat logs | The config pipeline needs versioning, audit and rollback |
| Turning the config language into half a programming system | Hard to validate, hard to operate | Keep config's data character |
| Config release frequency is higher than code but has no governance | High-frequency change = high-frequency incidents | Bring config release into formal version activity |

### 7.4 Core Points

> **Release stability comes from a deeper capability: can the system describe which set of components a player is actually running, whether those components are mutually compatible, and when a problem appears, can it shrink the blast radius, stop the bleeding quickly and return to a stable state.**

A mature version release system needs to have all of the following at the same time:

1. **A multi-dimensional version model**: client package, assets, config and protocol governed independently and strung together by dependency relations
2. **The three pillars of gray release, rollback and the compatibility window**: none can be missing; they must be designed together
3. **Engineering of the config pipeline**: schema, validation, approval, gray release, rollback, lineage audit
4. **A cross-team coordination workflow**: unified responsibility interfaces, exit conditions and observable metrics
5. **Front-loaded platform constraints**: multi-platform and multi-region differences brought into the version design stage

Missing any one of these, the release system will collapse at some pressure point.

---

## 8. Practical Case: A Gray Release Where "Day-2 Retention −8pt" Became a Criteria and Crash Investigation

> This case is a demonstration example (not taken from a real project); the numbers are rounded and simplified. The investigation discipline of the first five cases (align criteria first, then split dimensions) is applied here to **release quality data**: retention is the effect, crashes are the cause — once the criteria are unified, the real differences speak for themselves.

**Background and symptoms**: **24** hours after v2.7 ramped to **5%**, the dashboard alarmed: gray-group day-2 retention **31%** vs **39%** (control), an **8pt** gap; at the same time the gray group's crash rate was **1.6%** vs **0.6%**, **2.7**x. The two teams immediately started arguing: product claimed "the version is driving players away, roll back," while client claimed "event-tracking criteria noise" — each holding one column of numbers, arguing for two hours with no conclusion.

### Step One: Align Criteria First — Make the Two Columns Comparable, Then Talk About Direction (Echoing Piece 12)

The dashboard's two crash-rate columns were a historically legacy **mixed-criteria** setup: the gray column was "crash count / launch count" while the control column was "crashing users / active users" — different denominators, so the multiplier was inherently inflated. Retention was also not clean: the gray group's "day one" was the day the hot update was triggered, while the control group's "day one" was the organic new-user day. After unifying on a user-based criterion: crash rate **1.6%** vs **0.6%**, **2.7**x; the retention gap was still **8pt** — the "noise theory" was falsified and the difference was real. The second question was about direction: crashes directly kill the next-day open, **retention is the effect and crashes are the cause** — the investigation shifted from "the version drives players away" to "crash attribution."

### Step Two: Split Dimensions — Crashes Cluster by Device Memory Tier

- **Memory tier**: **78%** in the 2GB tier, **15%** in the 4GB tier, **7%** in the rest (flat with control) — almost all of the difference comes from low-end devices
- **Error signature**: **80%** is the same OOM signature, concentrated at the moment of resource loading during scene transitions
- **Timing**: crashes are concentrated in "the first entry into a large scene after the hot update completes," overlapping with the first decode of the new atlas

### Step Three: Root Cause — An Atlas Spec Change Hit the 2GB Memory Wall

1. **Direct cause**: v2.7 doubled the UI atlas spec (**×2**, an art-side spec upgrade that never went through a low-end-device memory review), raising the decode memory peak by **+180MB** — the 2GB tier hit system-level kills during scene transitions
2. **Mechanistic cause**: device memory tiers did not enter the release checklist (the testing difficulty in section 2.5), and gray ramp-up was not layered by device model, so low-end-device samples were diluted in the aggregate
3. **Judgment cause**: rolling back directly does stop the bleeding, but rollback is returning to an old stable combination (section 3.3) and does not fix the atlas pipeline — after going full, the next version would recur; the real value of gray release is precisely **targeted delivery halt** (section 3.2), not just a single rollback action

### Step Four: Remediation and Backfill

```text
T+0 2h   2GB 档定向停发：已升级不回退，未触达不推送（灰度分层能力变现）
T+0 4h   热修：低端机走降采样图集，解码并发限 1
T+1      崩溃告警改「用户口径 × 机型档位」双维
T+2      验证通过：灰度组崩溃率回落到 0.7%，留存回升到 38%（对照 39%）
T+3      恢复放量，「内存档位矩阵」进发布检查单
```

**T+2 re-check**: the gray group's crash rate fell back to **0.7%** and day-2 retention recovered to **38%** (control 39%) — the remediation chain closed, and ramp-up resumed.

**Backfill checklist** (echoing piece 14's retrospective backfill discipline):

| Backfill Item | Owner | Completion Criteria |
|--------|------|---------|
| Freeze the gray-release layering dimensions: device memory tier × channel, independently haltable | Release platform | One halt drill |
| Unify crash/retention metric criteria into the metric dictionary (user-based criterion as the authoritative column) | Data | Registered in the metric dictionary |
| Add a low-end-device (2GB) memory-water matrix to the release checklist (echoing piece 20's device matrix) | QA / Client | Checklist review passed |
| Route asset spec changes through a memory budget review (echoing piece 19's memory water level) | Art / Client | Review passed |
| Add an automatic rule to the ramp-up gate: "halt if crash rate by tier exceeds 1%" | DevOps / Release | One drill |

### Three Lessons from the Case

1. **Retention is the effect, crashes are the cause**. When retention alarms, drill down into the launch and crash chain first — get the direction wrong and rollback becomes "submitting an incorrect answer."
2. **Unify criteria first, then argue about direction**. Mixed criteria inflated 2.7x into 3x and packaged a "technical incident" as "product-driven churn"; after unifying criteria, the real difference proves itself and the false direction dissolves.
3. **Gray release's layering capability must be ready at design time**. Independent halt by device memory tier and by channel — otherwise gray release degrades into an "all or nothing" rollback (3.2 / 3.3).

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
