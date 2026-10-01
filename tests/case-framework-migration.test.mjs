import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture06 = readFileSync(resolve(dir, '06-frameworks.md'), 'utf8')

// 案例切片：第 06 讲为编号小节体例（0–18），案例按「## 19.」追加在文件末尾
function caseSection(src) {
  const start = src.indexOf('## 19. 实战案例：一次「迁移后移动一卡一卡')
  const summary = src.indexOf('## 18. 小结')
  expect(start, '第 06 讲应存在「## 19. 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于小结之后（文件末尾）').toBeGreaterThan(summary)
  expect(src.indexOf('## 19. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 06 讲「迁移后移动一卡一卡」的隐式行为遗漏排查）', () => {
  const sec = caseSection(lecture06)

  it('四段结构齐全：现象口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '### 第一步：现象与口径', '### 第二步：分层归因', '### 第三步：根因', '### 第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of ['行为快照清单', '隐式行为盘点', '按 RTT 分桶', '行为完整性」前置条件']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：反馈分桶账、成本账、处置复核账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 分桶账：四桶之和 = 总反馈 540
    const low = Number(grab(/\*\*<50ms\*\*：\*\*(\d+)\*\* 条/, '<50ms 桶')[1])
    const mid = Number(grab(/\*\*50–100ms\*\*：\*\*(\d+)\*\* 条/, '50–100ms 桶')[1])
    const high = Number(grab(/\*\*100–200ms\*\*：\*\*(\d+)\*\* 条/, '100–200ms 桶')[1])
    const top = Number(grab(/\*\*>200ms\*\*：\*\*(\d+)\*\* 条/, '>200ms 桶')[1])
    const total = Number(grab(/「移动一卡一卡\/瞬移」反馈 \*\*(\d+)\*\* 条/, '总反馈')[1])
    expect(low + mid + high + top).toBe(total)
    expect(total).toBe(540)
    // 高时延桶合计与占比：430/540 ≈ 80%
    const heavy = Number(grab(/高时延桶合计 \*\*(\d+)\*\* 条/, '高时延桶')[1])
    expect(heavy).toBe(high + top)
    expect(Math.round((heavy / total) * 100)).toBe(Number(grab(/约占 \*\*(\d+)\*\*%/, '高时延占比')[1]))
    // 成本账：Photon 3.8 万 − 自建 1.5 万 = 每月省 2.3 万
    const photon = grab(/月账单从 \*\*(\d+(?:\.\d+)?)\*\* 万涨到 \*\*(\d+(?:\.\d+)?)\*\* 万/, 'Photon 账单')
    const selfCost = Number(grab(/自建月成本 \*\*(\d+(?:\.\d+)?)\*\* 万/, '自建成本')[1])
    const saving = Number(grab(/每月省 \*\*(\d+(?:\.\d+)?)\*\* 万/, '节省')[1])
    expect(Number(photon[2]) - selfCost).toBeCloseTo(saving, 5)
    expect(Number(photon[1])).toBeLessThan(Number(photon[2]))
    // 清单账：86 条显式验收 vs 0 条隐式行为在清单上
    expect(Number(grab(/功能清单 \*\*(\d+)\*\* 条全部验收通过/, '迁移功能清单')[1])).toBe(86)
    expect(sec.includes('0 条在清单上'), '隐式行为应有 0 条在清单上').toBe(true)
    // 处置账：三件事参数在位，复核账与首测同源
    expect(Number(grab(/插值缓冲 \*\*(\d+)\*\*ms/, '插值缓冲')[1])).toBe(100)
    expect(Number(grab(/预测窗口 \*\*(\d+)\*\* 帧/, '预测窗口')[1])).toBeGreaterThan(0)
    const re = grab(/周反馈 \*\*(\d+)\*\* 条 → \*\*(\d+)\*\* 条，其中 \*\*>200ms\*\* 桶 \*\*(\d+)\*\* 条 → \*\*(\d+)\*\* 条/, '复核账')
    expect(Number(re[1])).toBe(total)
    expect(Number(re[2])).toBeLessThan(total)
    expect(Number(re[3])).toBe(top)
    expect(Number(re[4])).toBeLessThan(top)
    // 处置后成本与自建成本同源
    expect(Number(grab(/月成本 \*\*(\d+(?:\.\d+)?)\*\* 万 → \*\*(\d+(?:\.\d+)?)\*\* 万/, '成本复核')[2])).toBe(selfCost)
  })

  it('声称对账：阶段五选型、Photon 迁移五步与隐式实现之坑、渐进式原则、决策树行均与讲内实况一致', () => {
    // 阶段五「手游快速上线」推荐 Photon：案例背景引用的卖点与讲内逐字一致
    const s5 = lecture06.slice(lecture06.indexOf('### 阶段五：手游快速上线'), lecture06.indexOf('## 15. 框架迁移指南'))
    expect(lecture06.includes('### 阶段五：手游快速上线')).toBe(true)
    expect(s5).toContain('Photon（PUN/Quantum/Fusion）')
    expect(s5).toContain('客户端 SDK 完善，匹配/房间开箱即用')
    expect(sec.includes('匹配/房间开箱即用')).toBe(true)
    // 决策树「射击/动作（小规模）」行：案例起步选型出处
    const treeRow = lecture06.split('\n').find(l => l.includes('射击/动作（小规模）'))
    expect(treeRow, '决策树应有「射击/动作（小规模）」行').toBeTruthy()
    expect(treeRow).toContain('Photon Fusion')
    expect(sec.includes('射击/动作（小规模）')).toBe(true)
    // 迁移指南「从 Photon 迁移到自研」：恰好 5 步，坑句被案例逐字引用
    const sPho = lecture06.slice(lecture06.indexOf('### 从 Photon 迁移到自研'), lecture06.indexOf('### 从 KBEngine 迁移到 Pitaya'))
    expect((sPho.match(/^\d\. /gm) || []).length).toBe(5)
    expect(sPho).toContain('Photon 的很多功能是隐式实现的（如状态同步的插值、预测），迁移时很容易遗漏')
    expect(sec.includes('Photon 的很多功能是隐式实现的（如状态同步的插值、预测）')).toBe(true)
    // 渐进式替换原则：讲内与案例逐字呼应
    expect(lecture06.includes('渐进式替换')).toBe(true)
    expect(lecture06.includes('每次迁移只解决一个核心问题')).toBe(true)
    expect(sec.includes('渐进式替换')).toBe(true)
    expect(sec.includes('每次迁移只解决一个核心问题')).toBe(true)
    // 隐式三件事与讲内框架能力矩阵呼应：Photon 侧热更新/插值不在矩阵内，但案例只声称 SDK 隐式行为
    expect(sec.includes('插值平滑')).toBe(true)
    expect(sec.includes('客户端预测与和解')).toBe(true)
    expect(sec.includes('抖动缓冲')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与跨讲锚点真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    // 第 04 讲的回拉口径真实存在
    const lecture04 = readFileSync(resolve(dir, '04-network.md'), 'utf8')
    expect(lecture04.includes('客户端预测位被服务端权威状态拉回')).toBe(true)
    // 第 09 讲的双缓冲真实存在
    const lecture09 = readFileSync(resolve(dir, '09-programming-patterns.md'), 'utf8')
    expect(lecture09.includes('### 7. 双缓冲（Double Buffer）')).toBe(true)
    expect(lecture09.includes('画师在一块上画，摄影师只拍另一块')).toBe(true)
    expect(sec.includes('双缓冲')).toBe(true)
    // 第 13 讲分位口径真实存在（第 04 讲案例曾引用「监控全绿」同一课）
    const lecture13 = readFileSync(resolve(dir, '13-tech-ops.md'), 'utf8')
    expect(lecture13.includes('监控全绿')).toBe(true)
    for (const anchor of [
      '## 18. 小结',
      '### 阶段五：手游快速上线',
      '### 从 Photon 迁移到自研',
      '## 13. 框架选型矩阵',
    ]) {
      expect(lecture06.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '06-frameworks.md'))).toBe(true)
  })
})
