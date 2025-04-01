import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Client from './client';
import { EventEmitter } from 'events';
import packageInfo from "../package.json";

const client = new Client();
const bridge = new EventEmitter();
const middleVars: {
  nextMedia: Blob | null;
} = {
  nextMedia: null
};
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // catch play, pause, next, next-media-ready, next-media-name events
  bridge.on("play", () => win.webContents.send("play"));
  bridge.on("pause", () => win.webContents.send("pause"));
  bridge.on("next", () => win.webContents.send("next"));
  bridge.on("next-media-name", (mediaName: string) => win.webContents.send("next-media-name", mediaName));
  bridge.on("next-media-ready", async () => {
    const _nextMeida = await client.getNextMedia();
    if(_nextMeida) {
      middleVars.nextMedia = _nextMeida;
    } else {
      console.log("next media not ready");
    }
  });
  bridge.on("client-connected", (connected: string) => win.webContents.send("client-connected", connected));

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  
  ipcMain.handle("mspal-client-version", () => packageInfo.version);
  ipcMain.handle("socket-send", (_event, msg: string) => {
    client.sendToHost(msg);
  });
  ipcMain.handle("client-connection-status", () => client.connected());
  ipcMain.handle("connect", async (_event, url: string, key: string, ssl: boolean) => {
    const success = await client.connect(url, key, ssl);
    if(success) {
      client.setupSocket(bridge.emit.bind(bridge), console.log);
      bridge.emit("client-connected", "true");
    } else {
      bridge.emit("client-connected", "false");
    }
  });
  ipcMain.handle("get-next-media", () => middleVars.nextMedia);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
