# Open-Source Server Map

## Category

server / horizontal node / language and selection. In one sentence: open-source server ends are not one kind of thing -- split into four forms by "what it gives you, what you build yourself," and the first question of selection is the match model, not the language or the star count.

## Definition

[engines/03](/client/engines/03) set the "self-developed, framework, off-the-shelf" judgment on the client side; the same question on the server side has a clearer lineage: a **library/framework** gives the network and room skeleton, an **Actor runtime** gives the concurrency and message semantics, a **complete platform** gives the base components such as accounts, social, and matchmaking, and an **MMO engine server end** gives the full set of AOI, server splitting, and entity sync. Choosing the wrong form is not a performance problem but an engineering-volume problem of "cannot find the customization point" or "build every base component yourself" -- the ledger is settled at the moment of project initiation.

## Problem

- **Selecting by language or star count instead of match model**: a frame sync project picks a state sync framework, and a room-based project drags in an MMO engine -- a form mismatch is written into the architecture on day one, and every step after is paying it back.
- **Using a platform as a framework**: what is wanted is freedom over match logic, yet a complete platform is chosen; finding the customization points are not open, the team misreads it as "we need to fork" -- it is actually a form misselection.
- **Using a framework as a platform**: a thin framework is chosen for convenience, and accounts, payments, and risk control are all written into the room class -- every base component in the [system/services](/system/services/) checklist is self-built, yet not one is chartered as a formal project.
- **Underestimating the length of the self-build list**: a thin framework's self-build list = sync semantics + persistence + settlement + risk control + accounts ... The "off-the-shelf" judgment of engines/03 has to be priced against this list on the server side, not by "is the framework easy to use."

## Algorithm

### The four-form map

| Form | What it gives | What you build | Suited to |
|------|---------------|----------------|-----------|
| Library/framework (leaf, nano, Colyseus) | network access, room/session skeleton, heartbeat and broadcast | sync semantics, persistence, settlement, accounts, risk control | small teams on room-based play, wanting full control |
| Actor runtime (skynet, Orleans) | message routing, scheduling, single-Actor serial semantics | all game semantics (AOI, sync, gameplay) self-built | large teams organized around services |
| Complete platform (Nakama) | accounts, social, matchmaking, storage, purchase validation | the gameplay and the match body itself | casual/mid-light play focused on gameplay |
| MMO engine server end (BigWorld, KBEngine) | AOI, entity sync, server splitting, persistence framework | gameplay scripts and numerics | large-world MMO class |

- The forms cannot be ranked against each other, only compared by fit: "is framework A stronger than platform B" is meaningless, while "does the form match the match model" has an answer.
- Each form has a differently long self-build list: the longer the list, the more control and the slower the launch -- the two sides of the same coin, not a trade-off where you can have both.

### The selection chain

Match model ([industry/models](/industry/models/)) -> authority and sync form ([sync model](/server/sync/02)) -> form characterization -> narrowed by language and hot-update constraints ([Server language and runtime](./language.md)) -> price the engineering ledger against the self-build list, then start work.

## Used By

- **Colyseus** (commit `e620123`): the representative of the framework form -- the room is the service unit (simulation 60fps / patch 20fps, `packages/core/src/Room.ts:57-58`), but the engine provides no gameplay facilities at all: no skills, no settlement hooks (`database.boot` only pulls the account SQL layer, `packages/core/src/Server.ts:462`) -- the longest self-build list, the most control.
- **Nakama** (commit `e920249`): the platform form -- purchase validation, notifications, matchmaker, and dashboard out of the box (`README.md:25-28`), with gameplay via a three-way runtime extension choice (`README.md:27`) -- base components underwritten by the platform, gameplay self-built.
- **skynet** (commit `64391f7`): the Actor runtime -- 22 built-in services draw the "the framework gives concurrency, all semantics self-built" boundary (the `service/` directory), and business services are launched via `skynet.launch` (`service/launcher.lua:95`).
- **BigWorld** (commit `088d3b84`, paths relative to `programming/bigworld/`) and **KBEngine** (commit `0bc93d5`): the MMO engine server end -- the former makes persistence an explicit service (`writeEntity` at `server/dbapp/dbapp.cpp:2288-2294`), and the latter's `README.md:66` self-describes as "An MMOG server engine"; AOI and server splitting are carried by the engine (see [AOI](/server/aoi)).
- **leaf** (commit `af71eb0`) and **nano** (commit `dbf22c7`): the two ends of the library form -- the positioning sentences are "A pragmatic game server framework in Go" (leaf `README.md:3`) and "lightweight game server networking library for Go" (nano `README.md:12`).

Applicability judgment: room-based with 16 or fewer people, a thin framework is enough; mid-light with accounts and social, the platform saves the base-component ledger; a large world means either an engine server end or an Actor runtime plus self-building -- there is no fourth cheap road.

## Related

Relation chain: match model -> form characterization -> self-build list -> language constraints -> engineering ledger. Each link answers "why is the next one needed":

- The match model decides the form: room-based, large world, and mid-light each map to a different form, so characterize first before talking selection ([industry/models](/industry/models/)).
- Only once the form is set do you know what to self-build: a thin framework's self-build list is exactly the base-component directory of [system/services](/system/services/), each chartered item by item rather than written into the room class on the fly.
- Only once the self-build list is set do you compute the language ledger: under the same form, different runtimes carry different operating-period costs ([Server language and runtime](./language.md)).
- Only once the ledger is priced do you start work: for source-level examples see [Skynet source analysis](/server/skynet) (a complete dissection of an Actor runtime).

Sister nodes: [engines/03 project and team integrated decision](/client/engines/03) (the same judgment on the client half). Upstream: [sync model](/server/sync/02) (authority and sync form), [industry/models](/industry/models/) (match model); downstream: [system/services](/system/services/) (the self-built base-component list), [service splitting methodology](/server/services/01) (how to split after self-building).

## Reference

- This page is a synthesis of engineering experience; per-engine facts follow the source citations anchored to commits inside the text
- Terminology cross-reference: Server Framework (server framework), Full-stack Platform (complete platform), Actor Runtime (Actor runtime), Build vs Buy (self-built versus off-the-shelf)
- This page is a synthesis of engineering experience; per-engine facts follow the source citations anchored to commits inside the text; the practical case in the page is a demonstration example (numbers rounded and simplified)

### Practical case: triaging a "frame sync project picks a state sync framework, six months of rework" form mismatch

> This case is a demonstration example (not drawn from a real project), with numbers rounded and simplified. It pushes this page's "Problem" of selecting by language and star count and the "Algorithm" self-build list into deep water: once the form is decided wrong, every step after is paying it back -- this is a triage of the match model not being fixed first, and also a full unfolding of "how to price the self-build list against the engineering ledger."

**Background and symptoms**: a competitive project picked a state sync framework by star count, and **4** months into development all the match logic was reworked, pushing the version back half a year. Retrospection found: all **12** base components -- sync semantics, persistence, settlement, risk control, accounts -- had been written into the room class, and not one had been chartered as a formal project.

### Step 1: symptoms and caliber -- first sort out which link went wrong

Model caliber: frame sync wants input sync and determinism, while a state sync framework gives state broadcast and interpolation -- the match model and the form are mismatched.

List caliber: a thin framework's self-build list = sync semantics + persistence + settlement + risk control + accounts, all **12** items self-built, with engineering volume priced by "is the framework easy to use" and never by the list.

Customization-point caliber: the framework's customization points are not open, and the team misreads it as "we need to fork" -- it is actually a form misselection.

### Step 2: layered attribution -- check against this page's mismatch list

```text
形态错配归因  占比
  按语言星数选，不按对局模型选     52%
  自建清单没立项，工程量算错        30%
  定制点不开放，误判为要 fork       18%
```

Comparing item by item: frame sync paired with a state sync framework -- hits "a form mismatch is written into the architecture on day one, and every step after is paying it back"; all **12** base components written into the room class on the fly -- hits "every base component self-built, yet not one chartered as a formal project"; misreading a fork -- hits "finding the customization points are not open, the team misreads it as 'we need to fork' -- it is actually a form misselection."

### Step 3: root cause -- the form was chosen wrong, and the ledger was settled at project initiation

A form misselection is not a performance problem but an engineering-volume problem of "cannot find the customization point" or "build every base component yourself." The forms cannot be ranked against each other, only compared by fit -- "is framework A stronger than platform B" is meaningless, while "does the form match the match model" has an answer.

### Step 4: remediation and backfill -- run the selection chain once, and price the list

1. The selection chain: match model -> authority and sync form -> form characterization -> narrowed by language and hot-update constraints -> price the engineering ledger against the self-build list, then start work.
2. Charter the self-build list item by item: all **12** base components chartered as formal projects, not written into the room class.
3. Compare fit only: the forms cannot be ranked against each other, and mismatches such as frame sync paired with a state sync framework should be stopped at selection review.
4. Price the list: under the same form, different runtimes carry different operating-period costs, so price the engineering ledger against the list rather than by whether the framework is easy to use.

Verification ledger: match-logic rework **4** months -> **0** months; all **12** base components chartered; selection reviews pass through the chain, form mismatches **0**.

**Backfill checklist**:

| Backfill item | Action | Backfill location |
|---------------|--------|-------------------|
| Match model first | fix the match model before discussing the form; frame sync never pairs with a state sync framework | Problem |
| Charter the self-build list | all 12 base components chartered as formal projects | Problem |
| Compare fit only | forms cannot be ranked against each other, only by fit | Algorithm |
| Engineering ledger | price the engineering ledger against the self-build list, not by whether the framework is easy to use | Reference |

### Three lessons from the case

1. **A form mismatch is written in on day one**. A frame sync project picking a state sync framework means every step after is paying it back.
2. **The self-build list has to be priced**. All 12 base components of a thin framework self-built, with engineering volume priced against the list, not by whether the framework is easy to use.
3. **Closed customization points are usually a form misselection**. Misread as needing a fork, but it is the form not matching the match model.

## References

- [GitHub · trinitycore/trinitycore](https://github.com/trinitycore/trinitycore)
- [GitHub · heroiclabs/nakama](https://github.com/heroiclabs/nakama)
- [GitHub · dotnet/orleans](https://github.com/dotnet/orleans)

<!-- BACKLINKS-AUTO -->
## Related pages

- [03](/client/engines/03.md)
- [index](/client/engines/index.md)
- [10](/glossary/10.md)
- [index](index.md)
- [language](language.md)
- [genre-coverage](/system/genre-coverage.md)
- [territory](/system/territory.md)
