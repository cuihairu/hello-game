# 前端技术与游戏引擎

服务端开发者了解前端技术，才能更好地设计 API、协议和同步方案。本章梳理常见的游戏引擎、前端技术栈，以及前后端协作的关键点。

## 1. 游戏引擎概览

### 1.1 主流引擎对比

| 引擎 | 语言 | 平台 | 适用场景 | 代表游戏 |
|------|------|------|---------|---------|
| **Unity** | C# | 全平台 | 手游、独立游戏 | 原神、王者荣耀 |
| **Unreal Engine 5** | C++/蓝图 | PC/主机 | 3A大作、高品质 | 黑神话、和平精英 |
| **Cocos Creator** | TypeScript/JS | 小游戏/Web | 微信小游戏、H5 | 小游戏生态 |
| **Godot** | GDScript/C# | 全平台 | 独立游戏 | 开源生态 |
| **LayaAir** | TypeScript/AS | 小游戏/Web | 国内小游戏 | 微信/抖音小游戏 |
| **Cocos2d-x** | C++/Lua | 移动端 | 手游（旧项目） | 大量手游 |
| **Egret** | TypeScript | Web/小游戏 | H5游戏 | 白鹭引擎 |

### 1.2 引擎选型决策

```
选择什么引擎？
│
├── 微信/抖音小游戏
│   ├── Cocos Creator（推荐）
│   └── LayaAir
│
├── 手游（iOS/Android）
│   ├── Unity（推荐）
│   └── Cocos Creator
│
├── PC/主机 3A
│   ├── Unreal Engine 5（推荐）
│   └── Unity（中等品质）
│
├── Web/H5 游戏
│   ├── Cocos Creator
│   ├── Egret
│   └── Phaser（轻量级）
│
└── 独立游戏
    ├── Godot（开源免费）
    ├── Unity
    └── Unreal Engine
```

---

## 2. Unity

### 2.1 技术栈

```
Unity 技术栈：
├── 语言：C#（主要）、Unity Shader
├── 渲染：URP/HDRP/Built-in
├── 网络：Mirror/Netcode for GameObjects
├── UI：UGUI/UI Toolkit
├── 资源：Addressables/AssetBundle
├── 热更新：HybridCLR/ILRuntime
└── 平台：iOS/Android/PC/Web/主机
```

### 2.2 前后端协作

| Unity 开发关注 | 服务端需要提供 |
|---------------|--------------|
| 网络协议 | TCP/WebSocket/KCP 接入 |
| 序列化格式 | Protobuf/FlatBuffers/JSON |
| 资源下载 | CDN 地址、版本号 |
| 热更新 | 补丁包下载接口 |
| 登录 | OAuth/SDK 回调 |
| 支付 | 支付验证接口 |

### 2.3 Unity 网络层示例

```csharp
// Unity 客户端网络管理器
public class NetworkManager : MonoBehaviour
{
    private WebSocket ws;
    private Queue<byte[]> sendQueue = new Queue<byte[]>();
    
    public async void Connect(string url)
    {
        ws = new WebSocket(url);
        ws.OnMessage += OnMessage;
        ws.OnClose += OnClose;
        await ws.Connect();
        StartCoroutine(SendLoop());
    }
    
    void OnMessage(byte[] data)
    {
        // 解析 Protobuf 消息
        var msg = GameMessage.Parser.ParseFrom(data);
        // 分发到对应处理器
        Dispatcher.Emit(msg.MsgId, msg);
    }
    
    IEnumerator SendLoop()
    {
        while (ws.State == WebSocketState.Open)
        {
            while (sendQueue.Count > 0)
            {
                var data = sendQueue.Dequeue();
                ws.Send(data);
            }
            yield return new WaitForSeconds(0.01f);
        }
    }
}
```

---

## 3. Cocos Creator

### 3.1 技术栈

```
Cocos Creator 技术栈：
├── 语言：TypeScript/JavaScript
├── 渲染：WebGL/WebGPU
├── 网络：WebSocket/HTTP
├── UI：内置 UI 系统
├── 资源：Asset Bundle
├── 热更新：热更新机制（原生）
└── 平台：Web/小游戏/PC/移动端
```

### 3.2 微信小游戏适配

```
微信小游戏技术栈：
├── 引擎：Cocos Creator / LayaAir
├── 平台：微信小游戏运行时
├── 网络：WebSocket（微信API）
├── 支付：微信支付 SDK
├── 社交：微信好友、排行榜
├── 分享：微信分享 SDK
└── 广告：微信广告 SDK
```

### 3.3 Cocos 网络层示例

```typescript
// Cocos Creator 网络管理器
export class NetworkManager {
    private ws: WebSocket;
    private heartbeatTimer: number;
    
    connect(url: string) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.startHeartbeat();
    }
    
    send(msgId: number, data: Uint8Array) {
        // 消息格式：[2字节长度][2字节消息ID][数据]
        const buffer = new ArrayBuffer(4 + data.length);
        const view = new DataView(buffer);
        view.setUint16(0, 4 + data.length, true);
        view.setUint16(2, msgId, true);
        new Uint8Array(buffer).set(data, 4);
        this.ws.send(buffer);
    }
    
    private onMessage(event: MessageEvent) {
        const data = new DataView(event.data);
        const length = data.getUint16(0, true);
        const msgId = data.getUint16(2, true);
        const payload = new Uint8Array(event.data, 4);
        // 分发消息
        this.dispatch(msgId, payload);
    }
}
```

---

## 4. Unreal Engine 5

### 4.1 技术栈

```
UE5 技术栈：
├── 语言：C++、Blueprint（蓝图）
├── 渲染：Nanite/Lumen/World Partition
├── 网络：UE 网络框架（内置）
├── UI：UMG
├── 资源：Pak/Asset Bundle
├── 热更新：Hotfix 插件
└── 平台：PC/主机/高端移动端
```

### 4.2 UE5 网络架构

```
UE5 网络模型：
├── 权威服务器（Dedicated Server）
├── 客户端预测 + 服务端校验
├── 属性同步（Replication）
├── RPC（Remote Procedure Call）
├── Actor 复制
└── 关卡流式加载

特点：
- 内置网络框架，开箱即用
- 支持大规模多人（MMO）
- 内置反作弊基础
- 性能开销较高
```

### 4.3 UE5 前后端协作

| UE5 开发关注 | 服务端需要提供 |
|-------------|--------------|
| 自定义网络协议 | TCP/UDP 接入层 |
| 登录认证 | OAuth/SDK 回调 |
| 匹配系统 | 匹配 API |
| 排行榜 | 排行榜 API |
| 支付验证 | 支付回调 |
| 资源下载 | CDN 接口 |

---

## 5. Cocos2d-x（Lua）

### 5.1 技术栈

```
Cocos2d-x 技术栈：
├── 语言：C++（引擎）、Lua（脚本）
├── 渲染：OpenGL ES
├── 网络：自定义 TCP/WebSocket
├── UI：自定义 UI 系统
├── 资源：自定义加载
├── 热更新：Lua 热更新
└── 平台：iOS/Android
```

### 5.2 Lua 脚本层

```lua
-- Lua 网络管理器
local NetworkManager = class("NetworkManager")

function NetworkManager:ctor()
    self.ws = nil
    self.handlers = {}
end

function NetworkManager:connect(url)
    self.ws = WebSocket.new(url)
    self.ws:registerScriptHandler(function(event)
        if event == "OPEN" then
            print("连接成功")
        elseif event == "MESSAGE" then
            self:onMessage(self.ws:receive())
        elseif event == "CLOSED" then
            print("连接断开")
        end
    end)
    self.ws:start()
end

function NetworkManager:send(msgId, data)
    local msg = string.pack(">I2", msgId) .. data
    self.ws:send(msg)
end

function NetworkManager:onMessage(raw)
    local msgId = string.unpack(">I2", string.sub(raw, 1, 2))
    local payload = string.sub(raw, 3)
    if self.handlers[msgId] then
        self.handlers[msgId](payload)
    end
end

return NetworkManager
```

---

## 6. Layabox

### 6.1 技术栈

```
LayaAir 技术栈：
├── 语言：TypeScript/ActionScript/JavaScript
├── 渲染：WebGL/WebGPU
├── 网络：WebSocket/HTTP
├── UI：LayaAir UI
├── 资源：Asset Bundle
├── 热更新：LayaAir 热更新
└── 平台：小游戏/Web/移动端
```

### 6.2 Layabox 适用场景

```
Layabox 适用：
├── 微信小游戏（LayaAir 3.0 优化好）
├── 抖音小游戏
├── H5 游戏
└── 轻量级手游

Layabox 不适合：
├── 3A 级品质
├── 复杂 3D 场景
└── 主机平台
```

---

## 7. Godot

### 7.1 技术栈

```
Godot 技术栈：
├── 语言：GDScript/ C# / GDExtension（C++）
├── 渲染：Vulkan/OpenGL
├── 网络：MultiplayerAPI（内置）
├── UI：内置 UI 系统
├── 资源：内置资源系统
├── 热更新：场景热加载
└── 平台：PC/移动/Web/主机
```

### 7.2 Godot 特点

```
Godot 优势：
├── 完全开源免费（MIT 协议）
├── 轻量级（编辑器 < 100MB）
├── GDScript 易学（Python 风格）
├── 场景系统直观
├── 2D 和 3D 都支持
└── 社区活跃

Godot 劣势：
├── 3D 性能不如 UE5/Unity
├── 企业级支持较弱
├── 生态不如 Unity 丰富
└── 移动端优化不如 Unity
```

---

## 8. 前后端协作要点

### 8.1 协议对接

```
前后端协议对接流程：
1. 定义消息格式（Protobuf/JSON）
2. 定义消息 ID 编码规则
3. 定义错误码体系
4. 编写协议文档
5. 客户端/服务端各自实现
6. 联调测试
```

### 8.2 消息格式对比

| 格式 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| Protobuf | 高效、强类型 | 需要预编译 | 大型游戏 |
| JSON | 易读、灵活 | 体积大 | 小游戏/原型 |
| FlatBuffers | 零拷贝、高效 | 复杂 | 高性能场景 |
| MessagePack | 紧凑、跨语言 | 不如 Protobuf | 中型游戏 |

### 8.3 客户端-服务端交互模式

```
模式1：请求-响应
客户端 → 请求 → 服务端 → 响应 → 客户端
适用：登录、商店、背包

模式2：服务端推送
服务端 → 推送 → 客户端
适用：公告、活动通知、排行榜更新

模式3：实时同步
客户端 → 输入 → 服务端 → 状态广播 → 所有客户端
适用：MMO、实时对战

模式4：帧同步
客户端 → 输入 → 服务端收集 → 帧广播 → 所有客户端计算
适用：MOBA、RTS
```

### 8.4 常见协作问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 消息丢失 | 网络抖动 | 重试机制 + 消息ID去重 |
| 消息乱序 | UDP传输 | 序列号 + 缓冲区 |
| 版本不兼容 | 前后端不同步 | 版本号 + 兼容策略 |
| 状态不一致 | 客户端预测 | 服务端权威 + 校验 |
| 性能瓶颈 | 消息过多 | 消息合并 + 优先级 |

---

## 9. 引擎选择对服务端的影响

| 引擎选择 | 服务端影响 |
|---------|-----------|
| Unity + Cocos | 需要适配 WebSocket/TCP |
| UE5 | 可能需要自定义网络层 |
| Cocos Creator（小游戏） | WebSocket 为主 |
| Lua 脚本 | 需要支持 Lua 协议 |
| Web 游戏 | HTTP/WebSocket |

---

## 下一步

1. 了解主流引擎的技术栈
2. 理解前后端协议对接流程
3. 掌握常见消息格式的选择
4. 学习前后端协作的最佳实践
