import { rand } from "@/utilities.ts";
import * as path from "@std/path";
import { FFmpeg } from "@/host/ffmpeg.ts";
import { NextMediaEventEmitter } from "@/type.d.ts";

export class MSMan {
  #status: "init" | "play" | "pause" | "" = "";
  #supported = new Set();
  #list: string[] = [];
  #dur: { [f: string]: number } = {};
  #MOD = 1e9 + 7;
  #cur = -1;
  #currentInfo: { name: string, dur: number } = { name: "", dur: 0 };
  #PGCache: { id: number, data: string } = { id: -1, data: "" };
  #ffmpeg: FFmpeg = new FFmpeg();
  #time: number = 0;
  #accut: number = 0; // accumulated play time
  #emitNext: NextMediaEventEmitter | null = null;
  stdout = (_: string) => {};
  get status() { return this.#status; }

  constructor(supportMediaType: string[], emitNext: NextMediaEventEmitter) {
    supportMediaType.forEach((e) => this.#supported.add(e));
    this.#emitNext = emitNext;
    this.#status = "init";
    this.#accut = 0;
    this.#time = Date.now();

    // Automatically play the next media
    setInterval(() => {
      if(Math.abs(this.progressByRatio() - 1) < 0.00001) {
        this.next();
      }
    }, 500);
  }
  checkFileSupport(entry: Deno.DirEntry): boolean {
    if(!entry.isFile) return false;
    const fn = entry.name;
    const ext = path.extname(fn);
    return this.#supported.has(ext);
  }
  #readFileToUint8Array(source: string): Promise<Uint8Array> {
    return Deno.readFile(source);
  }
  async load(folder: string) {
    const ffmpeg = this.#ffmpeg;
    this.#list = [];
    try {
      for await (const post of Deno.readDir(folder)) {
        if(this.checkFileSupport(post)) {
          const f = path.join(folder, post.name);
          const d = await ffmpeg.getDuration(f);
          this.#dur[f] = d;
          this.#list.push(f);
        }
      }
      this.#currentInfo = this.getPackageInfo();
    } catch {
      console.log("Error: Failed to load media files.\n(might caused by ./media/ folder did not exist or emtpy ./media/ folder)");
      Deno.exit(1);
    }
  }
  shuffle(seed: number | undefined) {
    const MOD = this.#MOD;
    const list = this.#list;
    if(seed === undefined)
      seed = Date.now() % MOD;
    const rd = () => rand(0, list.length - 1);
    for(let i = 0; i < list.length; ++i) {
      const l = rd() * seed % MOD;
      const r = rd() * seed % MOD;
      const tmp = list[l];
      list[l] = list[r];
      list[r] = tmp;
    }
  }
  #uint8ArrayToBase64(uint8Array: Uint8Array) {
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  }
  #getPackageId(): number {
    const cur = this.#cur;
    const list = this.#list;
    const id = (cur + 1) % list.length;
    return id;
  }
  package(): Promise<string> {
    const list = this.#list;
    const id = this.#getPackageId();
    const PGCache = this.#PGCache;
    return new Promise((resolve, _reject) => {
      if(PGCache.id === id)
        resolve(PGCache.data);
      const source = list[id];
      this.#readFileToUint8Array(source).then((data) => {
        const base64 = this.#uint8ArrayToBase64(data);
        this.#PGCache = {
          id,
          data: base64,
        };
        resolve(base64);
      });
    });
  }
  packageExt(): string {
    const id = this.#getPackageId();
    const list = this.#list;
    return path.extname(list[id]);
  }
  packageName(): string {
    const id = this.#getPackageId();
    const list = this.#list;
    const bn = path.basename(list[id]);
    const ext = path.extname(list[id]);
    return bn.replace(ext, "");
  }
  getPackageInfo() {
    return {
      name: this.packageName(),
      dur: this.#dur[this.#list[this.#getPackageId()]]
    }
  }
  next() {
    this.#currentInfo = this.getPackageInfo();
    const list = this.#list;
    const cur = this.#cur;
    this.#cur = (cur + 1) % list.length;
    this.#accut = 0;
    this.#time = Date.now();
    if(this.#emitNext !== null) this.#emitNext();
  }
  initPlay() {
    // The initial this.#cur = -1
    // After calling this.next(), the this.#cur = 0, and then emit("next_media")
    // This will cause automatically playing the next media, in this case, will be media[0]
    // The handler of "next_media" is writting in host.ts
    this.next();
  }
  play() {
    this.#time = Date.now();
    this.#status = "play";
  }
  pause() {
    this.#accut = Date.now() - this.#time;
    this.#status = "pause";
  }
  progressByTime(): number { // get current play progress by time(ms)
    const t = (this.status === "play" ? Date.now() - this.#time : 0) + this.#accut;
    const dur = this.#dur[this.#list[this.#cur]];
    return t > dur ? dur : t;
  }
  progressByRatio(): number { // get current play progress by raitio([0, 1])
    const dur = this.#dur[this.#list[this.#cur]];
    return this.progressByTime() / dur;
  }
  getCurrentInfo() {
    return {
      ...this.#currentInfo,
      progress: this.progressByTime(),
    }
  }
}
