import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/engines/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「分成 5%，年尾却多付了 540 万」的分成基数口径排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('迁移成本膨胀到只能永远留在原地')
  expect(start, 'engines/01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/engines/01「分成 5%，年尾却多付了 540 万」的分成基数口径排查）', () => {
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
    for (const term of ['基数口径', '叠加口径', '合规口径', '基数定死', '申报对齐', '条款摘要', '预案入档']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['分成基数口径', '叠加成本曲线', '隐性条款摘要', '条款变化预案']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：两本分成账、渠道叠加账、留存率账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 流水账：3.6 亿，渠道 30%
    const rev = Number(grab(/年流水 \*\*(\d+(?:\.\d+)?)\*\* 亿元/, '流水')[1])
    expect(rev).toBe(3.6)
    // 分成账：总收入基数 1800 万 vs 净收入基数 1260 万，差 540 万
    const gross = grab(/按总收入：(\d+(?:\.\d+)?) 亿 × (\d+)% = \*\*(\d+)\*\* 万/, '总收入基数')
    const net = grab(/按净收入：(\d+(?:\.\d+)?) 亿 × (\d+)% = ([\d.]+) 亿，再乘 (\d+)% = \*\*(\d+)\*\* 万/, '净收入基数')
    expect(Number(gross[3])).toBe(Math.round(rev * 10000 * Number(gross[2]) / 100))
    expect(Number(net[3])).toBeCloseTo(rev * (1 - 0.3), 6)
    expect(Number(net[5])).toBe(Math.round(rev * 10000 * (1 - 0.3) * Number(net[4]) / 100))
    expect(Number(gross[3]) - Number(net[5])).toBe(540)
    // 渠道账：3.6 亿 × 30% = 1.08 亿
    const chan = grab(/渠道先抽走 (\d+(?:\.\d+)?) 亿 × (\d+)% = \*\*([\d.]+)\*\* 亿/, '渠道账')
    expect(Number(chan[3])).toBeCloseTo(rev * Number(chan[2]) / 100, 6)
    // 留存账：总收入口径 2.34 亿（65%）、净收入口径 2.394 亿（66.5%），差 1.5pt
    const keep = grab(/按总收入口径是 ([\d.]+) − ([\d.]+) = \*\*([\d.]+)\*\* 亿（占流水 \*\*(\d+)\*\*%），按净收入口径是 ([\d.]+) − ([\d.]+) = \*\*([\d.]+)\*\* 亿（占流水 \*\*([\d.]+)\*\*%）——一层基数差异，留存率差 \*\*([\d.]+)\*\* 个百分点/, '留存账')
    expect(Number(keep[3])).toBeCloseTo(Number(keep[1]) - Number(keep[2]), 6)
    expect(Number(keep[4])).toBe(Math.round(Number(keep[3]) / rev * 100))
    expect(Number(keep[7])).toBeCloseTo(Number(keep[5]) - Number(keep[6]), 6)
    expect(Number(keep[8])).toBe(Number(keep[7]) / rev * 100)
    expect(Number(keep[9])).toBeCloseTo(Number(keep[8]) - Number(keep[4]), 6)
    // 复核账：分成 1800 → 1260 万，逾期 14 个月 → 0
    expect(Number(grab(/年分成从 1800 万回到 \*\*(\d+)\*\* 万/, '分成复核')[1])).toBe(1260)
    expect(Number(grab(/申报已逾期 \*\*(\d+)\*\* 个月/, '逾期初值')[1])).toBe(14)
    expect(Number(grab(/逾期 \*\*(\d+)\*\* 个月 → \*\*(\d+)\*\*/, '逾期复核')[2])).toBe(0)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 7 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('引擎选择的商业模式视角，核心是'))
    expect((sMis.match(/^- /gm) || []).length).toBe(7)
    // 条款变化预案恰好 3 条
    const sPlan = page.slice(page.indexOf('授权条款是会变的'), page.indexOf('### 隐性条款与合规义务'))
    expect((sPlan.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '分成基数按什么口径计算',
      '只算授权费不算总成本',
      '授权条款签完就归档',
      '曲线形状比数字大小更能说明哪种模式适合自己的收入预期',
      '签约前多花一天读条款，胜过条款变化后花一年迁移',
      '财务状态不是技术选型的背景板，它就是选型条件本身',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 授权模式是一条光谱',
      '### 分成模式与收入结构的叠加',
      '### 隐性条款与合规义务',
      '### 授权条款是会变的',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–03
    const pages = readdirSync(resolve(root, 'docs/client/engines')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(4)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
