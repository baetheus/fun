import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as SE from "../sync_either.ts";
import * as S from "../sync.ts";
import * as E from "../either.ts";
import { constant, pipe, todo } from "../fn.ts";

const assertEqualsIO = (
  // deno-lint-ignore no-explicit-any
  a: SE.SyncEither<any, any>,
  // deno-lint-ignore no-explicit-any
  b: SE.SyncEither<any, any>,
) => assertEquals(a(), b());

Deno.test("SyncEither left", () => {
  assertEqualsIO(SE.left(1), SE.left(1));
});

Deno.test("SyncEither right", () => {
  assertEqualsIO(SE.right(1), SE.right(1));
});

Deno.test("SyncEither tryCatch", () => {
  assertEqualsIO(SE.tryCatch(todo, () => 0), SE.left(0));
  assertEqualsIO(SE.tryCatch(constant(1), () => 0), SE.right(1));
});

Deno.test("SyncEither fromEither", () => {
  assertEqualsIO(SE.fromEither(E.right(1)), SE.right(1));
  assertEqualsIO(SE.fromEither(E.left(1)), SE.left(1));
});

Deno.test("SyncEither fromSync", () => {
  assertEquals(SE.fromSync(S.of(1))(), E.right(1));
});

Deno.test("SyncEither of", () => {
  assertEqualsIO(SE.of(1), SE.of(1));
});

Deno.test("SyncEither ap", () => {
  const add = (n: number) => n + 1;

  assertEquals(pipe(SE.of(add), SE.ap(SE.of(1)))(), SE.of(2)());
  assertEquals(pipe(SE.left(1), SE.ap(SE.of(1)))(), SE.left(1)());
  assertEquals(pipe(SE.of(add), SE.ap(SE.left(1)))(), SE.left(1)());
  assertEquals(pipe(SE.left(1), SE.ap(SE.left(2)))(), SE.left(2)());
});

Deno.test("SyncEither map", () => {
  const fab = (n: number) => n + 1;
  const map = SE.map(fab);

  assertEqualsIO(map(SE.left(0)), SE.left(0));
  assertEqualsIO(map(SE.right(0)), SE.right(1));
});

Deno.test("SyncEither join", () => {
  const rs0 = SE.right(SE.right(0));
  const rs1 = SE.right(SE.left(0));
  const rs2 = SE.left(-1);

  assertEqualsIO(SE.join(rs0), SE.right(0));
  assertEqualsIO(SE.join(rs1), SE.left(0));
  assertEqualsIO(SE.join(rs2), SE.left(-1));
});

Deno.test("SyncEither chain", () => {
  const chain = SE.chain((n: number) => n === 0 ? SE.left(0) : SE.right(n));

  assertEqualsIO(chain(SE.right(0)), SE.left(0));
  assertEqualsIO(chain(SE.right(1)), SE.right(1));
  assertEqualsIO(chain(SE.left(0)), SE.left(0));
});

Deno.test("SyncEither throwError", () => {
  assertEqualsIO(SE.throwError(0), SE.left(0));
});

Deno.test("SyncEither bimap", () => {
  const bimap = SE.bimap((n: number) => n + 1, (n: number) => n + 1);

  assertEqualsIO(bimap(SE.left(0)), SE.left(1));
  assertEqualsIO(bimap(SE.right(0)), SE.right(1));
});

Deno.test("SyncEither mapLeft", () => {
  const mapLeft = SE.mapLeft((n: number) => n + 1);

  assertEqualsIO(mapLeft(SE.left(0)), SE.left(1));
  assertEqualsIO(mapLeft(SE.right(0)), SE.right(0));
});

Deno.test("SyncEither reduce", () => {
  const reduce = SE.reduce((a: number, c: number) => a + c, 0);

  assertEquals(reduce(SE.left(-1)), 0);
  assertEquals(reduce(SE.right(1)), 1);
});

Deno.test("SyncEither extend", () => {
  const extend = SE.extend((ta: SE.SyncEither<number, number>) =>
    pipe(ta(), E.match((n) => n, (n) => n + 1))
  );

  assertEqualsIO(extend(SE.left(0)), SE.right(0));
  assertEqualsIO(extend(SE.right(0)), SE.right(1));
});

Deno.test("SyncEither alt", () => {
  assertEqualsIO(pipe(SE.right(0), SE.alt(SE.right(1))), SE.right(0));
  assertEqualsIO(pipe(SE.right(0), SE.alt(SE.left(1))), SE.right(0));
  assertEqualsIO(pipe(SE.left(0), SE.alt(SE.right(1))), SE.right(1));
  assertEqualsIO(pipe(SE.left(0), SE.alt(SE.left(1))), SE.left(1));
});

Deno.test("SyncEither chainLeft", () => {
  const chainLeft = SE.chainLeft((n: number) =>
    n === 0 ? SE.left(n + 1) : SE.right(n + 1)
  );

  assertEqualsIO(chainLeft(SE.right(0)), SE.right(0));
  assertEqualsIO(chainLeft(SE.right(1)), SE.right(1));
  assertEqualsIO(chainLeft(SE.left(0)), SE.left(1));
  assertEqualsIO(chainLeft(SE.left(1)), SE.right(2));
});

// Deno.test("Datum Do, bind, bindTo", () => {
//   assertEqualsIO(
//     pipe(
//       SE.Do(),
//       SE.bind("one", () => SE.right(1)),
//       SE.bind("two", ({ one }) => SE.right(one + one)),
//       SE.map(({ one, two }) => one + two),
//     ),
//     SE.right(3),
//   );
//   assertEqualsIO(
//     pipe(
//       SE.right(1),
//       SE.bindTo("one"),
//     ),
//     SE.right({ one: 1 }),
//   );
// });
