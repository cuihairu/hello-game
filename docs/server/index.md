# Server

## Category

Overview of the server tree. Node positioning: server knowledge splits into five subtrees by problem domain -- sync and combat, execution model and runtime, service splitting and the control plane, capacity scaling, security/risk-control/compliance -- plus four horizontal nodes (AOI, the Skynet source-code analysis, server language and runtime, the open-source server map).

## Definition

The server tree answers "how does authoritative state get advanced and maintained": the pace and adjudication live in the sync subtree, the carrier of the advancement and its concurrency surface live in the runtime subtree, the organization of those doing the advancing lives in the services subtree, the elasticity of the scale lives in the capacity subtree, and the adversarial and governance side of the process lives in the security subtree.

## Related

The five subtrees and the horizontal nodes:

- [Sync, combat, and real-time interaction](/server/sync/) -- time -> model -> frame sync -> frame catch-up and reconnection -> prediction -> determinism -> replay -> skills
- [Execution model and runtime](/server/runtime/) -- stance -> execution model -> the three-piece set -> Tick -> backpressure -> locks -> specialized runtimes
- [Service splitting, distribution, and the control plane](/server/services/) -- four questions of splitting -> roles -> control plane -> routing -> consistent recovery
- [Capacity scaling](/server/capacity/) -- capacity model -> scaling -> migration and server merge -> multi-region platformization
- [Security, risk control, and compliance](/server/security/) -- settlement authority -> data governance -> risk control -> compliance -> dependencies
- Horizontal nodes: [AOI: area of interest](/server/aoi), [Skynet: C kernel + Lua Actor](/server/skynet), [Server language and runtime](/server/language), [Open-source server map](/server/map)

Upstream: the industry and design trees (problem domain and type-fitting); downstream: the system, networking, and database trees (lateral expansion), the production and operation trees (delivery and the running surface).

## Reference

The node lists live on each subtree's guide page.

## References

- [Wikipedia · Game server](https://en.wikipedia.org/wiki/Game_server)
- [Wikipedia · Microservices](https://en.wikipedia.org/wiki/Microservices)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/server/capacity/index.md)
- [index](/server/runtime/index.md)
- [index](/server/security/index.md)
- [index](/server/services/index.md)
- [index](/server/sync/index.md)
