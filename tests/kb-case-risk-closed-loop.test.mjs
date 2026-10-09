import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/security/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「刷活动奖励刷了三百万，封了又放」的风控闭环排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「行为风控真正成熟的标志」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('行为风控真正成熟的标志')
  expect(start, 'security 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/security/03「刷活动奖励刷了三百万，封了又放」的风控闭环排查）', () => {
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
    for (const term of ['处置策略落地', '人工复核', '申诉证据链', '系统联动']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['处置策略落地', '申诉证据链', '风险分层', '处罚梯度']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：刷量、处置、申诉、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 刷量账：3 天 300 万
    expect(Number(grab(/\*\*(\d+)\*\* 天刷出 \*\*(\d+)\*\* 万游戏币/, '刷量')[1])).toBe(3)
    expect(Number(grab(/\*\*(\d+)\*\* 天刷出 \*\*(\d+)\*\* 万游戏币/, '刷量')[2])).toBe(300)
    // 处置账：命中 12 万条处置 0 条
    expect(Number(grab(/命中 \*\*(\d+)\*\* 万条规则却处置 \*\*(\d+)\*\* 条/, '处置')[1])).toBe(12)
    expect(Number(grab(/命中 \*\*(\d+)\*\* 万条规则却处置 \*\*(\d+)\*\* 条/, '处置')[2])).toBe(0)
    // 申诉账：800 起申诉、200 起误伤
    expect(Number(grab(/申诉 \*\*(\d+)\*\* 起/, '申诉')[1])).toBe(800)
    expect(Number(grab(/误伤 \*\*(\d+)\*\* 起/, '误伤')[1])).toBe(200)
    // 复核账：回收 270 万、误伤确认 12 起、响应 3 天 → 4 小时
    expect(Number(grab(/当周回收 \*\*(\d+)\*\* 万/, '回收')[1])).toBe(270)
    expect(Number(grab(/复核后确认 \*\*(\d+)\*\* 起/, '误伤确认')[1])).toBe(12)
    expect(Number(grab(/申诉响应 \*\*(\d+)\*\* 天 → \*\*(\d+)\*\* 小时/, '响应')[1])).toBe(3)
    expect(Number(grab(/申诉响应 \*\*(\d+)\*\* 天 → \*\*(\d+)\*\* 小时/, '响应')[2])).toBe(4)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见错误恰好 4 条
    const sMis = page.slice(page.indexOf('### 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 闭环五层恰好 5 条
    const sLoop = page.slice(page.indexOf('### 风控闭环至少要有哪几层'), page.indexOf('### 为什么很多风控系统最后不工作'))
    expect((sLoop.match(/^- /gm) || []).length).toBe(5)
    // 不工作四因恰好 4 条
    const sFail = page.slice(page.indexOf('### 为什么很多风控系统最后不工作'), page.indexOf('### 更有用的设计方式'))
    expect((sFail.match(/^- /gm) || []).length).toBe(4)
    // 处罚梯度恰好 6 条
    const sTier = page.slice(page.indexOf('### 把处罚动作分梯度'), page.indexOf('### 风控和其他系统为什么必须联动'))
    expect((sTier.match(/^- /gm) || []).length).toBe(6)
    for (const s of [
      '只有检测没有处置，风险只会持续累积；只有处置没有申诉，误伤会迅速制造舆情和客服压力',
      '申诉时拿不出证据，只能机械回复',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 风控闭环至少要有哪几层',
      '### 为什么很多风控系统最后不工作',
      '### 把风控对象分层',
      '### 把处罚动作分梯度',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/security')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
