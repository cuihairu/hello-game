import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/20-security-compliance/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「单局代币客户端说了算，4 天刷出 7680 万」的结算权威排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以收束段收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('而是当攻击和作弊出现时，系统能否把最贵、最关键、最影响公平和资产的那条链路稳住')
  expect(start, '第 17 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 20-security-compliance/01「单局代币客户端说了算，4 天刷出 7680 万」的结算权威排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少反作弊五层归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      '权威收权',
      '安全壳重定位',
      '识别层补位',
      '处置闭环',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内六节
    for (const name of [
      '为什么游戏安全离不开反作弊',
      '客户端永远不可信，但也不能完全放弃客户端',
      '更重要的是把权威判断放对位置',
      '反作弊不是只有外挂检测',
      '常见建设方式与代价',
      '常见错误',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：产出账、存量账、回收账、频控账与演练账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景上限账：上限 120 只在客户端生效，脚本报 1200 = 120 × 10
    const cap = grab(/单局代币上限 \*\*(\d+)\*\*，但这个上限只在客户端生效/, '背景上限')
    const rep = grab(/脚本把单局成绩报成 \*\*(\d+)\*\*（上限的 \*\*(\d+)\*\* 倍）、日均 \*\*(\d+)\*\* 局，单号日产 \*\*(\d+)\*\* 万，是真人头部玩家约 \*\*(\d+)\*\* 万日产的 \*\*(\d+)\*\* 倍/, '背景产出账')
    expect(Number(rep[1])).toBe(Number(cap[1]) * Number(rep[2]))
    expect(Number(rep[3]) * Number(rep[1])).toBe(Number(rep[4]) * 10000)
    expect(Number(rep[4]) / Number(rep[5])).toBe(Number(rep[6]))
    // 背景存量账：80 号 × 24 万 × 4 天 = 7680 万；兑券 7680 / 240 = 32 万张
    const bg = grab(/\*\*(\d+)\*\* 个号 × \*\*(\d+)\*\* 万 × \*\*(\d+)\*\* 天，累计刷出 \*\*(\d+)\*\* 万代币，兑成 \*\*(\d+)\*\* 万张抽奖券、已开 \*\*(\d+)\*\* 万张/, '背景存量账')
    expect(Number(bg[1]) * Number(bg[2]) * Number(bg[3])).toBe(Number(bg[4]))
    expect(Number(bg[2])).toBe(Number(rep[4]))
    const rate = grab(/（\*\*(\d+)\*\* 代币兑 \*\*1\*\* 张）/, '兑券汇率')
    expect(Number(bg[4]) / Number(rate[1])).toBe(Number(bg[5]))
    expect(Number(bg[5]) - Number(bg[6])).toBe(Number(grab(/已开 \*\*(\d+)\*\* 万张、待冻结 \*\*(\d+)\*\* 万张/, '待冻结券')[2]))
    // 第一步两笔与背景逐项一致
    const s1 = grab(/单号日产 \*\*(\d+)\*\* 万 = \*\*(\d+)\*\* 局 × \*\*(\d+)\*\*\/局——上报值是上限 \*\*(\d+)\*\* 的 \*\*(\d+)\*\* 倍、真人头部 \*\*(\d+)\*\* 万的 \*\*(\d+)\*\* 倍/, '第一步产出')
    expect(Number(s1[1])).toBe(Number(rep[4]))
    expect(Number(s1[2])).toBe(Number(rep[3]))
    expect(Number(s1[3])).toBe(Number(rep[1]))
    expect(Number(s1[4])).toBe(Number(cap[1]))
    expect(Number(s1[5])).toBe(Number(rep[2]))
    expect(Number(s1[6])).toBe(Number(rep[5]))
    expect(Number(s1[7])).toBe(Number(rep[6]))
    const s2 = grab(/\*\*(\d+)\*\* 个号 × \*\*(\d+)\*\* 万 × \*\*(\d+)\*\* 天 = \*\*(\d+)\*\* 万代币 = \*\*(\d+)\*\* 万张券，已开 \*\*(\d+)\*\* 万张、待冻结 \*\*(\d+)\*\* 万张/, '第一步存量')
    for (let i = 1; i <= 6; i++) expect(Number(s2[i])).toBe(Number(bg[i]))
    expect(Number(s2[7])).toBe(Number(grab(/待冻结 \*\*(\d+)\*\* 万张/, '第一步待冻结')[1]))
    // 围栏账：权威账 1200/120、识别账 100/80、处置账 32/3 与正文一致
    expect(Number(grab(/单局代币客户端上报 (\d+)（上限 (\d+)）/, '围栏权威账')[1])).toBe(Number(rep[1]))
    expect(Number(grab(/单局代币客户端上报 (\d+)（上限 (\d+)）/, '围栏权威账')[2])).toBe(Number(cap[1]))
    expect(Number(grab(/前 100 名里 (\d+) 个号行为同源，靠人工比对才圈出/, '围栏识别账')[1])).toBe(Number(bg[1]))
    const fk = grab(/(\d+) 万张券只冻住 (\d+) 万张/, '围栏处置账')
    expect(Number(fk[1])).toBe(Number(bg[5]))
    expect(Number(fk[2])).toBe(Number(grab(/待冻结 \*\*(\d+)\*\* 万张/, '第一步待冻结')[1]))
    // 应急账：按上限 120 结 = 缩 1200/120 = 10 倍；回收 11 + 已耗 18 = 已开 29；外观 950 + 250 = 1200
    expect(Number(grab(/按上限 \*\*(\d+)\*\* 结（缩 \*\*(\d+)\*\* 倍）/, '应急缩倍')[2]))
      .toBe(Number(rep[1]) / Number(cap[1]))
    const rc = grab(/回收未消耗 \*\*(\d+)\*\* 万张、已消耗 \*\*(\d+)\*\* 万张/, '应急券回收')
    expect(Number(rc[1]) + Number(rc[2])).toBe(Number(bg[6]))
    expect(Number(grab(/限定外观 \*\*(\d+)\*\* 个回收未绑定 \*\*(\d+)\*\* 个、深度绑定 \*\*(\d+)\*\* 个/, '应急外观')[1]))
      .toBe(Number(grab(/开出的限定外观 \*\*(\d+)\*\* 个部分已挂上交易行/, '背景外观')[1]))
    expect(Number(grab(/限定外观 \*\*(\d+)\*\* 个回收未绑定 \*\*(\d+)\*\* 个、深度绑定 \*\*(\d+)\*\* 个/, '应急外观')[2]))
      .toBe(Number(grab(/限定外观 \*\*(\d+)\*\* 个回收未绑定 \*\*(\d+)\*\* 个、深度绑定 \*\*(\d+)\*\* 个/, '应急外观')[1]) - Number(grab(/限定外观 \*\*(\d+)\*\* 个回收未绑定 \*\*(\d+)\*\* 个、深度绑定 \*\*(\d+)\*\* 个/, '应急外观')[3]))
    // 封禁与观察：80 全封 + 同簇 600 观察、37 坐实不超观察池
    expect(Number(grab(/\*\*(\d+)\*\* 个同源号全封，同簇疑似 \*\*(\d+)\*\* 个号转标记观察（其中 \*\*(\d+)\*\* 个后续坐实/, '封禁观察')[1])).toBe(Number(bg[1]))
    expect(Number(grab(/\*\*(\d+)\*\* 个同源号全封，同簇疑似 \*\*(\d+)\*\* 个号转标记观察（其中 \*\*(\d+)\*\* 个后续坐实/, '封禁观察')[3]))
      .toBeLessThan(Number(grab(/\*\*(\d+)\*\* 个同源号全封，同簇疑似 \*\*(\d+)\*\* 个号转标记观察（其中 \*\*(\d+)\*\* 个后续坐实/, '封禁观察')[2]))
    // 制度三步：频控 2 万 = 真人头部 1 万 × 2；自动圈 74 + 复核 6 = 80；处罚 4 级、申诉 72 小时
    expect(Number(grab(/单号日产设 \*\*(\d+)\*\* 万频控上限（真人头部 \*\*(\d+)\*\* 万的 \*\*(\d+)\*\* 倍）/, '频控账')[1]))
      .toBe(Number(grab(/单号日产设 \*\*(\d+)\*\* 万频控上限（真人头部 \*\*(\d+)\*\* 万的 \*\*(\d+)\*\* 倍）/, '频控账')[2]) * Number(grab(/单号日产设 \*\*(\d+)\*\* 万频控上限（真人头部 \*\*(\d+)\*\* 万的 \*\*(\d+)\*\* 倍）/, '频控账')[3]))
    expect(Number(grab(/超真人均值 \*\*(\d+)\*\* 倍自动标记/, '异常标记')[1])).toBe(Number(rep[2]))
    const au = grab(/人工圈 \*\*(\d+)\*\* 个变成自动圈 \*\*(\d+)\*\* 个（剩 \*\*(\d+)\*\* 个复核补齐）/, '自动圈号')
    expect(Number(au[1])).toBe(Number(bg[1]))
    expect(Number(au[2]) + Number(au[3])).toBe(Number(bg[1]))
    expect(Number(grab(/处罚分限流、禁赛、封禁、回收 \*\*(\d+)\*\* 级，申诉通道 \*\*(\d+)\*\* 条（\*\*(\d+)\*\* 小时响应）/, '处罚申诉')[1])).toBe(4)
    // 复核演练账：20 个模拟号拦 20/20、留痕 20/20、申诉 5/5
    const rv = grab(/演练 \*\*(\d+)\*\* 个模拟号全部上报 \*\*(\d+)\*\*，频控与异常校验当日拦下 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '演练拦截')
    expect(Number(rv[3])).toBe(Number(rv[1]))
    expect(Number(rv[4])).toBe(Number(rv[1]))
    expect(Number(rv[2])).toBe(Number(rep[1]))
    expect(Number(grab(/全流程演练 \*\*(\d+)\*\* 分钟、处置留痕 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '演练留痕')[2])).toBe(Number(rv[1]))
    expect(Number(grab(/演练申诉 \*\*(\d+)\*\* 件 \*\*(\d+)\*\* 小时内答复 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '演练申诉')[3])).toBe(Number(grab(/演练申诉 \*\*(\d+)\*\* 件 \*\*(\d+)\*\* 小时内答复 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '演练申诉')[1]))
    expect(Number(grab(/演练申诉 \*\*(\d+)\*\* 件 \*\*(\d+)\*\* 小时内答复 \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '演练申诉')[2])).toBe(72)
    // 教训回扣：打勾 1、1200、80 号 24 倍 4 天 7680 万、32/3 均与正文一致
    expect(Number(grab(/打勾 \*\*(\d+)\*\* 项之后，\*\*(\d+)\*\* 的单照单全收/, '教训一')[1])).toBe(Number(grab(/上线验收里安全项打勾 \*\*(\d+)\*\* 项/, '背景打勾')[1]))
    expect(Number(grab(/打勾 \*\*(\d+)\*\* 项之后，\*\*(\d+)\*\* 的单照单全收/, '教训一')[2])).toBe(Number(rep[1]))
    const ls = grab(/都是 \*\*(\d+)\*\* 个号 \*\*(\d+)\*\* 倍产出的提款窗口，\*\*(\d+)\*\* 天刷出 \*\*(\d+)\*\* 万/, '教训二')
    expect(Number(ls[1])).toBe(Number(bg[1]))
    expect(Number(ls[2])).toBe(Number(rep[6]))
    expect(Number(ls[3])).toBe(Number(bg[3]))
    expect(Number(ls[4])).toBe(Number(bg[4]))
    const lt = grab(/\*\*(\d+)\*\* 万张券只冻住 \*\*(\d+)\*\* 万张/, '教训三')
    expect(Number(lt[1])).toBe(Number(bg[5]))
    expect(Number(lt[2])).toBe(Number(fk[2]))
  })

  it('声称对账：反作弊动因四条、客户端作用两条、权威关键状态四条与做法三条、滥用五条五层五条、常见错误四条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内「为什么游戏安全离不开反作弊」恰好 4 条
    const sWhy = page.slice(page.indexOf('## 为什么游戏安全离不开反作弊'), page.indexOf('## 客户端永远不可信，但也不能完全放弃客户端'))
    expect((sWhy.match(/^- /gm) || []).length).toBe(4)
    // 页内「客户端永远不可信」恰好 2 条
    const sCli = page.slice(page.indexOf('## 客户端永远不可信，但也不能完全放弃客户端'), page.indexOf('## 更重要的是把权威判断放对位置'))
    expect((sCli.match(/^- /gm) || []).length).toBe(2)
    // 页内「更重要的是把权威判断放对位置」关键状态 4 条 + 做法 3 条 = 7 条
    const sAuth = page.slice(page.indexOf('## 更重要的是把权威判断放对位置'), page.indexOf('## 反作弊不是只有外挂检测'))
    expect((sAuth.match(/^- /gm) || []).length).toBe(7)
    // 页内「反作弊不是只有外挂检测」滥用 5 条 + 分层 5 条 = 10 条
    const sCheat = page.slice(page.indexOf('## 反作弊不是只有外挂检测'), page.indexOf('## 常见建设方式与代价'))
    expect((sCheat.match(/^- /gm) || []).length).toBe(10)
    // 页内「常见建设方式与代价」为纯段落体例（三个小节均无 bullet 列表）
    expect((page.slice(page.indexOf('## 常见建设方式与代价'), page.indexOf('## 常见错误')).match(/^- /gm) || []).length).toBe(0)
    // 本页常见错误为 4 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见错误'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '客户端可以被篡改、调试、注入、抓包、回放、加速、模拟和批量控制',
      '提高攻击门槛，让低成本脚本和批量工作室难以规模化',
      '为服务端风控提供更多环境信号',
      '只依赖壳、加密和反调试，通常只能挡住最表层的攻击',
      '由服务端掌握最终结算和关键状态变化权',
      '对来自客户端的输入只接受“意图”或“候选动作”，而不是直接接受结果',
      '对高价值操作建立幂等、频率限制和异常行为校验',
      '利用配置漏洞、补偿漏洞和活动规则漏洞刷资源',
      '群控设备刷活跃、刷邀请、刷广告收益',
      '只有做到最后一层，反作弊才真正形成治理能力',
      '它不可能理解你的玩法规则、经济逻辑和资产风险',
      '只能作为基础门槛，不能替代核心校验',
      '把高频信号、处罚策略、审计链路和人工复核平台做成统一能力',
      '系统能否把最贵、最关键、最影响公平和资产的那条链路稳住',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 为什么游戏安全离不开反作弊',
      '## 客户端永远不可信，但也不能完全放弃客户端',
      '## 更重要的是把权威判断放对位置',
      '## 反作弊不是只有外挂检测',
      '## 常见建设方式与代价',
      '## 常见错误',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/20-security-compliance')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
  })
})
