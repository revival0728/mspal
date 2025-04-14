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

  const audioElement = document.getElementById("audio") as HTMLAudioElement;
  const audioCtx = new AudioContext();
  const track = new MediaElementAudioSourceNode(audioCtx, {
    mediaElement: audioElement
  });

  const gainNode = new GainNode(audioCtx);
  const volCtrl = document.getElementById("volume") as HTMLInputElement;
  volCtrl.addEventListener("input", () => {
    gainNode.gain.value = Number(volCtrl.value) / 100;
  });

  track.connect(gainNode).connect(audioCtx.destination);

  setupMsgBridgeListener(audioCtx);
});

const setupMsgBridgeListener = (audioCtx: AudioContext) => {
  const msgBridgeOn = (e: string, h: (...args: string[]) => void) => {
    ipcRenderer.on(e, (_event, ...args: string[]) => {
      h(...args);
    })
  };
  msgBridgeOn("play", () => {
    const ppBtn = document.getElementById("play-pause") as HTMLButtonElement;
    const snBtn = document.getElementById("skip-next") as HTMLButtonElement;
    const audioElement = document.getElementById("audio") as HTMLAudioElement;
    if(audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    audioElement.play();
    ppBtn.classList.add("pause");
    ppBtn.classList.remove("play");
    ppBtn.disabled = false;
    snBtn.disabled = false;
  });
  msgBridgeOn("pause", () => {
    const ppBtn = document.getElementById("play-pause") as HTMLButtonElement;
    const snBtn = document.getElementById("skip-next") as HTMLButtonElement;
    const audioElement = document.getElementById("audio") as HTMLAudioElement;
    if(audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    audioElement.pause();
    ppBtn.classList.remove("pause");
    ppBtn.classList.add("play");
    ppBtn.disabled = false;
    snBtn.disabled = false;
  });
  msgBridgeOn("next", () => {
    ipcRenderer.invoke("get-next-media").then(nextMedia => {
      const blob = new Blob([nextMedia]);
      const url = URL.createObjectURL(blob);
      const audioElement = document.getElementById("audio") as HTMLAudioElement;
      URL.revokeObjectURL(audioElement.src);
      audioElement.src = url;
      ipcRenderer.invoke("ready");
    });
    ipcRenderer.invoke("get-next-media-name").then(name => {
      const mnPara = document.getElementById("media-name") as HTMLParagraphElement;
      const mnContainer = document.getElementById("media-name-container") as HTMLDivElement;
      mnPara.innerText = name;
      if(mnContainer.clientWidth < mnPara.clientWidth) {
        mnContainer.classList.add("display-overflow");
      } else {
        mnContainer.classList.remove("display-overflow");
      }
    });
  });
  msgBridgeOn("next-media-name", (mediaName) => {
    const nextPara = document.getElementById("next-media-name") as HTMLParagraphElement;
    nextPara.innerText = mediaName;
    ipcRenderer.invoke("push-next-media-name", mediaName);
  });
  msgBridgeOn("client-connected", (connected, clientId) => {
    if(connected === "true") {
      const connectionPanel = document.getElementById("connection-panel") as HTMLDivElement;
      connectionPanel.classList.remove("connection-panel");
      connectionPanel.classList.add("hidden");

      const controlPanel = document.getElementById("control-panel") as HTMLDivElement;
      controlPanel.classList.remove("hidden");
      controlPanel.classList.add("control-panel");
      const clientIdPara = document.getElementById("client-id") as HTMLParagraphElement;
      clientIdPara.innerText = clientId;
    } else {
      const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement;
      connectBtn.classList.remove("connecting");

      const errMsg = document.getElementById("err-msg") as HTMLSpanElement;
      errMsg.classList.add("disconnected");
      errMsg.classList.remove("hidden");
    }
  });
  msgBridgeOn("client-closed", () => {
    // clean up preivous connection
    const audioElement = document.getElementById("audio") as HTMLAudioElement;
    audioElement.pause();
    audioElement.src = "";
    const ppBtn = document.getElementById("play-pause") as HTMLButtonElement;
    ppBtn.classList.remove("pause");
    ppBtn.classList.add("play");
    ppBtn.disabled = false;
    const snBtn = document.getElementById("skip-next") as HTMLButtonElement;
    snBtn.disabled = false;
    const mnPara = document.getElementById("media-name") as HTMLParagraphElement;
    mnPara.innerText = "😄-🎵-🎵-🎵-😄";
    mnPara.classList.remove("display-overflow");
    const nmnPara = document.getElementById("next-media-name") as HTMLParagraphElement;
    nmnPara.innerText = "███████████";
    const clientIdPara = document.getElementById("client-id") as HTMLParagraphElement;
    clientIdPara.innerText = "";

    const connectionPanel = document.getElementById("connection-panel") as HTMLDivElement;
    connectionPanel.classList.add("connection-panel");
    connectionPanel.classList.remove("hidden");

    const controlPanel = document.getElementById("control-panel") as HTMLDivElement;
    controlPanel.classList.add("hidden");
    controlPanel.classList.remove("control-panel");

    const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement;
    connectBtn.classList.remove("connecting");


    const errMsg = document.getElementById("err-msg") as HTMLSpanElement;
    errMsg.classList.add("disconnected");
    errMsg.classList.remove("hidden");
  });
}