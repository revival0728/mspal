function build() {
  const make = (target: string) => {
    return new Deno.Command(Deno.execPath(), {
      args: [
        "compile", 
        "--allow-net", 
        "--allow-read", 
        "--allow-run=ffmpeg,ffprobe", 
        "--allow-env", "--output", 
        `./bin/mspal-host_${target}`, 
        "--target", target, 
        "host.ts"
      ],
      stdin: "inherit",
      stdout: "inherit",
    });
  }
  const windows_x86_64 = make("x86_64-pc-windows-msvc");
  const linux_x86_84 = make("x86_64-unknown-linux-gnu");
  const linux_arm64 = make("aarch64-unknown-linux-gnu");
  console.log("Building host.ts...");
  console.log("Building for windows x86_64...");
  console.log("Building for linux x86_64...");
  console.log("Building for linux arm64...");

  windows_x86_64.spawn();
  linux_x86_84.spawn();
  linux_arm64.spawn();
}

if(import.meta.main) {
  build();
}
