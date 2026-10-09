import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/skynet.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「帧同步建在 skynet 上，tick 精度不够」的边界误判排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以 Reference 术语对照收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('术语对照：Service（服务 = 一个常驻 Lua VM）')
  expect(start, 'skynet 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/skynet「帧同步建在 skynet 上，tick 精度不够」的边界误判排查）', () => {
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
    for (const term of ['精度边界', '适用场景', '服务粒度', '配套立项']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['精度边界', '适用场景', '服务粒度', '配套立项']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：tick 抖动、粒度收敛、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // tick 账：抖动 20 毫秒
    expect(Number(grab(/tick 抖动 \*\*(\d+)\*\* 毫秒/, 'tick 初值')[1])).toBe(20)
    // 复核账：20 毫秒 → 专用对局服 2 毫秒
    expect(Number(grab(/tick 抖动 \*\*(\d+)\*\* 毫秒 → 专用对局服 \*\*(\d+)\*\* 毫秒/, 'tick 复核')[2])).toBe(2)
    // 粒度账：收敛 30%
    expect(Number(grab(/服务粒度收敛 \*\*(\d+)\*\*%/, '粒度收敛')[1])).toBe(30)
    // 配套账：8 项立项
    expect(Number(grab(/自建配套 \*\*(\d+)\*\* 项立项/, '配套立项')[1])).toBe(8)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 适用场景三档合计 8 条
    const sScene = page.slice(page.indexOf('### 13. 适用游戏场景'), page.indexOf('## Used By'))
    expect((sScene.match(/^- /gm) || []).length).toBe(8)
    // Used By 恰好 3 条
    const sUsed = page.slice(page.indexOf('## Used By'), page.indexOf('## Related'))
    expect((sUsed.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '帧同步等亚 10ms 强实时逻辑不该建在它上面',
      'skynet 把「正确的并发结构」做进内核，把「性能、运维、存储」的选择权交给用户',
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
