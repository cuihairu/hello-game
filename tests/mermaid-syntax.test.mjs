import { describe, it, expect, beforeAll } from 'vitest'
import mermaid from 'mermaid'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs')

// mermaid 图是浏览器端运行时渲染，docs:build 不校验其语法；
// 此处用 mermaid.parse 在测试期兜底，语法错误直接进回归。
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

export function extractMermaidBlocks(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const blocks = []
  let inFence = false
  let start = 0
  let buf = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!inFence && trimmed.startsWith('```')) {
      inFence = true
      if (trimmed.slice(3).trim() === 'mermaid') start = i + 2
      buf = trimmed.slice(3).trim() === 'mermaid' ? [] : null
      continue
    }
    if (inFence && trimmed.startsWith('```')) {
      if (buf && start) blocks.push({ start, code: buf.join('\n') })
      inFence = false
      buf = null
      continue
    }
    if (inFence && buf) buf.push(lines[i])
  }
  return blocks
}

beforeAll(() => {
  mermaid.initialize({ startOnLoad: false })
})

describe('mermaid 图语法有效性', () => {
  const mdFiles = walkMd(docsDir)

  it('全库确实存在 mermaid 图（防止扫描逻辑静默失效）', () => {
    const total = mdFiles.flatMap(f => extractMermaidBlocks(f))
    expect(total.length).toBeGreaterThanOrEqual(6)
  })

  for (const file of mdFiles) {
    const blocks = extractMermaidBlocks(file)
    if (blocks.length === 0) continue
    const rel = file.slice(docsDir.length + 1)
    it(`${rel} 的 ${blocks.length} 个图可被 mermaid 解析`, async () => {
      for (const { start, code } of blocks) {
        await expect(
          mermaid.parse(code),
          `${rel}:${start} 语法无效`
        ).resolves.toBeTruthy()
      }
    })
  }
})
