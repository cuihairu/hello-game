import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/security/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「客服截图在群里传了一圈，手机号全在」的审计脱敏排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「审计、隐私与数据安全真正成熟的状态」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('审计、隐私与数据安全真正成熟的状态')
  expect(start, 'security 02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/security/02「客服截图在群里传了一圈，手机号全在」的审计脱敏排查）', () => {
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
    for (const term of ['按角色分数据视图', '审批链', '脱敏工具化', '字段边界、传输边界和保留边界']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['可追责审计', '后台分视图', '脱敏工具化', '最小化与分级']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：泄露面、审批链、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 泄露账：3 天 4 群 1.2 万玩家
    expect(Number(grab(/\*\*(\d+)\*\* 天内在 \*\*(\d+)\*\* 个群/, '泄露面')[1])).toBe(3)
    expect(Number(grab(/\*\*(\d+)\*\* 天内在 \*\*(\d+)\*\* 个群/, '泄露面')[2])).toBe(4)
    expect(Number(grab(/涉及 \*\*(\d+(?:\.\d+)?)\*\* 万玩家/, '泄露量')[1])).toBe(1.2)
    // 审批链账：0% → 100%
    expect(Number(grab(/导出审批链覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '审批链')[1])).toBe(0)
    expect(Number(grab(/导出审批链覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '审批链')[2])).toBe(100)
    // 拦截账：3 次
    expect(Number(grab(/拦截 \*\*(\d+)\*\* 次测试导出/, '拦截')[1])).toBe(3)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见错误恰好 4 条
    const sMis = page.slice(page.indexOf('### 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 可追责五问恰好 5 条
    const sAudit = page.slice(page.indexOf('### 审计的重点不是记录，而是可追责'), page.indexOf('### 隐私问题在游戏里并不边缘'))
    expect((sAudit.match(/^- /gm) || []).length).toBe(5)
    // 治理方式恰好 5 条
    const sGov = page.slice(page.indexOf('### 更现实的治理方式'), page.indexOf('### 为什么审计、隐私和数据安全要一起看'))
    expect((sGov.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '只要权限模型不细、审计不完整，这类系统本身就是最大的泄露面',
      '风险并不只来自外部泄露，也来自内部过度访问、过度保留和超用途使用',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 审计的重点不是记录，而是可追责',
      '### 后台查询系统',
      '### 日志和导出',
      '### 更现实的治理方式',
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
