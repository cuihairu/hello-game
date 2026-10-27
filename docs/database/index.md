# Data Modeling and Databases

## Category

Overview of the database tree. Coverage: classification and modeling (01), storage selection (02), transactions and sharding (03), synchronization and archival (04), plus the cache subtree (cache/01-04).

## Definition

Data problems in a game project have never been just "MySQL or NoSQL". What actually determines system stability is how state gets partitioned, who is the authoritative data source, which data must be recoverable and auditable, which data is merely a high-performance replica, and whether, once the project moves into long-term operations, server merges and asset complexity, this data structure can still carry evolution.

Many teams early on treat the database as nothing more than a persistence foundation, only to discover that problems erupt all at once later on:

- High-real-time state and long-term assets mixed together
- Query convenience and authoritative consistency pulling against each other
- Once data is written wrongly, there is no handle for rollback and audit
- During merges, migrations, archival and compensation, there is no single source of truth to find

What this chapter discusses is not a database product feature list, but data as the core object of system boundaries, and how it should be classified, modeled, stored, migrated and recovered.

## Related

Chain of relations: state classification (01) → storage selection (02) → transactions and consistency (03) → lifecycle governance (04); read acceleration and distributed coordination continue into the cache subtree (01-04). Upstream: the settlement authority of the server tree (the gameplay side of the authority boundary); downstream: BI and audit of the operation tree (operation/bi).

## Reference

The node list is in the next section; for the same-topic comparison on the specialized-notes side, see Specialized notes 08 "Data Storage and Middleware".

## Articles in this chapter

- [Game Data Classification and Modeling](./01.md): first split apart the data types common in games, to understand why different kinds of state cannot be kept in the same model long-term.
- [Relational and Non-relational Databases](./02.md): discuss what problems each storage model is genuinely suited to carry, rather than choosing by popularity.
- [Transactions, Consistency and Sharding](./03.md): put asset consistency, transaction boundaries and scaling strategy back onto the same engineering ledger for discussion.
- [Data Synchronization, Hot/Cold Tiering and Archival](./04.md): explain why data lifecycle management directly affects cost, recovery capability and long-term operational elasticity.

## References

- [Wikipedia · CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem)
- [Wikipedia · Database](https://en.wikipedia.org/wiki/Database)

<!-- BACKLINKS-AUTO -->
## Related pages

- [05](/client/web/05.md)
