const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getBackendMessage: async () => {
    try {
      const res = await fetch("http://localhost:3001/api/hello");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { error: String(e?.message || e) };
    }
  },

  showContextMenu: (payload) => ipcRenderer.send("show-context-menu", payload),
  onSelectAllInNote: (cb) => ipcRenderer.on("select-all-in-note", cb),
  copyToClipboard: (text) => ipcRenderer.send("copy-to-clipboard", { text }),
});