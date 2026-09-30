import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture21 = readFileSync(resolve(dir, '21-art-audio-pipeline.md'), 'utf8')
const lecture20 = readFileSync(resolve(dir, '20-game-testing.md'), 'utf8')

// 案例切片：从「## 9. 实战案例」到文件结束（小结为编号第 8 节，案例追加在第 8 节之后）
function caseSection(src) {
  const start = src.indexOf('## 9. 实战案例')
  expect(start, '第 21 讲应存在「## 9. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 9. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 21 讲「42MB 不该进包」的资源审计排查）', () => {
  const sec = caseSection(lecture21)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：包体增量、引用图账本、来源拆刀、规则对账与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：180 → 222MB，增量 42MB = 23%
    const grow = grab(/从 \*\*(\d+)\*\*MB 膨胀到 \*\*(\d+)\*\*MB/, '补丁包膨胀')
    const baseline = Number(grow[1])
    const incident = Number(grow[2])
    const delta = incident - baseline
    const inc = grab(/增量 \*\*(\d+)\*\*MB（\*\*(\d+)%\*\*）/, '增量与占比')
    expect(Number(inc[1])).toBe(delta)
    expect(Math.round((delta / baseline) * 100)).toBe(Number(inc[2]))
    // 第一步：打包清单 4310 条目；口径差 = 42MB = 膨胀增量
    const listed = Number(grab(/导出共 \*\*(\d+)\*\* 个条目/, '清单条目')[1])
    expect(Number(grab(/口径差 = \*\*(\d+)\*\*MB/, '口径差')[1])).toBe(delta)
    // 第二步：4.2 节 3 层归属与讲内表格行数对账
    const layers = Number(grab(/4\.2 节的 \*\*(\d+)\*\* 层归属/, '三层归属')[1])
    expect((lecture21.match(/^\| (资源本体|管线层|引用层) \|/gm) || []).length).toBe(layers)
    // 收敛：4310 − 4102 = 208 孤儿（29MB）；重复 37 组 × 0.35 ≈ 13MB；29 + 13 = 42
    const gather = grab(/\*\*账本收敛\*\*：\*\*(\d+)\*\* − \*\*(\d+)\*\* = \*\*(\d+)\*\* 孤儿（\*\*(\d+)\*\*MB）/, '引用图账本')
    expect(Number(gather[1])).toBe(listed)
    const hit = Number(gather[2])
    const orphans = Number(gather[3])
    const orphanMB = Number(gather[4])
    expect(Number(gather[1]) - hit).toBe(orphans)
    const dup = grab(/重复 \*\*(\d+)\*\* 组 × \*\*([\d.]+)\*\*MB ≈ \*\*(\d+)\*\*MB/, '重复账本')
    const dupGroups = Number(dup[1])
    const dupPer = Number(dup[2])
    const dupMB = Number(dup[3])
    expect(Math.round(dupGroups * dupPer)).toBe(dupMB)
    expect(orphanMB + dupMB).toBe(delta)
    const twoNineteen = Number(grab(/29 \+ 13 = \*\*(\d+)\*\*MB/, '两刀合账')[1])
    expect(twoNineteen).toBe(delta)
    // 来源拆刀：旧皮肤 38MB + 活动图标 4MB = 42MB（与增量同值）
    const src = grab(/已下线旧皮肤 \*\*(\d+)\*\*MB \+ 过期活动图标 \*\*(\d+)\*\*MB = \*\*(\d+)\*\*MB/, '来源拆刀')
    expect(Number(src[1]) + Number(src[2])).toBe(Number(src[3]))
    expect(Number(src[3])).toBe(delta)
    // 第三步声称与讲内实况对账：审计四规则、陷阱表 8 条第 4/5 条、门禁骨架 3 条 if 分支
    const rulesClaim = Number(grab(/审计规则定义了 \*\*(\d+)\*\* 类/, '审计规则数')[1])
    const s24 = lecture21.slice(lecture21.indexOf('### 2.4'), lecture21.indexOf('## 3. 音频管线'))
    expect((s24.match(/^\d\. \*\*/gm) || []).length).toBe(rulesClaim)
    const traps = grab(/陷阱表 \*\*(\d+)\*\* 条里的第 \*\*(\d+)\*\*、\*\*(\d+)\*\* 条/, '陷阱条数与位次')
    const s7 = lecture21.slice(lecture21.indexOf('## 7. 常见陷阱总结'), lecture21.indexOf('## 8. 小结'))
    const trapRows = s7.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 陷阱') && !l.startsWith('|---'))
    expect(trapRows.length).toBe(Number(traps[1]))
    expect(trapRows[Number(traps[2]) - 1]).toContain('审计只进 wiki')
    expect(trapRows[Number(traps[3]) - 1]).toContain('孤儿资源不清')
    const skeleton = Number(grab(/门禁骨架只实现了 \*\*(\d+)\*\* 条/, '骨架规则数')[1])
    const s5 = lecture21.slice(lecture21.indexOf('## 5. 代码示例'), lecture21.indexOf('## 6. 实战建议'))
    expect((s5.match(/^    if /gm) || []).length).toBe(skeleton)
    // 第四步：孤儿 208 → 0、重复 37 → 0、222 → 180（−42）；规则 3 → 4；观察 7 天；红线 200 落在基线与事故点之间
    const cleanOrphan = grab(/孤儿 \*\*(\d+)\*\* → \*\*(\d+)\*\*/, '孤儿清零')
    expect(Number(cleanOrphan[1])).toBe(orphans)
    expect(Number(cleanOrphan[2])).toBe(0)
    const cleanDup = grab(/重复 \*\*(\d+)\*\* 组 → \*\*(\d+)\*\* 组/, '重复清零')
    expect(Number(cleanDup[1])).toBe(dupGroups)
    expect(Number(cleanDup[2])).toBe(0)
    const pack = grab(/补丁包 \*\*(\d+)\*\* → \*\*(\d+)\*\*MB（−\*\*(\d+)\*\*MB/, '包体回落')
    expect(Number(pack[1])).toBe(incident)
    expect(Number(pack[2])).toBe(baseline)
    expect(Number(pack[1]) - Number(pack[2])).toBe(Number(pack[3]))
    const ruleUp = grab(/规则从 \*\*(\d+)\*\* 条 → \*\*(\d+)\*\* 条/, '规则补齐')
    expect(Number(ruleUp[1])).toBe(skeleton)
    expect(Number(ruleUp[2])).toBe(rulesClaim)
    expect(Number(grab(/观察依赖 \*\*(\d+)\*\* 天/, '下线观察期')[1])).toBeGreaterThanOrEqual(1)
    const redLine = Number(grab(/红线 \*\*(\d+)\*\*MB/, '补丁包红线')[1])
    expect(redLine).toBeGreaterThan(baseline)
    expect(redLine).toBeLessThan(incident)
    // 复核：180 + 2 = 182，孤儿保持 0
    const next = grab(/下一班补丁新增 \*\*(\d+)\*\*MB、包体 \*\*(\d+)\*\*MB/, '下班补丁')
    expect(baseline + Number(next[1])).toBe(Number(next[2]))
    expect(Number(grab(/孤儿保持 \*\*(\d+)\*\*/, '孤儿保持')[1])).toBe(Number(cleanOrphan[2]))
    // 跨讲对账：第 20 讲包体红线确实只写了主包/整包（补丁包缺位的讲内依据）
    expect(lecture20.includes('| 包体大小 | 主包/整包红线（平台规则为准） |')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与 §5 门禁骨架代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '## 1. 资源管线全景：从 DCC 工具到玩家设备',
      '### 2.3 资源版本：与代码版本的两套节奏',
      '### 2.4 工具链与资源审计：把规格变成门禁',
      '### 4.1 变更的代价不对称',
      '### 4.2 资源出问题时的排障路径',
      '## 5. 代码示例',
      '## 7. 常见陷阱总结',
    ]) {
      expect(lecture21.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与第 5 节骨架一致：命名/尺寸/孤儿三条 if 规则
    expect(lecture21.includes('if a.MaxDim > 2048')).toBe(true)
    expect(lecture21.includes('if a.RefCount == 0')).toBe(true)
    expect(existsSync(resolve(dir, '21-art-audio-pipeline.md'))).toBe(true)
  })
})
