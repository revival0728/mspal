import { rand } from "./utilities.ts";
import { assert } from "@std/assert";

Deno.test("rand", () => {
  for(let i = 0; i <= 1000; ++i) {
    for(let j = i; j <= 1000; ++j) {
      const ret = rand(i, j);
      assert(i <= ret && ret <= j);
    }
  }
});
