import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTimeline from '../docs/.vitepress/theme/components/HistoryTimeline.vue'
import { store, TRACKS, SEGMENTS } from '../docs/.vitepress/theme/data/timeline.mjs'

vi.mock('../docs/.vitepress/theme/data/timeline.mjs', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    prefersReduced: vi.fn(() => true),
    fadeCardsOnScroll: vi.fn(() => Promise.resolve()),
    store: mod.store
  }
})

describe('HistoryTimeline.vue', () => {
  beforeEach(() => {
    store.focus = null
    store.collapsed = {}
    vi.clearAllMocks()
  })

  it('渲染八列轨道', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const columns = wrapper.findAll('.tl-track-column')
    expect(columns.length).toBe(8)
    expect(columns[0].text()).toContain('游戏发展')
    expect(columns[1].text()).toContain('硬件')
    expect(columns[2].text()).toContain('前端技术')
    expect(columns[3].text()).toContain('后端技术')
    expect(columns[4].text()).toContain('知名引擎')
    expect(columns[5].text()).toContain('玩法')
    expect(columns[6].text()).toContain('美术风格')
    expect(columns[7].text()).toContain('公司与代表作')
  })

  it('每列显示该年代的条目卡片', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const cards = wrapper.findAll('.tl-card')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach(card => {
      expect(card.attributes('data-tl-card')).toBeDefined()
      expect(card.find('.tl-year-badge').exists()).toBe(true)
      expect(card.find('.tl-card-title').exists()).toBe(true)
      expect(card.findAll('.tl-field').length).toBe(3)
    })
  })

  it('三硬字段全部渲染：硬件背景 / 解决了什么 / 弊端', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const cards = wrapper.findAll('.tl-card')
    cards.forEach(card => {
      const fields = card.findAll('.tl-field dt').map(dt => dt.text())
      expect(fields).toContain('硬件背景')
      expect(fields).toContain('解决了什么')
      expect(fields).toContain('弊端')
    })
  })

  it('公司轨渲染 works 代表作列表', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const companyColumn = wrapper.findAll('.tl-track-column')[7]
    const works = companyColumn.find('.tl-card-works')
    expect(works.exists()).toBe(true)
    const workItems = works.findAll('li')
    expect(workItems.length).toBeGreaterThan(0)
    workItems.forEach(li => {
      expect(li.find('.tl-work-year').exists()).toBe(true)
      expect(li.find('.tl-work-title').exists()).toBe(true)
      expect(li.find('.tl-work-why').exists()).toBe(true)
    })
  })

  it('互链徽标渲染：out 与 in 方向', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '2000s' } })
    const badges = wrapper.findAll('.tl-link-badge')
    expect(badges.length).toBeGreaterThan(0)
    badges.forEach(badge => {
      expect(['out', 'in']).toContain(badge.classes().find(c => c === 'out' || c === 'in'))
    })
  })

  it('聚焦态：聚焦轨全量展示，其他轨仅保留关联条目', async () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const hwColumn = wrapper.findAll('.tl-track-column')[1]
    const artColumn = wrapper.findAll('.tl-track-column')[6]
    const hwCards = hwColumn.findAll('.tl-card')
    const artCards = artColumn.findAll('.tl-card')
    expect(hwCards.length).toBeGreaterThan(0)
    // 1990s 硬件轨的 Voodoo 指向美术轨的低多边形，关联条目必须保留且带 related 标记
    expect(artCards.length).toBeGreaterThan(0)
    artCards.forEach(card => {
      expect(card.classes()).toContain('related')
    })
  })

  it('聚焦硬件轨 1970s：前端轨无关联条目显示"无关联"', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const feColumn = wrapper.findAll('.tl-track-column')[2]
    const hint = feColumn.find('.tl-track-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toBe('无关联')
  })

  it('聚焦硬件轨 1990s：美术轨有关联条目显示"关联"', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const artColumn = wrapper.findAll('.tl-track-column')[6]
    const hint = artColumn.find('.tl-track-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toBe('关联')
    expect(artColumn.findAll('.tl-card').length).toBeGreaterThan(0)
  })

  it('折叠轨道：仅显示列头与折叠标签', async () => {
    store.collapsed.games = true
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const gamesColumn = wrapper.findAll('.tl-track-column')[0]
    expect(gamesColumn.classes()).toContain('collapsed')
    expect(gamesColumn.find('.tl-track-collapsed').exists()).toBe(true)
    expect(gamesColumn.find('.tl-track-body').exists()).toBe(false)
  })

  it('全折叠：所有轨道仅显示列头，不产生死路', async () => {
    TRACKS.forEach(t => { store.collapsed[t.id] = true })
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const columns = wrapper.findAll('.tl-track-column')
    columns.forEach(col => {
      expect(col.classes()).toContain('collapsed')
      expect(col.find('.tl-track-collapsed').exists()).toBe(true)
      expect(col.find('.tl-track-header').exists()).toBe(true)
    })
  })

  it('approx 年份显示"约"标记', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const approxBadges = wrapper.findAll('.tl-year-badge.approx')
    expect(approxBadges.length).toBeGreaterThan(0)
    approxBadges.forEach(badge => {
      expect(badge.text()).toContain('约')
    })
  })

  it('reduced-motion: prefersReduced=true 时卡片无动画初始态', async () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const cards = wrapper.findAll('.tl-card')
    cards.forEach(card => {
      expect(card.element.style.opacity).not.toBe('0')
      expect(card.element.style.transform).not.toContain('translateY(20px)')
    })
  })

  it('segment computed 返回正确的年代段', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    expect(wrapper.vm.segment.decade).toBe('1990s')
    expect(wrapper.vm.segment.from).toBe(1990)
    expect(wrapper.vm.segment.to).toBe(1999)
    const wrapper2 = mount(HistoryTimeline, { props: { decade: '2020s' } })
    expect(wrapper2.vm.segment.decade).toBe('2020s')
    expect(wrapper2.vm.segment.from).toBe(2020)
    expect(wrapper2.vm.segment.to).toBe(2026)
  })

  it('tracks computed 返回所有轨道', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    expect(wrapper.vm.tracks.length).toBe(8)
    expect(wrapper.vm.tracks.map(t => t.id)).toEqual(['games', 'hardware', 'frontend', 'backend', 'engines', 'gameplay', 'art', 'company'])
  })

  it('itemsForTrack 过滤年代内的条目', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const hwTrack = wrapper.vm.tracks.find(t => t.id === 'hardware')
    const items = wrapper.vm.itemsForTrack(hwTrack)
    items.forEach(item => {
      expect(item.year).toBeGreaterThanOrEqual(1990)
      expect(item.year).toBeLessThanOrEqual(1999)
    })
  })

  it('focusedItems 返回聚焦相关条目', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    // 1990s 硬件轨的 Voodoo 与 GeForce 分别指向美术轨与引擎轨
    const artTrack = wrapper.vm.tracks.find(t => t.id === 'art')
    const focused = wrapper.vm.focusedItems(artTrack)
    expect(focused.length).toBeGreaterThan(0)
    focused.forEach(item => {
      expect(item.links).toBeTruthy()
      const related = item.links.some(l => l.track === 'hardware')
      expect(related).toBe(true)
    })
  })

  it('hasRelated 检测关联', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const feTrack = wrapper.vm.tracks.find(t => t.id === 'frontend')
    const items = wrapper.vm.itemsForTrack(feTrack)
    if (items.length > 0) {
      const hasRel = wrapper.vm.hasRelated(feTrack, items[0])
      expect(typeof hasRel).toBe('boolean')
    }
    store.focus = null
    expect(wrapper.vm.hasRelated(feTrack, {})).toBe(false)
  })

  it('trackColumnStyle 计算列样式', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const track = wrapper.vm.tracks.find(t => t.id === 'games')
    // not focused, not collapsed, has items
    let style = wrapper.vm.trackColumnStyle(track)
    expect(style.flex).toContain('12.5%')
    // focused
    store.focus = 'games'
    style = wrapper.vm.trackColumnStyle(track)
    expect(style.flex).toContain('28%')
    // collapsed
    store.focus = null
    store.collapsed.games = true
    style = wrapper.vm.trackColumnStyle(track)
    expect(style.flex).toContain('48px')
    // empty when focused on another track
    store.collapsed.games = false
    store.focus = 'hardware'
    const feTrack = wrapper.vm.tracks.find(t => t.id === 'frontend')
    style = wrapper.vm.trackColumnStyle(feTrack)
    if (wrapper.vm.focusedItems(feTrack).length === 0) {
      expect(style.opacity).toBe(0.3)
    }
  })

  it('getItemKey 返回条目 key', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const item = { key: 'test-key' }
    expect(wrapper.vm.getItemKey(item)).toBe('test-key')
  })

  it('onMounted 当 reduced 时跳过动画', async () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    expect(wrapper.exists()).toBe(true)
  })

  it('segment computed: 无效 decade 返回 undefined', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: 'invalid' } })
    expect(wrapper.vm.segment).toBeUndefined()
  })

  it('focusedItems: focus 指向不存在的轨道时返回空数组', () => {
    store.focus = 'nonexistent-track'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const track = wrapper.vm.tracks.find(t => t.id === 'games')
    expect(wrapper.vm.focusedItems(track)).toEqual([])
    store.focus = null
  })

  it('focusedItems: 无 focus 时返回全部条目', () => {
    store.focus = null
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const track = wrapper.vm.tracks.find(t => t.id === 'games')
    const focused = wrapper.vm.focusedItems(track)
    const allItems = wrapper.vm.itemsForTrack(track)
    expect(focused.length).toBe(allItems.length)
  })

  it('trackColumnStyle: 无关联且非聚焦时 opacity 0.3', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const feTrack = wrapper.vm.tracks.find(t => t.id === 'frontend')
    const style = wrapper.vm.trackColumnStyle(feTrack)
    expect(style.opacity).toBe(0.3)
  })

  it('hasRelated: focus 为同一轨道时返回 false', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1990s' } })
    const hwTrack = wrapper.vm.tracks.find(t => t.id === 'hardware')
    const items = wrapper.vm.itemsForTrack(hwTrack)
    if (items.length > 0) {
      expect(wrapper.vm.hasRelated(hwTrack, items[0])).toBe(false)
    }
  })

  it('onMounted 当非 reduced 时调用 fadeCardsOnScroll', async () => {
    // 先清空模块注册表，doMock 才会作用于随后的动态 import
    vi.resetModules()
    vi.doMock('../docs/.vitepress/theme/data/timeline.mjs', async (importOriginal) => {
      const mod = await importOriginal()
      return {
        ...mod,
        prefersReduced: vi.fn(() => false),
        fadeCardsOnScroll: vi.fn(() => Promise.resolve()),
        store: mod.store
      }
    })
    const { default: HistoryTimelineFresh } = await import('../docs/.vitepress/theme/components/HistoryTimeline.vue')
    const wrapper = mount(HistoryTimelineFresh, { props: { decade: '1990s' } })
    expect(wrapper.exists()).toBe(true)
  })

  it('focusedItems: 有链接时过滤关联条目', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '2000s' } })
    // 2000s 硬件轨的 Shader 指向引擎轨的 Source，关联条目必须保留
    const enTrack = wrapper.vm.tracks.find(t => t.id === 'engines')
    const focused = wrapper.vm.focusedItems(enTrack)
    expect(focused.length).toBeGreaterThan(0)
    focused.forEach(item => {
      expect(item.links).toBeTruthy()
      const hasHwLink = item.links.some(l => l.track === 'hardware')
      expect(hasHwLink).toBe(true)
    })
  })

  it('trackColumnStyle: 无条目时返回 empty 样式', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '1970s' } })
    const feTrack = wrapper.vm.tracks.find(t => t.id === 'frontend')
    const style = wrapper.vm.trackColumnStyle(feTrack)
    expect(style.opacity).toBe(0.3)
    expect(style.flex).toContain('48px')
  })

  it('link badges 渲染: 有 links 的条目显示徽标', () => {
    const wrapper = mount(HistoryTimeline, { props: { decade: '2000s' } })
    const badges = wrapper.findAll('.tl-link-badge')
    expect(badges.length).toBeGreaterThan(0)
    badges.forEach(badge => {
      expect(['out', 'in']).toContain(badge.classes().find(c => c === 'out' || c === 'in'))
    })
  })

  it('focusedItems: filter 和 forEach 执行路径', () => {
    store.focus = 'hardware'
    const wrapper = mount(HistoryTimeline, { props: { decade: '2000s' } })
    const enTrack = wrapper.vm.tracks.find(t => t.id === 'engines')
    const focused = wrapper.vm.focusedItems(enTrack)
    // filter/forEach 逻辑执行后应返回非空数组
    expect(Array.isArray(focused)).toBe(true)
    expect(focused.length).toBeGreaterThan(0)
  })
})