import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/services/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「网关越做越胖，一次改动全网抖」的业务总线化排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「最常见的错误，是把服务名字当成边界」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最常见的错误，是把服务名字当成边界')
  expect(start, '第 6 章 02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/services/02「网关越做越胖，一次改动全网抖」的业务总线化排查）', () => {
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
    for (const term of ['连接、会话、鉴权、路由', '长期资产与实例态分离', '负责什么、不负责什么', '边界稳优先于角色多']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['网关职责边界', '长期资产与实例态分离', '规则解释与状态维护分离', '角色边界评审']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：网关体量、故障影响面、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 体量账：8 万行 → 2.1 万行
    expect(Number(grab(/网关代码 \*\*(\d+)\*\* 万行 → \*\*(\d+(?:\.\d+)?)\*\* 万行/, '体量复核')[1])).toBe(8)
    expect(Number(grab(/网关代码 \*\*(\d+)\*\* 万行 → \*\*(\d+(?:\.\d+)?)\*\* 万行/, '体量复核')[2])).toBe(2.1)
    // 业务逻辑点 30+、故障时长 20 分钟
    expect(Number(grab(/内嵌 \*\*(\d+)\*\* 多个业务逻辑点/, '业务点')[1])).toBe(30)
    expect(Number(grab(/全服登录异常 \*\*(\d+)\*\* 分钟/, '故障时长')[1])).toBe(20)
    // 定位账：4 小时 → 40 分钟
    expect(Number(grab(/平均定位耗时 \*\*(\d+)\*\* 小时/, '定位初值')[1])).toBe(4)
    expect(Number(grab(/平均定位耗时 \*\*(\d+)\*\* 小时 → \*\*(\d+)\*\* 分钟/, '定位复核')[2])).toBe(40)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区为行文段落，无列表项
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(0)
    // 网关「负责 + 不应负责」合计 7 条
    const sGw = page.slice(page.indexOf('### 1. 网关 / 接入服务'), page.indexOf('### 2. 账号 / 角色服务'))
    expect((sGw.match(/^- /gm) || []).length).toBe(7)
    // 观察框架四层恰好 4 条
    const sFrame = page.slice(page.indexOf('### 一个更实用的观察框架'), page.indexOf('### 常见误区'))
    expect((sFrame.match(/^- /gm) || []).length).toBe(4)
    for (const s of ['离玩家最近，于是所有临时逻辑都往里塞', '最难拆、最难测、最难排障的隐性总线']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 1. 网关 / 接入服务',
      '### 长期资产和实例态混在一起',
      '### 规则解释和状态维护混在一起',
      '### 角色不是越多越好，而是边界越稳越好',
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
