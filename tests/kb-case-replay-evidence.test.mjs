import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/07.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「争议发生时，回放调不出来」的证据链后补排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「回放、观战与裁决真正要提前设计的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('回放、观战与裁决真正要提前设计的')
  expect(start, 'sync/07 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/07「争议发生时，回放调不出来」的证据链后补排查）', () => {
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
    for (const term of ['验收标准', '记录方式同定', '独立转发', '仲裁与回放分离']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['记录方式同定', '证据链六项', '观战独立转发', '仲裁与回放分离']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：不可重建局数、裁决时长、观战带宽、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 不可重建账：1200 局
    expect(Number(grab(/\*\*(\d+)\*\* 局历史对局无法重建/, '不可重建')[1])).toBe(1200)
    // 裁决账：初值 3 天
    expect(Number(grab(/单起争议裁决耗时 \*\*(\d+)\*\* 天/, '裁决初值')[1])).toBe(3)
    // 观战带宽账：40%
    expect(Number(grab(/占房间带宽 \*\*(\d+)%\*\*/, '带宽初值')[1])).toBe(40)
    // 复核账：可重建 0% → 100%、裁决 3 天 → 2 小时、带宽 40% → 9%
    expect(Number(grab(/可重建对局 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '重建复核')[2])).toBe(100)
    expect(Number(grab(/单起争议裁决 \*\*(\d+)\*\* 天 → \*\*(\d+)\*\* 小时/, '裁决复核')[2])).toBe(2)
    expect(Number(grab(/占房间带宽 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '带宽复核')[2])).toBe(9)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 证据链恰好 6 条
    const sChain = page.slice(page.indexOf('### 一条像样的证据链至少应该覆盖什么'), page.indexOf('### 观战不是“把房间数据再发一遍”'))
    expect((sChain.match(/^- /gm) || []).length).toBe(6)
    // 工具链 5 条
    const sTools = page.slice(page.indexOf('### 工具链通常比回放播放器更重要'), page.indexOf('### 常见误区'))
    expect((sTools.match(/^- /gm) || []).length).toBe(5)
    // 常见误区 4 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '回放常被当附加功能，实际它是验收标准',
      '如果直接把观战旁挂在主房间广播上，房间性能和带宽通常会一起受影响',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 回放记录方式为什么必须和同步模型一起定',
      '### 一条像样的证据链至少应该覆盖什么',
      '### 观战不是“把房间数据再发一遍”',
      '### 仲裁证据和玩家回放不是一回事',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/server/sync')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(9)
    expect(pages).toContain('index.md')
    expect(pages).toContain('07.md')
  })
})
