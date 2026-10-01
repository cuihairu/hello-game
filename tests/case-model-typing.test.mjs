import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture01 = readFileSync(resolve(dir, '01-entry.md'), 'utf8')

// 案例切片：第 01 讲为 1.x 小节体例，案例按无编号节追加在附录之后（文件末尾）
function caseSection(src) {
  const start = src.indexOf('## 实战案例：一次「按 MMO 建了一套架构')
  const appendix = src.indexOf('## 附录：游戏类型问题模型与分类方法')
  expect(start, '第 01 讲应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于附录之后（文件末尾）').toBeGreaterThan(appendix)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 01 讲「按 MMO 建了一套架构，却死在开局」的分型误判排查）', () => {
  const sec = caseSection(lecture01)

  it('四段结构齐全：现象口径、六问归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分型账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of ['六问分型进立项评审', '主导模型识别三维度进技术评审模板', '房间型五件事进排期门禁', '两个危险做法进架构评审检查项']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：开局账、六问账、投入账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 开局账：成功率 82% 与失败 18% 互补
    const open = Number(grab(/开局成功率只有 \*\*(\d+)\*\*%/, '开局成功率')[1])
    const fail = Number(grab(/组房失败 \*\*(\d+)\*\*%/, '组房失败率')[1])
    expect(open + fail).toBe(100)
    // 每 100 次开局近 18 次失败，与失败率同源
    expect(Number(grab(/每 100 次开局近 \*\*(\d+)\*\* 次失败/, '失败笔数')[1])).toBe(fail)
    // 六问账：6 问里 5 问指向房间型
    const six = grab(/\*\*(\d+)\*\* 问里有 \*\*(\d+)\*\* 问/, '六问指向')
    expect(Number(six[1])).toBe(6)
    expect(Number(six[2])).toBe(5)
    // 投入账：世界型 55% + 房间型 15% + 常规 30% = 100%
    const world = Number(grab(/\*\*(\d+)\*\*% 的世界型投入/, '世界型投入')[1])
    const room = Number(grab(/只分到 \*\*(\d+)\*\*%/, '房间型投入')[1])
    const misc = Number(grab(/常规业务功能（好友\/排行\/战绩）\s+(\d+)%/, '常规投入')[1])
    expect(world + room + misc).toBe(100)
    // 账本 fence 与正文一致：三行投入数字互相印证
    expect(sec.includes('世界型组件（分片/迁移/跨服）  55%')).toBe(true)
    expect(Number(sec.match(/世界型组件（分片\/迁移\/跨服）\s+(\d+)%/)[1])).toBe(world)
    // 复核账：82→98、18→2 均互补；P95 45→8
    const re = grab(/开局成功率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%（组房失败 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%）/, '复核账')
    expect(Number(re[1])).toBe(open)
    expect(Number(re[3])).toBe(fail)
    expect(Number(re[2]) + Number(re[4])).toBe(100)
    const p95 = grab(/匹配 P95 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 秒/, '匹配 P95 回落')
    expect(Number(p95[1])).toBe(Number(grab(/匹配 P95 等待 \*\*(\d+)\*\* 秒/, '首测 P95')[1]))
    expect(Number(p95[2])).toBeLessThan(Number(p95[1]))
    // 投诉闭环：230 单在处置段复现
    const tickets = Number(grab(/到账投诉 \*\*(\d+)\*\* 单/, '到账投诉')[1])
    expect(Number(grab(/补幂等与对账（\*\*(\d+)\*\* 单到账投诉逐单闭环/, '投诉闭环')[1])).toBe(tickets)
  })

  it('声称对账：分型表第 1 行五件事、六问、三维度、速查表行、两个危险做法均与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 附录六问：逐条编号恰好 6 个
    const sQ = lecture01.slice(lecture01.indexOf('### 六个问题给项目分型'), lecture01.indexOf('### 问题模型分型表'))
    expect((sQ.match(/^\*\*\d\. /gm) || []).length).toBe(6)
    // 分型表 6 行，第 1 行「第一阶段优先设计什么」正是五件事
    const sT = lecture01.slice(lecture01.indexOf('### 问题模型分型表'), lecture01.indexOf('### 各问题模型详解'))
    const rows = sT.split('\n').filter(l => /^\| 多人|^\| 输入|^\| 世界|^\| 长期|^\| 增长|^\| 同屏/.test(l))
    expect(rows.length).toBe(6)
    expect(rows[0]).toContain('匹配、组房、生命周期、重连、结算')
    // 案例引用的五件事与表内逐字一致
    expect(sec.includes('匹配、组房、生命周期、重连、结算')).toBe(true)
    // 识别主导模型三维度恰好 3 条
    const sD = lecture01.slice(lecture01.indexOf('识别主导模型的三个维度：'), lecture01.indexOf('### 游戏类型技术速查表'))
    expect((sD.match(/^\d\. \*\*/gm) || []).length).toBe(3)
    // 速查表「派对/房间制轻竞技」行存在，三句原话被案例引用
    const partyRow = lecture01.split('\n').find(l => l.startsWith('| 派对/房间制轻竞技'))
    expect(partyRow, '速查表应有「派对/房间制轻竞技」行').toBeTruthy()
    expect(partyRow).toContain('开局快、能组朋友、掉线能回')
    expect(partyRow).toContain('单局房间型')
    expect(sec.includes('开局快、能组朋友、掉线能回')).toBe(true)
    // 模型组合的两个危险做法，讲内与案例逐字呼应
    expect(lecture01.includes('只给项目贴一个标签')).toBe(true)
    expect(lecture01.includes('把所有模型都按最高标准一起建设')).toBe(true)
    expect(sec.includes('只给项目贴一个标签')).toBe(true)
    expect(sec.includes('把所有模型都按最高标准一起建设')).toBe(true)
    // 房间实例以讲内骨架为蓝本：单写者 Run + 有界输入队列仍在
    expect(lecture01.includes('func (r *Room) Run(frame time.Duration)')).toBe(true)
    expect(lecture01.includes('make(chan Input, 256)')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与骨架代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '## 附录：游戏类型问题模型与分类方法',
      '### 六个问题给项目分型',
      '### 问题模型分型表',
      '### 模型之间的组合',
      '### 游戏类型技术速查表',
    ]) {
      expect(lecture01.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '01-entry.md'))).toBe(true)
  })
})
