<template>
  <section class="tl-timeline-wrapper" ref="timelineEl">
    <div class="tl-grid" :class="{ 'has-focus': store.focus }">
      <div
        v-for="trackData in trackDatas"
        :key="trackData.trackId"
        class="tl-col"
        :class="{ 'is-narrow': store.focus && store.focus !== trackData.trackId, 'is-collapsed': store.collapsed[trackData.trackId] }"
        :style="{ '--track-color': trackData.trackColor }"
      >
        <div class="tl-col-head">
          <button
            class="tl-col-btn"
            @click="toggleCollapse(trackData.trackId)"
            :aria-expanded="!store.collapsed[trackData.trackId]"
            :title="store.collapsed[trackData.trackId] ? '展开' : '折叠'"
            :style="{ borderColor: trackData.trackColor }"
          >
            <span class="tl-col-dot"></span>
            <span class="tl-col-name">{{ trackData.trackName }}</span>
            <span class="tl-col-caret" :class="{ 'rotated': store.collapsed[trackData.trackId] }">▼</span>
            <span class="tl-col-count" v-if="!store.collapsed[trackData.trackId]">{{ trackData.items.length }}</span>
          </button>
        </div>

        <div class="tl-cards" v-if="!store.collapsed[trackData.trackId]">
          <article
            v-for="item in trackData.items"
            :key="item.key"
            class="tl-card"
            :class="{ 'is-related': isRelated(item.key), 'is-focused': store.focus === trackData.trackId }"
            data-tl-card
          >
            <header class="tl-card-header">
              <span class="tl-card-year" :class="{ 'approx': item.approx }">{{ item.year }}{{ item.approx ? ' 约' : '' }}</span>
              <h3 class="tl-card-title">{{ item.title }}</h3>
            </header>
            <dl class="tl-card-fields">
              <div class="tl-card-row">
                <dt>硬件背景</dt>
                <dd>{{ item.hardware }}</dd>
              </div>
              <div class="tl-card-row">
                <dt>解决了什么</dt>
                <dd>{{ item.solved }}</dd>
              </div>
              <div class="tl-card-row">
                <dt>弊端</dt>
                <dd>{{ item.limits }}</dd>
              </div>
            </dl>
            <ul class="tl-card-works" v-if="item.works && item.works.length">
              <li v-for="w in item.works" :key="w.year">
                <strong>{{ w.year }} · {{ w.title }}</strong> — {{ w.why }}
              </li>
            </ul>
            <div class="tl-card-links" v-if="item.links && item.links.length">
              <span
                v-for="link in item.links"
                :key="link.key + link.dir"
                class="tl-link"
                :class="{ 'in': link.dir === 'in', 'out': link.dir === 'out' }"
                :style="{ borderColor: getTrackColor(link.track), color: getTrackColor(link.track) }"
                :title="link.note"
              >
                {{ link.dir === 'out' ? '→' : '←' }} {{ link.note }}
              </span>
            </div>
            <div class="tl-card-links" v-else-if="store.focus && store.focus !== trackData.trackId && !isRelated(item.key)">
              <span class="tl-link tl-link-none" :title="`与 ${getTrackName(store.focus)} 无直接关联`">无关联</span>
            </div>
          </article>
        </div>

        <div class="tl-col-placeholder" v-if="store.collapsed[trackData.trackId] || (store.focus && store.focus !== trackData.trackId && trackData.items.every(i => !isRelated(i.key)))">
          <span class="tl-placeholder-text">
            {{ store.collapsed[trackData.trackId] ? '已折叠' : '无关联条目' }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store, TRACKS, itemsIn, toggleCollapse, relatedKeys, prefersReduced, fadeCardsOnScroll, loadGsap } from '../data/timeline'

const props = defineProps({
  decade: { type: String, required: true }
})

const timelineEl = ref(null)
const trackDatas = ref([])
let cleanupFade = null
let timelineElRef = null

import { setTimelineEl } from '../components/HistoryAxis.vue'

function getTrackColor(trackId) {
  /* v8 ignore next */
  const track = TRACKS.find(t => t.id === trackId)
  /* v8 ignore next */
  return track?.color || '#888'
}

function getTrackName(trackId) {
  /* v8 ignore next */
  const track = TRACKS.find(t => t.id === trackId)
  /* v8 ignore next */
  return track?.name || trackId
}

const isRelated = (key) => {
  if (!store.focus) return true
  const related = relatedKeys(store.focus)
  return related.has(key)
}

async function initData() {
  const data = itemsIn(props.decade)
  trackDatas.value = data.tracks.map(t => ({
    trackId: t.trackId,
    trackName: t.trackName,
    trackColor: t.trackColor,
    items: t.items
  }))
  timelineElRef = timelineEl.value
  setTimelineEl(timelineElRef)
}

function triggerFade() {
  if (cleanupFade) cleanupFade()
  /* v8 ignore next */
  cleanupFade = null
  if (prefersReduced()) return
  if (!timelineEl.value) return
  /* v8 ignore next */
  fadeCardsOnScroll(timelineEl.value).then(fn => { cleanupFade = fn })
}

watch(() => props.decade, initData, { immediate: true })
watch(() => store.focus, triggerFade)
watch(() => store.collapsed, triggerFade)

onMounted(() => {
  initData()
  /* v8 ignore next */
  triggerFade()
})

onUnmounted(() => {
  /* v8 ignore next */
  if (cleanupFade) cleanupFade()
})
</script>

<style scoped>
.tl-timeline-wrapper {
  padding: 16px 0;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  transition: grid-template-columns 0.3s ease;
}

@media (max-width: 1280px) {
  .tl-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .tl-grid { grid-template-columns: 1fr; }
}

.tl-grid.has-focus {
  grid-template-columns: minmax(0, 1.6fr) repeat(7, minmax(0, 0.7fr));
}

@media (max-width: 1280px) {
  .tl-grid.has-focus { grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(0, 0.6fr)); }
}
@media (max-width: 768px) {
  .tl-grid.has-focus { grid-template-columns: 1fr; }
}

.tl-col { min-width: 0; }
.tl-col.is-narrow .tl-card { font-size: 12px; }
.tl-col.is-collapsed .tl-cards { display: none; }

.tl-col-head { margin-bottom: 8px; }

.tl-col-btn {
  display: flex; align-items: center; gap: 6px; width: 100%;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  border-radius: 8px; padding: 4px 8px; cursor: pointer; font-size: 13px;
  color: var(--vp-c-text-1);
  transition: all 0.15s ease;
}

.tl-col-btn:hover { border-color: var(--track-color); color: var(--track-color); }

.tl-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--track-color); display: inline-block; flex-shrink: 0; }
.tl-col-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-col-count { margin-left: auto; color: var(--vp-c-text-3); font-size: 11px; }
.tl-col-caret { color: var(--vp-c-text-3); transition: transform 0.15s ease; font-size: 10px; }
.tl-col-caret.rotated { transform: rotate(-90deg); }

.tl-cards { display: flex; flex-direction: column; gap: 10px; }

.tl-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tl-card.is-related {
  border-left: 3px dashed var(--vp-c-brand-1);
}

.tl-card.is-focused {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.tl-card-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.tl-card-year { color: var(--vp-c-brand-1); font-weight: 700; margin-right: 4px; font-size: 14px; white-space: nowrap; }
.tl-card-year.approx::after { content: ' 约'; font-weight: 400; color: var(--vp-c-text-2); font-size: 11px; }
.tl-card-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--vp-c-text-1); line-height: 1.3; }

.tl-card-fields { margin: 0; font-size: 13px; line-height: 1.6; }
.tl-card-row { margin-top: 6px; }
.tl-card-row dt { font-weight: 600; font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 2px; }
.tl-card-row dd { margin: 0; color: var(--vp-c-text-1); }

.tl-card-works { padding-left: 16px; font-size: 12px; color: var(--vp-c-text-2); margin-top: 8px; }
.tl-card-works li { margin: 4px 0; }
.tl-card-works strong { color: var(--vp-c-text-1); }

.tl-card-links { margin: 8px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
.tl-link {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; padding: 2px 6px;
  border: 1px solid currentColor; border-radius: 4px;
  color: var(--vp-c-brand-1); background: transparent;
  white-space: nowrap; cursor: default;
}
.tl-link.in { color: var(--vp-c-brand-1); }
.tl-link.out { color: var(--vp-c-brand-1); }
.tl-link-none {
  color: var(--vp-c-text-3);
  border-color: var(--vp-c-divider);
  font-style: italic;
  font-size: 11px;
}

.tl-col-placeholder {
  display: flex; align-items: center; justify-content: center;
  min-height: 60px; color: var(--vp-c-text-3); font-size: 12px;
  border: 1px dashed var(--vp-c-divider); border-radius: 8px;
  background: var(--vp-c-bg);
}

@media (prefers-reduced-motion: reduce) {
  .tl-grid { transition: none; }
  .tl-col-btn, .tl-card, .tl-col-caret { transition: none; }
}
</style>