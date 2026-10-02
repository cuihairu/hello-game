import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/13-data-database/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「90 天前的流水只找得回 8 笔」的资产争议追溯排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('数据来源不清、链路不可重放、历史记录不完整')
  expect(start, '第 11 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 13-data-database/04「90 天前的流水只找得回 8 笔」的资产争议追溯排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少数据源归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '权威语义',
      '归档重试',
      '保留矩阵',
      '争议演练',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：工单口径账、数据源找回账、围栏对账账与处置耗时账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 围栏口径账：窗口 7 天、3 笔装备 + 9 笔金币 = 12 笔、45 万金币
    const ko = grab(/争议窗口 T-(\d+)～T-(\d+) 天，涉 (\d+) 件装备、(\d+) 万金币：(\d+) 笔装备交易 \+ (\d+) 笔金币转移 = (\d+) 笔/, '围栏口径账')
    expect(Number(ko[1]) - Number(ko[2])).toBe(7)
    expect(Number(ko[5]) + Number(ko[6])).toBe(Number(ko[7]))
    expect(Number(ko[3])).toBe(3)
    expect(Number(ko[4])).toBe(45)
    expect(Number(ko[7])).toBe(12)
    // 在线账：保留 30 天、可查 0 笔
    const on = grab(/在线交易表保留 (\d+) 天：窗口内可查 (\d+) 笔/, '围栏在线账')
    expect(Number(on[1])).toBe(30)
    expect(Number(on[2])).toBe(0)
    // 归档账：找回 8 笔、缺 4 笔，8 + 4 = 12
    const ar = grab(/月度归档找回 (\d+) 笔；T-(\d+) 月文件止于当月 (\d+) 日——导出当日失败无重试，缺 (\d+) 笔/, '围栏归档账')
    expect(Number(ar[1]) + Number(ar[4])).toBe(Number(ko[7]))
    expect(Number(ar[1])).toBe(8)
    // 分析账：补回 4 笔与归档 8 笔口径一致
    const an = grab(/补回 (\d+) 笔，成交口径与归档 (\d+) 笔完全一致/, '围栏分析账')
    expect(Number(an[1])).toBe(Number(ar[4]))
    expect(Number(an[2])).toBe(Number(ar[1]))
    // 对账账：12 笔全找回、45 万对平、3 件闭环
    const re = grab(/(\d+) 笔全找回、(\d+) 万金币对平、(\d+) 件装备流向闭环/, '围栏对账账')
    expect(Number(re[1])).toBe(Number(ko[7]))
    expect(Number(re[2])).toBe(Number(ko[4]))
    expect(Number(re[3])).toBe(Number(ko[3]))
    // 正文初查账：副本残留 4 笔与归档缺口 4 笔同源，每笔多 5% 手续费
    const ini = grab(/读取副本 \*\*(\d+)\*\* 笔（挂单口径，每笔多 \*\*(\d+)\*\*% 手续费）/, '正文初查账')
    expect(Number(ini[1])).toBe(Number(ar[4]))
    expect(Number(ini[2])).toBe(5)
    // 处置账：2 件追回 + 1 件补偿 = 3 件；初查 2 天 + 专项 3 天 = 5 天；复演 5 天 → 40 分钟
    const disp = grab(/\*\*(\d+)\*\* 件装备仍在买方包内被追回，\*\*(\d+)\*\* 件已分解、按归档内当时成交价 \*\*(\d+)\*\* 万金币补偿/, '处置账')
    expect(Number(disp[1]) + Number(disp[2])).toBe(Number(ko[3]))
    const days = grab(/初查 \*\*(\d+)\*\* 天 \+ 专项 \*\*(\d+)\*\* 天，共 \*\*(\d+)\*\* 天/, '耗时账')
    expect(Number(days[1]) + Number(days[2])).toBe(Number(days[3]))
    const drill = grab(/复演耗时从 \*\*(\d+)\*\* 天压到 \*\*(\d+)\*\* 分钟/, '复演账')
    expect(Number(drill[1])).toBe(Number(days[3]))
    expect(Number(drill[2])).toBeLessThan(60)
    // 保留矩阵：在线表 30 天、分析库 90 天、归档 2 年
    const keep = grab(/在线表 \*\*(\d+)\*\* 天、分析库 \*\*(\d+)\*\* 天、归档 \*\*(\d+)\*\* 年/, '保留矩阵')
    expect(Number(keep[1])).toBe(Number(on[1]))
    expect(Number(keep[2])).toBeGreaterThan(Number(keep[1]))
    expect(Number(keep[3]) * 365).toBeGreaterThan(Number(keep[2]))
    // 制度四步：权威登记、归档告警重试、保留台账、季度复演
    for (const s of [
      '登记「权威/派生」身份',
      '失败告警加重试',
      '写进生命周期台账',
      '每季度抽真实工单',
    ]) {
      expect(sec.includes(s), `制度四步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：热冷特征各四条、副本五份语义四问、归档五场景、生命周期四层四定义、验收五场景与页内实况一致，案例引用页内原话可查', () => {
    // 热数据/冷数据/混放后果各恰好 4 条
    const sHC = page.slice(page.indexOf('## 为什么“热数据”和“冷数据”不能一直混着放'), page.indexOf('## 数据同步真正难的不是复制，而是语义'))
    const coldAt = sHC.indexOf('冷数据则往往是')
    const mixAt = sHC.indexOf('常见后果是')
    expect((sHC.slice(0, coldAt).match(/^- /gm) || []).length).toBe(4)
    expect((sHC.slice(coldAt, mixAt).match(/^- /gm) || []).length).toBe(4)
    expect((sHC.slice(mixAt).match(/^- /gm) || []).length).toBe(4)
    // 副本五份、语义四问
    const sSync = page.slice(page.indexOf('## 数据同步真正难的不是复制，而是语义'), page.indexOf('## 归档为什么不是存储末端小事'))
    const qAt = sSync.indexOf('问题不在于有没有同步')
    expect((sSync.slice(0, qAt).match(/^- /gm) || []).length).toBe(5)
    expect((sSync.slice(qAt).match(/^- /gm) || []).length).toBe(4)
    // 归档价值恰好 5 条
    const sArc = page.slice(page.indexOf('## 归档为什么不是存储末端小事'), page.indexOf('## 一个更稳妥的数据生命周期视角'))
    expect((sArc.match(/^- /gm) || []).length).toBe(5)
    // 生命周期分层 4 条、分别定义 4 条
    const sLife = page.slice(page.indexOf('## 一个更稳妥的数据生命周期视角'), page.indexOf('## 同步与归档最诚实的验收场景'))
    const defAt = sLife.indexOf('然后分别定义')
    expect((sLife.slice(0, defAt).match(/^- /gm) || []).length).toBe(4)
    expect((sLife.slice(defAt).match(/^- /gm) || []).length).toBe(4)
    // 验收场景恰好 5 条
    const sAcc = page.slice(page.indexOf('## 同步与归档最诚实的验收场景'), page.indexOf('## 常见误区'))
    expect((sAcc.match(/^- /gm) || []).length).toBe(5)
    // 常见误区三类（prose 体例：首类作「最常见的错误」），案例引用第一类
    expect(page.includes('最常见的错误')).toBe(true)
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      '哪份是权威',
      '同步失败时系统如何告警和补偿',
      '如果系统直到库表太大了才想着归档',
      '数据来源不清、链路不可重放、历史记录不完整',
      '把同步理解成“多存几份更安全”，却没有定义权威源和副本语义',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('哪份是权威')).toBe(true)
    expect(sec.includes('同步失败时系统如何告警和补偿')).toBe(true)
    expect(sec.includes('如果系统直到库表太大了才想着归档')).toBe(true)
    expect(sec.includes('数据来源不清、链路不可重放、历史记录不完整')).toBe(true)
    expect(sec.includes('把同步理解成“多存几份更安全”')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 为什么“热数据”和“冷数据”不能一直混着放',
      '## 数据同步真正难的不是复制，而是语义',
      '## 归档为什么不是存储末端小事',
      '## 一个更稳妥的数据生命周期视角',
      '## 同步与归档最诚实的验收场景',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/13-data-database')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
  })
})
