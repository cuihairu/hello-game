import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GamesLibrary from '../docs/.vitepress/theme/components/GamesLibrary.vue'
import { GAMES } from '../docs/.vitepress/theme/data/games.mjs'

const mountLib = () => mount(GamesLibrary)

const selectByIndex = async (wrapper, index, value) => {
  await wrapper.findAll('select')[index].setValue(value)
}

describe('GamesLibrary', () => {
  it('默认渲染全部条目，卡片带首字徽章与后端技术栏', () => {
    const wrapper = mountLib()
    const cards = wrapper.findAll('.lib-card')
    expect(cards).toHaveLength(GAMES.length)
    expect(cards[0].find('.lib-badge').text()).toBe(GAMES[0].name[0])
    expect(cards[0].findAll('.lib-tech-row')).toHaveLength(7)
    expect(wrapper.find('.lib-count').text()).toBe(`${GAMES.length} 款`)
    // 标签链接指向受控映射
    const firstTag = cards[0].find('.lib-tag')
    expect(firstTag.attributes('href')).toBeTruthy()
  })

  it('按玩法筛选：只保留命中类目的条目', async () => {
    const wrapper = mountLib()
    await selectByIndex(wrapper, 0, '卡牌构筑')
    const cards = wrapper.findAll('.lib-card')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.text()).toContain('回合制')
    }
  })

  it('按年代、平台、技术标签组合筛选', async () => {
    const wrapper = mountLib()
    await selectByIndex(wrapper, 1, '1990s')
    await selectByIndex(wrapper, 2, 'PC')
    await selectByIndex(wrapper, 3, '帧同步')
    const cards = wrapper.findAll('.lib-card')
    expect(cards.length).toBeGreaterThan(0)
    // 组合命中的应当只有 1990s 年代 + 平台含 PC + 带帧同步标签的条目
    const names = cards.map(c => c.find('.lib-name').text())
    for (const name of names) {
      const g = GAMES.find(x => x.name === name)
      expect(g.era).toBe('1990s')
      expect(g.platforms).toContain('PC')
      expect(g.tags).toContain('帧同步')
    }
  })

  it('无匹配时展示空态与重置按钮，重置后恢复全量', async () => {
    const wrapper = mountLib()
    await selectByIndex(wrapper, 0, '卡牌构筑')
    await selectByIndex(wrapper, 1, '1970s')
    expect(wrapper.find('.lib-empty').exists()).toBe(true)
    expect(wrapper.find('.lib-card').exists()).toBe(false)
    await wrapper.find('.lib-reset').trigger('click')
    expect(wrapper.find('.lib-empty').exists()).toBe(false)
    expect(wrapper.findAll('.lib-card')).toHaveLength(GAMES.length)
    // 四个筛选器都被重置为「全部」
    for (const select of wrapper.findAll('select')) {
      expect(select.element.value).toBe('全部')
    }
  })
})
