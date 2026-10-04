import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/25-web-frontend/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「低分屏验收全绿，上线当天 58 条反馈」的 Canvas 渲染排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以误区 bullet 收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('规则运算应改用固定时步（见[本章 06 页](/25-web-frontend/06)）')
  expect(start, '第 19 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 25-web-frontend/01「低分屏验收全绿，上线当天 58 条反馈」的 Canvas 渲染排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少渲染四本账归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全，且表格恰为表头 + 分隔 + 4 行数据
    for (const row of [
      'DPR 收口',
      '帧循环骨架',
      '绘制批合',
      '文本与解码',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
    expect((sec.match(/^\| .* \| .* \| .* \|$/gm) || []).length).toBe(5)
    // 教学示例引言逐字回链页内五节
    for (const name of [
      '画布、坐标系与设备像素比',
      '帧循环：requestAnimationFrame',
      '绘制成本与批处理',
      '文本与图像',
      '常见误区',
    ]) {
      expect(sec.includes(`「${name}」`), `案例引言缺少回链「${name}」`).toBe(true)
    }
  })

  it('数字闭环：反馈账、清晰账、速度账、绘制账与复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 背景反馈账：发虚 37 + 变速 21 = 标题里的 58
    const fb = grab(/画面发虚 \*\*(\d+)\*\* 条、「新手机上角色跑得快」\*\*(\d+)\*\* 条/, '背景反馈账')
    expect(Number(fb[1]) + Number(fb[2])).toBe(Number(CASE_HEADING.match(/上线当天 (\d+) 条反馈/)[1]))
    // 背景速度账：每帧 4 像素 × 60Hz = 240、× 120Hz = 480，480 = 240 × 2
    const sp = grab(/每帧 \*\*(\d+)\*\* 像素 × \*\*(\d+)\*\*Hz = \*\*(\d+)\*\*px\/s、× \*\*(\d+)\*\*Hz = \*\*(\d+)\*\*px\/s，正好 \*\*(\d+)\*\* 倍/, '第一步速度账')
    expect(Number(sp[3])).toBe(Number(sp[1]) * Number(sp[2]))
    expect(Number(sp[5])).toBe(Number(sp[1]) * Number(sp[4]))
    expect(Number(sp[5]) / Number(sp[3])).toBe(Number(sp[6]))
    // 背景清晰账：DPR 3 → 3 × 3 = 9 个物理像素
    const dp = grab(/DPR \*\*(\d+)\*\* 的屏幕上 1 个画布像素摊到 \*\*(\d+)\*\* × \*\*(\d+)\*\* = \*\*(\d+)\*\* 个物理像素/, '第一步清晰账')
    expect(Number(dp[2])).toBe(Number(dp[1]))
    expect(Number(dp[3])).toBe(Number(dp[1]))
    expect(Number(dp[2]) * Number(dp[3])).toBe(Number(dp[4]))
    // 围栏四账：与背景逐项一致
    expect(Number(grab(/DPR (\d+) 的屏上 1 画布像素摊 (\d+) 个物理像素/, '围栏尺寸账')[1])).toBe(Number(dp[1]))
    expect(Number(grab(/DPR (\d+) 的屏上 1 画布像素摊 (\d+) 个物理像素/, '围栏尺寸账')[2])).toBe(Number(dp[4]))
    expect(Number(grab(/每帧固定 (\d+) 像素：(\d+)Hz (\d+)px\/s、(\d+)Hz (\d+)px\/s/, '围栏速度账')[1])).toBe(Number(sp[1]))
    expect(Number(grab(/每帧固定 (\d+) 像素：(\d+)Hz (\d+)px\/s、(\d+)Hz (\d+)px\/s/, '围栏速度账')[2])).toBe(Number(sp[2]))
    expect(Number(grab(/每帧固定 (\d+) 像素：(\d+)Hz (\d+)px\/s、(\d+)Hz (\d+)px\/s/, '围栏速度账')[3])).toBe(Number(sp[3]))
    expect(Number(grab(/每帧固定 (\d+) 像素：(\d+)Hz (\d+)px\/s、(\d+)Hz (\d+)px\/s/, '围栏速度账')[4])).toBe(Number(sp[4]))
    expect(Number(grab(/每帧固定 (\d+) 像素：(\d+)Hz (\d+)px\/s、(\d+)Hz (\d+)px\/s/, '围栏速度账')[5])).toBe(Number(sp[5]))
    expect(Number(grab(/(\d+) 实体乱序全量重绘、每帧 (\d+) 次 fillText/, '围栏绘制账')[1])).toBe(Number(grab(/团战场景（\*\*(\d+)\*\* 个实体）/, '背景实体')[1]))
    expect(Number(grab(/(\d+) 实体乱序全量重绘、每帧 (\d+) 次 fillText/, '围栏绘制账')[2])).toBe(Number(grab(/每帧还对 \*\*(\d+)\*\* 个数值标签/, '背景标签')[1]))
    expect(Number(grab(/每 (\d+) 秒一次 GC，帧率掉到 (\d+)/, '围栏抖动账')[1])).toBe(Number(grab(/每 \*\*(\d+)\*\* 秒一次的规律性掉帧，帧率掉到 \*\*(\d+)\*\*/, '背景掉帧')[1]))
    expect(Number(grab(/每 (\d+) 秒一次 GC，帧率掉到 (\d+)/, '围栏抖动账')[2])).toBe(Number(grab(/每 \*\*(\d+)\*\* 秒一次的规律性掉帧，帧率掉到 \*\*(\d+)\*\*/, '背景掉帧')[2]))
    // 收束账：2 倍速、9 倍摊像素、28 帧与正文一致
    const cl = grab(/\*\*(\d+)\*\* 倍速是速度账，\*\*(\d+)\*\* 倍摊像素是尺寸账，\*\*(\d+)\*\* 帧是绘制账加抖动账/, '收束账')
    expect(Number(cl[1])).toBe(Number(sp[6]))
    expect(Number(cl[2])).toBe(Number(dp[4]))
    expect(Number(cl[3])).toBe(Number(grab(/帧率掉到 \*\*(\d+)\*\*。/, '背景帧率')[1]))
    // 应急：改 delta time 后 60/120Hz 同为每秒 240 像素（= 4 × 60），速度差 0
    const dt = grab(/运动改 delta time、语义定为每秒 \*\*(\d+)\*\* 像素，复测 \*\*(\d+)\*\*Hz 与 \*\*(\d+)\*\*Hz 同为 \*\*(\d+)\*\*px\/s、速度差 \*\*(\d+)\*\*/, '应急速度')
    expect(Number(dt[1])).toBe(Number(sp[3]))
    expect(Number(dt[1])).toBe(Number(sp[1]) * Number(sp[2]))
    expect(Number(dt[2])).toBe(Number(sp[2]))
    expect(Number(dt[3])).toBe(Number(sp[4]))
    expect(Number(dt[4])).toBe(Number(dt[1]))
    expect(Number(dt[5])).toBe(0)
    // 应急绘制账：120 → 1 图集、fillText 40 → 0、切换 110 → 8、帧率 28 → 56（翻倍）
    expect(Number(grab(/\*\*(\d+)\*\* 张散图合 \*\*(\d+)\*\* 张图集/, '应急图集')[2])).toBe(1)
    const ft = grab(/`fillText` 每帧 \*\*(\d+)\*\* → \*\*(\d+)\*\* 次/, '应急标签')
    expect(Number(ft[1])).toBe(Number(grab(/每帧还对 \*\*(\d+)\*\* 个数值标签/, '背景标签')[1]))
    expect(Number(ft[2])).toBe(0)
    const fr = grab(/帧内状态切换从 \*\*(\d+)\*\* 次降到 \*\*(\d+)\*\* 次，团战帧率从 \*\*(\d+)\*\* 回到 \*\*(\d+)\*\*/, '应急帧率')
    expect(Number(fr[2])).toBeLessThan(Number(fr[1]))
    expect(Number(fr[4])).toBe(Number(fr[3]) * 2)
    expect(Number(fr[3])).toBe(Number(grab(/帧率掉到 \*\*(\d+)\*\*。/, '背景帧率')[1]))
    // 应急抖动与解码：GC 每 2 秒 → 0；首帧 300ms → 16ms
    expect(Number(grab(/每 \*\*(\d+)\*\* 秒一次的 GC 抖动归 \*\*(\d+)\*\*/, '应急抖动')[1])).toBe(Number(grab(/每 \*\*(\d+)\*\* 秒一次的规律性掉帧，帧率掉到 \*\*(\d+)\*\*/, '背景掉帧')[1]))
    expect(Number(grab(/每 \*\*(\d+)\*\* 秒一次的 GC 抖动归 \*\*(\d+)\*\*/, '应急抖动')[2])).toBe(0)
    const dc = grab(/首帧停顿从 \*\*(\d+)\*\*ms 压到 \*\*(\d+)\*\*ms 以内/, '应急解码')
    expect(Number(dc[1])).toBe(Number(grab(/首帧停 \*\*(\d+)\*\*ms/, '背景首帧')[1]))
    expect(Number(dc[2])).toBeLessThan(Number(dc[1]))
    // 复核账：三机速度 240 差 0、反馈 0、56 帧、GC 掉帧 0、新模块 0 复发
    const rv = grab(/速度一致 \*\*(\d+)\*\*px\/s（差 \*\*(\d+)\*\*）、发虚与变速反馈 \*\*(\d+)\*\* 条、团战稳定 \*\*(\d+)\*\* 帧、\*\*(\d+)\*\* 分钟内 GC 掉帧 \*\*(\d+)\*\* 次/, '复核账')
    expect(Number(rv[1])).toBe(Number(dt[4]))
    expect(Number(rv[2])).toBe(0)
    expect(Number(rv[3])).toBe(0)
    expect(Number(rv[4])).toBe(Number(fr[4]))
    expect(Number(rv[6])).toBe(0)
    expect(Number(grab(/后续 \*\*(\d+)\*\* 个新玩法模块按 checklist 开发，\*\*(\d+)\*\* 例复发/, '复核新模块')[2])).toBe(0)
    // 教训回扣：37/21、28 对 56、每 2 秒与 40 个标签均与正文一致
    const l1 = grab(/上线当天以 \*\*(\d+)\*\* 条发虚加 \*\*(\d+)\*\* 条变速反馈到账/, '教训一')
    expect(Number(l1[1])).toBe(Number(fb[1]))
    expect(Number(l1[2])).toBe(Number(fb[2]))
    const l2 = grab(/帧率差一倍（\*\*(\d+)\*\* 对 \*\*(\d+)\*\*）/, '教训二')
    expect(Number(l2[1])).toBe(Number(fr[3]))
    expect(Number(l2[2])).toBe(Number(fr[4]))
    const l3 = grab(/每 \*\*(\d+)\*\* 秒一次的 GC 抖动，每帧重画的 \*\*(\d+)\*\* 个标签变成 \*\*(\d+)\*\* 次无谓光栅化/, '教训三')
    expect(Number(l3[1])).toBe(2)
    expect(Number(l3[2])).toBe(Number(ft[1]))
    expect(Number(l3[3])).toBe(Number(ft[1]))
  })

  it('声称对账：绘制四手段、页内纯段落节与常见误区五条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内「绘制成本与批处理」恰好 4 条手段
    const sDraw = page.slice(page.indexOf('## 绘制成本与批处理'), page.indexOf('## 文本与图像'))
    expect((sDraw.match(/^- /gm) || []).length).toBe(4)
    // 页内前三节为纯段落体例（配代码块，无 bullet 列表）
    for (const [from, to] of [
      ['## 画布、坐标系与设备像素比', '## 帧循环：requestAnimationFrame'],
      ['## 帧循环：requestAnimationFrame', '## 绘制成本与批处理'],
      ['## 文本与图像', '## 常见误区'],
    ]) {
      expect((page.slice(page.indexOf(from), page.indexOf(to)).match(/^- /gm) || []).length).toBe(0)
    }
    // 本页常见误区为 5 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(5)
    // 案例引用的页内原话：页面与案例双边可查
    const quotes = [
      '如果画布像素尺寸只等于 CSS 尺寸，一个画布像素要覆盖多个物理像素，画面就会发虚',
      '按设备像素比（`devicePixelRatio`）放大画布，再用坐标变换把绘制逻辑保持在一套尺寸里',
      '帧循环里必须用时间差（delta time）驱动运动',
      '每帧走固定像素',
      'delta time 驱动、rAF 驱动、每帧先清后画',
      '成本大头通常不在「画了多大」，而在「切换了几次状态」',
      '把小图合进一张大图',
      '把不变化的复杂组合（静态背景、一段带描边的文字）预渲染到看不见的画布上',
      '按填充色、按图集分组绘制，而不是按对象顺序乱序画',
      '只重绘发生变化的最小区域',
      '应该预渲染成位图或字体图集',
      '可以提前消化解码成本',
      '开发机是低分屏时看不出问题，到用户手机上整体发虚',
      '每帧新建数组、闭包、临时画布会加重 GC，表现为规律性的掉帧抖动',
    ]
    for (const s of quotes) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
      expect(sec.includes(s), `案例缺少所引用的原话: ${s}`).toBe(true)
    }
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 画布、坐标系与设备像素比',
      '## 帧循环：requestAnimationFrame',
      '## 绘制成本与批处理',
      '## 文本与图像',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/25-web-frontend')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(7)
    expect(pages).toContain('index.md')
  })
})
