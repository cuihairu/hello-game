import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture18 = readFileSync(resolve(dir, '18-security-compliance.md'), 'utf8')

// 案例切片：从「## 7. 实战案例」到文件结束（本讲无小结节，案例是收尾节）
function caseSection(src) {
  const start = src.indexOf('## 7. 实战案例')
  expect(start, '第 18 讲应存在「## 7. 实战案例」节').toBeGreaterThan(-1)
  const end = src.indexOf('## 7. 实战案例')
  expect(end).toBe(start) // 唯一，不重复出现
  return src.slice(start)
}

describe('实战案例冒烟（第 18 讲「金币通胀 15% 刷金工作室」）', () => {
  const sec = caseSection(lecture18)

  it('四段结构齐全：现象、口径拆分、维度聚类、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '先对口径', '维度拆分', '根因', '处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少处置时间线示意块').toBe(true)
  })

  it('数字闭环：产出口径拆解、超额堆积、副本与账号聚类、回落均自洽', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return Number(m[1])
    }
    // 口径三列：产出 − 回收 = 净增
    const produced = grab(/产出 \*\*([\d.]+) 亿\*\*\/日/, '系统产出')
    const consumed = grab(/回收 \*\*([\d.]+) 亿\*\*\/日/, '系统回收')
    const net = grab(/净增 \*\*([\d.]+) 亿\*\*\/日/, '净增')
    expect(produced - consumed).toBeCloseTo(net, 5)
    // 超额 = 净增 − 基线
    const baseline = grab(/基线净增[^*]*\*\*([\d.]+) 亿\*\*\/日/, '基线净增')
    const excess = grab(/超额 \*\*([\d.]+) 亿\*\*\/日/, '超额')
    expect(net - baseline).toBeCloseTo(excess, 5)
    // 通胀复算：5 天超额 / 存量 ≈ 15%
    const accumulate = grab(/累计 \*\*([\d.]+) 亿\*\*/, '5 天超额累计')
    const stock = grab(/存量 \*\*(\d+) 亿\*\*/, '市场存量')
    const inflation = grab(/通胀 \*\*(\d+)%\*\*/, '通胀比例')
    expect(accumulate).toBeCloseTo(excess * 5, 5)
    expect(Math.round((accumulate / stock) * 100)).toBe(inflation)
    // 维度：副本掉落 = 基线 → 现值，占超额 82%
    const mine = sec.match(/基线 \*\*([\d.]+) 亿\*\*\/日飙到 \*\*([\d.]+) 亿\*\*\/日/)
    expect(mine, '案例中找不到「熔岩矿洞掉落」基线对').toBeTruthy()
    const mineDelta = Number(mine[2]) - Number(mine[1])
    expect(mineDelta).toBeCloseTo(0.9, 5)
    expect(Math.round((mineDelta / excess) * 100)).toBe(grab(/占超额 (\d+)%/, '占超额比'))
    // 账号：312 个工作室账号贡献 0.7 亿 ≤ 副本超额
    const studios = grab(/Top \*\*(\d+)\*\* 个账号/, '工作室账号数')
    const contrib = grab(/贡献 \*\*([\d.]+) 亿\*\*\/日/, '账号贡献')
    expect(studios).toBeGreaterThan(0)
    expect(contrib).toBeLessThanOrEqual(mineDelta)
    // 处置后回落：低于原净增、贴近基线
    const recovered = grab(/回落到 \*\*([\d.]+) 亿\*\*\/日/, '处置后净增')
    expect(recovered).toBeLessThan(net)
    expect(recovered).toBeLessThanOrEqual(baseline + 0.2)
  })

  it('引用闭合：案例内「第 N 讲」对应真实文件，呼应节（1.4/3.2/2.1）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of ['### 1.4 反作弊不是只有外挂检测', '### 3.2 风控闭环至少要有哪几层', '### 2.1 审计的重点不是记录，而是可追责']) {
      expect(lecture18.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '18-security-compliance.md'))).toBe(true)
  })
})
