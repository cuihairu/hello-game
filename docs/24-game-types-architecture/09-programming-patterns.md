# 09 Game Programming Patterns

> Compiled from Robert Nystrom's *Game Programming Patterns* (gameprogrammingpatterns.com), oriented toward game server development.
>
> While gathering these patterns I wanted above all to preserve the judgment behind them—why a pattern exists, when to use it, when not to—rather than pile up code. Implementations can vary; the problems and trade-offs behind the patterns are what deserve to be recorded.

---

## Table of Contents

- [Part One: Architecture, Performance, and Games](#part-one-architecture-performance-and-games)
- [Part Two: Design Patterns Revisited](#part-two-design-patterns-revisited)
  - [1. Command](#_1-command)
  - [2. Flyweight](#_2-flyweight)
  - [3. Observer](#_3-observer)
  - [4. Prototype](#_4-prototype)
  - [5. Singleton](#_5-singleton)
  - [6. State](#_6-state)
- [Part Three: Sequential Patterns](#part-three-sequential-patterns)
  - [7. Double Buffer](#_7-double-buffer)
  - [8. Game Loop](#_8-game-loop)
  - [9. Update Method](#_9-update-method)
- [Part Four: Behavioral Patterns](#part-four-behavioral-patterns)
  - [10. Bytecode](#_10-bytecode)
  - [11. Subclass Sandbox](#_11-subclass-sandbox)
  - [12. Type Object](#_12-type-object)
- [Part Five: Decoupling Patterns](#part-five-decoupling-patterns)
  - [13. Component](#_13-component)
  - [14. Event Queue](#_14-event-queue)
  - [15. Service Locator](#_15-service-locator)
- [Part Six: Optimization Patterns](#part-six-optimization-patterns)
  - [16. Data Locality](#_16-data-locality)
  - [17. Dirty Flag](#_17-dirty-flag)
  - [18. Object Pool](#_18-object-pool)
  - [19. Spatial Partition](#_19-spatial-partition)
- [Summary: Pattern Selection Decision Table](#summary-pattern-selection-decision-table)

---

## Part One: Architecture, Performance, and Games

In the opening of the book, Robert Nystrom poses two core questions that plague every game developer:

**Code rot**: as a project grows, the code becomes tangled. Changing one feature triggers a chain reaction—like trying to fix a single water pipe and discovering it is welded into the plumbing of the entire building. Nystrom points out that this is usually not because the programmers are not smart enough, but because the code was not organized at a sensible level of abstraction.

**Performance traps**: developers obsess over micro-optimizations ("can this line of code save 3 nanoseconds?") while ignoring higher-level architectural decisions. Nystrom observes that a good architectural decision often delivers orders of magnitude more performance than hand-written bit-manipulation tricks.

The book stresses that design patterns are not a silver bullet. Nystrom repeats the warning: **patterns are tools, not goals**. If a plain `if-else` solves the problem, use `if-else`. The main reason to introduce a pattern is that it makes your code easier to modify and easier to understand in the future.

Game development differs from traditional software development in three key ways:

1. **Real-time**: a game must finish updating and rendering one frame within 16ms. Any blocking operation causes stutter.
2. **Resource limits**: games run on devices with limited memory and limited CPU; they cannot allocate objects the way a web service can.
3. **Determinism**: in a frame sync (lockstep) architecture, identical input must produce identical results. This demands that the code be highly predictable.

Nystrom divides his 19 patterns into six categories, each addressing a specific problem domain. Understanding that taxonomy matters more than memorizing each pattern's name—when you hit a problem, you first need to judge "which category of problem is this," and only then pick a suitable pattern.

---

## Part Two: Design Patterns Revisited

This part covers six classic object-oriented design patterns and their special use in games. Nystrom points out that although these patterns come from the Gang of Four, the way game development applies them differs greatly from traditional enterprise software.

---

### 1. Command

#### Why Do You Need This Pattern?

Imagine you are developing a tower defense (TD) game. Players can place towers, upgrade towers, and sell towers. If you implement it the simplest way:

```go
func handleClick(x, y int) {
    if isTowerAt(x, y) {
        showUpgradeMenu(x, y)    // 升级菜单
    } else if canPlaceHere(x, y) {
        placeTower(x, y)         // 放置炮塔
    } else if isUIElement(x, y) {
        handleUIClick(x, y)      // UI交互
    }
}
```

This code looks fine, but when you need an "undo last action" feature, you find yourself in trouble—`placeTower` has already run, and you cannot roll it back. When you need a "replay recording" feature, you must record every player's every action, but `placeTower` is just a function call, and you cannot serialize a function call.

**The core problem the Command pattern solves is: separating "what to do" from "how to do it."** Nystrom's concise definition of Command: "a command is a reified method call." "Reified" means turning an action into a data object that can be stored, passed around, and compared.

#### Nystrom's Core Insight

Nystrom notes that Command and callbacks, closures, and first-class functions are essentially the same kind of thing—passing behavior as data. But what makes Command distinctive is: **command objects can be serialized**. This matters a great deal in game development because:

- **Frame sync (lockstep)**: the client packs each frame's operations into command objects and sends them to the server, which then broadcasts them to all clients. All clients execute the same commands in the same order and stay in sync.
- **Replay**: store all commands in order, then execute them in sequence when replaying.
- **Anti-cheat**: the server can validate every command—on frame 100 the player sends "move to (500, 500)," but the map boundary is only (200, 200), so the command is illegal.

#### Real Scenarios on the Game Server

**Command queues in idle games**: the heart of an idle game is "offline earnings calculation." After a player goes offline, the server must simulate everything the player would have done while away. With the Command pattern, you record the offline actions (killing monsters, gathering resources, upgrading) as a command queue. When the player comes back online, the server executes those commands in order and computes the offline earnings precisely.

**Replay systems in card games**: in an auto-chess match, each player's shop refresh, piece purchase, and placement adjustment in each round are all commands. Serialize and store them, and you get match replay—other players can watch a recording of your game.

#### When Not to Use It?

Nystrom stresses: **do not use Command just for the sake of using Command**. If:

- you do not need undo/replay
- you do not need to serialize actions
- your input handling is very simple (a direct function call is enough)

then just write the function call. Introducing Command adds an unnecessary abstraction layer and makes the code harder to understand.

#### Code Example: Commands in Frame Sync

```go
// 每个游戏操作都是一个命令
type GameCommand struct {
    PlayerID uint32
    Tick     uint32
    Type     CommandType    // MOVE, ATTACK, BUY, SELL
    Data     []byte         // 序列化的参数
}

// 服务端执行命令并广播
func (s *Server) ProcessCommand(cmd GameCommand) {
    if !s.validate(cmd) { return }  // 反作弊校验
    result := s.execute(cmd)         // 执行命令
    s.broadcast(cmd, result)         // 广播给所有客户端
}
```

The code is only a dozen lines, but the key point is: `GameCommand` is a data structure, and can be stored in a database, sent over the network, and used for replay verification.

#### Common Mistakes

1. **Too fine-grained**: wrapping every mouse move in a command. This produces a massive number of objects and crushes performance.
2. **Too coarse-grained**: wrapping an entire round's operations into one command. Then you cannot undo a single step.
3. **Forgetting serialization constraints**: the command object references something that cannot be serialized (a database connection, a memory pointer), so it cannot be sent over the network.
4. **Commands holding too much state**: a command should only carry the information about "what to do," not the implementation details of "how to do it."

---

### 2. Flyweight

#### Why Do You Need This Pattern?

Imagine you are developing an MMO. The world contains 100,000 monsters of 50 types. If you create a full object for every monster type (containing attack power, defense, health, skill list, AI behavior tree, animation data, etc.), that static data gets stored redundantly 100,000 times.

**The core problem the Flyweight pattern solves is: how to avoid memory waste when a large number of objects share the same immutable data.** Nystrom uses a vivid analogy: imagine a word processor with a 100,000-line document, 50 characters per line. If every character object stores its own font, size, and color, memory explodes. But if all 100,000 character objects point at the same "SimSun 12pt black" font object, memory is reduced a hundred-thousand-fold.

#### Nystrom's Core Insight

Nystrom points out that the key to Flyweight is **distinguishing "intrinsic state" from "extrinsic state"**:

- **Intrinsic state**: the immutable, shareable part of an object. For example a monster's type attributes (name, base attack, appearance).
- **Extrinsic state**: the mutable, non-shareable part. For example a monster's current position, current health, buff state.

Flyweight extracts the intrinsic state to be shared and passes the extrinsic state in from outside. That way, 100,000 monsters may need only 50 flyweight objects.

#### Real Scenarios on the Game Server

**Piece templates in auto-chess**: the board holds 8 players, each with up to 9 pieces on the field, so there may be 100+ pieces in total. But those pieces belong to only a few dozen types. If every piece copied its own attack, skills, and synergy effects, that would be wasted memory. With Flyweight, all pieces of the same type share one template object, and each piece instance stores only its dynamic data—position, health, star level.

**NFT attributes in blockchain games**: in-game NFT items share the same metadata (name, description, rarity), but each NFT has a unique ID and owner. Treat the shared attributes as flyweight objects; each NFT instance then only holds its unique ID and current state.

#### When Not to Use It?

- The object count is small (a few dozen); no optimization is needed.
- Most of the object's data is mutable; there is little to share.
- Flyweight adds code complexity; if the objects are already lightweight, it is not worth it.

#### Code Example: Auto-Chess Piece Templates

```go
// 享元：所有同名棋子共享
type ChessPieceTemplate struct {
    Name    string
    ATK     int
    DEF     int
    Skills  []Skill
    Cost    int  // 购买费用
}

// 实例：每个棋子有独立状态
type ChessPieceInstance struct {
    Template *ChessPieceTemplate  // 共享模板
    Star     int                  // 星级：1/2/3
    HP       int                  // 当前血量
    Position GridPos              // 棋盘位置
}

// 模板池：存储所有可用模板
var templatePool = map[string]*ChessPieceTemplate{}
```

#### Common Mistakes

1. **Sharing data that should vary**: putting a monster's current position into shared data, so all monsters of the same type move to the same place.
2. **Over-optimizing**: for a scenario with only a few hundred objects, the memory Flyweight saves is far outweighed by the code complexity it adds.
3. **Thread-safety issues**: multiple threads reading a flyweight object simultaneously is fine, but if a flyweight object is modified by accident, every instance referencing it is affected.

---

### 3. Observer

#### Why Do You Need This Pattern?

Suppose you are developing a tower defense game. When a monster is killed, the following chain reaction must be triggered:

- UI updates the monster count display
- play the kill sound effect
- update the player's gold
- check whether an achievement is complete ("kill 100 monsters")
- check whether the wave has ended
- if it is a blockchain game, also update the on-chain data

If you implement it the most direct way:

```go
func onMonsterKilled(monster Monster) {
    ui.UpdateCount()        // UI 模块
    audio.PlayKillSound()   // 音频模块
    player.AddGold()        // 经济模块
    achievement.Check()     // 成就模块
    wave.CheckComplete()    // 波次模块
    blockchain.Update()     // 链游模块
}
```

The problem is obvious: **the "monster killed" logic now has a direct dependency on every other module**. If tomorrow the designer says "when a monster dies, drop an experience potion too," you have to notice and modify the `onMonsterKilled` function. If the achievement module is removed, you have to modify this function again.

**The core problem the Observer pattern solves is: let one object notify other objects when its state changes, without needing to know who is listening.** Nystrom uses the achievement system as an example—the physics engine handling a "fall" event does not need to know that the achievement system is listening for it. It only has to say "hey, something fell"; anyone interested can subscribe.

#### Nystrom's Core Insight

Nystrom points out several key characteristics of the Observer pattern:

1. **Loose coupling**: the Subject does not know the concrete types of its Observers, or even how many there are. This lets the two systems evolve independently.
2. **One-to-many notification**: one event can notify many observers, and the observers do not interfere with each other. Nystrom especially emphasizes this point—if only one observer were supported, newly registered observers would overwrite old ones, causing systems to interfere with each other.
3. **Separation of concerns**: the physics engine only cares about "physics simulation," not about how the "achievement system" reacts to a fall event.

Nystrom also points out an important distinction: "observing" an object vs "observing" an event. In the first you watch "the thing that does things"; in the second you watch "the thing that happened." The second is more flexible, because you can create different subscription channels for different events.

#### Real Scenarios on the Game Server

**AOI (area of interest) notifications in an MMO**: when a player moves, other players within view must be notified. But a player should not directly call another player's update method. With the Observer pattern, a moving player emits a "position changed" event, and other players' clients receive the notification automatically.

**Offline events in idle games**: after a player goes offline, if their character is killed in a dungeon, the friend list, the guild system, and the leaderboard system all need to be notified. Each system independently subscribes to the "player died" event, without affecting the others.

**Round notifications in card games**: at the start of each round, a "round started" event is emitted, triggering all passive skills, buff checks, and environmental effects. Each skill listens independently, so the main loop does not hardcode every skill check.

#### When Not to Use It?

- There are only 1-2 clearly defined listeners; direct calls are simpler.
- You need to know the result of event handling (the Observer pattern is a one-way notification with no return value).
- The event fires at a very high frequency (tens of thousands of times per frame); iterating over observers becomes the bottleneck.

#### Code Example: A Concise Event Emitter

```go
// 事件类型
type Event struct {
    Type string
    Data interface{}
}

// 发布者
type EventEmitter struct {
    listeners map[string][]func(Event)
}

func (e *EventEmitter) On(eventType string, fn func(Event)) {
    e.listeners[eventType] = append(e.listeners[eventType], fn)
}

func (e *EventEmitter) Emit(eventType string, data interface{}) {
    for _, fn := range e.listeners[eventType] {
        fn(Event{Type: eventType, Data: data})
    }
}

// 使用：解耦的击杀事件——击杀方只 Emit，不关心谁在听
func registerKillHandlers(emitter *EventEmitter, achievement *AchievementSystem, audio *AudioPlayer) {
    emitter.On("monster_killed", func(e Event) {
        achievement.Check(e.Data.(MonsterID))
    })
    emitter.On("monster_killed", func(e Event) {
        audio.PlayKillSound()
    })
}
```

#### Common Mistakes

1. **Memory leaks**: observers are registered but never unregistered, especially when an object is destroyed yet the observer list still holds a reference to it.
2. **Notification order dependence**: assuming observer execution order is fixed, when in fact registration order determines execution order.
3. **Modifying the observer list inside a notification callback**: this invalidates the iterator or causes an infinite loop.
4. **Overuse**: turning every interaction into an event notification, so the call chain cannot be traced during debugging.

---

### 4. Prototype

#### Why Do You Need This Pattern?

In game development you often need to create large numbers of similar objects. For example, a card game may have several hundred card types. If every card type is constructed manually with `new`, you need hundreds of lines of initialization code. If card attributes live in a config file (JSON, CSV), you need to read the data from the config and then manually populate the object.

**The core problem the Prototype pattern solves is: when you need many similar objects, copy from an existing object as a template instead of building from scratch.** Nystrom points out that Prototype's greatest value in games is **decoupling object creation from class definitions**. Code that creates objects does not need to know concrete class names; it only clones an existing instance.

#### Nystrom's Core Insight

Nystrom emphasizes the difference between Prototype and "cloning." Cloning simply copies an object, but the point of Prototype is: **from one prototype you can create variants by modifying the clone**. Like genetic cloning—the clone is the same as the prototype, but the clone can evolve independently.

The most common application of Prototype on a game server is **monster wave configuration**. Each wave's configuration (type, count, stat modifiers) is stored in a prototype object. When the wave starts, all monster instances are cloned from the prototype, then each instance has a random modifier applied (e.g. +10% health, +5% attack).

#### Real Scenarios on the Game Server

**Monster waves in tower defense**: each wave is defined by one prototype object. When cloning, apply stat scaling based on the current level's difficulty.

**Round generation in auto-chess**: each round's shop refresh and monster waves can be cloned from a prototype config. This way the designer only edits the prototype config file and does not have to change code.

**Item synthesis in blockchain games**: the synthesis system needs to create one high-tier item from two low-tier ones. The high-tier item's attributes = base attributes + material bonus. This process is essentially "clone from prototype + modify."

#### When Not to Use It?

- Object creation is trivial (`new` an empty object and assign a few fields).
- You do not need to create objects dynamically (all object types are known at compile time).
- Cloning itself is heavy (the object holds non-clonable resources such as database or network connections).

#### Code Example: Monster Prototype Cloning

```go
// 原型：存储基础配置
type MonsterPrototype struct {
    Type     string
    BaseHP   int
    BaseATK  int
    Skills   []string
}

// 从原型克隆，应用难度修正
func (p *MonsterPrototype) Spawn(level int) *Monster {
    m := &Monster{
        Type:  p.Type,
        HP:    int(float64(p.BaseHP) * (1.0 + float64(level)*0.1)),
        ATK:   int(float64(p.BaseATK) * (1.0 + float64(level)*0.08)),
        Skills: p.Skills,
    }
    return m
}

// 使用：从配置加载原型，再按当前等级生成实例
func spawnGoblin(prototypes map[string]*MonsterPrototype, currentLevel int) *Monster {
    return prototypes["goblin"].Spawn(currentLevel)
}
```

#### Common Mistakes

1. **Deep copy vs shallow copy**: when cloning, if only a shallow copy is made, modifying the clone's internal objects (slices, maps) affects the prototype.
2. **Cloning immutable objects**: a singleton should never be cloned, or you end up with multiple "same" singletons.
3. **Forgetting about reference types**: reference types inside the prototype—pointers, slices, maps—need special handling when cloning.

---

### 5. Singleton

#### Why Do You Need This Pattern?

Some systems on a game server need only one instance globally: the logging system, the config manager, the database connection pool, the global event bus. If every module creates its own logging instance, you end up with multiple log files, inconsistent configuration, and wasted connection-pool resources.

**The core problem the Singleton pattern solves is: ensuring a class has only one instance and providing a global access point.** But Nystrom's attitude toward Singleton is **cautious**. He states plainly in the book: Singleton is overused; it is essentially a disguised form of global state.

#### Nystrom's Core Insight

Nystrom's warning is direct: **Singleton's problem is not "only one instance," but "globally accessible."** Global state makes code dependencies opaque—when you see a function call, you do not know which global state it touches inside. This makes debugging extremely hard.

The alternative Nystrom recommends is **dependency injection**: pass the required dependencies in as parameters instead of fetching them from a global. Then code dependencies are explicit, and dependencies can be easily swapped during testing.

On a game server, though, some systems genuinely are globally unique (such as a database connection pool), and Singleton is justified there. The key is: **inject that singleton via dependency injection, rather than letting the code go fetch the singleton itself**.

#### Real Scenarios on the Game Server

**Config manager**: the whole server needs only one config instance, shared by all modules. But the better practice is: create the config instance at startup and pass it to the modules that need it via dependency injection.

**Database connection pool**: one globally unique pool, shared by all business logic. This is a legitimate Singleton use.

**Leaderboard service**: one globally unique leaderboard service, through which all players' ranking queries go. But note thread safety—when many players update their ranking at once, you need locks.

#### When Not to Use It?

- You just want convenient global access to some object (dependency injection is better).
- The object needs to be replaced during testing (singletons are hard to mock).
- The object has state that must be reset (singleton state leaks across tests).

#### Code Example: A Reasonable Singleton Usage

```go
// 不好的方式：直接全局访问
func ProcessPlayer(player *Player) {
    db := GetGlobalDB()  // 隐式依赖，测试时无法替换
    db.Save(player)
}

// 好的方式：依赖注入
type Server struct {
    db     Database
    config *Config
    logger Logger
}

func (s *Server) ProcessPlayer(player *Player) {
    s.db.Save(player)  // 显式依赖，测试时可以注入 mock
}
```

#### Common Mistakes

1. **Abusing global state**: making every service a singleton, so the codebase becomes a pile of global state.
2. **Forgetting thread safety**: accessing a singleton from multiple threads without lock protection.
3. **Irreplaceable in tests**: once a singleton is created it cannot be replaced, so unit tests end up depending on the real database.

---

### 6. State

#### Why Do You Need This Pattern?

Nystrom uses a very classic example in the book to explain why the State pattern is necessary: suppose you are developing a side-scrolling platformer where the hero can stand, jump, crouch, and dive. If you manage state with boolean flags:

```go
// 用布尔标志管理状态（示意）
type PlayerState struct {
    isJumping, isDucking, isCharging bool
}
```

You will quickly run into the combinatorial explosion of boolean flags—what does it mean when `isJumping` and `isDucking` are both true? When `isCharging` and `isJumping` are both true? Every new state you add requires checking whether all existing state combinations remain legal.

Nystrom uses a wonderful analogy: **a finite state machine (FSM) is like room navigation in the old text adventure *Zork***. Each room is a state, the room's exits are state transitions, and the player's movement commands are inputs. You cannot be in two rooms at once—just as a character cannot be in both "jumping" and "standing" state at once.

**The core problem the State pattern solves is: replacing a mass of if-else branches and boolean flags with a finite state machine, making state management clear and extensible.**

#### Nystrom's Core Insight

Nystrom introduces three levels of state machine implementation:

1. **Enum + switch**: the simplest, suitable for few states and simple transition logic.
2. **State classes (the State pattern)**: each state is a class, and transitions are made by swapping the current state object. Suitable when states each have independent behavior.
3. **Hierarchical FSM (HFSM)**: states can be nested. For example the "combat" state can contain "attack," "defense," and "casting" substates.

Nystrom especially emphasizes **the legality of state transitions**: an FSM's greatest value is not reducing code volume, but making "which transitions are legal" obvious at a glance. In the enum + switch approach, you can clearly see which inputs each state accepts and which states it can move to.

#### Real Scenarios on the Game Server

**Character state in idle games**: a character has states like "idle," "in battle," "resting," "in dungeon," and "offline." Behavior differs completely in each state: while idle it can accept new quests, in battle it cannot accept party invitations, and while offline resources accrue according to offline earnings rules.

**Piece state in auto-chess**: each piece has states like "available," "on the bench," "on the board," "dead," and "sold." Transitions have strict rules: only "available" pieces can be bought; a "on the board" piece that dies moves to "dead"; "dead" pieces revive at the end of the round.

**Card state in card games**: cards move among "deck," "hand," "field," "graveyard," and "exiled." Some transitions are strictly restricted: playing from hand to field costs mana, and reviving from the graveyard may require a specific skill.

#### When Not to Use It?

- There are only 2-3 states; simple if-else is enough.
- The transition logic is extremely complex, and the state machine itself becomes a mess.
- You need to add new states frequently without touching existing code (then consider a table-driven state approach).

#### Code Example: Character State in an Idle Game

```go
type PlayerState string

const (
    StateIdle    PlayerState = "idle"
    StateBattle  PlayerState = "battle"
    StateRest    PlayerState = "rest"
    StateOffline PlayerState = "offline"
)

// 状态转移表：从哪个状态可以转移到哪个状态
var transitions = map[PlayerState][]PlayerState{
    StateIdle:    {StateBattle, StateRest, StateOffline},
    StateBattle:  {StateIdle, StateRest},
    StateRest:    {StateIdle, StateBattle},
    StateOffline: {StateIdle},
}

func (p *Player) TransitionTo(newState PlayerState) bool {
    for _, valid := range transitions[p.State] {
        if valid == newState {
            p.State = newState
            return true
        }
    }
    return false  // 非法转移
}
```

#### Common Mistakes

1. **State explosion**: creating a new state for every tiny difference, so the number of states runs away. Similar states should be merged.
2. **Forgetting to handle illegal inputs**: an FSM meeting an illegal input should handle it explicitly (ignore, report an error, or move to a default state), not silently drop it.
3. **Forgetting cleanup on transition**: when switching from "battle" to "resting," failing to clear battle-related temporary data.
4. **Hierarchy too deep**: a hierarchical FSM nested more than 3-4 levels becomes hard to maintain; consider splitting it into several independent state machines.

---

## Part Three: Sequential Patterns

These three patterns concern the **time dimension** of game execution—how the game advances over time, and how to manage data that changes over time.

---

### 7. Double Buffer

#### Why Do You Need This Pattern?

Suppose you are developing an MMO. The game world contains ten thousand entities whose positions and states change every frame. If, within the same frame, you update entity positions while also sending positions to clients, you get **tearing**—some entities have already moved to their new positions while others are still at the old ones. The world state the client receives is inconsistent.

**The core problem the Double Buffer pattern solves is: data consistency when reads and writes happen simultaneously.** Nystrom uses a very intuitive analogy: imagine painting a picture while someone takes photographs. If the photo is taken before the painting is finished, the picture in the photo is half-done. The solution is to prepare two canvases—the painter paints on one while the photographer only shoots the other. When the painting is done, the two canvases swap places.

#### Nystrom's Core Insight

Nystrom points out that double buffering has two core application scenarios in game development:

1. **Render double buffering**: the GPU renders the next frame into the back buffer while the front buffer displays the current frame. When rendering finishes, the buffers swap, avoiding screen tearing.
2. **Logic double buffering**: game logic updates state in the "write buffer" while the network layer sends data from the "read buffer." The buffers swap at the end of each frame.

The key is the **swap timing**: the swap must happen after all writes complete and before all reads begin. If the swap timing is wrong, you get a one-frame delay or inconsistent data.

#### Real Scenarios on the Game Server

**Frame sync (lockstep) games**: in auto-chess, before each round begins, all players' piece positions are locked into the "read buffer." The round logic computes all piece movement and combat in the "write buffer." When the round ends, the buffers swap, and clients fetch the final state from the new read buffer.

**World-state snapshots in an MMO**: the server keeps two copies of the world state. Game logic updates copy A while the AOI system reads positions from copy B to compute views. Swap at frame end. This guarantees view computation uses last frame's consistent state.

#### When Not to Use It?

- Reads and writes are already thread-safe (e.g. using atomic operations).
- Only a single thread reads and writes; no protection needed.
- Memory is tight, and you cannot afford to store state twice.

#### Code Example: World-State Double Buffering

```go
type DoubleBuffer struct {
    current *WorldState  // 当前帧（读）
    next    *WorldState  // 下一帧（写）
}

func (db *DoubleBuffer) GetState() *WorldState {
    return db.current  // 读操作：总是读 current
}

func (db *DoubleBuffer) Update(fn func(*WorldState)) {
    fn(db.next)  // 写操作：总是写 next
}

func (db *DoubleBuffer) Swap() {
    db.current, db.next = db.next, db.current  // 交换
}
```

#### Common Mistakes

1. **Wrong swap timing**: swapping before the writes are complete, so readers see incomplete data.
2. **Forgetting to swap**: writing a frame but forgetting to swap, so reads forever return stale data.
3. **Reading from the write buffer**: violating double buffering's basic constraint.

---

### 8. Game Loop

#### Why Do You Need This Pattern?

Nystrom says in the book: "If this book could only contain one pattern, it would be the game loop." The game loop is the heartbeat of every real-time game—it governs how each frame of the game advances.

An ordinary program's flow is: input → process → output → exit. But a game cannot end (unless the player quits); it must keep doing: process input → update game state → render the screen. This infinite loop is the game loop.

**The core problem the game loop solves is: how to advance the game at a steady pace, unaffected by hardware performance or the user's input speed.** Nystrom identifies the key challenge—**unstable frame rate**. The same code may finish a frame in 16ms (60fps) on a high-end PC and take 32ms per frame (30fps) on a low-end phone. If game logic is tied directly to the frame rate, the game speeds up on fast machines and slows down on slow ones.

#### Nystrom's Core Insight

Nystrom introduces three main game loop variants:

**Fixed time step**: game logic updates at fixed intervals (e.g. 20 times per second). If a frame actually takes 50ms, you run 1 logic update (a 20ms step) and accumulate the remaining 30ms into the next frame. In many projects this is the fairly common approach, because it guarantees deterministic physics simulation.

**Variable time step**: game logic uses the actual frame interval as its step. Nystrom **strongly opposes** this approach, because physics formulas contain quadratic terms (acceleration × time²), so tiny changes in the time step produce completely different simulation results. A ball falls 1 pixel in 16ms; in 32ms it falls not 2 pixels but 4.

**Semi-fixed time step**: logic updates use a fixed step while rendering runs as fast as possible. This is the compromise, suitable for games without strict frame-rate requirements.

Nystrom also mentions the **spiral of death**: when a frame takes too long to process, the accumulator piles up a large amount of unprocessed time, forcing the next frame to run even more logic updates, further lengthening processing time—a vicious cycle. The solution is to cap the accumulator's maximum.

#### Real Scenarios on the Game Server

**Server-side game loop**: unlike the client, the server does not render, but it must run game logic at a fixed tick rate (e.g. 20 times per second). Each tick must: collect player input → process game logic → sync state to clients.

**Offline settlement in idle games**: a player is offline for 8 hours, and the server must simulate 8 hours of game progress. At a fixed time step of 1 second, that is 28,800 logic updates. This calls for "accelerated simulation"—skip unnecessary computation and only process key events.

**Auto-chess round loop**: each round has a fixed time limit (e.g. a 30-second preparation phase). The server must execute all piece combat logic precisely when the round ends.

#### When Not to Use It?

- Purely event-driven programs (e.g. web services) do not need an ever-running loop.
- Batch programs: input → process → output → exit.
- Turn-based game clients do not need a continuous loop (but the server still does).

#### Code Example: A Fixed-Time-Step Server Loop

```go
func (s *Server) Run() {
    ticker := time.NewTicker(50 * time.Millisecond)  // 20 TPS
    defer ticker.Stop()
    accumulator := time.Duration(0)

    for {
        now := <-ticker.C
        accumulator += now.Sub(s.lastTick)
        s.lastTick = now

        // 限制累积量，防止死亡螺旋
        if accumulator > 200*time.Millisecond {
            accumulator = 200*time.Millisecond
        }

        for accumulator >= 50*time.Millisecond {
            s.processInputs()       // 处理玩家输入
            s.updateGameLogic()     // 更新游戏逻辑
            s.syncToClients()       // 同步到客户端
            accumulator -= 50*time.Millisecond
        }
    }
}
```

#### Common Mistakes

1. **Using a variable time step**: this destabilizes physics simulation, especially when the frame rate fluctuates a lot.
2. **Ignoring the spiral of death**: when server load spikes and tick processing exceeds the tick interval, game logic piles up until the server collapses.
3. **Choosing the tick rate poorly**: too low a tick rate means high operation latency; too high means heavy CPU overhead. Generally 15-30 TPS suits most games.
4. **Blocking operations inside the tick**: doing a database query or network IO in the game logic update blocks the entire tick.

---

### 9. Update Method

#### Why Do You Need This Pattern?

The game world contains thousands of objects—monsters, bullets, effects, particles, NPCs. Each object needs to update its own state every frame. If the game loop manually calls each object's update method:

```go
// 每帧推进：三种实体各一个紧凑循环，缓存友好
func frameUpdate(monsters []*Monster, bullets []*Bullet, effects []*Effect) {
    for _, monster := range monsters { monster.Update() }
    for _, bullet := range bullets { bullet.Update() }
    for _, effect := range effects { effect.Update() }
}
```

the code becomes long and fragile—every new object type means editing the game loop.

**The core problem the Update Method pattern solves is: letting every object know how to update itself, while the game loop merely iterates over all objects and calls their Update method.** Nystrom points out that this is essentially spreading "update logic" across the objects instead of concentrating it in one giant switch-case.

#### Nystrom's Core Insight

Nystrom stresses that the Update Method pattern's key value is **extensibility**: adding a new object type does not require modifying the game loop. You just create the new type, implement Update, and add it to the object list.

But Nystrom also warns of the **performance trap**: every object has Update called once per frame even when it does nothing. For ten thousand objects, that means ten thousand virtual calls. In performance-sensitive scenarios, consider **updating only active objects** (e.g. using the Dirty Flag pattern).

#### Real Scenarios on the Game Server

**Bullet systems in tower defense**: every frame must update all in-flight bullet positions and check collisions. Each bullet knows how it moves (straight line, homing, ballistic); the game loop only iterates over all bullets and calls Update.

**Piece AI in auto-chess**: every frame must update all pieces' AI decisions (find a target, choose a skill, move). Each piece's AI is independent, so the game loop does not need to know the piece's concrete type.

**Entity updates in an MMO**: every frame must update all online players' position sync, monster AI, and NPC behavior. With the Update Method pattern, each entity type implements its own Update logic.

#### When Not to Use It?

- There are very few objects; manual calls are simpler.
- The objects' update logic is highly homogeneous, and one unified function can handle them all.
- Performance requirements are extreme, and virtual call overhead must be avoided.

#### Code Example: A Concise Update List

```go
// 可更新的接口
type Updatable interface {
    Update(dt float64)
}

// 游戏世界持有所有可更新对象
type World struct {
    entities []Updatable
}

func (w *World) Update(dt float64) {
    for _, e := range w.entities {
        e.Update(dt)  // 每个对象自己知道怎么更新
    }
}
```

#### Common Mistakes

1. **Heavy work inside Update**: the Update method should stay lightweight; avoid doing IO or complex computation in it.
2. **Forgetting to remove destroyed objects**: destroyed objects stay in the update list, causing nil-pointer errors or logic errors.
3. **Update order dependence**: assuming the update order is fixed, when in fact it is nondeterministic.

---

## Part Four: Behavioral Patterns

These three patterns concern **how game-object behavior is defined and executed**—especially when behavior must change at runtime or be driven by data.

---

### 10. Bytecode

#### Why Do You Need This Pattern?

In traditional game development, AI behavior is hard-coded in the program. When a designer wants to tune a monster's AI, a programmer has to change code, recompile, and redeploy. That process is far too slow.

**The core problem the Bytecode pattern solves is: freeing game behavior (AI, skills, quest flows) from compiled code and turning it into data that can be dynamically loaded and modified.** Nystrom points out that this is essentially building a small virtual machine—define an instruction set, compile behavior into instruction sequences, then interpret and execute them at runtime.

The core difference between this pattern and a "scripting language" is: a scripting language is a complete programming language (such as Lua), while the Bytecode pattern is usually a lean, domain-specific instruction set. It is safer (no arbitrary code can execute), more predictable (the instruction set is finite), and easier to audit.

#### Nystrom's Core Insight

Nystrom emphasizes the two core values of the Bytecode pattern:

1. **Hot updates**: changing bytecode does not require recompiling the game server. Designers can tune AI behavior without restarting the service.
2. **Security**: bytecode executes inside a controlled virtual machine and cannot access system resources. This matters especially for blockchain games—logic executing on-chain must be safe and verifiable.

Nystrom also names the Bytecode pattern's drawback: **performance overhead**. Interpreted execution is much slower than native code. But for non-performance-critical paths such as AI and skill logic, the overhead is acceptable.

#### Real Scenarios on the Game Server

**Smart contracts in blockchain games**: the core logic of a blockchain game runs on smart contracts, which are essentially bytecode. All player actions execute through smart contracts, guaranteeing that the rules are transparent and tamper-proof.

**Skill systems in tower defense**: each tower's skill effects are defined in bytecode. A designer can define "fire 3 missiles, each dealing 50 damage, prioritizing the target with the lowest health" in a config file, and the server interprets and executes those instructions.

**Quest systems in an MMO**: quest flows (accept conditions, completion conditions, reward payout) are defined in bytecode. A new quest only needs a new bytecode sequence—no server code changes.

#### When Not to Use It?

- The behavior logic is fixed and does not need runtime modification.
- Performance requirements are extreme, and the interpreted execution overhead is unacceptable.
- The behavior logic is very simple; plain code is clearer.

#### Code Example: Simple Skill Bytecode

```go
// 字节码指令
type Instruction struct {
    Op   Opcode
    Args []interface{}
}

// 操作码
const (
    OpSpawnBullet  Opcode = iota  // 生成子弹
    OpDamage                       // 造成伤害
    OpHeal                         // 治疗
    OpBuff                         // 添加buff
)

// 技能定义：一条指令序列
var FireSkill = []Instruction{
    {Op: OpSpawnBullet, Args: []interface{}{"fireball", 3}},
    {Op: OpDamage, Args: []interface{}{50}},
}

// 虚拟机执行
func Execute(instructions []Instruction, caster *Unit) {
    for _, inst := range instructions {
        switch inst.Op {
        case OpSpawnBullet:
            spawnBullet(caster, inst.Args[0].(string), inst.Args[1].(int))
        case OpDamage:
            dealDamage(caster, inst.Args[0].(int))
        }
    }
}
```

#### Common Mistakes

1. **Poor instruction-set design**: instructions that are too coarse lack flexibility; too fine, and the interpreter becomes complex.
2. **No sandbox protection**: bytecode that can access external resources (files, network) creates a security hole.
3. **Performance bottleneck**: using bytecode on a hot path (e.g. AI executed every frame) turns interpreted execution overhead into the bottleneck.

---

### 11. Subclass Sandbox

#### Why Do You Need This Pattern?

Suppose you are developing an MMO with several hundred monsters, each with unique skills and behavior. If every monster class directly calls the low-level APIs (play animation, spawn effects, play sound, modify state):

```cpp
class Goblin : Monster {
    void useSpecialAbility() {
        graphics.playAnimation("fireball");
        audio.playSound("explosion");
        world.spawnParticle("fire", position);
        target.takeDamage(50);
    }
}
```

then whenever a low-level API changes (say `graphics` is renamed to `renderer`), you must modify every monster class.

**The core problem the Subclass Sandbox pattern solves is: encapsulating the low-level APIs in the base class, so that subclasses can only touch the underlying systems through the "sandbox" methods the base class provides.** Nystrom's analogy: it is like a sandbox game—you can play freely inside it, but you cannot climb out of the sandbox to touch the things outside.

#### Nystrom's Core Insight

Nystrom points out that the key value of the Subclass Sandbox pattern is **controlling dependencies**. The base class decides which low-level capabilities subclasses may use, and subclasses implement their behavior only within that set of capabilities. This has two benefits:

1. **API stability**: when a low-level API changes, only the base class needs modification; subclasses are unaffected.
2. **Behavior constraints**: subclasses cannot do things beyond the sandbox (such as directly modifying the database); all operations go through the base class's controlled interface.

Nystrom notes that this pattern resembles the Template Method pattern, but the difference is: Template Method defines the skeleton of an algorithm and subclasses fill in the details, whereas Subclass Sandbox provides a set of capabilities that subclasses freely combine.

#### Real Scenarios on the Game Server

**Tower skills in tower defense**: each tower's skill differs (single-target attack, area attack, slow, heal), but they all need to call low-level capabilities like "spawn bullet," "play sound effect," and "apply debuff." Encapsulate the capabilities in the base class, and each tower only has to combine them.

**Piece skills in auto-chess**: each piece's skill effect differs, but the low-level capabilities are limited (spawn projectile, deal damage, add buff, summon units). Through Subclass Sandbox, designers can safely define new skills.

**Contract behavior in blockchain games**: on-chain contract behavior is restricted to predefined operations (transfer, mint NFT, modify state) and cannot execute arbitrary code. This is essentially the Subclass Sandbox idea—contracts can only operate within what the sandbox allows.

#### When Not to Use It?

- The class hierarchy is simple, with only 1-2 subclasses.
- The low-level APIs are stable and unlikely to change.
- The flexibility you need exceeds what the sandbox can provide.

#### Code Example: A Monster Skill Sandbox

```go
// 基类：定义沙盒能力
type MonsterBase struct {
    Position  Vector2
    Target    *Unit
}

// 沙盒方法：子类只能通过这些方法与世界交互
func (m *MonsterBase) SpawnBullet(name string, target *Unit, dmg int) {
    bullet := NewBullet(m.Position, target, name, dmg)
    world.AddBullet(bullet)
}

func (m *MonsterBase) ApplyBuff(target *Unit, buff Buff) {
    target.AddBuff(buff)
}

// 子类：在沙盒内自由组合
type Goblin struct{ MonsterBase }

func (g *Goblin) SpecialAbility() {
    // 只能调用沙盒方法，不能直接操作底层系统
    g.SpawnBullet("fireball", g.Target, 30)
    g.ApplyBuff(g.Target, Buff{Type: "burn", Duration: 3})
}
```

#### Common Mistakes

1. **Sandbox too broad**: too many low-level capabilities are exposed, and subclasses can do dangerous things.
2. **Sandbox too narrow**: too many restrictions, so subclasses cannot implement the needed behavior and end up bypassing the sandbox.
3. **The base class bloats**: as subclass needs grow, the base class accumulates more and more sandbox methods, until it becomes a God Class.

---

### 12. Type Object

#### Why Do You Need This Pattern?

In game development you often need large numbers of objects that are "same type, different attributes." For example, a card game has several hundred cards, each with different attack, defense, skills, and description. If you create one class per card:

```cpp
class FireballCard : Card { ... }
class IceBlastCard : Card { ... }
class ThunderStrikeCard : Card { ... }
// ... 300 个类
```

This is clearly unworkable—you cannot write one class per card.

**The core problem the Type Object pattern solves is: using "objects" instead of "classes" to represent type differences.** Nystrom points out that this is essentially building a type system at runtime. Instead of defining 300 classes at compile time, you create 300 type objects at runtime from config data. Each game entity holds a reference to a "type object," and the type object defines the entity's attributes and behavior.

#### Nystrom's Core Insight

Nystrom emphasizes the difference between Type Object and inheritance:

- **Inheritance**: the type hierarchy is fixed at compile time; changing a type requires recompiling.
- **Type Object**: types are created from data at runtime; changing a type only requires editing the config file.

Nystrom's analogy: a type object is like a **mold**. One mold can produce countless products of the same shape, but each product's color and material can differ. Change the shape of the mold, and the shape of every product changes.

#### Real Scenarios on the Game Server

**Card definitions in card games**: each card is defined by a JSON config, and the server loads the configs at runtime and creates type objects. A new card only needs a new JSON file—no code changes.

**Piece templates in auto-chess**: each piece's attributes, skills, and synergy effects are stored in config. With the Type Object pattern, designers can add new pieces without touching code.

**Tower configs in tower defense**: each tower's attack, range, attack speed, and special effects are stored in config. With the Type Object pattern, tower attributes can be hot-updated at runtime.

#### When Not to Use It?

- The type count is small (<10); plain class inheritance is clearer.
- The types' behaviors differ too much to be data-driven.
- You need compile-time type checking (Type Object resolves at runtime, where the compiler cannot check).

#### Code Example: Card Type Objects

```go
// 类型对象：定义卡牌属性
type CardType struct {
    Name    string
    ATK     int
    DEF     int
    Cost    int
    Effect  string  // 效果描述
}

// 实例：持有类型引用
type Card struct {
    Type    *CardType  // 共享类型信息
    Level   int        // 独立状态
    Owner   *Player
}

// 从配置创建类型对象
func LoadCardTypes(path string) map[string]*CardType {
    data, _ := os.ReadFile(path)
    var types map[string]*CardType
    json.Unmarshal(data, &types)
    return types
}
```

#### Common Mistakes

1. **Type objects too complex**: putting too much behavior logic inside type objects turns them into God Objects.
2. **Confusing type and instance**: putting state that belongs to the instance (such as current health) into the type object.
3. **Missing validation**: loading type objects from config without validating the data, causing runtime errors.

---

## Part Five: Decoupling Patterns

These three patterns concern how the parts of a game system can collaborate in a **loosely coupled** way—systems interact through abstract interfaces instead of depending directly on concrete implementations.

---

### 13. Component

#### Why Do You Need This Pattern?

In traditional object-oriented design, game entities are organized by inheritance:

```text
Entity
├── Character
│   ├── Player
│   ├── NPC
│   └── Monster
├── Item
│   ├── Weapon
│   └── Potion
└── Projectile
```

Problems surface quickly: should a "flying treasure chest" inherit from `Projectile` or `Item`? Should a "spell-casting NPC" inherit from `Character`, or have a `Spellcaster` capability? The deeper the inheritance hierarchy, the wider the blast radius of a base-class change.

**The core problem the Component pattern solves is: building complex game entities with "composition" instead of "inheritance."** Nystrom points out that this follows the "composition over inheritance" design principle, but games apply it more thoroughly—each game entity is essentially an "empty shell" whose behavior is decided entirely by the components mounted on it.

#### Nystrom's Core Insight

Nystrom highlights the two core values of the Component pattern:

1. **Flexibility**: the same entity can carry different component combinations. An NPC with a "combat component" becomes a warrior; with a "dialogue component" it becomes a merchant; with both, a fighting merchant.
2. **Data-driven**: components can be loaded from config files. Designers can define new entity types through config files without touching code.

Nystrom also names the Component pattern's drawback: **added indirection**. Accessing a component requires a lookup through the entity, which is slower than a direct method call. In performance-sensitive scenarios (such as updating ten thousand entities per frame), this overhead can become a problem.

#### Real Scenarios on the Game Server

**Entity systems in an MMO**: players, monsters, and NPCs are all entities, and their differences are decided by components. Players have an "inventory component," "quest component," and "social component"; monsters have an "AI component" and "combat component"; NPCs have a "dialogue component" and "shop component." By combining different components, you can build a rich set of entity types from a small number of base types.

**Piece capabilities in auto-chess**: each piece's capabilities are decided by its components. The "attack component" defines basic attacks, the "skill component" defines active skills, and the "synergy component" defines race/class effects. By combining different components, designers can create new pieces.

**Tower types in tower defense**: each tower is assembled from an "attack component," "effect component," and "range component." By swapping components, you can change a tower's behavior without touching code.

#### When Not to Use It?

- Entity types are few and fixed, with a simple inheritance hierarchy.
- Performance requirements are extreme, and component lookup overhead is unacceptable.
- The team is unfamiliar with component-based architecture, and the learning cost is high.

#### Code Example: Component-Based Entities

```go
// 组件接口
type Component interface {
    Update(dt float64)
    Entity() *Entity
}

// 实体：组件容器
type Entity struct {
    id         uint64
    components map[reflect.Type]Component
}

func (e *Entity) AddComponent(c Component) {
    e.components[reflect.TypeOf(c)] = c
}

func (e *Entity) GetComponent(cType reflect.Type) Component {
    return e.components[cType]
}

// 具体组件：战斗
type CombatComponent struct {
    entity *Entity
    ATK    int
    DEF    int
}

func (c *CombatComponent) Update(dt float64) {
    // 战斗逻辑
}

// 使用：组合组件构建实体——行为来自组装，不是继承
func buildPlayer() *Entity {
    player := NewEntity()
    player.AddComponent(&CombatComponent{ATK: 100, DEF: 50})
    player.AddComponent(&InventoryComponent{Capacity: 20})
    return player
}
```

#### Common Mistakes

1. **Circular dependencies between components**: component A calls component B, and component B calls component A.
2. **Wrong component granularity**: components too fine (one per attribute), so entities end up with dozens of them; components too coarse, and flexibility is lost.
3. **Over-engineering**: for simple games, the complexity the Component pattern adds far exceeds its benefits.

---

### 14. Event Queue

#### Why Do You Need This Pattern?

On a game server, different systems need to communicate: the network layer notifies the logic layer after receiving player actions, the logic layer notifies the network layer to send results after processing, and the combat system notifies the UI system to update its display. If all communication is direct calls:

```text
网络层 → 逻辑层 → 战斗系统 → UI系统
网络层 → 经济系统 → 数据库
网络层 → 社交系统 → 好友系统
```

the systems form a complex call graph, and any delay in any one system blocks the entire call chain.

**The core problem the Event Queue pattern solves is: turning synchronous calls into asynchronous communication, decoupling systems through message passing.** Nystrom points out that the event queue is the asynchronous version of the Observer pattern—Observer notifies synchronously (the caller waits for all observers to finish), while the event queue notifies asynchronously (the caller puts the event in the queue and returns immediately, and consumers process it on their own schedule).

#### Nystrom's Core Insight

Nystrom emphasizes several key advantages of the event queue:

1. **Decoupling producers and consumers**: a producer does not need to know who consumes the event, or even whether a consumer exists.
2. **Buffering burst traffic**: when a huge number of events appear at once (such as a hundred-player melee), the queue buffers them so consumers are not crushed.
3. **Controlling processing order**: the queue guarantees FIFO order, so consumers can process events in order.

But Nystrom also names the **traps** of the event queue:

- **Increased latency**: events are not handled immediately but wait for consumers to poll, which adds response latency.
- **Harder debugging**: the producer and consumer run at different times and in different code paths, so tracing event flow is much harder than tracing a direct call.
- **Memory pressure**: many events pile up in the queue and consume memory.

#### Real Scenarios on the Game Server

**Input collection in frame sync games**: all players' actions are collected through an event queue and processed in batch at the start of each tick. This avoids sync problems caused by actions arriving at different times.

**World events in an MMO**: events such as killing a Boss, completing a quest, and trading items go into a global event queue. Each system (achievements, leaderboards, mail) consumes them asynchronously without blocking each other.

**On-chain interaction in blockchain games**: players' on-chain actions (minting an NFT, transferring assets) are sent to on-chain contracts through an event queue. The queue buffers bursts of on-chain requests so RPC nodes are not crushed.

#### When Not to Use It?

- Events that need immediate handling (such as synchronous combat adjudication).
- Very few events, where the queue's overhead is not worth it.
- You need the processing result (the event queue is one-way communication).

#### Code Example: A Thread-Safe Event Queue

```go
type EventQueue struct {
    ch chan Event  // 有界 channel 作为队列
}

func NewEventQueue(capacity int) *EventQueue {
    return &EventQueue{ch: make(chan Event, capacity)}
}

// 生产者：非阻塞发送
func (eq *EventQueue) Push(e Event) bool {
    select {
    case eq.ch <- e:
        return true
    default:
        return false  // 队列满了，丢弃事件
    }
}

// 消费者：阻塞接收
func (eq *EventQueue) Pop() Event {
    return <-eq.ch
}
```

#### Common Mistakes

1. **Unbounded queue growth**: consumers cannot keep up with producers, and the queue inflates without limit until OOM.
2. **Lost events**: when the queue is full, events are dropped with no logging or retry mechanism.
3. **Deadlock**: a consumer pushes an event back into the queue while processing one, so once the queue is full everyone blocks each other.
4. **Order dependence**: assuming processing order matches enqueue order, but multiple consumers handling concurrently can scramble it.

---

### 15. Service Locator

#### Why Do You Need This Pattern?

A game server has many global services: logging, configuration, database, cache, message queue. Every business module needs to use these services. If every module creates its own service instances:

```go
func handlePlayerLogin(playerID uint64) {
    db := NewMySQLConnection()       // 每次都创建新连接
    cache := NewRedisClient()        // 每次都创建新连接
    log := NewFileLogger()           // 每次都创建新文件
    // ...
}
```

this is clearly unworkable—wasteful of resources and extremely slow.

**The core problem the Service Locator pattern solves is: providing a global service registration and lookup mechanism, so code can retrieve service instances by name without knowing their concrete implementation.** Nystrom uses an elegant analogy: instead of giving your home address to a hundred people, give them an entry in a phone book. When you move, you only update the phone book, and everyone automatically gets the new address.

#### Nystrom's Core Insight

Nystrom's attitude toward the Service Locator is **cautiously recommended**. He points out several problems with it:

1. **Hidden dependencies**: the function signature gives no hint of which services it needs. `processPlayer()` may internally depend on three services—database, cache, logging—while the caller has no idea.
2. **Runtime errors**: if a service is forgotten during registration, there is no compile-time error; it panics only at runtime.
3. **Global state**: the service locator is essentially a container of global state, just more flexible than a singleton.

Nystrom's advice: **prefer dependency injection (DI), and use the service locator only when global access is truly necessary.** In Go, dependencies are usually injected through `context.Context` or struct fields rather than a global service locator.

#### Real Scenarios on the Game Server

**Game backends with a microservice architecture**: each microservice (login service, matchmaking service, battle service) registers and looks up services through a service-discovery mechanism (such as Consul or etcd). Clients do not need to know a service's concrete address; they just look it up by service name.

**Local service container**: logging, configuration, and the database connection pool inside a game server are managed by a service container. Register all services at startup, and look them up by name at runtime.

**Service replacement during testing**: in unit tests, you can inject mock services through the service locator to replace the real database and network connections.

#### When Not to Use It?

- Dependency injection can solve it (parameter passing, struct fields).
- There are very few services; passing references directly is simpler.
- You need compile-time dependency checking.

#### Code Example: A Concise Service Container

```go
// 服务容器
type ServiceContainer struct {
    mu       sync.RWMutex
    services map[string]interface{}
}

var container = &ServiceContainer{
    services: make(map[string]interface{}),
}

func Register(name string, svc interface{}) {
    container.mu.Lock()
    defer container.mu.Unlock()
    container.services[name] = svc
}

func GetService(name string) interface{} {
    container.mu.RLock()
    defer container.mu.RUnlock()
    return container.services[name]
}

// 使用：启动时注册，业务侧通过接口取用
func registerServices() {
    Register("db", NewDatabase())
    Register("cache", NewCache())

    db := GetService("db").(Database)
    _ = db // 演示取用方式；真实代码在依赖方使用
}
```

#### Common Mistakes

1. **Hard-coded service names**: using strings as service names means spelling errors are only found at runtime.
2. **Forgetting to register a service**: missing a registration at startup causes a runtime panic.
3. **Circular dependencies**: service A depends on service B, and service B depends on service A.
4. **Global-state sprawl**: registering everything as a service turns the code into a pile of global access.

---

## Part Six: Optimization Patterns

These four patterns concern **performance optimization**—when a game hits a performance bottleneck, which specific techniques can improve efficiency.

---

### 16. Data Locality

#### Why Do You Need This Pattern?

The bottleneck of modern CPUs is not computation speed but **memory access speed**. Computing a value may take only 1 nanosecond, but reading a value from main memory may take 100 nanoseconds. If data is scattered in memory (as in linked lists and tree structures), the CPU must wait for memory on every access, resulting in "the CPU idles waiting for data."

**The core problem the Data Locality pattern solves is: keeping related data contiguous in memory to maximize CPU cache hit rates.** Nystrom uses a very vivid analogy: imagine looking for books in a library. If all books are sorted by subject and placed contiguously on shelves, finding one lets you quickly find related ones. But if books are scattered randomly all over the library, every search means running through the whole library.

#### Nystrom's Core Insight

Nystrom points out that the core idea of data locality is **shifting from "object-oriented" to "data-oriented"**:

- **Object-oriented**: each object contains its own data and methods. Objects are scattered across memory, and the CPU cache cannot work effectively.
- **Data-oriented**: all data of the same type is stored contiguously in arrays. During traversal the CPU can prefetch the next batch of data, drastically reducing cache misses.

Nystrom stresses that this does not mean abandoning object-oriented design. You can keep an object-oriented architecture logically (using components, interfaces, etc.) while using arrays instead of object graphs for physical storage.

#### Real Scenarios on the Game Server

**Batch piece updates in auto-chess**: every frame must update all pieces' positions and states. If piece objects are scattered across the heap, every access waits on memory. If all pieces' position data is stored contiguously in one array, the CPU can read them in efficient batches.

**Entity sync in an MMO**: every frame must sync all players' positions to the AOI system. Storing all player position data in contiguous arrays enables batch reads and computation.

**Bullet management in tower defense**: every frame must update all in-flight bullets. Storing bullet data contiguously makes traversal and collision detection efficient.

#### When Not to Use It?

- The object count is small (<1000) and the CPU cache is sufficient.
- The objects' memory layout is already compact (e.g. simple structs).
- Objects are inserted and removed frequently (array insert/remove is expensive).

#### Code Example: Contiguous vs Scattered Storage

```go
// 散乱存储：每个对象独立分配内存
type BadStorage struct {
    entities map[uint64]*Entity  // 随机内存分布
}

// 连续存储：所有数据在一个数组中
type GoodStorage struct {
    positions []Vector3  // 连续内存
    healths   []int      // 连续内存
    count     int
}

// 遍历连续数据：CPU 缓存友好
func (s *GoodStorage) UpdateAll(dt float64) {
    for i := 0; i < s.count; i++ {
        s.positions[i].X += dt
        if s.healths[i] <= 0 {
            s.RemoveAt(i)
        }
    }
}
```

#### Common Mistakes

1. **Premature optimization**: introducing data-locality optimization in scenarios that do not need high performance, adding code complexity.
2. **Confusing logical and physical structure**: keep the component architecture logically and store in arrays physically. Do not sacrifice code readability for data locality.
3. **Forgetting to handle removal**: removing an element from the middle of an array shifts all later elements, so special handling is required (such as swap-and-pop).

---

### 17. Dirty Flag

#### Why Do You Need This Pattern?

On a game server, much computation is "incremental"—recomputation is needed only when data changes. Take the leaderboard: re-sorting is only needed when a player's score changes. If you re-sort every frame, a large amount of CPU time is wasted on unchanged data.

**The core problem the Dirty Flag pattern solves is: avoiding unnecessary repeated computation.** Nystrom's analogy: you do not check every minute whether the milk in the fridge has gone bad. You check only when you want to drink it. A dirty flag is the marker for "does this need re-checking"—mark the data as "dirty" when it changes, check the dirty flag when needed, and recompute only if it is dirty.

#### Nystrom's Core Insight

Nystrom points out that the key trade-off of the Dirty Flag pattern is **memory vs computation**:

- **No dirty flag**: recompute every frame, consuming CPU but requiring no extra memory.
- **With a dirty flag**: recompute only when data changes, saving CPU but requiring maintenance of the dirty flag state.

Nystrom emphasizes that dirty flags are especially suitable for:

1. **Data changes far less often than it is read**: a leaderboard may be read 100 times per second, but scores may change only once every 10 seconds.
2. **Recomputation is expensive**: pathfinding, view computation, collision detection.
3. **A one-frame delay is acceptable**: dirty flags usually take effect on the next frame, meaning read data may be one frame stale.

#### Real Scenarios on the Game Server

**Offline earnings in idle games**: while a player is offline, you do not need to compute earnings every second. When the player comes online, compute it once based on the offline duration. A dirty flag records "whether there is uncomputed offline time."

**Synergy effects in auto-chess**: the board's synergy effects only need recomputation when pieces change (purchase, sell, star upgrade). During each combat round, if pieces did not change, reuse the cached synergy results directly.

**AOI updates in an MMO**: a player's position needs to be updated in the spatial partition only when the player moves. If the player stands still, views do not need recomputation every frame.

#### When Not to Use It?

- Data changes every frame, and the dirty flag is never false.
- Recomputation is very cheap—cheaper than maintaining the dirty flag.
- Real-time response is required, and a one-frame delay is unacceptable.

#### Code Example: A Leaderboard Dirty Flag

```go
type Leaderboard struct {
    entries   []Entry
    dirty     bool  // 脏标记
    sorted    []Entry  // 缓存的排序结果
}

func (lb *Leaderboard) UpdateScore(playerID uint64, score int) {
    for i := range lb.entries {
        if lb.entries[i].PlayerID == playerID {
            lb.entries[i].Score = score
            lb.dirty = true  // 标记为脏
            return
        }
    }
}

func (lb *Leaderboard) GetTop10() []Entry {
    if lb.dirty {
        lb.sorted = sortEntries(lb.entries)  // 只在脏时重新排序
        lb.dirty = false
    }
    return lb.sorted[:10]
}
```

#### Common Mistakes

1. **Forgetting to mark dirty**: modifying data without setting the dirty flag, so reads return stale cached data.
2. **Clearing the flag too early**: clearing the dirty flag before the computation completes, so later reads use an unfinished result.
3. **Wrong flag granularity**: a global flag is too coarse (one field change recomputes everything); per-field flags are too fine (high maintenance cost).

---

### 18. Object Pool

#### Why Do You Need This Pattern?

During gameplay, objects are created and destroyed constantly: bullets, particles, damage numbers, network packets. Every creation allocates memory, and every destruction frees it. At high frequency (such as spawning 1000 bullets per second), memory allocation and GC pressure become a serious performance bottleneck.

**The core problem the Object Pool pattern solves is: pre-allocating a batch of objects and reusing them, avoiding frequent memory allocation and freeing.** Nystrom's analogy: it is like the balls in a bowling alley—the alley does not manufacture new balls for every game; it maintains a rack of balls, players put them back after use, and the next person keeps using them.

#### Nystrom's Core Insight

Nystrom highlights two key use cases for object pools:

1. **GC-sensitive languages**: in garbage-collected languages such as Go, Java, and C#, frequently creating and destroying small objects causes GC pressure and frame stutter. Object pools reduce the number of objects GC must track.
2. **Objects with expensive allocation**: some objects have heavy constructors (such as database connections and network connections), so pre-creating a batch is more efficient than creating new ones each time.

Nystrom also warns: **do not use object pools blindly**. For objects whose creation and destruction are both lightweight, the pool's benefit may not justify its complexity. Modern GCs already perform well, and direct allocation is often simpler and faster than pooling.

#### Real Scenarios on the Game Server

**Bullet management in tower defense**: each tower fires 1-5 bullets per second, and a game may have thousands of bullets in flight at once. An object pool avoids frequent memory allocation.

**Network packet buffers in an MMO**: each player sends dozens of packets per second, each needing a buffer. Managing the buffers with an object pool avoids GC pressure.

**Combat logs in auto-chess**: each round of combat may produce thousands of log entries. An object pool manages the log objects.

#### When Not to Use It?

- Object creation and destruction are lightweight and GC handles them well.
- The object has complex reset logic, and resetting costs more than creating a new object.
- The complexity introduced by the pool's management code is not worth it.

#### Code Example: A Simple Object Pool

```go
type Pool struct {
    mu    sync.Mutex
    pool  []interface{}
    New   func() interface{}
    Reset func(interface{})
}

func (p *Pool) Get() interface{} {
    p.mu.Lock()
    defer p.mu.Unlock()
    if len(p.pool) > 0 {
        obj := p.pool[len(p.pool)-1]
        p.pool = p.pool[:len(p.pool)-1]
        return obj
    }
    return p.New()  // 池空了，创建新对象
}

func (p *Pool) Put(obj interface{}) {
    if p.Reset != nil {
        p.Reset(obj)  // 重置对象状态
    }
    p.mu.Lock()
    defer p.mu.Unlock()
    p.pool = append(p.pool, obj)
}

// 使用：池负责复用，New/Reset 由业务注入
func newBulletPool() *Pool {
    return &Pool{
        New:   func() interface{} { return &Bullet{} },
        Reset: func(obj interface{}) { obj.(*Bullet).Reset() },
    }
}
```

#### Common Mistakes

1. **Forgetting to return objects**: taking an object from the pool and never putting it back, so the pool gradually drains.
2. **Unreset objects**: failing to reset state when returning an object, so the next use carries leftover data from the last use.
3. **Thread-safety issues**: accessing the object pool from multiple threads without locking, causing races.
4. **Wrong pool size**: too small, and new objects are created constantly; too large, and memory is wasted.

---

### 19. Spatial Partition

#### Why Do You Need This Pattern?

In an MMO, the map contains tens of thousands of entities (players, monsters, NPCs, items). To compute "who is within whose view," the simplest approach is pairwise comparison:

```go
// 朴素 AOI 实现：两两比较所有实体对
func bruteForceAOI(entities []*Entity, count int) {
    for a := 0; a < count; a++ {
        for b := a + 1; b < count; b++ {
            if distance(entities[a], entities[b]) < AOI_RADIUS {
                // 在视野内
            }
        }
    }
}
```

This is O(n²) complexity. When n=10000, each frame needs 50 million comparisons. When n=50000, the comparison count reaches 1.25 billion. This is clearly unacceptable.

**The core problem the Spatial Partition pattern solves is: reducing spatial queries from O(n²) to O(n log n) or even O(n).** Nystrom uses an intuitive analogy: imagine looking for a book in a library. Without classification, you can only flip through them one by one—O(n). But if books are classified onto different shelves by subject, you only need to go to the "game development" shelf—O(1) or O(log n).

#### Nystrom's Core Insight

Nystrom introduces several common spatial partition strategies:

1. **Grid**: divide the map into equal cells, each storing the entities inside it. A query only needs to check nearby cells. Suitable for scenarios where entities are evenly distributed.
2. **Quadtree**: recursively divide space into four quadrants, each of which is subdivided further. Suitable for scenarios where entities are unevenly distributed.
3. **Octree**: the three-dimensional version of the quadtree, suitable for 3D games.
4. **BVH (Bounding Volume Hierarchy)**: organize entities with hierarchical bounding volumes. Suitable for scenarios needing precise collision detection.

Nystrom emphasizes that which strategy to choose depends on the **distribution characteristics of the entities**: if entities are evenly distributed (such as monsters moving along fixed paths in a tower defense game), a grid is simplest and most efficient; if entities are unevenly distributed (such as players clustering in towns in an MMO), a quadtree is more suitable.

#### Real Scenarios on the Game Server

**AOI systems in an MMO**: tens of thousands of entities on the map, and each player only needs to know the other entities within view. With grid partitioning, divide the map into a 100x100 set of cells, each storing the entities inside it. When a player queries views, only the surrounding 9 cells are checked.

**Collision detection in auto-chess**: pieces on the board need to detect targets within a skill's range during combat. With grid partitioning, size each cell equal to the skill range and quickly find pieces in range.

**Path planning in tower defense**: monsters need to find a path from start to end. Represent the map with grid partitioning, and the A* algorithm searches for the path on the grid.

#### When Not to Use It?

- The entity count is small (<100); brute-force traversal is enough.
- Entities barely move (static scene); efficient spatial queries are unnecessary.
- Query frequency is very low (only a few queries per second); the optimization pays little.

#### Code Example: A Grid Spatial Partition

```go
type SpatialGrid struct {
    cellSize float64
    cells    map[int64][]*Entity
}

func (g *SpatialGrid) cellKey(x, y float64) int64 {
    cx := int64(math.Floor(x / g.cellSize))
    cy := int64(math.Floor(y / g.cellSize))
    return cx*100000 + cy
}

func (g *SpatialGrid) Insert(e *Entity) {
    key := g.cellKey(e.X, e.Y)
    g.cells[key] = append(g.cells[key], e)
}

// 查询：只检查附近 9 个格子
func (g *SpatialGrid) Query(x, y, radius float64) []*Entity {
    var result []*Entity
    minCx := int64(math.Floor((x - radius) / g.cellSize))
    maxCx := int64(math.Floor((x + radius) / g.cellSize))
    minCy := int64(math.Floor((y - radius) / g.cellSize))
    maxCy := int64(math.Floor((y + radius) / g.cellSize))

    for cx := minCx; cx <= maxCx; cx++ {
        for cy := minCy; cy <= maxCy; cy++ {
            key := cx*100000 + cy
            for _, e := range g.cells[key] {
                dx, dy := e.X-x, e.Y-y
                if dx*dx+dy*dy <= radius*radius {
                    result = append(result, e)
                }
            }
        }
    }
    return result
}
```

#### Common Mistakes

1. **Wrong cell size**: cells too small, and a query must check too many cells; cells too large, and each cell holds too many entities.
2. **Not updating the partition when entities move**: an entity that moved is not removed from its old cell and inserted into the new one, so query results are inaccurate.
3. **Poor handling of edge cases**: an entity near a cell boundary must exist in adjacent cells simultaneously, or queries will miss it.
4. **Over-designing**: for simple scenarios, storing all entities in an array and brute-force traversing is enough.

---

## Practical Case: Hunting a Process-Level Singleton Misuse That Sent Out 7 Extra Settlement Rewards

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified. It takes "5. Singleton"'s cautionary warning, "15. Service Locator"'s global lookup, and the summary decision table's "globally unique service → prefer DI" into deep water: a singleton answers "should there be one globally," not "can we get away with passing fewer parameters"—that is the pitfall ledger of pattern selection, and the full expansion of "patterns are tools, not goals."

**Background and symptoms**: a room-based competitive game (room-based session) where one process hosts multiple rooms. In the first weekend after the new mode "Double-Team Flag Capture" went live, customer support received **12** tickets saying "settlement rewards were sent twice"; on the finance side, settlement transaction records aggregated by match ID: **24** matches in the period, but **31** records—**7** extra. Strangely, there was a pattern: the old modes never had the problem, and all **7** extra records fell inside the window of "two matches settling in the same second."

### Step 1: Symptoms and Criteria—First Make "Extra Rewards" an Auditable Ledger

The aggregation criterion was unified: aggregate settlement record counts by match ID, and each match should have exactly **1** record. Three ledgers:

- **Transaction ledger**: **31** records / **24** matches → **7** extra
- **Window ledger**: the period had exactly **7** "same-second double settlements"—each pair contributing **1** extra, not one off
- **Idempotency ledger**: no duplicate keys in the idempotency table, **0** message retries—not a delivery-layer duplication

All three ledgers point to the same place: **the extra rewards correlate only with "two settlements in the same second," not with who played or what they played**—this is a concurrency-shape problem, not a business-rule problem.

### Step 2: Layered Attribution—From the Gateway Down to the Registry

```text
网关层   幂等表无重复键、重试 0 次——排除重复投递
结算层   31 条流水签名合法、任务轨迹完整——不是伪造，是「真发了两轮」
并发层   多发 7 条两两成对落在同秒窗口；脚本复现：两房间并发结算必现，
         串行结算 1000 次零复现——竞态，不是算错
模式层   结算读的「战斗统计」注册在服务定位器的进程级全局表；
         两个房间的结算协程同秒「读-发-清」同一份统计：
         A 房读到、B 房也读到（清空之前），两边各发一轮——多发 1 条
```

### Step 3: Root Cause—"One Fewer Parameter to Pass" Put a Room-Level Service into a Process-Level Singleton

"Combat statistics" was originally built as a process-level singleton, fetched globally by name through the service locator, for a very plain reason: it saves passing one parameter. But the question a singleton answers is "should there be one globally": the database connection pool is (the whole process genuinely needs only one), but per-room combat statistics are not—they are naturally **one per match**. The chapter already warned: Singleton is overused, "it is essentially a disguised form of global state," and the service locator is essentially a container of global state; "When Not to Use It" also wrote that an "object with state needing reset" should not be a singleton. This incident is the compounded failure of those three sentences: **hidden dependency (fetching a service by name) + shared mutable state (one copy of statistics) + a second writer (the new mode brought concurrent settlement)**—the old modes' room settlements naturally staggered and never triggered it; "Double-Team Flag Capture" came in same-second pairs, and stepped on the landmine.

### Step 4: Remediation and Backfill—Layer the Registry by Lifecycle; Make Settlement Room-Private

Remediation in three steps: layer the registry into "process-level / room-level"—the connection pool and config center stay process-level, while combat statistics and the settler become room-level, created and destroyed with the room and passed in by dependency injection; settlement now holds statistics privately in the room's goroutine, letting only one execution unit touch the state along the single-writer lines of Chapter 05; as a backstop, add settlement idempotency keys and a "record count = match count" reconciliation. Regression: **1000** concurrent robot matches → **1000** records, **0** extras; targeted stress test of same-second double settlement with **500** pairs → **0** extras. A sweep of the global table found **2** more instances of the same misuse (leaderboard writes, chat filter cache), layered by lifecycle as well; the **7** extra records were fully recovered, and the **12** tickets were closed one by one.

**Backfill checklist**:

| Backfill item | Action | Backfill location |
|-----|------|--------|
| Service registration layering | Layer the registry into "process-level / room-level"; room-level services are created and destroyed with the room's lifecycle | Service Locator (15) |
| Singleton admission | Replace "should this be a singleton?" with "is the lifecycle process-scoped?": stateful services default to not being singletons | Singleton (5) |
| DI first | All new services are injected via constructor or context; business code is forbidden from fetching services by name | Service Locator (15) |
| Settlement reconciliation | "Record count = match count" enters daily inspection; targeted stress test of same-second double settlement enters the release gate | Concurrency models (Chapter 05) |

### Three Lessons from the Case

1. **A singleton answers "should there be one globally," not "can we pass fewer parameters"**—passing fewer parameters is the job of dependency injection.
2. **The service locator hides dependencies and also hides lifecycles**—the registry must be layered by lifecycle; putting room-level state into a process-level table is a time bomb.
3. **For a symmetry bug that "only reproduces in the same second," check shared mutable state first**—a problem that survives a thousand serial runs is usually waiting for a second writer.

---

## Summary: Pattern Selection Decision Table

| Problem scenario | Recommended pattern | Why |
|---------|---------|-------|
| Need undo/replay/network sync | Command | Turns operations into serializable data |
| Many objects of the same type sharing data | Flyweight | Separates intrinsic and extrinsic state |
| Loosely coupled communication between systems | Observer | Publisher does not know subscribers |
| Need to create objects dynamically from config | Prototype / Type Object | Data-driven object creation |
| Globally unique service | Singleton (with caution) / Dependency injection | Prefer DI |
| Object with multiple states and transitions | State | Replaces the boolean-flag explosion |
| Data consistency under concurrent reads and writes | Double Buffer | Separates read and write buffers |
| The game's progression over time | Game Loop | The fixed time step is key |
| Many objects each updating themselves | Update Method | Each object manages itself |
| AI/skills need dynamic modification | Bytecode | A hot-updatable instruction set |
| Control the capability range of subclasses | Subclass Sandbox | Encapsulates the low-level APIs |
| Define game types with data | Type Object | A runtime type system |
| Flexible composition of complex entities | Component | Composition over inheritance |
| Asynchronously decoupled system communication | Event Queue | Producers and consumers are independent |
| Registration and lookup of global services | Service Locator | Look up services by name |
| Memory-access performance optimization | Data Locality | Contiguous storage improves cache hits |
| Avoiding repeated computation | Dirty Flag | Recompute only when changed |
| Frequent object creation and destruction | Object Pool | Reuse instead of allocating |
| Spatial query optimization | Spatial Partition | O(n²) down to O(n log n) |

> **Nystrom's ultimate advice**: patterns are tools, not goals. Understand your problem first, then choose a suitable pattern. If a simple `if-else` solves the problem, use `if-else`. The main reason to introduce a pattern is that it makes your code easier to modify and easier to understand in the future.

---

## References

- Robert Nystrom, *Game Programming Patterns*, gameprogrammingpatterns.com
- The pattern classification and core ideas in this document come from the original book; the game server scenarios are supplemented from practical development experience

## Further Reading

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
- [genre-coverage](/system/genre-coverage.md)





