import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture02 = readFileSync(resolve(dir, '02-game-design.md'), 'utf8')

// 案例切片：从「## 14. 实战案例」到文件结束（小结为编号第 13 节，案例追加在第 13 节之后）
function caseSection(src) {
  const start = src.indexOf('## 14. 实战案例')
  expect(start, '第 02 讲应存在「## 14. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 14. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  expect(start).toBeGreaterThan(src.indexOf('## 13. 小结'))
  return src.slice(start)
}

describe('实战案例冒烟（第 02 讲「攒了 45 抽白攒」的保底清零排查）', () => {
  const sec = caseSection(lecture02)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：客诉率、半程账本、抽样占比与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：客诉 2417 份、平均已攒 45 抽
    const complaints = Number(grab(/客诉 \*\*(\d+)\*\* 份/, '客诉量')[1])
    const avgCleared = Number(grab(/平均已攒 \*\*(\d+)\*\* 抽/, '平均抽数')[1])
    // 第一步：公示 4 条第 2 条；留痕 10 字段；抽样 400 → 400 = 100%
    const notice = grab(/4\.5 节公示的 \*\*(\d+)\*\* 条里第 \*\*(\d+)\*\* 条/, '公示条数与位次')
    const s45 = lecture02.slice(lecture02.indexOf('### 4.5 概率公示的法律要求'), lecture02.indexOf('## 5. 掉落系统'))
    const noticeRows = s45.split('\n').filter(l => /^\d\. /.test(l))
    expect(noticeRows.length).toBe(Number(notice[1]))
    expect(noticeRows[Number(notice[2]) - 1]).toContain('保底机制的详细说明')
    const fields = Number(grab(/4\.4 节留痕抽样——\*\*(\d+)\*\* 个字段/, '留痕字段数')[1])
    const s44 = lecture02.slice(lecture02.indexOf('### 4.4 概率审计：每次抽取都留痕'), lecture02.indexOf('### 4.5 概率公示的法律要求'))
    expect((s44.match(/^ {2}"/gm) || []).length).toBe(fields)
    const sample = Number(grab(/抽样换池前有计数的 \*\*(\d+)\*\* 名玩家/, '抽样规模')[1])
    const zeroed = grab(/新池首抽为 0 的有 \*\*(\d+)\*\* 人（\*\*(\d+)\*\*%）/, '清零占比')
    expect(Number(zeroed[1])).toBe(sample)
    expect(Math.round((Number(zeroed[1]) / sample) * 100)).toBe(Number(zeroed[2]))
    expect(Number(grab(/审计实测 \*\*(\d+)\*\*% 清零/, '口径差')[1])).toBe(Number(zeroed[2]))
    // 收敛：8000 人、平均 45 = 90/2（与讲内硬保底 90 对账）；36 万抽 = 8000×45；216 万 = 36×6；客诉率 30%
    const gather = grab(/换池时有计数的玩家 \*\*(\d+)\*\* 人，平均清掉 \*\*(\d+)\*\* 抽/, '影响账本')
    const affected = Number(gather[1])
    expect(Number(gather[2])).toBe(avgCleared)
    const half = grab(/硬保底 \*\*(\d+)\*\* 抽的一半（\*\*(\d+)\*\* ÷ 2 = \*\*(\d+)\*\*）/, '半程账本')
    const hardPity = Number(half[1])
    expect(Number(half[1])).toBe(Number(half[2]))
    expect(Number(half[1]) / 2).toBe(Number(half[3]))
    expect(Number(half[3])).toBe(avgCleared)
    const pin = lecture02.match(/HardPity\s+int\s+\/\/ (\d+)/)
    expect(pin, '讲义 4.3 节骨架应有 HardPity 常量').toBeTruthy()
    expect(hardPity).toBe(Number(pin[1]))
    const pulls = grab(/合计 \*\*(\d+)\*\* 万抽（\*\*(\d+)\*\* × \*\*(\d+)\*\*）/, '合计抽数')
    const wan = Number(pulls[1])
    expect(Number(pulls[2])).toBe(affected)
    expect(Number(pulls[3])).toBe(avgCleared)
    expect((affected * avgCleared) / 10000).toBe(wan)
    const money = grab(/单抽 \*\*(\d+)\*\* 元折算 = \*\*(\d+)\*\* 万元/, '折算金额')
    expect(wan * Number(money[1])).toBe(Number(money[2]))
    const rate = grab(/客诉 \*\*(\d+)\*\* 份（影响玩家的 \*\*(\d+)\*\*%）/, '客诉率')
    expect(Number(rate[1])).toBe(complaints)
    expect(Math.round((complaints / affected) * 100)).toBe(Number(rate[2]))
    // 第四步：回补 8000/0、抽样 400 恢复 400、客诉 2417→0、演练 0 起
    const refund = grab(/\*\*(\d+)\*\* 人逐人回补、\*\*(\d+)\*\* 失败/, '逐人回补')
    expect(Number(refund[1])).toBe(affected)
    expect(Number(refund[2])).toBe(0)
    const restore = grab(/抽样 \*\*(\d+)\*\* 人计数恢复 \*\*(\d+)\*\* 人/, '计数恢复')
    expect(Number(restore[1])).toBe(sample)
    expect(Number(restore[2])).toBe(sample)
    const done = grab(/客诉 \*\*(\d+)\*\* 份 → \*\*(\d+)\*\* 份/, '客诉归零')
    expect(Number(done[1])).toBe(complaints)
    expect(Number(done[2])).toBe(0)
    expect(Number(grab(/换池演练 \*\*(\d+)\*\* 起清零/, '演练归零')[1])).toBe(0)
  })

  it('声称对账：Checklist 16 条第 9 条、接需求四问第 3 问与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 12 节 Checklist 16 项，第 9 条是「上线/下线方案」
    const ck = grab(/12 节 Checklist 的 \*\*(\d+)\*\* 项里第 \*\*(\d+)\*\* 条/, 'Checklist 条数与位次')
    const ckLines = lecture02.split('\n').filter(l => /^□ \d+\./.test(l))
    expect(ckLines.length).toBe(Number(ck[1]))
    expect(ckLines[Number(ck[2]) - 1]).toContain('上线/下线方案')
    // 1.2 节四问，第 3 问是「这个计数器存在哪」
    const qs = grab(/1\.2 节的 \*\*(\d+)\*\* 问里，「这个计数器存在哪」是第 \*\*(\d+)\*\* 问/, '四问条数与位次')
    const s12 = lecture02.slice(lecture02.indexOf('### 1.2 接数值需求时的四个技术提问'), lecture02.indexOf('## 2. 属性系统'))
    const qLines = s12.split('\n').filter(l => /^\d\. \*\*/.test(l))
    expect(qLines.length).toBe(Number(qs[1]))
    expect(qLines[Number(qs[2]) - 1]).toContain('这个计数器存在哪')
    // 关键措辞与代码钉：换池显式化、持久化字段、PityState 资产级状态、小结保底行
    expect(lecture02.includes('显式处理而不是隐式沿用')).toBe(true)
    expect(lecture02.includes('type PityState struct')).toBe(true)
    expect(sec.includes('PityState{}')).toBe(true)
    expect(lecture02.includes('| 保底怎么实现才可信？')).toBe(true)
    expect(lecture02.includes('pity_count_before')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与 4.3 保底代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 1.2 接数值需求时的四个技术提问',
      '### 4.3 保底机制的状态机实现',
      '### 4.4 概率审计：每次抽取都留痕',
      '### 4.5 概率公示的法律要求',
      '## 12. 服务端开发 Checklist',
      '## 13. 小结',
    ]) {
      expect(lecture02.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与 4.3 节骨架一致：持久化字段 + 计数清零
    expect(lecture02.includes('Count      int  // 距上次出金的抽数（持久化字段）')).toBe(true)
    expect(lecture02.includes('state.Count = 0')).toBe(true)
    expect(existsSync(resolve(dir, '02-game-design.md'))).toBe(true)
  })
})
