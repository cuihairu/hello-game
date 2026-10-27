# Message Systems and Inter-Process Communication

## Category

networking / IPC subtree overview. Coverage: boundaries (01), patterns (02), primary vs. peripheral discrimination (03), latency vs. throughput (04), idempotency and ordering (05), selection (06).

## Definition

Once a system moves from single-process to multi-process, multi-threaded, multi-service, communication is no longer as simple as "how do we get the data over there." The real difficulty is: which links must obtain a result synchronously, which links can be let go asynchronously, which messages are allowed to repeat, which messages must preserve ordering, and which links, once they back up, will drag the primary system down with them.

Message systems in game engineering are frequently misused in two ways. One is treating it as a universal bus, wanting to throw every request into a queue; the other is treating it only as a peripheral tool, underestimating the value of event-driven design for peak shaving, decoupling, and cross-system collaboration. The former makes the primary path inexplicable; the latter leaves the system carrying a lot of synchronous coupling for the long haul.

This chapter discusses not some particular MQ product, but the engineering boundary problem of messages and IPC: when to call directly, when to go through asynchronous events, why the communication semantics of primary and peripheral links must not be mixed, why latency, throughput, ordering, and idempotency are always pulling against each other, and what questions a team should actually be answering when choosing a communication approach.

## Related

Chain of relations: IPC boundaries (01) → communication patterns (02) → primary vs. peripheral discrimination (03) → latency/throughput tradeoff (04) → idempotency and ordering (05) → solution selection (06). Upstream: service splitting in the server tree; downstream: the open-source server map in the server tree (component landing).

## Reference

The node list is in the next section; for the same-topic comparison on the specialized-notes side, see Part 07 (service splitting, distribution, and the control plane).

## Articles in this chapter

- [IPC Basics and Scenario Boundaries](./01.md): first make clear "why IPC is needed" and "which links are suitable for messaging," so you do not dive straight into middleware selection.
- [Communication Patterns](./02.md): sort out which problems each of the common patterns — synchronous call, asynchronous delivery, publish/subscribe, request-response — is suited to.
- [Primary vs. Peripheral Paths](./03.md): explain why the in-match primary path usually cannot be taken over by MQ thinking directly, while peripheral paths are often well suited to being made event-driven.
- [Low Latency vs. High Throughput Tradeoff](./04.md): put real-time-ness, batch processing, peak shaving, backlog, and backpressure on the same engineering ledger for discussion.
- [Message Semantics, Idempotency and Ordering](./05.md): discuss why at-least-once, at-most-once, ordering constraints, duplicate delivery, and business idempotency always show up together.
- [How to Choose a Communication Approach](./06.md): give a selection method closer to engineering reality — choose by link semantics and failure cost, not by product names.

## References

- [Wikipedia · Inter-process communication](https://en.wikipedia.org/wiki/Inter-process_communication)
- [Wikipedia · Netcode](https://en.wikipedia.org/wiki/Netcode)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/networking/index.md)
- [01](01.md)
- [02](02.md)
- [03](03.md)
- [04](04.md)
- [05](05.md)
- [06](06.md)
