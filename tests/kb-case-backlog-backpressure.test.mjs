import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/ipc/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「晚高峰队列越积越多，排行刷新拖到九秒」的背压缺失排查'

// 案例切片：知识库页正文（常见误区）之后、Used By 之前追加的案例节
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('最后把问题从“现在慢”拖成“以后全线滞后”')
  expect(start, 'ipc/04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## Used By'), '案例应位于 Used By 之前').toBeGreaterThan(start)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start, src.indexOf('## Used By'))
}

describe('实战案例冒烟（知识库 networking/ipc/04「晚高峰队列越积越多，排行刷新拖到九秒」的背压缺失排查）', () => {
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
    for (const term of ['背压五选一', '只保留最新值或关键值', '一个更接近工程现实的取舍方式', '尾部指标进大盘']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['链路分级', '背压五选一', '过期削峰策略', '尾部口径']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：积压、尾部、告警与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 进场流量 8 万/秒 vs 日常 1.2 万/秒 ≈ 近七倍
    const flow = grab(/进场流量 \*\*(\d+)\*\* 万条\/秒（日常 \*\*(\d+(?:\.\d+)?)\*\* 万条\/秒的近七倍）/, '流量账')
    expect(Number(flow[1])).toBe(8)
    expect(Number(flow[2])).toBe(1.2)
    expect(Math.round(Number(flow[1]) / Number(flow[2]))).toBe(7)
    // 积压账：1400 万条、22 分钟
    expect(Number(grab(/积压峰值 \*\*(\d+)\*\* 万条/, '积压峰值')[1])).toBe(1400)
    expect(Number(grab(/恢复耗时 \*\*(\d+)\*\* 分钟/, '恢复耗时')[1])).toBe(22)
    // 尾部账：P99 180ms → 9s；均值 180 → 260ms
    const tail = grab(/排行刷新 P99 从 \*\*(\d+)\*\* 毫秒涨到 \*\*(\d+)\*\* 秒/, '尾部账')
    expect(Number(tail[1])).toBe(180)
    expect(Number(tail[2])).toBe(9)
    const mean = grab(/均值只从 \*\*(\d+)\*\* 毫秒涨到 \*\*(\d+)\*\* 毫秒/, '均值账')
    expect(Number(mean[1])).toBe(180)
    expect(Number(mean[2])).toBe(260)
    // 告警账：60 起；归因 30 + 18 + 12 = 60
    expect(Number(grab(/高峰期业务告警 \*\*(\d+)\*\* 起/, '告警账')[1])).toBe(60)
    expect(sec.includes('30 + 18 + 12 = 60'), '归因分账应可加总到告警总数').toBe(true)
    // 复核账：22 分钟 → 90 秒、9 秒 → 160 毫秒、60 起 → 5 起
    const re = grab(/积压恢复 \*\*(\d+)\*\* 分钟 → \*\*(\d+)\*\* 秒/, '积压复核')
    expect(Number(re[1])).toBe(22)
    expect(Number(re[2])).toBe(90)
    const rp = grab(/排行刷新 P99 \*\*(\d+)\*\* 秒 → \*\*(\d+)\*\* 毫秒/, '尾部复核')
    expect(Number(rp[1])).toBe(9)
    expect(Number(rp[2])).toBe(160)
    const ra = grab(/高峰告警 \*\*(\d+)\*\* 起 → \*\*(\d+)\*\* 起/, '告警复核')
    expect(Number(ra[1])).toBe(60)
    expect(Number(ra[2])).toBe(5)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话与清单条数可查', () => {
    // 低延迟链路 4 特征 + 3 例 = 7；高吞吐 4 特征 + 5 例 = 9
    const sLow = page.slice(page.indexOf('### 哪些链路更偏低延迟优先'), page.indexOf('### 哪些链路更偏高吞吐优先'))
    expect((sLow.match(/^- /gm) || []).length).toBe(7)
    const sHigh = page.slice(page.indexOf('### 哪些链路更偏高吞吐优先'), page.indexOf('### 消息队列为什么擅长削峰，也擅长制造积压'))
    expect((sHigh.match(/^- /gm) || []).length).toBe(9)
    // 背压选项 5、尾部指标 2 例 + 4 项 = 6、取舍方式 4 条
    const sBp = page.slice(page.indexOf('### 真正要设计的是背压，而不是只设计吞吐'), page.indexOf('### 平均性能没意义，尾部性能才决定体验'))
    expect((sBp.match(/^- /gm) || []).length).toBe(5)
    const sTail = page.slice(page.indexOf('### 平均性能没意义，尾部性能才决定体验'), page.indexOf('### 一个更接近工程现实的取舍方式'))
    expect((sTail.match(/^- /gm) || []).length).toBe(6)
    const sTrade = page.slice(page.indexOf('### 一个更接近工程现实的取舍方式'), page.indexOf('### 常见误区'))
    expect((sTrade.match(/^- /gm) || []).length).toBe(4)
    for (const s of [
      '如果背压策略没有先定，所谓高吞吐只是把风险换成了未来某个时刻的系统性积压',
      '平均 5ms 但偶发 500ms，玩家感知的是 500ms',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 一个更接近工程现实的取舍方式',
      '### 真正要设计的是背压，而不是只设计吞吐',
      '### 消息队列为什么擅长削峰，也擅长制造积压',
      '### 平均性能没意义，尾部性能才决定体验',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    const pages = readdirSync(resolve(root, 'docs/networking/ipc')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('04.md')
  })
})
