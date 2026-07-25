# 游戏编程模式

> 基于 Robert Nystrom《Game Programming Patterns》（gameprogrammingpatterns.com）整理，面向游戏服务端开发的完整参考手册。

---

## 目录

- [第一部分：架构、性能与游戏](#第一部分架构性能与游戏)
- [第二部分：设计模式回顾](#第二部分设计模式回顾)
  - [1. 命令模式（Command）](#1-命令模式command)
  - [2. 享元模式（Flyweight）](#2-享元模式flyweight)
  - [3. 观察者模式（Observer）](#3-观察者模式observer)
  - [4. 原型模式（Prototype）](#4-原型模式prototype)
  - [5. 单例模式（Singleton）](#5-单例模式singleton)
  - [6. 状态模式（State）](#6-状态模式state)
- [第三部分：序列型模式](#第三部分序列型模式)
  - [7. 双缓冲（Double Buffer）](#7-双缓冲double-buffer)
  - [8. 游戏循环（Game Loop）](#8-游戏循环game-loop)
  - [9. 更新方法（Update Method）](#9-更新方法update-method)
- [第四部分：行为型模式](#第四部分行为型模式)
  - [10. 字节码（Bytecode）](#10-字节码bytecode)
  - [11. 子类沙盒（Subclass Sandbox）](#11-子类沙盒subclass-sandbox)
  - [12. 类型对象（Type Object）](#12-类型对象type-object)
- [第五部分：解耦型模式](#第五部分解耦型模式)
  - [13. 组件模式（Component）](#13-组件模式component)
  - [14. 事件队列（Event Queue）](#14-事件队列event-queue)
  - [15. 服务定位器（Service Locator）](#15-服务定位器service-locator)
- [第六部分：优化型模式](#第六部分优化型模式)
  - [16. 数据局部性（Data Locality）](#16-数据局部性data-locality)
  - [17. 脏标记（Dirty Flag）](#17-脏标记dirty-flag)
  - [18. 对象池（Object Pool）](#18-对象池object-pool)
  - [19. 空间分区（Spatial Partition）](#19-空间分区spatial-partition)

---

## 第一部分：架构、性能与游戏

Robert Nystrom 在书的开篇部分讨论了为什么架构和性能对游戏开发者如此重要。他指出，大多数游戏开发者面临两个核心问题：

1. **代码腐烂**：随着项目规模增长，代码变得纠缠不清，修改一个功能会引发连锁反应。
2. **性能陷阱**：开发者过度关注微优化，而忽视了更高层次的架构决策。

书中强调，设计模式不是银弹，但正确使用可以显著改善代码的可维护性和可读性。Nystrom 认为好的架构应该让代码"干净、易懂、更快"。他特别指出，游戏开发中的很多模式和传统软件开发模式有所不同，因为游戏有其独特的需求：实时性、资源受限、以及对性能的极端追求。

---

## 第二部分：设计模式回顾

---

### 1. 命令模式（Command）

#### 意图（Intent）

将请求封装为对象，从而使你可以用不同的请求参数化客户端，对请求排队或记录日志，以及支持可撤销的操作。

#### 动机（Motivation）

Robert Nystrom 在书中将命令模式精炼为一句话：**"命令是被实体化（reified）的方法调用"**。"实体化"意味着把一个概念变成数据——一个对象——你可以把它存进变量、传给函数等。

书中举了一个经典例子：在每个游戏中都有一段代码读取原始用户输入（按键、鼠标点击等），然后将其翻译为有意义的游戏动作：

```go
// 没有命令模式：硬编码的输入处理
func handleInput(input Input) {
    if input.IsPressed(ButtonX) {
        jump()
    } else if input.IsPressed(ButtonY) {
        fireGun()
    } else if input.IsPressed(ButtonA) {
        swapWeapon()
    } else if input.IsPressed(ButtonB) {
        lurchIneffectively()
    }
}
```

这种方法的问题是：用户无法重新配置按键映射。要支持可配置的按键绑定，我们需要把直接的函数调用变成可以替换的对象。

Nystrom 指出，命令模式和"回调"、"一等函数"、"闭包"等概念是同一类东西——把行为当作数据传递。但命令模式在游戏中的应用远比简单的回调更广泛：它支持撤销/重做、命令历史记录、宏命令（将多个命令组合）、以及网络同步中的命令重放。

#### 模式本身（The Pattern）

定义一个 `Command` 接口，声明 `Execute` 方法。每个具体命令类封装一个具体的游戏动作：

```go
// Command 是所有命令的接口
type Command interface {
    Execute(actor *Actor)
}

// JumpCommand 封装跳跃动作
type JumpCommand struct{}

func (c *JumpCommand) Execute(actor *Actor) {
    actor.SetVelocity(Vector2{X: 0, Y: JUMP_VELOCITY})
    actor.SetGraphics(IMAGE_JUMP)
}

// FireCommand 封装射击动作
type FireCommand struct{}

func (c *FireCommand) Execute(actor *Actor) {
    // 射击逻辑
}

// InputHandler 将按键映射到命令
type InputHandler struct {
    buttonX Command
    buttonY Command
    buttonA Command
    buttonB Command
}

func NewInputHandler() *InputHandler {
    return &InputHandler{
        buttonX: &JumpCommand{},
        buttonY: &FireCommand{},
        buttonA: &SwapWeaponCommand{},
        buttonB: &LurchCommand{},
    }
}

func (h *InputHandler) HandleInput(input Input) Command {
    if input.IsPressed(h.buttonX) {
        return h.buttonX
    }
    if input.IsPressed(h.buttonY) {
        return h.buttonY
    }
    if input.IsPressed(h.buttonA) {
        return h.buttonA
    }
    if input.IsPressed(h.buttonB) {
        return h.buttonB
    }
    return nil
}
```

#### 当使用时（When to Use It）

书中指出命令模式最适合以下场景：

1. **输入绑定**：用户可以自定义按键映射，就像上面的例子。
2. **撤销/重做**：命令对象记录了执行前的状态，可以轻松实现 undo/redo。
3. **命令历史**：将命令记录在历史栈中，支持宏操作和回放。
4. **延迟执行**：命令可以被排队，在未来某个时刻执行。
5. **网络同步**：在帧同步架构中，每个玩家的操作被打包为命令对象发送到服务器。

#### 注意事项（Keep in Mind）

Nystrom 强调几点：

- 命令模式本身并不规定命令的粒度。一条命令可以是"跳跃"，也可以是"整个回合的所有操作"。
- 如果你已经有了闭包或一等函数的语言特性，简单的命令模式可能用闭包就够了。命令模式的优势在于它是一个对象，可以被序列化、存储、比较。
- 不要为了用命令模式而用命令模式——如果只是简单的回调，直接用闭包可能更简洁。

#### 设计决策（Design Decisions）

Nystrom 在书中讨论了几个关键的设计决策：

1. **命令是否需要知道接收者？** 如果命令直接操作接收者，那它需要持有接收者的引用。如果命令只传递给一个分发器（dispatcher），接收者可以作为参数传入。
2. **命令是否支持撤销？** 撤销需要命令在执行前保存状态。这增加了复杂度但提供了强大的功能。
3. **命令的粒度**：太粗的命令失去了灵活性，太细的命令增加了管理成本。

#### 服务端应用场景

在游戏服务端开发中，命令模式的应用极为广泛：

```go
// 网络命令：客户端发送操作指令
type NetworkCommand struct {
    PlayerID uint64
    Tick     uint64
    Action   string
    Params   map[string]interface{}
}

// 服务端执行命令并广播结果
func (s *Server) ProcessCommand(cmd *NetworkCommand) {
    player := s.GetPlayer(cmd.PlayerID)
    
    switch cmd.Action {
    case "move":
        dir := cmd.Params["direction"].(string)
        s.ExecuteMove(player, dir)
    case "attack":
        targetID := cmd.Params["target"].(uint64)
        s.ExecuteAttack(player, targetID)
    case "use_skill":
        skillID := cmd.Params["skill_id"].(int)
        s.ExecuteSkill(player, skillID)
    }
    
    // 记录命令历史，支持回放和反作弊
    s.commandHistory = append(s.commandHistory, cmd)
}
```

**帧同步架构**中，命令模式是核心：所有玩家的操作被打包为命令对象，在服务端收集后广播给所有客户端，保证所有客户端执行相同的命令序列。

#### 参考（See Also）

- 命令模式与**事件队列模式**经常配合使用：命令被放入队列中异步处理。
- 在**字节码模式**中，脚本语言的指令本质上也是一种命令序列。

---

### 2. 享元模式（Flyweight）

#### 意图（Intent）

通过共享来高效地支持大量细粒度的对象。

#### 动机（Motivation）

Nystrom 用了一个优美的比喻来引入享元模式：一片壮观的原始森林。成千上万棵铁杉树高耸入云，形成绿色的大教堂。对于游戏开发者来说，这意味着数百万个多边形需要每帧渲染到 GPU 上。

每棵树的数据包括：
- 定义树干、树枝和树叶形状的多边形网格
- 树皮和树叶的纹理
- 在森林中的位置和朝向
- 调整参数（大小、色调等）使每棵树看起来略有不同

如果直接存储，每棵树都会持有完整的网格和纹理数据，内存消耗巨大。关键观察是：**虽然有上千棵树，但它们大部分看起来是一样的——使用相同的网格和纹理**。这意味着对象的大部分字段在所有实例之间是相同的。

解决方案是将对象拆分为两部分：所有实例共享的**不变数据**（intrinsic state）放在一个共享类中，每个实例特有的**可变数据**（extrinsic state）留在实例本身。

#### 模式本身（The Pattern）

```go
// TreeModel 是共享的、不可变的数据
type TreeModel struct {
    Mesh  *Mesh
    Bark  *Texture
    Leaves *Texture
}

// Tree 是每个实例的可变状态
type Tree struct {
    Model      *TreeModel  // 指向共享模型
    Position   Vector3
    Height     float64
    Thickness  float64
    BarkTint   Color
    LeafTint   Color
}
```

Nystrom 指出，享元模式的精髓在于：**不要存储可从其他地方推导出的数据**。在游戏服务端中，这同样重要：

```go
// 共享的怪物原型（不可变）
type MonsterPrototype struct {
    ID       int32
    Name     string
    BaseHP   int32
    BaseATK  int32
    BaseDEF  int32
    Skills   []int32
    LootID   int32
}

// 每个怪物实例的可变状态
type MonsterInstance struct {
    Prototype *MonsterPrototype
    ID        uint64
    HP        int32
    Position  Vector3
    State     MonsterState
    SpawnTime int64
}

// 全局原型注册表
type MonsterRegistry struct {
    prototypes map[int32]*MonsterPrototype
    mu         sync.RWMutex
}

func (r *MonsterRegistry) GetPrototype(id int32) *MonsterPrototype {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return r.prototypes[id]
}

func (r *MonsterRegistry) SpawnMonster(prototypeID int32, pos Vector3) *MonsterInstance {
    proto := r.GetPrototype(prototypeID)
    return &MonsterInstance{
        Prototype: proto,
        ID:        GenerateID(),
        HP:        proto.BaseHP,
        Position:  pos,
        State:     Idle,
    }
}
```

#### 当使用时（When to Use It）

书中指出享元模式适用于：

1. **大量相似对象**：当程序创建了大量对象且它们共享相同数据时。
2. **内存是瓶颈**：对象太多导致内存不足。
3. **性能关键路径**：CPU 缓存不友好导致性能问题。

#### 注意事项（Keep in Mind）

Nystrom 提醒注意几个陷阱：

- 享元模式增加了代码复杂度——你需要分离"共享"和"实例专属"的数据。
- 引用共享数据意味着你需要管理生命周期。如果共享对象被修改，所有引用它的实例都会受影响。
- 在游戏服务端中，共享的原型数据通常来自配置文件或数据库，在运行时不应修改。

#### 设计决策（Design Decisions）

1. **共享数据在哪里管理？** 书中提到可以用独立的 Flyweight 对象，也可以让对象自己管理共享部分。
2. **实例数据如何与共享数据关联？** 可以用指针/引用，也可以用 ID 查表。
3. **对象池 vs 享元**：对象池重用对象实例，享元共享对象数据。两者可以组合使用。

#### 服务端应用场景

在服务端，享元模式特别适用于：
- **配置数据共享**：所有同类型怪物共享基础属性配置
- **模板模式**：技能模板、物品模板等不可变配置数据
- **空间管理**：大量地图对象的共享静态数据

#### 参考（See Also）

- 享元模式与**对象池模式**是互补的：享元解决共享数据问题，对象池解决实例重用问题。
- 在**类型对象模式**中，"类型"本身就是一种享元。

---

### 3. 观察者模式（Observer）

#### 意图（Intent）

定义对象之间的一对多依赖关系，当一个对象状态改变时，所有依赖者都会自动收到通知并更新。

#### 动机（Motivation）

Nystrom 以游戏成就系统为例引入观察者模式。成就系统需要监听各种游戏事件——"击杀100个猴妖"、"从桥上掉下去"、"只用死黄鼠狼通关"。这些成就由完全不同的游戏行为触发。

问题是：如果直接在碰撞检测代码中调用 `unlockFallOffBridge()`，物理引擎的代码就被成就系统污染了。我们希望成就系统和物理引擎完全解耦。

解决方案是让物理引擎在检测到事件时"广播"出去，不关心谁在监听：

```go
// 物理引擎代码 - 只负责发出通知
func (p *PhysicsSystem) UpdateEntity(entity *Entity) {
    wasOnSurface := entity.IsOnSurface()
    entity.Accelerate(GRAVITY)
    entity.Update()
    
    if wasOnSurface && !entity.IsOnSurface() {
        // 不关心谁在监听，只发出通知
        p.notify(entity, EVENT_START_FALL)
    }
}
```

成就系统注册自己来接收这些通知，检查掉落的是否是主角、之前是否站在桥上。如果两个条件都满足，就解锁成就。这一切都不需要物理引擎知道成就系统的存在。

#### 模式本身（The Pattern）

```go
// Observer 接口
type Observer interface {
    OnNotify(event Event, entity interface{})
}

// Subject（被观察者）
type Subject struct {
    observers []Observer
}

func (s *Subject) AddObserver(observer Observer) {
    s.observers = append(s.observers, observer)
}

func (s *Subject) RemoveObserver(observer Observer) {
    for i, o := range s.observers {
        if o == observer {
            s.observers = append(s.observers[:i], s.observers[i+1:]...)
            return
        }
    }
}

func (s *Subject) Notify(event Event, entity interface{}) {
    for _, observer := range s.observers {
        observer.OnNotify(event, entity)
    }
}

// 具体观察者：成就系统
type Achievements struct {
    subject *Subject
}

func NewAchievements(subject *Subject) *Achievements {
    a := &Achievements{subject: subject}
    subject.AddObserver(a)
    return a
}

func (a *Achievements) OnNotify(event Event, entity interface{}) {
    switch event {
    case EVENT_FALL:
        if entity == hero && entity.(*Entity).LastSurface() == SURFACE_BRIDGE {
            a.Unlock("FALL_OFF_BRIDGE")
        }
    case EVENT_KILL:
        // 检查各种击杀成就
    }
}
```

#### 当使用时（When to Use It）

书中指出观察者模式适用于：

1. **一个对象的改变需要通知其他对象，但你不知道有多少对象需要通知**
2. **你不希望这些对象之间紧密耦合**
3. **事件驱动的架构**，如 GUI、消息系统等

#### 注意事项（Keep in Mind）

Nystrom 提出了几个重要警示：

- **内存泄漏**：观察者没有被正确移除，会导致内存泄漏。这是观察者模式最常见的陷阱。
- **通知顺序不确定**：你不能依赖观察者的通知顺序。
- **性能问题**：大量的观察者通知可能成为性能瓶颈。
- **级联更新**：观察者的更新可能触发更多更新，导致难以预测的连锁反应。

Nystrom 特别指出，很多游戏开发者因为担心性能而避免使用观察者模式，但在现代硬件上这通常不是问题。

#### 设计决策（Design Decisions）

1. **推模型 vs 拉模型**：通知时是推送完整数据，还是只推送一个标识让观察者自己拉取？
2. **通知的粒度**：一个通知包含多少信息？太粗不够灵活，太细增加复杂度。
3. **观察者管理**：谁负责添加和移除观察者？

#### 服务端应用场景

观察者模式在服务端开发中无处不在：

```go
// 事件类型定义
const (
    EVENT_PLAYER_LOGIN  = "player_login"
    EVENT_PLAYER_LOGOUT = "player_logout"
    EVENT_PLAYER_KILL   = "player_kill"
    EVENT_ITEM_PICKUP   = "item_pickup"
    EVENT_BOSS_SPAWN    = "boss_spawn"
)

// 全局事件总线
type EventBus struct {
    observers map[string][]Observer
    mu        sync.RWMutex
}

func (eb *EventBus) Notify(event string, data interface{}) {
    eb.mu.RLock()
    defer eb.mu.RUnlock()
    for _, observer := range eb.observers[event] {
        observer.OnNotify(event, data)
    }
}

// 多个系统监听玩家死亡事件
// - 经验系统：给予击杀者经验
// - 掉落系统：随机掉落物品
// - 成就系统：检查击杀成就
// - 排行榜系统：更新击杀排行
// - 日志系统：记录击杀日志
```

#### 参考（See Also）

- 观察者模式是**事件队列模式**的简化版本：事件队列是异步的，观察者模式通常是同步的。
- 在**组件模式**中，组件之间的通信经常使用观察者模式。

---

### 4. 原型模式（Prototype）

#### 意图（Intent）

用原型实例指定创建对象的种类，并且通过拷贝这些原型来创建新的对象。

#### 动机（Motivation）

Nystrom 以一个类似 Gauntlet 风格的游戏为例：怪物通过"生成器"进入竞技场。如果每种怪物都有一个对应的生成器类（GhostSpawner、DemonSpawner 等），会导致类的爆炸式增长。

原型模式的关键思想是：**一个对象可以从它自身克隆出其他类似对象**。如果你有一个幽灵，你可以从中制造更多的幽灵。任何怪物都可以被当作原型，用来生成它自身的其他版本。

```go
// 不使用原型模式：每种怪物一个生成器
// GhostSpawner, DemonSpawner, SorcererSpawner... 类爆炸

// 使用原型模式
type Monster interface {
    Clone() Monster
}

type Ghost struct {
    Health int
    Speed  int
}

func (g *Ghost) Clone() Monster {
    return &Ghost{Health: g.Health, Speed: g.Speed}
}

// 通用生成器
type Spawner struct {
    prototype Monster
}

func NewSpawner(prototype Monster) *Spawner {
    return &Spawner{prototype: prototype}
}

func (s *Spawner) Spawn() Monster {
    return s.prototype.Clone()
}

// 使用：创建一个快速幽灵生成器
fastGhost := &Ghost{Health: 10, Speed: 20}
fastGhostSpawner := NewSpawner(fastGhost)
```

Nystrom 强调，原型模式不仅克隆类，还克隆状态。这意味着你可以通过创建不同的原型来生成"快速幽灵"、"弱幽灵"或"慢幽灵"，而不需要创建新的类。

#### 模式本身（The Pattern）

```go
// 原型接口
type Prototype interface {
    Clone() Prototype
}

// 具体原型：怪物类型
type MonsterType struct {
    Name     string
    HP       int
    ATK      int
    DEF      int
    Skills   []int
    LootTable []int
}

func (m *MonsterType) Clone() Prototype {
    clone := &MonsterType{
        Name:     m.Name,
        HP:       m.HP,
        ATK:      m.ATK,
        DEF:      m.DEF,
        Skills:   make([]int, len(m.Skills)),
        LootTable: make([]int, len(m.LootTable)),
    }
    copy(clone.Skills, m.Skills)
    copy(clone.LootTable, m.LootTable)
    return clone
}
```

#### 当使用时（When to Use It）

书中指出原型模式适用于：

1. **创建新对象比克隆现有对象更昂贵时**
2. **你需要很多相似对象的变种，但不想为每种变种创建新类时**
3. **对象初始化很复杂，包含大量配置时**

#### 注意事项（Keep in Mind）

- 深拷贝 vs 浅拷贝：原型模式要求深拷贝，否则所有克隆体共享可变状态。
- 原型的注册表：通常需要一个原型管理器来存储和检索原型。
- 在游戏服务端中，原型通常来自配置文件或数据库，运行时不应修改原型本身。

#### 服务端应用场景

原型模式在服务端中常用于：
- **怪物生成**：不同怪物类型作为原型，生成时克隆基础属性
- **技能效果**：技能模板作为原型，施放时创建实例
- **副本系统**：副本模板作为原型，每次进入时克隆并随机化

#### 参考（See Also）

- 原型模式与**享元模式**密切相关：两者都涉及对象的"共享模板"概念。
- 原型模式与**类型对象模式**的区别在于：原型克隆实例，类型对象定义类。

---

### 5. 单例模式（Singleton）

#### 意图（Intent）

确保一个类只有一个实例，并提供一个全局访问点。

#### 动机（Motivation）

Nystrom 开篇就直言不讳：**"这一章是一个反模式教程。本书其他每一章都是展示如何使用设计模式，而这一章展示的是如何不使用一个模式。"**

尽管单例模式的初衷是好的，但 Gang of Four 描述的单例模式通常弊大于利。虽然 GoF 强调应该"谨慎使用"，但这个信息在传到游戏行业时经常被忽略。

书中举了一个文件系统包装器的例子来说明单例的合理使用场景：异步文件操作需要协调，多个实例会导致操作冲突。单例确保只有一个实例来管理所有操作。

但问题在于，单例让代码之间的依赖关系变得不明显。如果你在函数中看到 `FileSystem::instance()` 的调用，你无法从函数签名中看出这个函数依赖于文件系统。这违反了显式依赖的原则。

#### 模式本身（The Pattern）

```go
// Go 中的单例实现
type FileSystem struct {
    mu      sync.Mutex
    pending map[string]*AsyncOp
}

var (
    fsInstance *FileSystem
    fsOnce     sync.Once
)

func GetFileSystem() *FileSystem {
    fsOnce.Do(func() {
        fsInstance = &FileSystem{
            pending: make(map[string]*AsyncOp),
        }
    })
    return fsInstance
}
```

#### 当使用时（When to Use It）

Nystrom 建议在以下情况下**不要使用**单例：

1. **当你需要在测试中替换实现时**——单例让测试变得困难。
2. **当依赖关系不明显时**——应该通过参数传递依赖。
3. **当有更简单的替代方案时**——通常传递依赖是更好的选择。

他的建议是：**如果你在犹豫是否使用单例，答案很可能是"不"**。在大多数情况下，依赖注入或传递参数是更好的选择。

#### 注意事项（Keep in Mind）

Nystrom 提出了几个关键问题：

- **全局状态**：单例本质上是伪装的全局变量，而全局状态是软件复杂度的主要来源。
- **测试困难**：单例让单元测试变得困难，因为你无法轻松替换依赖。
- **初始化顺序**：多个单例之间的初始化顺序可能导致问题。
- **线程安全**：在多线程环境中，单例的初始化需要额外注意。

书中建议的替代方案是**服务定位器模式**——它提供了全局访问但不强制单一实例，更灵活。

#### 设计决策（Design Decisions）

Nystrom 讨论了几个设计决策：

1. **懒初始化 vs 急初始化**：懒初始化在第一次使用时创建，急初始化在程序启动时创建。
2. **线程安全实现**：使用 `sync.Once` 或双重检查锁。
3. **是否使用单例接口**：定义接口让测试可以替换实现。

#### 服务端应用场景

在游戏服务端中，单例的使用应该非常谨慎：

```go
// 不推荐：直接使用全局单例
type GameManager struct {
    // ...
}
var gameManager *GameManager

// 推荐：通过接口和依赖注入
type GameService interface {
    GetPlayer(id uint64) *Player
    Broadcast(msg Message)
}

type gameServiceImpl struct {
    players map[uint64]*Player
    mu      sync.RWMutex
}

// 通过构造函数注入依赖
func NewGameServer(gameService GameService) *GameServer {
    return &GameServer{
        gameService: gameService,
    }
}
```

**什么时候单例是合理的？** Nystrom 认为只有当一个类真正需要全局唯一时才使用单例，例如：
- 日志系统（通常只需要一个日志输出）
- 配置管理器（全局配置只有一份）

#### 参考（See Also）

- 单例模式的替代方案：**服务定位器模式**提供了更灵活的全局访问。
- 在**组件模式**中，通过依赖注入替代全局状态。

---

### 6. 状态模式（State）

#### 意图（Intent）

让一个对象在其内部状态改变时改变它的行为。对象看起来似乎修改了它的类。

#### 动机（Motivation）

Nystrom 在这一章坦承他"塞了太多东西进去"。他不仅讲了状态设计模式，还深入介绍了有限状态机（FSM）、层次状态机（HSM）和下推自动机（Pushdown Automata）。

他用一个横版平台游戏的女主角来举例。最简单的输入处理：

```go
func (h *Heroine) HandleInput(input Input) {
    if input == PRESS_B {
        h.YVelocity = JUMP_VELOCITY
        h.SetGraphics(IMAGE_JUMP)
    }
}
```

这段代码有 bug：女主角可以在空中无限跳跃（air jumping）。简单的修复是添加一个 `isJumping` 布尔值。但随着状态越来越多（跳跃、奔跑、俯身射击等），布尔值的组合爆炸会导致代码变得不可维护——这就是经典的"布尔变量地狱"。

Nystrom 指出，问题的根源在于我们试图用一个单一的类来表达不同的行为，而这些行为实际上应该被分成独立的状态。

#### 模式本身（The Pattern）

```go
// State 接口
type State interface {
    Enter(entity *Entity)
    Update(entity *Entity, dt float64)
    Exit(entity *Entity)
    HandleInput(entity *Entity, input Input)
}

// 状态上下文
type StateMachine struct {
    currentState State
    entity       *Entity
}

func (sm *StateMachine) ChangeState(newState State) {
    if sm.currentState != nil {
        sm.currentState.Exit(sm.entity)
    }
    sm.currentState = newState
    if sm.currentState != nil {
        sm.currentState.Enter(sm.entity)
    }
}

func (sm *StateMachine) Update(dt float64) {
    if sm.currentState != nil {
        sm.currentState.Update(sm.entity, dt)
    }
}

// 具体状态：空中状态
type AirborneState struct{}

func (s *AirborneState) Enter(entity *Entity) {
    entity.SetGraphics(IMAGE_JUMP)
}

func (s *AirborneState) Update(entity *Entity, dt float64) {
    // 应用重力
    entity.YVelocity += GRAVITY * dt
    entity.Position.Y += entity.YVelocity * dt
    
    // 着陆检查
    if entity.Position.Y <= GROUND_LEVEL {
        entity.Position.Y = GROUND_LEVEL
        entity.StateMachine.ChangeState(&OnGroundState{})
    }
}

func (s *AirborneState) HandleInput(entity *Entity, input Input) {
    // 空中不能跳跃
    if input == PRESS_B {
        // 忽略跳跃输入
    }
}

// 具体状态：地面状态
type OnGroundState struct{}

func (s *OnGroundState) HandleInput(entity *Entity, input Input) {
    if input == PRESS_B {
        entity.YVelocity = JUMP_VELOCITY
        entity.StateMachine.ChangeState(&AirborneState{})
    } else if input == PRESS_DOWN {
        entity.StateMachine.ChangeState(&DuckingState{})
    }
}
```

#### 当使用时（When to Use It）

Nystrom 指出状态模式适用于：

1. **一个对象的行为取决于它的状态**，并且它必须在运行时根据状态改变行为。
2. **代码中包含大量与状态相关的条件语句**，难以维护。
3. **状态转换逻辑复杂**，需要清晰的结构来管理。

#### 注意事项（Keep in Mind）

Nystrom 提醒几个重要问题：

- **状态数量膨胀**：太多状态会导致类爆炸。
- **状态之间的耦合**：状态之间需要知道彼此的存在来进行转换。
- **进入/退出操作**：不要忘记 `Enter` 和 `Exit` 方法，它们是状态转换的关键。
- **层次状态机（HSM）**：对于复杂的状态机，可以使用层次结构来组织状态，减少状态之间的直接依赖。

书中还介绍了下推自动机（Pushdown Automata），它使用栈来管理状态，允许"暂停"当前状态并在完成后恢复。这在游戏中很有用，比如角色在战斗中被打断后可以回到之前的状态。

#### 设计决策（Design Decisions）

Nystrom 讨论了几个关键决策：

1. **状态对象 vs 状态枚举**：状态模式使用对象，更灵活但更复杂；枚举更简单但功能有限。
2. **谁拥有状态转换逻辑？** 状态自己决定转换，还是外部代码决定？
3. **状态机的层次结构**：简单的状态机不需要层次，复杂的应该考虑。

#### 服务端应用场景

状态模式在服务端开发中至关重要：

```go
// 连接状态机
type ConnectionState interface {
    OnEnter(conn *Connection)
    OnMessage(conn *Connection, msg *Message)
    OnLeave(conn *Connection)
}

// 握手状态
type HandshakeState struct{}

func (s *HandshakeState) OnMessage(conn *Connection, msg *Message) {
    if msg.Type == MSG_AUTH_REQUEST {
        // 验证身份
        if s.authenticate(msg) {
            conn.ChangeState(&AuthenticatedState{})
        } else {
            conn.ChangeState(&DisconnectState{})
        }
    }
}

// 已认证状态
type AuthenticatedState struct{}

func (s *AuthenticatedState) OnMessage(conn *Connection, msg *Message) {
    switch msg.Type {
    case MSG_JOIN_GAME:
        conn.ChangeState(&InGameState{})
    case MSG_LOGOUT:
        conn.ChangeState(&DisconnectState{})
    }
}

// 游戏中状态
type InGameState struct{}

func (s *InGameState) OnMessage(conn *Connection, msg *Message) {
    switch msg.Type {
    case MSG_PLAYER_INPUT:
        s.handleInput(conn, msg)
    case MSG_LEAVE_GAME:
        conn.ChangeState(&AuthenticatedState{})
    case MSG_DISCONNECT:
        conn.ChangeState(&DisconnectState{})
    }
}
```

#### 参考（See Also）

- 状态模式与**更新方法模式**密切相关：状态对象的 `Update` 方法是更新方法模式的体现。
- 在**子类沙盒模式**中，每个子类定义自己的行为，类似于状态模式中每个状态定义自己的行为。

---

## 第三部分：序列型模式

---

### 7. 双缓冲（Double Buffer）

#### 意图（Intent）

通过缓冲区来解决读写操作不一致的问题——一个用于读取，另一个用于写入，然后在完成时交换。

#### 动机（Motivation）

Nystrom 用渲染管线来引入双缓冲模式。当 GPU 正在渲染当前帧（读取帧缓冲区）时，CPU 可以同时准备下一帧（写入另一个帧缓冲区）。当两边都完成时，交换两个缓冲区的角色。

关键问题是：如果我们只用一个缓冲区，CPU 在写入时 GPU 可能正在读取同一块内存，导致屏幕上出现撕裂（tearing）或闪烁。双缓冲通过确保读和写操作永远不会同时访问同一块内存来解决这个问题。

书中指出，双缓冲的核心概念是：**读和写操作使用不同的"版本"的数据**。在写入完成之前，读取操作看到的仍然是旧的、一致的版本。

#### 模式本身（The Pattern）

```go
// 双缓冲实现
type DoubleBuffer[T any] struct {
    readBuf  *Buffer[T]
    writeBuf *Buffer[T]
    mu       sync.RWMutex
}

type Buffer[T any] struct {
    data T
    ready bool
}

func NewDoubleBuffer[T any](initial T) *DoubleBuffer[T] {
    return &DoubleBuffer[T]{
        readBuf:  &Buffer[T]{data: initial, ready: true},
        writeBuf: &Buffer[T]{data: initial, ready: false},
    }
}

// 读取：获取当前一致的快照
func (db *DoubleBuffer[T]) Read() T {
    db.mu.RLock()
    defer db.mu.RUnlock()
    return db.readBuf.data
}

// 写入：修改写缓冲区
func (db *DoubleBuffer[T]) Write(data T) {
    db.mu.Lock()
    defer db.mu.Unlock()
    db.writeBuf.data = data
    db.writeBuf.ready = true
}

// 交换：原子性地交换读写缓冲区
func (db *DoubleBuffer[T]) Swap() {
    db.mu.Lock()
    defer db.mu.Unlock()
    if db.writeBuf.ready {
        db.readBuf, db.writeBuf = db.writeBuf, db.readBuf
        db.writeBuf.ready = false
    }
}
```

#### 当使用时（When to Use It）

书中指出双缓冲适用于：

1. **读写操作不是原子的**：读操作需要看到一致的数据。
2. **读和写同时进行**：需要避免读到中间状态。
3. **延迟可见性**：写入的结果应该在下一个"帧"才可见。

#### 注意事项（Keep in Mind）

- **双缓冲不能保证读取者看到最新的写入**——这是设计意图，不是 bug。
- **内存开销**：你需要两倍的内存来存储数据。
- **同步开销**：交换操作需要同步，可能成为瓶颈。

#### 服务端应用场景

双缓冲在服务端中有独特的应用：

```go
// 游戏世界状态的双缓冲
type WorldState struct {
    Players map[uint64]*PlayerState
    NPCs    map[uint64]*NPCState
    Items   map[uint64]*ItemState
}

type DoubleBufferedWorld struct {
    current *WorldState  // 当前帧的世界状态（供 AI、碰撞检测等读取）
    next    *WorldState  // 下一帧的世界状态（供输入处理写入）
    mu      sync.RWMutex
}

func (dw *DoubleBufferedWorld) ProcessInputs(inputs []PlayerInput) {
    dw.mu.Lock()
    defer dw.mu.Unlock()
    
    // 在写缓冲区上处理输入
    for _, input := range inputs {
        dw.next.ApplyInput(input)
    }
}

func (dw *DoubleBufferedWorld) GetSnapshot() *WorldState {
    dw.mu.RLock()
    defer dw.mu.RUnlock()
    // 返回当前帧的一致快照
    return dw.current
}

func (dw *DoubleBufferedWorld) AdvanceFrame() {
    dw.mu.Lock()
    defer dw.mu.Unlock()
    dw.current, dw.next = dw.next, dw.current
}
```

#### 参考（See Also）

- 双缓冲与**脏标记模式**可以配合使用：脏标记告诉缓冲区什么时候需要更新。
- 在**游戏循环模式**中，双缓冲是实现帧同步的关键技术。

---

### 8. 游戏循环（Game Loop）

#### 意图（Intent）

将游戏时间的推进与用户输入和处理器速度解耦。

#### 动机（Motivation）

Nystrom 指出，如果这本书只能有一个模式，那就是游戏循环。游戏循环是"游戏编程模式"的典范——几乎每个游戏都有一个，没有两个完全相同，而且很少有非游戏程序使用它们。

书中回顾了程序的进化历程：
1. **批处理程序**：输入 → 处理 → 输出，程序结束。
2. **交互式程序**：用户和程序交替工作，如最早的冒险游戏 Colossal Cave Adventure。
3. **事件驱动程序**：操作系统管理事件队列，程序在需要时拉取事件。
4. **游戏循环**：游戏程序自己控制主循环，定期处理所有输入并更新状态。

Nystrom 强调了游戏循环的核心挑战：**帧率不稳定**。在不同硬件上，一帧的处理时间不同。如果游戏逻辑和帧率绑定，游戏在快机器上会加速，在慢机器上会减速。

解决方案是将游戏更新与渲染解耦：

```go
// 最简单的游戏循环
func Run() {
    while (running) {
        processInput()
        update()
        render()
    }
}
```

但这种方式的问题是游戏更新速度取决于硬件性能。

#### 模式本身（The Pattern）

Nystrom 介绍了三种主要的游戏循环变体：

**变体一：固定时间步长**
```go
type GameLoop struct {
    tickDuration  time.Duration  // 固定的时间步长
    accumulator   time.Duration  // 时间累积器
    lastTime      time.Time
    running       bool
}

func (gl *GameLoop) Run() {
    gl.lastTime = time.Now()
    gl.running = true
    
    for gl.running {
        now := time.Now()
        frameTime := now.Sub(gl.lastTime)
        gl.lastTime = now
        
        gl.processInput()
        
        // 固定时间步长更新
        gl.accumulator += frameTime
        for gl.accumulator >= gl.tickDuration {
            gl.update(gl.tickDuration)
            gl.accumulator -= gl.tickDuration
        }
        
        // 插值渲染
        alpha := float64(gl.accumulator) / float64(gl.tickDuration)
        gl.render(alpha)
    }
}
```

**变体二：可变时间步长（不推荐）**
```go
// 不推荐：游戏逻辑和帧率耦合
func (gl *GameLoop) Run() {
    lastTime := time.Now()
    for gl.running {
        now := time.Now()
        dt := now.Sub(lastTime)
        lastTime = now
        
        gl.processInput()
        gl.update(dt)  // dt 不稳定导致物理模拟不稳定
        gl.render()
    }
}
```

**变体三：半固定时间步长**
```go
func (gl *GameLoop) Run() {
    const tickRate = time.Second / 20  // 每秒20次更新
    
    for gl.running {
        gl.processInput()
        
        // 固定时间步长更新
        gl.update(tickRate)
        
        // 尽可能快地渲染
        gl.render()
    }
}
```

#### 当使用时（When to Use It）

游戏循环适用于：
1. **任何实时游戏**——这是游戏程序的基础架构。
2. **需要稳定物理模拟的游戏**——固定时间步长是关键。
3. **服务端的游戏逻辑循环**——服务端也需要自己的游戏循环来处理游戏逻辑。

#### 注意事项（Keep in Mind）

Nystrom 提出了几个关键问题：

- **避免使用可变时间步长**：它会导致物理模拟不稳定。一个物体在16ms内移动1个单位和在32ms内移动2个单位是不同的，因为物理公式中的二次项。
- **处理时间跳跃**：当一帧处理时间过长时，累积器可能累积大量未处理的时间，导致"死亡螺旋"（spiral of death）。
- **渲染插值**：使用 alpha 值在两个游戏状态之间插值，使渲染更平滑。

#### 服务端应用场景

服务端游戏循环与客户端有显著不同：

```go
// 服务端游戏循环
type ServerGameLoop struct {
    tickRate      time.Duration
    systems       []System
    inputQueue    chan PlayerInput
    worldState    *WorldState
    clientManager *ClientManager
}

func (s *ServerGameLoop) Run() {
    ticker := time.NewTicker(s.tickRate)
    defer ticker.Stop()
    
    for {
        select {
        case input := <-s.inputQueue:
            // 收集玩家输入
            s.pendingInputs = append(s.pendingInputs, input)
        
        case <-ticker.C:
            // 固定时间步长处理
            s.processInputs(s.pendingInputs)
            s.pendingInputs = s.pendingInputs[:0]
            
            s.updateGameLogic()
            s.syncToClients()
            s.persistWorldState()
        }
    }
}
```

**服务端循环的关键差异**：
- 不需要渲染，但需要同步世界状态到客户端
- 需要处理网络延迟和输入预测
- 需要持久化世界状态
- 帧率通常比客户端低（如每秒20帧）

#### 参考（See Also）

- 游戏循环是**更新方法模式**的宿主：每个游戏系统的 `Update` 方法在游戏循环中被调用。
- **双缓冲模式**常与游戏循环配合，确保读写不冲突。

---

### 9. 更新方法（Update Method）

#### 意图（Intent）

通过让每个对象每帧执行一次自己的 `Update` 方法来模拟一组对象的持续行为。

#### 动机（Motivation）

Nystrom 指出，游戏通常有大量的"活"对象——角色、敌人、道具、粒子效果等。每个对象都需要在每一帧中做一些事情。更新方法模式为每个对象提供一个 `Update` 方法，由游戏循环统一调用。

但这个模式也带来了设计问题：不是所有对象都应该在每一帧更新。一个沉睡的僵尸不需要 AI 计算，一个远在地图另一端的玩家不需要物理模拟。

Nystrom 提出了几种优化策略：
1. **活动对象列表**：只更新"活动"的对象。
2. **空间分区**：只更新玩家附近的对象。
3. **基于优先级的更新**：重要的对象更频繁更新。

#### 模式本身（The Pattern）

```go
// 更新接口
type Updatable interface {
    Update(dt float64)
}

// 游戏对象管理器
type GameObjectManager struct {
    objects []Updatable
}

func (m *GameObjectManager) Update(dt float64) {
    for _, obj := range m.objects {
        obj.Update(dt)
    }
}

// 具体游戏对象
type NPC struct {
    Position    Vector3
    Health      int
    State       NPCState
    AIComponent *AIComponent
}

func (n *NPC) Update(dt float64) {
    n.AIComponent.Update(n, dt)
    n.State.Update(n, dt)
}

type AIComponent struct {
    behaviorTree *BehaviorTree
}

func (a *AIComponent) Update(npc *NPC, dt float64) {
    a.behaviorTree.Tick(npc, dt)
}
```

#### 当使用时（When to Use It）

更新方法模式适用于：
1. **游戏中的所有活跃实体**都需要在每帧做些事情。
2. **需要统一的更新接口**来管理不同类型的游戏对象。
3. **需要方便地添加和移除游戏对象**。

#### 注意事项（Keep in Mind）

- **不是所有对象都需要每帧更新**：使用条件更新或基于事件的更新来优化。
- **更新顺序很重要**：某些对象需要在其他对象之前更新（如物理在渲染之前）。
- **批量处理**：使用空间分区等技术来减少不必要的更新。

#### 服务端应用场景

```go
// 服务端实体更新管理器
type ServerEntityManager struct {
    entities map[uint64]*Entity
    mu       sync.RWMutex
}

func (m *ServerEntityManager) Update(dt float64) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    for _, entity := range m.entities {
        // 只更新附近的实体
        if entity.InActiveZone() {
            entity.Update(dt)
        }
    }
}

// 基于距离的更新优化
func (e *Entity) InActiveZone() bool {
    // 只更新玩家附近的实体
    for _, player := range e.world.GetNearbyPlayers(e.Position, UPDATE_RADIUS) {
        return true
    }
    return false
}
```

#### 参考（See Also）

- 更新方法模式是**游戏循环模式**的基础——游戏循环调用所有对象的更新方法。
- 与**状态模式**配合：每个状态对象有自己的更新逻辑。

---

## 第四部分：行为型模式

---

### 10. 字节码（Bytecode）

#### 意图（Intent）

将行为编码为一系列指令，然后使用虚拟机来解释执行这些指令，从而实现数据驱动的行为定制。

#### 动机（Motivation）

Nystrom 以游戏 AI 为例引入字节码模式。假设你正在为游戏中的生物编写 AI。每种生物有不同的行为：僵尸会跟踪玩家，精灵会逃跑，龙会喷火。如果用硬编码的 switch 语句：

```go
func (b *Behavior) Update(monster *Monster) {
    switch monster.Type {
    case ZOMBIE:
        // 僵尸 AI
    case SKELETON:
        // 骨骼 AI
    case OGRE:
        // 食人魔 AI
    // ... 每种怪物都要添加
    }
}
```

问题：
1. 每添加一种新怪物，都要修改这个函数。
2. 策划人员无法独立调整 AI 行为，必须找程序员。
3. 代码变得庞大且难以维护。

解决方案是将 AI 行为从代码中分离出来，用自定义的"脚本"来描述。字节码是最简单的脚本实现——它是一系列预定义的操作码（opcodes），由虚拟机解释执行。

#### 模式本身（The Pattern）

```go
// 指令集
type Opcode byte

const (
    OP_WANDER   Opcode = iota // 随机游走
    OP_SEEK                    // 寻找目标
    OP_FLEE                     // 逃离
    OP_ATTACK                   // 攻击
    OP_IF_HP_LOW               // 如果HP低
    OP_GOTO                     // 跳转
)

// 字节码虚拟机
type VM struct {
    bytecode []Opcode
    ip       int  // 指令指针
    stack    []interface{}
}

func (vm *VM) Execute(monster *Monster) {
    for vm.ip < len(vm.bytecode) {
        op := vm.bytecode[vm.ip]
        vm.ip++
        
        switch op {
        case OP_WANDER:
            monster.Wander()
        case OP_SEEK:
            target := monster.FindNearestEnemy()
            monster.MoveToward(target.Position)
        case OP_FLEE:
            threat := monster.FindNearestThreat()
            monster.MoveAway(threat.Position)
        case OP_ATTACK:
            target := monster.FindNearestEnemy()
            if monster.InRange(target) {
                monster.Attack(target)
            }
        case OP_IF_HP_LOW:
            if monster.HP < monster.MaxHP * 0.3 {
                vm.ip = vm.bytecode[vm.ip] // 跳转到逃跑指令
            } else {
                vm.ip++ // 跳过跳转目标
            }
        case OP_GOTO:
            vm.ip = vm.bytecode[vm.ip] // 无条件跳转
        }
    }
}
```

#### 当使用时（When to Use It）

书中指出字节码模式适用于：

1. **需要数据驱动的行为定制**：策划人员可以通过编辑脚本来调整行为。
2. **需要跨平台移植**：字节码可以在任何平台上运行。
3. **需要热重载**：修改脚本不需要重新编译。

#### 注意事项（Keep in Mind）

- **性能开销**：解释执行比原生代码慢。但对于 AI 这种不需要每帧执行的操作，通常可以接受。
- **调试困难**：字节码比源代码更难调试。
- **安全问题**：如果接受用户输入的脚本，需要沙箱环境。

#### 服务端应用场景

字节码在服务端中常用于：

```go
// 任务脚本虚拟机
type QuestVM struct {
    instructions []Instruction
    pc           int
    stack        []interface{}
    context      *QuestContext
}

// 技能效果脚本
type SkillEffectVM struct {
    bytecode    []byte
    pc          int
    caster      *Entity
    target      *Entity
    damageCalc  *DamageCalculator
}

func (vm *SkillEffectVM) Execute() []Effect {
    var effects []Effect
    
    for vm.pc < len(vm.bytecode) {
        op := vm.bytecode[vm.pc]
        vm.pc++
        
        switch op {
        case OP_APPLY_DAMAGE:
            dmg := vm.popInt()
            effects = append(effects, &DamageEffect{Amount: dmg})
        case OP_APPLY_BUFF:
            buffID := vm.popInt()
            duration := vm.popFloat()
            effects = append(effects, &BuffEffect{BuffID: buffID, Duration: duration})
        case OP_HEAL:
            amount := vm.popInt()
            effects = append(effects, &HealEffect{Amount: amount})
        }
    }
    return effects
}
```

#### 参考（See Also）

- 字节码模式是**类型对象模式**的特化：字节码定义了行为的"类型"。
- 与**子类沙盒模式**对比：子类沙盒用继承实现行为定制，字节码用数据。

---

### 11. 子类沙盒（Subclass Sandbox）

#### 意图（Intent）

在基类中定义一个"沙盒"方法和一些提供底层功能的原语，让子类通过组合这些原语来实现自己的行为。

#### 动机（Motivation）

Nystrom 以游戏中的各种"怪物"为例。假设你有一个游戏，怪物有很多种行为：行走、攻击、施法、死亡等。你可能会创建一个基类 `SuperMonster`，然后让各种怪物继承它。

问题在于：基类需要提供所有子类可能需要的功能。如果基类提供了 `moveTo()`、`playSound()`、`shootFireball()` 等方法，基类就变得庞大且与具体实现紧密耦合。

子类沙盒模式的解决方案是：基类提供一组"原语"（primitives），子类通过组合这些原语来实现自己的行为。基类是"沙盒"——子类只能在这个沙盒内操作，不能越界。

```go
// 沙盒基类
type Monster struct {
    position  Vector3
    health    int
    world     *World
    graphics  *Graphics
    audio     *AudioSystem
}

// 原语方法：子类可以使用这些方法
func (m *Monster) MoveTo(target Vector3) {
    m.position = target
    m.world.UpdatePosition(m)
}

func (m *Monster) PlaySound(SoundID) {
    m.audio.Play(SoundID, m.position)
}

func (m *Monster) ShootFireball(target Vector3, damage int) {
    fireball := NewFireball(m.position, target, damage)
    m.world.AddProjectile(fireball)
    m.PlaySound(SOUND_FIREBALL)
}

func (m *Monster) Die() {
    m.world.RemoveMonster(m)
    m.PlaySound(SOUND_DEATH)
    m.graphics.PlayEffect(EFFECT_DEATH, m.position)
}
```

#### 模式本身（The Pattern）

```go
// 沙盒基类：定义原语
type GameEntity struct {
    world *World
    // ... 其他共享资源
}

// 原语方法
func (e *GameEntity) moveBy(offset Vector3) {
    e.position = e.position.Add(offset)
}

func (e *GameEntity) playSound(id SoundID) {
    e.world.audio.Play(id, e.position)
}

func (e *GameEntity) emitParticles(position Vector3, count int) {
    e.world.particles.Emit(position, count)
}

// 具体实现：通过组合原语实现行为
type Zombie struct {
    GameEntity
    health int
}

func (z *Zombie) Update(dt float64) {
    // 沙盒：只能使用基类提供的原语
    if z.health <= 0 {
        z.playSound(SOUND_ZOMBIE_DEATH)
        z.emitParticles(z.position, 20)
        z.world.removeEntity(z)
        return
    }
    
    target := z.world.findNearestPlayer(z.position)
    if target != nil {
        z.moveBy(target.Position.Sub(z.position).Normalized().Mul(2.0 * dt))
    }
}
```

#### 当使用时（When to Use It）

书中指出子类沙盒适用于：

1. **需要为不同子类提供不同行为，但共享相同的底层能力**。
2. **基类是框架的一部分**，子类由不同团队或策划人员编写。
3. **需要防止子类绕过安全检查**。

#### 注意事项（Keep in Mind）

- **原语方法要精心设计**：太少会导致子类无法实现功能，太多会导致基类臃肿。
- **原语方法应该是"安全"的**：子类调用原语方法应该总是有效的，不需要额外的检查。
- **性能考虑**：原语方法可能包含一些通用操作（如更新场景图），但不是每个子类都需要所有操作。

#### 服务端应用场景

```go
// AI 行为沙盒
type AIEntity struct {
    world *World
    // 底层服务引用
}

// 原语方法
func (e *AIEntity) moveTo(pos Vector3) { /* ... */ }
func (e *AIEntity) attack(target Entity) { /* ... */ }
func (e *AIEntity) castSpell(spellID int, target Vector3) { /* ... */ }
func (e *AIEntity) callForHelp() { /* ... */ }

// 具体 AI：Boss 战行为
type BossAI struct {
    AIEntity
    phase      int
    rageTimer  float64
    minionIDs  []int
}

func (b *BossAI) Update(dt float64) {
    switch b.phase {
    case 1:
        // 第一阶段：普通攻击
        target := b.world.nearestEnemy(b.position)
        if target != nil {
            b.attack(target)
        }
    case 2:
        // 第二阶段：召唤小怪
        b.rageTimer += dt
        if b.rageTimer > 10.0 {
            b.callForHelp()
            b.rageTimer = 0
        }
    case 3:
        // 第三阶段：范围攻击
        b.castSpell(SPELL_AOE, b.position)
    }
}
```

#### 参考（See Also）

- 子类沙盒与**组件模式**的对比：组件模式用组合替代继承，子类沙盒用继承但限制子类的能力。
- 与**类型对象模式**配合：类型对象可以定义子类沙盒中子类的行为数据。

---

### 12. 类型对象（Type Object）

#### 意图（Intent）

通过允许你通过创建新的"类型"对象来定义新类型，从而在运行时创建新的类型。

#### 动机（Motivation）

Nystrom 以游戏中的生物品种为例。策划人员想要设计不同品种的生物：巨魔有48点生命值和15点攻击力，食人魔有60点生命值和8点攻击力。如果用类继承：

```go
type Troll struct { /* ... */ }  // 巨魔
type Goblin struct { /* ... */ }  // 哥布林
// 每种生物都要创建一个新类
```

问题在于：每次策划人员想调整一个数值（比如把巨魔的生命值从48改为52），都要重新编译整个游戏。这导致了一天的工作变成了反复的编译循环。

解决方案是将"类型"本身定义为一个对象。一个"巨魔"类型包含巨魔的所有属性，而不需要为每种生物创建新类。

```go
// 类型对象
type Breed struct {
    Name   string
    Health int
    Attack int
    Defense int
}

// 实例
type Monster struct {
    breed *Breed
    hp    int
}

func NewMonster(breed *Breed) *Monster {
    return &Monster{
        breed: breed,
        hp:    breed.Health,
    }
}

func (m *Monster) Attack(other *Monster) int {
    damage := m.breed.Attack - other.breed.Defense
    if damage < 0 {
        damage = 0
    }
    other.hp -= damage
    return damage
}
```

#### 模式本身（The Pattern）

```go
// 类型对象：定义生物品种
type Breed struct {
    Name        string
    Health      int
    Attack      int
    Defense     int
    Speed       float64
    AttackRange float64
    Skills      []int
    LootTable   []LootEntry
    
    // 引用其他类型（可选）
    ParentBreed *Breed
}

func (b *Breed) CreateMonster() *Monster {
    return &Monster{
        breed: b,
        hp:    b.Health,
        // ... 初始化其他属性
    }
}

// 继承支持：子品种继承父品种的属性
func (b *Breed) GetEffectiveStat(stat string) int {
    if b.ParentBreed != nil {
        // 没有覆盖的属性使用父品种的值
        return b.ParentBreed.GetEffectiveStat(stat)
    }
    return b.getStatValue(stat)
}

// 类型注册表
type BreedRegistry struct {
    breeds map[string]*Breed
}

func (r *BreedRegistry) GetBreed(name string) *Breed {
    return r.breeds[name]
}
```

#### 当使用时（When to Use It）

书中指出类型对象适用于：

1. **需要在运行时定义新类型**，而不是在编译时。
2. **数据驱动的设计**：让设计师通过数据而非代码来定义游戏内容。
3. **避免类爆炸**：不需要为每种变体创建新类。

#### 注意事项（Keep in Mind）

- **类型对象的继承**：如果支持继承（子品种继承父品种），需要处理属性覆盖和默认值。
- **类型对象的修改**：运行时修改类型对象会影响所有使用该类型的实例。
- **性能考虑**：通过间接引用（指针）访问属性比直接访问慢。

#### 服务端应用场景

类型对象在服务端中极为重要：

```go
// 从配置加载类型对象
type MonsterType struct {
    ConfigID  int32   `json:"config_id"`
    Name      string  `json:"name"`
    Level     int32   `json:"level"`
    HP        int32   `json:"hp"`
    ATK       int32   `json:"atk"`
    DEF       int32   `json:"def"`
    Skills    []int32 `json:"skills"`
    SpawnRate float64 `json:"spawn_rate"`
}

// 类型注册表
type MonsterTypeRegistry struct {
    types map[int32]*MonsterType
}

func (r *MonsterTypeRegistry) LoadFromDB(db *sql.DB) error {
    rows, err := db.Query("SELECT * FROM monster_types")
    if err != nil {
        return err
    }
    defer rows.Close()
    
    for rows.Next() {
        mt := &MonsterType{}
        err := rows.Scan(&mt.ConfigID, &mt.Name, &mt.Level, &mt.HP, &mt.ATK, &mt.DEF)
        if err != nil {
            return err
        }
        r.types[mt.ConfigID] = mt
    }
    return nil
}

// 运行时创建实例
func (r *MonsterTypeRegistry) SpawnMonster(typeID int32, pos Vector3) *Monster {
    mt := r.types[typeID]
    return &Monster{
        TypeID:   mt.ConfigID,
        HP:       mt.HP,
        Position: pos,
    }
}
```

#### 参考（See Also）

- 类型对象与**享元模式**密切相关：类型对象就是享元。
- 类型对象与**原型模式**的区别：类型对象定义"类型"，原型定义"实例"。
- 类型对象与**子类沙盒模式**配合：类型对象定义行为数据，子类沙盒定义行为逻辑。

---

## 第五部分：解耦型模式

---

### 13. 组件模式（Component）

#### 意图（Intent）

允许单个实体跨越多个领域，而不耦合这些领域。

#### 动机（Motivation）

Nystrom 用了一个丹麦面包师 Bjørn 来举例。在一个平台游戏中，Bjørn 需要处理用户输入、物理碰撞、动画渲染、声音播放等。如果把这些全部塞进一个类：

```
class Bjorn {
    // 输入处理
    // 物理模拟
    // 动画渲染
    // 声音播放
    // AI 行为
    // 5000行代码...
}
```

这违反了"不同领域应该隔离"的软件架构原则。物理代码不应该依赖渲染代码，AI 代码不应该依赖物理代码。但它们都被塞进了一个巨大的类中。

Nystrom 指出两个核心问题：
1. **规模问题**：一个5000行的类，修改任何东西都要小心翼翼。
2. **耦合问题**：物理、渲染、声音系统被绑在一起，修改一个可能影响另一个。

解决方案是"用剑切断这个结"：将 Bjørn 类按照领域边界切分成独立的组件。每个组件负责自己的领域，通过接口通信。

#### 模式本身（The Pattern）

```go
// 组件接口
type Component interface {
    Update(dt float64)
}

// 实体：组件的容器
type Entity struct {
    ID         uint64
    components map[string]Component
}

func (e *Entity) AddComponent(name string, c Component) {
    e.components[name] = c
}

func (e *Entity) GetComponent(name string) Component {
    return e.components[name]
}

func (e *Entity) Update(dt float64) {
    for _, c := range e.components {
        c.Update(dt)
    }
}

// 具体组件
type PhysicsComponent struct {
    entity *Entity
    velocity Vector3
}

func (pc *PhysicsComponent) Update(dt float64) {
    pc.entity.Position = pc.entity.Position.Add(pc.velocity.Mul(dt))
}

type RenderComponent struct {
    entity *Entity
    sprite *Sprite
}

func (rc *RenderComponent) Update(dt float64) {
    rc.sprite.Position = rc.entity.Position
    rc.sprite.Render()
}

type InputComponent struct {
    entity *Entity
}

func (ic *InputComponent) Update(dt float64) {
    if input.IsPressed(ButtonX) {
        ic.entity.GetComponent("physics").(*PhysicsComponent).velocity.Y = JUMP_VEL
    }
}
```

Nystrom 强调，组件模式的一个关键优势是**可重用性**。相同的 `PhysicsComponent` 可以用于角色、敌人、道具等任何需要物理模拟的实体。

#### 当使用时（When to Use It）

书中指出组件模式适用于：

1. **实体跨越多个领域**：一个对象同时需要物理、渲染、AI 等。
2. **需要跨实体重用功能**：多个实体共享相同的行为（如所有可移动物体都有物理组件）。
3. **避免深层继承层次**：继承层次太深会导致灵活性下降。

#### 注意事项（Keep in Mind）

- **组件之间的通信**：组件需要与同一实体上的其他组件通信，但不应该直接引用它们。
- **性能开销**：通过接口调用比直接方法调用慢，需要权衡。
- **设计复杂度**：组件模式增加了架构复杂度，小项目可能不需要。

#### 服务端应用场景

组件模式在服务端中以 ECS（Entity-Component-System）架构的形式广泛应用：

```go
// 组件：纯数据
type PositionComponent struct {
    X, Y, Z float64
}

type HealthComponent struct {
    Current int32
    Max     int32
}

type AIComponent struct {
    BehaviorID int32
    State      string
    TargetID   uint64
}

type NetworkSyncComponent struct {
    Dirty    bool
    LastSync int64
}

// 系统：处理逻辑
type MovementSystem struct {
    world *World
}

func (s *MovementSystem) Update(dt float64) {
    for _, entity := range s.world.GetEntitiesWith("position", "velocity") {
        pos := entity.GetComponent("position").(*PositionComponent)
        vel := entity.GetComponent("velocity").(*VelocityComponent)
        
        pos.X += vel.X * dt
        pos.Y += vel.Y * dt
        pos.Z += vel.Z * dt
        
        // 标记需要同步
        if sync := entity.GetComponent("network_sync"); sync != nil {
            sync.(*NetworkSyncComponent).Dirty = true
        }
    }
}

// 系统更新管理器
type SystemManager struct {
    systems []System
}

func (sm *SystemManager) Update(dt float64) {
    for _, sys := range sm.systems {
        sys.Update(dt)
    }
}
```

#### 参考（See Also）

- 组件模式是**子类沙盒模式**的替代方案：两者都实现行为组合，但方式不同。
- 组件模式与**服务定位器模式**配合：组件通过服务定位器获取共享服务。

---

### 14. 事件队列（Event Queue）

#### 意图（Intent）

将消息或事件的发送时间与处理时间解耦。

#### 动机（Motivation）

Nystrom 以 GUI 事件循环为例引入事件队列。操作系统生成事件（按钮点击、菜单选择等），将其放入队列，应用程序在需要时从队列中拉取事件。

关键观察是：**应用程序在它想要的时候拉取事件**，而不是操作系统强制推送。队列确保事件不会丢失。

Nystrom 还提到了"中央事件总线"的概念：游戏内部使用事件队列作为神经系统，不同游戏系统通过它通信而不直接耦合。

他举了音效系统的例子：物理引擎检测到石头落地，AI 发现敌人被击中，UI 收到用户点击——这些系统都需要播放音效。如果直接调用音频系统，它们都会与音频系统耦合。更好的方式是发送事件到事件队列，音频系统从中拉取并处理。

#### 模式本身（The Pattern）

```go
// 事件
type Event struct {
    Type    string
    Payload interface{}
    Time    time.Time
}

// 事件队列
type EventQueue struct {
    queue   chan Event
    mu      sync.Mutex
    handlers map[string][]EventHandler
}

type EventHandler func(Event)

func NewEventQueue(capacity int) *EventQueue {
    return &EventQueue{
        queue:    make(chan Event, capacity),
        handlers: make(map[string][]EventHandler),
    }
}

func (eq *EventQueue) Push(event Event) {
    eq.queue <- event
}

func (eq *EventQueue) Pop() (Event, bool) {
    select {
    case event := <-eq.queue:
        return event, true
    default:
        return Event{}, false
    }
}

// 注册事件处理器
func (eq *EventQueue) On(eventType string, handler EventHandler) {
    eq.mu.Lock()
    defer eq.mu.Unlock()
    eq.handlers[eventType] = append(eq.handlers[eventType], handler)
}

// 事件循环
func (eq *EventQueue) Run() {
    for event := range eq.queue {
        eq.mu.RLock()
        handlers := eq.handlers[event.Type]
        eq.mu.RUnlock()
        
        for _, handler := range handlers {
            handler(event)
        }
    }
}
```

#### 当使用时（When to Use It）

书中指出事件队列适用于：

1. **需要解耦发送者和接收者**：发送者不需要知道谁在处理事件。
2. **需要异步处理**：事件可以在未来某个时刻处理。
3. **需要平滑负载**：队列可以缓冲突发的事件洪峰。

#### 注意事项（Keep in Mind）

- **队列大小**：队列满时如何处理？阻塞发送者还是丢弃事件？
- **事件顺序**：队列保证先进先出，但处理时间不同可能导致乱序。
- **内存管理**：事件对象如果被长时间持有，可能导致内存压力。
- **死锁风险**：如果事件处理函数又发送事件，可能导致死锁。

#### 服务端应用场景

事件队列是服务端架构的核心：

```go
// 服务端事件系统
type ServerEvent struct {
    Type     string
    PlayerID uint64
    Data     []byte
    Time     time.Time
}

type EventProcessor struct {
    incoming chan ServerEvent
    handlers map[string][]func(ServerEvent)
    mu       sync.RWMutex
}

// 网络层 -> 事件队列 -> 逻辑层 -> 事件队列 -> 网络层
func (ep *EventProcessor) Run() {
    for event := range ep.incoming {
        ep.mu.RLock()
        handlers := ep.handlers[event.Type]
        ep.mu.RUnlock()
        
        for _, handler := range handlers {
            handler(event)
        }
    }
}

// 使用示例
func setupEventHandlers(ep *EventProcessor) {
    // 登录事件
    ep.On("player_login", func(event ServerEvent) {
        player := loadPlayer(event.PlayerID)
        broadcastToWorld("player_enter", player)
    })
    
    // 攻击事件
    ep.On("player_attack", func(event ServerEvent) {
        // 处理攻击逻辑
        resolveAttack(event)
    })
    
    // 道具拾取事件
    ep.On("item_pickup", func(event ServerEvent) {
        // 处理拾取逻辑
        handleItemPickup(event)
    })
}
```

#### 参考（See Also）

- 事件队列是**观察者模式**的异步版本。
- 事件队列与**命令模式**配合：命令可以作为事件放入队列。
- 在**游戏循环模式**中，事件队列处理输入和系统间通信。

---

### 15. 服务定位器（Service Locator）

#### 意图（Intent）

提供一个服务的全局访问点，但不将使用者耦合到该服务的具体实现类。

#### 动机（Motivation）

Nystrom 指出，有些系统（如日志、音频、内存分配器）几乎被游戏的所有部分使用。问题是：每个需要这些服务的代码都需要知道如何获取服务实例。

他用了一个优美的比喻：与其给一百个陌生人你的家庭地址，不如给他们一个电话簿的条目。当你的地址改变时，只需要更新电话簿，所有人都自动获得新地址。

```go
// 不好的方式：直接引用具体类
AudioSystem::playSound(VERY_LOUD_BANG);

// 服务定位器方式：通过名称查找服务
ServiceLocator::GetAudio()->playSound(VERY_LOUD_BANG);
```

Nystrom 强调，服务定位器不强制单一实例（不像单例），也不强制特定的获取方式。它提供了一种灵活的方式来让代码访问服务。

#### 模式本身（The Pattern）

```go
// 服务接口
type AudioService interface {
    PlaySound(id SoundID, volume int)
    StopAll()
}

// 服务定位器
type ServiceLocator struct {
    services map[string]interface{}
    mu       sync.RWMutex
}

var globalLocator = &ServiceLocator{
    services: make(map[string]interface{}),
}

func Provide(name string, service interface{}) {
    globalLocator.mu.Lock()
    defer globalLocator.mu.Unlock()
    globalLocator.services[name] = service
}

func GetService(name string) interface{} {
    globalLocator.mu.RLock()
    defer globalLocator.mu.RUnlock()
    return globalLocator.services[name]
}

// 使用示例
func main() {
    // 注册服务
    audio := NewAudioSystem()
    Provide("audio", audio)
    
    // 使用服务
    svc := GetService("audio").(AudioService)
    svc.PlaySound(SOUND_EXPLOSION, 100)
}

// 测试时可以替换服务
func TestSomething() {
    mockAudio := &MockAudioService{}
    Provide("audio", mockAudio)
    // 测试代码使用 mock 服务
}
```

#### 当使用时（When to Use It）

书中指出服务定位器适用于：

1. **需要全局访问的服务**：日志、音频、网络等。
2. **需要在测试中替换实现**：单例做不到这一点。
3. **服务的具体类型不应该暴露给使用者**。

#### 注意事项（Keep in Mind）

Nystrom 提出了几个关键警示：

- **隐藏依赖**：服务定位器让依赖关系变得不明显。函数签名中看不出它需要哪些服务。
- **运行时错误**：如果忘记注册服务，在运行时才会出错（而不是编译时）。
- **全局状态**：服务定位器本质上是全局状态，只是比单例更灵活。
- **Nystrom 的建议**：优先使用依赖注入，只在确实需要时才用服务定位器。

#### 设计决策（Design Decisions）

1. **服务注册方式**：谁负责注册服务？程序启动时？第一次使用时？
2. **服务查找方式**：按名称字符串？按接口类型？
3. **服务生命周期**：服务在什么时候创建和销毁？

#### 服务端应用场景

```go
// 服务定位器实现
type ServiceContainer struct {
    services map[string]interface{}
    mu       sync.RWMutex
}

func (sc *ServiceContainer) Register(name string, svc interface{}) {
    sc.mu.Lock()
    defer sc.mu.Unlock()
    sc.services[name] = svc
}

func (sc *ServiceContainer) Get(name string) (interface{}, bool) {
    sc.mu.RLock()
    defer sc.mu.RUnlock()
    svc, ok := sc.services[name]
    return svc, ok
}

// 类型安全的包装
type GameServices struct {
    container *ServiceContainer
}

func (gs *GameServices) GetDatabase() *Database {
    svc, ok := gs.container.Get("database")
    if !ok {
        panic("database service not registered")
    }
    return svc.(*Database)
}

func (gs *GameServices) GetCache() *Cache {
    svc, ok := gs.container.Get("cache")
    if !ok {
        panic("cache service not registered")
    }
    return svc.(*Cache)
}

// 使用
func handlePlayerLogin(gs *GameServices, playerID uint64) {
    db := gs.GetDatabase()
    cache := gs.GetCache()
    
    // 从缓存或数据库加载玩家数据
    player := cache.GetPlayer(playerID)
    if player == nil {
        player = db.LoadPlayer(playerID)
        cache.SetPlayer(playerID, player)
    }
}
```

#### 参考（See Also）

- 服务定位器是单例模式的更灵活替代方案。
- 与**组件模式**配合：组件通过服务定位器获取共享服务。
- 与**事件队列**配合：服务通过事件队列通信。

---

## 第六部分：优化型模式

---

### 16. 数据局部性（Data Locality）

#### 意图（Intent）

通过安排数据布局来利用 CPU 缓存，从而加速内存访问。

#### 动机（Motivation）

Nystrom 用了一个生动的比喻：想象你是一个会计，在一个小办公室里工作。你的工作是请求一盒文件，然后做一些会计工作。这些文件存储在单独建筑的仓库里。你可以在一分钟内处理完一盒文件，但仓库管理员需要一整天才能取回一盒文件。

解决方案是：仓库管理员一次搬运整个托盘的文件。如果你需要的文件恰好在托盘上，你可以在一秒钟内拿到它，而不需要等待一整天。

这就是 CPU 缓存的工作原理：CPU 一次从 RAM 加载一整块数据（缓存行），而不是只加载一个字节。如果你的数据在内存中是连续存放的，CPU 可以高效地预取数据；如果数据分散在内存各处，CPU 就不得不频繁地从 RAM 加载数据。

Nystrom 指出，这是游戏开发中最容易被忽视的性能优化之一。传统的面向对象编程（每个对象分配在堆上，指针指向不同的内存位置）会导致缓存不友好。

```go
// 缓存不友好的设计：指针链接
type Unit struct {
    Position *Vector3
    Health   *int
    AI       *AIComponent
}
// 每个字段可能在不同的内存位置

// 缓存友好的设计：连续存储
type UnitArray struct {
    positions []Vector3  // 连续存储所有位置
    healths   []int      // 连续存储所有生命值
    aiStates  []AIState  // 连续存储所有 AI 状态
}
```

#### 模式本身（The Pattern）

```go
// 数据导向设计：按组件存储
type World struct {
    // 每个组件单独连续存储
    positions []Vector3
    velocities []Vector3
    healths   []int32
    aiStates  []AIState
    
    entityCount int
    entityMask  []bool  // 标记哪些槽位被使用
}

// 添加实体：找到空闲槽位
func (w *World) AddEntity(pos Vector3, vel Vector3, hp int32) int {
    slot := w.findEmptySlot()
    w.positions[slot] = pos
    w.velocities[slot] = vel
    w.healths[slot] = hp
    w.entityMask[slot] = true
    w.entityCount++
    return slot
}

// 更新系统：连续遍历数组
func (w *World) UpdatePhysics(dt float64) {
    for i := 0; i < len(w.positions); i++ {
        if !w.entityMask[i] {
            continue
        }
        // 数据在内存中连续，CPU 缓存友好
        w.positions[i].X += w.velocities[i].X * dt
        w.positions[i].Y += w.velocities[i].Y * dt
        w.positions[i].Z += w.velocities[i].Z * dt
    }
}
```

#### 当使用时（When to Use It）

书中指出数据局部性适用于：

1. **性能关键的循环**：如物理模拟、碰撞检测、AI 更新等。
2. **大量相似对象**：如粒子系统、单位管理器等。
3. **缓存成为瓶颈时**：当 CPU 大部分时间在等待内存时。

#### 注意事项（Keep in Mind）

- **代码可读性下降**：数据导向设计比面向对象设计更难理解。
- **灵活性降低**：连续存储意味着删除和插入更困难。
- **不是万能药**：只有在性能确实成为瓶颈时才值得使用。

#### 服务端应用场景

```go
// 服务端：高性能实体管理
type EntityStore struct {
    // 连续存储的组件数据
    ids       []uint64
    positions []Vector3
    healths   []int32
    aoiFlags  []bool  // 是否在 AOI 范围内
    
    size     int
    maxSlots int
}

// 空间查询：利用数据局部性
func (es *EntityStore) GetNearbyEntities(pos Vector3, radius float64) []uint64 {
    var result []uint64
    
    // 连续遍历数组，CPU 缓存友好
    for i := 0; i < es.size; i++ {
        dx := es.positions[i].X - pos.X
        dy := es.positions[i].Y - pos.Y
        dz := es.positions[i].Z - pos.Z
        
        if dx*dx + dy*dy + dz*dz <= radius*radius {
            result = append(result, es.ids[i])
        }
    }
    return result
}

// 批量同步：连续内存访问
func (es *EntityStore) GetDirtyEntities() []EntityState {
    var dirty []EntityState
    for i := 0; i < es.size; i++ {
        if es.aoiFlags[i] {
            dirty = append(dirty, EntityState{
                ID:       es.ids[i],
                Position: es.positions[i],
                Health:   es.healths[i],
            })
        }
    }
    return dirty
}
```

#### 参考（See Also）

- 数据局部性是 **ECS 架构**的理论基础。
- 与**对象池模式**配合：对象池确保对象在内存中连续分配。
- 与**空间分区模式**配合：空间分区组织数据以提高查询效率。

---

### 17. 脏标记（Dirty Flag）

#### 意图（Intent）

通过延迟不必要的工作直到结果真正需要时才执行，从而避免不必要的工作。

#### 动机（Motivation）

Nystrom 以场景图（Scene Graph）为例引入脏标记模式。场景图是一个包含世界中所有对象的数据结构，渲染引擎用它来确定在哪里绘制东西。

场景图通常是层次化的：对象有父对象，其变换（transform）是相对于父对象的。例如，船上的桅杆、桅杆上的瞭望台、瞭望台上的海盗、海盗肩上的鹦鹉。当船移动时，所有子对象都跟着移动。

问题是：为了渲染鹦鹉，我们需要知道它在世界中的绝对位置。这需要从根节点一路计算到鹦鹉。如果每帧都重新计算所有对象的世界变换，即使它们没有移动，也是极大的浪费。

解决方案是使用**缓存的世界变换**和**脏标记**：
- 每个对象存储自己的世界变换。
- 当对象的局部变换改变时，标记为"脏"。
- 只在渲染时重新计算"脏"对象的世界变换。

```go
type SceneNode struct {
    localTransform  Matrix4x4
    worldTransform  Matrix4x4
    dirty           bool
    parent          *SceneNode
    children        []*SceneNode
}

// 当局部变换改变时
func (n *SceneNode) SetLocalTransform(t Matrix4x4) {
    n.localTransform = t
    n.markDirty()
}

func (n *SceneNode) markDirty() {
    if n.dirty {
        return  // 已经是脏的了
    }
    n.dirty = true
    for _, child := range n.children {
        child.markDirty()
    }
}

// 渲染时
func (n *SceneNode) GetWorldTransform() Matrix4x4 {
    if n.dirty {
        if n.parent != nil {
            n.worldTransform = n.parent.GetWorldTransform().Mul(n.localTransform)
        } else {
            n.worldTransform = n.localTransform
        }
        n.dirty = false
    }
    return n.worldTransform
}
```

#### 模式本身（The Pattern）

```go
// 通用脏标记
type DirtyFlag struct {
    dirty   bool
    data    interface{}
    compute func() interface{}
}

func (df *DirtyFlag) Get() interface{} {
    if df.dirty {
        df.data = df.compute()
        df.dirty = false
    }
    return df.data
}

func (df *DirtyFlag) MarkDirty() {
    df.dirty = true
}

// 使用示例：服务器状态缓存
type ServerState struct {
    worldState     *WorldState
    stateDirty     bool
    computeState   func() *WorldState
}

func (ss *ServerState) GetState() *WorldState {
    if ss.stateDirty {
        ss.worldState = ss.computeState()
        ss.stateDirty = false
    }
    return ss.worldState
}

// 当任何实体改变时
func (ss *ServerState) OnEntityChanged() {
    ss.stateDirty = true
}
```

#### 当使用时（When to Use It）

书中指出脏标记适用于：

1. **计算结果可能在多次使用之间不变**：避免重复计算。
2. **计算成本高**：如复杂的矩阵运算、世界状态快照等。
3. **需要在多个地方使用同一结果**：缓存并标记脏。

#### 注意事项（Keep in Mind）

- **脏标记的传播**：父节点变脏时，所有子节点也应该变脏。
- **清除时机**：在什么时候清除脏标记？渲染后？每帧结束时？
- **线程安全**：脏标记需要考虑并发访问。

#### 服务端应用场景

脏标记在服务端中有广泛应用：

```go
// 玩家视野（AOI）脏标记
type PlayerAOI struct {
    playerID   uint64
    position   Vector3
    dirty      bool
    nearbyList []uint64  // 附近的玩家列表
}

func (p *PlayerAOI) OnMove(newPos Vector3) {
    p.position = newPos
    p.dirty = true
}

func (p *PlayerAOI) GetNearby() []uint64 {
    if p.dirty {
        p.nearbyList = spatialQuery(p.position, AOI_RADIUS)
        p.dirty = false
    }
    return p.nearbyList
}

// 每帧只同步脏数据
type SyncManager struct {
    dirtyEntities map[uint64]bool
}

func (sm *SyncManager) MarkDirty(entityID uint64) {
    sm.dirtyEntities[entityID] = true
}

func (sm *SyncManager) Flush() {
    for entityID := range sm.dirtyEntities {
        sm.syncToClients(entityID)
    }
    // 清除所有脏标记
    sm.dirtyEntities = make(map[uint64]bool)
}
```

#### 参考（See Also）

- 脏标记与**双缓冲模式**配合：脏标记告诉缓冲区什么时候需要更新。
- 与**数据局部性**配合：脏标记可以减少不必要的数据遍历。

---

### 18. 对象池（Object Pool）

#### 意图（Intent）

通过从固定池中重用对象来改善性能和内存使用，而不是单独分配和释放对象。

#### 动机（Motivation）

Nystrom 以粒子系统为例引入对象池。当英雄施法时，数百个粒子同时产生。系统需要非常快速地创建这些粒子，更重要的是，创建和销毁这些粒子不应该导致**内存碎片化**。

内存碎片化意味着堆中的空闲空间被分割成许多小块，而不是一个大的连续块。总空闲内存可能很大，但最大的连续区域可能非常小。如果尝试分配一个12字节的对象但只有两个7字节的碎片可用，分配就会失败。

对象池的解决方案是：**启动时分配一大块内存，运行期间不释放它**。池管理这些内存的使用，对象可以自由创建和销毁，但底层的内存分配不会发生。

#### 模式本身（The Pattern）

```go
// 对象池实现
type ObjectPool[T any] struct {
    pool     chan *T
    factory  func() *T
    reset    func(*T)
    size     int
}

func NewObjectPool[T any](size int, factory func() *T, reset func(*T)) *ObjectPool[T] {
    p := &ObjectPool[T]{
        pool:    make(chan *T, size),
        factory: factory,
        reset:   reset,
        size:    size,
    }
    
    // 预创建所有对象
    for i := 0; i < size; i++ {
        p.pool <- factory()
    }
    return p
}

func (p *ObjectPool[T]) Get() *T {
    select {
    case obj := <-p.pool:
        return obj
    default:
        // 池空了，创建新对象
        return p.factory()
    }
}

func (p *ObjectPool[T]) Put(obj *T) {
    p.reset(obj)
    select {
    case p.pool <- obj:
        // 归还到池中
    default:
        // 池满了，丢弃对象
    }
}

// 使用示例
type Projectile struct {
    Position  Vector3
    Velocity  Vector3
    Damage    int
    Active    bool
}

var projectilePool = NewObjectPool(1000,
    func() *Projectile {
        return &Projectile{}
    },
    func(p *Projectile) {
        p.Position = Vector3{}
        p.Velocity = Vector3{}
        p.Damage = 0
        p.Active = false
    },
)

func FireProjectile(pos, vel Vector3, dmg int) *Projectile {
    p := projectilePool.Get()
    p.Position = pos
    p.Velocity = vel
    p.Damage = dmg
    p.Active = true
    return p
}

func DestroyProjectile(p *Projectile) {
    projectilePool.Put(p)
}
```

#### 当使用时（When to Use It）

书中指出对象池适用于：

1. **频繁创建和销毁对象**：如粒子、子弹、网络包等。
2. **对象大小相似**：池中的对象应该大小一致。
3. **堆分配缓慢或导致碎片化**。
4. **每个对象封装了昂贵的资源**：如数据库连接、网络连接等。

#### 注意事项（Keep in Mind）

- **池的大小调优**：太小会导致频繁创建新对象，太大会浪费内存。
- **对象重置**：归还对象时必须完全重置其状态，否则会出现脏数据。
- **线程安全**：多线程环境下需要加锁或使用无锁数据结构。

#### 服务端应用场景

对象池在服务端中极为重要：

```go
// 网络包对象池
type PacketPool struct {
    pool chan *Packet
}

type Packet struct {
    Buffer   []byte
    Length   int
    Conn     net.Conn
    Received time.Time
}

func NewPacketPool(size int, bufferSize int) *PacketPool {
    pp := &PacketPool{
        pool: make(chan *Packet, size),
    }
    for i := 0; i < size; i++ {
        pp.pool <- &Packet{
            Buffer: make([]byte, bufferSize),
        }
    }
    return pp
}

func (pp *PacketPool) Acquire() *Packet {
    select {
    case pkt := <-pp.pool:
        return pkt
    default:
        return &Packet{
            Buffer: make([]byte, 4096),
        }
    }
}

func (pp *PacketPool) Release(pkt *Packet) {
    pkt.Length = 0
    pkt.Conn = nil
    pkt.Buffer = pkt.Buffer[:cap(pkt.Buffer)]
    
    select {
    case pp.pool <- pkt:
    default:
        // 池满，让 GC 回收
    }
}

// 帧同步中的命令对象池
type CommandPool struct {
    pool chan *GameCommand
}

type GameCommand struct {
    PlayerID uint64
    Tick     uint64
    Type     string
    Payload  []byte
}

func (cp *CommandPool) Acquire() *GameCommand {
    select {
    case cmd := <-cp.pool:
        return cmd
    default:
        return &GameCommand{
            Payload: make([]byte, 256),
        }
    }
}

func (cp *CommandPool) Release(cmd *GameCommand) {
    cmd.PlayerID = 0
    cmd.Tick = 0
    cmd.Type = ""
    cmd.Payload = cmd.Payload[:0]
    
    select {
    case cp.pool <- cmd:
    default:
    }
}
```

#### 参考（See Also）

- 对象池与**享元模式**互补：对象池重用实例，享元共享数据。
- 对象池是**数据局部性**的前提：对象池通常将对象分配在连续内存中。
- 与**脏标记**配合：池中的对象可以用脏标记跟踪需要同步的状态。

---

### 19. 空间分区（Spatial Partition）

#### 意图（Intent）

通过按位置组织对象的数据结构来高效定位对象。

#### 动机（Motivation）

Nystrom 以实时战略游戏为例引入空间分区。数百个单位在战场上交战，每个战士需要知道附近的敌人。最简单的方法是检查所有单位对：

```go
// O(n²) 复杂度
for a := 0; a < numUnits-1; a++ {
    for b := a + 1; b < numUnits; b++ {
        if units[a].Position == units[b].Position {
            handleAttack(units[a], units[b])
        }
    }
}
```

问题是：每增加一个单位，比较次数就增加。对于大量单位，这会变得不可接受。

Nystrom 用了一个比喻：想象战场是一条一维的战斗线。如果我们将单位按位置排序，就可以使用二分查找来找到附近的单位，而不需要扫描整个数组。

空间分区就是将这个想法扩展到多维空间。

#### 模式本身（The Pattern）

```go
// 网格空间分区
type SpatialGrid struct {
    cellSize  float64
    cells     map[int64]*Cell
}

type Cell struct {
    entities map[uint64]*Entity
}

func NewSpatialGrid(cellSize float64) *SpatialGrid {
    return &SpatialGrid{
        cellSize: cellSize,
        cells:    make(map[int64]*Cell),
    }
}

func (g *SpatialGrid) cellKey(x, y float64) int64 {
    cx := int64(math.Floor(x / g.cellSize))
    cy := int64(math.Floor(y / g.cellSize))
    return cx*100000 + cy
}

func (g *SpatialGrid) Insert(entity *Entity) {
    key := g.cellKey(entity.Position.X, entity.Position.Y)
    if g.cells[key] == nil {
        g.cells[key] = &Cell{entities: make(map[uint64]*Entity)}
    }
    g.cells[key].entities[entity.ID] = entity
}

func (g *SpatialGrid) Remove(entity *Entity) {
    key := g.cellKey(entity.Position.X, entity.Position.Y)
    if cell, ok := g.cells[key]; ok {
        delete(cell.entities, entity.ID)
    }
}

func (g *SpatialGrid) UpdateEntity(entity *Entity) {
    g.Remove(entity)
    g.Insert(entity)
}

// 查询附近实体
func (g *SpatialGrid) Query(x, y, radius float64) []*Entity {
    var result []*Entity
    minCx := int64(math.Floor((x - radius) / g.cellSize))
    maxCx := int64(math.Floor((x + radius) / g.cellSize))
    minCy := int64(math.Floor((y - radius) / g.cellSize))
    maxCy := int64(math.Floor((y + radius) / g.cellSize))
    
    for cx := minCx; cx <= maxCx; cx++ {
        for cy := minCy; cy <= maxCy; cy++ {
            key := cx*100000 + cy
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

#### 当使用时（When to Use It）

书中指出空间分区适用于：

1. **大量具有位置的对象**：如游戏世界中的所有实体。
2. **频繁的位置查询**：如碰撞检测、AOI 计算等。
3. **O(n) 或 O(n²) 成为瓶颈**。

#### 注意事项（Keep in Mind）

- **更新成本**：对象移动时需要更新空间分区数据结构。
- **选择合适的分区策略**：网格适合均匀分布，四叉树/八叉树适合非均匀分布。
- **内存开销**：空间分区数据结构本身需要额外内存。
- **边界情况**：对象在边界附近时可能需要查询多个分区。

Nystrom 讨论了几种常见的空间分区数据结构：

1. **网格（Grid）**：最简单，适合均匀分布的对象。
2. **四叉树（Quadtree）**：二维空间的树形分区。
3. **八叉树（Octree）**：三维空间的树形分区。
4. **BVH（Bounding Volume Hierarchy）**：适合层次化的对象。
5. **BSP（Binary Space Partition）**：适合静态环境。

#### 服务端应用场景

空间分区是服务端的核心技术之一：

```go
// AOI（Area of Interest）系统
type AOISystem struct {
    grid *SpatialGrid
}

func NewAOISystem(cellSize float64) *AOISystem {
    return &AOISystem{
        grid: NewSpatialGrid(cellSize),
    }
}

// 玩家进入视野
func (a *AOISystem) PlayerEnter(player *Player) {
    a.grid.Insert(player.Entity)
    
    // 找到附近的所有实体，通知它们
    nearby := a.grid.Query(
        player.Position.X,
        player.Position.Y,
        AOI_RADIUS,
    )
    
    for _, entity := range nearby {
        entity.OnPlayerEnter(player)
        player.OnEntityEnter(entity)
    }
}

// 玩家移动
func (a *AOISystem) PlayerMove(player *Player, newPos Vector3) {
    oldNearby := a.grid.Query(player.Position.X, player.Position.Y, AOI_RADIUS)
    
    a.grid.UpdateEntity(player.Entity)
    player.Position = newPos
    
    newNearby := a.grid.Query(player.Position.X, player.Position.Y, AOI_RADIUS)
    
    // 计算进入和离开视野的实体
    oldSet := make(map[uint64]bool)
    for _, e := range oldNearby {
        oldSet[e.ID] = true
    }
    
    newSet := make(map[uint64]bool)
    for _, e := range newNearby {
        newSet[e.ID] = true
    }
    
    // 进入视野的实体
    for _, e := range newNearby {
        if !oldSet[e.ID] {
            e.OnPlayerEnter(player)
            player.OnEntityEnter(e)
        }
    }
    
    // 离开视野的实体
    for _, e := range oldNearby {
        if !newSet[e.ID] {
            e.OnPlayerLeave(player)
            player.OnEntityLeave(e)
        }
    }
}
```

#### 参考（See Also）

- 空间分区是**数据局部性**的典型应用。
- 与**脏标记**配合：只有移动的实体才需要更新空间分区。
- 在**游戏循环模式**中，空间分区是每帧更新的关键部分。

---

## 总结

这19个模式覆盖了游戏服务端开发的核心需求：

| 类别 | 模式 | 服务端核心价值 |
|------|------|---------------|
| 设计模式 | 命令、享元、观察者、原型、单例、状态 | 架构基础、数据管理、状态机 |
| 序列型 | 双缓冲、游戏循环、更新方法 | 帧同步、世界状态管理 |
| 行为型 | 字节码、子类沙盒、类型对象 | 数据驱动、AI、脚本化 |
| 解耦型 | 组件、事件队列、服务定位器 | ECS架构、系统通信 |
| 优化型 | 数据局部性、脏标记、对象池、空间分区 | 性能优化、内存管理 |

**最重要的三个模式**（从服务端开发角度）：

1. **游戏循环**：服务端的核心架构，决定了整个服务器的运行方式。
2. **组件模式（ECS）**：现代游戏服务端的主流架构，提供高性能和灵活性。
3. **空间分区**：AOI 系统的基础，直接影响服务器能承载多少玩家。

> 本手册基于 Robert Nystrom 的《Game Programming Patterns》编写。完整内容请访问 [gameprogrammingpatterns.com](https://gameprogrammingpatterns.com/)。
