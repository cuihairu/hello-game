import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture20 = readFileSync(resolve(dir, '20-game-testing.md'), 'utf8')

// 案例切片：从「## 11. 实战案例」到文件结束（小结为编号第 10 节，案例追加在第 10 节之后）
function caseSection(src) {
  const start = src.indexOf('## 11. 实战案例')
  expect(start, '第 20 讲应存在「## 11. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 11. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 20 讲「只能等它发生」的时序 bug 逃逸排查）', () => {
  const sec = caseSection(lecture20)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：逃逸率、验证成本、四层覆盖账本与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：4 起全逃逸 = 100%；3 轮 × 24h = 72h；4 起累计 288 小时
    const starts = Number(grab(/时序类 bug 共 \*\*(\d+)\*\* 起/, '时序 bug 起数')[1])
    const escape = Number(grab(/逃逸率 \*\*(\d+)%\*\*/, '逃逸率')[1])
    expect(Math.round((starts / starts) * 100)).toBe(escape)
    const cost = grab(/每起平均 \*\*(\d+)\*\* 轮 × \*\*(\d+)h\*\* = \*\*(\d+)h\*\*/, '单起验证成本')
    const rounds = Number(cost[1])
    const hours = Number(cost[2])
    const perBug = Number(cost[3])
    expect(rounds * hours).toBe(perBug)
    expect(Number(grab(/4 起累计验证 \*\*(\d+)\*\* 小时/, '累计验证')[1])).toBe(perBug * starts)
    // 口径：通过率 100% 与逃逸率 100% 同时为真；分母差 = 跨天路径数
    expect(Number(grab(/回归通过率 \*\*(\d+)%\*\*/, '回归通过率')[1])).toBe(100)
    const paths = Number(grab(/分母口径差\*\*就是 \*\*(\d+)\*\* 条/, '分母口径差')[1])
    const scan = grab(/直调 \*\*(\d+)\*\* 处，其中跨天判定路径 \*\*(\d+)\*\* 处（\*\*(\d+)%\*\*）/, '代码扫描')
    const calls = Number(scan[1])
    expect(Number(scan[2])).toBe(paths)
    expect(Math.round((paths / calls) * 100)).toBe(Number(scan[3]))
    // 金字塔四层：声称 4 层，讲内 3.1–3.4 实测 4 节
    const pyramid = Number(grab(/金字塔 \*\*(\d+)\*\* 层逐层对账/, '金字塔层数')[1])
    expect((lecture20.match(/^### 3\.[1-4] /gm) || []).length).toBe(pyramid)
    // 覆盖账本：0 / 31；冒烟 5 分钟在讲内 5-10 分钟窗口内；bot 会话 15 分钟到不了零点
    const cover = grab(/覆盖是 \*\*(\d+)\*\* \/ \*\*(\d+)\*\*/, '四层覆盖')
    expect(Number(cover[1])).toBe(0)
    expect(Number(cover[2])).toBe(paths)
    const smokeMin = Number(grab(/冒烟只跑 \*\*(\d+)\*\* 分钟/, '冒烟时长')[1])
    expect(lecture20.includes('5-10 分钟')).toBe(true)
    expect(smokeMin).toBeGreaterThanOrEqual(5)
    expect(smokeMin).toBeLessThanOrEqual(10)
    expect(Number(grab(/bot 会话 \*\*(\d+)\*\* 分钟/, 'bot 会话')[1])).toBeLessThan(24 * 60)
    // 声称对账：四关卡、四纪律第 2 条、陷阱表 8 条第 2 条，全部与讲内实况比对
    const gates = Number(grab(/第 2 节的 \*\*(\d+)\*\* 个关卡里/, '关卡数')[1])
    expect((lecture20.match(/^\| \*\*(提测|验收|回归|出包)\*\* \|/gm) || []).length).toBe(gates)
    const disc = grab(/第 5 节的 \*\*(\d+)\*\* 条设计纪律里，「时间可控」排第 \*\*(\d+)\*\* 条/, '纪律条数与位次')
    const s5 = lecture20.slice(lecture20.indexOf('## 5. 为可测性设计'), lecture20.indexOf('## 6. 性能验收'))
    expect((s5.match(/^\d\. \*\*/gm) || []).length).toBe(Number(disc[1]))
    expect(s5.includes('2. **时间可控**')).toBe(true)
    expect(Number(disc[2])).toBe(2)
    const traps = grab(/陷阱表 \*\*(\d+)\*\* 条里的第 \*\*(\d+)\*\* 条/, '陷阱条数与位次')
    const s9 = lecture20.slice(lecture20.indexOf('## 9. 常见陷阱总结'), lecture20.indexOf('## 10. 小结'))
    const trapRows = s9.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 陷阱') && !l.startsWith('|---'))
    expect(trapRows.length).toBe(Number(traps[1]))
    expect(trapRows[Number(traps[2]) - 1]).toContain('随机/时间散落业务代码')
    // 处置：直调 147 → 0；拨表单测 31 条一一对应；72h → 10 分钟 = 432 倍
    const lint = grab(/直调 \*\*(\d+)\*\* → \*\*(\d+)\*\*/, 'lint 归零')
    expect(Number(lint[1])).toBe(calls)
    expect(Number(lint[2])).toBe(0)
    expect(Number(grab(/拨表补跨天单测 \*\*(\d+)\*\* 条/, '拨表单测')[1])).toBe(paths)
    const ci = grab(/验证周期 \*\*(\d+)h\*\* → \*\*(\d+)\*\* 分钟（\*\*(\d+)\*\* 倍）/, '验证提速')
    expect(Number(ci[1])).toBe(perBug)
    expect((Number(ci[1]) * 60) / Number(ci[2])).toBe(Number(ci[3]))
    // 复核：新逃逸归零
    expect(Number(grab(/时序类逃逸 \*\*(\d+)\*\* 起（此前 4 起）/, '逃逸归零')[1])).toBe(0)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与 §7 Clock 代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '## 2. 流程与责任边界：提测、验收、回归、出包',
      '### 3.1 逻辑单测：测规则，不测表现',
      '### 3.2 协议级回放测试：游戏后端性价比最高的一层',
      '### 3.3 机器人对局：一鱼两吃，但要知道它测不出什么',
      '### 3.4 冒烟测试与发布门禁',
      '## 5. 为可测性设计：确定性、时间、依赖、回放',
      '## 7. 代码示例',
      '## 9. 常见陷阱总结',
    ]) {
      expect(lecture20.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与第 7 节代码一致：Clock 接口 + fakeClock 拨表
    expect(lecture20.includes('type Clock interface')).toBe(true)
    expect(lecture20.includes('func (c *fakeClock) Advance')).toBe(true)
    expect(existsSync(resolve(dir, '20-game-testing.md'))).toBe(true)
  })
})
