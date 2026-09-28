<script setup>
import { ref, computed } from 'vue'
import { GAMES, GENRE_NAMES, ERAS, PLATFORMS, TAG_LINKS } from '../data/games.mjs'

const genre = ref('全部')
const era = ref('全部')
const platform = ref('全部')
const tag = ref('全部')

const tagNames = ['全部', ...Object.keys(TAG_LINKS)]

const filtered = computed(() =>
  GAMES.filter(g =>
    (genre.value === '全部' || g.genres.includes(genre.value)) &&
    (era.value === '全部' || g.era === era.value) &&
    (platform.value === '全部' || g.platforms.includes(platform.value)) &&
    (tag.value === '全部' || g.tags.includes(tag.value))
  )
)

const reset = () => {
  genre.value = '全部'
  era.value = '全部'
  platform.value = '全部'
  tag.value = '全部'
}

// 后端技术栏固定展示顺序
const TECH_FIELDS = [
  ['server', '服务器架构'],
  ['sync', '同步模型'],
  ['matchmaking', '匹配服务'],
  ['transport', '实时通信'],
  ['storage', '存储与存档'],
  ['antiCheat', '反作弊·校验'],
  ['social', 'UGC·排行·社交']
]

const gameTagHref = tag => TAG_LINKS[tag]
</script>

<template>
  <div class="lib">
    <div class="lib-filters">
      <label class="lib-filter">
        <span>玩法</span>
        <select v-model="genre">
          <option v-for="g in GENRE_NAMES" :key="g" :value="g">{{ g }}</option>
        </select>
      </label>
      <label class="lib-filter">
        <span>年代</span>
        <select v-model="era">
          <option v-for="e in ERAS" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
      <label class="lib-filter">
        <span>平台</span>
        <select v-model="platform">
          <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label class="lib-filter">
        <span>技术标签</span>
        <select v-model="tag">
          <option v-for="t in tagNames" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
      <span class="lib-count">{{ filtered.length }} 款</span>
    </div>

    <p v-if="filtered.length === 0" class="lib-empty">
      没有符合筛选条件的条目。
      <button class="lib-reset" @click="reset">重置筛选</button>
    </p>

    <ul v-else class="lib-grid">
      <li v-for="g in filtered" :key="g.name" class="lib-card">
        <div class="lib-card-head">
          <span class="lib-badge" aria-hidden="true">{{ g.name[0] }}</span>
          <div>
            <p class="lib-name">{{ g.name }}</p>
            <p class="lib-sub">{{ g.firstYear }} · {{ g.platforms.join(' / ') }} · {{ g.genres.join(' / ') }}</p>
          </div>
        </div>
        <p class="lib-blurb">{{ g.blurb }}</p>
        <dl class="lib-tech">
          <div v-for="[key, label] in TECH_FIELDS" :key="key" class="lib-tech-row">
            <dt>{{ label }}</dt>
            <dd>{{ g.tech[key] }}</dd>
          </div>
        </dl>
        <p class="lib-tags">
          <a v-for="t in g.tags" :key="t" class="lib-tag" :href="gameTagHref(t)">{{ t }}</a>
        </p>
      </li>
    </ul>
  </div>
</template>
