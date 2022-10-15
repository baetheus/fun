import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as FE from "../fn_either.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

const multiply = (n: number) => n * n;

const n = undefined as unknown as never;

const assertEqualsRE = (
  // deno-lint-ignore no-explicit-any
  a: FE.FnEither<[number], any, any>,
  // deno-lint-ignore no-explicit-any
  b: FE.FnEither<[number], any, any>,
) => assertEquals(a(0), b(0));

Deno.test("FnEither ask", () => {
  assertEqualsRE(FE.ask<number>(), FE.ask<number>());
});

Deno.test("FnEither asks", () => {
  assertEqualsRE(FE.asks((n) => n), FE.of(0));
});

Deno.test("FnEither left", () => {
  assertEquals(FE.left("Hello")(n), E.left("Hello"));
});

Deno.test("FnEither right", () => {
  assertEquals(FE.right("Hello")(n), E.right("Hello"));
});

Deno.test("FnEither tryCatch", () => {
  const throwOnZero = FE.tryCatch(
    (n: number) => {
      if (n === 0) {
        throw new Error("Zero");
      }
      return n;
    },
    (_, [n]) => n,
  );
  assertEquals(throwOnZero(0), E.left(0));
  assertEquals(throwOnZero(1), E.right(1));
});

Deno.test("FnEither fromEither", () => {
  assertEqualsRE(FE.fromEither(E.left(0)), FE.left(0));
  assertEqualsRE(FE.fromEither(E.right(0)), FE.right(0));
});

Deno.test("FnEither of", () => {
  assertEqualsRE(FE.of(0), FE.right(0));
});

Deno.test("FnEither ap", () => {
  assertEquals(
    pipe(FE.right(0), FE.ap(FE.right((n) => n + 1)))(n),
    FE.right(1)(n),
  );
  assertEquals(
    pipe(FE.left(0), FE.ap(FE.right((n) => n + 1)))(n),
    FE.left(0)(n),
  );
  assertEquals(pipe(FE.right(0), FE.ap(FE.left(0)))(n), FE.left(0)(n));
  assertEquals(pipe(FE.left(1), FE.ap(FE.left(0)))(n), FE.left(1)(n));
});

Deno.test("FnEither join", () => {
  assertEquals(pipe(FE.of(FE.of(0)), FE.join)(n), FE.of(0)(n));
  assertEquals(pipe(FE.of(FE.left(0)), FE.join)(n), FE.left(0)(n));
  assertEquals(pipe(FE.left(0), FE.join)(n), FE.left(0)(n));
});

Deno.test("FnEither chain", () => {
  assertEquals(
    pipe(FE.of(0), FE.chain((n: number) => n === 0 ? FE.left(n) : FE.right(n)))(
      n,
    ),
    FE.left(0)(n),
  );
  assertEquals(
    pipe(FE.right(1), FE.chain((n) => n === 0 ? FE.left(n) : FE.right(n)))(n),
    FE.right(1)(n),
  );
  assertEquals(
    pipe(FE.left(1), FE.chain((n) => n === 0 ? FE.left(n) : FE.right(n)))(n),
    FE.left(1)(n),
  );
});

Deno.test("FnEither throwError", () => {
  assertEqualsRE(FE.throwError(0), FE.left(0));
});

Deno.test("FnEither bimap", () => {
  const bimap = FE.bimap(add, multiply);
  assertEqualsRE(bimap(FE.left(0)), FE.left(1));
  assertEqualsRE(bimap(FE.right(2)), FE.right(4));
});

Deno.test("FnEither mapLeft", () => {
  const mapLeft = FE.mapLeft(add);
  assertEqualsRE(mapLeft(FE.left(0)), FE.left(1));
  assertEqualsRE(mapLeft(FE.right(0)), FE.right(0));
});

Deno.test("FnEither alt", () => {
  assertEquals(pipe(FE.right(0), FE.alt(FE.right(1)))(n), FE.right(0)(n));
  assertEquals(pipe(FE.right(0), FE.alt(FE.left(1)))(n), FE.right(0)(n));
  assertEquals(pipe(FE.left(0), FE.alt(FE.right(1)))(n), FE.right(1)(n));
  assertEquals(pipe(FE.left(0), FE.alt(FE.left(1)))(n), FE.left(1)(n));
});

Deno.test("FnEither compose", () => {
  assertEquals(
    pipe(FE.ask<number>(), FE.compose(FE.asks((n) => n + 1)))(0),
    FE.right(1)(n),
  );
});

// Deno.test("FnEither Do, bind, bindTo", () => {
//   assertEqualsRE(
//     pipe(
//       FE.Do<number, unknown, unknown>(),
//       FE.bind("one", () => FE.right(1)),
//       FE.bind("two", ({ one }) => FE.right(one + one)),
//       FE.map(({ one, two }) => one + two),
//     ),
//     FE.right(3),
//   );
//   assertEqualsRE(
//     pipe(
//       FE.right(1),
//       FE.bindTo("one"),
//     ),
//     FE.asks((_: number) => ({ one: 1 })),
//   );
// });
