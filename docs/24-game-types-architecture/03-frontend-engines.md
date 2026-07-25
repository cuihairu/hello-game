# 前端技术与游戏引擎

服务端开发者了解前端技术，才能更好地设计 API、协议和同步方案。本章梳理常见的游戏引擎、前端技术栈，以及前后端协作的关键点。

> **本章目标**：让服务端开发者能够理解不同引擎的网络层实现方式，知道在对接不同客户端时如何选择协议和设计 API，并能快速定位前后端协作中的常见问题。

---

## 1. 游戏引擎概览

### 1.1 主流引擎对比

| 引擎 | 语言 | 平台 | 包体大小 | 渲染能力 | 网络方案 | 适用场景 | 代表游戏 |
|------|------|------|---------|---------|---------|---------|---------|
| **Unity** | C# | 全平台 | 15-50MB | ★★★★ | Mirror/NGO/WebSocket | 手游、独立游戏 | 原神、王者荣耀 |
| **Unreal Engine 5** | C++/蓝图 | PC/主机 | 50-200MB | ★★★★★ | 内置网络框架 | 3A大作、高品质 | 黑神话、和平精英 |
| **Cocos Creator** | TypeScript/JS | 小游戏/Web | 2-10MB | ★★★ | WebSocket/HTTP | 微信小游戏、H5 | 小游戏生态 |
| **Godot** | GDScript/C# | 全平台 | 10-30MB | ★★★★ | MultiplayerAPI | 独立游戏 | 开源生态 |
| **LayaAir** | TypeScript/AS | 小游戏/Web | 2-8MB | ★★★ | WebSocket/HTTP | 国内小游戏 | 微信/抖音小游戏 |
| **Cocos2d-x** | C++/Lua | 移动端 | 15-40MB | ★★★ | 自定义TCP | 手游（旧项目） | 大量手游 |
| **Egret** | TypeScript | Web/小游戏 | 2-10MB | ★★★ | WebSocket/HTTP | H5游戏 | 白鹭引擎 |

### 1.2 引擎选型决策

```
选择什么引擎？
│
├── 微信/抖音小游戏
│   ├── Cocos Creator（推荐，生态最好）
│   └── LayaAir（LayaAir 3.0 优化好）
│
├── 手游（iOS/Android）
│   ├── Unity（推荐，人才最多）
│   └── Cocos Creator（小游戏+手游一体化）
│
├── PC/主机 3A
│   ├── Unreal Engine 5（推荐，画面顶级）
│   └── Unity（中等品质，效率高）
│
├── Web/H5 游戏
│   ├── Cocos Creator（推荐）
│   ├── Egret（白鹭引擎，H5老牌）
│   └── Phaser（轻量级，纯Web）
│
└── 独立游戏
    ├── Godot（开源免费，MIT协议）
    ├── Unity
    └── Unreal Engine
```

### 1.3 引擎对服务端架构的影响

```
┌──────────────────────────────────────────────────────────┐
│                  引擎选择 → 服务端影响                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Unity/Cocos (WebSocket)                                  │
│  ├── 长连接为主，需要连接管理器                             │
│  ├── 消息格式：Protobuf/JSON                               │
│  └── 需要心跳机制保持连接                                  │
│                                                          │
│  UE5 (TCP/UDP)                                            │
│  ├── 可能使用自定义TCP/UDP协议                             │
│  ├── 需要处理UDP可靠性问题                                 │
│  └── 需要自己实现可靠UDP层                                 │
│                                                          │
│  小游戏 (HTTP为主)                                         │
│  ├── HTTP短连接为主                                        │
│  ├── WebSocket为辅（实时功能）                             │
│  └── 需要RESTful API设计                                  │
│                                                          │
│  MMO (混合协议)                                            │
│  ├── TCP承载游戏逻辑                                       │
│  ├── UDP承载实时同步                                       │
│  └── HTTP承载非实时功能                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Unity

### 2.1 技术栈

```
Unity 技术栈：
├── 语言：C#（主要）、Unity Shader
├── 渲染：URP/HDRP/Built-in
├── 网络：
│   ├── Mirror（社区推荐，易用）
│   ├── Netcode for GameObjects（官方，持续更新）
│   ├── Fishnet（新秀，性能好）
│   └── 原生 WebSocket/TCP（自定义网络层）
├── UI：UGUI/UI Toolkit
├── 资源：Addressables/AssetBundle
├── 热更新：HybridCLR/ILRuntime
└── 平台：iOS/Android/PC/Web/主机
```

### 2.2 Unity 网络架构

```
┌─────────────────────────────────────────────────────┐
│                  Unity 客户端网络架构                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 游戏逻辑  │  │  UI系统   │  │ 资源管理  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                │
│  ┌────▼──────────────▼──────────────▼─────┐         │
│  │            消息分发器 (Dispatcher)        │         │
│  └────────────────┬───────────────────────┘         │
│                   │                                  │
│  ┌────────────────▼───────────────────────┐         │
│  │           协议层 (Protobuf/JSON)         │         │
│  └────────────────┬───────────────────────┘         │
│                   │                                  │
│  ┌────────────────▼───────────────────────┐         │
│  │         传输层 (WebSocket/TCP/KCP)       │         │
│  └────────────────┬───────────────────────┘         │
│                   │                                  │
└───────────────────┼──────────────────────────────────┘
                    │ 网络
                    ▼
              ┌──────────┐
              │  服务端   │
              └──────────┘
```

### 2.3 Unity 网络层完整示例

```csharp
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Unity 客户端网络管理器
/// 职责：连接管理、消息收发、心跳维持、断线重连
/// </summary>
public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }
    
    private WebSocket ws;
    private Queue<byte[]> sendQueue = new Queue<byte[]>();
    private Queue<byte[]> recvQueue = new Queue<byte[]>();
    
    // 心跳配置
    private float heartbeatInterval = 5f;
    private float heartbeatTimeout = 10f;
    private float lastHeartbeatTime;
    private bool isConnected = false;
    
    // 重连配置
    private int maxReconnectAttempts = 5;
    private float reconnectDelay = 2f;
    private int reconnectAttempts = 0;
    
    // 消息处理
    private Dictionary<int, Action<byte[]>> messageHandlers = new Dictionary<int, Action<byte[]>>();
    
    void Awake()
    {
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
    
    /// <summary>
    /// 连接到服务器
    /// </summary>
    public async void Connect(string url)
    {
        ws = new WebSocket(url);
        ws.OnOpen += OnConnected;
        ws.OnMessage += OnMessage;
        ws.OnClose += OnDisconnected;
        ws.OnError += OnError;
        
        try
        {
            await ws.Connect();
        }
        catch (Exception e)
        {
            Debug.LogError($"连接失败: {e.Message}");
            StartCoroutine(Reconnect(url));
        }
    }
    
    /// <summary>
    /// 注册消息处理器
    /// </summary>
    public void RegisterHandler(int msgId, Action<byte[]> handler)
    {
        messageHandlers[msgId] = handler;
    }
    
    /// <summary>
    /// 发送消息
    /// </summary>
    public void Send(int msgId, byte[] data)
    {
        if (!isConnected) return;
        
        // 消息格式：[4字节长度][4字节消息ID][数据]
        int totalLength = 8 + data.Length;
        byte[] packet = new byte[totalLength];
        Buffer.BlockCopy(BitConverter.GetBytes(totalLength), 0, packet, 0, 4);
        Buffer.BlockCopy(BitConverter.GetBytes(msgId), 0, packet, 4, 4);
        Buffer.BlockCopy(data, 0, packet, 8, data.Length);
        
        lock (sendQueue)
        {
            sendQueue.Enqueue(packet);
        }
    }
    
    /// <summary>
    /// 发送线程：在主线程中循环发送
    /// </summary>
    IEnumerator SendLoop()
    {
        while (true)
        {
            if (isConnected)
            {
                lock (sendQueue)
                {
                    while (sendQueue.Count > 0)
                    {
                        var data = sendQueue.Dequeue();
                        ws.Send(data);
                    }
                }
            }
            yield return new WaitForSeconds(0.01f); // 10ms 发送间隔
        }
    }
    
    /// <summary>
    /// 收到消息时的处理
    /// </summary>
    void OnMessage(byte[] data)
    {
        // 解析消息头
        if (data.Length < 8) return;
        
        int totalLength = BitConverter.ToInt32(data, 0);
        int msgId = BitConverter.ToInt32(data, 4);
        byte[] payload = new byte[data.Length - 8];
        Buffer.BlockCopy(data, 8, payload, 0, payload.Length);
        
        // 分发到对应处理器
        if (messageHandlers.TryGetValue(msgId, out var handler))
        {
            handler(payload);
        }
        else
        {
            Debug.LogWarning($"未注册的消息处理器: {msgId}");
        }
    }
    
    /// <summary>
    /// 心跳检测
    /// </summary>
    IEnumerator HeartbeatLoop()
    {
        while (isConnected)
        {
            if (Time.time - lastHeartbeatTime > heartbeatTimeout)
            {
                Debug.LogWarning("心跳超时，断开连接");
                ws.Close();
                yield break;
            }
            
            // 发送心跳包
            Send(1, new byte[0]); // msgId=1 表示心跳
            lastHeartbeatTime = Time.time;
            
            yield return new WaitForSeconds(heartbeatInterval);
        }
    }
    
    /// <summary>
    /// 断线重连
    /// </summary>
    IEnumerator Reconnect(string url)
    {
        while (reconnectAttempts < maxReconnectAttempts)
        {
            reconnectAttempts++;
            Debug.Log($"第 {reconnectAttempts} 次重连...");
            yield return new WaitForSeconds(reconnectDelay * reconnectAttempts);
            
            Connect(url);
            if (isConnected) yield break;
        }
        Debug.LogError("重连失败，请检查网络");
    }
    
    void OnConnected() {
        isConnected = true;
        reconnectAttempts = 0;
        StartCoroutine(HeartbeatLoop());
        StartCoroutine(SendLoop());
    }
    
    void OnDisconnected() { isConnected = false; }
    void OnError(string error) { Debug.LogError($"WebSocket错误: {error}"); }
}
```

### 2.4 Unity 前后端协作

| Unity 开发关注 | 服务端需要提供 | 协议选择建议 |
|---------------|--------------|-------------|
| 网络协议 | TCP/WebSocket/KCP 接入 | WebSocket（兼容性最好） |
| 序列化格式 | Protobuf/FlatBuffers/JSON | Protobuf（性能好、体积小） |
| 资源下载 | CDN 地址、版本号 | CDN + 版本号对比 |
| 热更新 | 补丁包下载接口 | 增量更新 + 完整包 |
| 登录 | OAuth/SDK 回调 | JWT Token |
| 支付 | 支付验证接口 | 服务端验证 + 异步通知 |

### 2.5 Unity 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 消息粘包 | TCP 流式传输 | 消息头包含长度字段 |
| 消息延迟 | 主线程阻塞 | 异步处理 + 消息队列 |
| 断线后状态丢失 | 客户端缓存过期 | 服务端状态快照 + 重连同步 |
| 大消息包拆分 | 协议限制 | 分包发送 + 消息重组 |
| SSL证书问题 | 平台差异 | 平台特定证书处理 |

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

关键特点：
├── 小游戏平台原生支持
├── TypeScript 类型安全
├── 组件化开发模式
└── 跨平台能力强
```

### 3.2 微信小游戏适配

```
微信小游戏技术栈：
├── 引擎：Cocos Creator / LayaAir
├── 平台：微信小游戏运行时
├── 网络：WebSocket（微信API）
│   ├── wx.connectSocket()
│   ├── wx.sendSocketMessage()
│   └── wx.onSocketMessage()
├── 支付：微信支付 SDK
│   ├── wx.requestPayment()
│   └── 服务端统一下单接口
├── 社交：微信好友、排行榜
│   ├── wx.getFriendCloudStorage()
│   └── wx.setUserCloudStorage()
├── 分享：微信分享 SDK
│   └── wx.shareAppMessage()
└── 广告：微信广告 SDK
    ├── Banner 广告
    ├── 插屏广告
    └── 激励视频广告

注意事项：
├── 包体大小限制：4MB（主包）+ 20MB（分包）
├── 内存限制：iOS 300MB / Android 256MB
├── 域名白名单限制
└── 数据域隔离（开放数据域）
```

### 3.3 Cocos 网络层完整示例

```typescript
// NetworkManager.ts - 完整的网络管理器实现
import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

export interface MessageHandler {
    (msgId: number, data: Uint8Array): void;
}

export interface Packet {
    msgId: number;
    payload: Uint8Array;
}

@ccclass('NetworkManager')
export class NetworkManager extends Component {
    private ws: WebSocket | null = null;
    private url: string = '';
    private heartbeatTimer: number = 0;
    private heartbeatTimeout: number = 10000;
    private lastHeartbeatTime: number = 0;
    private reconnectTimer: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectAttempts: number = 0;
    private reconnectDelay: number = 2000;
    
    // 消息处理
    private handlers: Map<number, MessageHandler> = new Map();
    
    // 消息队列
    private sendQueue: ArrayBuffer[] = [];
    private recvQueue: ArrayBuffer[] = [];
    
    // 连接状态
    private _isConnected: boolean = false;
    
    get isConnected(): boolean {
        return this._isConnected;
    }
    
    /**
     * 连接到服务器
     */
    connect(url: string): void {
        this.url = url;
        this.createConnection();
    }
    
    private createConnection(): void {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';
        
        this.ws.onopen = () => this.onConnected();
        this.ws.onmessage = (event) => this.onMessage(event);
        this.ws.onclose = (event) => this.onDisconnected(event);
        this.ws.onerror = (error) => this.onError(error);
    }
    
    /**
     * 注册消息处理器
     */
    registerHandler(msgId: number, handler: MessageHandler): void {
        this.handlers.set(msgId, handler);
    }
    
    /**
     * 发送消息
     */
    send(msgId: number, data: Uint8Array): void {
        if (!this._isConnected) {
            console.warn('未连接，消息加入队列');
            this.sendQueue.push(this.encode(msgId, data));
            return;
        }
        
        const packet = this.encode(msgId, data);
        this.ws!.send(packet);
    }
    
    /**
     * 消息编码：[2字节长度][2字节消息ID][数据]
     */
    private encode(msgId: number, data: Uint8Array): ArrayBuffer {
        const buffer = new ArrayBuffer(4 + data.length);
        const view = new DataView(buffer);
        
        // 大端序
        view.setUint16(0, 4 + data.length, false);  // 长度（不含自身）
        view.setUint16(2, msgId, false);             // 消息ID
        
        new Uint8Array(buffer).set(data, 4);
        return buffer;
    }
    
    /**
     * 消息解码
     */
    private decode(data: ArrayBuffer): Packet {
        const view = new DataView(data);
        const length = view.getUint16(0, false);
        const msgId = view.getUint16(2, false);
        const payload = new Uint8Array(data, 4);
        
        return { msgId, payload };
    }
    
    /**
     * 收到消息
     */
    private onMessage(event: MessageEvent): void {
        const packet = this.decode(event.data);
        const handler = this.handlers.get(packet.msgId);
        
        if (handler) {
            handler(packet.msgId, packet.payload);
        } else {
            console.warn(`未注册的消息处理器: ${packet.msgId}`);
        }
    }
    
    /**
     * 心跳检测
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (Date.now() - this.lastHeartbeatTime > this.heartbeatTimeout) {
                console.warn('心跳超时，重连...');
                this.ws?.close();
                return;
            }
            
            // 发送心跳包
            this.send(1, new Uint8Array(0)); // msgId=1 表示心跳
            this.lastHeartbeatTime = Date.now();
        }, 5000);
    }
    
    /**
     * 断线重连
     */
    private reconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('重连失败次数过多');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`第 ${this.reconnectAttempts} 次重连，${delay}ms 后...`);
        
        this.reconnectTimer = setTimeout(() => {
            this.createConnection();
        }, delay);
    }
    
    private onConnected(): void {
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.lastHeartbeatTime = Date.now();
        
        // 发送队列中的消息
        while (this.sendQueue.length > 0) {
            const packet = this.sendQueue.shift()!;
            this.ws!.send(packet);
        }
        
        this.startHeartbeat();
        console.log('连接成功');
    }
    
    private onDisconnected(event: CloseEvent): void {
        this._isConnected = false;
        clearInterval(this.heartbeatTimer);
        
        console.log(`连接断开: ${event.code} ${event.reason}`);
        this.reconnect();
    }
    
    private onError(error: Event): void {
        console.error('WebSocket错误:', error);
    }
    
    onDestroy(): void {
        this.ws?.close();
        clearInterval(this.heartbeatTimer);
        clearTimeout(this.reconnectTimer);
    }
}
```

### 3.4 Cocos Creator 项目结构最佳实践

```
Cocos Creator 推荐项目结构：
├── assets/
│   ├── scripts/
│   │   ├── network/
│   │   │   ├── NetworkManager.ts    # 网络连接管理
│   │   │   ├── Protocol.ts          # 协议定义
│   │   │   ├── MessageDispatcher.ts # 消息分发器
│   │   │   └── Heartbeat.ts         # 心跳机制
│   │   ├── ui/
│   │   │   ├── UIManager.ts         # UI管理器
│   │   │   └── UIStack.ts           # UI栈管理
│   │   ├── data/
│   │   │   ├── PlayerData.ts        # 玩家数据
│   │   │   └── GameData.ts          # 游戏数据
│   │   ├── audio/
│   │   │   └── AudioManager.ts      # 音频管理
│   │   └── utils/
│   │       ├── EventBus.ts          # 事件总线
│   │       └── ObjectPool.ts        # 对象池
│   ├── scenes/                      # 场景文件
│   ├── prefabs/                     # 预制体
│   └── resources/                   # 动态加载资源
└── settings/                        # 项目配置
```

### 3.5 Cocos Creator 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 包体超限 | 资源未压缩 | Asset Bundle分包 + 资源压缩 |
| 小游戏内存溢出 | 资源未释放 | 场景切换时释放 + 对象池 |
| 微信登录失败 | 域名未配置 | 配置合法域名白名单 |
| 广告收益低 | 广告位不合理 | A/B测试优化广告位置 |
| 低端机卡顿 | 渲染压力大 | 降级方案 + LOD |

---

## 4. Unreal Engine 5

### 4.1 技术栈

```
UE5 技术栈：
├── 语言：C++、Blueprint（蓝图）
├── 渲染：Nanite/Lumen/World Partition
│   ├── Nanite：虚拟化几何体，自动LOD
│   ├── Lumen：全局光照，动态反射
│   └── World Partition：大世界流式加载
├── 网络：UE 网络框架（内置）
│   ├── 属性同步（Replication）
│   ├── RPC（Remote Procedure Call）
│   └── Actor 复制
├── UI：UMG（Unreal Motion Graphics）
├── 资源：Pak/Asset Bundle
├── 热更新：Hotfix 插件
└── 平台：PC/主机/高端移动端

UE5 网络模型：
├── 权威服务器（Dedicated Server）
├── 客户端预测 + 服务端校验
├── 属性同步（Replication）
├── RPC（Remote Procedure Call）
├── Actor 复制
└── 关卡流式加载

特点：
├── 内置网络框架，开箱即用
├── 支持大规模多人（MMO）
├── 内置反作弊基础
├── 性能开销较高
└── 学习曲线陡峭
```

### 4.2 UE5 网络架构

```
┌─────────────────────────────────────────────────────┐
│                 UE5 网络架构                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │           服务端 (Dedicated Server)       │        │
│  │  ┌──────────┐  ┌──────────┐             │        │
│  │  │ Actor复制 │  │ RPC处理   │             │        │
│  │  └──────────┘  └──────────┘             │        │
│  └──────────────────┬──────────────────────┘        │
│                     │                                │
│         ┌───────────┼───────────┐                   │
│         │           │           │                    │
│  ┌──────▼─────┐ ┌───▼────┐ ┌───▼────┐             │
│  │  客户端1    │ │ 客户端2 │ │ 客户端3 │             │
│  │  预测+校验  │ │预测+校验│ │预测+校验│             │
│  └────────────┘ └────────┘ └────────┘             │
│                                                     │
│  关键机制：                                          │
│  ├── 属性同步：服务端自动同步 Actor 属性              │
│  ├── RPC：客户端/服务端远程过程调用                   │
│  ├── 预测：客户端本地预测，服务端校验                 │
│  └── 重放：网络重放用于调试和回放                    │
└─────────────────────────────────────────────────────┘
```

### 4.3 UE5 与自定义服务端协作

```cpp
// UE5 客户端自定义网络层示例
// 使用原生 TCP 连接自定义 Go 服务端

// NetworkComponent.h
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class UNetworkComponent : public UActorComponent
{
    GENERATED_BODY()
    
public:
    // 连接到自定义服务器
    UFUNCTION(BlueprintCallable)
    void ConnectToServer(FString ServerIP, int32 Port);
    
    // 发送消息
    UFUNCTION(BlueprintCallable)
    void SendMessage(int32 MsgId, const TArray<uint8>& Data);
    
private:
    FSocket* Socket;
    TQueue<TArray<uint8>> SendQueue;
    TQueue<TArray<uint8>> RecvQueue;
    
    // 网络线程
    FRunnableThread* NetworkThread;
    bool bIsConnected = false;
    
    void OnConnected();
    void OnDisconnected();
    void OnMessageReceived(const TArray<uint8>& Data);
    
    // 心跳
    FTimerHandle HeartbeatTimer;
    void StartHeartbeat();
    void SendHeartbeat();
};
```

### 4.4 UE5 前后端协作

| UE5 开发关注 | 服务端需要提供 | 注意事项 |
|-------------|--------------|---------|
| 自定义网络协议 | TCP/UDP 接入层 | UE5 常用 UDP，需要可靠层 |
| 登录认证 | OAuth/SDK 回调 | 平台SDK对接 |
| 匹配系统 | 匹配 API | 支持组队匹配 |
| 排行榜 | 排行榜 API | 实时/异步排行榜 |
| 支付验证 | 支付回调 | 平台支付验证 |
| 资源下载 | CDN 接口 | 版本管理 |

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
├── 热更新：Lua 热更新（LuaHotUpdate）
└── 平台：iOS/Android

Lua 热更新优势：
├── 修改 Lua 脚本即可热更新
├── 不需要重新发版
├── 更新速度快
└── 适合快速迭代
```

### 5.2 Lua 脚本层完整实现

```lua
-- NetworkManager.lua - 完整的网络管理器实现
local NetworkManager = class("NetworkManager")

function NetworkManager:ctor()
    self.ws = nil
    self.handlers = {}
    self.isConnected = false
    self.sendQueue = {}
    self.heartbeatTimer = nil
    self.reconnectTimer = nil
    self.reconnectAttempts = 0
    self.maxReconnectAttempts = 5
    self.reconnectDelay = 2
    self.url = nil
end

function NetworkManager:connect(url)
    self.url = url
    self:createConnection()
end

function NetworkManager:createConnection()
    self.ws = WebSocket.new(self.url)
    
    self.ws:registerScriptHandler(function(event)
        if event == "OPEN" then
            self:onConnected()
        elseif event == "MESSAGE" then
            self:onMessage(self.ws:receive())
        elseif event == "CLOSED" then
            self:onDisconnected()
        elseif event == "ERROR" then
            self:onError()
        end
    end)
    
    self.ws:start()
end

function NetworkManager:registerHandler(msgId, handler)
    self.handlers[msgId] = handler
end

function NetworkManager:send(msgId, data)
    if not self.isConnected then
        -- 加入发送队列
        table.insert(self.sendQueue, {msgId = msgId, data = data})
        return
    end
    
    -- 消息格式：[2字节长度][2字节消息ID][数据]
    local length = 4 + #data
    local msg = string.pack(">I2", length) .. string.pack(">I2", msgId) .. data
    self.ws:send(msg)
end

function NetworkManager:onMessage(raw)
    if #raw < 4 then return end
    
    local length = string.unpack(">I2", string.sub(raw, 1, 2))
    local msgId = string.unpack(">I2", string.sub(raw, 3, 4))
    local payload = string.sub(raw, 5)
    
    local handler = self.handlers[msgId]
    if handler then
        handler(payload)
    else
        print(string.format("未注册的消息处理器: %d", msgId))
    end
end

function NetworkManager:onConnected()
    self.isConnected = true
    self.reconnectAttempts = 0
    
    -- 发送队列中的消息
    for _, msg in ipairs(self.sendQueue) do
        self:send(msg.msgId, msg.data)
    end
    self.sendQueue = {}
    
    -- 启动心跳
    self:startHeartbeat()
    
    print("连接成功")
end

function NetworkManager:onDisconnected()
    self.isConnected = false
    
    -- 停止心跳
    if self.heartbeatTimer then
        scheduler.unscheduleGlobal(self.heartbeatTimer)
    end
    
    -- 尝试重连
    self:reconnect()
    
    print("连接断开")
end

function NetworkManager:onError()
    print("WebSocket错误")
end

function NetworkManager:startHeartbeat()
    self.heartbeatTimer = scheduler.scheduleGlobal(function()
        if not self.isConnected then return end
        
        -- 发送心跳包
        self:send(1, "") -- msgId=1 表示心跳
        self.lastHeartbeatTime = os.time()
    end, 5) -- 每5秒发送一次
end

function NetworkManager:reconnect()
    if self.reconnectAttempts >= self.maxReconnectAttempts then
        print("重连失败次数过多")
        return
    end
    
    self.reconnectAttempts = self.reconnectAttempts + 1
    local delay = self.reconnectDelay * self.reconnectAttempts
    
    print(string.format("第 %d 次重连，%d 秒后...", self.reconnectAttempts, delay))
    
    self.reconnectTimer = scheduler.scheduleGlobal(function()
        self:createConnection()
    end, delay)
end

function NetworkManager:disconnect()
    if self.ws then
        self.ws:close()
    end
    
    if self.heartbeatTimer then
        scheduler.unscheduleGlobal(self.heartbeatTimer)
    end
    
    if self.reconnectTimer then
        scheduler.unscheduleGlobal(self.reconnectTimer)
    end
    
    self.isConnected = false
end

return NetworkManager
```

### 5.3 Cocos2d-x 适用场景

```
Cocos2d-x 适用：
├── 老项目维护（大量历史代码）
├── Lua 热更新需求强的游戏
├── 对包体大小敏感的项目
└── 团队熟悉 Lua 生态

Cocos2d-x 不适合：
├── 新项目（建议用 Cocos Creator）
├── 需要 3D 渲染的项目
├── 需要现代工具链的项目
└── Web/小游戏平台（Cocos Creator 更好）
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

LayaAir 3.0 特性：
├── 3D 引擎重写，性能提升显著
├── 支持 WebGPU
├── 改进的包体优化
└── 更好的小游戏平台支持
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
├── 主机平台
└── 需要强大 3D 工具链的项目
```

---

## 7. Godot

### 7.1 技术栈

```
Godot 技术栈：
├── 语言：GDScript/ C# / GDExtension（C++）
├── 渲染：Vulkan/OpenGL
│   ├── Vulkan：现代图形 API
│   ├── OpenGL 3.3：兼容性好
│   └── 渲染器可切换
├── 网络：MultiplayerAPI（内置）
│   ├── ENet（UDP 可靠层）
│   ├── WebSocket
│   └── 自定义网络层
├── UI：内置 UI 系统
├── 资源：内置资源系统
├── 热更新：场景热加载
└── 平台：PC/移动/Web/主机
```

### 7.2 Godot 网络架构

```
┌─────────────────────────────────────────────────────┐
│                 Godot 网络架构                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │           MultiplayerAPI                 │        │
│  │  ├── MultiplayerPeer（网络对等体）       │        │
│  │  ├── RPC（远程过程调用）                 │        │
│  │  └── 网络同步（自动同步属性）            │        │
│  └──────────────────┬──────────────────────┘        │
│                     │                                │
│         ┌───────────┼───────────┐                   │
│         │           │           │                    │
│  ┌──────▼─────┐ ┌───▼────┐ ┌───▼────┐             │
│  │   ENet     │ │WebSocket│ │  TCP   │             │
│  │  (UDP可靠) │ │         │ │        │             │
│  └────────────┘ └────────┘ └────────┘             │
│                                                     │
│  RPC 类型：                                          │
│  ├── RPCMode.REMOTE：远程调用                        │
│  ├── RPCMode.MASTER：主机调用                        │
│  ├── RPCMode.PUPPET：从机调用                        │
│  └── RPCMode.AUTHORITY：权威节点调用                 │
└─────────────────────────────────────────────────────┘
```

### 7.3 Godot 网络示例

```gdscript
# GameServer.gd - Godot 网络管理示例
extends Node

# 网络状态
var is_host: bool = false
var peer: ENetMultiplayerPeer = null

func _ready():
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)
    multiplayer.connected_to_server.connect(_on_connected_to_server)

func host_game(port: int):
    peer = ENetMultiplayerPeer.new()
    var error = peer.create_server(port, 10)  # 最多10个玩家
    if error != OK:
        print("创建服务器失败: ", error)
        return
    
    multiplayer.multiplayer_peer = peer
    is_host = true
    print("服务器启动成功")

func join_game(ip: String, port: int):
    peer = ENetMultiplayerPeer.new()
    var error = peer.create_client(ip, port)
    if error != OK:
        print("连接失败: ", error)
        return
    
    multiplayer.multiplayer_peer = peer

func _on_peer_connected(id: int):
    print("玩家连接: ", id)

func _on_peer_disconnected(id: int):
    print("玩家断开: ", id)

func _on_connected_to_server():
    print("成功连接到服务器")

# RPC 示例
@rpc("any_peer", "call_local", "reliable")
func send_move(position: Vector2):
    var player_id = multiplayer.get_remote_sender_id()
    # 处理移动
    print("玩家 ", player_id, " 移动到: ", position)

@rpc("authority", "call_remote", "reliable")
func sync_state(state: Dictionary):
    # 同步游戏状态
    pass
```

### 7.4 Godot 优缺点

```
Godot 优势：
├── 完全开源免费（MIT 协议）
├── 轻量级（编辑器 < 100MB）
├── GDScript 易学（Python 风格）
├── 场景系统直观
├── 2D 和 3D 都支持
├── 社区活跃
└── 跨平台能力强

Godot 劣势：
├── 3D 性能不如 UE5/Unity
├── 企业级支持较弱
├── 生态不如 Unity 丰富
├── 移动端优化不如 Unity
├── 大型项目案例较少
└── 商业资源商店较小
```

---

## 8. 前后端协作要点

### 8.1 协议对接流程

```
前后端协议对接流程：
├── 1. 定义消息格式（Protobuf/JSON）
│   ├── 确定字段类型和名称
│   ├── 确定版本兼容策略
│   └── 生成客户端/服务端代码
│
├── 2. 定义消息 ID 编码规则
│   ├── 模块编码（如：0x01=登录，0x02=战斗）
│   ├── 消息编码（如：0x0101=登录请求）
│   └── 保留 ID 预留扩展
│
├── 3. 定义错误码体系
│   ├── 错误码范围划分
│   ├── 错误信息国际化
│   └── 错误处理规范
│
├── 4. 编写协议文档
│   ├── 接口说明文档
│   ├── 消息流程图
│   └── 示例代码
│
├── 5. 客户端/服务端各自实现
│   ├── 并行开发
│   ├── 单元测试
│   └── Mock 数据
│
└── 6. 联调测试
    ├── 接口测试
    ├── 压力测试
    └── 兼容性测试
```

### 8.2 消息格式对比

| 格式 | 体积 | 编解码速度 | 强类型 | 代码生成 | 跨语言 | 适用场景 |
|------|------|-----------|--------|---------|--------|---------|
| **Protobuf** | ★★★★★ | ★★★★ | ✓ | ✓ | ✓ | 大型游戏（推荐） |
| **FlatBuffers** | ★★★★★ | ★★★★★ | ✓ | ✓ | ✓ | 高性能场景 |
| **MessagePack** | ★★★★ | ★★★ | ✓ | ✓ | ✓ | 中型游戏 |
| **JSON** | ★★ | ★★ | ✗ | ✗ | ✓ | 小游戏/原型 |
| **BSON** | ★★★ | ★★★ | ✓ | ✗ | ✓ | MongoDB 生态 |

### 8.3 Protobuf 实战示例

```protobuf
// game_msg.proto - 完整的游戏协议定义

syntax = "proto3";
package game;
option go_package = "./pb";

// 通用消息包装
message GameMessage {
    uint32 msg_id = 1;
    uint64 timestamp = 2;
    bytes payload = 3;
}

// ========== 登录模块 ==========
message LoginRequest {
    string account = 1;
    string password = 2;
    string device_id = 3;
    uint32 platform = 4;  // 1=iOS, 2=Android, 3=Web
}

message LoginResponse {
    uint32 code = 1;
    string token = 2;
    uint64 player_id = 3;
    string server_url = 4;
}

// ========== 战斗模块 ==========
message MoveRequest {
    float x = 1;
    float y = 2;
    float z = 3;
    float rotation = 4;
    uint64 timestamp = 5;
}

message MoveResponse {
    uint64 player_id = 1;
    float x = 2;
    float y = 3;
    float z = 4;
}

message AttackRequest {
    uint64 target_id = 1;
    uint32 skill_id = 2;
    float x = 3;
    float y = 4;
    float z = 5;
}

message AttackResponse {
    uint64 attacker_id = 1;
    uint64 target_id = 2;
    uint32 damage = 3;
    uint32 target_hp = 4;
}

// ========== 背包模块 ==========
message ItemInfo {
    uint32 item_id = 1;
    uint32 count = 2;
    map<string, string> extra = 3;
}

message InventoryRequest {
    uint32 action = 1;  // 1=查询, 2=使用, 3=丢弃
    uint32 item_id = 2;
    uint32 count = 3;
}

message InventoryResponse {
    uint32 code = 1;
    repeated ItemInfo items = 2;
}

// ========== 聊天模块 ==========
message ChatMessage {
    uint32 channel = 1;  // 1=世界, 2=公会, 3=私聊
    uint64 sender_id = 2;
    string sender_name = 3;
    string content = 4;
    uint64 timestamp = 5;
}

// ========== 排行榜模块 ==========
message RankRequest {
    uint32 rank_type = 1;  // 1=战力, 2=等级, 3=竞技
    uint32 page = 2;
    uint32 page_size = 3;
}

message RankEntry {
    uint32 rank = 1;
    uint64 player_id = 2;
    string player_name = 3;
    uint64 score = 4;
}

message RankResponse {
    repeated RankEntry entries = 1;
    uint64 my_rank = 2;
    uint64 my_score = 3;
}
```

### 8.4 客户端-服务端交互模式

```
模式1：请求-响应（最常用）
客户端 ──请求──→ 服务端 ──响应──→ 客户端
适用：登录、商店、背包、排行榜
特点：简单可靠，但实时性差

模式2：服务端推送
服务端 ──推送──→ 客户端
适用：公告、活动通知、排行榜更新
特点：实时性好，但需要处理消息丢失

模式3：实时同步（状态同步）
客户端 ──输入──→ 服务端 ──状态广播──→ 所有客户端
适用：MMO、实时对战
特点：带宽高，但安全性好

模式4：帧同步
客户端 ──输入──→ 服务端收集 ──帧广播──→ 所有客户端计算
适用：MOBA、RTS
特点：带宽低，但延迟敏感
```

### 8.5 常见协作问题

| 问题 | 原因 | 解决方案 | 代码示例 |
|------|------|---------|---------|
| 消息丢失 | 网络抖动 | 重试机制 + 消息ID去重 | 消息ID + ACK |
| 消息乱序 | UDP传输 | 序列号 + 缓冲区 | 消息序列号 |
| 版本不兼容 | 前后端不同步 | 版本号 + 兼容策略 | 协议版本号 |
| 状态不一致 | 客户端预测 | 服务端权威 + 校验 | 状态校验 |
| 性能瓶颈 | 消息过多 | 消息合并 + 优先级 | 消息批量发送 |

### 8.6 消息去重实现

```go
// 消息去重器 - 防止消息重复处理
type MessageDeduplicator struct {
    seen    map[uint64]time.Time
    mu      sync.RWMutex
    ttl     time.Duration
}

func NewMessageDeduplicator(ttl time.Duration) *MessageDeduplicator {
    return &MessageDeduplicator{
        seen: make(map[uint64]time.Time),
        ttl:  ttl,
    }
}

// 检查消息是否已处理过
func (d *MessageDeduplicator) IsDuplicate(msgID uint64) bool {
    d.mu.RLock()
    defer d.mu.RUnlock()
    
    if t, exists := d.seen[msgID]; exists {
        return time.Since(t) < d.ttl
    }
    return false
}

// 标记消息已处理
func (d *MessageDeduplicator) MarkSeen(msgID uint64) {
    d.mu.Lock()
    defer d.mu.Unlock()
    d.seen[msgID] = time.Now()
}

// 清理过期记录
func (d *MessageDeduplicator) Cleanup() {
    d.mu.Lock()
    defer d.mu.Unlock()
    
    now := time.Now()
    for id, t := range d.seen {
        if now.Sub(t) > d.ttl {
            delete(d.seen, id)
        }
    }
}
```

---

## 9. 引擎选择对服务端的影响

| 引擎选择 | 协议类型 | 连接方式 | 消息格式 | 特殊要求 |
|---------|---------|---------|---------|---------|
| Unity + WebSocket | TCP | 长连接 | Protobuf/JSON | 心跳机制 |
| UE5 + UDP | UDP | 长连接 | 自定义 | 可靠UDP层 |
| Cocos Creator | WebSocket | 长连接 | Protobuf/JSON | 小游戏适配 |
| Lua 脚本 | TCP | 长连接 | 自定义 | Lua热更新 |
| Web 游戏 | HTTP/WS | 短连接+长连接 | JSON | RESTful API |
| MMO | 混合 | 混合 | 混合 | 多协议支持 |

---

## 10. 实战建议

### 10.1 服务端开发者必知

1. **了解客户端限制**
   - 小游戏包体大小限制
   - 移动端内存限制
   - Web 平台浏览器限制

2. **选择合适的协议**
   - WebSocket 是最通用的选择
   - UDP 适合实时性要求高的场景
   - HTTP 适合非实时功能

3. **设计可扩展的协议**
   - 使用消息ID分模块
   - 预留扩展字段
   - 版本兼容设计

4. **提供完善的文档**
   - 接口文档自动生成
   - 错误码说明
   - 示例代码

### 10.2 性能优化建议

```
性能优化检查清单：
├── 协议优化
│   ├── 使用 Protobuf 而非 JSON
│   ├── 消息压缩（gzip/snappy）
│   └── 消息合并（批量发送）
│
├── 连接优化
│   ├── 连接池复用
│   ├── 心跳间隔优化
│   └── 断线重连策略
│
├── 缓存优化
│   ├── 客户端缓存策略
│   ├── 服务端缓存设计
│   └── CDN 资源缓存
│
└── 监控优化
    ├── 延迟监控
    ├── 错误率监控
    └── 资源使用监控
```

---

## 下一步

1. 了解主流引擎的技术栈和特点
2. 理解前后端协议对接流程
3. 掌握常见消息格式的选择
4. 学习前后端协作的最佳实践
5. 实践网络层代码实现
6. 了解性能优化策略
