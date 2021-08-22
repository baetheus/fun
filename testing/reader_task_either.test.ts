import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import type * as HKT from "../hkt.ts";

import * as RTE from "../reader_task_either.ts";
import * as E from "../either.ts";
import { _, pipe } from "../fns.ts";

import * as AS from "./assert.ts";

const assertEqualsRTE = async (
  // deno-lint-ignore no-explicit-any
  a: RTE.ReaderTaskEither<number, any, any>,
  // deno-lint-ignore no-explicit-any
  b: RTE.ReaderTaskEither<number, any, any>,
) => {
  const _a = await a(0)();
  const _b = await b(0)();
  assertEquals(_a, _b);
};

Deno.test("ReaderTaskEither ask", () => {
  assertEqualsRTE(RTE.ask<number>(), RTE.ask<number>());
});

Deno.test("ReaderTaskEither asks", () => {
  assertEqualsRTE(
    RTE.asks((n) => n + 2),
    RTE.of(2),
  );
});

Deno.test("ReaderTaskEither left", () => {
  assertEquals(
    RTE.left("Hello")(0 as never)(),
    Promise.resolve(E.left("Hello")),
  );
});

Deno.test("ReaderTaskEither right", () => {
  assertEquals(
    RTE.right("Hello")(0 as never)(),
    Promise.resolve(E.right("Hello")),
  );
});

Deno.test("ReaderTaskEither tryCatch", () => {
  assertEqualsRTE(
    RTE.tryCatch(_, () => -1),
    RTE.left(-1),
  );
  assertEqualsRTE(
    RTE.tryCatch(
      () => 0,
      () => -1,
    ),
    RTE.right(0),
  );
});

Deno.test("ReaderTaskEither fromEither", () => {
  assertEqualsRTE(RTE.fromEither(E.left(0)), RTE.left(0));
  assertEqualsRTE(RTE.fromEither(E.right(0)), RTE.right(0));
});

Deno.test("ReaderTaskEither of", () => {
  assertEqualsRTE(RTE.of(0), RTE.right(0));
});

Deno.test("ReaderTaskEither ap", () => {
  assertEqualsRTE(pipe(RTE.right(0), RTE.ap(RTE.of(AS.add))), RTE.right(1));
  assertEqualsRTE(pipe(RTE.right(0), RTE.ap(RTE.left(0))), RTE.left(0));
  assertEqualsRTE(pipe(RTE.left(0), RTE.ap(RTE.right(AS.add))), RTE.left(0));
  assertEqualsRTE(pipe(RTE.left(0), RTE.ap(RTE.left(1))), RTE.left(1));
});

Deno.test("ReaderTaskEither join", () => {
  const tta = RTE.asks((n: number) => RTE.right(n));
  assertEquals(RTE.join(tta)(0)(), Promise.resolve(E.right(0)));
});

Deno.test("ReaderTaskEither chain", () => {
  assertEqualsRTE(
    pipe(
      RTE.right(0),
      RTE.chain((n) => (n === 0 ? RTE.left(n) : RTE.right(n))),
    ),
    RTE.left(0),
  );
  assertEqualsRTE(
    pipe(
      RTE.right(1),
      RTE.chain((n) => (n === 0 ? RTE.left(n) : RTE.right(n))),
    ),
    RTE.right(1),
  );
  assertEqualsRTE(
    pipe(
      RTE.left(1),
      RTE.chain((n) => (n === 0 ? RTE.left(n) : RTE.right(n))),
    ),
    RTE.left(1),
  );
});

Deno.test("ReaderTaskEither throwError", () => {
  assertEqualsRTE(RTE.throwError(0), RTE.left(0));
});

Deno.test("ReaderTaskEither bimap", () => {
  const bimap = RTE.bimap(AS.add, AS.multiply);
  assertEqualsRTE(bimap(RTE.left(0)), RTE.left(1));
  assertEqualsRTE(bimap(RTE.right(2)), RTE.right(4));
});

Deno.test("ReaderTaskEither mapLeft", () => {
  const mapLeft = RTE.mapLeft(AS.add);
  assertEqualsRTE(mapLeft(RTE.left(0)), RTE.left(1));
  assertEqualsRTE(mapLeft(RTE.right(0)), RTE.right(0));
});

Deno.test("ReaderTaskEither alt", () => {
  assertEqualsRTE(pipe(RTE.right(0), RTE.alt(RTE.right(1))), RTE.right(0));
  assertEqualsRTE(pipe(RTE.right(0), RTE.alt(RTE.left(1))), RTE.right(0));
  assertEqualsRTE(pipe(RTE.left(0), RTE.alt(RTE.right(1))), RTE.right(1));
  assertEqualsRTE(pipe(RTE.left(0), RTE.alt(RTE.left(1))), RTE.left(1));
});

Deno.test("ReaderTaskEither chainLeft", () => {
  const chainLeft = RTE.chainLeft((n) => n === 0 ? RTE.left(n) : RTE.right(n));
  assertEqualsRTE(chainLeft(RTE.right(0)), RTE.right(0));
  assertEqualsRTE(chainLeft(RTE.left(1)), RTE.right(1));
  assertEqualsRTE(chainLeft(RTE.left(0)), RTE.left(0));
});

Deno.test("ReaderTaskEither compose", () => {
  assertEqualsRTE(
    pipe(RTE.ask<number>(), RTE.compose(RTE.asks((n) => n + 1))),
    RTE.right(1),
  );
});

Deno.test("ReaderTaskEither widen", () => {
  assertEqualsRTE(pipe(RTE.right(0), RTE.widen<number>()), RTE.right(0));
  assertEqualsRTE(pipe(RTE.left(0), RTE.widen<string>()), RTE.left(0));
});

Deno.test("ReaderTaskEither Do, bind, bindTo", () => {
  assertEqualsRTE(
    pipe(
      RTE.Do<number, unknown, unknown>(),
      RTE.bind("one", () => RTE.right(1)),
      RTE.bind("two", ({ one }) => RTE.right(one + one)),
      RTE.map(({ one, two }) => one + two),
    ),
    RTE.right(3),
  );
  assertEqualsRTE(
    pipe(RTE.right(1), RTE.bindTo("one")),
    RTE.asks((_: number) => ({ one: 1 })),
  );
});
