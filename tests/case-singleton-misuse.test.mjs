import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture09 = readFileSync(resolve(dir, '09-programming-patterns.md'), 'utf8')

// 案例切片：第 09 讲为「部分制」体例，案例按无编号节插在总结决策表之前
function caseSection(src) {
  const start = src.indexOf('## 实战案例：一次「结算奖励多发 7 份')
  const summary = src.indexOf('## 总结：模式选择决策表')
  expect(start, '第 09 讲应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于总结决策表之前').toBeLessThan(summary)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, summary)
}

describe('实战案例冒烟（第 09 讲「结算奖励多发 7 份」的进程级单例误用排查）', () => {
  const sec = caseSection(lecture09)

  it('四段结构齐全：现象口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '### 第一步：现象与口径', '### 第二步：分层归因', '### 第三步：根因', '### 第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of ['服务注册分层', '单例准入', 'DI 优先', '结算对账']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：流水账、窗口账、幂等账、回归账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 流水账：31 = 24 + 7
    const total = Number(grab(/流水却有 \*\*(\d+)\*\* 条/, '流水总数')[1])
    const games = Number(grab(/当期对局 \*\*(\d+)\*\* 场/, '对局数')[1])
    const extra = Number(grab(/多发 \*\*(\d+)\*\* 条/, '多发条数')[1])
    expect(total).toBe(games + extra)
    expect(total).toBe(31)
    // 窗口账：同秒双结算 7 对，每对贡献 1 条多发
    expect(Number(grab(/同秒双结算」恰好 \*\*(\d+)\*\* 对/, '同秒对数')[1])).toBe(extra)
    expect(sec.includes('每对贡献 **1** 条多发')).toBe(true)
    // 每场应恰 1 条流水（口径句与案例体例一致）
    expect(sec.includes('一场对局应恰有 **1** 条')).toBe(true)
    // 幂等账：重试 0 次
    expect(Number(grab(/重试 \*\*(\d+)\*\* 次/, '重试次数')[1])).toBe(0)
    // 回归账：1000 场对局 1000 条流水 0 多发；定向压测 500 对 0 多发
    const re = grab(/\*\*(\d+)\*\* 场机器人并发对局 → 流水 \*\*(\d+)\*\* 条、多发 \*\*(\d+)\*\*；同秒双结算定向压测 \*\*(\d+)\*\* 对 → 多发 \*\*(\d+)\*\*/, '回归账')
    expect(Number(re[2])).toBe(Number(re[1]))
    expect(Number(re[3])).toBe(0)
    expect(Number(re[5])).toBe(0)
    // 工单闭环：12 单在背景与处置段同源
    const tickets = Number(grab(/工单 \*\*(\d+)\*\* 单/, '工单数')[1])
    expect(sec.includes('单工单逐单闭环'), '工单应在处置段闭环').toBe(true)
    expect(sec.match(/工单 \*\*(\d+)\*\* 单/g).length).toBeGreaterThanOrEqual(1)
    expect(tickets).toBe(12)
  })

  it('声称对账：单例警告、连接池合理场景、服务定位器本质、决策表两行均与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 单例模式（5）：Nystrom 的谨慎警告被案例引用
    expect(lecture09.includes('单例模式被过度使用了，它本质上是全局状态的一种伪装')).toBe(true)
    expect(sec.includes('它本质上是全局状态的一种伪装')).toBe(true)
    expect(lecture09.includes('用依赖注入的方式注入这个单例，而不是让代码自己去获取单例')).toBe(true)
    expect(lecture09.includes('对象有状态需要重置（单例的状态在测试间会泄露）')).toBe(true)
    expect(lecture09.includes('忘记线程安全')).toBe(true)
    expect(sec.includes('对象有状态需要重置')).toBe(true)
    // 连接池：讲内认定的合理单例场景，案例同款对照
    expect(lecture09.includes('数据库连接池')).toBe(true)
    expect(sec.includes('数据库连接池')).toBe(true)
    // 服务定位器（15）：全局查找机制与 DI 优先建议被案例呼应
    expect(lecture09.includes('让代码可以按名称获取服务实例')).toBe(true)
    expect(lecture09.includes('优先使用依赖注入（DI），只在确实需要全局访问时才用服务定位器')).toBe(true)
    expect(sec.includes('服务定位器本质上是全局状态的容器')).toBe(true)
    // 决策表两行：案例教训与之逐字呼应
    const rowSingleton = lecture09.split('\n').find(l => l.startsWith('| 全局唯一的服务'))
    const rowLocator = lecture09.split('\n').find(l => l.startsWith('| 全局服务的注册查找'))
    expect(rowSingleton).toContain('单例（谨慎）/ 依赖注入')
    expect(rowLocator).toContain('服务定位器')
    // Nystrom 终极建议在导语中引用
    expect(lecture09.includes('模式是工具，不是目标')).toBe(true)
    expect(sec.includes('模式是工具，不是目标')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与单一写者锚点真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    // 第 05 讲单一写者锚点真实存在
    const lecture05 = readFileSync(resolve(dir, '05-concurrency-models.md'), 'utf8')
    expect(lecture05.includes('所有状态天然只被一个线程碰')).toBe(true)
    expect(sec.includes('单一写者')).toBe(true)
    for (const anchor of [
      '### 5. 单例模式（Singleton）',
      '### 15. 服务定位器（Service Locator）',
      '## 总结：模式选择决策表',
    ]) {
      expect(lecture09.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '09-programming-patterns.md'))).toBe(true)
  })
})
