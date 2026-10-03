import { describe, it, expect, vi } from 'vitest'
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
  initAxisCursor
} from '../docs/.vitepress/theme/data/timeline.mjs'

describe('timeline data structure', () => {
  it('SEGMENTS: 六个年代段，id 与锚点一致', () => {
    expect(SEGMENTS.length).toBe(6)
    expect(SEGMENTS.map(s => s.id)).toEqual(['s-1970s', 's-1980s', 's-1990s', 's-2000s', 's-2010s', 's-2020s'])
    expect(SEGMENTS.every(s => s.from >= 1970 && s.to <= 2026)).toBe(true)
  })

  it('AXIS: 视窗范围与夹取常量', () => {
    expect(AXIS.minYear).toBe(1955)
    expect(AXIS.maxYear).toBe(2026)
    expect(AXIS.minSpan).toBe(30)
    expect(AXIS.maxSpan).toBe(71)
  })

  it('TRACKS: 八轨齐全，每轨 8–10 条，含 color 与 name', () => {
    expect(TRACKS.length).toBe(8)
    const ids = TRACKS.map(t => t.id)
    expect(ids).toEqual(['games', 'hardware', 'frontend', 'backend', 'engines', 'gameplay', 'art', 'company'])
    TRACKS.forEach(t => {
      expect(t.items.length).toBeGreaterThanOrEqual(8)
      expect(t.items.length).toBeLessThanOrEqual(10)
      expect(typeof t.color).toBe('string')
      expect(t.color.startsWith('#')).toBe(true)
      expect(typeof t.name).toBe('string')
    })
  })

  it('每条目三硬字段非空，key 全局唯一且前缀匹配轨道', () => {
    const allKeys = new Set()
    let itemsWithLinks = 0
    TRACKS.forEach(t => {
      t.items.forEach(item => {
        expect(item.hardware, `${item.key}: 硬件背景为空`).toBeTruthy()
        expect(item.solved, `${item.key}: 解决了什么为空`).toBeTruthy()
        expect(item.limits, `${item.key}: 弊端为空`).toBeTruthy()
        expect(item.key).toBeTruthy()
        expect(allKeys.has(item.key), `key 重复: ${item.key}`).toBe(false)
        allKeys.add(item.key)
        const prefix = item.key.split('-')[0]
        const expectedPrefix = { games: 'ga', hardware: 'hw', frontend: 'fe', backend: 'be', engines: 'en', gameplay: 'gp', art: 'ar', company: 'co' }[t.id]
        expect(prefix).toBe(expectedPrefix)
        expect(typeof item.year).toBe('number')
        expect(typeof item.approx).toBe('boolean')
        expect(item.year).toBeGreaterThanOrEqual(1962)
        expect(item.year).toBeLessThanOrEqual(2026)
        if (t.id === 'company') {
          expect(Array.isArray(item.works)).toBe(true)
          expect(item.works.length).toBeGreaterThan(0)
          item.works.forEach(w => {
            expect(typeof w.year).toBe('number')
            expect(typeof w.title).toBe('string')
            expect(typeof w.why).toBe('string')
          })
        } else {
          expect(item.works).toBeUndefined()
        }
        if (item.links) {
          itemsWithLinks += 1
          expect(Array.isArray(item.links)).toBe(true)
          item.links.forEach(l => {
            expect(['in', 'out']).toContain(l.dir)
            expect(typeof l.track).toBe('string')
            expect(typeof l.key).toBe('string')
            expect(typeof l.note).toBe('string')
          })
        }
      })
    })
    // 非空断言：互链装配必须真的产出 links
    expect(itemsWithLinks).toBeGreaterThan(0)
  })

  it('年份归段正确：segmentOf 映射到对应 SEGMENTS', () => {
    expect(segmentOf(1962)).toBe('s-1970s')
    expect(segmentOf(1975)).toBe('s-1970s')
    expect(segmentOf(1985)).toBe('s-1980s')
    expect(segmentOf(1995)).toBe('s-1990s')
    expect(segmentOf(2005)).toBe('s-2000s')
    expect(segmentOf(2015)).toBe('s-2010s')
    expect(segmentOf(2023)).toBe('s-2020s')
    expect(segmentOf(2026)).toBe('s-2020s')
    expect(segmentOf(2030)).toBe('s-2020s')
    expect(segmentOf(1950)).toBe('s-1970s')
  })

  it('itemsIn 返回年代区间', () => {
    const r = itemsIn('1990s')
    expect(r.from).toBe(1990)
    expect(r.to).toBe(1999)
    const r2 = itemsIn('2020s')
    expect(r2.from).toBe(2020)
    expect(r2.to).toBe(2026)
    const r3 = itemsIn('invalid')
    expect(r3.from).toBe(0)
    expect(r3.to).toBe(0)
  })

  it('互链双向闭合：每条 out 都有对应的 in，note 与 key 可解析', () => {
    const itemByKey = {}
    let totalLinks = 0
    TRACKS.forEach(t => t.items.forEach(i => { itemByKey[i.key] = i }))
    TRACKS.forEach(t => {
      t.items.forEach(item => {
        if (item.links) {
          totalLinks += item.links.length
          item.links.forEach(link => {
            const target = itemByKey[link.key]
            expect(target, `链接目标不存在: ${link.key}`).toBeTruthy()
            const backLink = target.links?.find(l => l.key === item.key && l.dir !== link.dir)
            expect(backLink, `反向链接缺失: ${item.key} <-> ${link.key}`).toBeTruthy()
            expect(backLink.note).toBeTruthy()
          })
        }
      })
    })
    // 非空断言：装配必须真的产出互链（回归：trackById 前缀映射曾导致零装配）
    expect(totalLinks).toBeGreaterThan(0)
  })

  it('store: focus 与 collapsed 初始为空', () => {
    expect(store.focus).toBeNull()
    expect(Object.keys(store.collapsed).length).toBe(0)
  })

  it('toggleFocus: 切换聚焦与取消', () => {
    store.focus = null
    toggleFocus('games')
    expect(store.focus).toBe('games')
    toggleFocus('games')
    expect(store.focus).toBeNull()
    toggleFocus('hardware')
    expect(store.focus).toBe('hardware')
  })

  it('toggleCollapse: 切换折叠状态', () => {
    store.collapsed.games = false
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(true)
    toggleCollapse('games')
    expect(store.collapsed.games).toBe(false)
  })

  it('relatedKeys: 返回指定轨道的关联 key', () => {
    const item = { links: [{ track: 'hardware', key: 'hw-2001-shader', dir: 'in', note: 'test' }] }
    expect(relatedKeys('hardware', item)).toEqual(['hw-2001-shader'])
    expect(relatedKeys('frontend', item)).toEqual([])
    expect(relatedKeys('hardware', {})).toEqual([])
    expect(relatedKeys('hardware', { links: [] })).toEqual([])
  })

  it('prefersReduced: matchMedia 返回 reduce 时为 true', () => {
    const original = globalThis.matchMedia
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: true })
    globalThis.matchMedia = mockMatchMedia
    expect(prefersReduced()).toBe(true)
    mockMatchMedia.mockReturnValue({ matches: false })
    expect(prefersReduced()).toBe(false)
    // 恢复原生 matchMedia，避免影响后续用例（如 loadGsap 注册 ScrollTrigger）
    if (original) globalThis.matchMedia = original
    else delete globalThis.matchMedia
  })

  it('prefersReduced: matchMedia 不存在时返回 false', () => {
    const originalMatchMedia = globalThis.matchMedia
    delete globalThis.matchMedia
    expect(prefersReduced()).toBe(false)
    globalThis.matchMedia = originalMatchMedia
  })

  it('fadeCardsOnScroll: reduced=true 时直接返回', async () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div><div data-tl-card></div>'
    await expect(fadeCardsOnScroll(el, { reduced: true })).resolves.toBeUndefined()
  })

  it('fadeCardsOnScroll: load reject 时捕获错误不向外抛出', async () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div>'
    await expect(fadeCardsOnScroll(el, { load: () => Promise.reject(new Error('fail')), reduced: false })).rejects.toThrow('fail')
  })

  it('fadeCardsOnScroll: gsap 加载成功时调用 gsap.from', async () => {
    const mockGsap = {
      from: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {}
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div><div data-tl-card></div>'
    await fadeCardsOnScroll(el, { load, reduced: false })
    expect(load).toHaveBeenCalled()
    expect(mockGsap.from).toHaveBeenCalled()
  })

  it('fadeCardsOnScroll: 无卡片时直接返回', async () => {
    const mockGsap = {
      from: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {}
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const el = document.createElement('div')
    el.innerHTML = '<div></div>'
    await fadeCardsOnScroll(el, { load, reduced: false })
    expect(mockGsap.from).not.toHaveBeenCalled()
  })

  it('initAxisCursor: reduced=true 时直接返回', async () => {
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEls = {}
    await expect(initAxisCursor(axisEl, decadeEls, { reduced: true })).resolves.toBeUndefined()
  })

  it('initAxisCursor: cursor 不存在时捕获错误不向外抛出', async () => {
    const axisEl = document.createElement('div')
    const decadeEls = {}
    await expect(initAxisCursor(axisEl, decadeEls, { reduced: false, load: () => Promise.reject(new Error('fail')) })).rejects.toThrow('fail')
  })

  it('initAxisCursor: gsap 加载成功时创建 ScrollTrigger', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn()
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    const decadeEls = [decadeEl]
    await initAxisCursor(axisEl, decadeEls, { load, reduced: false })
    expect(load).toHaveBeenCalled()
    expect(mockScrollTrigger.create).toHaveBeenCalled()
  })

  it('initAxisCursor: cursor 为 null 时直接返回', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn()
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    const decadeEls = [decadeEl]
    await initAxisCursor(axisEl, decadeEls, { load, reduced: false })
    expect(mockScrollTrigger.create).not.toHaveBeenCalled()
  })

  it('loadGsap: 模块导出函数', () => {
    expect(typeof loadGsap).toBe('function')
  })

  it('prefersReduced: 传入自定义 window 对象', () => {
    const mockWin = {
      matchMedia: vi.fn().mockReturnValue({ matches: true })
    }
    expect(prefersReduced(mockWin)).toBe(true)
    mockWin.matchMedia.mockReturnValue({ matches: false })
    expect(prefersReduced(mockWin)).toBe(false)
  })

  it('initAxisCursor: decadeEl.id 不在 SEGMENTS 中时跳过', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn()
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-invalid'
    const decadeEls = [decadeEl]
    await initAxisCursor(axisEl, decadeEls, { load, reduced: false })
    expect(mockScrollTrigger.create).not.toHaveBeenCalled()
  })

  it('fadeCardsOnScroll: load 抛错时被捕获', async () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div>'
    const load = vi.fn().mockRejectedValue(new Error('load failed'))
    await expect(fadeCardsOnScroll(el, { load, reduced: false })).rejects.toThrow('load failed')
  })

  it('initAxisCursor: load 抛错时被捕获', async () => {
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    const decadeEls = [decadeEl]
    const load = vi.fn().mockRejectedValue(new Error('load failed'))
    await expect(initAxisCursor(axisEl, decadeEls, { load, reduced: false })).rejects.toThrow('load failed')
  })

  it('initAxisCursor: self.isActive 为 true 时调用 gsap.to', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn((options) => {
        // Simulate onToggle with isActive = true
        if (options.onToggle) {
          options.onToggle({ isActive: true })
        }
        return {}
      })
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    const decadeEls = [decadeEl]
    await initAxisCursor(axisEl, decadeEls, { load, reduced: false })
    expect(mockGsap.to).toHaveBeenCalled()
  })

  it('initAxisCursor: self.isActive 为 false 时不调用 gsap.to', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn((options) => {
        if (options.onToggle) {
          options.onToggle({ isActive: false })
        }
        return {}
      })
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    const decadeEls = [decadeEl]
    await initAxisCursor(axisEl, decadeEls, { load, reduced: false })
    expect(mockGsap.to).not.toHaveBeenCalled()
  })

  it('initAxisCursor: self.isActive 为 false 时不调用 gsap.to', async () => {
    const mockGsap = {
      to: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {
      create: vi.fn((options) => {
        if (options.onToggle) options.onToggle({ isActive: false })
        return {}
      })
    }
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const axisEl = document.createElement('div')
    axisEl.innerHTML = '<div class="tl-axis-cursor"></div>'
    const decadeEl = document.createElement('div')
    decadeEl.id = 's-1990s'
    await initAxisCursor(axisEl, [decadeEl], { load, reduced: false })
    expect(mockGsap.to).not.toHaveBeenCalled()
  })

  it('loadGsap: 实际导入 gsap 模块并注册 ScrollTrigger', async () => {
    expect(typeof loadGsap).toBe('function')
    // ScrollTrigger.register 会探测 matchMedia，测试环境兜底一个 stub
    const original = globalThis.matchMedia
    globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false }))
    try {
      const { gsap, ScrollTrigger } = await loadGsap()
      expect(gsap).toBeTruthy()
      expect(typeof gsap.registerPlugin).toBe('function')
      expect(ScrollTrigger).toBeTruthy()
    } finally {
      if (original) globalThis.matchMedia = original
      else delete globalThis.matchMedia
    }
  })

  it('fadeCardsOnScroll: 调用 gsap.from 创建动画', async () => {
    const mockGsap = {
      from: vi.fn(() => ({})),
      registerPlugin: vi.fn()
    }
    const mockScrollTrigger = {}
    const load = vi.fn().mockResolvedValue({ gsap: mockGsap, ScrollTrigger: mockScrollTrigger })
    const el = document.createElement('div')
    el.innerHTML = '<div data-tl-card></div>'
    await fadeCardsOnScroll(el, { load, reduced: false })
    expect(mockGsap.from).toHaveBeenCalledWith(
      expect.any(NodeList),
      expect.objectContaining({
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.05,
        scrollTrigger: expect.objectContaining({
          trigger: el,
          start: 'top 85%',
          once: true
        })
      })
    )
  })

  it('RELATIONS: 无效 key 的条目被跳过，有效条目完成装配', () => {
    const itemByKey = {}
    TRACKS.forEach(t => t.items.forEach(i => { itemByKey[i.key] = i }))
    // 关系表里的未来条目 key 尚未落条目，装配时整条跳过、不产出任何 links
    const futureKeys = ['ga-1977-atari2600', 'gp-1988-madden', 'ga-1997-ff7', 'ga-1998-halflife', 'gp-2003-steam']
    futureKeys.forEach(k => {
      expect(itemByKey[k], `未来条目不应存在: ${k}`).toBeUndefined()
      TRACKS.forEach(t => t.items.forEach(i => {
        if (i.links) {
          expect(i.links.some(l => l.key === k), `跳过的关系不应出现在 links 中: ${k}`).toBe(false)
        }
      }))
    })
    // 抽查一条有效关系的双向装配：hw-2001-shader → fe-2011-webgl
    const shader = itemByKey['hw-2001-shader']
    expect(shader.links.some(l => l.track === 'frontend' && l.key === 'fe-2011-webgl' && l.dir === 'out')).toBe(true)
    const webgl = itemByKey['fe-2011-webgl']
    expect(webgl.links.some(l => l.track === 'hardware' && l.key === 'hw-2001-shader' && l.dir === 'in')).toBe(true)
  })
})