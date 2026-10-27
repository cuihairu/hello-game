# History Line: First Batch of Nodes (Eight Tracks · 76 Entries)

> This is the first batch of node entries for the eight-track timeline at `docs/history/index.md`, in one-to-one correspondence with the runtime data at `docs/.vitepress/theme/data/timeline.mjs` (tests assert that every entry title can be found on this page). Each entry carries three elements: **hardware context** (the hardware/environment constraints at its appearance), **what it solved**, and **drawbacks** — missing any one means it doesn't count as done. Years follow the prevailing accounts in public sources; where sources disagree, the entry is marked "circa". Cross-link relations (influenced by X / spawned Y) are shown in bidirectional pairs on the page's cards; the registration format is documented at the end of this page.

## ① Game development (10 items)

<article class="history-node">
  <p class="history-node-title">c.1962 · Spacewar! (PDP-1)</p>
  <p><strong>Hardware context:</strong> minicomputers with oscilloscope displays, memory on the order of 16KB, graphics drawn by hand-written code writing directly to the display device</p>
  <p><strong>What it solved:</strong> proved that real-time interactive graphics programs could run and be copied and spread; games moved from paper to executable programs</p>
  <p><strong>Drawbacks:</strong> existed only in labs and universities, with no commercial form; tied to specific machines, practically impossible to distribute</p>
</article>

<article class="history-node">
  <p class="history-node-title">1972 · Pong arcade</p>
  <p><strong>Hardware context:</strong> dedicated arcade board built from TTL discrete components, no general-purpose CPU, the screen holding only black-and-white blocks and lines</p>
  <p><strong>What it solved:</strong> the first mass commercial success among video games, proving that video games were a business</p>
  <p><strong>Drawbacks:</strong> functionality soldered into the circuit, game and hardware as one; clone proliferation and no concept of content updates</p>
</article>

<article class="history-node">
  <p class="history-node-title">1978 · Space Invaders</p>
  <p><strong>Hardware context:</strong> Intel 8080 arcade board, monochrome CRT, memory counted in KB</p>
  <p><strong>What it solved:</strong> established the high-score table and rising difficulty as a replayability mechanism, the commercial engine of the golden age of arcades</p>
  <p><strong>Drawbacks:</strong> hard-coded rendering on tiny memory; a fixed per-frame sprite budget, so the game speeding up as the enemy force thinned went down in history as a bug</p>
</article>

<article class="history-node">
  <p class="history-node-title">1983 · The North American Atari crash</p>
  <p><strong>Hardware context:</strong> the 2600's ten-year-old architecture, 4KB cartridges as the mainstream, and no quality bar on development</p>
  <p><strong>What it solved:</strong> (an event) the collapse of quality control forced the industry to rebuild: from 1985, Nintendo's quality-control pact became the starting point of the North American market's recovery</p>
  <p><strong>Drawbacks:</strong> an industry cave-in; the North American console market frozen for roughly two years, and many companies shut down</p>
</article>

<article class="history-node">
  <p class="history-node-title">1985 · Super Mario Bros. (FC)</p>
  <p><strong>Hardware context:</strong> 6502@1.79MHz, 2KB RAM, 54 colors; cartridge capacity set the ceiling on content</p>
  <p><strong>What it solved:</strong> established the side-scrolling level design methodology: the combined paradigm of tutorial levels, scrolling pacing, and hidden elements</p>
  <p><strong>Drawbacks:</strong> cartridge capacity limited content volume, no battery saves, and continue points were the only progress protection</p>
</article>

<article class="history-node">
  <p class="history-node-title">1996 · Quake</p>
  <p><strong>Hardware context:</strong> 486/Pentium plus a Voodoo accelerator card, with networking still on dial-up and early broadband</p>
  <p><strong>What it solved:</strong> real-time full 3D and networked combat became product reality, and the client/server division of labor was validated by a shipping product</p>
  <p><strong>Drawbacks:</strong> a high-spec entry bar, software rendering nearly unplayable; play depended on LANs and the spread of dedicated servers</p>
</article>

<article class="history-node">
  <p class="history-node-title">2004 · World of Warcraft</p>
  <p><strong>Hardware context:</strong> PCs widespread and broadband into homes, household networks able to sustain persistent online play</p>
  <p><strong>What it solved:</strong> the million-subscriber MMO and the instanced-dungeon paradigm; live operations became the mainstream business model</p>
  <p><strong>Drawbacks:</strong> the playtime-card model brought health controversies, and content consumption speed forced a capacity arms race</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2009 · Minecraft (beta)</p>
  <p><strong>Hardware context:</strong> cross-platform Java that ran on low-end PCs, web distribution bypassing traditional channels</p>
  <p><strong>What it solved:</strong> the sandbox UGC gameplay paradigm, and a template for an indie team shipping a phenomenon-level product</p>
  <p><strong>Drawbacks:</strong> a Java performance ceiling with long-standing optimization debt; many compatibility problems in the mod ecosystem</p>
</article>

<article class="history-node">
  <p class="history-node-title">2016 · Pokémon GO</p>
  <p><strong>Hardware context:</strong> smartphone SoCs, GPS and 4G networks widespread, gyroscopes and cameras as standard equipment</p>
  <p><strong>What it solved:</strong> brought LBS + AR gameplay to the masses, with location services supporting global-scale concurrency</p>
  <p><strong>Drawbacks:</strong> safety incidents and pressure on public-space order, plus location spoofing and cheats</p>
</article>

<article class="history-node">
  <p class="history-node-title">2020 · Genshin Impact</p>
  <p><strong>Hardware context:</strong> phone GPUs already at previous-generation console level, one set of assets distributable across platforms</p>
  <p><strong>What it solved:</strong> a global template of cross-platform high-quality open world plus long-horizon version operations</p>
  <p><strong>Drawbacks:</strong> R&D cost and pressure to sustain update capacity, plus gacha monetization controversies</p>
</article>


## ② Hardware (10 items)

<article class="history-node">
  <p class="history-node-title">c.1971 · Intel 4004</p>
  <p><strong>Hardware context:</strong> the era of discrete logic and SSI/MSI chips, one board per function</p>
  <p><strong>What it solved:</strong> the first commercial microprocessor, turning the CPU into a purchasable standard part — the starting point of general-purpose computing</p>
  <p><strong>Drawbacks:</strong> a 4-bit data width, systems had to be assembled from many peripheral chips, high unit price, no ecosystem yet</p>
</article>

<article class="history-node">
  <p class="history-node-title">1981 · IBM PC 5150</p>
  <p><strong>Hardware context:</strong> 8088@4.77MHz, 64KB of memory, an operating system loaded from floppies</p>
  <p><strong>What it solved:</strong> x86 plus an open architecture established the PC standard, and the compatible-machine ecosystem exploded</p>
  <p><strong>Drawbacks:</strong> a high starting price of about 1565 USD and a bulky chassis, plus the barrier of the DOS command line</p>
</article>

<article class="history-node">
  <p class="history-node-title">1985 · Amiga 1000</p>
  <p><strong>Hardware context:</strong> custom graphics and audio chips (blitter, Paula), multimedia capability far beyond same-generation PCs</p>
  <p><strong>What it solved:</strong> consumer-grade multimedia: hardware-synthesized sound, frame-by-frame animation, and multitasking</p>
  <p><strong>Drawbacks:</strong> a closed and expensive platform, squeezed out of the mainstream by open PC compatibles</p>
</article>

<article class="history-node">
  <p class="history-node-title">1989 · Sound Blaster</p>
  <p><strong>Hardware context:</strong> PC audio until then meant only a beeper, with AdLib's FM music arriving first in 1987</p>
  <p><strong>What it solved:</strong> brought sound effects and sampled music to the PC, establishing the de facto standard for PC game audio</p>
  <p><strong>Drawbacks:</strong> the compatibility hell of manual IRQ/DMA configuration, plus differences among clone cards</p>
</article>

<article class="history-node">
  <p class="history-node-title">1996 · 3dfx Voodoo</p>
  <p><strong>Hardware context:</strong> CPU software rendering couldn't run true 3D; textures and frame rate rode entirely on raw clock speed</p>
  <p><strong>What it solved:</strong> consumer-grade 3D acceleration: rasterization and texture filtering moved onto the graphics card, making 3D games a mass category</p>
  <p><strong>Drawbacks:</strong> required a separate 2D display card; the proprietary Glide API created lock-in, and the card was later swallowed by the DirectX ecosystem</p>
</article>

<article class="history-node">
  <p class="history-node-title">1999 · GeForce 256</p>
  <p><strong>Hardware context:</strong> geometry transform and lighting entirely on the CPU, the graphics card only drawing triangles</p>
  <p><strong>What it solved:</strong> hardware T&L, the origin of the term "GPU", offloading the geometry pipeline to the card</p>
  <p><strong>Drawbacks:</strong> unstable drivers and a high price; the transition period required a primary plus secondary card pair</p>
</article>

<article class="history-node">
  <p class="history-node-title">2001 · GeForce 3 and programmable shaders</p>
  <p><strong>Hardware context:</strong> the fixed-function graphics pipeline at its ceiling, effects possible only through vendor-preset register combinations</p>
  <p><strong>What it solved:</strong> programmable vertex/pixel shaders — materials and effects went from presets to writing code</p>
  <p><strong>Drawbacks:</strong> fragmented shader versions, raising cross-vendor porting costs and the programming bar</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2005 · Multicore goes mainstream (Xbox 360 triple-core / Core 2 Duo)</p>
  <p><strong>Hardware context:</strong> single-core clock speed hit a wall (the NetBurst route failed), power and cooling at their limits</p>
  <p><strong>What it solved:</strong> traded parallelism for total performance; games and servers both turned to multithreading</p>
  <p><strong>Drawbacks:</strong> a steep rise in parallel-programming complexity, rewrites of existing code, and gains that were hard to squeeze out</p>
</article>

<article class="history-node">
  <p class="history-node-title">2007 · iPhone</p>
  <p><strong>Hardware context:</strong> touchscreen SoC pocket computing, mobile networks moving from WAP to data traffic</p>
  <p><strong>What it solved:</strong> the platform foundation for mobile gaming; App Store distribution reshaped the channel</p>
  <p><strong>Drawbacks:</strong> power and thermals capped performance, plus a closed ecosystem and a 30% cut</p>
</article>

<article class="history-node">
  <p class="history-node-title">2018 · RTX 2080 (RT and Tensor cores)</p>
  <p><strong>Hardware context:</strong> a highly mature rasterization pipeline, with AI inference compute starting to enter consumer graphics cards</p>
  <p><strong>What it solved:</strong> hardware for real-time ray tracing and upscaling (DLSS), adding a new stage to the rendering pipeline</p>
  <p><strong>Drawbacks:</strong> expensive and power-hungry, slow RT adoption in games, with ecosystem and development barriers rising in step</p>
</article>


## ③ Frontend technology (10 items)

<article class="history-node">
  <p class="history-node-title">c.1991 · The WWW and HTML go public</p>
  <p><strong>Hardware context:</strong> NeXT/Unix workstations and dial-up networks, documents spread via FTP and mail</p>
  <p><strong>What it solved:</strong> hypertext distributed across institutions, links weaving documents into a web</p>
  <p><strong>Drawbacks:</strong> documents only — no interactivity, no graphics, and the earliest browsers were merely readers</p>
</article>

<article class="history-node">
  <p class="history-node-title">1993 · The Mosaic browser</p>
  <p><strong>Hardware context:</strong> 486 workstations and home machines, GUIs becoming a PC standard</p>
  <p><strong>What it solved:</strong> graphical browsing plus inline images took the Web to the masses</p>
  <p><strong>Drawbacks:</strong> slow, with poor rendering compatibility and standards trailing the implementations</p>
</article>

<article class="history-node">
  <p class="history-node-title">1995 · JavaScript</p>
  <p><strong>Hardware context:</strong> browsers still designed as document readers, form validation relying on full-page refreshes</p>
  <p><strong>What it solved:</strong> page interaction logic got a language; a ten-day prototype propped up the frontend ecosystem</p>
  <p><strong>Drawbacks:</strong> historical pits from a rushed language design (this, type coercion, callback hell)</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1999 · XMLHttpRequest and AJAX</p>
  <p><strong>Hardware context:</strong> narrow bandwidth and expensive full-page refreshes, rich interactive apps possible only through plugins</p>
  <p><strong>What it solved:</strong> partial refresh became possible, opening the rich-application route</p>
  <p><strong>Drawbacks:</strong> no standard and divergent implementations, callback hell, poor accessibility</p>
</article>

<article class="history-node">
  <p class="history-node-title">2006 · jQuery</p>
  <p><strong>Hardware context:</strong> the browser wars and IE6 fragmentation, with each vendor shipping its own DOM and event model</p>
  <p><strong>What it solved:</strong> one line of selector smoothed over DOM and compatibility differences, sharply lowering the manipulation bar</p>
  <p><strong>Drawbacks:</strong> selector abuse and the performance debt of DOM manipulation, with the abstraction masking native capabilities</p>
</article>

<article class="history-node">
  <p class="history-node-title">2008 · Chrome and V8</p>
  <p><strong>Hardware context:</strong> hardware already fast enough, but JS engines still interpreting, and web apps stuttering</p>
  <p><strong>What it solved:</strong> JIT brought JS into the near-native performance era, and the Node.js ecosystem rose with it</p>
  <p><strong>Drawbacks:</strong> the single-threaded model persists to this day, and heavy tasks still have to detour through Workers</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2011 · Three.js and WebGL 1.0</p>
  <p><strong>Hardware context:</strong> programmable GPU shaders (2001) had been mature for eight years, yet browsers had no graphics interface</p>
  <p><strong>What it solved:</strong> the bar for browser 3D development dropped sharply; the Web moved from documents to apps and games</p>
  <p><strong>Drawbacks:</strong> uneven mobile compatibility, primitive debugging tools, and performance ceilings constrained by the browser</p>
</article>

<article class="history-node">
  <p class="history-node-title">2013 · React goes open source</p>
  <p><strong>Hardware context:</strong> multicore desktops and big-memory browsers, frontend application complexity exploding</p>
  <p><strong>What it solved:</strong> components plus virtual DOM — the declarative UI paradigm and an industrialized ecosystem</p>
  <p><strong>Drawbacks:</strong> ecosystem complexity and version-migration costs, plus a split landscape of state-management solutions</p>
</article>

<article class="history-node">
  <p class="history-node-title">2017 · WebAssembly MVP</p>
  <p><strong>Hardware context:</strong> CPUs and browser engines matured, and a near-native execution environment became available</p>
  <p><strong>What it solved:</strong> C/C++/Rust entered the browser at near-native speed, giving games and heavy computation a Web landing spot</p>
  <p><strong>Drawbacks:</strong> binary size, GC interop, and debugging breakpoints; DOM interaction still takes a detour</p>
</article>

<article class="history-node">
  <p class="history-node-title">2023 · WebGPU stable in Chrome</p>
  <p><strong>Hardware context:</strong> the generation of modern graphics APIs (Vulkan/Metal), with browser security sandboxes tightening</p>
  <p><strong>What it solved:</strong> a modern GPU API unified into the Web, exposing compute and rendering at the same level</p>
  <p><strong>Drawbacks:</strong> the spec still evolving, uneven cross-browser support, and a higher learning cost than WebGL</p>
</article>


## ④ Backend technology (9 items)

<article class="history-node">
  <p class="history-node-title">1970 · The relational model and SQL</p>
  <p><strong>Hardware context:</strong> mainframe disk storage was expensive, data organized under hierarchical and network models</p>
  <p><strong>What it solved:</strong> declarative queries and consistency guarantees for structured data, with data independent of programs</p>
  <p><strong>Drawbacks:</strong> a poor fit for unstructured and hierarchical data; scaling out required sharding databases and tables</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1995 · The LAMP stack</p>
  <p><strong>Hardware context:</strong> PC servers far cheaper than minicomputers, and open-source components becoming composable</p>
  <p><strong>What it solved:</strong> low-cost, fast assembly of web services; the launch barrier for small and mid-sized teams disappeared</p>
  <p><strong>Drawbacks:</strong> PHP's loose typing and performance ceiling, and a process model that capped concurrency</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2003 · memcached</p>
  <p><strong>Hardware context:</strong> memory prices falling continuously, making shared in-memory caching across machines possible</p>
  <p><strong>What it solved:</strong> the standard part of distributed object caching — a general acceleration layer standing in front of the database</p>
  <p><strong>Drawbacks:</strong> no persistence, weak consistency, and blunt eviction; cache-data consistency was your own problem to manage</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2004 · The GFS and MapReduce papers</p>
  <p><strong>Hardware context:</strong> commodity PC clusters could wrestle with minicomputers on reliability and capacity</p>
  <p><strong>What it solved:</strong> an engineering paradigm for hundred-node storage and compute: redundancy for reliability, batch processing for throughput</p>
  <p><strong>Drawbacks:</strong> a gap of several years between paper and usable ecosystem (Hadoop only took shape in 2006)</p>
</article>

<article class="history-node">
  <p class="history-node-title">2009 · Redis goes open source</p>
  <p><strong>Hardware context:</strong> cheap memory and mainstream multicore servers, caching needs subdividing down to data structures</p>
  <p><strong>What it solved:</strong> in-memory data-structure services: leaderboards via ZSet, one set of structures covering locks and queues</p>
  <p><strong>Drawbacks:</strong> memory cost, plus stumbles in persistence and the master-replica model along the way (the RDB/AOF choice)</p>
</article>

<article class="history-node">
  <p class="history-node-title">2009 · Go goes open source</p>
  <p><strong>Hardware context:</strong> the multicore era arrived, and the complexity of writing concurrent services in C/C++ had peaked</p>
  <p><strong>What it solved:</strong> a concurrency-friendly language: goroutines made high-concurrency gateways and infrastructure easy to write and deploy</p>
  <p><strong>Drawbacks:</strong> generics delayed until 1.18, runtime GC pauses, and verbose error handling</p>
</article>

<article class="history-node">
  <p class="history-node-title">2011 · Kafka goes open source</p>
  <p><strong>Hardware context:</strong> cheap sequential disk writes, with SSDs and cluster networks widespread</p>
  <p><strong>What it solved:</strong> high-throughput durable event streams; replay semantics turned decoupling and traceability into infrastructure</p>
  <p><strong>Drawbacks:</strong> complex operations (the early ZooKeeper dependency); partitioning and ordering semantics have boundaries</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2013 · Docker and Kubernetes</p>
  <p><strong>Hardware context:</strong> cloud VMs already the default form of compute, while deliverables were still stuck at virtual machine images</p>
  <p><strong>What it solved:</strong> consistent environment delivery and container orchestration; releasing went from swapping machines to swapping images</p>
  <p><strong>Drawbacks:</strong> a learning curve; network and storage complexity pushed outward, and a larger security surface</p>
</article>

<article class="history-node">
  <p class="history-node-title">2015 · gRPC goes open source</p>
  <p><strong>Hardware context:</strong> polyglot microservices spread, and the loose contracts of JSON+REST started to hurt</p>
  <p><strong>What it solved:</strong> strongly contracted RPC and multiplexed streaming; interface definitions became compilable assets</p>
  <p><strong>Drawbacks:</strong> poor human readability (HTTP/2 binary); a higher bar for troubleshooting and packet capture</p>
</article>


## ⑤ Notable engines (9 items)

<article class="history-node">
  <p class="history-node-title">1993 · The Doom engine</p>
  <p><strong>Hardware context:</strong> the 486 and the VESA local bus, software rendering the only path</p>
  <p><strong>What it solved:</strong> data-driven levels (WAD) and the first sound of engine licensing; the mod ecosystem handed content creation to players</p>
  <p><strong>Drawbacks:</strong> software rendering and a quasi-2.5D vertical-slice perspective — an obvious ceiling</p>
</article>

<article class="history-node">
  <p class="history-node-title">1996 · The Quake engine</p>
  <p><strong>Hardware context:</strong> the Pentium era, on the eve of 3D accelerator cards</p>
  <p><strong>What it solved:</strong> true 3D and a separated client/server architecture; the default division of labor for real-time online games took its final shape</p>
  <p><strong>Drawbacks:</strong> high hardware requirements and a high content-production bar, with an even higher bar for licensing and secondary development</p>
</article>

<article class="history-node">
  <p class="history-node-title">1998 · Unreal Engine 1</p>
  <p><strong>Hardware context:</strong> 1997-era graphics cards and CPUs could already run complex indoor scenes</p>
  <p><strong>What it solved:</strong> engine licensing became a standalone business model — you could make money on the engine without selling games</p>
  <p><strong>Drawbacks:</strong> high licensing fees and a heavy content pipeline, out of reach for small teams</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2001 · RenderWare (adopted by GTA III)</p>
  <p><strong>Hardware context:</strong> the PS2 generation with multiple platforms coexisting, and each platform's low-level layer needing a rewrite</p>
  <p><strong>What it solved:</strong> one middleware across platforms (PS/Xbox/PC); open-world blockbusters could be mass-produced</p>
  <p><strong>Drawbacks:</strong> the route withered after EA's 2004 acquisition — single-supplier risk</p>
</article>

<article class="history-node">
  <p class="history-node-title">2004 · Source and CryEngine</p>
  <p><strong>Hardware context:</strong> HD-generation GPUs and DirectX 9, with the programmable pipeline just rolling out</p>
  <p><strong>What it solved:</strong> the 2000s benchmark for lighting, physics, and toolchains; editor workflows took shape</p>
  <p><strong>Drawbacks:</strong> closed licensing and toolchains, with expensive cross-generation upgrades</p>
</article>

<article class="history-node">
  <p class="history-node-title">2005 · Unity 1.0</p>
  <p><strong>Hardware context:</strong> consumer-grade dev machines powerful enough, and cross-platform publishing gaining a unified middle layer</p>
  <p><strong>What it solved:</strong> engine democratization: small teams could do 3D and cross-platform — the invisible foundation of the mobile wave</p>
  <p><strong>Drawbacks:</strong> a ceiling below blockbuster-level content; weak early mobile performance and heavy-engineering support</p>
</article>

<article class="history-node">
  <p class="history-node-title">2010 · cocos2d-x</p>
  <p><strong>Hardware context:</strong> the smartphone 2D game explosion, with developers wanting a C++ cross-platform solution</p>
  <p><strong>What it solved:</strong> the cross-platform 2D standard part — the workhorse toolchain of Chinese mobile gaming</p>
  <p><strong>Drawbacks:</strong> weak 3D capability and a rudimentary toolchain, with the ecosystem converging on Cocos Creator</p>
</article>

<article class="history-node">
  <p class="history-node-title">2014 · UE4 goes free and Godot goes open source</p>
  <p><strong>Hardware context:</strong> the indie wave and mature Steam distribution, with upfront licensing becoming a barrier</p>
  <p><strong>What it solved:</strong> no-upfront-plus-revenue-share pushed the barrier down, and open-source engines offered a third choice</p>
  <p><strong>Drawbacks:</strong> binding commercial revenue share, uneven open-source ecosystem support, and migration costs that remain</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2020 · UE5 (Nanite and Lumen)</p>
  <p><strong>Hardware context:</strong> RTX-generation graphics cards and large SSDs entering mainstream machines</p>
  <p><strong>What it solved:</strong> cinematic assets went straight into real-time rendering; the cost models for geometry and lighting were redefined</p>
  <p><strong>Drawbacks:</strong> a high hardware bar, heavy migration for old projects, and high mastery costs for small and mid-sized teams</p>
</article>


## ⑥ Gameplay (9 items)

<article class="history-node">
  <p class="history-node-title">c.1978 · High-score tables and escalating difficulty</p>
  <p><strong>Hardware context:</strong> arcade RAM of only a few KB, with no networking between cabinets</p>
  <p><strong>What it solved:</strong> the seed of replayability and player-data competition: the leaderboard was retention</p>
  <p><strong>Drawbacks:</strong> the board was stored only on the local cabinet; cross-cabinet competition relied on copying scores and eyewitnesses</p>
</article>

<article class="history-node">
  <p class="history-node-title">1980 · Rogue: procedural generation and permadeath</p>
  <p><strong>Hardware context:</strong> terminal TTYs, no graphics, meaning carried by characters</p>
  <p><strong>What it solved:</strong> the randomness paradigm for infinite replay — the origin of the Roguelike genre</p>
  <p><strong>Drawbacks:</strong> a high text barrier and learning cost, with a strong sense of defeat</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1985 · Platform jumping and non-linear exploration</p>
  <p><strong>Hardware context:</strong> FC cartridge capacity limited content volume; levels could only be sustained by design density</p>
  <p><strong>What it solved:</strong> two paradigms — learnable level pacing and open exploration (Mario/Zelda)</p>
  <p><strong>Drawbacks:</strong> the linear-vs-open trade-off continues to this day, and content volume remains a hard constraint</p>
</article>

<article class="history-node">
  <p class="history-node-title">1998 · 3D spatial interaction (Ocarina of Time Z-targeting)</p>
  <p><strong>Hardware context:</strong> 3D accelerator cards and consoles were widespread, but camera and controls remained unsolved problems</p>
  <p><strong>What it solved:</strong> solved the camera problem of whom to fight and how in 3D — the interaction baseline for 3D action</p>
  <p><strong>Drawbacks:</strong> motion sickness and camera clipping never fully cured, and targeting is limited in multi-enemy scenes</p>
</article>

<article class="history-node">
  <p class="history-node-title">2004 · The MMO time-investment model</p>
  <p><strong>Hardware context:</strong> broadband widespread, with accounts and characters able to stay online long-term</p>
  <p><strong>What it solved:</strong> social binding and long-horizon progress retention; the subscription business model took shape</p>
  <p><strong>Drawbacks:</strong> controversies over time cost and the "second job" feeling; forced dailies overdrawing the fun</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2006 · F2P item monetization</p>
  <p><strong>Hardware context:</strong> payment channels and networks widespread, game distribution at a zero barrier</p>
  <p><strong>What it solved:</strong> zero-barrier entry plus item/stat payment rewrote the business model and the customer-acquisition logic</p>
  <p><strong>Drawbacks:</strong> criticism of numerical-design pay pressure and gameplay imbalance; payment depth is hard to balance</p>
</article>

<article class="history-node">
  <p class="history-node-title">2009 · MOBA lowers the barrier (League of Legends)</p>
  <p><strong>Hardware context:</strong> PCs and internet cafés widespread; low-spec machines were the mainstream player setup</p>
  <p><strong>What it solved:</strong> popularized Dota-style gameplay — the foundation product of the esports system</p>
  <p><strong>Drawbacks:</strong> a strongly match-bound experience; cheats and "actors" (throwers) remain a long-term governance war</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2017 · Battle royale and the seasonal battle pass</p>
  <p><strong>Hardware context:</strong> syncing 100 players on a large map became feasible over the public internet; network and CPU were both up to it</p>
  <p><strong>What it solved:</strong> per-match uncertainty made it watchable; the battle pass tied engagement and payment into seasons</p>
  <p><strong>Drawbacks:</strong> frequent balance changes, heavy cheat pressure, and the content pipeline dragged along by the seasonal cadence</p>
</article>

<article class="history-node">
  <p class="history-node-title">2017 · Systemic emergence (Breath of the Wild)</p>
  <p><strong>Hardware context:</strong> console CPUs could run real-time simulation of interacting systems</p>
  <p><strong>What it solved:</strong> elemental interactions replaced scripted set pieces — the "chemistry engine" design method for open worlds</p>
  <p><strong>Drawbacks:</strong> system combinations are hard to balance, performance is tight, and the bug surface grows</p>
</article>


## ⑦ Art style (9 items)

<article class="history-node">
  <p class="history-node-title">c.1975 · Monochrome pixels and symbolization</p>
  <p><strong>Hardware context:</strong> palettes of only a few colors, sprite budgets counted in single digits</p>
  <p><strong>What it solved:</strong> conveying meaning with the fewest pixels; symbolization became a style as well as a by-product of limits</p>
  <p><strong>Drawbacks:</strong> expressiveness locked down by color count and resolution; narrative could only be filled in by imagination</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1990 · 16-bit pixels and parallax scrolling</p>
  <p><strong>Hardware context:</strong> leaps in MD/SFC video memory and sprite capability, with mature scrolling hardware</p>
  <p><strong>What it solved:</strong> the pixel-art visual peak of hand-drawn animation and multi-layer scrolling</p>
  <p><strong>Drawbacks:</strong> pure hand-drawing was costly and slow — throughput was the ceiling</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1996 · Low-poly 3D and pre-rendered backgrounds</p>
  <p><strong>Hardware context:</strong> small triangle budgets and large CD-ROM storage</p>
  <p><strong>What it solved:</strong> cinematic narrative via coarse geometry plus static backgrounds (the FF7 route)</p>
  <p><strong>Drawbacks:</strong> angular characters, camera seams, and the split between real-time and pre-rendered</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2001 · The realism trend</p>
  <p><strong>Hardware context:</strong> programmable shaders and large-memory graphics cards spreading</p>
  <p><strong>What it solved:</strong> cinematic texture became the AAA standard — the picture itself was the selling point</p>
  <p><strong>Drawbacks:</strong> homogenization and soaring art costs, a schedule arms race</p>
</article>

<article class="history-node">
  <p class="history-node-title">2008 · Indie hand-drawn aesthetics (Braid)</p>
  <p><strong>Hardware context:</strong> digital distribution (XBLA) lowered the publishing barrier</p>
  <p><strong>What it solved:</strong> differentiated artistic expression against the realism arms race; the indie game identity was established</p>
  <p><strong>Drawbacks:</strong> small market voice and high commercial risk — critical acclaim without sales was the norm</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2012 · The pixel revival</p>
  <p><strong>Hardware context:</strong> the indie wave plus the nostalgia market; high-DPI screens actually highlighted pixel crispness</p>
  <p><strong>What it solved:</strong> style as identity, dodging realism costs — nostalgia was traffic</p>
  <p><strong>Drawbacks:</strong> the "pixels = laziness" backlash, and a turn toward homogenization</p>
</article>

<article class="history-node">
  <p class="history-node-title">2016 · Stylized rendering comes of age (Overwatch)</p>
  <p><strong>Hardware context:</strong> console CPUs could support complex NPR pipelines and real-time post-processing</p>
  <p><strong>What it solved:</strong> toon rendering balanced expressiveness and readability — recognizability was the brand</p>
  <p><strong>Drawbacks:</strong> skin-throughput pressure from seasonal updates, and style consistency that is hard to maintain</p>
</article>

<article class="history-node">
  <p class="history-node-title">2020 · A high-fidelity baseline alongside indie aesthetics</p>
  <p><strong>Hardware context:</strong> RTX cards and fast SSDs widespread; production conditions on both ends matured at once</p>
  <p><strong>What it solved:</strong> cinematic asset capture and mainstreamed indie aesthetics in parallel, with clear market stratification</p>
  <p><strong>Drawbacks:</strong> costs rising on both ends: realism burns money, hand-drawn burns schedule</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.2023 · AI-assisted assets enter the production discussion</p>
  <p><strong>Hardware context:</strong> generative-model compute widely available; inference costs entered studio budgets</p>
  <p><strong>What it solved:</strong> the possibility of cost reduction and efficiency alongside shocks to art jobs; pipelines began dipping their toes in</p>
  <p><strong>Drawbacks:</strong> copyright and quality controllability unresolved; flagged as still evolving</p>
</article>


## ⑧ Companies and signature works (10 companies)

<article class="history-node">
  <p class="history-node-title">1972 · Atari</p>
  <p><strong>Hardware context:</strong> the arcade TTL-board era; game and hardware as one</p>
  <p><strong>What it solved (model innovation):</strong> proved video games were a business: Pong opened the arcade industry, and the 2600 opened the swappable-cartridge ecosystem</p>
  <p><strong>Drawbacks (limits/turning point):</strong> the 1983 crash dragged down the core business; sold and resold, the brand changed hands repeatedly</p>
  <p><strong>Signature works (year · why representative):</strong> Pong 1972 · the starting point of the arcade industry; Atari 2600 1977 · the ecosystem starting point of swappable game cartridges</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1981 · Nintendo</p>
  <p><strong>Hardware context:</strong> started as a hanafuda card maker (1889); arcade years before the FC and the North American freeze</p>
  <p><strong>What it solved (model innovation):</strong> Donkey Kong turned North America around, the quality-control compact rebuilt industry order, and the third-party licensing model took final shape</p>
  <p><strong>Drawbacks (limits/turning point):</strong> lagged behind during the 3D generation; hardware-cycle ups and downs after the Wii</p>
  <p><strong>Signature works (year · why representative):</strong> Super Mario Bros. 1985 · pioneered the platformer paradigm and revived the North American market</p>
</article>

<article class="history-node">
  <p class="history-node-title">1982 · EA (Electronic Arts)</p>
  <p><strong>Hardware context:</strong> the 1980s with PCs and home consoles coexisting; publishing channels scattered</p>
  <p><strong>What it solved (model innovation):</strong> annualized sports licensing plus scaled publishing turned game publishing into an industry</p>
  <p><strong>Drawbacks (limits/turning point):</strong> reputation pressure from annualization and microtransactions; studio-acquisition controversies</p>
  <p><strong>Signature works (year · why representative):</strong> Madden 1988 · the starting point of the annualized sports-licensing model</p>
</article>

<article class="history-node">
  <p class="history-node-title">1991 · id Software</p>
  <p><strong>Hardware context:</strong> the 486 and VESA era; shareware distribution</p>
  <p><strong>What it solved (model innovation):</strong> the three-piece set of the FPS paradigm, engine licensing, and the mod ecosystem</p>
  <p><strong>Drawbacks (limits/turning point):</strong> its licensing model displaced by UE/Unity; product line contracted</p>
  <p><strong>Signature works (year · why representative):</strong> Doom 1993 · FPS for the masses, the open WAD standard</p>
</article>

<article class="history-node">
  <p class="history-node-title">c.1991 · Blizzard</p>
  <p><strong>Hardware context:</strong> the early 90s with consoles and PCs separate; RTS rose on the PC</p>
  <p><strong>What it solved (model innovation):</strong> benchmarks across RTS/MMO/esports; a polish-first cadence built brand devotion</p>
  <p><strong>Drawbacks (limits/turning point):</strong> long-term turbulence; acquired by Microsoft in 2023 (about 68.7 billion USD, completed 2023-10)</p>
  <p><strong>Signature works (year · why representative):</strong> Warcraft 1994 · the RTS paradigm; World of Warcraft 2004 · the peak of subscription MMOs (about 12 million subscribers at peak)</p>
</article>

<article class="history-node">
  <p class="history-node-title">1991 · Epic MegaGames</p>
  <p><strong>Hardware context:</strong> the shareware-distribution 90s, as 3D cards began to spread</p>
  <p><strong>What it solved (model innovation):</strong> engine licensing plus the free-to-play template; seasonal GaaS tactics exported to the whole industry</p>
  <p><strong>Drawbacks (limits/turning point):</strong> exclusivity wars and revenue swings; valuation ups and downs</p>
  <p><strong>Signature works (year · why representative):</strong> Unreal 1998 · the engine-licensing pillar; Fortnite 2017 · the benchmark for seasonal battle passes and cross-platform operations</p>
</article>

<article class="history-node">
  <p class="history-node-title">1993 · Sony Computer Entertainment (SCE)</p>
  <p><strong>Hardware context:</strong> the CD-ROM and 3D-chip generation, with Nintendo holding the cartridge channel</p>
  <p><strong>What it solved (model innovation):</strong> consoles for everyone plus a siphon on the third-party ecosystem, rewriting the console power structure</p>
  <p><strong>Drawbacks (limits/turning point):</strong> the PS3's high-price strategy faltered — the risk of generational bets</p>
  <p><strong>Signature works (year · why representative):</strong> Final Fantasy VII 1997 · the cinematic CD RPG and the PS victory (roughly ten-million scale)</p>
</article>

<article class="history-node">
  <p class="history-node-title">1996 · Valve</p>
  <p><strong>Hardware context:</strong> the late-90s golden age of PC gaming, with internet access spreading</p>
  <p><strong>What it solved (model innovation):</strong> went from engine products to a digital distribution platform (Steam), rewriting distribution</p>
  <p><strong>Drawbacks (limits/turning point):</strong> the Half-Life mainline long absent; platform-monopoly controversies</p>
  <p><strong>Signature works (year · why representative):</strong> Half-Life 1998 · narrative FPS and the mod ecosystem (where CS began); Steam 2003 · digital distribution rewriting the channel</p>
</article>

<article class="history-node">
  <p class="history-node-title">2006 · Riot Games</p>
  <p><strong>Hardware context:</strong> social esports rising in the Web era; internet cafés were the main battlefield</p>
  <p><strong>What it solved (model innovation):</strong> single-title live operations plus systematic esports — turning one game into a league</p>
  <p><strong>Drawbacks (limits/turning point):</strong> single-title dependence; governance and balance controversies</p>
  <p><strong>Signature works (year · why representative):</strong> League of Legends 2009 · MOBA for the masses (over 100 million monthly actives, approximately)</p>
</article>

<article class="history-node">
  <p class="history-node-title">2012 · miHoYo</p>
  <p><strong>Hardware context:</strong> smartphone GPUs nearing the previous console generation; cross-platform distribution ready</p>
  <p><strong>What it solved (model innovation):</strong> a global template of cross-platform quality plus long-horizon gacha; in-house investment feeding back into quality</p>
  <p><strong>Drawbacks (limits/turning point):</strong> genre concentration; gacha monetization controversies</p>
  <p><strong>Signature works (year · why representative):</strong> Genshin Impact 2020 · the cross-platform open-world benchmark (first-year revenue on the order of 1 billion USD)</p>
</article>


## Cross-link registration conventions

Cross-links are registered in the data file as one causality per line: `[source key, target key, source-side note, target-side note]`. At assembly time this automatically generates two badges — the source-side `out` (`→ gave rise to / signature work…`) and the target-side `in` (`← influenced by…`) — guaranteeing pairwise bidirectionality. The first batch lays 29 links covering more than 14 groups of cross-track causality. Examples:

```text
hw-2001-shader → 催生 fe-2011-webgl / en-2004-source / ar-2001-realism
hw-1996-voodoo → 催生 ar-1996-lowpoly / en-1996-quake-engine
hw-2007-iphone → 催生 ga-2016-pogo / gp-2006-f2p
ga-1978-invaders → 催生 gp-1978-highscore
co-1981-nintendo ↔ 代表作 ga-1985-smb → 确立 gp-1985-platform
hw-2005-multicore → 催生 be-2009-go
en-2020-ue5 → 抬高 ar-2020-fidelity（受 hw-2018-rtx 支撑）
```

## References

- [Wikipedia · History of video games](https://en.wikipedia.org/wiki/History_of_video_games)
- [Wikipedia · Video game industry](https://en.wikipedia.org/wiki/Video_game_industry)

<!-- BACKLINKS-AUTO -->
## Related pages

- [index](index.md)
