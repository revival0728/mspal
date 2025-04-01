import { genKeyOrId } from "@/utilities.ts";

function genId(): string {
  const mat = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  return genKeyOrId(mat, 8);
}

async function connect(): Promise<[string, WebSocket]> {
  console.log("connect()");
  let clientId = "";
  let reGenId = true;
  do {
    clientId = genId();
    console.log("auth");
    const auth = await fetch("http://localhost:3000/auth", {
      method: "POST",
      body: JSON.stringify({
        authKey: "dev",
        clientId,
      })
    });
    const json = JSON.parse(await auth.json());
    const { success } = json;
    if(success) {
      reGenId = false;
    } else if(!("reGenId" in json)) {
      const { msg } = json;
      console.log(msg);
      reGenId = false;
    }
  } while(reGenId);
  const socket = new WebSocket(`ws://localhost:3000/connect?clientId=${clientId}`);
  return [clientId, socket];
}

async function main() {
  const [clientId, socket] = await connect();
  console.log("socket");
  socket.addEventListener("message", (event) => {
    if(typeof event.data !== 'string') return;
    const ins = event.data.slice(0, 5).trim();
    console.log(`ins: ${ins}`);
    const data = event.data.slice(5, event.data.length).trim();
    switch(ins) {
      case "PING":
        socket.send("PING ");
        break;
      case "PLAY":
        console.log("host: PLAY");
        break;
      case "PAUSE":
        console.log("host: PAUSE");
        break;
      case "NEXT":
        console.log("host: NEXT");
        break;
      case "NMED": {
        console.log("host: NMED");
        const params = data.match(/\[.+?\]/g);
        if(params === null) {
          console.log("params null");
          break;
        }
        if(params.length !== 3) {
          console.log("params.length !== 3");
          break;
        }
        const [name, _chunckCount, ext] = params.map(s => s.slice(1, s.length - 1));
        const chunckCount = parseInt(_chunckCount);
        console.log(`name: ${name}, chunck_count: ${chunckCount}, ext: ${ext}`);
        for(let i = 0; i < chunckCount; ++i) {
          socket.send("NCHNK");
        }
        break;
      }
      case "MEDCK": {
        console.log("host: MEDCK");
        const params = data.split(" ");
        if(params === null) {
          console.log("params null");
          break;
        }
        if(params.length !== 2) {
          console.log(params);
          console.log("params.length !== 2");
          break;
        }
        const [id, chunck] = params;
        console.log(`id: ${id}, data_length: ${chunck.length}`)
        break;
      }
      case "MRSCK":
        console.log("host: MRSCK");
        console.log(`data_length: ${data.length}`)
        break;
    }
  });
}

if(import.meta.main) {
  console.log("Running test-client")
  main();
}
