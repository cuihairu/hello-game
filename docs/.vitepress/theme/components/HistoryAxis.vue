<template>
  <div class="history-axis">
    <div class="axis-chips">
      <button
        class="axis-chip"
        :class="{ active: store.focus === null }"
        @click="store.focus = null"
      >全部轨道</button>
      <button
        v-for="track in TRACKS"
        :key="track.id"
        class="axis-chip"
        :class="{ active: store.focus === track.id }"
        :style="store.focus === track.id ? { borderColor: track.color, color: track.color } : {}"
        @click="toggleFocus(track.id)"
      >{{ track.name }}</button>
    </div>

    <div class="axis-nav">
      <a v-for="seg in SEGMENTS" :key="seg.id" :href="'#' + seg.id">{{ seg.decade }}</a>
      <span class="axis-window">视窗 {{ view.from }}–{{ view.to }}</span>
      <button v-if="zoomed" class="axis-reset" @click="resetView">复位</button>
    </div>

    <div
      ref="axisEl"
      class="axis-bar"
      @wheel.prevent="onWheel"
      @mousedown="onDragStart"
      @mousemove="onDragMove"
      @mouseup="onDragEnd"
      @mouseleave="onDragEnd"
    >
      <span
        v-for="seg in visibleSegments"
        :key="seg.id"
        class="axis-tick"
        :style="{ left: pctFor(seg.from, view) + '%' }"
      >{{ seg.decade }}</span>
      <span
        v-for="d in visibleDots"
        :key="d.key"
        class="axis-dot"
        :style="{ left: pctFor(d.year, view) + '%', background: d.color }"
        :title="dotTitle(d)"
      ></span>
      <div ref="cursorEl" class="axis-cursor"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AXIS, SEGMENTS, TRACKS, store, toggleFocus, pctFor, dotTitle,
  fitView, overlaps, initAxisCursor
} from '../data/timeline.mjs'

const axisEl = ref(null)
const cursorEl = ref(null)
const view = reactive({ from: AXIS.minYear, to: AXIS.maxYear })
const dragging = reactive({ on: false, startX: 0, from: 0, to: 0 })

const zoomed = computed(() => view.from !== AXIS.minYear || view.to !== AXIS.maxYear)

const allDots = computed(() => {
  const list = []
  for (const track of TRACKS) for (const item of track.items) list.push({ ...item, color: track.color })
  return list
})

const visibleDots = computed(() => allDots.value.filter((d) => d.year >= view.from && d.year <= view.to))
const visibleSegments = computed(() => SEGMENTS.filter((s) => overlaps(s.from, s.to, view.from, view.to)))

function resetView() {
  view.from = AXIS.minYear
  view.to = AXIS.maxYear
}

function anchorYearFor(evt) {
  const el = axisEl.value
  const width = el ? el.clientWidth : 0
  const ratio = width > 0 ? evt.offsetX / width : 0.5
  return view.from + (view.to - view.from) * ratio
}

function onWheel(evt) {
  const span = view.to - view.from
  const nextSpan = evt.deltaY > 0 ? span * 1.25 : span / 1.25
  const anchor = anchorYearFor(evt)
  const rel = (anchor - view.from) / span
  const fitted = fitView(anchor - rel * nextSpan, anchor + (1 - rel) * nextSpan)
  view.from = fitted.from
  view.to = fitted.to
}

function onDragStart(evt) {
  dragging.on = true
  dragging.startX = evt.clientX
  dragging.from = view.from
  dragging.to = view.to
}

function onDragMove(evt) {
  if (!dragging.on) return
  const el = axisEl.value
  const width = el && el.clientWidth > 0 ? el.clientWidth : 600
  const span = dragging.to - dragging.from
  const deltaYears = ((dragging.startX - evt.clientX) / width) * span
  const fitted = fitView(dragging.from + deltaYears, dragging.to + deltaYears)
  view.from = fitted.from
  view.to = fitted.to
}

function onDragEnd() {
  dragging.on = false
}

onMounted(() => {
  initAxisCursor(cursorEl.value)
})
</script>

<style scoped>
.axis-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.axis-chip { border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); border-radius: 999px; padding: 3px 12px; cursor: pointer; font-size: 13px; }
.axis-chip.active { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.axis-nav { display: flex; gap: 10px; font-size: 13px; margin-bottom: 6px; align-items: baseline; }
.axis-window { margin-left: auto; color: var(--vp-c-text-2); }
.axis-reset { border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); cursor: pointer; font-size: 12px; padding: 1px 8px; }
.axis-bar { position: relative; height: 42px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); overflow: hidden; cursor: grab; user-select: none; }
.axis-tick { position: absolute; top: 2px; font-size: 10px; color: var(--vp-c-text-3); transform: translateX(2px); }
.axis-dot { position: absolute; top: 20px; width: 6px; height: 6px; border-radius: 50%; transform: translateX(-3px); }
.axis-cursor { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--vp-c-brand-1); pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .axis-bar { transition: none; }
}
</style>
