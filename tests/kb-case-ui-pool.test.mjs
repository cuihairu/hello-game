import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/zh/client/web/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「背包一开就卡死，多语言要 9 人天」的 UI 体系排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('UI 交互比画面帧率更敏感')
  expect(start, 'web/04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/web/04「背包一开就卡死，多语言要 9 人天」的 UI 体系排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['列表口径', '状态口径', '刷新口径', '栈口径', '列表池化', '读状态渲染', '脏标记刷新', '栈与安全区']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['虚拟滚动', '读状态渲染', '脏标记刷新', '栈与安全区']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：节点账、直改账、刷新账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 列表账：640 条目、开包 2.8 秒、中端 18 帧
    expect(Number(grab(/背包 \*\*(\d+)\*\* 条目一开就卡/, '条目')[1])).toBe(640)
    expect(grab(/低端机开包 \*\*([\d.]+)\*\* 秒，中端机掉到 \*\*(\d+)\*\* 帧/, '开包').slice(1).map(Number)).toEqual([2.8, 18])
    // 状态账：214 处直改、多语言 9 人天
    expect(Number(grab(/逻辑直改 UI 散布 \*\*(\d+)\*\* 处/, '直改')[1])).toBe(214)
    expect(Number(grab(/手工追状态 \*\*(\d+)\*\* 人天/, '多语言')[1])).toBe(9)
    // 刷新账：CPU 31%
    expect(Number(grab(/CPU 占比 \*\*(\d+)\*\*%/, 'CPU初值')[1])).toBe(31)
    // 栈账：误退 11%、误触 86 条
    expect(Number(grab(/误退游戏占会话 \*\*(\d+)\*\*%/, '误退初值')[1])).toBe(11)
    expect(Number(grab(/手势条侧误触 \*\*(\d+)\*\* 条/, '误触初值')[1])).toBe(86)
    // 复核账：640 → 14、2.8 → 0.2 秒、214 → 0、9 → 1 人天、31% → 9%、11% → 1.2%
    expect(Number(grab(/背包节点 \*\*(\d+)\*\* → \*\*(\d+)\*\* 个/, '节点复核')[2])).toBe(14)
    expect(Number(grab(/开包 \*\*([\d.]+)\*\* → \*\*([\d.]+)\*\* 秒/, '开包复核')[2])).toBe(0.2)
    expect(Number(grab(/直改 UI \*\*(\d+)\*\* → \*\*(\d+)\*\* 处/, '直改复核')[2])).toBe(0)
    expect(Number(grab(/多语言接入 \*\*(\d+)\*\* 人天 → \*\*(\d+)\*\* 人天/, '多语言复核')[2])).toBe(1)
    expect(Number(grab(/主界面 CPU \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, 'CPU复核')[2])).toBe(9)
    expect(Number(grab(/误退 \*\*(\d+)\*\*% → \*\*([\d.]+)\*\*%/, '误退复核')[2])).toBe(1.2)
    expect(Number(grab(/误触投诉 \*\*(\d+)\*\* → \*\*(\d+)\*\* 条/, '误触复核')[2])).toBe(0)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 6 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('## Used By'))
    expect((sMis.match(/^- /gm) || []).length).toBe(6)
    // HUD 分层恰好 3 条
    const sHud = page.slice(page.indexOf('组织 HUD 的第一原则是分层'), page.indexOf('HUD 的实现要点'))
    expect((sHud.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '只为可视区域（外加少量缓冲行）创建真实节点',
      '滚一万条不卡、不闪烁、不重复',
      'UI 应从状态推导',
      '背包一开五百个节点，低端机直接卡死',
      '只留了刘海侧，手势条侧按钮被吃',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### HUD：分层的仪表盘',
      '### 菜单流与界面栈',
      '### 网格列表与大量条目',
      '### 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–06
    const pages = readdirSync(resolve(root, 'docs/zh/client/web')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('04.md')
  })
})
