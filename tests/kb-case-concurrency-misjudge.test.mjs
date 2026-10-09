import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「为了性能上了多线程，时序 Bug 反而查不清」的并发化误判排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正要回答的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正要回答的')
  expect(start, '第 5 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/01「为了性能上了多线程，时序 Bug 反而查不清」的并发化误判排查）', () => {
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
    for (const term of ['共享世界状态', '单写线程或 Actor 分区', '重计算外包线程池', '顺序与并行边界']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['状态隔离评估', '多线程只做弱耦合并行', 'Actor 分区', '混合式落点']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：收益账、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 收益账：TPS 12000 → 14640（+22%）可复算
    const t0 = Number(grab(/平均 TPS 从 \*\*(\d+)\*\* 提升到 \*\*(\d+)\*\*/, 'TPS 前后')[1])
    const t1 = Number(grab(/平均 TPS 从 \*\*(\d+)\*\* 提升到 \*\*(\d+)\*\*/, 'TPS 前后')[2])
    expect(t0).toBe(12000)
    expect(Number(grab(/（\+\*\*(\d+)\*\*%）/, 'TPS 增幅')[1])).toBe(22)
    expect(Math.round(t0 * 1.22)).toBe(t1)
    // 代价账：每周 5–8 起、定位 2.5 天
    expect(sec.includes('每周 **5–8** 起')).toBe(true)
    expect(Number(grab(/平均定位耗时 \*\*([\d.]+)\*\* 天/, '定位初值')[1])).toBe(2.5)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 复核账：故障 5–8 → 0、TPS +18%、定位 2.5 → 0.5 天
    expect(Number(grab(/平均定位耗时 \*\*([\d.]+)\*\* 天 → \*\*([\d.]+)\*\* 天/, '定位复核')[2])).toBe(0.5)
    expect(sec.includes('TPS 保持 **+18**%')).toBe(true)
    expect(sec.includes('时序类故障每周 **5–8** 起 → **0** 起')).toBe(true)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    const sSingle = page.slice(page.indexOf('### 单线程为什么长期有生命力'), page.indexOf('### 多线程真正擅长什么'))
    expect((sSingle.match(/^- /gm) || []).length).toBe(7)
    for (const s of ['把最怕不一致的状态，留在最容易推理的执行模型里']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 为什么执行模型首先是状态问题',
      '### 多线程真正擅长什么',
      '### Actor 到底解决了什么',
      '### 一个更贴近游戏服务器的常见落点',
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
