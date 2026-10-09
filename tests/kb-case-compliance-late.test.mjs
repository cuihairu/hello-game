import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/security/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「提审前一周，登录流程整个重做」的合规后置排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「合规、版号与平台约束真正成熟的状态」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('合规、版号与平台约束真正成熟的状态')
  expect(start, 'security 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/security/04「提审前一周，登录流程整个重做」的合规后置排查）', () => {
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
    for (const term of ['底层硬约束', '三层拆分', '长期可回查', '审核挂点']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['硬约束前置', '三层拆分', '回查能力', '审核入口']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：硬裁、延期、回查覆盖、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 后置账：硬裁 3 个、延期 6 周
    expect(Number(grab(/\*\*(\d+)\*\* 个功能只能硬裁，版本延期 \*\*(\d+)\*\* 周/, '后置')[1])).toBe(3)
    expect(Number(grab(/\*\*(\d+)\*\* 个功能只能硬裁，版本延期 \*\*(\d+)\*\* 周/, '后置')[2])).toBe(6)
    // 复核账：硬裁 3 → 0、延期 6 周 → 0 周、回查 0% → 100%
    expect(Number(grab(/硬裁功能 \*\*(\d+)\*\* 个 → \*\*(\d+)\*\* 个/, '硬裁复核')[2])).toBe(0)
    expect(Number(grab(/版本延期 \*\*(\d+)\*\* 周 → \*\*(\d+)\*\* 周/, '延期复核')[2])).toBe(0)
    expect(Number(grab(/回查入口覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '回查')[1])).toBe(0)
    expect(Number(grab(/回查入口覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '回查')[2])).toBe(100)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见错误恰好 4 条
    const sMis = page.slice(page.indexOf('### 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 约束五条 + 落地四条 = 9
    const sImpl = page.slice(page.indexOf('### 为什么合规会直接改变实现方式'), page.indexOf('### 版号和平台规则为什么不能后置'))
    expect((sImpl.match(/^- /gm) || []).length).toBe(9)
    // 不能后置四问恰好 4 条
    const sVer = page.slice(page.indexOf('### 版号和平台规则为什么不能后置'), page.indexOf('### 平台约束会改变你的技术自由度'))
    expect((sVer.match(/^- /gm) || []).length).toBe(4)
    // 三层拆分恰好 3 条
    const sReal = page.slice(page.indexOf('### 更现实的做法'), page.indexOf('### 常见错误'))
    expect((sReal.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '如果这些都到上线前才补，项目往往只能靠硬裁功能和临时旁路收场',
      '假设所有地区、平台和版本都能共用同一套策略',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 为什么合规会直接改变实现方式',
      '### 版号和平台规则为什么不能后置',
      '### 更现实的做法',
      '### 平台约束会改变你的技术自由度',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/security')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
