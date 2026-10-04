import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/operation/bi/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「三张收入表差 9 万」的运营口径排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以收束段收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('并且知道每一次增长是怎么来的、代价是什么')
  expect(start, '第 14 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 operation/bi/01「三张收入表差 9 万」的运营口径排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少运营链路归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      '口径归一',
      '动作闭环',
      '复盘系统',
      '组织收口',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内五节
    for (const name of [
      '为什么运营会变成技术问题',
      '商业化不是商城页，而是资源流和价格策略',
      '运营体系通常至少包含哪些能力',
      '先设计闭环，再谈灵活性',
      '常见组织方式与代价',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：三表桥接账、动作与复盘账、改价损失账与次月复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景动作账：6 = 改价 3 + 活动 1 + 推送 2；审批 0 条、回退方案 0 份
    const act = grab(/周年庆预热周连推 \*\*(\d+)\*\* 个运营动作——礼包改价 \*\*(\d+)\*\* 次、登录活动 \*\*(\d+)\*\* 个、召回推送 \*\*(\d+)\*\* 批/, '背景动作账')
    expect(Number(act[2]) + Number(act[3]) + Number(act[4])).toBe(Number(act[1]))
    const appr = grab(/审批记录 \*\*(\d+)\*\* 条、回退方案 \*\*(\d+)\*\* 份/, '背景审批账')
    // 正文对照账：三表 128 / 121 / 119，最大差 9 = 128 − 119
    const bg = grab(/- \*\*三表\*\*：运营后台 \*\*(\d+)\*\* 万、BI 看板 \*\*(\d+)\*\* 万、财务结算 \*\*(\d+)\*\* 万——最大差 \*\*(\d+)\*\* 万/, '三表对照账')
    expect(Number(bg[1]) - Number(bg[3])).toBe(Number(bg[4]))
    // 桥接账：119 + 2 = 121；121 + 7 = 128；2 + 7 = 9，与三表逐项一致
    const br = grab(/- \*\*桥接\*\*：财务 (\d+) \+ 退款在途 \*\*(\d+)\*\* 万 = BI (\d+)；BI (\d+) \+ 跨天截单 \*\*(\d+)\*\* 万 = 运营 (\d+)——\*\*(\d+)\*\* \+ \*\*(\d+)\*\* = \*\*(\d+)\*\*/, '桥接账')
    expect(Number(br[1]) + Number(br[2])).toBe(Number(br[3]))
    expect(Number(br[4]) + Number(br[5])).toBe(Number(br[6]))
    expect(Number(br[7]) + Number(br[8])).toBe(Number(br[9]))
    expect(Number(br[7])).toBe(Number(br[2]))
    expect(Number(br[8])).toBe(Number(br[5]))
    expect(Number(br[6])).toBe(Number(bg[1]))
    expect(Number(br[3])).toBe(Number(bg[2]))
    expect(Number(br[1])).toBe(Number(bg[3]))
    expect(Number(br[9])).toBe(Number(bg[4]))
    // 背景复盘账：5 天 × 3 口径 = 15 版
    const rc = grab(/预热周 \*\*(\d+)\*\* 天流水在三个口径下各记一版，共 \*\*(\d+)\*\* 版数字/, '背景复盘账')
    expect(Number(rc[1]) * 3).toBe(Number(rc[2]))
    // 围栏动作账：与背景逐项一致
    const fa = grab(/预热周 (\d+) 个动作（改价 (\d+)、活动 (\d+)、推送 (\d+)）全部直发生效，审批 (\d+) 条，回退方案 (\d+) 份/, '围栏动作账')
    expect(Number(fa[2]) + Number(fa[3]) + Number(fa[4])).toBe(Number(fa[1]))
    expect(Number(fa[1])).toBe(Number(act[1]))
    expect(Number(fa[5])).toBe(Number(appr[1]))
    expect(Number(fa[6])).toBe(Number(appr[2]))
    // 围栏口径账：9 = 2 + 7；119 + 2 = 121；121 + 7 = 128，与桥接账一致
    const fk = grab(/三表差 (\d+) 万 = 退款在途 (\d+) 万 \+ 跨天截单 (\d+) 万（(\d+) \+ (\d+) = (\d+)，(\d+) \+ (\d+) = (\d+)）/, '围栏口径账')
    expect(Number(fk[2]) + Number(fk[3])).toBe(Number(fk[1]))
    expect(Number(fk[4]) + Number(fk[5])).toBe(Number(fk[6]))
    expect(Number(fk[7]) + Number(fk[8])).toBe(Number(fk[9]))
    expect(Number(fk[1])).toBe(Number(bg[4]))
    expect(Number(fk[4])).toBe(Number(br[1]))
    expect(Number(fk[5])).toBe(Number(br[2]))
    expect(Number(fk[6])).toBe(Number(br[3]))
    expect(Number(fk[7])).toBe(Number(br[4]))
    expect(Number(fk[8])).toBe(Number(br[5]))
    expect(Number(fk[9])).toBe(Number(br[6]))
    // 背景改价账：248 − 198 = 50；回改 4 小时卖 1300 单
    const pr = grab(/标价 \*\*(\d+)\*\* 元、结算仍 \*\*(\d+)\*\* 元，差 \*\*(\d+)\*\* 元\/单——手工回改拖了 \*\*(\d+)\*\* 小时，窗口里多卖出 \*\*(\d+)\*\* 单/, '背景改价账')
    expect(Number(pr[1]) - Number(pr[2])).toBe(Number(pr[3]))
    // 围栏回滚账：与背景一致，少收 6.5 万 = 1300 × 50 / 10000
    const fr = grab(/标价 (\d+)、结算 (\d+)，差 (\d+) 元\/单；回改拖 (\d+) 小时，多卖 (\d+) 单、少收 ([\d.]+) 万/, '围栏回滚账')
    expect(Number(fr[1])).toBe(Number(pr[1]))
    expect(Number(fr[2])).toBe(Number(pr[2]))
    expect(Number(fr[3])).toBe(Number(pr[3]))
    expect(Number(fr[4])).toBe(Number(pr[4]))
    expect(Number(fr[5])).toBe(Number(pr[5]))
    expect((Number(fr[5]) * Number(fr[3])) / 10000).toBeCloseTo(Number(fr[6]))
    // 围栏复盘账：5 × 3 = 15，与背景复盘账一致
    const rf = grab(/(\d+) 天 × (\d+) 口径 = (\d+) 版流水/, '围栏复盘账')
    expect(Number(rf[1]) * Number(rf[2])).toBe(Number(rf[3]))
    expect(Number(rf[1])).toBe(Number(rc[1]))
    expect(Number(rf[3])).toBe(Number(rc[2]))
    // 正文应急账：损耗 1300 × 50 = 6.5 万；差口 9 = 2 + 7；15 版并 1 版
    const ls = grab(/\*\*(\d+)\*\* 单 × \*\*(\d+)\*\* 元 = \*\*([\d.]+)\*\* 万入活动损耗账/, '应急损耗账')
    expect((Number(ls[1]) * Number(ls[2])) / 10000).toBeCloseTo(Number(ls[3]))
    expect(Number(ls[1])).toBe(Number(pr[5]))
    expect(Number(ls[2])).toBe(Number(pr[3]))
    expect(Number(ls[3])).toBeCloseTo(Number(fr[6]))
    const sp = grab(/差口 \*\*(\d+)\*\* 万当场拆平（\*\*(\d+)\*\* \+ \*\*(\d+)\*\*），\*\*(\d+)\*\* 版流水并成 \*\*(\d+)\*\* 版/, '应急拆平账')
    expect(Number(sp[2]) + Number(sp[3])).toBe(Number(sp[1]))
    expect(Number(sp[1])).toBe(Number(bg[4]))
    expect(Number(sp[2])).toBe(Number(br[7]))
    expect(Number(sp[3])).toBe(Number(br[8]))
    expect(Number(sp[4])).toBe(Number(rc[2]))
    expect(Number(sp[5])).toBe(1)
    // 次月复核账：改价 6 次全审批 6/6、回退方案 6/6、驳回 1 次、日差 ≤ 1 万
    const nm = grab(/次月改价 \*\*(\d+)\*\* 次全部审批留痕（\*\*(\d+)\*\*\/\*\*(\d+)\*\*），回退方案 \*\*(\d+)\*\*\/\*\*(\d+)\*\* 齐备，缺回退方案的提价被审批驳回 \*\*(\d+)\*\* 次；三表最大日差收敛到 \*\*(\d+)\*\* 万以内/, '次月复核账')
    expect(Number(nm[2])).toBe(Number(nm[1]))
    expect(Number(nm[3])).toBe(Number(nm[1]))
    expect(Number(nm[4])).toBe(Number(nm[1]))
    expect(Number(nm[5])).toBe(Number(nm[1]))
    expect(Number(nm[1])).toBeGreaterThan(Number(appr[1]))
    expect(Number(nm[6])).toBeGreaterThanOrEqual(1)
    expect(Number(nm[7])).toBeLessThanOrEqual(1)
    // 制度三步：动作三步重排、六件套强制、平台层收口
    for (const s of [
      '先登记动作类型',
      '再锁每类动作的输入、影响范围、审批和回滚方式',
      '礼包调价强制六件套',
      '齐备才可提交',
      '公共能力收进平台层',
    ]) {
      expect(sec.includes(s), `制度三步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：首节五条、商业化七项、五类能力、动作三步与六件套、组织三型、常见错误四条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内「为什么运营会变成技术问题」恰好 5 条（三瓶颈 + 两瓶颈）
    const sWhy = page.slice(page.indexOf('## 为什么运营会变成技术问题'), page.indexOf('## 商业化不是商城页，而是资源流和价格策略'))
    expect((sWhy.match(/^- /gm) || []).length).toBe(5)
    // 页内商业化影响恰好 4 条、反例恰好 3 条
    const sBiz = page.slice(page.indexOf('## 商业化不是商城页，而是资源流和价格策略'), page.indexOf('## 运营体系通常至少包含哪些能力'))
    const exAt = sBiz.indexOf('如果没有稳定的资源投放和消耗模型')
    expect((sBiz.slice(0, exAt).match(/^- /gm) || []).length).toBe(4)
    expect((sBiz.slice(exAt).match(/^- /gm) || []).length).toBe(3)
    // 页内五类能力恰好 5 条
    const sCap = page.slice(page.indexOf('## 运营体系通常至少包含哪些能力'), page.indexOf('## 先设计闭环，再谈灵活性'))
    expect((sCap.match(/^- /gm) || []).length).toBe(5)
    // 页内动作三步恰好 3 条、礼包调价六件套恰好 6 条
    const sLoop = page.slice(page.indexOf('## 先设计闭环，再谈灵活性'), page.indexOf('## 常见组织方式与代价'))
    expect((sLoop.match(/^\d\. /gm) || []).length).toBe(3)
    expect((sLoop.match(/^- /gm) || []).length).toBe(6)
    // 页内组织方式恰好 3 型
    const sOrg = page.slice(page.indexOf('## 常见组织方式与代价'), page.indexOf('## 常见错误'))
    expect((sOrg.match(/^### /gm) || []).length).toBe(3)
    // 本页常见错误为 4 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '运营动作不可控，做了也无法复盘真假效果',
      '必须共享尽可能一致的数据口径和审批流程',
      '先定义动作类型',
      '再定义每类动作的输入、影响范围、审批和回滚方式',
      '所谓“灵活配置”只是把风险转移给线上',
      '有个后台就算做了',
      '业务团队各自维护后台',
      '口径不统一、数据互不兼容',
      '很快绕开平台，回到旁路脚本和临时配置',
      '活动调度、人群分层、统一报表、权限审计、推送渠道',
      '只有活动和商城后台，没有统一复盘和指标观察能力',
      '商业化配置高度灵活，但没有审批、实验设计和回滚机制',
      '复盘系统',
      '生效时间',
      '回退方案',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 为什么运营会变成技术问题',
      '## 商业化不是商城页，而是资源流和价格策略',
      '## 运营体系通常至少包含哪些能力',
      '## 先设计闭环，再谈灵活性',
      '## 常见组织方式与代价',
      '## 常见错误',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/operation/bi')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
  })
})
