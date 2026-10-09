import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/capacity/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「两地同时写一份账号，资产对不上账」的多地域归属排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「多地域和平台化的共同底色」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('多地域和平台化的共同底色')
  expect(start, 'capacity 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/capacity/04「两地同时写一份账号，资产对不上账」的多地域归属排查）', () => {
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
    for (const term of ['写入归属表', '单主', '分区自治', '派生副本']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['写入归属表', '延迟分界线', '同步降级', '平台化沉淀']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：对账差异、往返延迟、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 对账账：差异 1300 笔 → 0 笔
    expect(Number(grab(/资产差异 \*\*(\d+)\*\* 笔/, '差异初值')[1])).toBe(1300)
    expect(Number(grab(/资产对账差异 \*\*(\d+)\*\* 笔 → \*\*(\d+)\*\* 笔/, '差异复核')[2])).toBe(0)
    // 延迟账：每帧往返 80 毫秒
    expect(Number(grab(/每帧跨地域往返 \*\*(\d+)\*\* 毫秒/, '往返延迟')[1])).toBe(80)
    // 平台化账：人工 45 分钟 → 工具化 6 分钟
    expect(Number(grab(/人工 \*\*(\d+)\*\* 分钟降到工具化 \*\*(\d+)\*\* 分钟/, '开服流程')[1])).toBe(45)
    expect(Number(grab(/人工 \*\*(\d+)\*\* 分钟降到工具化 \*\*(\d+)\*\* 分钟/, '开服流程')[2])).toBe(6)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 6 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // 多地域动机恰好 5 条
    const sMot = page.slice(page.indexOf('### 走向多地域的不同动机'), page.indexOf('### 延迟是抹不掉的物理代价'))
    expect((sMot.match(/^- /gm) || []).length).toBe(5)
    // 一致性取舍恰好 4 条
    const sCons = page.slice(page.indexOf('### 一致性的取舍'), page.indexOf('### 有状态服务在多地域下的形态'))
    expect((sCons.match(/^- /gm) || []).length).toBe(4)
    // 平台化能力恰好 4 条
    const sPlat = page.slice(page.indexOf('### 平台化运维指什么'), page.indexOf('### 平台化的时机与边界'))
    expect((sPlat.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '为了容灾建的异地，承担了它承担不了的数据一致性要求',
      '冲突解决的复杂度通常超出团队的真实维护能力',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 延迟是抹不掉的物理代价',
      '### 一致性的取舍',
      '### 平台化运维指什么',
      '### 有状态服务在多地域下的形态',
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
