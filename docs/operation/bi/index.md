# Operations, Monetization, and Data Analysis

## Category

Overview of the operation / bi subtree. Covers: operations and monetization fundamentals (01), event tracking, BI, and analysis systems (02), economy, balance, and risk control analysis (03), reach systems and external capability integration (04), and AI in operations, analysis, and risk control (05).

## Definition

Many teams split "operations" and "engineering" into two lines, as if once the gameplay is live, operations just configures campaigns in a backend, watches reports, and sends pushes. Anyone who has actually run a long-running project knows this split breaks down quickly. Because as soon as the product starts chasing retention, paying, recall, lifecycle management, and risk control, operations itself becomes a control plane that continuously drives system change.

This chapter is not about marketing-level spend theory; it is about how a game project builds an operational system that can run for the long term internally. The core questions include:

- How does the team string campaigns, monetization, user reach, and data analysis into a closed loop
- Why metrics, event tracking, and experiments cannot stop at "looking at numbers" and must be able to land as actions
- How economy observation, balance adjustment, and risk control analysis can share the same factual foundation

The relationship between the operations system and the business system is similar to a control plane and a data plane. Players in the foreground experience levels, combat, progression, and socializing; the operations team then adjusts the pace through campaigns, pricing, segmentation, reach, experiments, and analysis. Once the control plane is designed messily, the product shows a few common symptoms: lots of campaigns but invalid retrospectives, lots of reports but no decision basis, lots of reach but user perception getting worse.

So when reading this chapter, always hold on to three things:

- First confirm whether the data definitions are stable, to avoid building actions on wrong statistics
- Then check whether operational actions have a standard chain, to avoid every adjustment relying on manual scripts
- Finally check whether these actions can be audited, rolled back, and retrospected, to avoid the operating system itself becoming a source of incidents

## Related

Relationship chain: operations fundamentals (01) → data definitions (02) → three kinds of analysis (03) → reach (04) → AI boundary (05). Upstream: production/05 (configuration pipeline); downstream: economy tree (planned migration), numerical tree, tree root [operation overview](../index.md).

## Reference

See the next section for the node list.

## Articles in This Chapter

- [Operations and Monetization Fundamentals](./01.md): discusses why long-running products need to treat campaigns, pricing, version cadence, and user management as a system engineering problem rather than ad-hoc actions scattered across multiple backends.
- [Event Tracking, BI, and Analysis Systems](./02.md): discusses how the event tracking system, metric definitions, data warehouse, and analysis platform support genuinely reliable business judgment.
- [Economy, Balance, and Risk Control Analysis](./03.md): discusses why economy observation, numerical balance, and risk identification cannot be siloed from each other, and what underlying facts they share.
- [Reach Systems and External Capability Integration](./04.md): discusses the boundaries, costs, and governance issues of message reach, push, advertising, CRM, and integrating external marketing capabilities.
- [AI in Operations, Analysis, and Risk Control](./05.md): discusses where AI fits as an aid, and where explicit rules, human review, and explainable boundaries must be preserved.

## References

- [Wikipedia · Business intelligence](https://en.wikipedia.org/wiki/Business_intelligence)
- [Wikipedia · Software metric](https://en.wikipedia.org/wiki/Software_metric)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01](/numerical/01.md)
- [06](/numerical/06.md)
- [08](/numerical/08.md)
- [index](/operation/index.md)
