import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "../reader_either.ts";
import * as E from "../either.ts";
import { _, pipe } from "../fns.ts";

const add = (n: number) => n + 1;

const multiply = (n: number) => n * n;

const n = undefined as unknown as never;

const assertEqualsRE = (
  // deno-lint-ignore no-explicit-any
  a: R.ReaderEither<number, any, any>,
  // deno-lint-ignore no-explicit-any
  b: R.ReaderEither<number, any, any>,
) => assertEquals(a(0), b(0));

Deno.test("ReaderEither ask", () => {
  assertEqualsRE(R.ask<number>(), R.ask<number>());
});

Deno.test("ReaderEither asks", () => {
  assertEqualsRE(R.asks((n) => n), R.of(0));
});

Deno.test("ReaderEither left", () => {
  assertEquals(R.left("Hello")(n), E.left("Hello"));
});

Deno.test("ReaderEither right", () => {
  assertEquals(R.right("Hello")(n), E.right("Hello"));
});

Deno.test("ReaderEither tryCatch", () => {
  const throwOnZero = R.tryCatch(
    (n: number) => {
      if (n === 0) {
        throw new Error("Zero");
      }
      return n;
    },
    (_, n) => n,
  );
  assertEquals(throwOnZero(0), E.left(0));
  assertEquals(throwOnZero(1), E.right(1));
});

Deno.test("ReaderEither fromEither", () => {
  assertEqualsRE(R.fromEither(E.left(0)), R.left(0));
  assertEqualsRE(R.fromEither(E.right(0)), R.right(0));
});

Deno.test("ReaderEither of", () => {
  assertEqualsRE(R.of(0), R.right(0));
});

Deno.test("ReaderEither ap", () => {
  assertEquals(pipe(R.right(0), R.ap(R.right((n) => n + 1)))(n), R.right(1)(n));
  assertEquals(pipe(R.left(0), R.ap(R.right((n) => n + 1)))(n), R.left(0)(n));
  assertEquals(pipe(R.right(0), R.ap(R.left(0)))(n), R.left(0)(n));
  assertEquals(pipe(R.left(1), R.ap(R.left(0)))(n), R.left(1)(n));
});

Deno.test("ReaderEither join", () => {
  assertEquals(pipe(R.of(R.of(0)), R.join)(n), R.of(0)(n));
  assertEquals(pipe(R.of(R.left(0)), R.join)(n), R.left(0)(n));
  assertEquals(pipe(R.left(0), R.join)(n), R.left(0)(n));
});

Deno.test("ReaderEither chain", () => {
  assertEquals(
    pipe(R.of(0), R.chain((n: number) => n === 0 ? R.left(n) : R.right(n)))(n),
    R.left(0)(n),
  );
  assertEquals(
    pipe(R.right(1), R.chain((n) => n === 0 ? R.left(n) : R.right(n)))(n),
    R.right(1)(n),
  );
  assertEquals(
    pipe(R.left(1), R.chain((n) => n === 0 ? R.left(n) : R.right(n)))(n),
    R.left(1)(n),
  );
});

Deno.test("ReaderEither throwError", () => {
  assertEqualsRE(R.throwError(0), R.left(0));
});

Deno.test("ReaderEither bimap", () => {
  const bimap = R.bimap(add, multiply);
  assertEqualsRE(bimap(R.left(0)), R.left(1));
  assertEqualsRE(bimap(R.right(2)), R.right(4));
});

Deno.test("ReaderEither mapLeft", () => {
  const mapLeft = R.mapLeft(add);
  assertEqualsRE(mapLeft(R.left(0)), R.left(1));
  assertEqualsRE(mapLeft(R.right(0)), R.right(0));
});

Deno.test("ReaderEither alt", () => {
  assertEquals(pipe(R.right(0), R.alt(R.right(1)))(n), R.right(0)(n));
  assertEquals(pipe(R.right(0), R.alt(R.left(1)))(n), R.right(0)(n));
  assertEquals(pipe(R.left(0), R.alt(R.right(1)))(n), R.right(1)(n));
  assertEquals(pipe(R.left(0), R.alt(R.left(1)))(n), R.left(1)(n));
});

Deno.test("ReaderEither chainLeft", () => {
  const chainLeft = R.chainLeft((n) => n === 0 ? R.left(n) : R.right(n));
  assertEquals(chainLeft(R.right(0))(n), R.right(0)(n));
  assertEquals(chainLeft(R.left(1))(n), R.right(1)(n));
  assertEquals(chainLeft(R.left(0))(n), R.left(0)(n));
});

Deno.test("ReaderEither compose", () => {
  assertEquals(
    pipe(R.ask<number>(), R.compose(R.asks((n) => n + 1)))(0),
    R.right(1)(n),
  );
});

// Deno.test("ReaderEither Do, bind, bindTo", () => {
//   assertEqualsRE(
//     pipe(
//       R.Do<number, unknown, unknown>(),
//       R.bind("one", () => R.right(1)),
//       R.bind("two", ({ one }) => R.right(one + one)),
//       R.map(({ one, two }) => one + two),
//     ),
//     R.right(3),
//   );
//   assertEqualsRE(
//     pipe(
//       R.right(1),
//       R.bindTo("one"),
//     ),
//     R.asks((_: number) => ({ one: 1 })),
//   );
// });
