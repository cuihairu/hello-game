import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/08.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「技能越加越慢，一改平衡就误伤」的脚本化堆叠排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「技能系统设计真正要做的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('技能系统设计真正要做的，不是把技能写出来')
  expect(start, 'sync/08 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/08「技能越加越慢，一改平衡就误伤」的脚本化堆叠排查）', () => {
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
    for (const term of ['运行时八件套', '时间轴 / 状态机分工', '效果管线独立', 'Buff 一等公民']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['运行时八件套', '时间轴 / 状态机分工', '效果管线独立', 'Buff 一等公民']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：脚本体量、交付周期、误伤、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 体量账：320 个脚本
    expect(Number(grab(/\*\*(\d+)\*\* 个技能脚本各自为政/, '脚本体量')[1])).toBe(320)
    // 交付账：4 天涨到 12 天
    expect(Number(grab(/新技能交付从早期 \*\*(\d+)\*\* 天涨到 \*\*(\d+)\*\* 天/, '交付初值')[1])).toBe(4)
    expect(Number(grab(/新技能交付从早期 \*\*(\d+)\*\* 天涨到 \*\*(\d+)\*\* 天/, '交付初值')[2])).toBe(12)
    // 复核账：交付 12 → 3 天、误伤 17 → 0 个、定位 4 小时 → 15 分钟
    expect(Number(grab(/新技能交付 \*\*(\d+)\*\* 天 → \*\*(\d+)\*\* 天/, '交付复核')[2])).toBe(3)
    expect(Number(grab(/平衡调整误伤 \*\*(\d+)\*\* 个 → \*\*(\d+)\*\* 个/, '误伤复核')[2])).toBe(0)
    expect(Number(grab(/工单定位 \*\*(\d+)\*\* 小时 → \*\*(\d+)\*\* 分钟/, '定位复核')[2])).toBe(15)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 运行时骨架恰好 8 条
    const sSkel = page.slice(page.indexOf('### 一套更稳妥的运行时骨架'), page.indexOf('### 一次施法最好拆成什么流程'))
    expect((sSkel.match(/^- /gm) || []).length).toBe(8)
    // 同步边界 4 条
    const sSync = page.slice(page.indexOf('### 技能系统和同步边界必须一起定'), page.indexOf('### 长期扩展能力主要取决于什么'))
    expect((sSync.match(/^- /gm) || []).length).toBe(4)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '新技能越来越慢、线上问题越来越难查、平衡调整误伤旧逻辑',
      '技能负责组织施法流程，不直接独占所有业务逻辑',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 一套更稳妥的运行时骨架',
      '### 时间轴和状态机应该怎么分工',
      '### 效果管线为什么必须独立出来',
      '### Buff 必须被当成一等公民',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/sync')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(9)
    expect(pages).toContain('index.md')
    expect(pages).toContain('08.md')
  })
})
