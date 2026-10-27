# Client Architecture and Engine Systems

## Category

Overview of the client tree. Coverage: tech stack and engine (01), client-server boundary (02), asset system (03), scripting and ECS (04), AI scenarios (05), interaction and input as a cross-cutting node, plus the web subtree (web/01–06) and the engines subtree (engines/01–03).

## Definition

Many teams slip into a "systems engineering" perspective when it comes to the server, only to retreat to "shove the UI, characters and effects into the engine" when they get to the client. This is a very common misjudgment. The client is not merely a presentation layer; it is itself a long-running complex system that must simultaneously handle input, rendering, asset scheduling, script execution, network interaction, platform integration, performance adaptation, package size control and version evolution.

Once the client becomes complex, many production issues can no longer be simply attributed to "the art assets are too large" or "the engine is bad." What actually surfaces is usually harder engineering problems:

- How exactly should engine capabilities and the project-layer architecture divide the work
- Which logic belongs on the client, and which must be handed back to the server for adjudication
- How assets, code, scripts and configuration come together into an evolvable runtime
- Why performance, package size, hot updates and multi-platform adaptation so often pull against each other
- Once AI and automation tools enter the client chain, how are boundaries and responsibilities defined

This chapter is not written along the lines of an engine product feature sheet; it treats the client as a standalone runtime system. The focus is not on whether a technology is "advanced," but on where it places complexity and how it affects version cadence, team collaboration and the shape of production incidents.

## Related

Relation chain: responsibility split (01) → client-server boundary (02) → asset supply chain (03) → scripting and ECS (04) → AI scenarios (05); the Web side connects to the web subtree, and the commercial and team dimensions of technology selection connect to the engines subtree. Downstream: the server tree (the other half of boundary and sync), the production tree (build and release).

## Reference

See the node list in the next section; the topic-note comparison on the same subject is in article 03, "Frontend Engines and the Client."

## Chapter Articles

- [Client Tech Stack and Engine](./01.md): first discuss what problem the engine actually solves and what the project-layer framework should bear, so as to avoid pushing all complexity onto the engine or its plugins.
- [Client-Server Boundary and Network Layer](./02.md): sort out the boundary problems that are genuinely hard between client and server, including adjudication authority, prediction, rollback, disconnection and state recovery.
- [Asset System and Toolchain](./03.md): put package size, sub-packaging, hot updates, asset dependencies, build flow and content production efficiency back into a single engineering chain for discussion.
- [Scripting Language and ECS](./04.md): discuss why the scripting layer and data-driven architecture show up on the client, and what kind of problem each is suited to solve.
- [Application Scenarios for AI in the Client and Game Systems](./05.md): look at AI inside a real engineering context, and discuss which efficiencies it is suited to raise and which boundaries it should not replace.
- [Interaction and Input](./input.md): normalize device events into recomputable intents, input mapping is data not code, and half of game feel is born in the latency ledger of the input pipeline.

## References

- [Wikipedia · Video game console](https://en.wikipedia.org/wiki/Video_game_console)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01](01.md)
- [02](02.md)
- [03](03.md)
- [04](04.md)
- [05](05.md)
- [input](input.md)
