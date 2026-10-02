import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/07-ipc-messaging/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「打完了不出结算」的外围反卡主链路排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('既没解耦，也没降低风险')
  expect(start, '第 7 章 03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 07-ipc-messaging/03「打完了不出结算」的外围反卡主链路排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少分层归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '主事实口径',
      '前置依赖审计',
      '事件化改造',
      '悬空监控',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：基线倍数账、三笔时延账、外部调用账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 基线倍数账：4.8 秒 = 4800ms，4800 / 320 = 15 倍
    const base = Number(grab(/结算链路原本 P99 \*\*(\d+)\*\* 毫秒/, '基线 P99')[1])
    const spike = grab(/飙到 \*\*(\d+(?:\.\d+)?)\*\* 秒——涨到约 \*\*(\d+)\*\* 倍/, '尖峰倍数账')
    expect(Number(spike[1]) * 1000).toBe(4800)
    expect(Math.round((Number(spike[1]) * 1000) / base)).toBe(Number(spike[2]))
    // 三笔账：战斗侧 80ms 不变；结算确认与尖峰同值；存储侧 P95 35ms
    expect(Number(grab(/战斗侧\*\*：终局判定 P99 \*\*(\d+)\*\* 毫秒/, '战斗侧')[1])).toBe(80)
    expect(Number(grab(/结算确认 P99 \*\*(\d+(?:\.\d+)?)\*\* 秒/, '结算侧')[1])).toBe(Number(spike[1]))
    expect(Number(grab(/结算事务提交 P95 \*\*(\d+)\*\* 毫秒/, '存储侧')[1])).toBe(35)
    // 外部账：合计 4.6 = 1.2 + 3.4；占比 96% ≈ 4.6 / 4.8
    const outer = grab(/合计 \*\*(\d+(?:\.\d+)?)\*\* 秒，占结算时延约 \*\*(\d+)\*\*%/, '外部调用账')
    expect(Number(outer[1])).toBe(1.2 + 3.4)
    expect(Math.round((Number(outer[1]) / Number(spike[1])) * 100)).toBe(Number(outer[2]))
    // 围栏数字为纯文本：时间账逐项与合计一致
    expect(sec.includes('排行刷新 P99 1.2s + 战报通知 P99 3.4s'), '围栏应有外部两笔').toBe(true)
    expect(sec.includes('80ms + 35ms + 1.2s + 3.4s ≈ 4.7s ≈ 结算 P99 4.8s'), '围栏应有时间总账').toBe(true)
    // 复核账：P99 4.8 秒 → 350 毫秒（回落），超时率 6.1% → 0.3%（回落），工单 1700 闭环
    const re = grab(/复核：结算 P99 \*\*(\d+(?:\.\d+)?)\*\* 秒 → \*\*(\d+)\*\* 毫秒，超时率 \*\*(\d+(?:\.\d+)?)\*\*% → \*\*(\d+(?:\.\d+)?)\*\*%，\*\*(\d+)\*\* 单工单/, '复核账')
    expect(Number(re[1])).toBe(Number(spike[1]))
    expect(Number(re[2])).toBeLessThan(Number(re[1]) * 1000)
    expect(Number(re[4])).toBeLessThan(Number(re[3]))
    expect(Number(re[5])).toBe(1700)
  })

  it('声称对账：主/外围例数、特征与条件条数、做坏三点、三问标准与误区三类均与页内实况一致', () => {
    // 页内主链路例恰好 5 条、特征恰好 4 条
    const sMain = page.slice(page.indexOf('## 什么叫主链路'), page.indexOf('## 什么叫外围链路'))
    const splitAt = sMain.indexOf('这些链路通常具备几个共同特征')
    expect((sMain.slice(0, splitAt).match(/^- /gm) || []).length).toBe(5)
    expect((sMain.slice(splitAt).match(/^- /gm) || []).length).toBe(4)
    // 页内外围链路例恰好 6 条
    const sOuter = page.slice(page.indexOf('## 什么叫外围链路'), page.indexOf('## 为什么主链路不能简单照搬 MQ 思维'))
    expect((sOuter.match(/^- /gm) || []).length).toBe(6)
    // 页内「更稳妥的拆法」恰好 3 条、判断标准恰好 3 问
    const sSteady = page.slice(page.indexOf('## 一个更稳妥的拆法'), page.indexOf('## 最容易做坏的几个点'))
    expect((sSteady.match(/^- /gm) || []).length).toBe(3)
    const sJudge = page.slice(page.indexOf('## 一个简单判断标准'), page.indexOf('## 常见误区'))
    expect((sJudge.match(/^- /gm) || []).length).toBe(3)
    // 页内做坏点恰好三个 H3，案例反卡根因对准第三点
    for (const h of ['### 用消息队列承载实时控制流', '### 主事实还没落稳，就先广播外围事件', '### 外围系统反向卡住主流程']) {
      expect(page.includes(h), `页内缺少做坏点「${h}」`).toBe(true)
    }
    expect(sec.includes('外围系统反向卡住主流程')).toBe(true)
    // 常见误区三类（prose 体例），案例引用第三类
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    expect(page.includes('实际上却仍然决定主流程是否成功')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      '被设计成了主链路成功的前置条件',
      '主事实何时成立',
      '主链路最怕的不是耦合，而是失去确定性',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('被设计成了结算成功的前置条件')).toBe(true)
    expect(sec.includes('主事实何时成立')).toBe(true)
    expect(sec.includes('三问全指向该异步化')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 一个更稳妥的拆法',
      '### 外围系统反向卡住主流程',
      '## 一个简单判断标准',
      '## 外围链路为什么反而常常适合事件化',
      '## 为什么主链路不能简单照搬 MQ 思维',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/07-ipc-messaging')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
  })
})
