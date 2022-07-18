import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as S from "../state.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

const assertEqualsS = (
  a: S.State<number, unknown>,
  b: S.State<number, unknown>,
) => assertEquals(a(1), b(1));

Deno.test("State get", () => {
  assertEquals(S.get<number>()(0), [0, 0]);
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
  assertEqualsS(S.make(1, 1), S.get<number>());
});

Deno.test("State of", () => {
  assertEqualsS(S.of(1), S.get<number>());
});

Deno.test("State ap", () => {
  const ap = S.ap(S.gets((s: number): (a: number) => number => (a) => a + s));
  assertEqualsS(ap(S.get()), S.make(2, 1));
});

Deno.test("State map", () => {
  assertEqualsS(pipe(S.get<number>(), S.map(AS.add)), S.make(2, 1));
});

Deno.test("State join", () => {
  assertEqualsS(
    S.join(S.gets((n: number) => S.gets((m: number) => n + m))),
    S.make(2, 1),
  );
});

Deno.test("State chain", () => {
  assertEqualsS(
    pipe(S.get<number>(), S.chain((n) => S.gets((m) => n + m))),
    S.make(2, 1),
  );
});

Deno.test("State evaluate", () => {
  assertEquals(pipe(S.get<number>(), S.evaluate(0)), 0);
});

Deno.test("State execute", () => {
  assertEquals(pipe(S.get<number>(), S.execute(0)), 0);
});

Deno.test("State Do, bind, bindTo", () => {
  assertEqualsS(
    pipe(
      S.Do<number, number, number>(),
      S.bind("one", () => S.make(1, 1)),
      S.bind("two", ({ one }) => S.make(one + one, 1)),
      S.map(({ one, two }) => one + two),
    ),
    S.make(3, 1),
  );
  assertEqualsS(
    pipe(
      S.make(1, 1),
      S.bindTo("one"),
    ),
    S.make({ one: 1 }, 1),
  );
});
