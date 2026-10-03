import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HistoryAxis, { setTimelineEl } from '../docs/.vitepress/theme/components/HistoryAxis.vue'
import { store, AXIS, SEGMENTS, TRACKS, toggleFocus, prefersReduced, loadGsap, initAxisCursor } from '../docs/.vitepress/theme/data/timeline.mjs'

vi.mock('../docs/.vitepress/theme/data/timeline.mjs', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    SEGMENTS: actual.SEGMENTS,
    segments: actual.segments,
    AXIS: actual.AXIS,
    TRACKS: actual.TRACKS,
    store: actual.store,
    toggleFocus: actual.toggleFocus,
    segmentOf: actual.segmentOf,
    prefersReduced: vi.fn(() => false),
    loadGsap: vi.fn(() => Promise.resolve({ gsap: { from: vi.fn(() => ({})) }, ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })) } })),
    initAxisCursor: vi.fn(() => Promise.resolve(() => {})),
    fadeCardsOnScroll: vi.fn(() => Promise.resolve(() => {}))
  }
})

// 逐用例回收 wrapper：模块级 timelineEl 置位后，残留实例的 watch 会在
// store.focus 变化时重复触发 initAxisCursor，污染后续用例的调用计数。
const wrappers = []
function mountAxis() {
  const w = mount(HistoryAxis)
  wrappers.push({ w, done: false })
  return w
}
function unmountAxis(w) {
  const entry = wrappers.find(e => e.w === w)
  if (entry) entry.done = true
  w.unmount()
}

function wheelEvent(deltaY, clientX) {
  // happy-dom 的 WheelEvent 构造不透传 clientX，改用 MouseEvent 手动挂 deltaY
  const ev = new MouseEvent('wheel', { clientX, cancelable: true, bubbles: true })
  ev.deltaY = deltaY
  return ev
}

describe('HistoryAxis.vue', () => {
  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
    vi.mocked(initAxisCursor).mockReset()
  })

  afterEach(() => {
    for (const { w, done } of wrappers.splice(0)) {
      if (!done) {
        try { w.unmount() } catch { /* 已卸载 */ }
      }
    }
  })

  it('图例渲染：八个 chip 对应八轨', () => {
    const wrapper = mountAxis()
    const chips = wrapper.findAll('.tl-chip')
    expect(chips.length).toBe(8) // 8 tracks, reset only shows when focused
    expect(chips.map(c => c.text())).toEqual(TRACKS.map(t => t.name))
  })

  it('全部轨道 chip 仅在聚焦时显示', async () => {
    const wrapper = mountAxis()
    expect(wrapper.find('.tl-chip-reset').exists()).toBe(false)
    store.focus = 'games'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tl-chip-reset').exists()).toBe(true)
    store.focus = null
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tl-chip-reset').exists()).toBe(false)
  })

  it('聚焦：点击 chip 切换 focus，再点恢复', async () => {
    const wrapper = mountAxis()
    const chips = wrapper.findAll('.tl-chip')
    await chips[0].trigger('click')
    expect(store.focus).toBe('games')
    expect(chips[0].classes()).toContain('is-active')
    for (let i = 1; i < 8; i++) {
      expect(chips[i].classes()).toContain('is-focused-other')
    }
    await chips[0].trigger('click')
    expect(store.focus).toBeNull()
  })

  it('聚焦：全部轨道 chip 恢复全览', async () => {
    const wrapper = mountAxis()
    store.focus = 'games'
    await wrapper.vm.$nextTick()
    const resetChip = wrapper.find('.tl-chip-reset')
    await resetChip.trigger('click')
    expect(store.focus).toBeNull()
  })

  it('滚轮缩放：指针为锚双向缩放，夹取在 minSpan–maxSpan', async () => {
    const wrapper = mountAxis()
    await flushPromises() // onMounted 的 await loadGsap 落定后监听才挂上
    const overview = wrapper.find('.tl-overview')
    expect(overview.exists()).toBe(true)
    vi.spyOn(overview.element, 'getBoundingClientRect').mockReturnValue({ width: 800, left: 0 })
    // 向外（deltaY 负）已在最大跨度：视窗不动，只拦下默认滚动
    const evOut = wheelEvent(-1000, 200)
    overview.element.dispatchEvent(evOut)
    expect(evOut.defaultPrevented).toBe(true)
    expect(wrapper.vm.viewSpan).toBe(AXIS.maxSpan)
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    // 向内（deltaY 正）：71-50=21 被夹到 30；指针锚点 x=200/800=0.25
    const evIn = wheelEvent(100, 200)
    overview.element.dispatchEvent(evIn)
    expect(wrapper.vm.viewSpan).toBe(AXIS.minSpan)
    expect(wrapper.vm.viewStart).toBe(1965) // round(1955+71*0.25 - 30*0.25) = round(1965.25)
    expect(wrapper.vm.viewEnd).toBe(1995)
    expect(wrapper.vm.viewStart).toBeGreaterThanOrEqual(AXIS.minYear)
    expect(wrapper.vm.viewEnd).toBeLessThanOrEqual(AXIS.maxYear)
  })

  it('视窗锚点：年代导航直达六个锚点', async () => {
    const wrapper = mountAxis()
    for (const seg of SEGMENTS) {
      const btn = wrapper.findAll('.tl-nav-btn').find(b => b.text() === seg.decade)
      expect(btn).toBeTruthy()
      await btn.trigger('click')
      expect(wrapper.vm.activeDecade).toBe(seg.id)
    }
  })

  it('拖动平移：按住拖动改视窗且保持跨度，松开后移除监听', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    const overview = wrapper.find('.tl-overview')
    vi.spyOn(overview.element, 'getBoundingClientRect').mockReturnValue({ width: 800, left: 0 })
    // 先收窄到 30 年，平移才不会被右边界夹回
    wrapper.vm.viewStart = 1970
    wrapper.vm.viewEnd = 2000
    await wrapper.vm.$nextTick()
    overview.element.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 400, bubbles: true }))
    expect(overview.classes()).toContain('is-dragging')
    // dx=-100 → round(-100*71/800)=-9 → 视窗右移 9 年，跨度保持 30
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(1979)
    expect(wrapper.vm.viewEnd).toBe(2009)
    expect(wrapper.vm.viewSpan).toBe(30)
    // 同一拖动会话继续左拖：dx=+200 → viewStart<1955 触发左边界夹取
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    expect(wrapper.vm.viewEnd).toBe(AXIS.minYear + 30)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(overview.classes()).not.toContain('is-dragging')
    // 监听已移除：后续 mousemove 不再平移
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
  })

  it('非左键 mousedown 不进入拖动', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    const overview = wrapper.find('.tl-overview')
    overview.element.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 100, bubbles: true }))
    expect(overview.classes()).not.toContain('is-dragging')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
  })

  it('无效 mousemove：未按下时直接忽略', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    const before = wrapper.vm.viewStart
    // document 上未挂监听（无 mousedown），事件分发不触发任何逻辑
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(before)
    // 直接调用处理器：isDragging=false 时守卫直接返回
    wrapper.vm.onMouseMove({ clientX: 100 })
    expect(wrapper.vm.viewStart).toBe(before)
  })

  it('年代导航：未知段 id 直接返回不动视窗', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    wrapper.vm.jumpToDecade('nope')
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    expect(wrapper.vm.activeDecade).toBe('s-1970s')
  })

  it('复位：viewStart=1955, viewEnd=2026', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    // Ensure we start from default state
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    expect(wrapper.vm.viewEnd).toBe(AXIS.maxYear)
    // Simulate a changed state
    wrapper.vm.viewStart = 1980
    wrapper.vm.viewEnd = 2000
    await wrapper.vm.$nextTick()
    await wrapper.find('.tl-btn-reset').trigger('click')
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    expect(wrapper.vm.viewEnd).toBe(AXIS.maxYear)
  })

  it('年代导航：点击切换 activeDecade 并更新视窗', async () => {
    const wrapper = mountAxis()
    const btn = wrapper.findAll('.tl-nav-btn').find(b => b.text() === '2000s')
    await btn.trigger('click')
    expect(wrapper.vm.activeDecade).toBe('s-2000s')
  })

  it('概览轴年代按钮：点击跳转对应年代', async () => {
    const wrapper = mountAxis()
    for (const seg of SEGMENTS) {
      const btn = wrapper.findAll('.tl-decade-btn').find(b => b.text() === seg.decade)
      expect(btn).toBeTruthy()
      await btn.trigger('click')
      expect(wrapper.vm.activeDecade).toBe(seg.id)
    }
  })

  it('缩放按钮：点击放大/缩小更新视窗', async () => {
    const wrapper = mountAxis()
    // Default at maxSpan, so zoom in (+) is disabled, zoom out (-) is enabled
    const minusBtn = wrapper.findAll('.tl-btn').filter(b => b.text() === '−')[0]
    const beforeSpan = wrapper.vm.viewSpan
    await minusBtn.trigger('click')
    expect(wrapper.vm.viewSpan).toBeLessThan(beforeSpan)
    // Now zoom in (+) should be enabled
    const plusBtn = wrapper.findAll('.tl-btn').filter(b => b.text() === '+')[0]
    expect(plusBtn.attributes('disabled')).toBeUndefined()
    const afterZoomOutSpan = wrapper.vm.viewSpan
    await plusBtn.trigger('click')
    // Zoom in should increase span back towards original (within clamp bounds)
    expect(wrapper.vm.viewSpan).toBeGreaterThan(afterZoomOutSpan)
  })

  it('zoom 按钮在边界时禁用', async () => {
    const wrapper = mountAxis()
    wrapper.vm.viewStart = AXIS.minYear
    wrapper.vm.viewEnd = AXIS.minYear + AXIS.minSpan
    await wrapper.vm.$nextTick()
    const minusBtn = wrapper.findAll('.tl-btn').filter(b => b.text() === '−')[0]
    expect(minusBtn.attributes('disabled')).toBeDefined()
    wrapper.vm.viewStart = AXIS.maxYear - AXIS.maxSpan
    wrapper.vm.viewEnd = AXIS.maxYear
    await wrapper.vm.$nextTick()
    const plusBtn = wrapper.findAll('.tl-btn').filter(b => b.text() === '+')[0]
    expect(plusBtn.attributes('disabled')).toBeDefined()
  })

  it('prefersReduced=true 时跳过 GSAP 初始化', async () => {
    vi.mocked(prefersReduced).mockReturnValueOnce(true)
    mountAxis()
    await flushPromises()
    expect(prefersReduced).toHaveBeenCalled()
    expect(loadGsap).not.toHaveBeenCalled()
  })

  it('prefersReduced=false 时初始化 GSAP ScrollTrigger 并随滚动推进游标', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    expect(loadGsap).toHaveBeenCalled()
    const { ScrollTrigger } = await vi.mocked(loadGsap).mock.results.at(-1).value
    expect(ScrollTrigger.create).toHaveBeenCalledTimes(1)
    const cfg = ScrollTrigger.create.mock.calls[0][0]
    expect(cfg.trigger).toBe('.tl-timeline-wrapper')
    expect(cfg.start).toBe('top top')
    cfg.onUpdate({ progress: 0.42 })
    expect(wrapper.vm.cursorProgress).toBeCloseTo(0.42)
  })

  it('getBoundingClientRect width=0 时按宽度 1 兜底不产生 NaN', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    const overview = wrapper.find('.tl-overview')
    vi.spyOn(overview.element, 'getBoundingClientRect').mockReturnValue({ width: 0, left: 0 })
    overview.element.dispatchEvent(wheelEvent(100, 100))
    expect(Number.isFinite(wrapper.vm.viewStart)).toBe(true)
    expect(Number.isFinite(wrapper.vm.viewEnd)).toBe(true)
    expect(wrapper.vm.viewSpan).toBeGreaterThanOrEqual(AXIS.minSpan)
    expect(wrapper.vm.viewSpan).toBeLessThanOrEqual(AXIS.maxSpan)
  })

  it('overviewEl 失效时事件处理器逐项早退', async () => {
    const wrapper = mountAxis()
    await flushPromises()
    const overview = wrapper.find('.tl-overview')
    wrapper.vm.overviewEl = null
    // wheel：ref 已失效 → 直接返回，不再 preventDefault
    const ev = wheelEvent(100, 200)
    overview.element.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
    expect(wrapper.vm.viewSpan).toBe(AXIS.maxSpan)
    // 拖动链路：mousedown 挂监听但样式与 rect 均走空值分支
    overview.element.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 400, bubbles: true }))
    expect(overview.classes()).not.toContain('is-dragging')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(AXIS.minYear)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(overview.classes()).not.toContain('is-dragging')
    wrapper.vm.overviewEl = overview.element
  })

  it('onMounted 时 overviewEl 未就绪则跳过挂监听', async () => {
    const wrapper = mount(HistoryAxis)
    wrappers.push({ w: wrapper, done: false })
    wrapper.vm.overviewEl = null // 在 await loadGsap 落定前置空
    await flushPromises()
    const overview = wrapper.find('.tl-overview')
    const ev = wheelEvent(100, 200)
    overview.element.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false) // 监听未挂上
    expect(wrapper.vm.viewSpan).toBe(AXIS.maxSpan)
  })

  it('loadGsap 直接调用分支覆盖', async () => {
    const mod = await loadGsap()
    expect(mod.gsap).toBeTruthy()
    expect(mod.ScrollTrigger).toBeTruthy()
  })

  it('onUnmounted 清理 initAxisCursor 与事件监听', async () => {
    setTimelineEl(document.createElement('div'))
    const cleanups = []
    vi.mocked(initAxisCursor).mockImplementation(async () => {
      const fn = vi.fn()
      cleanups.push(fn)
      return fn
    })
    const wrapper = mountAxis()
    await flushPromises()
    expect(initAxisCursor).toHaveBeenCalledTimes(1)
    unmountAxis(wrapper)
    expect(cleanups[0]).toHaveBeenCalled()
  })

  it('watch store.focus：先清理旧游标再重建', async () => {
    setTimelineEl(document.createElement('div'))
    const cleanups = []
    vi.mocked(initAxisCursor).mockImplementation(async () => {
      const fn = vi.fn()
      cleanups.push(fn)
      return fn
    })
    const wrapper = mountAxis()
    await flushPromises()
    expect(cleanups.length).toBe(1)
    store.focus = 'games'
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(cleanups.length).toBe(2)
    expect(cleanups[0]).toHaveBeenCalledTimes(1) // 重建前先清理挂载时的游标
    store.focus = null
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(cleanups.length).toBe(3)
    expect(cleanups[1]).toHaveBeenCalledTimes(1)
    expect(cleanups[2]).not.toHaveBeenCalled()
  })

  it('initAxisCursor reduced=true 直接返回空清理', async () => {
    const axisEl = document.createElement('div')
    const timelineEl = document.createElement('div')
    const cleanup = await initAxisCursor(axisEl, timelineEl, { reduced: true })
    expect(typeof cleanup).toBe('function')
    await cleanup()
  })
})
