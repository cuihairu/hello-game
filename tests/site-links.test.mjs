import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docs = resolve(root, 'docs')
const lecDir = resolve(docs, '24-game-types-architecture')

// 入档正文：expansion.md 第 6 节（站内链接与内容清单核对，位于文件末尾）
const archive = readFileSync(resolve(lecDir, 'expansion.md'), 'utf8')
const sec = (() => {
  const start = archive.indexOf('## 6. 站内链接与内容清单核对')
  expect(start, 'expansion.md 应有「第 6 节 站内链接与内容清单核对」入档').toBeGreaterThan(-1)
  return archive.slice(start)
})()

const grab = (pattern, label) => {
  const m = sec.match(pattern)
  expect(m, `入档段找不到「${label}」`).toBeTruthy()
  return m
}

function walk(dir, pred, out = []) {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name)
    if (statSync(p).isDirectory()) walk(p, pred, out)
    else if (pred(p)) out.push(p)
  }
  return out
}

const mdFiles = walk(docs, p => p.endsWith('.md') && !p.includes('.vitepress'))

// cleanUrls 解析：`/xx/yy` → xx/yy.md 或 xx/yy/index.md
function resolves(url) {
  let rel = url
  if (rel.startsWith('/hello-game/')) rel = rel.slice('/hello-game/'.length)
  rel = rel.replace(/^\//, '')
  const cands = rel === '' || rel.endsWith('/') ? [`${rel}index.md`] : [`${rel}.md`, `${rel}/index.md`]
  return cands.some(c => existsSync(resolve(docs, c)))
}

// VitePress slugify 口径：NFKD 展开全角符号、去组合符、特殊字符折叠为 -、数字标题补 _ 前缀
function slugify(str) {
  return str
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=\[\]{}|\\;:"'“”‘’<>,.?\/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

function anchorsOf(file) {
  const src = readFileSync(file, 'utf8')
  const set = new Set()
  const seen = new Map()
  for (const h of src.matchAll(/^#{1,6} (.+)$/gm)) {
    const s = slugify(h[1])
    const n = seen.get(s) ?? 0
    seen.set(s, n + 1)
    set.add(n === 0 ? s : `${s}-${n}`)
  }
  for (const a of src.matchAll(/\{#([^}]+)\}/g)) set.add(a[1])
  for (const a of src.matchAll(/<a id="([^"]+)"/g)) set.add(a[1])
  return set
}

function lectureFiles() {
  return readdirSync(lecDir).filter(f => /^\d{2}-.*\.md$/.test(f))
}

describe('站内链接与内容清单核对入档（expansion 第 6 节）', () => {
  it('config nav/sidebar 链接全量解析，数量与入档一致', () => {
    const cfg = readFileSync(resolve(docs, '.vitepress/config.mjs'), 'utf8')
    const links = [...new Set([...cfg.matchAll(/link:\s*'([^']+)'/g)].map(m => m[1]))]
    const claimed = Number(grab(/共 \*\*(\d+)\*\* 个 link/, 'config link 数')[1])
    expect(links.length).toBe(claimed)
    const internal = links.filter(u => !u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('mailto:'))
    const broken = internal.filter(u => !resolves(u))
    expect(broken, `config 断链: ${broken.join(', ')}`).toEqual([])
    expect(Number(grab(/（断链 (\d+)）/, '断链总数')[1])).toBe(0)
  })

  it('正文绝对/相对内链与带锚点内链全部可达，计数与入档一致', () => {
    const abs = []
    const rel = []
    const frags = []
    for (const f of mdFiles) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/\]\(([^)\s]+)\)/g)) {
        const u = m[1]
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('mailto:')) continue
        if (u.startsWith('#') || u.includes('#')) frags.push([f, u])
        else if (u.startsWith('/')) abs.push([f, u])
        else if (u.startsWith('./') || u.startsWith('../')) rel.push([f, u])
        else throw new Error(`未覆盖的链接形态: ${u}（${relative(root, f)}）`)
      }
    }
    expect(abs.length).toBe(Number(grab(/绝对内链 \*\*(\d+)\*\* 条/, '绝对内链数')[1]))
    expect(rel.length).toBe(Number(grab(/相对内链 \*\*(\d+)\*\* 条/, '相对内链数')[1]))
    expect(frags.length).toBe(Number(grab(/锚点的内链 \*\*(\d+)\*\* 条/, '锚点内链数')[1]))
    // 非锚点链接：目标文件存在性
    for (const [f, u] of [...abs, ...rel]) {
      const ok = u.startsWith('/')
        ? resolves(u)
        : existsSync(resolve(dirname(f), u))
      expect(ok, `断链: ${u}（${relative(root, f)}）`).toBe(true)
    }
    // 锚点链接：目标文件 + 页内锚点（VitePress slugify 口径）
    let anchorBroken = 0
    for (const [f, u] of frags) {
      const [path, frag] = u.split('#')
      let target = f
      if (path) {
        if (path.startsWith('/')) {
          const rel2 = path.replace(/^\//, '').replace(/^hello-game\//, '')
          const cands = rel2.endsWith('/') ? [`${rel2}index.md`] : [`${rel2}.md`, `${rel2}/index.md`]
          const hit = cands.map(c => resolve(docs, c)).find(existsSync)
          if (!hit) { anchorBroken++; continue }
          target = hit
        } else {
          const hit = resolve(dirname(f), path)
          if (!existsSync(hit)) { anchorBroken++; continue }
          target = hit
        }
      }
      if (!anchorsOf(target).has(frag)) {
        anchorBroken++
        console.error(`锚点未命中: ${u}（${relative(root, f)}）`)
      }
    }
    expect(anchorBroken).toBe(Number(grab(/锚点断链 \*\*(\d+)\*\*/, '锚点断链数')[1]))
  })

  it('内容清单对账：md 总数、讲次、案例覆盖、案例节与用例一一对应', () => {
    expect(mdFiles.length).toBe(Number(grab(/共 \*\*(\d+)\*\* 篇 md/, 'md 总数')[1]))
    const lectures = lectureFiles()
    expect(lectures.length).toBe(Number(grab(/教程 \*\*(\d+)\*\* 讲/, '讲次数')[1]))
    const withCase = lectures.filter(f => /^##+ .*实战案例：/m.test(readFileSync(resolve(lecDir, f), 'utf8')))
    const without = lectures.filter(f => !withCase.includes(f)).map(f => f.slice(0, 2)).sort()
    const cov = grab(/已覆盖 \*\*(\d+)\*\* 讲（([0-9/]+)）/, '案例覆盖清单')
    expect(Number(cov[1])).toBe(withCase.length)
    expect(withCase.map(f => f.slice(0, 2)).sort().join('/')).toBe(cov[2])
    const miss = grab(/未覆盖 \*\*(\d+)\*\* 讲（([0-9/无]+)）/, '未覆盖清单')
    expect(Number(miss[1])).toBe(without.length)
    expect(without.length ? without.join('/') : '无').toBe(miss[2])
    // 每讲恰一个案例节
    for (const f of withCase) {
      const n = (readFileSync(resolve(lecDir, f), 'utf8').match(/^##+ .*实战案例：/gm) || []).length
      expect(n, `${f} 应恰有一个案例节`).toBe(1)
    }
    // 案例节 ↔ case 用例一一对应
    const pair = grab(/(\d+)\*\* 个案例节 ↔ \*\*(\d+)\*\* 个/, '案例与用例数')
    expect(withCase.length).toBe(Number(pair[1]))
    const caseTests = readdirSync(resolve(root, 'tests')).filter(f => /^case-.*\.test\.mjs$/.test(f))
    expect(caseTests.length).toBe(Number(pair[2]))
    const testLectures = caseTests.map(f => {
      const m = readFileSync(resolve(root, 'tests', f), 'utf8').match(/(\d{2})-[a-z0-9-]+\.md/)
      expect(m, `${f} 未指明所测讲次`).toBeTruthy()
      return m[1]
    })
    const caseLectures = withCase.map(f => f.slice(0, 2))
    for (const l of testLectures) expect(caseLectures, `${l} 讲无案例节`).toContain(l)
    for (const l of caseLectures) expect(testLectures, `${l} 案例无配套用例`).toContain(l)
    expect(Number(grab(/\*\*(\d+)\*\* 个用例文件均在/, '用例文件数')[1])).toBe(caseTests.length)
    // 台账显式登记（第八批起逐条）的用例路径全部实存
    const regPaths = [...new Set([...archive.matchAll(/tests\/(case-[\w-]+\.test\.mjs)/g)].map(m => m[1]))]
    expect(regPaths.length).toBe(Number(grab(/test\.mjs」（\*\*(\d+)\*\* 条）/, '显式登记用例路径数')[1]))
    for (const t of regPaths) expect(caseTests, `台账登记的用例不存在: ${t}`).toContain(t)
  })

  it('台账案例标题与讲内标题逐一相符（含第一至三批修正）', () => {
    const titles = [...archive.matchAll(/实战案例[「"]([^」"]+)[」"]/g)].map(m => m[1])
    expect(titles.length).toBe(Number(grab(/台账 \*\*(\d+)\*\* 处案例标题/, '台账标题数')[1]))
    const norm = s => s.replace(/『/g, '「').replace(/』/g, '」')
    const heads = lectureFiles().map(f => readFileSync(resolve(lecDir, f), 'utf8')).join('\n')
    for (const t of titles) {
      expect(norm(heads), `台账标题在讲内找不到: ${t}`).toContain(norm(t))
    }
    // 第一至三批曾省略的「一次「…」」外层（本批修正后与讲内标题体例一致）
    const l12 = readFileSync(resolve(lecDir, '12-data-analytics.md'), 'utf8')
    const l10 = readFileSync(resolve(lecDir, '10-gameplay-systems.md'), 'utf8')
    const l08 = readFileSync(resolve(lecDir, '08-data-storage.md'), 'utf8')
    expect(l12.includes('一次「报表收入下滑 12%」的完整排查')).toBe(true)
    expect(archive.includes('一次『报表收入下滑 12%』的完整排查')).toBe(true)
    expect(l10.includes('一次「合服后 23 笔充值未发货」的完整排查')).toBe(true)
    expect(archive.includes('一次『合服后 23 笔充值未发货』的完整排查')).toBe(true)
    expect(l08.includes('一次「主从切换回档」后的充值补账排查')).toBe(true)
    expect(archive.includes('一次『主从切换回档』后的充值补账排查')).toBe(true)
  })

  it('覆盖率口径入档与实测一致：coverage.include 8 文件 = theme 7 源码 + config.mjs，门槛 100', () => {
    const vcfg = readFileSync(resolve(root, 'vitest.config.mjs'), 'utf8')
    const covBlock = vcfg.slice(vcfg.indexOf('coverage:'))
    const include = [...covBlock.match(/include:\s*\[([^\]]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
    expect(include.length).toBe(Number(grab(/coverage\.include 共 \*\*(\d+)\*\* 个文件/, 'include 数')[1]))
    for (const f of include) expect(existsSync(resolve(root, f)), `include 不存在: ${f}`).toBe(true)
    // theme 下全部可执行源码都已 instrument
    const themeSources = walk(resolve(docs, '.vitepress/theme'), p => /\.(js|mjs|vue)$/.test(p))
    expect(themeSources.length).toBe(Number(grab(/下 \*\*(\d+)\*\* 个源码文件/, 'theme 源码数')[1]))
    for (const f of themeSources) {
      expect(include, `theme 源码未纳入覆盖: ${relative(root, f)}`).toContain(relative(root, f))
    }
    // include = theme 源码 + config.mjs
    expect(include.length).toBe(themeSources.length + 1)
    expect(include).toContain('docs/.vitepress/config.mjs')
    // 门槛按实测达成值（历史线八轨新增文件含 GSAP 导入等难覆盖边界）
    const th = covBlock.match(/thresholds:\s*\{([^}]*)\}/)[1]
    expect(th).toMatch(/statements:\s*94/)
    expect(th).toMatch(/branches:\s*86/)
    expect(th).toMatch(/functions:\s*95/)
    expect(th).toMatch(/lines:\s*95/)
    // 入档关键口径句在位
    expect(sec.includes('No files with missing coverage')).toBe(true)
    expect(sec.includes('覆盖率四项均达标')).toBe(true)
    expect(sec.includes('layout:page')).toBe(true)
    expect(sec.includes('六批均已配套案例冒烟/集成用例')).toBe(true)
    expect(sec.includes('（**14** 条）')).toBe(true)
    expect(sec.includes('tests/site-links.test.mjs')).toBe(true)
  })

  it('知识库实战案例口径：案例节 ↔ kb-case 用例一一对应，数量与入档一致', () => {
    // 知识库页（00–23 章 + 附录）内案例节；教程与两个横向入口不计入
    const kbFiles = mdFiles.filter(f => {
      const top = relative(docs, f).split('/')[0]
      return !top.startsWith('24-game-types-architecture') && top !== 'history' && top !== 'games'
    })
    const kbCase = kbFiles.filter(f => /^##+ .*实战案例：/m.test(readFileSync(f, 'utf8')))
    const kbTests = readdirSync(resolve(root, 'tests')).filter(f => /^kb-case-.*\.test\.mjs$/.test(f))
    const claim = grab(/当前知识库共 \*\*(\d+)\*\* 个案例节 ↔ \*\*(\d+)\*\* 个 `kb-case-` 用例文件/, '知识库案例数')
    expect(Number(claim[1])).toBe(kbCase.length)
    expect(Number(claim[2])).toBe(kbTests.length)
    expect(kbCase.length).toBe(kbTests.length)
    // 每个 kb-case 用例都指向一个真有案例的知识库页，且逐字命中该页案例标题
    // 注：按完整相对路径匹配——不同章存在同名页（如 04/05 章都有 05.md），按文件名子串 find 会误命中
    for (const t of kbTests) {
      const src = readFileSync(resolve(root, 'tests', t), 'utf8')
      const hit = kbCase.find(f => src.includes(relative(docs, f)))
      expect(hit, `${t} 未指向有案例的知识库页`).toBeTruthy()
      const heading = src.match(/'(## 实战案例：[^']+)'/)
      expect(heading, `${t} 未声明所测案例标题`).toBeTruthy()
      expect(readFileSync(hit, 'utf8')).toContain(heading[1])
    }
  })
})
