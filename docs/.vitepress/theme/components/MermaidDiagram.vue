<template>
  <div ref="container" class="mermaid-diagram"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import mermaid from 'mermaid'

const props = defineProps({
  code: { type: String, required: true },
  id: { type: String, default: () => `mermaid-${Math.random().toString(36).slice(2, 9)}` }
})

const container = ref(null)

onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--vp-font-family-base)'
  })
  await renderDiagram()
})

watch(() => props.code, async () => {
  await nextTick()
  await renderDiagram()
})

async function renderDiagram() {
  if (!container.value) return
  try {
    const { svg } = await mermaid.render(props.id, props.code)
    container.value.innerHTML = svg
  } catch (e) {
    console.error('Mermaid render error:', e)
    container.value.innerHTML = `<pre class="mermaid-error">Diagram Error: ${e.message}</pre>`
  }
}
</script>

<style scoped>
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
  overflow-x: auto;
}
.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto;
}
.mermaid-error {
  color: #c00;
  padding: 1rem;
  border: 1px solid #fcc;
  border-radius: 6px;
  background: #fff5f5;
}
</style>
