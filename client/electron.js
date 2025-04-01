const fs = require('fs');
const path = require('path');
const child_proccess = require('child_process');
const { sync, initSync, saveLastModified } = require('./sync.js');

const buildOnly = process.argv.includes("build");

const init = () => {
  console.log(`${buildOnly ? "Building" : "Initializing"}...`);
  const tsc = child_proccess.spawnSync("tsc", { shell: true });
  const tailwindcss = child_proccess.spawnSync("@tailwindcss", ["-i", "./src/global.css", "-o", "./dist/global.css"], {
    shell: true,
  });
  initSync();

  if(tsc.status !== 0) {
    console.log(`tsc::stderr: ${tsc.stderr}`);
    console.log(`tsc::stdout: ${tsc.stdout}`);
  }
  if(tailwindcss.status !== 0) {
    console.log(`tailwindcss::stderr: ${tailwindcss.stderr}`);
    console.log(`tailwindcss::stdout: ${tailwindcss.stdout}`);
  }
  return tsc.status === 0 && tailwindcss.status === 0;
}; 

const stdio = (name, proc) => {
  proc.stdout.on("data", (data) => console.log(`${name}::stdout: ${data}`))
  proc.stderr.on("data", (data) => console.log(`${name}::stderr: ${data}`))
}

const entry = path.join(".", "dist", "main.js").toString();
const spawn_electron = () => {
  const electron_bin = require('electron');
  const electron = child_proccess.spawn(electron_bin, [entry], {
    shell: true,
  });
  stdio("electron", electron);
}
const spawn_tsc = () => {
  const tsc = child_proccess.spawn("tsc", ["--watch"], {
    shell: true,
  });
  stdio("tsc", tsc);
}
const spawn_tailwindcss = () => {
  const tailwindcss = child_proccess.spawn("@tailwindcss", ["-i", "./src/global.css", "-o", "./dist/global.css", "--watch"], {
    shell: true,
  });
  stdio("tailwindcss", tailwindcss);
}
const spawn_sync = async () => {
  const sleep = async () => {
    return new Promise((r, _j) => {
      setTimeout(() => r(), 1000);
    });
  }
  for(;;) {
    if(sync()) {
      saveLastModified();
    } else {
      await sleep();
    }
  }
};

if(init() && !buildOnly) {
  spawn_sync();
  spawn_tsc();
  spawn_tailwindcss();
  spawn_electron();
}
