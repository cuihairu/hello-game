# Interaction and Input

## Category

client / cross-cutting node / interaction and input. In one sentence: input is the first link in the chain between the player and authority — turn heterogeneous device events into stable intents, then hand them to local prediction and network upload.

## Definition

The input system does only two things: **normalize** the raw events of keyboard, mouse, touch screen, and gamepad into **intents** (Intent), then feed the intents **in sequence into local simulation and the network layer**. There are two objective functions: game feel (latency from sampling to on-screen) and determinism (intents are recomputable and replayable). It is a pair of opposites with [Game UI System](/client/web/04): UI is the presentation layer where "the player reads state," input is the entry point where "the player writes state" — half of UI game feel is actually born in the latency ledger of the input pipeline.

## Problem

- **Events scattered in rendering callbacks**: keydown/pointer listeners are written directly on UI components and gameplay objects, so switching to another device (touch screen plus gamepad) means a full rework — without an abstraction layer, every new input device is an invasive modification.
- **Game feel and authority clash**: to make it "follow the finger," input directly mutates local state, and when the server adjudication comes back, rollback does not hold — the precondition for prediction to hold is that intents are recomputable (the caliber of [Client-Server Boundary](/client/02)); mutating state directly, racing ahead of intent generation, breaks that precondition.
- **Hard-coded key bindings**: key semantics are hard-wired into if branches, so changing a binding means a release; touch screen and gamepad each have their own set of logic, and three devices drift across three sets of behavior.
- **Input timing misaligned with tick**: input happens between frames, the sampling point is undefined, and frame sync projects end up with the "same action, different frame number" drift ([Frame Sync](/server/sync/03) input consistency starts here).

## Algorithm

### Pipeline: Five Stages

| Stage | Responsibility | Key caliber |
|----|------|---------|
| Device event | raw capture of keydown, pointer, gamepad poll, and touch | unified timestamps; polling devices (gamepad) and event-driven devices (keyboard) handled separately |
| Input abstraction | normalization: direction vector, key state, swipe trajectory | device differences are absorbed in this stage; downstream no longer perceives devices |
| Mapping table | data table of context → action (one each for combat state / menu state) | key bindings are data, not code; switch device = switch table |
| Intent | action carrying a sequence number and timestamp | recomputable, replayable, droppable — both prediction and upload use intent as the unit |
| Consumption | local prediction first + network upload; UI consumption separated from gameplay consumption | when UI grabs focus, gameplay input must yield (interaction boundary aligned with [web/06 Layering](/client/web/06)) |

### Game Feel: Three Calibers

- **Sampling timing fixed**: either sample uniformly at the tick boundary, or enqueue on event arrival and consume at the tick — pick one and write it in the document; frame sync projects only accept "intent emitted at the tick boundary."
- **Latency budget accounted for**: the whole-segment latency from sampling → intent → predicted on-screen must be measurable; local rendering baseline see [Canvas 2D Rendering](/client/web/01) (rAF cadence sets the ceiling on input consumption).
- **Rollback by intent unit**: when the server recomputation bounces back, what is reverted is the state transition produced by the intent, not "the key press itself" — prediction caliber see [Prediction, Compensation and Correction](/server/sync/05).

### Touch Screen and Multiple Devices

- The virtual joystick is one implementation of input abstraction, not a new pipeline — its output is isomorphic with the gamepad stick, and the mapping table does not need to change.
- Multi-touch conflict is adjudicated by "area ownership": one touch point can be held by only one control, and the boundary between the joystick area and the button area must be drawn clearly in the abstraction layer.
- The gamepad's polling cadence is independent of the rendering frame: low battery / Bluetooth latency are the norm, and the mapping table needs deadzone and curve calibration.

### Case Study: An Input Timing Drift Investigation of "Same Action, Three Verdicts Across Three Devices"

> The case is a demonstration example (not drawn from a real project); numbers are rounded for simplicity. It puts this page's "Pipeline: Five Stages," "Game Feel: Three Calibers," and "Touch Screen and Multiple Devices" into the deep end: one judgment chart run across three devices yields three tiers of results — this is a timing drift attribution investigation, and the full unfolding of "device differences must be absorbed at the source."

**Background and symptoms**: The project connects keyboard, touch screen, and gamepad simultaneously. On the same judgment chart, the pass rate is keyboard **96.2**%, touch screen **93.1%**, gamepad **89.8%**, a maximum gap of **6.4** percentage points; judgment-related tickets total **4200** per month, of which **73%** cannot be stably reproduced on a single device; one "change key binding" change took **9** person-days, and still required a release afterward.

### Step 1: Symptoms and Metrics — First Lay Out the Timing Ledger of Each of the Three Devices

Sampling caliber: keyboard and touch screen enqueue on event arrival, the gamepad polls at **120** Hz, and rendering runs **60** frames — the gamepad only gets its turn once every **2** frames on average (120 ÷ 60 = 2). The sampling points of the three paths are all different, so the moment intents arrive at local simulation was never on the same plane from the start.

Sequence caliber: within the same tick, rapid keyboard key presses produce **2** sequence numbers; sampling **1000** frames, intent sequence numbers duplicate **17** times — this page requires intents to be recomputable, replayable, and droppable, but the sequence numbers themselves are not trustworthy, so the latter two are entirely void.

Reproduction caliber: of the 4200 tickets, **3066** (73%) change verdict when the device changes; this kind of problem is forever "random" in a single-device reproduction environment.

### Step 2: Layered Attribution — Compare Stage by Stage Against This Page's Five-Stage Pipeline

```text
Input timing attribution  Share
  Sampling timing not fixed; event and polling paths coexist   46%
  Key bindings hard-coded; three devices, three sets of behavior each drifting   31%
  Touch point area ownership missing; multi-touch conflict cannot be ruled   23%
```

Item-by-item comparison: the gamepad's **89.8%** is the lowest of the three tiers, directly hitting this page's point that the gamepad's polling cadence is independent of the rendering frame and that low battery and Bluetooth latency are the norm; one key-binding change taking **9** person-days and still needing a package hits key bindings hard-coded into if branches; multi-touch simultaneous presses with the joystick and buttons grabbing at each other hits the boundary "one touch point can be held by only one control" that was never drawn.

### Step 3: Root Cause — Sampling Timing Never Written in the Document, Device Differences Pushed Downstream

The first item of this page's "Game Feel: Three Calibers" is either-or: sample uniformly at the tick boundary, or enqueue on event arrival and consume at the tick — **pick one and write it in the document**. The project wanted both sides, so every downstream stage carried its own timing behavior: the line "device differences are absorbed in this stage; downstream no longer perceives devices" was skipped, and the three devices each grew their own judgment path. Frame sync projects only accept "intent emitted at the tick boundary," yet the project did not even have a unified intent exit for local judgment, so the same action naturally maps to different frame numbers.

### Step 4: Remediation and Write-Back — Converging Timing Back to a Single Exit

1. Sampling unified: all three devices emit intents at the tick boundary; event-driven devices cache until the next tick for unified consumption, and gamepad polling results align to the nearest tick.
2. Key bindings as data: the context → action mapping table splits into two, combat state and menu state; key bindings are data, not code; switch device = switch table.
3. Area ownership: touch point ownership is adjudicated in the input abstraction layer, the joystick area and button area boundaries are drawn hard, and multi-touch conflicts first judge ownership before judging priority.
4. Sequence governance: within the same tick, only one intent sequence number is emitted, rapid presses merge duplicates, and replay recomputes the intent sequence by sequence number.

Recheck ledger: pass rates 96.2 / 93.1 / 89.8 → **95.6 / 95.4 / 94.8** (maximum gap **6.4** → **0.8** percentage points); judgment-related tickets **4200** → **310**; intent sequence duplicates **17** → **0**; key-binding changes **9** person-days → **1** person-day (switch table, no release).

**Write-back list**:

| Write-back item | Action | Write-back location |
|-----|------|--------|
| Sampling timing | Pick one and write it in the document; all devices emit intents at the tick boundary | Game Feel: Three Calibers |
| Sequence uniqueness | Emit only one sequence number per tick; rapid presses merge duplicates | Pipeline: Five Stages |
| Key bindings as data | context → action mapping table; switch device, switch table | Pipeline: Five Stages |
| Area ownership | Touch point ownership adjudicated in the abstraction layer; conflicts first judge ownership | Touch Screen and Multiple Devices |

### Three Lessons From the Case

1. **If sampling timing is not hard-coded, timing drift is inevitable** — with event and polling paths coexisting, all the player can see is "same action, different frame number."
2. **Device differences must be absorbed at the source, not patched downstream one by one** — without the input abstraction layer standing up, three devices grow three sets of behavior, and rework amplifies by the number of devices.
3. **Key bindings are data, not code** — hard-coded in if branches, changing a binding means a release; once the mapping table lands, switching devices means switching tables.

## Used By

Virtual joystick and gamepad adaptation (the device end of input abstraction); key binding customization for MOBA / shooters (mapping table as data); input judgment for fighting and rhythm games (sampling timing and latency budget); command timing for frame sync RTS (intent sequence numbers and tick boundary); governance of UI focus vs gameplay input contention (consumption stage separation).

## Related

Relation chain: device event → input abstraction → mapping table → intent → consumption and prediction → timing and game feel. Answering "why the next one is needed" stage by stage:

- Device events need abstraction: if device differences are not absorbed at the source, every downstream stage has to redo it once.
- Abstraction needs mapping: decouple action from key press, and rebinding plus multi-device becomes a data problem.
- Mapping needs to emit intents: prediction, upload, and replay all consume intents, not raw events.
- Intents need a consumer: local prediction goes first, server recomputation catches the bottom, and UI and gameplay fight for input separately.

Upstream: [Game UI System](/client/web/04) (the other half where the player reads state), [Client-Server Boundary and Network Layer](/client/02) (the authoritative caliber of recomputable intents), [Client Internal Layering](/client/web/06) (the consumption boundary between UI and gameplay); downstream: [Prediction, Compensation and Correction](/server/sync/05) (where intents are recomputed by the server), [Frame Sync in Depth](/server/sync/03) (determinism of command timing). Sister node: [Scripting Language and ECS](/client/04) (input mapping table data-driven and scripting layer share the same caliber).

## Reference

- This page is a summary of engineering experience; each platform's input API (Gamepad, Pointer Events, touch) is per its official docs; the case study in this page is a demonstration example (numbers rounded for simplicity)
- Term glossary: Input Abstraction (input abstraction), Input Mapping (input mapping), Intent (intent), Input Latency (input latency)

## References

- [Wikipedia · Input lag](https://en.wikipedia.org/wiki/Input_lag)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [index](index.md)
- [04](/client/web/04.md)
