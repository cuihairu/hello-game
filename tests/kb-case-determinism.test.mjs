import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/04-sync-combat/06.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「同一份回放，两台机器算出两个结果」的确定性分叉排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「工程前提能不能被持续守住」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('工程前提能不能被持续守住')
  expect(start, '第 4 章 06 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 04-sync-combat/06「同一份回放，两台机器算出两个结果」的确定性分叉排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少分叉归属示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 三层归属逐层落到案例里
    for (const layer of ['顺序层', '随机层', '数值层']) {
      expect(sec.includes(layer), `案例缺少分层「${layer}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '目标选择与结算顺序按（距离， ID）等稳定键排序',
      '战斗实例独立种子、子系统独立随机流',
      '每局状态哈希 + 双端自动回放比对 + 最早分叉帧定位',
      '核心裁决强确定、表现层放宽',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：不一致率、分叉归属分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：抽测 200 局、13 局不一致 = 6.5%
    const sample = Number(grab(/回放比对抽 \*\*(\d+)\*\* 局\/日/, '抽测局数')[1])
    const bad = Number(grab(/\*\*(\d+)\*\* 局不一致——不一致率/, '不一致局数')[1])
    const rate = Number(grab(/不一致率 \*\*([\d.]+)\*\*%/, '不一致率')[1])
    expect(bad / sample * 100).toBe(rate)
    // 工单占比：45 单 / 80 万场 ≈ 0.006%
    const tickets = Number(grab(/日 \*\*(\d+)\*\* 单，占日对局/, '工单数')[1])
    const rounds = Number(grab(/日对局 \*\*(\d+)\*\* 万场/, '日对局')[1])
    expect(Number(grab(/占日对局的 \*\*([\d.]+)\*\*%/, '工单占比')[1])).toBeCloseTo(tickets / (rounds * 10000) * 100, 6)
    // fence 三行分账合计 = 不一致局数
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+(\d+) 局$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), cnt: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(rows.reduce((s, r) => s + r.cnt, 0)).toBe(bad)
    expect(rows.map(r => Math.round(r.pct * bad / 100))).toEqual(rows.map(r => r.cnt))
    // 根因账：顺序层 62% 对应 map 遍历主根因
    expect(sec.includes('**62**% 的不一致局都能追到同一段代码')).toBe(true)
    expect(rows[0].pct).toBe(62)
    // 复核账：不一致 13→0、工单 45→5、排查 3 天→0 天
    const re = grab(/回放不一致 \*\*(\d+)\*\* 局 → \*\*(\d+)\*\* 局（\*\*(\d+)\*\* 局全一致）；仲裁工单日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '复核账')
    expect(Number(re[1])).toBe(bad)
    expect(Number(re[2])).toBe(0)
    expect(Number(re[3])).toBe(sample)
    expect(Number(re[4])).toBe(tickets)
    expect(Number(re[5])).toBe(5)
    expect(Number(grab(/排查耗时 \*\*(\d+)\*\* 天 → 状态哈希自动报警后 \*\*(\d+)\*\* 天发现/, '排查耗时复核')[1])).toBe(3)
    // 分叉帧两处一致
    expect(Number(grab(/最早分叉帧中位数是第 \*\*(\d+)\*\* 帧/, '分叉帧')[1])).toBe(47)
    expect(sec.includes('分叉在第 **47** 帧被自动定位')).toBe(true)
  })

  it('声称对账：确定性定义、分叉来源、校验工具与分层口径均与页内实况一致', () => {
    const grab = (pattern, label) => {
      const m = page.match(pattern)
      expect(m, `页面中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 页内确定性定义句逐字存在
    expect(page.includes('相同初始状态、相同输入序列、相同推进顺序，应该得到相同结果')).toBe(true)
    expect(sec.includes('相同初始状态、相同输入序列、相同推进顺序，得到相同结果')).toBe(true)
    // 页内分叉来源恰好 7 条
    const sSrc = page.slice(page.indexOf('## 最常见的分叉来源是什么'), page.indexOf('## 哪些系统最容易把确定性搞坏'))
    expect((sSrc.match(/^- /gm) || []).length).toBe(7)
    // 页内校验工具恰好 5 条，案例回链其中三项
    const sTool = page.slice(page.indexOf('## 校验工具必须是日常设施'), page.indexOf('## 不是所有系统都要追求完全确定'))
    const tools = [...sTool.matchAll(/^- (.+?)。$/gm)].map(m => m[1])
    expect(tools.length).toBe(5)
    expect(tools.join('、')).toContain('定期状态哈希')
    expect(tools.join('、')).toContain('最早分叉帧定位工具')
    // 页内分层确定性「必须强确定」行与案例回填呼应
    expect(page.includes('必须强确定：核心裁决、技能命中、关键资源变更和回放证据')).toBe(true)
    // 页内常见误区恰好 4 条（切片止于案例之前，案例内列表不计入），案例回链第一条
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    expect(page.includes('在架构上依赖确定性，在工程上却继续使用不受控的浮点、随机和顺序')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of ['集合遍历顺序不稳定', '随机数源没统一，或不同模块共用了同一随机流', '先更新 Buff 再更新移动，还是反过来']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('集合遍历顺序不稳定')).toBe(true)
    expect(sec.includes('随机数源没统一，或不同模块共用了同一随机流')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '## 顺序比很多人想的更重要',
      '## 随机数必须像资源一样被管理',
      '## 校验工具必须是日常设施',
      '## 不是所有系统都要追求完全确定',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    // 注：断言不出现试点篇页名的文件名字面量——site-links 的 kb-case 对账按页名子串 find，
    // 出现会误命中试点篇页面导致标题核对错位
    const pages = readdirSync(resolve(root, 'docs/04-sync-combat')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(9)
    expect(pages).toContain('06.md')
    expect(pages).toContain('index.md')
  })
})
