import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/aoi.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「主城里明明有人，屏幕上却空着」的可见集漏更新排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以 Reference 术语对照收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('术语对照：Interest Management')
  expect(start, 'aoi 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/aoi「主城里明明有人，屏幕上却空着」的可见集漏更新排查）', () => {
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
    for (const term of ['迟滞必选', '更新自适应', '高峰预分配', '可靠通道']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['迟滞带', '更新自适应', '高峰预分配', '通道配套']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：漏人量、更新延迟、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 漏人账：40 起/日 → 2 起/日
    expect(Number(grab(/日均 \*\*(\d+)\*\* 起/, '漏人初值')[1])).toBe(40)
    expect(Number(grab(/漏人投诉 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '漏人复核')[2])).toBe(2)
    // 延迟账：8 秒 → 400 毫秒
    expect(Number(grab(/更新延迟 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '延迟复核')[1])).toBe(8)
    expect(Number(grab(/更新延迟 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '延迟复核')[2])).toBe(400)
    // 同屏实体 200
    expect(Number(grab(/同屏 \*\*(\d+)\*\* 个实体/, '同屏实体')[1])).toBe(200)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // Used By 恰好 4 条
    const sUsed = page.slice(page.indexOf('## Used By'), page.indexOf('## Related'))
    expect((sUsed.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '同屏可见实体通常只有几十个，消息量降一到两个数量级',
      '没有它，站在商店门口的玩家会收到成对的重复进出消息',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of ['## Problem', '## Algorithm', '## Reference']) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
    expect(pages).toContain('aoi.md')
  })
})
