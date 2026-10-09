import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/language.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「榜单第一的语言，帧抖动超了一倍」的运行时选型排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以 Reference 术语对照收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('术语对照：Runtime Model')
  expect(start, 'language 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/language「榜单第一的语言，帧抖动超了一倍」的运行时选型排查）', () => {
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
    for (const term of ['选型四问', '双层结构', '热更边界', '开源服务器地图']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['停顿形态评估', '双层结构', '热更边界', '形态落地']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：帧 P99、GC 停顿、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 帧账：P99 16ms → 34ms
    expect(Number(grab(/P99 从 \*\*(\d+)\*\* 毫秒涨到 \*\*(\d+)\*\* 毫秒/, '帧初值')[1])).toBe(16)
    expect(Number(grab(/P99 从 \*\*(\d+)\*\* 毫秒涨到 \*\*(\d+)\*\* 毫秒/, '帧初值')[2])).toBe(34)
    // GC 账：80ms 每 2 秒
    expect(Number(grab(/GC 停顿 \*\*(\d+)\*\* 毫秒每 \*\*(\d+)\*\* 秒一次/, 'GC 初值')[1])).toBe(80)
    expect(Number(grab(/GC 停顿 \*\*(\d+)\*\* 毫秒每 \*\*(\d+)\*\* 秒一次/, 'GC 初值')[2])).toBe(2)
    // 复核账：P99 34 → 17、GC 80 → 8、改动脉 2 周 → 当天
    expect(Number(grab(/P99 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '帧复核')[2])).toBe(17)
    expect(Number(grab(/GC 停顿 \*\*(\d+)\*\* 毫秒 → 并发标记 \*\*(\d+)\*\* 毫秒/, 'GC 复核')[2])).toBe(8)
    expect(Number(grab(/改动脉 \*\*(\d+)\*\* 周 → 当天热载/, '改动脉')[1])).toBe(2)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // Problem 恰好 4 条
    const sProb = page.slice(page.indexOf('## Problem'), page.indexOf('## Algorithm'))
    expect((sProb.match(/^- /gm) || []).length).toBe(4)
    // Used By 恰好 7 条
    const sUsed = page.slice(page.indexOf('## Used By'), page.indexOf('## Related'))
    expect((sUsed.match(/^- /gm) || []).length).toBe(7)
    for (const s of [
      '性能榜单和语法偏好不回答「这个运行时的停顿形态能否塞进 tick 预算」',
      '没有脚本层的服务端用「重启发版」硬扛',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of ['## Problem', '## Algorithm', '## Reference']) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
    expect(pages).toContain('aoi.md')
  })
})
