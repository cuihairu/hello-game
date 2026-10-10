import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/ipc/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「奖励发了两次，成就进度还倒退」的唯一身份缺失排查'

// 案例切片：知识库页正文（常见误区）之后、Used By 之前追加的案例节
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('重复、乱序和重试一来，业务副作用立刻失控')
  expect(start, 'ipc/05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## Used By'), '案例应位于 Used By 之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, src.indexOf('## Used By'))
}

describe('实战案例冒烟（知识库 networking/ipc/05「奖励发了两次，成就进度还倒退」的唯一身份缺失排查）', () => {
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
    for (const term of [
      '为什么幂等几乎是必备能力',
      '更现实的做法是缩小顺序作用域',
      '消息语义设计时，先把“唯一身份”定出来',
      '一个更贴近工程实际的消费策略',
    ]) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['幂等四情形', '顺序作用域', '唯一身份登记', '消费策略四件']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：重复账、乱序账、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 重复与乱序账：217 + 54 + 29 = 300
    expect(Number(grab(/重复发奖日均 \*\*(\d+)\*\* 起/, '重复初值')[1])).toBe(217)
    expect(Number(grab(/成就进度乱序工单日均 \*\*(\d+)\*\* 起/, '乱序初值')[1])).toBe(83)
    expect(Number(grab(/跨分区并行乱序 \*\*(\d+)\*\* 起 \+ 积压恢复重放旧事件 \*\*(\d+)\*\* 起/, '乱序拆账')[1])).toBe(54)
    expect(Number(sec.match(/跨分区并行乱序 \*\*(\d+)\*\* 起 \+ 积压恢复重放旧事件 \*\*(\d+)\*\* 起/)[2])).toBe(29)
    expect(Number(grab(/两账合计 \*\*(\d+)\*\* 起/, '合计')[1])).toBe(300)
    expect(sec.includes('**217 + 54 + 29 = 300**'), '案例缺少归因基数算式').toBe(true)
    // 三分账：72 / 18 / 10 合计 100
    const split = grab(/按 \*\*(\d+)\*\*% \/ \*\*(\d+)\*\*% \/ \*\*(\d+)\*\*% 三分账/, '三分账')
    expect([Number(split[1]), Number(split[2]), Number(split[3])].reduce((s, n) => s + n, 0)).toBe(100)
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 复核账：217 → 3、83 → 2、幂等键 0% → 100%
    const rr = grab(/重复发奖 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '重复复核')
    expect(Number(rr[1])).toBe(217)
    expect(Number(rr[2])).toBe(3)
    const ro = grab(/进度乱序工单 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '乱序复核')
    expect(Number(ro[1])).toBe(83)
    expect(Number(ro[2])).toBe(2)
    const rk = grab(/幂等键覆盖 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '幂等键复核')
    expect(Number(rk[1])).toBe(0)
    expect(Number(rk[2])).toBe(100)
  })

  it('声称对账：案例引用的页内原话与清单条数可查', () => {
    // 幂等触发与典型例子 7 条、顺序作用域 3 条、唯一身份 4 条、消费策略 4 条
    const sIdem = page.slice(page.indexOf('### 为什么幂等几乎是必备能力'), page.indexOf('### 顺序为什么总是比想象中更贵'))
    expect((sIdem.match(/^- /gm) || []).length).toBe(7)
    const sScope = page.slice(page.indexOf('### 更现实的做法是缩小顺序作用域'), page.indexOf('### 消息语义设计时，先把“唯一身份”定出来'))
    expect((sScope.match(/^- /gm) || []).length).toBe(3)
    const sIdent = page.slice(page.indexOf('### 消息语义设计时，先把“唯一身份”定出来'), page.indexOf('### 一个更贴近工程实际的消费策略'))
    expect((sIdent.match(/^- /gm) || []).length).toBe(4)
    const sConsume = page.slice(page.indexOf('### 一个更贴近工程实际的消费策略'), page.indexOf('### “恰好一次”为什么常被误解'))
    expect((sConsume.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '只要系统存在重试，就会有重复；只要存在并发和缓冲，就会有乱序',
      '顺序要求越宽，系统吞吐和扩展性通常越差',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 为什么幂等几乎是必备能力',
      '### 更现实的做法是缩小顺序作用域',
      '### 消息语义设计时，先把“唯一身份”定出来',
      '### 一个更贴近工程实际的消费策略',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking/ipc')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('05.md')
  })
})
