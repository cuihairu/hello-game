import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/production/retro/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「两轮会定下的新引擎，量产期产能掉了六成」的选型复盘排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以收束段收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('过程留不住，选对了也说不清为什么对')
  expect(start, '第 18 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 production/retro/01「两轮会定下的新引擎，量产期产能掉了六成」的选型复盘排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少选型过程归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      '约束先行',
      '会议纪律',
      '决策记录',
      '渐进迁回',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内六节
    for (const name of [
      '先分清硬约束与软约束',
      '引擎选型真正在权衡什么',
      '用不可逆性决定论证投入',
      '选型会怎么开才不空转',
      '决策记录比结论更长寿',
      '什么时候值得换底座',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：产能账、人员账、记录账、应急账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景产能账：5 → 2，掉 60%（(5−2)/5）
    const bg = grab(/周产能从 \*\*(\d+)\*\* 个场景掉到 \*\*(\d+)\*\* 个（掉 \*\*(\d+)\*\*%）；关键岗位开放 \*\*(\d+)\*\* 个月，收 \*\*(\d+)\*\* 份简历里能上手引擎 B 的只有 \*\*(\d+)\*\* 份，到岗 \*\*(\d+)\*\* 人/, '背景产能人员账')
    expect(1 - Number(bg[2]) / Number(bg[1])).toBeCloseTo(Number(bg[3]) / 100)
    expect(Number(bg[6])).toBeLessThanOrEqual(Number(bg[5]))
    expect(Number(bg[7])).toBeLessThanOrEqual(Number(bg[6]))
    // 背景欠账：2 轮会、约束 0 页、材料 0 份、切片 0 次、记录 0 份
    const debt = grab(/选型会开 \*\*(\d+)\*\* 轮就定了社区热度高、跑分漂亮的引擎 B——硬约束清单 \*\*(\d+)\*\* 页、候选对比材料 \*\*(\d+)\*\* 份、垂直切片 \*\*(\d+)\*\* 次，决策记录也 \*\*(\d+)\*\* 份/, '背景欠账')
    expect(Number(debt[2])).toBe(0)
    expect(Number(debt[3])).toBe(0)
    expect(Number(debt[4])).toBe(0)
    expect(Number(debt[5])).toBe(0)
    // 第一步两笔与背景一致
    expect(Number(grab(/选型会 \*\*(\d+)\*\* 轮定案，验证任务 \*\*(\d+)\*\* 项/, '第一步欠账')[1])).toBe(Number(debt[1]))
    expect(Number(grab(/选型会 \*\*(\d+)\*\* 轮定案，验证任务 \*\*(\d+)\*\* 项/, '第一步欠账')[2])).toBe(0)
    const due = grab(/周产能 \*\*(\d+)\*\* → \*\*(\d+)\*\*（掉 \*\*(\d+)\*\*%）；招人 \*\*(\d+)\*\* 个月到岗 \*\*(\d+)\*\* 人/, '第一步到期账')
    expect(Number(due[1])).toBe(Number(bg[1]))
    expect(Number(due[2])).toBe(Number(bg[2]))
    expect(Number(due[3])).toBe(Number(bg[3]))
    expect(Number(due[4])).toBe(Number(bg[4]))
    expect(Number(due[5])).toBe(Number(bg[7]))
    // 围栏产能账：9 步手工、装配 2 天、5 → 2 掉 60%，与背景逐项一致
    const fp = grab(/美术入库 (\d+) 步手工、单场景装配 (\d+) 天，周产能 (\d+) → (\d+) 个场景（掉 (\d+)%）/, '围栏产能账')
    expect(Number(fp[1])).toBe(Number(grab(/美术资源入库要 \*\*(\d+)\*\* 步手工，单场景装配 \*\*(\d+)\*\* 天/, '背景管线')[1]))
    expect(Number(fp[2])).toBe(Number(grab(/美术资源入库要 \*\*(\d+)\*\* 步手工，单场景装配 \*\*(\d+)\*\* 天/, '背景管线')[2]))
    expect(Number(fp[3])).toBe(Number(bg[1]))
    expect(Number(fp[4])).toBe(Number(bg[2]))
    expect(Number(fp[5])).toBe(Number(bg[3]))
    // 围栏人员账与记录账：与背景一致
    const fs = grab(/关键岗位开放 (\d+) 个月：简历 (\d+) 份、能上手 (\d+) 份、到岗 (\d+) 人/, '围栏人员账')
    expect(Number(fs[1])).toBe(Number(bg[4]))
    expect(Number(fs[2])).toBe(Number(bg[5]))
    expect(Number(fs[3])).toBe(Number(bg[6]))
    expect(Number(fs[4])).toBe(Number(bg[7]))
    expect(Number(grab(/决策记录 (\d+) 份，同一争论半年重开 (\d+) 次/, '围栏记录账')[2])).toBe(Number(grab(/同一场争论半年内重开 \*\*(\d+)\*\* 次/, '背景重开')[1]))
    // 围栏收束账：60% 产能、3 个月 1 人、半年 3 次，均与正文一致
    expect(Number(grab(/\*\*(\d+)\*\*% 的产能是管线账，\*\*(\d+)\*\* 个月 \*\*(\d+)\*\* 人是生态账，半年 \*\*(\d+)\*\* 次重开/, '收束账')[1])).toBe(Number(bg[3]))
    expect(Number(grab(/\*\*(\d+)\*\*% 的产能是管线账，\*\*(\d+)\*\* 个月 \*\*(\d+)\*\* 人是生态账，半年 \*\*(\d+)\*\* 次重开/, '收束账')[2])).toBe(Number(bg[4]))
    expect(Number(grab(/\*\*(\d+)\*\*% 的产能是管线账，\*\*(\d+)\*\* 个月 \*\*(\d+)\*\* 人是生态账，半年 \*\*(\d+)\*\* 次重开/, '收束账')[3])).toBe(Number(bg[7]))
    expect(Number(grab(/\*\*(\d+)\*\*% 的产能是管线账，\*\*(\d+)\*\* 个月 \*\*(\d+)\*\* 人是生态账，半年 \*\*(\d+)\*\* 次重开/, '收束账')[4])).toBe(Number(grab(/同一场争论半年内重开 \*\*(\d+)\*\* 次/, '背景重开')[1]))
    // 第三步：引擎 2 轮会 0 切片 vs 可逆的状态管理库吵 2 周——不可逆论证反而少
    const irr = grab(/论证却只有 \*\*(\d+)\*\* 轮会、\*\*(\d+)\*\* 次切片；同一季度团队为一把可逆的状态管理库吵了 \*\*(\d+)\*\* 周/, '不可逆论证')
    expect(Number(irr[1])).toBe(Number(debt[1]))
    expect(Number(irr[2])).toBe(0)
    expect(Number(irr[3])).toBeGreaterThan(Number(irr[1]))
    // 应急账：2 人 5 天收敛 9 步 → 1 键；装配 2 → 0.5 天；产能回到背景基线 5
    const fix = grab(/\*\*(\d+)\*\* 人 \*\*(\d+)\*\* 天把 \*\*(\d+)\*\* 步手工入库收敛成 \*\*(\d+)\*\* 键导入脚本，单场景装配从 \*\*(\d+)\*\* 天压到 \*\*([\d.]+)\*\* 天，周产能从 \*\*(\d+)\*\* 个回到 \*\*(\d+)\*\* 个/, '应急止血')
    expect(Number(fix[3])).toBeGreaterThan(Number(fix[4]))
    expect(Number(fix[5])).toBeGreaterThan(Number(fix[6]))
    expect(Number(fix[7])).toBe(Number(bg[2]))
    expect(Number(fix[8])).toBe(Number(bg[1]))
    expect(Number(grab(/平台匹配度与生态招人 \*\*(\d+)\*\* 项亮红/, '打分亮红')[1])).toBeLessThanOrEqual(5)
    // 中期迁移：分 2 个版本周期迁回
    expect(Number(grab(/按维护节奏分 \*\*(\d+)\*\* 个版本周期迁回/, '迁移周期')[1])).toBeGreaterThan(0)
    // 复核账：5/5 齐备、1 轮定案、验证 2/2、记录 1 份 30 分钟、重开 0 次
    expect(Number(grab(/硬约束清单 \*\*(\d+)\*\*\/\*\*(\d+)\*\* 齐备/, '复核约束')[1])).toBe(5)
    expect(Number(grab(/选型会 \*\*(\d+)\*\* 轮定案，会后验证任务 \*\*(\d+)\*\* 项按期回报 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '复核会议')[1])).toBeLessThan(Number(debt[1]))
    expect(Number(grab(/选型会 \*\*(\d+)\*\* 轮定案，会后验证任务 \*\*(\d+)\*\* 项按期回报 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '复核会议')[3])).toBe(Number(grab(/选型会 \*\*(\d+)\*\* 轮定案，会后验证任务 \*\*(\d+)\*\* 项按期回报 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '复核会议')[2]))
    expect(Number(grab(/决策记录 \*\*(\d+)\*\* 份入库、新成员 \*\*(\d+)\*\* 分钟读懂/, '复核记录')[1])).toBe(1)
    expect(Number(grab(/同一争论重开 \*\*(\d+)\*\* 次/, '复核重开')[1])).toBe(0)
    // 教训回扣：60%、3 个月 1 人、2 个版本周期、3 次重开均与正文一致
    const l2 = grab(/\*\*(\d+)\*\* 轮会省下的论证，换成掉 \*\*(\d+)\*\*% 的产能、\*\*(\d+)\*\* 个月 \*\*(\d+)\*\* 个人和 \*\*(\d+)\*\* 个版本周期的迁移/, '教训二')
    expect(Number(l2[1])).toBe(Number(debt[1]))
    expect(Number(l2[2])).toBe(Number(bg[3]))
    expect(Number(l2[3])).toBe(Number(bg[4]))
    expect(Number(l2[4])).toBe(Number(bg[7]))
    expect(Number(l2[5])).toBeGreaterThan(0)
    expect(Number(grab(/\*\*0\*\* 份记录让同一场争论半年重开 \*\*(\d+)\*\* 次/, '教训三')[1])).toBe(Number(grab(/同一场争论半年内重开 \*\*(\d+)\*\* 次/, '背景重开')[1]))
  })

  it('声称对账：硬软约束各一条、引擎权衡六条、服务端语言五条、不可逆三档、会议纪律四条、决策记录三条、换底座信号四条与常见误区六条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内「先分清硬约束与软约束」恰好 2 条
    const sCon = page.slice(page.indexOf('## 先分清硬约束与软约束'), page.indexOf('## 引擎选型真正在权衡什么'))
    expect((sCon.match(/^- /gm) || []).length).toBe(2)
    // 页内「引擎选型真正在权衡什么」恰好 6 条
    const sEng = page.slice(page.indexOf('## 引擎选型真正在权衡什么'), page.indexOf('## 服务端语言的权衡逻辑不太一样'))
    expect((sEng.match(/^- /gm) || []).length).toBe(6)
    // 页内「服务端语言的权衡逻辑」恰好 5 条
    const sLang = page.slice(page.indexOf('## 服务端语言的权衡逻辑不太一样'), page.indexOf('## 用不可逆性决定论证投入'))
    expect((sLang.match(/^- /gm) || []).length).toBe(5)
    // 页内「用不可逆性决定论证投入」恰好 3 条
    const sIrr = page.slice(page.indexOf('## 用不可逆性决定论证投入'), page.indexOf('## 选型会怎么开才不空转'))
    expect((sIrr.match(/^- /gm) || []).length).toBe(3)
    // 页内「选型会怎么开才不空转」恰好 4 条
    const sMeet = page.slice(page.indexOf('## 选型会怎么开才不空转'), page.indexOf('## 决策记录比结论更长寿'))
    expect((sMeet.match(/^- /gm) || []).length).toBe(4)
    // 页内「决策记录比结论更长寿」恰好 3 条
    const sRec = page.slice(page.indexOf('## 决策记录比结论更长寿'), page.indexOf('## 什么时候值得换底座'))
    expect((sRec.match(/^- /gm) || []).length).toBe(3)
    // 页内「什么时候值得换底座」恰好 4 条
    const sSwitch = page.slice(page.indexOf('## 什么时候值得换底座'), page.indexOf('## 常见误区'))
    expect((sSwitch.match(/^- /gm) || []).length).toBe(4)
    // 本页常见误区为 6 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '硬约束：目标平台、品类对实时性的要求、团队现有技能结构、发布周期、商业与合规条款',
      '直接从方案清单里挑顺眼的，而不是先把项目自己的约束写清楚',
      '选型会上很多看似技术性的分歧，本质是一方拿着硬约束、另一方拿着软约束在互相说服',
      '用软约束去说服硬约束，比如为了技术先进性牺牲平台匹配度',
      '引擎选型失败的案例，绝大多数不是输在跑分，而是输在内容管线卡产能、关键岗位长期招不到人，或者商业条款中途变化',
      '原型阶段感觉不到这些问题，量产期会集中爆发，而那时候再换的代价已经完全不同',
      '一旦铺开极难回头，通常值得做原型验证和正式评审',
      '对不可逆的决策投入的论证时间，反而少于对可逆决策的争论',
      '拿参数表和跑分做决策，忽略内容管线、招人和商业条款这些长期变量',
      '选型做完不留决策记录，几年后同样的争论再演一遍',
      '被动更换比主动更换危险得多，因为时间表不在自己手里',
      '一次性重写最容易被低估的成本，是同时失去了旧系统里所有已经修好的暗坑',
      '约束清单和候选材料提前发出，会上不带未读材料发言',
      '每个候选指定一位熟悉者陈述，并且要求讲清它不擅长什么',
      '当时的硬约束是什么，哪些候选被考虑过',
      '每个候选为什么被否，放弃了哪些好处',
      '当初预期会出现什么问题，打算怎么观察',
      '用熟悉的引擎稳定做出七十分产品，往往好过用陌生引擎冲击九十分',
      '过程留得住，选错了还来得及纠正；过程留不住，选对了也说不清为什么对',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 先分清硬约束与软约束',
      '## 引擎选型真正在权衡什么',
      '## 用不可逆性决定论证投入',
      '## 选型会怎么开才不空转',
      '## 决策记录比结论更长寿',
      '## 什么时候值得换底座',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/production/retro')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
  })
})
