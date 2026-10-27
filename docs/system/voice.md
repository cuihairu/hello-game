# In-Game Voice

## Category

system / gameplay systems (real-time communication component). Node positioning: in-game voice turns "a player's voice" into a "low-latency, governable, compliant" real-time stream — capture and encoding, room topology, spatial audio, and content compliance: four things. The transport foundation and broadcast mechanism are in [Broadcasting and Push of the networking tree](/networking/07), the binding between rooms and parties is in [Party Matchmaking](./party-matchmaking.md), and this page covers only the voice link itself.

## Definition

Game voice has three topologies: **room-based** (squad/guild voice, server-forwarded, mainstream), **P2P** (point-to-point direct, saves servers but has a high NAT-hole-punching failure rate), and **spatial voice** (attenuation and directionality based on the listener's and speaker's in-game positions, such as proximity speech in battle royale). By trigger there are two modes: **open mic** and **push-to-talk (PTT)**. Shared link: **capture → echo cancellation/noise suppression → encode → transport → forward → decode → play**.

## Problem

Voice pitfalls, in order of appearance:

- **Latency and jitter**: game state sync can be compensated by interpolation, but choppiness in voice has no compensation — how large to set the jitter buffer is a direct trade-off between latency and smoothness.
- **Echo and noise**: without echo cancellation (AEC), a speaker playing out loud feeds a teammate's voice back into their mic, forming a feedback loop.
- **Bandwidth runaway**: everyone with an open mic, every room member sending to everyone else, and bandwidth growing with the square of headcount — get the topology wrong and neither server nor client can hold on.
- **Abuse and review**: voice abuse, cheat voice callouts, and advertising — text has sensitive-word filtering, but voice governance costs an order of magnitude more.
- **Compliance**: recording retention, minor protection, and privacy consent differ by distribution region, and retrofitting later is expensive.

## Algorithm

### Link and Topology: Forwarding-Based Primary, Adaptive Encoding

```text
发送端: 采集(16kHz~48kHz) → AEC/NS → Opus 编码(自适应码率)
传输:   RTP/UDP（可靠层自行处理丢包：冗余包/FEC/重传协商）
转发:   SFU（选择性转发单元）：收到各路流，按订阅关系转发，不混音
接收端: 抖动缓冲 → 解码 → 混音(客户端) → 播放
```

The trade-offs among the three topologies:

| Topology | Principle | Advantages | Cost | Applicability |
|------|------|------|------|------|
| P2P | End-to-end direct | Zero server forwarding cost | Hole-punching fallback, N-way full mesh bandwidth is quadratic | 1-on-1, very small squads |
| MCU | Server mixes then sends one stream | Client bandwidth constant | Server mixing compute is expensive, latency increases | Conference-call style, very small squads |
| SFU | Server only forwards, no mixing | Server compute saved, clients subscribe as needed | Client must decode multiple streams and mix itself | Game squad/guild mainstream |

- Encoding uses **Opus** (an open standard with a public specification): adaptive bitrate is its built-in capability, automatically lowering bitrate on weak networks — the same idea as degradation in [weak-network countermeasures](/networking/07)
- Adaptive jitter buffer: start small and grow it when jitter is detected — a fixed large buffer has high latency, a fixed small buffer has more choppiness
- Voice tolerates latency **higher** than game state sync (hundreds of milliseconds is conversational) and **far lower** than asynchronous messages — the budget for link optimization is allocated at this magnitude

### Room Model: Bound to the Game Session, Token Admission

- Voice rooms are **parasitic** on the game session: forming a squad creates the room, disbanding destroys it — room lifecycles are not managed independently, avoiding a dangling state of "person outside the squad but still in the room"
- Admission uses a **short-lived token**: joining a voice room first exchanges a token with the game server (validating party identity), then connects to the voice gateway with the token — the voice service does not directly trust the room number reported by the client
- Directed voice ("speak only to someone") is a granularity question of subscription relations inside the room: the SFU forwards by subscription, and the client UI controls subscriptions — the server does not need a "directed channel" concept

### Spatial Voice: Attenuation and Directionality on the Client

- The server only decides "who subscribes to whose stream" by AOI (nearby people), with **attenuation and spatialization entirely on the client**: the distance-attenuation curve and left/right channel placement are computed from local coordinates — the server forwards the raw stream and does not understand space
- The subscription range changes dynamically with movement: subscribe when near, unsubscribe when far, reusing the field-of-view convention of [AOI](/server/aoi) — spatial voice is "auditory AOI"
- Faction isolation is a filter on subscription relations: friendly/foe recognition is done at the server's subscription filtering layer, not relying on client self-restraint

### Governance and Compliance: Sampling Review + Tiered Permissions

| Measure | Convention |
|------|------|
| Reports | Player reports bind a room id + time window, and the review playback takes that window |
| Sampling transcription | Voice samples are transcribed to text then machine-reviewed (sensitive words/model classification), with human review on a hit |
| Permission tiers | The squad leader can mute members; the room creator can mute everyone |
| Retention | Recording retention period and purpose per the law of the distribution region, minimized by default |
| Consent | The use of the microphone and the recording convention are disclosed explicitly before first use (privacy compliance) |

- Review is **after-the-fact spot checks + in-the-moment reports**, not real-time transcription for everyone — dual red lines of cost and privacy
- The openness policy for squad voice and all-hands voice follows the category: competitive categories default to squad-only (the defense against information leakage), social categories open a public channel — **whether to open it is a category decision**, not a default capability

## Used By

- **Valorant / CS2** (commercial competitive FPS, publicly available official material): in-squad voice is the core collaboration component, with the public channel tightened by default — a reference for "competitive categories default to squad-only".
- **Honor of Kings / Game for Peace** (commercial Tencent mobile games): squad voice with open mic + voice-changing processing — a public reference for combining mobile voice with social gameplay.
- **Discord** (commercial voice community): the community form of voice rooms bound to game state, and the on-demand subscription room model — the de facto reference for "out-of-game voice".
- **WebRTC** (open standard and open-source implementation stack): a complete open-source reference for capture, encoding, transport, and jitter buffers — the direct source of this page's link diagram.
- **Mumble** (open-source low-latency voice, public project): an open-source implementation reference for low-latency positioning and _positional audio_ (spatial audio).
- **FF14** (commercial MMO, publicly stated official form): no built-in voice, the community uses third-party voice tools — a category counter-reference for "an MMO need not have in-game voice".

Reference analysis: WebRTC = worth referencing (the link and jitter buffer land directly in this page's link section); Mumble's spatial audio = worth referencing (the convention that attenuation is on the client lands in spatial voice); Tencent's squad voice = borrowable (the mobile form and voice changing, landing in the room model); Discord = borrowable (the sense of boundaries around binding rooms to games, landing in social design under the design tree); FF14's no-built-in = borrowable (the category-decision convention lands at the end of the governance section).

## Related

Relationship chain: link and encoding → room topology → spatial subscription → governance and compliance. Each segment answers "why the next one is needed":

- Only once the link fixes the transport cost can you talk about topology — the P2P/MCU/SFU trade-off is allocating within the link cost.
- Only once the topology fixes the room boundary can you talk about subscription — spatial voice is the dynamization of subscription relations inside a room.
- Only once subscriptions are clear can you talk about governance — reports and muting both anchor to "room + time window", and without a room model there is nowhere to anchor.
- Only once governance stands can you default to open mic — the public-surface risk of voice is the same class as the marquee, and review-then-open is the baseline.

Upstream: [Broadcasting and Push of the networking tree](/networking/07) (transport and weak-network degradation), [Party Matchmaking](./party-matchmaking.md) (binding voice rooms to parties), [AOI](/server/aoi) (the subscription range for spatial voice); downstream: [Marquee and Announcements](./marquee.md) (the same class of public-surface governance convention), operational compliance node (retention and consent handled on the operations side; pending).

## Reference

- This page is a mechanics synthesis; Opus/WebRTC/Mumble are per each public standard and project documentation, with no private interfaces cited.
- Voice compliance (retention, transcription, minors) is per the current law of the distribution region; this page lists only general conventions.
- Terminology: Voice Chat, PTT/Push-to-Talk, SFU/Selective Forwarding Unit, MCU, Opus, AEC/Acoustic Echo Cancellation, Spatial Audio.

## References

- [Wikipedia · Voice recognition](https://en.wikipedia.org/wiki/Speech_recognition)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [genre-coverage](genre-coverage.md)
