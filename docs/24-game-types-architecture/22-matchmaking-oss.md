# Matchmaking: Open-Source Project Selection Survey

> Compiled on: 2026-10-18
> Scope: open-source frameworks and backends related to matchmaking, grouped into four categories by emphasis
> Conclusion first: **the four projects solve four different stages of the matchmaking chain, not mutually exclusive competitors**;
> when selecting, first make clear which segment you are missing, then decide whom to reference and whom to adopt.

This piece focuses on the capability boundaries of open-source projects and the selection trade-offs. For the responsibility split of a self-built service and the design of session coordination and room allocation, see [Player Matchmaking: Responsibilities and Placement in a Self-Built Architecture](/24-game-types-architecture/23-matchmaking-architecture); for party brokering, PVP rating, and matchmaking pool mechanics, see [Party Matchmaking](/system/party-matchmaking) and [PVP Matchmaking](/system/pvp-matchmaking) respectively. These pages are different angles on the same topic.

## 0. Breaking Down the Matchmaking Chain

A complete matchmaking flow splits roughly into four segments, with each of the four projects occupying one:

```text
组队          匹配          分配房间/实例       进服
 ↑             ↑              ↑                  ↑
 Nakama      Open Match      Colyseus          Agones
 （组队生命周期）（匹配算法层）  （房间发现与席位预留）（服务器实例）
```

Comparing them as competitors is a common misjudgment — **they sit at different positions on the chain, and the overlap is mainly at the boundary between "matching" and "allocation"**.

---

## 1. Open Match

| Item | Content |
|---|---|
| License | Apache-2.0 |
| Language | Go |
| Positioning | Extensible matchmaking framework (driven by Google for Games) |
| Core mechanisms | Ticket, Match Function, Evaluator, Director, Assignment |

**What it solves**: separating matchmaking infrastructure from the game's own matchmaking algorithm. The game only writes
the Match Function (scoring/grouping logic); scheduling, tickets, and concurrent convergence are left to the framework.

**Strengths**: suited to custom matchmaking strategies that span games and modes; strategies can evolve independently.

**Weaknesses**: you must wire in party formation, server allocation, game onboarding, and lifecycle management yourself —
it only handles "how to match," not "what happens after matching."

**Selection note**: Open Match 2 is currently still marked **public preview**;
before formal adoption, evaluate stability and migration cost separately.

**Who it fits**: projects with complex matchmaking strategies that need multiple games to share one matchmaking infrastructure.

---

## 2. Agones

| Item | Content |
|---|---|
| License | Apache-2.0 |
| Language | Go (runs on Kubernetes) |
| Positioning | Server instance allocation |

**Core mechanisms**: GameServer, Fleet, Allocation, auto scaling.

**What it solves**: managing the pool of game server processes and **atomically allocating** instances from the pool,
avoiding concurrent allocations onto the same server.

**Strengths**: allocation atomicity is guaranteed; integrated with the K8s ecosystem, its scaling capability is mature.

**Weaknesses**: **it does not handle teammate selection or in-game room logic**.

**Selection note**: it fits containerized dedicated servers. If the game server is a
long-lived process on traditional machines (not containerized), Agones is either unusable or needs an adaptation layer of your own.

**Who it fits**: multiplayer competitive games whose servers are already containerized and that need elastic scaling.

---

## 3. Nakama

| Item | Content |
|---|---|
| License | Apache-2.0 |
| Language | Go |
| Positioning | Game backend (party, matchmaking, social, storage, etc.) |

**Core mechanisms**: Party, party leader, party matchmaking, Matchmaker, Match Join.

**What it solves**: the party lifecycle. It guarantees that players within a Party participate in matchmaking **as a unit**,
while also supporting mixed matchmaking of solo players and multi-player parties.

**Strengths**: a complete functional baseline, with fairly careful handling of the party-matchmaking boundary (leader permissions, membership changes,
the effect of party disbanding on matchmaking).

**Weaknesses**: as a full backend, it overlaps substantially in platform capabilities
with a self-built game server, account system, and storage layer.

**Selection note**: if you do not plan to adopt Nakama as a full backend,
**we recommend studying its implementation closely rather than importing the whole system**.

**Who it fits**: small projects that need a full backend; or large projects that only want to borrow the party logic.

---

## 4. Colyseus

| Item | Content |
|---|---|
| License | MIT |
| Language | TypeScript / Node.js |
| Positioning | Real-time multiplayer room framework |

**Core mechanisms**: Matchmaker APIs such as `joinOrCreate`, `joinById`, and `reserveSeatFor`.

**What it solves**: discovering a suitable room, creating a room, **reserving a seat**, and returning connection info.
Seat reservation is the most easily underestimated part — it solves the race condition of
"seeing a room but not being able to squeeze in."

**Strengths**: a clean API design and clear room-allocation semantics, well worth studying.

**Weaknesses**: its mechanisms are fairly tightly coupled to its own game runtime (Node.js).

**Selection note**: if you want multiple servers (different languages/engines) to share one scheduling platform,
**you should abstract its protocol ideas rather than directly depend on its internal Room implementation**.

**Who it fits**: real-time games on a Node.js stack; or projects that need a reference for room-allocation protocol design.

---

## 5. Selection Recommendations

| What You Are Missing | Reference First | Whether to Adopt Directly |
|---|---|---|
| Matchmaking algorithm and scheduling infrastructure | **Open Match** | Adopt when strategies are complex; building simple matchmaking yourself is cheaper |
| Server instance pool and atomic allocation | **Agones** | Consider only if already containerized; build your own allocator first for traditional long-lived processes |
| Party lifecycle and whole-party matching | **Nakama** | Generally just reference the implementation; do not import the whole backend |
| Room discovery and seat reservation | **Colyseus** | Abstract its protocol; do not depend directly if runtimes differ |

### Three Practical Recommendations

1. **Break down the chain before selecting**. The root cause of most "selection difficulties" is putting four projects that
   address different stages into the same comparison table. First confirm whether what you are missing is party, matching, allocation, or server entry.

2. **Seat reservation is easily overlooked**. The race condition behind Colyseus's `reserveSeatFor`
   (room discovered → connect → room full) is often missed in home-grown solutions,
   and deserves its own design.

3. **Preview releases do not go into production-critical paths**. Open Match 2's preview status means
   the API may change; if adopted, lock the version and prepare a migration plan.

---

## References

- Open Match: official repository and architecture docs, and the Open Match 2 public preview announcement
- Agones: official repository and the Allocation mechanism docs
- Nakama: Heroic Labs official documentation, the matchmaking chapter
- Colyseus: official Matchmaker documentation

> This file is a selection-survey record; it contains no code references or measured performance data for any of the projects.
> Before actual adoption, run a prototype validation at your target scale.
