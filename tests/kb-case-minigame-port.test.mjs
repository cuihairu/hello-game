import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/zh/client/web/05.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「H5 搬进小游戏，首屏白屏 8 秒」的移植排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('发版节奏要把审核时间算进去')
  expect(start, 'web/05 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/web/05「H5 搬进小游戏，首屏白屏 8 秒」的移植排查）', () => {
  const sec = caseSection(page)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少归因示意块').toBe(true)
    for (const term of ['环境口径', '包体口径', '生命周期口径', '清 DOM 依赖', '包体三板斧', '域名登记', '生命周期修正']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['环境差异对照', '包体三板斧', '生命周期协议', '平台登记清单']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：白屏账、包体账、依赖账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 首屏账：白屏 8 秒、转化 41% vs 同类 68%
    expect(grab(/首屏白屏 \*\*(\d+)\*\* 秒，进入转化率 \*\*(\d+)\*\*%（同类产品 \*\*(\d+)\*\*%）/, '首屏').slice(1).map(Number)).toEqual([8, 41, 68])
    // 包体账：主包 7.8 MB ≈ 上限 4 MB 的两倍；音频 3.1 + 纹理 2.4 未进首屏
    const pack = grab(/主包 \*\*([\d.]+)\*\* MB，超出当期主包上限（\*\*(\d+)\*\* MB，以平台文档为准）/, '包体')
    expect(Number(pack[1])).toBe(7.8)
    expect(Math.round(Number(pack[1]) / Number(pack[2]))).toBe(2)
    const fat = grab(/未压缩音频 \*\*([\d.]+)\*\* MB、未分组纹理 \*\*([\d.]+)\*\* MB/, '赘肉')
    expect(Number(fat[1]) + Number(fat[2])).toBe(5.5)
    // 依赖账：26 个库 7 个 DOM；域名 5 个；工单 130 条
    const dep = grab(/第三方库 \*\*(\d+)\*\* 个里有 \*\*(\d+)\*\* 个带 DOM 依赖/, '依赖')
    expect(Number(dep[2])).toBeLessThan(Number(dep[1]))
    expect([Number(dep[1]), Number(dep[2])]).toEqual([26, 7])
    expect(Number(grab(/联调期 \*\*(\d+)\*\* 个接口域名未登记/, '域名')[1])).toBe(5)
    expect(Number(grab(/工单 \*\*(\d+)\*\* 条/, '工单')[1])).toBe(130)
    // 复核账：主包 7.8 → 3.2、白屏 8 → 1.9 秒、转化 41% → 63%、7 → 0、5 → 0、130 → 0
    expect(Number(grab(/主包 \*\*([\d.]+)\*\* → \*\*([\d.]+)\*\* MB/, '包体复核')[2])).toBe(3.2)
    expect(Number(grab(/首屏白屏 \*\*(\d+)\*\* → \*\*([\d.]+)\*\* 秒/, '白屏复核')[2])).toBe(1.9)
    expect(Number(grab(/进入转化率 \*\*(\d+)\*\*% → \*\*(\d+)\*\*%/, '转化复核')[2])).toBe(63)
    expect(Number(grab(/DOM 依赖库 \*\*(\d+)\*\* → \*\*(\d+)\*\* 个/, '依赖复核')[2])).toBe(0)
    expect(Number(grab(/漏登域名 \*\*(\d+)\*\* → \*\*(\d+)\*\* 个/, '域名复核')[2])).toBe(0)
    expect(Number(grab(/体力工单 \*\*(\d+)\*\* → \*\*(\d+)\*\* 条/, '工单复核')[2])).toBe(0)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 5 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('## Used By'))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 包体三板斧恰好 3 条
    const sAxe = page.slice(page.indexOf('工程上的应对是一套固定的三板斧'), page.indexOf('包体治理要在立项期'))
    expect((sAxe.match(/^- /gm) || []).length).toBe(3)
    // 环境差异的直接含义恰好 3 条
    const sEnv = page.slice(page.indexOf('对开发的直接含义'), page.indexOf('### 包体、分包与首屏'))
    expect((sEnv.match(/^- /gm) || []).length).toBe(3)
    for (const s of [
      '按 H5 习惯写小游戏',
      '不存在「抄个 DOM 组件」的捷径',
      '主包塞满',
      '首屏资源不加节制，进入转化率直接受损',
      '计时器走墙上时钟、回前台不做状态校验，工单与刷资源漏洞一起来',
      '主包越小，首屏进入越快，转化率越高',
      '「包体瘦身周」通常已经是返工',
      '联调期最高频的坑',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 小游戏不是 H5 页面',
      '### 包体、分包与首屏',
      '### 生命周期与切后台',
      '### 与浏览器环境的差异对照',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单：树根总览 + 01–06
    const pages = readdirSync(resolve(root, 'docs/zh/client/web')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
    expect(pages).toContain('05.md')
  })
})
