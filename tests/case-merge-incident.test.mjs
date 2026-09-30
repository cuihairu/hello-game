import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture10 = readFileSync(resolve(dir, '10-gameplay-systems.md'), 'utf8')

// 案例切片：从「## 13. 实战案例」到「## 本章小结」
function caseSection(src) {
  const start = src.indexOf('## 13. 实战案例')
  const end = src.indexOf('## 本章小结')
  expect(start, '第 10 讲应存在「## 13. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于本章小结之前').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 10 讲「合服后 23 笔充值未发货」）', () => {
  const sec = caseSection(lecture10)

  it('四段结构齐全：现象、对账、根因、处置复盘 + 教训收束', () => {
    for (const part of ['背景与现象', '对账', '根因', '处置与复盘', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    // 时间线示意块必须有语言标签前的 text 围栏（code-blocks 全站测试亦会校验，这里做案例内冒烟）
    expect(sec.includes('```text')).toBe(true)
  })

  it('对账数字闭环：分服合计 = 扣款，扣款 − 发货 = 差异 = 工单，差异率自洽', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m[1]
    }
    const parts = sec.match(/（3 服 (\d+) \+ 7 服 (\d+)）/)
    expect(parts, '案例中找不到「分服拆分」').toBeTruthy()
    const a = Number(parts[1])
    const b = Number(parts[2])
    const charged = Number(grab(/扣款成功 \*\*(\d+)\*\*/, '渠道扣款'))
    const shipped = Number(grab(/发货成功 \*\*(\d+)\*\*/, '游戏发货'))
    const diff = Number(grab(/差异 \*\*(\d+)\*\*/, '差异笔数'))
    const tickets = Number(grab(/涌入 (\d+) 单「充值不到账」/, '工单数'))
    // 闭环：分服合计、差值、工单吻合、差异率
    expect(a + b).toBe(charged)
    expect(charged - shipped).toBe(diff)
    expect(tickets).toBe(diff)
    const rate = Number(grab(/差异率约 ([\d.]+)%/, '差异率'))
    expect(Math.abs((diff / charged) * 100 - rate)).toBeLessThan(0.05)
  })

  it('引用闭合：案例内「第 N 讲」全部对应真实文件，节内互指 4.3/4.4 真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    expect(lecture10.includes('### 4.3 ID 撞号'), '案例引用的 4.3 应真实存在').toBe(true)
    expect(lecture10.includes('### 4.4 干跑与回滚'), '案例引用的 4.4 应真实存在').toBe(true)
  })
})
