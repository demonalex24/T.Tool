# StatusBar

底部状态栏：左边是上下文信息，中间是操作反馈，右边是操作提示。

- `items` 是一组短信息（如画布名、方块数、关系数），中间自动加分隔线。
- `message` 的 `tone` 可以是 info、warn、danger，会通过读屏的 live region 播报。提醒类（例如重复连线）用 warn，并且必须给出下一步怎么做。
- 反馈消息几秒后自动消失；同类反馈不要再弹 toast。
