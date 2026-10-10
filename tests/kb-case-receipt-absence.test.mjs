import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/ipc/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「兑换码点了没回执，玩家连点六次」的通信模式错配排查'

// 案例切片：知识库页正文（常见误区）之后、Used By 之前追加的案例节
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最后所有模式都变成不稳定的混合体')
  expect(start, 'ipc/02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## Used By'), '案例应位于 Used By 之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, src.indexOf('## Used By'))
}

describe('实战案例冒烟（知识库 networking/ipc/02「兑换码点了没回执，玩家连点六次」的通信模式错配排查）', () => {
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
    for (const term of ['模式选型首先要看什么', '是否必须共享同一个交互时刻', 'fire-and-forget', '请求接收 + 后台完成', '通信模式变化，本质上是在移动复杂度']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['交互时刻四问', '受理处理分离', '复杂度搬家清单', '模式组合基线']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：回执延迟、重复工单、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 回执账：240ms → 4.1s
    expect(Number(grab(/提交到回执 P99 \*\*(\d+)\*\* 毫秒/, '回执初值')[1])).toBe(240)
    expect(Number(grab(/平均 \*\*(\d+(?:\.\d+)?)\*\* 秒才刷新/, '回执改造后')[1])).toBe(4.1)
    // 悬空账：1.2%
    expect(Number(grab(/\*\*(\d+(?:\.\d+)?)\*\*% 的兑换请求无回执悬空/, '悬空率')[1])).toBe(1.2)
    // 重复账：连点 6 次、工单 260
    expect(Number(grab(/单人最多连点 \*\*(\d+)\*\* 次/, '连点次数')[1])).toBe(6)
    expect(Number(grab(/重复提交工单日均 \*\*(\d+)\*\* 起/, '工单初值')[1])).toBe(260)
    // 复核账：4.1s → 180ms、260 → 11、1.2% → 0.03%
    const re = grab(/兑换回执 P99 \*\*(\d+(?:\.\d+)?)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '回执复核')
    expect(Number(re[1])).toBe(4.1)
    expect(Number(re[2])).toBe(180)
    const rt = grab(/重复提交工单 \*\*(\d+)\*\* 起\/日 → \*\*(\d+)\*\* 起\/日/, '工单复核')
    expect(Number(rt[1])).toBe(260)
    expect(Number(rt[2])).toBe(11)
    const rs = grab(/无回执悬空 \*\*(\d+(?:\.\d+)?)\*\*% → \*\*(\d+(?:\.\d+)?)\*\*%/, '悬空复核')
    expect(Number(rs[1])).toBe(1.2)
    expect(Number(rs[2])).toBe(0.03)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话与清单条数可查', () => {
    // 四类模式清单：模式总览 14 条、同步 4、发布订阅 3、模式组合 3、复杂度搬家 6
    const sMode = page.slice(page.indexOf('### 最常见的几类通信模式'), page.indexOf('### 模式选型首先要看什么'))
    expect((sMode.match(/^- /gm) || []).length).toBe(14)
    const sSync = page.slice(page.indexOf('### 同步请求-响应'), page.indexOf('### 异步投递'))
    expect((sSync.match(/^- /gm) || []).length).toBe(4)
    const sPub = page.slice(page.indexOf('### 发布订阅'), page.indexOf('### 请求接收 + 后台完成'))
    expect((sPub.match(/^- /gm) || []).length).toBe(3)
    const sCombo = page.slice(page.indexOf('### 常见模式组合'), page.indexOf('### 通信模式变化，本质上是在移动复杂度'))
    expect((sCombo.match(/^- /gm) || []).length).toBe(3)
    const sMove = page.slice(page.indexOf('### 通信模式变化，本质上是在移动复杂度'), page.indexOf('### 常见误区'))
    expect((sMove.match(/^- /gm) || []).length).toBe(6)
    for (const s of [
      '该等结果的地方用了 fire-and-forget，结算就变成玄学',
      '模式归类错了，再成熟的组件也只是把错误稳定地放大',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 模式选型首先要看什么',
      '### 请求接收 + 后台完成',
      '### 通信模式变化，本质上是在移动复杂度',
      '### 常见模式组合',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking/ipc')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('02.md')
  })
})
