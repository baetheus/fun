import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../identity.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Identity of", () => {
  assertEquals(I.wrap(1), 1);
});

Deno.test("Identity ap", () => {
  assertEquals(
    pipe(I.wrap((n: number) => n + 1), I.apply(I.wrap(1))),
    I.wrap(2),
  );
});

Deno.test("Identity map", () => {
  const map = I.map(add);
  assertEquals(map(I.wrap(1)), I.wrap(2));
});

Deno.test("Identity flatmap", () => {
  const flatmap = I.flatmap((n: number) => I.wrap(n + 1));
  assertEquals(flatmap(I.wrap(1)), I.wrap(2));
});
