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
        'docs/.vitepress/config.mjs',
        'docs/.vitepress/theme/index.js',
        'docs/.vitepress/theme/components/MermaidDiagram.vue',
        'docs/.vitepress/theme/components/renderDiagram.js'
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
