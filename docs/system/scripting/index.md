# Scripting, Hot Updates and Logic Extension

## Category

system / scripting and hot-update subtree overview. Coverage: scripting-layer positioning (01), host VM integration (02), config-driven vs script-driven (03), the hot-update system (04).

## Definition

Once a project enters long-term operations, the most expensive problems are usually no longer "we can't build this feature" but "we know exactly where the problem is, yet we can't change it, can't ship the fix, and can't contain the damage." The scripting layer, hot updates, config-driven design and the host runtime keep getting argued about not because they sound flexible, but because they collectively determine a project's iteration speed, fix window and incident radius in the late stages.

When many teams first bring this capability in, they imagine "more flexibility" and "faster fixes." But the moment it really goes live, they immediately run into the other side of the coin:

- Which logic is suitable for scripting, and which logic becomes hard to govern once scripted
- What config and script are each good at expressing, and what they are not good at expressing
- How to draw the boundary between the VM and the host engine, and how to backstop performance and debugging
- Whether hot updates actually shorten the fix chain, or widen the entry points for online incidents

This chapter is not pitching a particular technical solution; it treats "logic extension capability" as a formal runtime and release mechanism. The point is not whether it can be done, but where it will push complexity, which benefits are real benefits, and which flexibility is bought at the price of governance cost.

## Related

Relationship chain: scripting-layer positioning (01) → host integration (02) → the driver boundary (03) → the hot-update system (04). Upstream: the runtime subtree (host runtime); downstream: production/03 (gray release and rollback), production/05 (config pipeline), the tree root [System Overview](../index.md).

## Reference

See the node list in the next section.

## Articles in This Chapter

- [Positioning the Scripting Layer and Choosing a Language](./01.md): First answers what the scripting layer should actually be responsible for, so "flexible" does not turn into "no boundaries."
- [Host Runtime and Script VM Integration](./02.md): Discusses why binding, lifecycle, debugging and performance problems all show up together once a script VM is wired into the host.
- [Config-Driven vs Script-Driven](./03.md): Explains what kinds of change config and script are each suited to carry, and why the two cannot substitute for one another.
- [The Hot-Update System](./04.md): Puts patches, signing, gray release, compatibility, rollback and incident containment back on the same release chain for discussion.

## Further Reading

- [Lua Official Documentation](https://www.lua.org/docs.html)
- [Wikipedia · Game design](https://en.wikipedia.org/wiki/Game_design)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [10](/glossary/10.md)
- [genre-coverage](/system/genre-coverage.md)
- [index](/system/index.md)
