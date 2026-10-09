import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「整点活动一开，战斗帧耗时雪崩」的帧预算污染排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「Tick 真正值钱的地方」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('Tick 真正值钱的地方')
  expect(start, '第 5 章 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/03「整点活动一开，战斗帧耗时雪崩」的帧预算污染排查）', () => {
  const sec = caseSection(page)

  it('四段结构齐全：背景与现象、四步、回填清单 + 教训收束', () => {
    for (const part of [
      '背景与现象',
      '第一步：现象与口径',
      '第二步：分层归因',
      '第三步：根因',
      '第四步：处置与回填',
      '回填清单',
      '案例的三个教训',
    ]) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    for (const term of ['外围任务外包异步', '单帧预算', '下一帧边界统一消费', '超预算降级']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['Tick 循环步骤顺序', '异步回帧边界', '帧预算', '不该 Tick 化的清单']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：帧耗时前后账、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 前后账：平时 P99 8ms、雪崩 90ms、持续 40 秒、回落 9ms
    const p0 = Number(grab(/P99 从 \*\*(\d+)\*\* 毫秒抖到 \*\*(\d+)\*\* 毫秒/, '帧耗前后')[1])
    const p1 = Number(grab(/P99 从 \*\*(\d+)\*\* 毫秒抖到 \*\*(\d+)\*\* 毫秒/, '帧耗前后')[2])
    expect(p0).toBe(8)
    expect(p1).toBe(90)
    expect(Number(grab(/持续约 \*\*(\d+)\*\* 秒/, '持续时长')[1])).toBe(40)
    expect(Number(grab(/P99 帧耗时 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '帧耗复核')[2])).toBe(9)
    // 灰度账：1/10 灰度抖动按比例减小
    expect(sec.includes('1/10')).toBe(true)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 预算账：最多消费 200 条、最多补 4 帧
    expect(sec.includes('最多消费 **200** 条外部消息')).toBe(true)
    expect(sec.includes('最多补 **4** 帧')).toBe(true)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内 Tick 循环恰好 7 步
    const sLoop = page.slice(page.indexOf('### 一个完整的 Tick 循环通常包含什么'), page.indexOf('### Tick 驱动最值钱的地方是把顺序说清楚'))
    expect((sLoop.match(/^\d\. /gm) || []).length).toBe(7)
    for (const s of ['某几帧特别慢，然后整条链路开始雪崩']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 一个完整的 Tick 循环通常包含什么',
      '### Tick 和异步任务应该怎样配合',
      '### 帧预算和节流不能事后补',
      '### 什么时候不应该强行 Tick 化',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/runtime')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('00.md')
  })
})
