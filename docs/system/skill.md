# Skill System

## Category

system / gameplay systems. Node positioning: split a "skill" into five parts — configuration, timeline, target selection, effect pipeline, and buffs — and answer which layer each part belongs in and by what convention it extends. Sync and adjudication detail lives in the server tree (sync/08), and combat numerical conventions live in the numerical tree — this page only covers the component composition and extension boundaries.

## Definition

The essence of a skill system is an effect production pipeline: a single cast starts from input, passes through target selection, timeline advancement, effect instantiation, and buff/passive attachment, ultimately changing entity state and broadcasting it outward. The quality of a skill system is not measured by "how many skills were written" but by whether new skills can be built mostly by composing existing parts — skill count growth must not mean code growth, and that is the only goal of componentised design.

## Problem

Skill-system pitfalls concentrate in three places, and they amplify each other:

- **Boundaries**: presentation, adjudication, and numbers are written together. A skill script both renders VFX, computes damage, and does target adjudication, so any change anywhere forces a regression of all skills.
- **Growth**: projects that start "one script per skill" begin copy-pasting by the thirtieth skill, and by the hundredth nobody dares touch shared code — because nobody can say which skill depends on which side effect.
- **Adjudication**: sync, replay, and reconnection are "padded in later." Adjudication moment, hit window, and buff iteration order are not fixed at the system layer first, so when the patch comes each skill's adjudication is undefinable (the process-sync unfolding is in [Sync and Skills](/server/sync/08)).

Set component boundaries first, then talk implementation; a system built in the wrong order ends up as "every content addition feels like defusing a bomb."

## Algorithm

### The five-part split

| Part | Responsibility | Belongs to | Common misplacement |
|------|------|------|---------|
| Configuration | cost / cooldown / pre- and post-cast timing / target-rule id / effect-sequence id | designer tables or JSON, **not code** | skill parameters hardcoded into the script, so a number change ships a release |
| Timeline | advancing wind-up → effect point → recovery | client presentation leads, server adjudicates against the authoritative timeline | effect point follows the animation, so a client hitch shifts the adjudication |
| Target selection | the rule set for aimed / unaimed / AOE / self-select | rules are configuration data, executed with server-side revalidation | the target list is reported by the client and never revalidated |
| Effect pipeline | ordered composition of atomic effects (damage / heal / displacement / apply buff / summon) | the server is the authoritative executor | effect types hardcoded as an enum, so a new type means editing a global switch |
| Buffs and passives | listening and periodic effects on a unified event stream | server authoritative, client presentation layer rehearses | every buff field goes into the sync snapshot, and bandwidth is drowned by state |

- **Configuration layer**: a skill is data. The sound shape of a skill configuration is "entry fields + an effect-sequence reference," where the effect sequence itself is also configuration. For the boundary of what goes into tables versus what goes into scripts, see [Config-Driven vs Script-Driven](/system/scripting/03).
- **Timeline**: the effect point is the whole skill's adjudication anchor — it decides how client-side prediction and server correction behave (wind-up interrupted, whether a death before the effect point still counts). Decouple the timeline from the animation: animation may drop frames, the timeline does not.
- **Target selection**: targeting rules are themselves configurable data (radius / angle / count / friendly filter), and execution is always revalidated server-side — a client report can only be treated as intent.
- **Effect pipeline**: an effect is an ordered list of atomic operations, composable and insertable. Damage bonuses, crits, and mitigation are plugins on the pipeline, not ifs scattered through skill code.
- **Buffs and passives**: a passive is a zero-duration skill that listens on the unified event stream (onCast/onHit/onTick). Buffs and passives share the same event stream, which is what keeps new mechanics from needing new execution paths.

### The four extensibility questions (acceptance conventions)

1. Can a new skill be built mostly by composing existing parts?
2. Can a new effect type extend locally, rather than by changing global dispatch?
3. Do skills, buffs, passives, and summons share one unified event stream?
4. Can an online problem be located to a specific cast instance, a specific target selection, a specific effect settlement?

If all four pass, skill count growth does not come with maintenance-cost growth. The sync-side unfolding of these four questions (frame alignment, cast flow, buff sync boundaries) is in [server tree sync/08](/server/sync/08).

### Trade-offs

The price of componentisation is up-front abstraction cost: the interfaces of the five parts exist before the first skill. A small project (single-digit total skill count, no iteration) can degrade to "configuration + one skill script," but it must hold one line: **adjudication and effect execution stay server-side, configuration and presentation stay client-side** — break that line and everything downstream is rework. Numerical conventions for skills (damage formulas, growth curves) are not this page's business; see [Combat Numbers](/numerical/02).

## Used By

- **BigWorld** (commit `088d3b84`, paths relative to `programming/bigworld/`): the entity script layer is embedded Python (`README.md:21`), and entity definitions are carried engine-side by `lib/entitydef/` — a skill is written in the script layer as an entity method doing only "pick target + start effect"; adjudication, AOI culling, and broadcasting are cellapp's business, and the script never touches sync.
- **skynet** (commit `64391f7`): combat is built as an independent Lua service — 22 built-in services each with one job (the `service/` directory), with business services started via `skynet.launch` (`service/launcher.lua:95`); serial message semantics inside a single service naturally eliminate concurrent write contention, so the effect pipeline's execution order is reproducible.
- **Colyseus** (commit `e620123`): the engine provides no skill facilities at all — room tick advances simulation at 60fps and patches at 20fps by default (`packages/core/src/Room.ts:57-58`); all five parts are built explicitly inside the room class; a useful minimal reference surface for a "component-boundary self-check."

## Related

Relationship chain: component split → layer assignment → extension conventions → engine landing → the downstream of numbers and sync. Each segment answers "why the next one is needed":

- After the split comes assignment: each part's client/server division of labour and its adjudicator is the projection of the front/back-end boundary onto skills (see [Client Responsibility Boundaries](/client/02)).
- With assignment settled, growth needs a convention: the four extensibility questions are the acceptance checklist at review time, not a slogan.
- Once the convention passes, land it on an engine: the three engines' three attitudes toward "skill facilities" (script entities / service-ised / fully self-built) give the landing spectrum.
- After landing comes downstream: numerical conventions live in the numerical tree, process sync in the server tree, and the effect entry point of what a skill produces is [Settlement](./settlement.md).

Sister nodes on the same convention: [Leaderboard](./leaderboard.md), [Party Matchmaking](./party-matchmaking.md), [PVP Matchmaking](./pvp-matchmaking.md) (also gameplay systems, using the same set-the-convention-first-then-implement method).

## Reference

- This page is a synthesis of engineering experience; the three engines' facts are per the commit-anchored source references in the text
- Frame alignment between process sync and skills, and buff sync boundaries: [server tree sync/08](/server/sync/08)
- Terminology: Ability/Skill, Cast Time, Effect Pipeline, Buff/Debuff

## References

- [Wikipedia · Skill tree](https://en.wikipedia.org/wiki/Skill_tree)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [08](/server/sync/08.md)
- [genre-coverage](genre-coverage.md)
- [index](index.md)
- [quest](quest.md)
- [settlement](settlement.md)
