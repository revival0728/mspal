import { CmdDefine } from "@/type.d.ts";
import { Host } from "@/host.ts";
import { MSMan } from "@/host/msman.ts";
import { Term } from "@/term.ts";
import { asyncFn } from "@/utilities.ts";
import { Inst } from "@/host/socket.ts";

export function setupTerm({ host, msman, term }: { host: Host, msman: MSMan, term: Term }) {
  const cmdd: CmdDefine = {
    "exit": {
      desc: "exit the mspal-host",
      cmd: async (_insList) => {
        await host.close();
      }
    },
    "ping": {
      desc: "test ping to all clients",
      args: [{
        name: "status",
        desc: "shows the ping status of all clients",
        dyn: false,
      }],
      cmd: (insList) => {
        if(insList.args[0] === "status") {
          const ping = host.clientPing;
          const out = Object.keys(ping).map(clientId => {
            return `  ${clientId}: ${ping[clientId]}ms`
          });
          term.rprintln(`Ping Status:\n${out.length > 0 ? out.join("\n") : "no client"}`);
        } else if(insList.args.length === 0 && Object.keys(insList.kwargs).length === 0) {
          host.ping();
        } else {
          term.rprintln("invalid use of ping");
        }
      }
    },
    "play": {
      desc: "play the media",
      cmd: async (_insList) => {
        await host.broadcast(asyncFn(s => s.send(Inst.PLAY)));
        host.msman?.play();
      }
    },
    "pause": {
      desc: "pause the media",
      cmd: async (_insList) => {
        await host.broadcast(asyncFn(s => s.send(Inst.PAUSE)));
        host.msman?.pause();
      }
    },
    "next": {
      desc: "skip current media",
      cmd: (_insList) => {
        // msman.next() will cause emitting "next_media"
        host.msman?.next();
      }
    },
    "status": {
      desc: "show the media status",
      cmd: (_insList) => {
        const { name, dur, progress } = msman.getCurrentInfo();
        const fmt = (n: number) => n.toString().padStart(2, "0");
        const msToView = (ms: number) => {
          const _sec = Math.floor(ms / 1000);
          const sec = fmt(_sec % 60);
          const min = fmt(Math.floor(_sec / 60));
          return `${min}:${sec}`;
        };
        term.rprintln(`${name} | ${msToView(progress)}/${msToView(dur)}`)
      }
    }
  };
  cmdd.help = {
    desc: "the command to show this text",
    args: [{
      name: "command",
      desc: "the command to show the help of argument [command]",
      dyn: true,
    }],
    cmd: (insList) => {
      if(insList.args.length > 0) {
        const cmd = cmdd[insList.args[0]];
        if(!cmd) {
          term.rprintln("help: Command not found.");
          return;
        }
        const { desc, args } = cmd;
        const out = [`${insList.args[0]} ${args ? args.map(({ name, dyn }) => dyn ? `[${name.toUpperCase()}]` : `[${name}]`).join(" ") : ""}  :${desc}`];
        if(args) {
          out.push("Arguments:");
          const argOut = args.map(({ name, dyn, desc }) => `  ${dyn ? `[${name.toUpperCase()}]` : `[${name}]`}  :${desc}`);
          out.push(...argOut);
        }
        term.rprintln(out.join("\n"));
        return;
      }
      const cmdHelp = Object.keys(cmdd).map(ins => {
        const { args } = cmdd[ins];
        return `${ins} ${args ? args.map(({ name, dyn }) => dyn ? `[${name.toUpperCase()}]` : `[${name}]`).join(" ") : ""}`;
      });
      const maxLen = Math.max(...cmdHelp.map(text => text.length));
      const insDisplay = (ins: string) => {
        for(let i = 0, olen = ins.length; i < maxLen - olen; ++i) {
          ins += " ";
        }
        return ins;
      }
      const out = Object.keys(cmdd).map((ins, index) => {
        const { desc } = cmdd[ins];
        return `  ${insDisplay(cmdHelp[index])}  :${desc}`;
      });
      out.push("If you want to see the help of specific command, use `help [COMMAND]`");
      term.rprintln(`Commands:\n${out.join("\n")}`);
    }
  }

  Object.keys(cmdd).forEach((ins) => {
    const { cmd } = cmdd[ins];
    term.addCmd(ins, cmd);
  });
}