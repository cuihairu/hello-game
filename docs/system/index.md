# System Overview

## Category

Overview of the system tree. Node positioning: the system layer is knowledge shared across all sides — five gameplay-system nodes, the scripting-and-hot-update subtree, the common-services subtree; each system unfolds along the Design→Client→Server→DB→Operation chain.

## Definition

The system layer answers "what parts make up a concrete system, and which layer does each part live in": gameplay systems are selection-grade mechanism parts such as matchmaking, leaderboard, skill, and settlement; scripting and hot update answer how logic gets extended and replaced at run time; common services are the foundational parts — accounts, transactions, risk control — that nearly every game rebuilds once. System nodes are written as mechanism comparison and selection conventions; implementation detail is spread across the client, server, and database trees.

## Related

Relationship chain: gameplay systems (mechanism-part selection) → scripting and hot update (the logic extension surface) → common services (the foundational-part inventory). Upstream: the design tree (gameplay problem domains), the numerical tree (numerical conventions); downstream: the server tree (the runtime carrier), the database tree (the storage surface), the operation tree (the operations surface).

- Gameplay systems: [Leaderboard](/system/leaderboard), [Party Matchmaking](/system/party-matchmaking), [PVP Matchmaking](/system/pvp-matchmaking), [Skill System](/system/skill), [Settlement](/system/settlement)
- Subtrees: [Scripting and Hot Update](/system/scripting/), [Common Services](/system/services/)
- Comparison: [Genre and Component Coverage Map](/system/genre-coverage) (three-tier verdicts over 21 genres and 46 components, plus 11 gaps)

## Reference

Node list on each subtree's guide page and the node links above.

## References

- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)
- [Wikipedia · Game balance](https://en.wikipedia.org/wiki/Game_balance)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [index](/research/index.md)
- [genre-coverage](genre-coverage.md)
- [index](/system/scripting/index.md)
- [index](/system/services/index.md)
