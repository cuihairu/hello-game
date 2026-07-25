# 06 常见框架：从最轻到最重

游戏服务器框架按复杂度从轻到重排列，从一个简单的 HTTP Server 到完整的游戏引擎级框架。理解每种框架的定位，有助于在不同阶段选择合适的工具。

---

## 框架光谱：从轻到重

```
轻 ◀──────────────────────────────────────────────────▶ 重

HTTP Server → Netty → Skynet → Pitaya → Photon → KBEngine → BigWorld
(通用)      (网络库)  (Actor)  (Go框架)  (商业)   (Python)   (商业)
```

| 重量级 | 框架 | 语言 | 核心模型 | 学习曲线 | 生产力 |
|-------|------|------|---------|---------|-------|
| 🪶 轻 | HTTP Server | 任意 | 请求-响应 | ⭐ | ⭐⭐ |
| 📦 中轻 | Netty | Java | Reactor | ⭐⭐ | ⭐⭐⭐ |
| 🎯 中 | Skynet | C + Lua | Actor | ⭐⭐⭐ | ⭐⭐⭐ |
| 🚀 中 | Pitaya | Go | Actor + Cluster | ⭐⭐ | ⭐⭐⭐⭐ |
| 💼 中重 | Photon Server | C# | Actor + 状态机 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 🏗️ 重 | KBEngine | C++ + Python | Entity + Cell | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 🏔️ 最重 | BigWorld | C++ + Python | Entity + Space | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 1. HTTP Server（通用 HTTP 服务）

### 最简单的起点

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	Error   string `json:"error,omitempty"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	resp := LoginResponse{Success: true, Token: "tok_abc123"}
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/api/login", loginHandler)
	fmt.Println("HTTP server on :8080")
	http.ListenAndServe(":8080", nil)
}
```

**适用**：登录服、支付回调、活动接口、后台管理 API
**局限**：无状态管理、无实时推送、无房间概念
**谁在用**：几乎所有游戏都有 HTTP 层做辅助服务

### HTTP Server 的进阶用法：带状态管理的游戏登录服

```go
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Session 管理
type Session struct {
	PlayerID  string
	LoginTime time.Time
	Expiry    time.Time
}

type SessionManager struct {
	sessions map[string]*Session // token -> session
	mu       sync.RWMutex
}

func NewSessionManager() *SessionManager {
	sm := &SessionManager{sessions: make(map[string]*Session)}
	// 定期清理过期 session
	go func() {
		for range time.Tick(time.Minute) {
			sm.cleanup()
		}
	}()
	return sm
}

func (sm *SessionManager) Create(playerID string) string {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	b := make([]byte, 16)
	rand.Read(b)
	token := hex.EncodeToString(b)

	sm.sessions[token] = &Session{
		PlayerID:  playerID,
		LoginTime: time.Now(),
		Expiry:    time.Now().Add(24 * time.Hour),
	}
	return token
}

func (sm *SessionManager) Get(token string) (*Session, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	s, ok := sm.sessions[token]
	if ok && time.Now().Before(s.Expiry) {
		return s, true
	}
	return nil, false
}

func (sm *SessionManager) cleanup() {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	now := time.Now()
	for token, s := range sm.sessions {
		if now.After(s.Expiry) {
			delete(sm.sessions, token)
		}
	}
}

func main() {
	sm := NewSessionManager()

	http.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		json.NewDecoder(r.Body).Decode(&req)
		// 验证用户名密码（省略）
		token := sm.Create("player_001")
		json.NewEncoder(w).Encode(LoginResponse{Success: true, Token: token})
	})

	http.HandleFunc("/api/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if _, ok := sm.Get(token); ok {
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		} else {
			http.Error(w, "unauthorized", 401)
		}
	})

	fmt.Println("HTTP server on :8080")
	http.ListenAndServe(":8080", nil)
}
```

### HTTP Server 局限性分析

| 维度 | HTTP Server | 游戏专用框架 |
|------|------------|------------|
| 连接模型 | 短连接/长连接 | 长连接/UDP |
| 实时推送 | 需要轮询/SSE/WebSocket | 原生支持 |
| 状态管理 | 需自己实现 | 内置 |
| 并发模型 | 线程/协程 | Actor/Entity |
| 房间管理 | 无 | 内置 |
| 热更新 | 不支持 | 部分支持 |

---

## 2. Netty（Java 网络框架）

### Java 游戏服务器的基石

Netty 本身不是游戏框架，但它是 Java 游戏服务器最常用的网络层。

```
┌─────────────────────────────────────┐
│           Netty Pipeline            │
│  ┌──────┐ ┌──────┐ ┌────────────┐  │
│  │Decode│→│Logic │→│   Encode   │  │
│  └──────┘ └──────┘ └────────────┘  │
│       ↑                  ↓          │
│  ByteBuf in          ByteBuf out   │
└─────────────────────────────────────┘
```

**核心特性**：
- Reactor 线程模型，epoll/kqueue 高性能
- 零拷贝、内存池
- Channel Pipeline 编解码链
- 心跳检测、断线重连

**Java 游戏服务器常见架构**：
```
Netty (网络层) + Spring (业务层) + Redis (缓存) + MySQL (持久化)
```

**代表项目**：
- Apollo（携程开源游戏服务器）
- JKing
- 各种自研 Java MMO 框架

**优点**：Java 生态成熟、高并发验证充分
**缺点**：内存占用大、启动慢、GC 停顿

### Netty 完整游戏服务器示例

```java
// GameServer.java - 完整的游戏服务器启动示例
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.LengthFieldBasedFrameDecoder;
import io.netty.handler.codec.LengthFieldPrepender;
import io.netty.handler.timeout.IdleStateHandler;

public class GameServer {
    private final int port;
    private final int bossThreads;
    private final int workerThreads;

    public GameServer(int port, int bossThreads, int workerThreads) {
        this.port = port;
        this.bossThreads = bossThreads;
        this.workerThreads = workerThreads;
    }

    public void start() throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup(bossThreads);
        EventLoopGroup workerGroup = new NioEventLoopGroup(workerThreads);

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .option(ChannelOption.SO_BACKLOG, 1024)
                .childOption(ChannelOption.SO_KEEPALIVE, true)
                .childOption(ChannelOption.TCP_NODELAY, true)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ChannelPipeline pipeline = ch.pipeline();
                        // 心跳检测：30秒无读操作触发
                        pipeline.addLast("idle", new IdleStateHandler(30, 0, 0));
                        // 长度字段解码器
                        pipeline.addLast("decoder", new LengthFieldBasedFrameDecoder(
                            65535, 0, 4, 0, 4));
                        pipeline.addLast("encoder", new LengthFieldPrepender(4));
                        // 游戏协议编解码
                        pipeline.addLast("codec", new GameProtocolCodec());
                        // 游戏逻辑处理
                        pipeline.addLast("handler", new GameMessageHandler());
                    }
                });

            ChannelFuture future = bootstrap.bind(port).sync();
            System.out.println("Game server started on port " + port);
            future.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}

// GameMessageHandler.java - 游戏消息处理器
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;

public class GameMessageHandler extends SimpleChannelInboundHandler<GameMessage> {
    // 玩家会话管理
    private static final Map<String, PlayerSession> sessions = new ConcurrentHashMap<>();

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, GameMessage msg) {
        switch (msg.getType()) {
            case C2S_LOGIN:
                handleLogin(ctx, msg);
                break;
            case C2S_MOVE:
                handleMove(ctx, msg);
                break;
            case C2S_ATTACK:
                handleAttack(ctx, msg);
                break;
            case C2S_HEARTBEAT:
                // 心跳不需要处理，Netty 会重置空闲计时
                break;
            default:
                ctx.fireChannelRead(msg);
        }
    }

    private void handleLogin(ChannelHandlerContext ctx, GameMessage msg) {
        LoginRequest req = msg.getData(LoginRequest.class);
        // 验证逻辑
        PlayerSession session = new PlayerSession(req.getToken());
        sessions.put(ctx.channel().id().asLongText(), session);

        LoginResponse resp = new LoginResponse(true, "player_001");
        ctx.writeAndFlush(new GameMessage(MessageType.S2C_LOGIN, resp));
    }

    private void handleMove(ChannelHandlerContext ctx, GameMessage msg) {
        PlayerSession session = sessions.get(ctx.channel().id().asLongText());
        if (session == null || !session.isAuthenticated()) {
            return;
        }
        MoveRequest req = msg.getData(MoveRequest.class);
        // 更新玩家位置，广播给同场景其他玩家
        sceneManager.broadcastMovement(session.getPlayerId(), req.getX(), req.getY());
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent event = (IdleStateEvent) evt;
            if (event.state() == IdleState.READER_IDLE) {
                // 30秒无消息，断开连接
                System.out.println("Player timeout, disconnecting: " + ctx.channel().id());
                ctx.close();
            }
        }
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        System.err.println("Channel exception: " + cause.getMessage());
        ctx.close();
    }
}
```

### Netty 性能调优指南

```java
// 性能配置示例
public class GameServerConfig {
    // Boss 线程数：通常 1-2 个，负责接受连接
    public static final int BOSS_THREADS = 1;

    // Worker 线程数：CPU 核心数 * 2
    public static final int WORKER_THREADS = Runtime.getRuntime()
        .availableProcessors() * 2;

    // 内存池配置
    public static final int PooledByteBufAllocatorPageSize = 8192;
    public static final int PooledByteBufAllocatorMaxOrder = 11;

    // 背压控制
    public static final int LOW_WATER_MARK = 32 * 1024;  // 32KB
    public static final int HIGH_WATER_MARK = 64 * 1024;  // 64KB

    // 心跳配置
    public static final int HEARTBEAT_INTERVAL = 15;  // 秒
    public static final int HEARTBEAT_TIMEOUT = 45;   // 秒
}
```

---

## 3. Skynet（C + Lua Actor 框架）

### 轻量级 Actor 框架的代表

Skynet 是云风开源的 C 语言游戏服务器框架，核心是 **Actor + Lua 协程**。

```
┌──────────────────────────────────────────┐
│               Skynet                     │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Service1│ │Service2│ │Service3│  ...   │
│  │ (Lua)  │ │ (Lua)  │ │ (C)   │       │
│  └───┬────┘ └───┬────┘ └───┬────┘       │
│      └────┬─────┘──────────┘            │
│           ↓                              │
│     消息队列 (全局单队列)                 │
│  ┌──────────────────────────────────┐   │
│  │    Timer   │   Network   │  IO   │   │
│  └──────────────────────────────────┘   │
│        多个工作线程消费队列               │
└──────────────────────────────────────────┘
```

**架构特点**：
- 一个 Skynet 实例 = 一组 C 线程 + 一组 Lua 服务
- 每个服务是独立 Actor，通过消息通信
- Lua 协程实现异步 I/O 的同步写法
- 全局消息队列，工作线程竞争消费

### Skynet 服务示例：连接管理

```lua
-- gate.lua - 简化的连接管理服务
local skynet = require "skynet"

local connections = {}

skynet.register_protocol {
    name = "client",
    id = skynet.PTYPE_CLIENT,
}

function init()
    skynet.error("gate service started")
end

function handle_message(fd, msg)
    if not connections[fd] then
        connections[fd] = { id = fd, login_time = os.time() }
        skynet.error(string.format("player %d connected", fd))
    end

    -- 转发给对应玩家服务
    skynet.send("player_service", "lua", "on_message", fd, msg)
end

function handle_disconnect(fd)
    connections[fd] = nil
    skynet.error(string.format("player %d disconnected", fd))
end
```

### Skynet 完整的玩家服务示例

```lua
-- player_service.lua - 玩家逻辑服务
local skynet = require "skynet"
localynet = require "ynet"
localynet = require "netpack"

local players = {}  -- fd -> player_data

skynet.register_protocol {
    name = "lua",
    id = skynet.PTYPE_LUA,
}

-- 玩家数据结构
local function create_player(fd)
    return {
        fd = fd,
        id = nil,
        name = "",
        level = 1,
        hp = 100,
        mp = 50,
        x = 0,
        y = 0,
        items = {},
        last_active = os.time(),
    }
end

-- 处理客户端消息
function CMD.on_message(fd, msg)
    local player = players[fd]
    if not player then
        player = create_player(fd)
        players[fd] = player
    end

    -- 简单的消息解析（实际项目用 protobuf）
    local cmd = string.sub(msg, 1, 4)
    local data = string.sub(msg, 5)

    if cmd == "LOGIN" then
        handle_login(player, data)
    elseif cmd == "MOVE" then
        handle_move(player, data)
    elseif cmd == "CHAT" then
        handle_chat(player, data)
    elseif cmd == "FIGHT" then
        handle_fight(player, data)
    end
end

-- 登录处理
function handle_login(player, data)
    -- 解析登录数据
    local id, name = data:match("^(%d+):(.+)$")
    player.id = tonumber(id)
    player.name = name

    -- 通知客户端登录成功
    local resp = string.format("LOGIN_OK:%d:%s:%d",
        player.id, player.name, player.level)
    skynet.send(skynet.self(), "lua", "send_to_client", player.fd, resp)

    -- 广播给其他玩家
    broadcast_to_others(player, string.format("PLAYER_JOIN:%d:%s",
        player.id, player.name))
end

-- 移动处理
function handle_move(player, data)
    local x, y = data:match("^(%d+),(%d+)$")
    player.x = tonumber(x)
    player.y = tonumber(y)
    player.last_active = os.time()

    -- 广播移动给同场景玩家
    broadcast_to_scene(player, string.format("PLAYER_MOVE:%d,%d,%d",
        player.id, player.x, player.y))
end

-- 聊天处理
function handle_chat(player, data)
    -- 过滤敏感词
    local filtered = filter_sensitive_words(data)

    -- 广播聊天消息
    broadcast_to_scene(player, string.format("CHAT:%s:%s",
        player.name, filtered))
end

-- 战斗处理
function handle_fight(player, data)
    local target_id = tonumber(data)
    local target = find_player_by_id(target_id)

    if target then
        -- 简单的战斗计算
        local damage = math.random(10, 30)
        target.hp = target.hp - damage

        -- 通知双方
        send_to_client(player.fd, string.format("FIGHT_OK:%d,%d",
            target_id, damage))
        send_to_client(target.fd, string.format("FIGHT_HIT:%d,%d",
            player.id, damage))

        -- 检查死亡
        if target.hp <= 0 then
            target.hp = 100  -- 复活
            broadcast_to_scene(player, string.format("PLAYER_DIE:%d",
                target_id))
        end
    end
end

-- 发送消息给客户端
function CMD.send_to_client(fd, msg)
   ynet.send(fd, msg)
end

-- 广播给场景内玩家
function broadcast_to_scene(player, msg)
    for fd, p in pairs(players) do
        if fd ~= player.fd then
            -- 简化：实际应该检查是否在同一场景
            ynet.send(fd, msg)
        end
    end
end

-- 广播给其他所有玩家
function broadcast_to_others(player, msg)
    for fd, p in pairs(players) do
        if fd ~= player.fd then
            ynet.send(fd, msg)
        end
    end
end

-- 按 ID 查找玩家
function find_player_by_id(id)
    for fd, p in pairs(players) do
        if p.id == id then
            return p
        end
    end
    return nil
end

-- 敏感词过滤
function filter_sensitive_words(text)
    local sensitive_words = {"脏词1", "脏词2"}  -- 实际项目用更复杂的过滤
    for _, word in ipairs(sensitive_words) do
        text = string.gsub(text, word, "***")
    end
    return text
end

-- 定时器：清理不活跃玩家
skynet.fork(function()
    while true do
        skynet.sleep(6000)  -- 60秒检查一次
        local now = os.time()
        for fd, player in pairs(players) do
            if now - player.last_active > 300 then  -- 5分钟不活跃
                players[fd] = nil
                ynet.close(fd)
                skynet.error(string.format("Player %d timed out", player.id))
            end
        end
    end
end)
```

### Skynet 高级特性：Actor 间通信

```lua
-- chat_service.lua - 聊天服务
local skynet = require "skynet"

local channels = {}  -- channel_name -> {subscribers}

-- 订阅频道
function CMD.subscribe(channel, player_id)
    if not channels[channel] then
        channels[channel] = {}
    end
    channels[channel][player_id] = true
    skynet.error(string.format("Player %d subscribed to %s", player_id, channel))
end

-- 取消订阅
function CMD.unsubscribe(channel, player_id)
    if channels[channel] then
        channels[channel][player_id] = nil
    end
end

-- 发送消息到频道
function CMD.publish(channel, player_id, message)
    if not channels[channel] then
        return
    end

    for subscriber_id, _ in pairs(channels[channel]) do
        if subscriber_id ~= player_id then
            -- 通过 player_service 发送消息
            skynet.send("player_service", "lua",
                "send_message_to_player", subscriber_id,
                string.format("CHAT:%s:%s", channel, message))
        end
    end
end

-- 获取频道在线人数
function CMD.get_online_count(channel)
    if channels[channel] then
        local count = 0
        for _ in pairs(channels[channel]) do
            count = count + 1
        end
        return count
    end
    return 0
end
```

### Skynet 配置文件示例

```lua
-- skynet.conf - Skynet 配置
thread = 4              -- 工作线程数
logger = nil            -- 日志文件
harbor = 0              -- 单节点模式
start = "main"          -- 启动服务
bootstrap = "snlua bootstrap"

-- 网络配置
listen = "0.0.0.0:8888"
max_client = 10000

-- 定时器配置
timer_size = 512

-- 内存配置
mem_report = 1024       -- 内存报告阈值(MB)
mem_limit = 2048        -- 内存上限(MB)
```

---

## 4. Pitaya（Go Actor + 集群框架）

### Go 生态的现代游戏服务器框架

Pitaya 由 TFG Co 开源，基于 Go + Protobuf，内置 Actor 模型和集群支持。

```
┌─────────────────────────────────────────┐
│              Pitaya 架构                 │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Frontend │  │ Backend  │  │ Agent │ │
│  │ (网关)   │→│ (逻辑)   │→│(玩家) │ │
│  └──────────┘  └──────────┘  └───────┘ │
│       │             │            │       │
│       └───────── NATS ──────────┘       │
│              (消息总线)                   │
└─────────────────────────────────────────┘
```

### Pitaya 完整游戏服务器示例

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/topfreegames/pitaya/v2"
	"github.com/topfreegames/pitaya/v2/cluster"
	"github.com/topfreegames/pitaya/v2/component"
	"github.com/topfreegames/pitaya/v2/config"
)

// ============== 玩家模块 ==============

// Player 玩家组件 - 绑定到 Player 实体
type Player struct {
	component.Base
	ID     string
	Name   string
	HP     int
	MP     int
	Level  int
	Exp    int
	X, Y   float64
	Scene  string
}

// PlayerInfoRequest 玩家信息请求
type PlayerInfoRequest struct{}

// PlayerInfoResponse 玩家信息响应
type PlayerInfoResponse struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	Hp     int32  `json:"hp"`
	Mp     int32  `json:"mp"`
	Level  int32  `json:"level"`
}

// GetInfo RPC方法 - 可被其他服务远程调用
func (p *Player) GetInfo(ctx context.Context, msg *PlayerInfoRequest) (*PlayerInfoResponse, error) {
	return &PlayerInfoResponse{
		Id:    p.ID,
		Name:  p.Name,
		Hp:    int32(p.HP),
		Mp:    int32(p.MP),
		Level: int32(p.Level),
	}, nil
}

// MoveRequest 移动请求
type MoveRequest struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// MoveResponse 移动响应
type MoveResponse struct {
	Success bool    `json:"success"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
}

// Move 客户端调用的移动方法
func (p *Player) Move(ctx context.Context, msg *MoveRequest) (*MoveResponse, error) {
	p.X = msg.X
	p.Y = msg.Y

	log.Printf("Player %s moved to (%.1f, %.1f)", p.ID, p.X, p.Y)

	// 广播给同场景的其他玩家
	p.GetServer().BroadcastToScene(p.Scene, "PlayerMoved", map[string]interface{}{
		"id": p.ID,
		"x":  p.X,
		"y":  p.Y,
	})

	return &MoveResponse{Success: true, X: p.X, Y: p.Y}, nil
}

// ============== 场景模块 ==============

// Scene 场景组件
type Scene struct {
	component.Base
	Name    string
	Players map[string]*Player
	MaxSize int
}

// JoinScene 进入场景
func (s *Scene) JoinScene(ctx context.Context, msg *PlayerJoinRequest) (*SceneJoinResponse, error) {
	if len(s.Players) >= s.MaxSize {
		return &SceneJoinResponse{
			Success: false,
			Error:   "scene is full",
		}, nil
	}

	player := &Player{
		ID:    msg.PlayerId,
		Name:  msg.PlayerName,
		HP:    100,
		MP:    50,
		Level: 1,
		Scene: s.Name,
	}
	s.Players[msg.PlayerId] = player

	log.Printf("Player %s joined scene %s", msg.PlayerId, s.Name)

	// 通知场景内其他玩家
	for _, p := range s.Players {
		if p.ID != msg.PlayerId {
			p.GetServer().Send(p.ID, "PlayerJoined", map[string]interface{}{
				"id":   msg.PlayerId,
				"name": msg.PlayerName,
			})
		}
	}

	return &SceneJoinResponse{
		Success: true,
		Players: s.getPlayerList(),
	}, nil
}

// LeaveScene 离开场景
func (s *Scene) LeaveScene(ctx context.Context, msg *PlayerLeaveRequest) (*SceneLeaveResponse, error) {
	delete(s.Players, msg.PlayerId)
	log.Printf("Player %s left scene %s", msg.PlayerId, s.Name)

	// 通知其他玩家
	s.broadcast("PlayerLeft", map[string]interface{}{
		"id": msg.PlayerId,
	})

	return &SceneLeaveResponse{Success: true}, nil
}

func (s *Scene) getPlayerList() []map[string]interface{} {
	var list []map[string]interface{}
	for _, p := range s.Players {
		list = append(list, map[string]interface{}{
			"id":    p.ID,
			"name":  p.Name,
			"level": p.Level,
		})
	}
	return list
}

func (s *Scene) broadcast(route string, data interface{}) {
	for _, p := range s.Players {
		p.GetServer().Send(p.ID, route, data)
	}
}

// ============== 主程序 ==============

func main() {
	// 创建 Pitaya 实例
	app, err := pitaya.New(
		pitaya.WithCluster(cluster.ClusterConfig{
			Type: "etcd",
		}),
		pitaya.WithConfig(config.NewDefaultConfig()),
	)
	if err != nil {
		log.Fatal(err)
	}

	// 注册组件
	app.Register("player", &Player{})
	app.Register("scene", &Scene{
		Name:    "default",
		Players: make(map[string]*Player),
		MaxSize: 100,
	})

	// 启动服务器
	if err := app.Start(context.Background()); err != nil {
		log.Fatal(err)
	}

	log.Println("Pitaya game server started")
	select {} // 保持运行
}
```

### Pitaya 集群配置示例

```yaml
# cluster.yaml - Pitaya 集群配置
cluster:
  type: etcd
  etcd:
    endpoints:
      - "etcd1:2379"
      - "etcd2:2379"
      - "etcd3:2379"
    timeout: 5s

  nats:
    endpoint: "nats://nats:4222"
    max_reconnect: 10
    reconnect_interval: 1s

server:
  id: "game-server-1"
  type: "game"
  metadata:
    region: "asia"
    version: "1.0.0"

  frontend: true
  listen: "0.0.0.0:3250"

  # 心跳配置
  heartbeat:
    interval: 30s
    timeout: 90s

  # 消息超时
  message:
    timeout: 30s
    max_message_size: 65535

# 模块配置
modules:
  - name: "player"
    type: "actor"
    config:
      max_entities: 10000
      entity_timeout: 300s

  - name: "scene"
    type: "actor"
    config:
      max_scenes: 100
      players_per_scene: 200
```

### Pitaya vs Skynet 详细对比

| 维度 | Pitaya | Skynet |
|------|--------|--------|
| **语言** | Go | C + Lua |
| **并发模型** | goroutine (CSP) | Actor + 协程 |
| **集群支持** | 内置 (etcd/NATS) | 需自建 |
| **序列化** | Protobuf / JSON | 二进制 |
| **内存效率** | 中等 (GC) | 极高 (无GC) |
| **开发效率** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **性能** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **学习曲线** | 低 (Go) | 中 (C + Lua) |
| **社区** | 活跃 (GitHub) | 活跃 (中文社区) |
| **适合场景** | 中型 MMO、多人在线 | 中小型、嵌入式 |

---

## 5. Photon Server（商业游戏服务器）

### 商业级多人游戏引擎

Photon 是 Exit Games 公司的商业产品，广泛用于手游和独立游戏。

**核心特性**：
- C# 开发
- 内置 Actor（Player）模型
- 状态同步 + 帧同步
- 房间管理、匹配系统
- 客户端 SDK 支持 Unity / Unreal / WebGL / Native

### Photon 完整游戏示例（C#）

```csharp
// MyGame.cs - Photon Server 自定义游戏逻辑
using Photon.SocketServer;
using PhotonHostRuntimeInterfaces;
using System.Collections.Generic;

public class MyGame : GameLogic
{
    // 房间管理
    private Dictionary<int, GameRoom> rooms = new Dictionary<int, GameRoom>();

    // 玩家加入游戏
    public override void OnJoinGame(Player player)
    {
        // 分配房间
        var room = GetOrCreateRoom(player);
        room.AddPlayer(player);

        // 通知房间内所有玩家
        BroadcastEvent("PlayerJoined", new {
            playerId = player.ID,
            playerName = player.NickName
        });

        Log.Info($"Player {player.NickName} joined room {room.Id}");
    }

    // 玩家离开游戏
    public override void OnLeaveGame(Player player)
    {
        var room = GetPlayerRoom(player);
        if (room != null)
        {
            room.RemovePlayer(player);
            BroadcastEvent("PlayerLeft", new { playerId = player.ID });

            // 如果房间为空，销毁房间
            if (room.PlayerCount == 0)
            {
                rooms.Remove(room.Id);
            }
        }
    }

    // 处理玩家事件
    public override void OnEvent(byte eventCode, Player sender, object data)
    {
        switch (eventCode)
        {
            case EventCode.Move:
                HandleMove(sender, data);
                break;
            case EventCode.Attack:
                HandleAttack(sender, data);
                break;
            case EventCode.Chat:
                HandleChat(sender, data);
                break;
            case EventCode.Skill:
                HandleSkill(sender, data);
                break;
        }
    }

    // 处理移动
    private void HandleMove(Player sender, object data)
    {
        var moveData = (MoveData)data;

        // 服务端校验移动合法性
        if (!ValidateMove(sender, moveData))
        {
            SendEvent(sender, "MoveRejected", new { reason = "invalid move" });
            return;
        }

        // 更新玩家位置
        sender.Position = new Vector3(moveData.X, moveData.Y, moveData.Z);

        // 广播给房间内其他玩家（不包括自己）
        BroadcastEventToOthers("PlayerMoved", new {
            playerId = sender.ID,
            x = moveData.X,
            y = moveData.Y,
            z = moveData.Z
        }, sender);
    }

    // 处理攻击
    private void HandleAttack(Player sender, object data)
    {
        var attackData = (AttackData)data;
        var target = FindPlayerById(attackData.TargetId);

        if (target == null || !IsInAttackRange(sender, target))
        {
            SendEvent(sender, "AttackFailed", new { reason = "target not in range" });
            return;
        }

        // 计算伤害
        int damage = CalculateDamage(sender, target, attackData.SkillId);
        target.HP -= damage;

        // 广播攻击事件
        BroadcastEvent("PlayerAttacked", new {
            attackerId = sender.ID,
            targetId = target.ID,
            damage = damage,
            skillId = attackData.SkillId
        });

        // 检查目标是否死亡
        if (target.HP <= 0)
        {
            HandlePlayerDeath(target, sender);
        }
    }

    // 处理聊天
    private void HandleChat(Player sender, object data)
    {
        var chatData = (ChatData)data;

        // 敏感词过滤
        string filteredMessage = FilterSensitiveWords(chatData.Message);

        // 广播聊天消息
        BroadcastEvent("ChatMessage", new {
            playerId = sender.ID,
            playerName = sender.NickName,
            message = filteredMessage,
            channel = chatData.Channel
        });
    }

    // 处理技能
    private void HandleSkill(Player sender, object data)
    {
        var skillData = (SkillData)data;

        // 检查技能冷却
        if (IsSkillOnCooldown(sender, skillData.SkillId))
        {
            SendEvent(sender, "SkillFailed", new { reason = "skill on cooldown" });
            return;
        }

        // 检查蓝量
        var skill = GetSkill(skillData.SkillId);
        if (sender.MP < skill.ManaCost)
        {
            SendEvent(sender, "SkillFailed", new { reason = "not enough mana" });
            return;
        }

        // 扣除蓝量
        sender.MP -= skill.ManaCost;

        // 执行技能效果
        ExecuteSkillEffect(sender, skill, skillData.TargetIds);

        // 广播技能释放
        BroadcastEvent("SkillUsed", new {
            playerId = sender.ID,
            skillId = skillData.SkillId,
            targets = skillData.TargetIds
        });

        // 设置技能冷却
        SetSkillCooldown(sender, skillData.SkillId, skill.Cooldown);
    }

    // 玩家死亡处理
    private void HandlePlayerDeath(Player victim, Player killer)
    {
        BroadcastEvent("PlayerDied", new {
            victimId = victim.ID,
            killerId = killer.ID
        });

        // 经验奖励
        killer.EXP += CalculateExpReward(victim);

        // 5秒后复活
        ScheduleRespawn(victim, 5.0f);
    }

    // 计划复活
    private void ScheduleRespawn(Player player, float delay)
    {
        Timer.Schedule(delay, () =>
        {
            player.HP = player.MaxHP;
            player.MP = player.MaxMP;
            player.Position = GetSpawnPoint(player.Team);

            SendEvent(player, "Respawned", new {
                x = player.Position.X,
                y = player.Position.Y,
                z = player.Position.Z
            });
        });
    }
}

// GameRoom.cs - 游戏房间
public class GameRoom
{
    public int Id { get; set; }
    public List<Player> Players { get; set; }
    public int MaxPlayers { get; set; }
    public GameState State { get; set; }
    public float ElapsedTime { get; set; }

    public GameRoom(int id, int maxPlayers = 10)
    {
        Id = id;
        Players = new List<Player>();
        MaxPlayers = maxPlayers;
        State = GameState.Waiting;
    }

    public void AddPlayer(Player player)
    {
        if (Players.Count < MaxPlayers)
        {
            Players.Add(player);
            if (Players.Count >= 2) // 至少2人开始
            {
                State = GameState.Playing;
            }
        }
    }

    public void RemovePlayer(Player player)
    {
        Players.Remove(player);
        if (Players.Count == 0)
        {
            State = GameState.Ended;
        }
    }

    public int PlayerCount => Players.Count;
}

// EventCode.cs - 事件码定义
public static class EventCode
{
    public const byte Move = 1;
    public const byte Attack = 2;
    public const byte Chat = 3;
    public const byte Skill = 4;
    public const byte UseItem = 5;
    public const byte Pickup = 6;
}

// GameState.cs - 游戏状态
public enum GameState
{
    Waiting,
    Playing,
    Paused,
    Ended
}
```

### Photon 家族产品对比

| 产品 | 定位 | 同步方式 | 价格 | 适用场景 |
|------|------|---------|------|---------|
| Photon Server | 本地部署，完全控制 | 自定义 | 付费 | 大型项目，完全控制 |
| Photon Cloud | 云托管，开箱即用 | 自定义 | 按CCU计费 | 快速上线，全球部署 |
| PUN (Unity) | Unity 插件，最易用 | 状态同步 | 按CCU | Unity 手游 |
| Quantum | 帧同步框架 | 帧同步 | 付费 | MOBA、RTS |
| Fusion | 状态同步框架 | 状态同步 | 免费/付费 | 射击、动作 |
| Lights | 轻量级网络层 | 自定义 | 免费 | 小型项目 |

### Photon vs 自研框架对比

| 维度 | Photon | 自研框架 |
|------|--------|---------|
| 开发周期 | 短 (1-2周) | 长 (3-6个月) |
| 初始成本 | 高 (授权费) | 低 |
| 长期成本 | 按CCU付费 | 维护成本 |
| 定制性 | 有限 | 完全控制 |
| 技术风险 | 低 (成熟方案) | 中等 |
| 团队要求 | 低 | 高 |
| 性能 | 中等 | 可优化到极致 |

---

## 6. KBEngine（开源 MMO 引擎）

### Python + C++ 的完整 MMO 框架

KBEngine 是一款开源 MMO 服务端引擎，源自蜗牛游戏，用 Python（CellApp）+ C++（底层引擎）。

```
┌──────────────────────────────────────────┐
│            KBEngine 架构                  │
│                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Loginapp│  │ CellApp │  │ DBApp   │  │
│  │ (登录)  │  │ (逻辑)  │  │ (数据库)│  │
│  └────┬────┘  └────┬────┘  └────┬────┘  │
│       │            │             │        │
│       └────── Message Router ───┘        │
│              (消息路由)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Baseapp │  │Manager  │  │Botapp   │  │
│  │(网关)   │  │(管理器)  │  │(机器人) │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└──────────────────────────────────────────┘
```

### KBEngine 完整 Entity 定义

```python
# player_entity.py - 完整的玩家实体定义
import KBEngine
from KBEDebug import *
import time
import math

class Player(KBEngine.Entity):
    """
    玩家实体 - KBEngine 中的核心概念
    每个在线玩家对应一个 Player 实例
    """

    def __init__(self):
        KBEngine.Entity.__init__(self)

        # 基础属性
        self.accountName = ""
        self.playerName = ""
        self.level = 1
        self.exp = 0

        # 战斗属性
        self.hp = 100
        self.maxHP = 100
        self.mp = 50
        self.maxMP = 50
        self.attack = 10
        self.defense = 5
        self.speed = 3.0

        # 位置信息
        self.position = KBEngine.Vector3(0, 0, 0)
        self.rotation = KBEngine.Vector3(0, 0, 0)

        # 状态机
        self.state = "idle"  # idle, moving, fighting, dead

        # 背包
        self.inventory = []
        self.maxInventorySize = 50

        # 技能
        self.skills = []
        self.skillCooldowns = {}

        # 社交
        self.friends = []
        self.guildId = 0

        # 定时器
        self.regenTimer = None
        self.stateTimer = None

        DEBUG_MSG(f"Player created: {self.id}")

    def onSpawn(self):
        """玩家在场景中出生"""
        DEBUG_MSG(f"Player {self.id} spawned at {self.position}")

        # 播放入场动画
        self.client.onSpawn(self.position.x, self.position.y, self.position.z)

        # 开始自动回血回蓝
        self.startRegeneration()

        # 广播给场景内其他玩家
        self.broadcastToOtherClients("onPlayerSpawned", {
            "id": self.id,
            "name": self.playerName,
            "level": self.level,
            "x": self.position.x,
            "y": self.position.y,
            "z": self.position.z
        })

    def onDie(self, killerId=None):
        """玩家死亡"""
        DEBUG_MSG(f"Player {self.id} died, killed by {killerId}")

        self.state = "dead"
        self.hp = 0

        # 通知客户端播放死亡动画
        self.client.onDied()

        # 广播死亡事件
        self.broadcastToOtherClients("onPlayerDied", {
            "id": self.id,
            "killerId": killerId
        })

        # 如果有击杀者，给击杀者奖励
        if killerId:
            killer = KBEngine.entities.get(killerId)
            if killer and killer.__class__.__name__ == "Player":
                killer.onKillReward(self)

        # 5秒后复活
        self.stateTimer = self.addTimer(5, 0, self.onRespawnTimer)

    def onRespawnTimer(self, timerHandle):
        """复活定时器回调"""
        self.stateTimer = None
        self.respawn()

    def respawn(self):
        """复活玩家"""
        self.hp = self.maxHP
        self.mp = self.maxMP
        self.state = "idle"

        # 传送到出生点
        spawnPoint = self.getSpawnPoint()
        self.position = KBEngine.Vector3(spawnPoint[0], spawnPoint[1], spawnPoint[2])

        # 通知客户端
        self.client.onRespawned(self.position.x, self.position.y, self.position.z)

        # 广播给其他玩家
        self.broadcastToOtherClients("onPlayerRespawned", {
            "id": self.id,
            "x": self.position.x,
            "y": self.position.y,
            "z": self.position.z
        })

        DEBUG_MSG(f"Player {self.id} respawned")

    def startRegeneration(self):
        """开始自动回血回蓝"""
        # 每5秒回复一次
        self.regenTimer = self.addTimer(5, -1, self.onRegenTimer)

    def onRegenTimer(self, timerHandle):
        """回血回蓝定时器回调"""
        if self.state == "dead":
            return

        # 回血
        if self.hp < self.maxHP:
            self.hp = min(self.maxHP, self.hp + 5)
            self.client.onHPChanged(self.hp)

        # 回蓝
        if self.mp < self.maxMP:
            self.mp = min(self.maxMP, self.mp + 3)
            self.client.onMPChanged(self.mp)

    def requstMove(self, x, y, z):
        """客户端请求移动"""
        if self.state == "dead":
            return

        # 计算移动距离
        distance = math.sqrt(
            (x - self.position.x) ** 2 +
            (y - self.position.y) ** 2 +
            (z - self.position.z) ** 2
        )

        # 检查移动速度是否合法
        maxDistance = self.speed * 0.1  # 假设0.1秒一次移动请求
        if distance > maxDistance * 1.5:  # 允许一定的误差
            # 作弊检测
            DEBUG_MSG(f"Player {self.id} speed hack detected: {distance}")
            self.client.onMoveRejected("speed hack")
            return

        # 更新位置
        self.position.x = x
        self.position.y = y
        self.position.z = z
        self.state = "moving"

        # 广播移动给其他玩家
        self.broadcastToOtherClients("onPlayerMoved", {
            "id": self.id,
            "x": self.position.x,
            "y": self.position.y,
            "z": self.position.z
        })

    def requstAttack(self, targetId, skillId=0):
        """客户端请求攻击"""
        if self.state == "dead":
            return

        # 查找目标
        target = KBEngine.entities.get(targetId)
        if not target:
            return

        # 检查攻击距离
        distance = self.getDistanceTo(target)
        attackRange = 2.0  # 攻击距离
        if distance > attackRange:
            self.client.onAttackRejected("target too far")
            return

        # 检查技能冷却
        if skillId in self.skillCooldowns:
            if time.time() < self.skillCooldowns[skillId]:
                self.client.onAttackRejected("skill on cooldown")
                return

        # 计算伤害
        damage = self.calculateDamage(target, skillId)

        # 扣除蓝量
        if skillId > 0:
            skill = self.getSkill(skillId)
            if skill and self.mp < skill.mpCost:
                self.client.onAttackRejected("not enough mana")
                return
            self.mp -= skill.mpCost

        # 扣除目标血量
        target.hp -= damage

        # 设置技能冷却
        if skillId > 0:
            skill = self.getSkill(skillId)
            if skill:
                self.skillCooldowns[skillId] = time.time() + skill.cooldown

        # 广播攻击动画
        self.broadcastToOtherClients("onPlayerAttacked", {
            "attackerId": self.id,
            "targetId": targetId,
            "skillId": skillId,
            "damage": damage
        })

        # 通知目标被击中
        target.client.onHit(damage)

        # 检查目标是否死亡
        if target.hp <= 0:
            target.onDie(self.id)

        DEBUG_MSG(f"Player {self.id} attacked {targetId}, damage: {damage}")

    def calculateDamage(self, target, skillId):
        """计算伤害"""
        baseDamage = self.attack

        # 技能加成
        if skillId > 0:
            skill = self.getSkill(skillId)
            if skill:
                baseDamage = int(baseDamage * skill.damageMultiplier)

        # 防御减免
        defenseReduction = target.defense / (target.defense + 100)
        finalDamage = int(baseDamage * (1 - defenseReduction))

        # 随机浮动 ±10%
        finalDamage = int(finalDamage * (0.9 + 0.2 * __import__('random').random()))

        return max(1, finalDamage)

    def onKillReward(self, victim):
        """击杀奖励"""
        # 经验奖励
        expReward = victim.level * 10
        self.exp += expReward

        # 检查升级
        self.checkLevelUp()

        # 通知客户端
        self.client.onExpChanged(self.exp, expReward)

        DEBUG_MSG(f"Player {self.id} killed {victim.id}, got {expReward} exp")

    def checkLevelUp(self):
        """检查是否升级"""
        expNeeded = self.level * 100  # 简单的升级公式
        while self.exp >= expNeeded:
            self.exp -= expNeeded
            self.level += 1

            # 属性成长
            self.maxHP += 10
            self.maxMP += 5
            self.attack += 2
            self.defense += 1

            # 满血满蓝
            self.hp = self.maxHP
            self.mp = self.maxMP

            # 通知客户端
            self.client.onLevelUp(self.level)

            # 广播升级特效
            self.broadcastToOtherClients("onPlayerLevelUp", {
                "id": self.id,
                "level": self.level
            })

            expNeeded = self.level * 100

            DEBUG_MSG(f"Player {self.id} leveled up to {self.level}")

    def requstUseItem(self, itemId):
        """使用物品"""
        # 查找背包中的物品
        item = None
        for i, bagItem in enumerate(self.inventory):
            if bagItem["id"] == itemId:
                item = bagItem
                self.inventory.pop(i)
                break

        if not item:
            self.client.onUseItemFailed("item not found")
            return

        # 根据物品类型执行效果
        itemType = item["type"]
        if itemType == "potion_hp":
            healAmount = item["value"]
            self.hp = min(self.maxHP, self.hp + healAmount)
            self.client.onHPChanged(self.hp)
            self.broadcastToOtherClients("onItemUsed", {
                "id": self.id,
                "itemId": itemId,
                "effect": "heal"
            })
        elif itemType == "potion_mp":
            manaAmount = item["value"]
            self.mp = min(self.maxMP, self.mp + manaAmount)
            self.client.onMPChanged(self.mp)

        DEBUG_MSG(f"Player {self.id} used item {itemId}")

    def broadcastToOtherClients(self, methodName, data):
        """广播消息给场景内其他玩家"""
        for entity in KBEngine.entities.values():
            if entity.__class__.__name__ == "Player" and entity.id != self.id:
                if hasattr(entity.client, methodName):
                    getattr(entity.client, methodName)(data)

    def getDistanceTo(self, other):
        """计算到另一个实体的距离"""
        return math.sqrt(
            (self.position.x - other.position.x) ** 2 +
            (self.position.y - other.position.y) ** 2 +
            (self.position.z - other.position.z) ** 2
        )

    def getSpawnPoint(self):
        """获取出生点"""
        return (0, 0, 0)

    def getSkill(self, skillId):
        """获取技能信息"""
        for skill in self.skills:
            if skill["id"] == skillId:
                return skill
        return None

    def onLeaveSpace(self):
        """离开场景"""
        DEBUG_MSG(f"Player {self.id} leaving space")

        # 停止回血回蓝
        if self.regenTimer:
            self.cancelTimer(self.regenTimer)
            self.regenTimer = None

        # 保存数据到数据库
        self.saveData()

    def saveData(self):
        """保存玩家数据"""
        data = {
            "level": self.level,
            "exp": self.exp,
            "hp": self.hp,
            "mp": self.mp,
            "attack": self.attack,
            "defense": self.defense,
            "position": {
                "x": self.position.x,
                "y": self.position.y,
                "z": self.position.z
            },
            "inventory": self.inventory,
            "skills": self.skills
        }

        # 调用 DBApp 保存
        self.databaseID  # KBEngine 会自动保存到数据库
        DEBUG_MSG(f"Player {self.id} data saved")
```

### KBEngine 配置文件示例

```xml
<!-- kbengine.xml - KBEngine 配置 -->
<root>
    <!-- 数据库配置 -->
    <database>
        <type>mysql</type>
        <host>127.0.0.1</host>
       <port>3306</port>
        <username>kbengine</username>
        <password>kbengine</password>
        <database>kbengine</database>
    </database>

    <!-- 组件配置 -->
    <dbapp>
        <dbInterfaces>
            <dbinterface>
                <name>default</name>
                <type>mysql</type>
                <host>127.0.0.1</host>
                <port>3306</port>
                <username>kbengine</username>
                <password>kbengine</password>
                <database>kbengine</database>
                <utf8>true</utf8>
            </dbinterface>
        </dbInterfaces>
    </dbapp>

    <cellapp>
        <channelDefaultTimeout>30.0</channelDefaultTimeout>
        <entityDefPath>res/scripts/entity_defs/</entityDefPath>
    </cellapp>

    <baseapp>
        <channelDefaultTimeout>30.0</channelDefaultTimeout>
        <entityDefPath>res/scripts/entity_defs/</entityDefPath>
    </baseapp>

    <!-- 场景配置 -->
    <space>
        <defaultResPath>res/maps/</defaultResPath>
    </space>
</root>
```

---

## 7. BigWorld（商业 MMO 引擎）

### 重量级商业解决方案

BigWorld 是最老牌的 MMO 服务端引擎，被《坦克世界》等大作采用。

**架构特点**：
- 完整的 Entity/Space 模型
- 自动空间分割和兴趣管理（AOI）
- Cell 分布式处理
- 成熟的数据库集成

### BigWorld 核心概念

```
┌─────────────────────────────────────────────────────┐
│                  BigWorld 架构                       │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                  Login App                     │  │
│  │          (认证、账号管理、负载均衡)              │  │
│  └─────────────────────┬─────────────────────────┘  │
│                        │                             │
│  ┌─────────────────────▼─────────────────────────┐  │
│  │                  Base App                       │  │
│  │      (全局实体管理、跨服通信、持久化)            │  │
│  └─────────────────────┬─────────────────────────┘  │
│                        │                             │
│  ┌─────────────────────▼─────────────────────────┐  │
│  │                 Cell App (集群)                  │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │
│  │  │ Cell 1  │  │ Cell 2  │  │ Cell 3  │  ...   │  │
│  │  │(区域1)  │  │(区域2)  │  │(区域3)  │        │  │
│  │  └─────────┘  └─────────┘  └─────────┘        │  │
│  │       └──────── AOI 管理 ────────┘             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                  DB App                         │  │
│  │          (数据库访问、缓存、分片)                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### BigWorld Python 脚本示例

```python
# avatar.py - BigWorld 玩家实体（简化版）
import BigWorld
import Math
import math

class Avatar(BigWorld.Entity):
    """
    玩家实体 - BigWorld 的核心概念
    每个在线玩家对应一个 Avatar 实例
    """

    def __init__(self):
        BigWorld.Entity.__init__(self)

        # 基础属性
        self.playerName = ""
        self.level = 1
        self.experience = 0

        # 战斗属性
        self.health = 100
        self.maxHealth = 100
        self.mana = 50
        self.maxMana = 50

        # 位置
        self.position = Math.Vector3(0, 0, 0)
        self.yaw = 0

        # 状态
        self.isMoving = False
        self.targetPosition = None

        # 技能
        self.skills = {}
        self.skillCooldowns = {}

        # AI 实体
        self.npcs = []

    def onEnterWorld(self):
        """进入世界"""
        BigWorld.logInfo("Avatar", f"Player {self.id} entered world")

        # 启动回血回蓝
        self.regenTimer = BigWorld.addTimer(self.regenTick, 5.0, -1)

        # 通知其他玩家
        self.broadcastToNearby("onPlayerSpawn", {
            "id": self.id,
            "name": self.playerName,
            "level": self.level,
            "position": self.position
        })

    def onLeaveWorld(self):
        """离开世界"""
        BigWorld.logInfo("Avatar", f"Player {self.id} left world")

        # 停止定时器
        if hasattr(self, 'regenTimer'):
            BigWorld.cancelTimer(self.regenTimer)

        # 保存数据
        self.save()

    def onMove(self, destination, speed):
        """移动请求"""
        if self.health <= 0:
            return

        # 计算移动距离
        distance = self.position.distTo(destination)

        # 速度校验
        maxDistance = speed * 0.1  # 假设0.1秒一次
        if distance > maxDistance * 1.5:
            BigWorld.logWarning("Avatar", f"Speed hack detected: {distance}")
            self.client.onMoveRejected("invalid speed")
            return

        # 设置目标位置
        self.targetPosition = destination
        self.isMoving = True

        # 通知客户端开始移动
        self.client.onMoveStarted(destination.x, destination.y, destination.z)

        # 广播移动给其他玩家
        self.broadcastToNearby("onPlayerMoving", {
            "id": self.id,
            "x": destination.x,
            "y": destination.y,
            "z": destination.z
        })

    def onMoveComplete(self):
        """移动完成"""
        self.isMoving = False
        self.targetPosition = None

        # 通知客户端
        self.client.onMoveCompleted()

    def onAttack(self, targetId, skillId=0):
        """攻击请求"""
        if self.health <= 0:
            return

        # 查找目标
        target = BigWorld.entities.get(targetId)
        if not target:
            return

        # 检查距离
        distance = self.position.distTo(target.position)
        attackRange = 3.0

        if distance > attackRange:
            self.client.onAttackRejected("target too far")
            return

        # 检查技能冷却
        if skillId in self.skillCooldowns:
            if BigWorld.time() < self.skillCooldowns[skillId]:
                self.client.onAttackRejected("skill on cooldown")
                return

        # 计算伤害
        damage = self.calculateDamage(target, skillId)

        # 扣除蓝量
        if skillId > 0 and skillId in self.skills:
            skill = self.skills[skillId]
            self.mana -= skill.get("mpCost", 0)

        # 扣除目标血量
        target.health -= damage

        # 设置技能冷却
        if skillId > 0 and skillId in self.skills:
            cooldown = self.skills[skillId].get("cooldown", 1.0)
            self.skillCooldowns[skillId] = BigWorld.time() + cooldown

        # 广播攻击动画
        self.broadcastToNearby("onPlayerAttacked", {
            "attackerId": self.id,
            "targetId": targetId,
            "skillId": skillId,
            "damage": damage
        })

        # 检查目标死亡
        if target.health <= 0:
            target.onDie(self.id)

        BigWorld.logInfo("Avatar", f"Player {self.id} attacked {targetId}, damage: {damage}")

    def calculateDamage(self, target, skillId):
        """计算伤害"""
        baseDamage = 10 + self.level * 2

        # 技能加成
        if skillId > 0 and skillId in self.skills:
            multiplier = self.skills[skillId].get("damageMultiplier", 1.0)
            baseDamage = int(baseDamage * multiplier)

        # 防御减免
        defense = getattr(target, 'defense', 0)
        reduction = defense / (defense + 100)
        finalDamage = int(baseDamage * (1 - reduction))

        # 随机浮动
        import random
        finalDamage = int(finalDamage * (0.9 + 0.2 * random.random()))

        return max(1, finalDamage)

    def onDie(self, killerId=None):
        """死亡"""
        BigWorld.logInfo("Avatar", f"Player {self.id} died")

        self.health = 0

        # 通知客户端
        self.client.onDied()

        # 广播死亡
        self.broadcastToNearby("onPlayerDied", {
            "id": self.id,
            "killerId": killerId
        })

        # 5秒后复活
        self.respawnTimer = BigWorld.addTimer(self.onRespawnTimer, 5.0, 0)

    def onRespawnTimer(self, timerHandle):
        """复活定时器"""
        self.respawn()

    def respawn(self):
        """复活"""
        self.health = self.maxHealth
        self.mana = self.maxMana

        # 传送到出生点
        spawnPoint = Math.Vector3(0, 0, 0)
        self.position = spawnPoint

        # 通知客户端
        self.client.onRespawned(spawnPoint.x, spawnPoint.y, spawnPoint.z)

        # 广播复活
        self.broadcastToNearby("onPlayerRespawned", {
            "id": self.id,
            "x": spawnPoint.x,
            "y": spawnPoint.y,
            "z": spawnPoint.z
        })

    def regenTick(self, timerHandle):
        """回血回蓝定时器"""
        if self.health <= 0:
            return

        # 回血
        if self.health < self.maxHealth:
            self.health = min(self.maxHealth, self.health + 5)
            self.client.onHealthChanged(self.health)

        # 回蓝
        if self.mana < self.maxMana:
            self.mana = min(self.maxMana, self.mana + 3)
            self.client.onManaChanged(self.mana)

    def broadcastToNearby(self, methodName, data):
        """广播给附近玩家"""
        # BigWorld 的 AOI 系统会自动处理
        for entity in BigWorld.entities.values():
            if entity.__class__.__name__ == "Avatar" and entity.id != self.id:
                distance = self.position.distTo(entity.position)
                if distance < 100:  # 100米范围
                    if hasattr(entity.client, methodName):
                        getattr(entity.client, methodName)(data)

    def save(self):
        """保存玩家数据"""
        # BigWorld 自动保存到数据库
        self.databaseID
        BigWorld.logInfo("Avatar", f"Player {self.id} data saved")
```

### KBEngine vs BigWorld 对比

| 维度 | KBEngine | BigWorld |
|------|----------|----------|
| **开源状态** | 开源 | 商业闭源 |
| **语言** | Python + C++ | Python + C++ |
| **架构** | Entity + Cell | Entity + Space + Cell |
| **AOI** | 需插件 | 内置 |
| **数据库** | MySQL | 自定义 |
| **社区** | 中文社区活跃 | 官方支持 |
| **成本** | 免费 | 昂贵 |
| **适合** | 中大型 MMO | 超大型 MMO |
| **维护** | 活跃 | 官方维护 |

---

## 框架选型矩阵

| 维度 | HTTP Server | Netty | Skynet | Pitaya | Photon | KBEngine | BigWorld |
|------|------------|-------|--------|--------|--------|----------|----------|
| 语言 | 任意 | Java | C+Lua | Go | C#/Java | C++/Python | C++/Python |
| 并发模型 | 进程/线程 | Reactor | Actor | Actor+Cluster | Actor | Entity/Cell | Entity/Space |
| 集群支持 | ❌ | 需自建 | 需自建 | ✅ 内置 | ✅ 云 | ✅ | ✅ |
| 房间管理 | ❌ | 需自建 | 需自建 | 需自建 | ✅ 内置 | ✅ 内置 | ✅ 内置 |
| AOI 支持 | ❌ | ❌ | 插件 | ❌ | 有限 | ✅ | ✅ |
| 状态同步 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 帧同步 | ❌ | ❌ | ❌ | ❌ | ✅ Quantum | 插件 | 插件 |
| 学习成本 | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 社区活跃度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| 适合项目 | 辅助服务 | 高并发网络 | 中小游戏 | 中型 MMO | 手游/独立 | 大型 MMO | 超大型 MMO |

### 性能对比参考数据

| 指标 | HTTP Server | Netty | Skynet | Pitaya | Photon | KBEngine |
|------|------------|-------|--------|--------|--------|----------|
| **QPS** | 10K-50K | 50K-200K | 20K-100K | 30K-150K | 20K-100K | 10K-50K |
| **内存/连接** | 10-50KB | 5-20KB | 2-10KB | 5-20KB | 10-30KB | 20-50KB |
| **最大连接数** | 1K-10K | 10K-100K | 5K-50K | 10K-100K | 10K-50K | 5K-50K |
| **启动时间** | <1s | 5-30s | <1s | 1-5s | 10-60s | 30-120s |
| **GC 停顿** | 无 | 有 | 无 | 有 | 有 | 有 |

> 注：以上数据为典型配置下的参考值，实际性能受硬件、配置、业务逻辑影响

---

## 按项目阶段选型

### 阶段一：原型验证（1-3 人）

```
推荐：HTTP Server + 简单 WebSocket
原因：最快出活，验证玩法是否可行
预期支撑：100-500 在线
开发周期：1-2 周
```

### 阶段二：小规模上线（3-10 人）

```
推荐：Skynet 或 Pitaya
原因：足够支撑 1000+ 在线，有成熟的 Actor 模型
预期支撑：1K-10K 在线
开发周期：1-3 个月
```

### 阶段三：中型项目（10-30 人）

```
推荐：Pitaya + Redis + 集群
原因：Go 生态、水平扩展、维护成本低
预期支撑：10K-100K 在线
开发周期：3-6 个月
```

### 阶段四：大型 MMO（30+ 人）

```
推荐：自研 或 KBEngine 魔改
原因：需要完全控制 Entity 模型、AOI、状态同步
预期支撑：100K+ 在线
开发周期：6-12 个月
```

### 阶段五：手游快速上线

```
推荐：Photon (PUN/Quantum/Fusion)
原因：客户端 SDK 完善，匹配/房间开箱即用
预期支撑：10K-100K 在线
开发周期：1-3 个月
```

---

## 框架迁移指南

### 从 HTTP Server 迁移到 Skynet

```
迁移步骤：
1. 保留 HTTP 层做登录/支付等辅助服务
2. 新增 Skynet 实例处理实时游戏逻辑
3. HTTP 层与 Skynet 通过内部 RPC 通信
4. 逐步将有状态逻辑迁移到 Skynet 服务
5. 下线 HTTP 层的有状态逻辑
```

**代码示例：HTTP 与 Skynet 通信**

```go
// http_to_skynet.go - HTTP 服务调用 Skynet
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/garyburd/redigo/redis"
)

type GameService struct {
	redisPool *redis.Pool
}

func (gs *GameService) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	json.NewDecoder(r.Body).Decode(&req)

	// 验证逻辑...

	// 调用 Skynet 服务
	token, err := gs.callSkynet("player_service", "login", req.Username)
	if err != nil {
		http.Error(w, "internal error", 500)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (gs *GameService) callSkynet(service, method string, args ...interface{}) (string, error) {
	// 通过 Redis 发布订阅或直接 TCP 通信
	// 这里简化为 Redis 发布订阅
	conn := gs.redisPool.Get()
	defer conn.Close()

	// 构造消息
	msg := map[string]interface{}{
		"service": service,
		"method":  method,
		"args":    args,
	}
	data, _ := json.Marshal(msg)

	// 发布到 Skynet
	conn.Do("PUBLISH", "skynet:rpc", data)

	// 等待响应（实际项目用更复杂的机制）
	time.Sleep(100 * time.Millisecond)
	return "token_abc123", nil
}
```

### 从 Skynet 迁移到 Pitaya

```
迁移步骤：
1. 将 Lua 服务逻辑翻译为 Go 模块
2. 用 Pitaya 的 Actor 模型替代 Skynet 的消息队列
3. 用 Protobuf 替代 Skynet 的二进制协议
4. 利用 Pitaya 的集群支持替代自建集群
5. 逐步切换流量，灰度发布
```

**代码示例：Skynet 服务转 Pitaya**

```go
// 原 Skynet 服务（Lua）：
// function handle_move(fd, x, y)
//     player.x = x
//     player.y = y
//     broadcast("player_moved", {id=player.id, x=x, y=y})
// end

// 转换为 Pitaya（Go）：
func (p *Player) Move(ctx context.Context, msg *MoveRequest) (*MoveResponse, error) {
	p.X = msg.X
	p.Y = msg.Y

	// 广播给同场景玩家
	p.GetServer().BroadcastToScene(p.Scene, "PlayerMoved", map[string]interface{}{
		"id": p.ID,
		"x":  p.X,
		"y":  p.Y,
	})

	return &MoveResponse{Success: true}, nil
}
```

### 从 Photon 迁移到自研

```
迁移步骤：
1. 分析 Photon 的游戏逻辑层
2. 提取核心游戏逻辑，去除 Photon 依赖
3. 实现自己的网络层（可以用 Netty/Pitaya）
4. 实现房间管理和匹配系统
5. 逐步替换 Photon SDK
```

---

## 自研 vs 使用框架

| 维度 | 自研框架 | 使用开源框架 | 使用商业框架 |
|------|---------|------------|------------|
| 开发周期 | 长 | 中 | 短 |
| 技术掌控 | 完全掌控 | 部分掌控 | 黑箱 |
| 维护成本 | 高（需专人） | 中 | 低 |
| 定制性 | 完全 | 高 | 有限 |
| 风险 | 技术债务 | 社区活跃度 | 厂商依赖 |
| 适合阶段 | 大厂/长期项目 | 中型项目 | 快速上线 |

### 自研框架的技术栈选择

```
推荐方案：
├── 网络层：Netty (Java) 或 Pitaya (Go)
├── 缓存层：Redis Cluster
├── 数据库：MySQL + 分库分表
├── 消息队列：Kafka 或 NATS
├── 服务发现：etcd 或 Consul
├── 监控：Prometheus + Grafana
└── 日志：ELK Stack
```

---

## 小结

| 关键问题 | 答案 |
|---------|------|
| 最简单的起步方式？ | HTTP Server + WebSocket，半小时出原型 |
| 做 MMO 选什么？ | Go (Pitaya) 或 C++/Python (KBEngine) |
| 手游最快上线？ | Photon Cloud，客户端 SDK 买现成的 |
| 为什么 Go 游戏服务器越来越多？ | goroutine 并发简单、CSP 模型天然适合多服务解耦、部署轻量 |
| Skynet 适合什么？ | 中小型项目、Lua 开发者团队、追求极致内存效率 |
| 需要帧同步？ | Photon Quantum 或自研 |
| 需要状态同步？ | Photon Fusion 或自研 (Entity + Interest Management) |
| 团队小怎么办？ | 从 HTTP Server 开始，逐步演进 |
| 预算有限？ | KBEngine 或 Pitaya，免费且功能完整 |
| 追求极致性能？ | Skynet 或自研 C++ 框架 |

### 框架选型决策树

```
你的游戏是什么类型？
├── 卡牌/回合制 → HTTP Server 足够
├── SLG（策略） → HTTP Server + 定时任务
├── 射击/动作（小规模） → Photon Fusion
├── MOBA/RTS（帧同步） → Photon Quantum 或自研
├── MMO（中型） → Pitaya + 集群
├── MMO（大型） → KBEngine 或自研
└── 不确定 → HTTP Server 先验证玩法
```
