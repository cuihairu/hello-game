# Coverage Diff Table

## Category

research / survey four. Node position: merge the judgments of the three dimensions — books, official docs, and functional components — into one ledger, stating gap destinations and backfill results. The raw judgments of the three dimensions live in [Authoritative Books Survey](/research/01-authoritative-books), [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs), and [Genre and Functional Component Coverage Comparison](/system/genre-coverage); this page only merges, it does not re-judge.

## Definition

Coverage diff = the judgmental delta between the topics and components listed by external material and this repo's existing articles under `docs/`. The three dimensions count in different units and cannot be added: the books and docs dimensions count in "topics," the functional component dimension counts in "components." Counting the same thing once per dimension is by design, not duplication.

## Problem

Viewed separately, each dimension is self-consistent; only when combined do two things become visible. First, "mutual corroboration from both sides" — the trees written thick line up with external material, and the trees written thin are also pointed at the same set of gaps by external material. Second, gap destination — items judged "partial" that will not get a new article need a reason, and items judged "gap" need a landing and an order. Without this merge layer, survey conclusions would only exist inside their individual articles.

## Judgments of the Three Dimensions

| Dimension | Article | Topic/component count | Covered | Partial | Gap |
| --- | --- | --- | --- | --- | --- |
| Books | [Authoritative Books Survey](/research/01-authoritative-books) | 23 topics | 20 | 3 | 0 |
| Official docs | [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs) | 23 topics | 21 | 2 | 0 |
| Functional components | [Genre and Functional Component Coverage Comparison](/system/genre-coverage) | 46 components | 40 | 6 | 0 |

**Conclusion: the three dimensions together leave no residual gaps — the books and docs dimensions never had new gaps to begin with, and the 11 gaps the functional component dimension originally had were backfilled by the gameplay system enrichment batch, so its judgment flipped from 29/6/11 to 40/6/0.**

## Gap Destinations

### The five items judged "partial": cut by good-enough depth, no new article added

| Dimension | Partial item | Reason for not adding an article |
| --- | --- | --- |
| Books | Math, physics and collision | Cut by good-enough depth on the client side; specialized notes 07 only need to touch on it, consistent with the "the backend is our home ground" positioning |
| Books | AI mechanisms (pathfinding, behavior trees, NPC decision-making) | This repo's [AI Application Scenarios in Clients and Game Systems](/client/05) covers scenarios only, not mechanisms; mechanism implementation is left on-demand |
| Books | Classic engine teardowns (DOOM, Quake) | Historical material, carried by the [Game Development History Timeline](/history/) node |
| Official docs | FMOD Studio (audio middleware) | Specialized notes [21 Art and Audio Pipeline Collaboration](/24-game-types-architecture/21-art-audio-pipeline) has an audio pipeline dedicated section; middleware names do not become standalone articles |
| Official docs | Wwise (audio middleware) | same as above |

### The 11 items judged "gap": backfilled by demand density

The 11 functional component gaps (quests, achievements, dex, equipment enhancement and star-up, stamina gating, check-in/welfare/redeem codes, battle pass, marquee announcements, cosmetics/skins, home/territory, voice) were backfilled by the ten gameplay system enrichment articles from 2026-10-09 to 2026-10-10. Per-item landings and judgment flips are in the gap list section of the [coverage comparison page](/system/genre-coverage). Backfill order was ranked by genre demand density (quests and achievements first, then marquee and check-in); that order was independently computed in both [Application Scenarios Comparison](/research/03-application-scenarios) and the coverage comparison page, with matching results.

## Related

Chain of relations: three-dimension judgments → ledger merge → gap destinations → backfill and recheck. Each segment answers "why is the next one needed":

- Per-dimension judgments are self-consistent but do not add up to a ledger; first merge them, and this page's judgment table carries that layer.
- After the merge, gap destinations become clear: partial items get a reason for not being added, gap items get an order and a landing.
- After landings are built, they must be rechecked; the recheck results are written back to the judgment column of the [coverage comparison page](/system/genre-coverage), and this page does not maintain them redundantly.

Upstream: [Research Overview](/research/). Peers: [Authoritative Books Survey](/research/01-authoritative-books), [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs), [Application Scenarios Comparison](/research/03-application-scenarios). Upstream baseline: [Genre and Functional Component Coverage Comparison](/system/genre-coverage). Knowledge-side convergence is at [Research Knowledge Points Overview](/knowledge).

## Reference

- All numbers on this page are drawn from the corresponding articles of the three dimensions; judgment date 2026-10-08; component gap backfill 2026-10-09 to 2026-10-10.
- The three dimensions count in different units (topic / component); no cross-dimension totals are computed, this page only lists them side by side.
- Terminology crosswalk: Coverage Diff, Partial, Gap Closure.

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](01-authoritative-books.md)
- [02-engine-middleware-docs](02-engine-middleware-docs.md)
- [03-application-scenarios](03-application-scenarios.md)
- [index](index.md)
