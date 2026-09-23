// Mermaid 渲染核心逻辑，从 MermaidDiagram.vue 提取为独立函数：
// 便于对 null 守卫、渲染成功、渲染失败三条路径分别做单元测试。
export async function renderTo(mermaid, containerEl, id, code) {
  if (!containerEl) return
  try {
    const { svg } = await mermaid.render(id, code)
    containerEl.innerHTML = svg
  } catch (e) {
    console.error('Mermaid render error:', e)
    containerEl.innerHTML = `<pre class="mermaid-error">Diagram Error: ${e.message}</pre>`
  }
}
