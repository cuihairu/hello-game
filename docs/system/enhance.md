# Equipment Enhancement and Star Upgrade

## Category

system / gameplay systems (growth gate). Node positioning: enhancement and star upgrade turn "spend resources → gain attributes" into a **predictable, fallible, pity-backed** targeted growth action. The division of labor with random output: drops ([Drop and Probability Design](/numerical/05)) decide "what you get"; enhancement decides "how you get stronger after getting it". Consumption goes through [Settlement](./settlement.md) vouchers, and the achievement and quest hooks for enhancement events go through [Achievements and Codex](./achievement.md).

## Definition

Enhancement (Enhancement/Refinement) is a deterministic or probabilistic upgrade of an existing costume/equipment object: spend materials and currency to raise base attributes or append affixes. Star Upgrade (Star Upgrade/Ascension) is a quality ladder: spend same-name or exclusive materials to push the object to the next tier, where between tiers there is a discrete attribute multiplier or an unlocked slot. Their shared structure: **one level/star table + one failure policy + one pity rule**. Enhancement has failure and rollback concerns; star upgrade is usually a deterministic exchange with a failure policy of zero.

## Problem

Enhancement pitfalls, in order of appearance:

- **Publicized probability does not match reality**: the success rate shown by the client does not match the server's evaluation, or operations silently retunes the probability — a compliance red line, not an experience issue.
- **Failure without a stop-loss**: failure only deducts materials with no compensation, so all of the frustration is carried by the probability; with no pity ceiling on losing streaks, extreme outcomes are uncontrollable.
- **Multi-source materials do not reconcile**: materials come from drops, the shop, and event recycling, multiple entry points, and the refund path after a failed enhancement deduction does not match the consumption voucher.
- **Inheritance breaks on equipment swap**: swapping in a new weapon invalidates the old weapon's enhancement level — early investment instantly devalues, and players dare not enhance.
- **Enhancement level is welded to the equipment instance**: whether the server stores enhancement state inside the equipment instance or in a separate table is not thought through, so migration and inheritance cannot be implemented.

## Algorithm

### Enhancement Table: Level, Cost, Success Rate, and Attributes

```text
enhance_def:                      # 静态表，按装备品质分档
  quality:     purple
  level:       3 → 4
  cost:        { gold: 8000, stone: 12 }
  success_rate: 0.75
  bonus:       { atk: +40 }
  fail_policy: keep            # keep / downgrade / break
  pity_band:   5               # 连败 5 次内必成

equip_enhance_state:              # 运行态，每件装备一行
  equip_uid:   e-77123
  player:      u1001
  level:       3
  fail_streak: 2               # 当前保底计数
```

- Evaluation happens on the server: the random number, the success check, and the pity counter all complete server-side, the client only displays — consistent with the [server authority](/client/05) convention
- Three tiers of failure policy:

| Policy | Failure consequence | Experience | Applicability |
|------|---------|------|------|
| keep (no downgrade) | Only materials deducted | Gentle | Mobile-game mainstream; the enhancement material itself is a consumable |
| downgrade (drop one level) | Level regresses | Strong sense of risk | Traditional PC/console enhancement (e.g. weapon-enhancement style gameplay) |
| break (shatter) | Equipment disappears | Extreme | Only for high-stakes equipment slots, requires a front-loaded stop-loss design |

### Pity: Losing-Streak Counter, Isomorphic with Gacha Pity

- Each equipment maintains a `fail_streak` per tier, and a guaranteed success is reached within `pity_band` losing streaks — isomorphic with gacha pity ([Drop and Probability Design](/numerical/05)): both are "a hard floor beneath the surface probability"
- The pity counter **only increments on failure and resets on success**, and does not decay with time; switching equipment does not transfer the pity (unless inheritance is implemented, see below)
- Publicization convention: the probability and pity rules are stated where they are shown on the client — probability disclosure for domestic random-extraction gameplay is a regulatory requirement, and applies equally to enhancement if it contains randomness

### Star Upgrade: Deterministic Ladder

```text
star_def:
  quality:     purple
  star:        2 → 3
  cost:        { shard: 60 }          # 同名碎片或通用升星材料
  multiplier:  { hp: 1.15, atk: 1.15 }  # 全属性乘数

star_progress:
  equip_or_hero_uid: h-2201
  star:        2
  shards:      42 / 60
```

- Star upgrade is a deterministic exchange: materials complete, it succeeds, with no failure policy — the sense of risk is carried by "materials are hard to obtain", not by randomness
- Attributes use multipliers, not additive values: star is a quality tier, and across qualities they are not comparable; multipliers let the table be maintained independently per quality
- Shard sources (drops, shop, events) only decide how materials enter the account; consumption uniformly goes through vouchers — sharing the settlement path with enhancement

### Enhancement Inheritance: Level Transfer and Loss

When equipment is replaced, the old enhancement investment has one of three exits:

| Option | Convention | Cost |
|------|------|------|
| Full inheritance | The new equipment directly gets the old level | Late-game growth is frictionless, early investment does not devalue |
| Loss inheritance | Proportional downgrade on inheritance (e.g. -1 level or 80%) | Keeps the swap motive, investment still protected |
| Material refund | Decompose and refund some enhancement materials | The player operates again; the refund rate is a numerically sensitive point |

- In storage, enhancement state must be a **record independent of the equipment's base attributes** (`equip_enhance_state` keyed by `equip_uid`); only then is there room to implement inheritance — this is the solution to the "enhancement level welded to the equipment instance" problem
- The inheritance action itself goes through a voucher: destroying the old record and creating the new one happen in the same transaction, preventing duplication

## Used By

- **Genshin Impact** (commercial mobile game): weapon ascension and artifact enhancement are **deterministic consumption** (no failure), while artifact affix enhancement has tiered randomness — a reference for the mixed form of "enhancement without failure + randomized affixes".
- **Diablo series** (commercial ARPG, publicly available Blizzard design material): random equipment affixes and reforge cost — a reference for "random enhancement + targeted re-roll".
- **Onmyoji** (commercial mobile game): Onmyuda enhancement, with randomized affix boosts and tiered-node pity — a reference for randomized enhancement with nodes.
- **Fantasy Westward Journey** (commercial PC game, publicly available NetEase material): gem inlay and crafting, a reference for deterministic ladders + material crafting.
- **TrinityCore** (open-source MMORPG server suite, public repo and wiki): enchantment, gem sockets, and equipment upgrading are all defined as data tables plus server-side evaluation — the direct reference for this page's "enhancement table + server evaluation"; actual table structure is per the project's public documentation.

Reference analysis: TrinityCore's enchantment/gem tables = worth referencing (the enhancement table structure lands directly in this page's enhance_def); Genshin's no-failure enhancement = borrowable (the keep policy and deterministic star upgrade land in the failure-policy table); Onmyoji's Onmyuda = borrowable (random affixes and tiered nodes land in the pity section); Diablo's reforge = borrowable (the re-roll mechanic, not expanded here, landing in growth design under the design tree); Fantasy Westward Journey's crafting = worth referencing (the deterministic ladder lands in the star upgrade section).

## Related

Relationship chain: enhancement table → server evaluation → pity → star upgrade → inheritance. Each segment answers "why the next one is needed":

- Only once the table is set can you discuss evaluation — success rate and cost are static data, and evaluation is their runtime state.
- Only with server-side evaluation can you discuss pity — a client-evaluated probability has no credibility, and pity must be counted server-side.
- Only once pity provides a floor do you dare to do star upgrade — the deterministic ladder is the special case of a zero failure policy, sharing the same consumption vouchers.
- Only once consumption closes the loop can you discuss inheritance — inheritance is a migration problem for enhancement state, and migration only exists if state is stored independently.

Upstream: [Drop and Probability Design](/numerical/05) (material sources and probability convention), [Inventory and Items](/system/services/01) (equipment instances and material storage); downstream: [Settlement](./settlement.md) (consumption and inheritance vouchers), [Achievements and Codex](./achievement.md) (enhancement milestone events), [Combat Numerics and Damage Formulas](/numerical/02) (the attribute entry point for enhancement output).

## Reference

- This page is a mechanics synthesis; the specific values and rules of each commercial case are per each official public source — this page cites only the convention.
- Probability disclosure for random gameplay is a regulatory compliance requirement (domestic publication regulation convention); the exact provisions are per the latest regulations.
- Terminology: Enhancement, Success Rate, Fail Policy, Pity, Star/Ascension, Inheritance.

## References

- [Wikipedia · Loot box](https://en.wikipedia.org/wiki/Loot_box)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [genre-coverage](genre-coverage.md)
