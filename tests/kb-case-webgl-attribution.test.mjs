import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/client/web/02.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「高端机满帧，低端机进战斗掉到 22 帧」的渲染归因排查'

// 案例切片：知识库页正文之后追加的案例节（页面正文以常见误区段收束）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('低端设备要提前进测试池')
  expect(start, 'web/02 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 client/web/02「高端机满帧，低端机进战斗掉到 22 帧」的渲染归因排查）', () => {
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
    for (const term of ['提交口径', '显存口径', '灯光口径', '合批与实例化', '纹理治理', '灯光减负', '测试池前移']) {
      expect(sec.includes(term), `案例缺少口径「${term}」`).toBe(true)
    }
    for (const row of ['提交账', '显存账', '灯光预算', '机型测试池']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：DrawCall 账、纹理显存账、灯光账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 规模账：同屏 1200、旗舰 60 帧、中端 22 帧
    expect(Number(grab(/同屏 \*\*(\d+)\*\* 个单位/, '同屏')[1])).toBe(1200)
    const fps = grab(/旗舰机全程 \*\*(\d+)\*\* 帧，中端机进战斗 \*\*(\d+)\*\* 帧/, '帧率')
    expect(Number(fps[1])).toBe(60)
    expect(Number(fps[2])).toBe(22)
    // 提交账：DrawCall 1850 次、三角形 48 万、合批后 130
    expect(Number(grab(/DrawCall \*\*(\d+)\*\* 次、三角形 \*\*(\d+)\*\* 万/, '提交账')[1])).toBe(1850)
    expect(Number(grab(/合批后实测 \*\*(\d+)\*\* 次/, '合批')[1])).toBe(130)
    // 显存账：纹理 210 MB，4 张 2048 RGBA = 4 × 16 = 64 MB，预算 256
    expect(Number(grab(/纹理显存 \*\*(\d+)\*\* MB/, '纹理总量')[1])).toBe(210)
    const tex = grab(/的 (\d+) 张 2048×2048 RGBA 就占 \*\*(\d+)\*\* MB/, '原图账')
    expect(Number(tex[2])).toBe(Number(tex[1]) * 16)
    expect(Number(grab(/显存预算按中端机 \*\*(\d+)\*\* MB/, '预算')[1])).toBe(256)
    // 灯光账：4 盏点光 → 1 盏
    expect(Number(grab(/实时平行光 \+ \*\*(\d+)\*\* 盏点光/, '点光初值')[1])).toBe(4)
    const light = grab(/点光 \*\*(\d+)\*\* 盏 → \*\*(\d+)\*\* 盏/, '点光复核')
    expect(Number(light[1])).toBe(4)
    expect(Number(light[2])).toBe(1)
    // 复核账：DrawCall 1850 → 130、纹理 210 → 58、帧率 22 → 53
    expect(Number(grab(/DrawCall \*\*(\d+)\*\* → \*\*(\d+)\*\* 次/, '提交复核')[2])).toBe(130)
    expect(Number(grab(/纹理显存 \*\*(\d+)\*\* → \*\*(\d+)\*\* MB/, '纹理复核')[2])).toBe(58)
    expect(Number(grab(/进战斗 \*\*(\d+)\*\* → \*\*(\d+)\*\* 帧/, '帧率复核')[2])).toBe(53)
    // 归因三分账：占比合计 100
    const rows = [...sec.matchAll(/^\s+(.+?)\s+(\d+)%$/gm)].map(m => ({ label: m[1], pct: Number(m[2]) }))
    expect(rows.length).toBe(3)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('声称对账：案例引用的页内原话可查', () => {
    // 常见误区恰好 5 条
    const sMis = page.slice(page.indexOf('### 常见误区'), page.indexOf('## Used By'))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 渲染管线关键事实恰好 2 条
    const sFacts = page.slice(page.indexOf('WebGL 每帧做的事情可以概括为一条流水线'), page.indexOf('### 着色器入门'))
    expect((sFacts.match(/^- /gm) || []).length).toBe(2)
    for (const s of [
      '一张 2048×2048 的 RGBA 纹理就是 16MB 显存起步',
      '每帧的 CPU 提交次数（DrawCall）是主要瓶颈之一',
      '前者反映提交压力，后者反映 GPU 压力',
      '灯光数量与实时阴影是 3D 游戏帧耗的第一大变量',
      '美术给的原图直接上，显存瞬间翻几倍',
      '低端设备要提前进测试池',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例未引用页内原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在，页面路径与同章页数就位', () => {
    for (const anchor of [
      '### 渲染管线：数据怎么变成像素',
      '### DrawCall、批合与实例化',
      '### 纹理与资源',
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
    expect(pages).toContain('02.md')
  })
})
