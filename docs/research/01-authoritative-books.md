# Authoritative Books Survey

## Category

research / survey one. Node position: treat the books recognized as canonical in game development as a topic checklist to read through, extracting "what question does this book answer" from each, then matching the extracted topics against this repo's existing articles under `docs/` and judging covered / partial / gap. The criterion matches [Genre and Functional Component Coverage Comparison](/system/genre-coverage): only standalone articles and dedicated sections count; a single term appearing in body text does not count as coverage.

## Definition

The survey subjects are publicly published books that are repeatedly cited, not online tutorials or columns. Three selection standards: a clear publisher or official site, content that is systematic rather than a scattering of tips, and topics that can land in one of this repo's trees. Book titles and publication information follow the publisher's and author's official sites; topic extraction follows the book's table of contents.

## Problem

The easiest mistake when writing a knowledge base is organizing content by what material is on hand: write whatever you have, and never know what is missing. A book's table of contents is an external checklist handed to you; it has already categorized twenty years of engineering problems, and walking through them one by one reveals which layer of this repo is thick and which is empty. This survey covered 15 books, extracted 23 topics, judged 20 as covered, 3 as partial, and 0 as new gaps; the 11 functional component gaps are given separately by the functional component dimension, see [Coverage Diff Table](/research/04-coverage-diff) — the two dimensions do not double-count.

## Survey Results

| Book | Published | Extracted topic | Landing spot in this repo | Judgment |
| --- | --- | --- | --- | --- |
| Game Programming Patterns (Robert Nystrom) | Self-published, official site gameprogrammingpatterns.com, 2014 | Game main loop and time advancement | Specialized notes [09 Game Programming Patterns](/24-game-types-architecture/09-programming-patterns) sections 8 and 9, [Tick and Time Advancement](/server/sync/01) | Covered |
| same as above | same as above | Double buffering, object pools, flyweight, prototype, component, event queue | Specialized notes 09 sections 7, 18, 2, 4, 13, 14, [Component Model Explained](/24-game-types-architecture/06-frameworks) | Covered (dedicated section) |
| same as above | same as above | Bytecode and scripting VMs | Specialized notes 09 section 10, [Host Runtime and Script VM Integration](/system/scripting/02) | Covered |
| same as above | same as above | Data-oriented design and ECS | [Scripting Languages and ECS](/client/04) | Covered |
| Game Programming Gems series (volumes 1–8) | Charles River Media, 2000–2007 | Sync, prediction and network jitter | [Prediction, Compensation and Correction](/server/sync/05), [Sync Models](/server/sync/02) | Covered |
| same as above | same as above | Determinism, replays and arbitration | [Determinism and Numerical Consistency](/server/sync/06), [Replay, Spectating and Arbitration](/server/sync/07) | Covered |
| same as above | same as above | Math, physics and collision | Specialized notes [07 Architecture Overview](/24-game-types-architecture/07-core-arch) touches on it, no dedicated section | Partial |
| Game Engine Architecture (Jason Gregory) | CRC Press, 3rd edition, 2018 | Engine layering and module boundaries | [Client Tech Stack and Engines](/client/01), [Client Internal Layering](/client/web/06) | Covered |
| same as above | same as above | Asset system and toolchain | [Asset System and Toolchain](/client/03) | Covered |
| same as above | same as above | Animation, audio and presentation subsystems | Specialized notes [19 Client Architecture and Performance Basics](/24-game-types-architecture/19-client-architecture) animation state machine dedicated section, [21 Art and Audio Pipeline Collaboration](/24-game-types-architecture/21-art-audio-pipeline) | Covered |
| Multiplayer Game Programming (Glazer, Shankar) | Pearson, 2016 | Latency, prediction, compensation and authority | [Prediction, Compensation and Correction](/server/sync/05), [Security and Anti-Cheat](/server/security/01) | Covered |
| AI for Games (Ian Millington) | CRC Press, 3rd edition, 2019 | Pathfinding, behavior trees and NPC decision-making | [AI Application Scenarios in Clients and Game Systems](/client/05) discusses scenarios only, not mechanisms | Partial |
| Game Mechanics: Advanced Game Design (Adams, Dormann) | New Riders, 2014 | Economic loops, resource production and consumption | [Economic Loops and Production/Consumption](/numerical/04) | Covered |
| same as above | same as above | Progression, unlocks and pacing | [Progression Curve Model](/numerical/03), [Level Difficulty and Newcomer Pacing](/numerical/07) | Covered |
| The Art of Game Design (Jesse Schell) | CRC Press, 2nd edition, 2014 | Mechanism decomposition and experience design method | [Analytical Method from Gameplay to Architecture](/industry/methodology/03), [Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) | Covered |
| Real-Time Rendering (Akenine-Möller et al.) | CRC Press, 4th edition, 2018 | Render pipeline and frame budget | Specialized notes [19 Client Architecture and Performance Basics](/24-game-types-architecture/19-client-architecture) section 1, [Getting Started with WebGL and 3D Rendering](/client/web/02) | Covered |
| Game Engine Black Book (Fabian Sanglard) | Independent publication, DOOM volume 2017, Quake volume 2019 | Full teardowns of classic engines | [Game Development History Timeline](/history/) node, specialized notes [01 Game Backend Tech Panorama](/24-game-types-architecture/01-entry) | Partial |
| Designing Games (Tynan Sylvester) | O'Reilly, 2013 | Interaction and iteration between systems | [How Models Combine](/industry/models/08), specialized notes [10 Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) | Covered |
| Free-to-Play (Will Luton) | New Riders, 2013 | Monetization structure and business model | [Commercialization Numerical Example Model](/numerical/06), [Release, Versions and Business Models](/industry/platforms/04) | Covered |
| Tencent Game Development Essentials series | Tencent Game Academy, published in volumes | Networking, performance and data practice from domestic projects | Specialized notes [07 Architecture Overview](/24-game-types-architecture/07-core-arch), [13 Ops and Infrastructure in Practice](/24-game-types-architecture/13-tech-ops) | Covered |
| Designing Data-Intensive Applications (Martin Kleppmann) | O'Reilly, 2017 | Transactions, replication, sharding and consistency | [Transactions, Consistency and Sharding](/database/03), [Data Sync, Hot/Cold Tiering and Archival](/database/04) | Covered |
| Site Reliability Engineering (Beyer et al., Google) | O'Reilly, 2016 | Capacity, SLOs and incident response | [Load Testing, Capacity Planning and Scaling](/operation/observability/05), [The Real Goal of Stability Governance](/operation/observability/06) | Covered |
| Release It! (Michael T. Nygard) | Pragmatic Bookshelf, 2nd edition, 2018 | Timeouts, circuit breakers, backoff and failure modes | [Debugging, Fault Localization and Retrospectives](/operation/observability/04), [Consistency, Recovery and Reconnection](/server/services/05) | Covered |

**Conclusion: of 23 topics, 20 are covered and 3 are partial. Coverage concentrates in five areas — architecture, sync, numerical, storage and ops — which are exactly the five thickest trees in this repo; the 3 partial items are math/physics collision, AI mechanisms, and classic engine teardowns, all on the client and presentation side, consistent with the trade-off of "the backend is our home ground, the client is good-enough and systematic." They are treated as partial, with no new articles added.**

## Practices You Can Directly Take from the Books

- **Turning tasks and achievements into data tables** (TrinityCore's engineering convention, in the same data-driven lineage as Game Programming Patterns): task definitions, completion conditions and rewards each become their own table, and the server only advances progress by event. What this repo is missing is not the idea, but the way to write that progress model — landings are in the gap list of [Coverage Diff Table](/research/04-coverage-diff).
- **Trade-offs between object pools and double buffering**: specialized notes 09 already give the criterion as "when you should not use them," so this repo does not re-expand it; new articles only point back where reusable state snapshots are needed.
- **Where frame time actually goes**: Real-Time Rendering's frame budget accounting and specialized notes 19's "render command attribution" are the same algorithm; the triage order for client performance problems can be reused directly.
- **For economy systems, compute production/consumption before pricing**: Game Mechanics' resource flow diagram is isomorphic to [Economic Loops and Production/Consumption](/numerical/04); the three articles on stamina, check-in and battle pass are exactly plugging the three open mouths on that loop.
- **Tolerance: timeouts first, circuit breakers second**: Release It!'s ordering is carried in this repo by [Debugging, Fault Localization and Retrospectives](/operation/observability/04); new articles meeting external dependencies (voice SDK, payment channels) cite it directly.

## Related

Chain of relations: book list → topic extraction → per-article comparison → judgment → gap destination. Each segment answers "why is the next one needed":

- A book list of only titles is useless; first extract comparable topics, and the "Extracted topic" column of this page's table carries that layer.
- Once topics are extracted they can be matched to articles, and the judgment results share the same criterion with [Coverage Diff Table](/research/04-coverage-diff).
- The three items judged partial get no new articles; the reason is written in the conclusion: the client side is cut by "good-enough depth," consistent with [The Boundaries of Client, Server, Platform and Operations](/industry/methodology/05).

Upstream: [Research Overview](/research/). Peers: [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs), [Application Scenarios Comparison](/research/03-application-scenarios), [Coverage Diff Table](/research/04-coverage-diff). Upstream reference baseline: [Genre and Functional Component Coverage Comparison](/system/genre-coverage).

## Reference

- Book information follows the publishers' and authors' official sites: gameprogrammingpatterns.com, CRC Press (A K Peters), Pearson, O'Reilly, New Riders, Pragmatic Bookshelf, Charles River Media; Chinese practice books follow the public pages of Tencent Game Academy.
- Game Programming Gems is cited as the 1–8 volume series as a whole, taking only its topic partitions (sync/network, math/physics, AI, performance), without asserting article coverage volume by volume.
- Retrieval criterion for topic judgment: full-repo keyword and title grep, retrieval date 2026-10-08; judgment applies only to md files under this repo's `docs/`.
- Terminology crosswalk: Game Programming Patterns, Data-Oriented Design, Frame Budget.

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](02-engine-middleware-docs.md)
- [03-application-scenarios](03-application-scenarios.md)
- [04-coverage-diff](04-coverage-diff.md)
- [index](index.md)
