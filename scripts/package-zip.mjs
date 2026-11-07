import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'release', '1.1.0');
const unpacked = path.join(release, 'win-unpacked');
const archivePath = path.join(release, 'T.Tool-1.1.0-x64-unpacked.zip');
const archiveName = 'T.Tool-1.1.0';

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function addDirectory(zip, directory, prefix) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) await addDirectory(zip, absolute, relative);
    else if (entry.isFile()) zip.addFile(absolute, relative, { compress: false });
  }
}

async function main() {
  const executables = (await fs.readdir(unpacked)).filter(name => name.toLowerCase().endsWith('.exe'));
  if (!executables.length || !(await exists(path.join(unpacked, 'resources', 'app.asar')))) {
    throw new Error(`未找到有效的解压版构建：${unpacked}`);
  }
  await fs.rm(archivePath, { force: true });
  const zip = new yazl.ZipFile();
  await addDirectory(zip, unpacked, archiveName);
  await new Promise((resolve, reject) => {
    zip.outputStream.on('error', reject);
    const output = zip.outputStream.pipe(createWriteStream(archivePath));
    output.on('error', reject);
    output.on('close', resolve);
    zip.end();
  });
  console.log(`已创建 ${archivePath}`);
}

await main();
