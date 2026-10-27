# Battle Pass and Season Track

## Category

system / gameplay systems (seasonal operations component). Node positioning: the battle pass turns "activity within a season" into "a presentable, purchasable, settleable dual-track progress" — season window, experience levels, dual-track rewards, and season switch: four things. The progress event source shares a pipeline with the [Quest System](./quest.md), the season reset shares a window convention with [Stamina and Attempt Gating](./stamina.md), and claiming and payment go through [Settlement](./settlement.md) vouchers.

## Definition

A Battle Pass (Battle Pass/Season Pass) is a **season-limited progress reward track**: within the season window the player accumulates experience through actions and unlocks rewards level by level, with rewards split into a free track and a premium track. The difference from check-in: check-in is a per-day stamp with fixed rewards; the battle pass is action-accumulated with per-level rewards. The difference from achievements: achievements are permanent and only increase; the battle pass zeroes and restarts each season. The premium track is a one-time IAP-unlocked "extra column of rewards", not gacha and not subject to probability.

## Problem

Battle-pass pitfalls, in order of appearance:

- **Double-counted progress events**: the same "completed a match" event is subscribed to by quests, achievements, and the battle pass; get one idempotency wrong and the progress inflates or the three disagree.
- **Season-switch zeroing disputes**: there is no plan for how progress, unclaimed rewards, and payment status are handled at the switch moment, and the switch day is full of support complaints.
- **Buying levels concurrent with progress**: a player is grinding experience and buying levels at the same time, two paths writing to the same progress, under-adding or over-adding under concurrency.
- **Premium track granting mistakes**: after unlocking the premium track, backfilling the whole column of historical rewards — both missed and duplicate grants have caused incidents.
- **End-of-season rush load**: the final hours before the deadline concentrate season quest completion, and the event flood crashes the progress pipeline.

## Algorithm

### Structure: Season Definition + Player Progress

```text
pass_def:                          # 赛季静态配置，运营维护
  season:        s2026q4
  start:         2026-10-01
  end:           2026-12-31
  exp_per_level: 1000              # 线性：每级固定经验
  levels:        60
  free_rewards:  { 1: [item:a], 2: [currency:g100], ... }
  prem_rewards:  { 1: [skin:x], 5: [item:b], ... }

pass_progress:                     # 每玩家每赛季一条
  player:   u1001
  season:   s2026q4
  exp:      4300
  level:    4
  premium:  false
  claimed:  {free: [1,2], prem: []}
```

- The level curve is **linear** (fixed experience per level): the battle pass's reward expectations must be mentally computable, and a complex curve makes "how much more to the next level" lose its perceptual anchor
- `claimed` is recorded separately per track, with the claim idempotency key `(player, season, track, level)`
- Buying a level = adding experience directly (`exp += n * exp_per_level`), going through the **same entry point** as experience gained by fighting; level is a pure function of experience — the concurrency problem reduces to single-entry-point idempotency

### Progress: Subscribe to the Unified Event Source, Same Pipeline as Quests and Achievements

- The battle pass does not create new events: it subscribes to the same `{player, type, key, n, tags}` event stream as [quests](./quest.md) and [achievements](./achievement.md), with each system **counting independently** — the solution to double-counting is not a shared counter but each system doing its own idempotency correctly
- Season quests ("complete 10 ranked matches this week") are a window-reset form of quests, not a separate quest set built inside the battle pass
- Event flood: the end-of-season rush is handled by **entry-side rate limiting and batch settlement**; progress aggregation can be delayed (eventual consistency), not refreshed per-event in real time

### Claiming: Two Tracks, Two Columns, Credited by Voucher

| Track | Unlock condition | Claim form |
|------|---------|---------|
| Free track | None | Claim on reaching the level or claim manually |
| Premium track | One-time IAP unlock of `premium` | Claim after reaching the level, per-level vouchers |

- Unlocking the premium track does **not automatically backfill** premium rewards for levels already passed — the convention is "back-claimable after unlock" (the player claims themselves, idempotent per level), avoiding the missed/duplicate grant incidents of a server-side batch backfill
- The IAP callback idempotency is by order number (the same convention as [Trading, Payment, and Economy](./services/03.md)), and the `premium` marker is written before claiming is discussed
- Claiming goes through [Settlement](./settlement.md) vouchers: dedupe on `(player, season, track, level)`, and duplicate claims are skipped outright

### Season Switch: Snapshot, Backfill, Zero

```text
赛季结束时（或玩家首次进入新赛季时惰性执行）:
  1. 快照旧赛季进度（等级、已领、未领）
  2. 未领奖励 → 生成限时邮件（过期回收，见运营发奖节点）
  3. 新赛季 pass_progress 新建，exp=0, level=0
  4. premium 不继承（行业通行）；续购激励用折扣券，不用状态继承
```

- The switch is triggered **lazily** (settled when the player first comes online), not by a scheduled full scan — the same philosophy as [check-in](./checkin.md) and stamina gating
- The validity of backfilled unclaimed rewards must be **clearly shorter than one season**, avoiding "last season's mail" piling up into the next season
- The coupling convention between leaderboards and season settlement rewards is in [Leaderboard](./leaderboard.md): season boards reset with the season, and the battle-pass experience board (if any) does the same

## Used By

- **Fortnite** (commercial battle royale, publicly available Epic Games material): the mature form of the season-based Battle Pass — season window, per-level unlock, premium track, and time-limited season-exclusive cosmetics — the direct reference for this page's structure layer.
- **Hearthstone** (commercial card game, publicly available Blizzard material): the 2020 reward-route revision weakened the premium track and lengthened the free track — a reference for the "free-track-dominant" variant.
- **Genshin Impact** (commercial mobile game): its season pass track (premium track + level-purchase cap + quest-driven experience) is a reference for the mobile variant of "premium track + quest experience source".
- **Honor of Kings / Game for Peace** (commercial Tencent mobile games): season-based battle pass coupled with season rank settlement — a reference for "battle pass and season settlement rewards running in parallel".
- **General open-source servers** (Nakama, TrinityCore, etc.): no built-in battle-pass component; Nakama's tournaments/leagues provide seasonal competition primitives, and the battle pass's business convention is self-built — this page is a convention synthesis.

Reference analysis: Fortnite's season structure = worth referencing (season window / dual track / time-limited retraction land directly in this page's structure layer); Hearthstone's free-track variant = borrowable (the differentiation of a lengthened free track, landing in commercialization design under the design tree); Genshin's journey pass = worth referencing (level purchase and the quest experience source land in the level-buying and progress section); Honor of Kings' season coupling = borrowable (coupling with the season board, landing in the leaderboard page); Nakama's competition primitives = borrowable (the seasonal host, landing in services under the server tree, not expanded here).

## Related

Relationship chain: season structure → progress events → dual-track claiming → season switch. Each segment answers "why the next one is needed":

- Only once the season structure is set can you talk about accumulating experience — the window and level table are the container for progress.
- Only with the container do you hook events — the battle pass does not create an event source, it subscribes to the unified event stream, and each system does its own idempotency correctly.
- Only with accurate progress do you dare to grant two columns — the free/premium tracks' claim vouchers are idempotent on `(player, season, track, level)`.
- Only once claiming closes the loop can you discuss the switch — snapshot, backfill, and zeroing go through lazy settlement in three steps, so the switch day has no incidents.

Upstream: [Quest System](./quest.md) (season quests and event sources), [Settlement](./settlement.md) (claim and IAP vouchers), [Trading, Payment, and Economy](./services/03.md) (payment-unlock order convention); downstream: [Leaderboard](./leaderboard.md) (season-board coupling), [Drop and Probability Design](/numerical/05) (numerical side of battle-pass rewards), [Stamina and Attempt Gating](./stamina.md) (season window and server day).

## Reference

- This page is a mechanics synthesis; the battle-pass rules (number of levels, experience curve, price) of each commercial case are per each official public source — this page cites only the structural convention.
- Terminology: Battle Pass, Season, Track, Premium, Tier/Level, Season Reset.

## References

- [Wikipedia · Battle pass](https://en.wikipedia.org/wiki/Battle_pass)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [cosmetics](cosmetics.md)
- [genre-coverage](genre-coverage.md)
