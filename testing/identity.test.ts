import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../identity.ts";

const add = (n: number) => n + 1;

Deno.test("Identity of", () => {
  assertEquals(I.of(1), 1);
});

Deno.test("Identity ap", () => {
  const ap = I.ap(I.of(add));
  assertEquals(ap(I.of(1)), I.of(2));
});

Deno.test("Identity map", () => {
  const map = I.map(add);
  assertEquals(map(I.of(1)), I.of(2));
});

Deno.test("Identity join", () => {
  assertEquals(I.join(I.of(I.of(1))), I.of(1));
});

Deno.test("Identity chain", () => {
  const chain = I.chain((n: number) => I.of(n + 1));
  assertEquals(chain(I.of(1)), I.of(2));
});
