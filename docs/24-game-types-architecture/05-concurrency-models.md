# 05 并发模型：7种常见并发思路与适用场景

游戏服务器的并发模型决定了系统能承受多少连接、如何处理定时逻辑、以及开发复杂度。本章梳理 7 种主流并发模型，用代码示例说明每种模型的核心思路，并给出游戏场景下的适用性对比。

---

## 1. 单线程事件循环（Single-Thread Event Loop）

**核心思路**：一个线程跑一个无限循环，每次循环处理一批就绪的 I/O 事件和定时器，处理期间不阻塞。

**典型代表**：Node.js、Redis、Nginx worker

```
┌─────────────────────────────┐
│         Event Loop           │
│  ┌─────┐  ┌──────┐  ┌────┐ │
│  │ poll │→│ handle│→│ next│ │──→ 循环
│  └─────┘  └──────┘  └────┘ │
└─────────────────────────────┘
```

### Go 代码示例：用 goroutine 模拟单线程事件循环

```go
package main

import (
	"fmt"
	"time"
)

// 单线程事件循环模拟器
type EventLoop struct {
	timers    []timerTask
	tasks     chan func()
	running   bool
}

type timerTask struct {
	fn       func()
	interval time.Duration
	next     time.Time
}

func NewEventLoop() *EventLoop {
	return &EventLoop{
		tasks: make(chan func(), 256),
	}
}

func (el *EventLoop) AddTimer(d time.Duration, fn func()) {
	el.timers = append(el.timers, timerTask{
		fn:       fn,
		interval: d,
		next:     time.Now().Add(d),
	})
}

func (el *EventLoop) Post(fn func()) {
	el.tasks <- fn
}

func (el *EventLoop) Run() {
	el.running = true
	for el.running {
		now := time.Now()

		// 处理就绪的定时器
		for i := range el.timers {
			if now.After(el.timers[i].next) {
				el.timers[i].fn()
				el.timers[i].next = now.Add(el.timers[i].interval)
			}
		}

		// 处理就绪的 task（非阻塞）
		select {
		case task := <-el.tasks:
			task()
		default:
			time.Sleep(time.Millisecond) // 没有任务时短暂休眠
		}
	}
}

func main() {
	el := NewEventLoop()

	el.AddTimer(100*time.Millisecond, func() {
		fmt.Println("tick every 100ms")
	})

	el.Post(func() {
		fmt.Println("posted task executed")
	})

	go el.Run()

	time.Sleep(500 * time.Millisecond)
}
```

**优点**：无锁、无竞态、代码逻辑清晰
**缺点**：不能利用多核、阻塞操作会卡住整个循环
**游戏适用场景**：小游戏服务器、网关层、轻量逻辑服务

---

## 2. 线程池（Thread Pool）

**核心思路**：预先创建一组工作线程，任务从共享队列中取出执行。I/O 密集时配合非阻塞 I/O。

**典型代表**：Java ExecutorService、C++ 自定义实现

### Go 代码示例：简单线程池

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type ThreadPool struct {
	workers int
	jobs    chan func()
	wg      sync.WaitGroup
}

func NewThreadPool(workers int) *ThreadPool {
	tp := &ThreadPool{
		workers: workers,
		jobs:    make(chan func(), 100),
	}
	for i := 0; i < workers; i++ {
		go tp.worker(i)
	}
	return tp
}

func (tp *ThreadPool) worker(id int) {
	for job := range tp.jobs {
		job()
		tp.wg.Done()
	}
}

func (tp *ThreadPool) Submit(fn func()) {
	tp.wg.Add(1)
	tp.jobs <- fn
}

func (tp *ThreadPool) Wait() {
	tp.wg.Wait()
}

func main() {
	pool := NewThreadPool(4)

	for i := 0; i < 20; i++ {
		n := i
		pool.Submit(func() {
			fmt.Printf("worker process task %d\n", n)
			time.Sleep(50 * time.Millisecond)
		})
	}

	pool.Wait()
	fmt.Println("all tasks done")
}
```

**优点**：能利用多核、适合批量计算任务
**缺点**：任务间共享数据需加锁、上下文切换开销
**游戏适用场景**：战斗数值计算、AI 寻路、地图 AOI 计算

---

## 3. Reactor 模型

**核心思路**：Reactor 监听 I/O 事件，分发给对应的 Handler 处理。Handler 在同一个线程中同步执行。

**典型代表**：Netty (Java)、libevent、libuv、Boost.Asio

```
┌──────────────────────────────────┐
│           Reactor                 │
│  ┌──────────┐    ┌────────────┐  │
│  │ demultiplex │→│ dispatch   │  │
│  │ (epoll)    │  │            │  │
│  └──────────┘    └────┬───────┘  │
│                       ↓          │
│  ┌────────┐ ┌────────┐ ┌────────┐│
│  │Handler1│ │Handler2│ │Handler3││
│  └────────┘ └────────┘ └────────┘│
└──────────────────────────────────┘
```

### Go 代码示例：Reactor 模式

```go
package main

import (
	"fmt"
	"net"
	"sync"
)

// Reactor 模型核心
type Reactor struct {
	handlers map[string]func(net.Conn)
	mu       sync.RWMutex
}

func NewReactor() *Reactor {
	return &Reactor{
		handlers: make(map[string]func(net.Conn)),
	}
}

// 注册事件处理器
func (r *Reactor) Register(event string, handler func(net.Conn)) {
	r.mu.Lock()
	r.handlers[event] = handler
	r.mu.Unlock()
}

// 事件分发（简化版：模拟 epoll 返回事件后分发）
func (r *Reactor) Dispatch(event string, conn net.Conn) {
	r.mu.RLock()
	handler, ok := r.handlers[event]
	r.mu.RUnlock()

	if ok {
		handler(conn) // Reactor 线程中同步执行
	}
}

func main() {
	reactor := NewReactor()

	// 注册 "on_connect" 事件处理器
	reactor.Register("on_connect", func(conn net.Conn) {
		fmt.Println("new connection from", conn.RemoteAddr())
	})

	// 注册 "on_message" 事件处理器
	reactor.Register("on_message", func(conn net.Conn) {
		buf := make([]byte, 1024)
		n, _ := conn.Read(buf)
		fmt.Printf("received: %s\n", buf[:n])
	})

	// 模拟事件分发
	ln, _ := net.Listen("tcp", ":9090")
	fmt.Println("listening on :9090")

	for {
		conn, err := ln.Accept()
		if err != nil {
			continue
		}
		go reactor.Dispatch("on_connect", conn)
		go reactor.Dispatch("on_message", conn)
	}
}
```

**优点**：单线程处理网络 I/O，避免线程切换、无锁
**缺点**：Handler 执行慢会阻塞后续事件
**游戏适用场景**：网关/代理层、高连接数低延迟服务

---

## 4. Proactor 模型

**核心思路**：发起异步 I/O 操作后，由操作系统在完成后通知应用（完成回调）。与 Reactor 的区别：Reactor 通知"就绪可读"，Proactor 通知"读完了"。

**典型代表**：Windows IOCP、Linux io_uring、Boost.Asio (Proactor 模式)

### Go 代码示例：Proactor 模式（用 io_uring 思路模拟）

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// 模拟 Proactor 的异步完成通知
type AsyncOperation struct {
	ID       int
	Data     []byte
	Done     chan struct{}
}

type Proactor struct {
	completions chan *AsyncOperation
	workerCount int
	wg          sync.WaitGroup
}

func NewProactor(workers int) *Proactor {
	p := &Proactor{
		completions: make(chan *AsyncOperation, 64),
		workerCount: workers,
	}
	// 启动完成回调工作线程
	for i := 0; i < workers; i++ {
		go p.worker(i)
	}
	return p
}

func (p *Proactor) worker(id int) {
	for op := range p.completions {
		// 模拟：I/O 完成后的回调处理
		fmt.Printf("[worker %d] operation %d completed, data: %s\n",
			id, op.ID, string(op.Data))
		close(op.Done)
	}
}

// 提交异步读操作（模拟 OS 异步 I/O）
func (p *Proactor) AsyncRead(op *AsyncOperation) {
	p.wg.Add(1)
	go func() {
		// 模拟异步 I/O：一段时间后完成
		time.Sleep(50 * time.Millisecond)
		op.Data = []byte("async data")
		p.completions <- op // 通知完成
	}()
}

func main() {
	proactor := NewProactor(4)

	// 提交 5 个异步操作
	for i := 0; i < 5; i++ {
		op := &AsyncOperation{ID: i, Done: make(chan struct{})}
		proactor.AsyncRead(op)

		go func(op *AsyncOperation) {
			<-op.Done
			fmt.Printf("operation %d fully processed\n", op.ID)
		}(op)
	}

	time.Sleep(300 * time.Millisecond)
	fmt.Println("all async operations completed")
}
```

**优点**：真正异步 I/O、吞吐量高
**缺点**：依赖 OS 支持、回调地狱、调试复杂
**游戏适用场景**：需要极致 I/O 吞吐的后端、跨服通信、大规模日志写入

---

## 5. Actor 模型

**核心思路**：每个 Actor 是独立计算单元，拥有自己的状态和邮箱。Actor 之间只通过消息通信，不共享状态。天然隔离，无锁。

**典型代表**：Erlang/OTP、Akka (Java/Scala)、Microsoft Orleans

### Go 代码示例：简单 Actor 框架

```go
package main

import (
	"fmt"
	"sync"
)

// Actor 接口
type Actor interface {
	Handle(msg Message)
}

// 消息
type Message struct {
	Type string
	Data interface{}
}

// Actor 系统
type ActorSystem struct {
	actors map[string]chan Message
	wg     sync.WaitGroup
}

func NewActorSystem() *ActorSystem {
	return &ActorSystem{
		actors: make(map[string]chan Message),
	}
}

// 创建 Actor
func (sys *ActorSystem) CreateActor(name string, handler func(Message)) {
	ch := make(chan Message, 64)
	sys.actors[name] = ch

	sys.wg.Add(1)
	go func() {
		defer sys.wg.Done()
		for msg := range ch {
			handler(msg) // 串行处理，无竞态
		}
	}()
}

// 发送消息
func (sys *ActorSystem) Send(name string, msg Message) {
	if ch, ok := sys.actors[name]; ok {
		ch <- msg
	}
}

// 游戏示例：玩家 Actor
func PlayerActor() func(Message) {
	hp := 100
	return func(msg Message) {
		switch msg.Type {
		case "damage":
			damage := msg.Data.(int)
			hp -= damage
			if hp < 0 {
				hp = 0
			}
			fmt.Printf("玩家受到 %d 伤害, 剩余 HP: %d\n", damage, hp)
		case "heal":
			heal := msg.Data.(int)
			hp += heal
			if hp > 100 {
				hp = 100
			}
			fmt.Printf("玩家恢复 %d HP, 当前 HP: %d\n", heal, hp)
		case "query_hp":
			fmt.Printf("玩家 HP: %d\n", hp)
		}
	}
}

func main() {
	sys := NewActorSystem()

	// 创建玩家 Actor
	sys.CreateActor("player1", PlayerActor())
	sys.CreateActor("player2", PlayerActor())

	// 发送消息 —— 所有操作都是消息传递，无共享状态
	sys.Send("player1", Message{Type: "damage", Data: 30})
	sys.Send("player1", Message{Type: "heal", Data: 10})
	sys.Send("player2", Message{Type: "damage", Data: 50})
	sys.Send("player1", Message{Type: "query_hp", Data: nil})
	sys.Send("player2", Message{Type: "query_hp", Data: nil})

	// 等待所有消息处理完毕
	// （简化：实际需要 close channel 或超时机制）
	time.Sleep(100 * time.Millisecond)
}
```

**优点**：天然隔离无竞态、分布式友好、故障隔离
**缺点**：消息序列化开销、调试困难、延迟较高
**游戏适用场景**：MMO 实体管理、分布式游戏服务器（Erlang 风格）、聊天系统

> ⚠️ 上面的代码需要 `import "time"`，完整可运行版本见项目源码。

---

## 6. 协程/纤程（Coroutine）

**核心思路**：用户态的轻量级线程，可被调度器在多个协程间切换。切换在用户态完成，无需内核介入，开销极低。

**典型代表**：Go goroutine、Kotlin 协程、Lua 协程、C++20 Coroutines、Erlang 进程

### Go 代码示例：goroutine 协程调度

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// 模拟游戏中的协程场景：每个玩家是一个 goroutine
func playerSession(id int, wg *sync.WaitGroup) {
	defer wg.Done()

	fmt.Printf("[player %d] 登录\n", id)

	// 模拟：玩家每秒执行一次心跳
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	count := 0
	for range ticker.C {
		count++
		fmt.Printf("[player %d] 心跳 #%d\n", id, count)
		if count >= 3 {
			fmt.Printf("[player %d] 离线\n", id)
			return
		}
	}
}

// 协程间通信：用 channel 实现消息传递
func messageBus(msgCh chan string) {
	for msg := range msgCh {
		fmt.Printf("[bus] 广播: %s\n", msg)
	}
}

func main() {
	var wg sync.WaitGroup
	msgCh := make(chan string, 10)

	// 启动消息总线
	go messageBus(msgCh)

	// 启动 3 个玩家协程
	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go playerSession(i, &wg)
	}

	// 模拟世界事件广播
	go func() {
		for i := 0; i < 3; i++ {
			time.Sleep(1500 * time.Millisecond)
			msgCh <- fmt.Sprintf("世界事件 #%d", i+1)
		}
		close(msgCh)
	}()

	wg.Wait()
	fmt.Println("所有玩家会话结束")
}
```

**优点**：极低创建/切换开销、编程模型简单（同步写法异步执行）
**缺点**：GC 压力（大量协程时）、共享数据仍需同步原语
**游戏适用场景**：**几乎所有 Go 游戏服务器都用 goroutine**，每个连接一个协程、每个定时器一个协程

---

## 7. CSP（Communicating Sequential Processes）

**核心思路**：进程之间不共享内存，只通过 Channel（带缓冲或无缓冲）通信。"Do not communicate by sharing memory; instead, share memory by communicating."

**典型代表**：Go channel、Occam、Ada

### Go 代码示例：纯 CSP 风格游戏服务器

```go
package main

import (
	"fmt"
	"time"
)

// 每个游戏系统是一个独立进程，通过 channel 通信

// 玩家位置更新
type PositionUpdate struct {
	PlayerID int
	X, Y     float64
}

// 战斗伤害
type DamageEvent struct {
	AttackerID int
	TargetID   int
	Damage     int
}

// 位置进程：维护所有玩家位置
func positionService(
	updates <-chan PositionUpdate,
	queries chan<- string,
) {
	positions := make(map[int][2]float64)

	for {
		select {
		case u := <-updates:
			positions[u.PlayerID] = [2]float64{u.X, u.Y}
			fmt.Printf("[position] 玩家 %d 移动到 (%.0f, %.0f)\n",
				u.PlayerID, u.X, u.Y)
		case q := <-queries:
			// 响应查询
			_ = q
		case <-time.After(5 * time.Second):
			fmt.Println("[position] 超时退出")
			return
		}
	}
}

// 战斗进程：处理伤害事件
func combatService(damages <-chan DamageEvent) {
	hp := map[int]int{1: 100, 2: 100, 3: 100}

	for dmg := range damages {
		hp[dmg.TargetID] -= dmg.Damage
		if hp[dmg.TargetID] < 0 {
			hp[dmg.TargetID] = 0
		}
		fmt.Printf("[combat] 玩家 %d 攻击玩家 %d, 造成 %d 伤害, 目标剩余 HP: %d\n",
			dmg.AttackerID, dmg.TargetID, dmg.Damage, hp[dmg.TargetID])

		if hp[dmg.TargetID] == 0 {
			fmt.Printf("[combat] 玩家 %d 被击败！\n", dmg.TargetID)
		}
	}
}

func main() {
	posUpdates := make(chan PositionUpdate, 10)
	combatEvents := make(chan DamageEvent, 10)
	queries := make(chan string, 1)

	// 启动系统进程
	go positionService(posUpdates, queries)
	go combatService(combatEvents)

	// 模拟游戏事件
	posUpdates <- PositionUpdate{PlayerID: 1, X: 10, Y: 20}
	combatEvents <- DamageEvent{AttackerID: 1, TargetID: 2, Damage: 30}
	posUpdates <- PositionUpdate{PlayerID: 2, X: 15, Y: 25}
	combatEvents <- DamageEvent{AttackerID: 3, TargetID: 1, Damage: 50}
	combatEvents <- DamageEvent{AttackerID: 1, TargetID: 2, Damage: 80}

	time.Sleep(2 * time.Second)
	fmt.Println("game simulation done")
}
```

**优点**：无锁、无竞态、易于推理和组合、天然支持分布式
**缺点**：channel 通信有序列化开销、调试多进程交互复杂
**游戏适用场景**：Go 游戏服务器架构首选，多系统解耦（位置服务、战斗服务、聊天服务各自独立进程）

---

## 7 种并发模型对比

| 模型 | 并发单元 | 共享状态 | 通信方式 | 延迟 | 吞吐 | 开发难度 | 游戏适用 |
|------|---------|---------|---------|------|------|---------|---------|
| 单线程事件循环 | 线程 | 无竞态 | 回调 | 极低 | 中 | ⭐⭐ | 小游戏/网关 |
| 线程池 | 线程 | 需加锁 | 共享队列 | 中 | 高 | ⭐⭐⭐ | 战斗/AI 计算 |
| Reactor | 线程 | 无竞态 | 回调 | 低 | 高 | ⭐⭐⭐ | 网络代理层 |
| Proactor | 线程 | 无竞态 | 完成回调 | 极低 | 极高 | ⭐⭐⭐⭐ | I/O 密集后端 |
| Actor | Actor | 无共享 | 消息邮箱 | 中 | 高 | ⭐⭐ | MMO/分布式 |
| 协程 | goroutine | 需同步 | channel | 极低 | 极高 | ⭐ | **Go 首选** |
| CSP | 进程 | 无共享 | channel | 低 | 高 | ⭐⭐ | 多系统解耦 |

---

## 实际选型建议

```
┌─────────────────────────────────────────────────────┐
│                   选型决策树                         │
├─────────────────────────────────────────────────────┤
│  语言是 Go？                                       │
│    └─ YES → goroutine + CSP（Go 天然支持）           │
│  语言是 Java？                                     │
│    ├─ 高并发网络 → Reactor (Netty)                  │
│    └─ 分布式实体 → Actor (Akka/Orleans)             │
│  语言是 C++？                                      │
│    └─ Reactor/Proactor (Boost.Asio / io_uring)     │
│  语言是 Lua？                                      │
│    └─ 线程池 + Lua 协程（Skynet 模式）              │
│  小型项目 / 快速原型？                              │
│    └─ 单线程事件循环 (Node.js)                      │
└─────────────────────────────────────────────────────┘
```

---

## 小结

| 关键问题 | 答案 |
|---------|------|
| 为什么需要并发？ | 游戏服务器要同时处理数百到数万玩家连接和逻辑更新 |
| Go 为什么适合游戏服务器？ | goroutine 极轻量（~2KB），channel 天然支持 CSP，一个连接一个 goroutine 成本极低 |
| Actor 和 CSP 有什么区别？ | Actor 发消息给特定 Actor，CSP 通过 Channel 通信（发送者不知道谁接收） |
| Reactor 和 Proactor 区别？ | Reactor 通知"可读可写"，Proactor 通知"操作已完成"，Proactor 更高效但更复杂 |
| Skynet 用什么模型？ | 单线程 Actor（Lua 协程服务）+ 线程池 |
