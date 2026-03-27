const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('coPivot', {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
});
