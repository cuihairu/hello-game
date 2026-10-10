import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「AI 先说赔付，规则兜不住」的关键裁决前置排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('结果在公平性、安全性和可维护性上一起失分')
  expect(start, 'client/05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/05「AI 先说赔付，规则兜不住」的关键裁决前置排查）', () => {
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
    for (const term of ['裁决口径', '成本口径', '裁决回迁', '成本入账']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['裁决回迁', '谨慎特征清单', '成本入账', '落地顺序']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：裁定笔数、分歧率、误发金额、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：裁定 9000 笔、分歧率 18%、误发 2.6 万元
    expect(Number(grab(/AI 直接裁定补偿 \*\*(\d+)\*\* 笔/, '裁定初值')[1])).toBe(9000)
    expect(Number(grab(/判定分歧率 \*\*(\d+)%\*\*/, '分歧初值')[1])).toBe(18)
    expect(Number(grab(/误发补偿 \*\*(\d+\.\d+)\*\* 万元/, '误发初值')[1])).toBe(2.6)
    // 抽检账：400 笔里 48 笔与规则口径不符
    expect(Number(grab(/抽检 \*\*(\d+)\*\* 笔里 \*\*(\d+)\*\* 笔与规则口径不符/, '抽检账')[2])).toBe(48)
    // 复核账：裁定 9000 → 0 笔、分歧 18% → 3%、误发 2.6 → 0.2 万元
    expect(Number(grab(/AI 直接裁定补偿 \*\*(\d+)\*\* 笔 → \*\*(\d+)\*\* 笔/, '裁定复核')[2])).toBe(0)
    expect(Number(grab(/判定分歧率 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '分歧复核')[2])).toBe(3)
    expect(Number(grab(/误发补偿 \*\*(\d+\.\d+)\*\* 万元 → \*\*(\d+\.\d+)\*\* 万元/, '误发复核')[2])).toBe(0.2)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 关键系统判断场景恰好 4 条
    const sKey = page.slice(page.indexOf('### 关键系统判断'), page.indexOf('### 为什么客户端侧 AI 要先谈边界，再谈效果'))
    expect((sKey.match(/^- /gm) || []).length).toBe(4)
    // AI 新增成本恰好 5 条
    const sCost = page.slice(page.indexOf('### AI 对客户端工程真正新增了什么成本'), page.indexOf('### 一个更稳妥的落地顺序'))
    expect((sCost.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '通常不适合让模型直接拥有最终决定权',
      '把 AI 先用在“能显著提效但出错可控”的地方',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 关键系统判断',
      '### 哪些位置应该谨慎甚至避免',
      '### AI 对客户端工程真正新增了什么成本',
      '### 一个更稳妥的落地顺序',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('05.md')
  })
})
