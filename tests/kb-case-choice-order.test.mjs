import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/engines/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「为类型安全切语言，交付反被拖垮」的选型顺序倒置排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('旧系统还没人维护')
  expect(start, 'engines/02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/engines/02「为类型安全切语言，交付反被拖垮」的选型顺序倒置排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['交付口径', '技能口径', '边界口径', '位置回收', '存量入账', '边界唯一定义', '治理就位']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['决策顺序', '存量技能入账', '语言按链路分配', '边界唯一定义']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：团队构成、交付延期账、缺陷占比账、静默期倍率与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 团队账：28 = 19 熟练 + 6 半熟 + 3 陌生；B 熟练 0
    const team = grab(/团队 \*\*(\d+)\*\* 人，主力语言 A 熟练 \*\*(\d+)\*\* 人、半熟 \*\*(\d+)\*\* 人、陌生 \*\*(\d+)\*\* 人/, '团队构成')
    expect(Number(team[2]) + Number(team[3]) + Number(team[4])).toBe(Number(team[1]))
    expect(Number(grab(/团队 B 熟练 \*\*(\d+)\*\* 人/, 'B 熟练')[1])).toBe(0)
    // 交付账：42 个功能排期 16 周、实际 27 周、延期 11 周
    const dl = grab(/首版 \*\*(\d+)\*\* 个功能排期 \*\*(\d+)\*\* 周，实际 \*\*(\d+)\*\* 周，延期 \*\*(\d+)\*\* 周/, '交付账')
    expect(Number(dl[3]) - Number(dl[2])).toBe(Number(dl[4]))
    // 缺陷账：40 个缺陷里 24 个（60%）在新栈
    const bug = grab(/\*\*(\d+)\*\* 个线上缺陷，其中 \*\*(\d+)\*\* 个（\*\*(\d+)\*\*%）落在新栈模块/, '缺陷账')
    expect(Number(bug[2])).toBe(Math.round(Number(bug[1]) * Number(bug[3]) / 100))
    // 静默期账：B 栈 8 周 vs A 栈 2 周 = 4 倍
    const silent = grab(/静默期 \*\*(\d+)\*\* 周，A 栈历史上是 \*\*(\d+)\*\* 周——\*\*(\d+)\*\* 倍/, '静默期')
    expect(Number(silent[1]) / Number(silent[2])).toBe(Number(silent[3]))
    // 边界账：2 份定义、7 处漂移、2 处线上错乱
    expect(Number(grab(/跨边界数据结构 \*\*(\d+)\*\* 份定义/, '定义份数')[1])).toBe(2)
    const drift = grab(/漂移出 \*\*(\d+)\*\* 处字段不一致，其中 \*\*(\d+)\*\* 处已经造成线上数据错乱/, '漂移账')
    expect(Number(drift[1])).toBe(7)
    expect(Number(drift[2])).toBe(2)
    // 复核账：27 → 19 周（延期 11 → 3）、缺陷 40 → 9、静默期 8 → 3、定义 2 → 1、漂移 7 → 0
    const reDl = grab(/交付 \*\*(\d+)\*\* → \*\*(\d+)\*\* 周（延期 \*\*(\d+)\*\* → \*\*(\d+)\*\* 周）/, '交付复核')
    expect(Number(reDl[2]) - 16).toBe(Number(reDl[4]))
    expect(Number(grab(/上线三个月缺陷 \*\*(\d+)\*\* → \*\*(\d+)\*\* 个/, '缺陷复核')[2])).toBe(9)
    expect(Number(grab(/静默期 \*\*(\d+)\*\* → \*\*(\d+)\*\* 周/, '静默复核')[2])).toBe(3)
    expect(grab(/跨边界定义 \*\*(\d+)\*\* → \*\*(\d+)\*\* 份，字段漂移 \*\*(\d+)\*\* → \*\*(\d+)\*\* 处/, '边界复核').slice(1).map(Number)).toEqual([2, 1, 7, 0])
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 7 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('语言地图的价值不在于'))
    expect((sMis.match(/^- /gm) || []).length).toBe(7)
    // 语言地图恰好 4 条
    const sMap = page.slice(page.indexOf('### 语言地图按岗位切分更实用'), page.indexOf('### 招聘市场是第一约束'))
    expect((sMap.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '顺序反过来往往就是返工的开始',
      '直接把主力项目当新语言的试验场，风险与收益完全不成比例',
      '跨边界的数据结构有唯一定义处，避免两端各写一份慢慢漂移',
      '性能差异只在少数链路上成立，团队约束天天起作用',
      '约束先于偏好，团队先于技术',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 选型的决策顺序',
      '### 存量技能折算成项目周期',
      '### 性能语言的真实成本是迭代速度',
      '### 多语言组合是常态而不是例外',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–03
    const pages = readdirSync(resolve(root, 'docs/client/engines')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(4)
    expect(pages).toContain('index.md')
    expect(pages).toContain('02.md')
  })
})
