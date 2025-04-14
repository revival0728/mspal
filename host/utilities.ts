export function rand(l: number, r: number): number {
  return Math.floor(Math.random() * (r - l + 1)) + l;
}

export function genKeyOrId(mat: string, len: number): string {
  const gen = () => rand(0, mat.length - 1);
  const key = [];
  for(let i = 0; i < len; ++i) {
    key.push(mat.at(gen()));
  }
  return key.join("");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(() => resolve(), ms);
  })
}

export function asyncFn<A, T>(fn: (...args: A[]) => T): (...args: A[]) => Promise<T> {
  return (args) => {
     return new Promise((resolve, _reject) => {
      resolve(fn(args));
    });
  }
}

import "@std/dotenv";
export function getENV(): { port?: number, cert?: string, key?: string } | undefined {
  const { PORT, CERT, KEY, CERT_PATH, KEY_PATH } = Deno.env.toObject();
  const sop = (s: string, p: string) => {
    if(s) return s;
    if(p) return Deno.readTextFileSync(p);
    return;
  }
  try {
    const cert = sop(CERT, CERT_PATH);
    const key = sop(KEY, KEY_PATH);
    const port = PORT ? parseInt(PORT) : undefined;
    if(cert === undefined || key === undefined) {
      return { port };
    }
    return { port, cert, key };
  } catch {
    return;
  }
}