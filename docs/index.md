---
layout: page
sidebar: false
---

<script setup>
import config from './.vitepress/config.mjs'
import { withBase } from 'vitepress'

const tutorial = config.themeConfig.sidebar['/24-game-types-architecture/']
const kb = config.themeConfig.sidebar['/']

const allLinks = (groups) =>
  groups.flatMap(g => [
    ...(g.link ? [g.link] : []),
    ...(g.items ?? []).map(it => it.link)
  ])

// 教程目录：分组展示，组级链接（如选型对照总览）作为各组首行；
// 组标题剥掉 emoji 前缀，与图纸标注的克制语言一致
const tutorialGroups = tutorial.map(g => ({
  text: g.text.replace(/^\S+\s/, ''),
  link: g.link ?? null,
  items: (g.items ?? []).map(it => ({
    num: (it.text.match(/(\d{2})/) ?? [])[1] ?? '+',
    title: it.text.replace(/^\d{2}\s*/, ''),
    link: it.link
  }))
}))

// 知识库目录：每组取章主页；编号取自分组标题（导读 00、附录 A 系、总索引 A）
const KB_NUM_SPECIAL = { 导读: '00', 附录与横向索引: 'A' }
const kbChapters = kb
  .filter(g => g.items?.length)
  .map(g => {
    const home = g.items[0]
    return {
      num: KB_NUM_SPECIAL[g.text] ?? (g.text.match(/(?:^|\s)(A?\d+)[.\s]/) ?? [])[1] ?? '+',
      title: home.text,
      link: home.link
    }
  })

// 精确锚定教程目录前缀：/\/\d{2}-/ 会误命中「24-」
const lectureCount = allLinks(tutorial).filter(l => /^\/24-game-types-architecture\/\d{2}-/.test(l)).length

// 知识库 24 个章级入口拆 3 栏
const kbChunkSize = Math.ceil(kbChapters.length / 3)
const kbChunks = [
  kbChapters.slice(0, kbChunkSize),
  kbChapters.slice(kbChunkSize, kbChunkSize * 2),
  kbChapters.slice(kbChunkSize * 2)
]
const kbChapterCount = kb.filter(g => /^\d+\.\s/.test(g.text)).length
const appendixCount = kb.filter(g => /^附录 A\d/.test(g.text)).length
const pageCount = allLinks(tutorial).length + allLinks(kb).length
</script>

<div class="bp-hero">
  <p class="bp-kicker">GAME · NETWORK · CONCURRENCY · OPS</p>
  <h1 class="bp-title">游戏知识体系</h1>
  <p class="bp-lede">
    软件架构先是一张图纸：问题模型决定形状，约束画出边界。这套内容围绕游戏项目里的真实问题组织——
    <strong>后端是主场</strong>（网络同步、并发、数据、运营与安全），引擎客户端、测试质量与协作管线按够用且成体系的深度补齐。
  </p>
  <p class="bp-meta">
    <span>教程 {{ lectureCount }} 讲</span>
    <span>知识库 {{ kbChapterCount }} 章</span>
    <span>附录 {{ appendixCount }} 篇</span>
    <span>站内 {{ pageCount }} 页</span>
  </p>
</div>

<h2 class="bp-h2">教程 · 从零到实战的 {{ lectureCount }} 讲</h2>

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
  教程按「入门 → 基础 → 架构 → 实现 → 运营 → 专题」推进，每讲聚焦一类真实问题；建议从头通读，或在选型对照总览里按问题找讲次。
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
  知识库与教程主线同题对应：教程是实战路线，知识库是逐章展开的参考。带着具体问题来查，或从<a :href="withBase('/02-models/')">问题模型</a>进入。
</p>

<h2 class="bp-h2">三条阅读线索</h2>

<ol class="bp-threads">
  <li>
    <h3><a :href="withBase('/24-game-types-architecture/01-entry')">从第 01 讲开始系统学习</a></h3>
    <p>从「游戏与技术的关系」一路讲到「安全与合规」，适合从头到尾建立完整的知识框架。</p>
  </li>
  <li>
    <h3><a :href="withBase('/00-reading-guide/')">从知识库导读按问题进入</a></h3>
    <p>推荐阅读顺序与按问题索引：立项时识别主导矛盾，开发中检查方案边界，上线后做事故复盘。</p>
  </li>
  <li>
    <h3><a :href="withBase('/24-game-types-architecture/expansion')">看站点扩展规划</a></h3>
    <p>游戏知识体系如何长成完整的游戏开发知识体系——客户端架构、测试质量、美术音频管线的补齐路线与落地状态。</p>
  </li>
</ol>

<p class="bp-colophon">
  内容整理自公开资料与工程实践，代码示例为演示实现；发现错漏欢迎在 GitHub 开 issue 指正。
</p>
