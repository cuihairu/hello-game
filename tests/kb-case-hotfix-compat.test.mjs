import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/system/scripting/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「校验全绿，灰度桶崩了四倍」的热更兼容排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('补丁链本身变成事故来源')
  expect(start, '第 9 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 system/scripting/04「校验全绿，灰度桶崩了四倍」的热更兼容排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少补丁链归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '兼容门禁',
      '层级回滚',
      '灰度隔离',
      '兼容测试',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：灰度对照账、宿主分桶合成账、围栏补丁链账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景账：宿主 2.4～2.7 并存（最老支持 2.4）、灰度 5%、40 分钟后 0.3% → 1.2%（4 倍）
    const ver = grab(/宿主大版本 \*\*([\d.]+)\*\*～\*\*([\d.]+)\*\* 并存（最老支持 \*\*([\d.]+)\*\*）/, '宿主版本账')
    expect(Number(ver[1])).toBe(2.4)
    expect(Number(ver[2])).toBe(2.7)
    expect(Number(ver[3])).toBe(Number(ver[1]))
    const bg = grab(/按设备分桶灰度 \*\*(\d+)\*\*%，\*\*(\d+)\*\* 分钟后灰度桶告警：崩溃率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%（\*\*(\d+)\*\* 倍）/, '灰度告警账')
    expect(Number(bg[1])).toBe(5)
    expect(Number(bg[5])).toBe(Math.round(Number(bg[4]) / Number(bg[3])))
    // 对照账：增量 0.9 = 1.2 − 0.3；4 倍与背景账一致
    const cmp = grab(/- \*\*补丁前\*\*：全量基线 \*\*([\d.]+)\*\*%\n- \*\*灰度桶\*\*：\*\*([\d.]+)\*\*%，增量 \*\*([\d.]+)\*\* 个百分点（\*\*(\d+)\*\* 倍）/, '对照账')
    expect(Number(cmp[1])).toBe(Number(bg[3]))
    expect(Number(cmp[2])).toBe(Number(bg[4]))
    expect(Number(cmp[2]) - Number(cmp[1])).toBeCloseTo(Number(cmp[3]))
    expect(Number(cmp[4])).toBe(Number(bg[5]))
    // 围栏账：传输层无责；版本账 60+40=100；合成账 60%×0.2% + 40%×2.7% = 1.20%
    const tx = grab(/补丁下载成功率 ([\d.]+)%、签名校验 (\d+)% 通过/, '传输账')
    expect(Number(tx[1])).toBeGreaterThan(99)
    expect(Number(tx[2])).toBe(100)
    const dist = grab(/2\.6\+ 占 (\d+)%（崩溃率 ([\d.]+)%），2\.4\/2\.5 占 (\d+)%（崩溃率 ([\d.]+)%）/, '宿主分布账')
    expect(Number(dist[1]) + Number(dist[3])).toBe(100)
    const blend = grab(/(\d+)%×([\d.]+)% \+ (\d+)%×([\d.]+)% = ([\d.]+)%/, '合成账')
    expect(Number(blend[1])).toBe(Number(dist[1]))
    expect(Number(blend[2])).toBe(Number(dist[2]))
    expect(Number(blend[3])).toBe(Number(dist[3]))
    expect(Number(blend[4])).toBe(Number(dist[4]))
    expect((Number(blend[1]) / 100) * Number(blend[2]) + (Number(blend[3]) / 100) * Number(blend[4])).toBeCloseTo(Number(blend[5]))
    expect(Number(blend[5])).toBeCloseTo(Number(cmp[2]))
    // 接口账：缺口接口宿主 2.6 才暴露；止损账 22 分钟、T+2 小时、拦下 95%
    const api = grab(/它在宿主 ([\d.]+) 才暴露/, '接口账')
    expect(Number(api[1])).toBeGreaterThan(Number(ver[3]))
    expect(grab(/告警到停用下发通道 (\d+) 分钟/, '止损时长账')[1]).toBe('22')
    expect(grab(/原计划 T\+(\d+) 小时全量/, '全量计划账')[1]).toBe('2')
    expect(Number(grab(/拦下 (\d+)% 暴露面/, '灰度拦截账')[1])).toBe(100 - Number(bg[1]))
    // 复核账：停用后 30 分钟回落至 0.3% 基线（等于补丁前）；回落观察晚于告警（止损 22 分 + 观察 30 分 > 告警 40 分）
    const re = grab(/停用后 \*\*(\d+)\*\* 分钟崩溃率回落至 \*\*([\d.]+)\*\*%/, '复核账')
    expect(Number(re[1]) + 22).toBeGreaterThan(Number(bg[2]))
    expect(Number(re[2])).toBe(Number(cmp[1]))
    // 制度三步：兼容矩阵门禁、补丁层回滚演练、最老两个大版本冒烟
    for (const s of [
      '脚本 API 最低宿主版本写入兼容矩阵',
      '回滚演练细到补丁层粒度',
      '矩阵内最老两个大版本必跑冒烟',
    ]) {
      expect(sec.includes(s), `制度三步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：体系六层、兼容/回滚/灰度/测试清单条数与页内实况一致，案例引用页内原话可查', () => {
    // 页内体系能力恰好 6 条
    const sSys = page.slice(page.indexOf('## 一套热更新体系通常不只是一条下载链'), page.indexOf('## 最危险的问题是兼容性，而不是下载失败'))
    expect((sSys.match(/^- /gm) || []).length).toBe(6)
    // 页内兼容风险恰好 4 条
    const sCompat = page.slice(page.indexOf('## 最危险的问题是兼容性，而不是下载失败'), page.indexOf('## 回滚能力为什么必须优先级极高'))
    expect((sCompat.match(/^- /gm) || []).length).toBe(4)
    // 页内回滚四问恰好 4 条
    const sRoll = page.slice(page.indexOf('## 回滚能力为什么必须优先级极高'), page.indexOf('## 灰度不是附加优化，而是事故隔离机制'))
    expect((sRoll.match(/^- /gm) || []).length).toBe(4)
    // 页内灰度价值恰好 3 条
    const sGray = page.slice(page.indexOf('## 灰度不是附加优化，而是事故隔离机制'), page.indexOf('## 热更新和测试是什么关系'))
    expect((sGray.match(/^- /gm) || []).length).toBe(3)
    // 页内分层测试恰好 4 条、稳妥做法恰好 4 条
    const sTest = page.slice(page.indexOf('## 热更新和测试是什么关系'), page.indexOf('## 一个更稳妥的体系化做法'))
    expect((sTest.match(/^- /gm) || []).length).toBe(4)
    const sSteady = page.slice(page.indexOf('## 一个更稳妥的体系化做法'), page.indexOf('## 常见误区'))
    expect((sSteady.match(/^- /gm) || []).length).toBe(4)
    // 常见误区三类（prose 体例：首类作「最常见的错误」），案例引用第三类
    expect(page.includes('最常见的错误')).toBe(true)
    expect(page.includes('第二类错误')).toBe(true)
    expect(page.includes('第三类错误')).toBe(true)
    // 案例引用的页内原话可查
    for (const s of [
      '补丁可能下载和校验都成功了，但运行时才开始崩',
      '服务端是否知道客户端当前补丁层级',
      '没有灰度，热更新的事故半径通常会远大于整包发版',
      '补丁链本身变成事故来源',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('补丁可能下载和校验都成功了，但运行时才开始崩')).toBe(true)
    expect(sec.includes('服务端是否知道客户端当前补丁层级')).toBe(true)
    expect(sec.includes('没有灰度，热更新的事故半径通常会远大于整包发版')).toBe(true)
    expect(sec.includes('补丁链本身变成事故来源')).toBe(true)
    // 分层测试清单一行在页内与案例各出现一次
    expect(page.includes('与当前宿主版本的兼容测试')).toBe(true)
    expect(sec.includes('与当前宿主版本的兼容测试')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 一套热更新体系通常不只是一条下载链',
      '## 最危险的问题是兼容性，而不是下载失败',
      '## 回滚能力为什么必须优先级极高',
      '## 灰度不是附加优化，而是事故隔离机制',
      '## 热更新和测试是什么关系',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/system/scripting')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
  })
})
