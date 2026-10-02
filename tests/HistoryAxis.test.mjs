import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), from: vi.fn(() => 'tween'), fromTo: vi.fn(() => 'tween') } }))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }))

import HistoryAxis from '../docs/.vitepress/theme/components/HistoryAxis.vue'
import { store, TRACKS, SEGMENTS, AXIS } from '../docs/.vitepress/theme/data/timeline.mjs'
import { gsap } from 'gsap'

describe('HistoryAxis', () => {
  let wrapper

  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    store.focus = null
    delete window.matchMedia
  })

  it('渲染「全部轨道」+ 八轨 chips、六个年代导航、全部条目点', () => {
    wrapper = mount(HistoryAxis)
    expect(wrapper.findAll('.axis-chip').length).toBe(9)
    expect(wrapper.findAll('.axis-nav a').length).toBe(6)
    const totalItems = TRACKS.reduce((n, t) => n + t.items.length, 0)
    expect(wrapper.findAll('.axis-dot').length).toBe(totalItems)
    expect(wrapper.text()).toContain(`视窗 ${AXIS.minYear}–${AXIS.maxYear}`)
  })

  it('chip 点击聚焦轨、重复点击取消；「全部轨道」恢复', async () => {
    wrapper = mount(HistoryAxis)
    const chips = wrapper.findAll('.axis-chip')
    await chips[1].trigger('click')
    expect(store.focus).toBe('games')
    await chips[1].trigger('click')
    expect(store.focus).toBeNull()
    await chips[2].trigger('click')
    expect(store.focus).toBe('hardware')
    await chips[0].trigger('click')
    expect(store.focus).toBeNull()
  })

  it('滚轮缩放收窄视窗、条目点进出、视窗标签与复位按钮联动', async () => {
    wrapper = mount(HistoryAxis)
    const before = wrapper.findAll('.axis-dot').length
    await wrapper.find('.axis-bar').trigger('wheel', { deltaY: -100 })
    expect(wrapper.findAll('.axis-dot').length).toBeLessThan(before)
    expect(wrapper.text()).not.toContain(`视窗 ${AXIS.minYear}–${AXIS.maxYear}`)
    expect(wrapper.find('.axis-reset').exists()).toBe(true)
    // 复位
    await wrapper.find('.axis-reset').trigger('click')
    expect(wrapper.findAll('.axis-dot').length).toBe(before)
    expect(wrapper.find('.axis-reset').exists()).toBe(false)
  })

  it('滚轮向外缩放被 maxSpan 夹住，向内被 minSpan 夹住', async () => {
    wrapper = mount(HistoryAxis)
    // 初始 span 已是 maxSpan，继续向外夹住
    await wrapper.find('.axis-bar').trigger('wheel', { deltaY: 100 })
    expect(wrapper.text()).toContain(`视窗 ${AXIS.minYear}–${AXIS.maxYear}`)
    // 连续向内直到 minSpan
    for (let i = 0; i < 20; i++) await wrapper.find('.axis-bar').trigger('wheel', { deltaY: -100 })
    const m = wrapper.text().match(/视窗 (\d+)–(\d+)/)
    expect(m).toBeTruthy()
    expect(Number(m[2]) - Number(m[1])).toBe(AXIS.minSpan)
  })

  it('滚轮/拖动在轴宽可测时走指针比例分支', async () => {
    wrapper = mount(HistoryAxis)
    const axisEl = wrapper.find('.axis-bar').element
    Object.defineProperty(axisEl, 'clientWidth', { configurable: true, value: 1000 })
    await wrapper.find('.axis-bar').trigger('wheel', { deltaY: -100, offsetX: 800 })
    // 视窗收窄并围绕指针锚点从右侧收拢
    const m = wrapper.text().match(/视窗 (\d+)–(\d+)/)
    expect(Number(m[2]) - Number(m[1])).toBeLessThan(AXIS.maxSpan)
    await wrapper.find('.axis-bar').trigger('mousedown', { clientX: 500 })
    await wrapper.find('.axis-bar').trigger('mousemove', { clientX: 100 })
    expect(wrapper.text().match(/视窗 (\d+)–(\d+)/)).toBeTruthy()
  })

  it('拖动平移视窗；未按下的 mousemove 不生效', async () => {
    wrapper = mount(HistoryAxis)
    // 先缩放一下，留出平移空间
    await wrapper.find('.axis-bar').trigger('wheel', { deltaY: -100 })
    const label1 = wrapper.text().match(/视窗 (\d+)–(\d+)/)[0]
    await wrapper.find('.axis-bar').trigger('mousemove', { clientX: 100 })
    expect(wrapper.text()).toContain(label1)
    await wrapper.find('.axis-bar').trigger('mousedown', { clientX: 100 })
    await wrapper.find('.axis-bar').trigger('mousemove', { clientX: 10 })
    const label2 = wrapper.text().match(/视窗 (\d+)–(\d+)/)[0]
    expect(label2).not.toBe(label1)
    await wrapper.find('.axis-bar').trigger('mouseup')
    const label3 = wrapper.text().match(/视窗 (\d+)–(\d+)/)[0]
    await wrapper.find('.axis-bar').trigger('mousemove', { clientX: 500 })
    expect(wrapper.text()).toContain(label3)
  })

  it('axisEl 缺失时 wheel 锚点按 0.5 兜底，不抖动', async () => {
    wrapper = mount(HistoryAxis)
    wrapper.vm.axisEl = null
    await wrapper.find('.axis-bar').trigger('wheel', { deltaY: -100 })
    expect(wrapper.text()).not.toContain(`视窗 ${AXIS.minYear}–${AXIS.maxYear}`)
  })

  it('动画纪律：reduced 跳过；默认触发轴游标 scrub', async () => {
    window.matchMedia = () => ({ matches: true })
    wrapper = mount(HistoryAxis)
    await flushPromises()
    expect(gsap.fromTo).not.toHaveBeenCalled()
    wrapper.unmount()
    wrapper = null
    window.matchMedia = () => ({ matches: false })
    wrapper = mount(HistoryAxis)
    await flushPromises()
    expect(gsap.fromTo).toHaveBeenCalledTimes(1)
  })
})
