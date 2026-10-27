# Game Genre Topics

## Category

Overview of the industry / genres subtree. Coverage: room-based and lightweight online (01), hard-real-time competitive (02), persistent online world (03), long-cycle progression and management (04), platform and ecosystem (05), usage instructions (06).

## Definition

This set of appendices maps common game genres to technical problems; it does not attempt to define genres. Its focus is to record where each kind of product usually concentrates its technical complexity.

Looking at problems by genre has two benefits. First, it is closer to how teams talk day to day, making it easier to align with designers, producers, and publishers. Second, it shows why projects that are all called "game server" can have markedly different difficulties.

But genre is not an architecture conclusion. What truly decides the shape of the system is still the way state is shared, the way time advances, the way content is produced, the operational rhythm, and the commercial constraints. Two projects both called MMO can have radically different technical shapes; a product that looks casual may still become very complex because of strong social play and high-frequency events.

The core problems these records touch:

- The main technical pressure for each game genre
- The causes of architecture divergence within the same genre
- The applicability boundary of the genre label as a communication index

## Related

Relation chain: the five quick overviews (01-05) each back-reference the corresponding problem model in the models subtree; usage instructions (06) converges onto the six-question typology. Tree root [industry overview](../index.md).

## Reference

See the node list in the next section.

## Chapter Articles

- [Room-Based and Lightweight Online](./01.md): see why session-driven and room-based products usually place their complexity first in matchmaking, rooms, and reconnection.
- [Hard-Real-Time Competitive](./02.md): see why "game feel" and "fairness" push sync, anti-cheat, and the network link to center stage.
- [Persistent Online World](./03.md): see why, once the world persists, server splits, cross-scene play, consistency, and operations all become heavier.
- [Long-Cycle Progression and Management](./04.md): see why account-long-accumulation products behave more like a continuously operated data system.
- [Platform and Ecosystem Games](./05.md): see how UGC, creator ecosystem, and multi-platform distribution change the system boundary.
- [How to Use This Page](./06.md): explains how to use this set of appendices so that "genre" is not mistaken for "answer."

## References

- [Wikipedia · Video game genre](https://en.wikipedia.org/wiki/Video_game_genre)
- [Wikipedia · Video game industry](https://en.wikipedia.org/wiki/Video_game_industry)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [index](/industry/index.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [genre-coverage](/system/genre-coverage.md)
