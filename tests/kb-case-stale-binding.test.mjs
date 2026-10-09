import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/services/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「重连后进错了房间」的路由过期排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「最常见的错误，是把服务发现理解成」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最常见的错误，是把服务发现理解成')
  expect(start, '第 6 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/services/04「重连后进错了房间」的路由过期排查）', () => {
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
    for (const term of ['单一真相源', '写新、失效旧', '先摘流、状态同步、再下线', '状态来源、更新条件和失效语义']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['单一真相源', '原子路由变更', '摘流正式流程', '四类路由分开']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：进错房量、命中率、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 进错房账：90 起/日 → 0 起
    expect(Number(grab(/每天约 \*\*(\d+)\*\* 起/, '进错房初值')[1])).toBe(90)
    expect(Number(grab(/进错房间 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起/, '进错房复核')[2])).toBe(0)
    // 命中率账：99.2% → 99.98%
    expect(Number(grab(/重连命中率 \*\*(\d+(?:\.\d+)?)\*\*% → \*\*(\d+(?:\.\d+)?)\*\*%/, '命中率')[1])).toBe(99.2)
    expect(Number(grab(/重连命中率 \*\*(\d+(?:\.\d+)?)\*\*% → \*\*(\d+(?:\.\d+)?)\*\*%/, '命中率')[2])).toBe(99.98)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区为行文段落，无列表项
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(0)
    // 「找错了」清单恰好 5 条
    const sWrong = page.slice(page.indexOf('### 路由体系最怕的不是“找不到”，而是“找错了”'), page.indexOf('### 协作为什么比“互相调用”更重要'))
    expect((sWrong.match(/^- /gm) || []).length).toBe(5)
    // 治理规则恰好 5 条
    const sRules = page.slice(page.indexOf('### 实现手段不是重点，治理规则才是重点'), page.indexOf('### 最能暴露问题的不是正常流量，而是异常路径'))
    expect((sRules.match(/^- /gm) || []).length).toBe(5)
    // 异常路径恰好 5 条
    const sAbn = page.slice(page.indexOf('### 最能暴露问题的不是正常流量，而是异常路径'), page.indexOf('### 常见误区'))
    expect((sAbn.match(/^- /gm) || []).length).toBe(5)
    for (const s of ['玩家绑定关系只更新了一半', '重连时回到了旧节点，但实例已经迁走']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 路由其实至少分成四类',
      '### 路由体系最怕的不是“找不到”，而是“找错了”',
      '### 实现手段不是重点，治理规则才是重点',
      '### 最能暴露问题的不是正常流量，而是异常路径',
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
