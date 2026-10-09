import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「断线重连一直转圈加载」的追帧与检查点排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「这一页真正要解决的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这一页真正要解决的')
  expect(start, '第 4 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/04「断线重连一直转圈加载」的追帧与检查点排查）', () => {
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
    // 检查点、恢复档位、追帧解耦落到案例里
    for (const term of ['周期检查点', '恢复档位四档', '追帧与资源加载解耦', '权威战斗时钟']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of ['四事分开', '权威暂停语义', '恢复顺序与档位', '追帧不拖垮客户端']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：恢复耗时分档、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 初值账：成功率 82%、平均 47 秒、P99 190 秒
    const ok0 = Number(grab(/断线重连成功率 \*\*([\d.]+)\*\*%/, '成功率初值')[1])
    expect(ok0).toBe(82)
    const avg0 = Number(grab(/平均恢复耗时 \*\*(\d+)\*\* 秒/, '平均耗时初值')[1])
    expect(avg0).toBe(47)
    expect(Number(grab(/P99 \*\*(\d+)\*\* 秒/, 'P99 初值')[1])).toBe(190)
    // 分档账：900 帧以内平均 8 秒、落后 1200 帧
    expect(Number(grab(/落后 \*\*(\d+)\*\* 帧以内的会话平均 \*\*(\d+)\*\* 秒/, '分档账')[1])).toBe(900)
    expect(Number(grab(/落后 \*\*(\d+)\*\* 帧以内的会话平均 \*\*(\d+)\*\* 秒/, '分档账')[2])).toBe(8)
    expect(Number(grab(/权威帧已经领先 \*\*(\d+)\*\* 帧以上/, '落后帧数')[1])).toBe(1200)
    // 归因三分账：失败率 18% = 100 - 82，百分比合计 100
    const fail = 100 - ok0
    expect(fail).toBe(18)
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(sec.includes(`重连失败 ${fail}%  归因`)).toBe(true)
    // 复核账：成功率 82% → 98.6%、平均 47 → 6、P99 190 → 18
    expect(Number(grab(/重连成功率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%/, '成功率复核')[2])).toBe(98.6)
    expect(Number(grab(/平均恢复耗时 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 秒/, '平均复核')[2])).toBe(6)
    expect(Number(grab(/P99 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 秒/, 'P99 复核')[2])).toBe(18)
    // 检查点周期 300 帧、单帧最多追 4 帧
    expect(sec.includes('每 **300** 帧生成房间检查点')).toBe(true)
    expect(sec.includes('最多追 **4** 帧逻辑')).toBe(true)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 4 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 页内四件事恰好 4 条
    const sFour = page.slice(page.indexOf('### 先把四件不同的事分开'), page.indexOf('### 联网战斗里真正的“暂停”只有一种'))
    expect((sFour.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话可查
    for (const s of ['在同时做几件不该一起硬做的事']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 先把四件不同的事分开',
      '### 联网战斗里真正的“暂停”只有一种',
      '### 重连时到底应该先恢复什么',
      '### 追帧应该怎样跑才不拖垮客户端',
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
