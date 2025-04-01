function build() {
  const host = new Deno.Command(Deno.execPath(), {
    args: ["compile", "--allow-net", "--output", "./bin/", "host.ts"],
    stdin: "inherit",
    stdout: "inherit",
  });
  console.log("Building host.ts...");
  host.spawn();
}

if(import.meta.main) {
  build();
}
