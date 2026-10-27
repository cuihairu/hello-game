# Cosmetics, Skins, and Outfits

## Category

system / gameplay systems (commercialization appearance component). Node positioning: the appearance system turns "dress-up content that does not affect numerics" into "acquirable, ownable, equippable, displayable" objects — content typing, ownership relations, equipment resolution, and display and hiding: four things. It is the main battleground of non-stat monetization; the asset side (models/textures/effects) is in the art tree, the purchase and gacha entry points are in [Settlement](./settlement.md) and [Drop and Probability Design](/numerical/05), and this page covers only the appearance object's own mechanism.

## Definition

An appearance is **presentation content without combat stats**: skins (a full appearance swap), outfit pieces (mixable individual items), titles (text badges), avatar frames, loading screens, emotes/effects. Its key contract is "does not affect balance" — once an appearance carries stats it stops being commercialized content and becomes pay-to-win, and the red line is crossed. Shared structure: **content definition + ownership relation + equipment slots (multi-slot) + display rules**.

## Problem

Appearance pitfalls, in order of appearance:

- **Appearances carry stats**: adding attributes while selling a skin turns the appearance into a utility choice, and players "buy skins for power" rather than for preference — the red line breaks and reputation is eroded long term.
- **Ownership and equipment conflated**: storing "owning" and "currently equipped" in one place makes swapping a skin lose the old one; or equipping an appearance you do not own.
- **Multi-slot conflicts**: a skin is a full set and outfit pieces are individual items, but the priority and exclusivity of layering the two are undefined, producing clipping or overwriting incidents where a skin is worn with individual pieces on top.
- **Time-limited appearance retraction convention**: rental appearances (time-limited trial) are retrieved on expiry, and stored together with "owned outright", causing outright content to be deleted on expiry.
- **Assets coupled to logic**: appearance package names hardcoded in client logic, so adding a skin set requires a client release — appearances are the most frequently updated content and must be data-driven.

## Algorithm

### Content Typing: Modelled by Equipment Slot and Exclusivity

```text
appearance_def:                    # 静态表，美术与策划维护
  id:         skin-knight-a        # 整套皮肤
  slot:       skin                 # skin / headgear / weapon_fx / title / frame / loading
  group:      knight_family        # 互斥组：同组内二选一
  numeric:    none                 # 契约字段：外观不得带数值（表侧校验）
  asset_key:  knight_a             # 资源键，客户端据此加载，逻辑不写死包名
  source:     gacha / shop / event / achievement

owned_appearance:                  # 拥有关系，独立于装备
  player:     u1001
  id:         skin-knight-a
  acquired_at: 2026-10-01
  kind:       permanent            # permanent / rental
  expire_at:  null                 # rental 才有

equipped_appearance:               # 每槽位一条
  player:     u1001
  slot:       skin    → skin-knight-a
  slot:       title   → title-firstclear
```

- **Ownership and equipment are separated**: `owned` is the asset, `equipped` is a pointer — changing outfit does not touch the asset, and a rental expiry only affects the legality check of `equipped`, never deleting outright content
- `numeric: none` is a table-side validation field: the appearance definition table is not allowed to have a stat column, guaranteeing the "does not affect balance" contract at the data layer
- Exclusivity is expressed with `group`: full-set skins vs. individual pieces, and individual pieces on the same body part, are arbitrated by group priority during equipment resolution

### Equipment Resolution: Server Authority + Client Presentation

- The server only stores "which id is in which slot", not the rendered appearance result — all presentation is on the client
- The equip action **validates the ownership relation**: equipping an id you do not own is rejected outright; equipment requests reported by the client are not trusted
- Exclusivity resolution is done on the client (the same group table); the server only guarantees "everything equipped is owned" — presentation-layer clipping/priority is a client implementation concern, not arbitrated by the server
- Other players seeing your appearance: appearance data syncs with the player entity (equipped snapshot carried when entering the field of view); the convention for [AOI](/server/aoi) and entity synchronization is in the server tree

### Acquisition and Display: Multiple Entry Points, Weak Stats, Showable Off

| Entry | Form | Notes |
|------|------|------|
| Direct shop purchase | Owned outright | Clear price, goes through payment vouchers |
| Gacha | Random acquisition | Probability and pity ceiling see [Drop and Probability Design](/numerical/05) |
| Event/achievement | Condition unlock | As a progress reward, coupled with [Achievements and Codex](./achievement.md) |
| Time-limited rental | Trial then convert to purchase | On expiry only `equipped` is retracted, not outright ownership |
| Battle pass track | Season-limited | Coupled with [Battle Pass and Season Track](./battle-pass.md) |

- The "showing off" on the display surface should be restrained: a server-wide broadcast of "some player got a rare skin" is a lever for pulling demand, but see the rate-limiting convention in [Marquee and Announcements](./marquee.md) for abuse — a **configurable threshold**, not broadcasting every acquisition
- The scarcity of time-limited/limited appearances relies on the **acquisition window**, not after-the-fact deletion: not returning an expired item is an operational promise, and returning it requires care (the cost of breaking a promise is greater than short-term revenue)

### Red Line Against the Numerical Side

- The appearance system must have **zero coupling** with [Combat Numerics and Damage Formulas](/numerical/02): an appearance id must not appear in any damage, attribute, or combat-power calculation
- The boundary of "does an appearance affect game feel" (e.g. a weapon skin's reload animation) is client presentation, but must not change the hit frame or hit detection — the separation of presentation and logic is handled by the client tree
- Teammate/enemy distinguishability: free mixing of appearances may affect battlefield identification (recognizing enemy-faction skins), and some categories use a "unified teammate/enemy appearance" option or restrict appearances in competitive modes — a category-level convention

## Used By

- **League of Legends / Honor of Kings** (commercial MOBA): skins are the core commercialized content, pure presentation with no stats involved; limited and Prestige tiers rely on the acquisition window and rarity layering — a commercial-practice reference for "appearances do not sell power".
- **CS2 / Dota 2** (commercial competitive, publicly available Valve material): the item system (weapon skins, couriers, Prismatic) is a reference for UGC- and trading-market-oriented appearances, with non-stat attributes such as rarity and wear driving value.
- **Fortnite** (commercial battle royale): the operating form of skins + time-limited returns + IP collaborations, the most active public reference for appearance commercialization this season.
- **Genshin Impact / Honkai: Star Rail** (commercial mobile games): character skins and name cards, avatar frames, and other lightweight outfits — a reference for "heavy content + light outfits".
- **Platform side**: Steam's community market external trading is per the public market rules; this page only cites the in-site ownership/equipment convention.

Reference analysis: LoL/Honor of Kings skins = worth referencing (the red line that appearances do not sell power and tier layering land in the red-line section against the numerical side); CS2/Dota items = borrowable (non-stat attributes driving value, landing in scarcity design; external trading is not expanded in this repo); Fortnite collaborations and returns = borrowable (the acquisition window and careful returns, landing in acquisition and display); Genshin's light outfits = worth referencing (lightweight slots such as avatar frames and name cards land in content typing).

## Related

Relationship chain: content typing → ownership/equipment separation → equipment resolution → acquisition and display. Each segment answers "why the next one is needed":

- Only once typing fixes the slots and exclusivity can you talk about ownership — without a slot model, mixing cannot be arbitrated.
- Only with ownership and equipment separated does swapping not lose assets — a rental expiry touches only equipment, not outright ownership.
- Only with server-authoritative equipment resolution is display trustworthy — what you do not own cannot be equipped, and syncing to others has credibility.
- Only once acquisition entry points are spread do you need the red line — the more entry points and the closer to commercialization, the more the "do not sell power" line must be held.

Upstream: [Settlement](./settlement.md) (purchase and draw vouchers), [Drop and Probability Design](/numerical/05) (gacha probability side), the art tree's asset pipeline (production of appearance content); downstream: [Achievements and Codex](./achievement.md) (appearances as collection rewards), [Battle Pass and Season Track](./battle-pass.md) (season-limited appearances), [Marquee and Announcements](./marquee.md) (acquisition broadcasts), [Combat Numerics and Damage Formulas](/numerical/02) (the zero-coupling red line).

## Reference

- This page is a mechanics synthesis; the skin pricing and return strategy of each commercial case are per each official public source.
- "Appearances do not affect stats" is a widely practiced design red line in competitive categories, adopted as a convention in this repo; the boundary for non-competitive categories (e.g. buff-granting appearances) is not asserted here.
- Terminology: Cosmetic, Skin, Transmog (illusion/full-set swap), Slot, Rental (time-limited rental), Rarity.

## References

- [Wikipedia · Cosmetic item](https://en.wikipedia.org/wiki/Loot_box)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [genre-coverage](genre-coverage.md)
- [territory](territory.md)
