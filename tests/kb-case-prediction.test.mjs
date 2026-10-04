import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/sync/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「明明躲开了还中」的回溯判定争议排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「偷走一部分」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('把延迟从玩家手里偷走一部分')
  expect(start, '第 4 章 05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/sync/05「明明躲开了还中」的回溯判定争议排查）', () => {
  const sec = caseSection(page)

  it('四段结构齐全：背景与现象、四步、回填清单 + 教训收束', () => {
    for (const part of [
      '背景与现象',
      '第一步：现象与口径',
      '第二步：分层归因',
      '第三步：根因',
      '第四步：处置与回填',
      '回填清单',
      '案例的三个教训',
    ]) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少口径/时序示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 三层状态分层逐层落到案例里
    for (const layer of ['本地体验层', '权威裁决层', '表现收敛层']) {
      expect(sec.includes(layer), `案例缺少分层「${layer}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '技术评审模板把权威裁决层与表现收敛层分栏评审',
      '逐技能判定规则表',
      '位移平滑收敛、死亡与关键控制立即权威',
      '战斗日志全量留存',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：争议单分账、命中率、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：日对局 × 场均射击 = 全日射击
    const rounds = Number(grab(/日对局 \*\*(\d+)\*\* 万场/, '日对局')[1])
    const per = Number(grab(/场均射击 \*\*(\d+)\*\* 次/, '场均射击')[1])
    const shots = Number(grab(/全日射击 \*\*(\d+)\*\* 万次/, '全日射击')[1])
    expect(rounds * per).toBe(shots)
    // 命中率 × 射击 = 命中；争议单 / 命中 = 争议率
    const hitRate = Number(grab(/= \*\*(\d+)\*\*%（全日射击/, '命中率')[1])
    const hits = Number(grab(/命中 \*\*(\d+)\*\* 万次/, '全日命中')[1])
    expect(hits * 100 / shots).toBe(hitRate)
    const tickets = Number(grab(/稳定在日 \*\*(\d+)\*\* 单/, '争议工单')[1])
    const rate = grab(/占全日命中的 \*\*([\d.]+)\*\*%/, '争议率')
    expect(Number(rate[1])).toBeCloseTo(tickets / (hits * 10000) * 100, 6)
    // fence 三行分账合计 = 工单总数
    const rows = [...sec.matchAll(/^\s+(\S+?)\s+(\d+)%\s+→\s+(\d+) 单$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), cnt: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(rows.reduce((s, r) => s + r.cnt, 0)).toBe(tickets)
    expect(rows.map(r => r.pct * tickets / 100)).toEqual(rows.map(r => r.cnt))
    // 根因账：窗口 = 无敌帧 + P99 RTT
    const win = Number(grab(/回溯窗口 \*\*(\d+)\*\* 毫秒/, '回溯窗口')[1])
    const iframe = Number(grab(/\*\*(\d+)\*\* 毫秒无敌帧/, '无敌帧')[1])
    const rtt = Number(grab(/P99 RTT \*\*(\d+)\*\* 毫秒/, 'P99 RTT')[1])
    expect(iframe + rtt).toBe(win)
    // 归因层与 fence 第一行一致（裁决层 88% 对应回溯口径）
    expect(sec.includes('**88**% 的争议集中在这里')).toBe(true)
    expect(rows[0].pct).toBe(88)
    // 复核账：命中率与工单首尾相接，争议率随工单同比例回落
    const re = grab(/争议工单日 \*\*(\d+)\*\* 单 → 日 \*\*(\d+)\*\* 单，争议率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%/, '复核账')
    expect(Number(re[1])).toBe(tickets)
    expect(Number(re[2])).toBe(tickets / 10)
    expect(Number(re[3])).toBeCloseTo(tickets / (hits * 10000) * 100, 6)
    expect(Number(re[4])).toBeCloseTo(Number(re[3]) / 10, 6)
    expect(Number(grab(/命中率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '命中率复核')[2])).toBeLessThan(hitRate)
    // 仲裁准确率与补日志前同源
    const acc = grab(/仲裁准确率只有 \*\*(\d+)\*\*%/, '仲裁准确率')
    expect(100 - Number(acc[1])).toBe(39)
    expect(Number(grab(/复核准确率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '准确率复核')[2])).toBeGreaterThan(Number(acc[1]))
    // 窗口两处口径一致：处置段收到 P99 RTT
    expect(Number(grab(/收到 \*\*(\d+)\*\* 毫秒，与 P99 RTT 对齐/, '窗口收敛')[1])).toBe(rtt)
  })

  it('声称对账：三层拆分、纠正层级、五项时序日志与补偿口径均与页内实况一致', () => {
    const grab = (pattern, label) => {
      const m = page.match(pattern)
      expect(m, `页面中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 页内三层状态分层恰好 3 条
    const sL = page.slice(page.indexOf('比较稳妥的项目里，常见会把状态分成三层：'), page.indexOf('## 预测链路必须配日志'))
    expect((sL.match(/^- 本地体验层|^- 权威裁决层|^- 表现收敛层/gm) || []).length).toBe(3)
    // 页内纠正层级恰好 4 级
    const sC = page.slice(page.indexOf('服务端结果回来以后，纠正有很多层级：'), page.indexOf('## 帧同步和状态同步里的预测并不一样'))
    expect((sC.match(/^- 硬纠正|^- 平滑纠正|^- 分类纠正|^- 回滚重演/gm) || []).length).toBe(4)
    // 页内五项时序日志恰好 5 条，且案例逐项回链
    const sLog = page.slice(page.indexOf('预测相关问题最怕没有证据。至少应该记录：'), page.indexOf('## 常见误区'))
    const logItems = [...sLog.matchAll(/^- (.+?)。$/gm)].map(m => m[1])
    expect(logItems.length).toBe(5)
    expect(sec.includes(logItems.join('、'))).toBe(true)
    // 页内补偿四问（争议四行清单）与案例「逐技能判定规则表」呼应
    const sComp = page.slice(page.indexOf('因此，补偿策略必须和玩法匹配'), page.indexOf('## 一套更现实的状态分层'))
    expect((sComp.match(/^- 最多允许回溯多久|^- 哪类技能允许回溯判定|^- 位移、闪现和无敌帧如何参与判定|^- 日志里能否复原当时的时序证据/gm) || []).length).toBe(4)
    expect(grab(/最多允许回溯多久/, '回溯上限问句')).toBeTruthy()
    // 案例引用的窗口/无敌帧/硬纠正原话在页内可查
    for (const s of ['硬纠正：直接把客户端状态改成服务端状态', '适合权威确认', '没有时序日志，预测链路出了问题以后只能靠猜']) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('硬纠正')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '## 一套更现实的状态分层',
      '## 服务端补偿最容易引发什么争议',
      '## 纠正不是只有“瞬移回去”',
      '## 预测链路必须配日志',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf('## 实战案例：一次「明明躲开了还中'))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/server/sync')).filter(f => f.endsWith('.md'))
    expect(pages.sort()).toEqual(['01.md', '02.md', '03.md', '04.md', '05.md', '06.md', '07.md', '08.md', 'index.md'])
  })
})