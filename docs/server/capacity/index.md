# Load Testing, Capacity Planning, and Scale Changes

## Category

Overview of the server / capacity subtree. Covers: load testing and capacity planning (01), scale changes (02), partition migration and server merge (03), multi-region and platformized operations (04).

## Definition

This set of appendices gathers capacity, scale changes, migration, and multi-region architecture in one place, suited to consultation during pre-launch preparation and long-cycle operations governance.

The core questions this set of records addresses:

- How load test results derive the capacity model
- Where the complexity of scale changes and migration comes from
- How multi-region architecture amplifies operational complexity

## Related

Dependency chain: capacity model (01) -> scale changes (02) -> migration and server merge (03) -> multi-region platformization (04). Upstream: the runtime subtree (backpressure and limits); downstream: operation/observability/05 (load test chain), production/03 (release capacity aspect), and the tree root [server overview](../index.md).

## Reference

See the node list in the next section.

## Articles in this chapter

- [Load testing and capacity planning](./01.md): Around "load testing and capacity planning," fills in the key judgments, costs, and pitfalls of the capacity appendix.
- [Scale out, scale in, and dynamic server additions](./02.md): Around "scale out, scale in, and dynamic server additions," fills in the key judgments, costs, and pitfalls of the capacity appendix.
- [Partitions, migration, server merge, and shutdown](./03.md): Around "partitions, migration, server merge, and shutdown," fills in the key judgments, costs, and pitfalls of the capacity appendix.
- [Platformized operations and multi-region architecture](./04.md): Around "platformized operations and multi-region architecture," fills in the key judgments, costs, and pitfalls of the capacity appendix.

## References

- [Agones docs](https://agones.dev/site/docs/)
- [Kubernetes docs](https://kubernetes.io/docs/)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](/server/index.md)
