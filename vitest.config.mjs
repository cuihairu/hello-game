import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'json-summary'],
      include: [
        'docs/.vitepress/config.mjs', // 纯静态配置对象（defineConfig 导出），无可执行分支/函数，覆盖率恒为 0%，纳入列表仅为完整性记录
        'docs/.vitepress/theme/index.js',
        'docs/.vitepress/theme/components/GamesLibrary.vue',
        'docs/.vitepress/theme/components/MermaidDiagram.vue',
        'docs/.vitepress/theme/components/ReadingProgress.vue',
        'docs/.vitepress/theme/components/renderDiagram.js',
        'docs/.vitepress/theme/data/games.mjs',
        'docs/.vitepress/theme/data/homepage.mjs'
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  }
})
