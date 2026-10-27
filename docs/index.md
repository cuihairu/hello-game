---
layout: page
sidebar: false
---

<script setup>
import config from './.vitepress/config.mjs'
import { withBase } from 'vitepress'
import {
  buildKbChapters,
  buildTutorialGroups,
  chunk3,
  homepageStats
} from './.vitepress/theme/data/homepage.mjs'

const tutorial = config.locales.root.themeConfig.sidebar['/24-game-types-architecture/']
const kb = config.locales.root.themeConfig.sidebar['/']

// Numbered lecture index: grouped by theme; group-level entries (such as the overview-and-comparison page) are listed first in each group
const tutorialGroups = buildTutorialGroups(tutorial)

// Knowledge base index: take each group's chapter home page; numbering comes from the group title (reading guide 00, master index A, the rest such as "A1." taken from the title)
const kbChapters = buildKbChapters(kb)

// Knowledge base chapter entries split into 3 columns
const kbChunks = chunk3(kbChapters)

const { lectureCount, kbChapterCount, appendixCount, pageCount } = homepageStats(tutorial, kb)
</script>

<div class="bp-hero">
  <p class="bp-kicker">GAME · NETWORK · CONCURRENCY · OPS</p>
  <h1 class="bp-title">Game Knowledge System</h1>
  <p class="bp-lede">
    Software architecture starts as a blueprint: the problem model determines the shape, and the constraints draw the boundary. I have organized here the problems I ran into on game projects, the trade-offs I made, and the material I verified —
    <strong>the backend is the home ground</strong> (network sync, concurrency, data, operations and security), while the engine client, testing quality and collaboration pipelines are filled in at a depth that is sufficient and systematic.
  </p>
  <p class="bp-meta">
    <span>{{ lectureCount }} numbered lectures</span>
    <span>{{ kbChapterCount }} knowledge base chapters</span>
    <span>{{ appendixCount }} appendices</span>
    <span>{{ pageCount }} pages on site</span>
  </p>
</div>

<h2 class="bp-h2">Numbered Lectures · {{ lectureCount }} Project Records</h2>

<div class="bp-groups">
  <div v-for="g in tutorialGroups" :key="g.text">
    <p class="bp-group-title">{{ g.text }}</p>
    <ul class="bp-list">
      <li v-if="g.link">
        <a :href="withBase(g.link)">
          <span class="bp-num">00</span>
          <span class="bp-item">Overview and Comparison</span>
        </a>
      </li>
      <li v-for="it in g.items" :key="it.link">
        <a :href="withBase(it.link)">
          <span class="bp-num">{{ it.num }}</span>
          <span class="bp-item">{{ it.title }}</span>
        </a>
      </li>
    </ul>
  </div>
</div>

<p class="bp-note">
  The numbered lectures are collected by theme, ranging from problem models and architectural trade-offs to concrete issues from running projects; you can browse by number, or jump straight to what you care about from the overview-and-comparison page or the theme index.
</p>

<h2 class="bp-h2">Knowledge Base · {{ kbChapterCount }}-Chapter Reference System</h2>

<div class="bp-groups">
  <div v-for="(chunk, i) in kbChunks" :key="i">
    <p class="bp-group-title">Chapter entries</p>
    <ul class="bp-list">
      <li v-for="ch in chunk" :key="ch.link">
        <a :href="withBase(ch.link)">
          <span class="bp-num">{{ ch.num }}</span>
          <span class="bp-item">{{ ch.title }}</span>
        </a>
      </li>
    </ul>
  </div>
</div>

<p class="bp-note">
  The knowledge base and the numbered lectures discuss the same problems from different angles: the lecture notes record trade-offs and practice from projects, while the knowledge base gathers concepts and references by theme. You can start from a concrete problem, or enter through the <a :href="withBase('/industry/models/')">problem models</a>.
</p>

<h2 class="bp-h2">Three Reading Threads</h2>

<ol class="bp-threads">
  <li>
    <h3><a :href="withBase('/24-game-types-architecture/01-entry')">Numbered lectures: from problem models to engineering practice</a></h3>
    <p>This group of records covers the relationship between games and technology, architecture and operations, and extends into the client, testing and collaboration pipelines; the numbering makes sequential browsing easy, and each piece also stands alone for lookup.</p>
  </li>
  <li>
    <h3><a :href="withBase('/00-reading-guide/')">Knowledge base reading guide and problem index</a></h3>
    <p>Find relevant records by project stage and problem type: sort out the dominant contradiction at project kickoff, check the boundaries of a solution during development, and revisit incident handling after launch.</p>
  </li>
  <li>
    <h3><a :href="withBase('/24-game-types-architecture/expansion')">Site expansion plan</a></h3>
    <p>This records the scope and progress of content expansion, including additions on client architecture, testing quality, and the art and audio pipelines.</p>
  </li>
</ol>

<p class="bp-colophon">
  Content is compiled from public material and engineering practice; code examples are demonstration implementations. If you spot errors or omissions, please open an issue on GitHub to point them out.
</p>
