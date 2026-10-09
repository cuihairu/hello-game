import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/06.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「重连后道具多领了一份」的重复与顺序排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正要强调的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正要强调的')
  expect(start, '第 3 章 06 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/06「重连后道具多领了一份」的重复与顺序排查）', () => {
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
    // 三种语义与五问落到案例里
    for (const term of ['唯一请求 ID', '幂等表', '丢了会怎样、重复了会怎样、晚到还处理吗、反序会出事吗、旧端会误解吗']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '唯一请求 ID 与幂等表',
      '状态覆盖规则',
      '五问语义标注',
      '回执与补偿',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：对账差异、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 对账账：流水 24100、到账 23883、差 217，重复率 0.9% 可复算
    const total = Number(grab(/发奖流水 \*\*(\d+)\*\* 笔/, '流水总数')[1])
    const arrived = Number(grab(/客户端到账 \*\*(\d+)\*\* 笔/, '到账数')[1])
    const diff = Number(grab(/差 \*\*(\d+)\*\* 笔/, '差值')[1])
    expect(total).toBe(24100)
    expect(arrived).toBe(23883)
    expect(total - arrived).toBe(diff)
    expect(diff).toBe(217)
    expect(Number(grab(/重复率 \*\*([\d.]+)\*\*%/, '重复率')[1])).toBe(0.9)
    expect(Math.round((diff / total) * 1000) / 10).toBe(0.9)
    // 抽样账：抽 20 笔
    expect(Number(grab(/抽 \*\*(\d+)\*\* 笔重复样本/, '抽样数')[1])).toBe(20)
    // 回退投诉账：日 340 → 12
    expect(Number(grab(/投诉日 \*\*(\d+)\*\* 单/, '投诉初值')[1])).toBe(340)
    expect(Number(grab(/位置回退投诉日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '投诉复核')[2])).toBe(12)
    // 复核账：重复 217 → 0、差异率 0.9% → 0.01%
    expect(Number(grab(/重复发奖 \*\*(\d+)\*\* 笔 → \*\*(\d+)\*\* 笔/, '重复复核')[2])).toBe(0)
    expect(Number(grab(/对账差异率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%/, '差异率复核')[2])).toBe(0.01)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内五问恰好 5 条
    const sFive = page.slice(page.indexOf('### 一组更实用的判断问题'), page.indexOf('### 常见误区'))
    expect((sFive.match(/^- /gm) || []).length).toBe(5)
    // 案例引用的页内原话可查
    for (const s of [
      '传输层觉得问题在业务层，业务层觉得问题在协议层，出了事故谁都解释不清',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 可靠性的工程问题不只是重发',
      '### 顺序也不是只有全局有序',
      '### 一组更实用的判断问题',
      '### 常见的组合策略',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/networking')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('07.md')
  })
})
