import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「公告把战斗广播拖垮」的背压与优先级排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「真正成熟的系统」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('真正成熟的系统')
  expect(start, '第 5 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/04「公告把战斗广播拖垮」的背压与优先级排查）', () => {
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
    for (const term of ['优先级隔离', '显式容量上限', '退化顺序四层', '降频或覆盖旧值']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['优先级隔离', '显式容量上限', '退化顺序', '背压与优先级同设计']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：延迟劣化、积压构成、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 延迟账：60ms → 3.5s，劣化 58 倍可复算
    const d0 = Number(grab(/房间广播延迟从 \*\*(\d+)\*\* 毫秒涨到 \*\*([\d.]+)\*\* 秒/, '延迟前后')[1])
    const d1 = Number(grab(/房间广播延迟从 \*\*(\d+)\*\* 毫秒涨到 \*\*([\d.]+)\*\* 秒/, '延迟前后')[2])
    expect(d0).toBe(60)
    expect(d1).toBe(3.5)
    expect(Math.round((d1 * 1000) / d0)).toBe(58)
    // 积压账：写缓冲 2.8 万 → 4000，外围消息占 83%
    expect(Number(grab(/写缓冲峰值 \*\*(\d+(?:\.\d+)?)\*\* 万条/, '积压初值（万）')[1])).toBe(2.8)
    expect(Number(grab(/写缓冲峰值 \*\*(\d+(?:\.\d+)?)\*\* 万条 → \*\*(\d+)\*\* 条/, '积压复核')[2])).toBe(4000)
    expect(Number(grab(/占 \*\*(\d+)\*\*%/, '外围占比')[1])).toBe(83)
    // 超时账：0.2% → 2.1% → 0.1%
    expect(Number(grab(/战斗操作超时率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%/, '超时劣化')[2])).toBe(2.1)
    expect(Number(grab(/战斗操作超时率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%；下一次/, '超时复核')[2])).toBe(0.1)
    // CPU 利用率 45%
    expect(Number(grab(/CPU 利用率只有 \*\*(\d+)\*\*%/, 'CPU 利用率')[1])).toBe(45)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 复核延迟：3.5s → 80ms
    expect(sec.includes('**3.5** 秒 → **80** 毫秒')).toBe(true)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内手段集恰好 6 条
    const sTool = page.slice(page.indexOf('### 稳定系统通常会准备哪些手段'), page.indexOf('### 容量上限必须是显式设计'))
    expect((sTool.match(/^- /gm) || []).length).toBe(9)
    for (const s of ['表面没挂，体验却已经不可用']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 为什么高峰时真正先炸的是队列',
      '### 容量上限必须是显式设计',
      '### 一个更贴近实践的退化顺序',
      '### 背压必须和业务优先级一起设计',
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
