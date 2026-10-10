import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/ipc/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「进副本点了没反应，十秒后才报失败」的场景边界误判排查'

// 案例切片：知识库页正文（常见误区）之后、Used By 之前追加的案例节
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('同步和异步语义混在一起，系统越来越难解释')
  expect(start, 'ipc/01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## Used By'), '案例应位于 Used By 之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, src.indexOf('## Used By'))
}

describe('实战案例冒烟（知识库 networking/ipc/01「进副本点了没反应，十秒后才报失败」的场景边界误判排查）', () => {
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
    for (const term of ['判断场景边界时，先看这四件事', '调用方是否必须立刻知道结果', '失败代价由谁承担', 'IPC 不是只有 MQ 一种形态']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['场景边界四问', '命令事件判别', '形态选择清单', '不消息化清单']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：反馈延迟、失败工单、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 反馈账：P99 180ms → 2.6s
    expect(Number(grab(/改造前点击到明确反馈 P99 \*\*(\d+)\*\* 毫秒/, '反馈初值')[1])).toBe(180)
    expect(Number(grab(/玩家平均等 \*\*(\d+(?:\.\d+)?)\*\* 秒才有回执/, '反馈改造后')[1])).toBe(2.6)
    expect(Number(grab(/失败场景 \*\*(\d+)\*\* 秒后才弹提示/, '失败反馈')[1])).toBe(10)
    // 工单账：30 → 420 → 25
    const ticket = grab(/进副本失败工单从日均 \*\*(\d+)\*\* 起涨到 \*\*(\d+)\*\* 起/, '工单初值')
    expect(Number(ticket[1])).toBe(30)
    expect(Number(ticket[2])).toBe(420)
    expect(Number(grab(/失败工单 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '工单复核')[1])).toBe(420)
    expect(Number(grab(/失败工单 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '工单复核')[2])).toBe(25)
    // 定位账：10 分钟 → 2 小时 → 8 分钟
    const locate = grab(/一次链路问题定位从 \*\*(\d+)\*\* 分钟拖到 \*\*(\d+)\*\* 小时/, '定位初值')
    expect(Number(locate[1])).toBe(10)
    expect(Number(locate[2])).toBe(2)
    expect(Number(grab(/链路定位 \*\*(\d+)\*\* 小时 → \*\*(\d+)\*\* 分钟/, '定位复核')[2])).toBe(8)
    // 反馈复核：2.6 秒 → 170 毫秒
    expect(Number(grab(/进副本反馈 P99 \*\*(\d+(?:\.\d+)?)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '反馈复核')[1])).toBe(2.6)
    expect(Number(grab(/进副本反馈 P99 \*\*(\d+(?:\.\d+)?)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '反馈复核')[2])).toBe(170)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话与清单条数可查', () => {
    // Definition 概览恰好 5 条
    const sDef = page.slice(page.indexOf('## Definition'), page.indexOf('### 为什么系统拆开以后必须认真面对 IPC'))
    expect((sDef.match(/^- /gm) || []).length).toBe(5)
    // 适合消息化 5 特征 + 5 例 = 10 条；不该轻易消息化 5 特征 + 4 例 = 9 条
    const sFit = page.slice(page.indexOf('### 哪些问题天然适合消息化'), page.indexOf('### 哪些问题不该轻易消息化'))
    expect((sFit.match(/^- /gm) || []).length).toBe(10)
    const sAvoid = page.slice(page.indexOf('### 哪些问题不该轻易消息化'), page.indexOf('### IPC 不是只有 MQ 一种形态'))
    expect((sAvoid.match(/^- /gm) || []).length).toBe(9)
    // IPC 形态恰好 5 种
    const sForm = page.slice(page.indexOf('### IPC 不是只有 MQ 一种形态'), page.indexOf('### 判断场景边界时，先看这四件事'))
    expect((sForm.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '把命令伪装成事件，调用方会失去确定性',
      '延迟从毫秒级尾部抖动变成积压不确定性',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 判断场景边界时，先看这四件事',
      '### 一个更贴近工程现实的边界判断',
      '### IPC 不是只有 MQ 一种形态',
      '### 哪些问题不该轻易消息化',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking/ipc')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
