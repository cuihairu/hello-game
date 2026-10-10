import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/06.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「把专用运行时当通用底座，帧推进越跑越飘」的边界误判排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正要说明的…」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正要说明的，不是某个具体实现多酷')
  expect(start, 'runtime/06 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/06「把专用运行时当通用底座，帧推进越跑越飘」的边界误判排查）', () => {
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
    for (const term of ['强运行时、弱通用平台', '时间先于调度', '时序治理', '内核收口']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['内核边界清单', 'Epoch 一级概念', 'Channel 时序治理', '不适用边界评审']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：外围混入、帧抖动、积压、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 混入账：4 类外围业务全部进内核
    expect(Number(grab(/\*\*(\d+)\*\* 类外围业务全部进内核/, '外围混入')[1])).toBe(4)
    // 慢依赖账：支付回调 1.8 秒
    expect(Number(grab(/支付回调平均 \*\*([\d.]+)\*\* 秒/, '支付回调')[1])).toBe(1.8)
    // 抖动账：P99 22 毫秒
    expect(Number(grab(/帧推进抖动 P99 \*\*(\d+)\*\* 毫秒/, '抖动初值')[1])).toBe(22)
    // 复核账：P99 22 → 3、外围 4 → 0 类、积压 6 万条 → 4000 条
    expect(Number(grab(/帧推进抖动 P99 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '抖动复核')[2])).toBe(3)
    expect(Number(grab(/外围业务 \*\*(\d+)\*\* 类 → \*\*(\d+)\*\* 类留在内核/, '外围复核')[2])).toBe(0)
    expect(Number(grab(/Channel 峰值积压 \*\*(\d+)\*\* 万条 → \*\*(\d+)\*\* 条/, '积压复核')[1])).toBe(6)
    expect(Number(grab(/Channel 峰值积压 \*\*(\d+)\*\* 万条 → \*\*(\d+)\*\* 条/, '积压复核')[2])).toBe(4000)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 最适合承接 5 条
    const sBest = page.slice(page.indexOf('### 它最适合承接什么问题'), page.indexOf('### 它不适合什么问题'))
    expect((sBest.match(/^- /gm) || []).length).toBe(5)
    // 不适合 4 条
    const sNot = page.slice(page.indexOf('### 它不适合什么问题'), page.indexOf('### 和普通 Actor 框架最大的区别'))
    expect((sNot.match(/^- /gm) || []).length).toBe(4)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '它不是“更强通用框架”，而是“更窄、更硬、更有立场的运行时”',
      '时间先于调度，顺序先于并发',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 一个更贴近游戏服务器的落点',
      '### `Epoch` 在这里真正意味着什么',
      '### 这里的 Channel 解决的不是“通信”，而是“时序治理”',
      '### 它不适合什么问题',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/runtime')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('06.md')
  })
})
