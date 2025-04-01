import type { Host } from "@/host.ts";

export type Router = (host: Host, req: Request) => Promise<Response> | Response;
export type Routes = {
  [route: string]: Router
};

export type AbortFn = (reason?: unknown) => void;

export type HostAction = (socket: WebSocket) => Promise<void>;

export type TermCmd = (insList: InsList) => Promise<void> | void;

export type InsList = {
  ins: string,
  args: string[],
  kwargs: { [kwarg: string]: string },
};

export type NextMediaEventEmitter = () => void;
