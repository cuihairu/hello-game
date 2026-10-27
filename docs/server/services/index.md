# Service Splitting, Distribution, and the Control Plane

## Category

Overview of the server / services subtree. Covers: splitting methodology (01), service roles (02), the control plane (03), discovery, routing and collaboration (04), consistency, recovery and reconnection (05).

## Definition

Many teams face distribution in earnest for the first time not because they want an "architecture upgrade", but because the old system can no longer hold up under real-world pressure. The load curves of the room server and the event server are completely different, cross-server gameplay starts going live, hot scenes need to be migrated, node failures can no longer be handled by manual firefighting, and player reconnection can no longer be left to luck.

At this point the real question is not "microservices or not", but the following, more concrete engineering questions:

- Which state must be maintained together, and which state can be split apart and governed separately
- Which nodes should scale up and down independently, and which failures must be isolated locally
- Who schedules players, teams, rooms, and scenes as they migrate across nodes
- Who manages routing, discovery, traffic cutover, draining, and maintenance state in a unified way
- After a cross-service path fails, how does the system recover to an explainable state

If these questions are not answered clearly first, so-called "service splitting" usually just renames monolithic complexity as network complexity, path complexity, and recovery complexity.

This chapter is not organized around middleware names, but around the classes of problems that surface first once a system goes distributed: how to draw the boundary, how to divide the roles, why the control plane turns from a supporting capability into the main system, why routing and discovery become core infrastructure, and why consistency, reconnection, and recovery must be formally designed from the very start.

## Related

Relationship chain: the four questions of splitting (01) → roles (02) → control plane (03) → routing (04) → consistency and recovery (05). Upstream: the runtime subtree (the failure isolation surface); downstream: glossary/07 (the control plane entry), the database tree (transactional consistency), the tree root [server overview](../index.md).

## Reference

See the node list in the next section.

## Articles in this chapter

- [Service splitting methodology](./01.md): First judge why a project is forced into splitting, then look at whether the boundary should really be drawn around state, failure domains, or scaling needs.
- [Core service roles](./02.md): Sort out what the common roles — gateway, account, matchmaking, room, scene, event, leaderboard, payment, and the governance layer — should each own and not own.
- [Coordination layer, cross-server, and the control plane](./03.md): Explain why, once a system enters the stage of multiple regions, multiple gameplay modes, and dynamic scheduling, "who commands nodes and migrations" must be built out as a formal capability of its own.
- [Service discovery, routing, and collaboration](./04.md): Discuss how a request finds the correct target, how binding relationships are maintained, and how services must collaborate so that routing logic is not scattered everywhere.
- [Consistency, recovery, and reconnection](./05.md): Put cross-service failure, idempotency, compensation, session recovery, and player reconnection into one shared set of recovery semantics.

## References

- [Heroic Labs docs](https://heroiclabs.com/docs/)
- [Wikipedia · Game server](https://en.wikipedia.org/wiki/Game_server)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/server/index.md)
- [skynet](/server/skynet.md)
