---
layout: home

hero:
  name: "游戏开发系统化知识地图"
  text: "围绕真实问题组织的知识体系"
  tagline: 从方法论到落地实践，覆盖游戏项目从立项到上线的全链路技术知识
  image:
    src: /hero-gamepad.svg
    alt: 游戏开发知识地图
  actions:
    - theme: brand
      text: 开始阅读
      link: /01-methodology/
    - theme: alt
      text: 阅读指南
      link: /00-reading-guide/

features:
  - icon: 🗺️
    title: 总论与方法论
    details: 从游戏类型、平台与商业形态出发，建立分析问题的方法框架
    link: /01-methodology/
  - icon: 🎮
    title: 问题模型
    details: 将游戏按问题特征分类——房间制、实时对战、持续在线、长周期成长等
    link: /02-models/
  - icon: 🔌
    title: 网络与同步
    details: 传输协议、帧同步、状态同步、预测补偿与确定性保证
    link: /03-network/
  - icon: ⚙️
    title: 运行时与并发
    details: Actor 模型、协程、Tick 驱动、锁竞争与流控机制
    link: /05-concurrency-runtime/
  - icon: 🏗️
    title: 服务与架构
    details: 服务拆分、控制平面、IPC 消息系统与分布式协调
    link: /06-services-control-plane/
  - icon: 📊
    title: 数据与运营
    details: 数据建模、缓存中间件、埋点 BI、商业化与风控
    link: /13-data-database/
---

<style>
:root {
  --vp-home-hero-image-background-image: radial-gradient(
    circle at 50% 40%,
    rgba(111, 127, 73, 0.18),
    rgba(40, 67, 49, 0.08) 60%,
    transparent 100%
  );
}
</style>
