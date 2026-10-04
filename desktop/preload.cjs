const {contextBridge, ipcRenderer} = require('electron');
async function invoke(name, ...args) {
  const result = await ipcRenderer.invoke('quire:' + name, ...args);
  if (!result.ok) { const error = new Error(result.error.message); error.code = result.error.code; throw error; }
  return result.value;
}
function listen(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on('quire:' + channel, listener);
  return () => ipcRenderer.removeListener('quire:' + channel, listener);
}
contextBridge.exposeInMainWorld('QuireDesktop', Object.freeze({
  getState: () => invoke('state'),
  signIn: options => invoke('sign-in', options),
  cancelSignIn: () => invoke('cancel-sign-in'),
  disconnect: () => invoke('disconnect'),
  selectProfile: id => invoke('select-profile', id),
  setModel: slug => invoke('set-model', slug),
  manageUsage: () => invoke('usage'),
  getLibraryState: () => invoke('library-state'),
  chooseLibraryFolder: () => invoke('library-folder'),
  syncLibrary: () => invoke('library-sync'),
  stopLibraryCopy: () => invoke('library-stop-copy'),
  openLibraryFolder: kind => invoke('library-open', kind),
  savePdf: (id, bytes, name) => invoke('pdf-save', id, bytes, name),
  getPdf: id => invoke('pdf-get', id),
  hasPdf: id => invoke('pdf-has', id),
  removePdf: id => invoke('pdf-remove', id),
  request: (id, payload) => invoke('request', id, payload),
  cancelRequest: id => invoke('cancel-request', id),
  onState: callback => listen('state-changed', callback),
  onDelta: callback => listen('response-delta', callback)
}));
