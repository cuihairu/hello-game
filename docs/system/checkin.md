# Check-in, Benefits, and Redeem Codes

## Category

system / gameplay systems (operational granting). Node positioning: check-in, benefit mail, and redeem codes turn "the rewards operations wants to send" into "claimable by the player, reconcilable by the server, protected against duplication and abuse" — granting, claim idempotency, anti-abuse, and code redemption: four things. Shares the voucher convention with [Settlement](./settlement.md) and the progress counter with the [Quest System](./quest.md). This page covers only the "operations-initiated granting" path.

## Definition

Check-in (Daily Check-in) is a benefit track claimed in increments per natural day: consecutive or cumulative check-ins give tiered rewards. Benefits are the operations-outbound supplementary track: granted by event, by compensation, or by rule (mail/mail attachment). A Redeem Code is a **voucher redemption that exchanges an external entry for a reward**: one code for one reward, requiring anti-bruteforce and claim limits. Their shared structure: **one claimable state + one claim action + one de-duplication rule**.

## Problem

Granting pitfalls, in order of appearance:

- **Duplicate claims**: rapid clicks on the check-in button, replay on reconnection, concurrent claims from multiple clients — the same reward claimed twice.
- **Streak-break and make-up conventions**: after a broken streak, is the consecutive count zeroed or kept? What does a make-up consume, and what is the cap on how many days can be made up? Without a convention it is decided ad hoc on the spot and the rule drifts.
- **Mail attachment expiry and pile-up**: benefit mail is neither refunded nor returned if unclaimed, and after an attachment's validity expires the player complains "I never got it"; with no mail cap, it piles up like an inventory.
- **Redeem code brute-forcing**: a small code space with no rate limit gets enumerated by scripts and the limited rewards are scraped.
- **Granting decoupled from reconciliation**: manual compensation by operations is a direct deduct/add by the caller with no voucher or ledger, so auditing has no evidence.

## Algorithm

### Check-in: Server-Day Window + Claim Voucher

Check-in state is maintained per month/per round, and claiming is a commit action:

```text
checkin_state:
  player:        u1001
  round:         202610            # 轮次，按服务器日
  streak:        6                 # 连签计数
  last_claim:    20261008          # 上次领取的服务器日
  claimed:       [20261001..20261008]   # 已领日期集合

领今日(20261009):
  if last_claim == today: reject（重领）
  gap = today - last_claim
  streak = (gap == 1) ? streak+1 : 1   # 断签口径：归零（可配置为保留）
  claim → 写凭证 (player, checkin, today) → 落库
```

- "Today" is judged by the **server day** (the same convention as [Stamina and Attempt Gating](./stamina.md)), never the player's local timezone
- Claiming is idempotent on `(player, round, day)`: rapid clicks, replays, and concurrent multi-client claims all result in a single claim
- The streak-break convention is a config: "zero and restart" rewards continuity, "cumulative without clearing" is more lenient — both are common, so pick one and fix it
- Make-up (claiming a missed day) is a **consumptive action**: consume an item to make up one day, constrained by a "days/month" cap, and make-ups themselves go through vouchers

### Mail and Benefits: Granting Lands in Mail, Crediting Only on Claim

Benefit granting goes through a **mail object** rather than direct crediting:

| Stage | Convention |
|------|------|
| Grant | Operations/system generates the mail; the attachment is the reward entry, carrying `expire_at` |
| Claim | The player acts "claim attachment", at which point the reward voucher is written and credited |
| Expiry | Not claimed by the deadline, the attachment is retracted (the mail is marked expired and can no longer be claimed) |
| Cap | Mail count is capped; when full, new mail is rejected or the oldest is evicted (fixed convention) |

- Mail is a buffer that **decouples granting from crediting**: granting does not land in the inventory, claiming does — compensation, event rewards, and system notifications share one path
- Mail attachment claims and login check-ins share "claim voucher + idempotency key", rather than each writing its own
- Server-wide mail (one copy per player) and personal mail are handled separately: server-wide mail uses a template + lazy generation, not one row per player

### Redeem Codes: Redemption, Claim Limits, and Anti-Abuse

```text
redeem_code:
  code:        XMAS2026-XXXX
  rewards:     [ {item: gem, n: 500} ]
  per_user:    1               # 每人限领
  quota:       100000          # 全服限量
  claimed:     41200
  expire_at:   2026-12-31

核销(玩家提交码):
  1. 频率限制（同账号/IP 单位时间尝试次数）
  2. 码存在且未过期
  3. 该玩家未领过（per_user 去重）
  4. 全服配额未满（quota 递减）
  5. 写凭证 (player, code) 入账
```

- The order is the defense: rate-limit first, then check existence, so brute-forcing pays a frequency cost; claim limits and quotas are checked and incremented in the **same transaction**, never grant-then-check-quota
- Codes carry no semantics and are unpredictable (otherwise unpublicized codes could be deduced); "one code one reward" and "one code many rewards" are two independent forms, both with **per-user claim limits**
- Redemption uniformly goes through vouchers: who, which code, what was granted, when — the ledger is queryable, the only evidence in a redemption dispute

### Wiring to Operations

Grant sources converge to one outbound ledger, with multiple claim entry points on the player side:

| Entry | Grant source | Claim form |
|------|--------|---------|
| Check-in panel | Check-in table | Claimed per day |
| Mailbox | Operations/system | Claim attachment |
| Redeem code | External (media/event) | Redeem on claim |
| Compensation | Operations ticket | Granted by mail |

Every entry's rewards are written as a voucher first and then credited; operations looks at the same ledger.

## Used By

- **Genshin Impact / Honkai: Star Rail** (commercial mobile games): check-in (HoYoverse community check-in), mail validity and "claim all", redeem codes (granted via livestream/event, limited to one per person) — a public reference for three operational granting types coexisting.
- **Fate/Grand Order** (commercial mobile game): consecutive-login rewards and cumulative-login rewards separated into two tracks — a reference for "consecutive" and "cumulative" conventions coexisting.
- **Fantasy Westward Journey / A Chinese Odyssey Online** (commercial NetEase PC games): long-running operational practice of holiday benefit mail and redeem-code redemption, a reference for de-duplication and queryable ledgers.
- **General open-source servers** (TrinityCore, Nakama, etc.): mail and redeem codes are business-layer capabilities; Nakama provides general storage and remote procedure calls that can host redemption logic, but does not include check-in/redeem business conventions built in — this page is a convention synthesis, per each project's public documentation for specifics.

Reference analysis: Genshin's three operational granting types = worth referencing (separating entry points from grant sources lands in "Wiring to Operations"); FGO's dual-track login = borrowable (the two conventions of consecutive and cumulative, landing in the two check-in configurations); NetEase PC game redemption ledgers = worth referencing (redemption vouchers land in the redeem-code section); Nakama RPC hosting redemption = borrowable (lands in the redeem-code implementation path, not expanded here).

## Related

Relationship chain: check-in window → mail decoupling → redeem-code redemption → unified outbound ledger. Each segment answers "why the next one is needed":

- Check-in sets the basic plate of "daily increment", only then can other granting forms be discussed — it is the simplest "state + claim".
- Only when check-in is sufficient do you need mail — decoupling granting from crediting gives compensation and event rewards a unified container.
- Only with the mail container do you collect redeem entry points — external code redemption goes through the same crediting, not a separate ledger path.
- Only once the four entry points are merged can you reconcile — all granting is written as a voucher first, and operations audits the same ledger.

Upstream: [Settlement](./settlement.md) (claim/redemption vouchers), [Stamina and Attempt Gating](./stamina.md) (same server-day window convention); downstream: [Quest System](./quest.md) (check-in/benefits as quest event sources), [Drop and Probability Design](/numerical/05) (numerical side of granted rewards), operational events and battle passes (the operational container for granting; battle pass is a node in the same group).

## Reference

- This page is a mechanics synthesis; the check-in/redeem rules of each commercial case are per each official public source — this page cites only the convention, not values.
- The compliance conventions for redeem-code anti-bruteforce and probability disclosure are per the latest regulations; this page gives general practice.
- Terminology: Check-in, Streak, Mail/Attachment, Redeem Code, Quota, Idempotency Key.

## References

- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)
- [Wikipedia · Game balance](https://en.wikipedia.org/wiki/Game_balance)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [03-application-scenarios](/research/03-application-scenarios.md)
- [battle-pass](battle-pass.md)
- [genre-coverage](genre-coverage.md)
