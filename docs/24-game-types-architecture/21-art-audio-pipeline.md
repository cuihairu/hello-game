# 21 Art and Audio Pipeline Collaboration

> In the asset-delivery collaboration I have seen, the server engineer's job is usually **managing contracts, managing versions, managing audits — never managing creation**. This piece follows assets along the path from art/audio tools to the player's device, recording the interface problems that surface during production, acceptance, and delivery; when cross-functional collaboration descends into chaos, the common root cause is that the interfaces were never defined. The related client-side budgets and test gates are covered in pieces 19 and 20 respectively.
>
> **Reference books**: for engineering practice on the asset pipeline and the DCC toolchain, see each engine's official Art Pipeline documentation (Unity Asset Workflow, Unreal Asset Guidelines); for the audio part, see practice guides of the *Game Audio Design and Production* type and platform audio specifications.

---

## 1. The Full Picture of the Asset Pipeline: From DCC Tools to Player Devices

The asset pipeline as a whole is a chain of conversions: **DCC tools** (Photoshop/Blender/Spine/DCC audio editors) produce source files → **export** into an intermediate format → **engine import** converts them into engine assets (re-compression, re-encoding, metadata generation) → **packaging** into the package or an asset patch → delivery to the device over CDN (piece 17 on multi-artifact versioning, piece 19 on package splitting).

The first judgment a backend engineer needs to establish: **every link in this chain is lossy and irreversible**. PSD to PNG loses layers, PNG into the engine and re-compressed loses color, high-bitrate audio downgraded loses dynamics — so source files (DCC project files) must be archived, with versions corresponding to the exports. A project debugging asset problems where "only the exports exist and no source files" is the equivalent of a server that has only logs and no code.

The second judgment: **the pipeline is a contract, not a flowchart**. What makes something a contract is that the three things — specs (dimensions/poly counts/formats), naming (directory and filename conventions), versions (the asset-to-package correspondence) — are written down and checked automatically; what exists only orally and in a wiki is decoration. Piece 20 noted that "performance thresholds written into a wiki get bypassed" — the same holds for asset contracts.

---

## 2. The Art Pipeline: Specs, Naming, Versions, Audits

### 2.1 Asset Specs: The Prerequisite of the Budget Sheet

The **asset budget sheet** of piece 19 (draw calls per screen, poly counts, texture memory) has its art-side ancestor in **asset specs**: how many polys a character gets, how large a texture may be, how many color variants, the particle budget for effects. Specs are back-derived from the performance budget rather than "art finishes first and then we measure" — projects that reverse the order always end up "cutting art to hold the frame rate," and everything cut is early-stage investment.

Specs must distinguish **source specs** from **runtime specs**: source files may be 4K, may be high-poly; at runtime they are exported by tier (piece 19 on LOD and texture tiering). Audits check runtime specs, while creation is constrained by source specs — conflating the two turns the conversation into two parties talking past each other.

### 2.2 Naming and Directories: Searchability Is Collaboration Efficiency

Naming conventions solve three problems: **what it is** (type prefix: `tex_`/`mdl_`/`fx_`), **whose it is** (module path: `ui/bag/`, `scene/forest/`), **which version** (variant suffixes, and avoiding `_new`/`_final` — a version suffix with no date and no semantics will inevitably run out of control). The convention itself is not what matters; **being machine-checkable** is what matters: an asset that fails naming never enters the package in CI, which is an order of magnitude more reliable than eyeballing it during review.

### 2.3 Asset Versions: Two Cadences Independent of Code Versions

Assets are large binary files, and Git's diff/merge is useless for them — that is the fundamental difficulty of asset version management. The mature engineering practice:

- **Source files go into version control or LFS**, exports do not (the pipeline regenerates them from source, guaranteeing reproducibility).
- **Decouple asset versions from package versions**: assets carry their own version numbers and patch chain (piece 17's multi-artifact versioning), and the client determines availability by two coordinates — "package version + asset version" — so the server's version-check interface must take both coordinates as inputs.
- **Compatibility window**: when an asset's reference relationships change (a texture deleted, a skeleton modified), clients on old packages are still running — the deprecation strategy for assets is isomorphic to retiring a protocol field: stop new references first, then observe dependencies, then remove (piece 17 on version determinability).

### 2.4 Toolchain and Asset Audit: Turning Specs into Gates

The repetitive labor of import/export (format conversion, compression parameters, platform tiering) should be **automated by the toolchain** — art only exports the intermediate format, and platform artifacts are generated by the pipeline. The audit is the pipeline's gate layer and checks four classes of rules:

1. **Spec rules**: textures over size, poly counts over budget, audio over duration — over-limit assets are refused outright (the same discipline as piece 20's "thresholds live in CI, not in the wiki").
2. **Naming rules**: validation of the convention from section 2.2.
3. **Reference rules**: dangling references (referencing a resource that does not exist) and orphan assets (referenced by nobody yet shipped in the package — a common fat deposit behind package-size overruns).
4. **Duplicate rules**: files with different names but identical content (the same icon stored in five copies).

---

## 3. The Audio Pipeline: Asset Taxonomy and Triggering Model

### 3.1 Audio Asset Categories and Format Tiers

Audio assets fall into four categories: **BGM** (long, looping, requiring seamless joining), **SFX sound effects** (short, high volume, high concurrency), **voice** (character dialogue, the bulk of the package), and **ambient sound** (looping, scene-driven). Formats are tiered by platform (piece 03 on platform constraints): iOS/Android/mini-game containers each support different codecs and sample rates, and audio compatibility incidents (silence, clipping) usually stem from format tiers not being packaged per platform — this lands in the **asset layer** of piece 20's compatibility attribution judgment.

### 3.2 Triggering Model: Who Decides When It Sounds

The criterion for audio triggering: **sound effects for local events are client-autonomous, while audio that follows global state is server-driven**.

- **Client-autonomous**: button clicks, skill hits, UI feedback — local events sound locally with zero network dependency (the principle of piece 19's three-state interaction: local immediate feedback does not enter the network).
- **Server-driven**: theme-music switching at event start/end, combat-phase BGM (Boss phase switching), server-wide event alarms — for these, the **authority over timing lives on the server** (piece 04 on state sync), and the client only looks up the table and plays after receiving the state.

The engineering point for server-driven audio: **what is pushed down is state and events, not audio commands**. The server says "the event has started" (event push, piece 11's push system), and the client decides for itself what to play — audio presentation is decoupled from the network, and on a weak network switching the song late is preferable to letting the BGM state machine fall out of sync with the server state machine and reset. Edge case: judging audio in rhythm gameplay (the judgement sound in a rhythm game) looks like presentation but actually participates in the gameplay judgement — same discipline as piece 19's "animation frame events do not carry logic": the judgement lives in the logic layer, and the audio is merely the echo of presentation.

### 3.3 Mix Groups and Player Settings

The mix is grouped by channel (BGM/SFX/voice/ambient), and player settings land on channel volumes — the server's touchpoint here is **settings sync**: volume preferences belong to player data (piece 08 on the game data model) and follow the account across devices. Voice chat in rooms (playing together) is a separate transport topic (real-time voice forwarding, mixing, cost), oriented server-side, and is a different line from this chapter's "audio asset pipeline" — do not conflate the two.

---

## 4. The Cost Interface of Cross-Functional Collaboration

### 4.1 The Asymmetry of Change Costs

The cost distribution of a spec change (dropping the texture cap from 1024 to 512, switching audio from mp3 to opus) is extremely asymmetric: **the side that requests the change edits one line of documentation, while the side that executes re-exports every affected asset, re-runs the audit, and re-issues the asset patch**. So a spec change goes through a review at the same level as an API change: an impact-scope list (which assets are affected) + a transition strategy (to which version old assets remain compatible) + a timeline. The criterion: **changing a spec is an interface change, not a suggestion**.

### 4.2 The Troubleshooting Path When Assets Misbehave

The three layers of attribution for asset problems (an extension of piece 20's compatibility attribution judgment):

| Layer | Symptom | Localization Method |
|----|------|---------|
| The asset itself | A single asset displays incorrectly (texture corruption, silent audio) | Check the export's spec against the source file and re-verify with the audit tool |
| The pipeline layer | A batch of assets fails at once (all color-shifted, all losing a channel) | Check the most recent changes to import parameters and conversion config — pipeline config must also be under version control |
| The reference layer | The asset exists but has no effect (skin not applied, BGM not switching) | Trace the reference chain and trigger conditions — commonly the server state never arrived, so return to protocol and state troubleshooting |

The third layer is the one backend engineers most often inherit: **a significant share of "the asset had no effect" finally traces back to server-side state and judgement** (the event state was never pushed, the permission field was never delivered). During attribution, first confirm the correctness of the server data, then have the client look at the presentation layer.

### 4.3 Freeze Points and the Acceptance Cadence

Before version freeze (piece 20's packaging gate) there must be an **asset freeze point**: the asset patch cut-off, a fully green audit, and a device-matrix spot check passed. The asset freeze arriving later than the code freeze is the norm, but it must be **managed explicitly** rather than allowed to happen by default — assets that arrive after the freeze point go into the next asset patch train and do not block the version. Audio acceptance must be heard on real devices (compression artifacts and latency are inaudible on desktop) and go into the device-matrix spot-check list.

---

## 5. Code Example

The code block below is a minimal demonstration implementation of this chapter's asset-audit gate (not taken from a real project): the checking skeleton for the three classes of rules — spec/naming/orphan. Code blocks within a subsection can be merged and compiled with `go vet` and `go build`, and are bound by the repo-wide code-block regression tests.

**Asset audit rule checking** — the minimal skeleton of the gate layer from section 2.4 (a real implementation wires in the engine's export manifest and the reference graph):

```go
// Asset 资源清单里的一条（导出管线产出，含运行时规格与引用）
type Asset struct {
    Name     string   // 如 tex_ui_bag_coin
    Kind     string   // tex / mdl / audio
    MaxDim   int      // 贴图最大边（运行时规格）
    RefCount int      // 被引用次数（0 = 孤儿）
}

// Audit 单条资源的审计结果
type Audit struct {
    Asset string
    Pass  bool
    Reason string
}

// CheckAsset 按门禁规则检查：命名规范 + 尺寸预算 + 孤儿判定
// 任一规则不过 = 拒绝进包（第 2.4 节：门禁在 CI，不在 wiki）
func CheckAsset(a Asset) Audit {
    audit := Audit{Asset: a.Name, Pass: true}
    if !strings.HasPrefix(a.Name, a.Kind+"_") {
        audit.Pass, audit.Reason = false, "命名不符: 缺类型前缀 " + a.Kind + "_"
        return audit
    }
    if a.MaxDim > 2048 {
        audit.Pass, audit.Reason = false, "超预算: 贴图最大边超 2048"
        return audit
    }
    if a.RefCount == 0 {
        audit.Pass, audit.Reason = false, "孤儿资源: 无引用却进包"
    }
    return audit
}
```

---

## 6. Practical Advice

Action checklists by role:

- **Server development**: when building the version-check/asset-patch interface, treat "package version + asset version" as two independent coordinates (piece 17 on multi-artifact versioning); when troubleshooting "the asset had no effect," verify the server state data first (the reference layer of section 4.2).
- **When wiring in the asset pipeline**: turn the four classes of audit rules (spec/naming/reference/duplicate) into CI gates and refuse over-limit assets into the package; put the pipeline config itself under version control — the answer to "why did this whole batch come out color-shifted" is often in the most recent change to the import parameters.
- **When participating in spec review**: treat a spec change as an API change — demand the impact-scope list, the transition strategy, and the timeline; conversely, when retiring a server-side field, use the same three steps as asset deprecation (stop new references, observe dependencies, then remove).
- **When communicating schedules**: write the asset freeze point explicitly into the version plan; late-arriving assets go to the next patch train and do not block the version.

---

## 7. Summary of Common Pitfalls

| Pitfall | Explanation | Mitigation |
|------|------|------|
| Keeping only exports, no source files | Assets cannot be rebuilt; troubleshooting has no basis | Source files in LFS, exports generated by the pipeline |
| Version suffixes `_new`/`_final` | Naming runs out of control, searchability breaks down | Type prefix + module path, machine-checked |
| Building the spec first, testing later | Ends up cutting art to hold the frame rate | Back-derive the spec from the budget sheet, audit up front |
| Audits living only in the wiki | Over-limit assets ship anyway | Rules in CI, refused into the package |
| Orphan assets never cleaned | Package size quietly balloons | Reference-rule audit; unreferenced assets do not enter the package |
| Server pushing audio commands | Presentation coupled to the network, desync on weak networks | Push state and events; the client looks up the table and plays |
| Treating a spec change as a suggestion | The executor re-exports the whole asset set | Spec changes go through API-level review |
| Asset freeze happening by default | Assets mix into the version after the freeze | An explicit freeze point; late arrivals go to a patch |

---

## 8. Summary

This chapter casts the asset pipeline as a three-party contract: art/audio produce according to specs and naming, the pipeline audits and transforms according to rules, and the server manages version coordinates, state authority, and deprecation strategy. The quality of cross-functional collaboration does not depend on the frequency of communication but on **whether the interfaces are defined and machine-checked** — specs are the performance contract (the prerequisite of piece 19's budget sheet), the audit is the quality gate (the asset edition of piece 20's gate discipline), and version coordinates are the release contract (the asset side of piece 17's multi-artifact versioning).

With this, the three "expansion" pieces are closed: piece 19 records the client cost model, piece 20 organizes the quality gates, and piece 21 maps the asset supply line — added to the existing 18 pieces, the themed notes extend from the backend home turf into a complete frontend and collaboration track. For the plan and next directions, see the "Chapter Expansion Plan" page.

---

## 9. Practical Case: Hunting Down 42MB That Should Not Have Shipped

> This case is a demonstration example (not taken from a real project); the numbers are rounded and simplified, focusing on the troubleshooting approach and the backfill logic.

**Background and Symptom**

Mid-season, the asset patch package ballooned from **180**MB to **222**MB, a **42**MB (**23%**) increase that did not fall back even as seasonal content was taken offline. Package-size monitoring did not alarm — it watches the main package; on the packaging checklist, "audit passed" stayed green all the way; on the player side the cost was longer download and decompression times and rising storage pressure on low-end devices. The pipeline engineer ran a re-check with the audit tool from section 2.4, and only then did the problem surface: not a single byte of those 42MB belonged to a legitimate new asset of this version.

### Step One: Symptom and Metric Alignment

Three metrics produced three answers at the same moment:

- **Packaging checklist**: "audit passed" — this box was manually ticked by the release engineer, based on a manual list;
- **Packaging manifest**: the packaging tool exported **4310** entries in total, and you cannot tell by eye which ones should not be there;
- **Reference-graph re-check**: running the reference and duplicate rules with the audit tool from section 2.4, the violating volume is **42**MB.

Between the checklist's "pass" and the tool output, the metric gap = **42**MB — align on evidence grade before arguing attribution: the denominator for this case is "all asset entries in the packaging manifest," not "new assets of this version," and only then does the 42MB have somewhere to land.

### Step Two: Layered Attribution

Walk the **3** layers of attribution from section 4.2 one by one (the asset itself / the pipeline layer / the reference layer):

```text
资源本体   42MB 违规资源的规格、命名全部合规——贴图尺寸与命名挑不出错，不是超限问题
管线层     打包清单 4310 条，引用图命中 4102 条，差 208 条无人引用（孤儿）；重复组 37 个从未被计数
引用层     皮肤与活动迭代下线只删了引用、没走 2.3 节三步——RefCount 归零的资源仍留在打包清单
```

**Ledger convergence**: **4310** − **4102** = **208** orphans (**29**MB), plus **37** duplicate groups × **0.35**MB ≈ **13**MB; 29 + 13 = **42**MB. Cut once more by origin: retired old skins **38**MB + expired event icons **4**MB = **42**MB — two cuts yield the same 42MB, all of it leftover from past iterations, not a single byte belonging to this version's new assets. The cause of the orphans is in the reference layer (deprecation deleted only the references); the cause of the duplicates is in the pipeline layer (multiple copies of the same icon with nobody responsible for cleaning up); and the reason both made it through together is in the audit (the rules had no enforcer).

### Step Three: Root Cause

1. **Direct cause**: asset deprecation deleted only the references and did not follow the three deprecation steps of section 2.3 (stop new references → observe dependencies → remove) — deleting references clears only the relationship, not the file; RefCount going to zero says only "nobody references it," not "the file has been removed," and the orphans settle there.
2. **Mechanistic cause**: the audit rules of section 2.4 define **4** classes (spec, naming, reference, duplicate), but two enforcement gaps hollowed them out — first, the four classes of rules lived only in the wiki and were not run by the packaging pipeline (the 4th and 5th of the **8** rows in the pitfalls table — "audits living only in the wiki" and "orphan assets never cleaned" — are precisely the two-row portrait of this case); second, the gate skeleton of section 5 implemented only **3** rules (naming, size, orphan), with no corresponding implementation for the duplicate rule, so even wired into CI it could not stop those 13MB.
3. **Deep cause**: the line from section 1 — "the pipeline is a contract, not a flowchart" — never landed on a denominator. In this project the asset patch package has no size red line, and the package-size threshold in piece 20's section 6 specifies only the main package / the whole package, so nobody set a rule for the patch package's denominator. Deprecation was also not managed under the change view of section 4.1 — no impact scope, no transition, no timeline.

### Step Four: Remediation and Backfill

1. **Stop the bleeding, purge the store**: after verifying each entry against the reference graph and cleaning up, orphans **208** → **0** and duplicates **37** groups → **0** groups, patch package **222** → **180**MB (−**42**MB, back to baseline).
2. **Rules into CI**: the audit switched from manual ticking to tool output, the rules went from **3** to **4** (implementing the duplicate rule), and any single failure refuses the asset into the package — the skeleton of section 5 formally becomes the gate, aligned with piece 20's discipline that "thresholds live in CI, not in the wiki."
3. **Fill in the deprecation process**: asset deprecation must follow the three steps (stop new references → observe dependencies for **7** days → remove), enter the asset-change review sheet, and be filled in on the same sheet as the impact scope/transition/timeline of section 4.1.
4. **Set a red line**: the asset patch package red line of **200**MB enters the packaging CI and a breach cuts the build (set between the 180 baseline and the 222 incident point); orphan counts and duplicate-group counts enter the monthly quality report and are reconciled together with frame rate and package size.

**Re-check**: the next patch train added **2**MB for a package size of **182**MB, orphans stayed at **0**, and all four audit rules were green in CI — package-size change now has, for the first time, a reconcilable denominator.

**Backfill checklist**:

| Backfill Item | Landing Point | Back-link |
|--------|------|------|
| The four classes of audit rules into CI; the duplicate rule implemented | Packaging pipeline | Piece 21 section 2.4 / section 5 |
| The three deprecation steps into change review | Asset management process | Piece 21 section 2.3 / section 4.1 |
| The patch package-size red line into the threshold table | Quality thresholds | Piece 20 section 6, the package-size row |
| Orphan and duplicate metrics into the monthly quality report | Quality reconciliation | Piece 19's budget / piece 20's acceptance |

### Three Lessons from the Case

1. **The unit of an audit is "rules in CI," not "a checklist in the wiki"** — a manually ticked "pass" and a tool-output "pass" are two different evidence grades, and mixing them on one checklist is exactly what produced the 42MB metric gap of this case (the asset edition of piece 20's gate discipline).
2. **Deprecation is a change just like shipping something new** — deleting references clears only the relationship, not the file; deprecation without the three-step process means every iteration leaves a debt in the package (the three steps of section 2.3, the change view of section 4.1).
3. **Red lines must cover every externally-facing denominator** — the main package has a red line, the patch package does not, and monitoring and thresholds are collectively blind to the patch package; what is missing is not a monitoring tool but someone setting a rule for that denominator (the red line in piece 20's section 6 specifies only the main package / the whole package).

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [20-game-testing](20-game-testing.md)
- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [04-coverage-diff](/research/04-coverage-diff.md)
