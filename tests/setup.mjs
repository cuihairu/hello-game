// rAF 兜底：gsap/ScrollTrigger 内部（_rafBugFix 等）与 ReadingProgress 组件都会裸调
// requestAnimationFrame/cancelAnimationFrame。happy-dom 正常提供它们，但在
// vi.stubGlobal / vi.unstubAllGlobals 的窗口期或环境边角下，全局可能短暂为 undefined，
// 异步回调触发时抛 unhandled ReferenceError——用例全过、进程退出码却是 1（2026-10 实测）。
// 这里在 stub 之前铺一个保底实现：有 stub 时被临时覆盖，unstub 后回落到它，永不为空。
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16)
}
if (typeof globalThis.cancelAnimationFrame !== 'function') {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}
