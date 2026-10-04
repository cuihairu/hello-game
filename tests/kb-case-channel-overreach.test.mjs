import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/industry/platforms/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「顺手多接的 3 个小渠道，把排期拖垮了 4 周」的渠道接入排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以收束段收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('这个习惯建立得越早，后面的返工越少')
  expect(start, '第 15 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 industry/platforms/01「顺手多接的 3 个小渠道，把排期拖垮了 4 周」的渠道接入排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少渠道接入归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      '兼容窗口',
      '隔离层',
      '事件投影',
      '评估模板',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内六节
    for (const name of [
      '平台约束为什么是设计输入而不是验收事项',
      '审核周期如何改变版本节奏',
      '多版本共存是常态而不是过渡状态',
      '渠道数据与归因的口径问题',
      '聚合 SDK 与自建隔离层的取舍',
      '渠道谈判里技术团队的席位',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：渠道矩阵账、节奏账、数据投影账、工期账与应急复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景渠道账：原有 2 + 顺手 3 = 全渠道 5
    const bgCh = grab(/\*\*(\d+)\*\* 个渠道，商务顺手多接 \*\*(\d+)\*\* 个小渠道，全渠道增至 \*\*(\d+)\*\* 个/, '背景渠道账')
    expect(Number(bgCh[1]) + Number(bgCh[2])).toBe(Number(bgCh[3]))
    // 背景工程账：3 个 SDK 散落 17 个文件
    const bgF = grab(/\*\*(\d+)\*\* 个 SDK 散落 \*\*(\d+)\*\* 个文件/, '背景工程账')
    // 正文矩阵账：12 = 2×3×2；30 = 5×3×2；回归 5 天 = 2 天 × 30/12
    const mx = grab(/- \*\*矩阵\*\*：\*\*(\d+)\*\* → \*\*(\d+)\*\* 组合（× \*\*(\d+)\*\* 机型 × \*\*(\d+)\*\* 系统），回归 \*\*(\d+)\*\* → \*\*(\d+)\*\* 天/, '矩阵账')
    expect(Number(mx[1])).toBe(Number(bgCh[1]) * Number(mx[3]) * Number(mx[4]))
    expect(Number(mx[2])).toBe(Number(bgCh[3]) * Number(mx[3]) * Number(mx[4]))
    expect(Number(mx[6])).toBe(Number(mx[5]) * (Number(mx[2]) / Number(mx[1])))
    // 正文数据账：12000 − 6960 = 5040；5040/12000 = 42%
    const dt = grab(/- \*\*数据\*\*：首周激活 \*\*(\d+)\*\*、自建注册 \*\*(\d+)\*\*，差 \*\*(\d+)\*\* = \*\*(\d+)\*\*%/, '数据账')
    expect(Number(dt[1]) - Number(dt[2])).toBe(Number(dt[3]))
    expect(Number(dt[3]) / Number(dt[1])).toBeCloseTo(Number(dt[4]) / 100)
    // 正文节奏账：D+0 最快、D+3 活动、D+7 最慢放行；落后 2 版占 12%，报错 3000
    const rh = grab(/- \*\*节奏\*\*：窗口按最快渠道 \*\*D\+(\d+)\*\* 算、最慢渠道 \*\*D\+(\d+)\*\* 才放行，\*\*D\+(\d+)\*\* 的活动撞上落后 \*\*(\d+)\*\* 个版本的 \*\*(\d+)\*\*% 慢渠道玩家，报错 \*\*(\d+)\*\* 单/, '节奏账')
    expect(Number(rh[3])).toBeLessThan(Number(rh[2]))
    // 围栏渠道账：与背景、矩阵逐项一致
    const fa = grab(/原有 (\d+) \+ 顺手 (\d+) = (\d+) 个渠道；测试矩阵 (\d+) → (\d+)（×(\d+) 机型 ×(\d+) 系统），回归 (\d+) → (\d+) 天/, '围栏渠道账')
    expect(Number(fa[1]) + Number(fa[2])).toBe(Number(fa[3]))
    expect(Number(fa[1])).toBe(Number(bgCh[1]))
    expect(Number(fa[2])).toBe(Number(bgCh[2]))
    expect(Number(fa[3])).toBe(Number(bgCh[3]))
    expect(Number(fa[4])).toBe(Number(mx[1]))
    expect(Number(fa[5])).toBe(Number(mx[2]))
    expect(Number(fa[8])).toBe(Number(mx[5]))
    expect(Number(fa[9])).toBe(Number(mx[6]))
    // 围栏节奏账：落后 2 版、占 12%、报错 3000 与正文一致
    const fr = grab(/(\d+) 版、占 (\d+)% 的慢渠道玩家，报错 (\d+) 单/, '围栏节奏账')
    expect(Number(fr[1])).toBe(Number(rh[4]))
    expect(Number(fr[2])).toBe(Number(rh[5]))
    expect(Number(fr[3])).toBe(Number(rh[6]))
    // 围栏数据账：口径差与投影数（3 事件 × 5 渠道 = 15 条）均与正文一致
    const fk = grab(/首周激活 (\d+)、注册 (\d+)，差 (\d+) = (\d+)%；(\d+) 事件 × (\d+) 渠道 = (\d+) 条投影，口径各自定义/, '围栏数据账')
    expect(Number(fk[1])).toBe(Number(dt[1]))
    expect(Number(fk[2])).toBe(Number(dt[2]))
    expect(Number(fk[3])).toBe(Number(dt[3]))
    expect(Number(fk[4])).toBe(Number(dt[4]))
    expect(Number(fk[5]) * Number(fk[6])).toBe(Number(fk[7]))
    // 围栏工程账：直接工期 4 周 + 返工 4 周 = 8 周，与背景散落文件数一致
    const fe = grab(/(\d+) 个 SDK 直插核心代码、散落 (\d+) 个文件；直接工期 (\d+) 周 \+ 返工 (\d+) 周 = (\d+) 周/, '围栏工程账')
    expect(Number(fe[1])).toBe(Number(bgF[1]))
    expect(Number(fe[2])).toBe(Number(bgF[2]))
    expect(Number(fe[3]) + Number(fe[4])).toBe(Number(fe[5]))
    // 账本收束：42% 数据差、4 周返工与正文一致
    const cl = grab(/\*\*(\d+)\*\*% 的数据差是口径账，\*\*(\d+)\*\* 周的返工是工程账/, '账本收束')
    expect(Number(cl[1])).toBe(Number(dt[4]))
    expect(Number(cl[2])).toBe(Number(fe[4]))
    // 正文应急账：450/3000 即降 85%；差口 5040 逐事件重判
    const em = grab(/首周报错日均 \*\*(\d+)\*\*（对比峰值 \*\*(\d+)\*\*，降 \*\*(\d+)\*\*%）/, '应急账')
    expect(1 - Number(em[1]) / Number(em[2])).toBeCloseTo(Number(em[3]) / 100)
    expect(Number(grab(/\*\*(\d+)\*\* 逐事件重判/, '应急差口')[1])).toBe(Number(dt[3]))
    expect(Number(grab(/\*\*(\d+)\*\* 个版本的慢渠道玩家先补发活动奖励/, '应急补发')[1])).toBe(Number(rh[4]))
    // 正文复核账：150/3000 即降 95%；口径差归零；演练 1 次 1 天
    const rv = grab(/月日均报错 \*\*(\d+)\*\* 单（对比峰值 \*\*(\d+)\*\*，降 \*\*(\d+)\*\*%）/, '复核账')
    expect(1 - Number(rv[1]) / Number(rv[2])).toBeCloseTo(Number(rv[3]) / 100)
    expect(Number(rv[1])).toBeLessThan(Number(em[1]))
    expect(Number(rv[2])).toBe(Number(em[2]))
    expect(Number(grab(/渠道与自建口径差 \*\*(\d+)\*\*/, '复核口径差')[1])).toBe(0)
    const dr = grab(/换渠道演练 \*\*(\d+)\*\* 次，\*\*(\d+)\*\* 天落地/, '复核演练')
    expect(Number(dr[1])).toBe(1)
    expect(Number(dr[2])).toBe(1)
    // 制度三步：隔离层、事件模型投影数（3×5=15）、评估模板
    expect(Number(grab(/统一事件模型 \+ \*\*(\d+)\*\* 条投影/, '投影总数')[1])).toBe(Number(fk[7]))
    for (const s of [
      '三接口抽象进隔离层',
      '适配收敛进同一层',
      '换 SDK 只动',
      '评估模板四维',
      '先过技术评估桌',
    ]) {
      expect(sec.includes(s), `制度三步缺少「${s}」`).toBe(true)
    }
    // 教训回扣：17 文件、5 渠道 1 层、5040 与 D+3
    expect(Number(grab(/\*\*(\d+)\*\* 个文件里散落的 SDK，换一次就是一次全工程回归；压进隔离层后，\*\*(\d+)\*\* 个渠道的适配只占 \*\*(\d+)\*\* 层/, '教训工程数')[1])).toBe(Number(bgF[2]))
    const ls = grab(/\*\*(\d+)\*\* 的差与 \*\*D\+(\d+)\*\* 的撞车/, '教训口径数')
    expect(Number(ls[1])).toBe(Number(dt[3]))
    expect(Number(ls[2])).toBe(Number(rh[3]))
  })

  it('声称对账：平台约束四问、渠道强条款与包体各四条、审核节奏四条、借来能力三条、无列表小节五处与常见误区六条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内「平台约束为什么是设计输入而不是验收事项」恰好 4 条
    const sIn = page.slice(page.indexOf('## 平台约束为什么是设计输入而不是验收事项'), page.indexOf('## 渠道规则如何变成工程任务'))
    expect((sIn.match(/^- /gm) || []).length).toBe(4)
    // 页内渠道规则恰好 3 条
    const sRule = page.slice(page.indexOf('## 渠道规则如何变成工程任务'), page.indexOf('## 包体预算是最早出现的技术约束'))
    expect((sRule.match(/^- /gm) || []).length).toBe(3)
    // 页内包体预算恰好 4 条
    const sPkg = page.slice(page.indexOf('## 包体预算是最早出现的技术约束'), page.indexOf('## 审核周期如何改变版本节奏'))
    expect((sPkg.match(/^- /gm) || []).length).toBe(4)
    // 页内审核节奏恰好 4 条
    const sAud = page.slice(page.indexOf('## 审核周期如何改变版本节奏'), page.indexOf('## 多版本共存是常态而不是过渡状态'))
    expect((sAud.match(/^- /gm) || []).length).toBe(4)
    // 页内五节为纯段落体例（无 bullet 列表）：多版本共存、测试矩阵、隔离层、口径、谈判席位
    for (const [from, to] of [
      ['## 多版本共存是常态而不是过渡状态', '## 渠道差异会累积成测试矩阵'],
      ['## 渠道差异会累积成测试矩阵', '## 聚合 SDK 与自建隔离层的取舍'],
      ['## 聚合 SDK 与自建隔离层的取舍', '## 渠道数据与归因的口径问题'],
      ['## 渠道数据与归因的口径问题', '## 借来的能力与自建的底线'],
      ['## 渠道谈判里技术团队的席位', '## 常见误区'],
    ]) {
      expect((page.slice(page.indexOf(from), page.indexOf(to)).match(/^- /gm) || []).length).toBe(0)
    }
    // 页内借来的能力恰好 3 条
    const sOwn = page.slice(page.indexOf('## 借来的能力与自建的底线'), page.indexOf('## 渠道谈判里技术团队的席位'))
    expect((sOwn.match(/^- /gm) || []).length).toBe(3)
    // 本页常见误区为 6 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '不接就影响上架',
      '所有渠道同一天全量更新',
      '协议与配置的兼容窗口按最慢的渠道计算，而不是按最快的',
      '哪些字段只增不改、哪些语义在哪个版本发生变化、最低兼容到哪个客户端版本',
      '渠道差异被压进一个可控的层面，核心回归只需要一套用例',
      '把聚合层当作又一个可替换的渠道实现',
      '换掉一个渠道 SDK 时，核心代码要不要动、要动多少',
      '渠道上报只是这个模型的一种投影',
      '真正拖垮排期的不是某个大渠道，而是当初顺手多接的三四个小渠道',
      '往往会在上线前一两个月发现整条支付链路要重做',
      '适配层和降级路径画在架构图里',
      '把平台当成最后打包的环节，立项时不问平台规则，结果包体、支付与合规方案在上线前整体返工',
      '渠道 SDK 直接散落在核心代码里，换渠道或升级 SDK 变成全工程风险',
      '兼容窗口按最快的渠道设计，慢渠道玩家长期面对不兼容与异常',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 平台约束为什么是设计输入而不是验收事项',
      '## 审核周期如何改变版本节奏',
      '## 多版本共存是常态而不是过渡状态',
      '## 渠道数据与归因的口径问题',
      '## 聚合 SDK 与自建隔离层的取舍',
      '## 渠道谈判里技术团队的席位',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/industry/platforms')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
  })
})