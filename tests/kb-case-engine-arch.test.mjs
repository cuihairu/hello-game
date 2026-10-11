import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/web/03.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「引擎够用，改个活动按钮却要动 23 个文件」的架构缺位排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('不懂就直接拍脑袋')
  expect(start, 'web/03 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/web/03「引擎够用，改个活动按钮却要动 23 个文件」的架构缺位排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    for (const term of ['改动口径', '热路径口径', '适配口径', '组件瘦身', '查找缓存', '适配清单', '预制体收敛']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['组件瘦身', '查找缓存', '适配验收', '预制体收敛']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：改动半径账、查找账、裁切账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：9 个月、节点 2400、树深 14
    expect(grab(/推进 \*\*(\d+)\*\* 个月，最大 UI 场景节点 \*\*(\d+)\*\* 个、树深 \*\*(\d+)\*\* 层/, '规模').slice(1).map(Number)).toEqual([9, 2400, 14])
    // 边界账：87 组件、310 直引
    const bound = grab(/业务逻辑散在 \*\*(\d+)\*\* 个组件里，跨组件直接引用 \*\*(\d+)\*\* 处/, '边界账')
    expect(Number(bound[1])).toBe(87)
    expect(Number(bound[2])).toBe(310)
    // 改动账：23 个文件、3 人天，其中 19 个被动波及
    const churn = grab(/牵出 \*\*(\d+)\*\* 个文件、耗时 \*\*(\d+)\*\* 人天/, '改动账')
    const passive = Number(grab(/改 \*\*(\d+)\*\* 个文件里 \*\*(\d+)\*\* 个只是/, '被动账')[2])
    expect(Number(churn[1])).toBe(23)
    expect(Number(churn[2])).toBe(3)
    expect(passive).toBe(19)
    expect(passive).toBeLessThan(Number(churn[1]))
    // 查找账：每帧 620 次
    expect(Number(grab(/每帧 `getChildByName`\/`getComponent` 查找 \*\*(\d+)\*\* 次/, '查找初值')[1])).toBe(620)
    // 适配账：17 处裁切、6 处出安全区
    const fit = grab(/\*\*(\d+)\*\* 处界面裁切/, '裁切初值')
    expect(Number(fit[1])).toBe(17)
    expect(Number(grab(/可点击区域出安全区 \*\*(\d+)\*\* 处/, '安全区')[1])).toBe(6)
    // 复核账：23 文件 3 人天 → 4 文件 0.5 人天；310 → 52；620 → 40；17 → 0；2400 → 900
    const reChurn = grab(/改活动按钮 \*\*(\d+)\*\* 个文件 \*\*(\d+)\*\* 人天 → \*\*(\d+)\*\* 个文件 \*\*([\d.]+)\*\* 人天/, '改动复核')
    expect([Number(reChurn[1]), Number(reChurn[2]), Number(reChurn[3]), Number(reChurn[4])]).toEqual([23, 3, 4, 0.5])
    expect(Number(grab(/\*\*(\d+)\*\* 处直引 → \*\*(\d+)\*\* 处/, '直引复核')[2])).toBe(52)
    expect(Number(grab(/每帧查找 \*\*(\d+)\*\* → \*\*(\d+)\*\* 次/, '查找复核')[2])).toBe(40)
    expect(Number(grab(/真机裁切 \*\*(\d+)\*\* → \*\*(\d+)\*\* 处/, '裁切复核')[2])).toBe(0)
    expect(Number(grab(/主场景节点 \*\*(\d+)\*\* → \*\*(\d+)\*\* 个/, '节点复核')[2])).toBe(900)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 5 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('## Used By'))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    for (const s of [
      '引擎只给你承载点，分层仍要自己做',
      '热路径三忌——查找、新建、日志',
      '适配只测一种屏幕',
      '开发机屏幕就是全部测试集',
      '引擎够用但越来越难改',
      '引擎替你解决渲染、场景、资源、适配、多平台构建的共性设施，但不替你解决模块边界、网络层设计、状态管理与性能预算',
      '最宽与最高的目标设备各过一遍，界面元素不裁切、不重叠、可点击区域不出安全区',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 节点、组件与场景',
      '### 预制体与对象池',
      '### 屏幕适配',
      '### 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–06
    const pages = readdirSync(resolve(root, 'docs/client/web')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('03.md')
  })
})
