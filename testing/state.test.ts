import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as S from "../state.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

const assertEqualsS = (
  a: S.State<number, unknown>,
  b: S.State<number, unknown>,
) => assertEquals(a(1), b(1));

Deno.test("State id", () => {
  assertEquals(S.id<number>()(0), [0, 0]);
});

Deno.test("State put", () => {
  assertEquals(S.put(0)(-1), [undefined, 0]);
});

Deno.test("State modify", () => {
  assertEqualsS(S.modify((n: number) => n + 1), S.put(2));
});

Deno.test("State gets", () => {
  assertEquals(S.gets((n: number) => n.toString())(0), ["0", 0]);
});

Deno.test("State make", () => {
  assertEqualsS(S.state(1, 1), S.id<number>());
});

Deno.test("State wrap", () => {
  assertEqualsS(S.wrap(1), S.id<number>());
});

Deno.test("State apply", () => {
});

Deno.test("State map", () => {
  assertEqualsS(pipe(S.id<number>(), S.map(add)), S.state(2, 1));
});

Deno.test("State flatmap", () => {
  assertEqualsS(
    pipe(S.id<number>(), S.flatmap((n) => S.gets((m) => n + m))),
    S.state(2, 1),
  );
});

Deno.test("State evaluate", () => {
  assertEquals(pipe(S.id<number>(), S.evaluate(0)), 0);
});

Deno.test("State execute", () => {
  assertEquals(pipe(S.id<number>(), S.execute(0)), 0);
});

// Deno.test("State Do, bind, bindTo", () => {
//   assertEqualsS(
//     pipe(
//       S.Do<number, number, number>(),
//       S.bind("one", () => S.make(1, 1)),
//       S.bind("two", ({ one }) => S.make(one + one, 1)),
//       S.map(({ one, two }) => one + two),
//     ),
//     S.make(3, 1),
//   );
//   assertEqualsS(
//     pipe(
//       S.make(1, 1),
//       S.bindTo("one"),
//     ),
//     S.make({ one: 1 }, 1),
//   );
// });
