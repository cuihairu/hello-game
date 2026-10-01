import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture11 = readFileSync(resolve(dir, '11-auxiliary-systems.md'), 'utf8')

// 案例切片：从「## 12. 实战案例」到「## 本章小结」（小结无编号，案例为小结前最后一个编号节）
function caseSection(src) {
  const start = src.indexOf('## 12. 实战案例')
  const end = src.indexOf('## 本章小结')
  expect(start, '第 11 讲应存在「## 12. 实战案例」节').toBeGreaterThan(-1)
  expect(end, '实战案例节应位于本章小结之前').toBeGreaterThan(start)
  expect(src.indexOf('## 12. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, end)
}

describe('实战案例冒烟（第 11 讲「一赢就排到怪物」的匹配震荡排查）', () => {
  const sec = caseSection(lecture11)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：交替率、期望公式、摆幅账本与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：客诉 815 份；抽样 2000 场交替 1260 场 = 63%
    const complaints = Number(grab(/客诉 \*\*(\d+)\*\* 份/, '客诉量')[1])
    const sample = grab(/抽样 \*\*(\d+)\*\* 场里胜负交替 \*\*(\d+)\*\* 场/, '交替抽样')
    const sampleN = Number(sample[1])
    const alt = Number(sample[2])
    expect(Math.round((alt / sampleN) * 100)).toBe(Number(grab(/交替率 \*\*(\d+)\*\*%/, '交替率')[1]))
    // 第一步：2.5 节 2 个指标；等待 28 < 阈值 30；分差 96 超阈 60%；K=64 → 单场 32；分差阈值 60 分
    const metrics = Number(grab(/按 2\.5 节的 \*\*(\d+)\*\* 个质量指标/, '质量指标数')[1])
    const s25 = lecture11.slice(lecture11.indexOf('### 2.5 匹配质量评估'), lecture11.indexOf('### 2.6 方案选择'))
    expect((s25.match(/^- \*\*/gm) || []).length).toBe(metrics)
    const wait = grab(/P90 等待 \*\*(\d+)\*\* 秒，MOBA 心理阈值 \*\*(\d+)\*\* 秒/, '等待与阈值')
    expect(Number(wait[1])).toBeLessThan(Number(wait[2]))
    expect(lecture11.includes('MOBA 游戏约 30 秒')).toBe(true)
    const threshold = Number(grab(/低于 \*\*(\d+)\*\* 分阈值/, '分差阈值')[1])
    const spread = grab(/P90 分差 \*\*(\d+)\*\* 分，超阈值 \*\*(\d+)\*\*%/, '分差与超阈')
    const p90 = Number(spread[1])
    expect(Math.round(((p90 - threshold) / threshold) * 100)).toBe(Number(spread[2]))
    const k = Number(grab(/固定 K=\*\*(\d+)\*\* 覆盖全段位/, '固定 K')[1])
    const single = Number(grab(/均衡对局单场变化 \*\*(\d+)\*\* 分/, '单场变化')[1])
    expect(k / 2).toBe(single)
    // 口径差：2 个指标只监控 1 个
    expect(Number(grab(/项目只监控了 \*\*(\d+)\*\* 个/, '监控缺口')[1])).toBeLessThan(metrics)
    // 收敛：32 × 3 = 96；期望公式 37%；赢后连败 63% = 实测 1260/2000
    expect(single * 3).toBe(p90)
    const win = grab(/期望胜率从 \*\*(\d+)\*\*% 滑到 \*\*(\d+)\*\*%/, '期望胜率')
    expect(Number(win[1])).toBe(50)
    expect(Math.round((1 / (1 + Math.pow(10, p90 / 400))) * 100)).toBe(Number(win[2]))
    const loseStreak = Number(grab(/下一场 \*\*(\d+)\*\*% 概率连败/, '赢后连败')[1])
    expect(100 - Number(win[2])).toBe(loseStreak)
    expect(Math.round((alt / sampleN) * 100)).toBe(loseStreak)
    expect(Number(grab(/= \*\*(\d+)\*\*% 严丝合缝/, '实测对账')[1])).toBe(loseStreak)
    // 第四步：分段 K 64/32/16 与讲内字符串对账；老玩家段 8 × 3 = 24 < 60
    const seg = grab(/分段 K 三段：场次 <50 用 \*\*(\d+)\*\*、<100 用 \*\*(\d+)\*\*、其余用 \*\*(\d+)\*\*/, '分段 K')
    const pin = lecture11.match(/场次 <50 时 K=(\d+)，<100 时 K=(\d+)，之后 K=(\d+)/)
    expect(pin, '讲义 2.3 节应有分段 K 字符串').toBeTruthy()
    expect(Number(seg[1])).toBe(Number(pin[1]))
    expect(Number(seg[2])).toBe(Number(pin[2]))
    expect(Number(seg[3])).toBe(Number(pin[3]))
    const fix = grab(/老玩家段单场 \*\*(\d+)\*\* 分 × \*\*(\d+)\*\* 场 = \*\*(\d+)\*\* 分/, '限幅账本')
    expect(Number(pin[3]) / 2).toBe(Number(fix[1]))
    expect(Number(fix[1]) * Number(fix[2])).toBe(Number(fix[3]))
    const down = grab(/P90 分差从 \*\*(\d+)\*\* 分 → \*\*(\d+)\*\* 分/, '分差回落')
    expect(Number(down[1])).toBe(p90)
    expect(Number(down[2])).toBe(Number(fix[3]))
    expect(Number(down[2])).toBeLessThan(threshold)
    expect(p90).toBeGreaterThan(threshold)
    // 复核：815 → 0；2000 场交替 1060 = 53%（= 100 − round(期望胜率@24)）；等待仍 28 秒
    const done = grab(/客诉 \*\*(\d+)\*\* 份 → \*\*(\d+)\*\* 份/, '客诉归零')
    expect(Number(done[1])).toBe(complaints)
    expect(Number(done[2])).toBe(0)
    const recheck = grab(/复核抽样 \*\*(\d+)\*\* 场，交替 \*\*(\d+)\*\* 场 = \*\*(\d+)\*\*%/, '复核交替率')
    expect(Number(recheck[1])).toBe(sampleN)
    expect(Math.round((Number(recheck[2]) / Number(recheck[1])) * 100)).toBe(Number(recheck[3]))
    expect(100 - Math.round((1 / (1 + Math.pow(10, Number(down[2]) / 400))) * 100)).toBe(Number(recheck[3]))
    expect(Number(grab(/等待 P90 仍 \*\*(\d+)\*\* 秒/, '等待不变')[1])).toBe(Number(wait[1]))
  })

  it('声称对账：Elo 局限 4 条第 2 条、陷阱缓解 2 条、陷阱表 9 行第 1 行全部与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 2.2 局限 4 条，第 2 条讲「同样的 K 值不合理」
    const lim = grab(/Elo 局限 \*\*(\d+)\*\* 条里第 \*\*(\d+)\*\* 条/, '局限条数与位次')
    const s22 = lecture11.slice(lecture11.indexOf('### 2.2 Elo：经典但有局限'), lecture11.indexOf('### 2.3 Glicko-2'))
    const limLines = s22.split('\n').filter(l => l.startsWith('- '))
    expect(limLines.length).toBe(Number(lim[1]))
    expect(limLines[Number(lim[2]) - 1]).toContain('同样的 K 值不合理')
    // 2.5 陷阱块缓解 2 条（该块内缓解句以顿号分隔正好 2 项）
    const mit = Number(grab(/缓解 \*\*(\d+)\*\* 条一条没上/, '缓解条数')[1])
    const s25 = lecture11.slice(lecture11.indexOf('### 2.5 匹配质量评估'), lecture11.indexOf('### 2.6 方案选择'))
    const mitLine = s25.split('\n').find(l => l.includes('缓解方式是'))
    expect(mitLine, '2.5 节应有缓解句').toBeTruthy()
    expect(mitLine.split('、').length).toBe(mit)
    // 第 11 节陷阱表 9 行，第 1 行「匹配震荡」（切到案例节之前，防案例回填表混入计数）
    const trap = grab(/陷阱表 \*\*(\d+)\*\* 行的第 \*\*(\d+)\*\* 行/, '陷阱行数与位次')
    const s11 = lecture11.slice(lecture11.indexOf('## 11. 常见陷阱总结'), lecture11.indexOf('## 12. 实战案例'))
    const trapRows = s11.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 陷阱') && !l.startsWith('|---'))
    expect(trapRows.length).toBe(Number(trap[1]))
    expect(trapRows[Number(trap[2]) - 1]).toContain('匹配震荡')
    // 代码钉与公式钉：期望胜率公式与评分下限
    expect(lecture11.includes('expA := 1.0 / (1.0 + math.Pow(10, (ratingB-ratingA)/400.0))')).toBe(true)
    expect(lecture11.includes('1 / (1 + 10^((对手分-己方分)/400))')).toBe(true)
    expect(lecture11.includes('math.Max(newA, 100)')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与评分代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 2.1 匹配解决什么问题',
      '### 2.2 Elo：经典但有局限',
      '### 2.3 Glicko-2：引入不确定性',
      '### 2.5 匹配质量评估',
      '### 2.6 方案选择',
      '## 11. 常见陷阱总结',
      '## 本章小结',
    ]) {
      expect(lecture11.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与讲内评分代码一致：期望胜率公式 + 评分下限 + 分段 K
    expect(lecture11.includes('func UpdateRatings')).toBe(true)
    expect(lecture11.includes('math.Max(newA, 100)')).toBe(true)
    expect(lecture11.includes('场次 <50 时 K=64，<100 时 K=32，之后 K=16')).toBe(true)
    expect(existsSync(resolve(dir, '11-auxiliary-systems.md'))).toBe(true)
  })
})
