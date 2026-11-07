import { useEffect, useRef, useState, type ReactElement } from 'react';
import T from './design/bundle.js';
import { uid, type Timeline, type TimelineEvent, type TimelineTick, type TreeNode } from './model';
import { deleteTick, effectiveTicks, eventTickId, placeEvent } from './timelineModel';

const TICK_SPACING = 300;
const AXIS_PADDING = 180;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;
const ZOOM_RATE = 0.002;
type Notice = (text: string, tone?: 'info' | 'warn' | 'danger') => void;
interface TimelineProps {
  timelines: Timeline[];
  onChange: (timelines: Timeline[]) => void;
  nodes: TreeNode[];
  focusId?: string | null;
  onOpenArchive: (id: string) => void;
  onNotice: Notice;
}
interface EventCardProps {
  event: TimelineEvent;
  ticks: TimelineTick[];
  nodes: TreeNode[];
  onChange: (event: TimelineEvent) => void;
  onDelete: () => void;
  onOpenArchive: (id: string) => void;
}

function EventCard({ event, ticks, nodes, onChange, onDelete, onOpenArchive }: EventCardProps): ReactElement {
  const toggleArchive = (id: string): void => onChange({ ...event, archiveIds: event.archiveIds.includes(id)
    ? event.archiveIds.filter(value => value !== id) : [...event.archiveIds, id] });
  return <article className="wb-event wb-timeline__event" data-event-id={event.id}>
    <div className="wb-event__row">
      <select aria-label="事件刻度" value={eventTickId(event, ticks) ?? ''}
        onChange={change => onChange({ ...placeEvent(event, ticks.find(tick => tick.id === change.target.value)), unplaced: false })}>
        <option value="">未定位</option>{ticks.map(tick => <option key={tick.id} value={tick.id}>{tick.label}</option>)}
      </select>
      <T.Button variant="quiet" tone="danger" icon="trash" aria-label="删除事件" onClick={onDelete}>删除</T.Button>
    </div>
    <T.TextField ariaLabel="事件名称" value={event.title} onChange={title => onChange({ ...event, title })} placeholder="事件名称" />
    <T.TextField ariaLabel="事件描述" multiline rows={2} value={event.description} onChange={description => onChange({ ...event, description })} placeholder="事件描述" />
    <div className="wb-event__links"><span>关联档案</span>{nodes.map(node => <button type="button" key={node.id}
      className={event.archiveIds.includes(node.id) ? 'is-active' : ''} onClick={() => toggleArchive(node.id)}>{node.name || '未命名档案'}</button>)}
      {event.archiveIds.map(id => <T.Button key={id} variant="quiet" icon="jump" onClick={() => onOpenArchive(id)}>打开档案</T.Button>)}
    </div>
  </article>;
}

interface BoardProps extends Omit<TimelineProps, 'timelines' | 'focusId' | 'onChange'> {
  timeline: Timeline;
  onChange: (timeline: Timeline) => void;
}

function useTimelineZoom(): { zoom: number; viewport: React.RefObject<HTMLDivElement> } {
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: globalThis.WheelEvent): void => {
      if ((event.target as HTMLElement).closest('input,textarea,select,button')) return;
      if (event.shiftKey) { event.preventDefault(); element.scrollLeft += event.deltaY || event.deltaX; return; }
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const pointer = event.clientX - element.getBoundingClientRect().left;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * Math.exp(-event.deltaY * ZOOM_RATE)));
      const offset = (element.scrollLeft + pointer) * next / zoom - pointer;
      setZoom(next);
      requestAnimationFrame(() => { element.scrollLeft = offset; });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom]);
  return { zoom, viewport };
}

function TimelineBoard({ timeline, onChange, nodes, onOpenArchive }: BoardProps): ReactElement {
  const ticks = effectiveTicks(timeline);
  const { zoom, viewport } = useTimelineZoom();
  const changeEvent = (next: TimelineEvent): void => onChange({ ...timeline, ticks, events: timeline.events.map(event => event.id === next.id ? next : event) });
  const removeEvent = (id: string): void => onChange({ ...timeline, ticks, events: timeline.events.filter(event => event.id !== id) });
  const unplaced = timeline.events.filter(event => !eventTickId(event, ticks) || event.unplaced === true);
  const columns = [...ticks.map(tick => ({ id: tick.id, tick, events: timeline.events.filter(event => eventTickId(event, ticks) === tick.id) })),
    ...(unplaced.length ? [{ id: 'unplaced', tick: undefined, events: unplaced }] : [])];
  const renderCard = (event: TimelineEvent): ReactElement => <EventCard key={event.id} event={event} ticks={ticks} nodes={nodes}
    onChange={changeEvent} onDelete={() => removeEvent(event.id)} onOpenArchive={onOpenArchive} />;
  return <><p className="wb-muted">选择刻度后添加事件；普通滚轮浏览，Shift + 滚轮横移，Ctrl + 滚轮缩放。</p>
    <div className="wb-timeline__viewport" ref={viewport}>
      <div className="wb-timeline__world" data-timeline-world style={{ width: Math.max(700, columns.length * Math.max(280, TICK_SPACING * zoom) + AXIS_PADDING), minHeight: Math.max(430, ...columns.map(column => 150 + column.events.length * 430)) }}>
        <div className="wb-timeline__axis" />
        {!columns.length && <div className="wb-timeline__blank">空白时间轴 · 添加刻度以开始</div>}
        <div className="wb-timeline__columns" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, ${Math.max(280, TICK_SPACING * zoom)}px)` }}>
          {columns.map(column => <section key={column.id} className="wb-timeline__column" data-tick-id={column.id}>
            <div className="wb-timeline__tick"><span>{column.tick?.label ?? '未定位事件'}</span><i />
              {column.tick && <T.Button size="sm" variant="quiet" tone="danger" aria-label={`删除刻度 ${column.tick.label}`}
                onClick={() => onChange(deleteTick(timeline, column.id))}>删除刻度</T.Button>}
            </div><div className="wb-timeline__events">{column.events.map(renderCard)}</div>
          </section>)}
        </div>
      </div>
    </div></>;
}

function TimelineEditor({ timeline, onChange, nodes, onOpenArchive, onNotice }: BoardProps): ReactElement {
  const [tickForm, setTickForm] = useState(false);
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState('');
  const ticks = effectiveTicks(timeline);
  const activeTick = ticks.find(tick => tick.id === selected) ?? ticks[0];
  const addTick = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!label.trim()) return;
    const tick = { id: uid('tick'), label: label.trim() };
    onChange({ ...timeline, ticks: [...ticks, tick] });
    setSelected(tick.id); setTickForm(false); setLabel('');
    onNotice(`已添加刻度“${tick.label}”。`);
  };
  const addEvent = (): void => {
    if (!activeTick) return;
    const event = placeEvent({ id: uid('event'), title: '未命名事件', time: '', description: '', archiveIds: [] }, activeTick);
    onChange({ ...timeline, ticks, events: [...timeline.events, event] });
    requestAnimationFrame(() => document.querySelector(`[data-event-id="${event.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    onNotice(`已在“${activeTick.label}”添加事件。`);
  };
  return <section className="wb-entity__editor">
    <div className="wb-timeline__head"><T.TextField label="时间线名称" value={timeline.name} onChange={name => onChange({ ...timeline, name })} />
      <T.Button icon="plus" onClick={() => { setLabel(''); setTickForm(true); }}>添加刻度</T.Button>
      <label className="wb-timeline__target">新增事件位置<select aria-label="新增事件刻度" value={activeTick?.id ?? ''} onChange={event => setSelected(event.target.value)}>
        {!ticks.length && <option value="">请先添加刻度</option>}{ticks.map(tick => <option key={tick.id} value={tick.id}>{tick.label}</option>)}
      </select></label><T.Button icon="plus" disabled={!activeTick} onClick={addEvent}>添加事件</T.Button>
    </div>
    {tickForm && <form className="wb-timeline__tick-form" onSubmit={addTick}>
      <label>刻度名称<input aria-label="刻度名称" autoFocus value={label} onChange={event => setLabel(event.target.value)} /></label>
      <T.Button type="submit" variant="primary" disabled={!label.trim()}>确认添加刻度</T.Button>
      <T.Button onClick={() => setTickForm(false)}>取消</T.Button>
    </form>}
    <TimelineBoard timeline={timeline} onChange={onChange} nodes={nodes} onOpenArchive={onOpenArchive} onNotice={onNotice} />
  </section>;
}

export function TimelineView({ timelines, onChange, nodes, focusId, onOpenArchive, onNotice }: TimelineProps): ReactElement {
  const [timelineId, setTimelineId] = useState(timelines[0]?.id ?? null);
  useEffect(() => { if (focusId && timelines.some(timeline => timeline.id === focusId)) setTimelineId(focusId); }, [focusId, timelines]);
  const current = timelines.find(timeline => timeline.id === timelineId) ?? timelines[0];
  const addTimeline = (): void => {
    const timeline = { id: uid('timeline'), name: `新时间线 ${timelines.length + 1}`, events: [], ticks: [] };
    onChange([...timelines, timeline]); setTimelineId(timeline.id);
  };
  return <main className="wb-entity wb-timeline"><aside className="wb-entity__list">
    <div className="wb-entity__list-head"><b>时间线</b><T.IconButton layout="inline" icon="plus" label="新建时间线" onClick={addTimeline} /></div>
    {timelines.map(timeline => <button key={timeline.id} className={timeline.id === current?.id ? 'is-active' : ''} onClick={() => setTimelineId(timeline.id)}>
      <T.Icon name="history" size={15} /><span>{timeline.name}</span><small>{timeline.events.length}</small></button>)}
  </aside>{current ? <TimelineEditor key={current.id} timeline={current} onChange={next => onChange(timelines.map(item => item.id === next.id ? next : item))}
    nodes={nodes} onOpenArchive={onOpenArchive} onNotice={onNotice} /> : <div className="wb-empty"><b>还没有时间线</b>
    <T.Button icon="plus" onClick={addTimeline}>新建时间线</T.Button></div>}</main>;
}
