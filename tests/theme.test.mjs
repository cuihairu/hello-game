import { describe, it, expect, vi } from 'vitest'

const FakeDefaultTheme = vi.hoisted(() => ({ Layout: () => null }))
vi.mock('vitepress/theme', () => ({ default: FakeDefaultTheme }))
vi.mock('../docs/.vitepress/theme/components/MermaidDiagram.vue', () => ({
  default: { name: 'MermaidDiagram', render: () => null }
}))
vi.mock('../docs/.vitepress/theme/style.css', () => ({}))

import theme from '../docs/.vitepress/theme/index.js'

describe('theme', () => {
  it('继承默认主题', () => {
    expect(theme.extends).toBe(FakeDefaultTheme)
  })

  it('enhanceApp 全局注册 MermaidDiagram 组件', () => {
    const app = { component: vi.fn() }
    theme.enhanceApp({ app })
    expect(app.component).toHaveBeenCalledTimes(1)
    const [name, comp] = app.component.mock.calls[0]
    expect(name).toBe('MermaidDiagram')
    expect(comp.name).toBe('MermaidDiagram')
  })

  it('Layout 覆盖默认主题并把阅读进度条挂进 layout-bottom 插槽', () => {
    expect(typeof theme.Layout).toBe('function')
    const vnode = theme.Layout()
    // 仍然渲染默认主题的 Layout
    expect(vnode.type).toBe(FakeDefaultTheme.Layout)
    // layout-bottom 插槽里是 ReadingProgress 组件
    const slot = vnode.children?.['layout-bottom']
    expect(typeof slot).toBe('function')
    const child = slot()
    expect(child.type.__name ?? child.type.name).toBe('ReadingProgress')
  })
})
