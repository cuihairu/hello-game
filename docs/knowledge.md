# Research Knowledge Digest

## Category

Cross-tree entry. Node positioning: the three research pieces — [authoritative books research](/research/01-authoritative-books), [engine and middleware official documentation research](/research/02-engine-middleware-docs), and [application scenario comparison](/research/03-application-scenarios) — are gathered here into look-up-able knowledge points: core concepts, book takeaways, documentation takeaways, application scenarios, and common pitfalls and misconceptions. Division of labour with the [expansion ledger](/24-game-types-architecture/expansion): that side records "what changed and how it was accounted for" — a progress ledger; this page records "what the research says, what is usable, and what is a pitfall" — a knowledge ledger.

## 1. Core Concepts

The twelve statements the research reaches for repeatedly and verifies repeatedly. Each gets a one-liner, a source, and a landing point on the site.

| Concept | One-line statement | Source | Landing point |
| --- | --- | --- | --- |
| Coverage determination standard | Only standalone pieces and dedicated sections count; a term appearing once in body text is not coverage | Shared by the [coverage comparison page](/system/genre-coverage) and the two research pieces | [Coverage comparison page](/system/genre-coverage) |
| Genre demand density | Gaps are ordered by "which game types need them first", not by implementation difficulty | [Application scenario comparison](/research/03-application-scenarios) | [Application scenario comparison](/research/03-application-scenarios) |
| Separate the mechanic statement from the interface signature | The mechanic statement does not change for ten years, the interface signature changes with each version — body text records only the former | [Official documentation research](/research/02-engine-middleware-docs) | [Official documentation research](/research/02-engine-middleware-docs) |
| Client split by engine, server split by mechanic | The two kinds of official documentation each follow their own path; engine-specific APIs are not collected | [Official documentation research](/research/02-engine-middleware-docs) | Lecture note [03 Front-end engines and clients](/24-game-types-architecture/03-frontend-engines) |
| Table-driven data | Separating definitions from runtime state, so adding content does not require changing code | Game Programming Patterns (Nystrom) and TrinityCore engineering convention | [Quest system](/system/quest) |
| Split of server authority and client prediction | Key state is recognized only by the server; the client acts first and corrects after | Multiplayer Game Programming (Glazer, Shankar), Photon and UE official documentation | [Prediction, compensation and correction](/server/sync/05) |
| Frame budget attribution | Attribute frame time to draw calls first, then talk about optimization | Real-Time Rendering (Akenine-Möller et al.) | Lecture note [19 Client architecture and performance fundamentals](/24-game-types-architecture/19-client-architecture) |
| Production and consumption before pricing | An economy system computes production and consumption first, then pricing | Game Mechanics: Advanced Game Design (Adams, Dormann) | [Economy loop and production-consumption](/numerical/04) |
| Timeouts before circuit breakers | The fault-tolerance order is timeouts first, then circuit breakers and backoff | Release It! (Nygard) | [Debug, fault localization and post-mortems](/operation/observability/04) |
| Client integrity is not server authority | Anti-cheat middleware blocks injection and memory tampering, but adjudication still lands on the server | Easy Anti-Cheat and BattlEye official documentation | [Security and anti-cheat](/server/security/01) |
| Determinism is the lifeline of frame sync | The same input sequence yields the same state on any machine | Game Programming Gems series | [Determinism and numerical consistency](/server/sync/06) |
| Lazy settlement and the server day | Recovery and resets are computed on read, with boundaries following the server timezone | Industry practice, no single source (source not verified) | [Stamina and attempt gating](/system/stamina) |

## 2. Authoritative Book Takeaways

The extraction results from 15 books and 23 topics: judged 20 covered, 3 partial. Partial items are honestly marked in the takeaway column.

| Book (author, publication) | Takeaways | Landing point in this repo |
| --- | --- | --- |
| Game Programming Patterns (Robert Nystrom, self-published 2014) | The game main loop and time advancement; double buffering, object pools, flyweight, prototype, component, event queues; bytecode and script VMs; data-oriented design and ECS | Lecture note [09 Game programming patterns](/24-game-types-architecture/09-programming-patterns), [Tick and time advancement](/server/sync/01), [Host runtime and script VM integration](/system/scripting/02), [Scripting languages and ECS](/client/04) |
| Game Programming Gems 1–8 (Charles River Media, 2000–2007) | Sync, prediction and network jitter; determinism, replay and adjudication; mathematics, physics and collision (partial, no dedicated section) | [Prediction, compensation and correction](/server/sync/05), [Determinism and numerical consistency](/server/sync/06), [Replay, spectator and adjudication](/server/sync/07) |
| Game Engine Architecture (Jason Gregory, CRC Press, 3rd edition 2018) | Engine layering and module boundaries; asset system and toolchain; animation, audio and presentation subsystems | [Client tech stack and engines](/client/01), [Asset system and toolchain](/client/03), lecture note [21 Art and audio pipeline collaboration](/24-game-types-architecture/21-art-audio-pipeline) |
| Multiplayer Game Programming (Glazer, Shankar, Pearson 2016) | Latency, prediction, compensation and authority | [Prediction, compensation and correction](/server/sync/05), [Security and anti-cheat](/server/security/01) |
| AI for Games (Ian Millington, CRC Press, 3rd edition 2019) | Pathfinding, behavior trees and NPC decision-making (partial — covers scenarios, not mechanics) | [Application scenarios of AI on clients and in game systems](/client/05) |
| Game Mechanics: Advanced Game Design (Adams, Dormann, New Riders 2014) | Economy loops, resource production and consumption; progression, unlocks and pacing | [Economy loop and production-consumption](/numerical/04), [Growth curve models](/numerical/03), [Level difficulty and new-player pacing](/numerical/07) |
| The Art of Game Design (Jesse Schell, CRC Press, 2nd edition 2014) | Mechanic decomposition and experience design methods | [The analytical method from gameplay to architecture](/industry/methodology/03), lecture note [10 Gameplay system design](/24-game-types-architecture/10-gameplay-systems) |
| Real-Time Rendering (Akenine-Möller et al., CRC Press, 4th edition 2018) | The rendering pipeline and the frame budget | Lecture note [19 Client architecture and performance fundamentals](/24-game-types-architecture/19-client-architecture), [WebGL rendering pipeline and performance attribution](/client/web/02) |
| Game Engine Black Book (Fabian Sanglard, independently published — DOOM volume 2017, Quake volume 2019) | Full teardowns of classic engines (partial, filed under the history thread) | [Game development history thread](/history/), lecture note [01 The full landscape of game backend technology](/24-game-types-architecture/01-entry) |
| Designing Games (Tynan Sylvester, O'Reilly 2013) | Interaction between systems and iteration | [How the models combine](/industry/models/08), lecture note [10 Gameplay system design](/24-game-types-architecture/10-gameplay-systems) |
| Free-to-Play (Will Luton, New Riders 2013) | Monetization structure and business models | [Monetization numerical example models](/numerical/06), [Release, versions and business models](/industry/platforms/04) |
| The "Tencent Game Development Essentials" series (Tencent Game Academy, published in volumes) | Networking, performance and data practice from mainland China projects | Lecture note [07 Architecture overview](/24-game-types-architecture/07-core-arch), [13 Operations and infrastructure practice](/24-game-types-architecture/13-tech-ops) |
| Designing Data-Intensive Applications (Martin Kleppmann, O'Reilly 2017) | Transactions, replication, sharding and consistency | [Transactions, consistency and database/table sharding](/database/03), [Data sync, hot-cold tiering and archiving](/database/04) |
| Site Reliability Engineering (Beyer et al., O'Reilly 2016) | Capacity, SLOs and incident response | [Load testing, capacity planning and scaling](/operation/observability/05), [The real goal of stability governance](/operation/observability/06) |
| Release It! (Michael T. Nygard, Pragmatic Bookshelf, 2nd edition 2018) | Timeouts, circuit breakers, backoff and failure modes | [Debug, fault localization and post-mortems](/operation/observability/04), [Consistency, recovery and reconnection](/server/services/05) |

Book information follows the publisher's and author's official sites; the full bibliography and per-topic judgments are in the [authoritative books research](/research/01-authoritative-books).

## 3. Official Documentation Takeaways

23 official documents across 23 topics: judged 21 covered, 2 partial. Documentation entry points follow each project's official site; the full list is in the [official documentation research](/research/02-engine-middleware-docs).

| Document | Owner | Takeaway | Landing point in this repo |
| --- | --- | --- | --- |
| Unity Manual | Engine | Client network layer structure and sessions | Lecture note [03 Front-end engines and clients](/24-game-types-architecture/03-frontend-engines) |
| Netcode for GameObjects | Engine multiplayer | Network object replication and the client-authority boundary | Lecture note [03](/24-game-types-architecture/03-frontend-engines), [Sync models](/server/sync/02) |
| Unity Addressables | Engine assets | Asset grouping, dependencies and hot updates | [Asset system and toolchain](/client/03) |
| Unreal Engine Documentation (Replication, GAS, dedicated servers) | Engine | Authoritative server model, prediction correction, abilities and effects | Lecture note [03](/24-game-types-architecture/03-frontend-engines), [Skill system](/system/skill) |
| Godot Documentation (High-level multiplayer, RPC) | Engine | Scene sync and the RPC boundary | Lecture note [03](/24-game-types-architecture/03-frontend-engines), [Data frames and the protocol contract](/networking/04) |
| Cocos Creator Manual | Engine | Mini-game platform constraints and the login chain | Lecture note [03](/24-game-types-architecture/03-frontend-engines), [Mini-game platforms and the browser environment](/client/web/05) |
| Mirror Documentation | Engine networking | Interest management and transport layer abstraction | [AOI: area of interest](/server/aoi), [Transport layer and access protocol selection](/networking/03) |
| Photon Fusion Documentation | Engine networking | Prediction, rollback and state replication | [Prediction, compensation and correction](/server/sync/05) |
| skynet Wiki | Server framework | Service model, timers and built-in libraries | [Skynet: C kernel + Lua actors](/server/skynet) |
| Colyseus Documentation | Room framework | Room lifecycle, broadcast and state sync | [Room broadcast, weak networks and the mainland network environment](/networking/07), [Problem model of single-session room-based games](/industry/models/02) |
| Nakama Documentation | Backend framework | Accounts, matchmaking, leaderboards, storage and notifications | [Accounts, characters and base systems](/system/services/01), [Leaderboard](/system/leaderboard) |
| Agones Documentation | Hosting orchestration | Game server scaling and readiness probes | [Scaling up, scaling down and dynamic server addition](/server/capacity/02), [Coordination layer, cross-server and the control plane](/server/services/03) |
| Redis Documentation | Middleware | Sorted sets, hashes and script atomicity | [Redis, leaderboards and locks](/database/cache/01), [Leaderboard](/system/leaderboard) |
| PostgreSQL Documentation | Database | Transactions, indexes and partitioning | [Transactions, consistency and database/table sharding](/database/03) |
| MySQL Reference Manual | Database | Master-slave replication, rollback segments and online DDDL | [Relational and non-relational databases](/database/02), [Config tables and the data-driven pipeline](/production/05) |
| Protocol Buffers Documentation | Contract | Field evolution and backward compatibility | [Data frames and the protocol contract](/networking/04) |
| gRPC Documentation | Contract | Service-to-service calls and streaming interfaces | [Service discovery, routing and collaboration](/server/services/04) |
| Kubernetes Documentation | Hosting orchestration | Replicas, probes and scaling semantics | [Scaling up, scaling down and dynamic server addition](/server/capacity/02) |
| Steamworks Documentation | Platform | Lobby, achievements, in-app purchases and cloud saves | [Platforms and the channel ecosystem](/industry/platforms/01), [Login, payment, social and ad SDKs](/industry/platforms/03) |
| OpenTelemetry Documentation | Observability | The Trace, Metric and log triad | [Logs, metrics, tracing and OTel](/operation/observability/01) |
| Easy Anti-Cheat / BattlEye official documentation | Security | Client integrity and injection detection | [Security and anti-cheat](/server/security/01) |
| FMOD Studio Documentation | Audio middleware | Audio assets, events and mixing buses (partial — only a pipeline section) | Lecture note [21 Art and audio pipeline collaboration](/24-game-types-architecture/21-art-audio-pipeline) |
| Wwise Documentation | Audio middleware | Event-driven audio triggering and project structure (partial, same as above) | Lecture note [21](/24-game-types-architecture/21-art-audio-pipeline) |

## 4. Application Scenarios

The 21 genres go through a pass by demand density: 14 need pieces filled in, 7 do not. The full genre table and component list are in the [application scenario comparison](/research/03-application-scenarios).

| Genre | Gap judged by the research | Gap-fill landing point |
| --- | --- | --- |
| Board and card / rhythm / fighting / racing and sports / RTS / auto chess / UGC | None | Existing pieces |
| Party and room-based light competitive | Voice | [In-game voice](/system/voice) |
| Match-3 and puzzle casual | Stamina and attempt gating | [Stamina and attempt gating](/system/stamina) |
| MOBA | Cosmetics and skins | [Cosmetics, skins and dress-up](/system/cosmetics) |
| FPS / TPS and tactical shooters | Voice | [In-game voice](/system/voice) |
| Tower defense | Gear enhancement and star-up, stamina gating | [Gear enhancement and star-up](/system/enhance), [Stamina and attempt gating](/system/stamina) |
| Card and CCG | Quests, achievements, codex | [Quest system](/system/quest), [Achievements and codex](/system/achievement) |
| Turn-based RPG and tactics | Quests, achievements | [Quest system](/system/quest), [Achievements and codex](/system/achievement) |
| ARPG and loot dungeons | Stamina and attempt gating | [Stamina and attempt gating](/system/stamina) |
| MMORPG and open world | Quests, achievements, in-game announcements | [Quest system](/system/quest), [Achievements and codex](/system/achievement), [Marquee and announcements](/system/marquee) |
| SLG and 4X seasonal sandboxes | Home and territory permissions, season pass | [Home, territory and building permissions](/system/territory), [Battle pass and season track](/system/battle-pass) |
| Idle and offline progression | Check-in and redemption codes, season pass | [Check-in, benefits and redemption codes](/system/checkin), [Battle pass and season track](/system/battle-pass) |
| Simulation management and life / survival crafting and sandbox | Home and territory permissions | [Home, territory and building permissions](/system/territory) |
| Roguelike and Roguelite | Codex and collection | [Achievements and codex](/system/achievement) |

The three groups demanded simultaneously by the most genres:

- **Quests and achievements**: card games, turn-based RPGs and MMORPGs — three major genres — depend on it at the same time. Underneath it is the same set of "definition tables + event advancement + one-time reward delivery", so one piece serves three genres; see the [Quest system](/system/quest) and [Achievements and codex](/system/achievement).
- **Stamina and attempt gating**: the pacing gate for match-3, tower defense and ARPGs; the difference is only in recovery rate and reset boundaries. The core is the same idempotent logic reset by the server day; see [Stamina and attempt gating](/system/stamina).
- **Home and territory**: for SLGs it is territory ownership, for simulation management it is home saves, for survival crafting it is anti-destruction; all three share the spatial substrate and permission bits. See [Home, territory and building permissions](/system/territory).

The genre distribution of already-covered topics (sync and adjudication, matchmaking and ranks, AOI and sharding, payment and reconciliation, gacha pity) is judged covered in all three dimensions, corroborating each other from both sides; see the [coverage difference table](/research/04-coverage-diff).

## 5. Common Pitfalls and Misconceptions

The ten pitfalls that recur throughout the research and the pieces written after it; each gets "what is wrong" and "this repo's countermeasure".

| Pitfall | What is wrong | This repo's countermeasure | Landing point |
| --- | --- | --- | --- |
| Organizing content around what is at hand | Write whatever you have on hand, and you never know what is missing | Use an external list (book table of contents, official docs, genre component table) as a comparison table and go through it item by item | [Authoritative books research](/research/01-authoritative-books) |
| Filling gaps in research order | Fill in engine details you can find anywhere first, and leave the operations pieces for last | Order by genre demand density; the two dimensions independently yield the same order | [Application scenario comparison](/research/03-application-scenarios) |
| Etymology marketing | Claiming an industry-standard term comes from some paper, with errors compounding | A three-tier source standard: give a source / mark "industry practice" / mark "source not verified"; if it cannot be verified, do not invent one | [English terminology and etymology](/glossary/10) |
| Treating rate control as a framework responsibility | Assuming the framework's downlink comes with rate limiting and suppression built in | Rate control, suppression and ordering are in the business layer; the framework only handles delivery | [Marquee and announcements](/system/marquee) |
| Treating anti-cheat middleware as server authority | Assuming that because injection is blocked, no server-side adjudication is needed | The middleware handles client integrity; adjudication still lands on the server | [Security and anti-cheat](/server/security/01) |
| Writing engine APIs into body text | After an engine revision, interface signatures go stale | Body text records only the mechanic statement; interfaces follow the latest official documentation | [Official documentation research](/research/02-engine-middleware-docs) |
| Non-disclosed odds | Client display and server adjudication disagree, or odds are quietly tuned | Server-side adjudication plus disclosure: the odds and the pity rules are written into the UI | [Gear enhancement and star-up](/system/enhance), [Drops and probability design](/numerical/05) |
| Tradable stamina | A transferable budget is a second currency and an arbitrage entry point for studios | Stamina cannot be gifted or traded; limited-time gifts grant attempts only | [Stamina and attempt gating](/system/stamina) |
| Deleting permanent cosmetics by mistake | Rentals and permanent purchases stored in the same place, deleted on expiry | Ownership and equipping are separated; `kind` distinguishes permanent purchases from rentals | [Cosmetics, skins and dress-up](/system/cosmetics) |
| Power leaking into cosmetics | Adding stats in passing to sell skins, turning cosmetics into a pragmatic choice | Cosmetics definition tables do not allow numerical columns, with zero coupling to numerical calculations | [Cosmetics, skins and dress-up](/system/cosmetics) |

## Related

Relation chain: the three research pieces → difference roll-up → knowledge digest → landing pieces. Each step answers "why the next one is needed":

- The three research pieces each stand alone, so an entry point is needed first; see the [Research overview](/research/).
- Differences only become clear after the three dimensions' judgments are reconciled; see the [Coverage difference table](/research/04-coverage-diff).
- Only after reconciliation can knowledge and pitfalls be gathered into one table; this page takes that layer.
- Every entry here lands on a concrete piece; the mechanism detail at each landing point is governed by that node itself, and this page does not repeat it.

Upstream: [Research overview](/research/), [Authoritative books research](/research/01-authoritative-books), [Engine and middleware official documentation research](/research/02-engine-middleware-docs), [Application scenario comparison](/research/03-application-scenarios), [Coverage difference table](/research/04-coverage-diff), [Gameplay genre and feature component coverage comparison](/system/genre-coverage). Same layer: [English terminology and etymology](/glossary/10) (glossary side), [expansion ledger](/24-game-types-architecture/expansion) (progress side). Downstream: the gameplay system pieces in the system tree, and the server, numerical, operation and other landing trees.

## Reference

- All content on this page is drawn from the three research pieces and the coverage comparison page; no unverified facts are added. Judgment date 2026-10-08; gaps filled 2026-10-09 to 2026-10-10.
- Sources are annotated with a three-tier standard: a verifiable source gives book title / publisher / official site, industry practice is marked "industry practice", and anything without a single source is marked "source not verified" — the same standard as [English terminology and etymology](/glossary/10).
- The full lists, publication information and official entry points for books and documentation follow the Reference section of the corresponding research piece.
- Term crosswalk: Coverage Audit (coverage audit), Genre Density (genre demand density), Knowledge Digest (knowledge digest).

<!-- BACKLINKS-AUTO -->
## Related pages

- [04-coverage-diff](/research/04-coverage-diff.md)
- [index](/research/index.md)
