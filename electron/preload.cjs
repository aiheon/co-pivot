const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('coPivot', {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  resumeSession: (sessionId, terminal) => ipcRenderer.invoke('sessions:resume', {sessionId, terminal}),
  getPreferredTerminal: () => ipcRenderer.invoke('preferences:getTerminal'),
  setPreferredTerminal: (terminal) => ipcRenderer.invoke('preferences:setTerminal', terminal),
});
