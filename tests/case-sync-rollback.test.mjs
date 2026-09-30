import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture04 = readFileSync(resolve(dir, '04-network.md'), 'utf8')

// 案例切片：从「## 15. 实战案例」到文件结束（编号小结为第 14 节，案例追加为第 15 节）
function caseSection(src) {
  const start = src.indexOf('## 15. 实战案例')
  expect(start, '第 04 讲应存在「## 15. 实战案例」节').toBeGreaterThan(-1)
  expect(src.indexOf('## 15. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 04 讲「角色倒着走」的同步回滚排查）', () => {
  const sec = caseSection(lecture04)

  it('四段结构齐全：现象、口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '第一步：现象与口径', '第二步：分层归因', '第三步：根因', '第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因消息账本示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
  })

  it('数字闭环：回拉率、倍数、广播账本、分片收齐率与处置回落均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 现象：回拉率 = 50 / 5000，版本后倍数 = 1% / 0.1%
    const incident = grab(/客诉抽样 \*\*(\d+)\*\* 局，触发回拉 \*\*(\d+)\*\* 局/, '现象规模')
    const total = Number(incident[1])
    const final = Number(incident[2])
    const pct = Number(grab(/回拉对局占比 \*\*(\d+)%\*\*/, '回拉占比')[1])
    expect(final / total * 100).toBeCloseTo(pct, 5)
    const baseline = grab(/上版本同口径只有 \*\*([\d.]+)%\*\*，版本后变成 \*\*(\d+)\*\* 倍/, '基线与倍数')
    const basePct = Number(baseline[1])
    const ratio = Number(baseline[2])
    expect(Math.round(pct / basePct)).toBe(ratio)
    // 三口径分歧：客户端埋点 50 局、服务端 0 处、大盘中位 45ms / P95 210ms = 4.7 倍
    const client = Number(grab(/客户端埋点\*\*：\*\*(\d+)\*\* 局触发回拉/, '客户端埋点')[1])
    const served = Number(grab(/服务端权威位日志\*\*：\*\*(\d+)\*\* 处标记异常/, '服务端日志')[1])
    expect(client).toBe(final)
    expect(served).toBe(0)
    const median = Number(grab(/RTT 中位 \*\*(\d+)ms\*\*/, 'RTT 中位')[1])
    const p95 = Number(grab(/回拉对局的 RTT P95 却有 \*\*(\d+)ms\*\*/, 'RTT P95')[1])
    const times = Number(grab(/比中位高出 \*\*([\d.]+)\*\* 倍/, 'P95/中位倍数')[1])
    expect(Math.round(p95 / median * 10) / 10).toBe(times)
    // 场景拆分：弱网 46 局 + Wi-Fi 4 局 = 50 局
    const weak = Number(grab(/\*\*(\d+)\*\* 局发生在弱网时段/, '弱网局数')[1])
    const wifi = Number(grab(/Wi-Fi 只复现出 \*\*(\d+)\*\* 局/, 'Wi-Fi 局数')[1])
    expect(weak + wifi).toBe(client)
    // 广播账本：96 × 950 = 9.12 万条/秒；断流 1.2 秒 × 10Hz = 12 条
    const room = grab(/账本收敛：\*\*(\d+)\*\* 人房间单发送者 \*\*(\d+)\*\* 条\/秒、全房间 \*\*([\d.]+) 万\*\*条\/秒/, '房间广播账本')
    const senders = Number(room[1])
    const senderRate = Number(room[2])
    const roomRate = Number(room[3])
    expect(senders * senderRate / 10000).toBeCloseTo(roomRate, 5)
    const burst = grab(/断流 \*\*([\d.]+) 秒\*\*突发 \*\*(\d+)\*\* 条旧位置包（\*\*(\d+)Hz × ([\d.]+) 秒\*\*）/, '断流积压')
    const stall = Number(burst[1])
    const packets = Number(burst[2])
    const freq = Number(burst[3])
    expect(Number(burst[4])).toBe(stall)
    expect(Math.round(freq * stall)).toBe(packets)
    // 特效分片：4200 / 1400 = 3 片；0.98³ ≈ 94%；缺帧 6%
    const frag = grab(/特效包 \*\*(\d+)\*\* 字节按 \*\*(\d+)\*\* 字节 MTU 分 \*\*(\d+)\*\* 片/, '分片账本')
    const bytes = Number(frag[1])
    const mtu = Number(frag[2])
    const pieces = Number(frag[3])
    expect(bytes / mtu).toBe(pieces)
    const loss = grab(/\*\*(\d+)%\*\* 丢包下整包收齐率 \*\*(\d+)%\*\*、缺帧率 \*\*(\d+)%\*\*/, '收齐率账本')
    const lossPct = Number(loss[1])
    const ready = Number(loss[2])
    const skip = Number(loss[3])
    expect(Math.round(Math.pow(1 - lossPct / 100, pieces) * 100)).toBe(ready)
    expect(100 - ready).toBe(skip)
    // 根因声称的 Checklist 条数与讲内实况一致
    const claims = Number(grab(/Checklist 的 \*\*(\d+)\*\* 条里/, 'Checklist 条数')[1])
    expect((lecture04.match(/^□ \d+\./gm) || []).length).toBe(claims)
    const stale = Number(grab(/积压的 \*\*(\d+)\*\* 条旧值/, '旧值条数')[1])
    expect(stale).toBe(packets)
    // 处置：新分档 10×15 + 85×1 = 235 条/秒，较 950 降 75%；回拉 50 → 5（0.1%，回落 90%）
    const band = grab(/视野内 \*\*(\d+)\*\* 人 × \*\*(\d+)\*\*Hz \+ 视野外 \*\*(\d+)\*\* 人 × \*\*(\d+)\*\*Hz = \*\*(\d+)\*\* 条\/秒\/发送者/, '分档账本')
    const near = Number(band[1])
    const nearHz = Number(band[2])
    const far = Number(band[3])
    const farHz = Number(band[4])
    const newRate = Number(band[5])
    expect(near * nearHz + far * farHz).toBe(newRate)
    const cut = grab(/较 \*\*(\d+)\*\* 下降 \*\*(\d+)%\*\*/, '广播降幅')
    expect(Number(cut[1])).toBe(senderRate)
    expect(Math.round((senderRate - newRate) / senderRate * 100)).toBe(Number(cut[2]))
    const single = grab(/压到 \*\*(\d+)\*\* 字节单包不分片（< (\d+) MTU）/, '单包特效')
    expect(Number(single[1])).toBeLessThan(Number(single[2]))
    const fixed = Number(grab(/回拉 50 局 → \*\*(\d+)\*\* 局/, '回拉回落')[1])
    const review = grab(/抽样 5000 局回拉 \*\*(\d+)\*\* 局（\*\*([\d.]+)%\*\*，回到上版本基线，回落 \*\*(\d+)%\*\*）/, '复核闭环')
    const recovered = Number(review[1])
    expect(fixed).toBe(recovered)
    expect(recovered / 5000 * 100).toBeCloseTo(Number(review[2]), 5)
    expect(Number(review[2])).toBeCloseTo(basePct, 5)
    expect(Math.round((final - recovered) / final * 100)).toBe(Number(review[3]))
    const p95After = Number(grab(/RTT P95 210 → \*\*(\d+)\*\*ms/, 'P95 回落')[1])
    expect(p95After).toBeLessThan(p95)
    expect(p95After).toBeLessThan(median * 2)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节（2.3/4.4/6.3/10.x/12/13）真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    for (const anchor of [
      '### 2.3 可靠性、顺序、兼容性是三件事',
      '### 4.4 游戏常见组合',
      '### 6.3 大消息的分片与重组',
      '### 10.1 房间广播的两个放大器',
      '### 10.2 广播优化首先是语义优化',
      '### 10.3 国内移动网络的日常现实',
      '## 12. 协议设计 Checklist',
      '### 分片重组器：超时清理是灵魂',
    ]) {
      expect(lecture04.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '04-network.md'))).toBe(true)
  })
})
