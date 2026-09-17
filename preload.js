const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  checkCookies: () => ipcRenderer.invoke("youtube:check-cookies"),
  saveCookies: (cookiesText) =>
    ipcRenderer.invoke("youtube:save-cookies", cookiesText),
  clearCookies: () => ipcRenderer.invoke("youtube:clear-cookies"),
  downloadYoutube: (url) => ipcRenderer.invoke("youtube:download", url),
  loginGoogle: () => ipcRenderer.invoke("youtube:google-login"),
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("youtube:progress", handler);
    return () => ipcRenderer.removeListener("youtube:progress", handler);
  },
});
