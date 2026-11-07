// Critical file-safety verification, runnable without launching Electron.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { ProjectStore, createProject, resolveMediaFile, validateProject, MAX_IMAGE_BYTES } from '../electron/storage.mjs';

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 't-tool-storage-'));
const stores = [];
const makeStore = name => { const store = new ProjectStore(path.join(temporary, name)); stores.push(store); return store; };
const ok = result => { assert.equal(result.ok, true, result.error); return result; };
const rejected = result => { assert.equal(result.ok, false); assert.equal(typeof result.error, 'string'); return result; };
const hash = async file => { const result = createHash('sha256'); for await (const chunk of createReadStream(file)) result.update(chunk); return result.digest('hex'); };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64');
function zipEntries(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert(end >= 0, 'ZIP end record is present');
  const count = buffer.readUInt16LE(end + 10), files = new Map(); let offset = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20), filenameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30), commentLength = buffer.readUInt16LE(offset + 32), localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + filenameLength);
    const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const contents = buffer.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(contents) : Buffer.from(contents));
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return files;
}

try {
  const store = makeStore('preferences'), directory = path.join(temporary, '工程');
  let project = ok(await store.create(directory, '离线工程')).project;
  project.tree = [{ id: 'archive', name: '林晚', vendorNode: { preserved: true } }];
  project.records.archive = { tags: [], body: '第一幕', modules: [{ id: 'module', kind: 'text', title: '简介', data: { text: '正文', vendorData: 17 }, vendorModule: 'keep' }], media: [], vendorRecord: 18 };
  project.vendorRoot = { answer: 42 };
  project.wiki = [{ id: 'wiki-keep', title: '保留词条', body: '', tags: [], updatedAt: 1, kind: 'entry', vendorWiki: { retained: true } }];
  project.canvases = [{ id: 'canvas-keep', name: '画布', graph: { nodes: [{ id: 'node-keep', kind: 'note', title: '节点', x: 0, y: 0, vendorNode: { retained: true } }], edges: [] }, snapshots: [] }];
  project.timelines = [{ id: 'timeline-keep', name: '年代', events: [], ticks: [{ id: 'tick-keep', label: '纪元 120' }] }];
  project = ok(await store.save(project)).project;
  assert.equal(project.timelines[0].ticks[0].id, 'tick-keep');
  assert.equal(project.timelines[0].ticks[0].label, '纪元 120');
  const invalidTick = structuredClone(project); invalidTick.timelines[0].ticks[0].label = '  '; rejected(await store.save(invalidTick));
  const stripped = structuredClone(project);
  delete stripped.vendorRoot; delete stripped.tree[0].vendorNode; delete stripped.records.archive.vendorRecord; delete stripped.records.archive.modules[0].vendorModule; delete stripped.records.archive.modules[0].data.vendorData; delete stripped.wiki[0].vendorWiki; delete stripped.canvases[0].graph.nodes[0].vendorNode;
  project = ok(await store.save(stripped)).project;
  assert.equal(project.vendorRoot.answer, 42); assert.equal(project.tree[0].vendorNode.preserved, true); assert.equal(project.records.archive.modules[0].data.vendorData, 17); assert.equal(project.records.archive.vendorRecord, 18); assert.equal(project.wiki[0].vendorWiki.retained, true); assert.equal(project.canvases[0].graph.nodes[0].vendorNode.retained, true);
  console.log('PASS：未知字段读取、编辑及原子写回保留。');

  const competitor = makeStore('competitor');
  rejected(await competitor.open(directory));
  const simultaneous = await Promise.all([store.save(project), store.save(project)]);
  assert.equal(simultaneous.filter(result => result.ok).length, 1); project = simultaneous.find(result => result.ok).project;
  const nonempty = path.join(temporary, '非空文件夹'); await fs.mkdir(nonempty); await fs.writeFile(path.join(nonempty, '不能覆盖.txt'), 'keep'); rejected(await competitor.create(nonempty, '拒绝覆盖'));
  assert.equal(await fs.readFile(path.join(nonempty, '不能覆盖.txt'), 'utf8'), 'keep');
  console.log('PASS：目录锁、同进程并发与非空目录保护。');

  const originalImage = path.join(temporary, '图片.png'); await fs.writeFile(originalImage, png);
  const imported = ok(await store.importMedia([originalImage])).media[0];
  const nodeImport = ok(await store.importNodeImage(originalImage));
  assert.equal(nodeImport.nodeImage.path, nodeImport.path);
  assert.match(nodeImport.path, /^media\/[^/]+\.png$/);
  assert.equal(nodeImport.nodeImage.mime, 'image/png');
  project.canvases[0].graph.nodes = [{ id: 'image-node', kind: 'note', title: '带图节点', x: 0, y: 0, imagePath: nodeImport.path }];
  project.records.archive.media.push(imported); project = ok(await store.save(project)).project;
  assert.equal(project.canvases[0].graph.nodes[0].imagePath, nodeImport.path);
  const strippedNodeImage = structuredClone(project);
  delete strippedNodeImage.canvases[0].graph.nodes[0].imagePath;
  project = ok(await store.save(strippedNodeImage)).project;
  assert.equal(project.canvases[0].graph.nodes[0].imagePath, undefined);
  assert.equal(await hash(await resolveMediaFile(directory, imported.path)), await hash(originalImage));
  await assert.rejects(resolveMediaFile(directory, 'media/../../preferences/preferences.json'));
  await assert.rejects(resolveMediaFile(directory, 'media\\file.png'));
  const traversal = structuredClone(project); traversal.records.archive.media[0].path = 'media/../project.json'; rejected(await store.save(traversal));
  const disguised = path.join(temporary, '伪装.png'); await fs.writeFile(disguised, '<script>not an image</script>'); rejected(await store.importMedia([disguised]));
  const oversized = path.join(temporary, '过大.png'); const oversizedHandle = await fs.open(oversized, 'w'); await oversizedHandle.write(png); await oversizedHandle.truncate(MAX_IMAGE_BYTES + 1); await oversizedHandle.close(); rejected(await store.importMedia([oversized]));
  const bomb = Buffer.from(png); bomb.writeUInt32BE(100000, 16); bomb.writeUInt32BE(100000, 20); const bombPath = path.join(temporary, '超大像素.png'); await fs.writeFile(bombPath, bomb); rejected(await store.importMedia([bombPath]));
  console.log('PASS：媒体路径遍历、伪装格式、50 MB 和像素上限拦截。');

  const outside = path.join(temporary, '外部'); await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'secret.png'), png);
  const savedMedia = path.join(directory, 'original-media'); await fs.rename(path.join(directory, 'media'), savedMedia);
  let junctionMade = false;
  try { await fs.symlink(outside, path.join(directory, 'media'), process.platform === 'win32' ? 'junction' : 'dir'); junctionMade = true; await assert.rejects(resolveMediaFile(directory, 'media/secret.png')); rejected(await store.export(project, path.join(temporary, '不安全.zip'))); }
  finally { if (junctionMade) await fs.unlink(path.join(directory, 'media')); await fs.rename(savedMedia, path.join(directory, 'media')); }
  console.log('PASS：media 符号链接／Windows junction 拒绝读取及导出。');

  const zipPath = path.join(temporary, '完整工程.zip'); ok(await store.export(project, zipPath));
  const files = zipEntries(await fs.readFile(zipPath));
  assert.deepEqual(files.get(imported.path), png); const exported = JSON.parse(files.get('project.json')); assert.equal(exported.records.archive.media[0].path, imported.path); assert.equal(exported.vendorRoot.answer, 42);
  const sourceHash = await hash(path.join(directory, 'project.json')); rejected(await store.export(project, path.join(directory, 'project.json'))); assert.equal(await hash(path.join(directory, 'project.json')), sourceHash);
  const copied = ok(await store.saveAs(project, path.join(temporary, '另存工程'))); project = copied.project;
  assert.equal(await hash(await resolveMediaFile(copied.path, imported.path)), await hash(originalImage));
  console.log('PASS：完整 ZIP 图片字节／相对路径、另存媒体与源 JSON 防覆盖。');

  const currentFile = path.join(copied.path, 'project.json'); await fs.appendFile(currentFile, '\n'); rejected(await store.save(project));
  await store.dispose();
  const recovering = makeStore('recovering'); let reopened = ok(await recovering.open(copied.path)); project = reopened.project;
  project.records.archive.body = '已保存'; project = ok(await recovering.save(project)).project; await recovering.dispose();
  const validBackup = await fs.readFile(currentFile + '.bak'); await fs.writeFile(currentFile, '{broken');
  const restored = ok(await recovering.open(copied.path)); assert.match(restored.error, /备份|bak/); project = ok(await recovering.save(restored.project)).project; assert.deepEqual(await fs.readFile(currentFile + '.bak'), validBackup); JSON.parse(await fs.readFile(currentFile, 'utf8'));
  await recovering.dispose();
  const future = { ...project, schemaVersion: 99 }; await fs.writeFile(currentFile, JSON.stringify(future)); const futureHash = await hash(currentFile); rejected(await recovering.open(copied.path)); assert.equal(await hash(currentFile), futureHash);
  console.log('PASS：外部改动拒绝覆盖、损坏备份恢复与未来版本拒绝降级。');

  const legacyFolder = path.join(temporary, '旧工程'); await fs.mkdir(legacyFolder); await fs.writeFile(path.join(legacyFolder, 'project.json'), JSON.stringify({ schemaVersion: 0, tree: [{ id: 'old', name: '旧档案' }], records: { old: { body: '旧正文' } } }));
  const legacy = ok(await competitor.open(legacyFolder)).project; assert.equal(legacy.schemaVersion, 1); assert.deepEqual(legacy.records.old.media, []);
  const flatWikiFolder = path.join(temporary, '平铺维基'); await fs.mkdir(flatWikiFolder); await fs.writeFile(path.join(flatWikiFolder, 'project.json'), JSON.stringify({ schemaVersion: 1, format: 't-tool', id: 'flat', name: '平铺', createdAt: 1, updatedAt: 1, tree: [], records: {}, canvases: [], presets: [], wiki: [{ id: 'flat-entry', title: '旧词条', body: '', tags: [], updatedAt: 1 }], timelines: [] }));
  const flatWiki = ok(await competitor.open(flatWikiFolder)).project; assert.equal(flatWiki.wiki[0].kind, 'entry'); assert.deepEqual(flatWiki.wiki[0].children, undefined);
  const sample = createProject('内存示例'); const sampleSaved = ok(await competitor.saveAs(sample, path.join(temporary, '保存示例'))); assert.equal(sampleSaved.project.id, sample.id); assert.deepEqual(await fs.readdir(path.join(sampleSaved.path, 'media')), []);
  console.log('PASS：版本 0 迁移及独立内存工程另存。');

  const labelGraph = { nodes: [{ id: 'a', kind: 'note', title: 'a', x: 0, y: 0 }, { id: 'b', kind: 'note', title: 'b', x: 300, y: 0 }],
    edges: [{ id: 'ab', from: 'a', to: 'b', label: '关系', labelPosition: 0.72, labelWidth: 296, labelHeight: 96 }] };
  const labelProject = { ...sampleSaved.project, canvases: [{ id: 'labels', name: '文字框', graph: labelGraph,
    snapshots: [{ id: 'label-snapshot', label: '尺寸快照', time: Date.now(), graph: structuredClone(labelGraph) }] }] };
  const savedLabels = ok(await competitor.save(labelProject)).project;
  assert.equal(savedLabels.canvases[0].graph.edges[0].labelPosition, 0.72);
  assert.equal(savedLabels.canvases[0].snapshots[0].graph.edges[0].labelWidth, 296);
  for (const field of ['labelPosition', 'labelWidth', 'labelHeight']) {
    for (const value of [NaN, Infinity, -1, '100', field === 'labelPosition' ? 1.01 : 10000]) {
      const invalid = structuredClone(labelProject); invalid.canvases[0].graph.edges[0][field] = value;
      assert.throws(() => validateProject(invalid));
    }
  }
  const compact = structuredClone(labelProject);
  delete compact.canvases[0].graph.edges[0].labelPosition;
  delete compact.canvases[0].graph.edges[0].labelWidth;
  delete compact.canvases[0].graph.edges[0].labelHeight;
  const resetLabels = ok(await competitor.save(compact)).project;
  assert.equal(resetLabels.canvases[0].graph.edges[0].labelWidth, undefined);
  assert.equal(resetLabels.canvases[0].snapshots[0].graph.edges[0].labelWidth, 296);
  console.log('PASS：关系文字框位置和尺寸保存、快照保留、可清除及无效数值拒绝。');

  const invalids = [
    { nodes: [{ id: 'x', kind: 'note', title: 'x', x: 0, y: NaN }], edges: [] },
    { nodes: [{ id: 'x', kind: 'note', title: 'x', x: 0, y: 0, parent: 'x' }], edges: [] },
    { nodes: [{ id: 'x', kind: 'note', title: 'x', x: 0, y: 0 }], edges: [{ id: 'e', from: 'x', to: 'missing', label: '' }] },
  ];
  for (const graph of invalids) assert.throws(() => validateProject({ ...sample, canvases: [{ id: 'c', name: '画布', graph, snapshots: [] }] }));
  assert.throws(() => validateProject({ ...sample, records: { x: { tags: [], body: '', media: [], modules: [{ id: 'm', kind: 'axis', title: '', data: { rows: null } }] } } }));
  console.log('PASS：坏画布与已知模块结构在进入工作台前拦截。');

  const largePath = path.join(temporary, '48MB图片.png'); const largeHandle = await fs.open(largePath, 'w'); await largeHandle.write(png); await largeHandle.truncate(48 * 1024 * 1024); await largeHandle.close();
  const baseline = process.memoryUsage().rss; let peak = baseline; const sampler = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 10);
  const started = performance.now();
  try { ok(await competitor.importMedia([largePath])); ok(await competitor.export(sampleSaved.project, path.join(temporary, '流式导出.zip'))); }
  finally { clearInterval(sampler); peak = Math.max(peak, process.memoryUsage().rss); }
  console.log(`PASS：48 MB 图片流式导入／ZIP 导出，${((performance.now() - started) / 1000).toFixed(2)} 秒，RSS 峰值较起点增加 ${((peak - baseline) / 1024 / 1024).toFixed(1)} MB（稀疏 PNG 尾部填充，单进程观察值）。`);
  console.log('全部关键存储验证通过。');
} finally {
  for (const store of stores) await store.dispose();
  await fs.rm(temporary, { recursive: true, force: true });
}
