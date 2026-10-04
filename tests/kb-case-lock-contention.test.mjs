import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/runtime/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「加了全局锁，战斗服反而更抖」的锁竞争排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「必须争锁的处境」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('必须争锁的处境')
  expect(start, '第 5 章 05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/runtime/05「加了全局锁，战斗服反而更抖」的锁竞争排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少抖动归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 三层代价逐层落到案例里
    for (const layer of ['等待层', '切换层', '长尾层']) {
      expect(sec.includes(layer), `案例缺少分层「${layer}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '战斗事件处理逐帧访问的全局状态登记为热路径',
      '玩家状态回房间私有，跨房间协作改异步消息投递',
      '全局索引每帧单线程构建只读快照',
      '定位→判断→单写/分区/异步→锁粒度',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：TPS 降幅、抖动归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：平均 TPS 降 3%
    const tps0 = Number(grab(/平均 TPS 从 \*\*(\d+)\*\* 降到/, '加锁前 TPS')[1])
    const tps1 = Number(grab(/降到 \*\*(\d+)\*\*（降/, '加锁后 TPS')[1])
    const drop = Number(grab(/（降 \*\*(\d+)\*\*%）/, 'TPS 降幅')[1])
    expect(tps0 * (1 - drop / 100)).toBe(tps1)
    // fence 三行分账合计 = P99 抖动
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+(\d+)ms$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), ms: Number(m[3]) }))
    expect(rows.length).toBe(3)
    const p99 = Number(grab(/P99 帧耗时从 \*\*(\d+)\*\* 毫秒抖到/, '加锁前 P99')[1])
    const p99b = Number(grab(/抖到 \*\*(\d+)\*\* 毫秒/, '加锁后 P99')[1])
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(rows.reduce((s, r) => s + r.ms, 0)).toBe(p99b)
    expect(rows.map(r => Math.round(r.pct * p99b / 100))).toEqual(rows.map(r => r.ms))
    // 根因账：等待层 71% 对应全局玩家表锁
    expect(sec.includes('**71**% 的抖动来自全局玩家表锁')).toBe(true)
    expect(rows[0].pct).toBe(71)
    // 复核账：P99 38→14、超时率 1.8%→0.1%、排查 2 天→0 天
    const re = grab(/P99 帧耗时 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, 'P99 复核')
    expect(Number(re[1])).toBe(p99b)
    expect(Number(re[2])).toBe(14)
    const to0 = Number(grab(/战斗事件超时率 \*\*([\d.]+)\*\*%，集中在高峰/, '超时率初值')[1])
    const to1 = Number(grab(/低峰同样的压力测试超时率 \*\*([\d.]+)\*\*%/, '低峰超时率')[1])
    expect(to0).toBe(1.8)
    expect(to1).toBe(0.2)
    expect(Number(grab(/超时率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%；同类抖动排查耗时/, '超时率复核')[2])).toBe(0.1)
    expect(Number(grab(/排查耗时 \*\*(\d+)\*\* 天 → 治理顺序固化后 \*\*(\d+)\*\* 天/, '排查耗时复核')[1])).toBe(2)
    // 房间规模两处一致
    expect(Number(grab(/每进程 \*\*(\d+)\*\* 房间、每房间 \*\*(\d+)\*\* 人/, '房间规模')[1])).toBe(8)
    expect(sec.includes('**8** 个房间线程抢一把锁')).toBe(true)
  })

  it('声称对账：代价清单、热点、单写者手段与治理顺序均与页内实况一致', () => {
    const grab = (pattern, label) => {
      const m = page.match(pattern)
      expect(m, `页面中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 页内锁代价恰好 6 条
    const sCost = page.slice(page.indexOf('## 锁真正带来的代价是什么'), page.indexOf('## 哪些地方最容易变成热点锁'))
    expect((sCost.match(/^- /gm) || []).length).toBe(6)
    // 页内热点恰好 6 条
    const sHot = page.slice(page.indexOf('## 哪些地方最容易变成热点锁'), page.indexOf('## 为什么“把锁粒度再细一点”不总是答案'))
    expect((sHot.match(/^- /gm) || []).length).toBe(6)
    // 页内单写者手段恰好 4 条
    const sSingle = page.slice(page.indexOf('## 比锁更值钱的通常是“单写者”'), page.indexOf('## 什么时候锁仍然是合理的'))
    expect((sSingle.match(/^- /gm) || []).length).toBe(4)
    // 页内治理顺序恰好 4 步
    const sGov = page.slice(page.indexOf('## 一个更实用的治理顺序'), page.indexOf('## 锁问题和执行模型是连着的'))
    expect((sGov.match(/^\d\. /gm) || []).length).toBe(4)
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 案例引用的页内原话可查
    for (const s of ['别让锁出现在高频热路径上', '锁粒度优化解决的是症状，不一定解决结构问题', '平时很好，高峰时突然抖']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('别让锁出现在高频热路径上')).toBe(true)
    expect(sec.includes('锁粒度优化解决的是症状，不一定解决结构问题')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '## 哪些地方最容易变成热点锁',
      '## 比锁更值钱的通常是“单写者”',
      '## 一个更实用的治理顺序',
      '## 锁问题和执行模型是连着的',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    // 注：断言不出现「05.md」「06.md」字面量——site-links 的 kb-case 对账按完整路径 find，
    // 但 04 章已有同名页（05/06），裸文件名会干扰人工排查，故用计数 + 关键页锚定
    const pages = readdirSync(resolve(root, 'docs/server/runtime')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('00.md')
    expect(pages).toContain('index.md')
  })
})
