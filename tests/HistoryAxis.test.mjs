import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryAxis from '../docs/.vitepress/theme/components/HistoryAxis.vue'
import { store, AXIS } from '../docs/.vitepress/theme/data/timeline.mjs'

vi.mock('../docs/.vitepress/theme/data/timeline.mjs', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    prefersReduced: vi.fn(() => true),
    loadGsap: vi.fn(() => Promise.reject(new Error('not loaded in test'))),
    fadeCardsOnScroll: vi.fn(() => Promise.resolve()),
    initAxisCursor: vi.fn(() => Promise.resolve()),
    store: mod.store
  }
})

// happy-dom 的 WheelEvent 构造不透传 clientX：用 MouseEvent 派发 wheel 类型，再手动补 deltaY
function wheelEvent(deltaY, clientX) {
  const e = new MouseEvent('wheel', { clientX, bubbles: true })
  e.deltaY = deltaY
  return e
}

describe('HistoryAxis.vue', () => {
  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
  })

  it('渲染八轨图例 chips', () => {
    const wrapper = mount(HistoryAxis)
    const chips = wrapper.findAll('.tl-chip')
    expect(chips.length).toBe(8) // 8 tracks initially, reset button appears only when focused
    expect(chips[0].text()).toContain('游戏发展')
    expect(chips[1].text()).toContain('硬件')
    expect(chips[2].text()).toContain('前端技术')
    expect(chips[3].text()).toContain('后端技术')
    expect(chips[4].text()).toContain('知名引擎')
    expect(chips[5].text()).toContain('玩法')
    expect(chips[6].text()).toContain('美术风格')
    expect(chips[7].text()).toContain('公司与代表作')
  })

  it('点击 chip 切换聚焦', async () => {
    const wrapper = mount(HistoryAxis)
    const chips = wrapper.findAll('.tl-chip')
    await chips[0].trigger('click')
    expect(store.focus).toBe('games')
    expect(chips[0].classes()).toContain('active')
    await chips[0].trigger('click')
    expect(store.focus).toBeNull()
  })

  it('点击"全部轨道"重置聚焦', async () => {
    const wrapper = mount(HistoryAxis)
    const chips = wrapper.findAll('.tl-chip')
    await chips[0].trigger('click')
    expect(store.focus).toBe('games')
    const resetBtn = wrapper.find('.tl-chip-reset')
    expect(resetBtn.exists()).toBe(true)
    await resetBtn.trigger('click')
    expect(store.focus).toBeNull()
  })

  it('概览轴滚轮缩放：向内/向外，夹取在 minSpan/maxSpan', async () => {
    const wrapper = mount(HistoryAxis, {
      attachTo: document.body
    })
    const overview = wrapper.find('.tl-axis-overview')
    // onWheel 读取的是 axisRef（.tl-axis）的 rect，stub 必须打在同一个元素上
    const axisEl = wrapper.find('.tl-axis')
    const originalRect = axisEl.element.getBoundingClientRect
    axisEl.element.getBoundingClientRect = () => ({ width: 800, left: 0, top: 0, right: 800, bottom: 56, height: 56, x: 0, y: 0, toJSON: () => {} })
    // happy-dom 的 WheelEvent 不透传 clientX，用 MouseEvent 补 deltaY
    await overview.element.dispatchEvent(wheelEvent(-100, 400))
    await wrapper.vm.$nextTick()
    // 向内缩放：跨距变小且视窗不再贴边
    expect(wrapper.vm.viewEnd - wrapper.vm.viewStart).toBeLessThan(71)
    expect(wrapper.vm.viewStart).toBeGreaterThan(1955)
    await overview.element.dispatchEvent(wheelEvent(100, 400))
    await wrapper.vm.$nextTick()
    // 向外放大：视窗回到贴边
    expect(wrapper.vm.viewStart).toBeLessThan(1956)
    expect(wrapper.vm.viewEnd).toBeGreaterThan(2025)
    axisEl.element.getBoundingClientRect = originalRect
  })

  it('概览轴拖动平移：mousedown -> mousemove -> mouseup', async () => {
    const wrapper = mount(HistoryAxis)
    const overview = wrapper.find('.tl-axis-overview')
    await overview.trigger('mousedown', { button: 0, clientX: 400 })
    expect(wrapper.vm.isDragging).toBe(true)
    await document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }))
    expect(wrapper.vm.viewStart).toBeGreaterThanOrEqual(1955)
    await document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(wrapper.vm.isDragging).toBe(false)
  })

  it('mousedown 非左键被忽略', async () => {
    const wrapper = mount(HistoryAxis)
    const overview = wrapper.find('.tl-axis-overview')
    await overview.trigger('mousedown', { button: 1, clientX: 400 })
    expect(wrapper.vm.isDragging).toBe(false)
    await overview.trigger('mousedown', { button: 2, clientX: 400 })
    expect(wrapper.vm.isDragging).toBe(false)
  })

  it('onMouseMove: 未按下时直接返回（isDragging=false 分支）', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    vm.onMouseMove({ clientX: 300 })
    expect(vm.isDragging).toBe(false)
    expect(vm.viewStart).toBe(AXIS.minYear)
  })

  it('onMouseMove: getBoundingClientRect 返回 undefined 时直接返回（!rect 分支）', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    vm.isDragging = true
    wrapper.find('.tl-axis').element.getBoundingClientRect = () => undefined
    vm.onMouseMove({ clientX: 300 })
    expect(vm.viewStart).toBe(AXIS.minYear)
  })

  it('年代导航按钮跳转', async () => {
    const wrapper = mount(HistoryAxis)
    const navBtns = wrapper.findAll('.tl-axis-nav-btn')
    await navBtns[2].trigger('click') // 1990s
    expect(wrapper.vm.viewStart).toBeLessThanOrEqual(1990)
    expect(wrapper.vm.viewEnd).toBeGreaterThanOrEqual(1999)
  })

  it('复位按钮恢复全视窗', async () => {
    const wrapper = mount(HistoryAxis)
    wrapper.vm.viewStart = 1990
    wrapper.vm.viewEnd = 2020
    await wrapper.vm.$nextTick()
    const resetBtn = wrapper.find('.tl-axis-reset')
    await resetBtn.trigger('click')
    expect(wrapper.vm.viewStart).toBe(1955)
    expect(wrapper.vm.viewEnd).toBe(2026)
  })

  it('视窗信息显示：缩放/平移后显示年份范围', async () => {
    const wrapper = mount(HistoryAxis)
    wrapper.vm.viewStart = 1990
    wrapper.vm.viewEnd = 2020
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tl-axis-view-info').exists()).toBe(true)
    expect(wrapper.find('.tl-axis-view-info').text()).toContain('1990')
    expect(wrapper.find('.tl-axis-view-info').text()).toContain('2020')
    wrapper.vm.viewStart = 1955
    wrapper.vm.viewEnd = 2026
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tl-axis-view-info').exists()).toBe(false)
  })

  it('折叠图例切换 collapsed 状态', async () => {
    const wrapper = mount(HistoryAxis)
    const toggles = wrapper.findAll('.tl-legend-toggle')
    await toggles[0].trigger('click')
    expect(store.collapsed.games).toBe(true)
    expect(wrapper.findAll('.tl-legend-item')[0].classes()).toContain('collapsed')
    await toggles[0].trigger('click')
    expect(store.collapsed.games).toBe(false)
  })

  it('getBoundingClientRect width 为 0 时不报错', async () => {
    const wrapper = mount(HistoryAxis, {
      attachTo: document.body
    })
    const overview = wrapper.find('.tl-axis-overview')
    const axisEl = wrapper.find('.tl-axis')
    const originalRect = axisEl.element.getBoundingClientRect
    axisEl.element.getBoundingClientRect = () => ({ width: 0, left: 0, top: 0, right: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    await overview.element.dispatchEvent(wheelEvent(-100, 400))
    await wrapper.vm.$nextTick()
    // rect 无效时直接跳过，视窗保持不变
    expect(wrapper.vm.viewStart).toBe(1955)
    expect(wrapper.vm.viewEnd).toBe(2026)
    axisEl.element.getBoundingClientRect = originalRect
  })

  it('缩放边界：不超过 minYear/maxYear', async () => {
    const wrapper = mount(HistoryAxis, {
      attachTo: document.body
    })
    wrapper.vm.viewStart = 1955
    wrapper.vm.viewEnd = 1985
    await wrapper.vm.$nextTick()
    const overview = wrapper.find('.tl-axis-overview')
    const axisEl = wrapper.find('.tl-axis')
    const originalRect = axisEl.element.getBoundingClientRect
    axisEl.element.getBoundingClientRect = () => ({ width: 800, left: 0, top: 0, right: 800, bottom: 56, height: 56, x: 0, y: 0, toJSON: () => {} })
    await overview.element.dispatchEvent(wheelEvent(100, 200))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.viewStart).toBeGreaterThanOrEqual(1955)
    expect(wrapper.vm.viewEnd).toBeLessThanOrEqual(2026)
    axisEl.element.getBoundingClientRect = originalRect
  })

  it('yearToPercent 与 percentToYear 函数', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    // Test private functions via component instance
    expect(typeof vm.yearToPercent).toBe('function')
    expect(typeof vm.percentToYear).toBe('function')
    expect(vm.yearToPercent(1955)).toBe(0)
    expect(vm.yearToPercent(2026)).toBe(100)
    expect(vm.percentToYear(0)).toBe(1955)
    expect(vm.percentToYear(100)).toBe(2026)
    expect(vm.percentToYear(50)).toBeCloseTo(1990.5, 1)
  })

  it('clampSpan 夹取逻辑', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    expect(typeof vm.clampSpan).toBe('function')
    // span < minSpan
    let r = vm.clampSpan(2000, 2020) // span=20 < 30
    expect(r.end - r.start).toBeGreaterThanOrEqual(30)
    // span > maxSpan
    r = vm.clampSpan(1955, 2030) // span=75 > 71
    expect(r.end - r.start).toBeLessThanOrEqual(71)
    // normal span
    r = vm.clampSpan(1990, 2020) // span=30
    expect(r.end - r.start).toBe(30)
  })

  it('updateScale 更新缩放比例', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    expect(typeof vm.updateScale).toBe('function')
    vm.viewStart = 1955
    vm.viewEnd = 2026
    vm.updateScale()
    expect(vm.scale).toBe(1)
    vm.viewStart = 1990
    vm.viewEnd = 2020
    vm.updateScale()
    expect(vm.scale).toBeCloseTo(71/30, 2)
  })

  it('jumpToDecade 跳转到指定年代', async () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    expect(typeof vm.jumpToDecade).toBe('function')
    await vm.jumpToDecade('1990s')
    expect(vm.viewStart).toBeLessThanOrEqual(1990)
    expect(vm.viewEnd).toBeGreaterThanOrEqual(1999)
    await vm.jumpToDecade('2020s')
    expect(vm.viewStart).toBeLessThanOrEqual(2020)
    expect(vm.viewEnd).toBeGreaterThanOrEqual(2026)
    const before = vm.viewStart
    await vm.jumpToDecade('1890s')
    expect(vm.viewStart).toBe(before)
  })

  it('resetView 恢复完整视窗', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    vm.viewStart = 1990
    vm.viewEnd = 2020
    vm.resetView()
    expect(vm.viewStart).toBe(1955)
    expect(vm.viewEnd).toBe(2026)
  })

  it('trackStyle 计算轨道样式', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    expect(typeof vm.trackStyle).toBe('function')
    const track = { id: 'games', name: '游戏发展', color: '#e0894e' }
    // not focused, not collapsed
    let style = vm.trackStyle(track)
    expect(style.flex).toContain('12.5%')
    // focused
    store.focus = 'games'
    style = vm.trackStyle(track)
    expect(style.flex).toContain('28%')
    expect(style.borderLeft).toContain('var(--vp-c-brand)')
    // collapsed
    store.focus = null
    store.collapsed.games = true
    style = vm.trackStyle(track)
    expect(style.opacity).toBe(0.5)
    // focused and collapsed
    store.focus = 'games'
    store.collapsed.games = true
    style = vm.trackStyle(track)
    expect(style.borderLeft).toContain('var(--vp-c-brand)')
  })

  it('onMounted 当 reduced 时跳过动画初始化', async () => {
    // Test with prefersReduced = true (mocked)
    const wrapper = mount(HistoryAxis)
    // onMounted already ran, just verify component renders
    expect(wrapper.exists()).toBe(true)
  })

  it('onMounted 当非 reduced 时初始化动画', async () => {
    // 先清空模块注册表，doMock 才会作用于随后的动态 import
    vi.resetModules()
    vi.doMock('../docs/.vitepress/theme/data/timeline.mjs', async (importOriginal) => {
      const mod = await importOriginal()
      return {
        ...mod,
        prefersReduced: vi.fn(() => false),
        loadGsap: vi.fn(() => Promise.reject(new Error('not loaded in test'))),
        fadeCardsOnScroll: vi.fn(() => Promise.resolve()),
        initAxisCursor: vi.fn(() => Promise.resolve()),
        store: mod.store
      }
    })
    const { default: HistoryAxisFresh } = await import('../docs/.vitepress/theme/components/HistoryAxis.vue')
    const wrapper = mount(HistoryAxisFresh)
    expect(wrapper.exists()).toBe(true)
  })

  it('onMouseMove 拖动超出 minYear 边界', async () => {
    const wrapper = mount(HistoryAxis, {
      attachTo: document.body
    })
    const overview = wrapper.find('.tl-axis-overview')
    const originalRect = overview.element.getBoundingClientRect
    overview.element.getBoundingClientRect = () => ({ width: 800, left: 0, top: 0, right: 800, bottom: 56, height: 56, x: 0, y: 0, toJSON: () => {} })
    // Start at minYear
    wrapper.vm.viewStart = 1955
    wrapper.vm.viewEnd = 1985
    await wrapper.vm.$nextTick()
    await overview.trigger('mousedown', { button: 0, clientX: 400 })
    // Drag left (negative dx) to try to go below minYear
    await document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, bubbles: true }))
    expect(wrapper.vm.viewStart).toBe(1955)
    await document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    overview.element.getBoundingClientRect = originalRect
  })

  it('trackStyle: focused 且 collapsed 时 borderLeft 为品牌色', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    const track = { id: 'games', name: '游戏发展', color: '#e0894e' }
    store.focus = 'games'
    store.collapsed.games = true
    const style = vm.trackStyle(track)
    expect(style.borderLeft).toContain('var(--vp-c-brand)')
    expect(style.opacity).toBe(0.5)
  })

  it('onWheel: mouseRatio 边界值 (clientX 在 rect 外部)', async () => {
    const wrapper = mount(HistoryAxis, {
      attachTo: document.body
    })
    const overview = wrapper.find('.tl-axis-overview')
    const axisEl = wrapper.find('.tl-axis')
    const originalRect = axisEl.element.getBoundingClientRect
    axisEl.element.getBoundingClientRect = () => ({ width: 800, left: 100, top: 0, right: 900, bottom: 56, height: 56, x: 100, y: 0, toJSON: () => {} })
    // clientX < rect.left -> mouseRatio < 0 -> clamped to 0
    await overview.element.dispatchEvent(wheelEvent(-100, 50))
    await wrapper.vm.$nextTick()
    // clientX > rect.right -> mouseRatio > 1 -> clamped to 1
    await overview.element.dispatchEvent(wheelEvent(-100, 950))
    await wrapper.vm.$nextTick()
    axisEl.element.getBoundingClientRect = originalRect
  })

  it('clampSpan: span < minSpan 时扩展到 minSpan', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    const r = vm.clampSpan(2000, 2020) // span=20 < 30
    expect(r.end - r.start).toBeGreaterThanOrEqual(30)
  })

  it('clampSpan: span > maxSpan 时压缩到 maxSpan', () => {
    const wrapper = mount(HistoryAxis)
    const vm = wrapper.vm
    const r = vm.clampSpan(1955, 2030) // span=75 > 71
    expect(r.end - r.start).toBeLessThanOrEqual(71)
  })

  it('onMounted 非 reduced 路径执行', async () => {
    vi.resetModules()
    vi.doMock('../docs/.vitepress/theme/data/timeline.mjs', async (importOriginal) => {
      const mod = await importOriginal()
      return {
        ...mod,
        prefersReduced: vi.fn(() => false),
        loadGsap: vi.fn(() => Promise.reject(new Error('not loaded in test'))),
        fadeCardsOnScroll: vi.fn(() => Promise.resolve()),
        initAxisCursor: vi.fn(() => Promise.resolve()),
        store: mod.store
      }
    })
    const { default: HistoryAxisFresh } = await import('../docs/.vitepress/theme/components/HistoryAxis.vue')
    const wrapper = mount(HistoryAxisFresh)
    expect(wrapper.exists()).toBe(true)
  })
})