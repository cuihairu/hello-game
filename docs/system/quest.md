# Quest System

## Category

system / gameplay systems. Node positioning: a quest turns "a piece of gameplay narrative written by the designer" into "a progress object the server can advance, reward, and reconcile" — four things: definition, progress, chained prerequisites, and reward grant. The data-table pipeline is in [Config Tables and the Data-Driven Pipeline](/production/05), reward vouchers in [Settlement](./settlement.md), and the numerical conventions for output and reclamation live in the numerical tree; this page only covers the progress mechanism itself.

## Definition

A quest is a "progress object with conditions": a quest definition gives the objectives (what to do, how many times), the prerequisites (can it be accepted), and the rewards (what you get when it is done), and the player side holds one progress record. It is isomorphic to [Achievements and Codex](./achievement.md) — both are event-driven counters and state checks — the difference being that a quest has two explicit nodes, accept and turn-in, and can be abandoned and re-accepted, whereas achievement progress only grows and has no turn-in action. Quests and achievements share the same progress model; they are written separately only because operations treats the two with different mental models.

## Problem

Quest pitfalls, in order of appearance:

- **Progress coupled to business logic**: the "kill 3 wolves" check is hardcoded into the combat code, so adding one quest means changing the battle server once. Once the quest count grows, the combat code is full of `if quest_id == 1001`.
- **Chained prerequisites breaking the chain**: quest A completing should unlock quest B, but the player's progress record and the prerequisite record live in two places, the prerequisite check reads a stale snapshot, and the result is "did A but cannot accept B."
- **Duplicate rewards**: turn-in retries, reconnection replays, and crash recovery can each grant the same reward twice or zero times — the same idempotency problem as settlement.
- **Progress rollback**: duplicate event delivery (network retransmission) over-counts "kills," or a server restart loses the progress held in memory.

Settle first "who advances progress" (the event source), then "when to grant the reward" (the turn-in commit point), and last "how prerequisites are judged" — in the wrong order, the after-the-fact patches for chained quests are the hardest to write.

## Algorithm

### Progress model: definition and runtime state separated

The quest definition is static data; the runtime state is one progress record:

```text
quest_def:                       # 静态表，策划维护，热更可换
  id:            q-1001
  objectives:    [ {type: kill, key: wolf, need: 3},
                   {type: collect, key: pelt, need: 2} ]
  prereq:        [ q-1000 ]
  rewards:       [ {item: gem, n: 10}, {exp: 500} ]
  rule_version:  v3

quest_progress:                  # 运行态，每玩家每条任务一行
  player:        u1001
  quest:         q-1001
  state:         in_progress     # locked / available / in_progress / completed / rewarded
  counters:      { kill:wolf: 1, collect:pelt: 0 }
  updated_at:    2026-10-09T10:00:00Z
```

Runtime state stores only "counters + state," not text or rewards — those are read from the definition table each time. That way changing text or tuning rewards only touches the table, never player data.

### Progress advancement: event-driven, not polling

The server emits player actions as a unified event (kill, pick up, arrive, dialogue), and the quest layer subscribes to events and matches `(type, key)` to increment counters:

- The event source must converge: combat, pickup, and movement each emit their own events, but the format is unified into `{player, type, key, n}`, and the quest layer only recognises this one format
- The increment must be idempotent: an event carries a unique `event_id`, and the progress record stores the most recently processed event_id or deduplicates on `(quest, objective, event_id)`, so network retransmission does not over-count
- Counters only growing is a simplifying premise: quests that need "decrease" (such as "stay undetected") use a state check rather than a counter, a separate class

### Chained prerequisites: a state machine, not a snapshot

The quest state machine and its relation to prerequisites:

| State | Meaning | Entry condition |
|------|------|---------|
| locked | prerequisites unmet | initial state, prerequisite quest not yet rewarded |
| available | can be accepted | all prerequisites rewarded (judged against runtime state in real time, not a snapshot) |
| in_progress | in progress | player accepts |
| completed | objectives met, awaiting turn-in | every objective counter has reached its target |
| rewarded | reward granted, terminal | turn-in commit succeeded |

The prerequisite check must read runtime state, not a cached snapshot — that is the root cause of "did A but cannot accept B." At the moment a prerequisite quest becomes rewarded, write a "pending unlock" record; when the player comes online, refresh available states from those records, avoiding a full-table scan.

### Reward grant: turn-in is the commit point

Turn-in (the moment of the turn-in action) is the commit point, sharing the voucher convention with [Settlement](./settlement.md):

- At turn-in, write the reward voucher `(player, quest_id, rewards, rule_version)` first, then persist — voucher first, replayable after a crash
- Persistence deduplicates on `(player, quest_id)` — a duplicate turn-in is skipped outright
- The difference between one-time and daily quests is only the reset rule: dailies reset progress on the server day (the reset convention follows the same kind of problem as the stamina page), while one-time quests are terminal once rewarded

### Automatic turn-in vs manual turn-in

| Form | Trigger | Benefit | Cost |
|------|------|------|------|
| Automatic turn-in | reward granted the moment objectives are met | one fewer click, immediate feedback | the player never sees the "completion" ritual; hard to align the grant timing when the connection drops |
| Manual turn-in | the player presses "turn in" | an explicit completion ritual; can be abandoned before turn-in | must handle the dangling state of "completed but not turned in" |
| Hybrid | dailies automatic, mainline manual | takes the best of both | both paths must be tested |

## Used By

- **TrinityCore** (open-source MMORPG server suite, public repo and wiki): quest definitions, completion conditions, and rewards each live in their own data tables, the server advances progress by event, and adding a quest does not change engine code — the direct reference for this page's "definition and runtime state separated." Actual table names defer to the project's public documentation.
- **WoW** (commercial MMO): the publicly known design facts of quest chains, daily/weekly quests, and the quest log cap, as a commercial reference for chained prerequisites and reset rules.
- **FF14** (commercial MMO): the mainline quest gate and quest synchronisation mechanic (mainline progress locking dungeon unlocks) as a reference for "quests as a gameplay gate."
- **Genshin Impact** (commercial mobile game): the daily-reset and Travel Log quest linkage of daily commissions, as a reference for daily quests and operational quests coexisting.

Reference analysis: TrinityCore's tabling of quest data = reference-worthy (definition/runtime separation lands directly in this page's progress model); WoW quest chains and dailies = worth borrowing (chained prerequisites and reset rules land in the state machine and the one-time/daily section); FF14's mainline locking dungeons = worth borrowing (quests as a gameplay gate, landing in the design tree's progression design); Genshin Impact daily commissions = reference-worthy (daily reset coexisting with operational quests, landing in the count-gated window table); event-driven idempotency = worth borrowing (lands in the progress advancement section, aligned with the settlement voucher convention).

## Related

Relationship chain: progress model → event advancement → chained prerequisites → reward grant → turn-in form. Each segment answers "why the next one is needed":

- Only with the progress object defined can advancement be discussed — without runtime state, events have nowhere to land.
- Only once it can advance are prerequisites needed — a chained quest's prerequisite check must read runtime state, or the chain breaks.
- Only with smooth prerequisites are rewards granted — turn-in is the commit point, and a first-persisted voucher guarantees neither duplicate nor missing grants.
- Only with the grant path fixed is the turn-in form chosen — automatic versus manual decides whether anyone stands between "completed" and "rewarded."

Upstream: [Config Tables and the Data-Driven Pipeline](/production/05) (how definition tables are hot updated), [Skill System](./skill.md) (a common event source for quest objectives); downstream: [Achievements and Codex](./achievement.md) (isomorphic event subscription), [Settlement](./settlement.md) (the persistence convention of reward vouchers), [Drops and Probability Design](/numerical/05) (the numerical side of quest rewards).

## Reference

- This page is a synthesis of mechanics; TrinityCore's table structure defers to its public repo and wiki, with no invented table or column names.
- Reward vouchers and the idempotency convention: [Settlement](./settlement.md) and [Transactions, Payments and the Economy System](./services/03.md).
- Terminology: Quest, Objective, Prerequisite, Turn-in, Daily Reset.

## References

- [Wikipedia · Quest (role-playing game)](https://en.wikipedia.org/wiki/Quest_(role-playing_game))
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [achievement](achievement.md)
- [battle-pass](battle-pass.md)
- [checkin](checkin.md)
- [genre-coverage](genre-coverage.md)
- [marquee](marquee.md)
- [stamina](stamina.md)
- [territory](territory.md)
