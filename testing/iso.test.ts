import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../iso.ts";
import { pipe } from "../fn.ts";

const iso = I.iso(
  (n: number) => n.toString(),
  (s: string) => parseFloat(s),
);

Deno.test("Iso id", () => {
  const { view, review } = I.id<number>();

  assertEquals(view(1), 1);
  assertEquals(review(1), 1);
});

Deno.test("Iso compose", () => {
  const { view, review } = pipe(I.id<number>(), I.compose(iso));

  const nums = [-1, 0, 1, 1.1, 0.0000000900];
  nums.forEach((n) => {
    assertEquals(review(view(n)), n);
  });
});

Deno.test("Iso swap", () => {
  const { view, review } = I.swap(iso);

  assertEquals(view("1"), 1);
  assertEquals(review(1), "1");
});
