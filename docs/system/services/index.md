# General-Purpose Game Services

## Category

system / overview of the general services subtree. Coverage: accounts and characters (01), events, leaderboards, matchmaking and social (02), transactions, payments and the economy (03), risk control, audit, GM and support (04).

## Definition

In the early days of a game project it is easy to pour all the energy into combat, gameplay and the primary path; only when the version reaches launch preparation or enters long-term operations does the team realize that what actually slows the project down is rarely the core gameplay code, but the capabilities that look "not sexy enough": accounts, characters, events, leaderboards, matchmaking, social, payment, risk control, support and GM.

These capabilities share a few traits. First, they cross systems, cross teams and cross lifecycles, and almost never serve just one gameplay. Second, they touch asset safety, user relationships and operations efficiency directly, so when they break the blast radius is usually larger than some in-session skill bug. Third, they are easily dragged into historical baggage by "let's just ship something that runs first", so that in the end every project maintains its own near-identical but incompatible implementation.

So what this chapter really discusses is not "whether we should build these features", but three harder questions:

- Which capabilities should be platformized, and which must stay project-customized
- Which operations must be auditable, replayable and attributable to a responsible party
- How should business efficiency, operations flexibility and asset safety be traded off

These records are organized in the following order of judgment:

- First separate out whose authoritative state accounts, characters, orders, social relationships and punishment records each belong to
- Then look at which of these states' read/write paths sit on the primary path and which sit on the peripheral governance path
- Only then decide the reuse mode: a unified service, a unified SDK, a unified console, or only a unified protocol and data caliber

## Related

Chain of relations: accounts and characters (01) → the four platformization candidates (02) → transactions and the economy (03) → the four governance pieces (04). Upstream: security tree (governance side); downstream: numerical/04 (economy design side), database tree (modeling), tree root [System overview](../index.md).

## Reference

The node list is in the next section.

## Articles in this chapter

- [Accounts, Characters and Base Systems](./01.md): why login identity, the character entity, server affiliation and base profile services decide the boundaries of many later systems.
- [Events, Leaderboards, Matchmaking and Social](./02.md): how to balance reuse against project differences for high-frequency operations capabilities, and why these systems so often become the source of online traffic spikes.
- [Transactions, Payments and the Economy System](./03.md): why orders, fulfillment, asset changes and the economy loop must be designed to be "traceable, compensatable and reconcilable".
- [Risk Control, Audit, GM and Customer Support](./04.md): why governance systems cannot stop at detection and must also cover evidence, disposition, appeals and the closed loop of human intervention.

## References

- [Heroic Labs documentation](https://heroiclabs.com/docs/)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/games/index.md)
- [map](/server/map.md)
- [index](/system/index.md)
- [territory](/system/territory.md)
