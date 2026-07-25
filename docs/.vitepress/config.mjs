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
      { text: 'GitHub', link: 'https://github.com/cuihairu/hello-game' }
    ],

    sidebar: [
      {
        text: '🟢 入门',
        collapsed: false,
        items: [
          { text: '01 游戏与技术的关系', link: '/24-game-types-architecture/01-entry' }
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
          { text: '04 网络通信与同步', link: '/24-game-types-architecture/04-network' },
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
          { text: '09 编程模式', link: '/24-game-types-architecture/09-programming-patterns' },
          { text: '10 玩法系统设计', link: '/24-game-types-architecture/10-gameplay-systems' },
          { text: '11 辅助系统设计', link: '/24-game-types-architecture/11-auxiliary-systems' }
        ]
      },
      {
        text: '🟠 运营',
        collapsed: false,
        items: [
          { text: '12 数据分析', link: '/24-game-types-architecture/12-data-analytics' },
          { text: '13 运维与监控', link: '/24-game-types-architecture/13-tech-ops' },
          { text: '14 开发管理', link: '/24-game-types-architecture/14-dev-organization' }
        ]
      },
      {
        text: '🔴 专题',
        collapsed: false,
        items: [
          { text: '15 书籍与案例', link: '/24-game-types-architecture/15-references' },
          { text: '16 脚本与热更新', link: '/24-game-types-architecture/16-scripting-hotfix' },
          { text: '17 版本与发布', link: '/24-game-types-architecture/17-versioning-release' },
          { text: '18 安全与合规', link: '/24-game-types-architecture/18-security-compliance' }
        ]
      }
    ],

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
