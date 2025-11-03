const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getBackendMessage: async () => {
    const response = await fetch("http://localhost:3001/api/hello");
    return response.json();
  },
});