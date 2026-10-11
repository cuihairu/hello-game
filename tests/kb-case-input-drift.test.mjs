import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/input.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「同一操作，不同设备三种判定」的输入时序漂移排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「触屏与多设备」小节收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('映射表要带死区与曲线校准')
  expect(start, 'client/input 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/input「同一操作，不同设备三种判定」的输入时序漂移排查）', () => {
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
    for (const term of ['采样口径', '序号口径', '复现口径', '采样统一', '键位数据化', '区域所有权']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['采样时机', '序号唯一', '键位数据化', '区域所有权']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：三档通过率差、采样轮询账、复现账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 三档通过率账：96.2 / 93.1 / 89.8，最大差 6.4
    const gap = grab(/通过率键盘 \*\*(\d+(?:\.\d+)?)\*\*%、触屏 \*\*(\d+(?:\.\d+)?)\*\*%、手柄 \*\*(\d+(?:\.\d+)?)\*\*%，最大相差 \*\*(\d+(?:\.\d+)?)\*\* 个百分点/, '三档通过率')
    const [kb, touch, pad, gap0] = gap.slice(1).map(Number)
    expect(Math.max(kb, touch, pad) - Math.min(kb, touch, pad)).toBeCloseTo(gap0, 6)
    // 轮询账：120 赫兹 ÷ 60 帧 = 每 2 帧轮到一次
    const poll = grab(/手柄按 \*\*(\d+)\*\* 赫兹轮询、渲染跑 \*\*(\d+)\*\* 帧——手柄平均每 \*\*(\d+)\*\* 帧才轮到一次/, '轮询账')
    expect(Number(poll[1]) / Number(poll[2])).toBe(Number(poll[3]))
    // 序号账：1000 帧样本重复 17 次
    expect(Number(grab(/意图序号重复 \*\*(\d+)\*\* 次/, '序号重复')[1])).toBe(17)
    // 复现账：4200 条工单里 3066 条（73%）
    const total = Number(grab(/判定类工单每月 \*\*(\d+)\*\* 条/, '工单总量')[1])
    const repro = grab(/条工单里 \*\*(\d+)\*\* 条（(\d+)%）换设备就换结论/, '复现账')
    expect(total).toBe(4200)
    expect(Number(repro[1])).toBe(Math.round(total * Number(repro[2]) / 100))
    // 返工账：改键位 9 人天 → 1 人天
    expect(Number(grab(/改动花了 \*\*(\d+)\*\* 人天/, '返工初值')[1])).toBe(9)
    expect(Number(grab(/改键位改动 \*\*(\d+)\*\* 人天 → \*\*(\d+)\*\* 人天/, '返工复核')[2])).toBe(1)
    // 复核账：最大差 6.4 → 0.8，序号重复 17 → 0
    const reGap = grab(/最大差 \*\*(\d+(?:\.\d+)?)\*\* → \*\*(\d+(?:\.\d+)?)\*\* 个百分点/, '通过率复核')
    expect(Number(reGap[1])).toBe(gap0)
    expect(Number(reGap[2])).toBe(0.8)
    expect(Number(grab(/序号重复 \*\*(\d+)\*\* → \*\*(\d+)\*\* 次/, '序号复核')[2])).toBe(0)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // Problem 表现恰好 4 条
    const sProb = page.slice(page.indexOf('## Problem'), page.indexOf('## Algorithm'))
    expect((sProb.match(/^- /gm) || []).length).toBe(4)
    // 手感三口径恰好 3 条
    const sFeel = page.slice(page.indexOf('### 手感三口径'), page.indexOf('### 触屏与多设备'))
    expect((sFeel.match(/^- /gm) || []).length).toBe(3)
    // 触屏与多设备恰好 3 条
    const sMulti = page.slice(page.indexOf('### 触屏与多设备'), page.indexOf('## Used By'))
    expect((sMulti.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '可复算、可重放、可丢弃',
      '键位是数据不是代码',
      '一个触点只能被一个控件持有',
      '设备差异在这一段消化，下游不再感知设备',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 管线五段',
      '### 手感三口径',
      '### 触屏与多设备',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–05 + input
    const pages = readdirSync(resolve(root, 'docs/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('input.md')
  })
})
