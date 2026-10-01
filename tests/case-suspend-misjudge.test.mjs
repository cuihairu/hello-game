import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture03 = readFileSync(resolve(dir, '03-frontend-engines.md'), 'utf8')

// 案例切片：从「## 12. 实战案例」到文件结束（小结为编号第 11 节，案例追加在第 11 节之后）
function caseSection(src) {
  const start = src.indexOf('## 12. 实战案例')
  expect(start, '第 03 讲应存在「## 12. 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于小结之后').toBeGreaterThan(src.indexOf('## 11. 小结'))
  expect(src.indexOf('## 12. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 03 讲「切个微信就要重新登录」的切后台误判掉线排查）', () => {
  const sec = caseSection(lecture03)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：误判率、超时推导、风暴账本与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：客诉 486 份；抽样 3000 次重连里 2210 次心跳超时 = 误判率 74%
    const complaints = Number(grab(/客诉 \*\*(\d+)\*\* 份/, '客诉量')[1])
    const sample = grab(/抽样 \*\*(\d+)\*\* 次重连，其中 \*\*(\d+)\*\* 次/, '重连抽样')
    const sampleN = Number(sample[1])
    const misCount = Number(sample[2])
    expect(Math.round((misCount / sampleN) * 100)).toBe(Number(grab(/误判率 \*\*(\d+)\*\*%/, '误判率')[1]))
    // 第一步：心跳 10 秒、阈值 30 秒、容忍丢 2 个心跳；阈值比 600 秒合法静默短 20 倍
    const hb = grab(/心跳间隔 \*\*(\d+)\*\* 秒、超时阈值 \*\*(\d+)\*\* 秒/, '心跳与阈值')
    const interval = Number(hb[1])
    const threshold = Number(hb[2])
    expect(Number(grab(/容忍丢 \*\*(\d+)\*\* 个心跳/, '容忍心跳')[1])).toBe(threshold / interval - 1)
    const silent = Number(grab(/静默可达 \*\*(\d+)\*\* 分钟以上/, 'Android 静默')[1])
    const gap = grab(/按 \*\*(\d+)\*\* 秒计）短 \*\*(\d+)\*\* 倍/, '口径差')
    expect(Number(gap[1])).toBe(silent * 60)
    expect(Number(gap[1]) / threshold).toBe(Number(gap[2]))
    // 收敛：5 万 × 6 次 × 40% = 12 万人次/天；800 人/分钟 × 18 接口 = 1.44 万 QPS
    const dau = Number(grab(/日活 \*\*(\d+)\*\* 万/, '日活')[1])
    const switches = Number(grab(/人均每天切后台 \*\*(\d+)\*\* 次/, '人均切后台')[1])
    const frac = grab(/静默超 \*\*(\d+)\*\* 秒的占 \*\*(\d+)\*\*%/, '超阈占比')
    expect(Number(frac[1])).toBe(threshold)
    const misWan = Number(grab(/= \*\*(\d+)\*\* 万人次/, '误判人次')[1])
    expect((dau * 10000 * switches * Number(frac[2])) / 100).toBe(misWan * 10000)
    const api = Number(grab(/全量重拉 \*\*(\d+)\*\* 个接口/, '全量接口数')[1])
    const storm = grab(/瞬时 \*\*(\d+)\*\* 人\/分钟 × \*\*(\d+)\*\* 接口 = \*\*([\d.]+)\*\* 万 QPS/, '风暴账本')
    expect(Number(storm[1]) * Number(storm[2])).toBe(Number(storm[3]) * 10000)
    expect(Number(storm[2])).toBe(api)
    // 第四步：宽限期 15 分钟与讲内骨架常量对账；补发窗口 1000 条与讲内文字对账
    const grace = Number(grab(/宽限期定 \*\*(\d+)\*\* 分钟/, '宽限期')[1])
    const pin = lecture03.match(/const gracePeriod = (\d+) \* time\.Minute/)
    expect(pin, '讲义第 7 节骨架应有 gracePeriod 常量').toBeTruthy()
    expect(grace).toBe(Number(pin[1]))
    expect(lecture03.includes('分钟到半小时量级')).toBe(true)
    expect(grace).toBeGreaterThanOrEqual(1)
    expect(grace).toBeLessThanOrEqual(30)
    expect(Number(grab(/从「\*\*(\d+)\*\* 秒没心跳」/, '旧判定')[1])).toBe(threshold)
    expect(Number(grab(/（最长 \*\*(\d+)\*\* 分钟）/  , '回收上限')[1])).toBe(grace)
    const winPin = lecture03.match(/每人窗口 (\d+) 条消息/)
    expect(winPin, '讲义 2.3 节应有补发窗口量级').toBeTruthy()
    expect(Number(grab(/补发窗口定 \*\*(\d+)\*\* 条/, '补发窗口')[1])).toBe(Number(winPin[1]))
    // 复核：12 万 → 0；客诉 486 → 9（−98%）；尖峰 1.44 万 → 0.1 万（−93%）；回收 ≤ 15 分钟
    const done = grab(/误判掉线 \*\*(\d+)\*\* 万次\/天 → \*\*(\d+)\*\* 次/, '误判归零')
    expect(Number(done[1])).toBe(misWan)
    expect(Number(done[2])).toBe(0)
    const cv = grab(/客诉 \*\*(\d+)\*\* 份 → \*\*(\d+)\*\* 份（下降 \*\*(\d+)\*\*%/, '客诉回落')
    expect(Number(cv[1])).toBe(complaints)
    expect(Math.round(((Number(cv[1]) - Number(cv[2])) / Number(cv[1])) * 100)).toBe(Number(cv[3]))
    const peak = grab(/从 \*\*([\d.]+)\*\* 万 QPS → \*\*([\d.]+)\*\* 万（回落 \*\*(\d+)\*\*%/, '尖峰回落')
    expect(Number(peak[1])).toBe(Number(storm[3]))
    expect(Math.round(((Number(peak[1]) - Number(peak[2])) / Number(peak[1])) * 100)).toBe(Number(peak[3]))
    expect(Number(grab(/真死链平均 \*\*(\d+)\*\* 分钟内回收/, '死链回收')[1])).toBe(grace)
  })

  it('声称对账：推导公式 3 项、适配清单 11 条第 4 条、陷阱表 9 行第 1 行全部与讲内实况一致', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 2.1 推导公式 3 项（加号分隔）
    const terms = Number(grab(/公式的 \*\*(\d+)\*\* 项里/, '公式项数')[1])
    const fence = lecture03.split('\n').find(l => l.includes('超时阈值 ≥'))
    expect(fence, '讲义 2.1 节应有超时推导公式').toBeTruthy()
    expect(fence.split(' + ').length).toBe(terms)
    // 3.4 适配清单 11 条，第 4 条是 suspend/resume
    const ck = grab(/适配清单 \*\*(\d+)\*\* 条里的第 \*\*(\d+)\*\* 条/, '清单条数与位次')
    const s34 = lecture03.slice(lecture03.indexOf('### 3.4 小游戏的服务端适配清单'), lecture03.indexOf('## 4. Unreal'))
    const items = s34.split('\n').filter(l => /^□ \d+\./.test(l))
    expect(items.length).toBe(Number(ck[1]))
    expect(items[Number(ck[2]) - 1]).toContain('suspend/resume')
    // 第 10 节陷阱表 9 行，第 1 行「把切后台当掉线」
    const trap = grab(/陷阱表 \*\*(\d+)\*\* 行里的第 \*\*(\d+)\*\* 行/, '陷阱行数与位次')
    const s10 = lecture03.slice(lecture03.indexOf('## 10. 常见陷阱总结'), lecture03.indexOf('## 11. 小结'))
    const trapRows = s10.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 陷阱') && !l.startsWith('|---'))
    expect(trapRows.length).toBe(Number(trap[1]))
    expect(trapRows[Number(trap[2]) - 1]).toContain('切后台')
    // 平台行为与心跳参数的讲内 pin
    expect(lecture03.includes('心跳间隔 10 秒、阈值 30 秒（容忍丢 2 个心跳）')).toBe(true)
    expect(lecture03.includes('iOS 切后台典型几分钟')).toBe(true)
    expect(lecture03.includes('静默可达 10 分钟以上')).toBe(true)
    expect(lecture03.includes('客户端切后台时发 `suspend` 包')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与第 7 节骨架代码真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 2.1 Unity 客户端网络层的典型结构',
      '### 2.3 常见问题与服务端应对',
      '### 3.4 小游戏的服务端适配清单',
      '## 7. 代码示例：切后台、重连与补发的会话骨架',
      '### 9.2 性能优化检查清单',
      '## 10. 常见陷阱总结',
      '## 11. 小结',
    ]) {
      expect(lecture03.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    // 处置形态与第 7 节骨架一致：显式挂起 + Sweep 唯一关闭路径 + 快照兜底
    expect(lecture03.includes('func (c *Conn) Suspend')).toBe(true)
    expect(lecture03.includes('func (c *Conn) Resume')).toBe(true)
    expect(lecture03.includes('func (c *Conn) Sweep')).toBe(true)
    expect(lecture03.includes('重复 suspend 不刷新计时')).toBe(true)
    expect(lecture03.includes('快照兜底')).toBe(true)
    expect(existsSync(resolve(dir, '03-frontend-engines.md'))).toBe(true)
  })
})
