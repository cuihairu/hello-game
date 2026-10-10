import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/ipc/06.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「先定中间件再找场景，四条链路推倒重来」的选型顺序倒置排查'

// 案例切片：知识库页正文（常见误区）之后、Used By 之前追加的案例节
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('没有“能稳定运营”的能力')
  expect(start, 'ipc/06 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## Used By'), '案例应位于 Used By 之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, src.indexOf('## Used By'))
}

describe('实战案例冒烟（知识库 networking/ipc/06「先定中间件再找场景，四条链路推倒重来」的选型顺序倒置排查）', () => {
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
    for (const term of [
      '第一步先定义链路语义',
      '第三步按链路性质选方案',
      '第四步再看非功能性成本',
    ]) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['语义六问', '命令事件判别', '性质对号入座', '治理成本验收']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：反馈账、治理账、返工账、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 立项与反馈账：12 条立项、P99 35 → 780 毫秒
    expect(Number(grab(/\*\*(\d+)\*\* 条新链路立项直接套用/, '立项数')[1])).toBe(12)
    const p99 = grab(/P99 从 \*\*(\d+)\*\* 毫秒涨到 \*\*(\d+)\*\* 毫秒/, 'P99 反馈账')
    expect(Number(p99[1])).toBe(35)
    expect(Number(p99[2])).toBe(780)
    // 治理账：45 = 19 + 14 + 12
    expect(Number(grab(/周运维排障工单 \*\*(\d+)\*\* 起/, '治理账基数')[1])).toBe(45)
    const parts = grab(/回放补数 \*\*(\d+)\*\* 起、死信手工处理 \*\*(\d+)\*\* 起、重试风暴 \*\*(\d+)\*\* 起/, '治理账拆项')
    const [a, b, c] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
    expect([a, b, c]).toEqual([19, 14, 12])
    expect(sec.includes('**19 + 14 + 12 = 45**'), '案例缺少治理账算式').toBe(true)
    expect(a + b + c).toBe(45)
    // 返工账：4 条推倒重做浪费 5 周、问题单合计 40 起
    const rework = grab(/\*\*(\d+)\*\* 条链路语义不匹配推倒重做，浪费 \*\*(\d+)\*\* 周/, '返工账')
    expect(Number(rework[1])).toBe(4)
    expect(Number(rework[2])).toBe(5)
    expect(Number(grab(/选型问题单合计 \*\*(\d+)\*\* 起/, '问题单合计')[1])).toBe(40)
    expect(sec.includes('18 + 14 + 8 = 40'), '案例缺少问题单归位算式').toBe(true)
    expect(18 + 14 + 8).toBe(40)
    // 归因三分账：45 / 35 / 20 合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // 复核账：P99 780 → 35、返工 4 → 0、周工单 45 → 6
    const rp = grab(/实例进出确认 P99 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, 'P99 复核')
    expect(Number(rp[1])).toBe(780)
    expect(Number(rp[2])).toBe(35)
    const rw = grab(/返工链路 \*\*(\d+)\*\* 条 → \*\*(\d+)\*\* 条/, '返工复核')
    expect(Number(rw[1])).toBe(4)
    expect(Number(rw[2])).toBe(0)
    const rt = grab(/周运维工单 \*\*(\d+)\*\* 起 → \*\*(\d+)\*\* 起/, '工单复核')
    expect(Number(rt[1])).toBe(45)
    expect(Number(rt[2])).toBe(6)
  })

  it('声称对账：案例引用的页内原话与清单条数可查', () => {
    // 第一步语义六问 6 条、第三步四类性质子节 4 个、第四步成本 5 条、选型顺序 4 步、擅长清单 4 条
    const sAsk = page.slice(page.indexOf('### 第一步先定义链路语义'), page.indexOf('### 第二步判断这条链路更像命令还是更像事件'))
    expect((sAsk.match(/^- /gm) || []).length).toBe(6)
    const sKind = page.slice(page.indexOf('### 进程内或同机高频协作'), page.indexOf('### 第四步再看非功能性成本'))
    expect((sKind.match(/^### /gm) || []).length).toBe(4)
    const sCost = page.slice(page.indexOf('### 第四步再看非功能性成本'), page.indexOf('### 一个更实际的选型顺序'))
    expect((sCost.match(/^- /gm) || []).length).toBe(5)
    const sOrder = page.slice(page.indexOf('### 一个更实际的选型顺序'), page.indexOf('### 不同方案真正擅长的事情'))
    expect((sOrder.match(/^\d+\. /gm) || []).length).toBe(4)
    const sFit = page.slice(page.indexOf('### 不同方案真正擅长的事情'), page.indexOf('### 常见误区'))
    expect((sFit.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '问题没定义清楚就开始比组件',
      '能跑但解释不了为什么这样跑',
      '不让中间件能力反过来塑造业务边界',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 第一步先定义链路语义',
      '### 第二步判断这条链路更像命令还是更像事件',
      '### 第三步按链路性质选方案',
      '### 第四步再看非功能性成本',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking/ipc')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('06.md')
  })
})
