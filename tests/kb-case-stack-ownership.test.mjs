import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「引擎够用，项目却越来越难改」的技术栈责任划分排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('在安全、同步和一致性上一起付出代价')
  expect(start, 'client/01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/01「引擎够用，项目却越来越难改」的技术栈责任划分排查）', () => {
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
    for (const term of ['交付口径', '升级口径', '复核账', '三层责任清单']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['三层责任清单', '适配层收口', '跨层改动计数', '升级回归预算']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：交付人日、跨层改动、升级回归、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：交付 15 人日、跨层 10 人日、升级回归 5 天
    expect(Number(grab(/需求平均交付 \*\*(\d+)\*\* 人日/, '交付初值')[1])).toBe(15)
    expect(Number(grab(/跨层同步改动 \*\*(\d+)\*\* 人日/, '跨层初值')[1])).toBe(10)
    expect(Number(grab(/全量回归要 \*\*(\d+)\*\* 天/, '回归初值')[1])).toBe(5)
    // 复核账：交付 15 → 9 人日、跨层 10 → 3 人日、升级回归 5 → 1 天
    expect(Number(grab(/需求平均交付 \*\*(\d+)\*\* 人日 → \*\*(\d+)\*\* 人日/, '交付复核')[2])).toBe(9)
    expect(Number(grab(/跨层同步改动 \*\*(\d+)\*\* 人日 → \*\*(\d+)\*\* 人日/, '跨层复核')[2])).toBe(3)
    expect(Number(grab(/升级回归 \*\*(\d+)\*\* 天 → \*\*(\d+)\*\* 天/, '回归复核')[2])).toBe(1)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 引擎不替你解决的项目级问题恰好 5 条
    const sEng = page.slice(page.indexOf('但引擎通常不替你解决下面这些项目级问题'), page.indexOf('所以引擎更像地基和公共设施'))
    expect((sEng.match(/^- /gm) || []).length).toBe(5)
    // 「卡在引擎够用」的卡点清单恰好 5 条（切到下一节标题为止，案例节在其后）
    const sStuck = page.slice(page.indexOf('### 为什么很多项目会卡在'), page.indexOf('### 技术栈选型真正要看什么'))
    expect((sStuck.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '所以引擎更像地基和公共设施，不等于整套项目架构。',
      '真正影响项目成败的，往往不是引擎名字',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 更稳妥的做法通常是什么',
      '### 引擎到底解决什么，不解决什么',
      '### 为什么很多项目会卡在“引擎够用，但项目越来越难改”',
      '### 版本节奏和热修复压力有多大',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
