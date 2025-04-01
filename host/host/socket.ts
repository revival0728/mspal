import type { Host } from "@/host.ts";
import { asyncFn } from "@/utilities.ts";

/*
 * message rule
 * XXXXX{Body}
 *
 * host instruction
 * NEXT -> next music
 * PAUSE -> pause music
 * PLAY -> play music
 * PING -> test ping
 * NMED[{NAME}][{CHUNCK_COUNT}][{FILE_EXT}] -> trasmit media file
 *  => MEDCK {CHUNCK_ID} {N_KB_SIZE_DATA} -> media chunck
 *  => MRSCK {START} {REST_OF_DATA[]} -> rest of media chunck
 *
 * client instruction
 * NEXT -> next music
 * PAUSE -> pause music
 * PLAY -> play music
 * PING -> response host PING
 * NCHNK -> next media chunck
 * CACHE -> media chached
 * READY -> client is ready to play media
 *
 */

export class Inst {
  static NEXT = "NEXT ";
  static PAUSE = "PAUSE";
  static PLAY = "PLAY ";
  static PING = "PING ";
  static NCHNK = "NCHNK";
  static CACHE = "CACHE";
  static READY = "READY";
  static NMED = (NAME: string, CHUNCK_COUNT: number, FILE_EXT: string) => `NMED [${NAME}][${CHUNCK_COUNT}][${FILE_EXT}]`;
  static MEDCK = (CHUNCK_ID: number, N_KB_SIZE_DATA: string) => `MEDCK ${CHUNCK_ID} ${N_KB_SIZE_DATA}`;
  static MRSCK = (START: number, REST_OF_DATA: string[]) => `MRSCK ${START} ${REST_OF_DATA.join(" ")}`;
}

export function setupSocket(host: Host, socket: WebSocket, clientId: string) {
  socket.addEventListener("open", () => {
    host.stdout(`client@${clientId} connected`);
    host.initDelivery(clientId);
    host.ping();
  });
  socket.addEventListener("close", () => {
    host.stdout(`client@${clientId} disconnected`)
    host.removeClient(clientId);
  });
  socket.addEventListener("message", (msg) => {
    if(typeof msg.data !== 'string') {
      socket.send("Unsupported data type");
      return;
    }
    const data = msg.data;
    const ins = data.slice(0, 5);
    const broadcastIns = (i: string) => host.broadcast(asyncFn((s) => s.send(i)));
    switch(ins) {
      case Inst.NEXT:
        broadcastIns(Inst.NEXT);
        host.msman?.next();
        break;
      case Inst.PAUSE:
        broadcastIns(Inst.PAUSE);
        host.msman?.pause();
        break;
      case Inst.PLAY:
        broadcastIns(Inst.PLAY);
        host.msman?.play();
        break;
      case Inst.PING:
        host.setPing(clientId, Date.now());
        break;
      case Inst.NCHNK:
        host.deliver(clientId);
        break;
      case Inst.CACHE:
        host.clientCached(clientId);
        break;
      case Inst.READY:
        host.clientReady(clientId);
        break;
    }
  })
  host.addClient(clientId, socket);
}
