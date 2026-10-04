import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/server/services/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「服务拆了十四个，技能慢了三倍」的过度拆分排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('分布式混乱')
  expect(start, '第 6 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 server/services/01「服务拆了十四个，技能慢了三倍」的过度拆分排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少增量归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '拆分评审',
      '状态边界先行',
      '高频链路同域',
      '拆分成本账',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：时延对照账、跳数账、服务数账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 时延对照账：增量 85 = 130 − 45；130/45 ≈ 3 倍
    const single = grab(/P99 \*\*(\d+)\*\* 毫秒\n- \*\*拆分版\*\*：P99 \*\*(\d+)\*\* 毫秒，增量 \*\*(\d+)\*\* 毫秒/, '对照账')
    expect(Number(single[2]) - Number(single[1])).toBe(Number(single[3]))
    expect(Math.round(Number(single[2]) / Number(single[1]))).toBe(
      Number(grab(/接近 \*\*(\d+)\*\* 倍/, '倍数')[1]),
    )
    // 跳数账：3 跳 × 28 ≈ 84，与 prose「约 84 毫秒来自三跳串行」一致
    expect(sec.includes('一次技能释放串行 3 跳'), '围栏应有串行三跳').toBe(true)
    expect(sec.includes('每跳排队+调度+序列化 ≈ 28ms'), '围栏应有每跳成本').toBe(true)
    expect(sec.includes('3 跳叠加 ≈ 84ms'), '围栏应有跳数叠加').toBe(true)
    expect(Number(grab(/约 \*\*(\d+)\*\* 毫秒来自三跳串行/, '跳数增量')[1])).toBe(84)
    // 服务数账：14 → 9，合并 5
    const svc = grab(/服务数 \*\*(\d+)\*\* → \*\*(\d+)\*\*（合并 \*\*(\d+)\*\* 个实例态服务）/, '服务数账')
    expect(Number(svc[1]) - Number(svc[3])).toBe(Number(svc[2]))
    // 复核账：P99 130 → 48（下降），投诉 260 → 30（下降）；团队 25 人
    const re = grab(/P99 \*\*(\d+)\*\* → \*\*(\d+)\*\* 毫秒，投诉 \*\*(\d+)\*\* → \*\*(\d+)\*\* 单\/日/, '复核账')
    expect(Number(re[1])).toBe(Number(single[2]))
    expect(Number(re[2])).toBeLessThan(Number(re[1]))
    expect(Number(re[4])).toBeLessThan(Number(re[3]))
    expect(Number(grab(/\*\*(\d+)\*\* 人团队按微服务模板/, '团队规模')[1])).toBe(25)
  })

  it('声称对账：拆分四问、六项成本、三种思路、判断标准、拆分顺序与误区三类均与页内实况一致', () => {
    // 页内四问恰好 4 条
    const sQ = page.slice(page.indexOf('## 拆分之前先回答四个问题'), page.indexOf('## 常见拆分思路各自适合什么问题'))
    expect((sQ.match(/^### \d\. /gm) || []).length).toBe(4)
    // 页内拆分成本恰好 6 条
    const sCost = page.slice(page.indexOf('## 服务拆分真正增加了什么成本'), page.indexOf('## 一个更实用的判断标准'))
    expect((sCost.match(/^- /gm) || []).length).toBe(6)
    // 页内三种拆分思路 + 混合模式句
    for (const h of ['### 按玩法实例拆', '### 按世界或场景拆', '### 按领域能力拆']) {
      expect(page.includes(h), `页内缺少拆分思路「${h}」`).toBe(true)
    }
    expect(page.includes('实际项目里最常见的不是三选一，而是混合模式')).toBe(true)
    expect(sec.includes('按玩法实例拆')).toBe(true)
    // 页内判断标准恰好 5 条、拆分顺序恰好 3 步
    const sJudge = page.slice(page.indexOf('## 一个更实用的判断标准'), page.indexOf('## 更稳妥的拆分顺序'))
    expect((sJudge.match(/^- /gm) || []).length).toBe(5)
    const sOrder = page.slice(page.indexOf('## 更稳妥的拆分顺序'), page.indexOf('## 常见误区'))
    expect((sOrder.match(/^\d\. /gm) || []).length).toBe(3)
    // 常见误区三类（prose 体例），案例引用第一类
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    expect(sec.includes('把服务拆分理解成组织升级或技术升级')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      '技能释放、对象同步、位置更新、碰撞结算这类高频状态需要不断跨服务',
      '在同一个进程里高频协同',
      '把复杂度重新命名',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('把复杂度重新命名')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 先围绕状态画边界，不要先围绕菜单画边界',
      '## 拆分之前先回答四个问题',
      '### 3. 哪些状态绝不能跨服务高频抖动',
      '## 服务拆分真正增加了什么成本',
      '## 常见拆分思路各自适合什么问题',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/server/services')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(6)
    expect(pages).toContain('index.md')
  })
})
