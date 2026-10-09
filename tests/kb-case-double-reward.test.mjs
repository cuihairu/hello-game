import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/services/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「结算发了两次奖」的重复副作用排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「最常见的错误，是只讨论正常路径」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最常见的错误，是只讨论正常路径')
  expect(start, '第 6 章 05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/services/05「结算发了两次奖」的重复副作用排查）', () => {
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
    for (const term of ['唯一业务 ID', '按结算单号幂等', '重连窗口', '重试补偿审计']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['唯一业务 ID 与幂等', '失败补偿路径', '重连语义五问', '恢复落点']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：重复笔数、恢复耗时、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 发奖账：217 笔/月 → 0 笔
    expect(Number(grab(/重复发奖 \*\*(\d+)\*\* 笔/, '发奖初值')[1])).toBe(217)
    expect(Number(grab(/重复发奖 \*\*(\d+)\*\* 笔\/月 → \*\*(\d+)\*\* 笔/, '发奖复核')[2])).toBe(0)
    // 发货账：30 笔 → 0 笔
    expect(Number(grab(/重复发货 \*\*(\d+)\*\* 笔/, '发货初值')[1])).toBe(30)
    expect(Number(grab(/重复发货 \*\*(\d+)\*\* 笔 → \*\*(\d+)\*\* 笔/, '发货复核')[2])).toBe(0)
    // 恢复耗时账：人工对账 2 天 → 自动补偿 5 分钟
    expect(Number(grab(/人工对账 \*\*(\d+)\*\* 天降到自动补偿 \*\*(\d+)\*\* 分钟/, '恢复耗时')[1])).toBe(2)
    expect(Number(grab(/人工对账 \*\*(\d+)\*\* 天降到自动补偿 \*\*(\d+)\*\* 分钟/, '恢复耗时')[2])).toBe(5)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区为行文段落，无列表项
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(0)
    // 幂等做法 3 条 + 例如 3 条 = 6
    const sIdem = page.slice(page.indexOf('### 幂等和补偿为什么是常备能力'), page.indexOf('### 重连语义为什么必须提前写清楚'))
    expect((sIdem.match(/^- /gm) || []).length).toBe(6)
    // 重连语义恰好 5 条
    const sRe = page.slice(page.indexOf('### 重连语义为什么必须提前写清楚'), page.indexOf('### 一条更贴近工程实际的恢复链路'))
    expect((sRe.match(/^- /gm) || []).length).toBe(5)
    // 恢复落点恰好 5 条
    const sRec = page.slice(page.indexOf('### 恢复能力通常应该落在哪些位置'), page.indexOf('### 一致性强度应该怎么分层取舍'))
    expect((sRec.match(/^- /gm) || []).length).toBe(5)
    for (const s of ['房间结算完成了，但奖励发放超时', '每次失败都必须有明确定义的去向，而不是停在半完成状态']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 幂等和补偿为什么是常备能力',
      '### 重连语义为什么必须提前写清楚',
      '### 一条更贴近工程实际的恢复链路',
      '### 恢复能力通常应该落在哪些位置',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/services')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
