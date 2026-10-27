# Genre and Feature-Component Coverage Cross-Reference

## Category

system / gameplay systems. Node positioning: pull the 21 gameplay genres commonly seen in the market into one net, list the feature components each genre asks for first, then map all 46 components one by one onto this repo's existing articles and give a three-tier verdict of "covered / partial / gap". The verdict counts only standalone articles and dedicated sections; a term appearing once in the body does not count as coverage.

## Definition

A genre is a label for communicating with players and publishers; a feature component is a piece the server actually has to build. The two are not one-to-one: one component, the leaderboard, is needed by dozens of genres — board games, party, MOBA, cards, and more; one genre, SLG, needs components spanning four groups — account, persistent world, social, and operations. So this page answers two different questions with two tables: the genre table answers "to build this genre, what do you build first", and the component table answers "does this repo have this piece, and at which layer".

## Problem

This repo's gameplay articles were selected by "hardest to build": components like matchmaking, leaderboards, skills, settlement, and sync — get them wrong and there is an incident, so they were written first. The market-common selection standard is "every game has it": components like quests, achievements, check-in, and mail, where the difficulty is not in the algorithm but in volume, configuration volume, and operational cadence. The intersection of the two standards is not the full set, and articles selected by the hardest-first rule inevitably miss the most commonly used batch.

The consequences of the misses show up only when doing a genre analysis: it makes sense at the architecture level, but the system list cannot be assembled, and the server workload estimate at project start is low. This page does one sweep, in the order: first fix the cross-reference baseline, then enumerate the genres, then merge the components genres repeatedly ask for into one list, and finally count only "no standalone article and no dedicated section" as a gap.

## Verdict Convention

Three tiers of verdict; the object of verdict is an md under this repo's `docs/`:

- **Covered**: there is a standalone article whose subject is the component, with the file's main title being that system.
- **Partial**: no standalone article, but there is a dedicated section or developed passage somewhere in the knowledge base, or a dedicated section in either of the two topical notes "Gameplay System Design" or "Auxiliary System Design".
- **Gap**: no dedicated section in the knowledge base or the topical notes, only scattered terms left across the whole repo, or not even one retrievable term.

Retrieval is full-repo keyword grep plus a re-check of synonymous phrasings, with a retrieval date of 2026-10-08. Whole-page counts are per the tables: 21 genres, 46 components, of which 40 covered, 6 partial, 0 gap (the original 11 gaps were filled by the 2026-10-09 gameplay-system enrichment batch).

## Cross-Reference Baseline: The 14 Gameplay Subsystem Topics Listed in the Brief

**Conclusion: of the 14 topics, 8 have a dedicated article, 2 have a dedicated section, and quests, achievements, star upgrade, and marquee currently have no landing point.**

| Topic | Repo landing point | Verdict |
| --- | --- | --- |
| Leaderboard | [Leaderboard](/system/leaderboard) | Dedicated article |
| Party matchmaking | [Party Matchmaking (grouping)](/system/party-matchmaking) | Dedicated article |
| PVP matchmaking | [PVP Matchmaking](/system/pvp-matchmaking) | Dedicated article |
| Events | [Events, Leaderboards, Matchmaking, and Social](/system/services/02) events section, topical note [10 Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) section 2 | Has a dedicated section |
| Quests | None. The whole repo only has one passing mention of quest bytecode in the topical note [09 Game Programming Patterns](/24-game-types-architecture/09-programming-patterns); "quest system" in `networking/ipc/06` means a background task queue and has nothing to do with gameplay quests | No landing point |
| Achievements | None. The topical note 09 uses achievements to illustrate the observer pattern, with no developed mechanism of the achievement system itself | No landing point |
| Login | [Accounts, Characters, and Base Systems](/system/services/01), [Login, Payment, Social, and Ad SDKs](/industry/platforms/03) | Has a dedicated section |
| Gacha (randomness deep dive) | [Drop and Probability Design](/numerical/05), including expected value, hard pity, soft pity, variance, and probability-disclosure compliance | Dedicated article (numerical side) |
| Weapon star upgrade | None. "Star upgrade" has 0 hits repo-wide; [Growth Curve Models](/numerical/03) only reaches the curve convention | No landing point |
| Attributes and skill buffs | [Skill System](/system/skill), [Skill System Design](/server/sync/08) | Dedicated article |
| Marquee | None. "Marquee" and "horn" have 0 hits repo-wide | No landing point |
| AOI | [AOI: Area of Interest](/server/aoi) | Dedicated article |
| Frame sync vs state sync | [Synchronization Models](/server/sync/02), [Frame Sync Deep Dive](/server/sync/03) | Dedicated article |
| Combat validation | [Determinism and Numerical Consistency](/server/sync/06), [Settlement](/system/settlement) | Dedicated article |

The four items with no landing point are all listed as gaps in the component list below, with the two conventions consistent.

## Genre List (21)

**Conclusion: none of the 21 genres has a brand-new component list; all are subsets and orderings of the same 46-piece list — the genre decides the order of building pieces, not the kinds of pieces.**

| Genre | Core loop | Feature components asked for first | Dominant problem model |
| --- | --- | --- | --- |
| Board-game matches (Dou Dizhu, mahjong) | One match decides the outcome; room cards and trusteeship | Rooms and trusteeship, shuffle and randomness proof, settlement and reconciliation, anti-cheat | Room-based session |
| Party and light competitive rooms | Play a match of a few minutes, then another | Rooms and lobby, quick match start, reconnection, in-room broadcast and voice | Room-based session |
| Match-3 and casual puzzle | Clear levels, stamina, items | Levels and attempts, stamina and reset, level leaderboards, ads and IAP | Room-based session, long-cycle progression |
| Rhythm | Hit charts, grind scores, collect song packs | Hit judgement and anti-cheat, score boards, songpack versioning and configuration | Room-based session |
| MOBA | 5v5 tower push, seasonal ranked | Sync and adjudication, skills and buffs, matchmaking and ranks, replay and anti-cheat | Hard-real-time competitive |
| FPS/TPS and tactical shooters | Gunfights, point capture, rank climbing | Hit detection and compensation, anti-cheat, matchmaking and parties, spectating and replay | Hard-real-time competitive |
| Fighting | One match of tens of seconds | Rollback netcode, determinism, input latency, disconnection loss | Hard-real-time competitive |
| Racing and sports | A lap per match, comparing time and score | Sync and interpolation, score boards, rooms and restarts | Hard-real-time competitive |
| RTS and real-time tactics | Train units and operate, multi-unit micro | Command sync, pathfinding and batch updates, high-frequency objects and broadcasting, replay | Hard-real-time competitive, high-frequency object |
| Tower defense | Deployment, waves, clear | Wave and level configuration, character growth, sweeps and attempts | Long-cycle progression |
| Cards and CCG | Draft, match, gacha | Effect chain and state machine, randomness and pity, quests, achievements, and codex, arena settlement | Long-cycle progression |
| Auto chess | Drafting, D-pieces, 8-player matches | Rooms and turn progression, randomness and pity, economy and experience, in-match settlement | Room-based session, long-cycle progression |
| Turn-based RPG and strategy | Move on the grid, use moves, watch settlement | Effect chain and settlement order, checkpoint recovery, log review | Long-cycle progression |
| ARPG and loot dungeons | Run dungeons, drop gear, gear sets | Skills and judgement, drops and pity, dungeons and attempts, asset audit | Composite |
| MMORPG and large world | Long-term characters, coexisting world | AOI and sharding, quests and achievements, guilds and trading, server merges and cross-server | Persistent online world |
| SLG and 4X seasonal sandbox | City building, marching, alliance war | Persistent world and timing, alliances and diplomacy, seasons and settlement, territory and permissions | Persistent online world, long-cycle progression |
| Idle and AFK growth | AFK output, offline revenue, event cadence | Offline and asynchronous settlement, events and check-in, gacha and parallel growth lines | Long-cycle progression |
| Simulation and life | Building, production, trading | Production/consumption loop, friend visits, housing and save data, shop and pricing | Long-cycle progression, persistent online world |
| Survival crafting and sandbox | Gathering, building, shared world | Object persistence, regional load, territory and anti-sabotage, server merges and wipes | Persistent online world, high-frequency object |
| Roguelike and Roguelite | Restart, in-run growth, out-of-run unlocks | Random seeds and reproducibility, in-run/out-of-run state split, unlocks and codex | Room-based session, long-cycle progression |
| UGC and platform ecosystem | Create, share, distribute, trade | Review and permissions, sandbox isolation, economy and revenue share, accounts and minor protection | Economy/platform |

The theme dimension (cultivation, wuxia, Three Kingdoms, anime-style, etc.) is not in the table: themes are reskins, not piece changes — the same components reuse with one layer of text swapped. Only gameplay and business form change the server component requirements, so the table lists only those two dimensions.

## Component Cross-Reference (46)

The landing-point column gives this repo's md paths; topical notes refer to the two gameplay chapters in the `24-game-types-architecture` tree, and the knowledge base refers to the remaining trees.

**Conclusion: of the 46 items, 40 covered, 6 partial, 0 gap — the original gaps concentrated on the growth-content and operational-cadence side, and all ten articles of the 2026-10-09 gameplay-system enrichment batch filled them; item-by-item landing points are in the gap list section.**

### Account and Identity

**Conclusion: all 4 items in this group are covered; the account side is the thickest group repo-wide.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Login, sessions, and multi-client tokens | All | [Accounts, Characters, and Base Systems](/system/services/01), [Login, Payment, Social, and Ad SDKs](/industry/platforms/03) | Covered |
| Real-name, addiction prevention, and compliance windows | All domestic releases | [Accounts, Characters, and Base Systems](/system/services/01), [Compliance, Game License, and Platform Constraints](/server/security/04) | Covered |
| Character creation, shard assignment, bans and recovery | All | [Accounts, Characters, and Base Systems](/system/services/01) | Covered |
| Server merges, migration, and historical data mapping | MMORPG, SLG, idle | [Sharding, Migration, Server Merges, and Decommissioning](/server/capacity/03) | Covered |

### Matchmaking and Brokerage

**Conclusion: all 6 items in this group are covered.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Solo matchmaking and rating systems | MOBA, FPS, cards | [PVP Matchmaking](/system/pvp-matchmaking) | Covered |
| Party matchmaking and party state machine | All multiplayer | [Party Matchmaking (grouping)](/system/party-matchmaking) | Covered |
| Room lifecycle, lobby, and host permissions | Board games, party, casual, auto chess | [Room-Based Session Problem Model](/industry/models/02) (room formation, room lifecycle, and disbanding sections) | Covered |
| Reconnection and trusteeship | All real-time | [Room-Based Session Problem Model](/industry/models/02), [Pause, Resume, Frame Catch-up, and Reconnection](/server/sync/04) | Covered |
| Cross-server, sharding, and world orchestration | MMORPG, SLG | [Coordination Layer, Cross-Server, and Control Plane](/server/services/03), [Sharding, Migration, Server Merges, and Decommissioning](/server/capacity/03) | Covered |
| Housing, territory, and build permissions | Survival crafting, simulation, SLG | [Housing, Territory, and Building Permissions](/system/territory) (plot model, placement validation, permission matrix, visiting) | Covered |

### Combat and Presentation

**Conclusion: all 7 items in this group are covered.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Synchronization models (frame sync and state sync) | MOBA, FPS, RTS, fighting | [Synchronization Models](/server/sync/02), [Frame Sync Deep Dive](/server/sync/03) | Covered |
| Skills, buffs, and the effect pipeline | All combat genres | [Skill System](/system/skill), [Skill System Design](/server/sync/08) | Covered |
| AOI and state broadcasting | MMORPG, sandbox, RTS | [AOI: Area of Interest](/server/aoi) | Covered |
| Prediction, compensation, and correction | FPS, MOBA, fighting | [Prediction, Compensation, and Correction](/server/sync/05) | Covered |
| Replay, spectating, and adjudication | MOBA, FPS, board games | [Replay, Spectating, and Adjudication](/server/sync/07), [Determinism and Numerical Consistency](/server/sync/06) | Covered |
| Anti-cheat and server authority | All | [Security and Anti-Cheat](/server/security/01) | Covered |
| Marquee, horn, and in-game announcements | All; tightest for heavily operational genres | [Marquee and Announcements](/system/marquee) (message object, rate control and merge window, online push and offline pull) | Covered |

### Growth and Content

**Conclusion: of the 10 items in this group, 8 covered and 2 partial; the five original gaps of quests, achievements, star upgrade, codex, and stamina are filled by the four new articles of 2026-10-09.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Levels, growth curves, and the numerical convention | All growth genres | [Growth Curve Models](/numerical/03), [Combat Numerics and Damage Formulas](/numerical/02) | Covered |
| Drops, randomness, and gacha pity | Cards, ARPG, idle | [Drop and Probability Design](/numerical/05) | Covered |
| Offline and asynchronous settlement | Idle, simulation | [Long-Cycle Progression and Asynchronous Interaction Problem Model](/industry/models/05) section 3 | Covered |
| Dungeons and level orchestration | ARPG, tower defense, turn-based RPG | [Level Difficulty and Newcomer Pacing](/numerical/07), [Drop and Probability Design](/numerical/05); the mechanism side (entry conditions, party dungeons, difficulty tiers) has no dedicated section | Partial |
| Inventory and items | All | Topical note [10 Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) section 7, [Trading, Payment, and Economy](/system/services/03) passed over with "the economy is not inventory arithmetic" | Partial |
| Quest system | All; heaviest for MMORPG and cards | [Quest System](/system/quest) (progress model, event advancement, chained prerequisites, delivery and submission points) | Covered |
| Achievement system | All | [Achievements and Codex](/system/achievement) (monotonic counters, event source tags, automatic granting) | Covered |
| Equipment enhancement and star upgrade | All growth genres | [Equipment Enhancement and Star Upgrade](/system/enhance) (enhancement table, failure policy, pity, inheritance) | Covered |
| Codex and collection | Cards, collection, open world | [Achievements and Codex](/system/achievement) codex section (set coverage and collection completion) | Covered |
| Stamina and attempt gating | Match-3, cards, ARPG | [Stamina and Attempt Gating](/system/stamina) (lazy recovery, server-day window, purchase-limit idempotency) | Covered |

### Economy and Monetization

**Conclusion: of the 5 items in this group, 4 covered and 1 partial; the cosmetics gap is filled by the new article.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Payment, delivery, and reconciliation | All | [Trading, Payment, and Economy](/system/services/03) | Covered |
| Trading post, auction, and player-to-player trading | MMORPG, SLG | [Trading, Payment, and Economy](/system/services/03), [Economy/Platform Problem Domain](/design/problem-domains/05) | Covered |
| Gacha pool operations and probability disclosure | Cards, anime-style, idle | The disclosure and compliance chapters of [Drop and Probability Design](/numerical/05) | Covered |
| In-game shop, gift packs, and pricing | All | The platform-ization passage of [Trading, Payment, and Economy](/system/services/03), [Commercialization Numerical Example Models](/numerical/06); no shop dedicated section | Partial |
| Cosmetics, skins, and outfits | MOBA, anime-style, sandbox | [Cosmetics, Skins, and Outfits](/system/cosmetics) (ownership/equipment separation, slot exclusivity, the do-not-sell-power red line) | Covered |

### Social and Organization

**Conclusion: of the 5 items in this group, 2 covered and 3 partial; the voice gap is filled by the new article.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Leaderboard | All | [Leaderboard](/system/leaderboard) | Covered |
| Friends, guilds, and organizations | All social-facing | The social section of [Events, Leaderboards, Matchmaking, and Social](/system/services/02) | Partial |
| Chat, blocking, and reports | All social-facing | [Events, Leaderboards, Matchmaking, and Social](/system/services/02), [Room Broadcasting, Weak Networks, and Domestic Network Conditions](/networking/07) | Partial |
| Mail and attachment claiming | All | The mail passage of [Accounts, Characters, and Base Systems](/system/services/01), topical note [10 Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) section 8 | Partial |
| Voice (party and in-room) | Party, FPS, MMO dungeons | [In-Game Voice](/system/voice) (topology trade-offs, room tokens, spatial voice, governance and compliance) | Covered |

### Operations and Retention

**Conclusion: all 6 items in this group are covered.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Events and scheduled events | All | The events section of [Events, Leaderboards, Matchmaking, and Social](/system/services/02) | Covered |
| Ranked seasons and rank settlement | Competitive genres | [PVP Matchmaking](/system/pvp-matchmaking), [Settlement](/system/settlement) | Covered |
| Event tracking, BI, and retention analysis | All | [Event Tracking, BI, and Analytics](/operation/bi/02) | Covered |
| Out-of-site reach, push, and recall | All | [Reach System and External Capability Integration](/operation/bi/05) | Covered |
| Check-in, benefits, and redeem codes | All; heaviest for casual and idle | [Check-in, Benefits, and Redeem Codes](/system/checkin) (check-in window, mail decoupling, redeem anti-abuse) | Covered |
| Season pass (battle pass) | All mid-to-heavy | [Battle Pass and Season Track](/system/battle-pass) (season structure, dual-track claiming, switch backfill) | Covered |

### Governance and Assurance

**Conclusion: all 3 items in this group are covered, with no gaps.**

| Component | Common genres | Landing point | Verdict |
| --- | --- | --- | --- |
| Settlement and reconciliation | All | [Settlement](/system/settlement) | Covered |
| GM, risk control, audit, and customer support | All | [Risk Control, Audit, GM, and Customer Support](/system/services/04), [Behavioral Risk Control and Governance](/server/security/03) | Covered |
| Config tables, scripts, and hot updates | All | [Scripts, Hot Updates, and Logic Extension](/system/scripting/), [Config Tables and the Data-Driven Pipeline](/production/05) | Covered |

Total 46 items: 40 covered, 6 partial, 0 gap.

## Gap List (11 Items, All Filled)

**Conclusion: all 11 gaps belong to the "cannot launch without doing it" class, and none belongs to the "getting it wrong causes an incident" class; ranked by genre demand density, quests and achievements come first, then marquee and check-in. All ten articles of the 2026-10-09 gameplay-system enrichment batch filled them; item-by-item landing points are on the last line of each entry, and the analysis below the line is kept pre-fill as a comparison.**

1. **Quest system.** Four things: accept conditions, progress advancement, chained prerequisites, and reward granting, and the content volume of MMORPG and cards all sits on it. TrinityCore's approach puts quest definitions, completion criteria, and rewards each in a data table, with the server only advancing progress by event, so adding a quest does not change engine code. This repo has only one passing bytecode example in topical note 09; the reward-granting side actually already has the voucher convention of [Settlement](/system/settlement) to connect to, and what is missing is the middle progress-model layer. Landing point: [Quest System](/system/quest).

2. **Achievement system.** Isomorphic with quests, differing in that progress only increases, events are subscribed to, and rewards are granted once. TrinityCore likewise builds achievements and completion criteria as data tables plus evaluation conditions. This repo uses it to illustrate the observer pattern, so the motivation for event subscription is already there; what is missing is achievements' own convention: progress idempotency, cross-gameplay event sources, and how granting connects to the ledger. Landing point: [Achievements and Codex](/system/achievement).

3. **Equipment enhancement and star upgrade.** Four things: resource consumption, failure protection, material recovery, and attribute migration — the most resource-burning and most incident-prone part of the growth line. Mature open-source pieces rarely have a standalone enhancement module, so it is project self-built. This repo has [Growth Curve Models](/numerical/03) on the numerical side and the ledger requirements of [Trading, Payment, and Economy](/system/services/03) on the accounting side, and what is missing is the mechanism article connecting the two. Landing point: [Equipment Enhancement and Star Upgrade](/system/enhance).

4. **Marquee, horn, and in-game announcements.** The server-wide downlink channel, where the difficulty is rate control, sharded broadcasting, blocking, and preserving order for important messages. Colyseus's room broadcast is a ready-made downlink port given by the framework, but rate control and blocking remain in the business layer. This repo's [Room Broadcasting, Weak Networks, and Domestic Network Conditions](/networking/07) covers the network layer, and [Reach System and External Capability Integration](/operation/bi/05) covers out-of-site push; the in-game segment holds neither end. Landing point: [Marquee and Announcements](/system/marquee).

5. **Check-in, benefits, and redeem codes.** Claim idempotency, break-and-refill, redeem-code batches and one-code-one-use, anti-abuse — all small-value high-frequency accounting actions. Nakama's, Colyseus's, and KBEngine's built-in module lists do not include this item, so it is self-built. This repo's mail attachment claiming voucher convention can be reused directly, and what is missing is the two pieces of the check-in calendar and the code pool management. Landing point: [Check-in, Benefits, and Redeem Codes](/system/checkin).

6. **Season pass (battle pass).** Free and premium track progress, quest-driven seasonal activity, backfill at settlement. Nakama's built-in tournaments and leagues manage registration, time windows, prize pools, and season chaining, but the battle pass's progress track still must be self-built. This repo's [Commercialization Numerical Example Models](/numerical/06) already places the battle pass in the payment tiers, and the mechanism side is one section short. Landing point: [Battle Pass and Season Track](/system/battle-pass).

7. **Codex and collection.** Collection progress, unlock conditions, collection-completion bonuses — the long-term retention of cards and open worlds leans mainly on it. Mature open-source pieces likewise rarely have a corresponding module. What this repo lacks is the "monotonic event set" storage convention, and how unlock events connect to reward granting. Landing point: the codex section of [Achievements and Codex](/system/achievement).

8. **Stamina and attempt gating.** Stamina recovery, raid attempts reset per server day, sweeps and back-claims — the pacing gate of casual and card genres. This repo's [Economy Loop and Output/Consumption](/numerical/04) treats stamina as a sink and [Level Difficulty and Newcomer Pacing](/numerical/07) treats stamina as a retry cost; both only reach the numerical convention, with no landing point for timezone and reset idempotency. Landing point: [Stamina and Attempt Gating](/system/stamina).

9. **Cosmetics, skins, and outfits.** Inventory ownership, the authority of equipping/unequipping, in-match visible sync — the main paid piece of MOBA and anime-style. This repo's numerical side already treats cosmetics as a sink and a pricing item, but the state-side inventory and sync have no dedicated section, sitting exactly between the non-skill entity presentation outside [Skill System](/system/skill) and [Synchronization Models](/server/sync/02). Landing point: [Cosmetics, Skins, and Outfits](/system/cosmetics).

10. **Housing, territory, and build permissions.** The core loops of three genres — survival crafting, simulation, and SLG — all sit on it: whose space is it, who may change it, how is destruction scored. BigWorld and KBEngine provide engine-side pieces such as space and triggers, but territory rules belong to the gameplay-layer self-build. This repo's [AOI: Area of Interest](/server/aoi) and [Open-Source Server Maps](/server/map) provide the spatial foundation, but permissions and rules have no landing point. Landing point: [Housing, Territory, and Building Permissions](/system/territory).

11. **Voice (party and in-room).** Standard equipment for party, FPS squad, and MMO dungeons, where the common practice is to integrate a third-party SDK, with the server only responsible for assigning and authenticating voice slots. This repo's [Login, Payment, Social, and Ad SDKs](/industry/platforms/03) covers the integration boundaries of the other four SDK categories, voice is not among them, and [Party Matchmaking (grouping)](/system/party-matchmaking) only mentions it in passing in the matchmaking form. Landing point: [In-Game Voice](/system/voice).

The fill order is ranked by genre demand density: quests and achievements first, because they account for two of the 14 baseline topics and are simultaneously depended on by the three large genres of MMORPG, cards, and idle; marquee and check-in second, because operations needs them the moment an event starts. (This order has been executed in full: all ten articles of 2026-10-09 are in the repo, see the landing points on the last line of each entry.)

## Reference Analysis

External practices cited in the cross-reference baseline and gap entries, each given a reference conclusion, reasoning, and landing point; the verdict targets only "should this repo's article be filled the way it does", not an evaluation of the original project itself.

- **TrinityCore's data-tabled quests (quest definitions, completion criteria, and rewards each in a table; the server only advances progress by event) — worth referencing.** Reason: it makes "adding a quest does not change engine code" into a mechanism, which is exactly the progress-model layer this repo lacks, and is isomorphic with the repo-wide config-driven convention. Landing point: the Quest System article's mechanism skeleton unfolds as "definition table / criteria table / rewards table + event advancement", reward granting connects to the voucher convention of [Settlement](/system/settlement), and the configuration side references [Config Tables and the Data-Driven Pipeline](/production/05).
- **TrinityCore's achievement criteria table — worth referencing.** Reason: the three conventions of monotonic progress, event subscription, and one-time granting all fit into a criteria table, avoiding achievements written as scattered ifs in business code. Landing point: the achievement and codex article's evaluation convention, with event sources merged into a subscription table by the three classes of combat, economy, and social, and the codex developed in the same article as the "monotonic event set" variant.
- **Nakama's tournaments and leagues (registration, time windows, prize pools, and season chaining) — borrowable.** Reason: the conventions for season time windows and season chaining are ready-made; but it is a tournament and rank piece, and the battle pass's free and premium track progress is not in it, so copying it would miss the progress track. Landing point: the season pass article borrows its convention for the season side, with the progress track as a standalone self-built section, and the season-board implementation pointing back to [Leaderboard](/system/leaderboard).
- **Colyseus's room broadcast (framework-level downlink port) — borrowable.** Reason: a server-wide announcement can be seen as "broadcasting one copy to all rooms", so the downlink channel semantics are ready-made; but rate control, blocking, and order preservation for important messages are all in the business layer, which the framework does not handle. Landing point: the marquee and announcements article inherits the network layer of [Room Broadcasting, Weak Networks, and Domestic Network Conditions](/networking/07) and adds business-layer rate control and order preservation; the out-of-site reach part still belongs to [Reach System and External Capability Integration](/operation/bi/05).
- **BigWorld and KBEngine's space and trigger components — borrowable.** Reason: the spatial foundation (who is nearby, enter/exit triggers) is given ready-made by engine pieces, but territory ownership, build permissions, and destruction judgement belong to the gameplay layer, which the engine does not handle. Landing point: the housing and territory article uses [AOI: Area of Interest](/server/aoi) and [Open-Source Server Maps](/server/map) as the spatial foundation, with permissions and rules as the article's main subject.
- **Agones and Orleans scheduling and actor hosting — not applicable (to these 11 gaps).** Reason: both solve the "where does a piece run" hosting and orchestration problem and do not provide operational pieces like quests, check-in, or battle pass, so putting them in the gap articles would be background noise. Landing point: only mentioned in a passing phrase about hosting trade-offs in the relevant articles, not expanded; the hosting layer itself already has [Coordination Layer, Cross-Server, and Control Plane](/server/services/03).
- **Market genre classification convention (platform tag systems) — worth referencing.** Reason: the basis for this page's genre table, and the exclusion convention of "themes not in the table; only keep dimensions that change component requirements" has already been validated in one round. Landing point: keep this page's convention unchanged; the genre-to-problem-model mapping continues to be carried by [Common Gameplay Type Overview](/industry/models/00), not repeated here.

## Related

Relationship chain: genre labels → feature-component list → three-tier verdict → gap fill order. Each segment answers "why the next one is needed":

- Labels alone give no conclusion; there must first be a mapping layer, see [Common Gameplay Type Overview](/industry/models/00) and [How to Classify Game Types](/industry/models/01).
- After aggregating the component list by genre, you know which pieces are shared; this page's component cross-reference table answers that layer.
- Only after the verdict is there priority; the gap list is ranked by demand density, not by implementation difficulty.
- The fill landing points are in the system tree, with the entry at [System Overview](/system/).

Upstream: [Common Gameplay Type Overview](/industry/models/00), [Game Genre Topics](/industry/genres/), [Grouping Game Types by Problem Domain](/design/problem-domains/). Same layer: the topical notes [10 Gameplay System Design](/24-game-types-architecture/10-gameplay-systems) and [11 Auxiliary System Design](/24-game-types-architecture/11-auxiliary-systems) unfold system by system, while this page cross-references by genre; the two lists need not correspond one to one. This page is responsible only for the one thing of "does a standalone article exist", and how a system is split internally still follows each article.

## Reference

- Genre division refers to public market classification conventions and platform tag systems; this page keeps only the dimensions that change server component requirements, and the theme dimension has been excluded.
- Facts about mature pieces are per each project's public documentation and source; the projects involved are Nakama, Colyseus, KBEngine, BigWorld, skynet, TrinityCore, Pitaya, Orleans, and Agones. Gap entries without a specific implementation are described by convention, with no invented references.
- The verdict and counting conventions are above; retrieval date 2026-10-08. Counts update in sync with this page's tables — change the table, change the counts.
- Terminology: Genre, Gameplay Feature, Coverage, Gap.

## References

- [Wikipedia · Video game genre](https://en.wikipedia.org/wiki/Video_game_genre)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [04-coverage-diff](/research/04-coverage-diff.md)
- [index](/research/index.md)
- [index](index.md)
