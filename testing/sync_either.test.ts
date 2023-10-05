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
  assertEquals(SE.fromSync(S.wrap(1))(), E.right(1));
});

Deno.test("SyncEither wrap", () => {
  assertEqualsIO(SE.wrap(1), SE.wrap(1));
});

Deno.test("SyncEither apply", () => {
  const add = (n: number) => n + 1;

  assertEquals(pipe(SE.wrap(add), SE.apply(SE.wrap(1)))(), SE.wrap(2)());
  assertEquals(pipe(SE.left(1), SE.apply(SE.wrap(1)))(), SE.left(1)());
  assertEquals(pipe(SE.wrap(add), SE.apply(SE.left(1)))(), SE.left(1)());
  assertEquals(pipe(SE.left(1), SE.apply(SE.left(2)))(), SE.left(2)());
});

Deno.test("SyncEither map", () => {
  const fab = (n: number) => n + 1;
  const map = SE.map(fab);

  assertEqualsIO(map(SE.left(0)), SE.left(0));
  assertEqualsIO(map(SE.right(0)), SE.right(1));
});

Deno.test("SyncEither flatmap", () => {
  const flatmap = SE.flatmap((n: number) => n === 0 ? SE.left(0) : SE.right(n));

  assertEqualsIO(flatmap(SE.right(0)), SE.left(0));
  assertEqualsIO(flatmap(SE.right(1)), SE.right(1));
  assertEqualsIO(flatmap(SE.left(0)), SE.left(0));
});

Deno.test("SyncEither fail", () => {
  assertEqualsIO(SE.fail(0), SE.left(0));
});

Deno.test("SyncEither mapSecond", () => {
  const mapSecond = SE.mapSecond((n: number) => n + 1);

  assertEqualsIO(mapSecond(SE.left(0)), SE.left(1));
  assertEqualsIO(mapSecond(SE.right(0)), SE.right(0));
});

Deno.test("SyncEither fold", () => {
  const fold = SE.fold((a: number, c: number) => a + c, 0);

  assertEquals(fold(SE.left(-1)), 0);
  assertEquals(fold(SE.right(1)), 1);
});

Deno.test("SyncEither alt", () => {
  assertEqualsIO(pipe(SE.right(0), SE.alt(SE.right(1))), SE.right(0));
  assertEqualsIO(pipe(SE.right(0), SE.alt(SE.left(1))), SE.right(0));
  assertEqualsIO(pipe(SE.left(0), SE.alt(SE.right(1))), SE.right(1));
  assertEqualsIO(pipe(SE.left(0), SE.alt(SE.left(1))), SE.left(1));
});

Deno.test("SyncEither recover", () => {
  const recover = SE.recover((n: number) =>
    n === 0 ? SE.left(n + 1) : SE.right(n + 1)
  );

  assertEqualsIO(recover(SE.right(0)), SE.right(0));
  assertEqualsIO(recover(SE.right(1)), SE.right(1));
  assertEqualsIO(recover(SE.left(0)), SE.left(1));
  assertEqualsIO(recover(SE.left(1)), SE.right(2));
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
