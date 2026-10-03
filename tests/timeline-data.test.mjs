import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SEGMENTS,
  AXIS,
  TRACKS,
  store,
  segmentOf,
  itemsIn,
  toggleFocus,
  toggleCollapse,
  relatedKeys,
  prefersReduced,
  loadGsap,
  fadeCardsOnScroll,
  initAxisCursor,
  RELATIONS
} from '../docs/.vitepress/theme/data/timeline.mjs'

describe('timeline data', () => {
  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
  })

  it('SEGMENTS：七个年代段、键名与范围正确', () => {
    expect(SEGMENTS.length).toBe(7)
    expect(SEGMENTS.map(s => s.id)).toEqual(['s-1960s', 's-1970s', 's-1980s', 's-1990s', 's-2000s', 's-2010s', 's-2020s'])
    expect(SEGMENTS[0].from).toBe(1960)
    expect(SEGMENTS[6].to).toBe(2026)
  })

  it('AXIS：边界与跨度限制就位', () => {
    expect(AXIS.minYear).toBe(1955)
    expect(AXIS.maxYear).toBe(2026)
    expect(AXIS.minSpan).toBe(30)
    expect(AXIS.maxSpan).toBe(71)
  })

  it('TRACKS：八轨、名称、颜色、条目数（8–10 条）', () => {
    expect(TRACKS.length).toBe(8)
    const expected = [
      { id: 'games', count: 10 },
      { id: 'hardware', count: 10 },
      { id: 'frontend', count: 10 },
      { id: 'backend', count: 9 },
      { id: 'engines', count: 9 },
      { id: 'gameplay', count: 9 },
      { id: 'art', count: 9 },
      { id: 'company', count: 10 }
    ]
    for (const exp of expected) {
      const track = TRACKS.find(t => t.id === exp.id)
      expect(track, `轨道 ${exp.id} 应存在`).toBeTruthy()
      expect(track.name).toBeTruthy()
      expect(track.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(track.items.length).toBe(exp.count)
    }
  })

  it('每个条目：三硬字段非空、year 为数字、approx 为布尔、key 唯一且前缀匹配轨道', () => {
    const allKeys = new Set()
    const prefixMap = {
      games: 'ga-', hardware: 'hw-', frontend: 'fe-', backend: 'be-',
      engines: 'en-', gameplay: 'gp-', art: 'ar-', company: 'co-'
    }
    for (const track of TRACKS) {
      for (const item of track.items) {
        expect(item.key, `${item.key} 应有 key`).toBeTruthy()
        expect(allKeys.has(item.key), `${item.key} key 不应重复`).toBe(false)
        allKeys.add(item.key)
        expect(item.key.startsWith(prefixMap[track.id]), `${item.key} 前缀应为 ${prefixMap[track.id]}`).toBe(true)
        expect(typeof item.year).toBe('number')
        expect(item.year).toBeGreaterThanOrEqual(1960)
        expect(item.year).toBeLessThanOrEqual(2026)
        expect(typeof item.approx).toBe('boolean')
        expect(item.hardware, `${item.key} 缺少硬件背景`).toBeTruthy()
        expect(item.hardware.length).toBeGreaterThan(5)
        expect(item.solved, `${item.key} 缺少解决了什么`).toBeTruthy()
        expect(item.solved.length).toBeGreaterThan(5)
        expect(item.limits, `${item.key} 缺少弊端`).toBeTruthy()
        expect(item.limits.length).toBeGreaterThan(5)
        if (track.id === 'company') {
          expect(item.works, `${item.key} 公司轨应有 works`).toBeTruthy()
          expect(Array.isArray(item.works)).toBe(true)
          expect(item.works.length).toBeGreaterThan(0)
          for (const w of item.works) {
            expect(w.year).toBeTruthy()
            expect(w.title).toBeTruthy()
            expect(w.why).toBeTruthy()
          }
        } else {
          expect(item.works).toBeUndefined()
        }
      }
    }
    expect(allKeys.size).toBe(76)
  })

  it('年份归段：每条年份落在对应 SEGMENTS 范围内', () => {
    for (const track of TRACKS) {
      for (const item of track.items) {
        const segId = segmentOf(item.year)
        expect(segId, `${item.key} 年份 ${item.year} 应落在某段`).not.toBeNull()
        const seg = SEGMENTS.find(s => s.id === segId)
        expect(item.year).toBeGreaterThanOrEqual(seg.from)
        expect(item.year).toBeLessThanOrEqual(seg.to)
      }
    }
  })

  it('互链：RELATIONS 双向装配闭合、key 可解析、方向与注记对应', () => {
    for (const [srcKey, dstKey, srcNote, dstNote] of RELATIONS) {
      const srcTrack = TRACKS.find(t => t.items.some(i => i.key === srcKey))
      const dstTrack = TRACKS.find(t => t.items.some(i => i.key === dstKey))
      expect(srcTrack, `源 ${srcKey} 应存在`).toBeTruthy()
      expect(dstTrack, `目标 ${dstKey} 应存在`).toBeTruthy()
      const srcItem = srcTrack.items.find(i => i.key === srcKey)
      const dstItem = dstTrack.items.find(i => i.key === dstKey)
      const srcLink = srcItem.links?.find(l => l.key === dstKey && l.dir === 'out')
      const dstLink = dstItem.links?.find(l => l.key === srcKey && l.dir === 'in')
      expect(srcLink, `${srcKey}→${dstKey} out 链接应存在`).toBeTruthy()
      expect(dstLink, `${dstKey}←${srcKey} in 链接应存在`).toBeTruthy()
      expect(srcLink.note).toBe(srcNote)
      expect(dstLink.note).toBe(dstNote)
    }
  })

  it('与 nodes.md 标题一致（抽检关键条目）', () => {
    const check = (key, expectedTitle) => {
      const item = TRACKS.flatMap(t => t.items).find(i => i.key === key)
      expect(item, `${key} 应存在`).toBeTruthy()
      expect(item.title).toBe(expectedTitle)
    }
    check('ga-1962-spacewar', 'Spacewar!（PDP-1）')
    check('ga-2020-genshin', '原神')
    check('hw-2001-shader', 'GeForce 3 与可编程着色器')
    check('hw-2018-rtx', 'RTX 2080（RT 与 Tensor 核心）')
    check('fe-1995-javascript', 'JavaScript')
    check('fe-2023-webgpu', 'WebGPU 在 Chrome 稳定')
    check('be-1970-rdbms', '关系模型与 SQL')
    check('be-2015-grpc', 'gRPC 开源')
    check('en-1993-doom', 'Doom 引擎')
    check('en-2020-ue5', 'UE5（Nanite 与 Lumen）')
    check('gp-1978-highscore', '高分榜与难度递增')
    check('gp-2017-botw', '系统涌现（旷野之息）')
    check('ar-1975-pixel', '单色像素与符号化')
    check('ar-2023-ai', 'AI 辅助资产进入生产讨论')
    check('co-1972-atari', 'Atari')
    check('co-2012-mihoyo', '米哈游')
  })

  it('helpers：segmentOf 边界与越界', () => {
    expect(segmentOf(1960)).toBe('s-1960s')
    expect(segmentOf(1969)).toBe('s-1960s')
    expect(segmentOf(1970)).toBe('s-1970s')
    expect(segmentOf(1979)).toBe('s-1970s')
    expect(segmentOf(1980)).toBe('s-1980s')
    expect(segmentOf(2026)).toBe('s-2020s')
    expect(segmentOf(1959)).toBeNull()
    expect(segmentOf(2027)).toBeNull()
  })

  it('helpers：itemsIn 返回结构与年份过滤', () => {
    const res = itemsIn('1970s')
    expect(res.segment.id).toBe('s-1970s')
    expect(res.tracks.length).toBe(8)
    for (const t of res.tracks) {
      for (const item of t.items) {
        expect(item.year).toBeGreaterThanOrEqual(1970)
        expect(item.year).toBeLessThanOrEqual(1979)
      }
    }
  })

  it('store：toggleFocus 切换与恢复', () => {
    expect(store.focus).toBeNull()
    toggleFocus('games')
    expect(store.focus).toBe('games')
    toggleFocus('games')
    expect(store.focus).toBeNull()
    toggleFocus('hardware')
    expect(store.focus).toBe('hardware')
  })

  it('store：toggleCollapse 记录每轨折叠状态', () => {
    expect(store.collapsed.games).toBeUndefined()
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(true)
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(false)
  })

  it('relatedKeys：聚焦轨道返回关联 key 集合', () => {
    const related = relatedKeys('hardware')
    expect(related.size).toBeGreaterThan(0)
    expect(related.has('fe-2011-webgl')).toBe(true)
    expect(related.has('en-2004-source')).toBe(true)
    expect(related.has('ar-2001-realism')).toBe(true)
    expect(relatedKeys(null).size).toBe(0)
    expect(relatedKeys('nonexistent').size).toBe(0)
  })

  it('prefersReduced：matchMedia 存根返回值', () => {
    const win = { matchMedia: vi.fn(() => ({ matches: true })) }
    expect(prefersReduced(win)).toBe(true)
    win.matchMedia.mockReturnValue({ matches: false })
    expect(prefersReduced(win)).toBe(false)
    expect(prefersReduced({})).toBe(false)
  })

  it('loadGsap：动态导入 gsap 与 ScrollTrigger 并注册', async () => {
    const mod = await loadGsap()
    expect(mod.gsap).toBeTruthy()
    expect(mod.ScrollTrigger).toBeTruthy()
  })

  it('fadeCardsOnScroll：reduced=true 直接返回空清理函数', async () => {
    const el = document.createElement('div')
    const cleanup = await fadeCardsOnScroll(el, { reduced: true })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('fadeCardsOnScroll：reduced=false 且 load resolve 返回清理函数', async () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div><div data-tl-card></div>'
    const fakeGsap = { from: vi.fn(() => ({})) }
    const fakeST = { getAll: vi.fn(() => []), create: vi.fn() }
    const cleanup = await fadeCardsOnScroll(el, {
      reduced: false,
      load: vi.fn().mockResolvedValue({ gsap: fakeGsap, ScrollTrigger: fakeST })
    })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('fadeCardsOnScroll：load reject 不抛错', async () => {
    const el = document.createElement('div')
    const cleanup = await fadeCardsOnScroll(el, {
      reduced: false,
      load: vi.fn().mockRejectedValue(new Error('load failed'))
    })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('fadeCardsOnScroll：默认参数分支（reduced 由 prefersReduced 决定）', async () => {
    const el = document.createElement('div')
    const cleanup = await fadeCardsOnScroll(el, { load: vi.fn().mockResolvedValue({ gsap: { from: vi.fn(() => ({})) }, ScrollTrigger: { getAll: vi.fn(() => []), create: vi.fn() } }) })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('initAxisCursor：reduced=true 直接返回空清理函数', async () => {
    const axisEl = document.createElement('div')
    const timelineEl = document.createElement('div')
    const cleanup = await initAxisCursor(axisEl, timelineEl, { reduced: true })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('initAxisCursor：reduced=false 且 load resolve 返回清理函数', async () => {
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-cursor"></div>'
    const timelineEl = document.createElement('div')
    const fakeGsap = {}
    const fakeST = { create: vi.fn(() => ({ kill: vi.fn() })) }
    const cleanup = await initAxisCursor(axisEl, timelineEl, {
      reduced: false,
      load: vi.fn().mockResolvedValue({ gsap: fakeGsap, ScrollTrigger: fakeST })
    })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })

  it('initAxisCursor：cursor 元素不存在时不报错', async () => {
    const axisEl = document.createElement('div')
    const timelineEl = document.createElement('div')
    const cleanup = await initAxisCursor(axisEl, timelineEl, { reduced: false, load: vi.fn().mockResolvedValue({ gsap: {}, ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })) } }) })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })
})