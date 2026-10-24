import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/zh/client/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「客户端说成功，服务端没记上」的裁决权漂移排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('才发现前后端其实没有统一的状态语义')
  expect(start, 'client/02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/02「客户端说成功，服务端没记上」的裁决权漂移排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['权威口径', '恢复口径', '权威先行', '预测回收路径']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['权威先行', '谨慎清单评审', '预测回收路径', '重连状态语义']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：对账差单、错乱工单、结算争议、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：差单 143 笔、错乱工单 62%、结算争议 27 起
    expect(Number(grab(/周对账差单 \*\*(\d+)\*\* 笔/, '差单初值')[1])).toBe(143)
    expect(Number(grab(/状态错乱工单占比 \*\*(\d+)%\*\*/, '错乱初值')[1])).toBe(62)
    expect(Number(grab(/排位结算争议 \*\*(\d+)\*\* 起/, '争议初值')[1])).toBe(27)
    // 两边账：客户端有、权威无 91 笔
    expect(Number(grab(/\*\*(\d+)\*\* 笔客户端有、权威无/, '两边账')[1])).toBe(91)
    // 复核账：差单 143 → 6 笔、错乱 62% → 7%、争议 27 → 2 起
    expect(Number(grab(/周对账差单 \*\*(\d+)\*\* 笔 → \*\*(\d+)\*\* 笔/, '差单复核')[2])).toBe(6)
    expect(Number(grab(/状态错乱工单占比 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '错乱复核')[2])).toBe(7)
    expect(Number(grab(/排位结算争议 \*\*(\d+)\*\* 起 → \*\*(\d+)\*\* 起/, '争议复核')[2])).toBe(2)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 三类逻辑恰好 3 条
    const sLogic = page.slice(page.indexOf('### 最重要的边界'), page.indexOf('### 网络层真正解决的不是收发包'))
    expect((sLogic.match(/^- /gm) || []).length).toBe(3)
    // 谨慎留在客户端的清单恰好 5 条
    const sCare = page.slice(page.indexOf('### 哪些能力必须谨慎留在客户端'), page.indexOf('### 断线、弱网和重连会真实暴露边界设计'))
    expect((sCare.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '系统长期处于“有时客户端说了算，有时服务端说了算”的混乱状态',
      '避免裁决权在客户端和服务端之间漂移',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 最重要的边界：表现逻辑、交互逻辑和权威逻辑',
      '### 哪些能力必须谨慎留在客户端',
      '### 网络层真正解决的不是收发包，而是状态收敛',
      '### 断线、弱网和重连会真实暴露边界设计',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/zh/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('02.md')
  })
})
