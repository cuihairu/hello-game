---
layout: page
sidebar: false
---

<script setup>
import config from '../.vitepress/config.mjs'
import { withBase } from 'vitepress'
import {
  buildKbChapters,
  buildTutorialGroups,
  chunk3,
  homepageStats
} from '../.vitepress/theme/data/homepage.mjs'

const tutorial = config.locales.zh.themeConfig.sidebar['/zh/24-game-types-architecture/']
const kb = config.locales.zh.themeConfig.sidebar['/zh/']

// 编号专题目录：按主题分组，组级入口（如选型对照总览）列在组首
const tutorialGroups = buildTutorialGroups(tutorial)

// 知识库目录：每组取章主页；编号取自分组标题（导读 00、总索引 A，其余如「A1.」取自标题）
const kbChapters = buildKbChapters(kb)

// 知识库章级入口拆 3 栏
const kbChunks = chunk3(kbChapters)

const { lectureCount, kbChapterCount, appendixCount, pageCount } = homepageStats(tutorial, kb)
</script>

<div class="bp-hero">
  <p class="bp-kicker">GAME · NETWORK · CONCURRENCY · OPS</p>
  <h1 class="bp-title">游戏知识体系</h1>
  <p class="bp-lede">
    软件架构先是一张图纸：问题模型决定形状，约束画出边界。我把游戏项目里遇到的问题、做过的取舍和查证过的材料整理在这里——
    <strong>后端是主场</strong>（网络同步、并发、数据、运营与安全），引擎客户端、测试质量与协作管线按够用且成体系的深度补齐。
  </p>
  <p class="bp-meta">
    <span>编号专题 {{ lectureCount }} 篇</span>
    <span>知识库 {{ kbChapterCount }} 章</span>
    <span>附录 {{ appendixCount }} 篇</span>
    <span>站内 {{ pageCount }} 页</span>
  </p>
</div>

<h2 class="bp-h2">编号专题 · {{ lectureCount }} 篇项目记录</h2>

<div class="bp-groups">
  <div v-for="g in tutorialGroups" :key="g.text">
    <p class="bp-group-title">{{ g.text }}</p>
    <ul class="bp-list">
      <li v-if="g.link">
        <a :href="withBase(g.link)">
          <span class="bp-num">00</span>
          <span class="bp-item">总览与选型对照</span>
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
  编号专题按主题收录，从问题模型、架构取舍到项目运行中的具体问题；可以按编号浏览，也可以从选型对照总览或主题索引直接进入关心的内容。
</p>

<h2 class="bp-h2">知识库 · {{ kbChapterCount }} 章参考体系</h2>

<div class="bp-groups">
  <div v-for="(chunk, i) in kbChunks" :key="i">
    <p class="bp-group-title">章级入口</p>
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
  知识库与编号专题会从不同角度讨论相同问题：专题笔记记录项目中的取舍与实践，知识库按主题收拢概念和参照。可以从具体问题查找，也可以从<a :href="withBase('/zh/industry/models/')">问题模型</a>进入。
</p>

<h2 class="bp-h2">三条阅读线索</h2>

<ol class="bp-threads">
  <li>
    <h3><a :href="withBase('/zh/24-game-types-architecture/01-entry')">编号专题：从问题模型到工程实践</a></h3>
    <p>这组记录覆盖游戏与技术的关系、架构与运行维护，也延伸到客户端、测试和协作管线；编号便于顺序浏览，单篇也可以独立查阅。</p>
  </li>
  <li>
    <h3><a :href="withBase('/zh/00-reading-guide/')">知识库导读与问题索引</a></h3>
    <p>按项目阶段和问题类型找到相关记录：立项时梳理主导矛盾，开发中核对方案边界，上线后回看事故处置。</p>
  </li>
  <li>
    <h3><a :href="withBase('/zh/24-game-types-architecture/expansion')">看站点扩展规划</a></h3>
    <p>这里记录内容扩展的范围与进展，包括客户端架构、测试质量、美术音频管线等专题的增补情况。</p>
  </li>
</ol>

<p class="bp-colophon">
  内容整理自公开资料与工程实践，代码示例为演示实现；发现错漏欢迎在 GitHub 开 issue 指正。
</p>
