import type {
  ArchiveModule,
  AxisData,
  BoolData,
  CanvasNodeData as DesignCanvasNode,
  CanvasSnapshot as DesignCanvasSnapshot,
  NumberData,
  Preset,
  PresetModule,
  RadarData,
  TextData,
  TreeNode,
} from '../世界树工程设计系统/components/index';

export type {
  ArchiveModule,
  AxisData,
  BoolData,
  DropPosition,
  ModuleKind,
  NumberData,
  Preset,
  PresetModule,
  RadarData,
  TextData,
  TreeNode,
} from '../世界树工程设计系统/components/index';
import type { RelationEdge } from './design';
export type { RelationEdge } from './design';

/** All paths are relative to the project directory, with forward slashes. */
export interface Media {
  id: string;
  name: string;
  path: string;
  mime: string;
  [key: string]: unknown;
}

export interface WorkspaceItem {
  id: string;
  kind: 'module' | 'media';
  refId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArchiveWorkspace {
  items: WorkspaceItem[];
}

export interface ProjectRecord {
  tags: string[];
  body: string;
  modules: ArchiveModule[];
  media: Media[];
  workspace?: ArchiveWorkspace;
  [key: string]: unknown;
}

export interface WikiEntry {
  id: string;
  title: string;
  body: string;
  tags: string[];
  archiveIds?: string[];
  updatedAt: number;
  kind?: 'folder' | 'entry';
  children?: WikiEntry[];
  [key: string]: unknown;
}

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  tickId?: string;
  description: string;
  archiveIds: string[];
  [key: string]: unknown;
}

export interface TimelineTick {
  id: string;
  label: string;
}

export interface Timeline {
  id: string;
  name: string;
  events: TimelineEvent[];
  ticks?: TimelineTick[];
  [key: string]: unknown;
}

export interface EmptyWorkspace {
  items: WorkspaceItem[];
}

export interface CanvasNode extends DesignCanvasNode {
  archiveDeleted?: boolean;
  /** A canvas display-name edit must never rename the source archive. */
  displayNameEdited?: boolean;
  /** Optional project-relative image path, always under media/. */
  imagePath?: string;
}

export interface CanvasGraph {
  nodes: CanvasNode[];
  edges: RelationEdge[];
}

export interface CanvasSnapshot extends Omit<DesignCanvasSnapshot, 'graph'> {
  graph?: CanvasGraph;
}

export interface ProjectCanvas {
  id: string;
  name: string;
  graph: CanvasGraph;
  snapshots: CanvasSnapshot[];
  viewport?: { x: number; y: number; z: number };
  [key: string]: unknown;
}

export interface Project {
  format: 't-tool';
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tree: TreeNode[];
  records: Record<string, ProjectRecord>;
  canvases: ProjectCanvas[];
  presets: Preset[];
  wiki: WikiEntry[];
  timelines: Timeline[];
  [key: string]: unknown;
}

export type Theme = 'light' | 'dark';

export interface Preferences {
  theme: Theme;
  recentProjects: { name: string; path: string }[];
}

export interface DesktopResult {
  ok: boolean;
  canceled?: boolean;
  error?: string;
  project?: Project;
  path?: string;
  media?: Media[];
  nodeImage?: Media;
  preferences?: Preferences;
  exportPath?: string;
}

export interface DesktopAPI {
  newProject(name: string): Promise<DesktopResult>;
  openProject(): Promise<DesktopResult>;
  openRecent(path: string): Promise<DesktopResult>;
  saveProject(project: Project): Promise<DesktopResult>;
  saveAs(project: Project): Promise<DesktopResult>;
  exportProject(project: Project): Promise<DesktopResult>;
  importMedia(): Promise<DesktopResult>;
  importNodeImage(): Promise<DesktopResult>;
  readPreferences(): Promise<DesktopResult>;
  writePreferences(preferences: { theme: Theme }): Promise<DesktopResult>;
  onCloseRequested(callback: () => void): () => void;
  respondClose(response: 'close' | 'cancel'): Promise<DesktopResult>;
  onMenuAction(callback: (action: string) => void): () => void;
}

let fallbackSequence = 0;

export function uid(prefix = 'id'): string {
  const unique = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${(++fallbackSequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${unique}`;
}

export function emptyWorkspace(): EmptyWorkspace {
  return { items: [] };
}

export function emptyRecord(): ProjectRecord {
  return { tags: [], body: '', modules: [], media: [], workspace: emptyWorkspace() };
}

/** Blank projects contain no compulsory archives, tags, or modules. */
export function createProject(name: string): Project {
  const now = Date.now();
  return {
    format: 't-tool',
    schemaVersion: 1,
    id: uid('project'),
    name,
    createdAt: now,
    updatedAt: now,
    tree: [],
    records: {},
    canvases: [{
      id: uid('canvas'),
      name: '未命名画布',
      graph: { nodes: [], edges: [] },
      snapshots: [],
    }],
    presets: [],
    wiki: [],
    timelines: [],
  };
}

/** A depth-first traversal that keeps node objects shared with the tree. */
export function flattenTree(tree: readonly TreeNode[]): TreeNode[] {
  const output: TreeNode[] = [];
  forEachTreeNode(tree, node => output.push(node));
  return output;
}

export function findNode(tree: readonly TreeNode[], id: string): TreeNode | undefined {
  // Keep traversal iterative so a deeply nested user archive cannot exhaust the call stack.
  const stack: { nodes: readonly TreeNode[]; index: number }[] = [{ nodes: tree, index: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.nodes.length) {
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index++];
    if (node.id === id) return node;
    if (node.children?.length) stack.push({ nodes: node.children, index: 0 });
  }
  return undefined;
}

export function countTree(tree: readonly TreeNode[]): number {
  let count = 0;
  forEachTreeNode(tree, () => count++);
  return count;
}

/** Includes the selected archive itself as well as every descendant. */
export function collectIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  forEachTreeNode([node], item => ids.add(item.id));
  return ids;
}

function forEachTreeNode(tree: readonly TreeNode[], visit: (node: TreeNode) => void): void {
  const stack: { nodes: readonly TreeNode[]; index: number }[] = [{ nodes: tree, index: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.nodes.length) {
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index++];
    visit(node);
    if (node.children?.length) stack.push({ nodes: node.children, index: 0 });
  }
}

/**
 * Reconcile live references after a tree edit, without changing historical snapshots.
 * Only changed record dictionaries, canvas arrays, graphs, and nodes are copied.
 */
export function reconcileProject(project: Project): Project {
  const archives = new Map<string, TreeNode>();
  forEachTreeNode(project.tree, node => archives.set(node.id, node));

  let records = project.records;
  const writableRecords = (): Record<string, ProjectRecord> => {
    if (records === project.records) records = { ...project.records };
    return records;
  };
  for (const id of archives.keys()) {
    if (!Object.hasOwn(project.records, id)) {
      Object.defineProperty(writableRecords(), id, {
        value: emptyRecord(), enumerable: true, configurable: true, writable: true,
      });
    }
  }
  for (const id of Object.keys(project.records)) {
    if (!archives.has(id)) delete writableRecords()[id];
  }

  let canvases = project.canvases;
  project.canvases.forEach((canvas, canvasIndex) => {
    let nodes = canvas.graph.nodes;
    canvas.graph.nodes.forEach((node, nodeIndex) => {
      if (node.kind !== 'ref') return;
      const archive = node.archiveId ? archives.get(node.archiveId) : undefined;
      let next = node;
      if (!archive) {
        if (!node.archiveDeleted) next = { ...node, archiveDeleted: true };
      } else {
        const displayNameEdited = node.displayNameEdited ?? (node.title !== node.archive);
        const title = displayNameEdited ? node.title : archive.name;
        if (node.archive !== archive.name || node.type !== archive.type
          || node.archiveDeleted || node.title !== title
          || node.displayNameEdited !== displayNameEdited) {
          next = {
            ...node,
            archive: archive.name,
            type: archive.type,
            title,
            archiveDeleted: false,
            displayNameEdited,
          };
        }
      }
      if (next !== node) {
        if (nodes === canvas.graph.nodes) nodes = canvas.graph.nodes.slice();
        nodes[nodeIndex] = next;
      }
    });
    if (nodes !== canvas.graph.nodes) {
      if (canvases === project.canvases) canvases = project.canvases.slice();
      canvases[canvasIndex] = { ...canvas, graph: { ...canvas.graph, nodes } };
    }
  });

  return records === project.records && canvases === project.canvases
    ? project
    : { ...project, records, canvases };
}

/** Match the supplied design's structure-only preset semantics. */
export function toPreset(modules: readonly ArchiveModule[]): PresetModule[] {
  return modules.map(module => {
    let data: ArchiveModule['data'];
    switch (module.kind) {
      case 'text':
        data = { text: '' } satisfies TextData;
        break;
      case 'number':
        data = { rows: (module.data as NumberData).rows.map(row => ({ label: row.label, value: '', unit: row.unit })) };
        break;
      case 'axis':
        data = { rows: (module.data as AxisData).rows.map(row => ({ left: row.left, right: row.right, value: 0 })) };
        break;
      case 'radar': {
        const radar = module.data as RadarData;
        data = { max: radar.max, rows: radar.rows.map(row => ({ name: row.name, value: 0 })) };
        break;
      }
      case 'bool':
        data = { rows: (module.data as BoolData).rows.map(row => ({ statement: row.statement, value: null, yes: row.yes, no: row.no })) };
        break;
    }
    return { kind: module.kind, title: module.title, data };
  });
}

/** Each import owns its data and new IDs; changing it cannot alter its preset. */
export function fromPreset(preset: Preset): ArchiveModule[] {
  return preset.modules.map(module => ({
    ...module,
    id: uid('module'),
    data: structuredClone(module.data),
  }));
}

/** User-opened sample based on the approved Workbench design; never a new-project default. */
export function createExampleProject(): Project {
  const project = createProject('雾港纪事（示例工程）');
  project.example = true;
  project.wiki = [{ id: 'wiki-1', title: '潮汐历法', body: '雾港使用以大潮为节点的历法。', tags: ['设定'], archiveIds: ['w2'], updatedAt: project.createdAt }];
  project.timelines = [{ id: 'timeline-1', name: '第一幕时间线', events: [{ id: 'event-1', title: '第七灯塔失踪', time: '七年前', description: '大潮当夜，守灯人与灯塔一同消失。', archiveIds: ['c1', 'w1'] }] }];
  project.tree = [
    { id: 'w', name: '世界观', children: [
      { id: 'w1', name: '第七灯塔', type: '地点' },
      { id: 'w2', name: '潮汐历法', type: '设定' },
    ] },
    { id: 'c', name: '角色', children: [
      { id: 'c1', name: '林晚', type: '角色' },
      { id: 'c2', name: '沈既白', type: '角色' },
      { id: 'c3', name: '阿萝', type: '角色' },
    ] },
    { id: 'f', name: '势力', children: [
      { id: 'f1', name: '灯塔会', type: '势力' },
      { id: 'f2', name: '港务局', type: '势力' },
    ] },
  ];
  project.records.c1 = {
    tags: ['主角', '第一幕', '雾港警署'],
    body: '雾港警署唯一的女探员，左手缺一根小指。七年前大潮那晚，她的父亲——第七灯塔的守灯人——连同灯一起消失了。她不信鬼神，只信潮汐表。',
    modules: [
      { id: 'm1', kind: 'number', title: '基础数值', data: { rows: [{ label: '年龄', value: '27', unit: '岁' }, { label: '身高', value: '168', unit: 'cm' }] } },
      { id: 'm2', kind: 'axis', title: '性格倾向', data: { rows: [{ left: '内向', right: '外向', value: -24 }, { left: '守序', right: '混乱', value: 40 }] } },
      { id: 'm3', kind: 'radar', title: '能力', data: { max: 10, rows: [{ name: '力', value: 4 }, { name: '敏', value: 7.5 }, { name: '智', value: 9 }, { name: '魅', value: 5 }, { name: '体', value: 6 }] } },
      { id: 'm4', kind: 'bool', title: '状态', data: { rows: [{ statement: '是否拥有超自然能力？', value: false, yes: '是', no: '否' }, { statement: '是否知道灯塔的秘密？', value: null, yes: '知道', no: '不知道' }] } },
    ],
    media: [],
  };
  project.records.f1 = {
    tags: ['第一幕'],
    body: '名义上维护雾港七座灯塔的行会，实际掌握着港口的夜间航道。',
    modules: [{ id: 'm5', kind: 'axis', title: '立场', data: { rows: [{ left: '保守', right: '激进', value: -50 }] } }],
    media: [],
  };
  project.presets = [
    { id: 'p1', name: '主要角色', updated: project.createdAt, modules: toPreset(project.records.c1.modules) },
    { id: 'p2', name: '势力档案', updated: project.createdAt, modules: toPreset([
      { id: 'pm1', kind: 'text', title: '宗旨与历史', data: { text: '' } },
      { id: 'pm2', kind: 'number', title: '规模', data: { rows: [{ label: '成员', value: '', unit: '人' }] } },
      project.records.f1.modules[0],
    ]) },
  ];
  const ref = (id: string, archiveId: string, x: number, y: number, title?: string): CanvasNode => {
    const archive = findNode(project.tree, archiveId)!;
    return { id, kind: 'ref', archiveId, archive: archive.name, type: archive.type, title: title ?? archive.name, x, y, displayNameEdited: title !== undefined };
  };
  project.canvases = [
    {
      id: 'g1', name: '第一幕 · 人物纠葛', snapshots: [], graph: {
        nodes: [
          ref('a', 'c1', 40, 150), ref('b', 'c2', 380, 150), ref('c', 'f1', 640, 30), ref('d', 'c3', 680, 300),
          { id: 'n1', kind: 'note', title: '她在说谎？时间线对不上——大潮那晚她不在码头。', x: 80, y: 330 },
          { id: 'k1', kind: 'note', title: '守灯人（已失踪）', parent: 'c', x: 900, y: 0 },
          { id: 'k2', kind: 'note', title: '账房 · 老周', parent: 'c', x: 920, y: 120 },
        ],
        edges: [
          { id: 'e1', from: 'a', to: 'b', label: '旧识，互不信任' },
          { id: 'e2', from: 'b', to: 'a', label: '暗中保护' },
          { id: 'e3', from: 'b', to: 'c', label: '卧底' },
          { id: 'e4', from: 'c', to: 'd', label: '名义上的监护人，实际在利用她寻找第七座灯塔的钥匙' },
          { id: 'e5', from: 'n1', to: 'a', label: '' },
        ],
      },
    },
    {
      id: 'g2', name: '七年前的那场大潮', snapshots: [], graph: {
        nodes: [ref('x1', 'c1', 0, 40, '少女时代的林晚'), ref('x2', 'w1', 300, 40), ref('x3', 'c1', 300, 200, '林晚（现在）')],
        edges: [{ id: 'y1', from: 'x1', to: 'x2', label: '最后一次见到父亲' }],
      },
    },
    { id: 'g3', name: '灯塔会内部', snapshots: [], graph: { nodes: [], edges: [] } },
  ];
  return reconcileProject(project);
}
