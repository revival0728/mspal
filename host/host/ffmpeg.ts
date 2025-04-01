// Required ffmpeg installed on user system


export class FFmpeg {
  #textDecoder = new TextDecoder();

  constructor() {}
  
  // return [exit_code, stdout]
  ffmpeg(args: string[]): Promise<[number, string]> {
    const c = new Deno.Command("ffmpeg", {
      args,
    })
    return new Promise((resolve, _reject) => {
      c.output().then(({ code, stdout }) => {
        resolve([code, this.#textDecoder.decode(stdout)]);
      })
    })
  }
  ffprobe(args: string[]): Promise<[number, string]> {
    const c = new Deno.Command("ffprobe", {
      args,
    })
    return new Promise((resolve, _reject) => {
      c.output().then(({ code, stdout }) => {
        resolve([code, this.#textDecoder.decode(stdout)]);
      })
    })
  }

  // get audio file duration in ms
  async getDuration(file_path: string): Promise<number> {
    const [exit_code, res] = await this.ffprobe([
      "-loglevel", "quiet",
      "-show_format",
      "-print_format", "json",
      file_path
    ]);
    if(exit_code !== 0) return -1;
    const json = JSON.parse(res);
    return json.format.duration * 1000;
  }
}
