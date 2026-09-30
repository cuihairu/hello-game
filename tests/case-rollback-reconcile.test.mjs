import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture08 = readFileSync(resolve(dir, '08-data-storage.md'), 'utf8')

// 案例切片：从「## 11. 实战案例」到「## 小结」
function caseSection(src) {
  const start = src.indexOf('## 11. 实战案例')
  const end = src.indexOf('## 小结')
  expect(start, '第 08 讲应存在「## 11. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于小结之前').toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 08 讲「主从切换回档后充值补账」）', () => {
  const sec = caseSection(lecture08)

  it('四段结构齐全：现象、对账锁窗、根因、恢复边界 + 教训收束', () => {
    for (const part of ['背景与现象', '锁定丢失窗口', '根因', '恢复边界', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text')).toBe(true)
  })

  it('数字闭环：扣款 − 到账 = 差异 = 补账笔数，时间窗与自述分钟数一致', () => {
    const bold = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return Number(m[1])
    }
    const charged = bold(/扣款成功 \*\*(\d+)\*\*/, '渠道扣款')
    const delivered = bold(/到账 \*\*(\d+)\*\*/, '游戏到账')
    const diff = bold(/差异 \*\*(\d+)\*\*/, '差异笔数')
    expect(charged - delivered).toBe(diff)
    // 补账 11/11：补账笔数与差异一致
    const replay = sec.match(/\*\*(\d+)\/(\d+)/)
    expect(replay, '案例中找不到「11/11 成功」补账闭环').toBeTruthy()
    expect(Number(replay[1])).toBe(diff)
    expect(replay[2]).toBe(replay[1])
    // 时间窗：02:00–02:07 的实际间隔必须等于正文自述的分钟数
    const win = sec.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/)
    expect(win, '案例中找不到丢失窗口时间对').toBeTruthy()
    const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
    const span = toMin(win[2]) - toMin(win[1])
    const stated = bold(/（(\d+) 分钟窗口）/, '窗口分钟数')
    expect(span).toBe(stated)
    // 附带损失（免费发放）与充值差异并存于同窗口
    expect(bold(/(\d+) 笔免费发放/, '免费发放笔数')).toBeGreaterThan(0)
  })

  it('引用闭合：案例内「第 N 讲」对应真实文件，节内互指 4.4 真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    expect(lecture08.includes('### 幂等与对账：充值不能发两次'), '案例引用的 4.4 应真实存在').toBe(true)
    expect(existsSync(resolve(dir, '08-data-storage.md'))).toBe(true)
  })
})
