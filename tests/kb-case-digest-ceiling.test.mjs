import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/zh/client/engines/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「功能清单打分最高，上线后六个版本五个延期」的消化能力排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('摩擦从未被验证过')
  expect(start, 'engines/03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/engines/03「功能清单打分最高，上线后六个版本五个延期」的消化能力排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['消化口径', '管线口径', '外包口径', '消化能力入评', '管线自动化', '外包边界工具化', '垂直切片常态化', '知识去单点']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['消化能力上限', '项目类型判断', '管线优先', '垂直切片']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：团队构成、延期占比账、能力使用账、管线账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 团队账：22 = 11 程序 + 6 美术 + 2 技美工具 + 3 测试
    const team = grab(/团队 \*\*(\d+)\*\* 人（程序 \*\*(\d+)\*\*、美术 \*\*(\d+)\*\*、技术美术与工具 \*\*(\d+)\*\*、测试 \*\*(\d+)\*\*）/, '团队构成')
    expect(Number(team[2]) + Number(team[3]) + Number(team[4]) + Number(team[5])).toBe(Number(team[1]))
    // 延期账：8 个版本里 6 个延期（75%）
    const delay = grab(/前 \*\*(\d+)\*\* 个版本里 \*\*(\d+)\*\* 个因工具链返工延期（\*\*(\d+)\*\*%）/, '延期账')
    expect(Number(delay[2])).toBe(Math.round(Number(delay[1]) * Number(delay[3]) / 100))
    // 能力使用账：31 项能力真正用到 9 项；2 人排障 7 套框架
    expect(Number(grab(/功能清单 \*\*(\d+)\*\* 项能力，上线半年后真正用到的 \*\*(\d+)\*\* 项/, '能力账')[2])).toBeLessThan(Number(grab(/功能清单 \*\*(\d+)\*\* 项能力，上线半年后真正用到的 \*\*(\d+)\*\* 项/, '能力账')[1]))
    expect(Number(grab(/兼职排障 \*\*(\d+)\*\* 套框架与插件/, '排障账')[1])).toBe(7)
    // 管线账：实测 9 人天 / 6 道 / 3 天，立项估 2 人天 / 1 道 / 2 小时
    const pipe = grab(/打包 \*\*(\d+)\*\* 人天、手工环节 \*\*(\d+)\*\* 道、出包到测试 \*\*(\d+)\*\* 天，三项都远超立项时估的 \*\*(\d+)\*\* 人天、\*\*(\d+)\*\* 道、\*\*(\d+)\*\* 小时/, '管线账')
    for (const [i, j] of [[1, 4], [2, 5]]) expect(Number(pipe[i])).toBeGreaterThan(Number(pipe[j]))
    // 外包账：3 家、每版本 46 次返工、折算 11 人天
    expect(grab(/外包 \*\*(\d+)\*\* 家，资源格式返工平均每版本 \*\*(\d+)\*\* 次，折算 \*\*(\d+)\*\* 人天/, '外包账').slice(1).map(Number)).toEqual([3, 46, 11])
    // 复核账：延期 6/8 → 1/8、打包 9 → 1 人天、手工 6 → 2 道、返工 46 → 7 次、熟悉者 1 → 3 人
    expect(grab(/延期版本 \*\*(\d+)\*\*\/\*\*(\d+)\*\* → \*\*(\d+)\*\*\/\*\*(\d+)\*\*/, '延期复核').slice(1).map(Number)).toEqual([6, 8, 1, 8])
    expect(Number(grab(/打包 \*\*(\d+)\*\* → \*\*(\d+)\*\* 人天/, '打包复核')[2])).toBe(1)
    expect(Number(grab(/手工环节 \*\*(\d+)\*\* → \*\*(\d+)\*\* 道/, '手工复核')[2])).toBe(2)
    expect(Number(grab(/格式返工 \*\*(\d+)\*\* → \*\*(\d+)\*\* 次/, '返工复核')[2])).toBe(7)
    expect(Number(grab(/关键管线熟悉者 \*\*(\d+)\*\* → \*\*(\d+)\*\* 人/, '熟悉者复核')[2])).toBe(3)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 7 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('选型的最后一步'))
    expect((sMis.match(/^- /gm) || []).length).toBe(7)
    // 消化能力掂量恰好 4 条
    const sDigest = page.slice(page.indexOf('消化能力可以从几个方面掂量'), page.indexOf('一个务实的原则是'))
    expect((sDigest.match(/^- /gm) || []).length).toBe(4)
    // 管线建设规律恰好 4 条
    const sPipe = page.slice(page.indexOf('管线建设有它自己的规律'), page.indexOf('值得强调的是'))
    expect((sPipe.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '换引擎解决不了管线问题',
      '口碑依然有参考价值，但它适合用来生成候选名单，不适合用来做最终决定',
      '为团队消化能力之内的复杂度付钱，消化能力之外的复杂度是负资产',
      '外包协作只约定交付物不约定工具边界',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 组织消化能力是隐形上限',
      '### 项目类型决定选型重心',
      '### 构建与资产管线往往比引擎更影响效率',
      '### 用垂直切片代替口碑评估',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–03
    const pages = readdirSync(resolve(root, 'docs/zh/client/engines')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(4)
    expect(pages).toContain('index.md')
    expect(pages).toContain('03.md')
  })
})
