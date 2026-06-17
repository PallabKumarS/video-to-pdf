import { app, BrowserWindow } from 'electron';
import serve from 'electron-serve';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appServe = serve({ directory: path.join(__dirname, 'out') });

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

  appServe(win).then(() => {
    win.loadURL('app://-');
    if (!app.isPackaged) {
      win.webContents.openDevTools();
    }
  }).catch((err) => {
    console.error('Failed to serve app:', err);
  });
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
