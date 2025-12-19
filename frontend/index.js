const { app, BrowserWindow, ipcMain, Menu, clipboard } = require("electron");
const path = require("path");

let mainWindow = null;
const isDev = !app.isPackaged;

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
  mainWindow.loadFile(fullPath);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("show-context-menu", (event, payload) => {
  const wc = event.sender;

  const hasSelection = !!payload?.hasSelection;
  const isEditable = !!payload?.isEditable;
  const selectScope = payload?.selectScope; // "note" | "global"

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
