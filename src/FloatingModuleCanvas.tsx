import { useMemo, useRef, useState, type PointerEvent, type ReactElement } from 'react';
import T from './design/bundle.js';
import type { ArchiveModule, ModuleKind } from '../世界树工程设计系统/components/index';
import { uid, type ArchiveWorkspace, type Media, type ProjectRecord, type WorkspaceItem } from './model';
import { normalizeFrame, resizeFrame, RESIZE_HANDLES, type Frame, type ResizeHandle } from './workspaceGeometry';

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 230;
const COLUMN_GAP = 390;
const ROW_GAP = 280;
const ITEM_PADDING = 24;
const COLUMN_COUNT = 2;
const CANVAS_HEIGHT = 620;
type Notice = (text: string, tone?: 'info' | 'warn' | 'danger') => void;
interface CanvasProps {
  record: ProjectRecord;
  workspace: ArchiveWorkspace;
  onRecordChange: (patch: Partial<ProjectRecord>) => void;
  onWorkspaceChange: (workspace: ArchiveWorkspace) => void;
  onNotice: Notice;
  mediaUrl: (media: Media) => string;
}
interface ModuleProps {
  module: ArchiveModule;
  index: number;
  item: WorkspaceItem;
  onChange: (module: ArchiveModule) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onFrame: (frame: Frame) => void;
}
interface PointerOrigin { pointerId: number; x: number; y: number; frame: Frame; handle?: ResizeHandle }

function moduleTitle(kind: ModuleKind): string {
  return ({ text: '文本', number: '数值', axis: '倾向轴', radar: '雷达图', bool: '是 / 否' })[kind];
}
function defaultModule(kind: ModuleKind): ArchiveModule {
  const data = {
    text: { text: '' }, number: { rows: [{ label: '', value: '', unit: '' }] },
    axis: { rows: [{ left: '', right: '', value: 0 }] },
    radar: { max: 10, rows: [{ name: '力', value: 0 }, { name: '敏', value: 0 }, { name: '智', value: 0 }] },
    bool: { rows: [{ statement: '', value: null, yes: '是', no: '否' }] },
  }[kind];
  return { id: uid('module'), kind, title: moduleTitle(kind), data } as ArchiveModule;
}
function defaultItem(module: ArchiveModule, index: number): WorkspaceItem {
  return { id: `module:${module.id}`, kind: 'module', refId: module.id,
    x: ITEM_PADDING + index % COLUMN_COUNT * COLUMN_GAP,
    y: ITEM_PADDING + Math.floor(index / COLUMN_COUNT) * ROW_GAP, w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };
}
function ModuleBody({ module, onChange }: { module: ArchiveModule; onChange: (data: ArchiveModule['data']) => void }): ReactElement {
  if (module.kind === 'text') return <T.TextModule data={module.data as never} onChange={onChange as never} ariaLabel="文本内容" />;
  if (module.kind === 'number') return <T.NumberModule data={module.data as never} onChange={onChange as never} />;
  if (module.kind === 'axis') return <T.AxisModule data={module.data as never} onChange={onChange as never} />;
  if (module.kind === 'radar') return <T.RadarModule data={module.data as never} onChange={onChange as never} />;
  return <T.BooleanModule data={module.data as never} onChange={onChange as never} />;
}

function FloatingModule({ module, index, item, onChange, onDelete, onMove, onFrame }: ModuleProps): ReactElement {
  const [dragging, setDragging] = useState(false);
  const origin = useRef<PointerOrigin | null>(null);
  const start = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>('[data-resize-handle]')?.dataset.resizeHandle as ResizeHandle | undefined;
    if (!handle && (!target.closest('.tt-mod__head') || target.closest('input,textarea,button'))) return;
    event.preventDefault();
    origin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, frame: normalizeFrame(item), handle };
    setDragging(true); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>): void => {
    const previous = origin.current;
    if (!previous || previous.pointerId !== event.pointerId) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    onFrame(previous.handle ? resizeFrame(previous.frame, { handle: previous.handle, dx, dy })
      : { ...previous.frame, x: Math.max(0, previous.frame.x + dx), y: Math.max(0, previous.frame.y + dy) });
  };
  const stop = (event: PointerEvent<HTMLDivElement>): void => {
    if (origin.current?.pointerId !== event.pointerId) return;
    origin.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div data-module-id={module.id} className={`tt-floating-module${dragging ? ' is-dragging' : ''}`}
    style={{ left: item.x, top: item.y, width: item.w, height: item.h }} onPointerDownCapture={start}
    onPointerMoveCapture={move} onPointerUpCapture={stop} onPointerCancelCapture={stop} onLostPointerCapture={stop}>
    <T.ModuleCard kind={module.kind} title={module.title} canMoveUp={index > 0} canMoveDown onMoveUp={() => onMove(-1)} onMoveDown={() => onMove(1)}
      onTitleChange={title => onChange({ ...module, title })} onDelete={onDelete}>
      <ModuleBody module={module} onChange={data => onChange({ ...module, data })} />
    </T.ModuleCard>
    {RESIZE_HANDLES.map(handle => <span key={handle} data-resize-handle={handle}
      className={`tt-floating-module__resize tt-floating-module__resize--${handle}`} title="拖动边框调整大小" />)}
  </div>;
}

export function FloatingModuleCanvas({ record, workspace, onRecordChange, onWorkspaceChange, onNotice, mediaUrl }: CanvasProps): ReactElement {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const items = useMemo(() => record.modules.map((module, index) => {
    const item = workspace.items.find(item => item.refId === module.id) ?? defaultItem(module, index);
    return { module, index, item: { ...item, ...normalizeFrame(item) } };
  }), [record.modules, workspace.items]);
  const insert = (kind: ModuleKind): void => {
    const module = defaultModule(kind), item = defaultItem(module, items.length);
    onRecordChange({ modules: [...record.modules, module], workspace: { ...workspace, items: [...workspace.items, item] } });
    setMenu(null); onNotice(`已添加${moduleTitle(kind)}模块。`);
  };
  const remove = (id: string): void => {
    onRecordChange({ modules: record.modules.filter(module => module.id !== id),
      workspace: { ...workspace, items: workspace.items.filter(item => item.refId !== id) } });
    onNotice('已删除模块。');
  };
  const reorder = (index: number, direction: -1 | 1): void => {
    const next = record.modules.slice(), target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; onRecordChange({ modules: next });
  };
  const setFrame = (item: WorkspaceItem, frame: Frame): void => onWorkspaceChange({ ...workspace,
    items: [...workspace.items.filter(current => current.refId !== item.refId), { ...item, ...frame }] });
  const menuItems = (['text', 'number', 'axis', 'radar', 'bool'] as ModuleKind[]).map(kind => ({ label: `${moduleTitle(kind)}模块`, icon: `mod-${kind}` as never, onSelect: () => insert(kind) }));
  return <section className="tt-workspace-section"><div className="wb-h"><span>自由工作区</span><span className="tt-count">{record.modules.length} 个模块 · {record.media.length} 张图片</span>
    <T.Button variant="quiet" icon="plus" onClick={event => { const r = event.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom }); }}>插入模块</T.Button></div>
    <div className="tt-floating-canvas" style={{ minHeight: CANVAS_HEIGHT }} onContextMenu={event => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY }); }}>
      <div className="tt-floating-canvas__hint">拖动标题栏移动，拖动边框缩放（最小 320 × 180）</div>
      {workspace.items.filter(item => item.kind === 'media').map(item => { const media = record.media.find(candidate => candidate.id === item.refId);
        return media ? <div key={item.id} className="tt-floating-media" style={{ left: item.x, top: item.y, width: item.w }}>
          <img src={mediaUrl(media)} alt={media.name} draggable={false} /><span>{media.name}</span></div> : null; })}
      {items.map(({ module, index, item }) => <FloatingModule key={module.id} module={module} index={index} item={item}
        onChange={next => onRecordChange({ modules: record.modules.map(current => current.id === next.id ? next : current) })}
        onDelete={() => remove(module.id)} onMove={direction => reorder(index, direction)} onFrame={frame => setFrame(item, frame)} />)}
      {!record.modules.length && <div className="tt-floating-canvas__empty"><b>空白工作区</b><p>需要时插入模块或添加图片。</p></div>}
    </div>{menu && <T.ContextMenu open x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
  </section>;
}
