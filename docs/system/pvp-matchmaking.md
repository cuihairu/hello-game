# PVP Matchmaking

> Angle note: this page records the mechanism trade-offs of the rating system and the matchmaking pool; for service responsibilities and room allocation see [Self-Built Architecture Placement](/24-game-types-architecture/23-matchmaking-architecture), and for capability trade-offs among open-source components see [Matchmaking Project Selection Survey](/24-game-types-architecture/22-matchmaking-oss). These are different angles on the same topic.

## Category

system / gameplay systems. Node positioning: the rating system and the matchmaking pool are two decoupled layers, selected separately — ratings choose ELO/Glicko/TrueSkill, matchmaking chooses window widening, priority queues, and backfill degradation. The sister node for squads and room shapes is "Party Matchmaking."

## Definition

PVP matchmaking is a two-layer system: the **rating system** (give every player a comparable score) and the **matchmaking pool** (use the score to decide who plays with whom). The two layers can be selected independently.

## Problem

Changing ratings and matchmaking together makes them blame each other: an inaccurate score blames the window for being too wide, a too-long wait blames the ratings for not working. Once the three red lines break, the ranking system is destroyed by score farming and experience incidents together — ratings must be computed server-side, window widening must be monotonic, bots must be labelled. Decouple the two layers first, then select each on its own; after launch you must still close the loop: win-rate regression speed and wait-time P95 are the two hard metrics of matchmaking quality.

## Algorithm

### Classic mode: ELO rating

ELO comes from the chess rating system, and three lines of formulas tell the whole story:

```text
期望胜率：E_A = 1 / (1 + 10^((R_B - R_A) / 400))
赛后更新：R_A' = R_A + K · (S_A - E_A)     S_A ∈ {1, 0.5, 0}
```

Plug in a recomputable example: a 1200-rated player against a 1400-rated player, E = 1/(1+10^(200/400)) ≈ **0.240**; if the underdog wins with K=32, then R' = 1200 + 32×(1 − 0.240) ≈ **1224.3** (+24.3 points). The losing side symmetrically loses 24.3 — the total of scores is approximately conserved (off by a K scaling factor), which is the foundation of ELO for competitive games.

Engineering points:

- **Tiered K value**: K=64 in the new-player phase for fast placement, K=32 once stable, back to K=64 after long inactivity — K is the tuning knob for "responsiveness vs stability"
- **Anti-farming**: rate-limit repeated matchmaking within the same segment, cap win streaks (a daily gain ceiling), exclude abnormal matches (instant quit / AFK) or count them as losses — the rating pipeline must be server-side and the client only receives results (Feature Note 18's settlement-authority convention)
- **Limitations**: ELO assumes skill is static; patch changes, season resets, and long absence all distort the score — this is the motivation for the variants

### Variants: Glicko / Glicko-2 / TrueSkill

| System | Core extension | Question answered | Computation |
|------|---------|-----------|--------|
| ELO | a single score R | how strong you are | constant |
| Glicko | R + rating deviation RD | how strong you are, and **how credible** that is (new accounts have high RD, long absence raises RD) | O(1) batched update per player per cycle |
| Glicko-2 | plus volatility σ | whether your skill is **stable** (players with large swings in form) | slightly higher, still a closed form |
| TrueSkill | Gaussian distribution pair (μ, σ) | skill estimation under **team** win/loss (Microsoft Research 2005, Herbrich/Minka/Graepel) | one approximate inference per match (truncated Gaussian), constant order |

Selection conventions:

- **Pure 1v1, seasonal**: Glicko's RD directly answers "how cautious should the first few matches of a new season be" — widening or tightening the window by RD at matchmaking time is more scientific than picking a fixed skill gap
- **Squads 2v2 and above**: TrueSkill (or a simplification of it) composes per-team distribution, avoiding "two five-player teams with equal average scores but wildly different variance"
- **Do not adopt a complex system unless you have match data to back it**: Glicko-2/TrueSkill parameters (RD convergence speed, β, τ) need large volumes of matches for calibration, and poorly calibrated they are worse than ELO — get ELO running first, keep score snapshots, then talk about upgrading

### Matchmaking pool: progressive window widening

Ratings only handle comparability; matchmaking relies on a **dynamic window**:

```text
窗口： [avg - Δ(t), avg + Δ(t)]
Δ(t) = Δ0 + α·t        # 线性放宽（每秒 α 分）
放宽档位：严格 → 跨小段 → 跨大段 → 不限分段（标注「匹配范围已放宽」）
```

- **Window widening must be monotonic**: tightening back causes the frustration of "waited 30 seconds only to be rejected"; the UI shows the current widening tier in sync
- **New-player protection**: low segments (e.g. the first N matches or R < 1500) do not enter the widening pool, preventing them from being dragged in as cannon fodder for high-rank players — this is a retention problem, not a fairness problem
- **Pairing confirmation**: which candidate to pick within the window uses a quality score (score gap, latency gap, win-rate history) for a secondary sort, taking the highest-quality pair

### Priority-queue implementation

Waiting players enter a priority queue; each round the matchmaker pops the person "most deserving of a match":

- **Key design**: `priority = wait-duration weight × w1 + segment scarcity × w2` — the longer the wait the higher the priority, guaranteeing nobody starves outside the window
- **Structure**: a balanced tree/skiplist of waiters sorted by score (finding adjacent candidates in range is O(log N + k)) + a wait-duration heap (popping the next matchmaking target is O(1)~O(log N)), with the two structures linked
- **Per-round flow**: pop the head player → take k candidates within the score window → compute pair quality scores → pair if quality passes, otherwise return to the queue with the window already widened next round
- **Complexity**: a single matchmaking pass is O(log N + k), k being the number of in-window candidates — this is the reason "the matchmaking pool should be memory-resident" (the same conclusion as the [Leaderboard](./leaderboard.md) node: ordered high-frequency queries want an in-memory structure)

### Bot backfill and instant-join degradation

- **Trigger ladder**: strict window times out → widen score → widen latency/region → **bot backfill** (each tier has a configurable duration)
- **Bot rules**: simulate strength within the real score range, a behaviour library with a difficulty curve, and the **UI must label the bot** (a dual requirement of experience and compliance; Feature Note 18 has an explicit convention); bots in newbie matches are part of the tutorial, but a bot suddenly appearing in an expert match is an incident
- **Instant-join degradation**: the casual pool does not make people wait — on timeout go straight into any match (bots included), treating "waiting" as a cost higher than "rank purity"
- **Anti-abuse**: bot matches do not count ranked points or count at a reduced multiplier, closing the "farm only against bots" loophole

### Comparison table

| Dimension | ELO | Glicko(-2) | TrueSkill | No rating (pure pool matchmaking) |
|------|-----|-----------|-----------|------------------|
| Per-match computation | constant | constant (batched per cycle) | constant (approximate inference) | none |
| Confidence expression | none | RD explicit | σ explicit | none |
| Team support | average-score approximation | extensible | native | n/a |
| Cold start | new accounts jump for a few matches | high RD → window widens automatically | wide distribution → widens automatically | first match starts immediately |
| Parameter calibration | one K | several: RD / convergence / volatility | β / τ / several parameters | none |
| Anti-farming surface | score conservation is auditable | same as left | same as left | no score to farm |
| Onboarding cost | low | medium | high | low (no quality evaluation) |

### Trade-offs

Ranked and rank systems use the trio "ELO/Glicko baseline + bucketed matchmaking pool + degradation ladder" — with all three, it is complete. TrueSkill is only worth adopting for team competition and only when match data is available for parameter calibration; with insufficient calibration data it is worse than ELO. Casual competition can drop ratings entirely (Elo-less, tiering by behavioural signals such as KD/win rate); the core demand is a fast start, not fairness purity.

The single most valuable architectural line is decoupling: the rating system and the matchmaking window are separate, so changing the rating (ELO→Glicko) should not require rewriting the matchmaking pool — the score is just an input field. After launch, matchmaking quality must close the loop: watch the speed of win-rate regression toward 50% and wait-time P95 (Feature Note 11's two matchmaking-quality metrics); score feedback that is too strong produces matchmaking oscillation, and anti-oscillation follows the trap table of the same page.

### Applicable scale

At thousands of concurrent waiters, a memory pool + linear widening window with a single-process matchmaker is enough; start with "ELO + buckets + ladder." At ten thousand, split the matchmaker into a separate process, shard the pool by segment, and move wait queues and window parameters into the config centre for hot updates (tuning without a restart). At a hundred thousand and cross-server, use multiple matchmaking workers + consistent routing — repeated requests from the same player land on the same worker, avoiding double matching; bot backfill is configured per pool shard.

## Used By

- **skynet**: the matchmaker is a resident actor; the wait queue and window state are all maintained serially in service memory (see [Skynet Source Code Walkthrough](/server/skynet) section 6); the per-round matchmaking beat and timeout degradation hang on the timer wheel (section 7 of the same page)
- **Pitaya**: the matchmaking service hands off to the match server through cluster RPC (service discovery and routing)
- **KBEngine**: match entities and scenes are hosted by cellapp, and the matcher stays a sidecar service
- Rating and matchmaking parameters (K, α, ladder durations) are all config-driven + server-held — the client only knows the result, never how it was computed (Feature Note 18's anti-cheat convention)

## Related

Relationship chain: rating system (ELO/Glicko/TrueSkill) → matchmaking window → priority queue → backfill and degradation → quality loop closure (win-rate regression, wait P95). Each segment answers "why the next one is needed":

- Ratings only answer "who is comparable to whom"; the matchmaking window answers "put them together right now" — the window widening rate is an experience parameter, not a rating parameter.
- If the widened window still cannot pair them, it is the priority queue's turn: wait duration enters the priority, guaranteeing nobody starves outside the window.
- Queues cannot save off-peak hours either, so backfill and degradation backstop: bots are the floor guarantee of experience, not a component of the rating system.

For squads and room shapes see [Party Matchmaking](./party-matchmaking.md) (the squad-score convention hooks into this page's rating system); for boards and the granularity of skill buckets see [Leaderboard](./leaderboard.md).

## Reference

- The ELO system comes from the chess rating system (Arpad Elo); Glicko/Glicko-2 were proposed by Mark Glickman (Harvard statistics department technical reports, 1995/2012); TrueSkill see the Microsoft Research paper Herbrich, Minka, Graepel, "TrueSkill: A Bayesian Skill Rating System" (NIPS 2006)
- Terminology: Skill Rating, Matchmaking Rating / MMR, Confidence Interval (rating deviation), Skill Bucket

## References

- [Wikipedia · Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Wikipedia · TrueSkill](https://en.wikipedia.org/wiki/TrueSkill)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [skynet](/server/skynet.md)
- [genre-coverage](genre-coverage.md)
- [index](index.md)
- [leaderboard](leaderboard.md)
- [party-matchmaking](party-matchmaking.md)
- [skill](skill.md)
