# 配置表、数据驱动与研发协作

## Category

production / config 子树总览。覆盖：驱动边界（01）、拆表协作（02）、校验导出（03）、工作流防呆（04）。

## Definition

这组附录把配置表和研发管线单独展开。很多项目并不是输在核心技术不会做，而是输在配置流、校验流和协作流太脆弱。

这组记录涉及的核心问题：

- 配置从编辑到生效的完整链路
- 表结构对协作成本的影响
- 防呆与回滚能力的落点

## Related

关系链：进表边界（01）→ 拆表协作（02）→ 校验与导出（03）→ 防呆与回滚（04）。上游：production/05（管线总览）；下游：numerical 树（数值配置的消费侧）、operation 树（配置监控，observability）。

## Reference

节点清单见下节。

## 本章文章

- [配置表驱动开发](./01.md)：围绕“配置表驱动开发”补足 配置管线附录 里的关键判断、成本与误区。
- [表结构设计与拆分](./02.md)：围绕“表结构设计与拆分”补足 配置管线附录 里的关键判断、成本与误区。
- [校验、导出与代码生成](./03.md)：围绕“校验、导出与代码生成”补足 配置管线附录 里的关键判断、成本与误区。
- [工作流、事故防呆与协作](./04.md)：围绕“工作流、事故防呆与协作”补足 配置管线附录 里的关键判断、成本与误区。

## 参考资料

- [Wikipedia · Software configuration management](https://en.wikipedia.org/wiki/Software_configuration_management)
- [Wikipedia · Software deployment](https://en.wikipedia.org/wiki/Software_deployment)

<!-- BACKLINKS-AUTO -->
## 相关页面

- [01](01.md)
- [02](02.md)
- [03](03.md)
- [04](04.md)
- [index](/production/index.md)
