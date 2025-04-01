const fs = require('fs');
const path = require('path');

const dsp = path.join(".", "dist", ".lastmodify");
const logp = "sync::stderr: ";
const syncExt = [".html", ".css", ".js", ".svg"];
const syncExclude = path.join(".", "src", "global.css");

let lastModified = {};

const initSync = () => {
  if(fs.existsSync(dsp)) {
    lastModified = JSON.parse(fs.readFileSync(dsp));
  }
  if(sync(ensureDist())) {
    saveLastModified();
  }
}

const saveLastModified = () => {
  console.log(`${logp}Saving .lastmodify`)
  fs.writeFileSync(dsp, JSON.stringify(lastModified));
}

const ensureDist = () => {
  const dist = path.join(".", "dist");
  if(!fs.existsSync(dist)) {
    console.log(`${logp}Creating folder ${dist}`);
    fs.mkdirSync(dist);
    return true;
  }
  return false;
}

const sync = (force) => {
  const src = path.join(".", "src");
  const dist = path.join(".", "dist");
  ensureDist();
  const srcMtime = fs.statSync(src).mtimeMs;
  lastModified[src] = srcMtime;
  const f = (sub) => {
    const cur = path.join(src, sub);
    const dir = fs.readdirSync(cur);
    let modified = false;
    dir.forEach((ps) => {
      const ph = path.parse(ps);
      const source = path.join(cur, ps);
      const stat = fs.statSync(source);

      if(stat.isDirectory()) {
        const nxt = path.basename(source);
        const dnxt = path.join(dist, sub, nxt);
        if(!fs.existsSync(dnxt)) {
          console.log(`${logp}Creating folder ${dnxt}`);
          fs.mkdirSync(dnxt);
        }
        return f(path.join(sub, nxt)) || modified;
      }

      if(syncExt.includes(ph.ext) && source !== syncExclude) {
        if(lastModified[source] !== stat.mtimeMs || force) {
          modified = true;
          lastModified[source] = stat.mtimeMs;
          const dest = path.join(dist, sub, ps);
          console.log(`${logp}Copying ${source} to ${dest}`);
          fs.cpSync(source, dest);
        }
      }
    });
    return modified;
  }; return f("");
};

module.exports = { sync, initSync, saveLastModified };
