import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture14 = readFileSync(resolve(dir, '14-dev-organization.md'), 'utf8')

// 案例切片：第 14 讲 H2 编号 1–12 + 无编号本章小结，案例按「## 13.」插在小结之前
function caseSection(src) {
  const start = src.indexOf('## 13. 实战案例：一次「私下改的奖励逻辑')
  const summary = src.indexOf('## 本章小结')
  expect(start, '第 14 讲应存在「## 13. 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于本章小结之前').toBeGreaterThan(-1)
  expect(start, '案例应位于本章小结之前').toBeLessThan(summary)
  expect(src.indexOf('## 13. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, summary)
}

describe('实战案例冒烟（第 14 讲「私下改的奖励逻辑，合服后炸出 2100 笔异常」的变更分级失效排查）', () => {
  const sec = caseSection(lecture14)

  it('四段结构齐全：现象口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '### 第一步：现象与口径', '### 第二步：分层归因', '### 第三步：根因', '### 第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of ['变更分级入口', '成本量化话术', '冻结期校准', '私下变更哨兵']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：异常流水账、评审积压账、分级效果账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 异常流水账：2100 = 1200 + 900
    const abnormal = Number(grab(/异常流水 \*\*(\d+)\*\* 笔/, '异常流水')[1])
    const dup = Number(grab(/重复发放 \*\*(\d+)\*\* 笔/, '重复发放')[1])
    const fail = Number(grab(/领取失败 \*\*(\d+)\*\* 笔/, '领取失败')[1])
    expect(abnormal).toBe(dup + fail)
    expect(abnormal).toBe(2100)
    // 处置段回收与补发与首测同源
    const fix = grab(/重复发放 \*\*(\d+)\*\* 笔全额回收（道具可扣回）、领取失败 \*\*(\d+)\*\* 笔逐一补发/, '止血账')
    expect(Number(fix[1])).toBe(dup)
    expect(Number(fix[2])).toBe(fail)
    // 评审积压账：私下通道是重流程积压逼出来的；修复后 4 天 → 0.5 天
    const backlog = Number(grab(/评审积压平均 \*\*(\d+)\*\* 天/, '积压天数')[1])
    const re = grab(/评审积压 \*\*(\d+)\*\* 天 → \*\*(\d+(?:\.\d+)?)\*\* 天/, '积压修复')
    expect(Number(re[1])).toBe(backlog)
    expect(Number(re[2])).toBeLessThan(backlog)
    // 私下变更账：14 处（复盘溯源）→ 修复后 0 起
    expect(Number(grab(/私下变更 \*\*(\d+)\*\* 处/, '私下变更数')[1])).toBe(14)
    expect(Number(grab(/私下变更 \*\*(\d+)\*\* 起/, '私下变更修复')[1])).toBe(0)
    // 分级效果：轻量路径占比 82%，工单 64 单闭环
    expect(Number(grab(/轻量路径承接变更占比 \*\*(\d+)\*\*%/, '轻量占比')[1])).toBe(82)
    const tickets = Number(grab(/工单 \*\*(\d+)\*\* 单/, '工单数')[1])
    expect(sec.includes('单工单逐单闭环'), '工单应在处置段闭环').toBe(true)
    expect(tickets).toBe(64)
  })

  it('声称对账：分级表三级、成本量化原话、两个退化极端、一刀切陷阱行、小结口径均与讲内实况一致', () => {
    // 分级表三级齐全，案例的三级处理与讲内一致
    const s5 = lecture14.slice(lecture14.indexOf('## 5. 需求变更管理'), lecture14.indexOf('## 6. 跨职能协作'))
    for (const level of ['| 文案级 |', '| 数值级 |', '| 系统级 |']) {
      expect(s5.includes(level), `分级表缺少「${level}」行`).toBe(true)
    }
    expect(s5).toContain('改配置表走配置管线')
    expect(s5).toContain('完整流程：影响评估 → 技术评审 → 排期')
    // 成本量化原话被案例逐字引用
    const quote = '奖励发放路径已有邮件通道，改配置半天；但领取表要加字段，涉及合服兼容，一共两天，建议下个版本'
    expect(lecture14.includes(quote)).toBe(true)
    expect(sec.includes(quote)).toBe(true)
    // 两个退化极端与一刀切预言：讲内与案例逐字呼应
    expect(lecture14.includes('来一个做一个')).toBe(true)
    expect(lecture14.includes('全部走重流程')).toBe(true)
    expect(lecture14.includes('通常会被迫私下解锁，纪律反而失效')).toBe(true)
    expect(lecture14.includes('把重流程留给系统级变更')).toBe(true)
    expect(sec.includes('流程名存实亡')).toBe(true)
    expect(sec.includes('把一切变更走重流程')).toBe(true)
    expect(sec.includes('被迫私下解锁') || lecture14.includes('私下解锁')).toBe(true)
    // 冻结期两档与决策指南一致
    expect(lecture14.includes('Sprint 中段后不接受系统级变更')).toBe(true)
    expect(lecture14.includes('版本发布前 2-3 周系统级冻结')).toBe(true)
    expect(sec.includes('发布前 2-3 周只冻系统级')).toBe(true)
    // 陷阱表「变更一刀切」行与本章小结口径在位
    const row = lecture14.split('\n').find(l => l.startsWith('| 变更一刀切 |'))
    expect(row, '陷阱表应有「变更一刀切」行').toBeTruthy()
    expect(row).toContain('没有变更分级')
    expect(row).toContain('文案/数值走轻量路径，系统级走完整流程')
    const sumRow = lecture14.split('\n').find(l => l.startsWith('| 需求变更怎么管？'))
    expect(sumRow).toContain('成本量化后交给产品决策；冻结期只冻系统级')
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与配置管线锚点真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    // 第 17 讲配置管线真实存在
    const lecture17 = readFileSync(resolve(dir, '17-versioning-release.md'), 'utf8')
    expect(lecture17.includes('配置管线')).toBe(true)
    for (const anchor of [
      '## 5. 需求变更管理',
      '## 6. 跨职能协作',
      '## 11. 设计决策指南',
      '## 12. 常见陷阱总结',
      '## 本章小结',
    ]) {
      expect(lecture14.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '14-dev-organization.md'))).toBe(true)
  })
})
