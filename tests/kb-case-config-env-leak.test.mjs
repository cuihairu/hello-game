import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/12-versioning-release/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「测试表发进了生产，产出翻了十倍」的配置管线排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('让配置保持为可治理的数据，而不是变成没人敢碰的隐形代码')
  expect(start, '第 10 章 05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 12-versioning-release/05「测试表发进了生产，产出翻了十倍」的配置管线排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少配置账归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '环境隔离',
      '差异门禁',
      '血缘登记',
      '发布纪律',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：基线对照账、分渠合成账、围栏倍率账与超发折算账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 基线账：100 = 55 + 35 + 10
    const bg = grab(/- \*\*基线\*\*：日产出 \*\*(\d+)\*\* 万（日常 \*\*(\d+)\*\* \+ 副本 \*\*(\d+)\*\* \+ 活动 \*\*(\d+)\*\*）/, '基线账')
    expect(Number(bg[2]) + Number(bg[3]) + Number(bg[4])).toBe(Number(bg[1]))
    // 对照账：增量 315 = 415 − 100
    const cmp = grab(/- \*\*事故日\*\*：折算 \*\*(\d+)\*\* 万，增量 \*\*(\d+)\*\* 万/, '对照账')
    expect(Number(cmp[1]) - Number(bg[1])).toBe(Number(cmp[2]))
    // 围栏基线账与正文基线一致
    const fb = grab(/金币日产出 (\d+) 万：日常 (\d+) \+ 副本 (\d+) \+ 活动 (\d+)/, '围栏基线账')
    expect(Number(fb[1])).toBe(Number(bg[1]))
    expect(Number(fb[2])).toBe(Number(bg[2]))
    expect(Number(fb[3])).toBe(Number(bg[3]))
    expect(Number(fb[4])).toBe(Number(bg[4]))
    // 围栏异常账：55 + 350 + 10 = 415，增量 315 全在副本
    const fa = grab(/事故日折算 (\d+) 万：日常 (\d+) 持平 \+ 副本 (\d+) \+ 活动 (\d+) 持平，增量 (\d+) 全在副本/, '围栏异常账')
    expect(Number(fa[2]) + Number(fa[3]) + Number(fa[4])).toBe(Number(fa[1]))
    expect(Number(fa[1])).toBe(Number(cmp[1]))
    expect(Number(fa[5])).toBe(Number(cmp[2]))
    // 倍率账：副本 35 → 350 恰为 10 倍，与「掉落倍率 10」一致
    const fm = grab(/副本 (\d+) → (\d+) 恰为 (\d+) 倍/, '围栏倍率账')
    expect(Number(fm[1])).toBe(Number(bg[3]))
    expect(Number(fm[2])).toBe(Number(fa[3]))
    expect(Number(fm[2])).toBe(Number(fm[1]) * Number(fm[3]))
    expect(Number(grab(/「掉落倍率 (\d+)」/, '倍率值')[1])).toBe(Number(fm[3]))
    // 超发折算：315 万/日 × (5×60+20)/1440 = 70 万（围栏与正文两处一致）
    const fw = grab(/事故窗口 (\d+) 小时 (\d+) 分超发约 (\d+) 万/, '围栏窗口账')
    const over = (Number(cmp[2]) * (Number(fw[1]) * 60 + Number(fw[2]))) / 1440
    expect(Math.round(over)).toBe(Number(fw[3]))
    const pw = grab(/事故窗口 \*\*(\d+)\*\* 小时 \*\*(\d+)\*\* 分钟、按超发速率 \*\*(\d+)\*\* 万\/日折算超发约 \*\*(\d+)\*\* 万/, '正文窗口账')
    expect(Number(pw[1])).toBe(Number(fw[1]))
    expect(Number(pw[2])).toBe(Number(fw[2]))
    expect(Number(pw[3])).toBe(Number(cmp[2]))
    expect(Number(pw[4])).toBe(Number(fw[3]))
    // 时间线：10:00 发布、13:40 告警、15:20 回滚；告警到回滚 100 分钟；回滚生效 10 分钟
    expect(sec.includes('**10**:**00**'), '缺少发布时间').toBe(true)
    expect(sec.includes('**13**:**40**'), '缺少告警时间').toBe(true)
    expect(sec.includes('**15**:**20**'), '缺少回滚时间').toBe(true)
    expect(Number(grab(/告警到回滚生效 \*\*(\d+)\*\* 分钟/, '止血时长')[1])).toBeLessThan(320)
    expect(Number(grab(/平台回滚 (\d+) 分钟生效/, '回滚时长')[1])).toBeLessThan(Number(grab(/告警到回滚生效 \*\*(\d+)\*\* 分钟/, '止血时长')[1]))
    // 复核账：次日回落 100 万基线；差异门禁阈值 2 倍
    expect(Number(grab(/次日产出回落 \*\*(\d+)\*\* 万基线/, '复核账')[1])).toBe(Number(bg[1]))
    expect(Number(grab(/倍率类字段变化超过 \*\*(\d+)\*\* 倍/, '门禁阈值')[1])).toBe(2)
    // 制度四步：环境字段约束、diff 审批、血缘台账、显式环境选择
    for (const s of [
      'schema 增加「环境专用」字段约束',
      '强制二次审批',
      '入血缘台账',
      '禁止默认全环境',
    ]) {
      expect(sec.includes(s), `制度四步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：配置事故五表现、管线六件套、风险分层/血缘/半套语言/稳妥做法各四条与页内实况一致，案例引用页内原话可查', () => {
    // 页内配置事故表现恰好 5 条
    const sSym = page.slice(page.indexOf('## 为什么配置事故经常比代码事故更难处理'), page.indexOf('## 一条完整的配置管线真正包含什么'))
    expect((sSym.match(/^- /gm) || []).length).toBe(5)
    // 页内管线能力恰好 6 条
    const sPipe = page.slice(page.indexOf('## 一条完整的配置管线真正包含什么'), page.indexOf('## 为什么“能自由编辑”不是配置系统最重要的目标'))
    expect((sPipe.match(/^- /gm) || []).length).toBe(6)
    // 页内风险分层恰好 4 条
    const sRisk = page.slice(page.indexOf('## 为什么“能自由编辑”不是配置系统最重要的目标'), page.indexOf('## 配置血缘和审计为什么必须存在'))
    expect((sRisk.match(/^- /gm) || []).length).toBe(4)
    // 页内血缘四问恰好 4 条
    const sLine = page.slice(page.indexOf('## 配置血缘和审计为什么必须存在'), page.indexOf('## 为什么配置系统最容易悄悄长成“半套编程语言”'))
    expect((sLine.match(/^- /gm) || []).length).toBe(4)
    // 页内半套编程语言恰好 4 条
    const sDsl = page.slice(page.indexOf('## 为什么配置系统最容易悄悄长成“半套编程语言”'), page.indexOf('## 一个更稳妥的做法'))
    expect((sDsl.match(/^- /gm) || []).length).toBe(4)
    // 页内稳妥做法恰好 4 条
    const sSteady = page.slice(page.indexOf('## 一个更稳妥的做法'), page.indexOf('## 常见误区'))
    expect((sSteady.match(/^- /gm) || []).length).toBe(4)
    // 常见误区三类（prose 体例：首类作「最常见的错误」），案例引用第三类
    expect(page.includes('最常见的错误')).toBe(true)
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      '某些环境生效了，某些环境没有生效',
      '把配置发布视为正式版本活动，而不是“顺手发一下表”',
      '最终把高频变化暴露成高频事故',
      '让配置保持为可治理的数据，而不是变成没人敢碰的隐形代码',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('某些环境生效了，某些环境没有生效')).toBe(true)
    expect(sec.includes('把配置发布视为正式版本活动，而不是“顺手发一下表”')).toBe(true)
    expect(sec.includes('把高频变化暴露成高频事故')).toBe(true)
    expect(sec.includes('让配置保持为可治理的数据')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 为什么配置事故经常比代码事故更难处理',
      '## 一条完整的配置管线真正包含什么',
      '## 为什么“能自由编辑”不是配置系统最重要的目标',
      '## 配置血缘和审计为什么必须存在',
      '## 为什么配置系统最容易悄悄长成“半套编程语言”',
      '## 一个更稳妥的做法',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/12-versioning-release')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
  })
})
