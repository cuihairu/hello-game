import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../docs/.vitepress/config.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 官方 locales：root=英文外壳，zh=全量中文站。断言口径以中文站的 themeConfig 为准。
const { root: en, zh } = config.locales
const theme = zh.themeConfig

function collectLinks(sidebar) {
  const links = []
  for (const group of sidebar) {
    for (const item of group.items ?? []) {
      if (item.link) links.push(item.link)
    }
  }
  return links
}

// VitePress cleanUrls 规则：'/xx/yy' → docs/xx/yy.md；'/xx/' → docs/xx/index.md
function linkToFile(link) {
  const rel = link.replace(/^\/hello-game/, '').replace(/^\//, '')
  if (rel === '' || rel.endsWith('/')) {
    return resolve(root, 'docs', rel, 'index.md')
  }
  return resolve(root, 'docs', `${rel}.md`)
}

describe('site config', () => {
  it('基础站点元信息', () => {
    expect(config.title).toBe('游戏开发笔记')
    expect(config.description).toBe(
      '面向个人开发者整理的游戏开发笔记与经验，覆盖设计、客户端、服务器、数值、美术、工具与运营，并以商业游戏、开源项目和官方资料为参照'
    )
    expect(config.base).toBe('/hello-game/')
    expect(config.cleanUrls).toBe(true)
    expect(config.markdown).toEqual({ lineNumbers: false })
  })

  it('官方 locales 形态：root=English/en-US、zh=简体中文/zh-CN 且带 link', () => {
    expect(Object.keys(config.locales)).toEqual(['root', 'zh'])
    expect(en).toMatchObject({ label: 'English', lang: 'en-US' })
    expect(zh).toMatchObject({ label: '简体中文', lang: 'zh-CN', link: '/zh/' })
    // 英文外壳站点元信息为真英文，不复制中文
    expect(en.title).toBe('Game Dev Notes')
    expect(zh.title).toBe('游戏开发笔记')
    // 各语言各配自己的 themeConfig 与侧栏
    expect(en.themeConfig).toBeDefined()
    expect(theme).toBeDefined()
  })

  it('英文外壳 nav 与 sidebar 只有入口，内容全部指向中文站', () => {
    expect(en.themeConfig.nav).toEqual([
      { text: 'Home', link: '/' },
      { text: '中文版', link: '/zh/' }
    ])
    // 英文外壳侧栏条目为组级链接（无 items），直接取组级 link
    const links = en.themeConfig.sidebar['/'].map(g => g.link)
    expect(links).toEqual(['/', '/zh/'])
    for (const link of links) {
      expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
    }
  })

  it('head 声明 favicon', () => {
    expect(config.head).toEqual([
      ['link', { rel: 'icon', href: '/hello-game/logo.svg' }]
    ])
  })

  it('导航含 10 项且无站外文字链接（GitHub 去重走 socialLinks 图标）', () => {
    expect(theme.nav).toHaveLength(10)
    const external = theme.nav.filter(n => n.link.startsWith('http'))
    expect(external).toHaveLength(0)
  })

  it('知识图谱新树入口', () => {
    expect(Object.keys(theme.sidebar)).toEqual([
      '/zh/24-game-types-architecture/',
      '/zh/server/',
      '/zh/system/',
      '/zh/database/',
      '/zh/client/',
      '/zh/production/',
      '/zh/operation/',
      '/zh/industry/',
      '/zh/design/',
      '/zh/numerical/',
      '/zh/glossary/',
      '/zh/networking/',
      '/zh/'
    ])
    for (const key of ['/zh/server/', '/zh/system/',
      '/zh/database/',
      '/zh/client/',
      '/zh/production/',
      '/zh/operation/',
      '/zh/industry/',
      '/zh/design/',
      '/zh/numerical/',
      '/zh/glossary/', '/zh/networking/']) {
      const links = collectLinks(theme.sidebar[key])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
      }
    }
  })

  it('专题 sidebar 覆盖全部编号篇目且每个链接对应真实文件', () => {
    const tutorial = theme.sidebar['/zh/24-game-types-architecture/']
    const links = collectLinks(tutorial)
    // 精确锚定目录前缀：/\d{2}- 会误命中「24-game-types-architecture」的「24-」
    const lectures = links.filter(l => /^\/zh\/24-game-types-architecture\/\d{2}-/.test(l))
    expect(lectures).toHaveLength(27)
    for (const link of collectLinks(tutorial)) {
      expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
    }
  })

  it('知识库 sidebar 全部链接对应真实文件', () => {
    const kb = theme.sidebar['/zh/']
    const links = collectLinks(kb)
    expect(links.length).toBeGreaterThan(80)
    const missing = links.filter(l => !existsSync(linkToFile(l)))
    expect(missing, `缺失文件: ${missing.join(', ')}`).toEqual([])
  })

  it('知识库 sidebar 分组的 collapsed 形态：导读全展开、其余折叠', () => {
    const kb = theme.sidebar['/zh/']
    const groups = kb.filter(g => g.items)
    expect(groups[0].collapsed).toBe(false)
    for (const g of groups.slice(1)) {
      expect(g.collapsed, `分组「${g.text}」应为 collapsed: true`).toBe(true)
    }
  })

  it('本地搜索与中文界面文案', () => {
    expect(theme.search.provider).toBe('local')
    expect(theme.search.options.translations.button.buttonText).toBe('搜索文档')
    expect(theme.outline).toEqual({ label: '页面导航', level: [2, 3] })
    expect(theme.docFooter).toEqual({ prev: '上一篇', next: '下一篇' })
    expect(theme.lastUpdated).toEqual({ text: '最后更新' })
    expect(theme.returnToTopLabel).toBe('回到顶部')
    expect(theme.sidebarMenuLabel).toBe('菜单')
    expect(theme.darkModeSwitchLabel).toBe('外观')
    expect(theme.lightModeSwitchTitle).toBe('切换到浅色模式')
    expect(theme.darkModeSwitchTitle).toBe('切换到深色模式')
  })

  it('页脚与社交链接', () => {
    expect(theme.footer).toEqual({
      message: '游戏知识体系',
      copyright: '© 2025 cuihairu'
    })
    expect(theme.socialLinks).toEqual([
      { icon: 'github', link: 'https://github.com/cuihairu/hello-game' }
    ])
  })
})
