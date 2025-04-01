import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  mspalClient: () => ipcRenderer.invoke("mspal-client-version"),
});

contextBridge.exposeInMainWorld('client', {
  connect: (url: string, key: string, ssl: boolean) => 
    ipcRenderer.invoke("connect", url, key, ssl),
  socketSend: (msg: string) => ipcRenderer.invoke("socket-send", msg),
});

window.addEventListener("DOMContentLoaded", async () => {
  const connected = await ipcRenderer.invoke("client-connection-status");
  if(!connected) {
    const connectionPanel = document.getElementById("connection-panel");
    if(connectionPanel instanceof HTMLDivElement) {
      connectionPanel.classList.remove("hidden");
      connectionPanel.classList.add("connection-panel");
    }
  } else {
    const controlPanel = document.getElementById("control-panel");
    if(controlPanel instanceof HTMLDivElement) {
      controlPanel.classList.remove("hidden");
      controlPanel.classList.add("control-panel");
    }
  }
  setupMsgBridgeListener();
});

const setupMsgBridgeListener = () => {
  const msgBridgeOn = (e: string, h: (...args: string[]) => void) => {
    ipcRenderer.on(e, (_event, ...args: string[]) => {
      h(...args);
    })
  };
  msgBridgeOn("play", () => {
    const ppBtn = document.getElementById("play-pause");
    if(ppBtn instanceof HTMLButtonElement) {
      ppBtn.classList.toggle("pause");
      ppBtn.classList.toggle("play");
    }
  });
  msgBridgeOn("pause", () => {
    const ppBtn = document.getElementById("play-pause");
    if(ppBtn instanceof HTMLButtonElement) {
      ppBtn.classList.toggle("pause");
      ppBtn.classList.toggle("play");
    }
  });
  msgBridgeOn("next", async () => {
    const nextMeida = await ipcRenderer.invoke("get-next-media");
    const url = URL.createObjectURL(nextMeida);
  });
  msgBridgeOn("next-media-name", (mediaName) => {
    const nextPara = document.getElementById("next-media-name");
    if(nextPara instanceof HTMLParagraphElement) {
      nextPara.innerText = mediaName;
    }
  });
  msgBridgeOn("client-connected", (connected) => {
    if(connected === "true") {
      const connectionPanel = document.getElementById("connection-panel");
      const controlPanel = document.getElementById("control-panel");
      if(connectionPanel instanceof HTMLDivElement) {
        connectionPanel.classList.remove("connection-panel");
        connectionPanel.classList.add("hidden");
      }
      if(controlPanel instanceof HTMLDivElement) {
        controlPanel.classList.remove("hidden");
        controlPanel.classList.add("control-panel");
      }
    }
  });
}