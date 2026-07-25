# 游戏编程模式

设计模式是解决反复出现问题的成熟方案。游戏开发有其独特的编程模式，本章基于 Robert Nystrom《游戏编程模式》的框架，梳理游戏服务端开发中最常用的 20 个设计模式。

## 1. 概述

### 1.1 为什么需要设计模式

```
没有设计模式：
if (state == "idle") {
    // ...
} else if (state == "walking") {
    // ...
} else if (state == "attacking") {
    // ...
}
// 每加一个状态，所有 switch 都要改

使用状态模式：
currentState.Update()
// 加新状态只需创建新类，不改已有代码
```

### 1.2 模式分类

| 分类 | 模式 | 适用场景 |
|------|------|---------|
| 设计模式 | 命令、享元、观察者、原型、单例、状态 | 通用架构 |
| 序列型 | 双缓冲、游戏循环、更新方法 | 时序处理 |
| 行为型 | 字节码、子类沙盒、类型对象 | 游戏逻辑 |
| 解耦型 | 组件、事件队列、服务定位器 | 系统解耦 |
| 优化型 | 数据局部性、脏标记、对象池、空间分区 | 性能优化 |

---

## 2. 游戏循环（Game Loop）

游戏循环是游戏运行的心脏，每一帧都在执行：**处理输入 → 更新状态 → 渲染输出**。

### 2.1 固定时间步长

```go
type GameLoop struct {
    tickRate    int
    tickDuration time.Duration
    accumulator time.Duration
    lastTime    time.Time
}

func (g *GameLoop) Run() {
    g.lastTime = time.Now()
    
    for {
        now := time.Now()
        frameTime := now.Sub(g.lastTime)
        g.lastTime = now
        
        g.processInput()
        
        g.accumulator += frameTime
        for g.accumulator >= g.tickDuration {
            g.update(g.tickDuration)
            g.accumulator -= g.tickDuration
        }
        
        alpha := g.accumulator.Seconds() / g.tickDuration.Seconds()
        g.render(alpha)
    }
}
```

### 2.2 服务端游戏循环

```go
type ServerGameLoop struct {
    tickRate   time.Duration
    systems    []System
    inputQueue chan PlayerInput
}

func (s *ServerGameLoop) Run() {
    ticker := time.NewTicker(s.tickRate)
    for {
        select {
        case input := <-s.inputQueue:
            s.processInput(input)
        case <-ticker.C:
            s.update()
            s.syncToClients()
            s.persistData()
        }
    }
}
```

---

## 3. 状态模式（State Pattern）

用对象表示状态，每个状态封装自己的行为。

### 3.1 玩家状态机

```go
type PlayerState interface {
    Enter(player *Player)
    Update(player *Player, dt float64)
    Exit(player *Player)
}

type IdleState struct{}
func (s *IdleState) Enter(p *Player)    { p.Velocity = Vector2{} }
func (s *IdleState) Update(p *Player, dt float64) {
    if p.MoveInput != (Vector2{}) {
        p.SetState(&WalkingState{})
    }
}
func (s *IdleState) Exit(p *Player)     {}

type WalkingState struct{}
func (s *WalkingState) Enter(p *Player) { p.Speed = 5.0 }
func (s *WalkingState) Update(p *Player, dt float64) {
    p.Position = p.Position.Add(p.Velocity.Mul(dt))
    if p.MoveInput == (Vector2{}) {
        p.SetState(&IdleState{})
    }
    if p.AttackInput {
        p.SetState(&AttackingState{})
    }
}
func (s *WalkingState) Exit(p *Player)  {}

type AttackingState struct {
    timer float64
}
func (s *AttackingState) Enter(p *Player) { s.timer = 0 }
func (s *AttackingState) Update(p *Player, dt float64) {
    s.timer += dt
    if s.timer >= 0.5 {
        p.SetState(&IdleState{})
    }
}
func (s *AttackingState) Exit(p *Player)  {}

type Player struct {
    currentState PlayerState
    Position     Vector2
    Velocity     Vector2
}

func (p *Player) SetState(state PlayerState) {
    if p.currentState != nil {
        p.currentState.Exit(p)
    }
    p.currentState = state
    p.currentState.Enter(p)
}

func (p *Player) Update(dt float64) {
    p.currentState.Update(p, dt)
}
```

---

## 4. 观察者模式（Observer Pattern）

当对象状态变化时，自动通知所有依赖者。

### 4.1 事件系统

```go
type Event struct {
    Type    string
    Payload interface{}
}

type EventHandler func(Event)

type EventBus struct {
    handlers map[string][]EventHandler
    mu       sync.RWMutex
}

func (e *EventBus) On(eventType string, handler EventHandler) {
    e.mu.Lock()
    defer e.mu.Unlock()
    e.handlers[eventType] = append(e.handlers[eventType], handler)
}

func (e *EventBus) Emit(eventType string, payload interface{}) {
    e.mu.RLock()
    defer e.mu.RUnlock()
    for _, handler := range e.handlers[eventType] {
        handler(Event{Type: eventType, Payload: payload})
    }
}

// 使用示例
bus := &EventBus{handlers: make(map[string][]EventHandler)}

bus.On("player.levelup", func(ev Event) {
    player := ev.Payload.(*Player)
    fmt.Printf("玩家 %s 升级到 %d 级\n", player.Name, player.Level)
})

bus.Emit("player.levelup", player)
```

---

## 5. 命令模式（Command Pattern）

将操作封装为对象，支持撤销、重放、队列化。

### 5.1 战斗命令

```go
type Command interface {
    Execute(entity *Entity)
    Undo(entity *Entity)
}

type MoveCommand struct {
    From, To Vector2
}

func (c *MoveCommand) Execute(entity *Entity) {
    entity.Position = c.To
}

func (c *MoveCommand) Undo(entity *Entity) {
    entity.Position = c.From
}

type AttackCommand struct {
    TargetID uint64
    Damage   int
    OriginalHP int
}

func (c *AttackCommand) Execute(entity *Entity) {
    target := GetEntity(c.TargetID)
    c.OriginalHP = target.HP
    target.HP -= c.Damage
}

func (c *AttackCommand) Undo(entity *Entity) {
    target := GetEntity(c.TargetID)
    target.HP = c.OriginalHP
}

// 命令历史（支持回放）
type CommandHistory struct {
    history []Command
    index   int
}
```

---

## 6. 享元模式（Flyweight Pattern）

共享大量细粒度对象的公共部分，节省内存。

### 6.1 帧同步中的享元

```go
// 共享的原型定义（不可变）
type MonsterPrototype struct {
    ID        int
    Name      string
    BaseHP    int
    BaseATK   int
    BaseDEF   int
    SpriteID  string
}

// 每个实例的状态（可变）
type MonsterInstance struct {
    Prototype *MonsterPrototype  // 共享引用
    HP        int
    Position  Vector2
    State     string
}

// 原型池（全局共享）
var monsterPrototypes = map[int]*MonsterPrototype{
    1001: {ID: 1001, Name: "哥布林", BaseHP: 100, BaseATK: 10, BaseDEF: 5},
    1002: {ID: 1002, Name: "史莱姆", BaseHP: 50, BaseATK: 5, BaseDEF: 2},
}
```

---

## 7. 对象池（Object Pool）

预先创建并复用对象，避免频繁分配和回收。

### 7.1 网络包对象池

```go
type PacketPool struct {
    pool chan *Packet
    size int
}

func NewPacketPool(size int) *PacketPool {
    p := &PacketPool{
        pool: make(chan *Packet, size),
        size: size,
    }
    for i := 0; i < size; i++ {
        p.pool <- &Packet{Data: make([]byte, 1024)}
    }
    return p
}

func (p *PacketPool) Get() *Packet {
    select {
    case pkt := <-p.pool:
        return pkt
    default:
        return &Packet{Data: make([]byte, 1024)}
    }
}

func (p *PacketPool) Put(pkt *Packet) {
    pkt.Reset()
    select {
    case p.pool <- pkt:
    default:
        // 池满，丢弃
    }
}

type Packet struct {
    Data   []byte
    Length int
}

func (p *Packet) Reset() {
    p.Length = 0
    p.Data = p.Data[:0]
}
```

---

## 8. 空间分区（Spatial Partition）

将空间中的对象组织到数据结构中，快速查找附近对象。

### 8.1 九宫格算法

```go
type SpatialGrid struct {
    cellSize float64
    cells    map[int]*Cell
}

type Cell struct {
    entities map[uint64]*Entity
}

func NewSpatialGrid(cellSize float64) *SpatialGrid {
    return &SpatialGrid{
        cellSize: cellSize,
        cells:    make(map[int]*Cell),
    }
}

func (g *SpatialGrid) cellKey(x, y float64) int {
    cx := int(math.Floor(x / g.cellSize))
    cy := int(math.Floor(y / g.cellSize))
    return cx*10000 + cy
}

func (g *SpatialGrid) Insert(entity *Entity) {
    key := g.cellKey(entity.Position.X, entity.Position.Y)
    if g.cells[key] == nil {
        g.cells[key] = &Cell{entities: make(map[uint64]*Entity)}
    }
    g.cells[key].entities[entity.ID] = entity
}

func (g *SpatialGrid) Query(x, y, radius float64) []*Entity {
    var result []*Entity
    minCx := int(math.Floor((x - radius) / g.cellSize))
    maxCx := int(math.Floor((x + radius) / g.cellSize))
    minCy := int(math.Floor((y - radius) / g.cellSize))
    maxCy := int(math.Floor((y + radius) / g.cellSize))
    
    for cx := minCx; cx <= maxCx; cx++ {
        for cy := minCy; cy <= maxCy; cy++ {
            key := cx*10000 + cy
            if cell, ok := g.cells[key]; ok {
                for _, e := range cell.entities {
                    dx := e.Position.X - x
                    dy := e.Position.Y - y
                    if dx*dx+dy*dy <= radius*radius {
                        result = append(result, e)
                    }
                }
            }
        }
    }
    return result
}
```

---

## 9. 双缓冲（Double Buffer）

用于读写分离，避免读取到中间状态。

### 9.1 状态快照

```go
type DoubleBuffer struct {
    readBuf  *GameState
    writeBuf *GameState
    mu       sync.RWMutex
}

func NewDoubleBuffer() *DoubleBuffer {
    return &DoubleBuffer{
        readBuf:  NewGameState(),
        writeBuf: NewGameState(),
    }
}

func (db *DoubleBuffer) GetReadState() *GameState {
    db.mu.RLock()
    defer db.mu.RUnlock()
    return db.readBuf
}

func (db *DoubleBuffer) GetWriteState() *GameState {
    db.mu.Lock()
    defer db.mu.Unlock()
    return db.writeBuf
}

func (db *DoubleBuffer) Swap() {
    db.mu.Lock()
    defer db.mu.Unlock()
    db.readBuf, db.writeBuf = db.writeBuf, db.readBuf
}
```

---

## 10. 脏标记模式（Dirty Flag）

只在数据真正变化时才执行更新。

### 10.1 脏标记同步

```go
type SyncEntity struct {
    ID       uint64
    Position Vector3
    dirty    bool
}

func (e *SyncEntity) SetPosition(pos Vector3) {
    e.Position = pos
    e.dirty = true
}

func (e *SyncEntity) IsDirty() bool {
    return e.dirty
}

func (e *SyncEntity) ClearDirty() {
    e.dirty = false
}

// 每帧只同步脏数据
func SyncDirtyEntities(entities []*SyncEntity) {
    for _, e := range entities {
        if e.IsDirty() {
            broadcast(e)
            e.ClearDirty()
        }
    }
}
```

---

## 11. 组件模式（Component Pattern）

将实体拆分为独立的组件，组合而非继承。

### 11.1 ECS 基础

```go
// 组件：纯数据
type PositionComponent struct {
    X, Y float64
}

type HealthComponent struct {
    Current, Max int
}

type AIComponent struct {
    State    string
    TargetID uint64
}

// 实体：组件容器
type Entity struct {
    ID        uint64
    Components map[string]interface{}
}

func (e *Entity) GetComponent(name string) interface{} {
    return e.Components[name]
}

// 系统：处理逻辑
type HealthSystem struct {
    entities []*Entity
}

func (s *HealthSystem) Update() {
    for _, e := range s.entities {
        if hc, ok := e.GetComponent("health").(*HealthComponent); ok {
            if hc.Current <= 0 {
                e.Die()
            }
        }
    }
}
```

---

## 12. 事件队列（Event Queue）

异步处理事件，解耦生产者和消费者。

### 12.1 消息队列

```go
type EventQueue struct {
    queue chan Event
}

type Event struct {
    Type    string
    Payload interface{}
    Time    time.Time
}

func NewEventQueue(capacity int) *EventQueue {
    return &EventQueue{queue: make(chan Event, capacity)}
}

func (eq *EventQueue) Push(event Event) {
    event.Time = time.Now()
    eq.queue <- event
}

func (eq *EventQueue) Pop() Event {
    return <-eq.queue
}

func (eq *EventQueue) Process(handler func(Event)) {
    for {
        select {
        case event := <-eq.queue:
            handler(event)
        default:
            return
        }
    }
}
```

---

## 13. 数据局部性（Data Locality）

将频繁访问的数据放在一起，提高 CPU 缓存命中率。

### 13.1 数组 vs 切片

```go
// 不好：每个实体单独分配
type BadEntityStorage struct {
    entities map[uint64]*Entity  // 内存分散
}

// 好：连续内存
type GoodEntityStorage struct {
    entities []Entity  // 内存连续，缓存友好
    index    map[uint64]int  // ID → 索引
}
```

---

## 14. 享元模式在协议中的应用

```go
// 共享的物品定义（服务端配置）
type ItemDefinition struct {
    ID   int
    Name string
    Type string
    Icon string
}

// 物品实例（只存差异）
type ItemInstance struct {
    DefinitionID int  // 引用共享定义
    Count        int
    Level        int
    Extra        map[string]interface{}
}
```

---

## 15. 原型模式（Prototype Pattern）

通过复制已有对象来创建新对象。

### 15.1 怪物生成

```go
type Monster interface {
    Clone() Monster
    GetStats() Stats
}

type Goblin struct {
    Name  string
    HP    int
    ATK   int
}

func (g *Goblin) Clone() Monster {
    clone := *g
    return &clone
}

func (g *Goblin) GetStats() Stats {
    return Stats{HP: g.HP, ATK: g.ATK}
}

// 怪物工厂
type MonsterFactory struct {
    prototypes map[string]Monster
}

func (f *MonsterFactory) Register(name string, proto Monster) {
    f.prototypes[name] = proto
}

func (f *MonsterFactory) Create(name string) Monster {
    if proto, ok := f.prototypes[name]; ok {
        return proto.Clone()
    }
    return nil
}
```

---

## 16. 单例模式（Singleton Pattern）

全局唯一实例，如管理器、配置中心。

```go
type GameManager struct {
    instance *GameManager
    mu       sync.Once
}

func (g *GameManager) GetInstance() *GameManager {
    g.mu.Do(func() {
        g.instance = &GameManager{}
    })
    return g.instance
}
```

---

## 17. 子类沙盒（Subclass Sandbox）

在基类中定义安全的操作集合，子类只能使用这些操作。

```go
type MonsterBase struct {
    hp, maxHP int
    position  Vector2
}

// 沙盒方法：子类只能通过这些方法操作
func (m *MonsterBase) Heal(amount int) {
    m.hp = min(m.hp+amount, m.maxHP)
}

func (m *MonsterBase) MoveTo(pos Vector2) {
    m.position = pos
}

func (m *MonsterBase) IsAlive() bool {
    return m.hp > 0
}

// 子类实现具体行为
type GoblinAI struct {
    MonsterBase
}

func (g *GoblinAI) Update() {
    // 只能使用沙盒方法
    if !g.IsAlive() {
        return
    }
    g.MoveTo(g.findTarget())
    g.Heal(10)
}
```

---

## 18. 服务定位器（Service Locator）

提供全局服务访问点，便于替换实现。

```go
type ServiceLocator struct {
    services map[string]interface{}
    mu       sync.RWMutex
}

var locator = &ServiceLocator{
    services: make(map[string]interface{}),
}

func Register(name string, service interface{}) {
    locator.mu.Lock()
    defer locator.mu.Unlock()
    locator.services[name] = service
}

func GetService(name string) interface{} {
    locator.mu.RLock()
    defer locator.mu.RUnlock()
    return locator.services[name]
}

// 使用
Register("database", &MySQLDatabase{})
Register("cache", &RedisCache{})

db := GetService("database").(*MySQLDatabase)
cache := GetService("cache").(*RedisCache)
```

---

## 19. 字节码模式（Bytecode Pattern）

用数据而非代码来定义游戏逻辑。

```go
type Instruction int

const (
    OP_MOVE Instruction = iota
    OP_ATTACK
    OP_HEAL
    OP_WAIT
    OP_IF_HP_LOW
)

type BytecodeVM struct {
    code   []Instruction
    pc     int
    stack  []int
}

func (vm *BytecodeVM) Run() {
    for vm.pc < len(vm.code) {
        op := vm.code[vm.pc]
        vm.pc++
        switch op {
        case OP_MOVE:
            vm.executeMove()
        case OP_ATTACK:
            vm.executeAttack()
        case OP_HEAL:
            vm.executeHeal()
        case OP_WAIT:
            vm.executeWait()
        case OP_IF_HP_LOW:
            vm.executeIfHPLow()
        }
    }
}
```

---

## 20. 类型对象模式（Type Object）

用对象来定义类型，支持运行时创建新类型。

```go
type MonsterType struct {
    Name   string
    HP     int
    ATK    int
    DEF    int
    Skills []string
}

type Monster struct {
    Type     *MonsterType  // 共享类型定义
    CurrentHP int
    Level     int
}

// 运行时创建新类型
func NewMonsterType(name string, hp, atk, def int) *MonsterType {
    return &MonsterType{Name: name, HP: hp, ATK: atk, DEF: def}
}

// 用类型创建实例
func SpawnMonster(mt *MonsterType, level int) *Monster {
    return &Monster{
        Type:      mt,
        CurrentHP: mt.HP + level*10,
        Level:     level,
    }
}
```

---

## 模式选择指南

| 场景 | 推荐模式 |
|------|---------|
| 状态切换 | 状态模式 |
| 事件通知 | 观察者模式 |
| 操作队列/撤销 | 命令模式 |
| 大量小对象 | 享元模式 + 对象池 |
| 附近查询 | 空间分区 |
| 脏数据同步 | 脏标记 |
| 实体组合 | 组件模式（ECS） |
| 异步处理 | 事件队列 |
| 全局管理器 | 单例模式 |
| 配置驱动 | 类型对象模式 |
| 性能优化 | 数据局部性 + 对象池 |

---

## 下一步

1. 从状态模式和观察者模式开始实践
2. 用 ECS 架构重构实体系统
3. 用对象池优化网络包管理
4. 用空间分区优化 AOI 计算
