import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/07.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「越重连越卡，整房被最慢的人拖住」的弱网恢复排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「房间广播和弱网治理真正要做的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('房间广播和弱网治理真正要做的，不是把所有坏网络都强行修成好网络')
  expect(start, 'networking/07 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/07「越重连越卡，整房被最慢的人拖住」的弱网恢复排查）', () => {
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
    for (const term of ['权威快照', '过时即丢', '最差链路', '重连窗口']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['补发语义分档', '弱网目标口径', '权威快照优先恢复', '恢复指标看板']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：重连耗时、单房广播、退出占比、归因分账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：重连 45 秒、单房广播 12000 条/分钟、弱网退出 18%
    expect(Number(grab(/重连平均耗时 \*\*(\d+)\*\* 秒/, '重连初值')[1])).toBe(45)
    expect(Number(grab(/单房广播消息量 \*\*(\d+)\*\* 条\/分钟/, '广播初值')[1])).toBe(12000)
    expect(Number(grab(/因弱网退出房间占比 \*\*(\d+)%\*\*/, '退出初值')[1])).toBe(18)
    // 复核账：重连 45 → 3 秒、广播 12000 → 3000 条/分钟、退出 18% → 4%
    expect(Number(grab(/重连平均耗时 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 秒/, '重连复核')[2])).toBe(3)
    expect(Number(grab(/单房广播消息量 \*\*(\d+)\*\* 条\/分钟 → \*\*(\d+)\*\* 条\/分钟/, '广播复核')[2])).toBe(3000)
    expect(Number(grab(/因弱网退出房间占比 \*\*(\d+)%\*\* → \*\*(\d+)%\*\*/, '退出复核')[2])).toBe(4)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 补发与放弃四档恰好 4 条
    const sGiveUp = page.slice(page.indexOf('### 什么消息该补发，什么消息该放弃'), page.indexOf('### 弱网治理的目标不是完全一致，而是整局还能玩'))
    expect((sGiveUp.match(/^- /gm) || []).length).toBe(4)
    // 监控清单 7 条
    const sMon = page.slice(page.indexOf('### 这类问题最该持续监控什么'), page.indexOf('### 常见误区'))
    expect((sMon.match(/^- /gm) || []).length).toBe(7)
    // 常见误区 3 条（切到案例标题为止，案例节在其后）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '弱网恢复的目标是回到当前可玩状态，而不是补齐每一条历史消息',
      '整局在现实网络条件下仍然可收敛、可恢复、可继续',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 什么消息该补发，什么消息该放弃',
      '### 弱网治理的目标不是完全一致，而是整局还能玩',
      '### 重连恢复通常比补历史广播更重要',
      '### 这类问题最该持续监控什么',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('07.md')
  })
})
