# ModuleList

档案里的模块列表：负责排序、插入、删除和拖拽，并按 `kind` 渲染对应的模块。

- 数据是 `ArchiveModule[]`（id、kind、title、data），受控或非受控都可以。
- 插入有两个入口：底部的“插入模块”按钮，或在列表空白处右键。模块头部右键会插在该模块下方。
- 列表为空时显示“模块不是必填项”，不出现任何催促。
- `footer` 用来放额外按钮，例如“从预设导入”。
- 静态方法：`ModuleList.create(kind)` 新建一个模块；`toPreset(modules)` 剥掉内容只留结构；`fromPreset(preset)` 生成带新 id 的模块，用于导入。
