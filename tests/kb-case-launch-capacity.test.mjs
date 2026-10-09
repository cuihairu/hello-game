import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/capacity/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「开服十分钟，登录先倒」的容量推演断链排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「容量规划做得好坏，平时看不出来」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('容量规划做得好坏，平时看不出来')
  expect(start, 'capacity 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/capacity/01「开服十分钟，登录先倒」的容量推演断链排查）', () => {
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
    for (const term of ['行为构成', '拐点 **70**%', '故障余量', '上线后校准']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['行为构成输入', '压测标注条件', '拐点水位', '余量弹性分账']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：压测上限差、拐点水位、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 上限差账：压测 8 万 vs 实测 2.1 万，差近 4 倍
    expect(Number(grab(/单机登录承载 \*\*(\d+)\*\* 万连接/, '压测上限')[1])).toBe(8)
    expect(Number(grab(/同规格单机实测只能稳住 \*\*(\d+(?:\.\d+)?)\*\* 万在线/, '实测承载')[1])).toBe(2.1)
    expect(Math.round(8 / 2.1)).toBe(4)
    expect(Number(grab(/上限差了近 \*\*(\d+)\*\* 倍/, '上限差')[1])).toBe(4)
    // 规模账：预约 60 万、峰值 15 万、拐点 3 万
    expect(Number(grab(/预约 \*\*(\d+)\*\* 万，开服首日峰值在线 \*\*(\d+)\*\* 万/, '规模')[1])).toBe(60)
    expect(Number(grab(/预约 \*\*(\d+)\*\* 万，开服首日峰值在线 \*\*(\d+)\*\* 万/, '规模')[2])).toBe(15)
    expect(Number(grab(/真实拐点 \*\*(\d+)\*\* 万在线/, '拐点')[1])).toBe(3)
    // 复核账：二次开服峰值 22 万、登录 P99 420ms
    expect(Number(grab(/二次开服峰值 \*\*(\d+)\*\* 万在线，登录 P99 \*\*(\d+)\*\* 毫秒/, '复核')[1])).toBe(22)
    expect(Number(grab(/二次开服峰值 \*\*(\d+)\*\* 万在线，登录 P99 \*\*(\d+)\*\* 毫秒/, '复核')[2])).toBe(420)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 6 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // 压测失真来源恰好 5 条
    const sDistort = page.slice(page.indexOf('### 压测失真的常见来源'), page.indexOf('### 拐点与安全水位'))
    expect((sDistort.match(/^- /gm) || []).length).toBe(5)
    // 水位规则恰好 3 条
    const sKnee = page.slice(page.indexOf('### 拐点与安全水位'), page.indexOf('### 余量给故障，弹性给增长'))
    expect((sKnee.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '只发登录和心跳的机器人，测出的上限可能比真实混合负载高数倍',
      '数字再漂亮也支撑不了容量决策',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 从业务指标出发，而不是从机器出发',
      '### 压测的目的不是刷峰值',
      '### 拐点与安全水位',
      '### 余量给故障，弹性给增长',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/capacity')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
