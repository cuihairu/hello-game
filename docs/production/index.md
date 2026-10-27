# Version Release, Configuration, and the R&D Pipeline

## Category

Overview of the production tree. Coverage: version system (01–02), release safety (03), release coordination (04), configuration pipeline (05), release workflow (06), studio method (07), plus the config subtree (config/01–04) and the retro subtree (retro/01–05).

## Definition

The version problem in a game project is never just "build the package and then go live." What is genuinely hard is that the client, assets, scripts, configuration, protocol, server-side logic, and event data usually change at different rhythms, while players, channel review, platform rules, live events, and multi-platform coexistence force all of those changes to be absorbed by the system at the same time. The release system is therefore not just an operating procedure; it is a whole long-term governance capability.

Many teams lose ground on the version problem not because they cannot ship, but because they have long understood it too narrowly:

- assuming there is only one "current version" online
- assuming that having CI/CD is the same as having version governance
- assuming gray release is just a percentage switch
- assuming config tables and event data are not part of the formal release path

In the real world, release stability comes from a deeper capability: can the system describe exactly which set of components a given player is running, are those components compatible with one another, and when a problem appears can the system shrink the blast radius, cut losses quickly, and get back to a stable state.

This chapter is not about the steps of one particular review submission and launch. It treats the version as an engineering object that exists long-term, and asks how it should be decomposed, constrained, observed, and coordinated.

## Related

Relation chain: version decomposition (01–02) → release safety (03) → coordination (04) → configuration pipeline (05 and the [config subtree](/production/config/)) → workflow (06); the methodology for selection and retrospective closes in the [retro subtree](/production/retro/). Upstream: the client tree (the production side of client components); downstream: the operation tree (operations and observation), the numerical tree (the configuration side of numbers).

## Reference

See the node list in the next section.

## Chapter Articles

- [Version System Overview](./01.md): first build the whole-picture view that "a version is not a single number, but a set of related components."
- [Client, Asset, Config, and Protocol Versions](./02.md): split the different version dimensions apart and explain why they cannot stay bound to one rhythm for the long term.
- [Gray Release, Rollback, and Compatibility Windows](./03.md): discuss the three capabilities that release safety really depends on, and why they must all exist together.
- [Frontend-Backend Coordination and Platform Constraints](./04.md): analyze how platform review, channel rules, SDKs, and multi-platform coordination end up shaping the release plan in reverse.
- [Config Tables and the Data-Driven Pipeline](./05.md): treat configuration as a formal release object rather than an accessory editing artifact.
- [R&D Collaboration and the Release Workflow](./06.md): explain why version stability ultimately still comes back to organizational boundaries, responsibility interfaces, and workflow design.
- [Studio Division of Labor and Quality Gates](./07.md): distill a mature studio's role layering, phase gates, and quality evidence into a trimmable reference structure.

## References

- [Wikipedia · Continuous integration](https://en.wikipedia.org/wiki/Continuous_integration)
- [Wikipedia · Software deployment](https://en.wikipedia.org/wiki/Software_deployment)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [career](/industry/career.md)
