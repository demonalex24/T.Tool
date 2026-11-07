# ContextMenu

右键菜单：项目树、模块区和画布里所有“新建”类操作的入口。

- `items` 里可以放菜单项（label、icon、shortcut、hint、danger、disabled、onSelect）、`{ divider: true }`、`{ heading }`。
- 传 `open`、`x`、`y`、`onClose`；菜单会自动避开屏幕边缘。Esc、点外面、窗口失焦都会关闭。↑↓ 移动焦点。
- 危险项放在最后，前面加分隔线。画布里的移除要写清范围，例如“从画布移除 · 不删档案”。
- `inline` 只用于文档展示。
