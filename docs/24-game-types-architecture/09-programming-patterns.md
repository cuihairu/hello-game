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

## 21. 服务器工程化实践

游戏服务器不只是跑通逻辑，更重要的是**可维护、可扩展、可运维**。本节总结服务端开发中常见的工程化模式。

### 21.1 模块化设计

将系统拆分为独立模块，每个模块有明确的职责边界，降低耦合度。

```go
// module/manager.go — 模块管理器
type Module interface {
    Name() string
    Init(cfg *AppConfig) error
    Start() error
    Stop() error
}

type ModuleManager struct {
    modules []Module
    mu      sync.Mutex
}

func NewModuleManager() *ModuleManager {
    return &ModuleManager{}
}

func (m *ModuleManager) Register(mod Module) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.modules = append(m.modules, mod)
}

func (m *ModuleManager) InitAll(cfg *AppConfig) error {
    for _, mod := range m.modules {
        if err := mod.Init(cfg); err != nil {
            return fmt.Errorf("module %s init failed: %w", mod.Name(), err)
        }
    }
    return nil
}

func (m *ModuleManager) StartAll() error {
    for _, mod := range m.modules {
        if err := mod.Start(); err != nil {
            return fmt.Errorf("module %s start failed: %w", mod.Name(), err)
        }
    }
    return nil
}

func (m *ModuleManager) StopAll() {
    for i := len(m.modules) - 1; i >= 0; i-- {
        if err := m.modules[i].Stop(); err != nil {
            log.Errorf("module %s stop error: %v", m.modules[i].Name(), err)
        }
    }
}

// 各模块实现独立文件
type NetworkModule struct{ server *TCPServer }
func (n *NetworkModule) Name() string       { return "network" }
func (n *NetworkModule) Init(cfg *AppConfig) error { /* ... */ return nil }
func (n *NetworkModule) Start() error       { return n.server.Listen() }
func (n *NetworkModule) Stop() error        { return n.server.Close() }
```

### 21.2 配置中心

集中管理配置，支持热加载，避免硬编码。

```go
// config/config.go
type AppConfig struct {
    Server   ServerConfig   `yaml:"server"`
    Database DatabaseConfig `yaml:"database"`
    Redis    RedisConfig    `yaml:"redis"`
}

type ServerConfig struct {
    ListenPort int    `yaml:"listen_port"`
    MaxPlayers int    `yaml:"max_players"`
    TickRate   int    `yaml:"tick_rate"`
    Version    string `yaml:"version"`
}

type ConfigCenter struct {
    current atomic.Value // *AppConfig
    watchers []func(*AppConfig)
    mu       sync.Mutex
}

func NewConfigCenter(path string) (*ConfigCenter, error) {
    cc := &ConfigCenter{}
    if err := cc.load(path); err != nil {
        return nil, err
    }
    go cc.watch(path)
    return cc, nil
}

func (cc *ConfigCenter) load(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }
    var cfg AppConfig
    if err := yaml.Unmarshal(data, &cfg); err != nil {
        return err
    }
    cc.current.Store(&cfg)
    cc.notify(&cfg)
    return nil
}

func (cc *ConfigCenter) Get() *AppConfig {
    return cc.current.Load().(*AppConfig)
}

func (cc *ConfigCenter) OnChange(fn func(*AppConfig)) {
    cc.mu.Lock()
    defer cc.mu.Unlock()
    cc.watchers = append(cc.watchers, fn)
}

func (cc *ConfigCenter) notify(cfg *AppConfig) {
    cc.mu.Lock()
    defer cc.mu.Unlock()
    for _, fn := range cc.watchers {
        fn(cfg)
    }
}

// 文件监听实现热加载
func (cc *ConfigCenter) watch(path string) {
    var lastMod time.Time
    info, _ := os.Stat(path)
    if info != nil {
        lastMod = info.ModTime()
    }
    ticker := time.NewTicker(5 * time.Second)
    for range ticker.C {
        info, _ := os.Stat(path)
        if info != nil && info.ModTime().After(lastMod) {
            lastMod = info.ModTime()
            if err := cc.load(path); err != nil {
                log.Errorf("config reload failed: %v", err)
            } else {
                log.Info("config reloaded successfully")
            }
        }
    }
}
```

### 21.3 热更新

不停服更新逻辑，支持运行时替换模块。

```go
// hotfix/hotfix.go
type HotFixManager struct {
    plugins  map[string]Plugin
    mu       sync.RWMutex
}

type Plugin interface {
    Name() string
    Version() string
    Execute(ctx context.Context, args map[string]interface{}) (interface{}, error)
}

func (h *HotFixManager) LoadPlugin(path string) (Plugin, error) {
    plug, err := plugin.Open(path)
    if err != nil {
        return nil, fmt.Errorf("load plugin failed: %w", err)
    }

    sym, err := plug.Lookup("Plugin")
    if err != nil {
        return nil, err
    }

    p, ok := sym.(Plugin)
    if !ok {
        return nil, fmt.Errorf("plugin does not implement Plugin interface")
    }

    h.mu.Lock()
    h.plugins[p.Name()] = p
    h.mu.Unlock()

    log.Infof("hotfix plugin loaded: %s v%s", p.Name(), p.Version())
    return p, nil
}

func (h *HotFixManager) Execute(name string, ctx context.Context, args map[string]interface{}) (interface{}, error) {
    h.mu.RLock()
    p, ok := h.plugins[name]
    h.mu.RUnlock()
    if !ok {
        return nil, fmt.Errorf("plugin %s not found", name)
    }
    return p.Execute(ctx, args)
}
```

### 21.4 日志规范

统一日志格式，支持分级、分文件、结构化输出。

```go
// logger/logger.go
type GameLogger struct {
    inner    *zap.Logger
    filename string
}

func NewGameLogger(name string, level string, logDir string) (*GameLogger, error) {
    logPath := filepath.Join(logDir, name+".log")
    cfg := zap.NewProductionConfig()
    cfg.OutputPaths = []string{"stdout", logPath}
    cfg.ErrorOutputPaths = []string{"stderr", logPath}

    switch level {
    case "debug":
        cfg.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
    case "info":
        cfg.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
    case "warn":
        cfg.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
    case "error":
        cfg.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
    }

    logger, err := cfg.Build()
    if err != nil {
        return nil, err
    }

    return &GameLogger{inner: logger, filename: logPath}, nil
}

// 带上下文的结构化日志
func (l *GameLogger) PlayerInfo(playerID uint64, msg string, fields ...zap.Field) {
    base := []zap.Field{zap.Uint64("player_id", playerID)}
    l.inner.Info(msg, append(base, fields...)...)
}

func (l *GameLogger) BattleInfo(battleID string, msg string, fields ...zap.Field) {
    base := []zap.Field{zap.String("battle_id", battleID)}
    l.inner.Info(msg, append(base, fields...)...)
}

// 使用
logger, _ := NewGameLogger("game", "info", "./logs")
logger.PlayerInfo(12345, "玩家登录", zap.String("ip", "192.168.1.1"))
```

### 21.5 异常处理

游戏服务器不能轻易崩溃，需要兜底机制。

```go
// recovery/recovery.go

// PanicHandler 全局 panic 恢复
func PanicHandler(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                buf := make([]byte, 4096)
                n := runtime.Stack(buf, false)
                log.Errorf("panic recovered: %v\nstack:\n%s", err, buf[:n])
                http.Error(w, "internal server error", 500)
            }
        }()
        next(w, r)
    }
}

// SafeGo 安全的 goroutine 启动
func SafeGo(name string, fn func()) {
    go func() {
        defer func() {
            if err := recover(); err != nil {
                buf := make([]byte, 4096)
                n := runtime.Stack(buf, false)
                log.Errorf("goroutine %s panic: %v\nstack:\n%s", name, err, buf[:n])
            }
        }()
        fn()
    }()
}

// 会话级异常隔离 —— 一个玩家崩溃不影响其他玩家
type SessionGuard struct {
    playerID uint64
}

func (sg *SessionGuard) Execute(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            buf := make([]byte, 4096)
            n := runtime.Stack(buf, false)
            log.Errorf("player %d session panic: %v\n%s", sg.playerID, r, buf[:n])
            err = fmt.Errorf("session panic: %v", r)
        }
    }()
    fn()
    return nil
}

// 使用示例
guard := &SessionGuard{playerID: 12345}
guard.Execute(func() {
    // 玩家的任何操作都包在 guard 里
    processPlayerInput(player)
})
```

### 21.6 补偿任务

当主要流程失败时，通过补偿任务进行回滚。

```go
// compensator/compensator.go
type Compensator struct {
    steps []CompensateStep
    mu    sync.Mutex
}

type CompensateStep struct {
    Name       string
    Execute    func(ctx context.Context) error
    Compensate func(ctx context.Context) error
}

func NewCompensator() *Compensator {
    return &Compensator{}
}

func (c *Compensator) AddStep(name string, exec, comp func(ctx context.Context) error) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.steps = append(c.steps, CompensateStep{
        Name:       name,
        Execute:    exec,
        Compensate: comp,
    })
}

// ExecuteAll 按顺序执行，失败时反向补偿
func (c *Compensator) ExecuteAll(ctx context.Context) error {
    c.mu.Lock()
    steps := c.steps
    c.mu.Unlock()

    executed := make([]int, 0, len(steps))
    for i, step := range steps {
        if err := step.Execute(ctx); err != nil {
            log.Errorf("step %s failed: %v, starting compensation", step.Name, err)
            // 反向补偿已执行的步骤
            for j := len(executed) - 1; j >= 0; j-- {
                idx := executed[j]
                if compErr := steps[idx].Compensate(ctx); compErr != nil {
                    log.Errorf("compensate step %s failed: %v", steps[idx].Name, compErr)
                }
            }
            return fmt.Errorf("compensated after step %s: %w", step.Name, err)
        }
        executed = append(executed, i)
    }
    return nil
}

// 使用示例：玩家购买物品
comp := NewCompensator()
comp.AddStep("扣款",
    func(ctx context.Context) error { return deductCurrency(ctx, 100) },
    func(ctx context.Context) error { return refundCurrency(ctx, 100) },
)
comp.AddStep("发放物品",
    func(ctx context.Context) error { return addItem(ctx, itemID) },
    func(ctx context.Context) error { return removeItem(ctx, itemID) },
)
comp.AddStep("记录日志",
    func(ctx context.Context) error { return logPurchase(ctx) },
    func(ctx context.Context) error { return nil }, // 日志无需补偿
)

if err := comp.ExecuteAll(ctx); err != nil {
    // 购买失败，所有步骤已回滚
}
```

### 21.7 定时任务与异步任务

管理周期性任务和延迟任务。

```go
// scheduler/scheduler.go
type TaskScheduler struct {
    tasks    map[string]*ScheduledTask
    mu       sync.RWMutex
    stopCh   chan struct{}
}

type ScheduledTask struct {
    ID       string
    Interval time.Duration
    Fn       func()
    ticker   *time.Ticker
    stopCh   chan struct{}
}

func NewTaskScheduler() *TaskScheduler {
    return &TaskScheduler{
        tasks:  make(map[string]*ScheduledTask),
        stopCh: make(chan struct{}),
    }
}

// AddInterval 添加周期任务
func (s *TaskScheduler) AddInterval(id string, interval time.Duration, fn func()) {
    s.mu.Lock()
    defer s.mu.Unlock()

    task := &ScheduledTask{
        ID:       id,
        Interval: interval,
        Fn:       fn,
        ticker:   time.NewTicker(interval),
        stopCh:   make(chan struct{}),
    }
    s.tasks[id] = task

    go func() {
        for {
            select {
            case <-task.ticker.C:
                SafeGo(id, task.Fn)
            case <-task.stopCh:
                task.ticker.Stop()
                return
            }
        }
    }()
}

// AddOnce 添加延迟执行的单次任务
func (s *TaskScheduler) AddOnce(id string, delay time.Duration, fn func()) {
    go func() {
        time.AfterFunc(delay, func() {
            SafeGo(id, fn)
        })
    }()
}

func (s *TaskScheduler) Remove(id string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    if task, ok := s.tasks[id]; ok {
        close(task.stopCh)
        delete(s.tasks, id)
    }
}

// 使用示例
scheduler := NewTaskScheduler()

// 每 5 分钟清理离线玩家
scheduler.AddInterval("cleanup", 5*time.Minute, func() {
    cleanupOfflinePlayers()
})

// 每天凌晨重置排行榜
scheduler.AddInterval("reset_ranking", 24*time.Hour, func() {
    resetDailyRanking()
})

// 30 秒后发送首充奖励
scheduler.AddOnce("first_charge_123", 30*time.Second, func() {
    sendFirstChargeReward(123)
})
```

### 21.8 脚本化与工具化

将运营、测试常用操作封装为脚本或命令行工具。

```go
// cmd/tool/main.go
func main() {
    app := &cli.App{
        Name:  "game-tool",
        Usage: "游戏服务器运维工具",
        Commands: []*cli.Command{
            {
                Name:  "kick",
                Usage: "踢出玩家",
                Action: func(c *cli.Context) error {
                    playerID := c.Args().First()
                    return kickPlayer(playerID)
                },
            },
            {
                Name:  "reload-config",
                Usage: "热加载配置",
                Action: func(c *cli.Context) error {
                    return reloadConfig()
                },
            },
            {
                Name:  "broadcast",
                Usage: "发送全服公告",
                Flags: []cli.Flag{
                    &cli.StringFlag{Name: "msg", Required: true},
                },
                Action: func(c *cli.Context) error {
                    return sendBroadcast(c.String("msg"))
                },
            },
            {
                Name:  "check-db",
                Usage: "数据库健康检查",
                Action: func(c *cli.Context) error {
                    return checkDatabase()
                },
            },
        },
    }
    if err := app.Run(os.Args); err != nil {
        log.Fatal(err)
    }
}
```

---

## 22. 代码质量与可维护性

代码写出来只是开始，**能读懂、能修改、能测试**才是长久之道。

### 22.1 接口边界

明确定义模块间的接口契约，避免实现泄漏。

```go
// 接口定义在消费者一侧（Go 惯例）
// storage/storage.go
type PlayerStorage interface {
    GetByID(ctx context.Context, id uint64) (*Player, error)
    Save(ctx context.Context, player *Player) error
    Delete(ctx context.Context, id uint64) error
}

// 实现放在独立文件中
// storage/mysql.go
type MySQLPlayerStorage struct {
    db *sql.DB
}

func (s *MySQLPlayerStorage) GetByID(ctx context.Context, id uint64) (*Player, error) {
    row := s.db.QueryRowContext(ctx, "SELECT id, name, level FROM players WHERE id = ?", id)
    var p Player
    if err := row.Scan(&p.ID, &p.Name, &p.Level); err != nil {
        return nil, err
    }
    return &p, nil
}

func (s *MySQLPlayerStorage) Save(ctx context.Context, player *Player) error {
    _, err := s.db.ExecContext(ctx,
        "INSERT INTO players (id, name, level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=?, level=?",
        player.ID, player.Name, player.Level, player.Name, player.Level,
    )
    return err
}

func (s *MySQLPlayerStorage) Delete(ctx context.Context, id uint64) error {
    _, err := s.db.ExecContext(ctx, "DELETE FROM players WHERE id = ?", id)
    return err
}

// 业务层只依赖接口，不依赖具体实现
type PlayerService struct {
    storage PlayerStorage  // 接口依赖
}

func NewPlayerService(storage PlayerStorage) *PlayerService {
    return &PlayerService{storage: storage}
}
```

### 22.2 统一协议层

客户端与服务端的通信协议统一管理，避免散落在各处。

```go
// protocol/protocol.go
type MessageHeader struct {
    MsgID   uint16 `json:"msg_id"`
    Length  uint32 `json:"length"`
    Seq     uint32 `json:"seq"`
}

type Request struct {
    Header MessageHeader
    Body   []byte
}

type Response struct {
    Header MessageHeader
    Code   uint32      `json:"code"`
    Msg    string      `json:"msg"`
    Data   interface{} `json:"data"`
}

// 消息注册表
type MessageRegistry struct {
    handlers map[uint16]MessageHandler
    mu       sync.RWMutex
}

type MessageHandler func(playerID uint64, body []byte) (interface{}, error)

func NewMessageRegistry() *MessageRegistry {
    return &MessageRegistry{
        handlers: make(map[uint16]MessageHandler),
    }
}

func (r *MessageRegistry) Register(msgID uint16, handler MessageHandler) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.handlers[msgID] = handler
}

func (r *MessageRegistry) Handle(playerID uint64, req Request) Response {
    r.mu.RLock()
    handler, ok := r.handlers[req.Header.MsgID]
    r.mu.RUnlock()

    if !ok {
        return Response{
            Header: req.Header,
            Code:   404,
            Msg:    "unknown message",
        }
    }

    data, err := handler(playerID, req.Body)
    if err != nil {
        return Response{
            Header: req.Header,
            Code:   500,
            Msg:    err.Error(),
        }
    }

    return Response{
        Header: req.Header,
        Code:   0,
        Msg:    "ok",
        Data:   data,
    }
}

// 协议 ID 常量统一管理
const (
    MsgLogin        uint16 = 1001
    MsgLogout       uint16 = 1002
    MsgMove         uint16 = 2001
    MsgAttack       uint16 = 2002
    MsgChat         uint16 = 3001
    MsgBuyItem      uint16 = 4001
)
```

### 22.3 统一错误码

规范化的错误码体系，便于排查问题和国际化。

```go
// errors/errors.go
type GameError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Detail  string `json:"detail,omitempty"` // 开发调试用
}

func (e *GameError) Error() string {
    return fmt.Sprintf("[%d] %s: %s", e.Code, e.Message, e.Detail)
}

// 错误码定义（按模块分段）
const (
    // 通用错误 1xxx
    ErrUnknown        = 1001
    ErrInvalidParam   = 1002
    ErrUnauthorized   = 1003
    ErrRateLimited    = 1004

    // 玩家错误 2xxx
    ErrPlayerNotFound = 2001
    ErrPlayerBusy     = 2002
    ErrPlayerBanned   = 2003

    // 背包错误 3xxx
    ErrInventoryFull  = 3001
    ErrItemNotFound   = 3002
    ErrItemNotEnough  = 3003

    // 战斗错误 4xxx
    ErrBattleNotFound = 4001
    ErrBattleTimeout  = 4002
    ErrAlreadyInBattle = 4003
)

// 错误消息映射
var errorMessages = map[int]string{
    ErrUnknown:        "未知错误",
    ErrInvalidParam:   "参数无效",
    ErrUnauthorized:   "未授权",
    ErrRateLimited:    "请求过于频繁",
    ErrPlayerNotFound: "玩家不存在",
    ErrPlayerBusy:     "玩家正忙",
    ErrInventoryFull:  "背包已满",
    ErrItemNotFound:   "物品不存在",
    ErrItemNotEnough:  "物品不足",
}

func NewGameError(code int, detail string) *GameError {
    msg := errorMessages[code]
    if msg == "" {
        msg = "未知错误"
    }
    return &GameError{Code: code, Message: msg, Detail: detail}
}

// 工厂方法 —— 常用错误快速创建
func ErrParam(detail string) *GameError {
    return NewGameError(ErrInvalidParam, detail)
}
func ErrNotFound(detail string) *GameError {
    return NewGameError(ErrPlayerNotFound, detail)
}
```

### 22.4 可测试性设计

编写易于单元测试和集成测试的代码。

```go
// interface-based 设计天然支持 mock
// player/player.go
type Player struct {
    ID      uint64
    Name    string
    Level   int
    storage PlayerStorage
}

// 依赖注入，便于测试时替换
func NewPlayer(id uint64, name string, storage PlayerStorage) *Player {
    return &Player{
        ID:      id,
        Name:    name,
        storage: storage,
    }
}

func (p *Player) LevelUp() error {
    p.Level++
    return p.storage.Save(context.Background(), p)
}

// —— 测试代码 ——
// player/player_test.go
type mockStorage struct {
    saved *Player
}

func (m *mockStorage) GetByID(ctx context.Context, id uint64) (*Player, error) {
    return nil, nil
}
func (m *mockStorage) Save(ctx context.Context, p *Player) error {
    m.saved = p
    return nil
}
func (m *mockStorage) Delete(ctx context.Context, id uint64) error {
    return nil
}

func TestPlayerLevelUp(t *testing.T) {
    mock := &mockStorage{}
    player := NewPlayer(1, "test", mock)
    player.Level = 5

    err := player.LevelUp()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if player.Level != 6 {
        t.Errorf("expected level 6, got %d", player.Level)
    }
    if mock.saved == nil {
        t.Error("expected save to be called")
    }
}

// 使用接口抽象外部依赖
type NetworkClient interface {
    Send(playerID uint64, data []byte) error
}

type MockNetworkClient struct {
    Sent [][]byte
}

func (m *MockNetworkClient) Send(playerID uint64, data []byte) error {
    m.Sent = append(m.Sent, data)
    return nil
}
```

### 22.5 可观测性设计

监控、追踪、告警三位一体。

```go
// metrics/metrics.go
import "github.com/prometheus/client_golang/prometheus"

var (
    // 请求指标
    RequestTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "game_request_total",
            Help: "Total number of requests",
        },
        []string{"msg_id", "code"},
    )

    // 延迟指标
    RequestLatency = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "game_request_latency_seconds",
            Help:    "Request latency in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1},
        },
        []string{"msg_id"},
    )

    // 在线人数
    OnlinePlayers = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "game_online_players",
            Help: "Current online players",
        },
    )

    // 战斗房间数
    BattleRooms = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "game_battle_rooms",
            Help: "Current active battle rooms",
        },
    )
)

func init() {
    prometheus.MustRegister(RequestTotal, RequestLatency, OnlinePlayers, BattleRooms)
}

// 中间件：自动采集指标
func MetricsMiddleware(handler MessageHandler, msgID uint16) MessageHandler {
    return func(playerID uint64, body []byte) (interface{}, error) {
        start := time.Now()
        data, err := handler(playerID, body)
        duration := time.Since(start).Seconds()

        code := "0"
        if err != nil {
            code = "error"
        }

        RequestTotal.WithLabelValues(fmt.Sprintf("%d", msgID), code).Inc()
        RequestLatency.WithLabelValues(fmt.Sprintf("%d", msgID)).Observe(duration)

        return data, err
    }
}

// 链路追踪
type TraceContext struct {
    TraceID string
    SpanID  string
    Parent  *TraceContext
}

func StartTrace(ctx context.Context) (*TraceContext, context.Context) {
    traceID := generateTraceID()
    spanID := generateSpanID()
    tc := &TraceContext{TraceID: traceID, SpanID: spanID}
    return tc, context.WithValue(ctx, "trace", tc)
}
```

### 22.6 可回滚性设计

任何变更都应能安全回滚。

```go
// rollback/rollback.go
type RollbackManager struct {
    steps []RollbackStep
    mu    sync.Mutex
}

type RollbackStep struct {
    Name       string
    Execute    func() error
    Rollback   func() error
}

func NewRollbackManager() *RollbackManager {
    return &RollbackManager{}
}

func (r *RollbackManager) AddStep(name string, exec, rollback func() error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.steps = append(r.steps, RollbackStep{
        Name:     name,
        Execute:  exec,
        Rollback: rollback,
    })
}

func (r *RollbackManager) Execute() error {
    r.mu.Lock()
    steps := r.steps
    r.mu.Unlock()

    executed := make([]RollbackStep, 0, len(steps))
    for _, step := range steps {
        if err := step.Execute(); err != nil {
            log.Errorf("step %s failed: %v", step.Name, err)
            // 反向回滚
            for i := len(executed) - 1; i >= 0; i-- {
                if rbErr := executed[i].Rollback(); rbErr != nil {
                    log.Errorf("rollback %s failed: %v", executed[i].Name, rbErr)
                }
            }
            return fmt.Errorf("rolled back after %s: %w", step.Name, err)
        }
        executed = append(executed, step)
    }
    return nil
}

// 数据库版本管理
type Migration struct {
    Version  int
    UpSQL    string
    DownSQL  string
}

type MigrationManager struct {
    db         *sql.DB
    migrations []Migration
}

func (m *MigrationManager) MigrateUp() error {
    for _, mig := range m.migrations {
        if _, err := m.db.Exec(mig.UpSQL); err != nil {
            return fmt.Errorf("migration v%d failed: %w", mig.Version, err)
        }
        log.Infof("migration v%d applied", mig.Version)
    }
    return nil
}

func (m *MigrationManager) MigrateDown(targetVersion int) error {
    for i := len(m.migrations) - 1; i >= 0; i-- {
        if m.migrations[i].Version <= targetVersion {
            break
        }
        if _, err := m.db.Exec(m.migrations[i].DownSQL); err != nil {
            return fmt.Errorf("rollback v%d failed: %w", m.migrations[i].Version, err)
        }
        log.Infof("migration v%d rolled back", m.migrations[i].Version)
    }
    return nil
}
```

---

## 下一步

1. 从状态模式和观察者模式开始实践
2. 用 ECS 架构重构实体系统
3. 用对象池优化网络包管理
4. 用空间分区优化 AOI 计算
