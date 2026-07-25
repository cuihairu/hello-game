# 常见玩法系统设计

游戏玩法系统是玩家体验的核心。本章梳理游戏中常见的玩法系统，分析其技术实现要点和架构设计。

## 1. 排行榜系统

### 1.1 排行榜类型

| 类型 | 数据特点 | 更新频率 | 实现方案 |
|------|---------|---------|---------|
| 实时排行榜 | 分数实时变化 | 高 | Redis Sorted Set |
| 延迟排行榜 | 定时刷新 | 低 | MySQL + Redis 缓存 |
| 赛季排行榜 | 赛季重置 | 中 | 分表 + 归档 |
| 跨服排行榜 | 多服数据汇总 | 中 | 跨服服务 + Redis |

### 1.2 Redis 实现

```go
type RankManager struct {
    redis *redis.Client
}

// 更新分数
func (m *RankManager) UpdateScore(rankType string, playerID uint64, score float64) {
    key := fmt.Sprintf("rank:%s", rankType)
    m.redis.ZAdd(ctx, key, &redis.Z{
        Score:  score,
        Member: playerID,
    })
}

// 获取排名
func (m *RankManager) GetRank(rankType string, playerID uint64) (int64, float64) {
    key := fmt.Sprintf("rank:%s", rankType)
    rank, _ := m.redis.ZRevRank(ctx, key, fmt.Sprintf("%d", playerID)).Result()
    score, _ := m.redis.ZScore(ctx, key, fmt.Sprintf("%d", playerID)).Result()
    return rank + 1, score  // 排名从0开始，转为从1开始
}

// 获取排行榜前N名
func (m *RankManager) GetTopN(rankType string, n int64) []RankEntry {
    key := fmt.Sprintf("rank:%s", rankType)
    results, _ := m.redis.ZRevRangeWithScores(ctx, key, 0, n-1).Result()
    
    var entries []RankEntry
    for i, result := range results {
        entries = append(entries, RankEntry{
            Rank:     int64(i + 1),
            PlayerID: result.Member.(uint64),
            Score:    result.Score,
        })
    }
    return entries
}
```

### 1.3 跨服排行榜

```go
// 跨服排行榜聚合
type CrossServerRank struct {
    redis       *redis.Client
    serverID    string
    crossServer *CrossServerClient
}

func (r *CrossServerRank) UpdateScore(playerID uint64, score float64) {
    // 1. 更新本服排行榜
    r.UpdateLocalScore(playerID, score)
    
    // 2. 同步到跨服服务
    r.crossServer.SyncScore(SyncScoreRequest{
        ServerID:  r.serverID,
        PlayerID: playerID,
        Score:     score,
    })
}

func (r *CrossServerRank) GetGlobalRank(playerID uint64) (int64, float64) {
    // 从跨服服务获取全局排名
    return r.crossServer.GetGlobalRank(playerID)
}
```

---

## 2. 活动系统

### 2.1 活动生命周期

```
┌─────────────────────────────────────┐
│           活动状态机                 │
├─────────────────────────────────────┤
│  未开始 → 进行中 → 已结束           │
│     ↓        ↓        ↓            │
│  预告期    活动期    结算期          │
└─────────────────────────────────────┘
```

### 2.2 活动数据结构

```go
type Activity struct {
    ID          int64
    Name        string
    Type        ActivityType
    StartTime   time.Time
    EndTime     time.Time
    Status      ActivityStatus
    Config      json.RawMessage  // 活动配置
    Rewards     []Reward         // 奖励配置
    
    // 运行时数据
    PlayerData  map[uint64]*ActivityPlayerData
}

type ActivityType int
const (
    ActivityTypeDaily ActivityType = iota    // 每日活动
    ActivityTypeWeekly                       // 每周活动
    ActivityTypeFestival                     // 节日活动
    ActivityTypeSeason                       // 赛季活动
    ActivityTypeSpecial                      // 特殊活动
)

type ActivityStatus int
const (
    ActivityStatusPreview ActivityStatus = iota  // 预告
    ActivityStatusActive                         // 进行中
    ActivityStatusSettling                       // 结算中
    ActivityStatusEnded                          // 已结束
)
```

### 2.3 活动管理器

```go
type ActivityManager struct {
    activities map[int64]*Activity
    scheduler  *Scheduler
    db         *gorm.DB
}

func (m *ActivityManager) Start() {
    // 1. 加载所有活动
    m.loadActivities()
    
    // 2. 启动定时检查
    m.scheduler.AddFunc("*/10 * * * *", m.checkActivities)
}

func (m *ActivityManager) checkActivities() {
    now := time.Now()
    for _, activity := range m.activities {
        switch activity.Status {
        case ActivityStatusPreview:
            if now.After(activity.StartTime) {
                m.startActivity(activity)
            }
        case ActivityStatusActive:
            if now.After(activity.EndTime) {
                m.endActivity(activity)
            }
        }
    }
}

func (m *ActivityManager) startActivity(activity *Activity) {
    activity.Status = ActivityStatusActive
    m.saveActivity(activity)
    
    // 通知所有在线玩家
    m.notifyPlayers(activity)
}

func (m *ActivityManager) endActivity(activity *Activity) {
    activity.Status = ActivityStatusSettling
    m.saveActivity(activity)
    
    // 结算奖励
    m.settleActivity(activity)
    
    activity.Status = ActivityStatusEnded
    m.saveActivity(activity)
}
```

---

## 3. 跨服系统

### 3.1 跨服架构

```
┌─────────────────────────────────────┐
│           跨服中心                   │
│   (匹配、排行榜、公会战)             │
├─────────────────────────────────────┤
│     ┌─────────┐  ┌─────────┐       │
│     │  服务器1 │  │ 服务器2  │       │
│     └─────────┘  └─────────┘       │
│     ┌─────────┐  ┌─────────┐       │
│     │  服务器3 │  │ 服务器4  │       │
│     └─────────┘  └─────────┘       │
└─────────────────────────────────────┘
```

### 3.2 跨服匹配

```go
type MatchManager struct {
    queue      *MatchQueue
    crossServer *CrossServerClient
}

type MatchRequest struct {
    PlayerID   uint64
    ServerID   string
    Level      int
    Rank       int
    MatchType  MatchType
    Timestamp  time.Time
}

type MatchResult struct {
    MatchID    string
    Players    []MatchPlayer
    ServerID   string  // 分配到的服务器
    CreateTime time.Time
}

func (m *MatchManager) AddToQueue(req MatchRequest) {
    // 1. 添加到匹配队列
    m.queue.Push(req)
    
    // 2. 尝试匹配
    m.tryMatch()
}

func (m *MatchManager) tryMatch() {
    // 获取等待中的玩家
    players := m.queue.GetWaitingPlayers()
    
    // 按规则匹配
    matches := m.matchPlayers(players)
    
    // 分配服务器
    for _, match := range matches {
        serverID := m.allocateServer(match)
        m.notifyPlayers(match, serverID)
    }
}
```

### 3.3 跨服公会战

```go
type GuildWarManager struct {
    crossServer *CrossServerClient
    guilds      map[uint64]*Guild
}

type GuildWar struct {
    ID          int64
    Season      int
    StartTime   time.Time
    EndTime     time.Time
    Status      GuildWarStatus
    
    // 参战公会
    RedGuild    *Guild
    BlueGuild   *Guild
    
    // 战场状态
    BattleField *BattleField
}

func (m *GuildWarManager) StartGuildWar(redGuildID, blueGuildID uint64) {
    // 1. 创建战场
    battlefield := m.createBattleField()
    
    // 2. 分配服务器
    serverID := m.allocateServer()
    
    // 3. 通知参战玩家
    m.notifyGuildMembers(redGuildID, serverID)
    m.notifyGuildMembers(blueGuildID, serverID)
    
    // 4. 开始战斗
    m.startBattle(battlefield)
}
```

---

## 4. 合服系统

### 4.1 合服流程

```
1. 合服准备
   ├── 数据备份
   ├── 冲突检测
   └── 补偿计算

2. 数据迁移
   ├── 玩家数据合并
   ├── 公会数据合并
   ├── 排行榜重建
   └── 邮件合并

3. 冲突处理
   ├── 重名玩家处理
   ├── 公会名冲突处理
   └── 资产合并规则

4. 上线验证
   ├── 数据完整性检查
   ├── 功能验证
   └── 监控告警
```

### 4.2 合服数据结构

```go
type MergeServer struct {
    ID          int64
    SourceServers []string  // 源服务器列表
    TargetServer  string    // 目标服务器
    Status      MergeStatus
    StartTime   time.Time
    EndTime     time.Time
    
    // 迁移进度
    Progress    float64
    TotalItems  int64
    MigratedItems int64
}

type MergeStatus int
const (
    MergeStatusPending MergeStatus = iota
    MergeStatusMerging
    MergeStatusVerifying
    MergeStatusCompleted
    MergeStatusFailed
)
```

### 4.3 合服数据迁移

```go
type MergeManager struct {
    db         *gorm.DB
    redis      *redis.Client
    crossServer *CrossServerClient
}

func (m *MergeManager) MergeServers(sourceServers []string, targetServer string) error {
    // 1. 创建合服任务
    merge := &MergeServer{
        SourceServers: sourceServers,
        TargetServer:  targetServer,
        Status:        MergeStatusPending,
    }
    m.saveMerge(merge)
    
    // 2. 备份数据
    m.backupData(sourceServers)
    
    // 3. 合并玩家数据
    m.mergePlayerData(sourceServers, targetServer)
    
    // 4. 合并公会数据
    m.mergeGuildData(sourceServers, targetServer)
    
    // 5. 重建排行榜
    m.rebuildRankings(targetServer)
    
    // 6. 验证数据
    m.verifyData(targetServer)
    
    return nil
}

func (m *MergeManager) mergePlayerData(sourceServers []string, targetServer string) {
    for _, sourceServer := range sourceServers {
        // 获取源服务器所有玩家
        players := m.getPlayers(sourceServer)
        
        for _, player := range players {
            // 检查目标服务器是否有同名玩家
            existing := m.getPlayerByName(targetServer, player.Nickname)
            if existing != nil {
                // 重名处理：加后缀
                player.Nickname = fmt.Sprintf("%s_%s", player.Nickname, sourceServer)
            }
            
            // 迁移玩家数据
            m.migratePlayer(player, targetServer)
        }
    }
}
```

---

## 5. 滚服系统

### 5.1 滚服策略

```
开服策略：
1. 新服开放条件
   ├── 在线人数 > 阈值
   ├── 排行榜饱和度 > 阈值
   └── 运营活动需求

2. 新服开放流程
   ├── 预告期（1-3天）
   ├── 新服开启
   ├── 新手保护期（7天）
   └── 正常运营

3. 老服合并条件
   ├── 在线人数 < 阈值
   ├── 活跃度 < 阈值
   └── 运营策略需要
```

### 5.2 滚服管理器

```go
type RollServerManager struct {
    servers    map[string]*GameServer
    config     *RollServerConfig
    scheduler  *Scheduler
}

type RollServerConfig struct {
    // 开服条件
    OpenConditions struct {
        MinOnline    int     // 最低在线人数
        MaxRankSat   float64 // 排行榜饱和度
        MinActiveRate float64 // 最低活跃率
    }
    
    // 合服条件
    MergeConditions struct {
        MaxOnline     int     // 最高在线人数
        MinActiveRate float64 // 最低活跃率
    }
}

func (m *RollServerManager) CheckOpenNewServer() {
    // 检查是否需要开新服
    for _, server := range m.servers {
        if server.OnlineCount > m.config.OpenConditions.MinOnline {
            m.openNewServer()
            break
        }
    }
}

func (m *RollServerManager) CheckMergeServers() {
    // 检查是否需要合服
    var lowServers []*GameServer
    for _, server := range m.servers {
        if server.ActiveRate < m.config.MergeConditions.MinActiveRate {
            lowServers = append(lowServers, server)
        }
    }
    
    if len(lowServers) >= 2 {
        m.mergeServers(lowServers[0], lowServers[1])
    }
}
```

---

## 6. 常见玩法模块

### 6.1 战斗系统

```go
type BattleManager struct {
    battles map[string]*Battle
}

type Battle struct {
    ID          string
    Type        BattleType
    Players     []*BattlePlayer
    State       BattleState
    StartTime   time.Time
    EndTime     time.Time
    
    // 战斗数据
    Round       int
    Actions     []BattleAction
    Result      *BattleResult
}

type BattleType int
const (
    BattleTypePVE BattleType = iota  // PVE
    BattleTypePVP                     // PVP
    BattleTypeGVG                     // 公会战
    BattleTypeArena                   // 竞技场
)

func (m *BattleManager) StartBattle(battleType BattleType, players []*Player) *Battle {
    battle := &Battle{
        ID:        generateBattleID(),
        Type:      battleType,
        Players:   convertToBattlePlayers(players),
        State:     BattleStateInit,
        StartTime: time.Now(),
    }
    
    m.battles[battle.ID] = battle
    return battle
}

func (m *BattleManager) ProcessAction(battleID string, action BattleAction) error {
    battle := m.battles[battleID]
    if battle == nil {
        return ErrBattleNotFound
    }
    
    // 验证行动合法性
    if err := m.validateAction(battle, action); err != nil {
        return err
    }
    
    // 执行行动
    m.executeAction(battle, action)
    
    // 检查战斗结束
    if m.checkBattleEnd(battle) {
        m.endBattle(battle)
    }
    
    return nil
}
```

### 6.2 背包系统

```go
type InventoryManager struct {
    db *gorm.DB
}

type Inventory struct {
    ID        int64
    PlayerID  int64
    Items     []*Item
    Capacity  int
}

type Item struct {
    ID        int64
    ItemID    int
    Count     int
    ExpireAt  *time.Time
    Extra     json.RawMessage
}

func (m *InventoryManager) AddItem(playerID int64, itemID int, count int) error {
    // 1. 检查背包空间
    inv, err := m.getInventory(playerID)
    if err != nil {
        return err
    }
    
    if len(inv.Items)+count > inv.Capacity {
        return ErrInventoryFull
    }
    
    // 2. 检查是否可叠加
    for _, item := range inv.Items {
        if item.ItemID == itemID && item.ExpireAt == nil {
            item.Count += count
            return m.saveInventory(inv)
        }
    }
    
    // 3. 创建新物品
    newItem := &Item{
        ItemID: itemID,
        Count:  count,
    }
    inv.Items = append(inv.Items, newItem)
    
    return m.saveInventory(inv)
}

func (m *InventoryManager) RemoveItem(playerID int64, itemID int, count int) error {
    inv, err := m.getInventory(playerID)
    if err != nil {
        return err
    }
    
    // 查找物品
    for _, item := range inv.Items {
        if item.ItemID == itemID {
            if item.Count < count {
                return ErrItemNotEnough
            }
            item.Count -= count
            if item.Count == 0 {
                // 移除物品
                m.removeItem(inv, item)
            }
            return m.saveInventory(inv)
        }
    }
    
    return ErrItemNotFound
}
```

### 6.3 邮件系统

```go
type MailManager struct {
    db *gorm.DB
}

type Mail struct {
    ID          int64
    PlayerID    int64
    Title       string
    Content     string
    Sender      string
    Attachments []MailAttachment
    Status      MailStatus
    CreateTime  time.Time
    ReadTime    *time.Time
    ExpireTime  time.Time
}

type MailAttachment struct {
    ItemType  int
    ItemID    int
    Count     int
}

type MailStatus int
const (
    MailStatusUnread MailStatus = iota
    MailStatusRead
    MailStatusClaimed
    MailStatusDeleted
)

func (m *MailManager) SendMail(playerID int64, mail *Mail) error {
    mail.PlayerID = playerID
    mail.Status = MailStatusUnread
    mail.CreateTime = time.Now()
    mail.ExpireTime = time.Now().Add(30 * 24 * time.Hour)  // 30天过期
    
    return m.db.Create(mail).Error
}

func (m *MailManager) ClaimMail(playerID int64, mailID int64) error {
    // 1. 获取邮件
    mail, err := m.getMail(playerID, mailID)
    if err != nil {
        return err
    }
    
    // 2. 检查状态
    if mail.Status != MailStatusRead {
        return ErrMailNotRead
    }
    
    // 3. 发放奖励
    for _, attachment := range mail.Attachments {
        if err := m.giveReward(playerID, attachment); err != nil {
            return err
        }
    }
    
    // 4. 更新状态
    mail.Status = MailStatusClaimed
    return m.saveMail(mail)
}
```

---

## 7. 与游戏类型相关的系统设计

### 7.1 挂机类游戏

**核心系统**：
- 离线收益计算
- 自动战斗
- 挂机任务
- 离线推送

**架构特点**：
- 弱实时，请求-响应为主
- 定时任务批量处理
- 缓存策略重要

### 7.2 MMO 类游戏

**核心系统**：
- AOI 管理
- 公会系统
- 跨服玩法
- 大规模战斗

**架构特点**：
- 强实时，状态同步
- 需要分布式架构
- 性能要求高

### 7.3 卡牌类游戏

**核心系统**：
- 抽卡系统
- 养成系统
- 回合战斗
- 活动系统

**架构特点**：
- 中等实时
- 数据一致性要求高
- 概率计算在服务端

### 7.4 策略类游戏

**核心系统**：
- 地图系统
- 资源系统
- 建造系统
- 联盟系统

**架构特点**：
- 弱实时
- 大量数据计算
- 需要定时任务

---

## 下一步

根据你的项目经验，建议优先补充：

1. **挂机系统** → 离线收益、自动战斗
2. **活动系统** → 活动配置、奖励发放
3. **跨服系统** → 匹配、排行榜、公会战
4. **合服系统** → 数据迁移、冲突处理
5. **战斗系统** → PVE/PVP、回合制/实时制
