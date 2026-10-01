import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture16 = readFileSync(resolve(dir, '16-scripting-hotfix.md'), 'utf8')

// 案例切片：从「## 6. 实战案例」到文件结束（小结为编号第 5 节，案例追加在第 5 节之后）
function caseSection(src) {
  const start = src.indexOf('## 6. 实战案例')
  expect(start, '第 16 讲应存在「## 6. 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于小结之后').toBeGreaterThan(src.indexOf('## 5. 常见误区与总结'))
  expect(src.indexOf('## 6. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 16 讲「校验全过、运行才崩」的热更兼容排查）', () => {
  const sec = caseSection(lecture16)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    for (const layer of ['下载层', '校验层', '兼容层', '观测层']) {
      expect(sec.includes(layer), `分层归因缺少「${layer}」`).toBe(true)
    }
  })

  it('数字闭环：倍数、暴露账本、崩溃账本与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：下载 99.8% 全绿、校验 0 失败；崩溃 0.2% → 1.2%（6 倍）
    const dl = grab(/下载成功率 \*\*([\d.]+)\*\*%、校验失败 \*\*(\d+)\*\* 次/, '下载与校验')
    expect(Number(dl[1])).toBeGreaterThan(99)
    expect(Number(dl[2])).toBe(0)
    const crash = grab(/基线 \*\*([\d.]+)\*\*% 涨到 \*\*([\d.]+)\*\*%（\*\*(\d+)\*\* 倍）/, '崩溃倍数')
    const base = Number(crash[1])
    const peak = Number(crash[2])
    expect(Math.round(peak / base)).toBe(Number(crash[3]))
    expect(Number(grab(/是基线的 \*\*(\d+)\*\* 倍/, '口径复述')[1])).toBe(Number(crash[3]))
    // 第一步：宿主 2.1.x 崩 3.5%，宿主 2.3.x 为 0.2%（=基线）；口径差 2 维度监控 0 个
    const split = grab(/宿主 \*\*([\d.]+)\*\*\.x 崩溃率 \*\*([\d.]+)\*\*%，宿主 \*\*([\d.]+)\*\*\.x 为 \*\*([\d.]+)\*\*%——与基线持平/, '版本拆分')
    const oldHost = split[1]
    const oldRate = Number(split[2])
    expect(Number(split[4])).toBe(base)
    const gap = grab(/按 \*\*(\d+)\*\* 个分层维度拆（宿主版本 × 补丁层级），监控 \*\*(\d+)\*\* 个/, '口径差')
    expect(Number(gap[1])).toBe(2)
    expect(Number(gap[2])).toBe(0)
    expect(Number(grab(/」\*\*(\d+)\*\* 个维度拆分/, '观测补位')[1])).toBe(Number(gap[1]))
    // 收敛：5 万 × 30% = 1.5 万台；2 万次/小时 × 3.5% = 700 次/小时；局部 17.5 倍
    const dau = Number(grab(/在线 \*\*(\d+)\*\* 万台/, '在线规模')[1])
    const expo = grab(/占 \*\*(\d+)\*\*% = \*\*([\d.]+)\*\* 万台/, '暴露账本')
    expect(dau * 10000 * (Number(expo[1]) / 100)).toBe(Number(expo[2]) * 10000)
    const bursts = grab(/进入 \*\*(\d+)\*\* 万次\/小时，老宿主崩溃 20000 × ([\d.]+)% = \*\*(\d+)\*\* 次\/小时/, '崩溃账本')
    expect(bursts[0].includes('20000')).toBe(true)
    expect(Math.round(Number(bursts[1]) * 10000 * (Number(bursts[2]) / 100))).toBe(Number(bursts[3]))
    expect(Number(bursts[2])).toBe(oldRate)
    const times = grab(/基线的 \*\*([\d.]+)\*\* 倍（3\.5 ÷ 0\.2）/  , '局部恶化倍数')
    expect(Math.round((oldRate / base) * 10) / 10).toBe(Number(times[1]))
    // 根因：6 层只建 2 层缺 4 层；直发全量 100%
    const layers = grab(/体系 \*\*(\d+)\*\* 层能力只建了 \*\*(\d+)\*\* 层/, '体系层数')
    expect(Number(layers[1]) - Number(layers[2])).toBe(Number(grab(/缺的 \*\*(\d+)\*\* 层/, '缺层')[1]))
    expect(Number(grab(/直发全量 \*\*(\d+)\*\*%/, '直发比例')[1])).toBe(100)
    // 处置：40 分钟止血；4 字段矩阵；宿主 2.1.x 0 下发；5 阶段灰度
    expect(Number(grab(/从决策到全网生效 \*\*(\d+)\*\* 分钟/, '止血时长')[1])).toBeGreaterThan(0)
    const fields = grab(/rollback_target \*\*(\d+)\*\* 字段/, '矩阵字段')[1]
    expect(sec.match(/host_min \/ host_max \/ 依赖清单 \/ rollback_target/)[0].split(' / ').length).toBe(Number(fields))
    const ban = grab(/宿主 \*\*([\d.]+)\*\*\.x 从此 \*\*(\d+)\*\* 下发/, '老宿主停发')
    expect(ban[1]).toBe(oldHost)
    expect(Number(ban[2])).toBe(0)
    expect(Number(grab(/按 4\.5 节 \*\*(\d+)\*\* 阶段放量/, '灰度阶段')[1])).toBe(5)
    // 复核：1.2% → 0.2% 回基线；10% 阶段观察 24 小时
    const back = grab(/崩溃率 \*\*([\d.]+)\*\*% → \*\*([\d.]+)\*\*%，回到基线/, '崩溃回落')
    expect(Number(back[1])).toBe(peak)
    expect(Number(back[2])).toBe(base)
    const gray = grab(/在 \*\*(\d+)\*\*% 阶段观察 \*\*(\d+)\*\* 小时/, '灰度观察')
    expect(Number(gray[1])).toBe(10)
    expect(Number(gray[2])).toBe(24)
  })

  it('声称对账：兼容表 4 行第 1 行、体系 6 层、灰度 5 阶段、测试 P0 3 项、误区表 3 行全部与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 4.3 兼容表 4 行，第 1 行「接口依赖」
    const compat = grab(/兼容表 \*\*(\d+)\*\* 行里的第 \*\*(\d+)\*\* 行/, '兼容行数与位次')
    const s43 = lecture16.slice(lecture16.indexOf('### 4.3 最危险'), lecture16.indexOf('### 4.4 回滚'))
    const compatRows = s43.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 兼容性问题') && !l.startsWith('|---'))
    expect(compatRows.length).toBe(Number(compat[1]))
    expect(compatRows[Number(compat[2]) - 1]).toContain('接口依赖')
    // 4.2 体系 6 层能力
    const layers = Number(grab(/体系 \*\*(\d+)\*\* 层能力/, '体系层数')[1])
    const s42 = lecture16.slice(lecture16.indexOf('### 4.2 一套热更新体系'), lecture16.indexOf('### 4.3 最危险'))
    expect(s42.split('\n').filter(l => l.startsWith('- ')).length).toBe(layers)
    // 4.5 灰度 5 阶段：首阶段 0.1%，扩大灰度阶段 10%/24 小时
    const stages = Number(grab(/按 4\.5 节 \*\*(\d+)\*\* 阶段放量/, '灰度阶段')[1])
    const s45 = lecture16.slice(lecture16.indexOf('### 4.5 灰度'), lecture16.indexOf('### 4.6 热更'))
    const stageRows = s45.split('\n').filter(l => /^│ (内部验证|小范围灰度|扩大灰度|大面积放量|全量发布)/.test(l))
    expect(stageRows.length).toBe(stages)
    expect(stageRows[0]).toContain('内部验证')
    expect(stageRows[0]).toContain('0.1%')
    const expandRow = stageRows.find(l => l.includes('扩大灰度'))
    expect(expandRow).toContain('10%')
    expect(expandRow).toContain('24小时')
    // 4.6 测试表 4 层，P0 级 3 项
    const p0 = grab(/测试表 \*\*(\d+)\*\* 层里 P0 级 \*\*(\d+)\*\* 项/, '测试层数与 P0')
    const s46 = lecture16.slice(lecture16.indexOf('### 4.6 热更'), lecture16.indexOf('## 5. 常见'))
    const testRows = s46.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 测试层级') && !l.startsWith('|---'))
    expect(testRows.length).toBe(Number(p0[1]))
    expect(testRows.filter(l => l.includes('| P0 |')).length).toBe(Number(p0[2]))
    // 5.3 误区表 3 行，第 1 行「热更新 = 测试替代品」
    const myth = grab(/误区表 \*\*(\d+)\*\* 行里的第 \*\*(\d+)\*\* 行/, '误区行数与位次')
    const s53 = lecture16.slice(lecture16.indexOf('### 5.3 热更新常见误区'), lecture16.indexOf('### 5.4 核心'))
    const mythRows = s53.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 误区') && !l.startsWith('|---'))
    expect(mythRows.length).toBe(Number(myth[1]))
    expect(mythRows[Number(myth[2]) - 1]).toContain('测试替代品')
    // 4.4 兼容矩阵 pin 与 4.3 原句 pin
    expect(lecture16.includes('rollback_target: "hotfix_2.1.2"')).toBe(true)
    expect(lecture16.includes('但运行时才开始崩')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与兼容矩阵 yaml 真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 2.5 为什么调试和观测能力不能后补',
      '### 4.2 一套热更新体系通常不只是一条下载链',
      '### 4.3 最危险的问题是兼容性，而不是下载失败',
      '### 4.4 回滚能力为什么需要优先级极高',
      '### 4.5 灰度不是附加优化，而是事故隔离机制',
      '### 4.6 热更新和测试是什么关系',
      '### 5.3 热更新常见误区',
    ]) {
      expect(lecture16.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与讲内兼容矩阵一致：host_min 过滤 + rollback_target 回滚
    expect(lecture16.includes('host_min')).toBe(true)
    expect(lecture16.includes('rollback_target')).toBe(true)
    expect(existsSync(resolve(dir, '16-scripting-hotfix.md'))).toBe(true)
  })
})
