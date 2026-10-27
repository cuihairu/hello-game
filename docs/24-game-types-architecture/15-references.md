# 15 References and Practice Distilled

The books and cases below are the ones I keep coming back to when I sort through architecture problems. For each I note what questions it is good at answering, the chapters I read first, and the parts that line up with real practice — different projects will of course vary.

The author of *Game Programming Patterns*, Robert Nystrom, put it this way: "Good architecture is not designed; it evolves." But evolution has a precondition — you know which direction to evolve toward. Reading these, what I care about most is which of their trade-offs can explain the actual problems in a project.

---

## 1. The Books I Keep Returning To, and How They Map to a Project

Here are the 7 books I consult most while doing this work, with my reading motivation, the key chapters, and how each relates to game backend work. They are laid out side by side by theme; in practice I pick whichever matches the question at hand.

### Design Patterns and Network Sync

#### (1) *Game Programming Patterns*

- **Author**: Robert Nystrom
- **What I mainly check it for**: understanding game code structure from the angle of design patterns — a common language for game development
- **Key chapters**: State, Command, Observer, Flyweight
- **Common use cases**: re-examining the applicable boundaries of a pattern inside game code
- **How I consult it**: usually straight to the pattern related to the current question

**Core value**: this book applies classic design patterns to concrete game development scenarios. Every pattern comes with real code and a game-side application, showing why the pattern fits that game situation.

**Key patterns and game applications**:

| Pattern | Game application | Problem it solves |
|------|---------|-----------|
| State | Player state management, NPC AI | Code chaos in complex state switching |
| Command | Input handling, replay recording | Undo/redo of actions, network sync |
| Observer | Event systems, UI updates | Loose coupling between systems |
| Flyweight | Large numbers of similar objects (bullets, particles) | Excessive memory use |
| Component | Entity-Component architecture | Over-coupled functionality |

**Practical cases**: *Hollow Knight* uses the State pattern to manage character states (jump, fall, attack, hurt); *Hades* uses the Command pattern for its ability system and replay feature; *Slay the Spire* uses the Flyweight pattern to manage large numbers of card objects.

---

#### (2) *Multiplayer Game Architecture and Programming*

- **Authors**: Joshua Glazer, Sanjay Madhav
- **What I mainly check it for**: the textbook-grade work on game network programming, covering frame sync and state sync
- **Key chapters**: network models, sync algorithms, latency compensation, anti-cheat
- **Common use cases**: cross-checking frame sync, state sync, and latency compensation
- **How I consult it**: read while building small demos, experimenting with UDP vs TCP behavior

**Core value**: this is the most authoritative work in game network programming. It digs into the essential difference between frame sync and state sync, along with key techniques such as latency compensation and anti-cheat.

**Frame sync vs state sync**:

| Dimension | Frame sync | State sync |
|------|--------|---------|
| Core idea | Client sends actions, server relays them, all clients execute the same action sequence | Server computes the logic, clients only do presentation |
| Fit games | RTS, fighting, card | MMO, shooting games |
| Network demands | Low bandwidth, high synchronization | High bandwidth, low latency |
| Anti-cheat | Deterministic computation | Server authority |
| Representative game | *StarCraft 2* | *Overwatch* |

**Practical cases**: *Overwatch* uses state sync plus latency compensation, server-authoritative; *StarCraft 2* uses frame sync so every player sees the same game state; *Fortnite* uses state sync plus client-side prediction to balance latency against experience.

---

### Distributed and Data Architecture

#### (3) *Distributed Systems: Concepts and Design*

- **Authors**: George Coulouris, Jean Dollimore, Tim Kindberg, Gordon Blair
- **What I mainly check it for**: theoretical foundations of distributed systems — consistency, consensus, fault tolerance
- **Key chapters**: consistency models, replication, fault tolerance, security
- **Common use cases**: cross-checking consistency, consensus, and fault-tolerance concepts
- **How I consult it**: usually start with the consistency-model and consensus-algorithm chapters

**Core value**: this book assembles the theoretical foundations of distributed systems. The CAP theorem, consistency models, consensus algorithms — these concepts are everywhere in a game backend.

**The CAP theorem applied to games**:

| Choice | Applicable scenario | Example |
|------|---------|------|
| CP (consistency + partition tolerance) | Transaction systems, leaderboards | Item trading must be guaranteed consistent |
| AP (availability + partition tolerance) | Chat systems, state sync | Must deliver even when some nodes are down |
| CA (consistency + availability) | Single-player games, local saves | A single-player environment needs no partition tolerance |

---

#### (4) *Phoenix Architecture*

- **Author**: Zhou Zhiming
- **What I mainly check it for**: a solid Chinese-language work on distributed architecture, tracing the full evolution from monolith to microservices
- **Key chapters**: service governance, event-driven, data consistency, service mesh
- **Common use cases**: sorting out service governance, event-driven, and data consistency
- **How I consult it**: read free online, suits fragment time

**Core value**: this book systematically explains distributed-system design thinking from the angle of architecture evolution. For a game backend, its discussion of architecture evolution lines up with the question "when do you split a monolith into microservices."

**Architecture evolution path**:

```text
单体架构 → 垂直拆分 → 微服务 → 服务网格 → 云原生
   ↓          ↓          ↓          ↓          ↓
 简单部署   模块化     独立部署   流量管理   容器编排
```

**Practical cases**: *Genshin Impact* evolved from a monolith into microservices to support global deployment; *Honor of Kings* uses a service mesh to manage massive numbers of microservices; *Peacekeeper Elite* runs a cloud-native architecture with elastic scaling.

---

#### (5) *Large-Scale Distributed Storage Systems*

- **Author**: Yang Chuanhui
- **What I mainly check it for**: understanding game backend data-layer design, especially sharding and consistency
- **Key chapters**: distributed transactions, sharding, replication, failure recovery
- **Common use cases**: intermediate level — solving data-layer architecture problems

**Core value**: this book discusses the core challenges of the data layer: how to guarantee consistency over huge amounts of data, how to design a highly available storage system, and how to handle the complexity of sharding.

**Practical cases**: *Fantasy Westward Journey* uses sharding to support tens of millions of players' data; *Honor of Kings* uses distributed transactions to guarantee transaction consistency.

---

### System Runtime and Engine Boundaries

#### (6) *Computer Systems: A Programmer's Perspective* (CSAPP)

- **Authors**: Randal Bryant, David O'Hallaron
- **What I mainly check it for**: understanding low-level system behavior — key to optimizing game backend performance
- **Key chapters**: memory hierarchy, concurrent programming, network programming, performance optimization
- **Common use cases**: pinpointing memory, concurrency, and performance problems

**Core value**: this book explains how a computer system works from a programmer's viewpoint. Only by understanding the low-level mechanics of cache, memory, and concurrency can you write genuinely high-performance code.

**Performance optimization applied to games**:

| Optimization technique | Game application | Performance gain |
|---------|---------|---------|
| Object pooling | Frequently created/destroyed objects like bullets and VFX | Less GC pressure |
| SoA data layout | Batch-updating player positions | 10x+ better cache hit rate |
| Lock-free data structures | Message passing, state sync | Less lock contention |
| Memory alignment | Network packet parsing | Fewer CPU cache misses |

**Practical cases**: the deep-water memory and cache optimization in *DOOM Eternal*; *Cyberpunk 2077* uses lock-free data structures to optimize concurrency.

---

#### (7) *Game Engine Architecture*

- **Author**: Jason Gregory (Naughty Dog)
- **What I mainly check it for**: server-side architecture from an engine perspective, understanding the boundary between game logic and the engine
- **Key chapters**: runtime architecture, resource management, network subsystem
- **Common use cases**: cross-checking runtime, resource management, and the network subsystem

**Core value**: this book comprehensively explains the core technologies of game development from a game-engine angle. It leans client-side, but is very helpful for understanding the "frontend/backend boundary."

**ECS architecture on the server side**: the Entity-Component-System (ECS) architecture applies not only to the client but also to the server. It splits game logic into independent components (position, combat, AI) and composes different gameplay through combination.

---

### Reading List by Theme

- **Patterns and code structure**: *Game Programming Patterns*
- **Multiplayer networking and sync**: *Multiplayer Game Architecture and Programming*
- **Distribution and consistency**: *Distributed Systems: Concepts and Design*, *Phoenix Architecture*
- **Storage and performance**: *Large-Scale Distributed Storage Systems*, *Computer Systems: A Programmer's Perspective*
- **Engine runtime and resources**: *Game Engine Architecture*

---

## 2. Case Reviews

Theory needs to meet practice. Here are architecture case reviews for five typical game types; each case covers **architecture decisions**, **pits we stepped in**, and **key takeaways**.

### Case 1: MMO — The Architecture Challenge of Ten Thousand Players on One Server

**Background**: a martial-arts MMO, targeting ten thousand concurrent players on one server, open world

**Architecture decisions**:
- Gateway cluster: tens of thousands of concurrent connections, long-lived TCP
- Zone-server sharding: partitioned by map region, each zone server owning one region
- AOI (interest management): nine-grid sync, pushing only what is inside a player's view
- Data tiering: Redis for hot data + MySQL for cold data + scheduled rollback to archive

**Pits we stepped in**:

1. **AOI boundary jitter**: a player moving back and forth across a region boundary keeps switching zone servers, and messages get lost
   - Fix: boundary buffer zones + message-queue staging
2. **Cross-server trade consistency**: player A is on zone server 1, player B on zone server 2 — how do you make the trade atomic?
   - Fix: introduce a trade service; all trades go through a global transaction
3. **Data inconsistency after a hot update**: after skill values are hot-updated mid-flight, players in combat hold inconsistent data
   - Fix: a version-number mechanism; combat snapshots lock the version

**Key takeaway**: the heart of an MMO is not "big" but "consistent" — ten thousand players on one server rests on everyone seeing the same world. AOI is the soul of an MMO; design it badly and the whole system comes down.

---

### Case 2: Card Games — Determinism and Fairness in Turn-Based Play

**Background**: a card battle game, similar to Hearthstone

**Architecture decisions**:
- HTTP API: turn-based play does not need long-lived connections
- Server authority: all battle logic executes on the server
- Random-seed service: an independent RNG, guaranteeing reproducibility
- Battle-report system: every battle produces a complete report for replay and audit

**Pits we stepped in**:

1. **Client speed-up cheats**: players modified the client to speed up turn resolution
   - Fix: server-side timing + operation time-window validation
2. **Predictable random numbers**: the client reverse-engineered the random seed across multiple battles
   - Fix: an independent seed each turn + server-side randomness
3. **Inconsistent battle replays**: the same operations produced different outcomes
   - Fix: a fixed random-seed sequence; battle reports carry the complete state

**Key takeaway**: the heart of a card game is **determinism** — the same operations must produce the same outcome. Server authority is the core anti-cheat answer; there is no second one.

---

### Case 3: SLG — Time Management for Asynchronous Interaction

**Background**: a Three-Kingdoms strategy game, one global server

**Architecture decisions**:
- HTTP API + scheduled tasks: interaction is mostly asynchronous
- Timeline system: every operation enters a timeline queue and executes in time order
- Battle simulator: a standalone service, supporting parallel computation
- Battle-report generation: produced asynchronously, with push notifications

**Pits we stepped in**:

1. **Timeline drift**: server time and the player's device time disagree, causing "arrived early"
   - Fix: server time is authoritative for everything; the client only presents
2. **Scheduled-task pile-up**: at server launch, huge numbers of players build at once and scheduled tasks explode
   - Fix: scattering into time slices + a priority queue
3. **Cross-timezone event sync**: how do you unify event times on one global server?
   - Fix: UTC time + server-side computation of local time

**Key takeaway**: the heart of an SLG is **time management** — every interaction is asynchronous, and the timeline is the single source of truth.

---

### Case 4: Idle Games — The Art of Computing Offline Earnings

**Background**: an idle RPG where players still earn while offline

**Architecture decisions**:
- Request-response pattern: no long-lived connection needed
- Offline-earnings computation: the server computes earnings from the elapsed time difference
- Scheduled tasks: daily resets, event settlement
- Push notifications: important events pushed (e.g. equipment drops)

**Pits we stepped in**:

1. **Offline-earnings overflow**: a player offline 7 days; the computation blows up the numbers
   - Fix: cap offline earnings (e.g. at most 24 hours)
2. **Timezone trouble**: the daily reset time differs across time zones
   - Fix: use UTC time; the server computes local time
3. **Batch settlement performance**: 1 million players settling at once crushes the database
   - Fix: settle in batches + an async queue

**Key takeaway**: the technical heart of an idle game is **offline computation** — how to accurately compute a player's offline earnings without burning server resources.

---

### Case 5: Blockchain Games — Balancing On-Chain Ownership and Off-Chain Experience

**Background**: a blockchain game with NFT items on chain

**Architecture decisions**:
- Hybrid architecture: high-frequency operations off chain, critical operations on chain
- Wallet integration: multiple wallet connections supported
- Gas-fee optimization: batch on-chain submissions to cut Gas fees
- Battle reports on chain: critical battle results anchored on chain for ownership

**Pits we stepped in**:

1. **On-chain confirmation delay**: an Ethereum transaction takes 12+ seconds to confirm
   - Fix: optimistic confirmation + async on-chain submission
2. **Gas-fee volatility**: Gas fees spike when the network congests
   - Fix: a dynamic Gas strategy + an L2 solution
3. **Private-key management**: players lose their private keys and lose their assets
   - Fix: social recovery + a multisig mechanism

**Key takeaway**: the core challenge of a blockchain game is **the balance between user experience and decentralization** — too many on-chain operations slows the experience; too many off-chain operations loses the point of decentralization.

---

## 3. Additional Reading Recommendations

Beyond the 7 core books above, the following are also worth consulting:

**Advanced network programming**:
- *TCP/IP Illustrated*, Volume 1: a deep understanding of network protocols
- *UNIX Network Programming*: the scripture of network programming
- Tao Hui's *High-Performance Network Programming* article series: network performance optimization in practice

**Advanced system design**:
- *Designing Data-Intensive Applications* (DDIA): the guide to distributed-system design
- *System Design Interview*: system design methodology

**Advanced game development**:
- *3D Math Primer*: the mathematical foundations of games
- *Real-Time Collision Detection*: the core algorithms of a physics engine

---

## 4. Knowledge Distillation Methods

Learning is not the goal; distilling it into lasting knowledge is. These methods help you turn what you learn into team capability:

### 4.1 Technical Blog

Write a technical blog regularly, recording study notes and practical experience. Writing is a fine way to learn — it forces you to turn a fuzzy understanding into clear words.

### 4.2 Internal Sharing

One technical sharing session per week, with team members taking turns presenting. Sharing is not "reading slides aloud" but "making one problem clearly understood."

### 4.3 Code Review

Code Review is the most effective way to transfer knowledge. Senior staff reviewing juniors' code not only safeguards code quality but also transmits design thinking and common practice.

### 4.4 Failure Postmortems

Every failure is a learning opportunity. A postmortem is not about "assigning blame" but about "understanding why the system was designed this way."

---

## 5. Summary

Improving architecture ability is a long process. Core advice:

1. **Breadth first, then depth**: build a global understanding first, then go deep in one direction
2. **Theory plus practice**: for every concept learned, find a project to practice it in
3. **Output drives input**: consolidate learning by writing blog posts and giving talks
4. **Learn from failure**: every incident and every bug is a learning opportunity
5. **Build a knowledge system**: do not learn scattered bits; build a systematic knowledge framework

> The author of *Game Programming Patterns*, Robert Nystrom, put it this way: "Good architecture is not designed; it evolves." But evolution has a precondition — you know which direction to evolve toward. These reading threads are the reference points I have assembled so far; the exact order still depends on the question at hand.

---

## 6. Practical Case: Investigating a "Same Pit Stepped In Twice" Knowledge-Distillation Failure

> This case is a demonstration example (not taken from a real project), with numbers rounded and simplified. It pushes the four distillation methods of Section 4 together with Section 5's "output drives input / learn from failure / build a knowledge system" into deep water: stepping in the same pit twice is not a memory problem, it is a distillation-mechanism problem — an organization-level investigation of knowledge management, and a full expansion of "every incident and every bug is a learning opportunity."

**Background and symptoms**: **8** months ago, the price field of the shop's "direct-purchase bundle" was filled with the wrong unit (yuan entered as fen), making the bundle's listed price **100**x too high; the wrong price persisted **47** minutes with **830** anomalous orders. The postmortem left three lines of conclusions in a group chat, and the fix changed only that one config entry. **8** months later, the new event "limited-time exchange" went live, and a newcomer **2** months into the job filled the same field with the wrong unit again — wrong price for **95** minutes, **1200** anomalous orders. The two incidents' root causes were verbatim identical, separated by two release versions and one round of team expansion.

### Step 1: Symptoms and Criteria — Turn "Stepped In Twice" Into Searchable Evidence

Aligned criteria: same config field, same-direction unit mismatch (yuan entered as fen) counts as "the same pit." Three ledgers:

- **Incident ledger**: **2030** anomalous orders = first incident **830** + second incident **1200**, **8** months apart
- **Archaeology ledger**: both mismatches hit the same field in the same direction — after the first fix, the field still had no unit validation
- **Searchability ledger**: searching the document library for "price unit" returns **0** hits; searching "830" returns no archived postmortem; group chat logs are unsearchable

The three ledgers together: **every lesson from the first incident no longer existed by the time the second incident happened**.

### Step 2: Layered Root Cause — A Pit-Signature Ledger From Config to the Distillation Chain

```text
配置层   两次错配同一字段 price_unit、同方向（元按分填）——字段无单位校验
修复层   第一次的修复是「点修复」：改了那一个配置项；单位校验没有进 CI，
         下一次照错——类修复（字段必须有单位校验）从未发生
沉淀层   第一次复盘只有群聊三行结论：无归档、无坑签名、新人 onboarding 未提
         ——「字段+错误模式」没有进任何检查点，检索命中 0 篇
```

### Step 3: Root Cause — A Group Chat Is Not an Archive, and a Human Brain Is Not a Checklist

The distillation chain broke in three places: **the postmortem had no archival carrier** (the group chat served as the archive, violating "build a knowledge system: do not store things in scattered bits"); **the lesson never became a checkpoint** (Section 4.3 says Code Review is the most effective way to transfer knowledge, but the transfer relied on "happening to review it" — the first line of defense for a newcomer should be an admission checklist, not luck); **the newcomer path did not know about old pits** (onboarding had no list of historical pitfalls). This matches the postmortem discipline of Chapter 14: "when the same class of failure recurs, first check why the improvement item never landed" — this team's finding was that the improvement item simply did not exist, living only in a group chat. Output driving input presupposes there is an output artifact, and three lines of group chat messages are not an output artifact.

### Step 4: Remediation and Backfill — Beyond Stopping the Bleeding, Turn Pits Into Signatures and Signatures Into Checkpoints

Stopping the bleeding: the second incident's **1200** anomalous orders were each closed out with recovery and compensation. The distillation four-piece set: postmortem reports filed into `docs/postmortems/`, each tagged with a "pit signature" (field + error mode); the config admission checklist gained "amount fields must carry unit validation," wired into CI (intercepting **4** mismatches in the first month, none reaching production); newcomer onboarding now includes a viewable "Top **10** historical pitfalls"; postmortem archival rate is spot-checked quarterly. Result: searching the document library for "price unit" now returns **2** hits (the archived postmortem + the checklist design note) — the distilled knowledge became searchable for the first time.

**Backfill checklist**:

| Item | Action | Backfilled into |
|-----|------|--------|
| Postmortem archive | Postmortem reports go into the repo at `docs/postmortems/`, tagged with "pit signature" (field + error mode) | Failure postmortems (4.4) |
| Admission checkpoint | An incident fix must answer "point fix or class fix"; class fixes go into the checklist and CI | Code review (4.3) |
| Newcomer path | Onboarding includes the Top 10 historical pitfalls: the checklist blocks old pits, review transmits thinking | Internal sharing (4.2) |
| Searchability check | The acceptance bar for distilled knowledge is "findable before the next stumble"; unsearchable means not distilled | Knowledge distillation methods (4) |

### Three Lessons from the Case

1. **Stepping in the same pit twice is not a memory problem, it is a mechanism problem** — a group chat is not an archive, and a human brain is not a checklist.
2. **Fixes come in two kinds: point fixes save this time, class fixes save next time** — a postmortem that only makes point fixes is no postmortem at all.
3. **The acceptance bar for distilled knowledge is searchability** — "it was written down" does not count; "findable before the next stumble" does.

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [08](/numerical/08.md)
