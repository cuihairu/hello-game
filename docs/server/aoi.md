# AOI: Area of Interest

> This page also serves as the node template for the knowledge graph: a fixed seven sections (Category / Definition / Problem / Algorithm / Used By / Related / Reference), and the chain of relations between nodes answers "why is the next node needed." Cases use only mature open source and publicly verifiable commercial implementations.

## Category

server / multiplayer model / visibility management. In one sentence: it decides "which client gets told about whose state change."

## Definition

AOI (Area of Interest) is the set of visible entities the server maintains for each client, together with the mechanism that maintains it: only state changes of entities inside the set are pushed down, and those outside are not; entering and leaving the set produce enter/leave events. BigWorld and KBEngine call the observer on the player side a Witness, and build the visibility decision as a spatial trigger (RangeTrigger).

## Problem

The scenario: in an MMO main city, player A walks toward player B, and B must appear on A's screen -- who decides that "appearance"?

First, run the arithmetic with no cropping at all. N entities on screen, f state changes per entity per second, every change sent to every client:

```text
每秒消息量 = N × f × N = N²·f
N=200、f=2：200² × 2 = 80,000 条/秒，单个 Zone 已经不可行
N=1000、f=2：2,000,000 条/秒，带宽与 CPU 都是平方级
```

AOI compresses the quadratic ledger into a linear one: each client receives only "visible set size times f." The visible entities on one screen are usually just a few dozen, so message volume drops by one to two orders of magnitude. This is also the answer behind the relation-chain link "Zone Server -> AOI": a Zone cuts the world into blocks a process can carry, but a single Zone still holds hundreds of entities, and broadcasting inside the block is still quadratic; AOI does the second cropping inside the block.

## Algorithm

Four mainstream structures, distinguished by "how entering and leaving is decided":

| Structure | Enter/leave decision | Move-update cost | Memory | Fit |
|-----------|----------------------|------------------|--------|-----|
| Uniform grid (nine-cell) | Periodic comparison of the cell against the view radius | O(1) to change cell, boundary needs a hysteresis band | grid array | even entity distribution, need a fast implementation |
| Cross-linked list | one sorted list per axis, the view's upper and lower bounds are trigger nodes; moving slides and crossing triggers | O(1)~O(log n), no periodic recomputation | forward and backward pointers per axis per entity | the standard MMO answer, the same as BigWorld/KBEngine |
| Quadtree / BVH | view bounding-box query on the tree | moving needs reinsert/rebalance, O(log n) | tree nodes | scenes where entity distribution is extremely uneven |
| R-tree | bounding-box query | high-frequency movement is costly | nodes | static objects (map/colliders), not suited to moving entities |

Engineering parameters and their sources. BigWorld's default AOI radius is 500 meters, and the hysteresis zone extends another 5 meters beyond the radius; both can be overridden by the `cellApp/defaultAoIRadius` setting (`server/cellapp/witness.cpp:2489-2495`). Enter/leave does not rely on timed recomputation but on entities sliding along the sorted list and firing `crossedX/crossedZ` when they cross a boundary node (`server/cellapp/range_trigger.cpp:146-203`). KBEngine is isomorphic: a coordinate node carries forward and backward pointers on three axes (`kbe/src/server/cellapp/coordinate_node.h:94-99`), and a RangeTrigger carries positive and negative boundary nodes with `onEnter/onLeave` callbacks on crossing (`kbe/src/server/cellapp/range_trigger.h:16-56`).

Hysteresis is a mandatory option: enter and leave use different radii, so an entity walking back and forth along the boundary does not re-trigger enter/leave in a loop. BigWorld's 5-meter extension is exactly that buffer band; without it, a player standing at the shop door receives paired duplicate enter/leave messages.

## Used By

- **BigWorld** (commit `088d3b84`, paths relative to `programming/bigworld/`): every "real entity with a field of view" carries a Witness that tracks the visible set and a per-target update priority (`server/cellapp/witness.hpp:26-65`); a large entity may declare an AppealRadius, and an observer whose radius is smaller than it gets pulled toward it in reverse (`server/cellapp/range_list_appeal_trigger.hpp:10-24`).
- **KBEngine** (commit `0bc93d5`): the enter/leave callback chain `onEnterView -> addWitnessed` (`kbe/src/server/cellapp/witness.cpp:356`, `:414-415`) hands the visible-set change to the message layer for delivery.
- WoW / TrinityCore: grid chunking plus periodic Notifier notifications for visibility (per public materials; this site has not done a source-level verification).
- EVE: official public materials state that large-scale fleet battles use time dilation (slowing down of time) to relieve server pressure -- visibility management is not only the AOI road; when entities on one screen would crush the server, slowing the flow of time is a second move that composes with cropping.

Applicability judgment: an MMO with hundreds of entities on one screen, or a large-world survival game, must have AOI; a room-based match with 16 or fewer people (MOBA, card, small-room shooter) does not need it -- full broadcast is simpler, and AOI is pure overhead there.

## Related

Relation chain: MMORPG -> persistent world -> Zone Server -> AOI -> [state sync](/server/sync/02) -> database -> operation. Each link answers "why is the next one needed":

- After Zone Server comes AOI: the Zone solves "the world is too big for one process to carry," but broadcasting inside a block is still quadratic; AOI solves the cropping inside the block.
- After AOI comes state sync: the visible set only answers "who should receive it," while the change itself has to be delivered by incremental encoding over reliable/unreliable channels -- AOI's output is exactly the input to [state sync](/server/sync/02).
- A room-based single-session match ([room-based problem model](/industry/models/02)) has few people and full broadcast suffices, so this node is skipped directly in the chain.

Sister nodes: aggro and target acquisition (the inverse AOI on the AI side, whose acquisition radius is usually larger than the player's view radius); enter/leave events and entity add/remove messages (AOI's output drives the client's entity table). Implementation relation: this node's implemented-by = grid / cross-linked list / quadtree, chosen by entity density and movement frequency.

## Reference

- BigWorld 14.4.1 (this site's analysis is based on the cuihairu fork, commit `088d3b84`; the upstream is the 14.4.1 install package open-sourced on SourceForge): `programming/bigworld/server/cellapp/witness.cpp:2489-2495`, `range_list_node.hpp:25-37`, `range_trigger.cpp:146-203`, `range_list_appeal_trigger.hpp:10-24`
- KBEngine (this site's analysis is based on the cuihairu fork, commit `0bc93d5`; upstream `https://github.com/kbengine/kbengine`): `kbe/src/server/cellapp/coordinate_node.h:94-99`, `range_trigger.h:16-56`, `witness.cpp:356`
- Terminology cross-reference: Interest Management (interest management), Visibility (visibility), Witness (observer)
- This page is a synthesis of engineering experience; the practical case in the page is a demonstration example (numbers rounded and simplified)

### Practical case: triaging a "there are clearly people in the main city, but the screen is empty" visible-set under-update

> This case is a demonstration example (not drawn from a real project), with numbers rounded and simplified. It pushes this page's "Problem" quadratic ledger and the "Algorithm" mandatory hysteresis into deep water: once cropping fails, the quadratic ledger is back -- this is a triage of the visible set failing to keep up, and also a full unfolding of "how to keep the visible set steady even at peak."

**Background and symptoms**: in an MMO main city, players report "someone walking past takes several seconds to appear," noticeably worse at evening peak, with **40** customer-support tickets per day on average. With **200** entities on screen, the ledger with no cropping is **80,000** messages per second -- the visible set should compress that to a few thousand, but now it cannot hold it down.

### Step 1: symptoms and caliber -- first sort out whether the leak is people or messages

Leak caliber: visible-set update latency is **3-8** seconds, so a player must wait a few seconds after walking close before the other appears on screen; with **200** entities on screen, the visible set size exceeds expectation.

Hysteresis caliber: enter and leave use the same radius, so entities walking back and forth along the boundary re-trigger enter/leave in a loop, and the paired duplicate enter/leave messages eat up a chunk of bandwidth.

Peak-shape caliber: entity density doubles at evening peak, the visible-set cap is configured to the average, so peak cropping is insufficient.

### Step 2: layered attribution -- check against this page's mechanism list

```text
可见集失效归因  占比
  可见集按固定周期全量重算，密度上来处理不过来   55%
  进出场无迟滞，边界抖动产生成对重复消息         27%
  可见集上限按均值配，高峰裁剪不足               18%
```

Comparing item by item: update latency worsens with density -- hits "periodic full recomputation cannot keep up at higher density"; boundary jitter -- hits "without it, a player standing at the shop door receives paired duplicate enter/leave messages"; insufficient peak cropping -- hits "the visible set is configured to the average."

### Step 3: root cause -- visible-set maintenance does not adapt to density

Visible-set updates are fully recomputed at a fixed period, and after entity density doubles they cannot keep up; the hysteresis zone is not configured, so enter and leave use the same radius. The visible entities on one screen are usually just a few dozen, so message volume drops by one to two orders of magnitude -- that premise is broken at peak, and the quadratic ledger comes back.

### Step 4: remediation and backfill -- keep the visible set steady even at peak

1. Hysteresis is mandatory: enter and leave use different radii, with a **5**-meter buffer band added beyond the view radius, so walking back and forth along the boundary does not re-trigger.
2. Adaptive update: visible-set updates adjust dynamically with entity density, and enter/leave fire from list sliding rather than from timed full recomputation.
3. Peak pre-allocation: before evening peak, pre-allocate the visible-set cap at **2**x entity density.
4. Channel pairing: enter/leave and state changes go over the reliable channel, and the changes themselves are delivered by incremental encoding.

Verification ledger: "missing person" complaints **40** per day -> **2** per day; visible-set update latency **8** seconds -> **400** milliseconds; paired duplicate enter/leave messages **0**.

**Backfill checklist**:

| Backfill item | Action | Backfill location |
|---------------|--------|-------------------|
| Hysteresis band | enter and leave at different radii, a 5-meter buffer beyond the boundary | Algorithm |
| Adaptive update | adjust dynamically with density, list-sliding triggers instead of timed recomputation | Algorithm |
| Peak pre-allocation | pre-allocate the visible-set cap at 2x entity density | Problem |
| Channel pairing | enter/leave over the reliable channel, changes by incremental encoding | Reference |

### Three lessons from the case

1. **Once cropping fails, the quadratic ledger comes back**. With 200 entities on screen that is 80,000 messages per second, and if the visible set cannot hold it down both bandwidth and CPU blow out.
2. **Hysteresis is mandatory**. Same radius for enter and leave, and the paired duplicate messages born of boundary jitter eat a whole chunk of bandwidth.
3. **Configure the visible set for the peak**. A cap set to the average becomes, when density doubles, the direct source of missing people.

## References

- [Wikipedia · Spatial partitioning](https://en.wikipedia.org/wiki/Spatial_partitioning)
- [Wikipedia · Distributed Interactive Simulation](https://en.wikipedia.org/wiki/Distributed_Interactive_Simulation)

<!-- BACKLINKS-AUTO -->
## Related pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [index](index.md)
- [map](map.md)
- [skynet](skynet.md)
- [cosmetics](/system/cosmetics.md)
- [genre-coverage](/system/genre-coverage.md)
- [territory](/system/territory.md)
- [voice](/system/voice.md)
