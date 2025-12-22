import { app, BrowserWindow, ipcMain, Menu, clipboard, shell, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import net from "net";
import fs from "fs";

let mainWindow = null;
const isDev = !app.isPackaged;

// ESM-замена __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function devLog(...args) {
  console.log("[MAIN]", ...args);
}

/* =========================
   MODEL.EXE AUTOSTART (DEV ONLY)
========================= */

// Твой путь: frontend/index.js -> .. -> ai/model.exe
const MODEL_EXE = path.join(__dirname, "..", "ai", "model.exe");

// Если модель реально поднимает сервер на порту, укажи.
// Если нет (или не уверен) оставь null, иначе будет "model not ready" как у тебя.
const MODEL_PORT = null; // например 8000, если точно слушает
const MODEL_HOST = "127.0.0.1";
const MODEL_WAIT_TIMEOUT_MS = 30000;

let modelProc = null;

function startModelExe() {
  if (modelProc) {
    devLog("model.exe already started, pid:", modelProc.pid);
    return;
  }

  devLog("Starting model.exe:", MODEL_EXE);

  if (!fs.existsSync(MODEL_EXE)) {
    console.error("[MAIN] model.exe not found:", MODEL_EXE);
    return;
  }

  modelProc = spawn(MODEL_EXE, [], {
    windowsHide: true,
    detached: true,
    stdio: "inherit",
  });

  devLog("model pid:", modelProc.pid);

  modelProc.on("error", (e) => {
    console.error("[MAIN] model.exe start error:", e);
  });

  modelProc.on("exit", (code, signal) => {
    devLog("model.exe exited:", { code, signal });
    modelProc = null;
  });

  // чтобы Electron не ждал этот процесс как дочерний
  modelProc.unref();
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tick = () => {
      const socket = new net.Socket();
      socket.setTimeout(800);

      const retry = () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Model port ${host}:${port} not ready (timeout ${timeoutMs}ms)`));
        } else {
          setTimeout(tick, 400);
        }
      };

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("timeout", () => {
        socket.destroy();
        retry();
      });

      socket.once("error", () => {
        socket.destroy();
        retry();
      });

      socket.connect(port, host);
    };

    tick();
  });
}

function stopModelExe() {
  if (!modelProc) return;

  devLog("Stopping model.exe, pid:", modelProc.pid);

  try {
    // На Windows прибиваем дерево процессов
    spawn("taskkill", ["/pid", String(modelProc.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } catch (e) {
    console.error("[MAIN] stopModelExe error:", e);
  } finally {
    modelProc = null;
  }
}

/* =========================
   SECURITY HELPERS
========================= */

function isHttpUrl(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

function isFileUrl(url) {
  return typeof url === "string" && url.startsWith("file://");
}

function isInternalNoteUrl(url) {
  return typeof url === "string" && (url.startsWith("note:") || url.startsWith("note-title:"));
}

/* =========================
   WINDOW
========================= */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const fullPath = path.join(__dirname, "renderer", "build", "index.html");
  devLog("loadFile:", fullPath);
  mainWindow.loadFile(fullPath);

  // ---------------- Безопасная навигация ----------------
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isHttpUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }

    if (isInternalNoteUrl(url)) {
      event.preventDefault();
      return;
    }

    if (isFileUrl(url)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
  });

  // window.open -> наружу только http/https
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
      devLog("did-fail-load:", { code, desc, url });
    });

    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

/* =========================
   APP LIFECYCLE
========================= */

app.whenReady().then(async () => {
  devLog("app ready (dev only)");

  // 1) стартуем модель
  startModelExe();

  // 2) опционально ждём порт
  if (MODEL_PORT != null) {
    try {
      await waitForPort(MODEL_PORT, MODEL_HOST, MODEL_WAIT_TIMEOUT_MS);
      devLog(`model port ready: ${MODEL_HOST}:${MODEL_PORT}`);
    } catch (e) {
      console.error("[MAIN] model not ready:", e);
      // не блокируем UI, просто логируем
    }
  }

  // 3) окно
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  stopModelExe();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* =========================
   IPC
========================= */

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
