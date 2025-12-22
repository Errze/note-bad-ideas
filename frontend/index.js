import { app, BrowserWindow, ipcMain, Menu, clipboard, shell, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";

let mainWindow = null;
const isDev = !app.isPackaged;

// ESM-замена __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function devLog(...args) {
  if (isDev) console.log("[MAIN]", ...args);
}

function isHttpUrl(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

function isFileUrl(url) {
  return typeof url === "string" && url.startsWith("file://");
}

function isInternalNoteUrl(url) {
  return typeof url === "string" && (url.startsWith("note:") || url.startsWith("note-title:"));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Если у тебя preload на require() и всё работает, можешь оставить sandbox: true.
      // Но если начнутся "require is not defined" в preload, ставь sandbox: false.
      sandbox: true,
    },
  });

  const fullPath = path.join(__dirname, "renderer", "build", "index.html");
  devLog("loadFile:", fullPath);
  mainWindow.loadFile(fullPath);

  // ---------------- Безопасная навигация ----------------
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Разрешаем только навигацию на тот же index.html (редко, но бывает)
    // Всё остальное либо наружу, либо блок.
    if (isHttpUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }

    // внутренняя "note:" навигация должна обрабатываться приложением, не браузером
    if (isInternalNoteUrl(url)) {
      event.preventDefault();
      return;
    }

    // file:// переходы режем (в том числе чтобы не прыгать по локальным файлам)
    if (isFileUrl(url)) {
      event.preventDefault();
      return;
    }

    // Всё неизвестное блокируем
    event.preventDefault();
  });

  // window.open -> наружу только http/https
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // ---------------- Жизненные события ----------------
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // ---------------- Диагностика (dev only) ----------------
  if (isDev) {
    mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
      devLog("did-fail-load:", { code, desc, url });
    });

    mainWindow.webContents.on("render-process-gone", (_e, details) => {
      devLog("render-process-gone:", details);
    });

    mainWindow.webContents.on("unresponsive", () => {
      devLog("window unresponsive");
    });

    mainWindow.webContents.on("responsive", () => {
      devLog("window responsive again");
    });

    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  devLog("app ready");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------------- IPC ---------------- */
ipcMain.on("show-context-menu", (event, payload) => {
  const wc = event.sender;

  const hasSelection = !!payload?.hasSelection;
  const isEditable = !!payload?.isEditable;
  const selectScope = payload?.selectScope;

  const template = [
    { label: "Копировать", enabled: hasSelection, click: () => wc.copy() },
    { label: "Вырезать", enabled: hasSelection && isEditable, click: () => wc.cut() },
    {
      label: "Вставить",
      enabled: isEditable,
      click: () => {
        const text = clipboard.readText();
        if (text) wc.insertText(text);
      },
    },
    { type: "separator" },
    {
      label: "Выделить всё (в заметке)",
      enabled: selectScope === "note",
      click: () => wc.send("select-all-in-note"),
    },
  ];

  Menu.buildFromTemplate(template).popup({
    window: BrowserWindow.fromWebContents(wc),
  });
});

ipcMain.on("copy-to-clipboard", (_event, { text }) => {
  clipboard.writeText(String(text ?? ""));
});

ipcMain.handle("pick-directory", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled) return null;
  return res.filePaths?.[0] || null;
});
