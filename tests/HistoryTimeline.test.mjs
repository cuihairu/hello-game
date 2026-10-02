import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), from: vi.fn(() => 'tween'), fromTo: vi.fn(() => 'tween') } }))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }))

import HistoryTimeline from '../docs/.vitepress/theme/components/HistoryTimeline.vue'
import { store, TRACKS } from '../docs/.vitepress/theme/data/timeline.mjs'
import { gsap } from 'gsap'

describe('HistoryTimeline（单年代切片，decade 必传）', () => {
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
    store.collapsed = {}
    delete window.matchMedia
  })

  function mountTimeline(decade = '1970s') {
    wrapper = mount(HistoryTimeline, { props: { decade } })
    return wrapper
  }

  it('按 decade 过滤条目：八列齐、卡片渲染三硬字段标签', () => {
    const w = mountTimeline()
    expect(w.findAll('.tl-col').length).toBe(8)
    expect(w.findAll('.tl-col-btn').length).toBe(8)
    const card = w.find('.tl-card')
    expect(card.text()).toContain('硬件背景')
    expect(card.text()).toContain('解决了什么')
    expect(card.text()).toContain('弊端')
  })

  it('年份不一的条目标「约」；公司轨公司卡片渲染代表作列表', () => {
    const w = mountTimeline()
    const years = w.findAll('.tl-card-year').map((n) => n.text())
    expect(years.some((y) => y.startsWith('约'))).toBe(true)
    const companyCol = w.find('[data-track="company"]')
    expect(companyCol.find('.tl-card-works').exists()).toBe(true)
  })

  it('互链徽标渲染为带 title 的 ← → 条', () => {
    const w = mountTimeline('2000s')
    const link = w.find('.tl-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('title')).toContain('·')
  })

  it('聚焦单轨：他轨只留互链关联条目并标「关联」；无互链条目隐藏', async () => {
    const w = mountTimeline('2010s')
    const before = w.findAll('.tl-card').length
    store.focus = 'hardware'
    await w.vm.$nextTick()
    const after = w.findAll('.tl-card').length
    expect(after).toBeLessThan(before)
    // 与 hw-2007-iphone in 互链的 ga-2016-pogo 保留并标「关联」
    expect(w.text()).toContain('Pokémon GO')
    // 与硬件无互链的 gp-2017-battleroyale 需求方隐藏
    expect(w.text()).not.toContain('大逃杀与赛季通行证')
    expect(w.findAll('.tl-card.is-related').length).toBeGreaterThan(0)
  })

  it('折叠按轨收起卡片、保留列头；全折叠后八列头仍在', async () => {
    const w = mountTimeline()
    const first = w.find('.tl-col')
    const btn = first.find('.tl-col-btn')
    await btn.trigger('click')
    expect(first.findAll('.tl-card').length).toBe(0)
    expect(first.find('.tl-col-name').exists()).toBe(true)
    expect(first.classes()).toContain('is-collapsed')
    await first.find('.tl-col-btn').trigger('click')
    expect(first.findAll('.tl-card').length).toBeGreaterThan(0)
    for (const b of w.findAll('.tl-col-btn')) await b.trigger('click')
    expect(w.findAll('.tl-card').length).toBe(0)
    expect(w.findAll('.tl-col-btn').length).toBe(8)
    expect(w.findAll('.tl-col').length).toBe(8)
  })

  it('reduced-motion 下跳过动画，gsap.from 不调用', async () => {
    window.matchMedia = () => ({ matches: true })
    mountTimeline()
    await flushPromises()
    expect(gsap.from).not.toHaveBeenCalled()
  })

  it('非 reduced 时随滚动动画被触发', async () => {
    window.matchMedia = () => ({ matches: false })
    mountTimeline()
    await flushPromises()
    expect(gsap.registerPlugin).toHaveBeenCalled()
    expect(gsap.from).toHaveBeenCalledTimes(1)
  })
})
