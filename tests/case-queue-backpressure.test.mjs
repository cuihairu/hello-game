import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture05 = readFileSync(resolve(dir, '05-concurrency-models.md'), 'utf8')

// 案例切片：从「## 实战案例」到「## 小结」（全讲为无编号 H2 体例，案例按无编号节插在小结之前）
function caseSection(src) {
  const start = src.indexOf('## 实战案例：一次「重启就好」')
  const end = src.indexOf('## 小结')
  expect(start, '第 05 讲应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于小结之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 05 讲「重启就好」的高峰队列失控排查）', () => {
  const sec = caseSection(lecture05)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：排队账本、重试放大、内存账与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：入口 2400 条/秒、高峰 10 分钟、CPU 45%、每高峰缓涨 240MB
    const entry = Number(grab(/涨到 \*\*(\d+)\*\* 条\/秒/, '高峰入口')[1])
    const minutes = Number(grab(/高峰持续 \*\*(\d+)\*\* 分钟/, '高峰时长')[1])
    const cpu = Number(grab(/CPU 峰值只有 \*\*(\d+)\*\*%/, 'CPU 峰值')[1])
    const grow = Number(grab(/每高峰约 \*\*(\d+)\*\*MB/, '单高峰内存缓涨')[1])
    // 第一步：队列深度指标 0 个
    expect(Number(grab(/队列深度指标 \*\*(\d+)\*\* 个/, '队列指标缺口')[1])).toBe(0)
    // 收敛：消费 1s ÷ 0.5ms = 2000；净增 400 = 2400 − 2000
    const cap = grab(/消费上限 = 1 秒 ÷ \*\*([\d.]+)\*\*ms = \*\*(\d+)\*\* 条\/秒/, '消费上限')
    const perMsg = Number(cap[1])
    const consume = Number(cap[2])
    expect(1000 / perMsg).toBe(consume)
    const net = grab(/入口 \*\*(\d+)\*\* − \*\*(\d+)\*\* = 净增 \*\*(\d+)\*\* 条\/秒/, '净增账本')
    expect(Number(net[1])).toBe(entry)
    expect(Number(net[2])).toBe(consume)
    const netRate = Number(net[3])
    expect(Number(net[1]) - Number(net[2])).toBe(netRate)
    // 10 分钟（600 秒）积压 24 万条；末条等待 120 秒 > 3 秒超时
    const acc = grab(/高峰 \*\*(\d+)\*\* 分钟（\*\*(\d+)\*\* 秒）积压 400 × 600 = \*\*(\d+)\*\* 万条/, '积压账本')
    expect(Number(acc[1])).toBe(minutes)
    const seconds = Number(acc[2])
    expect(minutes * 60).toBe(seconds)
    const backlogWan = Number(acc[3])
    expect((netRate * seconds) / 10000).toBe(backlogWan)
    const wait = grab(/末条消息等待 24 万 × \*\*([\d.]+)\*\*ms = \*\*(\d+)\*\* 秒/, '排空等待')
    expect(Number(wait[1])).toBe(perMsg)
    expect((backlogWan * 10000 * Number(wait[1])) / 1000).toBe(Number(wait[2]))
    const timeout = Number(grab(/远超客户端 \*\*(\d+)\*\* 秒超时/, '超时阈值')[1])
    expect(Number(wait[2])).toBeGreaterThan(timeout)
    // 重试放大：2400 × 1.2 = 2880；净增升到 880 = 2880 − 2000
    const retry = grab(/入口 2400 × 1\.2 = \*\*(\d+)\*\* 条\/秒，净增升到 \*\*(\d+)\*\* 条\/秒/, '重试放大')
    expect(entry * 1.2).toBe(Number(retry[1]))
    expect(Number(retry[1]) - consume).toBe(Number(retry[2]))
    // 内存账：24 万条 × 1KB = 240MB，与现象缓涨值闭环
    const mem = grab(/万条 × \*\*(\d+)\*\*KB = \*\*(\d+)\*\*MB/, '队列内存账')
    expect((backlogWan * 10000 * Number(mem[1])) / 1000).toBe(Number(mem[2]))
    expect(Number(mem[2])).toBe(grow)
    // 第四步：上限对齐讲义骨架 4096；P99 3s → 180ms；积压 24 → 0；CPU 仍是 45%
    const limit = Number(grab(/上限对齐讲义骨架的 \*\*(\d+)\*\*/, '有界上限')[1])
    const pin = lecture05.match(/const roomQueueSize = (\d+)/)
    expect(pin, '讲义第 5 节骨架应有 roomQueueSize 常量').toBeTruthy()
    expect(limit).toBe(Number(pin[1]))
    const p99 = grab(/P99 从 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\*ms/, 'P99 回落')
    expect(Number(p99[1])).toBe(timeout)
    expect(Number(p99[1]) * 1000).toBeGreaterThan(Number(p99[2]))
    const left = grab(/积压 \*\*(\d+)\*\* 万 → \*\*(\d+)\*\*/, '积压归零')
    expect(Number(left[1])).toBe(backlogWan)
    expect(Number(left[2])).toBe(0)
    expect(Number(grab(/CPU 还是 \*\*(\d+)\*\*%/, 'CPU 不变')[1])).toBe(cpu)
    const water = Number(grab(/水位 \*\*(\d+)\*\*%/, '告警水位')[1])
    expect(water).toBeGreaterThan(0)
    expect(water).toBeLessThan(100)
  })

  it('声称对账：陷阱 8 条第 3 条、三件套 3 样、超限四选一、退化 4 层全部与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 陷阱清单 8 条，第 3 条正是「无界队列」
    const trap = grab(/陷阱清单 \*\*(\d+)\*\* 条里的第 \*\*(\d+)\*\* 条/, '陷阱条数与位次')
    const sT = lecture05.slice(lecture05.indexOf('## 常见陷阱清单'), lecture05.indexOf('## 实战案例'))
    const trapLines = sT.split('\n').filter(l => /^\d\. \*\*/.test(l))
    expect(trapLines.length).toBe(Number(trap[1]))
    expect(trapLines[Number(trap[2]) - 1]).toContain('无界队列')
    // 流控三件套 3 样
    const kit = Number(grab(/队列三件套 \*\*(\d+)\*\* 样/, '三件套')[1])
    const s3 = lecture05.slice(lecture05.indexOf('### 稳定的系统给每个队列配三样东西'), lecture05.indexOf('### 退化顺序要提前设计'))
    expect((s3.match(/^\d\. \*\*/gm) || []).length).toBe(kit)
    // 超限策略 4 选一：讲内该行以顿号分隔正好 4 项且写明「四选一」
    const four = Number(grab(/无超限策略（\*\*(\d+)\*\* 选一没得选）/, '超限四选一')[1])
    const strategyLine = s3.split('\n').find(l => /^\d\. \*\*超限策略\*\*/.test(l))
    expect(strategyLine, '讲义应有「超限策略」条目').toBeTruthy()
    expect(strategyLine.includes('四选一')).toBe(true)
    expect(strategyLine.split('、').length).toBe(four)
    // 退化顺序 4 层
    const degr = grab(/退化顺序 \*\*(\d+)\*\* 层/, '退化层数')
    const degrFix = grab(/退化顺序 \*\*(\d+)\*\* 层写进代码/, '退化进代码')
    const s4 = lecture05.slice(lecture05.indexOf('### 退化顺序要提前设计'), lecture05.indexOf('### 背压为什么需要提前做'))
    const layers = (s4.match(/^\d\. /gm) || []).length
    expect(layers).toBe(Number(degr[1]))
    expect(Number(degrFix[1])).toBe(layers)
    // 引文与锚点：数字账 6.4GB、超限降级写本地 WAL、位置包丢旧保新（第 04 讲同款纪律）
    expect(lecture05.includes('64KB 缓冲 = 6.4GB')).toBe(true)
    expect(sec.includes('丢旧保新')).toBe(true)
    expect(lecture05.includes('metrics.Inc("persist_queue_overflow")')).toBe(true)
    expect(lecture05.includes('appendToLocalWAL')).toBe(true)
    expect(lecture05.includes('ErrRoomBusy')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与骨架代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '## 并发模型的下半场：流控与背压',
      '### 为什么高峰时先崩的是队列',
      '### 稳定的系统给每个队列配三样东西',
      '### 退化顺序要提前设计',
      '### 背压为什么需要提前做',
      '## 代码示例：单写者房间服的最小骨架',
      '## 常见陷阱清单',
      '## 小结',
    ]) {
      expect(lecture05.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与骨架一致：有界 channel + 满时显式选择 + 每轮处理配额
    expect(lecture05.includes('const roomQueueSize = 4096')).toBe(true)
    expect(lecture05.includes('make(chan Message, roomQueueSize)')).toBe(true)
    expect(existsSync(resolve(dir, '05-concurrency-models.md'))).toBe(true)
  })
})
