import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/capacity/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「合服三周后，邮件发给不存在的人」的撞号漏改排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「迁移和合服的本质」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('迁移和合服的本质，是对系统数据模型的一次压力测试')
  expect(start, 'capacity 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/capacity/03「合服三周后，邮件发给不存在的人」的撞号漏改排查）', () => {
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
    for (const term of ['统一标识层', '全量扫描', '行数关系加抽样比对', '映射表永久保留']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['统一标识层', '全量扫描', '核对放行', '映射表永久化']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：偏移量、漏改投诉、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 撞号账：偏移 1000 万
    expect(Number(grab(/整体加偏移 \*\*(\d+)\*\* 万/, '偏移量')[1])).toBe(1000)
    // 漏改账：三周 87 起；记忆枚举 42 张表
    expect(Number(grab(/三周累计 \*\*(\d+)\*\* 起/, '漏改投诉')[1])).toBe(87)
    expect(Number(grab(/枚举了 \*\*(\d+)\*\* 张表/, '记忆枚举')[1])).toBe(42)
    // 复核账：87 → 0、多识别 3 张、拦下 1 处
    expect(Number(grab(/投诉 \*\*(\d+)\*\* 起 → 下一次合服 \*\*(\d+)\*\* 起/, '投诉复核')[2])).toBe(0)
    expect(Number(grab(/多识别出 \*\*(\d+)\*\* 张引用表/, '多识别')[1])).toBe(3)
    expect(Number(grab(/拦下 \*\*(\d+)\*\* 处视图残留旧 ID/, '拦下')[1])).toBe(1)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 6 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // 引用完整性恰好 4 条
    const sRef = page.slice(page.indexOf('### 引用完整性决定迁移质量'), page.indexOf('### 映射表为什么值得永久保留'))
    expect((sRef.match(/^- /gm) || []).length).toBe(4)
    // 执行纪律恰好 6 条
    const sDisc = page.slice(page.indexOf('### 执行纪律：停写、干跑、核对'), page.indexOf('### 冲突处理与补偿'))
    expect((sDisc.match(/^- /gm) || []).length).toBe(6)
    // 映射表理由恰好 3 条
    const sMap = page.slice(page.indexOf('### 映射表为什么值得永久保留'), page.indexOf('### 合服时机与前置盘点'))
    expect((sMap.match(/^- /gm) || []).length).toBe(3)
    for (const s of ['邮件发给不存在的人', '好友列表里多了个陌生人', '存在一份没人知道的数据副本']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### ID 撞号：最典型的隐性冲突',
      '### 引用完整性决定迁移质量',
      '### 执行纪律：停写、干跑、核对',
      '### 映射表为什么值得永久保留',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/capacity')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
    expect(pages).toContain('01.md')
  })
})
