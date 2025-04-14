import { FS } from "./file";
import { genKeyOrId } from "./utilities";

function genId(): string {
  const mat = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  return genKeyOrId(mat, 8);
}

export default class Client {
  #clientId: string | null = null;
  #socket: WebSocket | null = null;
  #fs: FS = new FS();
  #chuncks: string[] = [];
  #mediaExt: string = "";
  #mediaName: string = "";
  #chunckCount: number = 0;
  #useMRSCK: boolean = false; // to prevent race condition like error between MRSCK and MEDCK
  get clientId(): string | null { return this.#clientId }
  get socket(): WebSocket | null { return this.#socket }

  constructor() {}

  connected(): boolean {
    return this.#clientId !== null && this.#socket !== null;
  }
  async connect(url: string, key: string, ssl?: boolean): Promise<boolean> {
    console.log("connect()");

    try {
      const authUrl = `${ssl ? "https" : "http"}://${url}/auth`;
      let clientId = "";
      let success = false;
      let reGenId = true;
      do {
        clientId = genId();
        console.log("auth");
        const auth = await fetch(authUrl, {
          method: "POST",
          body: JSON.stringify({
            authKey: key,
            clientId,
          })
        });
        const json = JSON.parse(await auth.json());
        success = json.success;
        if(success) {
          reGenId = false;
        } else if(!("reGenId" in json)) {
          const { msg } = json;
          console.log(msg);
          reGenId = false;
        }
      } while(reGenId);
      if(!success) return false;

      const wsUrl = `${ssl ? "wss" : "ws"}://${url}/connect?clientId=${clientId}`;
      const socket = new WebSocket(wsUrl);

      this.#fs.setHostName(btoa(url));
      this.#clientId = clientId;
      this.#socket = socket;
      return true;
    } catch {
      return false;
    }
  }
  sendToHost(msg: string) {
    if(msg.length > 5) return;
    for(let i = 0; i < 5 - msg.length; ++i)
      msg += " ";
    this.socket?.send(msg);
  }
  setupSocket(emit: (e:string, ...args:string[]) => void, logFn: (...s:string[]) => void) {
    const clientId = this.#clientId;
    const socket = this.#socket;
    if(clientId === null || socket === null) {
      logFn("Client didn't connect to any host");
      return;
    }
    logFn("socket");
    const storeMedia = () => {
      this.#fs.storeMedia(this.#mediaName + this.#mediaExt, this.#chuncks).then(() => {
        logFn("storeMedia success");
        emit("next-media-ready");
      }).catch((_err) => {
        logFn("storeMedia error");
      });
    }
    socket.addEventListener("open", (_event) => {
      logFn("socket open");
    });
    socket.addEventListener("close", (_event) => {
      this.#clientId = null;
      this.#socket = null;
      logFn("socket close");
      emit("client-closed");
    });
    socket.addEventListener("message", (event) => {
      if(typeof event.data !== 'string') return;
      const ins = event.data.slice(0, 5).trim();
      // logFn(`ins: ${ins}`);
      const data = event.data.slice(5, event.data.length).trim();
      switch(ins) {
        case "PING":
          this.sendToHost("PING");
          break;
        case "PLAY":
          logFn("host: PLAY");
          emit("play");
          break;
        case "PAUSE":
          logFn("host: PAUSE");
          emit("pause");
          break;
        case "NEXT":
          logFn("host: NEXT");
          emit("next");
          break;
        case "NMED": {
          logFn("host: NMED");
          const params = data.match(/\[.+?\]/g);
          if(params === null) {
            logFn("params null");
            break;
          }
          if(params.length !== 3) {
            logFn("params.length !== 3");
            break;
          }
          this.#useMRSCK = false;
          const [name, _chunckCount, ext] = params.map(s => s.slice(1, s.length - 1));
          emit("next-media-name", name);
          this.#mediaName = name;
          this.#mediaExt = ext;
          if(this.#fs.existMedia(name + ext)) {
            logFn("Media already exist");
            emit("next-media-ready");
            this.sendToHost("CACHE");
            break;
          }
          const chunckCount = parseInt(_chunckCount);
          this.#chunckCount = chunckCount;
          this.#chuncks = new Array(chunckCount).fill("");
          logFn(`name: ${name}, chunck_count: ${chunckCount}, ext: ${ext}`);
          this.sendToHost("NCHNK");
          break;
        }
        case "MEDCK": {
          if(this.#useMRSCK) {
            logFn("host: using MRSCK, skipping MEDCK");
            return;
          }
          // logFn("host: MEDCK");
          const params = data.split(" ");
          if(params === null) {
            logFn("params null");
            break;
          }
          if(params.length !== 2) {
            logFn("params.length !== 2");
            break;
          }
          const [_id, chunck] = params;
          const id = parseInt(_id);
          if(id < this.#chunckCount) 
            this.#chuncks[id] = chunck;
          if(id < this.#chunckCount - 1)
            this.sendToHost("NCHNK");
          if(id === this.#chunckCount - 1) {
            storeMedia();
          }
          // logFn(`id: ${id}, data_length: ${chunck.length}`)
          break;
        }
        case "MRSCK": {
          logFn("host: MRSCK");
          const params = data.split(" ");
          if(params === null) {
            logFn("params null");
            break;
          }
          this.#useMRSCK = true;
          const [_start, ...sepChuncks] = params;
          const start = parseInt(_start);
          //TODO: Fix MRSCK tramsit error issue
          for(let i = 0; i < sepChuncks.length; ++i) {
            if(start + i < this.#chunckCount)
              this.#chuncks[start + i] = sepChuncks[i];
            else
              logFn("start + i > chunckCount");
          }
          storeMedia();
          logFn(`start: ${start}, chunck_count: ${sepChuncks.length}`)
          break;
        }
      }
    });
  }
  getNextMedia(): Promise<Buffer> | undefined {
    return this.#fs.getMedia(this.#mediaName + this.#mediaExt);
  }
}
