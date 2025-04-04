import { AbortFn, InsList, TermCmd } from "@/type.d.ts";

export class Term {
  #de = new TextDecoder()
  #en = new TextEncoder()
  #style = "mspal> "
  #cmd: { [ins: string]: TermCmd } = {}
  abort: AbortFn = (_) => {};

  constructor() {
    this.#cmd["exit"] = () => {};
    this.printStyle();
  }
  addCmd(ins: string, cmd: TermCmd) {
    this.#cmd[ins] = cmd;
  }
  readline(): Promise<string> {
    return new Promise((resolve, _reject) => {
      const buf = new Uint8Array(100);
      Deno.stdin.read(buf).then((_) => {
        const i13 = buf.indexOf(13);
        const indexOfReturnIns = i13 == -1 ? buf.indexOf(10) : i13;
        const lastInput = indexOfReturnIns == -1 ? 0 : indexOfReturnIns;
        resolve(this.#de.decode(buf.slice(0, lastInput)));
      });
    })
  }
  print(data: string) {
    const raw = this.#en.encode(data);
    Deno.stdout.writeSync(raw);
  }
  printStyle() {
    this.print(this.#style);
  }
  rprintln(data: string) {
    this.print(data + "\n");
  }
  println(data: string) {
    this.print(data + '\n');
    this.printStyle();
  }
  #procIns(ins: string): InsList {
    const inss = ins.trim().split(" ");
    const insList: InsList = {
      ins: inss[0],
      args: [],
      kwargs: {}
    };
    for(let i = 1; i < inss.length; ++i) {
      if(inss[i].slice(0, 2) === "--") {
        insList.kwargs[inss[i]] = "";
      } else if(inss[i - 1].slice(0, 2) == "--") {
        insList.kwargs[inss[i - 1]] = inss[i];
      } else {
        insList.args.push(inss[i]);
      }
    }
    return insList;
  }
  start() {
    this.readline().then(async (ins) => {
      const insList = this.#procIns(ins);
      if(insList.ins.length === 0) {
        this.printStyle();
        this.start();
        return;
      }
      if(!(insList.ins in this.#cmd)) {
        this.println("Command not found.");
      } else {
        await this.#cmd[insList.ins](insList);
        this.printStyle();
      }
      if(ins === "exit") {
        this.abort();
        Deno.exit(0);
      }
      this.start();
    });
  }
}
