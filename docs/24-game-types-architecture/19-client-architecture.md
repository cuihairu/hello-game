# 19 Client Architecture and Performance Basics

> This piece records several groups of judgments I commonly use on client performance and architecture problems: render budgets, UI states under network anomalies, and performance attribution. The backend often gets pulled in to investigate "is it laggy" together; once the client's costs are understood, the discussion lands more easily on verifiable metrics. Platform and engine constraints are covered separately in Chapter 03.
>
> **Reference books**: the cost criteria for the rendering and engine parts follow each engine's official performance docs (Unity Performance Optimization, the Unreal Scalability guide); the engineering practice for UI and loading follows the resource-management chapters of *Game Engine Architecture* (Jason Gregory).

---

## 1. Rendering Pipeline Basics: Where Frame Time Goes

### 1.1 The Cost Model of a Single Draw

Each frame's time budget is fixed: at 60fps it is 16.6 milliseconds, at 30fps 33.3 milliseconds. This money is spent in three places — **logic update** (game scripts, physics), **render submission** (the CPU preparing and submitting draw commands), and **GPU execution** (the actual pixel and vertex computation). Slow rendering is usually not one place "computing slowly" but the three together exceeding the budget.

What server-side engineers most easily misunderstand is the **Draw Call (DC)**: it is not "how big an area of the screen was painted" but one draw command the CPU submits to the GPU. Drawing 1000 identical blades of grass, if submitted in 1000 passes, is 1000 DCs — each submission carries a fixed CPU cost (state switching, command-buffer writes), while the image itself may occupy only a few pixels of the screen. So **on low-end devices the real bottleneck is often the CPU submission side, not GPU horsepower**: the GPU has not even started working, and the CPU has already burned the frame time preparing commands.

Judgment criteria:

- **DC count** is the first budget item to look at. A common healthy line on mobile is within a few hundred (tighter on low-end devices); past the line, adding machines does nothing — this is an in-client single-machine problem, unrelated to server load.
- **Triangle count** affects GPU vertex processing; texture size and format affect video memory and bandwidth.
- All three belong in the project's **asset budget sheet** (how many triangles per character, how large each texture, the per-screen DC cap) — Chapter 03 said platform constraints reverse-determine the design space, and the budget sheet is the concrete form of that constraint.

### 1.2 Batching and Baking: Turn Many Submissions into Few, Turn Real-Time into Offline

The engineering measures against DC cost form one family, all with the idea of **merging N submissions into 1**:

- **Static batching**: static objects (buildings, terrain decoration) merged once at startup, zero runtime cost; the price is memory and package size.
- **Dynamic batching**: small objects merged and submitted every frame, so the CPU actually does the work twice more — only worthwhile for tiny objects with very few vertices; overuse is a negative optimization.
- **GPU Instancing**: draw many copies of the same mesh (grass, trees, shell casings) in one submission. The first choice for large batches of repeated objects.
- **Pipeline-level batching like the SRP Batcher**: batches by material shader compatibility, the default direction of modern engines.

The other line of thinking is **moving real-time computation offline**: **lightmap baking** precomputes complex lighting into textures (Lightmaps) sampled directly at runtime; occlusion-culling baking precomputes "what can see what". Baking is structurally the same idea as caching on the backend — **trading build-time computation for runtime budget** — and the price is "static": move a light source and the bake is void, which is why dynamic lighting is never fully baked away.

The boundary must be clear: batching saves submission overhead, not excessive triangle counts or super-resolution textures; baking saves lighting, not dynamic shadows. Every one of these measures has its applicable surface and reverse cost; "batching is on so draw whatever" and "no caching was built so caching cannot be added" are the same mistake.

### 1.3 LOD: Distant Things Do Not Deserve Detail

**LOD (Level of Detail)** means preparing multiple model tiers for the same object: near it uses the high-poly model, farther it auto-switches to low-poly, farther still it becomes a billboard. This is the direct response to the waste of "a character occupies 20 pixels on screen while carrying 50,000 triangles". LOD switch distances and per-tier triangle ratios are agreed values in the asset pipeline, and art must produce assets by tier.

What backend engineers should take away from the LOD analogy: **tiered degradation is not a compromise, it is capacity design**. LOD, batching, baking, and the downsampled feeds and tiered push you do on the server (Chapter 11's merged friend-state push) are projections of the same idea at different layers — deliver detail by viewing distance, by need.

### 1.4 Three Things Backend Engineers Should Take Away

1. **Ask for the budget sheet**: when joining performance alignment, first ask the client for the asset budget sheet (per-screen DC, triangle count, texture memory, package size), just as you would read capacity planning before discussing scale-out (load-test criteria in Appendix A4).
2. **Recognize false leads**: a good share of "the server is laggy" player complaints end up localized to client DC blowout, a UI rebuild storm, or asset-loading blockage (the attribution table in Section 5 of this chapter).
3. **Manage what you can manage**: response size, delivered data volume, push frequency — these are the variables the server writes directly into the client's frame time (expanded in Section 4.4).

---

## 2. UI/UX Engineering: The First Scene of Network Problems

### 2.1 UI Framework Layering and Rebuild Cost

UI in modern engines is a **layered tree + per-frame batched rendering** model (UGUI/NGUI/Unreal UMG are much the same): the interface is a nested node tree, and on change the engine recomputes layout and rebuilds draw batches. The key cost rule: **one node change can contaminate the whole batch** — one line of text in a list changes, and the entire Canvas's batches may need rebuilding. So mature teams split UI canvases by "change frequency": one Canvas for health bars, one for chat, one for static panels, capping the blast radius of high-frequency changes within their own layer.

Judgment: the typical shape of UI stutter is "discontinuous small spikes" (each refresh rebuilds a batch), not sustained high load. Seeing periodic spikes on the frame-time curve, check UI refresh before checking the server.

### 2.2 Event Passthrough and Raycast Detection

A click is, inside the engine, a **raycast** (cast from the screen point into the scene, asking "what was hit"). Two common accidents:

- **An invisible image eating clicks**: a full-screen invisible image (gradient mask, decoration layer) with raycast detection on — the player taps where "there is nothing" and nothing responds, because the click was eaten by it.
- **What should block doesn't**: the 3D scene behind a popup still receives clicks, and the player "taps" a character in the scene at the popup's edge.

The norm is **raycast detection toggled on demand**: display-only nodes turn off Raycast Target across the board; blocking layers explicitly declare "I eat clicks". This looks like a pure client detail, but it explains a large share of "I clearly pressed the button" support tickets — don't rush to the server logs during attribution.

### 2.3 The Three-State Interaction Between UI and Network

The UI is the **monetization outlet** of server latency and errors. Any UI operation that depends on the network must have a complete design for three states:

| State | Content | Backend contract |
|------|------|---------|
| **Loading** | Request sent: disable the button + progress/skeleton, letting the player know "the tap worked" | The interface needs a predictable latency ceiling; past the UI wait limit (say 3 seconds) the front end actively flips to the error state |
| **Error** | Definitive failure: player-readable copy mapped from error codes + a remedy entrance | The error-code system must be designed for UI copy (the error-code part of Chapter 04's protocol design), not just internal stacks |
| **Retry** | Outcome uncertain (timeout/disconnect): show "retrying" or let the player retry manually | **Retries must be idempotent** — without a server-side idempotency key (Chapter 10 settlement, Chapter 11 claim replay defense), client retries become duplicate orders |

The most common production incident shape is one of the three states missing: no loading state → the player taps frantically → the server receives an N-combo of requests; no idempotency → the N-combo becomes N deliveries. **Client-side button debounce is only the first gate; server-side idempotency is the final ruling** — write this responsibility split into the interface document, not leave it verbal.

Boundary: not every interface needs all three states. Operations with local instant feedback (dragging an inventory slot) should have no network dependency; conversely, payment, settlement, and trading operations must carry the full three states + idempotency. Grade by an operation's "failure cost"; do not apply one rule to everything.

---

## 3. The Animation State Machine and the Logic State Machine

### 3.1 The Division of Labor Between Two State Machines

Two state machines actually run inside the client:

- **The logic state machine**: what state the character "is in" — idle/move/attack/stun/death. It drives gameplay adjudication (can it be hit, can it interact) and is the object managed by Chapter 09's state pattern.
- **The animation state machine**: what the character "looks like it is doing" — animation clips, transitions, blend trees. It only handles presentation and runs inside the animation system.

The relationship between the two is **one-way feeding**: logic state changes drive animation state switches; the animation system's only legitimate channel back is the **animation frame event** (a point callback fired at a specific frame, e.g. the damage check at frame 8 of a sword swing) — and this channel must pass logic-layer validation; it must not directly modify business data.

### 3.2 Three Classic Pits of Mismatch

1. **Transition time swallows responsiveness**: animation state machines have transition blending (0.2-second fades are common) — logic has switched states while the animation is still fading out, and the player feels "input lag". Presentation problems get solved by tuning parameters in the animation layer; do not change the logic state machine's timing for feel, or adjudication and presentation go haywire together.
2. **Logic written inside animation events**: hanging "deal damage" or "deduct HP after playing the sound" on animation frame callbacks. When animation gets degraded (low-end devices trimming animations, stutter dropping frames), **events do not fire and logic silently vanishes**. The discipline: frame events may only trigger "presentation completion" (sounds, effects); all logic affecting adjudication and numbers lives on the logic state machine's transition points.
3. **The animation black hole of rollback and reconnection**: after a disconnect-reconnect or an in-match rollback (Chapter 04's sync models), the logic state machine jumps straight to the current state while the animation layer still sits in the old state — producing the "standing there taking hits" glitch. The norm is a **hard cut in the animation state machine after reconnect/rollback** (skip transitions and align directly), plus one presentation calibration at the alignment point.

### 3.3 Where the Authority Sits

In competitive and hard-counter play, the logic state machine's **authority is on the server** (the server adjudicates state transitions and the client's presentation follows; see Chapter 04's state sync); single-player-feeling play (dress-up, housing) can be client-authoritative + server-saved. The rule of thumb: **states that affect adjudication are server-authoritative; states that only affect looks are client-autonomous**. The animation layer never participates in authoritative rulings — it is the layer most easily trimmed, down-framed, and interrupted.

---

## 4. Asset Loading and the Memory Budget

### 4.1 Split Packages and the First Package

Chapter 03 covered the hard constraints of mini-games: the WeChat mini-game main package is 4MB (the whole-package cap follows the platform's current rules), and the engine body plus the first scene nearly touches the line. The essence of split packages is **compressing "must be there at boot" to the minimum and fetching the rest on demand**:

- **Main package**: engine + boot scene + login — lets the player see "the game started" immediately.
- **Remote assets**: scenes, characters, and configs downloaded on demand over CDN with versioning and delta updates (Chapter 17's server-side counterpart to the version system plugs in right here).

The term to align on is "first package": the package first-download (what the store channel rates) and **first-package time** (Section 5.3, the elapsed time from launch to playable) are not the same thing, and both must be managed.

### 4.2 Loading Strategy and Unloading

The entire difficulty of asset management condenses into one question: **what stays in memory, and for how long**. Common strategies:

- **Scene-level unloading**: on scene switch, release the old scene's assets wholesale — coarse but reliable, the default base.
- **Resident pool + reference counting**: frequently reused small assets (icons, sound effects, popup prefabs) go into a resident pool, and only when the reference count hits zero are they truly unloaded. One over-decrement of the reference count is a "wild-pointer-style" asset loss (reloaded on next use, showing up as occasional stutter); one under-decrement is a leak.
- **Load instrumentation and queueing**: load requests merged, deduplicated, rate-limited — 20 systems simultaneously requesting their own assets in the same frame will crush IO and decoding into one frame and manufacture loading stutter.

The stealth of a memory leak is that **it does not crash at the crime scene**: memory creeps up, hours later OOM (the system kills the process) and a flash exit, with nothing at the scene. The solution is not guessing but memory watermark monitoring (next section).

### 4.3 Memory Watermarks

The low-end device's memory red line is hard: exceed the ceiling the system gives the process and it is an OOM flash exit. The engineering criteria is writing the memory budget into the asset pipeline — **derive each module's quota backward from the target device's memory ceiling** (so much for UI, so much for battle scenes, so much for audio); assets over quota do not enter the package. At runtime, do **watermark tiering**: at the yellow watermark start proactively unloading low-frequency assets and dropping texture tiers; at the red watermark abandon caches to save the process.

The capacity analogy: this is the client-side version of "watermark-based scaling" (Appendix A4 covers the server-side watermarking and scaling) — both sides share the same idea: **budgets up front, not firefighting after**.

### 4.4 Coordinating with the Backend's Delivered Data Volume

Every byte the server writes to the client ultimately lands in one of the client's budgets:

- **Full download at login**: pushing the inventory, mail, friends, and quests all at once at login — the client's parsing + UI construction time all gets booked into first-package time. Switching to per-screen lazy loading (pull the inventory only when it opens) immediately shaves a chunk off the first package. This is a typical both-ends change: the server provides paginated/incremental interfaces while the client changes load timing.
- **Config table size**: full config tables of tens of MB are a common "historical legacy". Splitting (by module / by version delta) + compression is the direct meeting point of Chapter 17's config pipeline and client loading.
- **Push frequency**: the push cadence of chat, state, and leaderboards directly hammers UI rebuilds (the batch contamination of Section 2.1). Chapter 11's merged push is not just saving server bandwidth — it is also protecting the client's frame time.

Judgment: for any "the client lags as soon as it enters the lobby" problem, first look at the byte volume and structure of the server's first-screen delivery, then at the client's parsing and UI construction — each side owning half the responsibility is the norm.

---

## 5. Front-End Performance: Attribution by "Whose Responsibility"

### 5.1 The Frame-Rate Budget

The first table for performance problems is the **frame-time breakdown**: of the 16.6ms, how much goes to logic update, how much to render submission, how much to the GPU, how much to UI rebuilds, how much to waiting (including network waits). The engine's Profiler gives this breakdown — every argument without a breakdown is just loudness. The conventional criteria: **frame drops come in two kinds**, sustained low frame rate (load long over budget, an asset-spec problem) and intermittent stutter (occasional spikes, a loading/UI-rebuild/GC problem). The two have completely different causes and treatments.

### 5.2 Layered Stutter Attribution

When a player says "laggy", it may be five completely different diseases. Attribute by the table below, ruling top-down — falsify the upper rows first:

| Layer | Typical symptoms | Where the evidence is |
|----|---------|---------|
| Client rendering | Quality-dependent: frame drops with many players or many effects; DC blowout | Frame capture analysis (Frame Debugger/RenderDoc) for DCs and overdraw |
| Client logic | Periodic small spikes: GC, UI rebuilds, loading decode squeezed into one frame | The Profiler's frame-time breakdown; GC logs |
| Network | Operation-to-feedback latency fixed and stable (RTT scale), fluctuating with network conditions | Client ping/packet-loss stats + server trace time alignment |
| Server | All players report slowness at the same time, and slow on the same interface | Server traces and slow-query logs (the criteria of the knowledge base main line's "Observability, Performance, Capacity, and Stability" chapter) |
| Asset pipeline | Specific scenes/devices lag: cold start, first entry into a new map | Load instrumentation data + device distribution |

Two disciplines: **single-point reproduction beats crowd impressions** (getting a reproducible device + scene + operation sequence is worth more than a hundred "laggy" complaints); **align the clocks on both ends** (time-aligning the client timeline with the server trace is what separates "slow network" from "slow server" — time-alignment criteria in Chapter 12's server_ts field for event tracking).

### 5.3 First-Package Time

First-package time (tap icon to interactive lobby) is the player's first impression of "is this game laggy", and its budget breakdown is a pipeline:

```text
启动 → SDK 初始化 → 版本检查 → 热更下载 → 登录鉴权 → 拉取首屏数据 → 进大厅
```

Every link has an owner: slow SDK initialization goes to the platform-integration side (serial initialization of login SDKs is a common lesion; parallelize wherever possible); version check and login authentication are **server-side interfaces** — these two must be designed as "low latency + degradable" (should a dead version-check interface block launch? The blocking policy must be hard-written into the server playbook; see Chapter 13's launch-day practice); slow hot-update download is about CDN and delta strategy; slow first-screen data returns to Section 4.4's delivery coordination.

Monitoring criteria: instrument and report each first-package stage (in event layering this is a system event, Chapter 12 Section 2.1), viewed by device and network percentiles (P50/P90), not by lucky averages.

---

## 6. Practical Advice

An action list for backend engineers, by scenario:

- **When reviewing interfaces**: ask "who consumes this interface's response, and when?" — login first-screen interfaces get designed against the first-package budget, in-combat interfaces against the frame budget. Large responses require pagination or increment by default.
- **When designing protocols**: error codes designed for the three states (Section 2.3), write operations always carrying idempotency-key semantics — the client will retry; this is not if, it is when.
- **When troubleshooting**: run the Section 5.2 attribution layers first, speak with evidence in hand; the three words "the server is laggy" are just a hypothesis until clock-aligned data from both ends is in hand.
- **In joint performance testing**: the client asset budget sheet and first-package instrumentation data should appear alongside the load-test report (Appendix A4) in the performance acceptance materials — performance is one ledger settled by both ends, not two separate books.

---

## 7. Common Pitfalls Summary

| Pitfall | Description | Mitigation |
|------|------|------|
| Treating all stutter as a server problem | Client DC blowout, UI rebuilds, GC can each produce a "laggy" feel | Section 5.2 attribution layers, evidence first |
| Logic written inside animation events | Logic silently vanishes when animation degrades or drops frames | Frame events only do presentation completion; logic lives on state-machine transition points |
| Animation misaligned after reconnect | Logic has jumped while the animation still blends in the old state | Hard-cut animation alignment after reconnect/rollback |
| Buttons without a loading state | Frantic tapping produces a request storm | The three-state interaction is mandatory, with server idempotency as backstop |
| Full download at login | First-package time eaten by parsing and UI construction | Per-screen lazy loading, server provides incremental interfaces |
| Memory only grows, unmanaged | OOM flash exit hours later, no crime scene | Watermark tiering + routine leak attribution |
| Batching/caching abuse | Dynamic batching negative-optimizes, cache misses stampede the origin | Record the applicable surface and reverse cost of each measure (Section 1.2) |
| First package tested only on flagships | Real low-end-device times are multiples of the flagship | Monitor by device percentiles, set budgets on P90 |

---

## 8. Summary

This chapter splits the client into four ledgers: the render frame-time ledger, the UI rebuild-and-three-states ledger, the animation two-state-machines ledger, and the asset memory-watermark ledger. The single thread running through the four ledgers: **every byte and every refresh of the client is a downstream consequence of server decisions; every kind of client stutter is also the starting point of an attribution exercise**. A backend engineer does not need to draw a beautiful frame, but needs to know how much a frame costs, where the money goes, and — when it runs over — how to prove the overage was not their own doing.

> The next chapter enters [Chapter 20 Game Testing and Quality Assurance](/24-game-types-architecture/20-game-testing): how these performance budgets become acceptance gates, and what the client-side and server-side tests each own.

---

## 9. Practical Case: Attributing Render Commands in a "New Map at 24 Frames"

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. It takes Section 1.1's frame-time ledger, Section 1.2's batching toolbox, and Section 5's attribution table into deep water: answering "where did the frame time go" command by command — an instruction-level investigation of front-end performance, and the ultimate self-vindication of Section 1.4's "the server is laggy" false lead.

**Background and symptoms**: 3 days after the new map "Sunken City" shipped, mid-range-device player tickets flooded in with "lags the moment I enter the map", and support classified it "server laggy". The server side was spotless: gateway RTT normal, frame sync no backlog, CPU flat. Client performance telemetry: average frame rate **42**, but the P05 tail frame only **24** (P05 percentile = 5% of frames are slower) — the average criteria hid the long tail yet again (the same lesson as Chapter 13's monitoring criteria). Stutter-judgment criteria first: frames over **33ms** (i.e. below 30fps) count as stutter; the current stutter share is **11%**.

### Step 1: Symptoms and Criteria—Pin the Bound Direction First, Then Open the Command Ledger

The mid-range target is 30fps, frame budget = **33.3ms** (1000/30); the measured tail frame is **41.7ms** — exactly 1000/24, over budget by **8.4ms** (25%). Bound judgment first: the frame-time split is CPU submission **21ms** / GPU **38ms** — GPU-bound, but the CPU's 21ms has already eaten more than half the budget: both sides are overspending, not a single-point problem. Attribution starts from the instruction-level ledger.

### Step 2: Layered Attribution—The Instruction-Level Ledger

```text
Draw Call    旧地图 210 → 新地图 480（2.3 倍，超预算表单屏上限 300）
材质/合批    480 个 DC 里 260 个因独立材质无法合批（植被与装饰物各带材质实例）
过绘         半透明水面与雾效叠加，屏幕平均过绘 3.8 层（基线 1.6 层）
实时阴影     全场景动态阴影未设距离分级，远山也投 2048 阴影贴图
三角形       120 万/帧（预算 80 万），超支主要来自远景未切 LOD
```

- **By scene**: only the new map exceeds; the old map is flat — a content problem, not a version problem
- **By tier**: high-end devices run 55 frames (only 5 short of the 60 budget) — specs were not tiered by device class, and the mid-range carried the full load

### Step 3: Root Cause—Three Things Saturating the GPU at Once, With No Line of Defense Stopping Them

1. **Direct cause**: 480 DCs exceed the budget cap of 300 (×1.6), overdraw 3.8 layers, distant LOD unswitched — GPU render time saturated by three things stacked
2. **Mechanism cause**: the art pipeline had no asset audit gate for "per-scene DC / material count / overdraw" (the missing audit among Chapter 21's four art-pipeline things) — spec-violating assets went straight into the package
3. **Budget cause**: the asset budget sheet had only the memory watermark (Section 4.3), no render budget (DC/triangles/overdraw tiered by device class) — the mid-range had no degradation path to take

### Step 4: Remediation and Backfill

Remediation ordered by "benefit / cost":

1. Vegetation and decoration moved to GPU Instancing + shared materials: DC 480 → **260** (−46%, back within the budget line)
2. Shadow tiering: past 40m switch to low-resolution shadow maps
3. Semi-transparent water switched to a preprocessed noise map: overdraw 3.8 → **2.1** layers
4. Mid-range post-processing downgraded wholesale to a quality option

Recheck: tail frames 24 → **41** fps, average 42 → **47**, stutter share 11% → **3%**; high-end devices hold **55**+ frames unaffected.

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill item | Owner | Completion criteria |
|--------|------|---------|
| Asset audit gate: per-scene DC ≤ 300 / material count / overdraw layers into the art package checks (echoing Chapter 21's 2.4 audit gate) | Art/Tools | Gate live and run across all scenes |
| Render budget sheet tiered by device class (DC/triangles/overdraw), managed in the same table as the memory watermark (4.3) | Client | Budget sheet review passed |
| Frame-rate monitoring reported by percentile (P05) × device tier, replacing the average dashboard (echoing Chapter 13's criteria) | Client/Data | Dashboard redesigned |
| GPU/CPU bound benchmark before any new scene goes live, into acceptance (echoing Chapter 20's performance gates) | QA/Client | Benchmark scripts in the repo |

### Three Lessons from the Case

1. **Average frame rate is for operations; percentile frame rate is for players**. An average of 42 with a tail of 24 means players live in P05 — the client-side version of Chapter 13's "average-value criteria"
2. **The instruction-level ledger is the only path from "laggy" to "which command is expensive"**. Line up the four small ledgers — DC, materials, overdraw, LOD — and the root cause needs no guessing
3. **Render budgets carry the same weight as memory watermarks**. Section 4.3 set watermarks for memory; DC and overdraw equally need per-tier red lines — otherwise the art pipeline's audit has nothing to stand on

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
