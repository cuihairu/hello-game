<template>
  <div ref="bar" class="reading-progress" aria-hidden="true"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const bar = ref(null)
let raf = 0

function update() {
  raf = 0
  if (!bar.value) return
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  const ratio = max > 0 ? doc.scrollTop / max : 0
  bar.value.style.width = `${(ratio * 100).toFixed(2)}%`
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(update)
}

onMounted(() => {
  // 首帧校准：异步路由内容就绪后尺寸才稳定
  requestAnimationFrame(update)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style scoped>
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  z-index: 100;
  pointer-events: none;
  /* 阅读进度的品牌色：Mintlify 绿 × 站内森林/陶土混合，深浅模式下都保持醒目 */
  background: linear-gradient(90deg, var(--mb-progress-1, #2c8f6f), var(--mb-progress-2, #b8860b));
  transition: width 0.15s linear;
}

/* 弱化轨道：整行 3px 浅色，填充覆盖其上 */
.reading-progress::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--mb-progress-track, rgba(122, 78, 32, 0.12));
  z-index: -1;
}
</style>