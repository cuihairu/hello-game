import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/15-common-services/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「凌晨封了 8000 个号，改判四成」的风控误伤排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见错误」节收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('你有没有一套系统把局面稳住')
  expect(start, '第 13 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 15-common-services/04「凌晨封了 8000 个号，改判四成」的风控误伤排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少治理链路归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '审批旁路',
      '快照审计',
      '申诉闭环',
      '取证聚合',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：命中重判账、复检时长账、改判补偿账与次月复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 正文对照账：命中 8000；重判 4600 + 3400 = 8000，误伤率 42.5%（3400/8000）
    const bg = grab(/- \*\*命中\*\*：\*\*(\d+)\*\* 账号，全量自动封禁\n- \*\*重判\*\*：真实工作室 \*\*(\d+)\*\*，误伤 \*\*(\d+)\*\*——误伤率 \*\*([\d.]+)\*\*%/, '对照账')
    expect(Number(bg[2]) + Number(bg[3])).toBe(Number(bg[1]))
    expect((Number(bg[3]) / Number(bg[1])) * 100).toBeCloseTo(Number(bg[4]))
    // 围栏复检账：30 小时（D1 14:00 → D2 20:00，跨日算术成立）；分项与合计一致
    const fr = grab(/(\d+) 小时联合复检（D1 (\d{2}):(\d{2}) → D2 (\d{2}):(\d{2})）：(\d+) \+ (\d+) = (\d+)/, '围栏复检账')
    expect(24 - Number(fr[2]) + Number(fr[4])).toBe(Number(fr[1]))
    expect(Number(fr[6]) + Number(fr[7])).toBe(Number(fr[8]))
    expect(Number(fr[6])).toBe(Number(bg[2]))
    expect(Number(fr[7])).toBe(Number(bg[3]))
    expect(Number(fr[8])).toBe(Number(bg[1]))
    // 正文应急时间线：D1 14:00 启动 → D2 20:00 完成（30 小时），与围栏一致
    const tl = grab(/应急：\*\*D1 (\d{2})\*\*:\*\*(\d{2})\*\* 三方联合复检启动，\*\*D2 (\d{2})\*\*:\*\*(\d{2})\*\* 全量改判完成（\*\*(\d+)\*\* 小时）/, '应急时间线')
    expect(Number(tl[1])).toBe(Number(fr[2]))
    expect(Number(tl[3])).toBe(Number(fr[4]))
    expect(Number(tl[5])).toBe(Number(fr[1]))
    // 围栏申诉账：申诉 1200 只是误伤 3400 的自发暴露（1200 < 3400）；升级排单 2 天起
    const ap = grab(/申诉 (\d+) 单仅为误伤的自发暴露/, '围栏申诉账')
    expect(Number(ap[1])).toBe(1200)
    expect(Number(ap[1])).toBeLessThan(Number(bg[3]))
    expect(Number(grab(/升级研发排单 (\d+) 天起/, '排单账')[1])).toBeGreaterThanOrEqual(2)
    // 围栏改判账：解封 3400 与误伤一致；充值 900 ≥ 回收补偿 210
    const pa = grab(/解封 (\d+)（48 小时分批完成）；误伤中充值用户 (\d+)，资产已被批量回收的 (\d+) 人逐个补偿/, '围栏改判账')
    expect(Number(pa[1])).toBe(Number(bg[3]))
    expect(Number(pa[3])).toBeLessThanOrEqual(Number(pa[2]))
    // 正文解封账：误伤 3400 在 48 小时内
    const un = grab(/误伤 \*\*(\d+)\*\* 在 \*\*(\d+)\*\* 小时内分批解封/, '正文解封账')
    expect(Number(un[1])).toBe(Number(bg[3]))
    expect(Number(un[2])).toBe(48)
    // 次月复核账：命中 5200、误伤 250（4.8% = 250/5200）；单均 8 分钟；拦截 2 次
    const nm = grab(/命中 \*\*(\d+)\*\*、误伤 \*\*(\d+)\*\*（\*\*([\d.]+)\*\*%）/, '次月复核账')
    expect((Number(nm[2]) / Number(nm[1])) * 100).toBeCloseTo(Number(nm[3]), 1)
    expect(Number(nm[2]) / Number(nm[1])).toBeLessThan(Number(bg[3]) / Number(bg[1]))
    expect(Number(grab(/申诉单均处理 \*\*(\d+)\*\* 分钟/, '申诉时效')[1])).toBe(8)
    expect(Number(grab(/审批拦截当月触发 \*\*(\d+)\*\* 次/, '拦截次数')[1])).toBe(2)
    // 制度四步：GM 分层审批、快照、证据包、聚合接口
    for (const s of [
      '收进 GM 分层',
      '双人复核',
      '影响名单快照',
      '申诉证据包自动生成',
      '一次取齐',
    ]) {
      expect(sec.includes(s), `制度四步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：闭环五环、审计必答四问与场景五类、GM 分层三类与强写五要、客服取证六类、协同四环三局面、误区四条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内风控闭环恰好 5 条
    const sLoop = page.slice(page.indexOf('## 风控为什么不能只做检测'), page.indexOf('## 审计的目标不是留日志，而是能追责'))
    expect((sLoop.match(/^- /gm) || []).length).toBe(5)
    // 页内审计必答恰好 4 条、重要场景恰好 5 条
    const sAudit = page.slice(page.indexOf('## 审计的目标不是留日志，而是能追责'), page.indexOf('## GM 系统的本质是受控人工干预'))
    const sceneAt = sAudit.indexOf('审计特别重要的场景包括')
    expect((sAudit.slice(0, sceneAt).match(/^- /gm) || []).length).toBe(4)
    expect((sAudit.slice(sceneAt).match(/^- /gm) || []).length).toBe(5)
    // 页内 GM 分层恰好 3 条、强写要领恰好 5 条
    const sGm = page.slice(page.indexOf('## GM 系统的本质是受控人工干预'), page.indexOf('## 客服系统难在跨系统取证'))
    const strongAt = sGm.indexOf('最好具备')
    expect((sGm.slice(0, strongAt).match(/^- /gm) || []).length).toBe(3)
    expect((sGm.slice(strongAt).match(/^- /gm) || []).length).toBe(5)
    // 页内客服取证恰好 6 条
    const sCs = page.slice(page.indexOf('## 客服系统难在跨系统取证'), page.indexOf('## 风控、客服和审计为什么必须协同'))
    expect((sCs.match(/^- /gm) || []).length).toBe(6)
    // 页内协同问题链恰好 4 条、割裂局面恰好 3 条
    const sSy = page.slice(page.indexOf('## 风控、客服和审计为什么必须协同'), page.indexOf('## 常见错误'))
    const cutAt = sSy.indexOf('如果这些系统彼此割裂')
    expect((sSy.slice(0, cutAt).match(/^- /gm) || []).length).toBe(4)
    expect((sSy.slice(cutAt).match(/^- /gm) || []).length).toBe(3)
    // 本页常见错误为 4 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话可查
    for (const s of [
      '白名单与误伤控制',
      '玩家投诉后能否调证据、回放路径、恢复资产',
      '双人复核或高危审批',
      '限流和批量保护',
      '很多经典事故都来自“临时救急先给个超级管理员”',
      '只记“有人点了按钮”是不够的',
      '风控命中了，但客服解释不清楚为什么封禁',
      '客服承诺补偿了，但后台找不到精确资产回滚方法',
      '受控人工干预',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('白名单与误伤控制')).toBe(true)
    expect(sec.includes('玩家投诉后能否调证据、回放路径、恢复资产')).toBe(true)
    expect(sec.includes('双人复核或高危审批')).toBe(true)
    expect(sec.includes('限流和批量保护')).toBe(true)
    expect(sec.includes('很多经典事故都来自“临时救急先给个超级管理员”')).toBe(true)
    expect(sec.includes('只记“有人点了按钮”是不够的')).toBe(true)
    expect(sec.includes('风控命中了，但客服解释不清楚为什么封禁')).toBe(true)
    expect(sec.includes('客服承诺补偿了，但后台找不到精确资产回滚方法')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 风控为什么不能只做检测',
      '## 审计的目标不是留日志，而是能追责',
      '## GM 系统的本质是受控人工干预',
      '## 客服系统难在跨系统取证',
      '## 风控、客服和审计为什么必须协同',
      '## 常见错误',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/15-common-services')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
  })
})
