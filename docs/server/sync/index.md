# Sync, Combat, and Real-time Interaction

## Category

Overview of the server / sync subtree. Covers: time model (01), sync model (02), frame sync (03), pause/catch-up/reconnection (04), prediction and compensation (05), determinism (06), replay/spectating/adjudication (07), skill system (08).

## Definition

This chapter tackles the main thread in game development that most easily turns a gameplay problem into an architecture problem: how do multiple endpoints share the same battle, how does in-session time advance, how do inputs and state converge, when can the client play ahead, when must the server adjudicate, and how do disconnect, frame catch-up, replay, and the skill system all build on the same set of timing rules.

What truly makes real-time interaction hard is never "can the server compute it," but the fact that the following goals cannot all be optimal at once:

- Feel must be snappy.
- Fairness must hold up.
- Results must be attributable.
- Weak networks must be tolerable.
- Replay and spectating must be reconstructable.
- Engineering complexity must not spiral out of control.

What a sync system really does is not choose some fashionable approach, but distribute complexity across these goals and turn the cost into controllable engineering facts.

The pieces in this set have explicit dependencies:

- The time model comes before the sync model: many sync problems are first and foremost problems of time advancement.
- Then the sync model, because adjudication authority and the timing of consistency determine every downstream system.
- Then frame sync, pause/resume, prediction/compensation, and determinism, the parts most prone to entangling each other.
- Finally replay, spectating, and the skill system are folded back into the same chain, to explain why they are not bolt-on features.

## Related

Dependency chain: time (01) -> model (02) -> frame sync (03) -> pause and reconnection (04) -> prediction/compensation (05) -> determinism (06) -> replay/adjudication (07) -> skills (08). Upstream: the runtime subtree (Tick and execution model); downstream: the networking tree, [system tree settlement](/system/settlement) (where session results take effect), and the tree root [server overview](../index.md).

## Reference

See the node list in the next section.

## Articles in this chapter

- [Tick and time advancement](./01.md): First separate logical time, render time, and network time to build the foundation layer of the combat clock.
- [Sync model](./02.md): Look at server authority, frame sync, lockstep, and hybrid approaches within one set of trade-offs.
- [Frame sync in depth](./03.md): Open up the input window, delayed frames, default inputs, hash checks, and snapshot recovery as implementation details.
- [Pause, resume, frame catch-up, and reconnection](./04.md): Explain how real room-level pause, reconnection recovery, and tiered frame catch-up should be organized.
- [Prediction, compensation, and correction](./05.md): Discuss how the client steals time ahead, and how the server pulls prediction back into an authoritative result.
- [Determinism and numerical consistency](./06.md): Discuss why many "sync problems" actually die on floating point, randomness, and update order.
- [Replay, spectating, and adjudication](./07.md): Fold input logs, state snapshots, arbitration evidence, and spectator isolation into the sync system.
- [Skill system design](./08.md): Starting from the runtime skeleton, effect pipeline, Buffs, and the sync boundary, discuss how combat content scales long-term.

## References

- [Valve "Source Multiplayer Networking"](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Gaffer on Games - Game networking references](https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/)
- [GitHub - pond3r/ggpo](https://github.com/pond3r/ggpo)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/server/index.md)
