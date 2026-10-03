import {app, BrowserWindow, ipcMain, protocol, safeStorage, shell, Menu, dialog} from 'electron';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createChatGPT, ChatGPTError, CHATGPT_USAGE_URL} from '@siwc/local';
import {prepareRequest, parseGroundedResponse, isQuireSender} from './ai-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appUrl = 'quire://app/';
app.setName('Quire');
app.setPath('userData', join(app.getPath('appData'), 'Quire'));
protocol.registerSchemesAsPrivileged([{scheme: 'quire', privileges: {standard: true, secure: true, supportFetchAPI: true}}]);
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let window;
let chatgpt;
let state = {session: {status: 'disconnected', sharing: false}, profiles: [], models: [], selectedModel: '', accountBusy: false, notice: ''};
const requests = new Map();
const safeError = error => error instanceof ChatGPTError ? error.toJSON() : {
  code: 'quire_error',
  message: String(error?.message || '').startsWith('invalid_answer:') ? error.message.slice(15) :
    String(error?.message || '').startsWith('invalid_request:') ? 'This request is too large or has an unsupported format. Use a smaller selection.' :
    'Quire could not complete this action. Please try again.', retryable: true
};
function publish() {
  if (window && !window.isDestroyed()) window.webContents.send('quire:state-changed', structuredClone(state));
}
function abortRequests() { for (const request of requests.values()) request.abort(); }
function handle(name, action) {
  ipcMain.handle('quire:' + name, async (event, ...args) => {
    if (!isQuireSender(event, window)) return {ok: false, error: {code: 'invalid_sender', message: 'This action is available only inside Quire.'}};
    try { return {ok: true, value: await action(...args)}; }
    catch (error) { return {ok: false, error: safeError(error)}; }
  });
}
async function updateState() {
  state.session = await chatgpt.getSession();
  state.profiles = await chatgpt.listProfiles();
  state.models = [];
  if (state.session.sharing) {
    try { state.models = await chatgpt.listModels(); }
    catch (error) { state.notice = safeError(error).message; }
  }
  if (!state.models.some(m => m.slug === state.selectedModel)) state.selectedModel = state.models[0]?.slug || '';
  publish();
  return structuredClone(state);
}
async function accountAction(action) {
  if (state.accountBusy) throw new ChatGPTError('connection_busy', 'Finish or cancel sign-in first.');
  state.accountBusy = true; state.notice = ''; abortRequests(); publish();
  try { await action(); }
  finally { state.accountBusy = false; await updateState(); }
  return structuredClone(state);
}
function requestId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error('invalid_request:request ID');
  return id;
}
function registerIPC() {
  handle('state', () => structuredClone(state));
  handle('sign-in', options => {
    if (options && (typeof options !== 'object' || Object.keys(options).some(k => !['newProfile', 'reconsent'].includes(k)) || Object.values(options).some(v => typeof v !== 'boolean'))) throw new Error('invalid_request:sign-in');
    return accountAction(() => chatgpt.signIn(options || {}));
  });
  handle('cancel-sign-in', () => chatgpt.cancelSignIn());
  handle('disconnect', () => accountAction(() => chatgpt.disconnect()));
  handle('select-profile', id => {
    if (!state.profiles.some(p => p.id === id)) throw new Error('invalid_request:account');
    return accountAction(() => chatgpt.selectProfile(id));
  });
  handle('set-model', slug => {
    if (!state.models.some(m => m.slug === slug)) throw new Error('invalid_request:model');
    state.selectedModel = slug; publish(); return structuredClone(state);
  });
  handle('usage', () => shell.openExternal(CHATGPT_USAGE_URL));
  handle('cancel-request', id => requests.get(requestId(id))?.abort());
  handle('request', async (id, payload) => {
    id = requestId(id);
    if (requests.size || state.accountBusy) throw new ChatGPTError('connection_busy', 'Wait for the current answer or stop it first.');
    if (!state.session.sharing) throw new ChatGPTError('sharing_not_enabled', 'Connect your ChatGPT account and allow Quire to use your ChatGPT plan.');
    if (!state.selectedModel) throw new ChatGPTError('model_unavailable', 'No models are available. Reconnect your account or check ChatGPT usage settings.');
    const prepared = prepareRequest(payload);
    const controller = new AbortController();
    requests.set(id, controller);
    try {
      const result = await chatgpt.streamResponse({
        model: state.selectedModel, input: prepared.input, instructions: prepared.instructions, signal: controller.signal,
        onDelta: delta => {
          if (payload.kind === 'assistant' && window && !window.isDestroyed()) window.webContents.send('quire:response-delta', {id, delta});
        }
      });
      if (!result.text.trim()) throw new Error('invalid_answer:ChatGPT returned an empty answer. Try again.');
      return payload.kind === 'grounded' ? parseGroundedResponse(result.text, prepared.contexts) : {text: result.text};
    } finally { requests.delete(id); }
  });
}
const csp = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: blob:; img-src 'self' data: blob: https:; worker-src 'self' blob: https://cdn.jsdelivr.net; object-src 'none'; base-uri 'self'; frame-src 'none'";
async function setupAssets() {
  protocol.handle('quire', async request => {
    try {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      if (request.method !== 'GET' || url.hostname !== 'app' || !/^[a-z0-9.-]+\.(html|css|js|svg|webmanifest)$/i.test(name)) return new Response('Not found', {status: 404});
      const types = {html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', webmanifest: 'application/manifest+json'};
      return new Response(await readFile(join(root, name)), {headers: {'Content-Type': types[name.split('.').pop()] + '; charset=utf-8', 'Content-Security-Policy': csp}});
    } catch { return new Response('Not found', {status: 404}); }
  });
}
function createWindow() {
  window = new BrowserWindow({width: 1440, height: 960, minWidth: 900, minHeight: 650, title: 'Quire', backgroundColor: '#f3efe7',
    webPreferences: {preload: join(root, 'desktop/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true}
  });
  window.webContents.setWindowOpenHandler(({url}) => {
    if (url === 'about:blank') return {action: 'allow', overrideBrowserWindowOptions: {webPreferences: {sandbox: true, contextIsolation: true, nodeIntegration: false, preload: undefined}}};
    if (url.startsWith('https://')) void shell.openExternal(url);
    return {action: 'deny'};
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== appUrl && url !== appUrl + 'index.html') { event.preventDefault(); if (url.startsWith('https://')) void shell.openExternal(url); }
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window.on('closed', () => { abortRequests(); chatgpt?.cancelSignIn(); window = undefined; });
  void window.loadURL(appUrl);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label: 'File', submenu: [{label: 'ChatGPT usage', click: () => void shell.openExternal(CHATGPT_USAGE_URL)}, {type: 'separator'}, {role: 'quit'}]},
    {label: 'Edit', submenu: [{role: 'undo'}, {role: 'redo'}, {type: 'separator'}, {role: 'cut'}, {role: 'copy'}, {role: 'paste'}, {role: 'selectAll'}]},
    {label: 'View', submenu: [{role: 'reload'}, {role: 'resetZoom'}, {role: 'zoomIn'}, {role: 'zoomOut'}, {role: 'togglefullscreen'}]}
  ]));
}
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
app.on('window-all-closed', () => app.quit());
if (singleInstance) app.whenReady().then(async () => {
  chatgpt = createChatGPT({
    appName: 'Quire', appId: 'quire', redirectPort: 0, sendHostId: true, storageDir: join(app.getPath('userData'), 'chatgpt'),
    credentialEncryption: {
      id: 'electron-safe-storage-v1',
      isAvailable: () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || ['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'].includes(safeStorage.getSelectedStorageBackend())),
      encrypt: plaintext => safeStorage.encryptString(plaintext), decrypt: ciphertext => safeStorage.decryptString(Buffer.from(ciphertext))
    },
    openBrowser: url => { if (new URL(url).origin !== 'https://auth.openai.com') throw new Error('Unexpected authorization destination.'); return shell.openExternal(url); }
  });
  chatgpt.subscribe(session => { state.session = session; publish(); });
  await setupAssets(); registerIPC(); createWindow();
  try { await updateState(); } catch (error) { state.notice = safeError(error).message; publish(); }
}).catch(() => {
  dialog.showErrorBox('Quire could not start', 'Close Quire and try opening it again. If the problem continues, keep your Quire backups and report that the Windows app failed during startup.');
  app.quit();
});
