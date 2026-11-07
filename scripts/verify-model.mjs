import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  collectIds, countTree, createExampleProject, createProject, emptyRecord,
  findNode, flattenTree, fromPreset, reconcileProject, toPreset,
} from '../src/model.ts';

const blank = createProject('');
assert.equal(blank.name, '');
assert.equal(blank.format, 't-tool');
assert.deepEqual(blank.tree, []);
assert.deepEqual(blank.records, {});
assert.deepEqual(blank.presets, []);
assert.deepEqual(blank.canvases[0].graph, { nodes: [], edges: [] });
assert.equal(reconcileProject(blank), blank);
assert.notEqual(emptyRecord().modules, emptyRecord().modules);

const example = createExampleProject();
example.wiki = [{ id: 'wiki-folder', title: '设定', body: '', tags: [], updatedAt: 1, kind: 'folder', children: [{ id: 'wiki-entry', title: '潮汐', body: '正文', tags: [], updatedAt: 1, kind: 'entry' }] }];
assert.equal(example.wiki[0].children[0].kind, 'entry');
assert.equal(example.example, true);
assert.equal(countTree(example.tree), 10);
assert.equal(flattenTree(example.tree).length, 10);
assert.equal(findNode(example.tree, 'c1').name, '林晚');
assert.deepEqual([...collectIds(findNode(example.tree, 'c'))], ['c', 'c1', 'c2', 'c3']);
assert.equal(Object.keys(example.records).length, 10);
assert.equal(reconcileProject(example), example);

const fullModules = [
  { id: 'a', kind: 'text', title: '正文', data: { text: '用户内容' } },
  { id: 'b', kind: 'number', title: '数值', data: { rows: [{ label: '年龄', value: '27', unit: '岁' }] } },
  { id: 'c', kind: 'axis', title: '倾向', data: { rows: [{ left: '保守', right: '激进', value: 87 }] } },
  { id: 'd', kind: 'radar', title: '能力', data: { max: 20, rows: [{ name: '力', value: 9 }] } },
  { id: 'e', kind: 'bool', title: '状态', data: { rows: [{ statement: '是否知道？', value: false, yes: '知道', no: '不知道' }] } },
];
const modulesBefore = JSON.stringify(fullModules);
const stripped = toPreset(fullModules);
assert.equal(JSON.stringify(fullModules), modulesBefore);
assert.deepEqual(stripped.map(module => module.data), [
  { text: '' },
  { rows: [{ label: '年龄', value: '', unit: '岁' }] },
  { rows: [{ left: '保守', right: '激进', value: 0 }] },
  { max: 20, rows: [{ name: '力', value: 0 }] },
  { rows: [{ statement: '是否知道？', value: null, yes: '知道', no: '不知道' }] },
]);
assert.ok(stripped.every(module => !Object.hasOwn(module, 'id')));
const imported = fromPreset({ id: 'p', name: '结构', modules: stripped });
const importedAgain = fromPreset({ id: 'p', name: '结构', modules: stripped });
assert.notEqual(imported[0].id, importedAgain[0].id);
imported[1].data.rows[0].value = '新内容';
assert.equal(stripped[1].data.rows[0].value, '');

const historicalGraph = structuredClone(example.canvases[0].graph);
const source = {
  ...example,
  futureField: { retained: true },
  records: { ...example.records, c1: { ...example.records.c1, futureRecord: { retained: true } } },
  canvases: example.canvases.map((canvas, index) => index === 0 ? {
    ...canvas,
    futureCanvas: { retained: true },
    snapshots: [{ id: 's1', label: '原图', time: 1, graph: historicalGraph }],
  } : canvas),
};
const sourceBefore = JSON.stringify(source);
const edited = {
  ...source,
  tree: source.tree.map(node => node.id === 'c' ? {
    ...node,
    children: node.children.filter(child => child.id !== 'c2').map(child => child.id === 'c1'
      ? { ...child, name: '林晚的新名字', type: '自由分类，不受系统限制' }
      : child),
  } : node),
};
const result = reconcileProject(edited);
assert.equal(JSON.stringify(source), sourceBefore, 'reconciliation must not mutate the source');
assert.equal(result.futureField, source.futureField);
assert.equal(result.records.c1.futureRecord, source.records.c1.futureRecord);
assert.equal(result.canvases[0].futureCanvas, source.canvases[0].futureCanvas);
assert.equal(result.tree, edited.tree);
assert.equal(result.presets, source.presets);
assert.equal(result.records.f1, source.records.f1);
assert.ok(!Object.hasOwn(result.records, 'c2'));
assert.equal(result.canvases[0].graph.nodes.find(node => node.id === 'a').title, '林晚的新名字');
assert.equal(result.canvases[0].graph.nodes.find(node => node.id === 'a').type, '自由分类，不受系统限制');
assert.equal(result.canvases[0].graph.nodes.find(node => node.id === 'b').archiveDeleted, true);
assert.equal(result.canvases[0].graph.nodes.find(node => node.id === 'b').kind, 'ref');
assert.equal(result.canvases[0].graph.nodes.find(node => node.id === 'b').archiveId, 'c2');
assert.equal(result.canvases[0].graph.edges, source.canvases[0].graph.edges);
assert.equal(result.canvases[0].snapshots, source.canvases[0].snapshots);
assert.equal(result.canvases[0].snapshots[0].graph, historicalGraph);
assert.equal(historicalGraph.nodes.find(node => node.id === 'a').title, '林晚');
assert.equal(result.canvases[1].graph.nodes.find(node => node.id === 'x1').title, '少女时代的林晚');
assert.equal(result.canvases[2], source.canvases[2]);
assert.equal(reconcileProject(result), result, 'an already reconciled project must be shared');

// Legacy references infer custom display names before overwriting archive metadata.
const legacy = createProject('兼容');
legacy.tree = [{ id: 'z', name: '新名称' }];
legacy.canvases[0].graph.nodes = [
  { id: 'r1', kind: 'ref', archiveId: 'z', archive: '旧名称', title: '旧名称', x: 0, y: 0 },
  { id: 'r2', kind: 'ref', archiveId: 'z', archive: '旧名称', title: '自定义显示名', x: 0, y: 0 },
];
const legacyResult = reconcileProject(legacy);
assert.equal(legacyResult.canvases[0].graph.nodes[0].title, '新名称');
assert.equal(legacyResult.canvases[0].graph.nodes[0].displayNameEdited, false);
assert.equal(legacyResult.canvases[0].graph.nodes[1].title, '自定义显示名');
assert.equal(legacyResult.canvases[0].graph.nodes[1].displayNameEdited, true);

// Traversal uses O(depth) frames without recursive stack overflow or payload cloning.
let nested = { id: 'depth-20000', name: '' };
for (let index = 19999; index >= 0; index--) nested = { id: `depth-${index}`, name: '', children: [nested] };
assert.equal(countTree([nested]), 20001);
assert.equal(findNode([nested], 'depth-20000').id, 'depth-20000');

// Representative archive reconciliation: 25,000 archives/references, one renamed item.
const size = 25000;
const large = createProject('容量验证');
large.tree = Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, name: `档案${index}` }));
large.records = Object.fromEntries(large.tree.map(node => [node.id, emptyRecord()]));
large.canvases[0].graph.nodes = large.tree.map((node, index) => ({
  id: `ref-${index}`, kind: 'ref', archiveId: node.id, archive: node.name,
  title: node.name, x: index, y: 0, displayNameEdited: false,
}));
large.tree[0] = { ...large.tree[0], name: '修改名称' };
globalThis.gc?.();
const before = process.memoryUsage().heapUsed;
const started = performance.now();
const largeResult = reconcileProject(large);
const elapsed = performance.now() - started;
const sampledIncrease = process.memoryUsage().heapUsed - before;
assert.equal(largeResult.records, large.records);
assert.equal(largeResult.canvases[0].graph.nodes[1], large.canvases[0].graph.nodes[1]);
assert.equal(largeResult.canvases[0].graph.edges, large.canvases[0].graph.edges);
assert.equal(largeResult.canvases[0].snapshots, large.canvases[0].snapshots);
assert.equal(largeResult.canvases[0].graph.nodes.filter((node, index) => node !== large.canvases[0].graph.nodes[index]).length, 1);
console.log(`模型验证通过；${size.toLocaleString('en-US')} 个档案与引用的单项改名：${elapsed.toFixed(1)} ms，采样堆增量 ${(sampledIncrease / 1024 / 1024).toFixed(2)} MiB（包含临时索引；非进程峰值）。`);
