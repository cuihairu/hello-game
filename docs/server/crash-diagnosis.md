---
title: Linux C++ Game Server Crash Diagnosis
order: 1
---

# Linux C++ Game Server Crash Diagnosis

> **Source and nature**: the content of this article comes from an external conversation record, source link
> <https://chatgpt.com/s/t_6ad5f221db408191847415f47f52a952>, retrieved 2026-10-19.
> It is **external advice, not established fact in this repo**: for anything touching this repo's practices, commands, and parameters,
> re-verify against your own runtime environment before acting on it (versions, distros, disk and permission policies all differ).

## Verification conclusion (measured at the time of ingestion)

| Verification item | Result |
|---|---|
| Pages about coredump / systemd-coredump / Crashpad inside docs/ | Not found at the documentation level (0 hits) |
| Pages about GDB and debug symbols inside docs/ | Not found at the documentation level (0 hits) |
| Whether this belongs to a prior existing design | **Could not be verified** -- "not found at the documentation level" does not mean it was never designed; the history is pending |

My explicit recommendation is: **treat the complete ELF core dump as the primary diagnostic data, use `systemd-coredump` as the default collection and management component, and pair it with GDB, separate debug symbols, and automated archiving. Do not introduce Crashpad in phase one.**

The reason is straightforward: your first goal is to preserve the crash scene as completely as possible for deep GDB analysis, not to pursue small crash reports. Linux's native core dump fits that goal better, and `systemd-coredump` fills in the gaps a raw core dump leaves in collection, indexing, retrieval, and lifecycle management.

## 1. Overall architecture

**C++ game server process**

Apollo / Aello / other game services

Release binary + debug symbols + version identifier

**Linux Kernel Core Dump**

Captures registers, threads, stacks, and dumpable memory mappings

**systemd-coredump**

Receives dumps, records metadata, produces a basic backtrace, manages files

**Core archive**

Full scene, crash information, version index

**GDB analysis**

Thread stacks, variables, heap objects, memory state

**Automated diagnosis and issue tracking**

Crash aggregation, version correlation, report generation, human review

Two things need to be distinguished here:

- **`systemd-coredump` is the collection and management layer, not a debugger.**
- **GDB is the tool for deep analysis; whether the scene can be parsed correctly depends on whether the core file is complete, and on whether the binary, symbols, and runtime dependencies match.**

`systemd-coredump` can record crash metadata, extract a basic backtrace, and retrieve dumps and launch the debugger through `coredumpctl`.

## 2. The actual trade-offs among the three options

| Capability | Raw core dump | systemd-coredump | Crashpad |
|------------|---------------|------------------|----------|
| Complete memory scene | Best fit, subject to the kernel dump policy | Same as the left, limited by storage and processing | Usually keeps only selected memory fragments |
| Deep GDB analysis | Native support | Native support, callable through `coredumpctl` | Requires matching minidump analysis tooling; cannot be used directly as a complete ELF core |
| Automatic indexing and retrieval | Build it yourself | Basic capability already provided | Has its own crash report database |
| Scene file management | Build it yourself | Built-in retention and cleanup mechanisms | Manages minidump reports |
| Fit for this need | Very good | **Best default choice** | Not used as the primary option |

Crashpad's design goal is to capture a subset of the machine and program state suitable for generating a crash report and save it as a minidump; it is not designed to replace a full memory dump on Linux.

For that reason I would not let Crashpad replace the core dump. Even if Crashpad becomes necessary in the future, it should be adopted as an independent report-collection capability, never at the cost of the complete scene.

## 3. Implementation plan

### 1. First make sure the game server is allowed to generate cores

First inspect the configuration actually in effect on the system:

```bash
ulimit -c
cat /proc/sys/kernel/core_pattern
systemctl status systemd-coredump.socket
```

If the game service is managed by systemd, prefer configuring it through the service unit rather than only running `ulimit -c unlimited` in an SSH terminal. Settings made in a terminal are not necessarily passed on to the actual game service process.

Assuming the service is named `game-server.service`, you can create an override:

```bash
sudo systemctl edit game-server.service
```

Write:

```ini
[Service]
LimitCORE=infinity
```

Then apply it:

```bash
sudo systemctl daemon-reload
sudo systemctl restart game-server.service
```

Note: restarting affects the running game service and should be scheduled inside a maintenance window. If your service is not launched by systemd, set the equivalent core limit in whatever process manager you use.

`LimitCORE=infinity` only lifts the process's core-size resource limit; it does not guarantee the final file will be complete. The kernel dump policy, disk space, systemd processing limits, and memory-map filtering can still affect the result.

### 2. Configure systemd-coredump

It is worth first checking the defaults already present on the system:

```bash
man 5 coredump.conf
systemd-analyze cat-config systemd/coredump.conf
```

Create a standalone config under `/etc/systemd/coredump.conf.d/`, for example `60-game-server.conf`:

```ini
[Coredump]
Storage=external
Compress=yes
```

These two settings respectively specify that dumps are stored externally first and that compression is enabled. External storage is usually a better fit for a game server than stuffing large cores straight into the logging system.

**But this is only baseline configuration, not a complete capacity plan.** A production deployment should also reconcile and set the following limits against the server's RAM, the number of concurrent crashes, and disk space:

- `ProcessSizeMax=`: the maximum core size allowed to be processed.
- `ExternalSizeMax=`: the maximum external core size allowed to be stored.
- `MaxUse=`: the total disk usage ceiling for systemd-coredump files.
- `KeepFree=`: the free disk space that must be kept free.

The defaults and exact behavior of these options depend on the systemd version the system runs, so defer to `man 5 coredump.conf` on the target machine. In particular, `ProcessSizeMax` and `ExternalSizeMax` set too small can each leave you without the complete scene you expected.

After changing the configuration, apply it according to your distro and systemd version, restarting `systemd-coredump.socket` when necessary; do not modify the global `kernel.core_pattern` directly without confirmation, or you may bypass the system's existing dump-handling mechanism.

### 3. Make sure disk and retention policies do not destroy the evidence

A game server process's virtual address space can be far larger than its resident physical memory, so a core's size cannot be estimated simply from the process's RSS. When several processes crash at the same time, the dump files can also fill the disk in an instant.

Recommendations:

- Put core storage on a separate partition or filesystem that has capacity monitoring.
- Set a retention ceiling for crash files, and archive important cores to separate storage.
- Monitor remaining disk space, core generation failures, and dump truncation.
- Apply access control to production cores, because memory may contain player data, credentials, session keys, and other sensitive information.

Do not simply release every limit to infinity in pursuit of "absolute completeness." The more reasonable approach is to be explicit about the disk budget, the concurrent-crash budget, and the evidence tier that must be retained.

## 4. What GDB deep analysis depends on

This is the most critical part of the whole plan. **Obtaining the core file is only the first step; whether the program state at crash time can be reconstructed depends on the build and release process.**

### 1. Keep the debug symbols for every release

A Release build with separate debug symbols is recommended, so that you avoid shipping an unoptimized Debug build just to debug production crashes.

Taking CMake as an example:

```cmake
set(CMAKE_BUILD_TYPE Release)

# 保留调试信息
add_compile_options(-g)

# 将调试信息放到独立文件中
add_link_options(
    -Wl,--build-id=sha1
)
```

This configuration is only an example; a real project still needs a post-build processing step to split the debug symbols out with `objcopy`, and to treat the release binary with `strip`.

The recommended release artifacts:

```text
release/
├── game-server              # 线上运行的二进制
├── lib/
│   └── libgame.so           # 实际加载的动态库
└── symbols/
    ├── game-server.debug
    └── libgame.so.debug
```

In a real project the symbol files should be archived separately, and not necessarily kept next to the production binary. The GNU Build ID can be used to tie the binary, the debug symbols, the dependency libraries, and the release version together.

You must guarantee: **the binary and libraries running at the moment of the crash correspond exactly to the versions used for the post-mortem analysis.** Merely recompiling the same Git commit once does not guarantee the binary is identical.

### 2. Use coredumpctl to grab the crash scene

List recent crashes:

```bash
coredumpctl list
```

View crash information for a specific process:

```bash
coredumpctl info <PID>
```

Launch GDB directly:

```bash
coredumpctl debug <PID>
```

If you need to archive a core as a standalone file:

```bash
coredumpctl dump <PID> 
    --output=game-server.core
```

Afterwards you can go straight to GDB:

```bash
gdb /path/to/game-server 
    game-server.core
```

Once inside GDB, the usual first round of triage commands:

```text
set pagination off
info files
info threads
thread apply all bt full
info registers
```

`thread apply all bt full` matters the most: a game server typically has network threads, logic threads, timer threads, storage threads, and more, so looking only at the crashed thread's call stack can miss deadlocks and other problems that involve other threads.

For more `coredumpctl` operations, refer to the official manual.

## 5. Extra design specific to game servers

A complete core still cannot solve everything. Three additional capabilities are recommended for a game server.

**1. Pre-crash runtime diagnostic information**

During normal operation, record the service ID, process start time, version number, recent key business events, thread roles, and the state of key queues. At crash time, the core is used to analyze the memory scene and the logs are used to reconstruct the business process.

Do not rely on the crash handler to perform complex log writes after the crash; critical data should already be persisted, or sitting in recoverable buffers, during normal operation.

**2. Make the dump policy explicit for shared memory and memory pools**

If you use custom allocators, shared memory, memory-mapped files, or large caches, check whether they enter the core. Linux can control the dump behavior of certain memory regions through mechanisms such as `coredump_filter` and `MADV_DONTDUMP`.

For memory regions you need to inspect, do not accidentally mark them as non-dumping; for huge mappings that need not be saved, also evaluate whether they can safely be excluded.

**3. Generate diagnostic reports automatically**

After a core is archived, an independent diagnostic job can automatically run GDB in batch mode and extract all threads' call stacks, loaded modules, Build IDs, crash signals, and source line numbers.

The automated reports are for fast triage and aggregation; the complete core is still kept for engineers' manual deep analysis. Do not let the automated analysis job become a precondition for saving the core successfully.

## 6. Recommended rollout order

1. **Phase one: verify the basic chain.** Configure the core limits and `systemd-coredump`, manually trigger a test crash once, and confirm the file is generated, GDB opens it, and all thread stacks look right.
2. **Phase two: establish the symbol archive.** For every release, save the binary, dynamic libraries, debug symbols, Git commit, and Build ID, and build a version-to-symbol mapping.
3. **Phase three: establish capacity and integrity monitoring.** Monitor dump failures, file truncation, insufficient disk space, and cleanup, and verify that large memory mappings are preserved correctly.
4. **Phase four: automated analysis.** Generate a standardized report for each core, correlated with the service instance, version, time, and the most recent business logs.
5. **Phase five: evaluate Crashpad.** Only consider adopting it when you genuinely need an independent application-level minidump, cross-platform reporting, or a separate crash collection path; do not use it to replace the complete core.

## Final selection

| Component | Decision |
|-----------|----------|
| Linux kernel core dump | Must be enabled |
| systemd-coredump | Default choice |
| GDB | Primary deep-diagnosis tool |
| Separate debug symbols and Build ID | Must be built |
| Automated crash analysis | Built in phase two |
| Crashpad | Not adopted for now |

One more point worth emphasizing: if your game server will eventually run inside containers, or under Kubernetes, the core collection path, the host dump policy, the container filesystem, and the symbol archive all need separate design; you cannot simply assume that configuration inside the container guarantees a complete dump.

The heart of this plan is not installing one more crash SDK, but making sure every production crash leaves behind **complete diagnostic evidence that is traceable, reproducible for analysis, and matched to the exact version**.

## Landing checklist

- [ ] Confirm this repo's server binaries are allowed to generate cores (ulimit -c / the distro's sysctl state)
- [ ] Verify systemd-coredump or an equivalent collection option lands in the target environment once (manually triggered crash)
- [ ] Store debug symbols separately per version, tied to the corresponding release binaries
- [ ] Write the core archive and retention policy (disk ceiling, retention count, cleanup timing) into this repo's ops documentation
- [ ] Convert this article's conclusions into this repo's own practice record, replacing the external-advice framing

<!-- When checking items off, attach the commit hash so the tracking table does not become an ornament nobody knows was ever executed -->
