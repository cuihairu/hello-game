import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「改一个特效，热更包重打 400MB」的资源供应链排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('构建、排障和热修成本一起失控')
  expect(start, 'client/03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/03「改一个特效，热更包重打 400MB」的资源供应链排查）', () => {
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
    for (const term of ['热更口径', '构建口径', '五层资源分组', '依赖图校验']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['五层资源分组', '依赖图校验', '工具链固化', '版本协同']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：热更包、首包、构建时长、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：热更 400MB、首包 310MB、构建 46 分钟
    expect(Number(grab(/单次热更包 \*\*(\d+)\*\* MB/, '热更初值')[1])).toBe(400)
    expect(Number(grab(/首包 \*\*(\d+)\*\* MB/, '首包初值')[1])).toBe(310)
    expect(Number(grab(/全量构建 \*\*(\d+)\*\* 分钟/, '构建初值')[1])).toBe(46)
    // 改动清单 37 个资源
    expect(Number(grab(/改动清单只有 \*\*(\d+)\*\* 个资源/, '改动清单')[1])).toBe(37)
    // 复核账：热更 400 → 8MB、首包 310 → 185MB、构建 46 → 12 分钟
    expect(Number(grab(/单次热更包 \*\*(\d+)\*\* MB → \*\*(\d+)\*\* MB/, '热更复核')[2])).toBe(8)
    expect(Number(grab(/首包 \*\*(\d+)\*\* MB → \*\*(\d+)\*\* MB/, '首包复核')[2])).toBe(185)
    expect(Number(grab(/全量构建 \*\*(\d+)\*\* 分钟 → \*\*(\d+)\*\* 分钟/, '构建复核')[2])).toBe(12)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 被低估的资源问题表现恰好 5 条
    const sLow = page.slice(page.indexOf('### 为什么资源问题会被长期低估'), page.indexOf('### 资源系统真正要解决哪几类问题'))
    expect((sLow.match(/^- /gm) || []).length).toBe(5)
    // 构建与热更反向塑造资源组织恰好 4 条（切到常见误区为止，案例节在其后）
    const sBuild = page.slice(page.indexOf('### 构建与热更为什么会反向塑造资源组织'), page.indexOf('### 常见误区'))
    expect((sBuild.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '工具链不是附属品，而是资源系统可治理的前提',
      '单点优化救不了系统性的供应链问题',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 资源分层通常怎么做更稳妥',
      '### 依赖治理',
      '### 工具链为什么和资源系统是同一个问题',
      '### 构建与热更为什么会反向塑造资源组织',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('03.md')
  })
})
