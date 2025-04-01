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
