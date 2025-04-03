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

const setupControlPanel = () => {
  const ppBtn = document.getElementById("play-pause") as HTMLButtonElement;
  ppBtn.addEventListener("click", () => {
    const pp = ppBtn.classList.contains("play");
    if(!pp) {
      window.client.socketSend("PAUSE");
      ppBtn.classList.remove("play");
      ppBtn.classList.add("pause");
    } else {
      window.client.socketSend("PLAY");
      ppBtn.classList.add("play");
      ppBtn.classList.remove("pause");
    }
    console.log("play pause");
  });

  const snBtn = document.getElementById("skip-next") as HTMLButtonElement;
  snBtn.addEventListener("click", () => {
    window.client.socketSend("NEXT");
    console.log("skip next");
  });
}

const setupConnectionPanel = () => {
  const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement;
  connectBtn.addEventListener("click", () => {
    connectBtn.classList.add("connecting");
    const urlInput = document.getElementById("connect-url") as HTMLInputElement;
    const keyInput = document.getElementById("connect-key") as HTMLInputElement;
    const sslInput = document.getElementById("connect-ssl") as HTMLInputElement;
    window.client.connect(urlInput.value.trim(), keyInput.value.trim(), sslInput.checked);
  });
}

(async () => {
  getInfoVersion();
  setupConnectionPanel();
  setupControlPanel();
})();
