import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const MAX_JSON_BYTES = 64 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const FORMAT = 't-tool';
const VERSION = 1;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = error => ({ ok: false, error: error instanceof Error ? error.message : String(error) });
const error = (message, code) => Object.assign(new Error(message), { code });
const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const inPath = (root, candidate) => { const relative = path.relative(root, candidate); return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)); };
const canvasImagePaths = project => {
  const paths = [];
  for (const canvas of project.canvases) {
    for (const graph of [canvas.graph, ...canvas.snapshots.flatMap(snapshot => snapshot.graph ? [snapshot.graph] : [])]) {
      for (const node of graph.nodes) if (node.imagePath) paths.push(node.imagePath);
    }
  }
  return paths;
};

/** Unknown fields survive edits; known collection deletions stay deleted. */
function objectWithUnknown(before, after, keys, children = {}) {
  if (!plain(after)) return after;
  const result = Object.create(null);
  if (plain(before)) for (const key of Object.keys(before)) if (!keys.includes(key)) result[key] = before[key];
  for (const [key, value] of Object.entries(after)) result[key] = children[key] ? children[key](before?.[key], value) : value;
  return result;
}
function arrayMerge(before, after, merger) {
  const previous = Array.isArray(before) ? before : [];
  const byId = new Map(previous.filter(item => item?.id).map(item => [item.id, item]));
  return after.map((item, index) => merger(item?.id ? byId.get(item.id) : previous[index], item));
}
const mergeTree = (before, after) => arrayMerge(before, after, (a, b) => objectWithUnknown(a, b, ['id', 'name', 'type', 'children'], { children: mergeTree }));
const mergeWiki = (before, after) => arrayMerge(before, after, (a, b) => objectWithUnknown(a, b, ['id', 'title', 'body', 'tags', 'archiveIds', 'updatedAt', 'kind', 'children'], {
  children: mergeWiki,
}));
const mergeGraph = (before, after) => objectWithUnknown(before, after, ['nodes', 'edges'], {
  nodes: (a, b) => arrayMerge(a, b, (x, y) => objectWithUnknown(x, y, ['id', 'kind', 'title', 'x', 'y', 'archiveId', 'archive', 'type', 'parent', 'collapsed', 'archiveDeleted', 'displayNameEdited', 'imagePath'])),
  edges: (a, b) => arrayMerge(a, b, (x, y) => objectWithUnknown(x, y, ['id', 'from', 'to', 'label', 'labelPosition', 'labelWidth', 'labelHeight'])),
});
function mergeModule(before, after) {
  const fields = { text: ['text'], number: ['rows'], axis: ['rows'], radar: ['max', 'rows'], bool: ['rows'] };
  const rowFields = { number: ['label', 'value', 'unit'], axis: ['left', 'right', 'value'], radar: ['name', 'value'], bool: ['statement', 'value', 'yes', 'no'] };
  return objectWithUnknown(before, after, ['id', 'kind', 'title', 'data'], {
    data: (a, b) => plain(b) ? objectWithUnknown(before?.kind === after.kind ? a : undefined, b, fields[after.kind] || [], {
      rows: (x, y) => Array.isArray(y) ? arrayMerge(x, y, (r, s) => objectWithUnknown(r, s, rowFields[after.kind] || [])) : y,
    }) : b,
  });
}
export function preserveUnknown(before, after) {
  return objectWithUnknown(before, after, ['format', 'schemaVersion', 'id', 'name', 'createdAt', 'updatedAt', 'tree', 'records', 'canvases', 'presets', 'wiki', 'timelines'], {
    tree: mergeTree,
    records: (a, b) => Object.fromEntries(Object.entries(b).map(([id, record]) => [id, objectWithUnknown(a?.[id], record, ['tags', 'body', 'modules', 'media', 'workspace'], {
      modules: (x, y) => arrayMerge(x, y, mergeModule),
      media: (x, y) => arrayMerge(x, y, (m, n) => objectWithUnknown(m, n, ['id', 'name', 'path', 'mime'])),
      workspace: (x, y) => objectWithUnknown(x, y, ['items'], { items: (u, v) => arrayMerge(u, v, (itemBefore, itemAfter) => objectWithUnknown(itemBefore, itemAfter, ['id', 'kind', 'refId', 'x', 'y', 'w', 'h'])) }),
    })])),
    wiki: mergeWiki,
    timelines: (a, b) => arrayMerge(a, b, (x, y) => objectWithUnknown(x, y, ['id', 'name', 'events', 'ticks'], {
      events: (u, v) => arrayMerge(u, v, (eventBefore, eventAfter) => objectWithUnknown(eventBefore, eventAfter, ['id', 'title', 'time', 'tickId', 'description', 'archiveIds'])),
      ticks: (u, v) => arrayMerge(u, v, (tickBefore, tickAfter) => objectWithUnknown(tickBefore, tickAfter, ['id', 'label'])),
    })),
    canvases: (a, b) => arrayMerge(a, b, (x, y) => objectWithUnknown(x, y, ['id', 'name', 'graph', 'snapshots', 'viewport'], {
      graph: mergeGraph,
      viewport: (r, s) => objectWithUnknown(r, s, ['x', 'y', 'z']),
      snapshots: (r, s) => arrayMerge(r, s, (m, n) => objectWithUnknown(m, n, ['id', 'label', 'time', 'auto', 'graph', 'counts'], {
        graph: mergeGraph, counts: (u, v) => objectWithUnknown(u, v, ['nodes', 'edges']),
      })),
    })),
    presets: (a, b) => arrayMerge(a, b, (x, y) => objectWithUnknown(x, y, ['id', 'name', 'modules', 'updated'], { modules: (r, s) => arrayMerge(r, s, mergeModule) })),
  });
}

export function createProject(name = '未命名工程') {
  const now = Date.now();
  return { format: FORMAT, schemaVersion: VERSION, id: randomUUID(), name: String(name).trim() || '未命名工程', createdAt: now, updatedAt: now, tree: [], records: {}, canvases: [], presets: [], wiki: [], timelines: [] };
}

function checkedRelative(relative) {
  if (typeof relative !== 'string' || relative.includes('\0') || relative.includes('\\') || relative.includes(':') || /[?#]/.test(relative)) throw error('图片路径无效。图片必须位于工程的 media 文件夹内。');
  const parts = relative.split('/');
  if (parts[0] !== 'media' || parts.length < 2 || parts.some(part => !part || part === '.' || part === '..')) throw error('图片路径越出了工程的 media 文件夹。');
  return parts;
}

export function validateProject(input) {
  if (!plain(input)) throw error('工程 JSON 的根节点必须是对象。', 'INVALID_PROJECT');
  if (input.schemaVersion > VERSION) throw error(`这个工程使用 schemaVersion ${input.schemaVersion}，当前软件仅支持 ${VERSION}。请使用更新的软件打开；未覆盖工程。`, 'FUTURE_VERSION');
  if (input.format !== undefined && input.format !== FORMAT) throw error('这不是 T.Tool 工程文件。', 'INVALID_PROJECT');
  let project = input;
  if (input.schemaVersion === undefined || input.schemaVersion === 0) {
    if (!Array.isArray(input.tree) || (!plain(input.records) && !Array.isArray(input.archives))) throw error('无法识别旧工程结构。未改动原文件。', 'INVALID_PROJECT');
    const defaults = createProject(input.name);
    project = { ...defaults, ...input, format: FORMAT, schemaVersion: VERSION };
    if (!plain(project.records)) project.records = Object.fromEntries(input.archives.map(item => [item.id, { tags: [], body: '', modules: [], media: [], ...item }]));
    project.records = Object.fromEntries(Object.entries(project.records).map(([id, record]) => [id, { tags: [], body: '', modules: [], media: [], ...record }]));
    project.canvases = (project.canvases || []).map(canvas => ({ ...canvas, snapshots: canvas.snapshots || [] }));
  }
  if (project.schemaVersion !== VERSION || project.format !== FORMAT || typeof project.id !== 'string' || typeof project.name !== 'string' || !Number.isFinite(project.createdAt) || !Number.isFinite(project.updatedAt) || !Array.isArray(project.tree) || !plain(project.records) || !Array.isArray(project.canvases) || !Array.isArray(project.presets) || !Array.isArray(project.wiki || []) || !Array.isArray(project.timelines || [])) throw error('工程结构不完整，无法安全读取或保存。', 'INVALID_PROJECT');
  project.wiki ||= [];
  project.timelines ||= [];
  const normalizeWiki = entries => entries.map(entry => {
    if (!plain(entry)) return entry;
    const normalized = entry.kind === undefined ? { ...entry, kind: 'entry' } : entry;
    return Array.isArray(normalized.children) ? { ...normalized, children: normalizeWiki(normalized.children) } : normalized;
  });
  project.wiki = normalizeWiki(project.wiki);
  const ids = new Set();
  const pending = project.tree.map(node => ({ node, depth: 0 }));
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (depth > 128 || !plain(node) || typeof node.id !== 'string' || !node.id || typeof node.name !== 'string' || (node.type !== undefined && typeof node.type !== 'string') || ids.has(node.id) || (node.children !== undefined && !Array.isArray(node.children))) throw error('项目树结构无效，可能存在重复档案或过深的层级。', 'INVALID_PROJECT');
    ids.add(node.id);
    if (node.children) for (const child of node.children) pending.push({ node: child, depth: depth + 1 });
  }
  for (const id of ids) if (!plain(project.records[id])) throw error('项目树中的档案缺少内容记录。', 'INVALID_PROJECT');
  for (const record of Object.values(project.records)) {
    if (!plain(record) || !Array.isArray(record.tags) || !record.tags.every(tag => typeof tag === 'string') || typeof record.body !== 'string' || !Array.isArray(record.modules) || !Array.isArray(record.media) || (record.workspace !== undefined && (!plain(record.workspace) || !Array.isArray(record.workspace.items)))) throw error('档案内容结构无效。', 'INVALID_PROJECT');
    if (record.workspace) for (const item of record.workspace.items) if (!plain(item) || typeof item.id !== 'string' || !['module', 'media'].includes(item.kind) || typeof item.refId !== 'string' || !Number.isFinite(item.x) || !Number.isFinite(item.y) || !Number.isFinite(item.w) || !Number.isFinite(item.h) || item.w <= 0 || item.h <= 0) throw error('档案工作区结构无效。', 'INVALID_PROJECT');
    const moduleIds = new Set();
    for (const module of record.modules) { validateModule(module, true); if (moduleIds.has(module.id)) throw error('档案中有重复的模块标识。', 'INVALID_PROJECT'); moduleIds.add(module.id); }
    const mediaIds = new Set();
    for (const media of record.media) {
      if (!plain(media) || typeof media.id !== 'string' || !media.id || mediaIds.has(media.id) || typeof media.name !== 'string' || typeof media.mime !== 'string') throw error('图片附件结构无效。', 'INVALID_PROJECT');
      mediaIds.add(media.id);
      checkedRelative(media.path);
    }
  }
  const canvasIds = new Set();
  for (const canvas of project.canvases) {
    if (!plain(canvas) || typeof canvas.id !== 'string' || typeof canvas.name !== 'string' || !plain(canvas.graph) || !Array.isArray(canvas.graph.nodes) || !Array.isArray(canvas.graph.edges) || !Array.isArray(canvas.snapshots)) throw error('关系画布结构无效。', 'INVALID_PROJECT');
    if (canvasIds.has(canvas.id)) throw error('关系画布标识重复。', 'INVALID_PROJECT'); canvasIds.add(canvas.id);
    validateGraph(canvas.graph);
    if (canvas.viewport !== undefined && (!plain(canvas.viewport) || !Number.isFinite(canvas.viewport.x) || !Number.isFinite(canvas.viewport.y) || !Number.isFinite(canvas.viewport.z) || canvas.viewport.z < 0.25 || canvas.viewport.z > 3)) throw error('画布视口结构无效。', 'INVALID_PROJECT');
    for (const snapshot of canvas.snapshots) {
      if (!plain(snapshot) || typeof snapshot.label !== 'string' || !Number.isFinite(snapshot.time) || (snapshot.id !== undefined && typeof snapshot.id !== 'string') || (snapshot.auto !== undefined && typeof snapshot.auto !== 'boolean') || (snapshot.graph !== undefined && (!plain(snapshot.graph) || !Array.isArray(snapshot.graph.nodes) || !Array.isArray(snapshot.graph.edges))) || (snapshot.counts !== undefined && (!plain(snapshot.counts) || !Number.isInteger(snapshot.counts.nodes) || snapshot.counts.nodes < 0 || !Number.isInteger(snapshot.counts.edges) || snapshot.counts.edges < 0))) throw error('历史快照结构无效。', 'INVALID_PROJECT');
      if (snapshot.graph) validateGraph(snapshot.graph);
    }
  }
  const wikiIds = new Set();
  const pendingWiki = project.wiki.map(entry => ({ entry, depth: 0 }));
  while (pendingWiki.length) {
    const { entry, depth } = pendingWiki.pop();
    if (depth > 128 || !plain(entry) || typeof entry.id !== 'string' || !entry.id || wikiIds.has(entry.id) || typeof entry.title !== 'string' || typeof entry.body !== 'string' || !Array.isArray(entry.tags) || !entry.tags.every(tag => typeof tag === 'string') || !Number.isFinite(entry.updatedAt) || (entry.archiveIds !== undefined && (!Array.isArray(entry.archiveIds) || !entry.archiveIds.every(id => typeof id === 'string'))) || (entry.kind !== 'entry' && entry.kind !== 'folder') || (entry.children !== undefined && !Array.isArray(entry.children))) throw error('世界观维基目录结构无效，可能存在重复词条或过深的层级。', 'INVALID_PROJECT');
    wikiIds.add(entry.id);
    if (entry.children) for (const child of entry.children) pendingWiki.push({ entry: child, depth: depth + 1 });
  }
  const timelineIds = new Set();
  const eventIds = new Set();
  for (const timeline of project.timelines) {
    if (!plain(timeline) || typeof timeline.id !== 'string' || !timeline.id || timelineIds.has(timeline.id) || typeof timeline.name !== 'string' || !Array.isArray(timeline.events)) throw error('时间线结构无效。', 'INVALID_PROJECT');
    timelineIds.add(timeline.id);
    const tickIds = new Set();
    for (const tick of timeline.ticks || []) {
      if (!plain(tick) || typeof tick.id !== 'string' || !tick.id || tickIds.has(tick.id) || typeof tick.label !== 'string' || !tick.label.trim()) throw error('时间线刻度结构无效。', 'INVALID_PROJECT');
      tickIds.add(tick.id);
    }
    if (timeline.ticks !== undefined && !Array.isArray(timeline.ticks)) throw error('时间线刻度结构无效。', 'INVALID_PROJECT');
    for (const event of timeline.events) {
      if (!plain(event) || typeof event.id !== 'string' || !event.id || eventIds.has(event.id) || typeof event.title !== 'string' || typeof event.time !== 'string' || (event.tickId !== undefined && typeof event.tickId !== 'string') || typeof event.description !== 'string' || !Array.isArray(event.archiveIds) || !event.archiveIds.every(id => typeof id === 'string')) throw error('时间线事件结构无效。', 'INVALID_PROJECT');
      eventIds.add(event.id);
    }
  }
  const presetIds = new Set();
  for (const preset of project.presets) {
    if (!plain(preset) || typeof preset.id !== 'string' || !preset.id || typeof preset.name !== 'string' || !Array.isArray(preset.modules) || presetIds.has(preset.id) || (preset.updated !== undefined && !Number.isFinite(preset.updated))) throw error('预设结构无效。', 'INVALID_PROJECT');
    presetIds.add(preset.id); for (const module of preset.modules) validateModule(module, false);
  }
  return project;
}

function validateModule(module, hasId) {
  const invalid = () => { throw error('模块内容结构无效，无法安全打开工程。', 'INVALID_PROJECT'); };
  if (!plain(module) || (hasId && typeof module.id !== 'string') || typeof module.kind !== 'string' || typeof module.title !== 'string' || !plain(module.data)) invalid();
  const data = module.data;
  if (module.kind === 'text') { if (typeof data.text !== 'string') invalid(); return; }
  if (!['number', 'axis', 'radar', 'bool'].includes(module.kind)) return; // Unknown module kinds remain intact for compatibility.
  if (!Array.isArray(data.rows)) invalid();
  if (module.kind === 'radar' && (!Number.isFinite(data.max) || data.max <= 0)) invalid();
  for (const row of data.rows) {
    if (!plain(row)) invalid();
    if (module.kind === 'number' && (typeof row.label !== 'string' || typeof row.value !== 'string' || (row.unit !== undefined && typeof row.unit !== 'string'))) invalid();
    if (module.kind === 'axis' && (typeof row.left !== 'string' || typeof row.right !== 'string' || !Number.isFinite(row.value) || row.value < -100 || row.value > 100)) invalid();
    // Reducing the design component's maximum retains existing scores.
    if (module.kind === 'radar' && (typeof row.name !== 'string' || !Number.isFinite(row.value) || row.value < 0)) invalid();
    if (module.kind === 'bool' && (typeof row.statement !== 'string' || typeof row.yes !== 'string' || typeof row.no !== 'string' || ![true, false, null].includes(row.value))) invalid();
  }
}
function validateGraph(graph) {
  const invalid = () => { throw error('关系画布包含无效方块、从属循环或重复关系，无法安全打开工程。', 'INVALID_PROJECT'); };
  if (!plain(graph) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) invalid();
  const nodes = new Map();
  for (const node of graph.nodes) {
    if (!plain(node) || typeof node.id !== 'string' || nodes.has(node.id) || !['ref', 'note'].includes(node.kind) || typeof node.title !== 'string' || !Number.isFinite(node.x) || !Number.isFinite(node.y) || (node.archiveId !== undefined && typeof node.archiveId !== 'string') || (node.parent !== undefined && typeof node.parent !== 'string') || (node.collapsed !== undefined && typeof node.collapsed !== 'boolean') || (node.archiveDeleted !== undefined && typeof node.archiveDeleted !== 'boolean') || (node.displayNameEdited !== undefined && typeof node.displayNameEdited !== 'boolean') || (node.imagePath !== undefined && (typeof node.imagePath !== 'string' || !checkedRelative(node.imagePath)))) invalid();
    nodes.set(node.id, node);
  }
  const completed = new Set();
  for (const node of nodes.values()) {
    const chain = new Set(); let current = node;
    while (current && !completed.has(current.id)) {
      if (chain.has(current.id)) invalid(); chain.add(current.id);
      if (current.parent && !nodes.has(current.parent)) invalid();
      current = current.parent ? nodes.get(current.parent) : null;
    }
    for (const id of chain) completed.add(id);
  }
  const edgeIds = new Set(), directions = new Map();
  for (const edge of graph.edges) {
    if (!plain(edge) || typeof edge.id !== 'string' || edgeIds.has(edge.id) || typeof edge.from !== 'string' || typeof edge.to !== 'string' || edge.from === edge.to || !nodes.has(edge.from) || !nodes.has(edge.to) || typeof edge.label !== 'string') invalid();
    if ((edge.labelPosition !== undefined && (!Number.isFinite(edge.labelPosition) || edge.labelPosition < 0 || edge.labelPosition > 1)) ||
        (edge.labelWidth !== undefined && (!Number.isFinite(edge.labelWidth) || edge.labelWidth < 48 || edge.labelWidth > 640)) ||
        (edge.labelHeight !== undefined && (!Number.isFinite(edge.labelHeight) || edge.labelHeight < 24 || edge.labelHeight > 320))) invalid();
    edgeIds.add(edge.id);
    const outgoing = directions.get(edge.from) || new Set();
    if (outgoing.has(edge.to)) invalid(); outgoing.add(edge.to); directions.set(edge.from, outgoing);
  }
}

async function regularFile(file) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw error('拒绝读取符号链接或非普通文件。');
  return stat;
}
async function digestFile(file) {
  const stat = await regularFile(file);
  if (stat.size > MAX_JSON_BYTES) throw error('工程 JSON 超过 64 MB，无法安全处理。请拆分工程。');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function readProjectFile(file) {
  const stat = await regularFile(file);
  if (stat.size > MAX_JSON_BYTES) throw error('工程 JSON 超过 64 MB，无法安全处理。请拆分工程。');
  const bytes = await fs.readFile(file);
  let raw;
  try { raw = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw error('project.json 已损坏，无法解析 JSON。', 'INVALID_PROJECT'); }
  return { project: validateProject(raw), fingerprint: createHash('sha256').update(bytes).digest('hex') };
}

export async function resolveMediaFile(directory, relative) {
  const parts = checkedRelative(relative);
  const realDirectory = await fs.realpath(directory);
  let target = realDirectory;
  for (let index = 0; index < parts.length; index++) {
    target = path.join(target, parts[index]);
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw error('拒绝读取 media 中的符号链接或异常路径。');
  }
  if (!inPath(path.join(realDirectory, 'media'), await fs.realpath(target))) throw error('图片路径越出了工程的 media 文件夹。');
  return target;
}

async function acquireLock(directory) {
  const file = path.join(directory, '.t-tool.lock');
  const token = randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await fs.open(file, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, host: os.hostname(), token, createdAt: Date.now() }));
      await handle.sync(); await handle.close();
      return { file, token };
    } catch (cause) {
      if (cause.code !== 'EEXIST') throw cause;
      let previous;
      try { previous = await readLock(file); } catch { throw error('工程锁文件无效。请确认没有其他软件正在打开此工程后，手动移除 .t-tool.lock。'); }
      if (previous.host !== os.hostname() || !Number.isInteger(previous.pid)) throw error('此工程已被另一台电脑或另一个程序占用。');
      let alive = true;
      try { process.kill(previous.pid, 0); } catch (cause) { if (cause.code === 'ESRCH') alive = false; }
      if (alive) throw error('此工程正在另一个 T.Tool 窗口中打开。请先关闭那个窗口。');
      const check = await readLock(file);
      if (check.token !== previous.token) throw error('工程锁发生变化，请重新打开工程。');
      await fs.unlink(file);
    }
  }
  throw error('工程锁建立失败。');
}
async function readLock(file) {
  if ((await regularFile(file)).size > 4096) throw error('工程锁文件无效。');
  const value = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!plain(value) || typeof value.token !== 'string') throw error('工程锁文件无效。');
  return value;
}
async function assertLock(lock) {
  const current = await readLock(lock.file);
  if (current.token !== lock.token) throw error('工程写入锁已失效。请重新打开工程后再保存。');
}
async function releaseLock(lock) {
  if (!lock) return;
  try { const current = await readLock(lock.file); if (current.token === lock.token) await fs.unlink(lock.file); } catch { /* A missing or externally replaced lock must never be removed. */ }
}
async function atomicJson(file, value, { backup = false, beforeCommit } = {}) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (Buffer.byteLength(bytes) > MAX_JSON_BYTES) throw error('工程 JSON 超过 64 MB，未保存。请拆分工程。');
  const temporary = `${file}.${randomUUID()}.tmp`;
  const backupTemporary = `${file}.${randomUUID()}.bak.tmp`;
  try {
    const handle = await fs.open(temporary, 'wx');
    try { await handle.writeFile(bytes, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    if (beforeCommit) await beforeCommit();
    if (backup) {
      await regularFile(file);
      await fs.copyFile(file, backupTemporary);
      const backupHandle = await fs.open(backupTemporary, 'r+'); try { await backupHandle.sync(); } finally { await backupHandle.close(); }
      await fs.rename(backupTemporary, file + '.bak');
      if (beforeCommit) await beforeCommit();
    }
    await fs.rename(temporary, file);
    return createHash('sha256').update(bytes).digest('hex');
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
    await fs.rm(backupTemporary, { force: true }).catch(() => {});
  }
}

/** The scanner reads at most 1 MB; copying and ZIP export use bounded streams. */
async function imageInfo(file) {
  const stat = await regularFile(file);
  if (!stat.size || stat.size > MAX_IMAGE_BYTES) throw error('单张图片必须大于 0 字节且不超过 50 MB。');
  const handle = await fs.open(file, 'r');
  const buffer = Buffer.alloc(Math.min(stat.size, 1024 * 1024));
  try { await handle.read(buffer, 0, buffer.length, 0); } finally { await handle.close(); }
  let mime, extension, width, height;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString('ascii', 12, 16) === 'IHDR') {
    mime = 'image/png'; extension = '.png'; width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
  } else if (buffer.length >= 10 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) {
    mime = 'image/gif'; extension = '.gif'; width = buffer.readUInt16LE(6); height = buffer.readUInt16LE(8);
  } else if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    mime = 'image/webp'; extension = '.webp';
    const kind = buffer.toString('ascii', 12, 16);
    if (kind === 'VP8X') { width = buffer.readUIntLE(24, 3) + 1; height = buffer.readUIntLE(27, 3) + 1; }
    else if (kind === 'VP8L' && buffer[20] === 0x2f) { const bits = buffer.readUInt32LE(21); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
    else if (kind === 'VP8 ' && buffer.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) { width = buffer.readUInt16LE(26) & 0x3fff; height = buffer.readUInt16LE(28) & 0x3fff; }
  } else if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    mime = 'image/jpeg'; extension = '.jpg';
    let offset = 2;
    while (offset + 4 < buffer.length) {
      if (buffer[offset++] !== 0xff) continue;
      while (buffer[offset] === 0xff) offset++;
      const marker = buffer[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) { height = buffer.readUInt16BE(offset + 3); width = buffer.readUInt16BE(offset + 5); break; }
      offset += length;
    }
  }
  if (!mime || !width || !height) throw error('图片格式无效。支持 PNG、JPEG、GIF 和 WebP，格式由文件内容校验。');
  if (width * height > MAX_IMAGE_PIXELS) throw error('图片超过 4000 万像素，请缩小后再导入。');
  return { mime, extension, size: stat.size };
}

async function* mediaFiles(directory, relative = 'media') {
  const target = path.join(directory, relative);
  let stat;
  try { stat = await fs.lstat(target); } catch (cause) { if (cause.code === 'ENOENT') return; throw cause; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw error('media 文件夹不能是符号链接或普通文件。');
  const entries = await fs.opendir(target);
  for await (const entry of entries) {
    const child = relative + '/' + entry.name;
    if (entry.isSymbolicLink()) throw error('media 内含符号链接，无法安全复制或导出。');
    if (entry.isDirectory()) yield* mediaFiles(directory, child);
    else if (entry.isFile()) { await resolveMediaFile(directory, child); yield child; }
    else throw error('media 内含异常文件，无法安全复制或导出。');
  }
}

export class ProjectStore {
  constructor(userData) { this.userData = userData; this.current = null; this.busy = false; this.preferenceQueue = Promise.resolve(); }
  get directory() { return this.current?.directory; }
  async operation(task) {
    if (this.busy) return fail('另一个工程操作正在进行，请稍后再试。');
    this.busy = true;
    try { return await task(); } catch (cause) { return fail(cause); } finally { this.busy = false; }
  }
  async dispose() { await releaseLock(this.current?.lock); this.current = null; }
  async readPreferences() {
    try {
      const file = path.join(this.userData, 'preferences.json');
      if ((await regularFile(file)).size > 1024 * 1024) throw error('偏好文件过大。');
      const raw = JSON.parse(await fs.readFile(file, 'utf8'));
      return { ok: true, preferences: { theme: raw.theme === 'dark' ? 'dark' : 'light', recentProjects: Array.isArray(raw.recentProjects) ? raw.recentProjects.filter(item => typeof item?.name === 'string' && typeof item?.path === 'string').slice(0, 12) : [] } };
    } catch { return { ok: true, preferences: { theme: 'light', recentProjects: [] } }; }
  }
  async updatePreferences(change) {
    const task = this.preferenceQueue.then(async () => {
      await fs.mkdir(this.userData, { recursive: true });
      const { preferences } = await this.readPreferences();
      const next = change(preferences);
      await atomicJson(path.join(this.userData, 'preferences.json'), next);
      return { ok: true, preferences: next };
    }).catch(fail);
    this.preferenceQueue = task.then(() => {});
    return task;
  }
  async writePreferences(value) {
    if (!plain(value) || !['light', 'dark'].includes(value.theme)) return fail('主题设置无效。');
    return this.updatePreferences(before => ({ ...before, theme: value.theme }));
  }
  async remember(project, directory) {
    return this.updatePreferences(before => ({ ...before, recentProjects: [{ name: project.name, path: directory }, ...before.recentProjects.filter(item => !samePath(item.path, directory))].slice(0, 12) }));
  }
  async prepareProject(project) {
    if (!this.current) throw error('请先新建或打开工程。');
    const validated = validateProject(project);
    if (validated.id !== this.current.project.id) throw error('工程标识与当前打开的工程不同，拒绝覆盖。');
    const next = preserveUnknown(this.current.project, validated);
    next.updatedAt = Date.now();
    for (const record of Object.values(next.records)) for (const media of record.media) await resolveMediaFile(this.current.directory, media.path);
    for (const relative of canvasImagePaths(next)) await resolveMediaFile(this.current.directory, relative);
    return next;
  }
  async assertUnchanged() {
    await assertLock(this.current.lock);
    let fingerprint;
    try { fingerprint = await digestFile(path.join(this.current.directory, 'project.json')); }
    catch (cause) { throw error(`工程文件已被外部删除、占用或替换，未保存。${cause.message}`); }
    if (fingerprint !== this.current.fingerprint) throw error('project.json 已被其他程序修改，未覆盖。请先另存工程以保留当前编辑，再重新打开原工程。');
  }
  async create(directory, name) {
    return this.operation(async () => {
      await fs.mkdir(directory, { recursive: true });
      directory = await fs.realpath(directory);
      if ((await fs.readdir(directory)).length) throw error('新建工程请选择空文件夹，避免覆盖其他文件。');
      try { await fs.lstat(path.join(directory, 'project.json')); throw error('这个文件夹已经有 project.json，请选择一个新的工程文件夹。'); } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
      const lock = await acquireLock(directory);
      try {
        await fs.mkdir(path.join(directory, 'media'), { recursive: true });
        const mediaStat = await fs.lstat(path.join(directory, 'media')); if (mediaStat.isSymbolicLink() || !mediaStat.isDirectory()) throw error('media 文件夹不能是符号链接。');
        const project = createProject(name);
        const fingerprint = await atomicJson(path.join(directory, 'project.json'), project, { beforeCommit: () => assertLock(lock) });
        await releaseLock(this.current?.lock); this.current = { directory, lock, project, fingerprint, recovered: false };
        await this.remember(project, directory);
        return { ok: true, project, path: directory };
      } catch (cause) { await releaseLock(lock); throw cause; }
    });
  }
  async open(selected) {
    return this.operation(async () => {
      let directory;
      const stat = await fs.lstat(selected);
      if (stat.isDirectory()) directory = await fs.realpath(selected);
      else { if (path.basename(selected).toLowerCase() !== 'project.json' || stat.isSymbolicLink()) throw error('请选择工程文件夹里的 project.json。'); directory = await fs.realpath(path.dirname(selected)); }
      const reused = this.current && samePath(directory, this.current.directory);
      const lock = reused ? this.current.lock : await acquireLock(directory);
      try {
        let loaded, recovered = false;
        const projectFile = path.join(directory, 'project.json');
        try { loaded = await readProjectFile(projectFile); }
        catch (cause) {
          if (cause.code !== 'INVALID_PROJECT') throw cause;
          try { const backup = await readProjectFile(projectFile + '.bak'); loaded = { project: backup.project, fingerprint: await digestFile(projectFile) }; recovered = true; }
          catch (backupError) { throw error(`${cause.message} 备份也无法恢复：${backupError.message}`); }
        }
        let missingMedia = false;
        for (const record of Object.values(loaded.project.records)) for (const media of record.media) {
          try { await resolveMediaFile(directory, media.path); } catch (cause) { if (cause.code === 'ENOENT') missingMedia = true; else throw cause; }
        }
        for (const relative of canvasImagePaths(loaded.project)) {
          try { await resolveMediaFile(directory, relative); } catch (cause) { if (cause.code === 'ENOENT') missingMedia = true; else throw cause; }
        }
        if (!reused) await releaseLock(this.current?.lock);
        this.current = { directory, lock, ...loaded, recovered };
        await this.remember(loaded.project, directory);
        const notices = [];
        if (recovered) notices.push('project.json 已损坏，已从 project.json.bak 恢复。保存后会修复工程；有效备份会保留。');
        if (missingMedia) notices.push('工程中有图片附件缺失。请把 media 文件夹和 project.json 一起放回工程文件夹。');
        return { ok: true, project: loaded.project, path: directory, ...(notices.length ? { error: notices.join(' ') } : {}) };
      } catch (cause) { if (!reused) await releaseLock(lock); throw cause; }
    });
  }
  async openRecent(directory) {
    const { preferences } = await this.readPreferences();
    if (typeof directory !== 'string' || !preferences.recentProjects.some(item => samePath(item.path, directory))) return fail('这个路径不在最近工程列表中。请使用“打开工程”。');
    return this.open(directory);
  }
  async save(project) {
    return this.operation(async () => {
      const next = await this.prepareProject(project);
      await this.assertUnchanged();
      const fingerprint = await atomicJson(path.join(this.current.directory, 'project.json'), next, { backup: !this.current.recovered, beforeCommit: () => this.assertUnchanged() });
      this.current.project = next; this.current.fingerprint = fingerprint; this.current.recovered = false;
      await this.remember(next, this.current.directory);
      return { ok: true, project: next, path: this.current.directory };
    });
  }
  async saveAs(project, directory) {
    return this.operation(async () => {
      const source = this.current?.project.id === project?.id ? this.current : null;
      const next = source ? await this.prepareProject(project) : validateProject(project);
      if (!source && Object.values(next.records).some(record => record.media.length)) throw error('此工程图片没有来源文件夹，无法另存。请先打开原工程。');
      next.updatedAt = Date.now();
      await fs.mkdir(directory, { recursive: true });
      directory = await fs.realpath(directory);
      if (this.current && (samePath(directory, this.current.directory) || inPath(path.join(this.current.directory, 'media'), directory))) throw error('另存工程必须选择源工程 media 之外的新文件夹。');
      const entries = await fs.readdir(directory);
      if (entries.length) throw error('另存工程请选择空文件夹，避免覆盖其他文件。');
      const lock = await acquireLock(directory);
      const staging = path.join(directory, '.media-' + randomUUID());
      let installedMedia = false;
      try {
        await fs.mkdir(staging);
        for await (const relative of source ? mediaFiles(source.directory) : []) {
          const sourceFile = await resolveMediaFile(source.directory, relative);
          const target = path.join(staging, ...relative.split('/').slice(1));
          await fs.mkdir(path.dirname(target), { recursive: true });
          await pipeline(createReadStream(sourceFile), createWriteStream(target, { flags: 'wx' }));
        }
        await assertLock(lock);
        await fs.rename(staging, path.join(directory, 'media')); installedMedia = true;
        const fingerprint = await atomicJson(path.join(directory, 'project.json'), next, { beforeCommit: () => assertLock(lock) });
        await releaseLock(this.current?.lock);
        this.current = { directory, lock, project: next, fingerprint, recovered: false };
        await this.remember(next, directory);
        return { ok: true, project: next, path: directory };
      } catch (cause) {
        await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
        if (installedMedia) await fs.rm(path.join(directory, 'media'), { recursive: true, force: true }).catch(() => {});
        await releaseLock(lock); throw cause;
      }
    });
  }
  async copyMedia(files) {
    const directory = path.join(this.current.directory, 'media');
    await fs.mkdir(directory, { recursive: true });
    const stat = await fs.lstat(directory); if (stat.isSymbolicLink() || !stat.isDirectory()) throw error('media 文件夹不能是符号链接。');
    const copied = [], media = [];
    try {
      for (const file of files) {
        const info = await imageInfo(file);
        const id = randomUUID(); const relative = `media/${id}${info.extension}`; const target = path.join(directory, id + info.extension);
        copied.push(target);
        // Bound reads even if another program grows the selected image mid-copy.
        await pipeline(createReadStream(file, { end: info.size - 1 }), createWriteStream(target, { flags: 'wx' }));
        const imported = await imageInfo(target); if (imported.size !== info.size || imported.mime !== info.mime) throw error('复制时图片源文件发生变化，请重新导入。');
        if ((await regularFile(file)).size !== info.size) throw error('复制时图片源文件大小发生变化，请重新导入。');
        media.push({ id, name: path.basename(file), path: relative, mime: info.mime });
      }
      await assertLock(this.current.lock);
      return media;
    } catch (cause) { for (const file of copied) await fs.rm(file, { force: true }).catch(() => {}); throw cause; }
  }
  async importMedia(files) {
    return this.operation(async () => {
      if (!this.current) throw error('请先新建或打开工程，再添加图片。');
      await this.assertUnchanged();
      return { ok: true, media: await this.copyMedia(files) };
    });
  }
  async importNodeImage(file) {
    return this.operation(async () => {
      if (!this.current) throw error('请先新建或打开工程，再导入节点图片。');
      await this.assertUnchanged();
      const media = await this.copyMedia([file]);
      return { ok: true, nodeImage: media[0], path: media[0].path };
    });
  }
  async export(project, exportPath) {
    return this.operation(async () => {
      const next = await this.prepareProject(project);
      if (typeof exportPath !== 'string' || path.extname(exportPath).toLowerCase() !== '.zip') throw error('导出文件必须使用 .zip 扩展名。');
      const parent = await fs.realpath(path.dirname(exportPath)); exportPath = path.join(parent, path.basename(exportPath));
      if (inPath(path.join(this.current.directory, 'media'), exportPath) || samePath(exportPath, path.join(this.current.directory, 'project.json'))) throw error('导出文件不能覆盖源工程或写进源工程的 media 文件夹。');
      await assertLock(this.current.lock);
      const { default: yazl } = await import('yazl');
      const zip = new yazl.ZipFile();
      const temporary = exportPath + '.' + randomUUID() + '.tmp';
      let output;
      try {
        const serialized = JSON.stringify(next, null, 2) + '\n';
        if (Buffer.byteLength(serialized) > MAX_JSON_BYTES) throw error('工程 JSON 超过 64 MB，未导出。请拆分工程。');
        zip.addBuffer(Buffer.from(serialized), 'project.json');
        zip.addEmptyDirectory('media');
        const transfer = pipeline(zip.outputStream, createWriteStream(temporary, { flags: 'wx' }));
        // Attach rejection immediately; enumeration may take longer than output failures.
        transfer.catch(() => {});
        for await (const relative of mediaFiles(this.current.directory)) zip.addFile(await resolveMediaFile(this.current.directory, relative), relative);
        zip.end();
        await transfer;
        output = await fs.open(temporary, 'r+'); await output.sync(); await output.close(); output = undefined;
        await fs.rename(temporary, exportPath);
        return { ok: true, exportPath };
      } catch (cause) { zip.outputStream.destroy(); throw cause; }
      finally { if (output) await output.close().catch(() => {}); await fs.rm(temporary, { force: true }).catch(() => {}); }
    });
  }
}
