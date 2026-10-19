import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture17 = readFileSync(resolve(dir, '17-versioning-release.md'), 'utf8')

// 案例切片：从「## 8. 实战案例」到文件结束（本讲无小结节，案例是收尾节）
function caseSection(src) {
  const start = src.indexOf('## 8. 实战案例')
  expect(start, '第 17 讲应存在「## 8. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 8. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 17 讲「灰度次日留存 -8pt 的口径与崩溃排查」）', () => {
  const sec = caseSection(lecture17)

  it('开发笔记结构完整：现象、排查、根因与回填', () => {
    for (const part of ['背景与现象', '根因', '回填清单']) {
      expect(sec.includes(part), `笔记缺少「${part}」信息`).toBe(true)
    }
    expect(/排查|归因/.test(sec), '笔记缺少排查过程').toBe(true)
    expect(sec.includes('```text'), '案例缺少处置时间线示意块').toBe(true)
  })

  it('数字闭环：留存缺口、崩溃倍数、机型分布与处置后回落均自洽', () => {
    const m1 = sec.match(/次日留存 \*\*(\d+)%\*\* vs \*\*(\d+)%\*\*/)
    expect(m1, '案例中找不到「留存对比」').toBeTruthy()
    const retGray = Number(m1[1])
    const retCtl = Number(m1[2])
    const gap = Number(sec.match(/缺口 \*\*(\d+)pt\*\*/)?.[1] ?? NaN)
    expect(retCtl - retGray).toBe(gap)

    const m2 = sec.match(/崩溃率 \*\*([\d.]+)%\*\* vs \*\*([\d.]+)%\*\*/)
    expect(m2, '案例中找不到「崩溃率对比」').toBeTruthy()
    const crGray = Number(m2[1])
    const crCtl = Number(m2[2])
    expect(crGray).toBeGreaterThan(crCtl)
    const statedRatio = Number(sec.match(/\*\*([\d.]+)\*\* 倍/)?.[1] ?? NaN)
    expect(Math.round((crGray / crCtl) * 10) / 10).toBe(statedRatio)

    const m3 = sec.match(/2GB 档 \*\*(\d+)%\*\*、4GB 档 \*\*(\d+)%\*\*、其余 \*\*(\d+)%\*\*/)
    expect(m3, '案例中找不到「机型档位分布」').toBeTruthy()
    expect(Number(m3[1]) + Number(m3[2]) + Number(m3[3])).toBe(100)

    const oom = Number(sec.match(/\*\*(\d+)%\*\* 是同一 OOM/)?.[1] ?? NaN)
    expect(oom).toBeGreaterThan(50)

    const mem = Number(sec.match(/\+\*\*(\d+)MB\*\*/)?.[1] ?? NaN)
    expect(mem).toBeGreaterThan(0)

    const recCrash = Number(sec.match(/回落到 \*\*([\d.]+)%\*\*/)?.[1] ?? NaN)
    const recRet = Number(sec.match(/回升到 \*\*(\d+)%\*\*/)?.[1] ?? NaN)
    expect(recCrash).toBeLessThanOrEqual(crCtl + 0.2)
    expect(recRet).toBeGreaterThanOrEqual(retCtl - 2)
    expect(recRet).toBeGreaterThan(retGray)
  })

  it('引用闭合：案例内「第 N 讲」对应真实文件，呼应节（2.5/3.2/3.3）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of ['### 2.5 最容易被忽略的测试难点', '### 3.2 灰度真正值钱的地方是什么', '### 3.3 回滚不是回到旧代码，而是回到旧的稳定组合']) {
      expect(lecture17.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '17-versioning-release.md'))).toBe(true)
  })
})
