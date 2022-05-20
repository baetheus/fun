import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "../reader.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

const assertEqualsR = (
  // deno-lint-ignore no-explicit-any
  a: R.Reader<[number], any>,
  // deno-lint-ignore no-explicit-any
  b: R.Reader<[number], any>,
) => assertEquals(a(0), b(0));

Deno.test("Reader ask", () => {
  assertEqualsR(R.ask<[number]>(), R.ask<[number]>());
});

Deno.test("Reader asks", () => {
  assertEqualsR(R.asks(AS.add), R.asks(AS.add));
});

Deno.test("Reader of", () => {
  const id = (n: number) => n;
  assertEqualsR(R.of(0), id);
});

Deno.test("Reader ap", () => {
  assertEqualsR(pipe(R.of(0), R.ap(R.of(AS.add))), R.of(1));
});

Deno.test("Reader map", () => {
  assertEqualsR(pipe(R.of(0), R.map(AS.add)), R.of(1));
});

Deno.test("Reader join", () => {
  const tta = R.asks((n: number) => R.of(n));
  assertEquals(R.join(tta)(0), 0);
});

Deno.test("Reader chain", () => {
  const chain = R.chain((n: number) => R.of(n + 1));
  assertEqualsR(chain(R.of(0)), R.of(1));
});

// Deno.test("Reader Do, bind, bindTo", () => {
//   assertEqualsR(
//     pipe(
//       R.Do<number, number, number>(),
//       R.bind("one", () => R.make(1)),
//       R.bind("two", ({ one }) => R.make(one + one)),
//       R.map(({ one, two }) => one + two),
//     ),
//     R.make(3),
//   );
//   assertEqualsR(
//     pipe(
//       R.make(1),
//       R.bindTo("one"),
//     ),
//     R.asks((_: number) => ({ one: 1 })),
//   );
// });
