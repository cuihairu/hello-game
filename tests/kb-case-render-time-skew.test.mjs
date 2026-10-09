import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「低端机技能总是慢半拍」的渲染时间与逻辑时间错位排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「时间体系一旦松散」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('时间体系一旦松散')
  expect(start, '第 4 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/01「低端机技能总是慢半拍」的渲染时间与逻辑时间错位排查）', () => {
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
    // 四种时间与多时钟分层落到案例里
    for (const term of ['渲染帧率被当逻辑时间', '渲染层独立插值时钟', '补帧预算', '固定 Tick']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of ['四种时间拆分', '渲染插值时钟', '补帧预算', '帧差可观测']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：帧差归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：日活 30 万、低端机占 22%
    expect(Number(grab(/日活 \*\*(\d+)\*\* 万/, '日活')[1])).toBe(30)
    expect(Number(grab(/低端机（\*\*(\d+)\*\* FPS 档）占 \*\*(\d+)\*\*%/, '低端机占比')[2])).toBe(22)
    // 帧差账：低端机 12 帧、高端机 1–2 帧
    const skew = Number(grab(/低端机达 \*\*(\d+)\*\* 帧/, '低端机帧差')[1])
    expect(skew).toBe(12)
    expect(sec.includes('稳定在 **1–2** 帧')).toBe(true)
    // 归因三分账：百分比合计 100，帧数合计 = 12，且逐行可复算
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+([\d.]+) 帧$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), f: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(Number(rows.reduce((s, r) => s + r.f, 0).toFixed(1))).toBe(skew)
    expect(rows.map(r => Number((r.pct * skew / 100).toFixed(1)))).toEqual(rows.map(r => r.f))
    // 投诉账：日 420 → 30
    expect(Number(grab(/日 \*\*(\d+)\*\* 单/, '投诉初值')[1])).toBe(420)
    expect(Number(grab(/投诉日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '投诉复核')[2])).toBe(30)
    // 复核账：帧差 12 → 2
    expect(Number(grab(/低端机帧差 \*\*(\d+)\*\* 帧 → \*\*(\d+)\*\* 帧/, '帧差复核')[2])).toBe(2)
    // 逻辑步长 33 毫秒、单帧最多补 4 步
    expect(sec.includes('固定 **33** 毫秒一步')).toBe(true)
    expect(sec.includes('最多补 **4** 步逻辑')).toBe(true)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内四种时间恰好 4 条
    const sTime = page.slice(page.indexOf('### 先把四种时间拆开'), page.indexOf('### 固定 Tick 为什么仍然是主流'))
    expect((sTime.match(/^- /gm) || []).length).toBe(4)
    // 页内多时钟分层恰好 4 条
    const sClock = page.slice(page.indexOf('### 真实项目里常见的是多时钟分层'), page.indexOf('### 客户端和服务端到底要共享哪一种时间'))
    expect((sClock.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话可查
    for (const s of ['把渲染帧率当逻辑时间，机器一掉帧，战斗节奏就跟着变']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 先把四种时间拆开',
      '### 真实项目里常见的是多时钟分层',
      '### 补帧、追帧和帧预算必须提前设计',
      '### 可观测性应该从时间开始',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/server/sync')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(9)
    expect(pages).toContain('index.md')
    expect(pages).toContain('08.md')
  })
})
