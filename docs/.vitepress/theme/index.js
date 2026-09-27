import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import MermaidDiagram from './components/MermaidDiagram.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // 阅读进度条：挂在布局最底部插槽，固定定位不占文档流
      'layout-bottom': () => h(ReadingProgress)
    })
  },
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram)
  }
}