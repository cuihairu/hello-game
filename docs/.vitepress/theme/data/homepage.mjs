// 首页（docs/index.md）目录数据的纯函数层：从 sidebar 配置推导首页展示结构。
// 这段逻辑原本内联在 index.md 的 <script setup> 里，零测试覆盖且出过
// lectureCount 正则误命中「24-」目录前缀的回归，抽出模块后纳入 coverage.include，
// 受 vitest 100% 覆盖口径约束。函数只吃参数不碰配置，便于合成边界用例。

// 展平分组里的全部链接（组级链接 + 条目链接），用于页数统计与讲次计数
export function allLinks(groups) {
  return groups.flatMap(g => [
    ...(g.link ? [g.link] : []),
    ...(g.items ?? []).map(it => it.link)
  ])
}

// 教程目录：分组展示，组级链接（如选型对照总览）作为各组首行；
// 组标题剥掉 emoji 前缀，与图纸标注的克制语言一致
export function buildTutorialGroups(tutorial) {
  return tutorial.map(g => ({
    text: g.text.replace(/^\S+\s/, ''),
    link: g.link ?? null,
    items: (g.items ?? []).map(it => ({
      num: (it.text.match(/(\d{2})/) ?? [])[1] ?? '+',
      title: it.text.replace(/^\d{2}\s*/, ''),
      link: it.link
    }))
  }))
}

// 知识库目录：每组取章主页；编号取自分组标题（导读 00、总索引 A，其余如「A1.」取自标题）
const KB_NUM_SPECIAL = { 导读: '00', 附录与横向索引: 'A' }
export function buildKbChapters(kb) {
  return kb
    .filter(g => g.items?.length)
    .map(g => {
      const home = g.items[0]
      return {
        num: KB_NUM_SPECIAL[g.text] ?? (g.text.match(/(?:^|\s)(A?\d+)[.\s]/) ?? [])[1] ?? '+',
        title: home.text,
        link: home.link
      }
    })
}

// 教程讲次计数——精确锚定目录前缀：裸 /\/\d{2}-/ 会误命中「24-game-types-architecture」的「24-」
export function countLectures(groups) {
  return allLinks(groups).filter(l => /^\/24-game-types-architecture\/\d{2}-/.test(l)).length
}

// 列表均分 3 栏（知识库章级入口拆 3 栏用）；空列表返回三份空数组
export function chunk3(items) {
  const size = Math.ceil(items.length / 3)
  return [
    items.slice(0, size),
    items.slice(size, size * 2),
    items.slice(size * 2)
  ]
}

// 首页统计数字：教程讲次 / 知识库正文章数 / 附录篇数 / 全站页数
export function homepageStats(tutorial, kb) {
  return {
    lectureCount: countLectures(tutorial),
    kbChapterCount: kb.filter(g => /^\d+\.\s/.test(g.text)).length,
    appendixCount: kb.filter(g => /^附录 A\d/.test(g.text)).length,
    pageCount: allLinks(tutorial).length + allLinks(kb).length
  }
}
