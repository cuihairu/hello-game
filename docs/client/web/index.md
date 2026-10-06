# Web 游戏前端体系

## Category

client / web 子树总览。覆盖：Canvas 2D（01）、WebGL（02）、引擎与 Cocos（03）、游戏 UI（04）、小游戏平台（05）、客户端内部分层（06）。

## Definition

Web 是游戏触达玩家成本最低的路径之一：浏览器打开即玩，小游戏平台把分发和社交链路内置。这一章从技术角度展开 Web 游戏前端的完整体系——从 Canvas 2D 的渲染基础，到 WebGL 与三维渲染，到引擎与 Cocos Creator 的工作方式，再到游戏 UI、小游戏平台环境与客户端内部分层。

本章与第 8 章《客户端架构与引擎体系》互为表里：第 8 章回答「客户端架构怎么定、边界怎么划」，本章回答「Web 侧具体技术怎么用、怎么跑起来」。

## Related

关系链：Canvas 2D（01）→ WebGL 管线（02）→ 引擎封装（03）→ UI 体系（04）→ 平台环境（05）→ 进程内分层（06）。上游：client 树总纲（02 的边界、03 的引擎观）；下游：database/cache/04（资源分发）、industry 树平台生态（industry/platforms）。

## Reference

节点清单见下节；教程侧同题对照见第 03 讲《前端引擎与客户端》。

## 本章文章

- [H5 与 Canvas 2D 渲染基础](/client/web/01)
- [WebGL 与三维渲染入门](/client/web/02)
- [游戏引擎与 Cocos Creator](/client/web/03)
- [游戏 UI 体系](/client/web/04)
- [小游戏平台与浏览器环境](/client/web/05)
- [客户端内部分层：渲染、逻辑与资源](/client/web/06)

建议阅读顺序即编号顺序：01/02 是渲染地基，03 是工程载体，04/05 是两类终端形态，06 把前三页收拢成可维护的结构。
