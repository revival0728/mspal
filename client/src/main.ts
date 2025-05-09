import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Client from './client';
import { EventEmitter } from 'events';
import packageInfo from "../package.json";

const client = new Client();
const bridge = new EventEmitter();
const middleVars: {
  nextMedia: Buffer | null,
  nextMediaName: string[],
} = {
  nextMedia: null,
  nextMediaName: [],
};
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // catch play, pause, next, next-media-ready, next-media-name, client-connected, client-closed events
  bridge.on("play", () => win.webContents.send("play"));
  bridge.on("pause", () => win.webContents.send("pause"));
  bridge.on("next", () => win.webContents.send("next"));
  bridge.on("next-media-name", (mediaName: string) => win.webContents.send("next-media-name", mediaName));
  bridge.on("next-media-ready", async () => {
    client.getNextMedia()?.then(nextMedia => {
      middleVars.nextMedia = nextMedia;
      client.sendToHost("READY");
    }).catch(() => {
      console.log("next media not ready");
    });
  });
  bridge.on("client-connected", (connected: string, clientId: string) => win.webContents.send("client-connected", connected, clientId));
  bridge.on("client-closed", () => win.webContents.send("client-closed"));

  win.loadFile(path.join(__dirname, 'index.html'))
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
      client.setupSocket(bridge.emit.bind(bridge), (...data: string[]) => {
        const now = new Date();
        console.log(`[${now.toLocaleTimeString()}]`,...data);
      });
      bridge.emit("client-connected", "true", client.clientId);
    } else {
      bridge.emit("client-connected", "false");
    }
  });
  ipcMain.handle("ready", () => client.sendToHost("READY"));
  ipcMain.handle("get-next-media", () => middleVars.nextMedia);
  ipcMain.handle("get-next-media-name", () => middleVars.nextMediaName.shift());
  ipcMain.handle("push-next-media-name", (_, name: string) => { 
    middleVars.nextMediaName.push(name);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
