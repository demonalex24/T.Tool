const { contextBridge, ipcRenderer } = require('electron');

const invoke = (action, ...args) => ipcRenderer.invoke('t-tool:' + action, ...args).catch(error => ({ ok: false, error: error.message || '桌面通信失败，请重新打开软件。' }));
const subscribe = (channel, callback) => {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('desktop', Object.freeze({
  newProject: name => invoke('new-project', name),
  openProject: () => invoke('open-project'),
  openRecent: directory => invoke('open-recent', directory),
  saveProject: project => invoke('save-project', project),
  saveAs: project => invoke('save-as', project),
  exportProject: project => invoke('export-project', project),
  importMedia: () => invoke('import-media'),
  importNodeImage: () => invoke('import-node-image'),
  readPreferences: () => invoke('read-preferences'),
  writePreferences: value => invoke('write-preferences', value),
  onCloseRequested: callback => subscribe('t-tool:close-requested', callback),
  respondClose: action => invoke('respond-close', action),
  onMenuAction: callback => subscribe('t-tool:menu-action', callback),
}));
