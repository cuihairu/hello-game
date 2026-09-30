import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture19 = readFileSync(resolve(dir, '19-client-architecture.md'), 'utf8')

// 案例切片：从「## 9. 实战案例」到文件结束（本讲小结为第 8 节，案例是收尾节）
function caseSection(src) {
  const start = src.indexOf('## 9. 实战案例')
  expect(start, '第 19 讲应存在「## 9. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 9. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 19 讲「新地图 24 帧的渲染指令归因」）', () => {
  const sec = caseSection(lecture19)

  it('四段结构齐全：现象、口径与预算、指令账本、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：口径与预算', '第二步：维度拆分', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少指令账本示意块').toBe(true)
  })

  it('数字闭环：帧预算换算、超支幅度、DC 倍数与回落、bound 方向均自洽', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 帧率口径：平均与分位
    const avg = Number(grab(/平均帧率 \*\*(\d+)\*\*/, '平均帧率')[1])
    const tail = Number(grab(/尾帧只有 \*\*(\d+)\*\*/, 'P05 尾帧')[1])
    expect(avg).toBeGreaterThan(tail)
    // 阈值换算：33ms ≈ 30fps；预算 33.3ms = 1000/30
    const threshold = Number(grab(/帧耗时 > \*\*(\d+)ms\*\*/, '卡帧阈值')[1])
    expect(Math.abs(1000 / threshold - 30)).toBeLessThan(0.5)
    const budget = Number(grab(/帧预算 = \*\*([\d.]+)ms\*\*/, '帧预算')[1])
    expect(Math.abs(1000 / budget - 30)).toBeLessThan(0.1)
    // 尾帧耗时 = 1000/尾帧帧率；超支 = 尾帧耗时 − 预算
    const cost = Number(grab(/实测尾帧 \*\*([\d.]+)ms\*\*/, '实测尾帧耗时')[1])
    expect(Math.abs(cost - 1000 / tail)).toBeLessThan(0.1)
    const overrun = Number(grab(/超预算 \*\*([\d.]+)ms\*\*/, '超预算')[1])
    expect(cost - budget).toBeCloseTo(overrun, 5)
    // bound 方向：GPU 主导
    const bound = sec.match(/CPU 提交 \*\*(\d+)ms\*\* \/ GPU \*\*(\d+)ms\*\*/)
    expect(bound, '案例中找不到「bound 拆分」').toBeTruthy()
    expect(Number(bound[2])).toBeGreaterThan(Number(bound[1]))
    // DC 账本：新旧地图对比、倍数、上限、处置回落
    const dc = grab(/旧地图 (\d+) → 新地图 (\d+)/, 'DC 对比')
    const oldDc = Number(dc[1])
    const newDc = Number(dc[2])
    const m2 = grab(/（([\d.]+) 倍，超预算表单屏上限 (\d+)）/,'DC 倍数与上限')
    const ratio = Number(m2[1])
    const cap = Number(m2[2])
    expect(Math.round((newDc / oldDc) * 10) / 10).toBe(ratio)
    expect(newDc).toBeGreaterThan(cap)
    const after = grab(/DC 480 → \*\*(\d+)\*\*（−(\d+)%/, 'DC 处置回落')
    const dcAfter = Number(after[1])
    const dcCut = Number(after[2])
    expect(dcAfter).toBeLessThanOrEqual(cap)
    expect(Math.round(((newDc - dcAfter) / newDc) * 100)).toBe(dcCut)
    // 过绘与卡帧回落
    const od = grab(/屏幕平均过绘 ([\d.]+) 层（基线 ([\d.]+) 层）/,'过绘')
    const odAfter = Number(grab(/过绘 3.8 → \*\*([\d.]+)\*\* 层/, '过绘回落')[1])
    expect(odAfter).toBeLessThan(Number(od[1]))
    const stutterBefore = Number(grab(/卡帧占比 \*\*(\d+)%\*\*/, '卡帧占比')[1])
    const stutterAfter = Number(grab(/卡帧占比 11% → \*\*(\d+)%\*\*/, '卡帧回落')[1])
    expect(stutterAfter).toBeLessThan(stutterBefore)
    // 处置复核：尾帧与平均帧率回升，高端机不受影响
    const tailAfter = Number(grab(/尾帧 24 → \*\*(\d+)\*\* fps/, '尾帧回升')[1])
    const avgAfter = Number(grab(/平均 42 → \*\*(\d+)\*\*/, '平均回升')[1])
    expect(tailAfter).toBeGreaterThan(tail)
    expect(avgAfter).toBeGreaterThan(avg)
    const highEnd = Number(grab(/高端机维持 \*\*(\d+)/, '高端机帧率')[1])
    expect(highEnd).toBeGreaterThan(avgAfter)
  })

  it('引用闭合：案例内「第 N 讲」对应真实文件，呼应节（1.2/4.3/第 5 节）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of ['### 1.2 合批与烘焙：把多次变少、把实时变离线', '### 4.3 内存水位', '## 5. 前端性能：按「谁的责任」归因']) {
      expect(lecture19.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '19-client-architecture.md'))).toBe(true)
  })
})
