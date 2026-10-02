<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  TRACKS,
  fadeCardsOnScroll,
  keysOfTrack,
  linkTitle,
  relatedTo,
  segmentOf,
  store,
  toggleCollapse
} from '../data/timeline.mjs'

const props = defineProps({
  decade: { type: String, required: true }
})

const rootEl = ref(null)

// 八列并排；聚焦时本轨全量、他轨只留互链关联条目（或收成窄色条）
const columns = computed(() => {
  const focus = store.focus
  const focusKeys = focus ? keysOfTrack(focus) : null
  return TRACKS.map((track) => {
    const all = track.items.filter((i) => segmentOf(i.year).decade === props.decade)
    const dim = focus !== null && focus !== track.id
    const items = dim ? all.filter((i) => relatedTo(i, focusKeys)) : all
    return {
      track,
      total: all.length,
      items,
      collapsed: !!store.collapsed[track.id],
      isFocus: focus === track.id,
      dim
    }
  })
})

onMounted(() => {
  fadeCardsOnScroll(rootEl.value)
})
</script>

<template>
  <div
    ref="rootEl"
    class="tl-grid"
    :class="{ 'has-focus': store.focus !== null }"
    :data-decade="props.decade"
  >
    <section
      v-for="col in columns"
      :key="col.track.id"
      class="tl-col"
      :class="{
        'is-focus': col.isFocus,
        'is-dim': col.dim,
        'is-narrow': col.items.length === 0 || col.collapsed,
        'is-collapsed': col.collapsed
      }"
      :style="{ '--c': col.track.color }"
      :data-track="col.track.id"
    >
      <header class="tl-col-head">
        <button
          type="button"
          class="tl-col-btn"
          :aria-expanded="String(!col.collapsed)"
          :data-collapse="col.track.id"
          @click="toggleCollapse(col.track.id)"
        >
          <span class="tl-col-dot" aria-hidden="true"></span>
          <span class="tl-col-name">{{ col.track.name }}</span>
          <span class="tl-col-count">{{ col.items.length }}/{{ col.total }}</span>
          <span class="tl-col-caret" aria-hidden="true">{{ col.collapsed ? '＋' : '－' }}</span>
        </button>
      </header>

      <div v-if="!col.collapsed && col.items.length" class="tl-cards">
        <article
          v-for="i in col.items"
          :key="i.key"
          class="tl-card"
          :class="{ 'is-related': col.dim }"
          :data-tl-card="i.key"
        >
          <h4 class="tl-card-title">
            <span class="tl-card-year" :class="{ 'is-approx': i.approx }">{{ i.approx ? '约' : '' }}{{ i.year }}</span>
            {{ i.title }}
            <span v-if="col.dim" class="tl-card-flag">关联</span>
          </h4>
          <dl class="tl-card-fields">
            <div class="tl-card-row">
              <dt>硬件背景</dt>
              <dd>{{ i.hardware }}</dd>
            </div>
            <div class="tl-card-row">
              <dt>解决了什么</dt>
              <dd>{{ i.solved }}</dd>
            </div>
            <div class="tl-card-row">
              <dt>弊端</dt>
              <dd>{{ i.limits }}</dd>
            </div>
          </dl>
          <ul v-if="i.works" class="tl-card-works">
            <li v-for="w in i.works" :key="w.year + w.title">
              <b>{{ w.year }}</b>《{{ w.title }}》<span>· {{ w.why }}</span>
            </li>
          </ul>
          <p v-if="i.links" class="tl-card-links">
            <span
              v-for="(l, li) in i.links"
              :key="li"
              class="tl-link"
              :class="'is-' + l.dir"
              :title="linkTitle(l)"
            >{{ l.dir === 'out' ? '→' : '←' }} {{ l.note }}</span>
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
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
.tl-grid.has-focus { grid-template-columns: minmax(0, 1.6fr) repeat(7, minmax(0, 0.7fr)); }
.tl-col { min-width: 0; }
.tl-col.is-narrow .tl-card { font-size: 12px; }
.tl-col-head { margin-bottom: 8px; }
.tl-col-btn {
  display: flex; align-items: center; gap: 6px; width: 100%;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  border-radius: 8px; padding: 4px 8px; cursor: pointer; font-size: 13px;
}
.tl-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); display: inline-block; }
.tl-col-name { font-weight: 600; }
.tl-col-count { margin-left: auto; color: var(--vp-c-text-3); font-size: 11px; }
.tl-col-caret { color: var(--vp-c-text-3); }
.tl-cards { display: flex; flex-direction: column; gap: 10px; }
.tl-card { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 10px; background: var(--vp-c-bg-soft); }
.tl-card.is-related { border-left: 3px dashed var(--vp-c-brand-1); }
.tl-card-title { margin: 0 0 6px; font-size: 15px; }
.tl-card-year { color: var(--vp-c-brand-1); font-weight: 700; margin-right: 4px; }
.tl-card-flag { font-size: 11px; border: 1px solid var(--vp-c-brand-1); color: var(--vp-c-brand-1); border-radius: 4px; padding: 0 4px; margin-left: 6px; }
.tl-card-fields { margin: 0; }
.tl-card-row { margin-top: 6px; font-size: 13px; }
.tl-card-row dt { font-weight: 600; font-size: 12px; color: var(--vp-c-text-2); }
.tl-card-row dd { margin: 0; }
.tl-card-works { padding-left: 16px; font-size: 12px; }
.tl-card-links { margin: 8px 0 0; }
.tl-link { display: inline-block; font-size: 12px; color: var(--vp-c-brand-1); margin-right: 8px; }
@media (prefers-reduced-motion: reduce) {
  .tl-grid { transition: none; }
}
</style>

