import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「重连后订单状态错乱」的隐式状态与队列堆积排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正要强调的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正要强调的')
  expect(start, '第 5 章 02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/02「重连后订单状态错乱」的隐式状态与队列堆积排查）', () => {
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
    for (const term of ['显式状态机', '协程只表达等待步骤', '容量上限、优先级隔离', '非法转换校验']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['显式状态机', '协程职责边界', '队列治理四件套', '分工方式']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：状态与队列两笔账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 状态账：订单错乱日 60 → 0
    expect(Number(grab(/订单状态错乱，日 \*\*(\d+)\*\* 单/, '订单初值')[1])).toBe(60)
    expect(Number(grab(/订单状态错乱日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '订单复核')[2])).toBe(0)
    // 队列账：堆积 4.2 万 → 6000、尾延迟 20 分钟 → 90 秒
    expect(Number(grab(/高峰堆积到 \*\*(\d+(?:\.\d+)?)\*\* 万条/, '堆积初值（万）')[1])).toBe(4.2)
    expect(Number(grab(/队列峰值 \*\*(\d+(?:\.\d+)?)\*\* 万条 → \*\*(\d+)\*\* 条/, '队列复核')[2])).toBe(6000)
    expect(Number(grab(/尾延迟 \*\*(\d+)\*\* 分钟/, '延迟初值')[1])).toBe(20)
    expect(Number(grab(/奖励发放尾延迟 \*\*(\d+)\*\* 分钟 → \*\*(\d+)\*\* 秒/, '延迟复核')[2])).toBe(90)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    const sSplit = page.slice(page.indexOf('### 一个更实用的分工方式'), page.indexOf('### 什么时候该优先哪一种'))
    expect((sSplit.match(/^- /gm) || []).length).toBe(6)
    for (const s of ['队列会从缓冲层变成故障放大器']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 协程真正擅长什么',
      '### 为什么显式状态机仍然重要',
      '### 任务队列解决的不是异步，而是排队与治理',
      '### 一个更实用的分工方式',
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
