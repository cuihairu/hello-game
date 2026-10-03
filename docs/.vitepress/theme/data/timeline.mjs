export const SEGMENTS = [
  { id: 's-1960s', decade: '1960s', from: 1960, to: 1969, title: '计算机游戏萌芽' },
  { id: 's-1970s', decade: '1970s', from: 1970, to: 1979, title: '多人在场的起点' },
  { id: 's-1980s', decade: '1980s', from: 1980, to: 1989, title: '榜单、存档与虚拟世界雏形' },
  { id: 's-1990s', decade: '1990s', from: 1990, to: 1999, title: '网络同步与持久世界' },
  { id: 's-2000s', decade: '2000s', from: 2000, to: 2009, title: 'MMORPG 浪潮与免费游戏' },
  { id: 's-2010s', decade: '2010s', from: 2010, to: 2019, title: '移动化、长线运营与实时竞技' },
  { id: 's-2020s', decade: '2020s', from: 2020, to: 2026, title: '云原生、跨平台与自研重估' }
]

export const segments = SEGMENTS

export const AXIS = { minYear: 1955, maxYear: 2026, minSpan: 30, maxSpan: 71 }

export const TRACKS = [
  {
    id: 'games',
    name: '游戏发展',
    color: '#e0894e',
    items: [
      { key: 'ga-1962-spacewar', year: 1962, approx: true, title: 'Spacewar!（PDP-1）', hardware: '小型机加示波器显示，内存 16KB 级，图形靠手写代码直写显示设备', solved: '证明实时交互图形程序可以运行、可以被复制传播，游戏从纸面变成可运行的程序', limits: '只存在于实验室与大学，无商用形态；依赖特定机型，几乎无法分发' },
      { key: 'ga-1972-pong', year: 1972, approx: false, title: 'Pong 街机', hardware: 'TTL 分立元件专用街机板，无通用 CPU，画面只有黑白方块与线条', solved: '第一个大规模商业成功的电子游戏，证明电子游戏是一门生意', limits: '功能焊死在电路上，游戏与硬件一体；克隆泛滥、无内容更新概念' },
      { key: 'ga-1978-invaders', year: 1978, approx: false, title: 'Space Invaders（太空侵略者）', hardware: 'Intel 8080 街机板、单色 CRT、内存以 KB 计', solved: '确立高分榜与难度递增的重复可玩性机制，街机黄金时代的商业引擎', limits: '小内存硬编码渲染；每帧 sprite 预算固定，敌军数量减少时变快被当成 bug 传世' },
      { key: 'ga-1983-crash', year: 1983, approx: true, title: '北美雅达利大崩溃', hardware: '2600 十年老架构、卡带 4KB 主流，开发无质量门槛', solved: '（事件）质控失守倒逼行业重建：1985 年起任天堂质控公约成为北美市场复苏起点', limits: '行业塌方，北美主机市场冰封约两年，大量公司倒闭' },
      { key: 'ga-1985-smb', year: 1985, approx: false, title: '超级马里奥兄弟（FC）', hardware: '6502@1.79MHz、2KB RAM、54 色，卡带容量决定内容上限', solved: '确立横版卷轴关卡设计方法论：教学关、卷轴节奏、隐藏要素的组合范式', limits: '卡带容量限内容量，无电池存档，续关成为唯一进度保护' },
      { key: 'ga-1996-quake', year: 1996, approx: false, title: 'Quake', hardware: '486/Pentium 加 Voodoo 加速卡，网络仍在拨号与早期宽带', solved: '实时全 3D 与网络对战成为产品现实，客户端/服务端分工被产品验证', limits: '高配门槛，软渲染几乎不可玩；对战依赖局域网与专用服务器普及' },
      { key: 'ga-2004-wow', year: 2004, approx: false, title: '魔兽世界', hardware: 'PC 普及与宽带入户，家用网络可支撑持续在线', solved: '百万级订阅 MMO 与副本实例化范式，长线运营成为主流商业模式', limits: '点卡时间投入制带来健康争议，内容消耗速度倒逼产能军备' },
      { key: 'ga-2009-minecraft', year: 2009, approx: true, title: 'Minecraft（测试版）', hardware: 'Java 跨平台，低配 PC 即可运行，网页分发绕开传统渠道', solved: '沙盒 UGC 玩法范式，独立团队做出现象级产品的样本', limits: 'Java 性能天花板，优化长期欠账；模组生态兼容性问题多' },
      { key: 'ga-2016-pogo', year: 2016, approx: false, title: 'Pokémon GO', hardware: '智能手机 SoC、GPS 与 4G 网络普及，陀螺仪与摄像头成标配', solved: 'LBS + AR 玩法大众化，位置服务支撑全球规模并发', limits: '安全事故与公共场所秩序压力，定位作弊与外挂' },
      { key: 'ga-2020-genshin', year: 2020, approx: false, title: '原神', hardware: '手机 GPU 已达上世代主机水平，跨端同一份资产可分发', solved: '跨端高品质开放世界加长线版本运营的全球样本', limits: '研发成本与持续更新产能压力，抽卡付费争议' }
    ]
  },
  {
    id: 'hardware',
    name: '硬件',
    color: '#5b8dd6',
    items: [
      { key: 'hw-1971-4004', year: 1971, approx: true, title: 'Intel 4004', hardware: '分立逻辑与 SSI/MSI 芯片时代，一块板一个功能', solved: '首款商用微处理器，把 CPU 变成可采购的标准件，通用计算起点', limits: '4 位数据宽度，需大量外围芯片拼系统，单价高、生态未形成' },
      { key: 'hw-1981-ibm-pc', year: 1981, approx: false, title: 'IBM PC 5150', hardware: '8088@4.77MHz、64KB 内存，操作系统靠软盘', solved: 'x86 加开放架构确立 PC 标准，兼容机生态爆发', limits: '约 1565 美元起的高价与笨重体积，DOS 命令行门槛' },
      { key: 'hw-1985-amiga', year: 1985, approx: false, title: 'Amiga 1000', hardware: '自定义图形与音频芯片（blitter、Paula），多媒体能力远超同代 PC', solved: '消费级多媒体能力：硬件合成音、逐帧动画与多任务', limits: '平台封闭、价格高，被开放的 PC 兼容机挤出主流' },
      { key: 'hw-1989-sound-blaster', year: 1989, approx: false, title: 'Sound Blaster', hardware: 'PC 音频此前只有蜂鸣器，1987 AdLib FM 音乐先行', solved: '把音效与音乐采样带进 PC，确立 PC 游戏音频事实标准', limits: 'IRQ/DMA 手工配置的兼容地狱，克隆卡差异' },
      { key: 'hw-1996-voodoo', year: 1996, approx: false, title: '3dfx Voodoo', hardware: 'CPU 软渲染跑不动真 3D，纹理与帧率全靠主频硬扛', solved: '消费级 3D 加速：光栅化与纹理过滤进显卡，3D 游戏成为大众品类', limits: '需另配 2D 显示卡，专有 Glide API 形成锁定，后续被 DirectX 生态吞掉' },
      { key: 'hw-1999-geforce', year: 1999, approx: false, title: 'GeForce 256', hardware: '几何变换与光照全在 CPU，显卡只管画三角形', solved: '硬件 T&L，「GPU」一词起点，几何管线卸载到显卡', limits: '驱动不稳、售价高，过渡期需主副双卡' },
      { key: 'hw-2001-shader', year: 2001, approx: false, title: 'GeForce 3 与可编程着色器', hardware: '固定功能图形管线到顶，特效只能靠厂商预置寄存器组合', solved: '顶点/像素着色器可编程，材质与特效从预置变成写代码', limits: 'Shader 版本碎片化，跨厂商移植成本与编程门槛抬升' },
      { key: 'hw-2005-multicore', year: 2005, approx: true, title: '多核普及（Xbox 360 三核 / Core 2 Duo）', hardware: '单核主频撞墙（NetBurst 路线失败），功耗与散热到顶', solved: '用并行换总性能，游戏与服务端都转向多线程', limits: '并行编程复杂度陡增，既有代码重写，收益难榨' },
      { key: 'hw-2007-iphone', year: 2007, approx: false, title: 'iPhone', hardware: '触屏 SoC 随身计算，移动网络从 WAP 走向数据流量', solved: '移动游戏平台化底座，App Store 分发重塑渠道', limits: '功耗散热限制性能，生态封闭与 30% 抽成' },
      { key: 'hw-2018-rtx', year: 2018, approx: false, title: 'RTX 2080（RT 与 Tensor 核心）', hardware: '光栅化管线高度成熟，AI 推理算力开始进消费级显卡', solved: '实时光线追踪与超分（DLSS）硬件化，渲染管线多出新一级', limits: '价高功耗大，RT 游戏渗透慢，生态与开发门槛同步抬升' }
    ]
  },
  {
    id: 'frontend',
    name: '前端技术',
    color: '#3fae8f',
    items: [
      { key: 'fe-1991-www', year: 1991, approx: true, title: 'WWW 与 HTML 公开', hardware: 'NeXT/Unix 工作站与拨号网络，文档靠 FTP 与邮件传播', solved: '超文本跨机构分发，链接把文档连成网', limits: '纯文档，无交互无图形，浏览器最初只是阅读器' },
      { key: 'fe-1993-mosaic', year: 1993, approx: false, title: 'Mosaic 浏览器', hardware: '486 工作站与家用机，图形界面成为 PC 标配', solved: '图形化浏览加内嵌图片，Web 走向大众', limits: '慢，渲染兼容差，标准跟不上实现' },
      { key: 'fe-1995-javascript', year: 1995, approx: false, title: 'JavaScript', hardware: '浏览器仍按文档阅读器设计，表单校验靠整页刷新', solved: '页面交互逻辑有了语言，十天原型撑起前端生态', limits: '语言设计仓促的历史坑（this、类型转换、回调地狱）' },
      { key: 'fe-1999-xhr', year: 1999, approx: true, title: 'XMLHttpRequest 与 AJAX', hardware: '带宽窄，整页刷新昂贵，富交互应用只能靠插件', solved: '局部刷新成为可能，富应用路线打开', limits: '无标准实现差异，回调地狱，可访问性差' },
      { key: 'fe-2006-jquery', year: 2006, approx: false, title: 'jQuery', hardware: '浏览器大战 IE6 碎片化，DOM 与事件模型各家一套', solved: '一行选择器抹平 DOM 与兼容差异，操作门槛大降', limits: '选择器滥用与 DOM 操作性能债，抽象掩盖原生能力' },
      { key: 'fe-2008-v8', year: 2008, approx: false, title: 'Chrome 与 V8', hardware: '硬件已够快，JS 引擎仍是解释执行，网页应用卡顿', solved: 'JIT 让 JS 进入近原生性能时代，Node.js 生态随之起势', limits: '单线程模型遗留至今，重任务仍要 Worker 绕行' },
      { key: 'fe-2011-webgl', year: 2011, approx: true, title: 'Three.js 与 WebGL 1.0', hardware: 'GPU 可编程着色器（2001）已成熟八年，浏览器却无图形接口', solved: '浏览器 3D 开发门槛大降，Web 从文档走向应用与游戏', limits: '移动端兼容参差，调试工具原始，性能上限受浏览器制约' },
      { key: 'fe-2013-react', year: 2013, approx: false, title: 'React 开源', hardware: '多核桌面与大内存浏览器，前端应用复杂度爆炸', solved: '组件化加虚拟 DOM，声明式 UI 范式与生态工程化', limits: '生态复杂、版本迁移成本，状态管理方案分裂' },
      { key: 'fe-2017-wasm', year: 2017, approx: false, title: 'WebAssembly MVP', hardware: 'CPU 与浏览器引擎成熟，靠近原生的执行环境可用', solved: 'C/C++/Rust 近原生进浏览器，游戏与重计算有了 Web 落点', limits: '体积、GC 互操作与调试断点，DOM 交互仍绕行' },
      { key: 'fe-2023-webgpu', year: 2023, approx: true, title: 'WebGPU 在 Chrome 稳定', hardware: '现代图形 API（Vulkan/Metal）世代，浏览器安全沙箱收紧', solved: '现代 GPU API 统一进 Web，计算与渲染同级暴露', limits: '规范仍在演进，跨浏览器支持不齐，学习成本高于 WebGL' }
    ]
  },
  {
    id: 'backend',
    name: '后端技术',
    color: '#7c6fd0',
    items: [
      { key: 'be-1970-rdbms', year: 1970, approx: false, title: '关系模型与 SQL', hardware: '大型机磁盘存储昂贵，数据组织靠层次与网状模型', solved: '结构化数据的声明式查询与一致性保障，数据独立于程序', limits: '非结构化与层级数据不适配，规模扩展需分库分表' },
      { key: 'be-1995-lamp', year: 1995, approx: true, title: 'LAMP 组合', hardware: 'PC 服务器远比小型机便宜，开源组件开始可组合', solved: 'Web 服务低成本快速搭建，中小团队上线门槛消失', limits: 'PHP 类型松散与性能天花板，进程模型限制并发' },
      { key: 'be-2003-memcached', year: 2003, approx: true, title: 'memcached', hardware: '内存价格持续下降，多机共享内存缓存成为可能', solved: '分布式对象缓存的标准件，挡在数据库前面的通用加速层', limits: '无持久化、一致性弱、淘汰粗暴，缓存与数据一致性要自己管' },
      { key: 'be-2004-gfs', year: 2004, approx: true, title: 'GFS 与 MapReduce 论文', hardware: '商用 PC 集群的可靠性与容量可与小型机掰手腕', solved: '百节点级存算的工程范式：冗余换可靠，批处理换吞吐', limits: '论文到可用生态有数年落差（Hadoop 2006 才成形）' },
      { key: 'be-2009-redis', year: 2009, approx: false, title: 'Redis 开源', hardware: '内存价格与多核服务器普及，缓存需求细分到数据结构', solved: '内存数据结构服务：排行榜用 ZSet，锁与队列一套结构打天下', limits: '内存成本，持久化与主从模型在演进中踩坑（RDB/AOF 选择）' },
      { key: 'be-2009-go', year: 2009, approx: false, title: 'Go 开源', hardware: '多核时代到来，C/C++ 写并发服务的复杂度到顶', solved: '并发友好的语言：goroutine 让高并发网关与基础设施好写好部署', limits: '泛型迟至 1.18，运行时 GC 停顿，错误处理啰嗦' },
      { key: 'be-2011-kafka', year: 2011, approx: false, title: 'Kafka 开源', hardware: '磁盘顺序写便宜、SSD 与集群网络普及', solved: '高吞吐持久事件流，回放语义把解耦与追溯做成基础设施', limits: '运维复杂（早期 ZooKeeper 依赖），分区与顺序语义有边界' },
      { key: 'be-2013-docker', year: 2013, approx: true, title: 'Docker 与 Kubernetes', hardware: '云主机已成默认算力形态，交付物还停在虚拟机镜像', solved: '环境一致交付与容器编排，发布从换机器变成换镜像', limits: '学习成本，网络与存储复杂度外移，安全面变大' },
      { key: 'be-2015-grpc', year: 2015, approx: false, title: 'gRPC 开源', hardware: '多语言微服务铺开，JSON+REST 的契约松散开始疼', solved: '强契约 RPC 与多路流式通信，接口定义变成可编译资产', limits: '人读性差（HTTP/2 二进制），排障与抓包门槛抬升' }
    ]
  },
  {
    id: 'engines',
    name: '知名引擎',
    color: '#d0568e',
    items: [
      { key: 'en-1993-doom', year: 1993, approx: false, title: 'Doom 引擎', hardware: '486 与 VESA 局部总线，软件渲染是唯一路径', solved: '数据驱动关卡（WAD）与引擎授权先声，mod 生态把内容创作交给玩家', limits: '软件渲染，准 2.5D 纵切视角，天花板明显' },
      { key: 'en-1996-quake-engine', year: 1996, approx: false, title: 'Quake 引擎', hardware: 'Pentium 时代，3D 加速卡前夜', solved: '真 3D 与客户端/服务端架构分离，实时网游的默认分工定型', limits: '配置要求高，内容制作门槛高，授权与二次开发门槛更高' },
      { key: 'en-1998-ue1', year: 1998, approx: false, title: 'Unreal Engine 1', hardware: '1997 年的显卡与 CPU 已能跑复杂室内场景', solved: '引擎授权成为独立商业模式，不靠卖游戏也能靠引擎赚钱', limits: '授权费高，内容管线重，小团队够不着' },
      { key: 'en-2001-renderware', year: 2001, approx: true, title: 'RenderWare（GTA III 采用）', hardware: 'PS2 世代多平台并存，每平台一套底层要重写', solved: '一套中间件跨平台（PS/Xbox/PC），开放世界大作得以量产', limits: '2004 年被 EA 收购后路线式微，单一供应商风险' },
      { key: 'en-2004-source', year: 2004, approx: false, title: 'Source 与 CryEngine', hardware: '高清世代 GPU 与 DirectX 9，可编程管线刚铺开', solved: '光照、物理与工具链的 2000s 标杆，编辑器工作流成型', limits: '授权与工具链封闭，跨代升级成本高' },
      { key: 'en-2005-unity', year: 2005, approx: true, title: 'Unity 1.0', hardware: '消费级开发机性能足够，跨端发布开始有统一中间层', solved: '引擎民主化：小团队可做 3D 与跨端，移动浪潮的隐形地基', limits: '大作级内容上限，早期移动端性能与重度工程支持弱' },
      { key: 'en-2010-cocos2dx', year: 2010, approx: false, title: 'cocos2d-x', hardware: '智能手机 2D 游戏爆发，开发者要 C++ 跨端方案', solved: '跨端 2D 标准件，中国移动游戏的主力工具链', limits: '3D 能力弱，工具链简陋，生态向 Cocos Creator 收拢' },
      { key: 'en-2014-ue4-godot', year: 2014, approx: true, title: 'UE4 转免费与 Godot 开源', hardware: '独立开发潮与 Steam 分发成熟，预付授权成为门槛', solved: '免预付加分成的门槛下探，开源引擎给出第三选择', limits: '商业分成绑定，开源生态支持参差，迁移成本仍在' },
      { key: 'en-2020-ue5', year: 2020, approx: true, title: 'UE5（Nanite 与 Lumen）', hardware: 'RTX 世代显卡与大容量 SSD 进入主流机型', solved: '电影级资产直接进实时渲染，几何与光照成本模型重定', limits: '硬件门槛高，老项目迁移重，中小团队驾驭成本高' }
    ]
  },
  {
    id: 'gameplay',
    name: '玩法',
    color: '#d99a2b',
    items: [
      { key: 'gp-1978-highscore', year: 1978, approx: true, title: '高分榜与难度递增', hardware: '街机 RAM 仅数 KB，机台之间无联网', solved: '重复可玩性与玩家数据竞争的雏形：榜单就是留存', limits: '榜单只存机台本地，跨机台竞争靠抄榜与目击' },
      { key: 'gp-1980-rogue', year: 1980, approx: false, title: 'Rogue：程序生成与永久死亡', hardware: '终端 TTY，无图形，靠字符表意', solved: '无限重玩的随机性范式，Roguelike 品类源头', limits: '文字门槛与学习成本高，挫败感强' },
      { key: 'gp-1985-platform', year: 1985, approx: true, title: '平台跳跃与非线性探索', hardware: 'FC 卡带容量限制内容量，关卡只能靠设计密度撑', solved: '可学习的关卡节奏与开放探索两条范式（马里奥/塞尔达）', limits: '线性与开放的取舍延续至今，内容量仍是硬约束' },
      { key: 'gp-1998-zelda-3d', year: 1998, approx: false, title: '3D 空间交互（时之笛 Z 锁定）', hardware: '3D 加速卡与主机已普及，镜头与操作仍是未解题', solved: '解决 3D 下打谁、怎么打的相机难题，动作 3D 的交互基准', limits: '晕动与镜头穿帮问题未根治，锁定在多敌人场景受限' },
      { key: 'gp-2004-mmo-time', year: 2004, approx: false, title: 'MMO 时间投入制', hardware: '宽带普及，账号与角色可长期在线', solved: '社交绑定与长线进度留存，订阅制商业模型成型', limits: '时间成本与上班感争议，强迫日常透支乐趣' },
      { key: 'gp-2006-f2p', year: 2006, approx: true, title: 'F2P 道具收费', hardware: '支付通道与网络普及，游戏分发零门槛', solved: '零门槛进入加道具/数值付费，商业模式与获客逻辑改写', limits: '数值逼氪与游戏性失衡的批评，付费深度难调平' },
      { key: 'gp-2009-lol', year: 2009, approx: false, title: 'MOBA 降门槛（英雄联盟）', hardware: 'PC 与网吧普及，低配机型是主流玩家配置', solved: '把 Dota 玩法大众化，电竞体系的底座产品', limits: '单局体验强绑定，外挂与演员治理是长期战' },
      { key: 'gp-2017-battleroyale', year: 2017, approx: true, title: '大逃杀与赛季通行证', hardware: '大地图 100 人同步在公网可行，网络与 CPU 都到位', solved: '每局不确定性带来观赛性，战令把活跃与付费绑进赛季', limits: '平衡调整频繁，外挂压力大，内容管线被赛季节奏拖着跑' },
      { key: 'gp-2017-botw', year: 2017, approx: false, title: '系统涌现（旷野之息）', hardware: '主机 CPU 足够跑交互系统实时模拟', solved: '元素交互替代脚本演出，开放世界的化学引擎设计法', limits: '系统组合难调平，性能吃紧，bug 面变大' }
    ]
  },
  {
    id: 'art',
    name: '美术风格',
    color: '#8a9a4a',
    items: [
      { key: 'ar-1975-pixel', year: 1975, approx: true, title: '单色像素与符号化', hardware: '调色板只有数色，sprite 预算以个位数计', solved: '用最少像素表意，符号化成为风格也是限制的副产品', limits: '表现力被色数与分辨率锁死，叙事只能靠想象补' },
      { key: 'ar-1990-16bit', year: 1990, approx: true, title: '16-bit 像素与视差卷轴', hardware: 'MD/SFC 显存与 sprite 能力跃升，卷轴硬件成熟', solved: '手绘动画与多层卷轴的像素视觉高峰', limits: '纯手工绘制成本高、周期长，产能即上限' },
      { key: 'ar-1996-lowpoly', year: 1996, approx: true, title: '低多边形 3D 与预渲染背景', hardware: '三角形预算小、CD-ROM 存储空间大', solved: '以粗粝几何加静态背景实现电影化叙事（FF7 路线）', limits: '角色棱角化，镜头穿帮，实时与预渲染的割裂' },
      { key: 'ar-2001-realism', year: 2001, approx: true, title: '写实化潮流', hardware: '可编程着色器与大显存显卡铺开', solved: '电影化质感成为 3A 标配，画面即卖点', limits: '同质化与美术成本飙升，工期军备竞赛' },
      { key: 'ar-2008-braid', year: 2008, approx: false, title: '独立手绘美学（Braid）', hardware: '数字发行（XBLA）降低发行门槛', solved: '艺术表达差异化对抗写实军备，独立游戏身份确立', limits: '市场声量小，商业风险高，叫好不叫座常态' },
      { key: 'ar-2012-pixel', year: 2012, approx: true, title: '像素复兴', hardware: '独立开发潮加怀旧市场，高分屏反而凸显像素锐利', solved: '风格作为身份识别，规避写实成本，情怀即流量', limits: '「像素=偷懒」的舆论反噬，同质化转向' },
      { key: 'ar-2016-stylized', year: 2016, approx: false, title: '风格化渲染成熟（守望先锋）', hardware: '主机 CPU 可支撑复杂 NPR 管线与实时后处理', solved: '卡通渲染兼顾表现力与识别度，辨识度即品牌', limits: '赛季更新的皮肤产能压力，风格一致性难维护' },
      { key: 'ar-2020-fidelity', year: 2020, approx: true, title: '高写实基线与独立美学并行', hardware: 'RTX 显卡与高速 SSD 普及，两端制作条件同时成熟', solved: '电影级资产直采与独立美学主流化并行，市场分层清晰', limits: '两端成本都在上升：写实烧钱，手绘卷工期' },
      { key: 'ar-2023-ai', year: 2023, approx: true, title: 'AI 辅助资产进入生产讨论', hardware: '生成式模型算力普及，推理成本进入工作室预算', solved: '降本增效的可能与美术岗位冲击并存，管线开始试水', limits: '版权与质量可控性未定论，标注为演进中' }
    ]
  },
  {
    id: 'company',
    name: '公司与代表作',
    color: '#c2544a',
    items: [
      { key: 'co-1972-atari', year: 1972, approx: false, title: 'Atari', hardware: '街机 TTL 板时代，游戏与硬件一体', solved: '证明电子游戏是生意：Pong 开街机产业，2600 开卡带换游戏生态', limits: '1983 崩溃拖垮主业，几经转卖，品牌多次易手', works: [{ year: 1972, title: 'Pong', why: '街机产业起点' }, { year: 1977, title: 'Atari 2600', why: '卡带可换游戏的生态起点' }] },
      { key: 'co-1981-nintendo', year: 1981, approx: true, title: '任天堂', hardware: '花札厂起家（1889），FC 前的街机与北美冰封期', solved: '大金刚北美翻盘，质控公约重建行业秩序，第三方授权模式定型', limits: '3D 世代曾跟随后，Wii 之后的硬件周期起伏', works: [{ year: 1985, title: '超级马里奥兄弟', why: '开创平台范式并复兴北美市场' }, { year: 1986, title: '塞尔达传说', why: '动作冒险与开放探索范式' }] },
      { key: 'co-1982-ea', year: 1982, approx: false, title: 'EA（电子艺界）', hardware: 'PC 与家用机并存的 80 年代，发行渠道分散', solved: '体育授权年货加发行规模化，把游戏发行做成工业', limits: '年货化与微交易的口碑压力，工作室吞并争议', works: [{ year: 1988, title: 'Madden', why: '体育年货授权模式起点' }] },
      { key: 'co-1991-id', year: 1991, approx: false, title: 'id Software', hardware: '486 与 VESA 时代，shareware 分发', solved: 'FPS 范式、引擎授权与 mod 生态三件套', limits: '授权模式被 UE/Unity 取代，产品线收缩', works: [{ year: 1993, title: 'Doom', why: 'FPS 大众化、WAD 开放标准' }, { year: 1996, title: 'Quake', why: '真 3D 与客户端/服务端架构分离' }] },
      { key: 'co-1991-blizzard', year: 1991, approx: true, title: '暴雪', hardware: '家用机与 PC 分立的 90 年代初，RTS 起于 PC', solved: 'RTS/MMO/电竞三线标杆，精品节奏树立品牌信仰', limits: '长期动荡，2023 年被微软收购（约 687 亿美元，2023-10 完成）', works: [{ year: 1994, title: '魔兽争霸', why: 'RTS 范式' }, { year: 2004, title: '魔兽世界', why: '订阅制 MMO 顶峰（峰值约 1200 万订阅）' }] },
      { key: 'co-1991-epic', year: 1991, approx: false, title: 'Epic MegaGames', hardware: 'shareware 分发的 90 年代，3D 卡开始普及', solved: '引擎授权加免费化样本，赛季制 GaaS 打法输出全行业', limits: '独占大战与收入波动，估值起伏', works: [{ year: 1998, title: 'Unreal', why: '引擎授权支柱' }, { year: 2017, title: '堡垒之夜', why: '赛季通行证与跨平台运营标杆' }] },
      { key: 'co-1993-sony', year: 1993, approx: false, title: '索尼电脑娱乐（SCE）', hardware: 'CD-ROM 与 3D 芯片世代，任天堂把持卡带渠道', solved: '主机平民化加第三方生态虹吸，改写主机权力格局', limits: 'PS3 高价战略受挫，世代押注风险', works: [{ year: 1997, title: '最终幻想 VII', why: 'CD 电影化 RPG 与 PS 胜势（约千万级）' }] },
      { key: 'co-1996-valve', year: 1996, approx: false, title: 'Valve', hardware: '90 年代后期 PC 游戏黄金期，互联网接入普及', solved: '从引擎产品走到数字发行平台（Steam），改写分发', limits: '半衰期主线长期缺席，平台垄断争议', works: [{ year: 1998, title: '半衰期', why: '叙事 FPS 与 mod 生态（CS 起点）' }, { year: 2003, title: 'Steam', why: '数字发行改写分发' }] },
      { key: 'co-2006-riot', year: 2006, approx: false, title: 'Riot Games', hardware: 'Web 时代社交电竞兴起，网吧是主战场', solved: '单品长线运营加电竞体系化，把一款游戏做成联赛', limits: '单品依赖，治理与平衡争议', works: [{ year: 2009, title: '英雄联盟', why: 'MOBA 大众化（月活过亿，约）' }] },
      { key: 'co-2012-mihoyo', year: 2012, approx: false, title: '米哈游', hardware: '智能手机 GPU 接近上世代主机，跨端分发就绪', solved: '跨端高品质加抽卡长线的全球样本，自研投入反哺品质', limits: '品类集中，抽卡付费争议', works: [{ year: 2020, title: '原神', why: '跨端开放世界标杆（首年流水约 10 亿美元量级）' }] }
    ]
  }
]

export const RELATIONS = [
  ['hw-2001-shader', 'fe-2011-webgl', '催生', '受硬件可编程管线驱动'],
  ['hw-2001-shader', 'en-2004-source', '催生', '受可编程着色器启发'],
  ['hw-2001-shader', 'ar-2001-realism', '催生', '写实渲染管线成熟'],
  ['hw-1996-voodoo', 'ar-1996-lowpoly', '催生', '3D 加速让实时低模成为可能'],
  ['hw-1996-voodoo', 'en-1996-quake-engine', '催生', '硬件加速验证 Quake 架构'],
  ['hw-2007-iphone', 'ga-2016-pogo', '催生', '移动平台与 GPS/LBS 基础设施'],
  ['hw-2007-iphone', 'gp-2006-f2p', '催生', 'App Store 分发与支付铺路 F2P'],
  ['ga-1978-invaders', 'gp-1978-highscore', '催生', '高分榜机制直接源自街机竞争'],
  ['co-1981-nintendo', 'ga-1985-smb', '代表作', '马里奥确立任天堂平台范式'],
  ['ga-1985-smb', 'gp-1985-platform', '催生', '横版卷轴关卡设计方法论'],
  ['co-1981-nintendo', 'gp-1985-platform', '催生', '质控公约与第一方范式定型'],
  ['hw-2005-multicore', 'be-2009-go', '催生', '多核并行倒逼 goroutine 模型'],
  ['en-2020-ue5', 'ar-2020-fidelity', '抬高', 'Nanite/Lumen 抬升写实基线'],
  ['hw-2018-rtx', 'en-2020-ue5', '支撑', 'RT 核心为光追管线提供算力'],
  ['co-1991-id', 'en-1993-doom', '开发', 'Doom 确立 id 引擎授权模式'],
  ['co-1991-id', 'en-1996-quake-engine', '开发', 'Quake 确立 C/S 网络分工'],
  ['co-1991-epic', 'en-2014-ue4-godot', '开发', 'UE4 免费化改写引擎商业模式'],
  ['co-2006-riot', 'gp-2009-lol', '开发', '单品长运与电竞体系化'],
  ['co-1991-epic', 'gp-2017-battleroyale', '开发', '堡垒之夜定型大逃杀+赛季制'],
  ['en-2005-unity', 'ga-2020-genshin', '支撑', '跨端同一资产管线落地'],
  ['co-2012-mihoyo', 'ga-2020-genshin', '开发', '自研跨端管线与长线运营'],
  ['gp-2006-f2p', 'ga-2020-genshin', '模式承袭', '抽卡长线商业模式延续'],
  ['en-1996-quake-engine', 'ga-1996-quake', '支撑', '引擎与产品同步验证'],
  ['hw-1999-geforce', 'hw-2001-shader', '演进', 'T&L 到可编程着色器自然延续'],
  ['hw-1996-voodoo', 'hw-1999-geforce', '演进', '3dfx 证明市场，NVIDIA 规模化 GPU 概念']
]

const itemMap = new Map()
for (const track of TRACKS) {
  for (const item of track.items) {
    item.track = track.id
    item.trackName = track.name
    item.trackColor = track.color
    itemMap.set(item.key, item)
  }
}

for (const [srcKey, dstKey, srcNote, dstNote] of RELATIONS) {
  const src = itemMap.get(srcKey)
  const dst = itemMap.get(dstKey)
  /* v8 ignore next */
  if (src && dst) {
    src.links = src.links || []
    dst.links = dst.links || []
    src.links.push({ track: dst.track, key: dstKey, dir: 'out', note: srcNote })
    dst.links.push({ track: src.track, key: srcKey, dir: 'in', note: dstNote })
  }
}

import { reactive } from 'vue'

export const store = reactive({
  focus: null,
  collapsed: {}
})

export function segmentOf(year) {
  for (const seg of SEGMENTS) {
    if (year >= seg.from && year <= seg.to) return seg.id
  }
  return null
}

export function itemsIn(decade) {
  /* v8 ignore next */
  const seg = SEGMENTS.find(s => s.decade === decade)
  if (!seg) return { tracks: [] }
  const result = []
  for (const track of TRACKS) {
    const items = track.items.filter(it => it.year >= seg.from && it.year <= seg.to)
    result.push({ trackId: track.id, trackName: track.name, trackColor: track.color, items })
  }
  return { segment: seg, tracks: result }
}

export function toggleFocus(trackId) {
  store.focus = store.focus === trackId ? null : trackId
}

export function toggleCollapse(trackId) {
  store.collapsed[trackId] = !store.collapsed[trackId]
}

export function relatedKeys(focusTrackId) {
  if (!focusTrackId) return new Set()
  const related = new Set()
  const focusTrack = TRACKS.find(t => t.id === focusTrackId)
  if (!focusTrack) return related
  for (const item of focusTrack.items) {
    if (item.links) {
      for (const link of item.links) {
        related.add(link.key)
      }
    }
  }
  return related
}

export function prefersReduced(win = globalThis) {
  if (typeof win.matchMedia !== 'function') return false
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export async function loadGsap() {
  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)
  return { gsap, ScrollTrigger }
}

export function fadeCardsOnScroll(el, { load = loadGsap, reduced = prefersReduced() } = {}) {
  if (reduced) return () => {}
  return load().then(({ gsap, ScrollTrigger }) => {
    const cards = el.querySelectorAll('[data-tl-card]')
    gsap.from(cards, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.05,
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true
      }
    })
    return () => ScrollTrigger.getAll().forEach(st => st.kill())
  }).catch(() => () => {})
}

export function initAxisCursor(axisEl, timelineEl, { load = loadGsap, reduced = prefersReduced() } = {}) {
  if (reduced) return () => {}
  return load().then(({ gsap, ScrollTrigger }) => {
    const cursor = axisEl.querySelector('.tl-cursor')
    if (!cursor) return () => {}
    const st = ScrollTrigger.create({
      trigger: timelineEl,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        /* v8 ignore next */
        cursor.style.transform = `translateX(${self.progress * 100}%)`
      }
    })
    return () => st.kill()
  })
}