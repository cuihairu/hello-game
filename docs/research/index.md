# Research Overview

## Category

Root of the research tree. Node position: the entry point for three dimensional surveys plus one consolidated diff, answering "has this repo's knowledge surface been reviewed against external material, and what did the review conclude." The judgment criterion matches [Genre and Functional Component Coverage Comparison](/system/genre-coverage): only standalone articles and dedicated sections count; a single term appearing in body text does not count as coverage.

## Definition

The survey spans three dimensions plus one roll-up: the **books dimension** treats publicly published engineering books as a topic checklist, extracting "what question does this book answer" from each; the **official docs dimension** treats mature engine and middleware documentation as a capability checklist, extracting "what problem does this document solve" from each; the **application scenarios dimension** places the extracted topics back into genres, answering "which topic is tight on which type of game"; the **coverage diff table** merges the judgments of the three dimensions into one ledger and states where each gap went. The three dimensions are independent of each other; independently arriving at the same set of gaps is the basis for trusting this criterion.

## Problem

Surveys most easily degenerate into "read once, then scattered": individual articles reach clear conclusions, but read together the overall picture is invisible, and later readers either repeat the survey or don't know which conclusions still hold. This page serves only as the entry point and index; judgment details stay in each individual article, avoiding maintaining the same conclusion in two places.

## Included

| Article | Dimension | Core data |
| --- | --- | --- |
| [Authoritative Books Survey](/research/01-authoritative-books) | Books | 15 books → 23 topics: 20 covered / 3 partial / 0 new gaps |
| [Engine and Middleware Official Docs Survey](/research/02-engine-middleware-docs) | Official docs | 23 documents → 23 topics: 21 covered / 2 partial / 0 new gaps |
| [Application Scenarios Comparison](/research/03-application-scenarios) | Application scenarios | 21 genres: 14 need backfill / 7 do not |
| [Coverage Diff Table](/research/04-coverage-diff) | Roll-up | Merges the three dimensions' judgments, gap destinations and backfill results |

**Conclusion: the three dimensions judge independently and point at the same set of gaps — the books and docs dimensions each leave 3 and 2 items as "partial" (all on the client presentation side, cut by "good-enough depth" so no new article is added), and the functional component dimension leaves 11 gaps, all of which were backfilled by the ten gameplay-system enrichment articles; the three dimensions' judgments corroborate each other — where the writing is thick the external material lines up, and where the writing is thin the external material also points at the same set of gaps.**

## Related

Chain of relations: three dimensions surveyed independently → diff roll-up → gap ordering → backfill and re-check. Each segment answers "why is the next one needed":

- A single dimension's checklist cannot give the whole picture; first each of the three dimensions must judge independently, and this page's table carries that layer.
- After the three dimensions' judgments are merged into one ledger, the destination of each gap becomes clear — see [Coverage Diff Table](/research/04-coverage-diff).
- After the diff table gives the gap order, backfill landings return to the system tree; the entry is [System Overview](/system/); knowledge-side convergence is at [Research Knowledge Points Overview](/knowledge).

Upstream reference baseline: [Genre and Functional Component Coverage Comparison](/system/genre-coverage). Downstream: [Research Knowledge Points Overview](/knowledge) (collapses survey output into knowledge points and pitfalls).

## Reference

- Retrieval and judgment dates: books and docs dimensions 2026-10-08; component dimension gap backfill 2026-10-09 to 2026-10-10, with per-article landings in [Coverage Diff Table](/research/04-coverage-diff).
- Each dimension's book list, doc entry points and source criterion follow the corresponding article's Reference section; this page does not repeat them.
- Terminology crosswalk: Coverage Audit, Dimension, Gap.

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](01-authoritative-books.md)
- [02-engine-middleware-docs](02-engine-middleware-docs.md)
- [03-application-scenarios](03-application-scenarios.md)
- [04-coverage-diff](04-coverage-diff.md)
