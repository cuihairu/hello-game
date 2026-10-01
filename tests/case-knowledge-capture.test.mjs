import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'docs/24-game-types-architecture')
const lecture15 = readFileSync(resolve(dir, '15-references.md'), 'utf8')

// 案例切片：第 15 讲 H2 编号 1–5，案例按「## 6.」追加在文件末尾
function caseSection(src) {
  const start = src.indexOf('## 6. 实战案例：一次「同一个坑踩了两遍」')
  const closing = src.indexOf('希望本章的学习路径能帮你找到方向')
  expect(start, '第 15 讲应存在「## 6. 实战案例」节').toBeGreaterThan(-1)
  expect(start, '案例应位于本章收束之后（文件末尾）').toBeGreaterThan(closing)
  expect(src.indexOf('## 6. 实战案例', start + 1), '案例节不应重复出现').toBe(-1)
  return src.slice(start)
}

describe('实战案例冒烟（第 15 讲「同一个坑踩了两遍」的知识沉淀排查）', () => {
  const sec = caseSection(lecture15)

  it('四段结构齐全：现象口径、分层归因、根因、处置回填 + 教训收束', () => {
    for (const part of ['背景与现象', '### 第一步：现象与口径', '### 第二步：分层归因', '### 第三步：根因', '### 第四步：处置与回填', '回填清单', '案例的三个教训']) {
      expect(sec.includes(part), `案例缺少「${part}」段落`).toBe(true)
    }
    expect(sec.includes('```text'), '案例缺少分层归因账本块').toBe(true)
    expect(sec.includes('案例为教学示例'), '案例缺少教学示例声明').toBe(true)
    // 回填清单四行落点齐全
    for (const row of ['复盘归档', '准入检查点', '新人路径', '检索验证']) {
      expect(sec.includes(row), `回填清单缺少「${row}」`).toBe(true)
    }
  })

  it('数字闭环：事故账、检索账、处置效果账均可复算', () => {
    const grab = (pattern, label) => {
      const m = sec.match(pattern)
      expect(m, `案例中找不到「${label}」`).toBeTruthy()
      return m
    }
    // 事故账：2030 = 830 + 1200，两次间隔 8 个月
    const total = grab(/异常订单 \*\*(\d+)\*\* 单 = 第一次 \*\*(\d+)\*\* 单 \+ 第二次 \*\*(\d+)\*\* 单/, '事故合计')
    expect(Number(total[1])).toBe(Number(total[2]) + Number(total[3]))
    expect(Number(total[1])).toBe(2030)
    expect(Number(grab(/间隔 \*\*(\d+)\*\* 个月/, '事故间隔')[1])).toBe(8)
    // 两次错价的倍数口径：标价放大 100 倍 = 元按分填的方向
    expect(Number(grab(/标价放大 \*\*(\d+)\*\* 倍/, '价格倍数')[1])).toBe(100)
    expect(sec.includes('元按分填')).toBe(true)
    // 检索账：处置前 0 篇 → 处置后 2 篇
    expect(Number(grab(/命中 \*\*(\d+)\*\* 篇，搜「830」无复盘归档/, '处置前检索')[1])).toBe(0)
    expect(Number(grab(/命中 \*\*(\d+)\*\* 篇（复盘归档 \+ checklist 设计说明）/, '处置后检索')[1])).toBe(2)
    // 处置账：首月拦截 4 次、新人入职 2 个月、历史坑 Top 10
    expect(Number(grab(/首月拦截 \*\*(\d+)\*\* 次错配/, '首月拦截')[1])).toBe(4)
    expect(Number(grab(/入职 \*\*(\d+)\*\* 个月的新人/, '新人入职')[1])).toBe(2)
    expect(sec.includes('历史坑 Top **10**')).toBe(true)
    // 第二次止血与事故账同源：1200 单逐单闭环
    expect(sec.includes('第二次 **1200** 单异常订单回收与补偿逐单闭环')).toBe(true)
  })

  it('声称对账：四类沉淀方法、总结五条、五类复盘案例、第 14 讲复盘纪律均与讲内实况一致', () => {
    // 第 4 节四类沉淀方法齐全，案例回填逐一对上
    const s4 = lecture15.slice(lecture15.indexOf('## 4. 知识沉淀方法'), lecture15.indexOf('## 5. 总结'))
    for (const h of ['### 4.1 技术博客', '### 4.2 内部分享', '### 4.3 代码评审', '### 4.4 故障复盘']) {
      expect(s4.includes(h), `沉淀方法缺少「${h}」`).toBe(true)
    }
    expect(s4).toContain('Code Review是知识传递的最有效方式')
    expect(sec.includes('Code Review 是知识传递的最有效方式') || sec.includes('Code Review是知识传递的最有效方式')).toBe(true)
    expect(s4).toContain('复盘不是"追责"，而是"理解系统为什么这样设计"')
    // 第 5 节总结恰好 5 条，案例引用其中三条
    const s5 = lecture15.slice(lecture15.indexOf('## 5. 总结'), lecture15.indexOf('## 6. 实战案例'))
    expect((s5.match(/^\d\. \*\*/gm) || []).length).toBe(5)
    for (const kw of ['输出倒逼输入', '从失败中学习', '建立知识体系']) {
      expect(s5.includes(kw), `总结缺少「${kw}」`).toBe(true)
      expect(sec.includes(kw), `案例应呼应「${kw}」`).toBe(true)
    }
    // 第 2 节已有五类品类复盘案例，案例背景与之并存不冲突
    expect((lecture15.match(/^### 案例一：|^### 案例二：|^### 案例三：|^### 案例四：|^### 案例五：/gm) || []).length).toBe(5)
    // 第 14 讲复盘纪律锚点真实存在，案例引用其口径
    const lecture14 = readFileSync(resolve(dir, '14-dev-organization.md'), 'utf8')
    expect(lecture14.includes('同类故障再现先查改进项为何未落地')).toBe(true)
    expect(sec.includes('同类故障再现先查改进项为何未落地')).toBe(true)
  })

  it('引用闭合：「第 N 讲」对应真实文件，呼应节与配置管线锚点真实存在', () => {
    for (const m of sec.matchAll(/第 (\d{2}) 讲/g)) {
      const prefix = `${m[1]}-`
      const hit = readdirSync(dir).some(f => f.startsWith(prefix))
      expect(hit, `案例引用的「第 ${m[1]} 讲」没有对应文件`).toBe(true)
    }
    // 第 17 讲配置管线真实存在（checklist 落 CI 的工程承载）
    const lecture17 = readFileSync(resolve(dir, '17-versioning-release.md'), 'utf8')
    expect(lecture17.includes('配置管线')).toBe(true)
    for (const anchor of [
      '## 2. 案例复盘',
      '## 4. 知识沉淀方法',
      '### 4.3 代码评审',
      '### 4.4 故障复盘',
      '## 5. 总结',
    ]) {
      expect(lecture15.includes(anchor), `案例呼应的节不存在: ${anchor}`).toBe(true)
    }
    expect(existsSync(resolve(dir, '15-references.md'))).toBe(true)
  })
})
