# Operations and Observability

## Category

Overview of the operation tree. Node positioning: after launch, what the system exposes is no longer the design document but its runtime behavior — the operations subtree governs "keeping the system continuously and correctly driven", the observability subtree governs "turning runtime behavior into locatable evidence". The two subtrees share the same upstream (the configuration and release pipeline) and the same set of definition disciplines.

## Definition

Operational capabilities (campaigns, monetization, reach, risk control) are fundamentally a control plane that continuously drives system change; observability (logs, metrics, Tracing, Profiling, load testing, stability governance) turns runtime behavior into information that is understandable, locatable, and actionable. The point where the two intersect is the data definition: operational judgment depends on aligned definitions, fault localization depends on a trustworthy chain of evidence — when definitions break down, both sides fail at once.

## Related

Division of labor and handoff between the two subtrees:

- [Operations, Monetization, and Data Analysis](/operation/bi/) — operations fundamentals → data definitions → three kinds of analysis → reach → AI boundary
- [Observability, Performance, Capacity, and Stability](/operation/observability/) — three-pillar evidence → main-link metrics → performance forensics → fault localization → capacity projection → controllable stability

Upstream: production tree (configuration pipeline and release flow); downstream: economy tree (planned migration), numerical tree.

## Reference

See the two subtrees' overview pages for the node list.

## References

- [Wikipedia · Software metric](https://en.wikipedia.org/wiki/Software_metric)
- [Wikipedia · Logging (software)](https://en.wikipedia.org/wiki/Logging_(software))

<!-- BACKLINKS-AUTO -->
## Related Pages

- [index](/operation/bi/index.md)
- [index](/operation/observability/index.md)
