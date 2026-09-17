import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import serve from "electron-serve";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  downloadYoutubeVideo,
  hasSavedCookies,
  saveCookiesFile,
  clearCookiesFile,
  setPersistentDataDir,
} from "./youtube-downloader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appServe = serve({ directory: path.join(__dirname, "out") });

let mainWindow = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow = win;

  appServe(win)
    .then(() => {
      win.loadURL("app://-");
      if (!app.isPackaged) {
        win.webContents.openDevTools();
      }
    })
    .catch((err) => {
      console.error("Failed to serve app:", err);
    });
};

function setupIpcHandlers() {
  ipcMain.handle("youtube:check-cookies", () => {
    return { hasCookies: hasSavedCookies() };
  });

  ipcMain.handle("youtube:save-cookies", (_event, cookiesText) => {
    saveCookiesFile(cookiesText);
    return { success: true };
  });

  ipcMain.handle("youtube:clear-cookies", () => {
    clearCookiesFile();
    return { success: true };
  });

  ipcMain.handle("youtube:download", async (_event, url) => {
    try {
      const result = await downloadYoutubeVideo(url, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("youtube:progress", progress);
        }
      });
      return { success: true, data: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle("youtube:google-login", async () => {
    try {
      const url =
        "https://accounts.google.com/AccountChooser?service=youtube&continue=https%3A%2F%2Fwww.youtube.com";
      await shell.openExternal(url);
      return { success: true, openedBrowser: true };
    } catch (err) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("youtube:open-browser", async (_event, url) => {
    try {
      const targetUrl =
        url ||
        "https://accounts.google.com/AccountChooser?service=youtube&continue=https%3A%2F%2Fwww.youtube.com";
      await shell.openExternal(targetUrl);
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || String(err) };
    }
  });
}

app.whenReady().then(() => {
  setPersistentDataDir(app.getPath("userData"));
  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
