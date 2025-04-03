import { app } from "electron";
import path from "path";
import fs from "fs";

export class FS {
  #root: string = "";
  #hostRoot: string = "";

  constructor() {
    const appData = app.getPath("appData");
    const root = path.join(appData, "mspal");
    if(!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    this.#root = root;
  }
  setHostName(hostName: string) {
    const hostRoot = path.join(this.#root, hostName);
    if(!fs.existsSync(hostRoot)) {
      fs.mkdirSync(hostRoot, { recursive: true });
    }
    this.#hostRoot = hostRoot;
  }
  getMedia(media: string): Promise<Buffer> | undefined {
    const mediaPath = path.join(this.#hostRoot, media);
    if(!fs.existsSync(mediaPath)) return undefined;
    return new Promise((resolve, reject) => {
      fs.readFile(mediaPath, (err, data) => {
        if(err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  storeMedia(media: string, data: string[]): Promise<void> {
    const mediaPath = path.join(this.#hostRoot, media);
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(data.join(""), "base64");
      fs.writeFile(mediaPath, buffer, (err) => {
        if(err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  existMedia(media: string): boolean {
    return fs.existsSync(path.join(this.#hostRoot, media));
  }
}