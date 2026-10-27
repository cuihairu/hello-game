# Execution Models and Runtime

## Category

Overview of the server / runtime subtree. Covers: concurrency stance overview (00), execution models (01), coroutines/state machines/task queues (02), Tick-driven execution (03), flow control and backpressure (04), lock contention (05), Epoch runtime (06).

## Definition

This chapter is not about surface-level questions like "do I know how to use multiple threads." It is about how the server and the engine interior actually advance logic, organize state, carve up scheduling units, control concurrency, and absorb peaks. Threads, coroutines, Actors, task queues, Tick-driven execution, backpressure, and lock contention all end up answering the same question: how to keep a system predictable, recoverable, and debuggable under heavy load.

Many production incidents look like business bugs, when the real root cause is that the runtime was organized wrong from the start:

- State flies across threads with no inferrable ordering.
- A few slow tasks drag down the main loop.
- Under peak load the queues grow without bound.
- Lock contention drags down throughput and jitter together.

So what this chapter really tries to solve is not the worship of some "more advanced model," but the ability to judge: under a given problem model, which runtime organization should carry the core state, which work should advance sequentially, which work is worth parallelizing, and which work should be outsourced asynchronously without polluting the primary path in return.

Just naming a few words -- "threads, coroutines, Actors" -- would not set a good enough standard for this chapter. A more sensible order is:

- First establish the genealogy of concurrency models, knowing what problem each model actually solves.
- Then return to the few primary runtime organizations most common in game projects.
- Then discuss how runtime details like coroutines, state machines, task queues, Tick, backpressure, and locks jointly determine production stability.

## Related

Dependency chain: stance (00) -> execution models (01) -> the three-piece division of labor (02) -> Tick (03) -> backpressure (04) -> locks (05) -> dedicated runtime (06). Upstream: none (runtime entry); downstream: the sync subtree (the consumer of time and ordering), server/sync (combat timing), and the tree root [server overview](../index.md).

## Reference

See the node list in the next section.

## Articles in this chapter

- [Concurrency stance overview: from Seven Concurrency Models in Seven Weeks to game runtimes](./00.md): First lay out the genealogy of common concurrency models, then explain which ideas a game project usually borrows only in part.
- [Single-threaded, multi-threaded, and Actor](./01.md): Open up the three kinds of execution organization most often used as a game's primary runtime, and compare their state philosophies and failure shapes.
- [Coroutines, state machines, and task queues](./02.md): Discuss which mechanism should own async flow, finite state, and queue governance respectively.
- [Tick-driven execution and logic execution](./03.md): Put logical time, the main loop, frame budget, and async result reclamation back on the same runtime path.
- [Flow control, backpressure, and stability mechanisms](./04.md): Explain how a system rate-limits, drops, degrades, and fails fast when peaks and slow consumers arrive.
- [Lock contention and performance cost](./05.md): Discuss why shared state, lock granularity, contention, and tail latency turn "theoretical parallelism" into real blocking.
- [Epoch-driven Actor / Channel Runtime](./06.md): Use a more concrete runtime example to show why some game core logic chooses a time-first, order-first, single-writer-first execution kernel.

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Game server](https://en.wikipedia.org/wiki/Game_server)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/server/index.md)
- [language](/server/language.md)
- [skynet](/server/skynet.md)
