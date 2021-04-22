import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import type * as HKT from "../hkt.ts";

import * as R from "../reader_either.ts";
import * as E from "../either.ts";
import { _, pipe } from "../fns.ts";

import * as AS from "./assert.ts";

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
  assertEquals(R.left("Hello")(0 as never), E.left("Hello"));
});

Deno.test("ReaderEither right", () => {
  assertEquals(R.right("Hello")(0 as never), E.right("Hello"));
});

Deno.test("ReaderEither tryCatch", () => {
  assertEqualsRE(R.tryCatch(_, () => -1), R.left(-1));
  assertEqualsRE(R.tryCatch(() => 0, () => -1), R.right(0));
});

Deno.test("ReaderEither fromEither", () => {
  assertEqualsRE(R.fromEither(E.left(0)), R.left(0));
  assertEqualsRE(R.fromEither(E.right(0)), R.right(0));
});

Deno.test("ReaderEither of", () => {
  assertEqualsRE(R.of(0), R.right(0));
});

Deno.test("ReaderEither ap", () => {
  assertEqualsRE(pipe(R.right(0), R.ap(R.of(AS.add))), R.right(1));
  assertEqualsRE(pipe(R.right(0), R.ap(R.left(0))), R.left(0));
  assertEqualsRE(pipe(R.left(0), R.ap(R.right(AS.add))), R.left(0));
  assertEqualsRE(pipe(R.left(0), R.ap(R.left(1))), R.left(1));
});

Deno.test("ReaderEither join", () => {
  const tta = R.asks((n: number) => R.right(n));
  assertEquals(R.join(tta)(0), E.right(0));
});

Deno.test("ReaderEither chain", () => {
  assertEqualsRE(
    pipe(R.right(0), R.chain((n) => n === 0 ? R.left(n) : R.right(n))),
    R.left(0),
  );
  assertEqualsRE(
    pipe(R.right(1), R.chain((n) => n === 0 ? R.left(n) : R.right(n))),
    R.right(1),
  );
  assertEqualsRE(
    pipe(R.left(1), R.chain((n) => n === 0 ? R.left(n) : R.right(n))),
    R.left(1),
  );
});

Deno.test("ReaderEither throwError", () => {
  assertEqualsRE(R.throwError(0), R.left(0));
});

Deno.test("ReaderEither bimap", () => {
  const bimap = R.bimap(AS.add, AS.multiply);
  assertEqualsRE(bimap(R.left(0)), R.left(1));
  assertEqualsRE(bimap(R.right(2)), R.right(4));
});

Deno.test("ReaderEither mapLeft", () => {
  const mapLeft = R.mapLeft(AS.add);
  assertEqualsRE(mapLeft(R.left(0)), R.left(1));
  assertEqualsRE(mapLeft(R.right(0)), R.right(0));
});

Deno.test("ReaderEither alt", () => {
  assertEqualsRE(pipe(R.right(0), R.alt(R.right(1))), R.right(0));
  assertEqualsRE(pipe(R.right(0), R.alt(R.left(1))), R.right(0));
  assertEqualsRE(pipe(R.left(0), R.alt(R.right(1))), R.right(1));
  assertEqualsRE(pipe(R.left(0), R.alt(R.left(1))), R.left(1));
});

Deno.test("ReaderEither chainLeft", () => {
  const chainLeft = R.chainLeft((n) => n === 0 ? R.left(n) : R.right(n));
  assertEqualsRE(chainLeft(R.right(0)), R.right(0));
  assertEqualsRE(chainLeft(R.left(1)), R.right(1));
  assertEqualsRE(chainLeft(R.left(0)), R.left(0));
});

Deno.test("ReaderEither widen", () => {
  assertEqualsRE(pipe(R.right(0), R.widen<number>()), R.right(0));
  assertEqualsRE(pipe(R.left(0), R.widen<string>()), R.left(0));
});

Deno.test("ReaderEither Do, bind, bindTo", () => {
  assertEqualsRE(
    pipe(
      R.Do<number, unknown, unknown>(),
      R.bind("one", () => R.right(1)),
      R.bind("two", ({ one }) => R.right(one + one)),
      R.map(({ one, two }) => one + two),
    ),
    R.right(3),
  );
  assertEqualsRE(
    pipe(
      R.right(1),
      R.bindTo("one"),
    ),
    R.asks((_: number) => ({ one: 1 })),
  );
});
