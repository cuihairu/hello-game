// 官方 locales 结构：root=英文外壳（完整内容在 zh/），zh=全量中文站。
// 由 locales 迁移脚本生成：sidebar/nav 链接与键已加 /zh/ 前缀，public 资源保持在站点根。
export default {
  "title": "游戏开发笔记",
  "description": "面向个人开发者整理的游戏开发笔记与经验，覆盖设计、客户端、服务器、数值、美术、工具与运营，并以商业游戏、开源项目和官方资料为参照",
  "base": "/hello-game/",
  "cleanUrls": true,
  "head": [
    [
      "link",
      {
        "rel": "icon",
        "href": "/hello-game/logo.svg"
      }
    ]
  ],
  "locales": {
    "root": {
      "label": "English",
      "lang": "en-US",
      "title": "Game Dev Notes",
      "description": "Game development notes for indie developers. Full content is available in Chinese.",
      "themeConfig": {
        "logo": "/logo.svg",
        "siteTitle": "Game Dev Notes",
        "nav": [
          {
            "text": "Home",
            "link": "/"
          },
          {
            "text": "Technology Map",
            "link": "/24-game-types-architecture/01-entry"
          },
          {
            "text": "Design & Numbers",
            "link": "/24-game-types-architecture/02-game-design"
          },
          {
            "text": "Architecture Notes",
            "link": "/24-game-types-architecture/07-core-arch"
          },
          {
            "text": "Networking & Comms",
            "link": "/24-game-types-architecture/04-network"
          },
          {
            "text": "Programming & Implementation",
            "link": "/24-game-types-architecture/09-programming-patterns"
          },
          {
            "text": "Operations & Production",
            "link": "/24-game-types-architecture/13-tech-ops"
          },
          {
            "text": "History",
            "link": "/history/"
          },
          {
            "text": "Game Cases",
            "link": "/games/"
          },
          {
            "text": "Topic Index",
            "link": "/00-reading-guide/"
          }
        ],
        "sidebar": {
          "/24-game-types-architecture/": [
            {
              "text": "Game Types and Architecture Selection Comparison",
              "link": "/24-game-types-architecture/"
            },
            {
              "text": "Panorama and Positioning",
              "collapsed": false,
              "items": [
                {
                  "text": "01 The Game Backend Technology Map",
                  "link": "/24-game-types-architecture/01-entry"
                }
              ]
            },
            {
              "text": "Design and Client",
              "collapsed": false,
              "items": [
                {
                  "text": "02 Numerical Design and Economy Systems",
                  "link": "/24-game-types-architecture/02-game-design"
                },
                {
                  "text": "03 Frontend Engines and Clients",
                  "link": "/24-game-types-architecture/03-frontend-engines"
                }
              ]
            },
            {
              "text": "Architecture",
              "collapsed": false,
              "items": [
                {
                  "text": "04 Communication Protocol Design",
                  "link": "/24-game-types-architecture/04-network"
                },
                {
                  "text": "05 Concurrency Models",
                  "link": "/24-game-types-architecture/05-concurrency-models"
                },
                {
                  "text": "06 Common Frameworks",
                  "link": "/24-game-types-architecture/06-frameworks"
                },
                {
                  "text": "07 Architecture Overview",
                  "link": "/24-game-types-architecture/07-core-arch"
                },
                {
                  "text": "08 Data Storage and Middleware",
                  "link": "/24-game-types-architecture/08-data-storage"
                }
              ]
            },
            {
              "text": "Mechanics and Implementation",
              "collapsed": false,
              "items": [
                {
                  "text": "09 Game Programming Patterns",
                  "link": "/24-game-types-architecture/09-programming-patterns"
                },
                {
                  "text": "10 Gameplay System Design",
                  "link": "/24-game-types-architecture/10-gameplay-systems"
                },
                {
                  "text": "11 Auxiliary System Design",
                  "link": "/24-game-types-architecture/11-auxiliary-systems"
                }
              ]
            },
            {
              "text": "Operations & Production",
              "collapsed": false,
              "items": [
                {
                  "text": "12 Game Data Analytics",
                  "link": "/24-game-types-architecture/12-data-analytics"
                },
                {
                  "text": "13 Ops in Practice",
                  "link": "/24-game-types-architecture/13-tech-ops"
                },
                {
                  "text": "14 Dev Organizations",
                  "link": "/24-game-types-architecture/14-dev-organization"
                }
              ]
            },
            {
              "text": "Engineering Topics",
              "collapsed": false,
              "items": [
                {
                  "text": "15 References",
                  "link": "/24-game-types-architecture/15-references"
                },
                {
                  "text": "16 Script Hot Updates",
                  "link": "/24-game-types-architecture/16-scripting-hotfix"
                },
                {
                  "text": "17 Versioning, Release and Configuration",
                  "link": "/24-game-types-architecture/17-versioning-release"
                },
                {
                  "text": "18 Security, Risk Control and Compliance",
                  "link": "/24-game-types-architecture/18-security-compliance"
                },
                {
                  "text": "Topic Expansion Plan",
                  "link": "/24-game-types-architecture/expansion"
                }
              ]
            },
            {
              "text": "Matchmaking, Data and Engine Topics",
              "collapsed": false,
              "items": [
                {
                  "text": "19 Client Architecture and Performance Fundamentals",
                  "link": "/24-game-types-architecture/19-client-architecture"
                },
                {
                  "text": "20 Game Testing and Quality Assurance",
                  "link": "/24-game-types-architecture/20-game-testing"
                },
                {
                  "text": "21 Audio and Art Pipeline Collaboration",
                  "link": "/24-game-types-architecture/21-art-audio-pipeline"
                },
                {
                  "text": "Open Source Project Selection Survey",
                  "link": "/24-game-types-architecture/22-matchmaking-oss"
                },
                {
                  "text": "Self-Built Architecture: Responsibilities and Placement",
                  "link": "/24-game-types-architecture/23-matchmaking-architecture"
                },
                {
                  "text": "Attribute Sync and Persistence",
                  "link": "/24-game-types-architecture/24-entity-sync-persistence"
                },
                {
                  "text": "Attribute DB Mapping and Design Philosophy",
                  "link": "/24-game-types-architecture/25-entity-db-mapping-philosophy"
                },
                {
                  "text": "MMO Engine Comparison",
                  "link": "/24-game-types-architecture/26-mmo-engine-survey"
                },
                {
                  "text": "Engine Design Highlights",
                  "link": "/24-game-types-architecture/27-mmo-engine-design-highlights"
                }
              ]
            }
          ],
          "/server/": [
            {
              "text": "Server Overview",
              "link": "/server/"
            },
            {
              "text": "Crash Diagnosis: Core Dumps and GDB",
              "link": "/server/crash-diagnosis"
            },
            {
              "text": "Multiplayer Models",
              "collapsed": false,
              "items": [
                {
                  "text": "AOI: Area of Interest",
                  "link": "/server/aoi"
                }
              ]
            },
            {
              "text": "Source Code Analysis",
              "collapsed": false,
              "items": [
                {
                  "text": "Skynet: C Kernel + Lua Actor",
                  "link": "/server/skynet"
                }
              ]
            },
            {
              "text": "Languages and Selection",
              "collapsed": false,
              "items": [
                {
                  "text": "Server Languages and Runtimes",
                  "link": "/server/language"
                },
                {
                  "text": "Open Source Server Map",
                  "link": "/server/map"
                }
              ]
            },
            {
              "text": "Sync, Combat and Real-Time Interaction",
              "collapsed": false,
              "items": [
                {
                  "text": "Sync, Combat and Real-Time Interaction",
                  "link": "/server/sync/"
                },
                {
                  "text": "Tick and Time Advancement",
                  "link": "/server/sync/01"
                },
                {
                  "text": "Sync Models",
                  "link": "/server/sync/02"
                },
                {
                  "text": "Frame Sync (Lockstep) Explained",
                  "link": "/server/sync/03"
                },
                {
                  "text": "Pause, Resume, Frame Catch-Up and Reconnection",
                  "link": "/server/sync/04"
                },
                {
                  "text": "Prediction, Compensation and Correction",
                  "link": "/server/sync/05"
                },
                {
                  "text": "Determinism and Numerical Consistency",
                  "link": "/server/sync/06"
                },
                {
                  "text": "Replay, Spectating and Adjudication",
                  "link": "/server/sync/07"
                },
                {
                  "text": "Skill System Design",
                  "link": "/server/sync/08"
                }
              ]
            },
            {
              "text": "Execution Models and Runtimes",
              "collapsed": false,
              "items": [
                {
                  "text": "Execution Models and Runtimes",
                  "link": "/server/runtime/"
                },
                {
                  "text": "Concurrency Models Overview: From Seven Concurrency Models in Seven Weeks to Game Runtimes",
                  "link": "/server/runtime/00"
                },
                {
                  "text": "Single Thread, Multithreading and Actor",
                  "link": "/server/runtime/01"
                },
                {
                  "text": "Coroutines, State Machines and Task Queues",
                  "link": "/server/runtime/02"
                },
                {
                  "text": "Tick-Driven Logic Execution",
                  "link": "/server/runtime/03"
                },
                {
                  "text": "Flow Control, Backpressure and Stability Mechanisms",
                  "link": "/server/runtime/04"
                },
                {
                  "text": "Lock Contention and Performance Cost",
                  "link": "/server/runtime/05"
                },
                {
                  "text": "Epoch-driven Actor / Channel Runtime",
                  "link": "/server/runtime/06"
                }
              ]
            },
            {
              "text": "Service Decomposition and Control Plane",
              "collapsed": false,
              "items": [
                {
                  "text": "Service Decomposition and Control Plane",
                  "link": "/server/services/"
                },
                {
                  "text": "Service Decomposition Methodology",
                  "link": "/server/services/01"
                },
                {
                  "text": "Core Service Roles",
                  "link": "/server/services/02"
                },
                {
                  "text": "Coordination Layer, Cross-Server and Control Plane",
                  "link": "/server/services/03"
                },
                {
                  "text": "Service Discovery, Routing and Collaboration",
                  "link": "/server/services/04"
                },
                {
                  "text": "Consistency, Recovery and Reconnection",
                  "link": "/server/services/05"
                }
              ]
            },
            {
              "text": "Capacity Scaling",
              "collapsed": false,
              "items": [
                {
                  "text": "Capacity Scaling",
                  "link": "/server/capacity/"
                },
                {
                  "text": "Load Testing and Capacity Planning",
                  "link": "/server/capacity/01"
                },
                {
                  "text": "Scale-Up, Scale-Down and Dynamic Server Addition",
                  "link": "/server/capacity/02"
                },
                {
                  "text": "Partitioning, Migration, Server Merge and Decommissioning",
                  "link": "/server/capacity/03"
                },
                {
                  "text": "Platform-Based Ops and Multi-Region Architecture",
                  "link": "/server/capacity/04"
                }
              ]
            },
            {
              "text": "Security, Risk Control and Compliance",
              "collapsed": false,
              "items": [
                {
                  "text": "Security, Risk Control and Compliance",
                  "link": "/server/security/"
                },
                {
                  "text": "Security and Anti-Cheating",
                  "link": "/server/security/01"
                },
                {
                  "text": "Auditing, Privacy and Data Security",
                  "link": "/server/security/02"
                },
                {
                  "text": "Behavioral Risk Control and Governance",
                  "link": "/server/security/03"
                },
                {
                  "text": "Compliance, Game License and Platform Constraints",
                  "link": "/server/security/04"
                },
                {
                  "text": "Licensing Risks and Dependency Governance",
                  "link": "/server/security/05"
                }
              ]
            }
          ],
          "/system/": [
            {
              "text": "System Overview",
              "collapsed": false,
              "items": [
                {
                  "text": "System Overview",
                  "link": "/system/"
                }
              ]
            },
            {
              "text": "Gameplay Systems",
              "collapsed": false,
              "items": [
                {
                  "text": "Leaderboard: Comparing Four Implementations",
                  "link": "/system/leaderboard"
                },
                {
                  "text": "Team Matchmaking: Four Matching Patterns",
                  "link": "/system/party-matchmaking"
                },
                {
                  "text": "PVP Matchmaking: Ratings and Match Pools",
                  "link": "/system/pvp-matchmaking"
                },
                {
                  "text": "Skill System: Component Boundaries and Extension",
                  "link": "/system/skill"
                },
                {
                  "text": "Settlement: Vouchers and Idempotency",
                  "link": "/system/settlement"
                },
                {
                  "text": "Quest System: Progress and Chained Prerequisites",
                  "link": "/system/quest"
                },
                {
                  "text": "Achievements and Collections",
                  "link": "/system/achievement"
                },
                {
                  "text": "Stamina and Attempt Gating",
                  "link": "/system/stamina"
                },
                {
                  "text": "Equipment Enhancement and Star Upgrades",
                  "link": "/system/enhance"
                },
                {
                  "text": "Check-In, Rewards and Redemption Codes",
                  "link": "/system/checkin"
                },
                {
                  "text": "Battle Pass and Season Tracks",
                  "link": "/system/battle-pass"
                },
                {
                  "text": "Marquee and Announcements",
                  "link": "/system/marquee"
                },
                {
                  "text": "Cosmetics, Skins and Outfits",
                  "link": "/system/cosmetics"
                },
                {
                  "text": "Homeland, Territory and Building Permissions",
                  "link": "/system/territory"
                },
                {
                  "text": "In-Game Voice",
                  "link": "/system/voice"
                },
                {
                  "text": "Genre and Component Coverage Map",
                  "link": "/system/genre-coverage"
                }
              ]
            },
            {
              "text": "Scripting and Hot Updates",
              "collapsed": false,
              "items": [
                {
                  "text": "Scripting, Hot Updates and Logic Extension",
                  "link": "/system/scripting/"
                },
                {
                  "text": "Script Layer Role and Language Choice",
                  "link": "/system/scripting/01"
                },
                {
                  "text": "Host Runtime and Script VM Integration",
                  "link": "/system/scripting/02"
                },
                {
                  "text": "Config-Driven and Script-Driven",
                  "link": "/system/scripting/03"
                },
                {
                  "text": "Hot Update Systems",
                  "link": "/system/scripting/04"
                }
              ]
            },
            {
              "text": "Common Services",
              "collapsed": false,
              "items": [
                {
                  "text": "Common Game Services",
                  "link": "/system/services/"
                },
                {
                  "text": "Accounts, Characters and Base Systems",
                  "link": "/system/services/01"
                },
                {
                  "text": "Events, Leaderboards, Matchmaking and Social",
                  "link": "/system/services/02"
                },
                {
                  "text": "Trading, Payments and Economy Systems",
                  "link": "/system/services/03"
                },
                {
                  "text": "Risk Control, Auditing, GM and Customer Service",
                  "link": "/system/services/04"
                }
              ]
            }
          ],
          "/database/": [
            {
              "text": "Data Modeling and Databases",
              "collapsed": false,
              "items": [
                {
                  "text": "Data Modeling and Databases",
                  "link": "/database/"
                },
                {
                  "text": "Game Data Classification and Modeling",
                  "link": "/database/01"
                },
                {
                  "text": "Relational and Non-Relational Databases",
                  "link": "/database/02"
                },
                {
                  "text": "Transactions, Consistency and Sharding",
                  "link": "/database/03"
                },
                {
                  "text": "Data Sync, Hot-Cold Tiering and Archiving",
                  "link": "/database/04"
                }
              ]
            },
            {
              "text": "Caching, Middleware and Infrastructure",
              "collapsed": false,
              "items": [
                {
                  "text": "Caching, Middleware and Infrastructure",
                  "link": "/database/cache/"
                },
                {
                  "text": "Redis, Leaderboards and Locks",
                  "link": "/database/cache/01"
                },
                {
                  "text": "singleflight, MQ and Event Streams",
                  "link": "/database/cache/02"
                },
                {
                  "text": "Service Registry, Load Balancing and Consistent Hashing",
                  "link": "/database/cache/03"
                },
                {
                  "text": "Object Storage, CDN and Asset Distribution",
                  "link": "/database/cache/04"
                }
              ]
            }
          ],
          "/client/": [
            {
              "text": "Client Architecture and Engines",
              "collapsed": false,
              "items": [
                {
                  "text": "Client Architecture and Engines",
                  "link": "/client/"
                },
                {
                  "text": "Client Tech Stacks and Engines",
                  "link": "/client/01"
                },
                {
                  "text": "Client-Server Boundary and Network Layer",
                  "link": "/client/02"
                },
                {
                  "text": "Asset Systems and Toolchains",
                  "link": "/client/03"
                },
                {
                  "text": "Scripting Languages and ECS",
                  "link": "/client/04"
                },
                {
                  "text": "AI Use Cases in Clients and Game Systems",
                  "link": "/client/05"
                }
              ]
            },
            {
              "text": "Interaction and Input",
              "collapsed": false,
              "items": [
                {
                  "text": "Interaction and Input: Intent and Mapping",
                  "link": "/client/input"
                }
              ]
            },
            {
              "text": "Web Game Frontend Systems",
              "collapsed": false,
              "items": [
                {
                  "text": "Web Game Frontend Systems",
                  "link": "/client/web/"
                },
                {
                  "text": "H5 and Canvas 2D Rendering Basics",
                  "link": "/client/web/01"
                },
                {
                  "text": "WebGL and 3D Rendering Basics",
                  "link": "/client/web/02"
                },
                {
                  "text": "Game Engines and Cocos Creator",
                  "link": "/client/web/03"
                },
                {
                  "text": "Game UI Systems",
                  "link": "/client/web/04"
                },
                {
                  "text": "Mini-Game Platforms and Browser Environments",
                  "link": "/client/web/05"
                },
                {
                  "text": "Client Internal Layers: Rendering, Logic and Assets",
                  "link": "/client/web/06"
                }
              ]
            },
            {
              "text": "Engines, Languages and Tool Ecosystem",
              "collapsed": false,
              "items": [
                {
                  "text": "Engines, Languages and Tool Ecosystem",
                  "link": "/client/engines/"
                },
                {
                  "text": "Engine Choice and Business Models",
                  "link": "/client/engines/01"
                },
                {
                  "text": "Programming Languages and Tech Stack Map",
                  "link": "/client/engines/02"
                },
                {
                  "text": "Team Capabilities, Project Types and Tool Ecosystem",
                  "link": "/client/engines/03"
                }
              ]
            }
          ],
          "/production/": [
            {
              "text": "Versioning, Release and Dev Pipeline",
              "collapsed": false,
              "items": [
                {
                  "text": "Versioning, Release and Dev Pipeline",
                  "link": "/production/"
                },
                {
                  "text": "Version Scheme Overview",
                  "link": "/production/01"
                },
                {
                  "text": "Client, Asset, Config and Protocol Versions",
                  "link": "/production/02"
                },
                {
                  "text": "Gray Release, Rollback and Compatibility Windows",
                  "link": "/production/03"
                },
                {
                  "text": "Client-Server Coordination and Platform Constraints",
                  "link": "/production/04"
                },
                {
                  "text": "Config Tables and Data-Driven Pipelines",
                  "link": "/production/05"
                },
                {
                  "text": "Dev Collaboration and Release Workflow",
                  "link": "/production/06"
                },
                {
                  "text": "Studio Roles and Quality Gates",
                  "link": "/production/07"
                }
              ]
            },
            {
              "text": "Config Pipeline and Dev Collaboration",
              "collapsed": false,
              "items": [
                {
                  "text": "Config Pipeline and Dev Collaboration",
                  "link": "/production/config/"
                },
                {
                  "text": "Config-Table-Driven Development",
                  "link": "/production/config/01"
                },
                {
                  "text": "Table Schema Design and Splitting",
                  "link": "/production/config/02"
                },
                {
                  "text": "Validation, Export and Code Generation",
                  "link": "/production/config/03"
                },
                {
                  "text": "Workflows, Mistake-Proofing and Collaboration",
                  "link": "/production/config/04"
                }
              ]
            },
            {
              "text": "Selection, Practice and Retrospectives",
              "collapsed": false,
              "items": [
                {
                  "text": "Selection, Practice and Retrospectives",
                  "link": "/production/retro/"
                },
                {
                  "text": "Engine, Language and Tech Selection",
                  "link": "/production/retro/01"
                },
                {
                  "text": "Architecture Patterns and Selection Comparison",
                  "link": "/production/retro/02"
                },
                {
                  "text": "Key Question Checklist",
                  "link": "/production/retro/03"
                },
                {
                  "text": "Analysis Frameworks, Pitfalls and Failure Cases",
                  "link": "/production/retro/04"
                },
                {
                  "text": "Personal Gap-Filling Checklist",
                  "link": "/production/retro/05"
                }
              ]
            }
          ],
          "/operation/": [
            {
              "text": "Operations, Monetization and Data Analytics",
              "collapsed": false,
              "items": [
                {
                  "text": "Operations and Observability Overview",
                  "link": "/operation/"
                },
                {
                  "text": "Operations, Monetization and Data Analytics",
                  "link": "/operation/bi/"
                },
                {
                  "text": "Operations and Monetization Basics",
                  "link": "/operation/bi/01"
                },
                {
                  "text": "Event Tracking, BI and Analytics Systems",
                  "link": "/operation/bi/02"
                },
                {
                  "text": "Economy, Balance and Risk Control Analytics",
                  "link": "/operation/bi/03"
                },
                {
                  "text": "Reach Systems and External Capability Integration",
                  "link": "/operation/bi/04"
                },
                {
                  "text": "AI in Operations, Analytics and Risk Control",
                  "link": "/operation/bi/05"
                }
              ]
            },
            {
              "text": "Observability, Performance, Capacity and Stability",
              "collapsed": false,
              "items": [
                {
                  "text": "Observability and Stability",
                  "link": "/operation/observability/"
                },
                {
                  "text": "Logs, Metrics, Tracing and OTel",
                  "link": "/operation/observability/01"
                },
                {
                  "text": "Game-Specific Observability and Tick Metrics",
                  "link": "/operation/observability/02"
                },
                {
                  "text": "Profiling, Flame Graphs and Hotspot Analysis",
                  "link": "/operation/observability/03"
                },
                {
                  "text": "Debugging, Fault Localization and Retrospectives",
                  "link": "/operation/observability/04"
                },
                {
                  "text": "Load Testing, Capacity Planning and Autoscaling",
                  "link": "/operation/observability/05"
                },
                {
                  "text": "The Real Goal of Stability Governance",
                  "link": "/operation/observability/06"
                }
              ]
            }
          ],
          "/industry/": [
            {
              "text": "Fundamentals and Methodology",
              "collapsed": false,
              "items": [
                {
                  "text": "Industry and Methodology Overview",
                  "link": "/industry/"
                },
                {
                  "text": "Fundamentals and Methodology",
                  "link": "/industry/methodology/"
                },
                {
                  "text": "Game Development Knowledge Map",
                  "link": "/industry/methodology/01"
                },
                {
                  "text": "Game Types, Platforms and Business Models",
                  "link": "/industry/methodology/02"
                },
                {
                  "text": "Analysis Method from Gameplay to Architecture",
                  "link": "/industry/methodology/03"
                },
                {
                  "text": "Core Trade-offs in Game Backend Design",
                  "link": "/industry/methodology/04"
                },
                {
                  "text": "Boundaries of Client, Server, Platform and Operations",
                  "link": "/industry/methodology/05"
                },
                {
                  "text": "Game Project Lifecycle and Team Collaboration",
                  "link": "/industry/methodology/06"
                },
                {
                  "text": "How to Systematically Build Game Development Experience",
                  "link": "/industry/methodology/07"
                }
              ]
            },
            {
              "text": "Career Map",
              "collapsed": false,
              "items": [
                {
                  "text": "Career Map: Roles, Growth and Mobility",
                  "link": "/industry/career"
                }
              ]
            },
            {
              "text": "Game Types and Problem Models",
              "collapsed": false,
              "items": [
                {
                  "text": "Game Types and Problem Models",
                  "link": "/industry/models/"
                },
                {
                  "text": "Common Gameplay Types Overview",
                  "link": "/industry/models/00"
                },
                {
                  "text": "How to Classify Game Types",
                  "link": "/industry/models/01"
                },
                {
                  "text": "Problem Model of Session-Room Games",
                  "link": "/industry/models/02"
                },
                {
                  "text": "Problem Model of Real-Time Competitive Games",
                  "link": "/industry/models/03"
                },
                {
                  "text": "Problem Model of Persistent Online World Games",
                  "link": "/industry/models/04"
                },
                {
                  "text": "Problem Model of Long-Term Progression and Async Interaction Games",
                  "link": "/industry/models/05"
                },
                {
                  "text": "Problem Model of Economy and Platform Games",
                  "link": "/industry/models/06"
                },
                {
                  "text": "Problem Model of High-Frequency Object and Presentation-Heavy Games",
                  "link": "/industry/models/07"
                },
                {
                  "text": "How the Models Combine",
                  "link": "/industry/models/08"
                }
              ]
            },
            {
              "text": "Game Type Topics",
              "collapsed": false,
              "items": [
                {
                  "text": "Game Type Topics",
                  "link": "/industry/genres/"
                },
                {
                  "text": "Room-Based and Lightweight Online",
                  "link": "/industry/genres/01"
                },
                {
                  "text": "Real-Time Competitive",
                  "link": "/industry/genres/02"
                },
                {
                  "text": "Persistent Online Worlds",
                  "link": "/industry/genres/03"
                },
                {
                  "text": "Long-Term Progression and Management",
                  "link": "/industry/genres/04"
                },
                {
                  "text": "Platform and Ecosystem Games",
                  "link": "/industry/genres/05"
                },
                {
                  "text": "How to Use This Page",
                  "link": "/industry/genres/06"
                }
              ]
            },
            {
              "text": "Platform Ecosystems, Channels and SDKs",
              "collapsed": false,
              "items": [
                {
                  "text": "Platform Ecosystems, Channels and SDKs",
                  "link": "/industry/platforms/"
                },
                {
                  "text": "Platform and Channel Ecosystems",
                  "link": "/industry/platforms/01"
                },
                {
                  "text": "Mini-Game Platforms and Technical Constraints",
                  "link": "/industry/platforms/02"
                },
                {
                  "text": "Login, Payment, Social and Ad SDKs",
                  "link": "/industry/platforms/03"
                },
                {
                  "text": "Release, Versioning and Business Models",
                  "link": "/industry/platforms/04"
                }
              ]
            }
          ],
          "/design/": [
            {
              "text": "Games Organized by Problem Domain",
              "collapsed": false,
              "items": [
                {
                  "text": "Games Organized by Problem Domain",
                  "link": "/design/problem-domains/"
                },
                {
                  "text": "Session-Room Architecture",
                  "link": "/design/problem-domains/01"
                },
                {
                  "text": "Real-Time Competitive Architecture",
                  "link": "/design/problem-domains/02"
                },
                {
                  "text": "Persistent Online World Architecture",
                  "link": "/design/problem-domains/03"
                },
                {
                  "text": "Long-Term Progression Architecture",
                  "link": "/design/problem-domains/04"
                },
                {
                  "text": "Economy Platform Architecture",
                  "link": "/design/problem-domains/05"
                },
                {
                  "text": "What This Page Is For",
                  "link": "/design/problem-domains/06"
                }
              ]
            }
          ],
          "/numerical/": [
            {
              "text": "Game Design and Numerical Systems",
              "collapsed": false,
              "items": [
                {
                  "text": "Game Design and Numerical Systems",
                  "link": "/numerical/"
                },
                {
                  "text": "The Numerical Designer's Work and Conventions",
                  "link": "/numerical/01"
                },
                {
                  "text": "Combat Numbers and Damage Formula Families",
                  "link": "/numerical/02"
                },
                {
                  "text": "Progression Curve Models",
                  "link": "/numerical/03"
                },
                {
                  "text": "Economy Loops: Output and Consumption",
                  "link": "/numerical/04"
                },
                {
                  "text": "Drops and Probability Design",
                  "link": "/numerical/05"
                },
                {
                  "text": "Monetization Numerical Example Models",
                  "link": "/numerical/06"
                },
                {
                  "text": "Level Difficulty and New-Player Pacing",
                  "link": "/numerical/07"
                },
                {
                  "text": "Numerical Design Books and Resources",
                  "link": "/numerical/08"
                }
              ]
            }
          ],
          "/glossary/": [
            {
              "text": "Terminology Conventions",
              "collapsed": false,
              "items": [
                {
                  "text": "Terminology Conventions",
                  "link": "/glossary/"
                },
                {
                  "text": "Server Side",
                  "link": "/glossary/01"
                },
                {
                  "text": "Access Layer",
                  "link": "/glossary/02"
                },
                {
                  "text": "Primary Path / Peripheral Path",
                  "link": "/glossary/03"
                },
                {
                  "text": "Authoritative State",
                  "link": "/glossary/04"
                },
                {
                  "text": "Config-Driven / Script-Driven",
                  "link": "/glossary/05"
                },
                {
                  "text": "Hot Update",
                  "link": "/glossary/06"
                },
                {
                  "text": "Control Plane",
                  "link": "/glossary/07"
                },
                {
                  "text": "Operations",
                  "link": "/glossary/08"
                },
                {
                  "text": "Risk Control",
                  "link": "/glossary/09"
                },
                {
                  "text": "English Terms and Etymology",
                  "link": "/glossary/10"
                },
                {
                  "text": "Character, Entity and MMO Space Terms",
                  "link": "/glossary/11"
                }
              ]
            }
          ],
          "/networking/": [
            {
              "text": "Networking and Access Protocols",
              "collapsed": false,
              "items": [
                {
                  "text": "Networking and Access Protocols",
                  "link": "/networking/"
                },
                {
                  "text": "Game Networking Basics",
                  "link": "/networking/01"
                },
                {
                  "text": "I/O Models and Event Notification",
                  "link": "/networking/02"
                },
                {
                  "text": "Transport Layer and Access Protocol Choice",
                  "link": "/networking/03"
                },
                {
                  "text": "Data Frames and Protocol Contracts",
                  "link": "/networking/04"
                },
                {
                  "text": "Message Patterns and Event Dispatch",
                  "link": "/networking/05"
                },
                {
                  "text": "Reliability, Ordering and Compatibility",
                  "link": "/networking/06"
                },
                {
                  "text": "Room Broadcast, Weak Networks and China's Network Conditions",
                  "link": "/networking/07"
                }
              ]
            },
            {
              "text": "Message Systems and IPC",
              "collapsed": false,
              "items": [
                {
                  "text": "Message Systems and IPC",
                  "link": "/networking/ipc/"
                },
                {
                  "text": "IPC Basics and Use-Case Boundaries",
                  "link": "/networking/ipc/01"
                },
                {
                  "text": "Communication Patterns",
                  "link": "/networking/ipc/02"
                },
                {
                  "text": "Primary Path vs. Peripheral Path",
                  "link": "/networking/ipc/03"
                },
                {
                  "text": "Low Latency vs. High Throughput Trade-offs",
                  "link": "/networking/ipc/04"
                },
                {
                  "text": "Message Semantics, Idempotency and Ordering",
                  "link": "/networking/ipc/05"
                },
                {
                  "text": "How to Choose a Communication Approach",
                  "link": "/networking/ipc/06"
                }
              ]
            }
          ],
          "/": [
            {
              "text": "Indexes and Reading Guide",
              "collapsed": false,
              "items": [
                {
                  "text": "Content Organization",
                  "link": "/00-reading-guide/"
                },
                {
                  "text": "Enter by Problem",
                  "link": "/00-reading-guide/02"
                },
                {
                  "text": "Topic Content and Cross Indexes",
                  "link": "/00-reading-guide/03"
                },
                {
                  "text": "How to Use It for Project Analysis",
                  "link": "/00-reading-guide/04"
                },
                {
                  "text": "Terminology Conventions",
                  "link": "/glossary/"
                },
                {
                  "text": "Server Side",
                  "link": "/glossary/01"
                },
                {
                  "text": "Access Layer",
                  "link": "/glossary/02"
                },
                {
                  "text": "Primary Path / Peripheral Path",
                  "link": "/glossary/03"
                },
                {
                  "text": "Authoritative State",
                  "link": "/glossary/04"
                },
                {
                  "text": "Config-Driven / Script-Driven",
                  "link": "/glossary/05"
                },
                {
                  "text": "Hot Update",
                  "link": "/glossary/06"
                },
                {
                  "text": "Control Plane",
                  "link": "/glossary/07"
                },
                {
                  "text": "Operations",
                  "link": "/glossary/08"
                },
                {
                  "text": "Risk Control",
                  "link": "/glossary/09"
                },
                {
                  "text": "English Terms and Etymology",
                  "link": "/glossary/10"
                },
                {
                  "text": "Character, Entity and MMO Space Terms",
                  "link": "/glossary/11"
                }
              ]
            },
            {
              "text": "Fundamentals and Methodology",
              "collapsed": true,
              "items": [
                {
                  "text": "Fundamentals and Methodology",
                  "link": "/industry/methodology/"
                },
                {
                  "text": "Game Development Knowledge Map",
                  "link": "/industry/methodology/01"
                },
                {
                  "text": "Game Types, Platforms and Business Models",
                  "link": "/industry/methodology/02"
                },
                {
                  "text": "Analysis Method from Gameplay to Architecture",
                  "link": "/industry/methodology/03"
                },
                {
                  "text": "Core Trade-offs in Game Backend Design",
                  "link": "/industry/methodology/04"
                },
                {
                  "text": "Boundaries of Client, Server, Platform and Operations",
                  "link": "/industry/methodology/05"
                },
                {
                  "text": "Game Project Lifecycle and Team Collaboration",
                  "link": "/industry/methodology/06"
                },
                {
                  "text": "How to Systematically Build Game Development Experience",
                  "link": "/industry/methodology/07"
                }
              ]
            },
            {
              "text": "Game Types and Problem Models",
              "collapsed": true,
              "items": [
                {
                  "text": "Game Types and Problem Models",
                  "link": "/industry/models/"
                },
                {
                  "text": "Common Gameplay Types Overview",
                  "link": "/industry/models/00"
                },
                {
                  "text": "How to Classify Game Types",
                  "link": "/industry/models/01"
                },
                {
                  "text": "Problem Model of Session-Room Games",
                  "link": "/industry/models/02"
                },
                {
                  "text": "Problem Model of Real-Time Competitive Games",
                  "link": "/industry/models/03"
                },
                {
                  "text": "Problem Model of Persistent Online World Games",
                  "link": "/industry/models/04"
                },
                {
                  "text": "Problem Model of Long-Term Progression and Async Interaction Games",
                  "link": "/industry/models/05"
                },
                {
                  "text": "Problem Model of Economy and Platform Games",
                  "link": "/industry/models/06"
                },
                {
                  "text": "Problem Model of High-Frequency Object and Presentation-Heavy Games",
                  "link": "/industry/models/07"
                },
                {
                  "text": "How the Models Combine",
                  "link": "/industry/models/08"
                }
              ]
            },
            {
              "text": "Networking and Access Protocols",
              "collapsed": true,
              "items": [
                {
                  "text": "Networking and Access Protocols",
                  "link": "/networking/"
                },
                {
                  "text": "Game Networking Basics",
                  "link": "/networking/01"
                },
                {
                  "text": "I/O Models and Event Notification",
                  "link": "/networking/02"
                },
                {
                  "text": "Transport Layer and Access Protocol Choice",
                  "link": "/networking/03"
                },
                {
                  "text": "Data Frames and Protocol Contracts",
                  "link": "/networking/04"
                },
                {
                  "text": "Message Patterns and Event Dispatch",
                  "link": "/networking/05"
                },
                {
                  "text": "Reliability, Ordering and Compatibility",
                  "link": "/networking/06"
                },
                {
                  "text": "Room Broadcast, Weak Networks and China's Network Conditions",
                  "link": "/networking/07"
                }
              ]
            },
            {
              "text": "Sync, Combat and Real-Time Interaction",
              "collapsed": true,
              "items": [
                {
                  "text": "Sync, Combat and Real-Time Interaction",
                  "link": "/server/sync/"
                },
                {
                  "text": "Tick and Time Advancement",
                  "link": "/server/sync/01"
                },
                {
                  "text": "Sync Models",
                  "link": "/server/sync/02"
                },
                {
                  "text": "Frame Sync (Lockstep) Explained",
                  "link": "/server/sync/03"
                },
                {
                  "text": "Pause, Resume, Frame Catch-Up and Reconnection",
                  "link": "/server/sync/04"
                },
                {
                  "text": "Prediction, Compensation and Correction",
                  "link": "/server/sync/05"
                },
                {
                  "text": "Determinism and Numerical Consistency",
                  "link": "/server/sync/06"
                },
                {
                  "text": "Replay, Spectating and Adjudication",
                  "link": "/server/sync/07"
                },
                {
                  "text": "Skill System Design",
                  "link": "/server/sync/08"
                }
              ]
            },
            {
              "text": "Execution Models and Runtimes",
              "collapsed": true,
              "items": [
                {
                  "text": "Execution Models and Runtimes",
                  "link": "/server/runtime/"
                },
                {
                  "text": "Concurrency Models Overview: From Seven Concurrency Models in Seven Weeks to Game Runtimes",
                  "link": "/server/runtime/00"
                },
                {
                  "text": "Single Thread, Multithreading and Actor",
                  "link": "/server/runtime/01"
                },
                {
                  "text": "Coroutines, State Machines and Task Queues",
                  "link": "/server/runtime/02"
                },
                {
                  "text": "Tick-Driven Logic Execution",
                  "link": "/server/runtime/03"
                },
                {
                  "text": "Flow Control, Backpressure and Stability Mechanisms",
                  "link": "/server/runtime/04"
                },
                {
                  "text": "Lock Contention and Performance Cost",
                  "link": "/server/runtime/05"
                },
                {
                  "text": "Epoch-driven Actor / Channel Runtime",
                  "link": "/server/runtime/06"
                }
              ]
            },
            {
              "text": "Service Decomposition, Distribution and Control Plane",
              "collapsed": true,
              "items": [
                {
                  "text": "Service Decomposition and Control Plane",
                  "link": "/server/services/"
                },
                {
                  "text": "Service Decomposition Methodology",
                  "link": "/server/services/01"
                },
                {
                  "text": "Core Service Roles",
                  "link": "/server/services/02"
                },
                {
                  "text": "Coordination Layer, Cross-Server and Control Plane",
                  "link": "/server/services/03"
                },
                {
                  "text": "Service Discovery, Routing and Collaboration",
                  "link": "/server/services/04"
                },
                {
                  "text": "Consistency, Recovery and Reconnection",
                  "link": "/server/services/05"
                }
              ]
            },
            {
              "text": "Message Systems and IPC",
              "collapsed": true,
              "items": [
                {
                  "text": "Message Systems and IPC",
                  "link": "/networking/ipc/"
                },
                {
                  "text": "IPC Basics and Use-Case Boundaries",
                  "link": "/networking/ipc/01"
                },
                {
                  "text": "Communication Patterns",
                  "link": "/networking/ipc/02"
                },
                {
                  "text": "Primary Path vs. Peripheral Path",
                  "link": "/networking/ipc/03"
                },
                {
                  "text": "Low Latency vs. High Throughput Trade-offs",
                  "link": "/networking/ipc/04"
                },
                {
                  "text": "Message Semantics, Idempotency and Ordering",
                  "link": "/networking/ipc/05"
                },
                {
                  "text": "How to Choose a Communication Approach",
                  "link": "/networking/ipc/06"
                }
              ]
            },
            {
              "text": "Client Architecture and Engines",
              "collapsed": true,
              "items": [
                {
                  "text": "Client Architecture and Engines",
                  "link": "/client/"
                },
                {
                  "text": "Client Tech Stacks and Engines",
                  "link": "/client/01"
                },
                {
                  "text": "Client-Server Boundary and Network Layer",
                  "link": "/client/02"
                },
                {
                  "text": "Asset Systems and Toolchains",
                  "link": "/client/03"
                },
                {
                  "text": "Scripting Languages and ECS",
                  "link": "/client/04"
                },
                {
                  "text": "AI Use Cases in Clients and Game Systems",
                  "link": "/client/05"
                }
              ]
            },
            {
              "text": "Scripting, Hot Updates and Logic Extension",
              "collapsed": true,
              "items": [
                {
                  "text": "Scripting, Hot Updates and Logic Extension",
                  "link": "/system/scripting/"
                },
                {
                  "text": "Script Layer Role and Language Choice",
                  "link": "/system/scripting/01"
                },
                {
                  "text": "Host Runtime and Script VM Integration",
                  "link": "/system/scripting/02"
                },
                {
                  "text": "Config-Driven and Script-Driven",
                  "link": "/system/scripting/03"
                },
                {
                  "text": "Hot Update Systems",
                  "link": "/system/scripting/04"
                }
              ]
            },
            {
              "text": "Versioning, Config and Dev Pipeline",
              "collapsed": true,
              "items": [
                {
                  "text": "Versioning, Release and Dev Pipeline",
                  "link": "/production/"
                },
                {
                  "text": "Version Scheme Overview",
                  "link": "/production/01"
                },
                {
                  "text": "Client, Asset, Config and Protocol Versions",
                  "link": "/production/02"
                },
                {
                  "text": "Gray Release, Rollback and Compatibility Windows",
                  "link": "/production/03"
                },
                {
                  "text": "Client-Server Coordination and Platform Constraints",
                  "link": "/production/04"
                },
                {
                  "text": "Config Tables and Data-Driven Pipelines",
                  "link": "/production/05"
                },
                {
                  "text": "Dev Collaboration and Release Workflow",
                  "link": "/production/06"
                },
                {
                  "text": "Studio Roles and Quality Gates",
                  "link": "/production/07"
                }
              ]
            },
            {
              "text": "Data Modeling and Databases",
              "collapsed": true,
              "items": [
                {
                  "text": "Data Modeling and Databases",
                  "link": "/database/"
                },
                {
                  "text": "Game Data Classification and Modeling",
                  "link": "/database/01"
                },
                {
                  "text": "Relational and Non-Relational Databases",
                  "link": "/database/02"
                },
                {
                  "text": "Transactions, Consistency and Sharding",
                  "link": "/database/03"
                },
                {
                  "text": "Data Sync, Hot-Cold Tiering and Archiving",
                  "link": "/database/04"
                }
              ]
            },
            {
              "text": "Caching, Middleware and Infrastructure",
              "collapsed": true,
              "items": [
                {
                  "text": "Caching, Middleware and Infrastructure",
                  "link": "/database/cache/"
                },
                {
                  "text": "Redis, Leaderboards and Locks",
                  "link": "/database/cache/01"
                },
                {
                  "text": "singleflight, MQ and Event Streams",
                  "link": "/database/cache/02"
                },
                {
                  "text": "Service Registry, Load Balancing and Consistent Hashing",
                  "link": "/database/cache/03"
                },
                {
                  "text": "Object Storage, CDN and Asset Distribution",
                  "link": "/database/cache/04"
                }
              ]
            },
            {
              "text": "Common Game Services",
              "collapsed": true,
              "items": [
                {
                  "text": "Common Game Services",
                  "link": "/system/services/"
                },
                {
                  "text": "Accounts, Characters and Base Systems",
                  "link": "/system/services/01"
                },
                {
                  "text": "Events, Leaderboards, Matchmaking and Social",
                  "link": "/system/services/02"
                },
                {
                  "text": "Trading, Payments and Economy Systems",
                  "link": "/system/services/03"
                },
                {
                  "text": "Risk Control, Auditing, GM and Customer Service",
                  "link": "/system/services/04"
                }
              ]
            },
            {
              "text": "Operations, Monetization and Data Analytics",
              "collapsed": true,
              "items": [
                {
                  "text": "Operations, Monetization and Data Analytics",
                  "link": "/operation/bi/"
                },
                {
                  "text": "Operations and Monetization Basics",
                  "link": "/operation/bi/01"
                },
                {
                  "text": "Event Tracking, BI and Analytics Systems",
                  "link": "/operation/bi/02"
                },
                {
                  "text": "Economy, Balance and Risk Control Analytics",
                  "link": "/operation/bi/03"
                },
                {
                  "text": "Reach Systems and External Capability Integration",
                  "link": "/operation/bi/04"
                },
                {
                  "text": "AI in Operations, Analytics and Risk Control",
                  "link": "/operation/bi/05"
                }
              ]
            },
            {
              "text": "Platform Ecosystems, Channels and SDKs",
              "collapsed": true,
              "items": [
                {
                  "text": "Platform Ecosystems, Channels and SDKs",
                  "link": "/industry/platforms/"
                },
                {
                  "text": "Platform and Channel Ecosystems",
                  "link": "/industry/platforms/01"
                },
                {
                  "text": "Mini-Game Platforms and Technical Constraints",
                  "link": "/industry/platforms/02"
                },
                {
                  "text": "Login, Payment, Social and Ad SDKs",
                  "link": "/industry/platforms/03"
                },
                {
                  "text": "Release, Versioning and Business Models",
                  "link": "/industry/platforms/04"
                }
              ]
            },
            {
              "text": "Observability, Performance, Capacity and Stability",
              "collapsed": true,
              "items": [
                {
                  "text": "Observability and Stability",
                  "link": "/operation/observability/"
                },
                {
                  "text": "Logs, Metrics, Tracing and OTel",
                  "link": "/operation/observability/01"
                },
                {
                  "text": "Game-Specific Observability and Tick Metrics",
                  "link": "/operation/observability/02"
                },
                {
                  "text": "Profiling, Flame Graphs and Hotspot Analysis",
                  "link": "/operation/observability/03"
                },
                {
                  "text": "Debugging, Fault Localization and Retrospectives",
                  "link": "/operation/observability/04"
                },
                {
                  "text": "Load Testing, Capacity Planning and Autoscaling",
                  "link": "/operation/observability/05"
                },
                {
                  "text": "The Real Goal of Stability Governance",
                  "link": "/operation/observability/06"
                }
              ]
            },
            {
              "text": "Security, Risk Control and Compliance",
              "collapsed": true,
              "items": [
                {
                  "text": "Security, Risk Control and Compliance",
                  "link": "/server/security/"
                },
                {
                  "text": "Security and Anti-Cheating",
                  "link": "/server/security/01"
                },
                {
                  "text": "Auditing, Privacy and Data Security",
                  "link": "/server/security/02"
                },
                {
                  "text": "Behavioral Risk Control and Governance",
                  "link": "/server/security/03"
                },
                {
                  "text": "Compliance, Game License and Platform Constraints",
                  "link": "/server/security/04"
                },
                {
                  "text": "Licensing Risks and Dependency Governance",
                  "link": "/server/security/05"
                }
              ]
            },
            {
              "text": "Selection, Practice, Retrospectives and Checklists",
              "collapsed": true,
              "items": [
                {
                  "text": "Selection, Practice and Retrospectives",
                  "link": "/production/retro/"
                },
                {
                  "text": "Engine, Language and Tech Selection",
                  "link": "/production/retro/01"
                },
                {
                  "text": "Architecture Patterns and Selection Comparison",
                  "link": "/production/retro/02"
                },
                {
                  "text": "Key Question Checklist",
                  "link": "/production/retro/03"
                },
                {
                  "text": "Analysis Frameworks, Pitfalls and Failure Cases",
                  "link": "/production/retro/04"
                },
                {
                  "text": "Personal Gap-Filling Checklist",
                  "link": "/production/retro/05"
                }
              ]
            },
            {
              "text": "Web Game Frontend Systems",
              "collapsed": true,
              "items": [
                {
                  "text": "Web Game Frontend Systems",
                  "link": "/client/web/"
                },
                {
                  "text": "H5 and Canvas 2D Rendering Basics",
                  "link": "/client/web/01"
                },
                {
                  "text": "WebGL and 3D Rendering Introduction",
                  "link": "/client/web/02"
                },
                {
                  "text": "Game Engines and Cocos Creator",
                  "link": "/client/web/03"
                },
                {
                  "text": "Game UI Systems",
                  "link": "/client/web/04"
                },
                {
                  "text": "Mini-Game Platforms and Browser Environments",
                  "link": "/client/web/05"
                },
                {
                  "text": "Client Internal Layers: Rendering, Logic and Assets",
                  "link": "/client/web/06"
                }
              ]
            },
            {
              "text": "Game Design and Numerical Systems",
              "collapsed": true,
              "items": [
                {
                  "text": "Game Design and Numerical Systems",
                  "link": "/numerical/"
                },
                {
                  "text": "The Numerical Designer's Work and Conventions",
                  "link": "/numerical/01"
                },
                {
                  "text": "Combat Numbers and Damage Formula Families",
                  "link": "/numerical/02"
                },
                {
                  "text": "Progression Curve Models",
                  "link": "/numerical/03"
                },
                {
                  "text": "Economy Loops: Output and Consumption",
                  "link": "/numerical/04"
                },
                {
                  "text": "Drops and Probability Design",
                  "link": "/numerical/05"
                },
                {
                  "text": "Monetization Numerical Example Models",
                  "link": "/numerical/06"
                },
                {
                  "text": "Level Difficulty and New-Player Pacing",
                  "link": "/numerical/07"
                },
                {
                  "text": "Numerical Design Books and Resources",
                  "link": "/numerical/08"
                }
              ]
            },
            {
              "text": "Cross-Cutting Indexes",
              "collapsed": true,
              "items": [
                {
                  "text": "Appendix and Cross-Cutting Indexes",
                  "link": "/90-appendix/"
                },
                {
                  "text": "Revisiting Problems by Genre",
                  "link": "/90-appendix/01"
                },
                {
                  "text": "Expanding the Mainline into Topics",
                  "link": "/90-appendix/02"
                },
                {
                  "text": "Cross-Cutting Selection and Quick Comparison",
                  "link": "/90-appendix/03"
                },
                {
                  "text": "About These Indexes",
                  "link": "/90-appendix/04"
                }
              ]
            },
            {
              "text": "Game Type Topics",
              "collapsed": true,
              "items": [
                {
                  "text": "Game Type Topics",
                  "link": "/industry/genres/"
                },
                {
                  "text": "Room-Based and Lightweight Online",
                  "link": "/industry/genres/01"
                },
                {
                  "text": "Real-Time Competitive",
                  "link": "/industry/genres/02"
                },
                {
                  "text": "Persistent Online Worlds",
                  "link": "/industry/genres/03"
                },
                {
                  "text": "Long-Term Progression and Management",
                  "link": "/industry/genres/04"
                },
                {
                  "text": "Platform and Ecosystem Games",
                  "link": "/industry/genres/05"
                },
                {
                  "text": "How to Use This Page",
                  "link": "/industry/genres/06"
                }
              ]
            },
            {
              "text": "Games Organized by Problem Domain",
              "collapsed": true,
              "items": [
                {
                  "text": "Design Overview",
                  "link": "/design/"
                },
                {
                  "text": "Games Organized by Problem Domain",
                  "link": "/design/problem-domains/"
                },
                {
                  "text": "Session-Room Architecture",
                  "link": "/design/problem-domains/01"
                },
                {
                  "text": "Real-Time Competitive Architecture",
                  "link": "/design/problem-domains/02"
                },
                {
                  "text": "Persistent Online World Architecture",
                  "link": "/design/problem-domains/03"
                },
                {
                  "text": "Long-Term Progression Architecture",
                  "link": "/design/problem-domains/04"
                },
                {
                  "text": "Economy Platform Architecture",
                  "link": "/design/problem-domains/05"
                },
                {
                  "text": "What This Page Is For",
                  "link": "/design/problem-domains/06"
                }
              ]
            },
            {
              "text": "Config Tables, Data-Driven Development and Dev Collaboration",
              "collapsed": true,
              "items": [
                {
                  "text": "Config Pipeline and Dev Collaboration",
                  "link": "/production/config/"
                },
                {
                  "text": "Config-Table-Driven Development",
                  "link": "/production/config/01"
                },
                {
                  "text": "Table Schema Design and Splitting",
                  "link": "/production/config/02"
                },
                {
                  "text": "Validation, Export and Code Generation",
                  "link": "/production/config/03"
                },
                {
                  "text": "Workflows, Mistake-Proofing and Collaboration",
                  "link": "/production/config/04"
                }
              ]
            },
            {
              "text": "Load Testing, Capacity Planning and Autoscaling",
              "collapsed": true,
              "items": [
                {
                  "text": "Capacity Scaling",
                  "link": "/server/capacity/"
                },
                {
                  "text": "Load Testing and Capacity Planning",
                  "link": "/server/capacity/01"
                },
                {
                  "text": "Scale-Up, Scale-Down and Dynamic Server Addition",
                  "link": "/server/capacity/02"
                },
                {
                  "text": "Partitioning, Migration, Server Merge and Decommissioning",
                  "link": "/server/capacity/03"
                },
                {
                  "text": "Platform-Based Ops and Multi-Region Architecture",
                  "link": "/server/capacity/04"
                }
              ]
            },
            {
              "text": "Engine Choice, Language Map and Tool Ecosystem",
              "collapsed": true,
              "items": [
                {
                  "text": "Engines, Languages and Tool Ecosystem",
                  "link": "/client/engines/"
                },
                {
                  "text": "Engine Choice and Business Models",
                  "link": "/client/engines/01"
                },
                {
                  "text": "Programming Languages and Tech Stack Map",
                  "link": "/client/engines/02"
                },
                {
                  "text": "Team Capabilities, Project Types and Tool Ecosystem",
                  "link": "/client/engines/03"
                }
              ]
            },
            {
              "text": "Game Backend Engine Source Analysis",
              "collapsed": true,
              "items": [
                {
                  "text": "Skynet: C Kernel + Lua Actor",
                  "link": "/server/skynet"
                }
              ]
            },
            {
              "text": "Research and Knowledge Points",
              "collapsed": true,
              "items": [
                {
                  "text": "Knowledge Points Overview",
                  "link": "/knowledge"
                },
                {
                  "text": "Research Overview",
                  "link": "/research/"
                },
                {
                  "text": "Authoritative Books Survey",
                  "link": "/research/01-authoritative-books"
                },
                {
                  "text": "Engine and Middleware Official Docs Survey",
                  "link": "/research/02-engine-middleware-docs"
                },
                {
                  "text": "Application Scenario Comparison",
                  "link": "/research/03-application-scenarios"
                },
                {
                  "text": "Coverage Difference Table",
                  "link": "/research/04-coverage-diff"
                }
              ]
            }
          ]
        },
        "socialLinks": [
          {
            "icon": "github",
            "link": "https://github.com/cuihairu/hello-game"
          }
        ],
        "footer": {
          "message": "Game Knowledge System",
          "copyright": "© 2025 cuihairu"
        },
        "search": {
          "provider": "local",
          "options": {
            "translations": {
              "button": {
                "buttonText": "Search docs",
                "buttonAriaLabel": "Search"
              },
              "modal": {
                "noResultsText": "No results",
                "resetButtonTitle": "Clear the search query",
                "footer": {
                  "selectText": "Select",
                  "navigateText": "Navigate",
                  "closeText": "Close"
                }
              }
            }
          }
        },
        "outline": {
          "label": "On this page",
          "level": [
            2,
            3
          ]
        },
        "docFooter": {
          "prev": "Previous",
          "next": "Next"
        },
        "lastUpdated": {
          "text": "Last Updated"
        },
        "returnToTopLabel": "Return to top",
        "sidebarMenuLabel": "Menu",
        "darkModeSwitchLabel": "Appearance",
        "lightModeSwitchTitle": "Switch to light mode",
        "darkModeSwitchTitle": "Switch to dark mode"
      }
    },
    "zh": {
      "label": "简体中文",
      "lang": "zh-CN",
      "link": "/zh/",
      "title": "游戏开发笔记",
      "description": "面向个人开发者整理的游戏开发笔记与经验，覆盖设计、客户端、服务器、数值、美术、工具与运营，并以商业游戏、开源项目和官方资料为参照",
      "themeConfig": {
        "logo": "/logo.svg",
        "siteTitle": "游戏开发笔记",
        "nav": [
          {
            "text": "首页",
            "link": "/zh/"
          },
          {
            "text": "技术全景",
            "link": "/zh/24-game-types-architecture/01-entry"
          },
          {
            "text": "设计与数值",
            "link": "/zh/24-game-types-architecture/02-game-design"
          },
          {
            "text": "架构记录",
            "link": "/zh/24-game-types-architecture/07-core-arch"
          },
          {
            "text": "网络与通信",
            "link": "/zh/24-game-types-architecture/04-network"
          },
          {
            "text": "编程与实现",
            "link": "/zh/24-game-types-architecture/09-programming-patterns"
          },
          {
            "text": "运营与生产",
            "link": "/zh/24-game-types-architecture/13-tech-ops"
          },
          {
            "text": "历史线",
            "link": "/zh/history/"
          },
          {
            "text": "游戏案例",
            "link": "/zh/games/"
          },
          {
            "text": "主题索引",
            "link": "/zh/00-reading-guide/"
          }
        ],
        "sidebar": {
          "/zh/24-game-types-architecture/": [
            {
              "text": "游戏类型与架构选型对照",
              "link": "/zh/24-game-types-architecture/"
            },
            {
              "text": "全景与定位",
              "collapsed": false,
              "items": [
                {
                  "text": "01 游戏后端技术全景",
                  "link": "/zh/24-game-types-architecture/01-entry"
                }
              ]
            },
            {
              "text": "设计与客户端",
              "collapsed": false,
              "items": [
                {
                  "text": "02 数值与经济系统",
                  "link": "/zh/24-game-types-architecture/02-game-design"
                },
                {
                  "text": "03 前端引擎与客户端",
                  "link": "/zh/24-game-types-architecture/03-frontend-engines"
                }
              ]
            },
            {
              "text": "架构",
              "collapsed": false,
              "items": [
                {
                  "text": "04 通信协议设计",
                  "link": "/zh/24-game-types-architecture/04-network"
                },
                {
                  "text": "05 并发模型",
                  "link": "/zh/24-game-types-architecture/05-concurrency-models"
                },
                {
                  "text": "06 常见框架",
                  "link": "/zh/24-game-types-architecture/06-frameworks"
                },
                {
                  "text": "07 架构总览",
                  "link": "/zh/24-game-types-architecture/07-core-arch"
                },
                {
                  "text": "08 数据存储与中间件",
                  "link": "/zh/24-game-types-architecture/08-data-storage"
                }
              ]
            },
            {
              "text": "机制与实现",
              "collapsed": false,
              "items": [
                {
                  "text": "09 游戏编程模式",
                  "link": "/zh/24-game-types-architecture/09-programming-patterns"
                },
                {
                  "text": "10 玩法系统设计",
                  "link": "/zh/24-game-types-architecture/10-gameplay-systems"
                },
                {
                  "text": "11 辅助系统设计",
                  "link": "/zh/24-game-types-architecture/11-auxiliary-systems"
                }
              ]
            },
            {
              "text": "运营与生产",
              "collapsed": false,
              "items": [
                {
                  "text": "12 游戏数据分析",
                  "link": "/zh/24-game-types-architecture/12-data-analytics"
                },
                {
                  "text": "13 运维实战",
                  "link": "/zh/24-game-types-architecture/13-tech-ops"
                },
                {
                  "text": "14 研发组织",
                  "link": "/zh/24-game-types-architecture/14-dev-organization"
                }
              ]
            },
            {
              "text": "工程专题",
              "collapsed": false,
              "items": [
                {
                  "text": "15 参考资料",
                  "link": "/zh/24-game-types-architecture/15-references"
                },
                {
                  "text": "16 脚本热更新",
                  "link": "/zh/24-game-types-architecture/16-scripting-hotfix"
                },
                {
                  "text": "17 版本发布与配置",
                  "link": "/zh/24-game-types-architecture/17-versioning-release"
                },
                {
                  "text": "18 安全与风控合规",
                  "link": "/zh/24-game-types-architecture/18-security-compliance"
                },
                {
                  "text": "专题扩展规划",
                  "link": "/zh/24-game-types-architecture/expansion"
                }
              ]
            },
            {
              "text": "匹配、数据与引擎专题",
              "collapsed": false,
              "items": [
                {
                  "text": "19 客户端架构与性能基础",
                  "link": "/zh/24-game-types-architecture/19-client-architecture"
                },
                {
                  "text": "20 游戏测试与质量保障",
                  "link": "/zh/24-game-types-architecture/20-game-testing"
                },
                {
                  "text": "21 音频与美术管线协作",
                  "link": "/zh/24-game-types-architecture/21-art-audio-pipeline"
                },
                {
                  "text": "开源项目选型调研",
                  "link": "/zh/24-game-types-architecture/22-matchmaking-oss"
                },
                {
                  "text": "自建架构职责与落位",
                  "link": "/zh/24-game-types-architecture/23-matchmaking-architecture"
                },
                {
                  "text": "属性同步与持久化",
                  "link": "/zh/24-game-types-architecture/24-entity-sync-persistence"
                },
                {
                  "text": "属性DB映射与设计哲学",
                  "link": "/zh/24-game-types-architecture/25-entity-db-mapping-philosophy"
                },
                {
                  "text": "MMO 引擎对比",
                  "link": "/zh/24-game-types-architecture/26-mmo-engine-survey"
                },
                {
                  "text": "引擎设计亮点",
                  "link": "/zh/24-game-types-architecture/27-mmo-engine-design-highlights"
                }
              ]
            }
          ],
          "/zh/server/": [
            {
              "text": "服务端总览",
              "link": "/zh/server/"
            },
            {
              "text": "崩溃诊断：core 与 GDB",
              "link": "/zh/server/crash-diagnosis"
            },
            {
              "text": "多人模型",
              "collapsed": false,
              "items": [
                {
                  "text": "AOI：兴趣区域",
                  "link": "/zh/server/aoi"
                }
              ]
            },
            {
              "text": "源码解析",
              "collapsed": false,
              "items": [
                {
                  "text": "Skynet：C 内核 + Lua Actor",
                  "link": "/zh/server/skynet"
                }
              ]
            },
            {
              "text": "语言与选型",
              "collapsed": false,
              "items": [
                {
                  "text": "服务端语言与运行时",
                  "link": "/zh/server/language"
                },
                {
                  "text": "开源服务器地图",
                  "link": "/zh/server/map"
                }
              ]
            },
            {
              "text": "同步、战斗与实时交互",
              "collapsed": false,
              "items": [
                {
                  "text": "同步、战斗与实时交互",
                  "link": "/zh/server/sync/"
                },
                {
                  "text": "Tick 与时间推进",
                  "link": "/zh/server/sync/01"
                },
                {
                  "text": "同步模型",
                  "link": "/zh/server/sync/02"
                },
                {
                  "text": "帧同步详解",
                  "link": "/zh/server/sync/03"
                },
                {
                  "text": "暂停、继续、追帧与断线重连",
                  "link": "/zh/server/sync/04"
                },
                {
                  "text": "预测、补偿与纠正",
                  "link": "/zh/server/sync/05"
                },
                {
                  "text": "确定性与数值一致性",
                  "link": "/zh/server/sync/06"
                },
                {
                  "text": "回放、观战与裁决",
                  "link": "/zh/server/sync/07"
                },
                {
                  "text": "技能系统设计",
                  "link": "/zh/server/sync/08"
                }
              ]
            },
            {
              "text": "执行模型与运行时",
              "collapsed": false,
              "items": [
                {
                  "text": "执行模型与运行时",
                  "link": "/zh/server/runtime/"
                },
                {
                  "text": "并发模型总览：从七周七并发到游戏运行时",
                  "link": "/zh/server/runtime/00"
                },
                {
                  "text": "单线程、多线程与 Actor",
                  "link": "/zh/server/runtime/01"
                },
                {
                  "text": "协程、状态机与任务队列",
                  "link": "/zh/server/runtime/02"
                },
                {
                  "text": "Tick 驱动与逻辑执行",
                  "link": "/zh/server/runtime/03"
                },
                {
                  "text": "流控、背压与稳定性机制",
                  "link": "/zh/server/runtime/04"
                },
                {
                  "text": "锁竞争与性能代价",
                  "link": "/zh/server/runtime/05"
                },
                {
                  "text": "Epoch-driven Actor / Channel Runtime",
                  "link": "/zh/server/runtime/06"
                }
              ]
            },
            {
              "text": "服务拆分与控制平面",
              "collapsed": false,
              "items": [
                {
                  "text": "服务拆分与控制平面",
                  "link": "/zh/server/services/"
                },
                {
                  "text": "服务拆分方法论",
                  "link": "/zh/server/services/01"
                },
                {
                  "text": "核心服务角色",
                  "link": "/zh/server/services/02"
                },
                {
                  "text": "协调层、跨服与控制平面",
                  "link": "/zh/server/services/03"
                },
                {
                  "text": "服务发现、路由与协作",
                  "link": "/zh/server/services/04"
                },
                {
                  "text": "一致性、恢复与重连",
                  "link": "/zh/server/services/05"
                }
              ]
            },
            {
              "text": "容量扩缩",
              "collapsed": false,
              "items": [
                {
                  "text": "容量扩缩",
                  "link": "/zh/server/capacity/"
                },
                {
                  "text": "压测与容量规划",
                  "link": "/zh/server/capacity/01"
                },
                {
                  "text": "扩容、缩容与动态加服",
                  "link": "/zh/server/capacity/02"
                },
                {
                  "text": "分区、迁移、合服与下线",
                  "link": "/zh/server/capacity/03"
                },
                {
                  "text": "平台化运维与多地域架构",
                  "link": "/zh/server/capacity/04"
                }
              ]
            },
            {
              "text": "安全、风控与合规",
              "collapsed": false,
              "items": [
                {
                  "text": "安全、风控与合规",
                  "link": "/zh/server/security/"
                },
                {
                  "text": "安全与反作弊",
                  "link": "/zh/server/security/01"
                },
                {
                  "text": "审计、隐私与数据安全",
                  "link": "/zh/server/security/02"
                },
                {
                  "text": "行为风控与治理体系",
                  "link": "/zh/server/security/03"
                },
                {
                  "text": "合规、版号与平台约束",
                  "link": "/zh/server/security/04"
                },
                {
                  "text": "许可风险与依赖治理",
                  "link": "/zh/server/security/05"
                }
              ]
            }
          ],
          "/zh/system/": [
            {
              "text": "系统总览",
              "collapsed": false,
              "items": [
                {
                  "text": "系统总览",
                  "link": "/zh/system/"
                }
              ]
            },
            {
              "text": "玩法系统",
              "collapsed": false,
              "items": [
                {
                  "text": "排行榜：四种实现比对",
                  "link": "/zh/system/leaderboard"
                },
                {
                  "text": "队伍匹配：四种撮合形态",
                  "link": "/zh/system/party-matchmaking"
                },
                {
                  "text": "PVP 匹配：评分与匹配池",
                  "link": "/zh/system/pvp-matchmaking"
                },
                {
                  "text": "技能系统：部件边界与扩展",
                  "link": "/zh/system/skill"
                },
                {
                  "text": "结算：凭证与幂等",
                  "link": "/zh/system/settlement"
                },
                {
                  "text": "任务系统：进度与链式前置",
                  "link": "/zh/system/quest"
                },
                {
                  "text": "成就与图鉴",
                  "link": "/zh/system/achievement"
                },
                {
                  "text": "体力与次数门控",
                  "link": "/zh/system/stamina"
                },
                {
                  "text": "装备强化与升星",
                  "link": "/zh/system/enhance"
                },
                {
                  "text": "签到、福利与兑换码",
                  "link": "/zh/system/checkin"
                },
                {
                  "text": "战令与赛季轨",
                  "link": "/zh/system/battle-pass"
                },
                {
                  "text": "走马灯与公告",
                  "link": "/zh/system/marquee"
                },
                {
                  "text": "外观、皮肤与装扮",
                  "link": "/zh/system/cosmetics"
                },
                {
                  "text": "家园、领地与建造权限",
                  "link": "/zh/system/territory"
                },
                {
                  "text": "游戏内语音",
                  "link": "/zh/system/voice"
                },
                {
                  "text": "品类与组件覆盖对照",
                  "link": "/zh/system/genre-coverage"
                }
              ]
            },
            {
              "text": "脚本与热更",
              "collapsed": false,
              "items": [
                {
                  "text": "脚本、热更新与逻辑扩展",
                  "link": "/zh/system/scripting/"
                },
                {
                  "text": "脚本层定位与语言选择",
                  "link": "/zh/system/scripting/01"
                },
                {
                  "text": "宿主运行时与脚本 VM 集成",
                  "link": "/zh/system/scripting/02"
                },
                {
                  "text": "配置驱动与脚本驱动",
                  "link": "/zh/system/scripting/03"
                },
                {
                  "text": "热更新体系",
                  "link": "/zh/system/scripting/04"
                }
              ]
            },
            {
              "text": "通用服务",
              "collapsed": false,
              "items": [
                {
                  "text": "通用游戏服务",
                  "link": "/zh/system/services/"
                },
                {
                  "text": "账号、角色与基础系统",
                  "link": "/zh/system/services/01"
                },
                {
                  "text": "活动、排行、匹配与社交",
                  "link": "/zh/system/services/02"
                },
                {
                  "text": "交易、支付与经济系统",
                  "link": "/zh/system/services/03"
                },
                {
                  "text": "风控、审计、GM 与客服",
                  "link": "/zh/system/services/04"
                }
              ]
            }
          ],
          "/zh/database/": [
            {
              "text": "数据建模与数据库",
              "collapsed": false,
              "items": [
                {
                  "text": "数据建模与数据库",
                  "link": "/zh/database/"
                },
                {
                  "text": "游戏数据分类与建模",
                  "link": "/zh/database/01"
                },
                {
                  "text": "关系型与非关系型数据库",
                  "link": "/zh/database/02"
                },
                {
                  "text": "事务、一致性与分库分表",
                  "link": "/zh/database/03"
                },
                {
                  "text": "数据同步、冷热分层与归档",
                  "link": "/zh/database/04"
                }
              ]
            },
            {
              "text": "缓存、中间件与基础设施",
              "collapsed": false,
              "items": [
                {
                  "text": "缓存、中间件与基础设施",
                  "link": "/zh/database/cache/"
                },
                {
                  "text": "Redis、排行榜与锁",
                  "link": "/zh/database/cache/01"
                },
                {
                  "text": "singleflight、MQ 与事件流",
                  "link": "/zh/database/cache/02"
                },
                {
                  "text": "注册中心、负载均衡与一致性哈希",
                  "link": "/zh/database/cache/03"
                },
                {
                  "text": "对象存储、CDN 与资源分发",
                  "link": "/zh/database/cache/04"
                }
              ]
            }
          ],
          "/zh/client/": [
            {
              "text": "客户端架构与引擎体系",
              "collapsed": false,
              "items": [
                {
                  "text": "客户端架构与引擎体系",
                  "link": "/zh/client/"
                },
                {
                  "text": "客户端技术栈与引擎",
                  "link": "/zh/client/01"
                },
                {
                  "text": "前后端边界与网络层",
                  "link": "/zh/client/02"
                },
                {
                  "text": "资源系统与工具链",
                  "link": "/zh/client/03"
                },
                {
                  "text": "脚本语言与 ECS",
                  "link": "/zh/client/04"
                },
                {
                  "text": "AI 在客户端与游戏系统中的应用场景",
                  "link": "/zh/client/05"
                }
              ]
            },
            {
              "text": "交互与输入",
              "collapsed": false,
              "items": [
                {
                  "text": "交互与输入：意图与映射",
                  "link": "/zh/client/input"
                }
              ]
            },
            {
              "text": "Web 游戏前端体系",
              "collapsed": false,
              "items": [
                {
                  "text": "Web 游戏前端体系",
                  "link": "/zh/client/web/"
                },
                {
                  "text": "H5 与 Canvas 2D 渲染基础",
                  "link": "/zh/client/web/01"
                },
                {
                  "text": "WebGL 与三维渲染基础",
                  "link": "/zh/client/web/02"
                },
                {
                  "text": "游戏引擎与 Cocos Creator",
                  "link": "/zh/client/web/03"
                },
                {
                  "text": "游戏 UI 体系",
                  "link": "/zh/client/web/04"
                },
                {
                  "text": "小游戏平台与浏览器环境",
                  "link": "/zh/client/web/05"
                },
                {
                  "text": "客户端内部分层：渲染、逻辑与资源",
                  "link": "/zh/client/web/06"
                }
              ]
            },
            {
              "text": "引擎、语言与工具生态",
              "collapsed": false,
              "items": [
                {
                  "text": "引擎、语言与工具生态",
                  "link": "/zh/client/engines/"
                },
                {
                  "text": "引擎选择与商业模式",
                  "link": "/zh/client/engines/01"
                },
                {
                  "text": "编程语言与技术栈地图",
                  "link": "/zh/client/engines/02"
                },
                {
                  "text": "团队能力、项目类型与工具生态",
                  "link": "/zh/client/engines/03"
                }
              ]
            }
          ],
          "/zh/production/": [
            {
              "text": "版本发布与研发管线",
              "collapsed": false,
              "items": [
                {
                  "text": "版本发布与研发管线",
                  "link": "/zh/production/"
                },
                {
                  "text": "版本体系总览",
                  "link": "/zh/production/01"
                },
                {
                  "text": "客户端、资源、配置与协议版本",
                  "link": "/zh/production/02"
                },
                {
                  "text": "灰度、回滚与兼容窗口",
                  "link": "/zh/production/03"
                },
                {
                  "text": "前后端协同与平台约束",
                  "link": "/zh/production/04"
                },
                {
                  "text": "配置表与数据驱动管线",
                  "link": "/zh/production/05"
                },
                {
                  "text": "研发协作与发布工作流",
                  "link": "/zh/production/06"
                },
                {
                  "text": "工作室分工与质量门禁",
                  "link": "/zh/production/07"
                }
              ]
            },
            {
              "text": "配置管线与研发协作",
              "collapsed": false,
              "items": [
                {
                  "text": "配置管线与研发协作",
                  "link": "/zh/production/config/"
                },
                {
                  "text": "配置表驱动开发",
                  "link": "/zh/production/config/01"
                },
                {
                  "text": "表结构设计与拆分",
                  "link": "/zh/production/config/02"
                },
                {
                  "text": "校验、导出与代码生成",
                  "link": "/zh/production/config/03"
                },
                {
                  "text": "工作流、事故防呆与协作",
                  "link": "/zh/production/config/04"
                }
              ]
            },
            {
              "text": "选型、实践与复盘",
              "collapsed": false,
              "items": [
                {
                  "text": "选型、实践与复盘",
                  "link": "/zh/production/retro/"
                },
                {
                  "text": "引擎、语言与技术选型",
                  "link": "/zh/production/retro/01"
                },
                {
                  "text": "架构模式与选型对照",
                  "link": "/zh/production/retro/02"
                },
                {
                  "text": "关键问题清单",
                  "link": "/zh/production/retro/03"
                },
                {
                  "text": "分析框架、误区与失败案例",
                  "link": "/zh/production/retro/04"
                },
                {
                  "text": "个人查漏补缺清单",
                  "link": "/zh/production/retro/05"
                }
              ]
            }
          ],
          "/zh/operation/": [
            {
              "text": "运营、商业化与数据分析",
              "collapsed": false,
              "items": [
                {
                  "text": "运营与可观测性总览",
                  "link": "/zh/operation/"
                },
                {
                  "text": "运营、商业化与数据分析",
                  "link": "/zh/operation/bi/"
                },
                {
                  "text": "运营与商业化基础",
                  "link": "/zh/operation/bi/01"
                },
                {
                  "text": "埋点、BI 与分析系统",
                  "link": "/zh/operation/bi/02"
                },
                {
                  "text": "经济、平衡与风控分析",
                  "link": "/zh/operation/bi/03"
                },
                {
                  "text": "触达体系与外部能力接入",
                  "link": "/zh/operation/bi/04"
                },
                {
                  "text": "AI 在运营、分析与风控中的应用",
                  "link": "/zh/operation/bi/05"
                }
              ]
            },
            {
              "text": "可观测性、性能、容量与稳定性",
              "collapsed": false,
              "items": [
                {
                  "text": "可观测性与稳定性",
                  "link": "/zh/operation/observability/"
                },
                {
                  "text": "日志、指标、Tracing 与 OTel",
                  "link": "/zh/operation/observability/01"
                },
                {
                  "text": "专项可观测与 Tick 指标",
                  "link": "/zh/operation/observability/02"
                },
                {
                  "text": "Profiling、火焰图与热点分析",
                  "link": "/zh/operation/observability/03"
                },
                {
                  "text": "Debug、故障定位与复盘",
                  "link": "/zh/operation/observability/04"
                },
                {
                  "text": "压测、容量规划与扩缩容",
                  "link": "/zh/operation/observability/05"
                },
                {
                  "text": "稳定性治理的真正目标",
                  "link": "/zh/operation/observability/06"
                }
              ]
            }
          ],
          "/zh/industry/": [
            {
              "text": "总论与方法论",
              "collapsed": false,
              "items": [
                {
                  "text": "行业与方法论总览",
                  "link": "/zh/industry/"
                },
                {
                  "text": "总论与方法论",
                  "link": "/zh/industry/methodology/"
                },
                {
                  "text": "游戏开发知识地图",
                  "link": "/zh/industry/methodology/01"
                },
                {
                  "text": "游戏类型、平台与商业形态",
                  "link": "/zh/industry/methodology/02"
                },
                {
                  "text": "从玩法到架构的分析方法",
                  "link": "/zh/industry/methodology/03"
                },
                {
                  "text": "游戏后端设计的核心取舍",
                  "link": "/zh/industry/methodology/04"
                },
                {
                  "text": "客户端、服务端、平台与运营的边界",
                  "link": "/zh/industry/methodology/05"
                },
                {
                  "text": "游戏项目生命周期与团队协作",
                  "link": "/zh/industry/methodology/06"
                },
                {
                  "text": "如何系统化积累游戏开发经验",
                  "link": "/zh/industry/methodology/07"
                }
              ]
            },
            {
              "text": "职业地图",
              "collapsed": false,
              "items": [
                {
                  "text": "职业地图：岗位、成长与流动",
                  "link": "/zh/industry/career"
                }
              ]
            },
            {
              "text": "游戏类型与问题模型",
              "collapsed": false,
              "items": [
                {
                  "text": "游戏类型与问题模型",
                  "link": "/zh/industry/models/"
                },
                {
                  "text": "常见玩法类型概览",
                  "link": "/zh/industry/models/00"
                },
                {
                  "text": "游戏类型的分类方法",
                  "link": "/zh/industry/models/01"
                },
                {
                  "text": "单局房间型游戏问题模型",
                  "link": "/zh/industry/models/02"
                },
                {
                  "text": "强实时对战型游戏问题模型",
                  "link": "/zh/industry/models/03"
                },
                {
                  "text": "持续在线世界型游戏问题模型",
                  "link": "/zh/industry/models/04"
                },
                {
                  "text": "长周期成长与异步交互型游戏问题模型",
                  "link": "/zh/industry/models/05"
                },
                {
                  "text": "经济与平台型游戏问题模型",
                  "link": "/zh/industry/models/06"
                },
                {
                  "text": "高频对象与重表现型游戏问题模型",
                  "link": "/zh/industry/models/07"
                },
                {
                  "text": "模型之间如何组合",
                  "link": "/zh/industry/models/08"
                }
              ]
            },
            {
              "text": "游戏类型专题",
              "collapsed": false,
              "items": [
                {
                  "text": "游戏类型专题",
                  "link": "/zh/industry/genres/"
                },
                {
                  "text": "房间制与轻量在线",
                  "link": "/zh/industry/genres/01"
                },
                {
                  "text": "强实时对战",
                  "link": "/zh/industry/genres/02"
                },
                {
                  "text": "持续在线世界",
                  "link": "/zh/industry/genres/03"
                },
                {
                  "text": "长周期成长与经营",
                  "link": "/zh/industry/genres/04"
                },
                {
                  "text": "平台与生态型游戏",
                  "link": "/zh/industry/genres/05"
                },
                {
                  "text": "如何使用这页",
                  "link": "/zh/industry/genres/06"
                }
              ]
            },
            {
              "text": "平台生态、渠道与 SDK",
              "collapsed": false,
              "items": [
                {
                  "text": "平台生态、渠道与 SDK",
                  "link": "/zh/industry/platforms/"
                },
                {
                  "text": "平台与渠道生态",
                  "link": "/zh/industry/platforms/01"
                },
                {
                  "text": "小游戏平台与技术约束",
                  "link": "/zh/industry/platforms/02"
                },
                {
                  "text": "登录、支付、社交与广告 SDK",
                  "link": "/zh/industry/platforms/03"
                },
                {
                  "text": "发布、版本与商业模式",
                  "link": "/zh/industry/platforms/04"
                }
              ]
            }
          ],
          "/zh/design/": [
            {
              "text": "按问题域归纳各类游戏",
              "collapsed": false,
              "items": [
                {
                  "text": "按问题域归纳各类游戏",
                  "link": "/zh/design/problem-domains/"
                },
                {
                  "text": "单局房间型架构",
                  "link": "/zh/design/problem-domains/01"
                },
                {
                  "text": "强实时对战型架构",
                  "link": "/zh/design/problem-domains/02"
                },
                {
                  "text": "持续在线世界型架构",
                  "link": "/zh/design/problem-domains/03"
                },
                {
                  "text": "长周期成长型架构",
                  "link": "/zh/design/problem-domains/04"
                },
                {
                  "text": "经济平台型架构",
                  "link": "/zh/design/problem-domains/05"
                },
                {
                  "text": "这页的用途",
                  "link": "/zh/design/problem-domains/06"
                }
              ]
            }
          ],
          "/zh/numerical/": [
            {
              "text": "策划与数值体系",
              "collapsed": false,
              "items": [
                {
                  "text": "策划与数值体系",
                  "link": "/zh/numerical/"
                },
                {
                  "text": "数值策划的工作与口径",
                  "link": "/zh/numerical/01"
                },
                {
                  "text": "战斗数值与伤害公式族",
                  "link": "/zh/numerical/02"
                },
                {
                  "text": "成长曲线模型",
                  "link": "/zh/numerical/03"
                },
                {
                  "text": "经济循环与产出消耗",
                  "link": "/zh/numerical/04"
                },
                {
                  "text": "掉落与概率设计",
                  "link": "/zh/numerical/05"
                },
                {
                  "text": "商业化数值示例模型",
                  "link": "/zh/numerical/06"
                },
                {
                  "text": "关卡难度与新手节奏",
                  "link": "/zh/numerical/07"
                },
                {
                  "text": "数值书单与资料",
                  "link": "/zh/numerical/08"
                }
              ]
            }
          ],
          "/zh/glossary/": [
            {
              "text": "术语约定",
              "collapsed": false,
              "items": [
                {
                  "text": "术语约定",
                  "link": "/zh/glossary/"
                },
                {
                  "text": "服务端",
                  "link": "/zh/glossary/01"
                },
                {
                  "text": "接入层",
                  "link": "/zh/glossary/02"
                },
                {
                  "text": "主链路 / 外围链路",
                  "link": "/zh/glossary/03"
                },
                {
                  "text": "权威状态",
                  "link": "/zh/glossary/04"
                },
                {
                  "text": "配置驱动 / 脚本驱动",
                  "link": "/zh/glossary/05"
                },
                {
                  "text": "热更新",
                  "link": "/zh/glossary/06"
                },
                {
                  "text": "控制平面",
                  "link": "/zh/glossary/07"
                },
                {
                  "text": "运营",
                  "link": "/zh/glossary/08"
                },
                {
                  "text": "风控",
                  "link": "/zh/glossary/09"
                },
                {
                  "text": "英文术语与词源",
                  "link": "/zh/glossary/10"
                },
                {
                  "text": "角色、实体与 MMO 空间术语",
                  "link": "/zh/glossary/11"
                }
              ]
            }
          ],
          "/zh/networking/": [
            {
              "text": "网络与接入协议",
              "collapsed": false,
              "items": [
                {
                  "text": "网络与接入协议",
                  "link": "/zh/networking/"
                },
                {
                  "text": "游戏网络基础",
                  "link": "/zh/networking/01"
                },
                {
                  "text": "I/O 模型与事件通知机制",
                  "link": "/zh/networking/02"
                },
                {
                  "text": "传输层与接入协议选择",
                  "link": "/zh/networking/03"
                },
                {
                  "text": "数据帧与协议契约",
                  "link": "/zh/networking/04"
                },
                {
                  "text": "消息模式与事件分发",
                  "link": "/zh/networking/05"
                },
                {
                  "text": "可靠性、顺序与兼容性",
                  "link": "/zh/networking/06"
                },
                {
                  "text": "房间广播、弱网与国内网络环境",
                  "link": "/zh/networking/07"
                }
              ]
            },
            {
              "text": "消息系统与进程间通信",
              "collapsed": false,
              "items": [
                {
                  "text": "消息系统与进程间通信",
                  "link": "/zh/networking/ipc/"
                },
                {
                  "text": "IPC 基础与场景边界",
                  "link": "/zh/networking/ipc/01"
                },
                {
                  "text": "通信模式",
                  "link": "/zh/networking/ipc/02"
                },
                {
                  "text": "主链路与外围链路差异",
                  "link": "/zh/networking/ipc/03"
                },
                {
                  "text": "低延迟与高吞吐取舍",
                  "link": "/zh/networking/ipc/04"
                },
                {
                  "text": "消息语义、幂等与顺序",
                  "link": "/zh/networking/ipc/05"
                },
                {
                  "text": "如何选通信方案",
                  "link": "/zh/networking/ipc/06"
                }
              ]
            }
          ],
          "/zh/": [
            {
              "text": "索引与阅读说明",
              "collapsed": false,
              "items": [
                {
                  "text": "内容组织说明",
                  "link": "/zh/00-reading-guide/"
                },
                {
                  "text": "按问题进入",
                  "link": "/zh/00-reading-guide/02"
                },
                {
                  "text": "主题内容与横向索引",
                  "link": "/zh/00-reading-guide/03"
                },
                {
                  "text": "怎么用它做项目分析",
                  "link": "/zh/00-reading-guide/04"
                },
                {
                  "text": "术语约定",
                  "link": "/zh/glossary/"
                },
                {
                  "text": "服务端",
                  "link": "/zh/glossary/01"
                },
                {
                  "text": "接入层",
                  "link": "/zh/glossary/02"
                },
                {
                  "text": "主链路 / 外围链路",
                  "link": "/zh/glossary/03"
                },
                {
                  "text": "权威状态",
                  "link": "/zh/glossary/04"
                },
                {
                  "text": "配置驱动 / 脚本驱动",
                  "link": "/zh/glossary/05"
                },
                {
                  "text": "热更新",
                  "link": "/zh/glossary/06"
                },
                {
                  "text": "控制平面",
                  "link": "/zh/glossary/07"
                },
                {
                  "text": "运营",
                  "link": "/zh/glossary/08"
                },
                {
                  "text": "风控",
                  "link": "/zh/glossary/09"
                },
                {
                  "text": "英文术语与词源",
                  "link": "/zh/glossary/10"
                },
                {
                  "text": "角色、实体与 MMO 空间术语",
                  "link": "/zh/glossary/11"
                }
              ]
            },
            {
              "text": "总论与方法论",
              "collapsed": true,
              "items": [
                {
                  "text": "总论与方法论",
                  "link": "/zh/industry/methodology/"
                },
                {
                  "text": "游戏开发知识地图",
                  "link": "/zh/industry/methodology/01"
                },
                {
                  "text": "游戏类型、平台与商业形态",
                  "link": "/zh/industry/methodology/02"
                },
                {
                  "text": "从玩法到架构的分析方法",
                  "link": "/zh/industry/methodology/03"
                },
                {
                  "text": "游戏后端设计的核心取舍",
                  "link": "/zh/industry/methodology/04"
                },
                {
                  "text": "客户端、服务端、平台与运营的边界",
                  "link": "/zh/industry/methodology/05"
                },
                {
                  "text": "游戏项目生命周期与团队协作",
                  "link": "/zh/industry/methodology/06"
                },
                {
                  "text": "如何系统化积累游戏开发经验",
                  "link": "/zh/industry/methodology/07"
                }
              ]
            },
            {
              "text": "游戏类型与问题模型",
              "collapsed": true,
              "items": [
                {
                  "text": "游戏类型与问题模型",
                  "link": "/zh/industry/models/"
                },
                {
                  "text": "常见玩法类型概览",
                  "link": "/zh/industry/models/00"
                },
                {
                  "text": "游戏类型的分类方法",
                  "link": "/zh/industry/models/01"
                },
                {
                  "text": "单局房间型游戏问题模型",
                  "link": "/zh/industry/models/02"
                },
                {
                  "text": "强实时对战型游戏问题模型",
                  "link": "/zh/industry/models/03"
                },
                {
                  "text": "持续在线世界型游戏问题模型",
                  "link": "/zh/industry/models/04"
                },
                {
                  "text": "长周期成长与异步交互型游戏问题模型",
                  "link": "/zh/industry/models/05"
                },
                {
                  "text": "经济与平台型游戏问题模型",
                  "link": "/zh/industry/models/06"
                },
                {
                  "text": "高频对象与重表现型游戏问题模型",
                  "link": "/zh/industry/models/07"
                },
                {
                  "text": "模型之间如何组合",
                  "link": "/zh/industry/models/08"
                }
              ]
            },
            {
              "text": "网络与接入协议",
              "collapsed": true,
              "items": [
                {
                  "text": "网络与接入协议",
                  "link": "/zh/networking/"
                },
                {
                  "text": "游戏网络基础",
                  "link": "/zh/networking/01"
                },
                {
                  "text": "I/O 模型与事件通知机制",
                  "link": "/zh/networking/02"
                },
                {
                  "text": "传输层与接入协议选择",
                  "link": "/zh/networking/03"
                },
                {
                  "text": "数据帧与协议契约",
                  "link": "/zh/networking/04"
                },
                {
                  "text": "消息模式与事件分发",
                  "link": "/zh/networking/05"
                },
                {
                  "text": "可靠性、顺序与兼容性",
                  "link": "/zh/networking/06"
                },
                {
                  "text": "房间广播、弱网与国内网络环境",
                  "link": "/zh/networking/07"
                }
              ]
            },
            {
              "text": "同步、战斗与实时交互",
              "collapsed": true,
              "items": [
                {
                  "text": "同步、战斗与实时交互",
                  "link": "/zh/server/sync/"
                },
                {
                  "text": "Tick 与时间推进",
                  "link": "/zh/server/sync/01"
                },
                {
                  "text": "同步模型",
                  "link": "/zh/server/sync/02"
                },
                {
                  "text": "帧同步详解",
                  "link": "/zh/server/sync/03"
                },
                {
                  "text": "暂停、继续、追帧与断线重连",
                  "link": "/zh/server/sync/04"
                },
                {
                  "text": "预测、补偿与纠正",
                  "link": "/zh/server/sync/05"
                },
                {
                  "text": "确定性与数值一致性",
                  "link": "/zh/server/sync/06"
                },
                {
                  "text": "回放、观战与裁决",
                  "link": "/zh/server/sync/07"
                },
                {
                  "text": "技能系统设计",
                  "link": "/zh/server/sync/08"
                }
              ]
            },
            {
              "text": "执行模型与运行时",
              "collapsed": true,
              "items": [
                {
                  "text": "执行模型与运行时",
                  "link": "/zh/server/runtime/"
                },
                {
                  "text": "并发模型总览：从七周七并发到游戏运行时",
                  "link": "/zh/server/runtime/00"
                },
                {
                  "text": "单线程、多线程与 Actor",
                  "link": "/zh/server/runtime/01"
                },
                {
                  "text": "协程、状态机与任务队列",
                  "link": "/zh/server/runtime/02"
                },
                {
                  "text": "Tick 驱动与逻辑执行",
                  "link": "/zh/server/runtime/03"
                },
                {
                  "text": "流控、背压与稳定性机制",
                  "link": "/zh/server/runtime/04"
                },
                {
                  "text": "锁竞争与性能代价",
                  "link": "/zh/server/runtime/05"
                },
                {
                  "text": "Epoch-driven Actor / Channel Runtime",
                  "link": "/zh/server/runtime/06"
                }
              ]
            },
            {
              "text": "服务拆分、分布式与控制平面",
              "collapsed": true,
              "items": [
                {
                  "text": "服务拆分与控制平面",
                  "link": "/zh/server/services/"
                },
                {
                  "text": "服务拆分方法论",
                  "link": "/zh/server/services/01"
                },
                {
                  "text": "核心服务角色",
                  "link": "/zh/server/services/02"
                },
                {
                  "text": "协调层、跨服与控制平面",
                  "link": "/zh/server/services/03"
                },
                {
                  "text": "服务发现、路由与协作",
                  "link": "/zh/server/services/04"
                },
                {
                  "text": "一致性、恢复与重连",
                  "link": "/zh/server/services/05"
                }
              ]
            },
            {
              "text": "消息系统与进程间通信",
              "collapsed": true,
              "items": [
                {
                  "text": "消息系统与进程间通信",
                  "link": "/zh/networking/ipc/"
                },
                {
                  "text": "IPC 基础与场景边界",
                  "link": "/zh/networking/ipc/01"
                },
                {
                  "text": "通信模式",
                  "link": "/zh/networking/ipc/02"
                },
                {
                  "text": "主链路与外围链路差异",
                  "link": "/zh/networking/ipc/03"
                },
                {
                  "text": "低延迟与高吞吐取舍",
                  "link": "/zh/networking/ipc/04"
                },
                {
                  "text": "消息语义、幂等与顺序",
                  "link": "/zh/networking/ipc/05"
                },
                {
                  "text": "如何选通信方案",
                  "link": "/zh/networking/ipc/06"
                }
              ]
            },
            {
              "text": "客户端架构与引擎体系",
              "collapsed": true,
              "items": [
                {
                  "text": "客户端架构与引擎体系",
                  "link": "/zh/client/"
                },
                {
                  "text": "客户端技术栈与引擎",
                  "link": "/zh/client/01"
                },
                {
                  "text": "前后端边界与网络层",
                  "link": "/zh/client/02"
                },
                {
                  "text": "资源系统与工具链",
                  "link": "/zh/client/03"
                },
                {
                  "text": "脚本语言与 ECS",
                  "link": "/zh/client/04"
                },
                {
                  "text": "AI 在客户端与游戏系统中的应用场景",
                  "link": "/zh/client/05"
                }
              ]
            },
            {
              "text": "脚本、热更新与逻辑扩展",
              "collapsed": true,
              "items": [
                {
                  "text": "脚本、热更新与逻辑扩展",
                  "link": "/zh/system/scripting/"
                },
                {
                  "text": "脚本层定位与语言选择",
                  "link": "/zh/system/scripting/01"
                },
                {
                  "text": "宿主运行时与脚本 VM 集成",
                  "link": "/zh/system/scripting/02"
                },
                {
                  "text": "配置驱动与脚本驱动",
                  "link": "/zh/system/scripting/03"
                },
                {
                  "text": "热更新体系",
                  "link": "/zh/system/scripting/04"
                }
              ]
            },
            {
              "text": "版本发布、配置与研发管线",
              "collapsed": true,
              "items": [
                {
                  "text": "版本发布与研发管线",
                  "link": "/zh/production/"
                },
                {
                  "text": "版本体系总览",
                  "link": "/zh/production/01"
                },
                {
                  "text": "客户端、资源、配置与协议版本",
                  "link": "/zh/production/02"
                },
                {
                  "text": "灰度、回滚与兼容窗口",
                  "link": "/zh/production/03"
                },
                {
                  "text": "前后端协同与平台约束",
                  "link": "/zh/production/04"
                },
                {
                  "text": "配置表与数据驱动管线",
                  "link": "/zh/production/05"
                },
                {
                  "text": "研发协作与发布工作流",
                  "link": "/zh/production/06"
                },
                {
                  "text": "工作室分工与质量门禁",
                  "link": "/zh/production/07"
                }
              ]
            },
            {
              "text": "数据建模与数据库",
              "collapsed": true,
              "items": [
                {
                  "text": "数据建模与数据库",
                  "link": "/zh/database/"
                },
                {
                  "text": "游戏数据分类与建模",
                  "link": "/zh/database/01"
                },
                {
                  "text": "关系型与非关系型数据库",
                  "link": "/zh/database/02"
                },
                {
                  "text": "事务、一致性与分库分表",
                  "link": "/zh/database/03"
                },
                {
                  "text": "数据同步、冷热分层与归档",
                  "link": "/zh/database/04"
                }
              ]
            },
            {
              "text": "缓存、中间件与基础设施",
              "collapsed": true,
              "items": [
                {
                  "text": "缓存、中间件与基础设施",
                  "link": "/zh/database/cache/"
                },
                {
                  "text": "Redis、排行榜与锁",
                  "link": "/zh/database/cache/01"
                },
                {
                  "text": "singleflight、MQ 与事件流",
                  "link": "/zh/database/cache/02"
                },
                {
                  "text": "注册中心、负载均衡与一致性哈希",
                  "link": "/zh/database/cache/03"
                },
                {
                  "text": "对象存储、CDN 与资源分发",
                  "link": "/zh/database/cache/04"
                }
              ]
            },
            {
              "text": "通用游戏服务",
              "collapsed": true,
              "items": [
                {
                  "text": "通用游戏服务",
                  "link": "/zh/system/services/"
                },
                {
                  "text": "账号、角色与基础系统",
                  "link": "/zh/system/services/01"
                },
                {
                  "text": "活动、排行、匹配与社交",
                  "link": "/zh/system/services/02"
                },
                {
                  "text": "交易、支付与经济系统",
                  "link": "/zh/system/services/03"
                },
                {
                  "text": "风控、审计、GM 与客服",
                  "link": "/zh/system/services/04"
                }
              ]
            },
            {
              "text": "运营、商业化与数据分析",
              "collapsed": true,
              "items": [
                {
                  "text": "运营、商业化与数据分析",
                  "link": "/zh/operation/bi/"
                },
                {
                  "text": "运营与商业化基础",
                  "link": "/zh/operation/bi/01"
                },
                {
                  "text": "埋点、BI 与分析系统",
                  "link": "/zh/operation/bi/02"
                },
                {
                  "text": "经济、平衡与风控分析",
                  "link": "/zh/operation/bi/03"
                },
                {
                  "text": "触达体系与外部能力接入",
                  "link": "/zh/operation/bi/04"
                },
                {
                  "text": "AI 在运营、分析与风控中的应用",
                  "link": "/zh/operation/bi/05"
                }
              ]
            },
            {
              "text": "平台生态、渠道与 SDK",
              "collapsed": true,
              "items": [
                {
                  "text": "平台生态、渠道与 SDK",
                  "link": "/zh/industry/platforms/"
                },
                {
                  "text": "平台与渠道生态",
                  "link": "/zh/industry/platforms/01"
                },
                {
                  "text": "小游戏平台与技术约束",
                  "link": "/zh/industry/platforms/02"
                },
                {
                  "text": "登录、支付、社交与广告 SDK",
                  "link": "/zh/industry/platforms/03"
                },
                {
                  "text": "发布、版本与商业模式",
                  "link": "/zh/industry/platforms/04"
                }
              ]
            },
            {
              "text": "可观测性、性能、容量与稳定性",
              "collapsed": true,
              "items": [
                {
                  "text": "可观测性与稳定性",
                  "link": "/zh/operation/observability/"
                },
                {
                  "text": "日志、指标、Tracing 与 OTel",
                  "link": "/zh/operation/observability/01"
                },
                {
                  "text": "专项可观测与 Tick 指标",
                  "link": "/zh/operation/observability/02"
                },
                {
                  "text": "Profiling、火焰图与热点分析",
                  "link": "/zh/operation/observability/03"
                },
                {
                  "text": "Debug、故障定位与复盘",
                  "link": "/zh/operation/observability/04"
                },
                {
                  "text": "压测、容量规划与扩缩容",
                  "link": "/zh/operation/observability/05"
                },
                {
                  "text": "稳定性治理的真正目标",
                  "link": "/zh/operation/observability/06"
                }
              ]
            },
            {
              "text": "安全、风控与合规",
              "collapsed": true,
              "items": [
                {
                  "text": "安全、风控与合规",
                  "link": "/zh/server/security/"
                },
                {
                  "text": "安全与反作弊",
                  "link": "/zh/server/security/01"
                },
                {
                  "text": "审计、隐私与数据安全",
                  "link": "/zh/server/security/02"
                },
                {
                  "text": "行为风控与治理体系",
                  "link": "/zh/server/security/03"
                },
                {
                  "text": "合规、版号与平台约束",
                  "link": "/zh/server/security/04"
                },
                {
                  "text": "许可风险与依赖治理",
                  "link": "/zh/server/security/05"
                }
              ]
            },
            {
              "text": "选型、实践、复盘与清单",
              "collapsed": true,
              "items": [
                {
                  "text": "选型、实践与复盘",
                  "link": "/zh/production/retro/"
                },
                {
                  "text": "引擎、语言与技术选型",
                  "link": "/zh/production/retro/01"
                },
                {
                  "text": "架构模式与选型对照",
                  "link": "/zh/production/retro/02"
                },
                {
                  "text": "关键问题清单",
                  "link": "/zh/production/retro/03"
                },
                {
                  "text": "分析框架、误区与失败案例",
                  "link": "/zh/production/retro/04"
                },
                {
                  "text": "个人查漏补缺清单",
                  "link": "/zh/production/retro/05"
                }
              ]
            },
            {
              "text": "Web 游戏前端体系",
              "collapsed": true,
              "items": [
                {
                  "text": "Web 游戏前端体系",
                  "link": "/zh/client/web/"
                },
                {
                  "text": "H5 与 Canvas 2D 渲染基础",
                  "link": "/zh/client/web/01"
                },
                {
                  "text": "WebGL 与三维渲染入门",
                  "link": "/zh/client/web/02"
                },
                {
                  "text": "游戏引擎与 Cocos Creator",
                  "link": "/zh/client/web/03"
                },
                {
                  "text": "游戏 UI 体系",
                  "link": "/zh/client/web/04"
                },
                {
                  "text": "小游戏平台与浏览器环境",
                  "link": "/zh/client/web/05"
                },
                {
                  "text": "客户端内部分层：渲染、逻辑与资源",
                  "link": "/zh/client/web/06"
                }
              ]
            },
            {
              "text": "策划与数值体系",
              "collapsed": true,
              "items": [
                {
                  "text": "策划与数值体系",
                  "link": "/zh/numerical/"
                },
                {
                  "text": "数值策划的工作与口径",
                  "link": "/zh/numerical/01"
                },
                {
                  "text": "战斗数值与伤害公式族",
                  "link": "/zh/numerical/02"
                },
                {
                  "text": "成长曲线模型",
                  "link": "/zh/numerical/03"
                },
                {
                  "text": "经济循环与产出消耗",
                  "link": "/zh/numerical/04"
                },
                {
                  "text": "掉落与概率设计",
                  "link": "/zh/numerical/05"
                },
                {
                  "text": "商业化数值示例模型",
                  "link": "/zh/numerical/06"
                },
                {
                  "text": "关卡难度与新手节奏",
                  "link": "/zh/numerical/07"
                },
                {
                  "text": "数值书单与资料",
                  "link": "/zh/numerical/08"
                }
              ]
            },
            {
              "text": "横向索引",
              "collapsed": true,
              "items": [
                {
                  "text": "附录与横向索引",
                  "link": "/zh/90-appendix/"
                },
                {
                  "text": "按品类回看问题",
                  "link": "/zh/90-appendix/01"
                },
                {
                  "text": "对主线做专题展开",
                  "link": "/zh/90-appendix/02"
                },
                {
                  "text": "做横向选型与快速对照",
                  "link": "/zh/90-appendix/03"
                },
                {
                  "text": "索引内容说明",
                  "link": "/zh/90-appendix/04"
                }
              ]
            },
            {
              "text": "游戏类型专题",
              "collapsed": true,
              "items": [
                {
                  "text": "游戏类型专题",
                  "link": "/zh/industry/genres/"
                },
                {
                  "text": "房间制与轻量在线",
                  "link": "/zh/industry/genres/01"
                },
                {
                  "text": "强实时对战",
                  "link": "/zh/industry/genres/02"
                },
                {
                  "text": "持续在线世界",
                  "link": "/zh/industry/genres/03"
                },
                {
                  "text": "长周期成长与经营",
                  "link": "/zh/industry/genres/04"
                },
                {
                  "text": "平台与生态型游戏",
                  "link": "/zh/industry/genres/05"
                },
                {
                  "text": "如何使用这页",
                  "link": "/zh/industry/genres/06"
                }
              ]
            },
            {
              "text": "按问题域归纳各类游戏",
              "collapsed": true,
              "items": [
                {
                  "text": "设计总览",
                  "link": "/zh/design/"
                },
                {
                  "text": "按问题域归纳各类游戏",
                  "link": "/zh/design/problem-domains/"
                },
                {
                  "text": "单局房间型架构",
                  "link": "/zh/design/problem-domains/01"
                },
                {
                  "text": "强实时对战型架构",
                  "link": "/zh/design/problem-domains/02"
                },
                {
                  "text": "持续在线世界型架构",
                  "link": "/zh/design/problem-domains/03"
                },
                {
                  "text": "长周期成长型架构",
                  "link": "/zh/design/problem-domains/04"
                },
                {
                  "text": "经济平台型架构",
                  "link": "/zh/design/problem-domains/05"
                },
                {
                  "text": "这页的用途",
                  "link": "/zh/design/problem-domains/06"
                }
              ]
            },
            {
              "text": "配置表、数据驱动与研发协作",
              "collapsed": true,
              "items": [
                {
                  "text": "配置管线与研发协作",
                  "link": "/zh/production/config/"
                },
                {
                  "text": "配置表驱动开发",
                  "link": "/zh/production/config/01"
                },
                {
                  "text": "表结构设计与拆分",
                  "link": "/zh/production/config/02"
                },
                {
                  "text": "校验、导出与代码生成",
                  "link": "/zh/production/config/03"
                },
                {
                  "text": "工作流、事故防呆与协作",
                  "link": "/zh/production/config/04"
                }
              ]
            },
            {
              "text": "压测、容量规划与扩缩容",
              "collapsed": true,
              "items": [
                {
                  "text": "容量扩缩",
                  "link": "/zh/server/capacity/"
                },
                {
                  "text": "压测与容量规划",
                  "link": "/zh/server/capacity/01"
                },
                {
                  "text": "扩容、缩容与动态加服",
                  "link": "/zh/server/capacity/02"
                },
                {
                  "text": "分区、迁移、合服与下线",
                  "link": "/zh/server/capacity/03"
                },
                {
                  "text": "平台化运维与多地域架构",
                  "link": "/zh/server/capacity/04"
                }
              ]
            },
            {
              "text": "引擎选择、语言地图与工具生态",
              "collapsed": true,
              "items": [
                {
                  "text": "引擎、语言与工具生态",
                  "link": "/zh/client/engines/"
                },
                {
                  "text": "引擎选择与商业模式",
                  "link": "/zh/client/engines/01"
                },
                {
                  "text": "编程语言与技术栈地图",
                  "link": "/zh/client/engines/02"
                },
                {
                  "text": "团队能力、项目类型与工具生态",
                  "link": "/zh/client/engines/03"
                }
              ]
            },
            {
              "text": "游戏后端引擎源码解析",
              "collapsed": true,
              "items": [
                {
                  "text": "Skynet：C 内核 + Lua Actor",
                  "link": "/zh/server/skynet"
                }
              ]
            },
            {
              "text": "调研与知识点",
              "collapsed": true,
              "items": [
                {
                  "text": "调研知识点总览",
                  "link": "/zh/knowledge"
                },
                {
                  "text": "调研总览",
                  "link": "/zh/research/"
                },
                {
                  "text": "权威书籍调研",
                  "link": "/zh/research/01-authoritative-books"
                },
                {
                  "text": "引擎与中间件官方文档调研",
                  "link": "/zh/research/02-engine-middleware-docs"
                },
                {
                  "text": "应用场景对照",
                  "link": "/zh/research/03-application-scenarios"
                },
                {
                  "text": "覆盖差异表",
                  "link": "/zh/research/04-coverage-diff"
                }
              ]
            }
          ]
        },
        "socialLinks": [
          {
            "icon": "github",
            "link": "https://github.com/cuihairu/hello-game"
          }
        ],
        "footer": {
          "message": "游戏知识体系",
          "copyright": "© 2025 cuihairu"
        },
        "search": {
          "provider": "local",
          "options": {
            "translations": {
              "button": {
                "buttonText": "搜索文档",
                "buttonAriaLabel": "搜索"
              },
              "modal": {
                "noResultsText": "没有找到结果",
                "resetButtonTitle": "清除查询条件",
                "footer": {
                  "selectText": "选择",
                  "navigateText": "切换",
                  "closeText": "关闭"
                }
              }
            }
          }
        },
        "outline": {
          "label": "页面导航",
          "level": [
            2,
            3
          ]
        },
        "docFooter": {
          "prev": "上一篇",
          "next": "下一篇"
        },
        "lastUpdated": {
          "text": "最后更新"
        },
        "returnToTopLabel": "回到顶部",
        "sidebarMenuLabel": "菜单",
        "darkModeSwitchLabel": "外观",
        "lightModeSwitchTitle": "切换到浅色模式",
        "darkModeSwitchTitle": "切换到深色模式"
      }
    }
  },
  "markdown": {
    "lineNumbers": false
  }
}
