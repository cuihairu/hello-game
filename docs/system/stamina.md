# Stamina and Attempt Gating

## Category

system / gameplay systems (economy gate). Node positioning: stamina and attempt gating turn "an infinitely farmable action" into "action on a budget" — recovery, cap, consumption, reset, and purchase limit: five things. It is the economy's valve: it controls how wide the faucet opens on the output side; the faucet-and-pool convention lives in the [Drop and Probability Design](/numerical/05) of the numerical tree and in the economy tree, and consumption vouchers go through [Settlement](./settlement.md). This page covers only the gating mechanism itself.

## Definition

Stamina (Stamina/Energy) is an action resource that recovers with time: an action spends stamina, time returns stamina, and a cap sets the ceiling. Attempt gating is its discrete variant: no resource is stored, only the number of actions is limited per natural time window (day/week). The two share one essence — **handing the player a budget for acting**. The difference is the storage convention: stamina is a balance (partially consumable), attempts are a windowed counter (zeroed out as a whole when the window ends).

## Problem

Gating pitfalls, in order of appearance:

- **Recovery timing is miscounted**: the client countdown ticks on its own while the server also ticks its own timer — the two drift, and the recovery time the player sees does not match the server's actual value; recovery is missed while a timer is offline.
- **Day-boundary jitter**: the reset is computed in the player's local timezone, so players on the same server have different "days"; the reconciliation convention for leaderboards and daily quests goes chaotic along with it.
- **Purchase and limit are non-idempotent**: retries of the stamina purchase payment callback, or a lost limit counter, cause over-deduction or over-granting.
- **Cap changes overflow**: a temporary cap raise during an event leaves stamina above the cap when the event ends — recover it or keep it, and without a convention it is decided ad hoc on the spot.
- **Stamina becomes tradeable**: a budget that can be transferred is a currency; studios farm stamina and resell it, and the economy's defensive line fails.

## Algorithm

### Recovery Model: Server-Side Lazy Evaluation, No Timers

The recovery amount is computed on the fly at **read time** from the time delta; there is no per-player recovery timer:

```text
stamina_state:
  player:        u1001
  stamina:       87
  cap:           120          # 基础上限，活动 buff 可临时调
  recover_interval: 300       # 每 5 分钟回 1 点
  last_recover_ts:  2026-10-09T09:40:00Z

read 时结算:
  elapsed = now - last_recover_ts
  gain    = floor(elapsed / recover_interval)
  stamina = min(cap, stamina + gain)
  last_recover_ts += gain * recover_interval   # 只推进整倍数，余数保留
```

- Timers belong only to presentation such as "cap-reached reminders" and take no part in settlement — recovery is not lost on service restart or disconnect
- `last_recover_ts` advances by whole multiples only: time elapsed after the cap is full is not converted into overflow
- A cap change (level up, event buff) affects only the next settlement and **neither refunds nor recovers** — after a temporary buff expires the above-cap remainder is kept and is naturally consumed by the next spend
- Once stamina is full, `last_recover_ts` is snapped to the current moment, avoiding a convention conflict where a full tank would appear the instant you return after being offline all night

### Reset: Server Day, Lazily Triggered

A reset always follows the **fixed-server-timezone** natural day, never the player's local timezone:

```text
attempt_counter:
  player:      u1001
  action:      raid_entry          # 副本次数 / 商店限购 / 体力购买
  window_key:  20261009            # 服务器日，周门控用 ISO 周
  count:       2
  limit:       3
```

- The reset is triggered lazily: the request carries a `window_key`, and if it does not match the current server day it is zeroed first and then evaluated — no daily scheduled task needs to scan all players
- Daily quest resets, stamina purchase limits, and raid attempts share this one windowed counter table, with `action` distinguishing the use
- The "remaining attempts today" display on the player side reads from the same table; the client does not count down to the next day on its own — the next-day boundary is the server day

### Consumption and Purchase: Vouchers and Idempotency

- Spending stamina is a settlement action: write the consumption voucher `(player, action, cost, reason)` first, then update the balance — a crash can be replayed, isomorphic with [Settlement](./settlement.md)
- Stamina purchase goes through the payment callback with idempotency key `(player, order_id)`; the limit counter increments in the same transaction and is rejected if exceeded — there is no "deduct first, check limit later" window
- Stamina is **not giftable and not tradeable**: a transferable budget is a secondary currency, the entry point for studio arbitrage; friend-gifted stamina designs only gift "attempts" with a very small cap, which is a widely observed industry red line rather than an original of this repo

### Wiring Gating into Gameplay

Gating is the gate; the gameplay side asks only one question: "is there budget for this action":

| Action | Gating form | Window |
|------|---------|------|
| Farm a dungeon | Stamina consumption | No window, balance-based |
| Raid attempts | Attempt gating | Day |
| Buy stamina | Purchase limit | Day |
| Arena challenge | Attempt gating | Day (additional purchasable) |
| Weekly quests | Attempt gating | Week |

Stamina consumption coupling with daily quests ("spend 100 stamina" style dailies) is via events: the gating layer emits a `stamina_spent` event, which [Quest System](./quest.md) and [Achievements](./achievement.md) subscribe to and count; the gating layer does not know quests exist.

## Used By

- **Genshin Impact** (commercial mobile game): Resin stamina (publicly documented cap and per-minute recovery), Condensed Resin folding "many consumptions" into "one consumption with many returns", and Daily Commissions resetting on the server day — references for the recovery model and reset convention.
- **Fate/Grand Order** (commercial mobile game): AP stamina cap growing with player level, and stamina refilling on level up — a reference for not recovering on cap changes.
- **Candy Crush** (commercial match-3): lives-based (the time-recovery version of attempt gating) + friend life gifts — a reference for the "giftable but capped" red line.
- **Shuaitu Zhibin / Three Kingdoms: Tactics Edition** (commercial SLG): action points and government orders gating world-map actions — a reference for extending gating from "anti-farming" to "pacing control".
- **Open-source convention**: general open-source servers such as TrinityCore and Nakama do not include stamina or attempt gating built in; such components are built at the business layer — this page is a convention synthesis, and there is no directly reusable general open-source implementation.

Reference analysis: Genshin's Resin values = borrowable (the recovery and cap convention lands in this page's recovery model; do not copy the actual values); FGO's refill-on-level-up = borrowable (the no-recovery-on-cap-change rule lands in the overflow handling); Candy Crush's gifts = borrowable (the capped-gifting red line lands in the consumption section); Shuaitu Zhibin / Three Kingdoms: Tactics action points = borrowable (the pacing-control view, landing in gameplay pacing under the design tree); open source has no built-in = not applicable (this page is where the self-built convention lands).

## Related

Relationship chain: recovery model → reset window → consumption by voucher → gameplay wiring. Each segment answers "why the next one is needed":

- Only once the recovery model is set is there a stable "budget supply" — lazy settlement guarantees the ledger is not lost on disconnect or restart.
- Only once the supply is set can you talk about windows — attempt gating and daily resets share the windowed counter table.
- Only once the window is set can you safely deduct — consumption must go through a voucher, and the limit and payment idempotency close the loop.
- Only once deductions are clean can you wire gameplay — gating emits events, and quests, achievements, and battle passes each take what they need.

Upstream: [Settlement](./settlement.md) (consumption vouchers), [Drop and Probability Design](/numerical/05) (numerical side of exchanging stamina for output); downstream: [Quest System](./quest.md) and [Achievements and Codex](./achievement.md) (consumption event subscription), battle pass and event pages (stamina-driven progress and operational gates; node pending).

## Reference

- This page is a mechanics synthesis; the specific values for Genshin/FGO/Candy Crush/Shuaitu Zhibin are per each official public source — this page cites only the convention, not value details.
- The red line that stamina is not tradeable is a synthesis of widely practiced industry practice, not from a single source.
- Terminology: Stamina/Energy, Cap, Recovery Interval, Server Day, Attempt Limit, Lazy Evaluation.

## References

- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)
- [Wikipedia · Game balance](https://en.wikipedia.org/wiki/Game_balance)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [battle-pass](battle-pass.md)
- [checkin](checkin.md)
- [genre-coverage](genre-coverage.md)
