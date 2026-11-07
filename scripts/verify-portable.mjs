import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// The portable EXE is an NSIS launcher, so verify its extracted child over CDP
// rather than treating the launcher as an Electron debugging process.
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 't-tool-portable-'));
const server = net.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const env = { ...process.env, TTOOL_VERIFY: '1', TTOOL_USER_DATA: path.join(temporary, 'profile') };
delete env.ELECTRON_RUN_AS_NODE;
delete env.TTOOL_DEV_URL;
const { version } = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
const executable = path.resolve(`release/T.Tool-${version}-x64-portable.exe`);
const child = spawn(executable, [`--remote-debugging-port=${port}`], { env, windowsHide: true, stdio: 'ignore' });
let exited = false, spawnError;
child.on('error', error => { spawnError = error; });
child.on('exit', () => { exited = true; });
let browser, page, browserPid;
try {
  const deadline = Date.now() + 45000;
  let endpoint;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    try {
      endpoint = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) }).then(response => response.json());
      break;
    } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  assert.ok(endpoint?.webSocketDebuggerUrl, `便携版没有启动调试端口；启动器已退出：${exited}`);
  browser = await chromium.connectOverCDP(endpoint.webSocketDebuggerUrl);
  const processInfo = await browser.newBrowserCDPSession().then(session => session.send('SystemInfo.getProcessInfo'));
  browserPid = processInfo.processInfo.find(info => info.type === 'browser')?.id;
  assert.ok(Number.isInteger(browserPid) && browserPid > 0);
  page = browser.contexts()[0].pages()[0];
  const requests = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.getByRole('button', { name: '打开示例工程', exact: true }).click();
  await page.getByRole('textbox', { name: '正文', exact: true }).fill('便携版实际启动并编辑成功。');
  await page.locator('.wb-side').getByRole('button', { name: /第一幕/ }).click();
  assert.ok(await page.locator('.tt-node').count() > 0);
  assert.equal(await page.evaluate(async () => {
    await document.fonts.load('15px "Noto Serif SC"', '世界树工程');
    return document.fonts.check('15px "Noto Serif SC"', '世界树工程');
  }), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  const closed = page.waitForEvent('close');
  await page.evaluate(() => window.close());
  await closed;
  const result = { passed: true, executable, checks: ['便携启动器解压与子进程启动', '离线文字编辑和画布组件', '内置宋体', '无 HTTP 请求或页面错误'], temporary };
  await fs.writeFile(path.resolve('.verification/portable-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close().catch(() => {});
  // CDP window.close can leave Electron's main process alive after destroying
  // the renderer. This PID belongs to our fresh profile and launcher only.
  if (browserPid) { try { process.kill(browserPid); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
}
