# Cache, Middleware and Infrastructure

## Category

Overview of the database / cache subtree. Coverage: cache and locking (01), hotspots and messaging (02), registration discovery and load balancing (03), resource distribution (04).

## Definition

This chapter discusses why infrastructure that is often dismissed as "accessories" ends up deciding the ceiling of the system. If cache, MQ, registration discovery, object storage and CDN are not positioned clearly, they easily turn from helpers into hazards.

The core questions this set of records touches:

- The boundary of responsibility of infrastructure
- The real cost of cache consistency and middleware semantics
- The relationship between infrastructure selection and the priority of the business path

## Related

Chain of relations: cache boundary and locking (01) → hotspots and peak shaving (02) → registration discovery and load allocation (03) → resource distribution (04). Upstream: the data modeling main tree (authoritative source and derived replica semantics); downstream: service splitting of the server tree, the networking/ipc subtree (component-level landing of message semantics).

## Reference

The node list is in the next section; for the same-topic comparison on the specialized-notes side, see Specialized notes 08 "Data Storage and Middleware".

## Articles in this chapter

- [Redis, Leaderboards and Locking](./01.md): supplement the key judgments, costs and pitfalls in cache and middleware around "Redis, leaderboards and locking".
- [singleflight, MQ and Event Streams](./02.md): supplement the key judgments, costs and pitfalls in cache and middleware around "singleflight, MQ and event streams".
- [Registration Center, Load Balancing and Consistent Hashing](./03.md): supplement the key judgments, costs and pitfalls in cache and middleware around "registration center, load balancing and consistent hashing".
- [Object Storage, CDN and Resource Distribution](./04.md): supplement the key judgments, costs and pitfalls in cache and middleware around "object storage, CDN and resource distribution".

## References

- [Wikipedia · Cache (computing)](https://en.wikipedia.org/wiki/Cache_(computing))
- [Wikipedia · Database](https://en.wikipedia.org/wiki/Database)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/games/index.md)
