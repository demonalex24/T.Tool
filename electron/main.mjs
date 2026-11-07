import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from 'electron';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectStore, resolveMediaFile } from './storage.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.resolve(here, '../dist');
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);
const devUrl = !app.isPackaged && process.env.TTOOL_DEV_URL ? new URL(process.env.TTOOL_DEV_URL) : null;
if (devUrl && (!['127.0.0.1', 'localhost', '[::1]'].includes(devUrl.hostname) || devUrl.protocol !== 'http:')) throw new Error('开发服务器必须是本机 HTTP 地址。');
if (process.env.TTOOL_USER_DATA && (!app.isPackaged || process.env.TTOOL_VERIFY === '1')) app.setPath('userData', path.resolve(process.env.TTOOL_USER_DATA));

let window, store, closing = false, closePending = false;
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const csp = [
  "default-src 'self'", `script-src 'self'${devUrl ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' media: data: blob:",
  `connect-src ${devUrl ? devUrl.origin + ' ws://' + devUrl.host : "'none'"}`,
  "object-src 'none'", "frame-src 'none'", "base-uri 'none'", "form-action 'none'",
].join('; ');
const fail = cause => ({ ok: false, error: cause?.message || String(cause) });
const canceled = () => ({ ok: false, canceled: true });

function trusted(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return false;
  try { const url = new URL(event.senderFrame.url); return devUrl ? url.origin === devUrl.origin : url.protocol === 'app:' && url.hostname === 't-tool'; } catch { return false; }
}
function handle(action, callback) {
  ipcMain.handle('t-tool:' + action, async (event, ...args) => {
    if (!trusted(event)) return fail('此页面没有工程文件访问权限。');
    try { return await callback(...args); } catch (cause) { return fail(cause); }
  });
}
function folderName(value) {
  const cleaned = String(value || '未命名工程').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').slice(0, 80);
  return cleaned && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned) ? cleaned : '未命名工程';
}
async function chooseNewDirectory(title, name) {
  // Native Save dialog lets users name a new folder without touching its files.
  const result = await dialog.showSaveDialog(window, { title, buttonLabel: '选择工程文件夹', defaultPath: path.join(app.getPath('documents'), folderName(name)), properties: ['createDirectory', 'showOverwriteConfirmation'] });
  return result.canceled || !result.filePath ? null : result.filePath;
}
function sendMenu(action) { if (window && !window.isDestroyed()) window.webContents.send('t-tool:menu-action', action); }
function configureMenu() {
  const items = [
    { label: '新建工程\tCtrl+N', click: () => sendMenu('new') },
    { label: '打开工程\tCtrl+O', click: () => sendMenu('open') },
    { type: 'separator' },
    { label: '保存工程\tCtrl+S', click: () => sendMenu('save') },
    { label: '另存工程\tCtrl+Shift+S', click: () => sendMenu('save-as') },
    { label: '导出工程\tCtrl+E', click: () => sendMenu('export') },
    { type: 'separator' },
    { label: '退出', click: () => window?.close() },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: '工程', submenu: items }, { label: '编辑', submenu: [{ role: 'undo', label: '撤销' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' }] }]));
}
async function finishClose() {
  if (store.busy) return fail('工程正在保存或导出，请完成后再关闭。');
  closing = true;
  await store.dispose();
  window?.destroy();
  app.quit();
  return { ok: true };
}
function requestClose() {
  if (closing || closePending || !window || window.isDestroyed()) return;
  closePending = true;
  window.webContents.send('t-tool:close-requested');
}
function configureIpc() {
  handle('new-project', async name => {
    if (typeof name !== 'string' || name.length > 1000) return fail('工程名称无效。');
    const directory = await chooseNewDirectory('新建工程文件夹', name);
    return directory ? store.create(directory, name) : canceled();
  });
  handle('open-project', async () => {
    const result = await dialog.showOpenDialog(window, { title: '打开工程中的 project.json', properties: ['openFile'], filters: [{ name: 'T.Tool 工程（project.json）', extensions: ['json'] }] });
    return result.canceled || !result.filePaths[0] ? canceled() : store.open(result.filePaths[0]);
  });
  handle('open-recent', directory => store.openRecent(directory));
  handle('save-project', project => store.save(project));
  handle('save-as', async project => {
    const directory = await chooseNewDirectory('另存工程到新文件夹', project?.name);
    return directory ? store.saveAs(project, directory) : canceled();
  });
  handle('export-project', async project => {
    const result = await dialog.showSaveDialog(window, { title: '导出工程（包含 media 图片）', defaultPath: path.join(app.getPath('documents'), folderName(project?.name) + '.zip'), filters: [{ name: '包含图片的完整工程 ZIP', extensions: ['zip'] }], properties: ['showOverwriteConfirmation'] });
    return result.canceled || !result.filePath ? canceled() : store.export(project, result.filePath);
  });
  handle('import-media', async () => {
    if (!store.directory) return fail('请先新建或打开工程，再添加图片。');
    const result = await dialog.showOpenDialog(window, { title: '添加图片（单张不超过 50 MB）', properties: ['openFile', 'multiSelections'], filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }] });
    return result.canceled || !result.filePaths.length ? canceled() : store.importMedia(result.filePaths);
  });
  handle('import-node-image', async () => {
    if (!store.directory) return fail('请先新建或打开工程，再导入节点图片。');
    const result = await dialog.showOpenDialog(window, { title: '导入节点图片（单张不超过 50 MB）', properties: ['openFile'], filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }] });
    return result.canceled || !result.filePaths.length ? canceled() : store.importNodeImage(result.filePaths[0]);
  });
  handle('read-preferences', () => store.readPreferences());
  handle('write-preferences', value => store.writePreferences(value));
  handle('respond-close', async action => {
    if (action === 'cancel') { closePending = false; return { ok: true }; }
    if (!closePending || !['close', 'discard'].includes(action)) return fail('关闭操作无效。');
    const result = await finishClose();
    if (!result.ok) closePending = false;
    return result;
  });
}
async function serveApplication(request) {
  try {
    const url = new URL(request.url);
    if (url.hostname !== 't-tool' || !['GET', 'HEAD'].includes(request.method)) return new Response('无访问权限', { status: 403 });
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
    if (relative.includes('\0') || relative.includes('\\') || relative.includes(':') || relative.split('/').some(part => part === '..' || part === '.')) return new Response('无效路径', { status: 403 });
    const target = path.resolve(rendererDirectory, relative);
    const containment = path.relative(rendererDirectory, target);
    if (containment.startsWith('..') || path.isAbsolute(containment)) return new Response('无效路径', { status: 403 });
    let checked = rendererDirectory;
    for (const segment of relative.split('/')) { checked = path.join(checked, segment); const stat = await fs.lstat(checked); if (stat.isSymbolicLink()) return new Response('无访问权限', { status: 403 }); }
    const stat = await fs.stat(target); if (!stat.isFile()) return new Response('资源不存在', { status: 404 });
    const headers = { 'Content-Type': contentTypes[path.extname(target)] || 'application/octet-stream', 'Content-Length': String(stat.size), 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' };
    return new Response(request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(target)), { headers });
  } catch { return new Response('资源不存在', { status: 404 }); }
}
async function serveMedia(request) {
  try {
    const url = new URL(request.url);
    if (!store.directory || url.hostname !== 'project' || !['GET', 'HEAD'].includes(request.method)) return new Response('无访问权限', { status: 403 });
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
    const target = await resolveMediaFile(store.directory, relative);
    const mime = contentTypes[path.extname(target).toLowerCase()];
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime)) return new Response('不支持的图片', { status: 403 });
    const stat = await fs.stat(target);
    return new Response(request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(target)), { headers: { 'Content-Type': mime, 'Content-Length': String(stat.size), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': devUrl?.origin || 'app://t-tool', 'Content-Security-Policy': "default-src 'none'" } });
  } catch { return new Response('图片不存在或路径无效', { status: 404 }); }
}

app.whenReady().then(async () => {
store = new ProjectStore(app.getPath('userData'));
protocol.handle('app', serveApplication);
protocol.handle('media', serveMedia);
session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
session.defaultSession.setPermissionCheckHandler(() => false);
session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
  let allowed = false;
  try {
    const url = new URL(details.url);
    allowed = ['app:', 'media:', 'data:', 'blob:'].includes(url.protocol) || Boolean(devUrl && (url.origin === devUrl.origin || (url.protocol === 'ws:' && url.host === devUrl.host)));
  } catch { /* Invalid requests are denied. */ }
  callback({ cancel: !allowed });
});
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  if (devUrl && details.url.startsWith(devUrl.origin)) callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  else callback({ responseHeaders: details.responseHeaders });
});
configureIpc();
configureMenu();
window = new BrowserWindow({
  width: 1360, height: 900, minWidth: 960, minHeight: 680, title: '世界树工程 T.Tool', show: false,
  webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false, backgroundThrottling: false, offscreen: process.env.TTOOL_VERIFY === '1' },
});
window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
window.webContents.on('will-navigate', event => event.preventDefault());
window.webContents.on('will-redirect', event => event.preventDefault());
window.webContents.on('will-attach-webview', event => event.preventDefault());
window.webContents.on('render-process-gone', async () => {
  closePending = false;
  const response = await dialog.showMessageBox(window, { type: 'warning', title: '工作台已停止响应', message: '工作台进程已停止。重新载入会打开欢迎页；已保存的工程仍在原文件夹中。', buttons: ['重新载入', '关闭'], defaultId: 0, cancelId: 1 });
  if (response.response === 0) window.webContents.reload(); else await finishClose();
});
window.on('close', event => { if (!closing) { event.preventDefault(); requestClose(); } });
window.on('ready-to-show', () => { if (process.env.TTOOL_VERIFY !== '1') window.show(); });
app.on('before-quit', event => { if (!closing && window && !window.isDestroyed()) { event.preventDefault(); requestClose(); } });
app.on('window-all-closed', () => { if (closing) app.quit(); });
await window.loadURL(devUrl ? devUrl.href : 'app://t-tool/index.html');
}).catch(cause => {
  console.error('T.Tool startup failed:', cause);
  dialog.showErrorBox('世界树工程无法启动', cause?.message || String(cause));
  app.exit(1);
});
