import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture12 = readFileSync(resolve(dir, '12-data-analytics.md'), 'utf8')

// 案例切片：从「## 13. 实战案例」到「## 本章小结」
function caseSection(src) {
  const start = src.indexOf('## 13. 实战案例')
  const end = src.indexOf('## 本章小结')
  expect(start, '第 12 讲应存在「## 13. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于本章小结之前').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 12 讲「报表收入下滑 12%」）', () => {
  const sec = caseSection(lecture12)

  it('五步结构齐全：口径 → 维度 → 漏斗 → 根因处置 → 回填 + 教训收束', () => {
    for (const part of ['背景与现象', '先对口径', '维度拆分定位人群', '支付漏斗定位环节', '根因与处置', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    // 漏斗表是本案的核心证据形态
    expect(sec.includes('| 漏斗步骤 |')).toBe(true)
  })

  it('数字闭环：渠道拆分解释全站跌幅，覆盖×验签解释渠道跌幅，笔数与腰斩吻合', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m[1]
    }
    // 总口径：环比 -12%
    const totalDrop = Number(grab(/环比 \*\*-(\d+)%\*\*/, '环比跌幅'))
    // 渠道拆分：占收入 30%，渠道内 -40%
    const split = sec.match(/占收入 (\d+)%，渠道内 -(\d+)%/)
    expect(split, '案例中找不到「渠道拆分」').toBeTruthy()
    const share = Number(split[1])
    const channelDrop = Number(split[2])
    // 链路一：30% × 40% ≈ 12%（渠道拆分解释全站跌幅）
    expect(Math.round((share * channelDrop) / 100)).toBe(totalDrop)
    // 链路二：新包覆盖 80% 付费用户 × 入账腰斩 50% ≈ 40%（渠道内跌幅）
    const coverage = Number(grab(/覆盖该渠道约 (\d+)% 付费用户/, '新包覆盖率'))
    const funnelPass = Number(grab(/跌到约 (\d+)%/, '验签通过率'))
    const statedChain = Number(grab(/≈ (\d+)%，链条闭合/, '渠道内推算'))
    expect(Math.round((coverage * funnelPass) / 100)).toBe(statedChain)
    // 漏斗表与维度拆分两处独立表述的「腰斩」必须一致
    const halved = Number(grab(/腰斩（(\d+)%/, '入账腰斩'))
    expect(halved).toBe(funnelPass)
    // 笔数：未入账 = 支付 × 腰斩比例
    const amounts = sec.match(/支付约 ([\d.]+) 万笔，未入账约 ([\d.]+) 万笔/)
    expect(amounts, '案例中找不到「万笔」对').toBeTruthy()
    const paid = Number(amounts[1])
    const unpaid = Number(amounts[2])
    expect(Math.abs(unpaid - (paid * funnelPass) / 100)).toBeLessThan(0.01)
    // 回填清单的告警阈值在场
    expect(sec.includes('0.5%'), '回填清单缺少验签告警阈值').toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节号（1.3/2.2/4.2/6.1）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of ['### 1.3 数据质量五维', '### 2.2 口径定义比图表更重要', '### 4.2 注册漏斗与付费漏斗', '### 6.1 付费用户分层']) {
      expect(lecture12.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '12-data-analytics.md'))).toBe(true)
  })
})
