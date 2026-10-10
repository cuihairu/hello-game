import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「一套万能消息框架，把主链路和外围一起拖垮」的边界失控排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「消息模式设计真正要回答的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('消息模式设计真正要回答的，不是“选哪种风格”')
  expect(start, 'networking/05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/05「一套万能消息框架，把主链路和外围一起拖垮」的边界失控排查）', () => {
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
    for (const term of ['语义拆分', '接收者裁剪', '优先级隔离', '服务边界']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['语义拆分五类', '广播四层裁剪', '分工落地五条', '框架边界哨兵']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：消息混放、推送延迟、全量广播、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 混放账：5 类消息塞一套框架
    expect(Number(grab(/\*\*(\d+)\*\* 类消息/, '消息混放')[1])).toBe(5)
    // 初值账：推送延迟 P99 1200 毫秒、全量广播带宽 70%
    expect(Number(grab(/推送延迟 P99 \*\*(\d+)\*\* 毫秒/, '延迟初值')[1])).toBe(1200)
    expect(Number(grab(/全量广播带宽占比 \*\*(\d+)%\*\*/, '带宽初值')[1])).toBe(70)
    // 复核账：延迟 1200 → 40 毫秒、带宽 70% → 18%
    expect(Number(grab(/推送延迟 P99 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '延迟复核')[2])).toBe(40)
    expect(Number(grab(/全量广播带宽占比 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '带宽复核')[2])).toBe(18)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 五类交互恰好 5 条
    const sInt = page.slice(page.indexOf('### 为什么消息模式必须按语义拆开'), page.indexOf('## Problem'))
    expect((sInt.match(/^- /gm) || []).length).toBe(5)
    // 分工方式与好处合计 8 条
    const sDiv = page.slice(page.indexOf('### 一种更贴近实践的分工方式'), page.indexOf('### 消息模式会直接影响服务边界'))
    expect((sDiv.match(/^- /gm) || []).length).toBe(8)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '谁应该知道什么变化',
      '消息模式不是通信美学，而是服务边界设计的一部分',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 为什么消息模式必须按语义拆开',
      '### 广播最该先考虑什么',
      '### 一种更贴近实践的分工方式',
      '### 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('05.md')
  })
})
