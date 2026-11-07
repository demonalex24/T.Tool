# SnapshotHistory

历史快照面板：画布保存点的时间线，每一条都可以“回退到此”。

- 传 `snapshots`（label、time、auto，以及 graph 或 counts）、`current`、`onRestore`。在 RelationCanvas 里点“历史快照”会从右侧打开。
- 每条显示名称、时间、手动还是自动、方块数和关系数。顶部固定一条“当前画布”，有未存的改动时会注明。
- 回退前会先自动存一条“回退前自动保存”，所以回退本身也能撤回。这是它替代“重做”的原因。
