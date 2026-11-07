import type * as React from 'react';

/* ---------- 基础 ---------- */
export type IconName = 'plus' | 'close' | 'check' | 'chevron-right' | 'chevron-down' | 'arrow-up' | 'arrow-down' | 'grip' | 'more' | 'trash' | 'undo' | 'history' | 'snapshot' | 'connect' | 'note' | 'paperclip' | 'fit' | 'zoom-in' | 'zoom-out' | 'save' | 'export' | 'import' | 'canvas' | 'preset' | 'folder' | 'archive' | 'tag' | 'edit' | 'warn' | 'info' | 'jump' | 'search' | 'child' | 'sibling' | 'swap' | 'tree' | 'mod-text' | 'mod-number' | 'mod-axis' | 'mod-radar' | 'mod-bool';
export interface IconProps { name: IconName; size?: number; strokeWidth?: number; title?: string; className?: string; style?: React.CSSProperties }
export declare function Icon(props: IconProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = 苔绿主操作（每个区域最多一个）；secondary 默认；quiet 无底；danger 实心红，只用于确认删除 */
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  /** quiet 按钮悬停时变红，用于列表里的“删除” */
  tone?: 'danger';
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** 必填：图标下方/右侧一直显示的文字 */
  label: string;
  /** stack = 图标在上文字在下（工具栏）；inline = 图标在左文字在右（模块头、面板头） */
  layout?: 'stack' | 'inline';
  /** 传入即成为开关按钮（aria-pressed） */
  active?: boolean;
  tone?: 'danger';
  /** 只进悬停提示，如 "Ctrl+Z" */
  shortcut?: string;
}
export declare function IconButton(props: IconButtonProps): React.ReactElement;

export interface ToolbarProps { label?: string; className?: string; style?: React.CSSProperties; children?: React.ReactNode }
export declare function Toolbar(props: ToolbarProps): React.ReactElement;
export declare namespace Toolbar { function Divider(): React.ReactElement; function Spacer(): React.ReactElement; }

/* ---------- 输入 ---------- */
export interface TextFieldProps {
  value?: string; defaultValue?: string; onChange?: (value: string) => void;
  label?: string; ariaLabel?: string; placeholder?: string; hint?: string;
  multiline?: boolean; rows?: number; autoGrow?: boolean;
  /** prose = 宋体正文；mono = 等宽；bare = 无边框 */
  variant?: 'prose' | 'mono' | 'bare';
  type?: string; list?: string; disabled?: boolean; className?: string; style?: React.CSSProperties;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface TagInputProps { value?: string[]; defaultValue?: string[]; onChange?: (tags: string[]) => void; placeholder?: string; ariaLabel?: string; className?: string }
export declare function TagInput(props: TagInputProps): React.ReactElement;

/* ---------- 导航 ---------- */
export interface PanelAction { icon: IconName; label: string; onClick?: () => void }
export interface PanelSectionProps { title: string; count?: number; actions?: PanelAction[]; defaultOpen?: boolean; grow?: boolean; className?: string; style?: React.CSSProperties; children?: React.ReactNode }
export declare function PanelSection(props: PanelSectionProps): React.ReactElement;

/** 项目树节点 = 一个档案。type 是自由文本，没有系统枚举。 */
export interface TreeNode { id: string; name: string; type?: string; children?: TreeNode[] }
export type DropPosition = 'before' | 'after' | 'inside';
export interface ProjectTreeProps {
  nodes?: TreeNode[]; defaultNodes?: TreeNode[]; onChange?: (nodes: TreeNode[]) => void;
  selectedId?: string | null; defaultSelectedId?: string | null; onSelect?: (node: TreeNode) => void;
  defaultExpanded?: string[];
  onMove?: (dragId: string, targetId: string, position: DropPosition) => void;
  onCreate?: (node: TreeNode, target: TreeNode | null, asChild: boolean) => void;
  onDelete?: (node: TreeNode) => void;
  /** 传入后，删除前先交给你弹确认框，确认时调用 doDelete() */
  onRequestDelete?: (node: TreeNode, doDelete: () => void) => void;
  /** 接管右键菜单；或传 contextMenu={false} 关闭内置菜单 */
  onContextMenu?: (event: React.MouseEvent, node: TreeNode | null) => void;
  contextMenu?: boolean; label?: string; className?: string; style?: React.CSSProperties;
}
export declare function ProjectTree(props: ProjectTreeProps): React.ReactElement;
export declare namespace ProjectTree {
  const utils: {
    find(nodes: TreeNode[], id: string): TreeNode[] | null;
    move(nodes: TreeNode[], dragId: string, targetId: string, position: DropPosition): TreeNode[];
    insert(nodes: TreeNode[], targetId: string, position: DropPosition, node: TreeNode): TreeNode[];
    remove(nodes: TreeNode[], id: string): { nodes: TreeNode[]; removed: TreeNode | null };
    update(nodes: TreeNode[], id: string, fn: (n: TreeNode) => TreeNode): TreeNode[];
    count(node: TreeNode): number;
  };
}

export interface DocTab { id: string; title: string; type?: string; dirty?: boolean }
export interface DocTabsProps {
  tabs?: DocTab[]; defaultTabs?: DocTab[]; onTabsChange?: (tabs: DocTab[]) => void;
  activeId?: string | null; defaultActiveId?: string | null; onActiveChange?: (id: string | null) => void;
  onSelect?: (tab: DocTab) => void; onClose?: (tab: DocTab) => void; onAdd?: () => void; className?: string; style?: React.CSSProperties;
}
export declare function DocTabs(props: DocTabsProps): React.ReactElement;

export type MenuItem =
  | { label: string; icon?: IconName; shortcut?: string; hint?: string; danger?: boolean; disabled?: boolean; onSelect?: () => void }
  | { divider: true } | { heading: string };
export interface ContextMenuProps { items: MenuItem[]; open?: boolean; x?: number; y?: number; onClose?: () => void; inline?: boolean; label?: string; className?: string; style?: React.CSSProperties }
export declare function ContextMenu(props: ContextMenuProps): React.ReactElement | null;

/* ---------- 积木模块 ---------- */
export type ModuleKind = 'text' | 'number' | 'axis' | 'radar' | 'bool';
export interface TextData { text: string }
export interface NumberData { rows: { label: string; value: string; unit?: string }[] }
/** value: -100（完全偏左）… 0（居中）… 100（完全偏右） */
export interface AxisData { rows: { left: string; right: string; value: number }[] }
export interface RadarData { max: number; rows: { name: string; value: number }[] }
/** value: true = 是，false = 否，null = 未设定 */
export interface BoolData { rows: { statement: string; value: boolean | null; yes: string; no: string }[] }
export interface ModuleBodyProps<D> { data?: D; defaultData?: D; onChange?: (data: D) => void }

export interface ModuleCardProps {
  kind: ModuleKind; title?: string; defaultTitle?: string; onTitleChange?: (title: string) => void;
  canMoveUp?: boolean; canMoveDown?: boolean; onMoveUp?: () => void; onMoveDown?: () => void; onDelete?: () => void;
  onDragStart?: React.DragEventHandler; onDragEnd?: React.DragEventHandler; onDragOver?: React.DragEventHandler; onDrop?: React.DragEventHandler;
  dragging?: boolean; drop?: 'before' | 'after' | null; onHeadContextMenu?: React.MouseEventHandler;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
}
export declare function ModuleCard(props: ModuleCardProps): React.ReactElement;
export declare function TextModule(props: ModuleBodyProps<TextData> & { placeholder?: string; rows?: number; ariaLabel?: string }): React.ReactElement;
export declare function NumberModule(props: ModuleBodyProps<NumberData>): React.ReactElement;
export declare function AxisModule(props: ModuleBodyProps<AxisData>): React.ReactElement;
export declare function RadarModule(props: ModuleBodyProps<RadarData>): React.ReactElement;
export declare function BooleanModule(props: ModuleBodyProps<BoolData>): React.ReactElement;

export interface ArchiveModule { id: string; kind: ModuleKind; title: string; data: TextData | NumberData | AxisData | RadarData | BoolData }
export interface PresetModule { kind: ModuleKind; title: string; data: ArchiveModule['data'] }
export interface ModuleListProps {
  modules?: ArchiveModule[]; defaultModules?: ArchiveModule[]; onChange?: (modules: ArchiveModule[]) => void;
  showInsert?: boolean; footer?: React.ReactNode; className?: string; style?: React.CSSProperties;
}
export declare function ModuleList(props: ModuleListProps): React.ReactElement;
export declare namespace ModuleList {
  const kinds: Record<ModuleKind, { icon: IconName; name: string; desc: string; make(): ArchiveModule['data']; strip(data: ArchiveModule['data']): ArchiveModule['data'] }>;
  function create(kind: ModuleKind, title?: string): ArchiveModule;
  /** 去掉填写的文字和数值，只留结构 */
  function toPreset(modules: ArchiveModule[]): PresetModule[];
  /** 生成带新 id 的模块，可直接追加到档案 */
  function fromPreset(preset: Preset): ArchiveModule[];
}

/* ---------- 档案 ---------- */
export interface ArchiveHeaderValue { name: string; type: string; tags: string[] }
export interface ArchiveHeaderProps { value?: ArchiveHeaderValue; defaultValue?: ArchiveHeaderValue; onChange?: (v: ArchiveHeaderValue) => void; id?: string; typeSuggestions?: string[]; className?: string; style?: React.CSSProperties }
export declare function ArchiveHeader(props: ArchiveHeaderProps): React.ReactElement;

export interface CanvasRef { id: string; name: string; count?: number }
export interface ReferenceListProps { refs: CanvasRef[]; onJump?: (ref: CanvasRef) => void; className?: string; style?: React.CSSProperties }
export declare function ReferenceList(props: ReferenceListProps): React.ReactElement;

export interface Preset { id: string; name: string; modules: PresetModule[]; updated?: number }
export interface PresetLibraryProps {
  presets?: Preset[]; defaultPresets?: Preset[]; onChange?: (presets: Preset[]) => void;
  /** 当前档案的模块；传入后才显示“将当前模块存为预设” */
  currentModules?: ArchiveModule[];
  onImport?: (preset: Preset, modules: ArchiveModule[]) => void;
  onSave?: (preset: Preset) => void; onDelete?: (preset: Preset) => void; onClose?: () => void;
  title?: string; className?: string; style?: React.CSSProperties;
}
export declare function PresetLibrary(props: PresetLibraryProps): React.ReactElement;

/* ---------- 关系画布 ---------- */
export interface CanvasNodeData {
  id: string; kind: 'ref' | 'note'; title: string; x: number; y: number;
  /** ref 才有：引用的档案。title 是画布里的显示名，改它不会改档案 */
  archiveId?: string; archive?: string; type?: string;
  /** 画布内的从属关系（新建子级），双击父方块收起/展开 */
  parent?: string; collapsed?: boolean;
}
export interface RelationEdge { id: string; from: string; to: string; label: string }
export interface CanvasGraph { nodes: CanvasNodeData[]; edges: RelationEdge[] }
export interface CanvasSnapshot { id?: string; label: string; time: number; auto?: boolean; graph?: CanvasGraph; counts?: { nodes: number; edges: number } }

export interface CanvasNodeProps {
  id?: string; kind: 'ref' | 'note'; title?: string; subtitle?: string; childCount?: number; collapsed?: boolean;
  selected?: boolean; linkSource?: boolean; linkTarget?: boolean; dragging?: boolean; showHandle?: boolean;
  /** 在画布外静态展示时用 */
  static?: boolean; editing?: boolean; onEditCommit?: (value: string) => void; onEditCancel?: () => void;
  onClick?: React.MouseEventHandler; onDoubleClick?: React.MouseEventHandler; className?: string; style?: React.CSSProperties;
}
export declare function CanvasNode(props: CanvasNodeProps): React.ReactElement;
export declare namespace CanvasNode { const size: { ref: { w: number; h: number }; note: { w: number; h: number } }; }

export interface RelationCanvasProps {
  name?: string; defaultGraph?: CanvasGraph; onChange?: (graph: CanvasGraph) => void;
  /** 可引用的档案（来自项目树） */
  archives?: { id: string; name: string; type?: string }[];
  defaultSnapshots?: CanvasSnapshot[]; defaultShowHistory?: boolean;
  height?: number | string;
  /** 嵌在长页面里时设为 true：先点一下画布，滚轮才接管 */
  wheelRequiresFocus?: boolean; className?: string; style?: React.CSSProperties;
}
export declare function RelationCanvas(props: RelationCanvasProps): React.ReactElement;

export interface SnapshotHistoryProps { snapshots: CanvasSnapshot[]; current?: { nodes: number; edges: number; dirty?: boolean }; onRestore?: (s: CanvasSnapshot) => void; onClose?: () => void; embedded?: boolean; className?: string; style?: React.CSSProperties }
export declare function SnapshotHistory(props: SnapshotHistoryProps): React.ReactElement;

/* ---------- 反馈 ---------- */
export interface DialogProps { title: string; open?: boolean; onClose?: () => void; footer?: React.ReactNode; inline?: boolean; width?: number; role?: 'dialog' | 'alertdialog'; className?: string; children?: React.ReactNode }
export declare function Dialog(props: DialogProps): React.ReactElement | null;

export interface StatusBarProps { items?: React.ReactNode[]; message?: { text: string; tone?: 'info' | 'warn' | 'danger' } | null; right?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function StatusBar(props: StatusBarProps): React.ReactElement;

declare global {
  interface Window {
    TTool: {
      Icon: typeof Icon; Button: typeof Button; IconButton: typeof IconButton; Toolbar: typeof Toolbar; TextField: typeof TextField; TagInput: typeof TagInput;
      PanelSection: typeof PanelSection; ProjectTree: typeof ProjectTree; DocTabs: typeof DocTabs; ContextMenu: typeof ContextMenu;
      ModuleCard: typeof ModuleCard; TextModule: typeof TextModule; NumberModule: typeof NumberModule; AxisModule: typeof AxisModule;
      RadarModule: typeof RadarModule; BooleanModule: typeof BooleanModule; ModuleList: typeof ModuleList; ArchiveHeader: typeof ArchiveHeader;
      ReferenceList: typeof ReferenceList; PresetLibrary: typeof PresetLibrary; CanvasNode: typeof CanvasNode; RelationCanvas: typeof RelationCanvas;
      SnapshotHistory: typeof SnapshotHistory; Dialog: typeof Dialog; StatusBar: typeof StatusBar;
    };
  }
}
