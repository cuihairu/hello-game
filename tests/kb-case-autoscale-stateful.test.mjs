import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/capacity/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「晚高峰一到，三个服同时掉线」的弹性边界排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「扩缩容能力的成熟度」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('扩缩容能力的成熟度')
  expect(start, 'capacity 02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/capacity/02「晚高峰一到，三个服同时掉线」的弹性边界排查）', () => {
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
    for (const term of ['观察名单', '无状态无资产', '全局组件容量假设', '预案演练']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['组件弹性分级', '缩容防抖', '状态转移判据', '全局联动']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：伸缩参数、掉线规模、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 伸缩策略账：CPU < 30% 持续 10 分钟
    expect(Number(grab(/CPU 低于 \*\*(\d+)\*\*% 持续 \*\*(\d+)\*\* 分钟/, '伸缩策略')[1])).toBe(30)
    expect(Number(grab(/CPU 低于 \*\*(\d+)\*\*% 持续 \*\*(\d+)\*\* 分钟/, '伸缩策略')[2])).toBe(10)
    // 掉线账：6000+ 人掉线、回档 15 分钟、连开 20 服
    expect(Number(grab(/\*\*(\d+)\*\* 多名在线玩家同时掉线/, '掉线规模')[1])).toBe(6000)
    expect(Number(grab(/回档 \*\*(\d+)\*\* 分钟/, '回档时长')[1])).toBe(15)
    expect(Number(grab(/连开 \*\*(\d+)\*\* 个服/, '加服批量')[1])).toBe(20)
    // 联动门槛：批量超 5 个重算
    expect(Number(grab(/批量超过 \*\*(\d+)\*\* 个，重算/, '联动门槛')[1])).toBe(5)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 5 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 弹性组件分级恰好 5 条
    const sFlex = page.slice(page.indexOf('### 先分清哪些组件真正能弹性'), page.indexOf('### 水平扩容的前提条件'))
    expect((sFlex.match(/^- /gm) || []).length).toBe(5)
    // 缩容难点恰好 3 条
    const sShrink = page.slice(page.indexOf('### 缩容为什么比扩容难'), page.indexOf('### 弹性伸缩的适用边界'))
    expect((sShrink.match(/^- /gm) || []).length).toBe(3)
    // 全局联动恰好 4 条
    const sGlobal = page.slice(page.indexOf('### 全局组件的容量联动'), page.indexOf('### 加服节奏与运营日历'))
    expect((sGlobal.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '玩家在线时不能缩：会话在内存里，强行回收就是掉线和状态丢失',
      '加服只算新服的账，全局组件的容量假设被连开二十个服悄悄打破',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 先分清哪些组件真正能弹性',
      '### 缩容为什么比扩容难',
      '### 弹性伸缩的适用边界',
      '### 全局组件的容量联动',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/capacity')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
