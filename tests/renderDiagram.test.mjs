import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderTo } from '../docs/.vitepress/theme/components/renderDiagram.js'

function mockMermaid() {
  return { render: vi.fn() }
}

describe('renderTo', () => {
  let consoleError
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('容器为 null 时直接返回，不触发渲染', async () => {
    const mm = mockMermaid()
    await renderTo(mm, null, 'id-1', 'graph TD; A-->B')
    expect(mm.render).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('渲染成功时把 SVG 写入容器', async () => {
    const mm = mockMermaid()
    mm.render.mockResolvedValue({ svg: '<svg>ok</svg>' })
    const el = document.createElement('div')
    await renderTo(mm, el, 'id-2', 'graph TD; A-->B')
    expect(mm.render).toHaveBeenCalledWith('id-2', 'graph TD; A-->B')
    expect(el.innerHTML).toBe('<svg>ok</svg>')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('渲染失败时输出错误信息到容器并记录 console.error', async () => {
    const mm = mockMermaid()
    mm.render.mockRejectedValue(new Error('boom'))
    const el = document.createElement('div')
    await renderTo(mm, el, 'id-3', 'bad syntax')
    expect(el.innerHTML).toBe(
      '<pre class="mermaid-error">Diagram Error: boom</pre>'
    )
    expect(consoleError).toHaveBeenCalledWith(
      'Mermaid render error:',
      expect.objectContaining({ message: 'boom' })
    )
  })
})
