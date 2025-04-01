
const getInfoVersion = async () => {
  const information = document.getElementById('version-info');

  if(information instanceof HTMLParagraphElement) {
    const versions = window.versions;
    const infoList = [
      `MSPal Client: v${await versions.mspalClient()}`,
      `Chromium: v${await versions.chrome()}`,
      `Node.js: v${await versions.node()}`,
      `Electron: v${await versions.electron()}`,
    ];
    information.innerText = infoList.join("\n");
  }
}

// TODO: add acual play/pause/next media button functionality
const setupControlPanel = () => {
  const ppBtn = document.getElementById("play-pause");
  if(ppBtn instanceof HTMLButtonElement) {
    ppBtn.addEventListener("click", () => {
      const pp = ppBtn.classList.contains("play");
      window.client.socketSend(pp ? "PAUSE" : "PLAY");
      ppBtn.classList.toggle("play");
      ppBtn.classList.toggle("pause");
      console.log("play pause");
    });
  }
  const snBtn = document.getElementById("skip-next");
  if(snBtn instanceof HTMLButtonElement) {
    snBtn.addEventListener("click", () => {
      window.client.socketSend("NEXT");
      console.log("skip next");
    });
  }
}

const setupConnectionPanel = () => {
  const connectBtn = document.getElementById("connect-btn");
  if(connectBtn instanceof HTMLButtonElement) {
    connectBtn.addEventListener("click", () => {
      connectBtn.classList.add("connecting");
      const urlInput = document.getElementById("connect-url") as HTMLInputElement;
      const keyInput = document.getElementById("connect-key") as HTMLInputElement;
      const sslInput = document.getElementById("connect-ssl") as HTMLInputElement;
      const logFn = (msg: string) => {
        console.log(msg);
      };
      window.client.connect(urlInput.value, keyInput.value, sslInput.checked);
    });
  }
}

(async () => {
  getInfoVersion();
  setupConnectionPanel();
  setupControlPanel();
})();
