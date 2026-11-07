import { useMemo, useState, type MouseEvent } from 'react';
import T from './design/bundle.js';
import type { TreeNode } from '../世界树工程设计系统/components/index';
import type { ProjectRecord, WikiEntry } from './model';
import { emptyWorkspace, uid } from './model';

type Notice = (text: string, tone?: 'info' | 'warn' | 'danger') => void;
type ArchiveLink = { id: string; name: string; count?: number; kind: 'canvas' | 'timeline' | 'wiki' };

export function BacklinkPanel({ refs, onJump }: { refs: ArchiveLink[]; onJump: (ref: ArchiveLink) => void }) {
  const groups = [
    { kind: 'canvas' as const, title: '画布引用', icon: 'canvas' as const },
    { kind: 'timeline' as const, title: '时间线引用', icon: 'history' as const },
    { kind: 'wiki' as const, title: '世界观维基关联', icon: 'archive' as const },
  ];
  return <section className="tt-backlinks"><div className="wb-h">数据引用</div>
    {groups.map(group => { const entries = refs.filter(ref => ref.kind === group.kind); return <div className="tt-backlinks__group" key={group.kind}>
      <div className="tt-backlinks__title"><T.Icon name={group.icon} size={15} /><span>{group.title}</span><span className="tt-count">{entries.length}</span></div>
      {entries.length ? <ul>{entries.map(ref => <li key={`${ref.kind}:${ref.id}`}><button type="button" onClick={() => onJump(ref)}><span>{ref.name}</span>{ref.count && ref.count > 1 ? <small>{ref.count} 处</small> : null}<T.Icon name="jump" size={13} /></button></li>)}</ul> : <p className="wb-muted">暂无关联内容。建立关联后会显示在这里。</p>}
    </div>; })}
  </section>;
}

type WikiNode = WikiEntry & { kind?: 'folder' | 'entry'; children?: WikiNode[] };
function changeWikiTree(nodes: WikiNode[], id: string, change: (node: WikiNode) => WikiNode | null): WikiNode[] {
  return nodes.flatMap(node => {
    if (node.id === id) { const updated = change(node); return updated ? [updated] : []; }
    return [{ ...node, children: changeWikiTree(node.children ?? [], id, change) }];
  });
}
function findWikiNode(nodes: WikiNode[], id: string): WikiNode | undefined { for (const node of nodes) { if (node.id === id) return node; const found = findWikiNode(node.children ?? [], id); if (found) return found; } }
function addWikiChild(nodes: WikiNode[], parentId: string, item: WikiNode): WikiNode[] {
  return nodes.map(node => node.id === parentId
    ? { ...node, children: [...(node.children ?? []), item] }
    : { ...node, children: addWikiChild(node.children ?? [], parentId, item) });
}
function insertWikiSibling(nodes: WikiNode[], targetId: string, item: WikiNode): WikiNode[] {
  return nodes.flatMap(node => node.id === targetId
    ? [node, item]
    : [{ ...node, children: insertWikiSibling(node.children ?? [], targetId, item) }]);
}
export function WikiView({ entries, onChange }: { entries: WikiEntry[]; onChange: (entries: WikiEntry[]) => void; nodes?: TreeNode[]; focusId?: string | null; onOpenArchive?: (id: string) => void }) {
  const tree = entries as WikiNode[];
  const [active, setActive] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string | null } | null>(null);
  const current = findWikiNode(tree, active ?? '');
  const saveTree = (next: WikiNode[]) => onChange(next as WikiEntry[]);
  const add = (parentId: string | null, kind: 'folder' | 'entry') => {
    const item: WikiNode = { id: uid('wiki'), kind, title: kind === 'folder' ? '新建文件夹' : '未命名词条', body: '', tags: [], updatedAt: Date.now(), ...(kind === 'folder' ? { children: [] } : {}) };
    const parent = parentId ? findWikiNode(tree, parentId) : undefined;
    if (!parentId) saveTree([...tree, item]);
    else if (parent && (parent.kind === 'folder' || kind === 'folder')) saveTree(addWikiChild(tree, parent.id, item));
    else saveTree(insertWikiSibling(tree, parentId, item));
    if (kind === 'entry') setActive(item.id);
    setMenu(null);
  };
  const move = (id: string, parentId: string | null, index?: number) => {
    if (id === parentId || findWikiNode(findWikiNode(tree, id)?.children ?? [], parentId ?? '')) return;
    const moving = findWikiNode(tree, id); if (!moving) return;
    const removed = changeWikiTree(tree, id, () => null);
    const insert = (list: WikiNode[]) => { const next = list.slice(); next.splice(Math.max(0, Math.min(index ?? next.length, next.length)), 0, moving); return next; };
    const parent = parentId ? findWikiNode(removed, parentId) : undefined;
    saveTree(parent?.kind === 'folder'
      ? changeWikiTree(removed, parent.id, folder => ({ ...folder, children: insert(folder.children ?? []) }))
      : parentId ? insertWikiSibling(removed, parentId, moving) : insert(removed));
  };
  const renderNodes = (list: WikiNode[], depth = 0): React.ReactNode => list.map((item, index) => <div className="wb-wiki-tree__item" key={item.id} draggable onDragStart={event => event.dataTransfer.setData('text/wiki-id', item.id)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); move(event.dataTransfer.getData('text/wiki-id'), item.kind === 'folder' ? item.id : null, index); }} onContextMenu={event => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY, id: item.id }); }}><button className={`wb-wiki-tree__row${item.id === active ? ' is-active' : ''}`} style={{ paddingLeft: 10 + depth * 16 }} onClick={() => item.kind !== 'folder' && setActive(item.id)}><T.Icon name="archive" size={15} /><span>{item.title || (item.kind === 'folder' ? '未命名文件夹' : '未命名词条')}</span></button>{item.children?.length ? renderNodes(item.children, depth + 1) : null}</div>);
  return <main className="wb-entity wb-wiki"><aside className="wb-entity__list"><div className="wb-entity__list-head"><b>世界观维基</b><T.IconButton layout="inline" icon="plus" label="新建词条" onClick={() => add(null, 'entry')} /></div><div className="wb-wiki-tree" onContextMenu={event => { if (event.target === event.currentTarget) { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY, id: null }); } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); move(event.dataTransfer.getData('text/wiki-id'), null); }}>{renderNodes(tree)}{!tree.length && <p className="wb-muted">右键新建文件夹或词条。</p>}</div></aside><section className="wb-entity__editor">{current && current.kind !== 'folder' ? <><T.TextField label="词条名称" value={current.title} onChange={title => saveTree(changeWikiTree(tree, current.id, item => ({ ...item, title, updatedAt: Date.now() })))} /><T.TextField label="词条正文" multiline autoGrow variant="prose" rows={8} value={current.body} onChange={body => saveTree(changeWikiTree(tree, current.id, item => ({ ...item, body, updatedAt: Date.now() })))} /></> : <div className="wb-empty"><b>选择一个词条</b><p>右键目录节点可创建、移动、重命名或删除。</p><T.Button icon="plus" onClick={() => add(null, 'entry')}>新建词条</T.Button></div>}</section>{menu && <div className="wb-wiki-context" style={{ left: menu.x, top: menu.y }} onMouseLeave={() => setMenu(null)}><button onClick={() => add(menu.id, 'entry')}>新建词条</button><button onClick={() => add(menu.id, 'folder')}>新建子文件夹</button>{menu.id && <><button onClick={() => { const node = findWikiNode(tree, menu.id!); if (!node) return; const title = window.prompt('重命名', node.title); if (title !== null) saveTree(changeWikiTree(tree, node.id, item => ({ ...item, title }))); setMenu(null); }}>重命名</button><button onClick={() => { move(menu.id!, null); setMenu(null); }}>移到根目录</button><button onClick={() => { saveTree(changeWikiTree(tree, menu.id!, () => null)); if (active === menu.id) setActive(null); setMenu(null); }}>删除</button></>}</div>}</main>;
}

export function CanvasMinimap({ nodes, onNavigate, onNotice }: { nodes: { id: string; x: number; y: number }[]; onNavigate?: (viewport: { x: number; y: number; z: number }) => void; onNotice: Notice }) {
  const bounds = useMemo(() => { if (!nodes.length) return { x: 0, y: 0, w: 1, h: 1 }; const xs = nodes.map(node => node.x), ys = nodes.map(node => node.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(320, Math.max(...xs) - Math.min(...xs) + 180), h: Math.max(220, Math.max(...ys) - Math.min(...ys) + 120) }; }, [nodes]);
  const focus = (event: MouseEvent<HTMLButtonElement>) => { const box = event.currentTarget.getBoundingClientRect(); const x = Math.round(bounds.x + ((event.clientX - box.left) / box.width) * bounds.w); const y = Math.round(bounds.y + ((event.clientY - box.top) / box.height) * bounds.h); onNavigate?.({ x: box.width / 2 - x, y: box.height / 2 - y, z: 1 }); onNotice(`缩略图已定位到 ${x}, ${y}。`); };
  return <button type="button" className="tt-minimap" onClick={focus} aria-label="画布缩略图"><span className="tt-minimap__title">缩略图</span>{nodes.map(node => <i key={node.id} style={{ left: `${((node.x - bounds.x) / bounds.w) * 100}%`, top: `${((node.y - bounds.y) / bounds.h) * 100}%` }} />)}</button>;
}

export function categoryOf(type?: string) { const value = (type || '').toLocaleLowerCase(); if (value.includes('角色') || value.includes('人物')) return '角色'; if (value.includes('事件')) return '事件'; if (value.includes('国家') || value.includes('势力')) return '国家'; return '世界观'; }
export const categories = ['角色', '事件', '国家', '世界观', '时间线'];
export function workspaceFor(record: ProjectRecord) { return record.workspace ?? emptyWorkspace(); }
