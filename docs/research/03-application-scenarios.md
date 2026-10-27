# Application Scenarios Comparison

## Category

research / survey three. Node position: place the topics extracted by the survey back into concrete gameplay genres, answering "which topic is tight on which type of game." The genre list, component needs and judgments all reference the 21 genres in [Genre and Functional Component Coverage Comparison](/system/genre-coverage); this page does not establish a separate genre criterion, only adding the "survey topic → genre → scenario" layer.

## Definition

The same topic carries a different weight across genres by an order of magnitude: task progress is a three-line config for match-three, but all the content volume for an MMORPG; voice is irrelevant for board games but standard equipment for party games. So gap ordering cannot go by implementation difficulty; it must go by genre demand density. The gap list on the [coverage comparison page](/system/genre-coverage) has given one ordering, and this page rechecks it from the genre perspective.

## Problem

The survey itself only answers "is it there," not "what do we write first." If we backfill a knowledge base in survey order, we will first backfill engine details — the kind of thing you can look up anywhere — and leave items like check-in and marquee, the "operations needs them the moment an event goes live, and there is no ready-made article anywhere on the net," for last. This page walks through by genre; the resulting order matches the coverage comparison page. Two places independently produce the same order, showing this ordering was not pulled out of thin air.

## Walking Through by Genre

The genres in the left column of the table below, along with "the functional component required first," are taken directly from the genre list on the [coverage comparison page](/system/genre-coverage); the middle column lists the items judged as gaps among the components that genre needs; the right column gives the backfill landings.

| Genre | First-required components listed on the comparison page | Those judged as gaps | Backfill landing |
| --- | --- | --- | --- |
| Board/card match games | Rooms and hosting, shuffle and randomness evidence, settlement and reconciliation, anti-cheat | none | existing articles |
| Party and room light-competitive | Rooms and lobby, quick start, disconnect/reconnect, in-room broadcast and voice | voice | [Team and Room Voice](/system/voice) |
| Match-three and casual puzzle | Levels and attempt counts, stamina and reset, level leaderboards, ads and in-app purchase | stamina and attempt gating | [Stamina and Attempt Gating](/system/stamina) |
| Music rhythm | Judging and anti-cheat, score boards, song library versions and config | none | existing articles |
| MOBA | Sync and arbitration, skills and buffs, matchmaking and tiers, replay and anti-cheat | cosmetics and skins (the "cosmetics, skins and dress-up" row of the component table) | [Cosmetics and Skins](/system/cosmetics) |
| FPS / TPS and tactical shooters | Hit detection and compensation, anti-cheat, matchmaking and teams, spectator replay | voice (the "voice" row of the component table) | [Team and Room Voice](/system/voice) |
| Fighting | Rollback networking, determinism, input latency, disconnect loses | none | existing articles |
| Racing and sports | Sync and interpolation, score boards, rooms and restarts | none | existing articles |
| RTS and real-time tactics | Command sync, pathfinding and bulk updates, high-frequency objects and broadcast, replay | none | existing articles |
| Tower defense | Waves and level config, character growth, sweep and attempt counts | equipment enhancement and star-up, stamina and attempt gating | [Equipment Enhancement and Star-Up](/system/enhance), [Stamina and Attempt Gating](/system/stamina) |
| Card and CCG | Effect chains and state machines, randomness and pity, quests/achievements and dex, arena settlement | quests, achievements, dex | [Quest System](/system/quest), [Achievements and Dex](/system/achievement) |
| Auto-chess | Rooms and turn advancement, randomness and pity, economy and XP, in-match settlement | none | existing articles |
| Turn-based RPG and tactics | Effect chains and settlement order, checkpoint resume, log replay | quests, achievements | [Quest System](/system/quest), [Achievements and Dex](/system/achievement) |
| ARPG and loot-farming dungeons | Skills and hit detection, drops and pity, dungeons and attempt counts, asset audit | stamina and attempt gating | [Stamina and Attempt Gating](/system/stamina) |
| MMORPG and open world | AOI and sharding, quests and achievements, guilds and trading, server merge and cross-server | quests, achievements, in-game announcements | [Quest System](/system/quest), [Achievements and Dex](/system/achievement), [In-Game Announcements and Marquee](/system/marquee) |
| SLG and 4X seasonal sandbox | Persistent world and timers, alliances and diplomacy, seasons and settlement, territory and permissions | home and territory permissions, seasonal battle pass | [Home and Territory](/system/territory), [Seasonal Battle Pass](/system/battle-pass) |
| Idle and AFK cultivation | Idle production, offline gains, events and check-in, gacha and parallel growth lines | check-in and redeem codes, seasonal battle pass | [Check-in, Welfare and Redeem Codes](/system/checkin), [Seasonal Battle Pass](/system/battle-pass) |
| Sim management and life | Production/consumption loop, friend visits, home and saves, shop and pricing | home and territory permissions (shop and gift pack judged partial) | [Home and Territory](/system/territory) |
| Survival crafting and sandbox | Object persistence, region load, territory and anti-destruction, server merge and wipe | home and territory permissions | [Home and Territory](/system/territory) |
| Roguelike and Roguelite | Random seeds and reproduction, in/out-of-match state separation, unlocks and dex | dex and collection | [Achievements and Dex](/system/achievement) |
| UGC and platform ecosystem | Review and permissions, sandbox isolation, economy and revenue share, accounts and minor protection | none | existing articles |

**Conclusion: of 21 genres, 14 need backfill and 7 do not; among the backfill items, the one demanded by the most genres simultaneously is quests and achievements (card, turn-based RPG and MMORPG — three big genres all depend on it), followed by stamina and attempt gating (match-three, tower defense, ARPG) and home/territory (SLG, sim management, survival crafting). This ordering matches the gap ordering on the coverage comparison page exactly.**

## Looking at Genres Backwards by Topic

- **Quests and achievements**: the larger the content volume, the tighter it gets. An MMORPG's main and side stories, card games' daily and weekly, turn-based RPG story quests — the substrate is the same "definition table + event-driven progression + one-time reward," so one article serves three genres; no need to split by genre.
- **Stamina and attempt gating**: a pacing gate. Match-three limits by stamina, ARPG limits by dungeon attempts, tower defense adds a sweep — the difference is only recovery rate and reset criterion; the body is the same idempotent logic reset by server day.
- **Home and territory**: whose space is it, who may change it, how is destruction accounted for. SLG is territory ownership, sim management is home saves, survival crafting is anti-destruction; all three share a spatial substrate and permission bits, differing only at the rules layer.
- **Check-in, redeem codes and seasonal battle pass**: operations pacing items, heaviest for casual and idle. These three are demanded within the first week after an event goes live — the "if we don't ship it, we can't go live" type.
- **Voice and in-game announcements**: downstream channels. Voice needs a third-party SDK; announcements need business-layer frequency control and ordering. Both cross client and server, so only a standalone article can make the boundary clear.
- **Cosmetics and skins**: the main paid item for MOBA and anime-styled games — inventory ownership, wear/unequip authority and in-match visibility are sandwiched between entity presentation and sync.
- **Equipment enhancement and star-up**: a resource sinkhole for tower defense and cultivation games; failure protection and material recovery are high-incident points, and the probability criterion is shared with [Drops and Probability Design](/numerical/05).

## Genre Distribution of Covered Topics

The groups sync and arbitration (MOBA, FPS, fighting), matchmaking and tiers (all competitive genres), AOI and sharding (MMORPG, sandbox, RTS), and payment and reconciliation (all) are all judged covered on the comparison page; this survey's books and docs dimensions also found no new problems. The two sides corroborate: where the writing is thick the external material lines up, and where the writing is thin the external material also points at the same set of gaps.

## Related

Chain of relations: genre demand density → gap ordering → backfill landing → landing recheck. Each segment answers "why is the next one needed":

- The genre list alone gives no ordering; first order once by demand density, and the "those judged as gaps" column of this page's table 1 carries that layer.
- Only after ordering do you know where to place the landing — the 14 genres' backfill needs collapse into 10 new articles plus 1 expansion.
- After landings are built, they must be rechecked — see the diff roll-up and per-article list in [Coverage Diff Table](/research/04-coverage-diff).

Upstream: [Research Overview](/research/). Peers: [Authoritative Books Survey](/research/01-authoritative-books), [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs), [Coverage Diff Table](/research/04-coverage-diff). Upstream: [Genre and Functional Component Coverage Comparison](/system/genre-coverage), [Overview of Common Gameplay Types](/industry/models/00), [Game Type Features](/industry/genres/).

## Reference

- The genre list and the "first-required functional component" column are taken from [Genre and Functional Component Coverage Comparison](/system/genre-coverage); judgment date 2026-10-08. This page only references and merges; it does not change that page's criterion.
- Backfill landings are this survey's output; file paths follow the articles that actually exist under `docs/system/`.
- Terminology crosswalk: Genre Density, Application Scenario.

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](01-authoritative-books.md)
- [02-engine-middleware-docs](02-engine-middleware-docs.md)
- [04-coverage-diff](04-coverage-diff.md)
- [index](index.md)
