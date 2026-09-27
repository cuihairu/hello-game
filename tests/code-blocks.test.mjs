import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs')

function resolve(...args) {
  return join(...args)
}

// 站点的知识库定位：代码块以讲解为主，但必须满足三条口径——
// 1. 围栏必须标注语言（渲染器与读者都需要知道这是什么）
// 2. 语言必须在白名单内（示例风格全站统一，防止 ```golang 之类的漂移）
// 3. Go 代码块必须过 gofmt 语法检查（讲解代码不等于坏语法的代码）
function walkMd(dir) {
  const out = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === 'dist' || name.name === 'cache' || name.name === 'public') continue
      out.push(...walkMd(p))
    } else if (name.name.endsWith('.md')) {
      out.push(p)
    }
  }
  return out
}

// 提取全部围栏：与 mermaid-syntax.test.mjs 同一套配对规则
export function extractFences(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const fences = []
  let inFence = false
  let start = 0
  let lang = ''
  let buf = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!inFence && trimmed.startsWith('```')) {
      inFence = true
      start = i + 1
      lang = trimmed.slice(3).trim()
      buf = []
      continue
    }
    if (inFence && trimmed.startsWith('```')) {
      fences.push({ start, lang, code: buf.join('\n') })
      inFence = false
      continue
    }
    if (inFence) buf.push(lines[i])
  }
  return fences
}

// 全站已使用的语言集合；新增语言时在此登记，保证示例风格统一
const KNOWN_LANGS = new Set([
  'go', 'text', 'python', 'lua', 'java', 'sql', 'mermaid', 'yaml', 'cpp',
  'bash', 'protobuf', 'json', 'c', 'xml', 'nginx', 'markdown', 'dockerfile',
  'csharp'
])

const mdFiles = walkMd(docsDir)

function gofmtAvailable() {
  return spawnSync('gofmt', ['--help'], { encoding: 'utf8' }).status !== null
}

describe('代码块口径（语言标注、风格统一、Go 语法）', () => {
  let tmp
  const goBlocks = []

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'goblocks-'))
    for (const file of mdFiles) {
      const rel = file.slice(docsDir.length + 1)
      for (const fence of extractFences(file)) {
        if (fence.lang !== 'go') continue
        goBlocks.push({ rel, start: fence.start, code: fence.code })
        // 完整文件示例自带 package 子句；片段示例补一个使其可独立解析
        const hasPackage = /^package\s/m.test(fence.code)
        const source = hasPackage ? fence.code : `package p\n\n${fence.code}\n`
        const id = `${goBlocks.length}`.padStart(4, '0')
        writeFileSync(join(tmp, `${id}.go`), source)
      }
    }
  })

  afterAll(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true })
  })

  it('全库确实存在代码块（防止扫描逻辑静默失效）', () => {
    const total = mdFiles.flatMap(f => extractFences(f))
    expect(total.length).toBeGreaterThanOrEqual(200)
  })

  for (const file of mdFiles) {
    const rel = file.slice(docsDir.length + 1)
    const fences = extractFences(file)
    if (fences.length === 0) continue

    it(`${rel} 的 ${fences.length} 个围栏全部标注语言`, () => {
      for (const fence of fences) {
        expect(fence.lang, `${rel}:${fence.start} 围栏缺少语言标注`).not.toBe('')
      }
    })

    it(`${rel} 的语言都在白名单内`, () => {
      for (const fence of fences) {
        expect(
          KNOWN_LANGS.has(fence.lang),
          `${rel}:${fence.start} 语言「${fence.lang}」不在白名单，请确认拼写并登记`
        ).toBe(true)
      }
    })
  }

  it('Go 代码块不用 tab 缩进（全站空格缩进口径）', () => {
    const offenders = goBlocks.filter(b => b.code.split('\n').some(l => l.startsWith('\t')))
    expect(offenders.map(b => `${b.rel}:${b.start}`)).toEqual([])
  })

  describe('Go 代码块语法有效（gofmt 解析兜底）', () => {
    const hasGofmt = gofmtAvailable()

    it.skipIf(!hasGofmt)('全部 Go 块可被 gofmt 解析', () => {
      const result = spawnSync('gofmt', ['-e', '-l', tmp], { encoding: 'utf8' })
      // -e 把语法错误写到 stderr；-l 只列出解析失败的文件（格式差异不算失败）
      const broken = result.stderr
        .split('\n')
        .filter(Boolean)
      expect(broken, `以下 Go 代码块语法无效:\n${broken.join('\n')}`).toEqual([])
    })
  })
})
