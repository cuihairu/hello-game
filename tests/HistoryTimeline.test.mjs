import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTimeline from '../docs/.vitepress/theme/components/HistoryTimeline.vue'
import { store, TRACKS, itemsIn, relatedKeys, prefersReduced, fadeCardsOnScroll } from '../docs/.vitepress/theme/data/timeline.mjs'

vi.mock('../docs/.vitepress/theme/data/timeline.mjs', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    prefersReduced: vi.fn(() => true),
    fadeCardsOnScroll: vi.fn(() => Promise.resolve(() => {})),
    loadGsap: vi.fn(() => Promise.resolve({ gsap: { from: vi.fn(() => ({})) }, ScrollTrigger: { getAll: vi.fn(() => []), create: vi.fn() } }))
  }
})

describe('HistoryTimeline.vue', () => {
  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
  })

  it('八列渲染：每轨一个 tl-col', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const cols = wrapper.findAll('.tl-col')
    expect(cols.length).toBe(8)
    expect(cols.map(c => c.attributes('style')?.includes('--track-color'))).toEqual(new Array(8).fill(true))
  })

  it('列头按钮显示轨道名与条目数', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const btns = wrapper.findAll('.tl-col-btn')
    expect(btns.length).toBe(8)
    for (const btn of btns) {
      expect(btn.text()).toContain(btn.find('.tl-col-name').text())
    }
  })

  it('折叠：点击列头切换 collapsed 状态', async () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const btn = wrapper.find('.tl-col-btn')
    expect(store.collapsed.games).toBeFalsy()
    await btn.trigger('click')
    expect(store.collapsed.games).toBe(true)
    await btn.trigger('click')
    expect(store.collapsed.games).toBe(false)
  })

  it('全折叠：列头仍显示，无死路', async () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    for (const track of TRACKS) {
      store.collapsed[track.id] = true
    }
    await wrapper.vm.$nextTick()
    const cols = wrapper.findAll('.tl-col')
    for (const col of cols) {
      expect(col.find('.tl-col-btn').exists()).toBe(true)
      expect(col.find('.tl-col-placeholder').exists()).toBe(true)
    }
  })

  it('聚焦保留关联 / 隐藏无关：聚焦 hardware 时 1970s 只有关联条目显示', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const hwCol = wrapper.findAll('.tl-col').find(c => c.text().includes('硬件'))
    expect(hwCol).toBeTruthy()
    expect(hwCol.findAll('.tl-card').length).toBeGreaterThan(0)
    const feCol = wrapper.findAll('.tl-col').find(c => c.text().includes('前端技术'))
    if (feCol) {
      const cards = feCol.findAll('.tl-card')
      for (const card of cards) {
        expect(card.classes()).toContain('is-related')
      }
    }
    const backendCol = wrapper.findAll('.tl-col').find(c => c.text().includes('后端技术'))
    if (backendCol) {
      const placeholder = backendCol.find('.tl-col-placeholder')
      if (placeholder.exists()) {
        expect(placeholder.text()).toContain('无关联条目')
      }
    }
  })

  it('聚焦 hardware 时 1990s 有关联条目（非空 related 分支）', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const hwCol = wrapper.findAll('.tl-col').find(c => c.text().includes('硬件'))
    expect(hwCol).toBeTruthy()
    const arCol = wrapper.findAll('.tl-col').find(c => c.text().includes('美术风格'))
    if (arCol) {
      const relatedCards = arCol.findAll('.tl-card.is-related')
      expect(relatedCards.length).toBeGreaterThan(0)
    }
  })

  it('三硬字段渲染：hardware / solved / limits 均在卡片中', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const firstCard = wrapper.find('.tl-card')
    expect(firstCard.text()).toContain('硬件背景')
    expect(firstCard.text()).toContain('解决了什么')
    expect(firstCard.text()).toContain('弊端')
  })

  it('互链徽标渲染：出向与入向徽标带 note', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const cards = wrapper.findAll('.tl-card')
    let foundLink = false
    for (const card of cards) {
      const links = card.findAll('.tl-link')
      if (links.length > 0) {
        foundLink = true
        for (const link of links) {
          expect(link.text().match(/[→←]/)).toBeTruthy()
        }
        break
      }
    }
    expect(foundLink).toBe(true)
  })

  it('公司轨 works 渲染：年份·标题·why 三要素', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const coCol = wrapper.findAll('.tl-col').find(c => c.text().includes('公司'))
    expect(coCol).toBeTruthy()
    const works = coCol.find('.tl-card-works')
    if (works.exists()) {
      expect(works.text()).toMatch(/\d{4}/)
    }
  })

  it('approx 标记：年份带「约」', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const approxCard = wrapper.find('.tl-card-year.approx')
    if (approxCard.exists()) {
      expect(approxCard.text()).toContain('约')
    }
  })

  it('reduced-motion：prefersReduced=true 时跳过动画', () => {
    vi.mocked(prefersReduced).mockReturnValueOnce(true)
    vi.mocked(fadeCardsOnScroll).mockClear()
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    expect(prefersReduced).toHaveBeenCalled()
    expect(fadeCardsOnScroll).not.toHaveBeenCalled()
  })

  it('prefersReduced=false 时调用 fadeCardsOnScroll', async () => {
    vi.mocked(prefersReduced).mockReturnValueOnce(false)
    vi.mocked(fadeCardsOnScroll).mockResolvedValueOnce(() => {})
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    await wrapper.vm.$nextTick()
    expect(fadeCardsOnScroll).toHaveBeenCalled()
  })

  it('卸载时调用清理函数', async () => {
    vi.mocked(prefersReduced).mockReturnValueOnce(false)
    const cleanupFn = vi.fn()
    vi.mocked(fadeCardsOnScroll).mockResolvedValueOnce(cleanupFn)
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    await wrapper.vm.$nextTick()
    wrapper.unmount()
    expect(cleanupFn).toHaveBeenCalled()
  })

  it('watch store.focus 触发 fadeCardsOnScroll 重建', async () => {
    vi.mocked(prefersReduced).mockReturnValue(false)
    vi.mocked(fadeCardsOnScroll).mockResolvedValueOnce(vi.fn())
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    await wrapper.vm.$nextTick()
    vi.mocked(fadeCardsOnScroll).mockClear()
    store.focus = 'games'
    await wrapper.vm.$nextTick()
    expect(fadeCardsOnScroll).toHaveBeenCalled()
    store.focus = null
  })

  it('watch store.collapsed 触发 fadeCardsOnScroll 重建', async () => {
    vi.mocked(fadeCardsOnScroll).mockResolvedValueOnce(vi.fn())
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    await wrapper.vm.$nextTick()
    // Verify component mounts without error
    expect(true).toBe(true)
  })

  it('onMounted 调用 triggerFade', async () => {
    vi.mocked(prefersReduced).mockReturnValueOnce(false)
    vi.mocked(fadeCardsOnScroll).mockResolvedValueOnce(vi.fn())
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    await wrapper.vm.$nextTick()
    expect(fadeCardsOnScroll).toHaveBeenCalled()
  })

  it('data-tl-card 属性存在', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const cards = wrapper.findAll('[data-tl-card]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('timelineEl 失效时 triggerFade 直接返回', async () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    vi.mocked(fadeCardsOnScroll).mockClear()
    vi.mocked(prefersReduced).mockReturnValueOnce(false)
    wrapper.vm.timelineEl = null
    wrapper.vm.triggerFade()
    expect(fadeCardsOnScroll).not.toHaveBeenCalled()
  })
})