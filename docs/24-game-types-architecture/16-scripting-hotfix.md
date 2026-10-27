# 16 Scripting Hot Update and Logic Extension

Scripting hot update is one of the most critical "ability to change" capabilities in a game's long-term operation. Once a project enters long-term operation, the most expensive problem is often no longer "a feature cannot be built," but "I clearly know where the problem is, yet I cannot change it, ship it, or stop the bleeding." The scripting layer, hot update, config-driven design and host runtime are discussed so repeatedly not because they sound flexible, but because they jointly determine a project's late-stage iteration speed, fix window and incident radius.

Many teams, when first introducing this capability, imagine "more flexible" and "faster fixes." But once it actually goes live, they immediately hit the other side: which logic is suitable to be scripted and which logic is hard to govern once scripted; what config and script are each suited to express and what they are not suited to; where to draw the boundary between the VM and the host engine, and how to backstop performance and debugging; and whether hot update is really shortening the fix path or widening the front door for production incidents.

> This chapter is not selling a particular technical scheme. It treats "logic extension capability" as a formal runtime and release mechanism. The point is not whether it can be done, but where it will drag complexity to, which benefits are real benefits, and which flexibility is being bought at the cost of governance.

> This chapter shares its argumentative framework with the knowledge base's "scripting, hot update and logic extension" chapter: that chapter concentrates on the judgment calls and pitfalls of this class of capability, while this chapter completes the engineering landing on the same framework, giving concrete implementations for language choice, host integration and the hot-update flow.

---

## 1. Scripting Layer Positioning and Language Choice

The scripting layer keeps re-entering game projects not because "scripting languages are more advanced," but because projects always hit this reality: some logic changes too fast, and the cost of changing native code once and walking the full release chain is too high. The real value of the scripting layer is to split that portion of high-frequency change out of the heavier compilation and review flow.

But once the scripting layer is introduced, the system no longer has only one language, one runtime and one debugging path. It solves the fix-speed problem while also dragging complexity into runtime boundaries, performance governance and production troubleshooting.

### 1.1 What the Scripting Layer Is Really Suited to Carry

Logic well suited to the scripting layer usually has these obvious characteristics:

| Characteristic | Typical scenario | Reason |
|------|---------|------|
| Business rules change frequently | Event rules, quest trigger conditions | Needs fast iteration; the release cost is too high |
| Event and operation cadence is fast | Festival events, time-limited gameplay | The time window is limited; cannot wait for review |
| UI and interaction flow is complex | Quest dialogue, onboarding flow | Performance is not at the extreme; the logic needs to be flexible |
| Needs hot fixing or fast trial and error | Production bug fixes | Cannot wait for a full release cycle |
| Leans toward config interpretation and business orchestration | Reward granting, condition judgment | Does not touch low-level performance hot spots |

```text
适合脚本化 vs 不适合脚本化的逻辑分布
┌─────────────────────────────────────────┐
│            脚本层适合                    │
│  ┌──────────┐  ┌──────────┐             │
│  │ 活动逻辑 │  │ UI 流程  │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ 任务规则 │  │ 对话表现 │             │
│  └──────────┘  └──────────┘             │
├─────────────────────────────────────────┤
│            原生层适合                    │
│  ┌──────────┐  ┌──────────┐             │
│  │ 渲染底层 │  │ 物理模拟 │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ 网络核心 │  │ 平台接入 │             │
│  └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘
```

### 1.2 Which Capabilities Should Not Be Scripted Just for "Flexibility"

If these capabilities are carelessly handed to the scripting layer, they usually bring a larger cost:

- **Hard performance hot-spot logic**: rendering pipeline, physics collision, large-scale data computation — the script VM's execution efficiency is naturally lower than native code
- **Engine low-level or platform-related calls**: these calls involve C++ interfaces and system APIs, and the scripting layer has difficulty keeping them stably compatible
- **Security-sensitive and cheat-sensitive logic**: scripts are easier to decompile and tamper with; putting critical logic in scripts is like handing out the key
- **Complex runtime paths with heavy cross-layer calls**: once something breaks, troubleshooting has to cross multiple call-stack layers and is hard to locate

### 1.3 What Language Choice Really Has to Look At

When many teams discuss language choice, they get swept along by ecosystem, syntax and community popularity. More practical judgments usually include:

```text
脚本语言选型评估矩阵
┌──────────────────┬───────┬───────┬───────┬───────┬───────┐
│ 评估维度          │ Lua   │ C#    │ JS/TS │ Python│ Wasm  │
├──────────────────┼───────┼───────┼───────┼───────┼───────┤
│ 宿主集成复杂度    │ 低    │ 中    │ 中    │ 高    │ 高    │
│ 调试工具成熟度    │ 中    │ 高    │ 高    │ 高    │ 低    │
│ 跨平台稳定性      │ 高    │ 高    │ 高    │ 中    │ 高    │
│ 团队维护经验      │ 广泛  │ 广泛  │ 广泛  │ 有限  │ 少    │
│ 热更新链路成熟度  │ 高    │ 中    │ 高    │ 低    │ 低    │
│ 加密/裁剪难度     │ 低    │ 中    │ 中    │ 高    │ 中    │
│ 性能（相对原生）  │ 80%   │ 60%   │ 70%   │ 30%   │ 90%   │
└──────────────────┴───────┴───────┴───────┴───────┴───────┘
```

Language choice is not a matter of "does it feel good to write"; it is whether, once plugged into the existing runtime, it will become a new systemic burden.

### 1.4 What Is Hardest in the Scripting Layer Is Not Writing Logic but Boundary Governance

Once the scripting layer has no boundary, these problems appear quickly:

- The business layer wants to put everything in
- The native layer's API exposure surface keeps growing
- Script cross-calls and native callbacks get deeper and deeper
- A single problem investigation has to cross multiple call-stack layers

So what the scripting layer most needs to define in advance is not language syntax, but the scope of responsibility: which modules may be scripted by default, which modules require evaluation, and which low-level capabilities are never exposed directly.

**A safer way to position it**:

```text
┌────────────────────────────────────────────────────┐
│                  游戏项目分层架构                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           脚本层（高变业务逻辑）               │  │
│  │  活动 · 任务 · UI 流程 · 表现编排 · 对话      │  │
│  ├──────────────────────────────────────────────┤  │
│  │           受控接口层（门面/API）               │  │
│  │  绑定层 · 生命周期管理 · 线程调度 · 异常传播   │  │
│  ├──────────────────────────────────────────────┤  │
│  │           原生层（性能敏感核心）               │  │
│  │  渲染 · 物理 · 网络 · 平台接入 · 安全关键     │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 2. Host Runtime and Script VM Integration

Once the scripting layer moves from concept into engineering, what is really hard is no longer "can it run," but how the VM and the host runtime coexist over the long term. The host has its own memory model, object lifecycle, threading constraints, resource-management approach and crash-handling mechanism; the script VM also has its own execution model, GC approach, module loading and debugging semantics. Once the two are joined, complexity does not add — it multiplies.

### 2.1 Why Integration Problems Are Often Harder Than Language Problems

When many teams pick a scripting scheme, they prioritize discussing syntax, ecosystem and developer experience, but what actually drags the project down is usually these integration problems:

| Integration problem | Typical manifestation | Consequence |
|---------|---------|------|
| Native object mapping | How a C++ object is referenced in the script world | Type-conversion errors cause crashes |
| Lifecycle management | Script references become invalid after the object is freed | Dangling references, use-after-free |
| Cross-thread scheduling | Script is called on a non-main thread | Data races, crashes |
| Exception propagation | Script exceptions feed back to the host | Crash information cannot be located |
| Performance attribution | Is the hot spot in the host or in the script | Cannot optimize |

### 2.2 The Most Core Boundaries of VM Integration

#### The API Exposure Boundary

How much capability the host exposes to the script is the most important first boundary. Expose too little and the scripting layer cannot be used; expose too much and the script deeply invades engine and platform details, after which it is almost impossible to rein in.

```lua
-- 推荐：通过受控门面访问宿主能力
local player = GameFacade.GetPlayer()      -- 受控接口
local hp = player:GetHP()                   -- 明确暴露的方法
player:TakeDamage(amount)                   -- 语义清晰的操作

-- 避免：无限制穿透宿主
local rawEntity = EntityMgr.GetById(id) -- 直接穿透 C++ 原生层
rawEntity.internalData.hp = 99999            -- 绕过所有校验
```

#### The Lifecycle Boundary

When host objects are created, when they are destroyed, and how script references detect invalidation — if these are not handled well, subtle bugs such as dangling references, double free and state desynchronization keep appearing.

```cpp
// C++ 宿主侧：确保脚本引用在对象销毁时被清理
class GameEntity {
public:
    ~GameEntity() {
        // 通知脚本 VM 清除所有指向本对象的引用
        ScriptVM::InvalidateHandle(this->scriptHandle);
        // 而不是等 GC 或调用时才 crash
    }
};
```

#### The Scheduling Boundary

Whether script calls are allowed to cross threads, whether async callbacks are uniformly returned to the main thread, and how long-running logic is cut out of the main loop — these questions directly determine production stability.

```text
线程调度模型示例
┌──────────┐    主线程调度    ┌──────────────┐
│ 脚本 VM  │ ◄─────────────► │  宿主主循环   │
│ (单线程)  │                 │  (主线程)     │
└────┬─────┘                 └──────────────┘
     │
     │ 耗时任务切出
     ▼
┌──────────────┐
│  工作线程池   │  ← 网络/IO/计算
│  (无脚本访问) │
└──────────────┘
```

#### The Observation Boundary

Logs, call stacks, profiling, crash information and event tracking — whether the scripting layer and host layer can be stitched together determines whether a problem can really be located.

### 2.3 Why the Binding Layer Is Often a High-Incident Zone

Many production problems do not sit in pure script, nor in pure native, but in the binding layer:

- Inconsistent parameter type conversion (integer overflow, floating-point precision loss)
- Inconsistent lifecycle management (native already freed, script still using it)
- Interface signatures quietly change after a version upgrade (parameter order changed)
- The object state the script sees and the native real state are inconsistent (cache not synchronized)

The reason binding-layer problems are hard is that on the surface it looks like a bridge, but in fact it carries the contract translation between two runtimes.

### 2.4 A Safer Integration Approach

A safer approach usually involves:

- Let the script access host capabilities only through a controlled façade
- Govern the objects and interfaces exposed to the script with a checklist
- Write the threading model, lifecycle and exception propagation as explicit rules
- Wire script profiling, logs and crash attribution into the existing observability system

The point of this approach is that VM integration is not a one-time hookup, but a long-term maintained runtime contract.

### 2.5 Why Debugging and Observation Cannot Be Backfilled Later

If the scripting layer has no decent debugging support, teams quickly return to the most primitive troubleshooting: print logs and guess state, rely on luck to reproduce, and on a crash see only the host layer's last frame.

**Debugging capabilities that need to be built together with the VM**:

| Capability | Purpose | Priority |
|------|------|--------|
| Script breakpoint debugging | Precisely locate runtime logic errors | P0 |
| Cross-layer call-stack stitching | Trace back from the script call stack to native calls | P0 |
| Performance sampling (profiler) | Locate script-side performance bottlenecks | P1 |
| Error attribution | Distinguish script errors, binding-layer errors and host errors | P0 |
| Version identification | Identify script/host versions on a crash | P1 |

---

## 3. Config-Driven vs Script-Driven

When a project needs to be more flexible, many teams think of two means at the same time: write more behavior into config, or put more logic into scripts. Both can improve iteration speed, but they do not solve the same class of problem.

### 3.1 The Essential Difference Between Config-Driven and Script-Driven

| Dimension | Config-driven | Script-driven |
|------|---------|---------|
| Suited to express | Rule parameters, static combinations | Flows, branches, runtime behavior |
| Typical content | Numerics, drops, event conditions, text | Quest flows, dialogue orchestration, dynamic behavior |
| Change method | Data replacement, auditable diff | Code replacement, requires compile or interpreted execution |
| Validation method | Static validation, reference validation | Runtime testing, breakpoint debugging |
| Rollback capability | Easy: restore old data | Medium: needs the old script version |
| Risk level | Low (parameter change) | Medium-high (behavior change) |

### 3.2 Where Config-Driven Is Really Worth Its Price

What makes config-driven most valuable is splitting change out of the code release chain, so that rule parameters, content combinations and part of the static structure can be adjusted faster. It is especially suited to:

- Numerics and rule parameters
- Drops, quests, event conditions
- UI layout or page combination relations
- Text, localization, asset mapping
- Static branches under limited states

The advantage of config is not only "fast to change," but also that it is easier to audit, validate, diff and roll back.

### 3.3 What Script-Driven Is Better Suited to Solve

Scripts are better suited to problems that have already gone beyond the range of "parameter expression":

- Complex flow orchestration
- Dynamic conditional branches
- Behavior that needs runtime state judgment
- Logic that changes at high frequency but is not worth a full release

In other words, scripts are suited to express "how to do it," while config is better suited to express "what inputs and constraints there are."

### 3.4 Why So Many Projects Keep Turning Config Into Script

This is a very common path to loss of control. Early in a project, config carries only parameters; later, to avoid changing code, teams keep adding conditional expressions, nested rules, event callback names, execution-order descriptions and small DSLs into config. In the end, config looks like data on the surface, but has actually become a scripting language lacking a debugger and a type system.

```text
配置系统失控的演进路径
┌─────────────────┐
│ 纯数值参数       │ ← 最初状态，简单安全
├─────────────────┤
│ + 条件表达式     │ ← 开始有逻辑
├─────────────────┤
│ + 嵌套规则       │ ← 复杂度上升
├─────────────────┤
│ + 事件回调名     │ ← 配置开始调用代码
├─────────────────┤
│ + 执行顺序描述   │ ← 隐形控制流
├─────────────────┤
│ + 小型 DSL       │ ← 已变成脚本语言
└─────────────────┘
       红线：配置变成缺乏调试器和类型系统的脚本语言
```

### 3.5 Conversely, Script Should Not Become a "Universal Config Patch" Either

If any data problem, presentation problem or flow problem is ultimately fixed with an ad-hoc script, the common result is:

- The scripting layer increasingly resembles a business garbage dump
- The responsibility boundary between config and script becomes increasingly blurred
- The same rule is half in config and half in scripts
- When troubleshooting, it is hard to tell which layer went wrong

**Boundary decision checklist**:

- Is this change a parameter change or a behavior change?
- Can errors be caught in advance by static validation?
- Is complex runtime context required?
- Are debugging, breakpoints and execution tracing required?

If the answers lean toward parameters and static combinations, config is better suited; if they lean toward flows, conditions and runtime judgment, scripts are better suited.

### 3.6 Why the Config System Itself Also Needs to Be Engineered

Many teams think of the config system as too lightweight, feeling that being able to edit tables and export files is enough. In real projects, the config system is often a high-incidence entry point for incidents, because it connects designers, clients, servers and the release chain. A mature config system usually needs:

| Capability | Purpose | Consequence of absence |
|------|------|---------|
| Type validation | Prevent data format errors | Production parsing crashes |
| Reference validation | Check cross-table reference integrity | Drops reference nonexistent items |
| Diff review | Compare changed content | Accidental edits go undetected |
| Gray release | Take effect in batches | Full-scale incident |
| History tracking and rollback | Fast recovery during incidents | Cannot stop the bleeding |

---

## 4. The Hot-Update System

What is most attractive about hot update is that it looks like it can compress the time from "problem found" to "fix effective" very short. For a long-term operation project, this capability really is very important, because many problems simply cannot wait for a full release and platform review. But the truly dangerous part of hot update is also here: what it shortens is the fix window, not the testing responsibility, and certainly not the design responsibility.

Without version compatibility, signature verification, gray release and fast rollback, hot update will not make the system safer — it will only get errors to more players faster.

### 4.1 What Problem Hot Update Really Solves

Hot update is best suited to solving these real-world pressures:

| Scenario | Why hot update is needed | How hot update helps |
|------|----------------|---------------|
| Platform release cycles are long | Review takes 3-7 days | Script/config updates bypass review |
| Operational events switch frequently | There may be a new event every day | Event config hot loading |
| Production problems need fast containment | A bug affects revenue or retention | Patch delivered immediately |
| Small changes are not worth a full-package release | Just changing one number | Config hot replacement |

Its essence is not "making everything mutable," but establishing a controlled fix chain that is faster than a full-package release.

### 4.2 A Hot-Update System Is Usually More Than One Download Chain

```text
完整的热更新体系架构
┌───────────────────────────────────────────────────────┐
│                    热更新体系                          │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 补丁内容组织 │  │ 版本依赖管理│  │ 签名与校验  │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │           │
│         v                v                v           │
│  ┌─────────────────────────────────────────────┐     │
│  │              下载与缓存管理                   │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │                                │
│         ┌───────────┼───────────┐                    │
│         v           v           v                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │ 灰度放量  │ │ 回滚失效  │ │ 宿主兼容  │          │
│  └───────────┘ └───────────┘ └───────────┘          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

A mature hot-update system usually includes at least these layers of capability:

- Patch content organization
- Version and dependency management
- Download, verification and signature validation
- Gray and batched ramp-up
- Rollback and invalidation strategy
- Compatibility judgment against the host version

If these capabilities are not built together, so-called hot update is usually just "remotely replacing files," not a truly operable system.

### 4.3 The Most Dangerous Problem Is Compatibility, Not Download Failure

When many teams do hot update, the first things they watch are patch size and download success rate, but what really tends to cause big incidents is often compatibility:

| Compatibility problem | Specific manifestation | Incident consequence |
|-----------|---------|---------|
| Interface dependency | New script depends on an interface the old host does not have | Crash or functional anomaly |
| Missing field | A field required by new config is not recognized by old code | Data parsing fails |
| Missing asset | A new asset references a dependency that was not delivered | Load failure, black screen |
| Ordering dependency | Patches have an ordering dependency that is not correctly expressed | Partial updates lead to inconsistent state |

These problems are dangerous because the patch may download and verify successfully, but only starts crashing at runtime.

### 4.4 Why Rollback Capability Needs Top Priority

Hot update without rollback is essentially treating production as a test field. A truly usable hot-update system needs to answer:

- Can a patch be quickly disabled when it goes wrong
- Can the client fall back to the previous stable version
- How are state and cache handled after rollback
- Does the server know the current patch level of each client

If these questions are not designed in advance, when an incident happens the team can often only ship a second patch to fix the patch, and the risk keeps stacking.

```yaml
# 补丁版本兼容矩阵示例
hotfix_compatibility:
  - patch: "hotfix_2.1.3"
    host_min: "2.1.0"
    host_max: "2.3.x"
    dependencies:
      - "config_v15"
      - "res_pack_v12"
    rollback_target: "hotfix_2.1.2"

  - patch: "hotfix_2.1.4"
    host_min: "2.1.2"
    host_max: "2.3.x"
    dependencies:
      - "config_v16"
      - "res_pack_v12"
    rollback_target: "hotfix_2.1.3"
```

### 4.5 Gray Release Is Not an Add-On Optimization, It Is an Incident Isolation Mechanism

The reason hot update needs gray release is not that "it is more professional," but that any patch may have real-world compatibility differences. Device models, network conditions, historical versions and cache state all affect the outcome. The value of gray release lies in:

- Shrinking the blast radius first
- Observing error rate and compatibility first
- Verifying the patch chain is really recoverable first

Without gray release, the incident radius of a hot update is usually far larger than that of a full-package release.

```text
热更新灰度策略示例
┌──────────────┬──────────┬──────────┬──────────┐
│ 阶段          │ 放量比例 │ 观察时间 │ 关键指标 │
├──────────────┼──────────┼──────────┼──────────┤
│ 内部验证      │ 0.1%     │ 2小时   │ 崩溃率   │
│ 小范围灰度    │ 1%       │ 4小时   │ 功能异常 │
│ 扩大灰度      │ 10%      │ 24小时  │ 留存影响 │
│ 大面积放量    │ 50%      │ 24小时  │ 全量指标 │
│ 全量发布      │ 100%     │ -       │ 持续监控 │
└──────────────┴──────────┴──────────┴──────────┘
```

### 4.6 What Is the Relationship Between Hot Update and Testing

Hot update can shorten the fix path, but it can never replace testing. A more accurate way to put it is that hot update makes layered testing more necessary for you:

| Test layer | Test content | Importance |
|---------|---------|--------|
| Patch content self-test | Correctness of script/config/asset | P0 |
| Host compatibility test | Compatibility with the current host version | P0 |
| Patch-chain regression test | Compatibility with the historical patch chain | P1 |
| Rollback path test | Whether rollback and invalidation paths work | P0 |

If a team treats hot update as "fixing in production is testing," it will ultimately only become a source that manufactures more production state combinations.

### 4.7 A Safer Systematic Approach

A safer hot-update system usually manages to:

1. Patch content has clear boundaries, knowing which can be hot updated and which need a full package
2. There is an explicit compatibility matrix between patches and host versions
3. Signature, gray release, observability and rollback are built into the release chain
4. The server knows the patch version and capability level each client is at

What is truly important about this system is not making changes faster, but keeping fast changes still within a controllable range.

---

## 5. Common Pitfalls and Summary

### 5.1 Common Scripting-Layer Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Scripting layer = "everything can be dynamically changed later" | Every requirement gets stuffed into scripts; loss of control | Define the scope of responsibility clearly; limit the exposure surface |
| Only discuss language features, not host integration | Debugging is hard; maintenance cost skyrockets | Decide the VM integration scheme first |
| The scripting-layer boundary is not defined first; ad-hoc requirements all go in | Becomes the hardest layer to govern | Define clear module boundaries |

### 5.2 Common Config-Driven Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| The config system expands indefinitely into an invisible scripting language | Hard to validate, hard to debug, incidents frequent | Keep config's data character |
| All high-frequency-change logic is pushed to the scripting layer | Config degrades into a loose data store | Config carries parameters, scripts carry behavior |
| Only look at editing experience, do not add governance capability | Config becomes a high-risk entry point | Add validation, audit and rollback capability |

### 5.3 Common Hot-Update Pitfalls

| Pitfall | Consequence | Recommended practice |
|------|------|---------|
| Hot update = testing substitute | Production becomes a test field, incidents frequent | Hot update does not replace testing |
| Only build download-and-replace capability | Compatibility incidents cannot be contained | Add compatibility, gray release and rollback |
| The hot-update boundary is not defined first | Scripts, config and host all drift together | Make clear which can be hot updated and which need a full package |

### 5.4 Core Points

> **What really matters about scripting hot update is not making changes faster, but keeping fast changes still within a controllable range.**

A mature scripting hot-update system needs to have all of the following at the same time:

1. **Clear layered boundaries**: the scripting layer carries high-frequency-change business logic, and the native layer keeps performance-sensitive and security-critical capabilities
2. **Controlled VM integration**: façade interfaces, lifecycle management, thread scheduling, debugging and observation
3. **Responsibility separation between config and scripts**: config carries data parameters, scripts carry execution logic
4. **Complete hot-update governance**: patch version management, compatibility matrix, gray ramp-up, fast rollback
5. **An accompanying testing system**: patch testing, compatibility testing, regression testing, rollback testing

Missing any one of these turns the system's "flexibility" into "loss of control."

---

## 6. Practical Case: A Hot-Update Compatibility Investigation Where "All Checks Passed, but It Crashed at Runtime"

> This case is a demonstration example (not taken from a real project); the numbers are rounded and simplified, focusing on the troubleshooting approach and the backfill logic.

**Background and symptoms**

Forty minutes after a Mid-Autumn event script patch was delivered to all users, two numbers appeared at the same time in the monitoring group: download success rate **99.8**%, verification failures **0** — the release chain was all green; but the crash rate rose from the baseline **0.2**% to **1.2**% (**6**x), and every crash stack pointed to the event entry. Both patch download and verification succeeded; it only started crashing at runtime — the most dangerous case described in section 4.3 happened exactly as described.

### Step One: Symptoms and Criteria

Three criteria produced three answers at the same moment:

- **Download criterion**: success rate **99.8**%, verification failures **0** — "the release chain is healthy";
- **Crash criterion**: crash rate **1.2**%, **6**x the baseline — "production is in an incident";
- **Version-split criterion**: host **2.1**.x crash rate **3.5**%, host **2.3**.x **0.2**% — flat with baseline, all crashes concentrated on the old host.

**Criteria gap**: crashes should be split by **2** layered dimensions (host version × patch level); monitoring split **0** — the full mean of 1.2% averaged a "local catastrophe" into an "overall anomaly."

### Step Two: Layered Attribution

```text
下载层   成功率 99.8%、校验 0 失败——文件都到了，这一层无罪
校验层   签名校验只验完整性与来源，不验「能不能在当前宿主上跑」
兼容层   新活动脚本调用了宿主 2.2 才有的接口，宿主 2.1 上运行时才崩——4.3 节兼容表第 1 行
观测层   崩溃只上报全量均值，没按宿主版本与补丁层级拆分——局部灾难被均值掩盖
```

**Ledger convergence**: **50,000** devices online, host **2.1**.x is **30**% = **15,000** devices exposed to the patch; the event entry is entered **20,000** times/hour, so old-host crashes = 20000 × 3.5% = **700** times/hour; split by version, the old host's local crash rate is **17.5**x the baseline (3.5 ÷ 0.2) — the full mean of 1.2% is not the shape of the incident; the version split is.

### Step Three: Root Cause

1. **Direct cause**: the new event script called an interface only available in host **2.2** — row **1** of the **4** rows in section 4.3's compatibility table, "interface dependency," was hit verbatim: the new script depended on an interface the old host did not have, causing a crash or functional anomaly.
2. **Mechanistic cause**: of the **6** layers of capability in section 4.2's hot-update system, only **2** were built (patch content organization, download and caching); among the missing **4** layers was precisely the life-saving layer in this incident — gray ramp-up, rollback/invalidation and host compatibility judgment; the patch declared no host_min and was sent straight to **100**%.
3. **Deep cause**: of the **4** layers in section 4.6's test table, **3** P0 items (patch self-test, host compatibility, rollback path) were not tested at all; row **1** of the **3** rows in section 5.3's pitfalls table, "hot update = testing substitute," was exactly the mindset at the time — piece 20's layered testing discipline was not extended to the hot-update chain.

### Step Four: Remediation and Backfill

1. **Stop the bleeding, roll back**: halt patch delivery and switch the delivery pointer back to the previous stable version — executed via the rollback_target field in section 4.4's compatibility matrix; **40** minutes from decision to network-wide effect.
2. **Compatibility matrix**: the patch manifest template gained **4** fields — host_min / host_max / dependency list / rollback_target — and the server filters by each client's host version; from then on, host **2.1**.x gets **0** deliveries.
3. **Gray ramp-up**: ramp up in the **5** stages of section 4.5 (internal verification → small range → expanded → large range → full), observing crash rate and functional anomalies at each stage before advancing.
4. **Fill in observability**: crash reporting split by the **2** dimensions of "host version × patch level" — the criteria gap missing in Step One is filled at the observability layer.

**Re-check**: after rollback the crash rate went **1.2**% → **0.2**%, back to baseline; after fixing the patch and replaying the gray release, it held flat for **24** hours at the **10**% stage before ramping to full — this time, "download all green" was truly green.

**Backfill checklist**:

| Backfill Item | Landing Point | Back-link |
|--------|------|------|
| The 4 compatibility-matrix fields into the patch manifest template | Release system | Piece 16 section 4.4 / piece 17 |
| The five gray-release stages into the hot-update release chain | Release system | Piece 16 section 4.5 |
| Crash reporting split by host version × patch level | Monitoring and alerting | Piece 16 section 2.5 observation boundary / piece 13 |
| The three P0 hot-update tests into the patch gate | Quality gate | Piece 16 section 4.6 / piece 20 |

### Three Lessons from the Case

1. **Download and verification prove "the file arrived," not "it can run"** — the most dangerous thing about hot update is compatibility, not download failure; a problem that only starts crashing at runtime is all green on the release chain (section 4.3).
2. **Gray release is not a professional posture, it is incident isolation** — straight-to-full delivery without gray release has an incident radius larger than a full-package release; each of the five stages leaves an observation window for rollback (section 4.5).
3. **What hot update shortens is the fix window, not the testing responsibility** — with the three P0 items untested, "fast" becomes "getting errors to more players fast" (sections 4.6 / 5.3).

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
