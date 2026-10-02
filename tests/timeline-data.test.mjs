import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AXIS, SEGMENTS, TRACKS, RELATIONS, store,
  findItem, toggleFocus, toggleCollapse, segmentOf, keysOfTrack, relatedTo,
  overlaps, fitView, pctFor, dotTitle, linkTitle, prefersReduced,
  fadeCardsOnScroll, initAxisCursor
} from '../docs/.vitepress/theme/data/timeline.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nodesPage = readFileSync(resolve(root, 'docs/history/nodes.md'), 'utf8')

describe('历史线数据：结构与三硬字段门禁', () => {
  it('八轨齐全，每轨 8-10 条，轨道名与色值非空', () => {
    expect(TRACKS.length).toBe(8)
    for (const t of TRACKS) {
      expect(t.items.length).toBeGreaterThanOrEqual(8)
      expect(t.items.length).toBeLessThanOrEqual(10)
      expect(t.name.length).toBeGreaterThan(0)
      expect(/^#[0-9a-f]{6}$/i.test(t.color)).toBe(true)
    }
  })

  it('每条：key 唯一、前缀对应该轨、三硬字段非空', () => {
    const seen = new Set()
    const prefix = { games: 'ga', hardware: 'hw', frontend: 'fe', backend: 'be', engines: 'en', gameplay: 'gp', art: 'ar', company: 'co' }
    for (const track of TRACKS) {
      for (const item of track.items) {
        expect(seen.has(item.key), `key 重复: ${item.key}`).toBe(false)
        seen.add(item.key)
        expect(item.key.startsWith(`${prefix[track.id]}-`), `${item.key} 前缀错误`).toBe(true)
        for (const f of ['hardware', 'solved', 'limits']) {
          expect(typeof item[f]).toBe('string')
          expect(item[f].length, `${item.key}.${f} 为空`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('approx 是布尔值、年份落在某一年代段、works 只出现在公司轨', () => {
    for (const track of TRACKS) {
      for (const item of track.items) {
        expect(typeof item.approx).toBe('boolean')
        const seg = segmentOf(item.year)
        expect(seg).toBeTruthy()
        if (track.id === 'company') {
          expect(Array.isArray(item.works)).toBe(true)
          expect(item.works.length).toBeGreaterThanOrEqual(1)
        } else {
          expect(item.works).toBeUndefined()
        }
      }
    }
  })

  it('公司代表作每条带年份与"为什么代表"', () => {
    const company = TRACKS.find((t) => t.id === 'company')
    for (const item of company.items) {
      for (const w of item.works) {
        expect(typeof w.year).toBe('number')
        expect(w.title.length).toBeGreaterThan(0)
        expect(w.why.length).toBeGreaterThan(0)
      }
    }
  })

  it('每个条目标题都能在 nodes.md 清单中找到（数据与清单一致）', () => {
    for (const t of TRACKS) for (const i of t.items) {
      expect(nodesPage.includes(i.title), `nodes.md 缺条目: ${i.title}`).toBe(true)
    }
  })
})

describe('历史线数据：互链双向闭合', () => {
  it('RELATIONS 共 29 条，源/目标 key 均可解析', () => {
    expect(RELATIONS.length).toBe(29)
    for (const [src, dst] of RELATIONS) {
      expect(findItem(src), `未知源: ${src}`).toBeTruthy()
      expect(findItem(dst), `未知目标: ${dst}`).toBeTruthy()
    }
  })

  it('每条因果同时出现在源侧 out 与目标侧 in', () => {
    for (const [src, dst, outNote, inNote] of RELATIONS) {
      const s = findItem(src)
      const d = findItem(dst)
      const out = s.item.links.find((l) => l.dir === 'out' && l.key === dst)
      const inn = d.item.links.find((l) => l.dir === 'in' && l.key === src)
      expect(out, `${src} 缺 out 徽标`).toBeTruthy()
      expect(out.note).toBe(outNote)
      expect(inn, `${dst} 缺 in 徽标`).toBeTruthy()
      expect(inn.note).toBe(inNote)
      expect(out.track).toBe(d.track.id)
      expect(inn.track).toBe(s.track.id)
    }
  })

  it('跨轨因果 ≥14 组', () => {
    const crossTrack = RELATIONS.filter(([src, dst]) => findItem(src).track.id !== findItem(dst).track.id)
    expect(crossTrack.length).toBeGreaterThanOrEqual(14)
  })
})

describe('历史线数据：助手函数分支覆盖', () => {
  it('findItem 命中返回 {track,item}，未知 key 返回 null', () => {
    expect(findItem('ga-2004-wow').item.title).toContain('魔兽世界')
    expect(findItem('nope-1')).toBeNull()
  })

  it('toggleFocus 切换/恢复，toggleCollapse 取反', () => {
    store.focus = null
    toggleFocus('games')
    expect(store.focus).toBe('games')
    toggleFocus('games')
    expect(store.focus).toBeNull()
    toggleFocus('games')
    toggleFocus('hardware')
    expect(store.focus).toBe('hardware')
    store.focus = null
    delete store.collapsed.games
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(true)
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(false)
  })

  it('segmentOf 命中、向下/向上越界回退首段/末段', () => {
    expect(segmentOf(1962).id).toBe('s-1970s')
    expect(segmentOf(1985).id).toBe('s-1980s')
    expect(segmentOf(1999).id).toBe('s-1990s')
    expect(segmentOf(2004).id).toBe('s-2000s')
    expect(segmentOf(2016).id).toBe('s-2010s')
    expect(segmentOf(2025).id).toBe('s-2020s')
    expect(segmentOf(1900).id).toBe('s-1970s')
    expect(segmentOf(2099).id).toBe('s-2020s')
  })

  it('keysOfTrack 命中返回集合，未知轨返回空集合', () => {
    expect(keysOfTrack('games').size).toBe(10)
    expect(keysOfTrack('hardware').size).toBe(10)
    expect(keysOfTrack('nope').size).toBe(0)
  })

  it('relatedTo：有互链命中 true，未命中与无 links 均 false', () => {
    const wow = findItem('ga-2004-wow').item
    expect(relatedTo(wow, keysOfTrack('company'))).toBe(true)
    expect(relatedTo(wow, keysOfTrack('art'))).toBe(false)
    expect(relatedTo({}, keysOfTrack('games'))).toBe(false)
  })

  it('overlaps 交叠为 true、不交叠为 false、边界相接为 true', () => {
    expect(overlaps(2000, 2009, 2005, 2015)).toBe(true)
    expect(overlaps(2000, 2009, 2010, 2019)).toBe(false)
    expect(overlaps(2000, 2009, 2009, 2019)).toBe(true)
  })

  it('fitView：跨距夹取 [minSpan,maxSpan]，起点夹取 [minYear,maxYear-span]', () => {
    expect(fitView(1960, 1970)).toEqual({ from: 1960, to: 1960 + AXIS.minSpan })
    expect(fitView(1000, 2000)).toEqual({ from: AXIS.minYear, to: AXIS.maxYear })
    expect(fitView(1900, 1960).from).toBe(AXIS.minYear)
    expect(fitView(2020, 2026)).toEqual({ from: AXIS.maxYear - AXIS.minSpan, to: AXIS.maxYear })
  })

  it('pctFor 与 dotTitle/linkTitle 的 "约" 分支与命中/未命中分支', () => {
    expect(pctFor(1990, { from: 1955, to: 2026 })).toBeCloseTo(49.3, 1)
    expect(dotTitle({ approx: true, year: 1962, title: 'X' })).toBe('约1962 · X')
    expect(dotTitle({ approx: false, year: 1972, title: 'Y' })).toBe('1972 · Y')
    expect(linkTitle({ dir: 'out', key: 'ga-2004-wow', note: 'n' })).toContain('→')
    expect(linkTitle({ dir: 'in', key: 'ga-2004-wow', note: 'n' })).toContain('←')
    expect(linkTitle({ dir: 'out', key: 'no-such-key', note: 'n' })).toContain('no-such-key')
  })

  it('prefersReduced：无 matchMedia 返回 false，reduce 命中为 true', () => {
    expect(prefersReduced({})).toBe(false)
    expect(prefersReduced({ matchMedia: () => ({ matches: false }) })).toBe(false)
    expect(prefersReduced({ matchMedia: () => ({ matches: true }) })).toBe(true)
  })

  it('fadeCardsOnScroll：reduced 直接 null；否则经 load 调 gsap.from', async () => {
    expect(fadeCardsOnScroll(null, { reduced: true })).toBeNull()
    const from = vi.fn(() => 'tween')
    const registerPlugin = vi.fn()
    const el = document.createElement('div')
    el.innerHTML = '<a data-tl-card></a><a data-tl-card></a>'
    const result = fadeCardsOnScroll(el, {
      reduced: false,
      load: () => Promise.resolve({ gsap: { registerPlugin, from }, ScrollTrigger: {} })
    })
    await result
    expect(registerPlugin).toHaveBeenCalled()
    expect(from).toHaveBeenCalledTimes(1)
    expect(from.mock.calls[0][0].length).toBe(2)
  })

  it('initAxisCursor：reduced/缺元素返回 null；否则经 load 调 gsap.fromTo', async () => {
    expect(initAxisCursor(null, { reduced: false })).toBeNull()
    const el = document.createElement('div')
    expect(initAxisCursor(el, { reduced: true })).toBeNull()
    const fromTo = vi.fn(() => 'tween')
    await initAxisCursor(el, {
      reduced: false,
      load: () => Promise.resolve({ gsap: { registerPlugin: vi.fn(), fromTo }, ScrollTrigger: {} })
    })
    expect(fromTo).toHaveBeenCalledTimes(1)
  })
})
