import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../docs/.vitepress/config.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
    expect(config.title).toBe('游戏知识体系')
    expect(config.description).toBe(
      '开源的、面向个人开发者的游戏开发知识图谱——覆盖设计、客户端、服务器、数值、美术、工具与运营，用成熟商业游戏与成熟开源项目连接知识节点'
    )
    expect(config.lang).toBe('zh-CN')
    expect(config.base).toBe('/hello-game/')
    expect(config.cleanUrls).toBe(true)
    expect(config.markdown).toEqual({ lineNumbers: false })
  })

  it('head 声明 favicon', () => {
    expect(config.head).toEqual([
      ['link', { rel: 'icon', href: '/hello-game/logo.svg' }]
    ])
  })

  it('导航含 10 项且无站外文字链接（GitHub 去重走 socialLinks 图标）', () => {
    expect(config.themeConfig.nav).toHaveLength(10)
    const external = config.themeConfig.nav.filter(n => n.link.startsWith('http'))
    expect(external).toHaveLength(0)
  })

  it('知识图谱新树入口', () => {
    expect(Object.keys(config.themeConfig.sidebar)).toEqual([
      '/24-game-types-architecture/',
      '/server/',
      '/system/',
      '/database/',
      '/networking/',
      '/'
    ])
    for (const key of ['/server/', '/system/',
      '/database/', '/networking/']) {
      const links = collectLinks(config.themeConfig.sidebar[key])
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
      }
    }
  })

  it('教程 sidebar 覆盖 21 讲且每个链接对应真实文件', () => {
    const tutorial = config.themeConfig.sidebar['/24-game-types-architecture/']
    const links = collectLinks(tutorial)
    // 精确锚定目录前缀：/\d{2}- 会误命中「24-game-types-architecture」的「24-」
    const lectures = links.filter(l => /^\/24-game-types-architecture\/\d{2}-/.test(l))
    expect(lectures).toHaveLength(21)
    for (const link of collectLinks(tutorial)) {
      expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
    }
  })

  it('知识库 sidebar 全部链接对应真实文件', () => {
    const kb = config.themeConfig.sidebar['/']
    const links = collectLinks(kb)
    expect(links.length).toBeGreaterThan(80)
    const missing = links.filter(l => !existsSync(linkToFile(l)))
    expect(missing, `缺失文件: ${missing.join(', ')}`).toEqual([])
  })

  it('知识库 sidebar 分组的 collapsed 形态：导读全展开、其余折叠', () => {
    const kb = config.themeConfig.sidebar['/']
    const groups = kb.filter(g => g.items)
    expect(groups[0].collapsed).toBe(false)
    for (const g of groups.slice(1)) {
      expect(g.collapsed, `分组「${g.text}」应为 collapsed: true`).toBe(true)
    }
  })

  it('本地搜索与中文界面文案', () => {
    expect(config.themeConfig.search.provider).toBe('local')
    expect(config.themeConfig.search.options.translations.button.buttonText).toBe('搜索文档')
    expect(config.themeConfig.outline).toEqual({ label: '页面导航', level: [2, 3] })
    expect(config.themeConfig.docFooter).toEqual({ prev: '上一篇', next: '下一篇' })
    expect(config.themeConfig.lastUpdated).toEqual({ text: '最后更新' })
    expect(config.themeConfig.returnToTopLabel).toBe('回到顶部')
    expect(config.themeConfig.sidebarMenuLabel).toBe('菜单')
    expect(config.themeConfig.darkModeSwitchLabel).toBe('外观')
    expect(config.themeConfig.lightModeSwitchTitle).toBe('切换到浅色模式')
    expect(config.themeConfig.darkModeSwitchTitle).toBe('切换到深色模式')
  })

  it('页脚与社交链接', () => {
    expect(config.themeConfig.footer).toEqual({
      message: '游戏知识体系',
      copyright: '© 2025 cuihairu'
    })
    expect(config.themeConfig.socialLinks).toEqual([
      { icon: 'github', link: 'https://github.com/cuihairu/hello-game' }
    ])
  })
})
