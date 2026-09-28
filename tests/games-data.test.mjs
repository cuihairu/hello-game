import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { GAMES, GENRES, GENRE_NAMES, ERAS, PLATFORMS, TAG_LINKS } from '../docs/.vitepress/theme/data/games.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 与 config.test.mjs 相同的 cleanUrls 文件映射
function linkToFile(link) {
  const rel = link.replace(/^\/hello-game/, '').replace(/^\//, '')
  if (rel === '' || rel.endsWith('/')) {
    return resolve(root, 'docs', rel, 'index.md')
  }
  return resolve(root, 'docs', `${rel}.md`)
}

const TECH_KEYS = ['server', 'sync', 'matchmaking', 'transport', 'storage', 'antiCheat', 'social']
const genreNames = GENRES.map(g => g.name)
const platformNames = PLATFORMS.filter(p => p !== '全部')

describe('游戏库数据契约', () => {
  it('条目数量在 15-25 之间且名称唯一', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(15)
    expect(GAMES.length).toBeLessThanOrEqual(25)
    const names = GAMES.map(g => g.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('每个条目结构完整：era 与首作年份一致、后端技术栏七项齐全', () => {
    for (const g of GAMES) {
      expect(Number.isInteger(g.firstYear), `${g.name} firstYear`).toBe(true)
      expect(g.era).toBe(`${Math.floor(g.firstYear / 10) * 10}s`)
      expect(ERAS).toContain(g.era)
      for (const key of TECH_KEYS) {
        expect(typeof g.tech[key], `${g.name}.${key}`).toBe('string')
        expect(g.tech[key].length, `${g.name}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('玩法、平台、技术标签全部受控', () => {
    for (const g of GAMES) {
      for (const genre of g.genres) expect(genreNames, `${g.name} 玩法 ${genre}`).toContain(genre)
      for (const p of g.platforms) expect(platformNames, `${g.name} 平台 ${p}`).toContain(p)
      for (const t of g.tags) expect(Object.keys(TAG_LINKS), `${g.name} 标签 ${t}`).toContain(t)
    }
  })

  it('技术标签互链全部指向真实存在的站内文件', () => {
    expect(Object.keys(TAG_LINKS).length).toBeGreaterThanOrEqual(10)
    for (const [tag, link] of Object.entries(TAG_LINKS)) {
      expect(existsSync(linkToFile(link)), `标签「${tag}」链接缺失: ${link}`).toBe(true)
    }
  })

  it('每个玩法类目至少有一款入库代表作', () => {
    for (const genre of GENRES) {
      expect(genre.desc.length).toBeGreaterThan(0)
      expect(genre.entries.length, `${genre.name} 代表作`).toBeGreaterThan(0)
      for (const name of genre.entries) {
        expect(GAMES.some(g => g.name === name), `${genre.name} 代表作「${name}」未入库`).toBe(true)
      }
    }
  })

  it('筛选选项与数据一致：每个条目都能被自己的维度选中', () => {
    expect(GENRE_NAMES[0]).toBe('全部')
    expect(ERAS[0]).toBe('全部')
    expect(PLATFORMS[0]).toBe('全部')
    for (const g of GAMES) {
      for (const genre of g.genres) expect(GENRE_NAMES).toContain(genre)
    }
  })
})
