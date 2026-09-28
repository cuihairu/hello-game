import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'

import config from '../docs/.vitepress/config.mjs'
import GamesLibrary from '../docs/.vitepress/theme/components/GamesLibrary.vue'
import { allLinks, buildKbChapters, buildTutorialGroups } from '../docs/.vitepress/theme/data/homepage.mjs'
import { GAMES, GENRE_NAMES, ERAS, PLATFORMS, TAG_LINKS } from '../docs/.vitepress/theme/data/games.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 与 config.test.mjs 相同的 cleanUrls 文件映射
function linkToFile(link) {
  const rel = link.replace(/^\/hello-game/, '').replace(/^\//, '')
  if (rel === '' || rel.endsWith('/')) {
    return resolve(root, 'docs', rel, 'index.md')
  }
  return resolve(root, 'docs', `${rel}.md`)
}

const sidebarLinks = [
  ...allLinks(config.themeConfig.sidebar['/24-game-types-architecture/']),
  ...allLinks(config.themeConfig.sidebar['/'])
]

describe('核心路径冒烟（访客链路 × 静态配置断言）', () => {
  it('游戏库标签互链在站内导航可达——不止文件存在，还得在侧栏里', () => {
    expect(sidebarLinks.length).toBeGreaterThan(80)
    for (const [tag, link] of Object.entries(TAG_LINKS)) {
      expect(
        sidebarLinks.includes(link),
        `标签「${tag}」的互链 ${link} 文件存在但不在任何侧栏分组里（站内导航不可达）`
      ).toBe(true)
    }
  })

  it('首页模板 withBase 字面量路径全部对应真实文件', () => {
    const src = readFileSync(resolve(root, 'docs/index.md'), 'utf8')
    const hardcoded = [...src.matchAll(/withBase\('([^']+)'\)/g)].map(m => m[1])
    expect(hardcoded.length).toBeGreaterThanOrEqual(4)
    for (const path of hardcoded) {
      expect(existsSync(linkToFile(path)), `首页硬编码路径缺失: ${path}`).toBe(true)
    }
  })

  it('homepage 特殊编号映射与 config 分组闭合：导读 00、附录与横向索引 A', () => {
    const chapters = buildKbChapters(config.themeConfig.sidebar['/'])
    expect(chapters).toContainEqual({ num: '00', title: '如何阅读这套知识库', link: '/00-reading-guide/' })
    expect(chapters).toContainEqual({ num: 'A', title: '附录与横向索引', link: '/90-appendix/' })
  })

  it('教程分组标题剥 emoji 后全部非空（剥除逻辑失配时在此报警）', () => {
    const groups = buildTutorialGroups(config.themeConfig.sidebar['/24-game-types-architecture/'])
    for (const g of groups) {
      expect(g.text.trim().length, `分组「${g.text}」剥 emoji 后为空`).toBeGreaterThan(0)
      expect(g.text.startsWith(' ')).toBe(false)
    }
  })

  it('GamesLibrary 渲染选项与数据导出全等（数据契约 ↔ 组件渲染三方一致）', async () => {
    const wrapper = mount(GamesLibrary)
    const selects = wrapper.findAll('select')
    expect(selects).toHaveLength(4)
    const optionTexts = selects.map(s => s.findAll('option').map(o => o.text()))
    expect(optionTexts[0]).toEqual(GENRE_NAMES)
    expect(optionTexts[1]).toEqual(ERAS)
    expect(optionTexts[2]).toEqual(PLATFORMS)
    expect(optionTexts[3]).toEqual(['全部', ...Object.keys(TAG_LINKS)])
    // 选项可交互性抽查：选「MMORPG」后计数与数据实况一致
    const mmorpg = GAMES.filter(g => g.genres.includes('MMORPG')).length
    await selects[0].setValue('MMORPG')
    expect(wrapper.find('.lib-count').text()).toBe(`${mmorpg} 款`)
  })
})
