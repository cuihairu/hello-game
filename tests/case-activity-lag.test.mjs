import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture13 = readFileSync(resolve(dir, '13-tech-ops.md'), 'utf8')

// 案例切片：从「## 11. 实战案例」到「## 本章小结」
function caseSection(src) {
  const start = src.indexOf('## 11. 实战案例')
  const end = src.indexOf('## 本章小结')
  expect(start, '第 13 讲应存在「## 11. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于本章小结之前').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 13 讲「监控全绿」整点活动卡顿）', () => {
  const sec = caseSection(lecture13)

  it('四段结构齐全：现象、对口径、分层、根因处置 + 教训收束', () => {
    for (const part of ['背景与现象', '先对口径', '分层排查链', '根因', '处置', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    // 分层排查是本案的核心证据形态（text 围栏，带语言标记）
    expect(sec.includes('```text')).toBe(true)
  })

  it('数字闭环：71 倍/40 倍可由平均值与 P99 算出，70% 击穿与 6% 未触发阈值自洽', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 口径对：平均 45ms vs P99 80ms → 3200ms
    const avg = Number(grab(/平均处理延迟 \*\*(\d+)ms\*\*/, '平均延迟')[1])
    const p99 = grab(/P99 却从 \*\*(\d+)ms\*\* 飙到 \*\*(\d+)ms\*\*/, 'P99 飙升')
    const p99Before = Number(p99[1])
    const p99Peak = Number(p99[2])
    // 71 倍（vs 平均）、40 倍（vs 事故前 P99）：正文自述倍数必须可复算
    const vsAvg = Number(grab(/比平均值高 (\d+) 倍/, 'vs 平均倍数')[1])
    const vsBefore = Number(grab(/比事故前 P99 高 (\d+) 倍/, 'vs 基线倍数')[1])
    expect(Math.round(p99Peak / avg)).toBe(vsAvg)
    expect(p99Peak / p99Before).toBe(vsBefore)
    // 击穿规模：14 万 / 20 万 = 70%
    const hit = grab(/(\d+) 万在线中约 (\d+) 万（(\d+)%）/, '击穿规模')
    expect(Math.round((Number(hit[2]) / Number(hit[1])) * 100)).toBe(Number(hit[3]))
    // 告警未触发：跌幅 6% < 阈值 10%（渐进式掉线躲过断崖阈值）
    const drop = grab(/跌幅 \*\*(\d+)%\*\*（阈值 \*\*(\d+)%/, '突降阈值')
    expect(Number(drop[1])).toBeLessThan(Number(drop[2]))
    // 连接池顶满 200/200，恢复后 P99 回到基线附近（±20%）
    const pool = grab(/顶满 (\d+)\/(\d+)/, '连接池顶满')
    expect(pool[1]).toBe(pool[2])
    const recovered = Number(grab(/P99 回落到 \*\*(\d+)ms\*\*/, '恢复 P99')[1])
    expect(Math.abs(recovered - p99Before) / p99Before).toBeLessThan(0.2)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节号（3.1/6.2/5.2/2.1/2.3）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of ['### 3.1 三层监控架构', '### 6.2 应急处理流程', '### 5.2 开服流量洪峰应对', '### 2.1 游戏负载的峰谷特征', '### 2.3 压测模型设计']) {
      expect(lecture13.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '13-tech-ops.md'))).toBe(true)
  })
})
