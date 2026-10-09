import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「技能偶尔放不出来」的主链路被外围流量拖慢排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「游戏网络基础最重要的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('游戏网络基础最重要的')
  expect(start, '第 3 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/01「技能偶尔放不出来」的主链路被外围流量拖慢排查）', () => {
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
    // 消息语义五类与三件事落到案例里
    for (const term of ['强控制、强实时、弱实时、外围通知、大包传输', '连接没断、会话没掉', '同一优先级同一队列']) {
      expect(sec.includes(term), `案例缺少分层口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '消息语义五类标注',
      '接入层优先级队列',
      '大包独立链路',
      '重连快照对齐',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：晚到归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：工单日 900 单、晚高峰时段
    expect(Number(grab(/稳定在日 \*\*(\d+)\*\* 单/, '工单初值')[1])).toBe(900)
    expect(sec.includes('20:00–22:00')).toBe(true)
    // 时延账：P99 45 → 260
    const p0 = Number(grab(/P99 从低峰的 \*\*(\d+)\*\* 毫秒/, '低峰 P99')[1])
    const p1 = Number(grab(/涨到高峰的 \*\*(\d+)\*\* 毫秒/, '高峰 P99')[1])
    expect(p0).toBe(45)
    expect(p1).toBe(260)
    // 归因三分账：百分比合计 100，毫秒合计 = 260，且逐行可复算
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+(\d+)ms$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), ms: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(rows.reduce((s, r) => s + r.ms, 0)).toBe(p1)
    expect(rows.map(r => Math.round(r.pct * p1 / 100))).toEqual(rows.map(r => r.ms))
    // 队列积压两处一致
    expect(Number(grab(/队列积压峰值 \*\*(\d+(?:\.\d+)?)\*\* 万条/, '积压初值（万）')[1])).toBe(1.2)
    expect(Number(grab(/积压峰值 \*\*(\d+(?:\.\d+)?)\*\* 万条 → \*\*(\d+)\*\* 条/, '积压复核')[2])).toBe(800)
    // 复核账：P99 260 → 52、工单 900 → 60
    const re = grab(/P99 时延 \*\*(\d+)\*\* 毫秒 → \*\*(\d+)\*\* 毫秒/, 'P99 复核')
    expect(Number(re[1])).toBe(p1)
    expect(Number(re[2])).toBe(52)
    expect(Number(grab(/客服工单日 \*\*(\d+)\*\* 单 → \*\*(\d+)\*\* 单/, '工单复核')[2])).toBe(60)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内消息语义恰好 5 类
    const sSem = page.slice(page.indexOf('### 先按消息语义分层，比先谈协议更重要'), page.indexOf('### 接入层真正承担什么'))
    expect((sSem.match(/^- /gm) || []).length).toBe(5)
    // 案例引用的页内原话可查
    for (const s of [
      '你不应该让聊天消息的积压拖慢局内输入，也不应该让大包下载卡住房间广播',
      '看起来像业务逻辑错了',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 先按消息语义分层，比先谈协议更重要',
      '### 接入层真正承担什么',
      '### 一条更贴近真实工程的链路拆法',
      '### 为什么移动网络会把问题放大',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/networking')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(8)
    expect(pages).toContain('index.md')
    expect(pages).toContain('07.md')
  })
})
