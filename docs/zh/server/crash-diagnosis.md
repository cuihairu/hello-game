---
title: Linux C++ 游戏服务器崩溃诊断
order: 1
---

# Linux C++ 游戏服务器崩溃诊断

> **来源与性质**：本文内容来自外部对话整理，源链接
> <https://chatgpt.com/s/t_6ad5f221db408191847415f47f52a952>，检索日期 2026-10-19。
> 它是**外部建议，不是本仓既有事实**：涉及本仓做法、命令与参数的部分，
> 照做之前都要对着自己的运行环境重新核实（版本、发行版、磁盘与权限策略各不相同）。

## 核验结论（本次入库时实测）

| 核验项 | 结果 |
|---|---|
| docs/ 内 coredump / systemd-coredump / Crashpad 相关页面 | 文档层面查无（0 命中） |
| docs/ 内 GDB、调试符号 相关页面 | 文档层面查无（0 命中） |
| 是否属于此前已有设计 | **未能核实** —— 文档层面查无不等于没设计过，待补历史 |

我的明确建议是：**以完整 ELF core dump 为主要诊断数据，以 `systemd-coredump` 为默认采集和管理组件，配合 GDB、独立调试符号和自动化归档。第一阶段不引入 Crashpad。**

原因很直接：你的首要目标是尽可能保留崩溃现场，方便 GDB 深度分析，而不是追求小体积的崩溃报告。Linux 原生 core dump 更符合这个目标，`systemd-coredump` 则补齐了原始 core dump 在采集、索引、检索和生命周期管理上的不足。citeturn537292search0turn537292search4

## 一、总体架构

**C++ 游戏服务器进程**

Apollo / Aello / 其他游戏服务

发布二进制 + 调试符号 + 版本标识

**Linux Kernel Core Dump**

捕获寄存器、线程、栈和可转储内存映射

**systemd-coredump**

接收转储、记录元数据、生成基础回溯、管理文件

**Core 归档**

完整现场、崩溃信息、版本索引

**GDB 分析**

线程栈、变量、堆对象、内存状态

**自动化诊断与问题追踪**

崩溃聚合、版本关联、报告生成、人工复核

这里需要区分两件事：

- **`systemd-coredump` 是采集和管理层，不是调试器。**
- **GDB 才是深入分析工具，能否正确解析现场取决于 core 文件是否完整，以及二进制、符号和运行时依赖是否匹配。**

`systemd-coredump` 可以记录崩溃元数据、提取基础回溯，并通过 `coredumpctl` 检索和启动调试器。citeturn537292search0turn537292search7

## 二、三种方案的实际取舍

| 能力 | 原始 core dump | systemd-coredump | Crashpad |
|--------|--------|--------|--------|
| 完整内存现场 | 最适合，受内核转储策略影响 | 同左，受存储和处理限制 | 通常只保留选取的内存片段 |
| GDB 深度分析 | 原生支持 | 原生支持，可通过 `coredumpctl` 调用 | 需要对应的 minidump 分析工具，不能直接当作完整 ELF core |
| 自动索引与检索 | 自己实现 | 已提供基础能力 | 有自己的崩溃报告数据库 |
| 现场文件管理 | 自己实现 | 内置保留和清理机制 | 管理 minidump 报告 |
| 适合本次需求 | 很好 | **最佳默认选择** | 不作为主方案 |

Crashpad 的设计目标是获取适合生成崩溃报告的一部分机器与程序状态，再保存为 minidump；它不是为了代替 Linux 上的完整内存转储而设计的。citeturn537292search3turn537292search2

因此，我不会让 Crashpad 替代 core dump。即使未来需要 Crashpad，也应当把它作为独立的报告采集能力，而不是牺牲完整现场。

## 三、实施方案

### 1. 首先确保游戏服务器允许生成 core

先检查系统实际使用的配置：

```bash
ulimit -c
cat /proc/sys/kernel/core_pattern
systemctl status systemd-coredump.socket
```

如果游戏服务由 systemd 管理，优先通过服务单元配置，不要只在 SSH 终端里执行 `ulimit -c unlimited`。终端里的设置不一定会传递到实际的游戏服务进程。

假设服务名称是 `game-server.service`，可以创建覆盖配置：

```bash
sudo systemctl edit game-server.service
```

写入：

```ini
[Service]
LimitCORE=infinity
```

然后应用：

```bash
sudo systemctl daemon-reload
sudo systemctl restart game-server.service
```

注意：重启会影响正在运行的游戏服务，应安排在维护窗口执行。若你的服务并非由 systemd 启动，需要在对应的进程管理器中设置等效的 core 限制。

`LimitCORE=infinity` 只解除进程的 core 大小资源限制，并不保证最终文件一定完整；内核转储策略、磁盘空间、systemd 处理限制和内存映射过滤仍然会影响结果。

### 2. 配置 systemd-coredump

建议先检查系统已有的默认值：

```bash
man 5 coredump.conf
systemd-analyze cat-config systemd/coredump.conf
```

在 `/etc/systemd/coredump.conf.d/` 下创建独立配置，例如 `60-game-server.conf`：

```ini
[Coredump]
Storage=external
Compress=yes
```

这两项分别指定转储优先存储到外部文件，以及启用压缩。外部存储通常比把大型 core 直接塞进日志系统更适合游戏服务器。

**但这只是基础配置，不是完整的容量策略。** 正式部署还应结合服务器 RAM、并发崩溃数量和磁盘空间，核对并设置以下限制：

- `ProcessSizeMax=`：允许处理的最大 core 大小。
- `ExternalSizeMax=`：允许存储的最大外部 core 大小。
- `MaxUse=`：systemd-coredump 文件总占用上限。
- `KeepFree=`：磁盘需要保留的可用空间。

这些选项的默认值及具体行为取决于系统所使用的 systemd 版本，应以目标机器上的 `man 5 coredump.conf` 为准。特别是 `ProcessSizeMax` 和 `ExternalSizeMax` 过小，都可能让你拿不到预期的完整现场。

修改配置后，根据发行版和 systemd 版本应用配置，必要时重启 `systemd-coredump.socket`；不要在未经确认的情况下直接修改全局 `kernel.core_pattern`，否则可能绕过系统现有的转储处理机制。

### 3. 确保磁盘和保留策略不会毁掉证据

游戏服务器进程的虚拟地址空间可能远大于实际物理内存，因此 core 的大小不能简单按进程 RSS 估算。多进程同时崩溃时，转储文件还可能瞬间占满磁盘。

建议：

- 把 core 存储安排在有容量监控的独立分区或文件系统上。
- 为崩溃文件设置保留上限，并将重要 core 归档到独立存储。
- 监控磁盘剩余空间、core 生成失败和转储截断情况。
- 对生产 core 进行访问控制，因为内存中可能包含玩家数据、凭证、会话密钥及其他敏感信息。

不要为了追求“绝对完整”而直接把所有限制无限放开。更合理的做法是明确磁盘预算、并发崩溃预算和必须保留的证据等级。

## 四、GDB 深度分析必须做好什么

这是整个方案最关键的部分。**拿到 core 文件只是第一步，能否还原崩溃时的程序状态，取决于构建和发布流程。**

### 1. 保留每个版本的调试符号

建议采用 Release 构建加独立调试符号的方式，避免为了调试线上崩溃而直接发布未优化的 Debug 版本。

以 CMake 为例：

```cmake
set(CMAKE_BUILD_TYPE Release)

# 保留调试信息
add_compile_options(-g)

# 将调试信息放到独立文件中
add_link_options(
    -Wl,--build-id=sha1
)
```

这里的配置只是示例，实际工程还需要通过构建后处理流程使用 `objcopy` 分离调试符号，并通过 `strip` 处理发布二进制。

推荐的发布产物：

```text
release/
├── game-server              # 线上运行的二进制
├── lib/
│   └── libgame.so           # 实际加载的动态库
└── symbols/
    ├── game-server.debug
    └── libgame.so.debug
```

实际项目中，符号文件应独立归档，而不是一定和线上二进制放在一起。可以使用 GNU Build ID 将二进制、调试符号、依赖库与发布版本关联起来。

必须保证：**崩溃发生时运行的二进制和库，与事后分析所用的版本完全对应。** 仅仅重新编译一次相同的 Git 提交，并不能保证二进制完全一致。

### 2. 使用 coredumpctl 获取崩溃现场

列出最近的崩溃：

```bash
coredumpctl list
```

查看指定进程的崩溃信息：

```bash
coredumpctl info <PID>
```

直接启动 GDB：

```bash
coredumpctl debug <PID>
```

如果需要把 core 归档为独立文件：

```bash
coredumpctl dump <PID> 
    --output=game-server.core
```

之后可以直接使用 GDB：

```bash
gdb /path/to/game-server 
    game-server.core
```

进入 GDB 后，常用的第一轮排查命令：

```text
set pagination off
info files
info threads
thread apply all bt full
info registers
```

`thread apply all bt full` 尤其重要：游戏服务器通常有网络线程、逻辑线程、定时器线程、存储线程等，仅查看崩溃线程的调用栈可能会遗漏死锁或其他线程参与的问题。

更多 `coredumpctl` 的操作可以参考官方手册。citeturn537292search7

## 五、针对游戏服务器的额外设计

完整 core 也不能解决所有问题。游戏服务器建议额外建设三项能力。

**1. 崩溃前的运行时诊断信息**

在正常运行期间记录服务 ID、进程启动时间、版本号、最近的关键业务事件、线程角色和关键队列状态。崩溃时，core 用来分析内存现场，日志用来还原业务过程。

不要依赖崩溃处理函数在崩溃后执行复杂的日志写入；关键数据应当在正常运行时就已经持久化或进入可恢复的缓冲区。

**2. 明确共享内存和内存池的转储策略**

如果使用自定义 allocator、共享内存、内存映射文件或大型缓存，应检查它们是否进入 core。Linux 可以通过 `coredump_filter` 及 `MADV_DONTDUMP` 等机制控制部分内存区域的转储行为。

对需要检查的内存区域，不要误设置为不转储；对无需保存的巨大映射，也要评估它们是否可以安全排除。

**3. 自动生成诊断报告**

可以在 core 归档后，由独立诊断任务自动运行 GDB 批处理，提取所有线程的调用栈、加载模块、Build ID、崩溃信号和源码行号。

自动报告用于快速定位与聚合，完整 core 仍然保留给工程师手动深入分析。不要让自动分析任务成为 core 保存成功的前置条件。

## 六、建议的落地顺序

1. **第一阶段：验证基础链路。** 配置 core 限制和 `systemd-coredump`，人工触发一次测试崩溃，确认文件生成、GDB 打开和所有线程栈正常。
2. **第二阶段：建立符号归档。** 每次发布保存二进制、动态库、调试符号、Git 提交和 Build ID，建立版本到符号的映射。
3. **第三阶段：建立容量与完整性监控。** 监控转储失败、文件截断、磁盘空间不足和清理情况，并验证大型内存映射是否被正确保留。
4. **第四阶段：自动化分析。** 为每个 core 生成标准化报告，关联服务实例、版本、时间和最近的业务日志。
5. **第五阶段：评估 Crashpad。** 只有当你确实需要独立的应用级 minidump、跨平台报告或单独的崩溃收集链路时，再考虑引入它；不要用它取代完整 core。

## 最终选型

| 组件 | 决策 |
|--------|--------|
| Linux 内核 core dump | 必须启用 |
| systemd-coredump | 默认使用 |
| GDB | 深度诊断主工具 |
| 独立调试符号与 Build ID | 必须建设 |
| 自动化崩溃分析 | 第二阶段建设 |
| Crashpad | 暂不引入 |

还有一点值得强调：如果你的游戏服务器未来会运行在容器里，或者使用 Kubernetes，core 的采集路径、宿主机转储策略、容器文件系统和符号归档还需要单独设计，不能直接假定容器内配置就能保证完整转储。

这套方案的核心不是多装一个崩溃 SDK，而是让每次线上崩溃都能留下**可追溯、可复现分析、与精确版本匹配的完整诊断证据**。

## 落地跟踪

- [ ] 本仓服务端二进制确认允许生成 core（ulimit -c / 发行版 sysctl 现状）
- [ ] systemd-coredump 或等价采集方案在目标环境落地验证一次（人工触发崩溃）
- [ ] 调试符号按版本独立存放，与发布二进制建立对应关系
- [ ] core 归档与保留策略（磁盘上限、保留份数、清理时机）写入本仓运维文档
- [ ] 把本文结论转写为本仓自己的实践记录，替换外部建议口径

<!-- 勾选时附 commit hash，避免跟踪表变成没人知道是否执行过的摆设 -->
