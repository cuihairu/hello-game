import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/web/06.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「同一段录像，两台机器打出两个结果」的分层缺失排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('没有引用计数与对账，「越玩越卡」只是时间问题')
  expect(start, 'web/06 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/web/06「同一段录像，两台机器打出两个结果」的分层缺失排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['确定性口径', '恢复口径', '内存口径', '固定时步', '单向数据流', '事件协议', '资源对账', '分层回归']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['固定时步', '单向数据流', '事件协议', '资源对账']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：暴击漂移账、内存账、直调账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 暴击账：配置 15%，30 帧机 21.4%、60 帧机 14.8%；漂移差 6.4 个百分点
    const crit = grab(/暴击概率配置 \*\*(\d+)\*\*%，\*\*(\d+)\*\* 帧机实测 \*\*([\d.]+)\*\*%、\*\*(\d+)\*\* 帧机 \*\*([\d.]+)\*\*%/, '暴击账')
    expect(Number(crit[1])).toBe(15)
    expect(Number(crit[3])).toBeGreaterThan(Number(crit[5]))
    const drift = grab(/帧机的 \*\*([\d.]+)\*\*% 与配置 \*\*(\d+)\*\*% 差 \*\*([\d.]+)\*\* 个百分点/, '漂移账')
    expect(Number(drift[1]) - Number(drift[2])).toBeCloseTo(Number(drift[3]), 6)
    // 内存账：每局 18 MB × 24 局 = 432 MB，基线 640 → 1072 MB ≈ 1.07 GB
    const mem = grab(/每局残留 \*\*(\d+)\*\* MB，\*\*(\d+)\*\* 局累计 \*\*(\d+)\*\* MB，加基线 \*\*(\d+)\*\* MB 顶到 \*\*([\d.]+)\*\* GB/, '内存账')
    expect(Number(mem[1]) * Number(mem[2])).toBe(Number(mem[3]))
    expect(Number(mem[3]) + Number(mem[4])).toBe(1072)
    expect((Number(mem[3]) + Number(mem[4])) / 1000).toBeCloseTo(Number(mem[5]), 2)
    // 直调账：96 处 → 事件订阅
    expect(Number(grab(/的 \*\*(\d+)\*\* 处改为事件订阅/, '直调')[1])).toBe(96)
    // 复核账：21.4/14.8 → 15.1/15.0；410 → 37 条；18 → 0.3 MB；432 → 7.2 MB；1.07 GB → 650 MB
    const re = grab(/两机暴击率 \*\*([\d.]+)\*\*% \/ \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*% \/ \*\*([\d.]+)\*\*%（配置 \*\*(\d+)\*\*%）/, '暴击复核')
    expect([Number(re[1]), Number(re[2])]).toEqual([21.4, 14.8])
    expect(Math.abs(Number(re[3]) - Number(re[5]))).toBeLessThanOrEqual(0.2)
    expect(Math.abs(Number(re[4]) - Number(re[5]))).toBeLessThanOrEqual(0.2)
    expect(Number(grab(/重连失败工单 \*\*(\d+)\*\* → \*\*(\d+)\*\* 条/, '重连复核')[2])).toBe(37)
    const reMem = grab(/每局残留 \*\*(\d+)\*\* → \*\*([\d.]+)\*\* MB（\*\*(\d+)\*\* 局 \*\*(\d+)\*\* → \*\*([\d.]+)\*\* MB），稳态 \*\*([\d.]+)\*\* GB → \*\*(\d+)\*\* MB 上下/, '内存复核')
    expect(Number(reMem[3]) * Number(reMem[2])).toBeCloseTo(Number(reMem[5]), 6)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 5 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('## Used By'))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 三层的职责恰好 3 条
    const sLayer = page.slice(page.indexOf('### 三层的职责'), page.indexOf('判断分没分对'))
    expect((sLayer.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '帧率高就快、切后台回来瞬移、回放对不上——三类线上问题同源',
      '固定步长下「同样指令序列」才是良定义的',
      '事件承载「已发生的事实」（过去时态），不承载「请执行某操作」（命令）',
      '没有引用计数与对账，「越玩越卡」只是时间问题',
      '会话开始预载、结束对账释放',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 三层的职责',
      '### 固定时步与表现插值',
      '### 事件：层与层之间的正式通道',
      '### 资源加载：预算与生命周期',
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
    expect(pages).toContain('06.md')
  })
})
