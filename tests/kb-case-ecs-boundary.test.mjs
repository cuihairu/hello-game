import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「重构三个月，帧率没救回来」的 ECS 边界排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最后只是把复杂度拆成了更多层')
  expect(start, '第 8 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/04「重构三个月，帧率没救回来」的 ECS 边界排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少帧耗归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '热点先行',
      '边界登记',
      '抽象层审计',
      '重构止损',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：重构对照账、帧耗占比账、围栏热点账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景账：同屏 200 单位、重构前 P95 18ms（60FPS 预算 16.6ms）
    const bg = grab(/同屏 \*\*(\d+)\*\* 单位时帧耗时 P95 \*\*(\d+)\*\* 毫秒/, '背景帧耗账')
    expect(Number(bg[1])).toBe(200)
    expect(Number(bg[2])).toBe(18)
    // 投入账：3 个月迁 5 个系统
    const inv = grab(/投入 \*\*(\d+)\*\* 个月把移动、寻路、状态机等 \*\*(\d+)\*\* 个系统迁入 ECS/, '重构投入账')
    expect(Number(inv[1])).toBe(3)
    expect(Number(inv[2])).toBe(5)
    // 对照账：增量 3 = 21 − 18
    const cmp = grab(/- \*\*重构前\*\*：P95 \*\*(\d+)\*\* 毫秒\n- \*\*重构后\*\*：P95 \*\*(\d+)\*\* 毫秒，增量 \*\*(\d+)\*\* 毫秒/, '对照账')
    expect(Number(cmp[1])).toBe(Number(bg[2]))
    expect(Number(cmp[2]) - Number(cmp[1])).toBe(Number(cmp[3]))
    // 占比账：4/21 ≈ 19%，15/21 ≈ 71%；拷贝 2ms 纯新增
    const ecsShare = grab(/只占帧耗 \*\*(\d+)\*\* 毫秒（约 \*\*(\d+)\*\*%）/, 'ECS 占比账')
    expect(Math.round((Number(ecsShare[1]) / Number(cmp[2])) * 100)).toBe(Number(ecsShare[2]))
    const hot = grab(/表现层 \*\*(\d+)\*\* 毫秒（约 \*\*(\d+)\*\*%）/, '表现层占比账')
    expect(Math.round((Number(hot[1]) / Number(cmp[2])) * 100)).toBe(Number(hot[2]))
    const copy = Number(grab(/跨层快照拷贝 \*\*(\d+)\*\* 毫秒是纯新增成本/, '拷贝账')[1])
    expect(copy).toBe(2)
    // 围栏数字为纯文本：热点账逐项与合计一致
    const fenceEcs = Number(sec.match(/系统更新合计 (\d+)ms/)[1])
    expect(fenceEcs).toBe(Number(ecsShare[1]))
    const fenceHot = sec.match(/动画评估 (\d+)ms \+ 特效 tick (\d+)ms \+ UI 刷新 (\d+)ms/)
    expect(Number(fenceHot[1]) + Number(fenceHot[2]) + Number(fenceHot[3])).toBe(Number(hot[1]))
    expect(Number(sec.match(/状态快照 (\d+)ms/)[1])).toBe(copy)
    expect(sec.includes(`4ms + 15ms + 2ms = ${Number(cmp[2])}ms`), '围栏应有时间总账').toBe(true)
    expect(sec.includes(`比重构前 ${Number(cmp[1])}ms 还多 ${Number(cmp[3])}ms`), '围栏应有增量对照').toBe(true)
    // 复核账：21 → 13ms（低于重构前 18 与 16.6ms 预算），同屏 200 → 400 稳 60FPS
    const re = grab(/复核：帧耗 P95 \*\*(\d+)\*\* → \*\*(\d+)\*\* 毫秒（低于重构前的 \*\*(\d+)\*\*），同屏 \*\*(\d+)\*\* → \*\*(\d+)\*\* 单位稳定 \*\*(\d+)\*\* FPS/, '复核账')
    expect(Number(re[1])).toBe(Number(cmp[2]))
    expect(Number(re[2])).toBeLessThan(Number(re[3]))
    expect(Number(re[2])).toBeLessThan(17)
    expect(Number(re[4])).toBe(Number(bg[1]))
    expect(Number(re[5])).toBeGreaterThan(Number(re[4]))
    expect(Number(re[6])).toBe(60)
  })

  it('声称对账：脚本层动因与代价、ECS 动因、两层适配、边界四问三后果与误区三类均与页内实况一致', () => {
    // 页内脚本层动因恰好 4 条、代价恰好 4 条
    const sWhy = page.slice(page.indexOf('## 为什么脚本层会反复出现'), page.indexOf('## 为什么 ECS 会被拿出来讨论'))
    const whyAt = sWhy.indexOf('但脚本层不是白送收益')
    expect((sWhy.slice(0, whyAt).match(/^- /gm) || []).length).toBe(4)
    expect((sWhy.slice(whyAt).match(/^- /gm) || []).length).toBe(4)
    // 页内 ECS 讨论动因恰好 4 条
    const sEcs = page.slice(page.indexOf('## 为什么 ECS 会被拿出来讨论'), page.indexOf('## 脚本层和 ECS 不该被当成同一件武器'))
    expect((sEcs.match(/^- /gm) || []).length).toBe(4)
    // 页内脚本/ECS 适配场景各恰好 4 条
    const sFit = page.slice(page.indexOf('## 脚本层和 ECS 不该被当成同一件武器'), page.indexOf('## 真正难的是边界，而不是接入'))
    const fitAt = sFit.indexOf('ECS 更适合解决这些问题')
    expect((sFit.slice(0, fitAt).match(/^- /gm) || []).length).toBe(4)
    expect((sFit.slice(fitAt).match(/^- /gm) || []).length).toBe(4)
    // 页内边界四问恰好 4 条、边界没划清后果恰好 3 条
    const sB = page.slice(page.indexOf('## 真正难的是边界，而不是接入'), page.indexOf('## 一个更稳妥的落地方式'))
    const bAt = sB.indexOf('边界没划清时')
    expect((sB.slice(0, bAt).match(/^- /gm) || []).length).toBe(4)
    expect((sB.slice(bAt).match(/^- /gm) || []).length).toBe(3)
    // 页内稳妥落地恰好 3 条
    const sSteady = page.slice(page.indexOf('## 一个更稳妥的落地方式'), page.indexOf('## 常见误区'))
    expect((sSteady.match(/^- /gm) || []).length).toBe(3)
    // 常见误区三类（prose 体例），案例引用第二类与第三类
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      'ECS 是否真的覆盖了高频路径，而不是只增加抽象层',
      'ECS 只包住表面结构，热点仍然在老路径里',
      '强推不适合的模块改造',
      '最后只是把复杂度拆成了更多层',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('ECS 只包住表面结构')).toBe(true)
    expect(sec.includes('强推不适合的模块改造')).toBe(true)
    expect(sec.includes('只增加抽象层')).toBe(true)
    expect(sec.includes('最后只是把复杂度拆成了更多层')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 为什么 ECS 会被拿出来讨论',
      '## 脚本层和 ECS 不该被当成同一件武器',
      '## 真正难的是边界，而不是接入',
      '## 一个更稳妥的落地方式',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页；07 起新增交互与输入横向节点 input.md）
    const pages = readdirSync(resolve(root, 'docs/client')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('input.md')
  })
})
