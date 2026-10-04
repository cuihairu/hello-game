import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/18-observability-debugging/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「三样工具都买了，定位还是卡了 6 小时」的证据链排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以收束段收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('围绕这个目标做取舍，比围绕功能清单做选型更能避免返工')
  expect(start, '第 16 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 18-observability-debugging/01「三样工具都买了，定位还是卡了 6 小时」的证据链排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少证据链归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      '证据关联',
      '告警与日志纪律',
      '追踪单位与采样',
      '指标档案',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内七节
    for (const name of [
      '三根支柱各自回答什么问题',
      '为什么指标适合站岗而日志适合解剖',
      '日志建设的几条基础判断',
      '三者关联起来才有定位能力',
      '指标口径与基线同样需要治理',
      '建设顺序上的常见判断',
      '什么时候值得加大投入',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：口径账、日志账、追踪账、定位账与告警线账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景口径账：网关 420 − 逻辑服 380 = 差 40
    const bg = grab(/网关 P99 从 \*\*(\d+)\*\*ms 抬到 \*\*(\d+)\*\*ms、逻辑服同刻 \*\*(\d+)\*\*ms/, '背景延迟账')
    expect(Number(bg[2]) - Number(bg[3])).toBe(Number(grab(/只记处理耗时，差 \*\*(\d+)\*\*ms/, '背景口径差')[1]))
    // 第一步口径账：与背景一致
    const st = grab(/网关 \*\*(\d+)\*\*ms、逻辑服 \*\*(\d+)\*\*ms，差 \*\*(\d+)\*\*ms 不是误差/, '第一步口径账')
    expect(Number(st[1])).toBe(Number(bg[2]))
    expect(Number(st[2])).toBe(Number(bg[3]))
    expect(Number(st[3])).toBe(Number(bg[2]) - Number(bg[3]))
    // 第一步告警账：指标 0 条（阈值 500 未到）、日志 3 条，与背景一致
    const al = grab(/指标告警 \*\*(\d+)\*\* 条（阈值 \*\*(\d+)\*\*ms 未到），日志告警 \*\*(\d+)\*\* 条/, '第一步告警账')
    expect(Number(al[1])).toBe(0)
    expect(Number(al[3])).toBe(Number(grab(/日志告警倒响了 \*\*(\d+)\*\* 条规则/, '背景日志告警')[1]))
    expect(Number(bg[2])).toBeLessThan(Number(al[2]))
    // 围栏日志账：120 万条 / 30 分钟 = 分钟均 4 万条
    const fl = grab(/(\d+) 分钟 (\d+) 万条超时日志（分钟均 (\d+) 万条）/, '围栏日志账')
    expect(Number(fl[2])).toBe(Number(fl[1]) * Number(fl[3]))
    expect(Number(fl[1])).toBe(Number(grab(/日志平台里 \*\*(\d+)\*\* 分钟窗口捞出 \*\*(\d+)\*\* 万条超时日志/, '背景日志量')[1]))
    expect(Number(fl[2])).toBe(Number(grab(/日志平台里 \*\*(\d+)\*\* 分钟窗口捞出 \*\*(\d+)\*\* 万条超时日志/, '背景日志量')[2]))
    // 围栏追踪账：8 服务 2 埋点 = 覆盖 25%，与背景逐项一致
    const ft = grab(/(\d+) 个服务只有 (\d+) 个埋 trace id（覆盖 (\d+)%）/, '围栏追踪账')
    expect(Number(ft[3])).toBe((Number(ft[2]) / Number(ft[1])) * 100)
    expect(Number(ft[1])).toBe(Number(grab(/追踪平台里 \*\*(\d+)\*\* 个服务只有入口 \*\*(\d+)\*\* 个埋了 trace id/, '背景埋点')[1]))
    expect(Number(ft[2])).toBe(Number(grab(/追踪平台里 \*\*(\d+)\*\* 个服务只有入口 \*\*(\d+)\*\* 个埋了 trace id/, '背景埋点')[2]))
    // 围栏时钟账：与背景 40 秒一致，T+1 归零
    const fk = grab(/时钟差 (\d+) 秒/, '围栏时钟账')
    expect(Number(fk[1])).toBe(Number(grab(/系统时钟差 \*\*(\d+)\*\* 秒/, '背景时钟差')[1]))
    expect(Number(grab(/\*\*(\d+)\*\* 秒偏差归零/, '应急对齐')[1])).toBe(Number(fk[1]))
    // 围栏定位账：6 小时 = 360 分钟，360 / 5 = 72 倍
    const fd = grab(/定位 (\d+) 小时（(\d+) 分钟）对修复 (\d+) 分钟 = (\d+) 倍/, '围栏定位账')
    expect(Number(fd[2])).toBe(Number(fd[1]) * 60)
    expect(Number(fd[4])).toBe(Number(fd[2]) / Number(fd[3]))
    expect(Number(fd[1])).toBe(Number(grab(/定位卡了 \*\*(\d+)\*\* 小时，而根因处置只花了 \*\*(\d+)\*\* 分钟/, '背景定位修复')[1]))
    expect(Number(fd[3])).toBe(Number(grab(/定位卡了 \*\*(\d+)\*\* 小时，而根因处置只花了 \*\*(\d+)\*\* 分钟/, '背景定位修复')[2]))
    // 应急与复核：重放定位 25 分钟、修复 5 分钟，倍数 72 → 5
    const rp = grab(/定位用时 \*\*(\d+)\*\* 分钟——从 \*\*(\d+)\*\* 分钟降到 \*\*(\d+)\*\* 分钟/, '应急重放')
    expect(Number(rp[1])).toBe(Number(rp[3]))
    expect(Number(rp[2])).toBe(Number(fd[2]))
    const rv = grab(/定位 \*\*(\d+)\*\* 分钟、修复 \*\*(\d+)\*\* 分钟，定位倍数从 \*\*(\d+)\*\* 降到 \*\*(\d+)\*\*/, '复核账')
    expect(Number(rv[1])).toBe(Number(rp[1]))
    expect(Number(rv[2])).toBe(Number(fd[3]))
    expect(Number(rv[3])).toBe(Number(fd[4]))
    expect(Number(rv[1]) / Number(rv[2])).toBe(Number(rv[4]))
    expect(Number(rv[4])).toBeLessThan(Number(rv[3]))
    // 制度三步：迁 3 条告警与背景一致；采样两条底线；档案阈值 210 × 1.5 = 315，落在 420 与 500 之间
    expect(Number(grab(/（\*\*(\d+)\*\* 条日志告警全迁走/, '告警迁移')[1])).toBe(Number(al[3]))
    expect(Number(grab(/错误和慢路径尽量留全（\*\*(\d+)\*\*%）/, '错误慢路径留存')[1])).toBe(100)
    expect(Number(grab(/正常流量按 \*\*(\d+)\*\*% 抽样/, '正常流量抽样')[1])).toBe(1)
    const th = grab(/P99 基线 \*\*(\d+)\*\*ms、告警线取 \*\*([\d.]+)\*\* 倍为 \*\*(\d+)\*\*ms，本例 \*\*(\d+)\*\*ms/, '档案阈值账')
    expect(Number(th[1]) * Number(th[2])).toBe(Number(th[3]))
    expect(Number(th[3])).toBeLessThan(Number(th[4]))
    expect(Number(th[4])).toBeLessThan(Number(al[2]))
    // 教训回扣：第 3 跳、40 秒、72 倍与 500ms 均与正文一致
    expect(Number(grab(/trace id 断在第 \*\*(\d+)\*\* 跳、时钟差 \*\*(\d+)\*\* 秒/, '教训证据数')[1])).toBe(Number(grab(/链路到第 \*\*(\d+)\*\* 跳断掉/, '背景断跳')[1]))
    expect(Number(grab(/trace id 断在第 \*\*(\d+)\*\* 跳、时钟差 \*\*(\d+)\*\* 秒/, '教训证据数')[2])).toBe(Number(fk[1]))
    expect(Number(grab(/\*\*(\d+)\*\* 小时对 \*\*(\d+)\*\* 分钟的 \*\*(\d+)\*\* 倍/, '教训倍数')[3])).toBe(Number(fd[4]))
    expect(Number(grab(/半年前的 \*\*(\d+)\*\*ms 阈值、同屏差 \*\*(\d+)\*\*ms 的两条/, '教训口径数')[1])).toBe(Number(al[2]))
    expect(Number(grab(/半年前的 \*\*(\d+)\*\*ms 阈值、同屏差 \*\*(\d+)\*\*ms 的两条/, '教训口径数')[2])).toBe(Number(st[3]))
  })

  it('声称对账：三支柱三条、日志判断五条、追踪单位三条、采样三条、建设顺序三条与常见误区五条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内三支柱分工恰好 3 条
    const sPillar = page.slice(page.indexOf('## 三根支柱各自回答什么问题'), page.indexOf('## 为什么指标适合站岗而日志适合解剖'))
    expect((sPillar.match(/^- /gm) || []).length).toBe(3)
    // 页内日志基础判断恰好 5 条
    const sLog = page.slice(page.indexOf('## 日志建设的几条基础判断'), page.indexOf('## Tracing 在游戏后端为什么更难落地'))
    expect((sLog.match(/^- /gm) || []).length).toBe(5)
    // 页内追踪单位恰好 3 条
    const sUnit = page.slice(page.indexOf('## Tracing 在游戏后端为什么更难落地'), page.indexOf('## 采样代价是游戏场景的核心约束'))
    expect((sUnit.match(/^- /gm) || []).length).toBe(3)
    // 页内采样策略恰好 3 条
    const sSamp = page.slice(page.indexOf('## 采样代价是游戏场景的核心约束'), page.indexOf('## 三者关联起来才有定位能力'))
    expect((sSamp.match(/^- /gm) || []).length).toBe(3)
    // 页内建设顺序恰好 3 条
    const sOrd = page.slice(page.indexOf('## 建设顺序上的常见判断'), page.indexOf('## 观测系统自身的成本治理'))
    expect((sOrd.match(/^- /gm) || []).length).toBe(3)
    // 页内六节为纯段落体例（无 bullet 列表）：站岗解剖、三者关联、OTel、成本治理、口径基线、加大投入
    for (const [from, to] of [
      ['## 为什么指标适合站岗而日志适合解剖', '## 日志建设的几条基础判断'],
      ['## 三者关联起来才有定位能力', '## OTel 的真实价值与边界'],
      ['## OTel 的真实价值与边界', '## 建设顺序上的常见判断'],
      ['## 观测系统自身的成本治理', '## 指标口径与基线同样需要治理'],
      ['## 指标口径与基线同样需要治理', '## 什么时候值得加大投入'],
      ['## 什么时候值得加大投入', '## 常见误区'],
    ]) {
      expect((page.slice(page.indexOf(from), page.indexOf(to)).match(/^- /gm) || []).length).toBe(0)
    }
    // 本页常见误区为 5 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '很多团队三样工具都买了，关联却始终没建立，故障时依然是各看各的数据',
      '如果每次故障的定位时间远长于修复时间，说明证据链不足',
      '网关统计的可能是接入耗时，逻辑服统计的可能是处理耗时，两者画在同一张图上会互相污染',
      '日志驱动的告警往往噪声大、口径漂移',
      'trace id 从入口生成后贯穿全链路，日志结构化并携带统一的字段命名，时间戳对齐到同一时钟',
      '同一错误短时间只记一条并累加次数，防止异常循环演变成日志风暴',
      '口径定义、统计位置、负责人、阈值的依据',
      '先把核心指标和关键业务日志立起来，保证出事能知道、能粗看',
      '错误和慢路径尽量留全',
      '一次玩家操作触发的完整处理路径',
      '一条异步消息从发出到消费完成的生命周期',
      '观测体系的目标从来不是记录得越多越好，而是在真正出事的那几分钟里，证据刚好够用、刚好能串起来',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 三根支柱各自回答什么问题',
      '## 为什么指标适合站岗而日志适合解剖',
      '## 日志建设的几条基础判断',
      '## 三者关联起来才有定位能力',
      '## 采样代价是游戏场景的核心约束',
      '## 指标口径与基线同样需要治理',
      '## 建设顺序上的常见判断',
      '## 什么时候值得加大投入',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/18-observability-debugging')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
  })
})
