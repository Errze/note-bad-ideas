const { app, BrowserWindow } = require('electron');
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  //mainWindow.loadFile('build/index.html');
  const fullPath = path.join(__dirname, "renderer", "build", "index.html");
  win.loadFile(fullPath);
  win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});