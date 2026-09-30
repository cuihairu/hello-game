import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture07 = readFileSync(resolve(dir, '07-core-arch.md'), 'utf8')

// 案例切片：从「## 13. 实战案例」到「## 小结」（小结无编号，案例为最后一个编号节）
function caseSection(src) {
  const start = src.indexOf('## 13. 实战案例')
  const end = src.indexOf('## 小结')
  expect(start, '第 07 讲应存在「## 13. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于小结之前').toBeGreaterThan(start)
  expect(src.indexOf('## 13. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 07 讲「同屏不同血」的帧同步确定性排查）', () => {
  const sec = caseSection(lecture07)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：回放口径差、确定性排除、补帧账本与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：57 份工单；200 场回放「复现正常」，跨端对账 23 场分叉 = 11.5%，其中 19 场 v2.3.0 = 83%
    const workorders = Number(grab(/玩家工单 \*\*(\d+)\*\* 份/, '工单数')[1])
    const total = Number(grab(/重放，\*\*(\d+)\*\* 场争议对局/, '抽样对局')[1])
    const fork = grab(/对账重查，\*\*(\d+)\*\* 场在某一帧后哈希分叉（\*\*([\d.]+)%\*\*）/, '分叉规模')
    const forks = Number(fork[1])
    const forkPct = Number(fork[2])
    expect(forks / total * 100).toBeCloseTo(forkPct, 5)
    const ver = grab(/其中 \*\*(\d+)\*\* 场来自 v2\.3\.0（\*\*(\d+)%\*\*）/, '版本聚集')
    const verForks = Number(ver[1])
    const verPct = Number(ver[2])
    expect(verForks).toBeLessThanOrEqual(forks)
    expect(Math.round(verForks / forks * 100)).toBe(verPct)
    // 三口径：服务端重放 200 场 0 报错，跨端 23 场，口径差 = 23
    const server = grab(/服务端重放\*\*：\*\*(\d+)\*\* 场 \*\*(\d+)\*\* 场报错/, '服务端口径')
    expect(Number(server[1])).toBe(total)
    expect(Number(server[2])).toBe(0)
    expect(Number(grab(/状态哈希——\*\*(\d+)\*\* 场分叉/, '跨端口径')[1])).toBe(forks)
    expect(Number(grab(/口径差\*\*就是 \*\*(\d+)\*\* 场/, '口径差')[1])).toBe(forks)
    // 排除法账本：Tick 主循环 8 步 / 频率表 5 类 / MOBA 档 15~30Hz / 项目 20Hz / 帧长 50ms
    // 三处声称数字与讲内实况对账（表格行数、围栏步数用正则实测）
    const stepsClaim = Number(grab(/主循环的 \*\*(\d+)\*\* 步里/, '主循环步数')[1])
    expect((lecture07.match(/^│\s+\d+\./gm) || []).length).toBe(stepsClaim)
    const hz = grab(/频率表 \*\*(\d+)\*\* 类游戏里 MOBA 档 \*\*(\d+)\*\*~\*\*(\d+)\*\*Hz，项目取 \*\*(\d+)Hz\*\*（帧长 \*\*(\d+)ms\*\*）/, 'Tick 频率口径')
    const kindsClaim = Number(hz[1])
    const hzLow = Number(hz[2])
    const hzHigh = Number(hz[3])
    const tickHz = Number(hz[4])
    const frameMs = Number(hz[5])
    expect((lecture07.match(/^\| (MMO|FPS|MOBA|卡牌\/回合制|SLG) \|/gm) || []).length).toBe(kindsClaim)
    expect(tickHz).toBeGreaterThanOrEqual(hzLow)
    expect(tickHz).toBeLessThanOrEqual(hzHigh)
    expect(1000 / tickHz).toBe(frameMs)
    // 收敛：19 场落到期帧 ±1 帧；iOS 8 + Android 11 = 19；抖动 300ms / 50ms = 补 6 帧
    const gather = grab(/账本收敛：\*\*(\d+)\*\* 场分叉全部落在到期帧附近（±\*\*(\d+)\*\* 帧内）/, '帧号聚集')
    expect(Number(gather[1])).toBe(verForks)
    const plat = grab(/iOS \*\*(\d+)\*\* \/ Android \*\*(\d+)\*\*（无聚集）/, '平台分布')
    expect(Number(plat[1]) + Number(plat[2])).toBe(verForks)
    const burst = grab(/追帧抖动 \*\*(\d+)ms\*\* \/ 帧 \*\*(\d+)ms\*\* = 补 \*\*(\d+)\*\* 帧/, '补帧账本')
    expect(Number(burst[1]) / frameMs).toBe(Number(burst[3]))
    // 根因：5 秒 buff 在 20Hz 下 = 100 帧；时间轮是方案表 4 种之一
    const buff = grab(/持续 \*\*(\d+) 秒\*\* 的 buff（\*\*(\d+)Hz\*\* 下即 \*\*(\d+)\*\* 帧）/, 'buff 帧数')
    expect(Number(buff[1]) * Number(buff[2])).toBe(Number(buff[3]))
    expect(Number(buff[2])).toBe(tickHz)
    const buffFrames = Number(buff[3])
    const timerKinds = Number(grab(/方案表 \*\*(\d+)\*\* 种方案里精度更高的/, '定时器方案数')[1])
    expect((lecture07.match(/^\| (遍历定时器|时间轮|最小堆|时间轮 \+ 最小堆) \|/gm) || []).length).toBe(timerKinds)
    // 处置：帧计数回填 100 帧、复测 0 场；注入 100~500ms = 补 2~10 帧；分叉率 11.5% → 0%
    expect(Number(grab(/触发帧 \+ \*\*(\d+)\*\* 帧/, '帧计数回填')[1])).toBe(buffFrames)
    expect(Number(grab(/复测 23 场 \*\*(\d+)\*\* 场分叉/, '复测分叉')[1])).toBe(0)
    const inject = grab(/抖动 \*\*(\d+)~(\d+)ms\*\*（对应补帧 \*\*(\d+)~(\d+)\*\* 帧）/, '门禁注入')
    expect(Number(inject[1]) / frameMs).toBe(Number(inject[3]))
    expect(Number(inject[2]) / frameMs).toBe(Number(inject[4]))
    const rate = grab(/分叉率 \*\*([\d.]+)%\*\* → \*\*(\d+)%\*\*/, '分叉率回落')
    expect(Number(rate[1])).toBe(forkPct)
    expect(Number(rate[2])).toBeLessThan(Number(rate[1]))
    // 复核：同因工单归零，与现象的 57 份闭环
    const done = grab(/同因工单 \*\*(\d+)\*\* 份（此前两周 \*\*(\d+)\*\* 份）/, '工单闭环')
    expect(Number(done[1])).toBe(0)
    expect(Number(done[2])).toBe(workorders)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节（3/5/6 节小节标题）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 什么时候用帧同步？',
      '### 帧同步的开发成本比你想象的高',
      '### 坑：帧同步的"确定性"是最大的挑战',
      '### 为什么不能用"事件驱动"代替"固定 Tick"？',
      '### 服务端 Tick 的核心流程',
      '### Tick 频率的选择',
      '### 坑：Tick 耗时超标会导致"慢动作"',
      '### 定时器实现方案对比',
      '### 坑：不要在定时器回调中做耗时操作',
    ]) {
      expect(lecture07.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '07-core-arch.md'))).toBe(true)
  })
})
