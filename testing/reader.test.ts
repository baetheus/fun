import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "../reader.ts";
import { pipe } from "../fns.ts";

const add = (n: number) => n + 1;

const n = null as unknown as never;

const assertEqualsR = (
  // deno-lint-ignore no-explicit-any
  a: R.Reader<number, any>,
  // deno-lint-ignore no-explicit-any
  b: R.Reader<number, any>,
) => assertEquals(a(0), b(0));

Deno.test("Reader ask", () => {
  assertEqualsR(R.ask<number>(), R.ask<number>());
});

Deno.test("Reader asks", () => {
  assertEqualsR(R.asks(add), R.asks(add));
});

Deno.test("Reader of", () => {
  const id = (n: number) => n;
  assertEqualsR(R.of(0), id);
});

Deno.test("Reader ap", () => {
  assertEquals(pipe(R.of(0), R.ap(R.of(add)))(n), R.of(1)(n));
});

Deno.test("Reader map", () => {
  assertEquals(pipe(R.of(0), R.map(add))(n), R.of(1)(n));
});

Deno.test("Reader join", () => {
  assertEquals(pipe(R.of(R.of(0)), R.join)(n), R.of(0)(n));
});

Deno.test("Reader chain", () => {
  const chain = R.chain((n: number) => R.of(n + 1));
  assertEquals(chain(R.of(0))(n), R.of(1)(n));
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
