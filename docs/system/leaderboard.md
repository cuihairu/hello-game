# Leaderboard

## Category

system / gameplay systems. Node positioning: sort "boards" into tiers by write frequency, query fan-out and recovery requirements, then run the same accounting on four implementations (Redis ZSET / Lua wrapper / pure in-memory / SQL wide table). Convention: every number and complexity is recomputable — no conclusions from guesswork.

## Definition

The essence of a leaderboard is an ordered set with three kinds of queries: write or update a single player's score, take Top-N, look up any player's rank. The frequency and scale of those three queries decide which implementation path to take.

## Problem

Most leaderboard pitfalls come from selecting by feature rather than by load. Write frequency, query fan-out and recovery requirements are three separate ledgers: a high-frequency update routed over the SQL hot path gets dragged down by index churn; a low-frequency settlement-style board gets a dedicated Redis set up just for it, a cost mismatch; an in-memory board that never drills snapshot and recovery turns every restart into an incident. Settle the three ledgers first, then talk implementation.

## Algorithm

### Classic mode: Redis ZSET

Redis's sorted set (ZSET) is the default answer for leaderboards: a skiplist plus hash dual structure, one command solving both score storage and ordering.

```text
ZADD board:week 1520 u1001          # 写分：O(log N)
ZREVRANGE board:week 0 19 WITHSCORES  # Top20：O(log N + 20)
ZREVRANK board:week u1001            # 名次：O(log N)
```

The complexities are the nominal values from the Redis docs (`redis.io/commands/zadd`, `zrevrange`, `zrevrank`), with N the number of players on the board. Key points:

- **Score is the sort key**: a time-window board packs the timestamp into the score (high 48 bits hold the business score, low 16 bits hold time order, so among equal scores the earlier arrival ranks ahead); a single `ZREVRANGE` gives "higher score first, earlier arrival first on ties"
- **Persistence and recovery**: the ZSET lands on disk with the RDB snapshot or AOF, and replay on restart restores it; under the AOF everysec convention at most **1 second** of writes is lost, which a board can accept
- **Multiple boards**: one key per board, naturally isolated; global / friends / guild boards split keys by dimension to avoid a single key growing without limit

ZSET's weak point is that **update and validation are not atomic**: first `ZSCORE` to check for cheating, then `ZADD` to write, and the two commands can be interleaved by concurrent work. That is why the variants exist.

### Variant: Lua script wrapper (advanced)

Redis does not interleave other commands while a single script is executing (`redis.io/developers/learn-data-structure/lua-redis`), so packing "validate + write + cleanup" into one script buys atomicity. Three typical wrappers:

```lua
-- 报名次脚本：防刷校验、时间窗清理、写分一步完成
local now = tonumber(ARGV[1])
local inc = tonumber(ARGV[2])
-- 时间窗：只保留窗口内成员（keys[2] 是当日榜）
redis.call('ZREMRANGEBYSCORE', KEYS[2], 0, now - 86400)
local cur = redis.call('ZSCORE', KEYS[1], ARGV[3])
if cur and inc > 1000 then      -- 单次增量上限，防刷
  return 0
end
redis.call('ZINCRBY', KEYS[1], inc, ARGV[3])
return 1
```

- **Anti-abuse**: rate limiting and per-call increment caps are enforced server-side (scores must be computed by the server — this is the leaderboard edition of Feature Note 18's settlement-authority convention)
- **Time window**: `ZREMRANGEBYSCORE` trims expired members by timestamp score, preventing each day's local board from growing without bound
- **Multi-board aggregation**: one script runs `ZINCRBY` against several keys together (event points going into three sub-boards); pipelining reduces round trips; one Lua call over N boards is O(k·log N) rather than k network round trips
- **Cost**: a script error blocks all commands, and debugging is less intuitive than with ordinary commands; do not do slow operations inside a script (scanning everything is a cardinal sin)

### Pure in-memory implementation: skiplist, heap, segmented buckets

When Redis is not an option, or latency/cost demands are extreme, build it in-process on the server. The ledger for three structures:

| Structure | Write | Top-N | Any rank | Memory profile |
|------|------|-------|---------|---------|
| Skiplist | O(log N) | O(log N + N) to fetch the top N (maintaining a doubly linked list makes top-N O(N)) | O(log N) | Each node carries a randomized level-height pointer; expected level height 1/(1-p), p usually 0.25 |
| Heap | O(log K) (keeping only K) | O(K) (pop directly after building the heap) | Not supported (needs a separate hash to look up scores) | O(K); saves memory when only the top K is kept |
| Segmented buckets | Amortized O(1) (scores growing monotonically only move between buckets) | O(buckets + within-bucket) | O(1) (cumulative over bucket order) | Bucket count is fixed; precision is limited by bucket granularity |

- **Skiplist** is the self-built structural twin of ZSET — use it when both full ranking and arbitrary queries are needed; mind concurrency — a single writer (the board's actor processing serially, see the engine tie-ins at the end) is far easier to reason about than locking
- **Heap** only answers "who are the top 100": on a score change, compare against the heap top first and only touch the heap when exceeded, amortized O(log K); it **cannot** answer "what is my rank", so pair it with a full score table
- **Segmented buckets** fit active boards with continuous, monotonically growing scores (activity normalized per natural day): each bucket holds a small ordered chain, an update only moves entries between adjacent buckets, and a read scans down from the top buckets — precision traded for O(1) writes, an efficient approximation of "first-come-first-served ranking"

The shared ledger for all three: **persistence is something you add yourself** (snapshot to the storage layer every N seconds + an append-only log), and the restart recovery path must be drilled; that is the real price of trading memory for latency.

### SQL / wide-table approach

```sql
CREATE TABLE leaderboard (
  server_id INT NOT NULL,
  season_id INT NOT NULL,
  player_id BIGINT NOT NULL,
  score INT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (season_id, player_id),
  KEY rank_idx (season_id, server_id, score DESC)
);
```

- **Writes**: `INSERT ... ON DUPLICATE KEY UPDATE` is an O(log N) primary-key point write, and each write also maintains the secondary index — frequent score changes mean frequent index churn and binlog amplification
- **Top-N**: `ORDER BY score DESC LIMIT 20` takes `rank_idx`, O(log N + 20); **any rank** is SQL's weak point — `COUNT(*) WHERE score > mine` is O(rank), and at tens-of-millions scale you rely on a quantile cache or asynchronously backfilling a rank column
- **Persistence and recovery**: full marks by nature — writing to the database *is* persistence, and rollback reconciliation plus offline analysis (directly the same source as Feature Note 12 on data analytics) come along for free
- **Tens-of-millions playbook**: partitioned tables cut by season, read-write splitting (writes to the primary, reads to replicas), cursor pagination inside the board; a single table at tens of millions of rows is viable, but a high-frequency UPDATE write model is not suited to the hot path

### Comparison table

| Dimension | Redis ZSET | ZSET + Lua wrapper | Self-built in-memory | SQL wide table |
|------|-----------|----------------|-----------|---------|
| Write complexity | O(log N) | O(log N), validation atomic | O(log N) ~ amortized O(1) | O(log N) + index maintenance |
| Top-N query | O(log N + K) | same as left | depends on structure | O(log N + K) (via index) |
| Any rank | O(log N) | O(log N) | skiplist O(log N) / bucket approximation | O(rank), or cache backfill |
| Persistence | RDB/AOF, second-level | same as left | self-built snapshot + log | native |
| Restart recovery | replay restores it | same as left | recovery path must be drilled | restored immediately |
| Atomic anti-abuse | insufficient (two commands can interleave) | atomic within the script | single-writer serialization is atomic | transaction / single-statement atomic |
| Time window / multi-board | key splitting + score trimming | done in one script pass | built into the structure | fields + index |
| Tens of millions | viable on a single instance (memory estimated at hundreds of bytes per entry, 10 million entries on the order of GBs — must be measured) | same as left | same as left, and you own the cost | viable, weak write hot path |
| Implementation cost | low | medium | medium-high | low (but heavy query design) |

### Trade-offs

The default answer is ZSET + Lua wrapper: atomicity, persistence and rank queries in one shot, provided the team is already running Redis — standing up a dedicated Redis for a board is not worth it. Self-built in-memory holds up only in three situations: latency sensitivity too high to cross the network, score update frequency high enough that Redis cost is not worth it, or a need for custom precision strategies such as segmented buckets; go that route and you must complete the snapshot and recovery side. The signals for choosing SQL are three: the board must share a source with offline analysis and reconciliation, writes are low-frequency settlement style rather than high-frequency updates, and rank queries can tolerate cache backfill.

The industry default for large boards is a hot/cold combination: Redis as the hot read layer, SQL/wide table as the authoritative store, with the server computing scores → writing the hot layer → asynchronously flushing the cold layer. If any layer loses data, it can be reconciled back from the authoritative layer.

### Applicable scale

For active boards under tens of thousands, a single ZSET instance is enough, and even the Lua wrapper can be simplified to server-side checks. From a hundred thousand to tens of millions, use ZSET + Lua + hot/cold combination; once a single key reaches the tens-of-millions scale, split keys by season/partition to hold down single-instance memory and the snapshot window. At hundreds of millions and above, or for a cross-server global board, go sharded boards per server plus global-board aggregation (periodically pull Top-K from each partition and merge) — one ZSET will not hold the world.

## Used By

- **skynet**: a board suits an independent service — single-threaded semantics inside the service naturally eliminate concurrent write contention (messages processed serially, see [Skynet Source Code Walkthrough](/server/skynet) section 6); Redis access uses the built-in `lualib/skynet/db/redis.lua` client (section 8 of the same page); the daily board's time-window trimming hangs on the `skynet.timeout` timer wheel (section 7 of the same page)
- **Pitaya**: the board registers handlers as an independent service, wired in through message dispatch, with persistence going through the storage component
- **KBEngine / BigWorld**: entity attributes change at high frequency and a board is a cross-entity aggregate query, so convention is to **keep it out of the engine kernel** and host it as a peripheral service (KBEngine's entity persistence goes through dbmgr, and BigWorld's cell/base division of labour both place cross-entity aggregation outside the session process)
- Whichever engine hosts it: **scores must be computed server-side**, and a client-reported score can only be a trigger signal — a direct application of Feature Note 18's settlement-authority convention to leaderboards

## Related

Relationship chain: gameplay requirement (a board) → load tiering (write / query / recovery) → implementation selection → service and engine landing → hot/cold combination and reconciliation. Each segment answers "why the next one is needed":

- After tiering comes implementation selection: the tier of each of the three load types directly eliminates mismatched options (high-frequency updates rule out the SQL hot path; needing any rank rules out a pure heap).
- After selection comes the service: concurrent write contention on a board is solved by the single-writer service shape, see [Skynet Source Code Walkthrough](/server/skynet).
- After landing comes reconciliation: the hot layer only accelerates reads, authoritative scores live in the SQL/wide table, and any layer that loses data can be reconciled back from the authoritative layer.

Sister nodes on the same convention: [Party Matchmaking](./party-matchmaking.md), [PVP Matchmaking](./pvp-matchmaking.md) (also gameplay systems, using the same tier-by-load-then-select method).

## Reference

- Redis command complexity and Lua script atomicity defer to the official docs (`redis.io/commands/zadd`, `zrevrange`, `zrevrank`, `redis.io/developers/learn-data-structure/lua-redis`)
- Complexities on this page are nominal values; memory and latency magnitudes must be measured against real data
- Terminology: Leaderboard, Season Ladder, Hot/Cold Split (hot/cold tiering)

## References

- [Wikipedia · Leaderboard](https://en.wikipedia.org/wiki/Leaderboard)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01](/database/cache/01.md)
- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [skynet](/server/skynet.md)
- [achievement](achievement.md)
- [battle-pass](battle-pass.md)
- [genre-coverage](genre-coverage.md)
- [index](index.md)
- [party-matchmaking](party-matchmaking.md)
- [pvp-matchmaking](pvp-matchmaking.md)
- [settlement](settlement.md)
- [skill](skill.md)
