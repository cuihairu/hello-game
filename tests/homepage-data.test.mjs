import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../docs/.vitepress/config.mjs'
import {
  allLinks,
  buildKbChapters,
  buildTutorialGroups,
  chunk3,
  countLectures,
  homepageStats
} from '../docs/.vitepress/theme/data/homepage.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// VitePress cleanUrls 规则：'/xx/yy' → docs/xx/yy.md；'/xx/' → docs/xx/index.md
function linkToFile(link) {
  const rel = link.replace(/^\/hello-game/, '').replace(/^\//, '')
  if (rel === '' || rel.endsWith('/')) {
    return resolve(root, 'docs', rel, 'index.md')
  }
  return resolve(root, 'docs', `${rel}.md`)
}

// ---- 合成最小 sidebar：专门喂边界分支（空条目组 / 无编号条目 / 编号回退） ----

const syntheticTutorial = [
  { text: '🔵 入门', items: [{ text: '01 全景', link: '/t/01' }] },
  { text: '📌 选型对照', link: '/t/', items: [] },
  { text: '无条目组' },
  { text: '扩展', items: [{ text: '章节扩展规划', link: '/t/expansion' }] }
]

const syntheticKb = [
  { text: '导读', items: [{ text: '如何阅读', link: '/k/guide' }] },
  { text: '1. 总论与方法论', items: [{ text: '总论', link: '/k/01/' }] },
  { text: '附录 A1. 游戏类型专题', items: [{ text: '游戏类型专题', link: '/k/a1/' }] },
  { text: '附录与横向索引', items: [{ text: '附录总览', link: '/k/ax/' }] },
  { text: '没有条目的组' },
  { text: '无编号组', items: [{ text: '某章', link: '/k/x/' }] }
]

describe('homepage 数据层（合成边界用例）', () => {
  it('allLinks：组级链接与条目链接都收，缺 items 不炸', () => {
    expect(allLinks(syntheticTutorial)).toEqual(['/t/01', '/t/', '/t/expansion'])
    expect(allLinks([{ text: '空' }])).toEqual([])
  })

  it('buildTutorialGroups：剥 emoji、取两位编号、无编号回退 +', () => {
    const groups = buildTutorialGroups(syntheticTutorial)
    expect(groups.map(g => g.text)).toEqual(['入门', '选型对照', '无条目组', '扩展'])
    expect(groups[0].items).toEqual([{ num: '01', title: '全景', link: '/t/01' }])
    expect(groups[1].link).toBe('/t/')
    expect(groups[1].items).toEqual([])
    expect(groups[2].items).toEqual([])
    // 「章节扩展规划」无两位数字编号 → 回退 '+'
    expect(groups[3].items).toEqual([{ num: '+', title: '章节扩展规划', link: '/t/expansion' }])
    expect(groups[3].link).toBeNull()
  })

  it('buildKbChapters：特殊编号映射、标题取号、空组过滤、无编号回退', () => {
    const chapters = buildKbChapters(syntheticKb)
    expect(chapters.map(c => c.num)).toEqual(['00', '1', 'A1', 'A', '+'])
    expect(chapters.map(c => c.title)).toEqual(['如何阅读', '总论', '游戏类型专题', '附录总览', '某章'])
    // 「没有条目的组」被整体过滤
    expect(chapters.some(c => c.title === '没有条目的组')).toBe(false)
  })

  it('countLectures：锚定正则不误命中「24-」目录前缀与扩展页', () => {
    // 回归口径：裸 /\/\d{2}-/ 会把「/24-」当讲次——扩展页与目录本身都不得计数
    const groups = [{
      text: 'g',
      items: [
        { text: 'a', link: '/24-game-types-architecture/expansion' },
        { text: 'b', link: '/24-game-types-architecture/19-client-architecture' },
        { text: 'c', link: '/other/01-x' }
      ]
    }]
    expect(countLectures(groups)).toBe(1)
    expect(countLectures([{ text: '空' }])).toBe(0)
  })

  it('chunk3：均分三栏、余量落末栏、空列表返回三份空数组', () => {
    const five = [1, 2, 3, 4, 5]
    const chunks = chunk3(five)
    expect(chunks.map(c => c.length)).toEqual([2, 2, 1])
    expect(chunks.flat()).toEqual(five)
    expect(chunk3([])).toEqual([[], [], []])
  })

  it('homepageStats：四个统计口径各自成立', () => {
    const stats = homepageStats(syntheticTutorial, syntheticKb)
    // 合成教程里 0 讲（链接都不带讲次前缀）
    expect(stats.lectureCount).toBe(0)
    expect(stats.kbChapterCount).toBe(1) // 仅「1. 总论与方法论」
    expect(stats.appendixCount).toBe(1) // 仅「附录 A1.」
    expect(stats.pageCount).toBe(
      allLinks(syntheticTutorial).length + allLinks(syntheticKb).length
    )
  })
})

describe('homepage 数据层（真实 config 集成）', () => {
  const tutorial = config.themeConfig.sidebar['/24-game-types-architecture/']
  const kb = config.themeConfig.sidebar['/']

  it('教程目录与讲次计数：21 讲、链接全部对应真实文件', () => {
    const groups = buildTutorialGroups(tutorial)
    expect(groups).toHaveLength(tutorial.length)
    // 首组是选型对照总览（组级链接、无条目）；扩展组标题剥 emoji 后为「扩展」
    expect(groups[0].text).toBe('游戏类型与架构选型对照')
    expect(groups[0].link).toBe('/24-game-types-architecture/')
    expect(groups.at(-1).text).toBe('扩展')
    expect(countLectures(tutorial)).toBe(21)
    for (const link of allLinks(tutorial)) {
      expect(existsSync(linkToFile(link)), `缺失文件: ${link}`).toBe(true)
    }
  })

  it('知识库目录：20 章 + 5 附录，章级链接全部对应真实文件', () => {
    const chapters = buildKbChapters(kb)
    expect(chapters[0]).toEqual({ num: '00', title: '如何阅读这套知识库', link: '/00-reading-guide/' })
    expect(homepageStats(tutorial, kb).kbChapterCount).toBe(20)
    expect(homepageStats(tutorial, kb).appendixCount).toBe(5)
    // 附录编号从分组标题取「A1」…「A5」
    const appendixNums = chapters.filter(c => /^A\d/.test(c.num)).map(c => c.num)
    expect(appendixNums).toEqual(['A1', 'A2', 'A3', 'A4', 'A5'])
    for (const ch of chapters) {
      expect(existsSync(linkToFile(ch.link)), `缺失文件: ${ch.link}`).toBe(true)
    }
  })

  it('三栏拆分：拼接无损且与章级入口一一对应', () => {
    const chapters = buildKbChapters(kb)
    const chunks = chunk3(chapters)
    expect(chunks).toHaveLength(3)
    expect(chunks.flat()).toEqual(chapters)
  })

  it('首页统计：页数为两端链接之和，且各计数为正', () => {
    const stats = homepageStats(tutorial, kb)
    expect(stats.lectureCount).toBe(21)
    expect(stats.pageCount).toBe(allLinks(tutorial).length + allLinks(kb).length)
    expect(stats.pageCount).toBeGreaterThan(80)
  })
})
