import hostRoutes from "@/host/routes.ts";
import { AbortFn, ClientStatus, HostAction, Routes } from "@/type.d.ts";
import { asyncFn, genKeyOrId, getENV, sleep } from "@/utilities.ts";
import { Term } from "@/term.ts";
import { MSMan } from "@/host/msman.ts";
import * as path from "@std/path";
import { Inst } from "@/host/socket.ts";
import { EventEmitter } from "node:events";
import { setupTerm } from "@/cmdd.ts";

const supprotedMediaType = [".mp3"];

export class Host {
  #CHUNCK_SIZE = 2048;
  #chunck_count = 0;
  #chuncks: string[] = [];
  #authKey = ""
  #name = "dev"
  #clients: { [clientId: string]: WebSocket } = {}
  #deStatus: { [clientId: string]: number } = {} //delivery status
  #clientStatus: { [clientId: string]: ClientStatus } = {}
  #broadcastOrder: string[] = []
  #clientPing: { [clientId: string]: number } = {}
  #maxPing: number = 0
  #pingResed = new Set() //client ping responsed, set.has(clientId) -> responsed
  #lastPingTime: number = 0
  #authList = new Set()
  stdout = (_: string) => {}
  msman: MSMan | null = null
  emitCalcBroadcastOrder = () => {}
  get authKey() { return this.#authKey; }
  get name() { return this.#name; }
  get lastPingTime() { return this.#lastPingTime; }
  get clientPing() { return this.#clientPing; }

  #genKey(): string {
    const mat = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*-+=_/?.";
    return genKeyOrId(mat, 40);
  }
  constructor() {
    this.#authKey = this.#genKey();
    // this.#authKey = "dev";
  }
  auth(authkey: string, clientId: string): boolean { 
    if(this.#authKey == authkey) {
      this.#authList.add(clientId);
      return true;
    }
    return false;
  }
  existAuth(clientId: string): boolean {
    return this.#authList.has(clientId);
  }
  checkAuth(clientId: string): Promise<boolean> {
   this.stdout(`Authenticating client@${clientId}`);
    return new Promise((resolve, _reject) => {
      const interval = setInterval(() => {
        if(this.#authList.has(clientId)) {
          this.#authList.delete(clientId);
          resolve(true);
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, 1000);
    });
  }
  async directAction(clientId: string, action: HostAction): Promise<boolean> { // @return Promise<[clientId in Host]>
    const clients = this.#clients;
    if(!(clientId in clients)) {
      return false;
    }
    await action(clients[clientId]);
    return true;
  }
  async broadcast(action: HostAction) {
    const clients = this.#clients;
    const broadcastOrder = this.#broadcastOrder;
    const clientPing = this.#clientPing;
    const maxPing = this.#maxPing;
    const status = broadcastOrder.map(async (id) => {
      await sleep(maxPing - clientPing[id]);
      return action(clients[id]);
    });
    await Promise.all(status);
  }
  async close() { 
    await this.broadcast(asyncFn((socket) => {
      socket.close();
    }))
  }
  addClient(clientId: string, socket: WebSocket) {
    this.#clients[clientId] = socket;
    this.#deStatus[clientId] = 0;
    this.#clientStatus[clientId] = "fetching";
  }
  removeClient(clientId: string) {
    this.#clients[clientId].close();
    delete this.#clients[clientId];
    delete this.#deStatus[clientId];
    delete this.#clientStatus[clientId];
    this.calcBroadcastOrder();
  }
  ping() {
    this.#lastPingTime = Date.now();
    this.#pingResed = new Set();
    Object.keys(this.#clients).map(id => {
      this.directAction(id, asyncFn(s => s.send(Inst.PING)))
    });
  }
  setPing(clientId: string, rt: number) {
    this.#clientPing[clientId] = rt - this.#lastPingTime;
    this.#maxPing = Math.max(this.#maxPing, this.#clientPing[clientId]);
    this.#pingResed.add(clientId);
    if(this.checkPingRes()) {
      this.emitCalcBroadcastOrder();
    }
  }
  checkPingRes() {
    return this.#pingResed.size === Object.keys(this.#clients).length;
  }
  calcBroadcastOrder() { // checkPingRes() before use;
    const clientPing = this.#clientPing;
    const order = Object.keys(this.#clients);
    order.sort((a, b) => clientPing[b] - clientPing[a]);
    this.#broadcastOrder = order;
  }
  setClientStatus(clientId: string, status: ClientStatus) {
    this.#clientStatus[clientId] = status;
  }
  setAllClientStatus(status: ClientStatus) {
    Object.keys(this.#clients).forEach(clientId => {
      this.setClientStatus(clientId, status);
    })
  }
  allClientReady(): boolean {
    let ready = true;
    Object.keys(this.#clients).forEach(clientId => {
      if(this.#clientStatus[clientId] !== "ready")
        ready = false;
    });
    return ready;
  }
  // first run when msman loaded in main()
  initChuncks(): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.msman?.package().then((media) => {
        const CHUNCK_SIZE = this.#CHUNCK_SIZE;
        this.#chunck_count = Math.ceil(media.length / CHUNCK_SIZE);
        const chuncks = [];
        for(let i = 0; i < this.#chunck_count; ++i) {
          chuncks.push(media.slice(i * CHUNCK_SIZE, (i + 1) * CHUNCK_SIZE));
        }
        this.#chuncks = chuncks;
        resolve();
      });
    })
  }
  initDelivery(clientId: string) {
    const ext = this.msman?.packageExt();
    const name = this.msman?.packageName();
    if(ext !== undefined && name !== undefined) {
      this.#deStatus[clientId] = 0;
      this.#clientStatus[clientId] = "fetching";
      this.directAction(clientId, asyncFn(s => s.send(Inst.NMED(name, this.#chunck_count, ext))));
    }
  }
  deliver(clientId: string) {
    const status = this.#deStatus[clientId];
    if(status >= this.#chunck_count) return;
    const chunck = this.#chuncks[status];
    this.directAction(clientId, asyncFn((s) => s.send(Inst.MEDCK(status, chunck))));
    this.#deStatus[clientId] += 1;
  }
  deliverRest(clientId: string) {
    const status = this.#deStatus[clientId];
    const chuncks = this.#chuncks;
    const chunck_count = this.#chunck_count;
    if(status >= chunck_count) return;
    const chunck = chuncks.slice(status, chunck_count);
    this.directAction(clientId, asyncFn((s) => s.send(Inst.MRSCK(status, chunck))));
    this.#deStatus[clientId] = chunck_count;
  }
  deliverRestAll() {
    Object.keys(this.#clients).forEach((clientId) => {
      this.deliverRest(clientId);
    });
  }
  startMediaDelivery() {
    this.initChuncks().then(() => {
      Object.keys(this.#clients).forEach((clientId) => this.initDelivery(clientId));
    });
  }
  clientCached(clientId: string) {
    this.#deStatus[clientId] = this.#chunck_count;
  }
  clientReady(clientId: string) {
    this.#clientStatus[clientId] = "ready";
  }
}

function server(host: Host, routes: Routes, term: Term): AbortFn {
  const controller = new AbortController();
  const { signal, abort } = controller;
  const env = getENV();
  let cert, key, port;
  if(env !== undefined) {
    cert = env.cert;
    key = env.key;
    port = env.port ? env.port : 0;
  }
  Deno.serve({
    signal,
    cert,
    key,
    port,
    onListen({ port }) { term.println(`Listening on port ${port}`); },
  },
  async (req): Promise<Response> => {
    const url = new URL(req.url);
    if(!(url.pathname in routes)) {
      return new Response(null, {
        status: 404
      })
    }
    return await routes[url.pathname](host, req);
  });
  return abort.bind(controller);
}

async function main() {
  // TODO: strongly binds msman.play(), .pause() with bridge.emit(). Be careful it could be easy to break something
  const bridge = new EventEmitter();
  const host = new Host();
  const term = new Term();
  const msman = new MSMan(supprotedMediaType, () => bridge.emit("next_media"));
  host.emitCalcBroadcastOrder = () => bridge.emit("calc_BCOrder");
  bridge.on("next_media", () => {
    host.deliverRestAll();
    const checkLoad = () => {
      const interval = setInterval(() => {
        if(host.allClientReady()) {
          host.broadcast(asyncFn(s => s.send(Inst.PLAY)));
          host.msman?.play();
          clearInterval(interval);
        }
      }, 300);
    }
    const checkFetchInterval = setInterval(() => {
      if(host.allClientReady()) {
        host.broadcast(asyncFn(s => s.send(Inst.NEXT)));
        host.setAllClientStatus("loading");
        checkLoad();
        clearInterval(checkFetchInterval);
      }
    }, 300);
    host.startMediaDelivery();
  });
  bridge.on("calc_BCOrder", () => {
    host.calcBroadcastOrder();
  });
  term.println("Loading media...");
  await msman.load(path.join(".", "media"));
  host.stdout = term.println.bind(term);
  host.msman = msman;
  host.initChuncks();
  const abort = server(host, hostRoutes, term);
  term.abort = abort;
  setupTerm({ host, msman, term });

  term.println(`AuthKey: ${host.authKey}`);

  term.start();
}

if(import.meta.main) {
  main();
}
