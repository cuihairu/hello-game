import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「同一帧，两台机器输入顺序不同」的帧包乱序排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「帧同步真正难的地方」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('帧同步真正难的地方')
  expect(start, '第 4 章 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/03「同一帧，两台机器输入顺序不同」的帧包乱序排查）', () => {
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
    // 输入窗口、默认输入、哈希检查点落到案例里
    for (const term of ['按玩家 ID 稳定排序', '默认输入', '状态哈希', '最早异常帧']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of ['输入窗口定序', '默认输入顺序', '状态哈希与检查点', '稳定遍历']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：分叉定位、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：4v4、分叉率 0.7%、回放一致率 96%、争议日 150
    expect(sec.includes('4v4')).toBe(true)
    expect(Number(grab(/分叉率 \*\*([\d.]+)\*\*%\/局/, '分叉率初值')[1])).toBe(0.7)
    expect(Number(grab(/回放一致率只有 \*\*(\d+)\*\*%/, '回放一致率初值')[1])).toBe(96)
    expect(Number(grab(/争议工单日 \*\*(\d+)\*\* 单/, '争议初值')[1])).toBe(150)
    // 定位账：每 60 帧哈希、最早异常帧 1400–1600、单测定位 1420 帧
    expect(Number(grab(/每 \*\*(\d+)\*\* 帧比对一次状态哈希/, '哈希周期')[1])).toBe(60)
    expect(sec.includes('1400–1600')).toBe(true)
    expect(Number(grab(/第 \*\*(\d+)\*\* 帧状态哈希出现差异/, '单测分叉帧')[1])).toBe(1420)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 复核账：分叉率 0.7% → 0.02%、回放一致率 96% → 99.9%、争议 150 → 20
    expect(Number(grab(/分叉率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%/, '分叉率复核')[2])).toBe(0.02)
    expect(Number(grab(/回放一致率 \*\*(\d+)\*\*% → \*\*([\d.]+)\*\*%/, '回放复核')[2])).toBe(99.9)
    expect(Number(grab(/争议工单日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '争议复核')[2])).toBe(20)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 4 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 页内依赖清单恰好 8 项
    const sDep = page.slice(page.indexOf('### 一套能上线的帧同步至少依赖什么'), page.indexOf('### 一条更接近真实工程的帧同步链路'))
    expect((sDep.match(/^- /gm) || []).length).toBe(8)
    // 案例引用的页内原话可查
    for (const s of ['输入一致、顺序一致、模拟一致']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 延迟帧和输入窗口是帧同步最硬的现实',
      '### 默认输入和超时策略绝不能事后补',
      '### 状态哈希和检查点是救命工具',
      '### 什么系统适合纳入帧同步主链路',
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
