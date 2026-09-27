import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import ReadingProgress from '../docs/.vitepress/theme/components/ReadingProgress.vue'

// rAF 手动调度桩：捕获回调、递增 id，测试里按需触发，保证时序确定
let rafCallbacks
let cancelRaf

// happy-dom 的滚动尺寸是原型 getter，实例上用 defineProperty 覆写
function setDocSize({ scrollHeight = 0, clientHeight = 0, scrollTop = 0 } = {}) {
  const doc = document.documentElement
  for (const [key, value] of Object.entries({ scrollHeight, clientHeight, scrollTop })) {
    Object.defineProperty(doc, key, { configurable: true, value })
  }
}

function flushRaf() {
  const pending = [...rafCallbacks.values()]
  rafCallbacks.clear()
  for (const fn of pending) fn()
}

describe('ReadingProgress', () => {
  let wrapper
  let addSpy
  let removeSpy

  function mountBar() {
    wrapper = mount(ReadingProgress)
    return wrapper
  }

  beforeEach(() => {
    rafCallbacks = new Map()
    let nextId = 0
    vi.stubGlobal('requestAnimationFrame', vi.fn((fn) => {
      nextId += 1
      rafCallbacks.set(nextId, fn)
      return nextId
    }))
    cancelRaf = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancelRaf)
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    vi.unstubAllGlobals()
    addSpy.mockRestore()
    removeSpy.mockRestore()
    const doc = document.documentElement
    delete doc.scrollHeight
    delete doc.clientHeight
    delete doc.scrollTop
  })

  it('挂载时调度首帧校准并以 passive 监听 scroll', () => {
    mountBar()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
  })

  it('首帧文档不可滚动（max=0）时宽度归零', () => {
    setDocSize({ scrollHeight: 800, clientHeight: 800 })
    const bar = mountBar().find('.reading-progress')
    flushRaf()
    expect(bar.element.style.width).toBe('0.00%')
  })

  it('滚动时节流调度，并按滚动比例更新宽度', () => {
    setDocSize({ scrollHeight: 4000, clientHeight: 1000, scrollTop: 0 })
    const bar = mountBar().find('.reading-progress')
    flushRaf()
    expect(bar.element.style.width).toBe('0.00%')

    // rAF 挂起期间重复滚动不重复调度
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)

    setDocSize({ scrollHeight: 4000, clientHeight: 1000, scrollTop: 750 })
    flushRaf()
    expect(bar.element.style.width).toBe('25.00%')

    // 回调执行后 raf 归零，再次滚动可重新调度
    window.dispatchEvent(new Event('scroll'))
    expect(requestAnimationFrame).toHaveBeenCalledTimes(3)
  })

  it('卸载时移除监听并取消挂起的 rAF，之后滚动不再调度', () => {
    setDocSize({ scrollHeight: 4000, clientHeight: 1000 })
    mountBar()
    window.dispatchEvent(new Event('scroll'))
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
    expect(cancelRaf).not.toHaveBeenCalled()

    wrapper.unmount()
    wrapper = null
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(cancelRaf).toHaveBeenCalledWith(2)

    const callsAfter = requestAnimationFrame.mock.calls.length
    window.dispatchEvent(new Event('scroll'))
    expect(requestAnimationFrame).toHaveBeenCalledTimes(callsAfter)
  })

  it('raf 已归零时卸载不触发 cancelAnimationFrame', () => {
    setDocSize({ scrollHeight: 4000, clientHeight: 1000 })
    mountBar()
    flushRaf()
    wrapper.unmount()
    wrapper = null
    expect(cancelRaf).not.toHaveBeenCalled()
  })

  it('卸载后仍触发的 rAF 回调安全返回（进度条已不存在）', () => {
    setDocSize({ scrollHeight: 4000, clientHeight: 1000, scrollTop: 100 })
    mountBar()
    window.dispatchEvent(new Event('scroll'))
    wrapper.unmount()
    wrapper = null
    expect(() => flushRaf()).not.toThrow()
  })
})
