const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve');
const path = require('node:path');

const appServe = app.isPackaged ? serve({ directory: path.join(__dirname, 'out') }) : serve({ directory: path.join(__dirname, 'out') });

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  if (app.isPackaged) {
    appServe(win).then(() => {
      win.loadURL('app://-');
    });
  } else {
    appServe(win).then(() => {
      win.loadURL('app://-');
      win.webContents.openDevTools();
      win.webContents.on('did-fail-load', (_e, _code, desc) => {
        console.log('Failed to load:', desc);
      });
    });
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
