import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/services/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「跨服活动一开，玩家卡在『迁移中』」的控制平面缺失排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「最常见的错误，是只有数据平面」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最常见的错误，是只有数据平面')
  expect(start, '第 6 章 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/services/03「跨服活动一开，玩家卡在『迁移中』」的控制平面缺失排查）', () => {
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
    for (const term of ['容量视图', '清理中间状态、路由回切、恢复源端控制权', '健康、容量、负载', '调度策略不再各写各的']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['控制面能力清单', '迁移回滚语义', '实时节点状态', '调度收口']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：失败率、悬空量、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 失败率账：6% → 0.4%
    expect(Number(grab(/迁移失败率 \*\*(\d+)\*\*%/, '失败率初值')[1])).toBe(6)
    expect(Number(grab(/迁移失败率 \*\*(\d+)\*\*% → \*\*(\d+(?:\.\d+)?)\*\*%/, '失败率复核')[2])).toBe(0.4)
    // 悬空账：300 起 → 0 起
    expect(Number(grab(/累计 \*\*(\d+)\*\* 多起/, '悬空初值')[1])).toBe(300)
    expect(Number(grab(/半迁移与双重绑定 \*\*(\d+)\*\* 起 → \*\*(\d+)\*\* 起/, '悬空复核')[2])).toBe(0)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区为行文段落，无列表项
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(0)
    // 协调层长出时机恰好 5 条
    const sGrow = page.slice(page.indexOf('### 协调层为什么迟早会长出来'), page.indexOf('### 跨服真正难的不是联网，而是迁移'))
    expect((sGrow.match(/^- /gm) || []).length).toBe(5)
    // 控制面能力恰好 6 条
    const sCap = page.slice(page.indexOf('### 控制平面通常要承担哪些能力'), page.indexOf('### 一个更接近真实工程的迁移链路'))
    expect((sCap.match(/^- /gm) || []).length).toBe(6)
    for (const s of [
      '跨服本质上不是一次 RPC，而是一条带有状态整理、会话重绑定、控制权交接和失败恢复语义的完整链路',
      '房间分配策略写死在匹配服务里',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 控制平面通常要承担哪些能力',
      '### 一个更接近真实工程的迁移链路',
      '### 只有静态配置，没有实时节点状态',
      '### 把调度逻辑散落在每个业务服务里',
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
