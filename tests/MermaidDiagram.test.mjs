import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn()
  }
}))

import mermaid from 'mermaid'
import MermaidDiagram from '../docs/.vitepress/theme/components/MermaidDiagram.vue'

const CODE = 'graph TD; A-->B'

function containerEl(wrapper) {
  return wrapper.find('.mermaid-diagram').element
}

describe('MermaidDiagram', () => {
  let consoleError
  beforeEach(() => {
    vi.clearAllMocks()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => {
    consoleError.mockRestore()
  })

  it('挂载后初始化 mermaid（浅色主题）并渲染成功', async () => {
    mermaid.render.mockResolvedValue({ svg: '<svg>ok</svg>' })
    const wrapper = mount(MermaidDiagram, { props: { code: CODE, id: 'fixed-id' } })
    await flushPromises()

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    )
    expect(mermaid.render).toHaveBeenCalledWith('fixed-id', CODE)
    expect(containerEl(wrapper).innerHTML).toBe('<svg>ok</svg>')
  })

  it('document 处于 dark 模式时用 dark 主题初始化', async () => {
    document.documentElement.classList.add('dark')
    mermaid.render.mockResolvedValue({ svg: '<svg>dark</svg>' })
    const wrapper = mount(MermaidDiagram, { props: { code: CODE } })
    await flushPromises()

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    )
    expect(containerEl(wrapper).innerHTML).toBe('<svg>dark</svg>')
  })

  it('未传 id 时生成 mermaid- 前缀的随机 id', async () => {
    mermaid.render.mockResolvedValue({ svg: '<svg/>' })
    const wrapper = mount(MermaidDiagram, { props: { code: CODE } })
    await flushPromises()

    const [usedId] = mermaid.render.mock.calls[0]
    expect(usedId).toMatch(/^mermaid-[0-9a-z]{7}$/)
  })

  it('code 变化时 watch 触发重新渲染', async () => {
    mermaid.render.mockResolvedValue({ svg: '<svg>v1</svg>' })
    const wrapper = mount(MermaidDiagram, { props: { code: CODE } })
    await flushPromises()
    expect(containerEl(wrapper).innerHTML).toBe('<svg>v1</svg>')

    mermaid.render.mockResolvedValue({ svg: '<svg>v2</svg>' })
    await wrapper.setProps({ code: 'graph TD; C-->D' })
    await flushPromises()

    expect(mermaid.render).toHaveBeenLastCalledWith(
      expect.any(String),
      'graph TD; C-->D'
    )
    expect(containerEl(wrapper).innerHTML).toBe('<svg>v2</svg>')
  })

  it('渲染失败时容器显示错误占位', async () => {
    mermaid.render.mockRejectedValue(new Error('syntax error'))
    const wrapper = mount(MermaidDiagram, { props: { code: 'bad' } })
    await flushPromises()

    expect(containerEl(wrapper).innerHTML).toContain('mermaid-error')
    expect(containerEl(wrapper).innerHTML).toContain('syntax error')
    expect(consoleError).toHaveBeenCalled()
  })
})
