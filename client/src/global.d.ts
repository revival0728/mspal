export declare global {
  /* Configure global types here*/
  interface Window extends globalThis.Window { 
    versions: {
      [id: string]: () => Promise<string>,
    },
    client: {
      connect: (url: string, key: string, ssl: boolean) => void
      socketSend: (msg: string) => Promise<void>
      getNextMedia: () => Promise<Blob> | undefined
    }
  }
}
