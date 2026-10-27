# Engine and Middleware Official Docs Survey

## Category

research / survey two. Node position: treat mature engine and middleware official documentation as a capability checklist, listing "what problem does this document solve" for each, then matching against this repo's existing articles under `docs/`. The inclusion standard matches [Authoritative Books Survey](/research/01-authoritative-books): publicly maintained, used by many projects, and topics that can land in one tree; personal projects and one-off tutorials do not enter the table.

## Definition

Engine docs answer how the client is built, how it connects, and how it manages assets; middleware docs answer what the contract of a given server-side component looks like. The two kinds of docs serve this repo differently: engine docs are used to verify "did we get the client half wrong," while middleware docs are used to verify "are the interfaces we describe ones that actually exist."

## Problem

This repo's backend is laid out by mechanism, and the client is cut by good-enough depth. That division of labor is a judgment when writing, and once written it needs external evidence to recheck. Official documentation is the only evidence source that does not go stale: an engine revision may change interfaces, but the conceptual criterion for "authoritative server model," "room lifecycle," and "sorted set" has not changed in ten years. This survey covered 23 official documents, extracted 23 topics, and judged 21 as covered, 2 as partial, and 0 as new gaps.

## Survey Results

| Official documentation | Affiliation | Extracted topic | Landing spot in this repo | Judgment |
| --- | --- | --- | --- | --- |
| Unity Manual | Engine | Client network layer structure and sessions | Specialized notes [03 Front-End Engines and Clients](/24-game-types-architecture/03-frontend-engines) section 2 | Covered |
| Netcode for GameObjects | Engine multiplayer | Network object replication and the client-authority boundary | Specialized notes 03 section 2, [Sync Models](/server/sync/02) | Covered |
| Unity Addressables | Engine assets | Asset grouping, dependencies and hot updates | [Asset System and Toolchain](/client/03) sections on asset layering and build-time hot updates | Covered |
| Unreal Engine Documentation (Replication, Gameplay Ability System, Dedicated Server) | Engine | Authoritative server model, prediction correction, skills and effects | Specialized notes 03 section 4, items 4.1 and 4.4, [Skill System](/system/skill) | Covered |
| Godot Documentation (High-level multiplayer, RPC) | Engine | Scene sync and RPC boundaries | Specialized notes 03 section 5, [Data Frames and Protocol Contracts](/networking/04) | Covered |
| Cocos Creator Manual | Engine | Mini-game platform constraints and the login chain | Specialized notes 03 section 3, [Mini-Game Platforms and Browser Environments](/client/web/05) | Covered |
| skynet Wiki | Server framework | Service model, timers and built-in libraries | [Skynet: C Kernel + Lua Actor](/server/skynet) | Covered |
| Colyseus Documentation | Room framework | Room lifecycle, broadcast and state sync | [Room Broadcast, Weak Networks and Domestic Network Environments](/networking/07), [Single-Match Room-Style Game Problem Model](/industry/models/02) | Covered |
| Nakama Documentation | Backend framework | Accounts, matchmaking, leaderboards, storage, notifications | [Accounts, Characters and Core Systems](/system/services/01), [Leaderboard](/system/leaderboard) | Covered |
| Agones Documentation | Hosting orchestration | Game server scaling and readiness probes | [Scale Up, Scale Down and Dynamic Server Addition](/server/capacity/02), [Coordination Layer, Cross-Server and Control Plane](/server/services/03) | Covered |
| Mirror Documentation | Engine networking | Interest management and transport layer abstraction | [AOI: Area of Interest](/server/aoi), [Transport Layer and Access Protocol Selection](/networking/03) | Covered |
| Photon Fusion Documentation | Engine networking | Prediction, rollback and state replication | [Prediction, Compensation and Correction](/server/sync/05) | Covered |
| Redis Documentation | Middleware | Sorted sets, hashes, script atomicity | [Redis, Leaderboards and Locks](/database/cache/01), [Leaderboard](/system/leaderboard) | Covered |
| PostgreSQL Documentation | Database | Transactions, indexes, partitioning | [Transactions, Consistency and Sharding](/database/03) | Covered |
| MySQL Reference Manual | Database | Master-slave, rollback segments and online DDL | [Relational and Non-Relational Databases](/database/02), [Config Tables and the Data-Driven Pipeline](/production/05) | Covered |
| Protocol Buffers Documentation | Contract | Field evolution and backward compatibility | [Data Frames and Protocol Contracts](/networking/04) | Covered |
| gRPC Documentation | Contract | Inter-service calls and streaming interfaces | [Service Discovery, Routing and Collaboration](/server/services/04) | Covered |
| Kubernetes Documentation | Hosting orchestration | Replicas, probes, scaling semantics | [Scale Up, Scale Down and Dynamic Server Addition](/server/capacity/02) | Covered |
| Steamworks Documentation | Platform | Lobby, achievements, in-app purchase and cloud save | [Platform and Channel Ecosystem](/industry/platforms/01), [Login, Payment, Social and Ad SDKs](/industry/platforms/03) | Covered |
| OpenTelemetry Documentation | Observability | Trace, Metric and Log tri-state | [Logs, Metrics, Tracing and OTel](/operation/observability/01) | Covered |
| Official anti-cheat middleware writeups (Easy Anti-Cheat, BattlEye) | Security | Client integrity and injection detection | [Security and Anti-Cheat](/server/security/01) | Covered |
| FMOD Studio Documentation | Audio middleware | Audio assets, events and mix buses | Specialized notes [21 Art and Audio Pipeline Collaboration](/24-game-types-architecture/21-art-audio-pipeline) section 3 covers only the pipeline, never names the middleware | Partial |
| Wwise Documentation | Audio middleware | Event-driven audio triggering and project structure | same as above | Partial |

**Conclusion: of 23 topics, 21 are covered. Engine-side landings all concentrate in the per-engine dedicated sections of specialized notes 03; middleware-side landings fall into the mechanism articles of the database, networking and server trees. The two sides do not cross, showing that the split "client by engine, server by mechanism" can hold both kinds of documentation at once. The 2 partial items are both audio middleware: section 3 has an audio pipeline dedicated section, and the names FMOD and Wwise never appear once; engine-specific APIs are not collected in this repo per the boundary criterion and do not count as gaps.**

## Three Comparisons Worth Singling Out

- **Nakama's tournaments and leagues only go down to the season level**: registration, time windows, prize pools and tier linkages are off the shelf, but it does not manage the free and paid tracks of a battle pass. This repo's [Commercialization Numerical Example Model](/numerical/06) places the battle pass in the paid tier, leaving the mechanism side empty; the landing is in item 6 of the gap list in [Coverage Diff Table](/research/04-coverage-diff).
- **Colyseus's room broadcast is the framework's downstream outlet**: `broadcast` only gets the message to each connection; frequency control, muting and ordering of important messages are all in the business layer. [Room Broadcast, Weak Networks and Domestic Network Environments](/networking/07) stops at the network layer, so there is no landing for the business layer of in-game announcements.
- **Anti-cheat middleware provides client integrity, not server authority**: EAC and BattlEye intercept injection and memory tampering; the verdict still has to land on the server. That boundary is already written in [Security and Anti-Cheat](/server/security/01), and the survey found nothing needing revision.

## Related

Chain of relations: official doc list → capability extraction → topic comparison → judgment → handoff to the gap list. Each segment answers "why is the next one needed":

- Listing document names alone is useless; first extract capabilities into comparable topics, and this page's table carries that layer.
- Only after topics are matched to articles do you know whether this repo's "good enough" depth on the client side actually holds — both partial items land on the client side.
- The two items judged partial are merged into [Coverage Diff Table](/research/04-coverage-diff); this page does not add a separate article.

Upstream: [Research Overview](/research/). Peers: [Authoritative Books Survey](/research/01-authoritative-books), [Application Scenarios Comparison](/research/03-application-scenarios), [Coverage Diff Table](/research/04-coverage-diff). Upstream reference baseline: [Genre and Functional Component Coverage Comparison](/system/genre-coverage).

## Reference

- Documentation entry points follow each project's official site: docs.unity3d.com, dev.epicgames.com/documentation, docs.godotengine.org, docs.cocos.com, github.com/cloudwu/skynet/wiki, docs.colyseus.io, nakama.io/docs, agones.dev/site/docs, mirror-networking.com, doc.photonengine.com, redis.io/docs, postgresql.org/docs, dev.mysql.com/doc, protobuf.dev, grpc.io/docs, kubernetes.io/docs, partner.steamgames.com/doc, opentelemetry.io/docs, easyanticheat.com, battleye.com, fmod.com/docs, audiokinetic.com/wwise/docs.
- Middleware capability descriptions only state semantics the documentation explicitly gives; interface signatures follow the latest version of each document. This page records no version numbers, to avoid going stale after revisions.
- Judgment criterion and retrieval date follow [Authoritative Books Survey](/research/01-authoritative-books): only standalone articles and dedicated sections count, full-repo grep on 2026-10-08.
- Terminology crosswalk: Interest Management, Replication, Ready Probe, Middleware.

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](01-authoritative-books.md)
- [03-application-scenarios](03-application-scenarios.md)
- [04-coverage-diff](04-coverage-diff.md)
- [index](index.md)
