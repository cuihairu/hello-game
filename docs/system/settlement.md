# Settlement

## Category

system / gameplay systems. Node positioning: settlement turns "a match is over / an operation is done" into an undisputed record — five things: the authoritative position, the settlement voucher, the moment it takes effect, the write-to-storage semantics, and failure recovery. Process and adjudication live in the server tree, numerical conventions in the numerical tree, and asset storage in the database tree; this page only covers the mechanism and conventions of settlement itself.

## Definition

Settlement is the commit point of a state transition: match data → settlement voucher (win/loss, score, reward list) → write into the authoritative layer (assets, leaderboards, quest progress) → reconcilable transaction records. It is isomorphic to the payment system: idempotent, traceable, compensable. The only difference is the trigger source — payment is triggered by an external request, settlement by the end of a match, and the match itself grows on top of sessions and sync.

## Problem

Settlement pitfalls, in order of appearance:

- **Missing authority**: the client computes the score and the server stamps it. This is the direct bill in the [Security and Authority](/server/security/01) case — every day the server only validates format is a withdrawal window.
- **Double write**: rewards both not granted and granted twice — with no idempotency key between the voucher and the write, retries, reconnections, and crash recovery can each execute the same settlement twice or zero times.
- **Timing mismatch**: settlement lost at the instant of a disconnect, settlement straddling versions across a season switch. The end of a match is not a moment but a window; if the window is not defined, there is no recovery.
- **Unreconcilable**: the player says they got less, and operations cannot produce a voucher to replay. If the grant records and the vouchers do not match, the settlement system is only "probably right."

Settle first "who is entitled to compute," then "when to compute and how to write"; in the wrong order, both security and consistency have to be patched afterwards.

## Algorithm

### The authoritative position

Settlement can only happen on the server. What the client reports is a trigger signal ("I finished") and process data (the operation log, for the server to recompute), not the result. Scores are computed by the server — this is the [Leaderboard](./leaderboard.md) "scores must be computed server-side" convention generalised to settlement.

### The settlement voucher

One settlement = one immutable voucher: `(match id, participant set, result, reward list, rule version)`. The voucher goes first, the write follows:

```text
match_id:      m-20261007-000481
participants:  [u1001, u1002]
result:        { winner: u1001, score: { u1001: 1520, u1002: 1487 } }
rewards:       [ {item: gem, n: 30}, {item: ticket, n: 1} ]
rule_version:  season-12-v3
```

- The voucher is the carrier of the idempotency key: the writer deduplicates on `(participant, match id, reward item)`, and a duplicate delivery is skipped outright
- The voucher carries a rule version: historical vouchers can be replayed under the old rules, so a rule hot update does not break historical reconciliation (the hot-update boundary is in [The Hot-Update System](/system/scripting/04))
- The voucher is persisted before the write (even if only to a local log): after a crash it can be replayed from the vouchers, and no account is ever lost

### The moment it takes effect

| Moment | Latency | Idempotency mechanism | Failure recovery | Applies to |
|------|------|---------|---------|------|
| Match end (real time) | seconds | voucher written immediately + dedup key | replay the voucher | competitive / matchmaking genres, immediate reward feedback |
| Periodic batch settlement | minutes ~ hours | batch number + per-item dedup | batch rerun (naturally idempotent) | seasons / daily quests / leaderboard clearing |
| Hybrid | — | real-time grants for participation + batch season clearing | two voucher layers | the mainstream combination |

- The end-of-match hook must be explicit: a match "ending" is a state-machine event, not a connection dropping — the match is still there after a reconnection, and it only counts as done after the reconnection reconciliation (reconnection semantics are in [Service Recovery](/server/services/05))
- Batch settlement must be rerunnable: batches deduplicate on `batch_id`, so a rerun is a no-op; batch settlement without deduplication double-grants on a rerun

### Write-to-storage semantics

Multi-target writes (assets + leaderboard + quest progress) — one transaction or several writes plus compensation — depends on whether the storage side can be single-sourced:

- **Same database**: one transaction wraps all writes and rolls back on failure — least effort, but requires assets, leaderboards, and progress in one database (see [Transactions, Consistency and Sharding](/database/03))
- **Cross-database**: Saga compensation — the voucher goes first, each target is written in turn, and failures are compensated item by item against the voucher; the compensation logic itself must be idempotent
- Leaderboards are a common downstream of settlement: for the combination of score into the hot layer and authoritative score into the wide table, see the hot/cold tiering in [Leaderboard](./leaderboard.md)

### Failure recovery and reconciliation

- Recovery path: as long as the voucher exists, the account exists — replay the voucher into the storage layer, and the dedup key guarantees at most one execution
- Reconciliation: match the grant records (actual storage rows) against the vouchers item by item; the difference set is the under-grant / over-grant list; for convention governance see [BI Data Definitions](/operation/bi/02)
- For the accounting model on the asset side (currency tiering, record shapes), see [The Economy System](/numerical/04)

## Used By

- **BigWorld** (commit `088d3b84`, paths relative to `programming/bigworld/`): writing to storage is an explicit action — DBApp::writeEntity handles the writeEntity message (`server/dbapp/dbapp.cpp:2288-2294`), and persistence registration at logout/revive is in the same file (around `:743-745`); periodic autosave does not appear in the source — settlement timing is triggered explicitly by the script layer, and if the script does not call it nothing is written.
- **Colyseus** (commit `e620123`): the settlement hooks sit in the room lifecycle — onCreate/onJoin/onLeave/onDispose (`packages/core/src/Room.ts:674`, `:682`, `:704`, `:789`), where onDispose is the framework-given match terminus; the framework has no built-in game-result persistence (`database.boot` only pulls the platform-side account SQL layer, `packages/core/src/Server.ts:462`) — the settlement layer is entirely self-built.

## Related

Relationship chain: authoritative position → settlement voucher → moment of effect → write semantics → failure recovery → reconciliation. Each segment answers "why the next one is needed":

- Only with authority settled is there a voucher: the voucher is the physical evidence of the authoritative result, and without it neither idempotency nor reconciliation can be discussed.
- Only with a voucher is there a timing: real time or batch depends on the voucher's production rhythm and the latency the downstream tolerates.
- Only with a timing is there a write: single transaction or compensation chain is decided by how single-sourced the asset storage is.
- Only once written is there reconciliation: when vouchers and grant records match, the settlement system moves from "probably right" to "provably right."

Upstream: [Security and Authority](/server/security/01) (the security motive for who is entitled to compute), [Skill System](./skill.md) (one source of settlement output); downstream: [Transactions, Consistency and Sharding](/database/03), [BI Data Definitions](/operation/bi/02), [Leaderboard](./leaderboard.md) (the board's writer).

## Reference

- This page is a synthesis of engineering experience; the two engines' facts are per the commit-anchored source references in the text
- Transactional conventions for idempotency and compensation: [database tree, Transactions and Consistency](/database/03)
- Terminology: Settlement, Settlement Voucher, Idempotency Key, Reconciliation

## References

- [Wikipedia · Game balance](https://en.wikipedia.org/wiki/Game_balance)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [01](/server/security/01.md)
- [index](/server/sync/index.md)
- [achievement](achievement.md)
- [battle-pass](battle-pass.md)
- [checkin](checkin.md)
- [cosmetics](cosmetics.md)
- [enhance](enhance.md)
- [genre-coverage](genre-coverage.md)
- [index](index.md)
- [marquee](marquee.md)
- [quest](quest.md)
- [skill](skill.md)
- [stamina](stamina.md)
- [territory](territory.md)
