import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/networking/04.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「新版本灰度，旧客户端全量报错」的字段变更排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以「数据帧设计真正要治理的」收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('数据帧设计真正要治理的')
  expect(start, '第 3 章 04 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 networking/04「新版本灰度，旧客户端全量报错」的字段变更排查）', () => {
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
    // 三类演进灾难与错误码三层落到案例里
    for (const term of ['服务端默认新字段一定存在，旧客户端却根本不发', '协议层、会话层、业务层', '兼容窗口']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    // 回填清单四行落点齐全
    for (const row of [
      '字段新增废弃规则',
      '错误码三层',
      '兼容窗口与版本协商',
      '异常包处理策略',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：失败率分桶、归因分账、复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 分桶账：灰度新包 5%、旧包 95%
    expect(Number(grab(/灰度新包 \*\*(\d+)\*\*%/, '新包灰度')[1])).toBe(5)
    expect(Number(grab(/存量旧包 \*\*(\d+)\*\*%/  , '旧包存量')[1])).toBe(95)
    // 失败率账：旧端 3.8% vs 新包 0.02%，复核 0.05%
    const fOld = Number(grab(/失败率冲到 \*\*([\d.]+)\*\*%/, '旧端失败率')[1])
    expect(fOld).toBe(3.8)
    expect(Number(grab(/新包只有 \*\*([\d.]+)\*\*%/, '新包失败率')[1])).toBe(0.02)
    expect(Number(grab(/失败率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%；重登/, '失败率复核')[2])).toBe(0.05)
    // 归因三分账：百分比合计 100，百分点合计 = 3.8，且逐行可复算
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%\s+→\s+([\d.]+) 个百分点$/gm)].map(m => ({ label: m[1], pct: Number(m[2]), pt: Number(m[3]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    expect(Number((rows.reduce((s, r) => s + r.pt, 0)).toFixed(1))).toBe(fOld)
    expect(rows.map(r => Number((r.pct * fOld / 100).toFixed(1)))).toEqual(rows.map(r => r.pt))
    // 错误分层口径与归因逐行对应
    expect(Number(grab(/\*\*(\d+)\*\*% 进房消息解析失败/, '解析失败占比')[1])).toBe(rows[0].pct)
    expect(Number(grab(/\*\*(\d+)\*\*% 收到未知枚举值断连/, '枚举断连占比')[1])).toBe(rows[1].pct)
    expect(Number(grab(/\*\*(\d+)\*\*% 会话有效但业务拒绝/, '业务拒绝占比')[1])).toBe(rows[2].pct)
    // 重登账：峰值 4200 → 300，平日 7 倍可复算
    const q0 = Number(grab(/重登 QPS 峰值冲到 \*\*(\d+)\*\*/, '重登初值')[1])
    expect(q0).toBe(4200)
    expect(Number(grab(/是平日的 \*\*(\d+)\*\* 倍/, '重登倍数')[1])).toBe(7)
    expect(Number(grab(/重登 QPS 峰值 \*\*(\d+)\*\* → \*\*(\d+)\*\*/, '重登复核')[2])).toBe(300)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 页内常见误区恰好 3 条（切片止于案例之前，案例内列表不计入）
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(3)
    // 页内演进灾难恰好 4 条
    const sDis = page.slice(page.indexOf('### 协议演进最怕什么'), page.indexOf('### 协议治理不是序列化格式选型题'))
    expect((sDis.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话可查
    for (const s of [
      '服务端默认新字段一定存在，旧客户端却根本不发',
      '上线时大家小心一点',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与命名就位', () => {
    for (const anchor of [
      '### 协议契约真正包含什么',
      '### 3. 错误返回必须分层',
      '### 多版本共存时必须提前回答什么',
      '### 异常包和非法值不能只靠信任',
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
