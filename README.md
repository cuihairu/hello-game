[English](README.md) | [中文](README.zh.md)

<div align="center">

<p align="center"><img src="docs/public/logo.svg" width="64" height="64" alt="logo" /> </p>

# Game Development Notes

<p align="center">
  <img src="docs/public/badges/topic.svg" alt="topic" />
  <img src="docs/public/badges/docs.svg" alt="docs" />
  <img src="docs/public/badges/license.svg" alt="license" />
  <img src="docs/public/badges/langs.svg" alt="langs" />
</p>

**Game development notes and experience gathered for individual developers** — covering design, client, server, numerical design, art, tooling, and operations, with mature commercial games and open-source projects as references.

[Quick Start](#local-development) · [Directory Layout](#directory-layout) · [Read Online](https://cuihairu.github.io/hello-game/)

</div>

---

## Positioning

This is not a runnable game project. It is an **open collection of personal game development notes and experience**. The pages are organized by topic and record type, capturing observations from research, project analysis, and architecture decisions.

- **Organized by topic and record type**: mechanism notes, project research, architecture records, retrospectives, quick references, and source-code observations. A topic may appear from different angles, with links between related pages.
- **Connections between problems are recorded**: for example, the player login chain touches login, gateway, session, player objects, in-memory state, persistence, and offline recovery.
- **References are included where available**: mature commercial games, open-source projects, official documentation, and source code; published facts and personal judgment are identified separately.

Numerical design, game design, and art notes are written from a game developer's perspective. For example, numerical design touches attribute models, damage formulas, client display, server calculations, config tables, and tuning; art notes cover the handoff from asset production to runtime.

These notes are mainly for individual developers interested in game technology, and may also be useful to colleagues in client, server, design, product, and test roles.

## Directory Layout

Current topic directories:

```
docs/
├── industry/      # Game industry: AAA/indie/mobile/PC/console/online/Live Service/F2P; genre → technical requirements → team → cost
├── design/        # Game design: Core Loop/mechanics/levels/narrative/quests/progression/rewards/player psychology
├── system/        # Systems: character/inventory/equipment/skills/quests/achievements/guilds/leaderboards/shops/payments; a Design→Client→Server→DB→Operation chain per system
├── numerical/     # Numerical design: attributes/formulas/progression/balance/probability/drops/simulation/analytics (level curves, combat power, economy Source→Currency→Sink)
├── client/        # Client: engines/rendering/animation/physics/UI/asset pipeline; prediction/interpolation/server reconciliation
├── server/        # Server: architecture/sessions/gateway/matchmaking/World/Zone/Battle/social/persistence/anti-cheat/extensibility; includes the sample node AOI
├── networking/    # Networking: transport/protocol contracts/reliability/weak-network conditions
├── database/      # Data: storage and middleware for player data/inventory/leaderboards/economy/replays
├── production/    # Production: versioning/build/release/localization/QA/pipelines
├── operation/     # Operations: analytics/events/hot updates/GM/customer support/community
├── research/      # Research: three-dimension coverage audits (books / official docs / application scenarios) + coverage diff
├── knowledge.md   # Knowledge digest: concepts, book and doc key points, scenarios, pitfalls
└── glossary/      # Glossary
```

Former economy topics now live across `numerical/`, `system/`, `database/`, and `operation/`. Art, audio, and tooling topics are covered in `client/`, the numbered topic notes, and related engineering pages; those legacy categories are not current top-level directories.

**Research and knowledge points**: the [knowledge digest](https://cuihairu.github.io/hello-game/knowledge) consolidates three coverage-audit surveys ([authoritative books](https://cuihairu.github.io/hello-game/research/01-authoritative-books), [official engine and middleware docs](https://cuihairu.github.io/hello-game/research/02-engine-middleware-docs), [application scenarios](https://cuihairu.github.io/hello-game/research/03-application-scenarios)) into core concepts, book and doc key points, application scenarios, and common pitfalls, each with a source note and an in-site landing link.

There are two common ways into the material: `24-game-types-architecture/` contains 27 numbered topic notes, while the topic directories group related records by domain. Both may cover the same subject from different angles and link to one another. The history timeline and game library provide time-based and case-based views. The site sidebar lists the current navigation.

```
docs/
├── 24-game-types-architecture/       # Numbered topic notes (27 articles + selection overview + expansion record)
│   ├── 01 Game backend technology panorama
│   ├── 02 Numerical and economy systems
│   ├── 03 Frontend engines and the client
│   ├── 04 Communication protocol design
│   ├── 05 Concurrency models: seven common approaches and where they fit
│   ├── 06 Common frameworks: from the lightest to the heaviest
│   ├── 07 Architecture overview
│   ├── 08 Data storage and middleware
│   ├── 09 Game programming patterns
│   ├── 10 Gameplay system design
│   ├── 11 Auxiliary system design
│   ├── 12 Game data analytics
│   ├── 13 Operations and infrastructure in practice
│   ├── 14 Development organization and project management
│   ├── 15 References and field notes
│   ├── 16 Scripting, hot updates, and logic extension
│   ├── 17 Release, configuration, and the development pipeline
│   ├── 18 Security, risk control, and compliance
│   ├── 19 Client architecture and performance basics
│   ├── 20 Game testing and quality assurance
│   ├── 21 Audio and art pipeline collaboration
│   ├── 22 Open-source matchmaking project selection
│   ├── 23 Player matchmaking and architecture placement
│   ├── 24 Entity synchronization and persistence
│   ├── 25 Entity database mapping and design philosophy
│   ├── 26 MMO engine survey
│   └── 27 MMO engine design highlights
│
├── history/                          # Cross-cutting entry: game history timeline (eight-track interactive timeline + design doc and node list)
├── games/                            # Cross-cutting entry: notable games library (entries + backend tech column + multi-dimensional filters)
│
└── Topic directories
    ├── Industry, genres, methodology, and problem models
    ├── Design, numerical systems, and common game systems
    ├── Networking, client, server, and runtimes
    ├── Scripting, releases, data, infrastructure, and production
    ├── Operations, monetization, platforms, performance, and security
    └── Web frontend, research, glossary, cases, and cross-cutting indexes
```

> `24-` is a retained directory name and URL prefix, not an article count; the directory currently contains 27 numbered topic notes, 01–27.

> Note: numbered topic notes and topic directories may cover the same subject from different angles; use the site sidebar for current navigation.

## Tech Stack

- **Docs framework**: VitePress
- **Deployment**: GitHub Pages (built automatically by Actions; pushing to main publishes)
- **Code samples**: Go / Python / Lua / Java / SQL / JS / HTML / TS / C / C++ / C# and more — the fenced-block language whitelist has 22 languages, enforced by the `tests/code-blocks` regression (every fence must declare a language; Go blocks must pass gofmt syntax checks)
- **Diagrams**: ASCII + Mermaid (syntax fallback regression in `tests/mermaid-syntax`)
- **Interactive animation**: GSAP (history timeline)

## Tests and Gates

- **Source coverage**: `npm test` (vitest) with a 100% coverage gate over the 11 theme source files (`coverage.include` in `vitest.config.mjs`: config + theme components and data layer)
- **Content regression**: the six-way audit in `tests/site-links` (in-site links, Markdown totals, numbered topic-note count, case coverage, ledger consistency), plus `tests/code-blocks` and `tests/mermaid-syntax`
- **Case checks**: numbered topic notes and topic pages have companion cases (`tests/case-*.test.mjs` / `tests/kb-case-*.test.mjs`) that check structure, numeric closure, claim cross-checks, and reference closure

Run `npm test` and `npm run docs:build` before committing content changes; push only when both are green.

## Reference Books

| Book | Author | Focus |
|------|------|------|
| 《游戏编程模式》(Game Programming Patterns) | Robert Nystrom | Design patterns |
| 《游戏数据分析的艺术》 | 于洋 等 | Data analytics |
| 《百万在线》 | 罗培羽 | Large-scale game server development |
| 《游戏服务器架构与优化》 | 蔡能 | Architecture and optimization |
| 《网络游戏核心技术与实战》 | 中嶋谦互 | End-to-end architecture |

## Local Development

```bash
npm install
npm run docs:dev     # dev server
npm run docs:build   # build (in-site dead-link check)
npm run docs:preview # preview the build
npm test             # tests + coverage (see "Tests and Gates")
```

## License

Apache License 2.0
