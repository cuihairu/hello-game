<template>
  <section class="tl-axis" ref="axisEl">
    <div class="tl-legend">
      <span class="tl-legend-label">轨道：</span>
      <button
        v-for="track in tracks"
        :key="track.id"
        class="tl-chip"
        :class="{ 'is-active': store.focus === track.id, 'is-focused-other': store.focus && store.focus !== track.id }"
        :style="{ borderColor: track.color, color: track.color }"
        @click="toggleFocus(track.id)"
        :aria-pressed="store.focus === track.id"
        :title="store.focus === track.id ? '取消聚焦' : '聚焦该轨道'"
      >
        {{ track.name }}
      </button>
      <button
        v-if="store.focus"
        class="tl-chip tl-chip-reset"
        @click="toggleFocus(null)"
        :title="'显示全部轨道'"
      >
        全部轨道
      </button>
    </div>

    <div class="tl-overview" ref="overviewEl">
      <div class="tl-scale" ref="scaleEl">
        <span class="tl-scale-start">1955</span>
        <span class="tl-scale-end">2026</span>
      </div>
      <div class="tl-track-bar">
        <div class="tl-cursor" ref="cursorEl" :style="{ transform: `translateX(${cursorProgress * 100}%)` }"></div>
        <div class="tl-decade-marks">
          <button
            v-for="seg in segments"
            :key="seg.id"
            class="tl-decade-btn"
            :style="{ left: `${((seg.from - 1955) / 71) * 100}%` }"
            @click="jumpToDecade(seg.id)"
            :title="seg.title"
          >
            {{ seg.decade }}
          </button>
        </div>
      </div>
    </div>

    <div class="tl-controls">
      <div class="tl-zoom">
        <button class="tl-btn" @click="zoom(-1)" :disabled="viewSpan <= AXIS.minSpan" :title="viewSpan <= AXIS.minSpan ? '已达最小跨度' : '缩小时间跨度'">−</button>
        <span class="tl-span">{{ viewStart }} – {{ viewEnd }} <span class="tl-span-unit">（跨度 {{ viewSpan }} 年）</span></span>
        <button class="tl-btn" @click="zoom(1)" :disabled="viewSpan >= AXIS.maxSpan" :title="viewSpan >= AXIS.maxSpan ? '已达最大跨度' : '放大时间跨度'">+</button>
      </div>
      <div class="tl-nav">
        <button
          v-for="seg in segments"
          :key="seg.id"
          class="tl-nav-btn"
          @click="jumpToDecade(seg.id)"
          :class="{ 'is-active': activeDecade === seg.id }"
        >
          {{ seg.decade }}
        </button>
      </div>
      <button class="tl-btn tl-btn-reset" @click="resetView" :disabled="viewStart === AXIS.minYear && viewEnd === AXIS.maxYear">
        复位
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store, segments, AXIS, TRACKS, toggleFocus, loadGsap, initAxisCursor, prefersReduced } from '../data/timeline'

const axisEl = ref(null)
const overviewEl = ref(null)
const scaleEl = ref(null)
const cursorEl = ref(null)

const tracks = TRACKS
const cursorProgress = ref(0)
const viewStart = ref(AXIS.minYear)
const viewEnd = ref(AXIS.maxYear)
const activeDecade = ref('s-1970s')
let scrollHandler = null
let cleanupCursor = null
let isDragging = false
let dragStartX = 0
/* v8 ignore next */
let dragStartViewStart = 0

const viewSpan = computed(() => viewEnd.value - viewStart.value)

function clampView() {
  const span = viewSpan.value
  if (viewStart.value < AXIS.minYear) {
    viewStart.value = AXIS.minYear
    viewEnd.value = AXIS.minYear + span
  }
  if (viewEnd.value > AXIS.maxYear) {
    viewEnd.value = AXIS.maxYear
    viewStart.value = AXIS.maxYear - span
  }
}

function zoom(dir) {
  const span = viewSpan.value
  const newSpan = Math.min(AXIS.maxSpan, Math.max(AXIS.minSpan, span + dir * 5))
  const center = viewStart.value + span / 2
  viewStart.value = Math.round(center - newSpan / 2)
  viewEnd.value = viewStart.value + newSpan
  clampView()
  emitCursorUpdate()
}

function jumpToDecade(segId) {
  const seg = segments.find(s => s.id === segId)
  if (!seg) return
  const span = viewSpan.value
  const targetCenter = (seg.from + seg.to) / 2
  viewStart.value = Math.round(targetCenter - span / 2)
  viewEnd.value = viewStart.value + span
  clampView()
  activeDecade.value = segId
  emitCursorUpdate()
}

function resetView() {
  viewStart.value = AXIS.minYear
  viewEnd.value = AXIS.maxYear
  activeDecade.value = 's-1970s'
  emitCursorUpdate()
}

function emitCursorUpdate() {
  const totalSpan = AXIS.maxYear - AXIS.minYear
  cursorProgress.value = (viewStart.value - AXIS.minYear + viewSpan.value / 2) / totalSpan
}

function onWheel(e) {
  if (!overviewEl.value) return
  e.preventDefault()
  const rect = overviewEl.value.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  const span = viewSpan.value
  const newSpan = Math.min(AXIS.maxSpan, Math.max(AXIS.minSpan, span - e.deltaY * 0.5))
  const center = viewStart.value + span * ratio
  viewStart.value = Math.round(center - newSpan * ratio)
  viewEnd.value = viewStart.value + newSpan
  clampView()
  emitCursorUpdate()
}

function onMouseDown(e) {
  if (e.button !== 0) return
  isDragging = true
  dragStartX = e.clientX
  dragStartViewStart = viewStart.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  overviewEl.value?.classList.add('is-dragging')
}

function onMouseMove(e) {
  if (!isDragging) return
  const rect = overviewEl.value?.getBoundingClientRect()
  if (!rect) return
  const dx = e.clientX - dragStartX
  const totalSpan = AXIS.maxYear - AXIS.minYear
  const yearPerPx = totalSpan / rect.width
  const deltaYears = Math.round(dx * yearPerPx)
  viewStart.value = dragStartViewStart - deltaYears
  viewEnd.value = viewStart.value + viewSpan.value
  clampView()
  emitCursorUpdate()
}

function onMouseUp() {
  isDragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  overviewEl.value?.classList.remove('is-dragging')
}

function updateActiveDecade() {
  const center = viewStart.value + viewSpan.value / 2
  for (const seg of segments) {
    if (center >= seg.from && center <= seg.to) {
      activeDecade.value = seg.id
      break
    }
  }
}

watch(() => store.focus, () => {
  nextTick(() => {
    if (cleanupCursor) cleanupCursor()
    cleanupCursor = null
    if (axisEl.value && timelineEl) {
      /* v8 ignore next */
      initAxisCursor(axisEl.value, timelineEl).then(fn => { cleanupCursor = fn })
    }
  })
})

import { nextTick } from 'vue'

onMounted(async () => {
  if (prefersReduced()) return
  const { gsap, ScrollTrigger } = await loadGsap()
  ScrollTrigger.create({
    trigger: '.tl-timeline-wrapper',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => {
      /* v8 ignore next */
      cursorProgress.value = self.progress
    }
  })
  if (axisEl.value && timelineEl) {
    /* v8 ignore next */
    cleanupCursor = await initAxisCursor(axisEl.value, timelineEl)
  }
  overviewEl.value?.addEventListener('wheel', onWheel, { passive: false })
  overviewEl.value?.addEventListener('mousedown', onMouseDown)
})

onUnmounted(() => {
  if (cleanupCursor) cleanupCursor()
  overviewEl.value?.removeEventListener('wheel', onWheel)
  overviewEl.value?.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<script>
let timelineEl = null
export function setTimelineEl(el) { timelineEl = el }
</script>

<style scoped>
.tl-axis {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 12px 16px;
}

.tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
}

.tl-legend-label {
  color: var(--vp-c-text-2);
  font-weight: 500;
  margin-right: 4px;
}

.tl-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tl-chip:hover {
  background: var(--vp-c-bg-soft);
}

.tl-chip.is-active {
  background: currentColor;
  color: white;
}

.tl-chip.is-focused-other {
  opacity: 0.3;
  pointer-events: none;
}

.tl-chip-reset {
  margin-left: 8px;
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
}

.tl-overview {
  position: relative;
  height: 36px;
  margin-bottom: 8px;
}

.tl-scale {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  margin-bottom: 4px;
}

.tl-track-bar {
  position: relative;
  height: 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  overflow: hidden;
}

.tl-cursor {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: var(--vp-c-brand-1);
  transform-origin: left center;
  transition: transform 0.1s linear;
  pointer-events: none;
}

.tl-decade-marks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.tl-decade-btn {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 2px 6px;
  font-size: 10px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tl-decade-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.tl-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
}

.tl-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-btn {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--vp-c-text-1);
  transition: all 0.15s ease;
}

.tl-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tl-span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--vp-c-text-2);
  min-width: 180px;
}

.tl-span-unit {
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.tl-nav {
  display: flex;
  gap: 4px;
}

.tl-nav-btn {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: var(--vp-c-text-2);
  transition: all 0.15s ease;
}

.tl-nav-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tl-nav-btn.is-active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: white;
}

.tl-btn-reset {
  margin-left: auto;
}

.tl-overview.is-dragging {
  cursor: grabbing;
}

@media (prefers-reduced-motion: reduce) {
  .tl-cursor { transition: none; }
  .tl-chip, .tl-decade-btn, .tl-btn, .tl-nav-btn { transition: none; }
}

@media (max-width: 768px) {
  .tl-controls { flex-direction: column; align-items: stretch; }
  .tl-zoom { justify-content: center; }
  .tl-nav { justify-content: center; }
  .tl-btn-reset { margin-left: 0; }
  .tl-span { min-width: auto; }
}
</style>