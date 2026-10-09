import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/security/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「出海审查，三天说不清用了哪些 SDK」的依赖盘点排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「许可风险与依赖治理真正成熟的标志」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('许可风险与依赖治理真正成熟的标志')
  expect(start, 'security 05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/security/05「出海审查，三天说不清用了哪些 SDK」的依赖盘点排查）', () => {
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
    for (const term of ['统一依赖清单', '高风险准入', '生命周期管理', '替代方案预案']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['统一依赖清单', '高风险准入', '许可证评估', '素材来源记录']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：强传染组件、审查延期、授权覆盖、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 盘点账：2 个强传染组件
    expect(Number(grab(/发现 \*\*(\d+)\*\* 个强传染组件/, '强传染')[1])).toBe(2)
    // 审查账：延期 3 周 → 2 天出清单
    expect(Number(grab(/审查延期 \*\*(\d+)\*\* 周 → \*\*(\d+)\*\* 天/, '审查')[1])).toBe(3)
    expect(Number(grab(/审查延期 \*\*(\d+)\*\* 周 → \*\*(\d+)\*\* 天/, '审查')[2])).toBe(2)
    // 授权账：0% → 100%
    expect(Number(grab(/素材授权对齐覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '授权')[1])).toBe(0)
    expect(Number(grab(/素材授权对齐覆盖率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '授权')[2])).toBe(100)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见错误恰好 4 条
    const sMis = page.slice(page.indexOf('### 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 依赖四类 + 失控三因 = 7
    const sCtrl = page.slice(page.indexOf('### 游戏项目为什么更容易依赖失控'), page.indexOf('### 许可证问题最容易在哪些地方踩坑'))
    expect((sCtrl.match(/^- /gm) || []).length).toBe(7)
    // 许可坑点恰好 4 条
    const sPit = page.slice(page.indexOf('### 许可证问题最容易在哪些地方踩坑'), page.indexOf('### 更实用的依赖治理方式'))
    expect((sPit.match(/^- /gm) || []).length).toBe(4)
    // 治理方式 4 条 + 进一步 3 条 = 7
    const sGov = page.slice(page.indexOf('### 更实用的依赖治理方式'), page.indexOf('### 为什么依赖治理要尽早做'))
    expect((sGov.match(/^- /gm) || []).length).toBe(7)
    for (const s of [
      '很多坑不是因为团队故意违规，而是因为开发早期没有把依赖当成资产来管理',
      '使用带有强传染义务的组件却没有评估分发方式',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 游戏项目为什么更容易依赖失控',
      '### 许可证问题最容易在哪些地方踩坑',
      '### 更实用的依赖治理方式',
      '### 为什么依赖治理要尽早做',
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
