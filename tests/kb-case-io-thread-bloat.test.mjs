import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「晚高峰越来越慢，心跳集体误踢」的接入层职责混淆排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「I/O 模型真正要回答的…」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('I/O 模型真正要回答的，不是“该用哪种高级模式”')
  expect(start, 'networking/02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/02「晚高峰越来越慢，心跳集体误踢」的接入层职责混淆排查）', () => {
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
    for (const term of ['I/O 线程不做重逻辑', '写缓冲上限', '故障隔离', '高低优先级隔离']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['五层职责切分', '写缓冲背压上限', '接入层原则评审', '事件分层哨兵']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：重业务混线程、抖动与积压、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 混线程账：5 类重业务
    expect(Number(grab(/\*\*(\d+)\*\* 类重业务/, '重业务')[1])).toBe(5)
    // 初值账：抖动 350 毫秒、写缓冲 8000 条、误踢 900 起
    expect(Number(grab(/事件循环抖动 \*\*(\d+)\*\* 毫秒/, '抖动初值')[1])).toBe(350)
    expect(Number(grab(/单连接写缓冲峰值 \*\*(\d+)\*\* 条/, '积压初值')[1])).toBe(8000)
    expect(Number(grab(/心跳误踢 \*\*(\d+)\*\* 起/, '误踢初值')[1])).toBe(900)
    // 复核账：抖动 350 → 3、积压 8000 → 600、误踢 900 → 4
    expect(Number(grab(/事件循环抖动 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, '抖动复核')[2])).toBe(3)
    expect(Number(grab(/单连接写缓冲峰值 \*\*(\d+)\*\* 条 → \*\*(\d+)\*\* 条/, '积压复核')[2])).toBe(600)
    expect(Number(grab(/心跳误踢 \*\*(\d+)\*\* 起 → \*\*(\d+)\*\* 起/, '误踢复核')[2])).toBe(4)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 五层拆法恰好 5 条
    const sLayers = page.slice(page.indexOf('### 接入层里真正该区分的几类工作'), page.indexOf('### 写缓冲和背压为什么迟早会成为主问题'))
    expect((sLayers.match(/^- /gm) || []).length).toBe(5)
    // 稳妥原则 5 条
    const sPrin = page.slice(page.indexOf('### 一套更稳妥的原则'), page.indexOf('### 常见误区'))
    expect((sPrin.match(/^- /gm) || []).length).toBe(5)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '让负责收包的线程顺便完成',
      '不是全挂，而是越来越慢',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 接入层里真正该区分的几类工作',
      '### 写缓冲和背压为什么迟早会成为主问题',
      '### 一套更稳妥的原则',
      '### 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('02.md')
  })
})
