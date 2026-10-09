import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「帧同步省了带宽，重连和争议反而爆了」的同步模型误判排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「同步模型真正要先定的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('同步模型真正要先定的')
  expect(start, '第 4 章 02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/02「帧同步省了带宽，重连和争议反而爆了」的同步模型误判排查）', () => {
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
    // 帧同步依赖清单与混合边界落到案例里
    for (const term of ['默认输入与超时策略', '周期检查点', '状态哈希', '混合边界']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of ['模型四问', '帧同步依赖清单', '混合边界', '误判清单']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：带宽收益、成本归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 收益账：广播流量降 64%，单局带宽 48 → 17 KB/s
    expect(Number(grab(/广播流量比原状态同步方案降了 \*\*(\d+)\*\*%/, '带宽降幅')[1])).toBe(64)
    expect(Number(grab(/单局带宽从 \*\*(\d+)\*\* KB\/s 降到 \*\*(\d+)\*\* KB\/s/, '带宽数值')[1])).toBe(48)
    expect(Number(grab(/单局带宽从 \*\*(\d+)\*\* KB\/s 降到 \*\*(\d+)\*\* KB\/s/, '带宽数值')[2])).toBe(17)
    // 成本账：重连失败 8%、争议日 600、分叉每周 3 次
    const fail = Number(grab(/重连失败率 \*\*(\d+)\*\*%/, '重连失败率')[1])
    expect(fail).toBe(8)
    expect(Number(grab(/争议工单日 \*\*(\d+)\*\* 单/, '争议初值')[1])).toBe(600)
    expect(Number(grab(/状态分叉每周 \*\*(\d+)\*\* 次/, '分叉初值')[1])).toBe(3)
    // 归因三分账：百分比合计 100，百分点合计 = 8，且逐行可复算
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+([\d.]+) 个百分点$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), pt: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(Number(rows.reduce((s, r) => s + r.pt, 0).toFixed(1))).toBe(fail)
    expect(rows.map(r => Number((r.pct * fail / 100).toFixed(1)))).toEqual(rows.map(r => r.pt))
    // 争议构成：63% 是「结果对不上」
    expect(Number(grab(/争议里，\*\*(\d+)\*\*% 是/, '争议构成')[1])).toBe(63)
    // 复核账：重连 8% → 0.6%、争议 600 → 80、分叉 3 → 0
    expect(Number(grab(/重连失败率 \*\*(\d+)\*\*% → \*\*([\d.]+)\*\*%/, '重连复核')[2])).toBe(0.6)
    expect(Number(grab(/争议工单日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '争议复核')[2])).toBe(80)
    expect(Number(grab(/状态分叉每周 \*\*(\d+)\*\* 次 → \*\*(\d+)\*\* 次/, '分叉复核')[2])).toBe(0)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内比较表恰好 7 行维度
    const sTab = page.slice(page.indexOf('### 一个更有用的比较视角'), page.indexOf('### 为什么很多团队会误判'))
    expect((sTab.match(/^\| /gm) || []).length).toBe(9) // 表头 + 分隔 + 7 行
    // 案例引用的页内原话可查
    for (const s of ['看到帧同步省带宽，却没看到确定性和重连成本']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 不要只按“发输入还是发状态”分类',
      '### 常见模型二：输入锁步 / 帧同步',
      '### 常见模型三：混合方案',
      '### 为什么很多团队会误判',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/server/sync')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(9)
    expect(pages).toContain('index.md')
    expect(pages).toContain('08.md')
  })
})
