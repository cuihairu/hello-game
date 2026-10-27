# Career Map

## Category

industry / horizontal node / career map. One line: lay out "what roles exist in the industry, how they divide the work, and how they grow and flow" as a single chart you can look up against — personal inventory and team hiring use the same chart.

## Definition


The industry tree answers "what is a project"; this node answers "who builds the project, how capabilities combine into roles, and how roles migrate across project types." The map is organized by four families — design, engineering, art and audio, operations and publishing — each family corresponding to one corner of the project's three inputs (gameplay type, platform, business model, see the [tree root overview](./index.md)). It mirrors [retro/05 four-dimension self-check](/production/retro/05): retro/05 is a personal-side capability inventory, while this page is the industry-side structural baseline — every shortcoming surfaced by a self-check only means something once it maps back onto some role requirement in this chart.

## Problem

- **Understanding careers by job title**: the same job title carries vastly different responsibilities across project types — in a room-based small team, "server" is one person carrying the whole load; in a large MMO team, the server side is split by domain into five or six roles. Without project type as a coordinate, a job-title comparison chart is misleading.
- **Growth reduced to a single upward track**: the industry actually has a great deal of cross-family mobility (engineer to TA, designer to producer, client to engine), and a map with no direction of flow degrades personal planning into a one-way "job-hop for a higher grade" lane.
- **Personal inventory has no industry anchor**: shortcomings found by closing yourself in for a self-check may not even appear on that role's requirement list, or you may have missed the capability that actually bears the load — if the reference is wrong, you spend effort patching gaps that do not matter.
- **Team formation copied straight from the JD**: hiring and staffing without regard for the project type's dominant contradiction lands a capability mix misaligned with the project's real needs; only at review time does the team notice "the people are excellent, the configuration is wrong."

## Algorithm

### Four job families × project inputs

| Family | Core output | Corresponding project input | Boundary with adjacent families |
|--------|-------------|-----------------------------|---------------------------------|
| Design family | gameplay definition, numerical, systems, levels | gameplay type (dominant contradiction) | defines gameplay but not the implementation baseline (the engineering family's adjudication boundary, see [client-server boundaries](/industry/methodology/05)) |
| Engineering family | client, server, engine, tools | platform (technical boundary) | within the family, work is divided by problem domain across the client/server trees, not by job title |
| Art and audio family | concept art, 3D, animation, VFX, TA, audio | presentation and performance budget | TA is the cross-family translation layer: the performance budget stated in art language is translated into implementation constraints stated in engineering language |
| Operations and publishing family | version cadence, channels, monetization, users | business model (version and operations cadence) | the version cadence in turn constrains the release and hot-update design of the technical trees (an input to [production](/production/)) |

### Three baselines for growth and mobility

- **Vertical**: the job-grade ladder within a family (junior → senior → expert / management). The criterion for capability is "what scope of problem you can define and deliver independently," not years of tenure.
- **Horizontal migration**: the real cost of cross-family mobility = the gap in baseline between adjacent families. Engineer to TA is expensive on art language; designer to producer is expensive on business and organization — read the direction of migration clearly on the map before you spend time on it.
- **Project-type migration**: switching project type costs more than switching role — the dominant contradiction changes (the [problem models](/industry/models/) are all different across the six types), and the configuration and load-bearing capabilities within each of the four families must be rearranged.

### Interface with personal self-check

[retro/05 four-dimension self-check](/production/retro/05) → check against the role requirements of the four families on this page → slot each shortcoming into place → study along the gap-filling path: the engineering family's technical side lives in the client, server, and database trees, the design family's baseline side lives in the design and numerical trees — learning resources are slotted back by family, not scoured site-wide.

## Used By

Hiring and team formation (backing out the four-family configuration from project type); personal growth planning (the industry anchor for self-checks and the slotted placement of learning resources); promotion and job-grade review (cross-alignment of capability criteria); role-change and career-change decisions (migration cost and baseline-gap assessment); outsourcing boundary agreements (landing [engines/03 outsourcing judgment](/client/engines/03) onto the job families).

## Related

Relation chain: four job families → project input mapping → growth and mobility → self-check interface → team formation baseline. Each segment answers "why the next one is needed":

- families first, then input mapping: the division into families should itself be driven by project inputs, not by the talk of the hiring market.
- only once input mapping is set can you talk about growth: the cost of the vertical, horizontal, and type-migration tracks is all computed from the relationship between family and input.
- the growth baseline must connect to self-check: a personal inventory that does not map back to role requirements is practice without coordinates.
- only after self-check can you get to formation: the same chart used in reverse is the basis for team configuration.

Upstream: [retro/05 personal self-check](/production/retro/05) (the referring side; this page is its downstream career anchor), [systematic accumulation of experience](/industry/methodology/07) (upstream of the growth method), [problem models](/industry/models/) (role configuration is set by project type); sister nodes: [boundaries among client, server, platform, and operations](/industry/methodology/05) (the responsibility-baseline version of the four-family division), [game development knowledge map](/industry/methodology/01) (the isomorphic map on the knowledge side); downstream: [production tree](/production/) (the team delivery side), [design tree](/design/) and [numerical tree](/numerical/) (the baseline side of the design family).

## Reference

- This page is a distillation of engineering experience; it is not tied to any specific company's job-grade system.
- Terminology reference: Career Map (career map), Job Family (job family), T-shaped Skill (T-shaped capability), Role Transition (role migration)

## References

- [Wikipedia · Video game developer](https://en.wikipedia.org/wiki/Video_game_developer)
- [Wikipedia · Video game industry](https://en.wikipedia.org/wiki/Video_game_industry)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [index](index.md)
- [05](/production/retro/05.md)
