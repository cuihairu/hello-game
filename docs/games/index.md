# Well-Known Games Library

> The [history thread](/history/) manages time; this page manages **categorical browsing**: representative works organized by gameplay category, each entry carrying a **backend technology column** — server architecture, sync model, matchmaking service, real-time communication, storage and saves, anti-cheat validation, UGC and social services. It is both a game index and a case library for "how others solved these problems": click the technology tags inside an entry to jump straight to the corresponding knowledge point on the site.

## Gameplay classification system

| Category | Definition | Representative entries |
| --- | --- | --- |
| FPS/TPS | First/third-person shooters: real-time hit detection and low-latency sync at the core | Quake, Counter-Strike, Overwatch |
| MOBA | Multiplayer online arena battles: team-vs-team combat + in-match growth + strong server-side adjudication | League of Legends, Dota 2, Honor of Kings |
| RTS | Real-time strategy: concurrent control of large unit counts and deterministic simulation | StarCraft |
| MMORPG | Massively multiplayer online role-playing: persistent world + social systems + long-running operations | MUD1, World of Warcraft, Final Fantasy XIV, JX Online 3 |
| ARPG | Action role-playing: real-time combat + gear progression + a drop economy | Diablo III, Genshin Impact, Elden Ring |
| Open world | Seamless exploration of a large map with non-linear goals, often combined with online services | GTA Online, Genshin Impact, Elden Ring |
| Roguelike | Procedural generation + permadeath + in-match growth, mostly single-player | Hades |
| Sandbox | Tools without objectives: players create their own gameplay and content ecosystems | Minecraft, Roblox |
| Party / casual | Low-barrier multiplayer party games with short sessions and frequent restarts | Fall Guys |
| Narrative | Story and emotional experience at the core, often including social narrative | Sky: Children of the Light |
| Racing | Vehicle racing and competition, with latency compensation and ranked scores | Mario Kart 8 Deluxe, QQ Speed |
| Sports | Simulated real-world sports competition, with long-running card-based operations (the UT model) | EA Sports FC (FIFA) |
| Card building | Deck construction + match strategy; turn-based play suits a fully server-authoritative model | Hearthstone |
| Survival crafting | Resource gathering + building + survival pressure, often on persistent-world servers | Don't Starve Together, Minecraft |

## Entries

<script setup>
import GamesLibrary from '../.vitepress/theme/components/GamesLibrary.vue'
</script>

<GamesLibrary />

## How to read the backend technology column

- **Server architecture** answers "how the world is cut": sharding/partitioning, replica instances, cross-server, room-based, cloud instantiation — corresponding to [Categorizing game types by problem domain](/design/problem-domains/);
- **Sync model** answers "who trusts whom": frame sync or state sync, server-authoritative or client prediction — corresponding to [Lecture 04](/24-game-types-architecture/04-network);
- **Matchmaking / leaderboard / social** are the three pillars of general-purpose game services; expanded in [General-purpose game services](/system/services/) and [Cache and middleware](/database/cache/);
- Fields marked "not disclosed" are ones where the vendor has not published information, so no speculation is made; purely single-player games are honestly marked "not applicable" — the blank space itself is taxonomic information (compare [Hades](#entries)).

Entries and technology tags will be expanded in batches; if you spot errors or omissions in facts or technical details, please open an issue to point them out.

## References

- [Wikipedia · List of best-selling video games](https://en.wikipedia.org/wiki/List_of_best-selling_video_games)
- [Wikipedia · Video game](https://en.wikipedia.org/wiki/Video_game)

<!-- BACKLINKS-AUTO -->
## Related pages

- [expansion](/24-game-types-architecture/expansion.md)
- [10](/glossary/10.md)
