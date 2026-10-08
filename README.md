[English](README.md) | [中文](README.zh.md)

<div align="center">

<p align="center"><img src="docs/public/logo.svg" width="64" height="64" alt="logo" /> </p>

# Game Knowledge System

<p align="center">
  <img src="docs/public/badges/topic.svg" alt="topic" />
  <img src="docs/public/badges/docs.svg" alt="docs" />
  <img src="docs/public/badges/license.svg" alt="license" />
  <img src="docs/public/badges/langs.svg" alt="langs" />
</p>

**An open-source game development knowledge graph for individual developers** — covering design, client, server, numerical design, art, tooling, and operations, connecting knowledge nodes through mature commercial games and mature open-source projects.

[Quick Start](#local-development) · [Directory Layout](#directory-layout) · [Read Online](https://cuihairu.github.io/hello-game/)

</div>

---

## Positioning

This is not a runnable game project. It is an **open-source game development knowledge graph for individual developers** — shaped like a knowledge web (MDN / Kubernetes docs / Wikipedia style), not a tutorial repository, not a course, and not a job-skill tree. Three organizing principles:

- **Organized by problem domain and scenario chains**: nodes are chained the way a game scenario actually runs, not arranged as a list of technology names. For example, the player login chain = login → gateway → session → player object → in-memory state → persistence → offline recovery; before writing a node, answer "what problem of the game backend does this solve".
- **Knowledge points are nodes, not long essays**: every page follows a fixed seven-section layout (Category / Definition / Problem / Algorithm / Used By / Related / Reference). The relation chains between nodes (Related / Implemented by / Used in / Case) are the body of the graph, and every chain must answer "why the next node is needed".
- **Cases only from mature commercial and mature open-source projects**: public facts and source-code references at the level of WoW, EVE, KBEngine, skynet, BigWorld, TrinityCore, Nakama, Netty, and Erlang; no unverified material.

Numerical design, game design, and art content are written from a programmer's perspective: numerical design covers the full chain of "attribute model → damage formula → client display → authoritative server calculation → config tables → numerical tuning", and art covers the asset pipeline (concept → model → texture → animation → engine import → runtime) written for programmers.

Intended readers:
- Individual developers who want to get into game development
- Backend / full-stack engineers who want to string the whole chain together by scenario
- Client / frontend engineers who want to understand how the server adjudicates
- Product, design, and test roles who want to understand game technology

## Directory Layout

Top-level trees of the knowledge graph (restructuring in progress: existing pages are being migrated into the node format step by step; no page is dropped):

```
docs/
├── industry/      # Game industry: AAA/indie/mobile/PC/console/online/Live Service/F2P; genre → technical requirements → team → cost
├── design/        # Game design: Core Loop/mechanics/levels/narrative/quests/progression/rewards/player psychology
├── system/        # Systems: character/inventory/equipment/skills/quests/achievements/guilds/leaderboards/shops/payments; a Design→Client→Server→DB→Operation chain per system
├── numerical/     # Numerical design: attributes/formulas/progression/balance/probability/drops/simulation/analytics (level curves, combat power, economy Source→Currency→Sink)
├── economy/       # Economy: currency/items/trading/inflation/faucet and sink/anti-cheat
├── client/        # Client: engines/rendering/animation/physics/UI/asset pipeline; prediction/interpolation/server reconciliation
├── server/        # Server: architecture/sessions/gateway/matchmaking/World/Zone/Battle/social/persistence/anti-cheat/extensibility; includes the sample node AOI
├── networking/    # Networking: transport/protocol contracts/reliability/weak-network conditions
├── database/      # Data: storage and middleware for player data/inventory/leaderboards/economy/replays
├── art/           # Art: asset pipeline (DCC→export→engine→runtime), written for programmers
├── audio/         # Audio
├── tools/         # Tools and technical art: shaders/pipelines/automation/procedural generation
├── production/    # Production: versioning/build/release/localization/QA/pipelines
├── operation/     # Operations: analytics/events/hot updates/GM/customer support/community
└── glossary/      # Glossary
```

The existing site consists of the **tutorial**, the **knowledge base**, and two **cross-cutting entries**: the tutorial is a 21-lecture practical route; the knowledge base is a chapter-by-chapter reference; the two track the same mainline topics side by side. The cross-cutting entries are browsed by time (history) and by category (game library), and every entry carries a backend-technology view. Both structures coexist during the migration; the site sidebar is authoritative.

```
docs/
├── 24-game-types-architecture/       # Tutorial (21 lectures + selection overview + extension lectures + expansion ledger expansion.md)
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
│   ├── 15 Learning resources and knowledge retention
│   ├── 16 Scripting, hot updates, and logic extension
│   ├── 17 Release, configuration, and the development pipeline
│   ├── 18 Security, risk control, and compliance
│   ├── 19 Client architecture and performance basics (extension)
│   ├── 20 Game testing and quality assurance (extension)
│   └── 21 Audio and art pipeline collaboration (extension)
│
├── history/                          # Cross-cutting entry: game history timeline (eight-track interactive timeline + design doc and node list)
├── games/                            # Cross-cutting entry: notable games library (entries + backend tech column + multi-dimensional filters)
│
└── Knowledge base
    ├── Reading guide and terminology conventions
    ├── 1. Overview and methodology
    ├── 2. Game genres and problem models
    ├── 3. Networking and access protocols
    ├── 4. Synchronization, combat, and real-time interaction
    ├── 5. Execution models and runtimes
    ├── 6. Service decomposition, distribution, and the control plane
    ├── 7. Messaging systems and inter-process communication
    ├── 8. Client architecture and engine systems
    ├── 9. Scripting, hot updates, and logic extension
    ├── 10. Release, configuration, and the development pipeline
    ├── 11. Data modeling and databases
    ├── 12. Caching, middleware, and infrastructure
    ├── 13. Common game services
    ├── 14. Operations, monetization, and data analytics
    ├── 15. Platform ecosystems, channels, and SDKs
    ├── 16. Observability, performance, capacity, and stability
    ├── 17. Security, risk control, and compliance
    ├── 18. Selection, practice, retrospectives, and checklists
    ├── 19. Web game frontend
    ├── 20. Game design and numerical systems
    └── Appendix and cross-cutting indexes (game genres / problem domains / config pipeline / capacity scaling / engine and language tooling)
```

> Note: knowledge-base directory names do not map one-to-one to chapter numbers (e.g. chapter 8 lives in `10-client-engine-runtime/`); the site sidebar is authoritative.

## Tech Stack

- **Docs framework**: VitePress
- **Deployment**: GitHub Pages (built automatically by Actions; pushing to main publishes)
- **Code samples**: Go / Python / Lua / Java / SQL / JS / HTML / TS / C / C++ / C# and more — the fenced-block language whitelist has 22 languages, enforced by the `tests/code-blocks` regression (every fence must declare a language; Go blocks must pass gofmt syntax checks)
- **Diagrams**: ASCII + Mermaid (syntax fallback regression in `tests/mermaid-syntax`)
- **Interactive animation**: GSAP (history timeline)

## Tests and Gates

- **Source coverage**: `npm test` (vitest) with a 100% coverage gate over the 11 theme source files (`coverage.include` in `vitest.config.mjs`: config + theme components and data layer)
- **Content regression**: the six-way audit in `tests/site-links` (in-site links, md totals, lecture counts, case coverage, ledger consistency), plus `tests/code-blocks` and `tests/mermaid-syntax`
- **Case smoke tests**: tutorial lectures and knowledge-base pages each ship with companion test cases (`tests/case-*.test.mjs` / `tests/kb-case-*.test.mjs`) that check structure, numeric closure, claim cross-checks, and reference closure

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
