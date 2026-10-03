<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { SEGMENTS, AXIS, store, toggleFocus, toggleCollapse, prefersReduced, loadGsap, initAxisCursor, fadeCardsOnScroll } from '../data/timeline.mjs'
import { TRACKS } from '../data/timeline.mjs'

const axisRef = ref(null)
const decadeRefs = ref({})
const scale = ref(1)
const viewStart = ref(AXIS.minYear)
const viewEnd = ref(AXIS.maxYear)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartViewStart = ref(0)

const tracks = computed(() => TRACKS)

function yearToPercent(year) {
  return ((year - AXIS.minYear) / (AXIS.maxYear - AXIS.minYear)) * 100
}

function percentToYear(pct) {
  return AXIS.minYear + (pct / 100) * (AXIS.maxYear - AXIS.minYear)
}

function clampSpan(newStart, newEnd) {
  const span = newEnd - newStart
  if (span < AXIS.minSpan) {
    const mid = (newStart + newEnd) / 2
    newStart = Math.max(AXIS.minYear, mid - AXIS.minSpan / 2)
    newEnd = Math.min(AXIS.maxYear, newStart + AXIS.minSpan)
  }
  if (span > AXIS.maxSpan) {
    const mid = (newStart + newEnd) / 2
    newStart = Math.max(AXIS.minYear, mid - AXIS.maxSpan / 2)
    newEnd = Math.min(AXIS.maxYear, newStart + AXIS.maxSpan)
  }
  return { start: newStart, end: newEnd }
}

function updateScale() {
  const span = viewEnd.value - viewStart.value
  scale.value = (AXIS.maxYear - AXIS.minYear) / span
}

function onWheel(e) {
  e.preventDefault()
  const rect = axisRef.value?.getBoundingClientRect()
  if (!rect || rect.width <= 1) return
  const mouseRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const span = viewEnd.value - viewStart.value
  const zoomFactor = e.deltaY > 0 ? 1.2 : 0.833
  const newSpan = Math.min(AXIS.maxSpan, Math.max(AXIS.minSpan, span * zoomFactor))
  const newStart = viewStart.value + mouseRatio * span - mouseRatio * newSpan
  const newEnd = newStart + newSpan
  const clamped = clampSpan(newStart, newEnd)
  viewStart.value = clamped.start
  viewEnd.value = clamped.end
  updateScale()
}

function onMouseDown(e) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartViewStart.value = viewStart.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  if (!isDragging.value) return
  const rect = axisRef.value?.getBoundingClientRect()
  if (!rect) return
  const dx = e.clientX - dragStartX.value
  const span = viewEnd.value - viewStart.value
  const yearPerPx = span / (rect.width || 1)
  const deltaYears = dx * yearPerPx
  let newStart = dragStartViewStart.value - deltaYears
  let newEnd = newStart + span
  if (newStart < AXIS.minYear) {
    newStart = AXIS.minYear
    newEnd = newStart + span
  }
  if (newEnd > AXIS.maxYear) {
    newEnd = AXIS.maxYear
    newStart = newEnd - span
  }
  viewStart.value = newStart
  viewEnd.value = newEnd
}

function onMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function jumpToDecade(decade) {
  const seg = SEGMENTS.find(s => s.decade === decade)
  if (!seg) return
  viewStart.value = Math.max(AXIS.minYear, seg.from - 5)
  viewEnd.value = Math.min(AXIS.maxYear, viewStart.value + 30)
  updateScale()
}

function resetView() {
  viewStart.value = AXIS.minYear
  viewEnd.value = AXIS.maxYear
  updateScale()
}

function trackStyle(track) {
  const isFocused = store.focus === track.id
  const isCollapsed = store.collapsed[track.id]
  const baseWidth = isFocused ? '28%' : '12.5%'
  const minWidth = isFocused ? '240px' : '140px'
  return {
    flex: `0 0 ${baseWidth}`,
    minWidth,
    opacity: isCollapsed ? 0.5 : 1,
    borderLeft: isFocused ? '2px solid var(--vp-c-brand)' : 'none'
  }
}

onMounted(async () => {
  const reduced = prefersReduced()
  if (!reduced) {
    await initAxisCursor(axisRef.value, Object.values(decadeRefs.value))
  }
  const axisEl = axisRef.value
  if (axisEl && !reduced) {
    await fadeCardsOnScroll(axisEl)
  }
})

watch(() => store.focus, () => {
  // focus change triggers re-render via computed
})
</script>

<template>
  <div class="tl-axis" ref="axisRef">
    <div class="tl-axis-header">
      <div class="tl-axis-title">
        <h2>游戏发展历史线 · 八轨同轴</h2>
        <p class="tl-axis-meta">年份以通行资料为准，「约」= 资料不一。每条目三硬字段：硬件背景 / 解决了什么 / 弊端。轨道间因果以「→ 催生 / ← 受影响」双向成对展示。</p>
      </div>
      <div class="tl-axis-chips" role="tablist" aria-label="轨道聚焦">
        <button
          v-for="track in tracks"
          :key="track.id"
          class="tl-chip"
          :class="{ active: store.focus === track.id, collapsed: store.collapsed[track.id] }"
          :style="{ background: track.color }"
          @click="toggleFocus(track.id)"
          :aria-pressed="store.focus === track.id"
          role="tab"
        >
          {{ track.name }}
        </button>
        <button
          v-if="store.focus"
          class="tl-chip tl-chip-reset"
          @click="toggleFocus(null)"
          role="tab"
          aria-pressed="false"
        >
          全部轨道
        </button>
      </div>
    </div>

    <div class="tl-axis-overview" @wheel="onWheel" @mousedown="onMouseDown" :class="{ dragging: isDragging }" role="slider" aria-label="时间轴缩放与平移，滚轮缩放，拖动平移" tabindex="0">
      <div class="tl-axis-track">
        <div class="tl-axis-decade-markers">
          <span
            v-for="seg in SEGMENTS"
            :key="seg.id"
            class="tl-axis-decade"
            :style="{ left: `${yearToPercent(seg.from)}%`, width: `${yearToPercent(seg.to - seg.from)}%` }"
          >
            {{ seg.decade }}
          </span>
        </div>
        <div class="tl-axis-cursor" :style="{ left: `${yearToPercent(viewStart)}%`, width: `${yearToPercent(viewEnd) - yearToPercent(viewStart)}%` }"></div>
      </div>
      <div class="tl-axis-nav">
        <button
          v-for="seg in SEGMENTS"
          :key="seg.id"
          class="tl-axis-nav-btn"
          @click="jumpToDecade(seg.decade)"
          :aria-current="viewStart <= seg.from && viewEnd >= seg.to ? 'true' : 'false'"
        >
          {{ seg.decade }}
        </button>
        <button class="tl-axis-nav-btn tl-axis-reset" @click="resetView" title="复位">
          复位
        </button>
      </div>
      <div class="tl-axis-view-info" v-if="viewStart > AXIS.minYear || viewEnd < AXIS.maxYear">
        视窗：{{ Math.round(viewStart) }}–{{ Math.round(viewEnd) }}
      </div>
    </div>

    <div class="tl-axis-legend">
      <div
        v-for="track in tracks"
        :key="track.id"
        class="tl-legend-item"
        :style="{ borderColor: track.color }"
        :class="{ focused: store.focus === track.id, collapsed: store.collapsed[track.id] }"
      >
        <button class="tl-legend-toggle" @click="toggleCollapse(track.id)" :aria-expanded="!store.collapsed[track.id]">
          <span class="tl-legend-color" :style="{ background: track.color }"></span>
          {{ track.name }}
          <span class="tl-legend-chevron" :class="{ rotated: store.collapsed[track.id] }">▾</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl-axis {
  font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-1);
}

.tl-axis-header {
  margin-bottom: 16px;
}

.tl-axis-title h2 {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
}

.tl-axis-meta {
  margin: 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.tl-axis-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tl-chip {
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}

.tl-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tl-chip.active {
  box-shadow: 0 0 0 2px var(--vp-c-brand), 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.tl-chip.collapsed {
  opacity: 0.6;
}

.tl-chip-reset {
  background: var(--vp-c-bg-soft) !important;
  color: var(--vp-c-text-1) !important;
  border: 1px solid var(--vp-c-divider);
}

.tl-chip-reset:hover {
  background: var(--vp-c-bg-alt) !important;
}

.tl-axis-overview {
  position: relative;
  height: 56px;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  margin-bottom: 12px;
}

.tl-axis-overview.dragging {
  cursor: grabbing;
}

.tl-axis-track {
  position: relative;
  height: 100%;
}

.tl-axis-decade-markers {
  position: absolute;
  inset: 0;
  display: flex;
}

.tl-axis-decade {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  border-right: 1px dashed var(--vp-c-divider);
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.tl-axis-decade:last-child {
  border-right: none;
}

.tl-axis-cursor {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand), color-mix(in srgb, var(--vp-c-brand) 70%, transparent));
  opacity: 0.25;
  pointer-events: none;
  transition: left 0.3s ease, width 0.3s ease;
  z-index: 1;
}

.tl-axis-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.15), transparent);
  z-index: 2;
}

.tl-axis-nav-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: var(--vp-c-text-1);
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.tl-axis-nav-btn:hover {
  background: rgba(255,255,255,0.25);
}

.tl-axis-nav-btn[aria-current="true"] {
  background: var(--vp-c-brand);
  color: #fff;
}

.tl-axis-reset {
  margin-left: auto;
  font-size: 0.6875rem;
  opacity: 0.8;
}

.tl-axis-reset:hover {
  opacity: 1;
}

.tl-axis-view-info {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  background: rgba(0,0,0,0.1);
  padding: 2px 8px;
  border-radius: 999px;
  z-index: 3;
  pointer-events: none;
}

.tl-axis-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tl-legend-item {
  flex: 1;
  min-width: 120px;
}

.tl-legend-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-left: 3px solid;
  border-radius: 0 6px 6px 0;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.tl-legend-toggle:hover {
  background: var(--vp-c-bg-soft);
}

.tl-legend-item.focused .tl-legend-toggle {
  background: color-mix(in srgb, var(--vp-c-brand) 10%, var(--vp-c-bg-alt));
  border-left-width: 4px;
}

.tl-legend-item.collapsed .tl-legend-toggle {
  opacity: 0.6;
}

.tl-legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tl-legend-chevron {
  margin-left: auto;
  font-size: 0.625rem;
  transition: transform 0.15s ease;
  color: var(--vp-c-text-3);
}

.tl-legend-chevron.rotated {
  transform: rotate(-90deg);
}

@media (prefers-reduced-motion: reduce) {
  .tl-chip,
  .tl-axis-cursor,
  .tl-legend-chevron {
    transition: none !important;
  }
}
</style>