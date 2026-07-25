import { defineConfig } from "vitepress"
export default defineConfig({
  title: '游戏开发系统化知识地图',
  description: '围绕游戏项目里的真实问题组织的知识体系',
  lang: 'zh-CN',
  base: '/hello-game/',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/hello-game/favicon.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '游戏开发知识地图',

    nav: [
      { text: '首页', link: '/' },
      { text: '总论', link: '/01-methodology/' },
      { text: '问题模型', link: '/02-models/' },
      { text: '网络', link: '/03-network/' },
      { text: '同步与战斗', link: '/04-sync-combat/' },
      { text: '运行时', link: '/05-concurrency-runtime/' },
      { text: '服务', link: '/06-services-control-plane/' },
      { text: '客户端', link: '/10-client-engine-runtime/' },
      { text: '附录', link: '/90-appendix/' }
    ],

    sidebar: [
      {
        text: '1. 总论与方法论',
        collapsed: false,
        items: [
          { text: '概述', link: '/01-methodology/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/02-models/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/03-network/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/04-sync-combat/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/05-concurrency-runtime/' },
          { text: '并发模型总览', link: '/05-concurrency-runtime/00' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/06-services-control-plane/' },
          { text: '服务拆分方法论', link: '/06-services-control-plane/01' },
          { text: '核心服务角色', link: '/06-services-control-plane/02' },
          { text: '协调层、跨服与控制平面', link: '/06-services-control-plane/03' },
          { text: '服务发现、路由与协作', link: '/06-services-control-plane/04' },
          { text: '一致性、恢复与重连', link: '/06-services-control-plane/05' }
        ]
      },
      {
        text: '7. 消息系统与进程间通信',
        collapsed: false,
        items: [
          { text: '概述', link: '/07-ipc-messaging/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/10-client-engine-runtime/' },
          { text: '客户端技术栈与引擎', link: '/10-client-engine-runtime/01' },
          { text: '前后端边界与网络层', link: '/10-client-engine-runtime/02' },
          { text: '资源系统与工具链', link: '/10-client-engine-runtime/03' },
          { text: '脚本语言与 ECS', link: '/10-client-engine-runtime/04' },
          { text: 'AI 在客户端与游戏系统中的应用', link: '/10-client-engine-runtime/05' }
        ]
      },
      {
        text: '9. 脚本、热更新与逻辑扩展',
        collapsed: false,
        items: [
          { text: '概述', link: '/11-scripting-hotfix/' },
          { text: '脚本层定位与语言选择', link: '/11-scripting-hotfix/01' },
          { text: '宿主运行时与脚本 VM 集成', link: '/11-scripting-hotfix/02' },
          { text: '配置驱动与脚本驱动', link: '/11-scripting-hotfix/03' },
          { text: '热更新体系', link: '/11-scripting-hotfix/04' }
        ]
      },
      {
        text: '10. 版本发布、配置与研发管线',
        collapsed: false,
        items: [
          { text: '概述', link: '/12-versioning-release/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/13-data-database/' },
          { text: '游戏数据分类与建模', link: '/13-data-database/01' },
          { text: '关系型与非关系型数据库', link: '/13-data-database/02' },
          { text: '事务、一致性与分库分表', link: '/13-data-database/03' },
          { text: '数据同步、冷热分层与归档', link: '/13-data-database/04' }
        ]
      },
      {
        text: '12. 缓存、中间件与基础设施',
        collapsed: false,
        items: [
          { text: '概述', link: '/14-cache-middleware/' },
          { text: 'Redis、排行榜与锁', link: '/14-cache-middleware/01' },
          { text: 'singleflight、MQ 与事件流', link: '/14-cache-middleware/02' },
          { text: '注册中心、负载均衡与一致性哈希', link: '/14-cache-middleware/03' },
          { text: '对象存储、CDN 与资源分发', link: '/14-cache-middleware/04' }
        ]
      },
      {
        text: '13. 通用游戏服务',
        collapsed: false,
        items: [
          { text: '概述', link: '/15-common-services/' },
          { text: '账号、角色与基础系统', link: '/15-common-services/01' },
          { text: '活动、排行、匹配与社交', link: '/15-common-services/02' },
          { text: '交易、支付与经济系统', link: '/15-common-services/03' },
          { text: '风控、审计、GM 与客服', link: '/15-common-services/04' }
        ]
      },
      {
        text: '14. 运营、商业化与数据分析',
        collapsed: false,
        items: [
          { text: '概述', link: '/16-operations-bi/' },
          { text: '运营与商业化基础', link: '/16-operations-bi/01' },
          { text: '埋点、BI 与分析系统', link: '/16-operations-bi/02' },
          { text: '经济、平衡与风控分析', link: '/16-operations-bi/03' },
          { text: '触达体系与外部能力接入', link: '/16-operations-bi/04' },
          { text: 'AI 在运营、分析与风控中的应用', link: '/16-operations-bi/05' }
        ]
      },
      {
        text: '15. 平台生态、渠道与 SDK',
        collapsed: false,
        items: [
          { text: '概述', link: '/21-platforms-sdks/' },
          { text: '平台与渠道生态', link: '/21-platforms-sdks/01' },
          { text: '小游戏平台与技术约束', link: '/21-platforms-sdks/02' },
          { text: '登录、支付、社交与广告 SDK', link: '/21-platforms-sdks/03' },
          { text: '发布、版本与商业模式', link: '/21-platforms-sdks/04' }
        ]
      },
      {
        text: '16. 可观测性、性能、容量与稳定性',
        collapsed: false,
        items: [
          { text: '概述', link: '/18-observability-debugging/' },
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
        collapsed: false,
        items: [
          { text: '概述', link: '/20-security-compliance/' },
          { text: '安全与反作弊', link: '/20-security-compliance/01' },
          { text: '审计、隐私与数据安全', link: '/20-security-compliance/02' },
          { text: '行为风控与治理体系', link: '/20-security-compliance/03' },
          { text: '合规、版号与平台约束', link: '/20-security-compliance/04' },
          { text: '许可风险与依赖治理', link: '/20-security-compliance/05' }
        ]
      },
      {
        text: '18. 选型、实践、复盘与清单',
        collapsed: false,
        items: [
          { text: '概述', link: '/23-practice-retrospective/' },
          { text: '引擎、语言与技术选型', link: '/23-practice-retrospective/01' },
          { text: '架构模式与选型对照', link: '/23-practice-retrospective/02' },
          { text: '关键问题清单', link: '/23-practice-retrospective/03' },
          { text: '分析框架、误区与失败案例', link: '/23-practice-retrospective/04' },
          { text: '个人查漏补缺清单', link: '/23-practice-retrospective/05' }
        ]
      },
      {
        text: '附录',
        collapsed: false,
        items: [
          { text: '概述', link: '/90-appendix/' },
          { text: '按品类回看问题', link: '/90-appendix/01' },
          { text: '对主线做专题展开', link: '/90-appendix/02' },
          { text: '做横向选型与快速对照', link: '/90-appendix/03' },
          { text: '如何使用附录', link: '/90-appendix/04' }
        ]
      },
      {
        text: '阅读指南',
        collapsed: true,
        items: [
          { text: '如何阅读这套知识库', link: '/00-reading-guide/' },
          { text: '推荐阅读顺序', link: '/00-reading-guide/01' },
          { text: '按问题进入', link: '/00-reading-guide/02' },
          { text: '主线和附录的区别', link: '/00-reading-guide/03' },
          { text: '怎么用它做项目分析', link: '/00-reading-guide/04' }
        ]
      },
      {
        text: '术语约定',
        collapsed: true,
        items: [
          { text: '术语总览', link: '/00-terminology/' },
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
        text: '专题附录',
        collapsed: true,
        items: [
          { text: '游戏类型专题', link: '/08-game-genres/' },
          { text: '房间制与轻量在线', link: '/08-game-genres/01' },
          { text: '强实时对战', link: '/08-game-genres/02' },
          { text: '持续在线世界', link: '/08-game-genres/03' },
          { text: '长周期成长与经营', link: '/08-game-genres/04' },
          { text: '平台与生态型游戏', link: '/08-game-genres/05' },
          { text: '按问题域归纳', link: '/09-problem-domain/' },
          { text: '配置表专题', link: '/17-config-pipeline/' },
          { text: '压测与容量专题', link: '/19-capacity-scaling/' },
          { text: '引擎与语言专题', link: '/22-engine-language-tooling/' }
        ]
      },
      {
        text: '游戏后端知识体系',
        collapsed: false,
        items: [
          { text: '概述', link: '/24-game-types-architecture/' },
          { text: '01 入门：游戏与技术的关系', link: '/24-game-types-architecture/01-entry' },
          { text: '02 核心：数值与经济系统', link: '/24-game-types-architecture/02-game-design' },
          { text: '03 前端：游戏引擎与客户端基础', link: '/24-game-types-architecture/03-frontend-engines' },
          { text: '04 网络：通信、同步与联机基础', link: '/24-game-types-architecture/04-network' },
          { text: '05 并发模型：7种常见并发思路', link: '/24-game-types-architecture/05-concurrency-models' },
          { text: '06 常见框架：从最轻到最重', link: '/24-game-types-architecture/06-frameworks' },
          { text: '07 架构：游戏核心技术总览', link: '/24-game-types-architecture/07-core-arch' },
          { text: '08 数据存储与中间件', link: '/24-game-types-architecture/08-data-storage' },
          { text: '09 实现：游戏编程模式', link: '/24-game-types-architecture/09-programming-patterns' },
          { text: '10 实现：常见玩法系统设计', link: '/24-game-types-architecture/10-gameplay-systems' },
          { text: '11 实现：辅助系统设计', link: '/24-game-types-architecture/11-auxiliary-systems' },
          { text: '12 数据：游戏数据分析', link: '/24-game-types-architecture/12-data-analytics' },
          { text: '13 运维：基础设施与监控', link: '/24-game-types-architecture/13-tech-ops' },
          { text: '14 管理：开发体制与团队协作', link: '/24-game-types-architecture/14-dev-organization' },
          { text: '15 参考：书籍、案例与最佳实践', link: '/24-game-types-architecture/15-references' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cuihairu/hello-game' }
    ],

    footer: {
      message: '游戏开发系统化知识地图',
      copyright: '© 2025 cui'
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
