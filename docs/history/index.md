# Game Development History Timeline

<HistoryAxis />

> Technology choices don't come out of thin air: everything in today's game backends is an answer that a specific product, in a specific era, under specific constraints, was forced to produce. This timeline looks back at game history since the 1970s along **eight tracks**:
>
> - **Game development**: landmark products and the rise of genres;
> - **Hardware**: the succession of PC/console/mobile and GPU generations;
> - **Frontend technology**: the evolution of the Web and browser graphics interfaces;
> - **Backend technology**: the shaping of data, caching, clusters, and concurrency models;
> - **Notable engines**: from engine and game as one to a mature licensing ecosystem;
> - **Gameplay**: the evolution of level, progression, multiplayer, and open-world paradigms;
> - **Art style**: the aesthetic migration from pixels to realism and on to stylization;
> - **Companies and signature works**: representative companies and their signature works, and what they pioneered.
>
> Years follow the more widely accepted accounts in public sources; entries whose details are disputed or whose sources disagree are marked "circa". Every entry follows the three-hard-fields convention: the **hardware/environment conditions** at its appearance, **what problem it solved**, and **what drawbacks it had**. Causal relations between tracks are shown in bidirectional pairs via the "→ gave rise to / ← influenced by" cross-link badges.

Overview: [1970s](#s-1970s) · [1980s](#s-1980s) · [1990s](#s-1990s) · [2000s](#s-2000s) · [2010s](#s-2010s) · [2020s](#s-2020s)

Design doc: [design.md](./design.md) · First batch of 76 nodes: [nodes.md](./nodes.md)

> Convention note: the interactive timeline on this page reads `docs/.vitepress/theme/data/timeline.mjs` as its runtime data; the [node list](./nodes.md) is the corresponding human-readable document copy, containing the same batch of nodes and fields. When maintaining nodes, treat the runtime data as the basis for rendering and update the list in step; data tests verify that entry titles correspond, keeping the two copies from drifting apart.

---

## 1970s · The starting point of multiplayer presence {#s-1970s}

<HistoryTimeline decade="1970s" />

## 1980s · High-score tables, saves, and the embryonic form of virtual worlds {#s-1980s}

<HistoryTimeline decade="1980s" />

## 1990s · Network sync and persistent worlds {#s-1990s}

<HistoryTimeline decade="1990s" />

## 2000s · The MMORPG wave and free-to-play {#s-2000s}

<HistoryTimeline decade="2000s" />

## 2010s · Mobile, live operations, and real-time competitive play {#s-2010s}

<HistoryTimeline decade="2010s" />

## 2020s · Cloud-native, cross-platform, and the reappraisal of in-house development {#s-2020s}

<HistoryTimeline decade="2020s" />

---

## Today, where the eight tracks converge

Lay the eight tracks on top of each other, and today's landscape is roughly:

- In **games and gameplay**, live operations has become the mainstream product shape: version pipelines, data analysis, and operational safety are no longer "post-launch matters" but parts drawn into the blueprint at project initiation;
- In **hardware and frontend**, mobile GPUs and browser WebGPU have made "one rendering stack across platforms" the norm, and the server's arbitration and the client's expressiveness must be budgeted together;
- In **backend and engines**, commercial engines (Unreal, Unity, and open-source newcomers like Godot) run in parallel with in-house development at the top studios; the division of labor, constraints, and collaboration boundary between engine and client are covered in [Lecture 03](/24-game-types-architecture/03-frontend-engines); sync models keep answering the old questions of [Lecture 04](/24-game-types-architecture/04-network): QuakeWorld's prediction and interpolation has grown into a complete layering from access, to rooms, to the big world.

> History doesn't repeat itself, but it rhymes: every time the platform (arcade→console→PC→web→mobile→cloud) and network conditions change, sync models and server architecture get re-answered all over again. We read history so that, when new constraints appear, we can recognize those old problems.

## References

- [Wikipedia · History of video games](https://en.wikipedia.org/wiki/History_of_video_games)
- [Wikipedia · Video game industry](https://en.wikipedia.org/wiki/Video_game_industry)

<!-- BACKLINKS-AUTO -->
## Related pages

- [expansion](/24-game-types-architecture/expansion.md)
- [index](/games/index.md)
- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
- [04-coverage-diff](/research/04-coverage-diff.md)
