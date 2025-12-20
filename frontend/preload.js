// preload.js (CommonJS, чтобы Electron не истерил)
const { contextBridge, ipcRenderer } = require("electron");

function safeError(e) {
  return String((e && e.message) || e || "Unknown error");
}

async function fetchJsonWithTimeout(url, { timeoutMs = 5000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: ctrl.signal });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    if (!res.ok) {
      const msg =
        data && typeof data === "object" && data.error ? data.error : `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

contextBridge.exposeInMainWorld("api", {
  getBackendMessage: async () => {
    try {
      return await fetchJsonWithTimeout("http://localhost:3001/api/hello", { timeoutMs: 5000 });
    } catch (e) {
      return { error: safeError(e) };
    }
  },

  showContextMenu: (payload) => ipcRenderer.send("show-context-menu", payload),

  onSelectAllInNote: (cb) => {
    if (typeof cb !== "function") return () => {};

    const handler = () => cb();
    ipcRenderer.on("select-all-in-note", handler);

    return () => ipcRenderer.removeListener("select-all-in-note", handler);
  },

  copyToClipboard: (text) =>
    ipcRenderer.send("copy-to-clipboard", { text: String(text ?? "") }),
});
