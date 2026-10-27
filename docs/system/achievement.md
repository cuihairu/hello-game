# Achievements and Codex

## Category

system / gameplay systems. Node positioning: Achievements and Codex are a "monotonically increasing progression object" — event subscription, idempotent progress, one-shot reward grant, and cross-gameplay event source unification: four things. Shares the progression model with the [Quest System](./quest.md); this page covers only the difference — no delivery action, progress cannot roll back, and the reward is granted automatically the instant the condition is met. Codex is the presentation-oriented variant of the achievement: on top of progress it adds collection completion and cosmetic rewards.

## Definition

An achievement is a "progress object that grants on completion": the definition supplies the criteria (which event, how many times, what combination), the player side holds the progress counter, and the moment the condition is met the server grants the reward automatically — no accept, no delivery. Codex swaps the same mechanism for presentation semantics: an entry is a set of "seen / owned / defeated" events, collection completion is set coverage, and the completion itself can carry attribute bonuses or cosmetic rewards. Both share the same storage convention: "an event set that only grows, never shrinks".

## Problem

Achievement pitfalls, in order of appearance:

- **Non-idempotent progress**: duplicate event delivery inflates the counter, or a server restart zeroes it — a "kill 1000 times" achievement completes for nothing or stays one short forever.
- **Divergent event sources**: combat, economy, and social each emit their own events in different formats, so the achievement layer becomes three subscription pipelines; adding an achievement type means wiring another one.
- **Cross-gameplay event attribution**: do PVP kills and PVE kills count as the same "kill" achievement? Without a context tag on the event, achievement evaluation can only special-case it.
- **Reward grant decoupled from reconciliation**: the grant at the moment of completion is a direct deduct/add by the caller with no voucher; when a player says they did not receive it, operations has nothing to look up.

## Algorithm

### Criteria Table: Isomorphic with Quests, Different Semantics

Achievement definitions are likewise a static table; runtime is only the counter:

```text
achievement_def:
  id:          a-2001
  criteria:    [ {type: kill, key: any, need: 1000},
                 {type: reach_level, need: 60} ]   # 多条为「与」，单条即单条件
  rewards:     [ {item: title, n: 1}, {points: 10} ]
  hidden:      false        # 隐藏成就：达成前不展示条件

achievement_progress:
  player:      u1001
  achievement: a-2001
  counters:    { kill:any: 640 }
  unlocked:    false
  unlocked_at: null
```

Three differences from quests: no prereq and no accept state (everything is directly usable from locked), counters only increase, and unlocked is the terminal state with the reward granted automatically.

### Monotonic Counters: Idempotency and Breaks

- Events carry `event_id`; the progress layer dedupes on `(achievement, criteria, event_id)` — network retries do not double-count
- The counter write precedes reward evaluation: persist the counter first, then check whether the threshold is met; after a crash recovery just recompute the evaluation and nothing is missed (eligibility is a pure function of the counter)
- No "negative progress": achievements have no failure state; needs like "break the combo and restart the count" use a new event type (`combo_broken`) rather than decrementing the counter

### Cross-Gameplay Event Sources: Tags, Not Branches

Events are unified as `{player, type, key, n, tags}`; achievement criteria filter by tag:

| Event | tags | Use |
|------|------|------|
| Kill | `pvp` / `pve` | "Total kills" unfiltered; "competitive kills" filter on pvp |
| Clear | `mode:ranked` / `mode:casual` | Ranked wins and casual wins counted separately |
| Spend | `currency:paid` / `currency:free` | Paid and free tallied separately |

One subscription pipeline, filtered by the tags in the criteria — new gameplay only needs to emit events using existing tags, zero changes at the achievement layer.

### Reward Grant: Commit on Completion, Auditable Voucher

At the moment of completion evaluation, generate a reward voucher `(player, achievement_id, rewards, unlocked_at)` and route it through the idempotent persistence path of [Settlement](./settlement.md); platform achievements such as Steam and Xbox go through platform-side reporting, in-game achievements through their own ledger — do not mix the two ledgers.

### Codex: Set Coverage and Unlock Events

A codex entry = a set member meaning "this event happened once":

- Storage is a set, not a counter: `{player, codex_id, entries: set(entry_key)}` — idempotency of duplicate events is guaranteed by set semantics naturally
- Completion = existing members / full set; computable in real time or as a periodic snapshot
- Completion bonuses (an attribute grant at a tier of completion) is a "set state → attribute recalc" subscription; see [Combat Numerics and Damage Formulas](/numerical/02) for the attribute-side convention
- Codex presentation semantics (codex page, uncollected silhouettes) is client-side expression; the server only guarantees set authority

## Used By

- **TrinityCore** (open-source MMORPG server suite, public repo and wiki): achievements and their completion criteria are likewise data tables plus evaluation conditions, sharing the event-driven progression mechanism with quests — the direct reference for this page's "criteria table". Actual table structure is per the project's public documentation.
- **WoW** (commercial MMO): the achievement system (from 2008) unified exploration, dungeons, PVP, and collection into a single achievement framework with achievement points — the commercial reference for "unified cross-gameplay event sources".
- **Hearthstone** (commercial card game): card collection and card-back rewards as a reference for "collection progress driving rewards"; the collection semantics (owned once = unlocked) matches this page's codex convention.
- **Onmyoji** (commercial mobile game): the public design of codex completion granting attribute bonuses, as a reference for "set state driving numerics".

## Related

Relationship chain: criteria table → monotonic counter → event source tags → auto reward → codex set. Each segment answers "why the next one is needed":

- Criteria must be fixed before counting — the counter is the runtime state of the criteria.
- Only when counting is idempotent can you safely go monotonic — monotonic requires duplicate events not to double-count.
- Only with accurate counts can you split event sources — tags let one pipeline serve all gameplay.
- Only with unified event sources can you auto-grant — completion is a pure function of the counter, so the grant can run unattended.
- Only with a closed-loop grant is there a codex — the codex swaps the same mechanism for presentation and collection semantics.

Upstream: [Quest System](./quest.md) (shared progression model and event format); downstream: [Settlement](./settlement.md) (reward vouchers), [Drop and Probability Design](/numerical/05) (numerical side of collection rewards), [Leaderboard](./leaderboard.md) (achievement points can enter the board, but the convention must be separated).

## Reference

- This page is a mechanics synthesis; TrinityCore's achievement table structure is per its public repo and wiki — no invented table names.
- Platform achievement conventions (Steam/Xbox) are per each developer's own documentation; separating in-game and platform achievement ledgers is this page's convention, not a platform requirement.
- Terminology: Achievement, Criteria, Unlock, Collection (codex/collection), Codex (the set of codex entries).

## References

- [Wikipedia · Achievement (video games)](https://en.wikipedia.org/wiki/Achievement_(video_games))
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [battle-pass](battle-pass.md)
- [cosmetics](cosmetics.md)
- [enhance](enhance.md)
- [genre-coverage](genre-coverage.md)
- [marquee](marquee.md)
- [quest](quest.md)
- [stamina](stamina.md)
- [territory](territory.md)
