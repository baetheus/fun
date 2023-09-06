import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../premappable.ts";
import * as F from "../fn.ts";

Deno.test("Premappable dimap", () => {
  const dimap = P.dimap({ ...F.PremappableFn, ...F.MappableFn });
  const fn = F.pipe(
    F.id<number>(),
    dimap((s: string) => s.length, (n) => "nyan".repeat(n)),
  );
  assertEquals(fn("Hi"), "nyannyan");
});
