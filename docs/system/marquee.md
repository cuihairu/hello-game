# Marquee and Announcements

## Category

system / gameplay systems (information broadcasting component). Node positioning: the marquee (scrolling broadcast) and announcements turn "something worth seeing happened on the server" into a "filterable, rate-limited, deliverable" message pipeline — content source, filtering and risk control, delivery channel, and playback queue: four things. The network layer of the broadcast channel is in [Broadcasting and Push of the networking tree](/networking/07); this page covers **what to broadcast, to whom, and how to limit it**.

## Definition

A marquee is a scrolling message bar on the client UI, with three content types: **system events** (rare drops, first kills, the start of major events), **operational announcements** (maintenance, versions, compensation notices), and **player shouts** (paid server-wide messages). An announcement is a static subset of the same pipeline: no scrolling playback semantics, and it must be pullable on login. Shared structure: **message object + filtering rules + delivery channel + playback queue**, each of the four layers independently replaceable.

## Problem

Broadcast pitfalls, in order of appearance:

- **Spam and abuse**: player shouts used for advertising, flame wars, and phishing links — broadcasting is a server-wide visible public surface, and without filtering and rate limiting it is an amplifier.
- **Broadcast storm**: a server merge, a launch rush, or a whale's consecutive pulls trigger the same event broadcasting in sequence, the client queue fills up, and normal messages are drowned out.
- **Missed while offline**: event-type broadcasts reach only online players, so operational announcements are invisible to offline players — pulling on login and pushing events are conflated.
- **Conflict between review and immediacy**: reviewing player content before sending introduces delay, sending directly is risky, and there is no layered convention for the dilemma.
- **Repeated-message fatigue**: the same event ("some player pulled an SSR") sent N times in a short period, players ignore it outright, and the broadcast loses its value.

## Algorithm

### Message Object: Unified Structure, Type-Specific Handling

```text
broadcast_msg:
  id:        b-88123
  type:      loot_rare / notice / player_shout
  priority:  10                 # 数字越大越优先
  channel:   global / zone:3 / channel:world
  ttl:       3600              # 秒，过期不再投
  i18n_key:  marquee.rare_loot # 文案键，多语言在客户端解析
  payload:   {player: u1001, item: sword-ssr}
  audit:     passed            # 玩家内容需审核位
```

- Content is **key-value + parameters**, not a concatenated string: multi-language and text hot updates both complete on the client side, the server only sends structure
- `ttl` controls the message lifecycle: a scrolling-bar message past its validity is no longer delivered to newly online players
- Three content types share one structure with different handling paths, and there is only one pipeline

### Filtering and Rate Limiting: Review-Then-Send + Token Bucket

| Content type | Review | Rate limit |
|---------|------|------|
| System event | No review (template-generated) | Same-event merge window |
| Operational announcement | Published from the operations console, no real-time review | Publish frequency controlled in the console |
| Player shout | Sensitive-word filter + optional human queue (review-then-send) | Paid threshold + per-person frequency cap |

- **Review-then-send** for player content is the baseline convention: machine sensitive-word review first, and if it hits the human queue it is sent asynchronously (notified "under review" at send time); there is no "send then retract" option — the cost of retraction is far higher than the delay
- Same-event merge: messages with the same `(type, key)` send only one within the merge window (or only the highest-value one); ten consecutive pulls report only the best one
- Token buckets are bucketed by type: the system-event bucket is far larger than the player-shout bucket, and in a storm the shouts are what gets sacrificed first

### Delivery: Online Push, Offline Pull

- **Online push**: the gateway broadcasts by `channel` (server-wide / zone / channel) through the channel in [Broadcasting and Push of the networking tree](/networking/07); event-type messages are not resent — if you miss it, you miss it
- **Offline pull**: announcement-type messages are retained server-side (with `ttl`), and players pull the current valid list on login — the boundary between "miss it and miss it" and "visible on login" is exactly this one point
- Known traffic peaks such as server merges and launches roll out in batches by `channel` on the delivery side, never as a single-point server-wide instant send
- The client puts a received message in a **local queue first**, and the player dequeues by priority: higher priority can preempt (an event starting), same priority is FIFO — the server does not manage playback pacing, only ordered arrival

### Wiring to Gameplay

Broadcast event sources come from each system, but the broadcast layer does not depend on them in reverse:

- Events such as drops, gacha pulls, and kills are emitted by each system, and the broadcast layer filters by configuration the "events worth broadcasting" (the value threshold is operationally configurable) — the threshold is an operational lever, not a code constant
- Player shouts are a paid-item consumption and go through [Settlement](./settlement.md) vouchers; "**consume first, broadcast later, and no refund if the broadcast fails**"? No — the convention is "charge only if the broadcast succeeds", with the send confirmation and the charge inside the same transaction boundary
- The broadcast layer does not write quest/achievement progress, but "send a shout" itself can be an event subscribed to by [quests](./quest.md) and [achievements](./achievement.md) (e.g. a "send a shout on New Year's Eve" event)

## Used By

- **TrinityCore** (open-source MMORPG server suite, public repo and wiki): server-wide announcements and system notifications go through a server-side broadcast interface, with templated text and parameter filling — the general-form reference for server-side broadcasting; actual interfaces are per the project's public documentation.
- **Colyseus** (open-source real-time framework): the room-level `broadcast` API is the minimal implementation of "broadcast by room/channel" — the direct reference for this page's delivery layer and the connection to networking/07.
- **Fantasy Westward Journey / A Chinese Odyssey Online** (commercial NetEase PC games): server-wide shouts (paid) and tiered broadcasting across guild/world channels — a long-standing public reference for "paid shouts + tiered channels".
- **Genshin Impact** (commercial mobile game): gacha gold pulls get **no server-wide broadcast** — a category choice where the social value of broadcasting is zero, a counter-reference for "not every event is worth broadcasting".
- **Honor of Kings / League of Legends** (commercial MOBA): in-match kill announcements and multi-kill announcements — a reference for "tiered event announcements by value".

Reference analysis: TrinityCore's broadcast interface = worth referencing (templated announcements land in the message-object section); Colyseus broadcast = worth referencing (channel broadcasting lands in the delivery layer, connecting to networking/07); NetEase's server-wide shouts = borrowable (paid shouts and tiered channels land in the filtering and rate limiting section); Genshin's no-broadcast = borrowable (the value-threshold filter lands in the gameplay wiring section); MOBA announcement tiering = borrowable (event value grading, configurable threshold).

## Related

Relationship chain: message object → filtering and rate limiting → delivery channel → playback queue. Each segment answers "why the next one is needed":

- Only once the message structure is unified can you discuss filtering — three content types in one pipeline, type-specific handling rather than separate pipelines.
- Only once filtering stops abuse do you dare to broadcast — the first duty of a public surface is not delivery but avoiding incidents.
- Only once rate limiting provides a floor can you discuss delivery — the boundary between online push and offline pull is clear, and announcements reach everyone.
- Only once delivered can you discuss playback — the queue and priority are the client's concern, and the server only needs to guarantee ordered arrival.

Upstream: [Broadcasting and Push of the network layer](/networking/07) (channels and push mechanism), [Settlement](./settlement.md) (shout charging vouchers); downstream: [Quest System](./quest.md) and [Achievements and Codex](./achievement.md) (shout events can be subscribed), operational event announcements (the announcement source; the marquee is the presentation surface).

## Reference

- This page is a mechanics synthesis; the shout pricing and broadcast strategy of each commercial case are per each official public source.
- Sensitive-word and content-safety conventions must be combined with the regulation requirements of the distribution region; this page gives the general layered practice.
- Terminology: Marquee, Announcement, Shout/Horn, TTL (message validity), Rate Limit, Merge Window.

## References

- [Wikipedia · Video game economy](https://en.wikipedia.org/wiki/Virtual_economy)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [cosmetics](cosmetics.md)
- [genre-coverage](genre-coverage.md)
- [voice](voice.md)
