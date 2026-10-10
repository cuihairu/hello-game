import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/00.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「一个模型打天下，全服越改越抖」的并发立场错配排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正想建立的…」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正想建立的，不是哪种模型最好')
  expect(start, 'runtime/00 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/00「一个模型打天下，全服越改越抖」的并发立场错配排查）', () => {
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
    for (const term of ['立场摆全', '主链路收口', '四问前置', '错放位置']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['立场坐标图', '主链路候选边界', '四问定收敛', '误区评审哨兵']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：链路混放、帧预算、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 混放账：一套模型盖 4 类链路
    expect(Number(grab(/一套 Actor 框架覆盖全服 \*\*(\d+)\*\* 类链路/, '链路混放')[1])).toBe(4)
    // 帧账：P99 48 毫秒，预算 16 毫秒
    expect(Number(grab(/帧 P99 涨到 \*\*(\d+)\*\* 毫秒（预算 \*\*(\d+)\*\* 毫秒）/, '帧初值')[1])).toBe(48)
    expect(Number(grab(/帧 P99 涨到 \*\*(\d+)\*\* 毫秒（预算 \*\*(\d+)\*\* 毫秒）/, '帧预算')[2])).toBe(16)
    // 排队账：35 毫秒
    expect(Number(grab(/热点场景 Actor 单帧排队 \*\*(\d+)\*\* 毫秒/, '排队初值')[1])).toBe(35)
    // 复核账：P99 48 → 16、排队 35 → 4、结算 6 小时 → 40 分钟
    expect(Number(grab(/帧 P99 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '帧复核')[2])).toBe(16)
    expect(Number(grab(/热点 Actor 单帧排队 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '排队复核')[2])).toBe(4)
    expect(Number(grab(/结算延迟 \*\*(\d+)\*\* 小时 → \*\*(\d+)\*\* 分钟/, '结算复核')[2])).toBe(40)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 主运行时候选与局部层合计 7 条
    const sMain = page.slice(page.indexOf('### 哪几类模型更接近游戏主运行时'), page.indexOf('### 一个更贴近游戏项目的判断方法'))
    expect((sMain.match(/^- /gm) || []).length).toBe(7)
    // 判断方法四问恰好 4 条
    const sJudge = page.slice(page.indexOf('### 一个更贴近游戏项目的判断方法'), page.indexOf('### 常见误区'))
    expect((sJudge.match(/^- /gm) || []).length).toBe(4)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '把适合外围系统的模型，错放到了高时序敏感的核心链路上',
      '选型会退化成信仰之争',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 一张更有用的总览表',
      '### 哪几类模型更接近游戏主运行时',
      '### 一个更贴近游戏项目的判断方法',
      '### 常见误区',
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
