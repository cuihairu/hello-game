import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'docs/14-cache-middleware/01.md')
const page = readFileSync(file, 'utf8')

// 本页案例标题（声明式：tests/site-links 对账按此逐字核对页面标题）
const CASE_HEADING = '## 实战案例：一次「补发任务跑了两遍，全服多发 600 万」的锁租约排查'

// 案例切片：知识库页末尾追加的无编号案例节（页面正文以「常见误区」收束，无小结节）
function caseSection(src) {
  const start = src.indexOf(CASE_HEADING)
  const tail = src.indexOf('往往在流量上来、节点重启或运营改规则的当天一起出现')
  expect(start, '第 12 章 01 页应存在「## 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于页面正文之后（文件末尾）').toBeGreaterThan(tail)
  expect(src.indexOf('## 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（知识库 14-cache-middleware/01「补发任务跑了两遍，全服多发 600 万」的锁租约排查）', () => {
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
    expect(sec.includes('```text'), '案例缺少双跑归因示意块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of [
      '租约治理',
      '幂等兜底',
      '源头登记',
      '对账演练',
    ]) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：应发实发对照账、租约双跑账、围栏回收账与分片折算账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 正文对照账：1.2 万人 × 500 金币 = 600 万；实发 2.4 万人次、1200 万
    const bg = grab(/- \*\*应发\*\*：名单 \*\*([\d.]+)\*\* 万人 × \*\*(\d+)\*\* 金币 = \*\*(\d+)\*\* 万\n- \*\*实发\*\*：流水 \*\*([\d.]+)\*\* 万人次、合计 \*\*(\d+)\*\* 万金币/, '对照账')
    expect(Number(bg[1]) * Number(bg[2])).toBe(Number(bg[3]))
    expect(Number(bg[4])).toBe(Number(bg[1]) * 2)
    expect(Number(bg[5])).toBe(Number(bg[3]) * 2)
    // 围栏名单账：与正文一致，限速折算 1.2 万人 / 200 每分钟 = 60 分钟
    const fn = grab(/补发名单 ([\d.]+) 万人 × (\d+) 金币 = 应发 (\d+) 万；发奖限速 (\d+) 人\/分钟，全程 (\d+) 分钟/, '围栏名单账')
    expect(Number(fn[1])).toBe(Number(bg[1]))
    expect(Number(fn[2])).toBe(Number(bg[2]))
    expect(Number(fn[3])).toBe(Number(bg[3]))
    expect(Math.round((Number(fn[1]) * 10000) / Number(fn[4]))).toBe(Number(fn[5]))
    // 围栏锁账：租约 30 < 任务 60；到期时刻 = 启动 + 30 分钟；B 机 = 到期时刻
    const fl = grab(/租约 (\d+) 分钟 < 任务 (\d+) 分钟：A 机 (\d{2}):(\d{2}) 启动，(\d{2}):(\d{2}) 租约到期未续期，B 机 (\d{2}):(\d{2}) 抢到锁从头再跑/, '围栏锁账')
    expect(Number(fl[1])).toBeLessThan(Number(fl[2]))
    const startMin = Number(fl[3]) * 60 + Number(fl[4])
    const expireMin = Number(fl[5]) * 60 + Number(fl[6])
    const bMin = Number(fl[7]) * 60 + Number(fl[8])
    expect(expireMin - startMin).toBe(Number(fl[1]))
    expect(bMin).toBe(expireMin)
    // 围栏双跑账：2.4 万 = 1.2 万 × 2；实发 1200 = 600 × 2；超发 600 = 1200 − 600
    const fd = grab(/流水 ([\d.]+) 万人次 = ([\d.]+) 万 × (\d+)，实发 (\d+) 万，超发 (\d+) 万/, '围栏双跑账')
    expect(Number(fd[1])).toBe(Number(bg[4]))
    expect(Number(fd[2])).toBe(Number(bg[1]))
    expect(Number(fd[4])).toBe(Number(bg[5]))
    expect(Number(fd[4]) - Number(bg[3])).toBe(Number(fd[5]))
    // 围栏对账账：回收 480 + 已消费 120 = 超发 600；480 = 600 × 80%
    const fa = grab(/核出 ([\d.]+) 万人全部双发；回收 (\d+) 万（未消费 (\d+)%），已消费 (\d+) 万转活动对冲/, '围栏对账账')
    expect(Number(fa[1])).toBe(Number(bg[1]))
    expect(Number(fa[2]) + Number(fa[4])).toBe(Number(fd[5]))
    expect((Number(fd[5]) * Number(fa[3])) / 100).toBe(Number(fa[2]))
    // 应急时间线：04:10 告警、04:25 核出（对账 15 分钟）、04:50 回收完成
    const tl = grab(/\*\*(\d{2})\*\*:\*\*(\d{2})\*\* 告警、\*\*(\d{2})\*\*:\*\*(\d{2})\*\* 重放对账核出双发名单（对账 \*\*(\d+)\*\* 分钟）、\*\*(\d{2})\*\*:\*\*(\d{2})\*\* 按「未消费优先」回收/, '应急时间线')
    const alarmMin = Number(tl[1]) * 60 + Number(tl[2])
    const foundMin = Number(tl[3]) * 60 + Number(tl[4])
    expect(foundMin - alarmMin).toBe(Number(tl[5]))
    expect(Number(tl[5])).toBe(15)
    // 分片折算：60 分钟临界区 = 12 段 × 5 分钟
    const fs = grab(/把 \*\*(\d+)\*\* 分钟临界区拆成 \*\*(\d+)\*\* 个 \*\*(\d+)\*\* 分钟段/, '分片折算')
    expect(Number(fs[1]) / Number(fs[2])).toBe(Number(fs[3]))
    // 复核账：幂等去重后 1.2 万人次 = 应发 600 万，零超发
    const re = grab(/幂等键去重后 \*\*([\d.]+)\*\* 万人次 = 应发 \*\*(\d+)\*\* 万，零超发/, '复核账')
    expect(Number(re[1])).toBe(Number(bg[1]))
    expect(Number(re[2])).toBe(Number(bg[3]))
    // 制度四步：续期与校验、幂等键、源头登记、分片断点续跑
    for (const s of [
      '续期线程与释放前身份校验',
      '「任务号 + 玩家 ID」为幂等键',
      '源头 = 活动流水库、可重放重建',
      '断点续跑',
    ]) {
      expect(sec.includes(s), `制度四步缺少「${s}」`).toBe(true)
    }
  })

  it('声称对账：缓存四条件、权威源三特征、榜单/读法各三条、分数四问题、锁三问与失效四形态、误区四条均与页内实况一致，案例引用页内原话可查', () => {
    // 页内缓存准入条件恰好 4 条
    const sCache = page.slice(page.indexOf('## 缓存的定位：加速层而不是事实层'), page.indexOf('## 把缓存当权威源，代价往往在故障日才结算'))
    expect((sCache.match(/^- /gm) || []).length).toBe(4)
    // 页内权威源事故特征恰好 3 条
    const sAuth = page.slice(page.indexOf('## 把缓存当权威源，代价往往在故障日才结算'), page.indexOf('## 排行榜为什么通常落在有序集合上'))
    expect((sAuth.match(/^- /gm) || []).length).toBe(3)
    // 页内榜单变化场景恰好 3 条
    const sBoard = page.slice(page.indexOf('## 排行榜为什么通常落在有序集合上'), page.indexOf('## 分数设计常常比榜单结构更难'))
    expect((sBoard.match(/^- /gm) || []).length).toBe(3)
    // 页内分数问题恰好 4 条
    const sScore = page.slice(page.indexOf('## 分数设计常常比榜单结构更难'), page.indexOf('## 榜单的读法取决于名次还是区间'))
    expect((sScore.match(/^- /gm) || []).length).toBe(4)
    // 页内读法思路恰好 3 条
    const sRead = page.slice(page.indexOf('## 榜单的读法取决于名次还是区间'), page.indexOf('## 分布式锁解决的是什么问题'))
    expect((sRead.match(/^- /gm) || []).length).toBe(3)
    // 页内锁三问恰好 3 条、失效形态恰好 4 条
    const sLock = page.slice(page.indexOf('## 分布式锁解决的是什么问题'), page.indexOf('## 锁的真实成本：租约、时钟与续期'))
    expect((sLock.match(/^- /gm) || []).length).toBe(3)
    const sLease = page.slice(page.indexOf('## 锁的真实成本：租约、时钟与续期'), page.indexOf('## 常见误区'))
    expect((sLease.match(/^- /gm) || []).length).toBe(4)
    // 本页常见误区为 4 条 bullet 体例（切到案例节为止，案例内 bullets 不计）
    const sMis = page.slice(page.indexOf('## 常见误区'), page.indexOf(CASE_HEADING))
    expect((sMis.match(/^- /gm) || []).length).toBe(4)
    // 案例引用的页内原话可查
    for (const s of [
      '租约太短，业务还没做完锁先失效',
      '业务执行超过租约时长，第二个持有者进入，两边同时写',
      '只设计拿锁成功的路径，锁竞争、锁过期、锁误删都没有下文',
      '源头明确，且不依赖缓存也能重建或恢复',
      '缓存就从加速层变成了事实上的权威存储',
      '也要确认重放链路真的存在，并且演练过',
      '把 Redis 当成不会丢的存储',
    ]) {
      expect(page.includes(s), `页面缺少案例所引用的原话: ${s}`).toBe(true)
    }
    expect(sec.includes('租约太短，业务还没做完锁先失效')).toBe(true)
    expect(sec.includes('业务执行超过租约时长，第二个持有者进入，两边同时写')).toBe(true)
    expect(sec.includes('只设计拿锁成功的路径，锁竞争、锁过期、锁误删都没有下文')).toBe(true)
    expect(sec.includes('源头明确，且不依赖缓存也能重建或恢复')).toBe(true)
    expect(sec.includes('缓存就从加速层变成了事实上的权威存储')).toBe(true)
    expect(sec.includes('也要确认重放链路真的存在，并且演练过')).toBe(true)
  })

  it('引用闭合：回填落点节真实存在且位于案例之前，页面路径与同章页数就位', () => {
    for (const anchor of [
      '## 缓存的定位：加速层而不是事实层',
      '## 把缓存当权威源，代价往往在故障日才结算',
      '## 分布式锁解决的是什么问题',
      '## 锁的真实成本：租约、时钟与续期',
      '## 常见误区',
    ]) {
      expect(page.includes(anchor), `回填清单落点节不存在: ${anchor}`).toBe(true)
      expect(page.indexOf(anchor), `回填落点应位于案例之前: ${anchor}`).toBeLessThan(page.indexOf(CASE_HEADING))
    }
    expect(existsSync(file)).toBe(true)
    // 同章页面清单未被改动（案例是页内小节，不新增页）
    const pages = readdirSync(resolve(root, 'docs/14-cache-middleware')).filter(f => f.endsWith('.md'))
    expect(pages.length).toBe(5)
    expect(pages).toContain('index.md')
  })
})
