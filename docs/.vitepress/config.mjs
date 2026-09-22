import { defineConfig } from "vitepress"
export default defineConfig({
  title: '游戏后端知识体系',
  description: '系统化的游戏服务器开发知识库',
  lang: 'zh-CN',
  base: '/hello-game/',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/hello-game/favicon.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '游戏后端知识体系',

    nav: [
      { text: '首页', link: '/' },
      { text: '入门', link: '/24-game-types-architecture/01-entry' },
      { text: '基础', link: '/24-game-types-architecture/02-game-design' },
      { text: '架构', link: '/24-game-types-architecture/07-core-arch' },
      { text: '网络', link: '/24-game-types-architecture/04-network' },
      { text: '实现', link: '/24-game-types-architecture/09-programming-patterns' },
      { text: '运维', link: '/24-game-types-architecture/13-tech-ops' },
      { text: '知识库', link: '/00-reading-guide/' },
      { text: 'GitHub', link: 'https://github.com/cuihairu/hello-game' }
    ],

    // 两套内容、两个侧边栏：
    // - /24-game-types-architecture/ 入门到实战教程（18 讲）
    // - / 其余路径为知识库主线（方法论 → 问题模型 → … → 稳定性 + 附录）
    sidebar: {
      '/24-game-types-architecture/': [
        { text: '📌 游戏类型与架构选型对照', link: '/24-game-types-architecture/' },
        {
          text: '🟢 入门',
          collapsed: false,
          items: [
            { text: '01 游戏后端技术全景', link: '/24-game-types-architecture/01-entry' }
          ]
        },
        {
          text: '🔵 基础',
          collapsed: false,
          items: [
            { text: '02 数值与经济系统', link: '/24-game-types-architecture/02-game-design' },
            { text: '03 前端引擎与客户端', link: '/24-game-types-architecture/03-frontend-engines' }
          ]
        },
        {
          text: '🔷 架构',
          collapsed: false,
          items: [
            { text: '04 通信协议设计', link: '/24-game-types-architecture/04-network' },
            { text: '05 并发模型', link: '/24-game-types-architecture/05-concurrency-models' },
            { text: '06 常见框架', link: '/24-game-types-architecture/06-frameworks' },
            { text: '07 架构总览', link: '/24-game-types-architecture/07-core-arch' },
            { text: '08 数据存储与中间件', link: '/24-game-types-architecture/08-data-storage' }
          ]
        },
        {
          text: '🟡 实现',
          collapsed: false,
          items: [
            { text: '09 游戏编程模式', link: '/24-game-types-architecture/09-programming-patterns' },
            { text: '10 玩法系统设计', link: '/24-game-types-architecture/10-gameplay-systems' },
            { text: '11 辅助系统设计', link: '/24-game-types-architecture/11-auxiliary-systems' }
          ]
        },
        {
          text: '🟠 运营',
          collapsed: false,
          items: [
            { text: '12 游戏数据分析', link: '/24-game-types-architecture/12-data-analytics' },
            { text: '13 运维实战', link: '/24-game-types-architecture/13-tech-ops' },
            { text: '14 研发组织', link: '/24-game-types-architecture/14-dev-organization' }
          ]
        },
        {
          text: '🔴 专题',
          collapsed: false,
          items: [
            { text: '15 学习资源', link: '/24-game-types-architecture/15-references' },
            { text: '16 脚本热更新', link: '/24-game-types-architecture/16-scripting-hotfix' },
            { text: '17 版本发布与配置', link: '/24-game-types-architecture/17-versioning-release' },
            { text: '18 安全与风控合规', link: '/24-game-types-architecture/18-security-compliance' }
          ]
        }
      ],

      '/': [
        {
          text: '导读',
          collapsed: false,
          items: [
            { text: '如何阅读这套知识库', link: '/00-reading-guide/' },
            { text: '推荐阅读顺序', link: '/00-reading-guide/01' },
            { text: '按问题进入', link: '/00-reading-guide/02' },
            { text: '主线和附录的区别', link: '/00-reading-guide/03' },
            { text: '怎么用它做项目分析', link: '/00-reading-guide/04' },
            { text: '术语约定', link: '/00-terminology/' },
            { text: '服务端', link: '/00-terminology/01' },
            { text: '接入层', link: '/00-terminology/02' },
            { text: '主链路 / 外围链路', link: '/00-terminology/03' },
            { text: '权威状态', link: '/00-terminology/04' },
            { text: '配置驱动 / 脚本驱动', link: '/00-terminology/05' },
            { text: '热更新', link: '/00-terminology/06' },
            { text: '控制平面', link: '/00-terminology/07' },
            { text: '运营', link: '/00-terminology/08' },
            { text: '风控', link: '/00-terminology/09' }
          ]
        },
        {
          text: '1. 总论与方法论',
          collapsed: true,
          items: [
            { text: '总论与方法论', link: '/01-methodology/' },
            { text: '游戏开发知识地图', link: '/01-methodology/01' },
            { text: '游戏类型、平台与商业形态', link: '/01-methodology/02' },
            { text: '从玩法到架构的分析方法', link: '/01-methodology/03' },
            { text: '游戏后端设计的核心取舍', link: '/01-methodology/04' },
            { text: '客户端、服务端、平台与运营的边界', link: '/01-methodology/05' },
            { text: '游戏项目生命周期与团队协作', link: '/01-methodology/06' },
            { text: '如何系统化积累游戏开发经验', link: '/01-methodology/07' }
          ]
        },
        {
          text: '2. 游戏类型与问题模型',
          collapsed: true,
          items: [
            { text: '游戏类型与问题模型', link: '/02-models/' },
            { text: '常见玩法类型概览', link: '/02-models/00' },
            { text: '游戏类型的分类方法', link: '/02-models/01' },
            { text: '单局房间型游戏问题模型', link: '/02-models/02' },
            { text: '强实时对战型游戏问题模型', link: '/02-models/03' },
            { text: '持续在线世界型游戏问题模型', link: '/02-models/04' },
            { text: '长周期成长与异步交互型游戏问题模型', link: '/02-models/05' },
            { text: '经济与平台型游戏问题模型', link: '/02-models/06' },
            { text: '高频对象与重表现型游戏问题模型', link: '/02-models/07' },
            { text: '模型之间如何组合', link: '/02-models/08' }
          ]
        },
        {
          text: '3. 网络与接入协议',
          collapsed: true,
          items: [
            { text: '网络与接入协议', link: '/03-network/' },
            { text: '游戏网络基础', link: '/03-network/01' },
            { text: 'I/O 模型与事件通知机制', link: '/03-network/02' },
            { text: '传输层与接入协议选择', link: '/03-network/03' },
            { text: '数据帧与协议契约', link: '/03-network/04' },
            { text: '消息模式与事件分发', link: '/03-network/05' },
            { text: '可靠性、顺序与兼容性', link: '/03-network/06' },
            { text: '房间广播、弱网与国内网络环境', link: '/03-network/07' }
          ]
        },
        {
          text: '4. 同步、战斗与实时交互',
          collapsed: true,
          items: [
            { text: '同步、战斗与实时交互', link: '/04-sync-combat/' },
            { text: 'Tick 与时间推进', link: '/04-sync-combat/01' },
            { text: '同步模型', link: '/04-sync-combat/02' },
            { text: '帧同步详解', link: '/04-sync-combat/03' },
            { text: '暂停、继续、追帧与断线重连', link: '/04-sync-combat/04' },
            { text: '预测、补偿与纠正', link: '/04-sync-combat/05' },
            { text: '确定性与数值一致性', link: '/04-sync-combat/06' },
            { text: '回放、观战与裁决', link: '/04-sync-combat/07' },
            { text: '技能系统设计', link: '/04-sync-combat/08' }
          ]
        },
        {
          text: '5. 执行模型与运行时',
          collapsed: true,
          items: [
            { text: '执行模型与运行时', link: '/05-concurrency-runtime/' },
            { text: '并发模型总览：从七周七并发到游戏运行时', link: '/05-concurrency-runtime/00' },
            { text: '单线程、多线程与 Actor', link: '/05-concurrency-runtime/01' },
            { text: '协程、状态机与任务队列', link: '/05-concurrency-runtime/02' },
            { text: 'Tick 驱动与逻辑执行', link: '/05-concurrency-runtime/03' },
            { text: '流控、背压与稳定性机制', link: '/05-concurrency-runtime/04' },
            { text: '锁竞争与性能代价', link: '/05-concurrency-runtime/05' },
            { text: 'Epoch-driven Actor / Channel Runtime', link: '/05-concurrency-runtime/06' }
          ]
        },
        {
          text: '6. 服务拆分、分布式与控制平面',
          collapsed: true,
          items: [
            { text: '服务拆分与控制平面', link: '/06-services-control-plane/' },
            { text: '服务拆分方法论', link: '/06-services-control-plane/01' },
            { text: '核心服务角色', link: '/06-services-control-plane/02' },
            { text: '协调层、跨服与控制平面', link: '/06-services-control-plane/03' },
            { text: '服务发现、路由与协作', link: '/06-services-control-plane/04' },
            { text: '一致性、恢复与重连', link: '/06-services-control-plane/05' }
          ]
        },
        {
          text: '7. 消息系统与进程间通信',
          collapsed: true,
          items: [
            { text: '消息系统与进程间通信', link: '/07-ipc-messaging/' },
            { text: 'IPC 基础与场景边界', link: '/07-ipc-messaging/01' },
            { text: '通信模式', link: '/07-ipc-messaging/02' },
            { text: '主链路与外围链路差异', link: '/07-ipc-messaging/03' },
            { text: '低延迟与高吞吐取舍', link: '/07-ipc-messaging/04' },
            { text: '消息语义、幂等与顺序', link: '/07-ipc-messaging/05' },
            { text: '如何选通信方案', link: '/07-ipc-messaging/06' }
          ]
        },
        {
          text: '8. 客户端架构与引擎体系',
          collapsed: true,
          items: [
            { text: '客户端架构与引擎体系', link: '/10-client-engine-runtime/' },
            { text: '客户端技术栈与引擎', link: '/10-client-engine-runtime/01' },
            { text: '前后端边界与网络层', link: '/10-client-engine-runtime/02' },
            { text: '资源系统与工具链', link: '/10-client-engine-runtime/03' },
            { text: '脚本语言与 ECS', link: '/10-client-engine-runtime/04' },
            { text: 'AI 在客户端与游戏系统中的应用场景', link: '/10-client-engine-runtime/05' }
          ]
        },
        {
          text: '9. 脚本、热更新与逻辑扩展',
          collapsed: true,
          items: [
            { text: '脚本、热更新与逻辑扩展', link: '/11-scripting-hotfix/' },
            { text: '脚本层定位与语言选择', link: '/11-scripting-hotfix/01' },
            { text: '宿主运行时与脚本 VM 集成', link: '/11-scripting-hotfix/02' },
            { text: '配置驱动与脚本驱动', link: '/11-scripting-hotfix/03' },
            { text: '热更新体系', link: '/11-scripting-hotfix/04' }
          ]
        },
        {
          text: '10. 版本发布、配置与研发管线',
          collapsed: true,
          items: [
            { text: '版本发布与研发管线', link: '/12-versioning-release/' },
            { text: '版本体系总览', link: '/12-versioning-release/01' },
            { text: '客户端、资源、配置与协议版本', link: '/12-versioning-release/02' },
            { text: '灰度、回滚与兼容窗口', link: '/12-versioning-release/03' },
            { text: '前后端协同与平台约束', link: '/12-versioning-release/04' },
            { text: '配置表与数据驱动管线', link: '/12-versioning-release/05' },
            { text: '研发协作与发布工作流', link: '/12-versioning-release/06' }
          ]
        },
        {
          text: '11. 数据建模与数据库',
          collapsed: true,
          items: [
            { text: '数据建模与数据库', link: '/13-data-database/' },
            { text: '游戏数据分类与建模', link: '/13-data-database/01' },
            { text: '关系型与非关系型数据库', link: '/13-data-database/02' },
            { text: '事务、一致性与分库分表', link: '/13-data-database/03' },
            { text: '数据同步、冷热分层与归档', link: '/13-data-database/04' }
          ]
        },
        {
          text: '12. 缓存、中间件与基础设施',
          collapsed: true,
          items: [
            { text: '缓存、中间件与基础设施', link: '/14-cache-middleware/' },
            { text: 'Redis、排行榜与锁', link: '/14-cache-middleware/01' },
            { text: 'singleflight、MQ 与事件流', link: '/14-cache-middleware/02' },
            { text: '注册中心、负载均衡与一致性哈希', link: '/14-cache-middleware/03' },
            { text: '对象存储、CDN 与资源分发', link: '/14-cache-middleware/04' }
          ]
        },
        {
          text: '13. 通用游戏服务',
          collapsed: true,
          items: [
            { text: '通用游戏服务', link: '/15-common-services/' },
            { text: '账号、角色与基础系统', link: '/15-common-services/01' },
            { text: '活动、排行、匹配与社交', link: '/15-common-services/02' },
            { text: '交易、支付与经济系统', link: '/15-common-services/03' },
            { text: '风控、审计、GM 与客服', link: '/15-common-services/04' }
          ]
        },
        {
          text: '14. 运营、商业化与数据分析',
          collapsed: true,
          items: [
            { text: '运营、商业化与数据分析', link: '/16-operations-bi/' },
            { text: '运营与商业化基础', link: '/16-operations-bi/01' },
            { text: '埋点、BI 与分析系统', link: '/16-operations-bi/02' },
            { text: '经济、平衡与风控分析', link: '/16-operations-bi/03' },
            { text: '触达体系与外部能力接入', link: '/16-operations-bi/04' },
            { text: 'AI 在运营、分析与风控中的应用', link: '/16-operations-bi/05' }
          ]
        },
        {
          text: '15. 平台生态、渠道与 SDK',
          collapsed: true,
          items: [
            { text: '平台生态、渠道与 SDK', link: '/21-platforms-sdks/' },
            { text: '平台与渠道生态', link: '/21-platforms-sdks/01' },
            { text: '小游戏平台与技术约束', link: '/21-platforms-sdks/02' },
            { text: '登录、支付、社交与广告 SDK', link: '/21-platforms-sdks/03' },
            { text: '发布、版本与商业模式', link: '/21-platforms-sdks/04' }
          ]
        },
        {
          text: '16. 可观测性、性能、容量与稳定性',
          collapsed: true,
          items: [
            { text: '可观测性与稳定性', link: '/18-observability-debugging/' },
            { text: '日志、指标、Tracing 与 OTel', link: '/18-observability-debugging/01' },
            { text: '专项可观测与 Tick 指标', link: '/18-observability-debugging/02' },
            { text: 'Profiling、火焰图与热点分析', link: '/18-observability-debugging/03' },
            { text: 'Debug、故障定位与复盘', link: '/18-observability-debugging/04' },
            { text: '压测、容量规划与扩缩容', link: '/18-observability-debugging/05' },
            { text: '稳定性治理的真正目标', link: '/18-observability-debugging/06' }
          ]
        },
        {
          text: '17. 安全、风控与合规',
          collapsed: true,
          items: [
            { text: '安全、风控与合规', link: '/20-security-compliance/' },
            { text: '安全与反作弊', link: '/20-security-compliance/01' },
            { text: '审计、隐私与数据安全', link: '/20-security-compliance/02' },
            { text: '行为风控与治理体系', link: '/20-security-compliance/03' },
            { text: '合规、版号与平台约束', link: '/20-security-compliance/04' },
            { text: '许可风险与依赖治理', link: '/20-security-compliance/05' }
          ]
        },
        {
          text: '18. 选型、实践、复盘与清单',
          collapsed: true,
          items: [
            { text: '选型、实践与复盘', link: '/23-practice-retrospective/' },
            { text: '引擎、语言与技术选型', link: '/23-practice-retrospective/01' },
            { text: '架构模式与选型对照', link: '/23-practice-retrospective/02' },
            { text: '关键问题清单', link: '/23-practice-retrospective/03' },
            { text: '分析框架、误区与失败案例', link: '/23-practice-retrospective/04' },
            { text: '个人查漏补缺清单', link: '/23-practice-retrospective/05' }
          ]
        },
        {
          text: '附录与横向索引',
          collapsed: true,
          items: [
            { text: '附录与横向索引', link: '/90-appendix/' },
            { text: '按品类回看问题', link: '/90-appendix/01' },
            { text: '对主线做专题展开', link: '/90-appendix/02' },
            { text: '做横向选型与快速对照', link: '/90-appendix/03' },
            { text: '如何使用附录', link: '/90-appendix/04' }
          ]
        },
        {
          text: '附录 A1. 游戏类型专题',
          collapsed: true,
          items: [
            { text: '游戏类型专题', link: '/08-game-genres/' },
            { text: '房间制与轻量在线', link: '/08-game-genres/01' },
            { text: '强实时对战', link: '/08-game-genres/02' },
            { text: '持续在线世界', link: '/08-game-genres/03' },
            { text: '长周期成长与经营', link: '/08-game-genres/04' },
            { text: '平台与生态型游戏', link: '/08-game-genres/05' },
            { text: '如何使用这页', link: '/08-game-genres/06' }
          ]
        },
        {
          text: '附录 A2. 按问题域归纳各类游戏',
          collapsed: true,
          items: [
            { text: '按问题域归纳各类游戏', link: '/09-problem-domain/' },
            { text: '单局房间型架构', link: '/09-problem-domain/01' },
            { text: '强实时对战型架构', link: '/09-problem-domain/02' },
            { text: '持续在线世界型架构', link: '/09-problem-domain/03' },
            { text: '长周期成长型架构', link: '/09-problem-domain/04' },
            { text: '经济平台型架构', link: '/09-problem-domain/05' },
            { text: '这页的用途', link: '/09-problem-domain/06' }
          ]
        },
        {
          text: '附录 A3. 配置表、数据驱动与研发协作',
          collapsed: true,
          items: [
            { text: '配置管线与研发协作', link: '/17-config-pipeline/' },
            { text: '配置表驱动开发', link: '/17-config-pipeline/01' },
            { text: '表结构设计与拆分', link: '/17-config-pipeline/02' },
            { text: '校验、导出与代码生成', link: '/17-config-pipeline/03' },
            { text: '工作流、事故防呆与协作', link: '/17-config-pipeline/04' }
          ]
        },
        {
          text: '附录 A4. 压测、容量规划与扩缩容',
          collapsed: true,
          items: [
            { text: '容量扩缩', link: '/19-capacity-scaling/' },
            { text: '压测与容量规划', link: '/19-capacity-scaling/01' },
            { text: '扩容、缩容与动态加服', link: '/19-capacity-scaling/02' },
            { text: '分区、迁移、合服与下线', link: '/19-capacity-scaling/03' },
            { text: '平台化运维与多地域架构', link: '/19-capacity-scaling/04' }
          ]
        },
        {
          text: '附录 A5. 引擎选择、语言地图与工具生态',
          collapsed: true,
          items: [
            { text: '引擎、语言与工具生态', link: '/22-engine-language-tooling/' },
            { text: '引擎选择与商业模式', link: '/22-engine-language-tooling/01' },
            { text: '编程语言与技术栈地图', link: '/22-engine-language-tooling/02' },
            { text: '团队能力、项目类型与工具生态', link: '/22-engine-language-tooling/03' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cuihairu/hello-game' }
    ],

    footer: {
      message: '游戏后端知识体系',
      copyright: '© 2025 cuihairu'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  },

  markdown: {
    lineNumbers: false
  }
})
