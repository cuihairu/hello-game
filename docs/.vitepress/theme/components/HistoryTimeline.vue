<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { SEGMENTS, TRACKS, store, relatedKeys, prefersReduced, loadGsap, fadeCardsOnScroll } from '../data/timeline.mjs'

const props = defineProps({
  decade: {
    type: String,
    required: true
  }
})

const timelineRef = ref(null)
const columnRefs = ref({})

const segment = computed(() => SEGMENTS.find(s => s.decade === props.decade))
const tracks = computed(() => TRACKS)

function itemsForTrack(track) {
  if (!segment.value) return []
  const { from, to } = segment.value
  return track.items.filter(item => item.year >= from && item.year <= to)
}

function focusedItems(track) {
  const items = itemsForTrack(track)
  if (!store.focus) return items
  if (store.focus === track.id) return items
  const focusTrack = tracks.value.find(t => t.id === store.focus)
  if (!focusTrack) return []
  const focusItems = itemsForTrack(focusTrack)
  const related = new Set()
  focusItems.forEach(fi => {
    if (fi.links) {
      fi.links
        .filter(l => l.track === track.id)
        .forEach(l => related.add(l.key))
    }
  })
  return items.filter(i => related.has(i.key))
}

function hasRelated(track, item) {
  if (!store.focus || store.focus === track.id) return false
  return relatedKeys(store.focus, item).length > 0
}

function trackColumnStyle(track) {
  const isFocused = store.focus === track.id
  const isCollapsed = store.collapsed[track.id]
  const hasItems = focusedItems(track).length > 0
  if (isFocused) {
    return { flex: '0 0 28%', minWidth: '240px' }
  }
  if (isCollapsed) {
    return { flex: '0 0 48px', minWidth: '48px' }
  }
  if (!hasItems) {
    return { flex: '0 0 48px', minWidth: '48px', opacity: 0.3 }
  }
  return { flex: '0 0 12.5%', minWidth: '140px' }
}

function getItemKey(item) {
  return item.key
}

onMounted(async () => {
  await nextTick()
  const reduced = prefersReduced()
  if (!reduced && timelineRef.value) {
    await fadeCardsOnScroll(timelineRef.value)
  }
})
</script>

<template>
  <div class="tl-timeline" ref="timelineRef" :id="segment?.id" role="region" :aria-label="`${decade} 年代`">
    <div class="tl-timeline-header" v-if="segment">
      <h3 class="tl-decade-title">{{ segment.decade }} · {{ segment.title }}</h3>
    </div>

    <div class="tl-timeline-grid">
      <div
        v-for="track in tracks"
        :key="track.id"
        class="tl-track-column"
        :style="trackColumnStyle(track)"
        :class="{ focused: store.focus === track.id, collapsed: store.collapsed[track.id], empty: focusedItems(track).length === 0 && !store.collapsed[track.id] && store.focus && store.focus !== track.id }"
      >
        <div class="tl-track-header">
          <span class="tl-track-name" :style="{ color: track.color }">{{ track.name }}</span>
          <span v-if="store.focus && store.focus !== track.id && focusedItems(track).length === 0 && !store.collapsed[track.id]" class="tl-track-hint">无关联</span>
          <span v-else-if="store.focus && store.focus !== track.id && focusedItems(track).length > 0 && !store.collapsed[track.id]" class="tl-track-hint">关联</span>
        </div>

        <div class="tl-track-body" v-if="!store.collapsed[track.id]">
          <div
            v-for="item in focusedItems(track)"
            :key="getItemKey(item)"
            class="tl-card"
            data-tl-card
            :class="{ related: store.focus && store.focus !== track.id && hasRelated(track, item), focused: store.focus === track.id }"
            :style="{ borderLeftColor: track.color }"
          >
            <div class="tl-card-year">
              <span class="tl-year-badge" :class="{ approx: item.approx }">{{ item.year }}{{ item.approx ? ' 约' : '' }}</span>
            </div>
            <div class="tl-card-title">{{ item.title }}</div>

            <dl class="tl-card-fields">
              <div class="tl-field">
                <dt>硬件背景</dt>
                <dd>{{ item.hardware }}</dd>
              </div>
              <div class="tl-field">
                <dt>解决了什么</dt>
                <dd>{{ item.solved }}</dd>
              </div>
              <div class="tl-field">
                <dt>弊端</dt>
                <dd>{{ item.limits }}</dd>
              </div>
            </dl>

            <div class="tl-card-works" v-if="item.works && item.works.length">
              <h5>代表作</h5>
              <ul>
                <li v-for="(w, i) in item.works" :key="i">
                  <span class="tl-work-year">{{ w.year }}</span>
                  <span class="tl-work-title">{{ w.title }}</span>
                  <span class="tl-work-why">· {{ w.why }}</span>
                </li>
              </ul>
            </div>

            <div class="tl-card-links" v-if="item.links && item.links.length">
              <span class="tl-links-label">关联：</span>
              <span
                v-for="link in item.links"
                :key="link.key + link.dir"
                class="tl-link-badge"
                :class="link.dir"
                :title="link.note"
              >
                {{ link.dir === 'out' ? '→' : '←' }} {{ link.note }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="tl-track-collapsed" :style="{ borderLeftColor: track.color }">
          <span class="tl-collapsed-label">{{ track.name }}（折叠）</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl-timeline {
  margin-top: 24px;
}

.tl-decade-title {
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--vp-c-divider);
}

.tl-timeline-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
  align-items: start;
}

.tl-track-column {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: flex-basis 0.25s ease, min-width 0.25s ease, opacity 0.25s ease;
}

.tl-track-column.focused {
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.tl-track-column.collapsed {
  flex-basis: 48px !important;
  min-width: 48px !important;
}

.tl-track-column.empty {
  opacity: 0.3;
  pointer-events: none;
}

.tl-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  white-space: nowrap;
  overflow: hidden;
}

.tl-track-name {
  font-weight: 600;
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  overflow: hidden;
}

.tl-track-hint {
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}

.tl-track-hint:first-of-type {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
}

.tl-track-hint:last-of-type {
  background: color-mix(in srgb, var(--vp-c-brand) 15%, var(--vp-c-bg));
  color: var(--vp-c-brand);
}

.tl-track-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  min-height: 200px;
}

.tl-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid;
  border-radius: 6px;
  padding: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  opacity: 0;
  transform: translateY(20px);
}

.tl-card.related {
  border-left-width: 4px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vp-c-brand) 30%, transparent);
}

.tl-card.focused {
  border-left-width: 4px;
}

.tl-card-year {
  margin-bottom: 6px;
}

.tl-year-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--vp-c-bg-alt);
  border-radius: 999px;
  color: var(--vp-c-text-2);
}

.tl-year-badge.approx {
  background: color-mix(in srgb, var(--vp-c-brand) 15%, var(--vp-c-bg-alt));
  color: var(--vp-c-brand);
}

.tl-card-title {
  margin: 0 0 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.tl-card-fields {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.tl-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tl-field dt {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.tl-field dd {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.tl-card-works {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.tl-card-works h5 {
  margin: 0 0 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tl-card-works ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tl-card-works li {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.75rem;
  line-height: 1.5;
  margin-bottom: 4px;
}

.tl-work-year {
  font-weight: 600;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  flex-shrink: 0;
}

.tl-work-title {
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.tl-work-why {
  color: var(--vp-c-text-3);
  flex: 1;
  min-width: 0;
}

.tl-card-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.tl-links-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tl-link-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  white-space: nowrap;
  cursor: help;
}

.tl-link-badge.out {
  background: color-mix(in srgb, var(--vp-c-brand) 12%, var(--vp-c-bg-alt));
  color: var(--vp-c-brand);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand) 30%, transparent);
}

.tl-link-badge.in {
  background: color-mix(in srgb, #3fae8f 12%, var(--vp-c-bg-alt));
  color: #3fae8f;
  border: 1px solid color-mix(in srgb, #3fae8f 30%, transparent);
}

.tl-track-collapsed {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-left: 3px solid;
}

.tl-collapsed-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  text-align: center;
  line-height: 1.4;
}

@media (max-width: 1279px) {
  .tl-timeline-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 767px) {
  .tl-timeline-grid {
    grid-template-columns: 1fr;
  }

  .tl-track-column.collapsed {
    flex-basis: auto !important;
    min-width: auto !important;
  }

  .tl-collapsed-label {
    writing-mode: horizontal-tb;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tl-card,
  .tl-track-column {
    transition: none !important;
  }
  .tl-card {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>