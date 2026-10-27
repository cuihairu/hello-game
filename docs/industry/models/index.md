# Game Types and Problem Models

## Category

Overview of the industry / models subtree. Covers: gameplay tag translation (00), the six-question classification (01), the six problem models (02–07), and composition and priority (08).

## Definition

Game projects should not be understood only through the genre nouns familiar to players, nor should they jump straight to abstract technical terms. A more reliable approach is to acknowledge that two layers of fact coexist: the first layer is the gameplay types used in the daily communication of players, the market, and the team; the second layer is the technical problem models that truly govern the architecture behind those gameplay types.

These records center on the relationship between the two layers. What actually determines networking, synchronization, service organization, data governance, and operational cost is usually not "whether it is called RPG, FPS, or SLG," but rather the following questions:

- Whether players share the same real-time state.
- Whether a latency gap of tens to hundreds of milliseconds directly changes the outcome.
- Whether key state closes within a single session or accumulates over months.
- Whether the most expensive failure is an experience failure, an asset failure, or a platform coordination failure.
- Whether pressure first breaks through on the server side, the client side, or the payment and channel link.

If these questions are not first distinguished, the team will easily get both sides wrong. One error is to discuss technology only by genre noun, ending up making every "RPG" look the same; the other is to talk only about abstract models without giving the project an entry point back to real gameplay.

The structure of this chapter is designed to resolve this gap:

- First, use common gameplay types to establish an intuitive entry point.
- Then, use a practical classification method to map the project to a problem model.
- Next, expand on the most common problem models that most strongly govern architecture.
- Finally, explain why real projects are often composite rather than a single label.

## Related

Relationship chain: tags (00) → six questions (01) → room-based session (02) → hard-real-time competitive (03) → persistent online world (04) → long-cycle progression (05) → economy/platform (06) → high-frequency heavy presentation (07) → composition (08). Downstream: genres subtree (genre quick view), server/system/networking tree (technical expansion of each model), tree root [industry overview](../index.md).

## Reference

See the next section for the node list.

## Articles in This Chapter

- [Overview of Common Gameplay Types](./00.md): First bind the industry's most commonly used gameplay language to the first batch of technical alarms it corresponds to.
- [Methods for Classifying Game Types](./01.md): Provide a classification framework more capable of guiding technical judgment than "classifying by RPG, FPS, SLG."
- [Room-Based Session Game Problem Model](./02.md): Discuss why the main problem converges on matchmaking, rooms, reconnection, and settlement when "one session" is the boundary.
- [Hard-Real-Time Competitive Game Problem Model](./03.md): Discuss how timing precision, fairness, and adjudication authority together determine the synchronization system.
- [Persistent Online World Game Problem Model](./04.md): Discuss why service organization, migration, recovery, and the control plane become the main axis after the world persists.
- [Long-Cycle Progression and Asynchronous Interaction Game Problem Model](./05.md): Discuss why long-term assets, configuration, events, and compensation come to dominate system complexity.
- [Economy and Platform Game Problem Model](./06.md): Discuss how payment, orders, channels, risk control, and external platforms reshape system boundaries.
- [High-Frequency Object and Heavy Presentation Game Problem Model](./07.md): Discuss why object throughput, resource organization, and presentation budgets must be brought forward into architecture design.
- [How Models Combine](./08.md): Explain how real projects identify the dominant model and secondary models, rather than treating all complexity equally.

## References

- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)
- [Wikipedia · Video game industry](https://en.wikipedia.org/wiki/Video_game_industry)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [career](/industry/career.md)
- [index](/industry/index.md)
- [map](/server/map.md)
