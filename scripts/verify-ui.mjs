import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright';
import electron from 'electron';

// This checks the real offline renderer and IPC. Native chooser results are isolated
// to a fresh temporary project; no existing user project is opened or overwritten.
const workspace = process.cwd();
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 't-tool-ui-'));
const projectDirectory = path.join(temporary, '验收工程');
const copiedDirectory = path.join(temporary, '迁移工程');
const blankDirectory = path.join(temporary, '空白工程');
const exportPath = path.join(temporary, '完整工程.zip');
const imagePath = path.join(temporary, '验证图片.png');
const output = path.join(workspace, '.verification');
await fs.mkdir(output, { recursive: true });
await fs.rm(path.join(output, 'ui-result.json'), { force: true });
await fs.rm(path.join(output, 'failure.png'), { force: true });
await fs.writeFile(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhAAAAABJRU5ErkJggg==', 'base64'));
let application, page;
const errors = [], requests = [], checks = [];
const env = { ...process.env, TTOOL_VERIFY: '1', TTOOL_USER_DATA: path.join(temporary, 'profile') };
delete env.ELECTRON_RUN_AS_NODE;
delete env.TTOOL_DEV_URL;
async function launch() {
  application = await _electron.launch({ executablePath: process.env.TTOOL_VERIFY_EXECUTABLE || electron, args: ['.'], cwd: workspace, env, timeout: 30000 });
  page = await application.firstWindow();
  await page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.getByRole('button', { name: '打开示例工程', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function chooser({ open, save }) {
  await application.evaluate(({ dialog }, results) => {
    dialog.showOpenDialog = async () => results.open ? { canceled: false, filePaths: results.open } : { canceled: true, filePaths: [] };
    dialog.showSaveDialog = async () => results.save ? { canceled: false, filePath: results.save } : { canceled: true };
  }, { open, save });
}
async function waitForSaved() { await page.waitForFunction(() => !document.title.includes('未保存'), { timeout: 15000 }); }
async function save() { await page.locator('.wb > .tt-toolbar').getByRole('button', { name: '保存', exact: true }).click(); await waitForSaved(); }
async function disk(directory = projectDirectory) { return JSON.parse(await fs.readFile(path.join(directory, 'project.json'), 'utf8')); }
async function movePointer(from, to) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
}
async function lineGeometry(id) {
  return page.locator(`.tt-edge__hit[data-edge="${id}"]`).evaluate(line => {
    const matrix = line.getScreenCTM();
    const a = new DOMPoint(line.x1.baseVal.value, line.y1.baseVal.value).matrixTransform(matrix);
    const b = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(matrix);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, scale: Math.hypot(matrix.a, matrix.b) };
  });
}
async function moveLabel(id, position) {
  const label = page.locator(`.tt-elabel[data-edge="${id}"]`), box = await label.boundingBox(), g = await lineGeometry(id);
  const length = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
  // Deliberately move off the line too: the label must project back onto it.
  await movePointer({ x: box.x + box.width / 2, y: box.y + box.height / 2 },
    { x: g.x1 + (g.x2 - g.x1) * position - (g.y2 - g.y1) / length * 30,
      y: g.y1 + (g.y2 - g.y1) * position + (g.x2 - g.x1) / length * 30 });
  await assertLabelPosition(id, position);
}
async function assertLabelPosition(id, position) {
  const box = await page.locator(`.tt-elabel[data-edge="${id}"]`).boundingBox(), g = await lineGeometry(id);
  assert.ok(Math.hypot(box.x + box.width / 2 - g.x1 - (g.x2 - g.x1) * position,
    box.y + box.height / 2 - g.y1 - (g.y2 - g.y1) * position) < 1.5, `${id} 的文字框应保持在线上 ${position} 处`);
}
async function stop() { if (application) { await application.evaluate(({ app }) => app.exit(0)).catch(() => {}); await application.close().catch(() => {}); application = null; } }
try {
  await launch();
  await page.screenshot({ path: path.join(output, 'welcome.png') });
  await page.getByRole('button', { name: '打开示例工程', exact: true }).click();
  await page.getByRole('textbox', { name: '档案名称', exact: true }).fill('林晚·验收');
  await page.locator('.tt-arch__type').fill('任意自定义类型');
  await page.getByRole('textbox', { name: '正文', exact: true }).fill('离线写作验收：保存过程中继续编辑，中文、空行与标点完整保留。\n第二段。');
  const slider = page.locator('.tt-axis__track').first();
  await slider.press('Home'); await slider.press('ArrowRight'); await slider.press('Shift+ArrowRight');
  assert.equal(await slider.getAttribute('aria-valuenow'), '-88');
  await slider.dblclick(); assert.equal(await slider.getAttribute('aria-valuenow'), '0');
  const axis = page.locator('.tt-axis').first();
  const percentages = await axis.locator('.tt-axis__pct').evaluateAll(inputs => inputs.map(input => Number(input.value)));
  assert.equal(percentages[0] + percentages[1], 100);
  checks.push('档案自由类型、正文与 I 形倾向轴键盘/居中/百分比');

  const boolean = page.locator('.tt-floating-module .tt-mod[data-kind="bool"]').first();
  await boolean.getByRole('radio', { name: '否', exact: true }).first().click();
  assert.equal(await boolean.getByRole('radio', { name: '否', exact: true }).first().getAttribute('aria-checked'), 'false');
  await boolean.getByRole('radio', { name: '是', exact: true }).first().click();
  assert.equal(await boolean.getByRole('radio', { name: '是', exact: true }).first().getAttribute('aria-checked'), 'true');
  await boolean.getByRole('radio', { name: '否', exact: true }).first().click();
  assert.equal(await boolean.getByRole('radio', { name: '是', exact: true }).first().getAttribute('aria-checked'), 'false');
  await page.getByRole('button', { name: '插入模块', exact: true }).click();
  await page.getByRole('menuitem', { name: /^文本/ }).click();
  await page.getByRole('textbox', { name: '文本内容', exact: true }).fill('只保存在档案里的文本，不进入预设。');
  const floatingGrip = page.locator('.tt-floating-module .tt-mod__grip').first();
  await floatingGrip.scrollIntoViewIfNeeded();
  const gripBox = await floatingGrip.boundingBox();
  const modulePosition = await page.locator('.tt-floating-module').first().evaluate(element => ({ x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) }));
  await movePointer({ x: gripBox.x + gripBox.width / 2, y: gripBox.y + gripBox.height / 2 }, { x: gripBox.x + gripBox.width / 2 + 74, y: gripBox.y + gripBox.height / 2 + 46 });
  const movedPosition = await page.locator('.tt-floating-module').first().evaluate(element => ({ x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) }));
  assert.ok(movedPosition.x !== modulePosition.x || movedPosition.y !== modulePosition.y);
  const resizeHandle = page.locator('.tt-floating-module__resize--se').first();
  const resizeBoundsBefore = await page.locator('.tt-floating-module').first().evaluate(element => ({ width: Number.parseFloat(element.style.width), height: Number.parseFloat(element.style.height) }));
  const resizeBox = await resizeHandle.boundingBox();
  await movePointer({ x: resizeBox.x + resizeBox.width / 2, y: resizeBox.y + resizeBox.height / 2 }, { x: resizeBox.x + resizeBox.width / 2 + 90, y: resizeBox.y + resizeBox.height / 2 + 70 });
  const afterResize = await page.locator('.tt-floating-module').first().evaluate(element => ({ width: Number.parseFloat(element.style.width), height: Number.parseFloat(element.style.height) }));
  assert.ok(afterResize.width >= 320 && afterResize.height >= 180);
  assert.ok(afterResize.width > resizeBoundsBefore.width && afterResize.height > resizeBoundsBefore.height);
  const minimumHandle = page.locator('.tt-floating-module__resize--se').first(), minimumBox = await minimumHandle.boundingBox();
  await movePointer({ x: minimumBox.x + 5, y: minimumBox.y + 5 }, { x: minimumBox.x - 1000, y: minimumBox.y - 1000 });
  const minimumSize = await page.locator('.tt-floating-module').first().evaluate(element => ({ width: Number.parseFloat(element.style.width), height: Number.parseFloat(element.style.height) }));
  assert.ok(minimumSize.width >= 320 && minimumSize.height >= 180);
  checks.push('自由工作区浮窗移动、八向边框缩放和最小尺寸');

  await page.getByRole('button', { name: '预设库', exact: true }).click();
  await page.getByRole('button', { name: '将当前模块存为预设', exact: true }).click();
  await page.getByRole('textbox', { name: '预设名称', exact: true }).fill('验收结构预设');
  await page.getByRole('textbox', { name: '预设名称', exact: true }).press('Enter');
  const preset = page.locator('.tt-preset').filter({ hasText: '验收结构预设' });
  const beforeModules = await page.locator('.tt-floating-module .tt-mod').count();
  await preset.getByRole('button', { name: '导入到当前档案', exact: true }).click();
  assert.equal(await page.locator('.tt-floating-module .tt-mod').count(), beforeModules * 2);
  await page.getByRole('button', { name: '收起', exact: true }).click();
  await chooser({ save: projectDirectory });
  await save();
  let saved = await disk();
  assert.equal(saved.records.c1.modules.length, beforeModules * 2);
  assert.ok(saved.records.c1.workspace.items.some(item => item.kind === 'module' && (item.x !== 24 || item.y !== 24)));
  const structure = saved.presets.find(preset => preset.name === '验收结构预设');
  assert.equal(structure.modules.find(module => module.kind === 'text').data.text, '');
  assert.equal(structure.modules.find(module => module.kind === 'number').data.rows[0].value, '');
  assert.equal(structure.modules.find(module => module.kind === 'axis').data.rows[0].value, 0);
  assert.equal(structure.modules.find(module => module.kind === 'radar').data.rows[0].value, 0);
  assert.equal(structure.modules.find(module => module.kind === 'bool').data.rows[0].value, null);
  checks.push('预设剥离内容、导入追加、首次保存内存示例工程');

  await chooser({ open: [imagePath] });
  await page.getByRole('button', { name: '添加图片', exact: true }).click();
  await page.waitForFunction(() => { const image = document.querySelector('.wb-media img'); return image?.complete && image.naturalWidth > 0; });
  await save();
  saved = await disk();
  assert.match(saved.records.c1.media[0].path, /^media\//);
  assert.equal(await fs.readFile(path.join(projectDirectory, saved.records.c1.media[0].path)).then(bytes => bytes.toString('base64')), await fs.readFile(imagePath).then(bytes => bytes.toString('base64')));
  await page.screenshot({ path: path.join(output, 'archive.png') });
  checks.push('图片复制、相对路径、受限媒体协议离线显示');

  await page.getByRole('button', { name: '世界观维基', exact: true }).click();
  await page.locator('.wb-wiki .wb-entity__list-head').getByRole('button', { name: '新建词条', exact: true }).click();
  await page.getByRole('textbox', { name: '词条名称', exact: true }).fill('验收世界设定');
  await page.getByRole('textbox', { name: '词条正文', exact: true }).fill('世界观词条正文。');
  const wikiTree = page.locator('.wb-wiki-tree');
  await wikiTree.getByRole('button', { name: '验收世界设定', exact: true }).click({ button: 'right' });
  await page.getByRole('button', { name: '新建词条', exact: true }).first().click();
  await wikiTree.getByText('验收世界设定', { exact: true }).click({ button: 'right' });
  await page.getByRole('button', { name: '新建子文件夹', exact: true }).click();
  await wikiTree.getByText('新建文件夹', { exact: true }).click({ button: 'right' });
  await page.getByRole('button', { name: '新建词条', exact: true }).first().click();
  assert.ok(await wikiTree.locator('.wb-wiki-tree__item .wb-wiki-tree__item').count() > 0);
  await page.getByRole('button', { name: '时间线', exact: true }).click();
  await page.getByRole('button', { name: '新建时间线', exact: true }).click();
  await page.locator('.wb-timeline__head').getByRole('button', { name: '添加刻度', exact: true }).click();
  await page.getByRole('textbox', { name: '刻度名称', exact: true }).fill('纪元 120');
  await page.getByRole('button', { name: '确认添加刻度', exact: true }).click();
  await page.locator('.wb-timeline__head').getByRole('button', { name: '添加刻度', exact: true }).click();
  await page.getByRole('textbox', { name: '刻度名称', exact: true }).fill('纪元 200');
  await page.getByRole('button', { name: '确认添加刻度', exact: true }).click();
  await page.locator('.wb-timeline__target select').selectOption({ label: '纪元 120' });
  await page.getByRole('button', { name: '添加事件', exact: true }).click();
  await page.getByRole('textbox', { name: '事件名称', exact: true }).fill('验收事件');
  await page.locator('[data-event-id]').filter({ has: page.getByRole('textbox', { name: '事件名称', exact: true }) }).getByRole('button', { name: '林晚·验收', exact: true }).click();
  assert.equal(await page.locator('[data-event-id]').count(), 1);
  assert.equal(await page.locator('.wb-timeline__tick').getByText('纪元 120', { exact: true }).count(), 1);
  assert.equal(await page.locator('.wb-timeline__column[data-tick-id]').count(), 2);
  assert.equal(await page.locator('.wb-timeline__event').first().evaluate(element => element.closest('.wb-timeline__column')?.getAttribute('data-tick-id')),
    await page.locator('.wb-timeline__target select').inputValue());
  await page.locator('.wb-timeline__target select').selectOption({ label: '纪元 200' });
  await page.getByRole('button', { name: '添加事件', exact: true }).click();
  await page.locator('[data-event-id]').last().getByRole('textbox', { name: '事件名称', exact: true }).fill('第二个验收事件');
  const eventCards = page.locator('[data-event-id]');
  assert.equal(await eventCards.count(), 2);
  const cardBoxes = await eventCards.evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { left: box.left, right: box.right }; }));
  assert.ok(cardBoxes[1].left >= cardBoxes[0].right || cardBoxes[0].left >= cardBoxes[1].right);
  assert.equal(await eventCards.nth(0).evaluate(element => element.closest('.wb-timeline__column')?.getAttribute('data-tick-id')),
    await eventCards.nth(0).locator('select').inputValue());
  assert.equal(await eventCards.nth(1).evaluate(element => element.closest('.wb-timeline__column')?.getAttribute('data-tick-id')),
    await eventCards.nth(1).locator('select').inputValue());
  await eventCards.first().getByRole('button', { name: '删除事件', exact: true }).click();
  assert.equal(await page.locator('[data-event-id]').count(), 1);
  await page.getByRole('button', { name: '删除刻度 纪元 120', exact: true }).click();
  assert.equal(await page.locator('[data-tick-id="unplaced"] [data-event-id]').count(), 0);
  await page.getByRole('button', { name: '删除刻度 纪元 200', exact: true }).click();
  assert.equal(await page.locator('[data-tick-id="unplaced"] [data-event-id]').count(), 1);
  await page.locator('[data-event-id]').first().getByRole('button', { name: '删除事件', exact: true }).click();
  checks.push('时间线刻度创建、指定列定位、事件删除与刻度删除后的事件保留');
  await page.getByRole('button', { name: '档案', exact: true }).click();

  await page.locator('.wb-side').getByRole('button', { name: /第一幕/ }).click();
  await page.locator('.tt-rc').waitFor();
  const nodeA = page.locator('.tt-node[data-id="a"]'), nodeB = page.locator('.tt-node[data-id="b"]'), nodeD = page.locator('.tt-node[data-id="d"]');
  const edgesBefore = await page.locator('.tt-edge').count();
  await page.getByRole('button', { name: '连线', exact: true }).click();
  await nodeA.click(); await nodeB.click();
  assert.equal(await page.locator('.tt-edge').count(), edgesBefore);
  await page.getByText(/已经有一条关系了/).waitFor();
  await nodeA.click(); await nodeD.click();
  await page.getByRole('textbox', { name: '关系描述', exact: true }).fill('正向验收关系');
  await page.getByRole('textbox', { name: '关系描述', exact: true }).press('Enter');
  await nodeD.click(); await nodeA.click();
  await page.getByRole('textbox', { name: '关系描述', exact: true }).fill('反向验收关系');
  await page.getByRole('textbox', { name: '关系描述', exact: true }).press('Enter');
  assert.equal(await page.locator('.tt-edge').count(), edgesBefore + 2);
  await page.getByRole('button', { name: '连线', exact: true }).click();
  await page.getByRole('button', { name: '放大', exact: true }).click();
  await moveLabel('e3', 0.72);
  const reverseLabel = page.locator('.tt-elabel[data-edge="e2"]');
  const reverseBefore = await reverseLabel.boundingBox();
  await moveLabel('e1', 0.66);
  const reverseAfter = await reverseLabel.boundingBox();
  assert.ok(Math.hypot(reverseAfter.x - reverseBefore.x, reverseAfter.y - reverseBefore.y) < 1);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await assertLabelPosition('e1', 0.42);
  const longLabel = page.locator('.tt-elabel[data-edge="e4"]');
  assert.equal(await longLabel.locator('.tt-elabel__text').evaluate(text => text.scrollWidth > text.clientWidth), true);
  const beforeResize = await longLabel.boundingBox(), geometry = await lineGeometry('e4');
  const corner = await longLabel.locator('[data-corner="se"]').boundingBox();
  assert.equal(await longLabel.locator('[data-corner="se"]').evaluate(handle => getComputedStyle(handle).cursor), 'nwse-resize');
  await movePointer({ x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 },
    { x: corner.x + corner.width / 2 + 80 * geometry.scale, y: corner.y + corner.height / 2 + 36 * geometry.scale });
  const resized = await longLabel.boundingBox();
  assert.ok(Math.abs(resized.width - beforeResize.width - 160 * geometry.scale) < 2);
  assert.ok(Math.abs(resized.height - beforeResize.height - 72 * geometry.scale) < 2);
  assert.equal(await longLabel.locator('.tt-elabel__text').evaluate(text => text.scrollHeight <= text.clientHeight), true);
  await assertLabelPosition('e4', 0.5);
  const northwest = await longLabel.locator('[data-corner="nw"]').boundingBox();
  await movePointer({ x: northwest.x + northwest.width / 2, y: northwest.y + northwest.height / 2 },
    { x: northwest.x + northwest.width / 2 + 24 * geometry.scale, y: northwest.y + northwest.height / 2 + 12 * geometry.scale });
  assert.ok((await longLabel.boundingBox()).width < resized.width);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  assert.ok(Math.abs((await longLabel.boundingBox()).width - resized.width) < 1);
  await page.locator('.tt-elabel[data-edge="e3"]').dblclick();
  await page.getByRole('textbox', { name: '关系描述', exact: true }).fill('卧底，仍可双击编辑关系描述');
  await page.getByRole('textbox', { name: '关系描述', exact: true }).press('Enter');
  const beforeFlip = await page.locator('.tt-elabel[data-edge="e3"]').boundingBox();
  await page.locator('.tt-elabel[data-edge="e3"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '调转方向', exact: true }).click();
  const afterFlip = await page.locator('.tt-elabel[data-edge="e3"]').boundingBox();
  assert.ok(Math.hypot(afterFlip.x + afterFlip.width / 2 - beforeFlip.x - beforeFlip.width / 2,
    afterFlip.y + afterFlip.height / 2 - beforeFlip.y - beforeFlip.height / 2) < 0.2, JSON.stringify({ beforeFlip, afterFlip }));
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await assertLabelPosition('e3', 0.72);
  const expandedWidth = Number(await longLabel.evaluate(label => label.style.width.replace('px', '')));
  const expandedHeight = Number(await longLabel.evaluate(label => label.style.height.replace('px', '')));
  const movedNode = await nodeB.boundingBox();
  await movePointer({ x: movedNode.x + movedNode.width / 2, y: movedNode.y + movedNode.height / 2 },
    { x: movedNode.x + movedNode.width / 2 + 45, y: movedNode.y + movedNode.height / 2 + 25 });
  await assertLabelPosition('e3', 0.72);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await page.getByRole('button', { name: '适应', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'relation-labels.png') });
  checks.push('缩放下文字框沿线拖动、反向标签独立、角落缩放与多行显示、单步撤销、双击编辑、调转方向及随方块移动');
  await nodeA.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^重命名/ }).click();
  await page.locator('.tt-node input').fill('画布里的林晚');
  await page.locator('.tt-node input').press('Enter');
  await nodeA.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '新建子级', exact: true }).click();
  await page.getByRole('textbox', { name: '便签内容', exact: true }).fill('子级便签'); await page.getByRole('textbox', { name: '便签内容', exact: true }).press('Enter');
  await page.getByRole('button', { name: '便签', exact: true }).click();
  const nodeCount = await page.locator('.tt-node').count();
  const parentBounds = await nodeA.boundingBox();
  await page.mouse.dblclick(parentBounds.x + 20, parentBounds.y + 16, { delay: 90 });
  assert.equal(await page.locator('.tt-node').count(), nodeCount - 1);
  const collapsedBounds = await nodeA.boundingBox();
  await page.mouse.dblclick(collapsedBounds.x + 20, collapsedBounds.y + 16, { delay: 90 });
  assert.equal(await page.locator('.tt-node').count(), nodeCount);
  assert.ok(await page.locator('.tt-hier').count() >= 1);
  await page.locator('.tt-rc').focus(); await page.keyboard.press('Control+s');
  await page.getByRole('dialog', { name: '给快照命名', exact: true }).waitFor();
  await page.getByRole('textbox', { name: '快照名称', exact: true }).fill('验收保存点');
  await page.getByRole('dialog', { name: '给快照命名', exact: true }).getByRole('button', { name: '存快照', exact: true }).click();
  await waitForSaved();
  saved = await disk();
  const savedCanvas = saved.canvases.find(canvas => canvas.id === 'g1');
  assert.equal(savedCanvas.snapshots[0].label, '验收保存点');
  assert.equal(saved.tree.find(node => node.id === 'c').children[0].name, '林晚·验收');
  assert.equal(savedCanvas.graph.nodes.find(node => node.id === 'a').title, '画布里的林晚');
  assert.ok(Math.abs(savedCanvas.graph.edges.find(edge => edge.id === 'e3').labelPosition - 0.72) < 0.001);
  assert.equal(savedCanvas.graph.edges.find(edge => edge.id === 'e4').labelWidth, expandedWidth);
  assert.equal(savedCanvas.graph.edges.find(edge => edge.id === 'e4').labelHeight, expandedHeight);
  assert.equal(savedCanvas.snapshots[0].graph.edges.find(edge => edge.id === 'e4').labelWidth, expandedWidth);
  const minimap = page.getByRole('button', { name: '画布缩略图', exact: true });
  await minimap.click({ position: { x: 20, y: 20 } });
  await page.getByRole('button', { name: '档案', exact: true }).click();
  await page.getByRole('button', { name: '关系画布', exact: true }).click();
  checks.push('同向重复拦截、反向关系、画布改名隔离、子级同步与收展、Ctrl+S快照持久化及缩略图交互');

  await page.getByRole('button', { name: '便签', exact: true }).click();
  await page.getByRole('textbox', { name: '便签内容', exact: true }).fill('回退之前的新便签'); await page.getByRole('textbox', { name: '便签内容', exact: true }).press('Enter');
  await moveLabel('e3', 0.25);
  await page.getByRole('button', { name: '历史快照', exact: true }).click();
  await page.locator('.tt-snap').filter({ hasText: '验收保存点' }).getByRole('button', { name: '回退到此', exact: true }).click();
  assert.equal(await page.locator('.tt-node').count(), nodeCount);
  await assertLabelPosition('e3', 0.72);
  assert.equal(Number(await longLabel.evaluate(label => label.style.width.replace('px', ''))), expandedWidth);
  await page.locator('.tt-snap').filter({ hasText: '回退前自动保存' }).waitFor();
  await page.locator('.wb-side').getByRole('button', { name: /七年前/ }).click();
  await page.locator('.wb-side').getByRole('button', { name: /第一幕/ }).click();
  await page.getByRole('button', { name: '历史快照', exact: true }).click();
  await page.locator('.tt-snap').filter({ hasText: '验收保存点' }).waitFor();
  await page.screenshot({ path: path.join(output, 'canvas.png') });
  checks.push('回退前自动快照、切换画布历史不丢失');

  const viewport = await page.locator('.tt-rc__viewport').boundingBox();
  await page.locator('.tt-tree__row[data-id="w1"]').dragTo(page.locator('.tt-rc__viewport'), { targetPosition: { x: viewport.width / 2, y: viewport.height / 2 } });
  assert.equal(await page.locator('.tt-node').count(), nodeCount + 1);
  checks.push('项目树拖入画布建立引用');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('menuitem', { name: '切换夜读', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.screenshot({ path: path.join(output, 'night.png') });
  await page.getByRole('button', { name: '设置', exact: true }).click(); await page.getByRole('menuitem', { name: '切换纸面', exact: true }).click();

  await save();
  await chooser({ save: exportPath });
  await page.getByRole('button', { name: '导出', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.wb > .tt-status')?.textContent.includes('已导出完整工程'));
  const zip = await fs.readFile(exportPath);
  assert.ok(zip.includes(Buffer.from('project.json')));
  assert.ok(zip.includes(Buffer.from(saved.records.c1.media[0].path)));
  await chooser({ save: copiedDirectory });
  await page.getByRole('button', { name: '工程', exact: true }).click(); await page.getByRole('menuitem', { name: /^另存工程/ }).click();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { await fs.access(path.join(copiedDirectory, 'project.json')); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  assert.equal((await disk(copiedDirectory)).records.c1.media[0].path, saved.records.c1.media[0].path);
  checks.push('完整 ZIP 包含媒体、另存迁移保留相对路径');

  await stop(); await launch();
  await chooser({ open: [path.join(copiedDirectory, 'project.json')] });
  await page.getByRole('button', { name: '打开工程', exact: true }).click();
  await page.locator('.tt-tree__row[data-id="c1"]').click();
  assert.equal(await page.getByRole('textbox', { name: '档案名称', exact: true }).inputValue(), '林晚·验收');
  await page.locator('.wb-media img').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => { const image = document.querySelector('.wb-media img'); return image?.complete && image.naturalWidth > 0; });
  await page.locator('.wb-side').getByRole('button', { name: /第一幕/ }).click();
  await assertLabelPosition('e3', 0.72);
  assert.equal(Number(await page.locator('.tt-elabel[data-edge="e4"]').evaluate(label => label.style.width.replace('px', ''))), expandedWidth);
  await page.getByRole('button', { name: '历史快照', exact: true }).click(); await page.locator('.tt-snap').filter({ hasText: '验收保存点' }).waitFor();
  await page.locator('.tt-tree__row[data-id="c"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^删除（连同/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除档案', exact: true }).click();
  await page.locator('.tt-node.is-deleted').first().waitFor();
  await save();
  const deleted = await disk(copiedDirectory);
  assert.equal(deleted.records.c1, undefined);
  const preservedReference = deleted.canvases.find(canvas => canvas.id === 'g1').graph.nodes.find(node => node.id === 'a');
  assert.equal(preservedReference.kind, 'ref');
  assert.equal(preservedReference.archiveId, 'c1');
  assert.equal(preservedReference.archiveDeleted, true);
  assert.equal(deleted.canvases.find(canvas => canvas.id === 'g1').graph.edges.length, edgesBefore + 2);
  checks.push('重启工程、媒体与历史恢复、子档案删除保留关系');
  const font = await page.evaluate(async () => { await document.fonts.load('15px "Noto Serif SC"', '世界树工程'); return document.fonts.check('15px "Noto Serif SC"', '世界树工程'); });
  assert.equal(font, true);

  await chooser({ save: blankDirectory });
  await page.getByRole('button', { name: '工程', exact: true }).click();
  await page.getByRole('menuitem', { name: '新建工程', exact: true }).click();
  await page.getByRole('dialog', { name: '新建工程', exact: true }).getByRole('textbox', { name: '名称', exact: true }).fill('空白工程验收');
  await page.getByRole('dialog', { name: '新建工程', exact: true }).getByRole('button', { name: '新建工程', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.wb-brand b')?.textContent === '空白工程验收');
  assert.equal((await disk(blankDirectory)).tree.length, 0);
  await page.getByRole('button', { name: '档案', exact: true }).click();
  await page.locator('.wb-empty').getByRole('button', { name: '新建档案', exact: true }).click();
  await page.getByRole('textbox', { name: '档案名称', exact: true }).fill('新工程档案');
  await page.getByRole('textbox', { name: '正文', exact: true }).fill('关闭确认必须保留这段文字。');
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await page.getByRole('dialog', { name: '保存后关闭工程？', exact: true }).getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: '正文', exact: true }).inputValue(), '关闭确认必须保留这段文字。');
  await save();
  const blank = await disk(blankDirectory);
  assert.equal(blank.tree[0].name, '新工程档案');
  assert.equal(blank.records[blank.tree[0].id].body, '关闭确认必须保留这段文字。');
  await page.getByRole('textbox', { name: '正文', exact: true }).fill('保存并关闭后完整写入。');
  await page.waitForFunction(() => document.title.includes('未保存'));
  const closeDialog = page.getByRole('dialog', { name: '保存后关闭工程？', exact: true });
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await closeDialog.waitFor({ state: 'visible', timeout: 15000 });
  await closeDialog.getByRole('button', { name: '保存并继续', exact: true }).click();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { await fs.access(path.join(blankDirectory, '.t-tool.lock')); await new Promise(resolve => setTimeout(resolve, 250)); } catch { break; }
  }
  assert.equal((await disk(blankDirectory)).records[blank.tree[0].id].body, '保存并关闭后完整写入。');
  await assert.rejects(fs.stat(path.join(blankDirectory, '.t-tool.lock')), { code: 'ENOENT' });
  application = null;
  checks.push('新建空工程、新建档案、关闭取消保留内容、保存并关闭及工程锁释放');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(requests.length, 0, `Unexpected network: ${requests.join(', ')}`);
  checks.push('无页面异常、无 HTTP 请求、内置宋体加载');
  const result = { passed: true, checks, temporary, screenshots: output, errors, networkRequests: requests, executable: process.env.TTOOL_VERIFY_EXECUTABLE || 'development Electron' };
  await fs.writeFile(path.join(output, 'ui-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  console.error(error); console.error({ checks, errors, temporary }); process.exitCode = 1;
} finally { await stop(); }
