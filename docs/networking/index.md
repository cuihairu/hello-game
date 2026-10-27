# Networking and Access Protocols

## Category

Overview of the networking tree. Coverage: networking fundamentals (01–02), transport and protocols (03–04), message patterns (05–06), weak networks and room broadcast (07), plus the IPC subtree (ipc/01–06).

## Definition

Networking problems in a game project are not a textbook exercise in choosing between TCP and UDP; they are about how the live primary path survives in a real network environment. Login, matchmaking, in-match input, room broadcast, chat, event notifications, payment results, and resource downloads all go through the network, but their requirements for latency, ordering, reliability, retry, and recovery are completely different. As soon as these paths are designed as if they were one thing, the system will keep exposing problems during weak-network conditions, peak traffic, and version evolution.

What this chapter sets out to solve is not the general question of "how does the network communicate" but a few of the most common engineering tensions:

- How long-lived connection sessions are decoupled from business sessions.
- How high-real-time messages and high-reliability messages are layered.
- Which responsibilities the access layer should carry, and which it should not.
- How room broadcast, weak networks, network switching, background-to-foreground, and reconnection become everyday design rather than edge cases.
- How protocols stay compatible across long-term version evolution, rather than relying on one-off agreements.

The biggest difference between game networking and ordinary Web requests is not that "it also goes over TCP or UDP" but that it frequently has all of the following at once:

- Long-lived connections and long-term sessions coexist.
- High-frequency state updates and low-frequency control messages coexist.
- Strong real-time paths and strong reliability paths coexist.
- Weak networks, network switching, reconnection, and broadcast storms are daily scenarios, not edge faults.

So in a game the network layer is not a transparent foundation; it is the primary-path infrastructure that directly shapes sync, rooms, recovery, and live stability.

## Related

Chain of relations: gameplay semantics → message semantics (01) → I/O and transport (02–03) → protocol contract (04) → message patterns (05–06) → weak-network governance (07); the cross-process boundary continues into the [IPC subtree overview](/networking/ipc/) (ipc/01–06). Downstream: the sync model, concurrency model, and AOI of the server tree.

## Reference

The node list is in the next section; for the same-topic comparison on the specialized-notes side, see Part 04, "Communication Protocol Design".

## Articles in this chapter

- [Game Networking Fundamentals](./01.md): first separate connection, session, message, and path responsibilities, to avoid lumping every networking problem together from the start.
- [I/O Models and Event Notification](./02.md): discuss how connection maintenance, the event loop, write buffers, backpressure, and business-thread responsibilities affect stability.
- [Transport Layer and Access Protocol Selection](./03.md): compare the real trade-offs of different transport options for control messages, in-match input, state sync, and mobile-network scenarios.
- [Data Frames and Protocol Contracts](./04.md): discuss how packet-body design, field evolution, error handling, and version compatibility become long-term governance problems.
- [Message Patterns and Event Dispatch](./05.md): discuss how request-response, push, broadcast, internal event streams, and the protocol layer should divide the work.
- [Reliability, Ordering, and Compatibility](./06.md): pull apart the three semantics — "reliable", "ordered", "compatible" — that are so often conflated, and explain how they should be implemented at separate layers.
- [Room Broadcast, Weak Networks, and the Domestic Network Environment](./07.md): put the abstract design above back into real mobile networks, network-switch reconnection, snapshot recovery, and broadcast-storm scenarios for discussion.

## References

- [Wikipedia · Video game networking](https://en.wikipedia.org/wiki/Netcode)
- [Wikipedia · Netcode](https://en.wikipedia.org/wiki/Netcode)

<!-- BACKLINKS-AUTO -->
## Related pages

- [01](01.md)
- [02](02.md)
- [03](03.md)
- [04](04.md)
- [05](05.md)
- [06](06.md)
- [07](07.md)
