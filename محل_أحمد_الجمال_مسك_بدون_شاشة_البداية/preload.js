const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopAPI', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  getDataPath: () => ipcRenderer.invoke('data:path'),
  getJournalPath: () => ipcRenderer.invoke('journal:path'),
  listJournalFiles: () => ipcRenderer.invoke('journal:list'),
  readJournalFile: (name) => ipcRenderer.invoke('journal:read', name)
});
