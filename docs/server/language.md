# Server Language and Runtime

## Category

server / horizontal node / language and selection. In one sentence: selecting a server language is not a matter of syntax preference but a choice about "under what runtime model the match logic executes, and at which layer the hot-update boundary is cut."

## Definition

The four questions of the client-side language map ([engines/02](/client/engines/02)) -- talent, familiarity, ecosystem, history -- hold just as well on the server, but the server adds two of its own hard constraints: **real-time** (the tick budget and GC pauses directly decide frame jitter) and **authority** (authoritative logic has to be changeable during operation, and the channel for changing it is the hot-update surface). So mature server language forms are almost all two-layer: one core language carries authority and concurrency, and one scripting layer carries the frequently changing gameplay logic. The substance of choosing a language is picking one runtime for each of those two layers.

## Problem

- **Selecting by benchmark**: performance leaderboards and syntax preference do not answer "can this runtime's pause shape fit inside the tick budget." Different GC pause shapes (concurrent mark versus full stop) can make the same code differ by an order of magnitude in frame behavior.
- **Single-language idealism**: the client and the server were never asking the same thing (multi-language coexistence is the norm, see the multi-language boundary in [engines/02](/client/engines/02)). A server entirely in a scripting language cannot hold up on CPU-intensive segments; entirely in a compiled language, every change to activity logic has to go through a release.
- **Hot update clashing with authority**: the server is authoritative, yet values and activity logic change often during operation. A server with no scripting layer brute-forces it with "restart and release"; a server with a scripting layer that does not draw the hot-update boundary clearly lets the authority caliber drift (for the hot-update system see [system/scripting/04](/system/scripting/04)).
- **Underestimating the gravity of talent and ecosystem**: many languages are friendly to concurrency, but few let you hire people with a protocol stack / DB drivers / observability ecosystem all in place -- of the four questions in engines/02, the ecosystem question is the most expensive on the server.

## Algorithm

### The four runtime forms

| Runtime model | Representative | Logic execution form | Hot-update surface | Typical cost |
|---------------|----------------|----------------------|--------------------|--------------|
| Compiled core + embedded script VM | BigWorld (C++ + Python), KBEngine (C++ + Python), skynet (C + Lua) | authority and IO in the compiled core, gameplay logic in the script | hot load at the script layer | two language mental models, the cross-language boundary needs managing |
| Managed runtime | Orleans (.NET), Nakama (Go core + Lua/TS/Go extensions) | GC in exchange for productivity, Actor / fine-grained concurrency | runtime plugin / gray release | the pause shape has to be matched against the capacity model |
| Native concurrent GC language | leaf, nano (Go) | concurrency via goroutine / channel | compile time, relying on modularity + release | slow to change logic during operation |
| Event-loop scripting runtime | Colyseus (Node.js) | single-threaded event loop, room-level isolation | code swapped at deploy time | low ceiling on CPU-intensive work, multi-core only via multi-process |

### The four selection questions (the server projection of the four questions in engines/02)

1. Under the tick budget, is this runtime's pause shape tolerable?
2. Does its concurrency model match the match model (parallel rooms versus a single serial world)?
3. At which layer is the hot-update boundary cut, and who has authority to change the authoritative logic?
4. Can the talent stock and ecosystem (protocol, DB drivers, observability) carry it?

Landing path: characterize by runtime model first, narrow with the four questions, and finally check [the open-source server map](./map.md) for a ready implementation whose form matches -- if a form can be chosen, do not start building from the language.

## Used By

- **BigWorld** (commit `088d3b84`, paths relative to `programming/bigworld/`): a C++ server end plus embedded Python (`README.md:21`) -- the engine side carries AOI, sync, and persistence, and all entity gameplay methods live in the Python script layer.
- **KBEngine** (commit `0bc93d5`): an isomorphic two-layer choice -- "The engine is written in C++" (`README.md:71`), the Python scripts "support hotfixing" (`README.md:67`), an embedded Python 3.12 runtime (`README.md:132`).
- **skynet** (commit `64391f7`): "multi-user Lua framework supporting the actor model" (`README.md:3`) -- C does only the kernel and scheduling, and all business logic is a Lua Actor.
- **Nakama** (commit `e920249`): a Go compiled core plus a three-way runtime extension choice (Lua / TypeScript / Go, `README.md:27`), with `go.mod:1` declaring the Go module -- a hybrid form of compiled platform core and scripted gameplay extension.
- **leaf** (commit `af71eb0`): "A pragmatic game server framework in Go" (`README.md:3`); **nano** (commit `dbf22c7`): a Go networking library (`README.md:12`) -- the lightweight end of the native concurrent language form.
- **Colyseus** (commit `e620123`): "Authoritative Multiplayer Framework for Node.js" (`README.md:21`) -- the event-loop form, with the room simulation advancing at 60fps (`packages/core/src/Room.ts:57-58`).
- **Orleans** (commit `b084e03`): a Virtual Actor Model on .NET (`README.md:10`, `:16`) -- the managed runtime absorbs distributed complexity into the runtime, and the developer only writes grains.

## Related

Relation chain: the two hard constraints of real-time and authority -> the two-layer structure -> the four runtime forms -> the four selection questions -> the landing map. Each link answers "why is the next one needed":

- Only with the constraints is there a two-layer structure: real-time and authority decide the division of "the core carries authority, the script carries change" (for the positioning of the script layer see [script layer positioning and language choice](/system/scripting/01)).
- Only with the two-layer structure do you pick a runtime: the two layers' languages together are the complete technology-stack decision; "what language does the server use" on its own cannot be stated.
- Only with the runtime is there a pass over the four questions: talent, ecosystem, hot update, and pauses narrow the candidates down to one or two that can actually be executed.
- Only once the four questions pass does it land: [the open-source server map](./map.md) gives ready implementations to compare against by form, avoiding building from zero.

Upstream: [engines/02 the language map](/client/engines/02) (the client version of the four questions), [engines/03 integrated selection](/client/engines/03) (the self-developed / framework / off-the-shelf judgment); downstream: [the open-source server map](./map.md) (landing by form), [execution model and runtime](/server/runtime/) (the expansion of the concurrency model).

## Reference

- This page is a synthesis of engineering experience; per-engine facts follow the source citations anchored to commits inside the text
- Terminology cross-reference: Runtime Model (runtime model), Embedded Scripting (embedded scripting), Hotfix (hot fix), GC Pause (GC pause)
- This page is a synthesis of engineering experience; per-engine facts follow the source citations anchored to commits inside the text; the practical case in the page is a demonstration example (numbers rounded and simplified)

### Practical case: triaging a "the top language on the benchmark, and frame jitter doubled" runtime selection

> This case is a demonstration example (not drawn from a real project), with numbers rounded and simplified. It pushes this page's "Problem" of selecting by benchmark and the "Algorithm" four selection questions into deep water: the language is chosen and the frame jitter comes to collect -- this is a triage of the pause shape not entering the tick budget, and also a full unfolding of "how the two layers' languages together make the complete technology-stack decision."

**Background and symptoms**: a room-based competitive server end picked a managed language with full-stop GC by performance benchmark. After launch, combat frame P99 rose from **16** milliseconds to **34** milliseconds, with GC pauses of **80** milliseconds every **2** seconds; changing activity logic once during operation meant a release, once every two weeks.

### Step 1: symptoms and caliber -- first sort out which question went unanswered

Pause caliber: a single full-stop GC pause of **80** milliseconds directly exceeds the **16**-millisecond tick budget by **5**x -- performance leaderboards and syntax preference do not answer "can this runtime's pause shape fit inside the tick budget."

Hot-update caliber: a server with no scripting layer brute-forces it with "restart and release," and changing activity logic during operation means a release every two weeks; a server with a scripting layer that does not draw the hot-update boundary clearly lets the authority caliber drift.

Concurrency caliber: parallel rooms and the managed runtime's granularity do not match -- the match model and the concurrency model do not line up.

### Step 2: layered attribution -- check against the four selection questions

```text
帧抖动归因  占比
  停顿形态没进 tick 预算评估     58%
  热更边界没画，权威口径漂移      24%
  人才与生态低估                  18%
```

Comparing item by item: an **80**-millisecond GC pause exceeding the tick budget by **5**x -- hits the first question left unanswered; changing logic by release -- hits the third question left unanswered; unable to hire, with protocol stack and observability ecosystem not in place -- hits the fourth question left unanswered. Of the four questions only the second was answered.

### Step 3: root cause -- selecting by benchmark instead of by runtime model

The substance of choosing a language is picking one runtime for each of the two layers: one core language carrying authority and concurrency, one scripting layer carrying the frequently changing gameplay logic. Selecting by benchmark looked only at single-language performance, never at the pause shape, concurrency match, hot-update boundary, or talent and ecosystem -- the two layers' languages together are the complete technology-stack decision.

### Step 4: remediation and backfill -- run the four questions once, land the two layers

1. Run the four selection questions once: is the pause shape tolerable under the tick budget, does the concurrency model match the match model, at which layer is the hot-update boundary cut, and can talent and ecosystem carry it.
2. Land the two-layer structure: the compiled core carries authority and IO, the script layer carries the gameplay logic, and changes take effect immediately without a release.
3. Draw the hot-update boundary clearly: who has authority to change the authoritative logic is written into the design, aligned with the script layer's positioning and language choice.
4. Cross-check against the open-source server map: characterize by runtime model first, then cross-check against a ready implementation whose form matches; if a form can be chosen, do not start building from the language.

Verification ledger: combat frame P99 **34** milliseconds -> **17** milliseconds; GC pause **80** milliseconds -> concurrent mark **8** milliseconds; activity logic change cadence **2** weeks -> same-day hot load.

**Backfill checklist**:

| Backfill item | Action | Backfill location |
|---------------|--------|-------------------|
| Pause-shape evaluation | whether the pause shape is tolerable under the tick budget, and put it into the first selection question | Problem |
| Two-layer structure | the compiled core carries authority and concurrency, the script layer carries gameplay | Algorithm |
| Hot-update boundary | who has authority to change the authoritative logic is written into the design | Problem |
| Form landing | pick the form against the open-source server map, do not build from the language | Reference |

### Three lessons from the case

1. **A benchmark does not answer the pause shape**. A single full-stop GC pause of 80 milliseconds exceeds the tick budget 5x, and frame jitter doubles outright.
2. **The two layers' languages together are the technology-stack decision**. "What language does the server use" on its own cannot be stated; the core and the script each need their own runtime chosen.
3. **The hot-update boundary has to be drawn in advance**. Without a script layer, restart-and-release is brute-force; with a script layer and no boundary drawn, the authority caliber drifts along.

## References

- [Wikipedia · Go](https://en.wikipedia.org/wiki/Go_(programming_language))
- [Wikipedia · Rust](https://en.wikipedia.org/wiki/Rust_(programming_language))
- [Wikipedia · C++](https://en.wikipedia.org/wiki/C%2B%2B)

<!-- BACKLINKS-AUTO -->
## Related pages

- [02](/client/engines/02.md)
- [index](/client/engines/index.md)
- [10](/glossary/10.md)
- [index](index.md)
- [map](map.md)
