import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../io_either.ts";
import * as IO from "../io.ts";
import * as E from "../either.ts";
import { _, constant, pipe } from "../fns.ts";

// deno-lint-ignore no-explicit-any
const assertEqualsIO = (a: I.IOEither<any, any>, b: I.IOEither<any, any>) =>
  assertEquals(a(), b());

Deno.test("IOEither left", () => {
  assertEqualsIO(I.left(1), I.left(1));
});

Deno.test("IOEither right", () => {
  assertEqualsIO(I.right(1), I.right(1));
});

Deno.test("IOEither tryCatch", () => {
  assertEqualsIO(I.tryCatch(_, () => 0), I.left(0));
  assertEqualsIO(I.tryCatch(constant(1), () => 0), I.right(1));
});

Deno.test("IOEither fromEither", () => {
  assertEqualsIO(I.fromEither(E.right(1)), I.right(1));
  assertEqualsIO(I.fromEither(E.left(1)), I.left(1));
});

Deno.test("IOEither fromIO", () => {
  assertEquals(I.fromIO(IO.of(1))(), E.right(1));
});

Deno.test("IOEither of", () => {
  assertEqualsIO(I.of(1), I.of(1));
});

Deno.test("IOEither ap", () => {
  const fab = (n: number) => n + 1;
  const ap0 = I.ap(I.right<typeof fab, number>(fab));
  const ap1 = I.ap(I.left<typeof fab, number>(0));

  assertEqualsIO(ap0(I.left(0)), I.left(0));
  assertEqualsIO(ap0(I.right(0)), I.right(1));
  assertEqualsIO(ap1(I.left(1)), I.left(1));
  assertEqualsIO(ap1(I.right(0)), I.left(0));
});

Deno.test("IOEither map", () => {
  const fab = (n: number) => n + 1;
  const map = I.map(fab);

  assertEqualsIO(map(I.left(0)), I.left(0));
  assertEqualsIO(map(I.right(0)), I.right(1));
});

Deno.test("IOEither join", () => {
  const rs0 = I.right(I.right(0));
  const rs1 = I.right(I.left(0));
  const rs2 = I.left(-1);

  assertEqualsIO(I.join(rs0), I.right(0));
  assertEqualsIO(I.join(rs1), I.left(0));
  assertEqualsIO(I.join(rs2), I.left(-1));
});

Deno.test("IOEither chain", () => {
  const chain = I.chain((n: number) => n === 0 ? I.left(0) : I.right(n));

  assertEqualsIO(chain(I.right(0)), I.left(0));
  assertEqualsIO(chain(I.right(1)), I.right(1));
  assertEqualsIO(chain(I.left(0)), I.left(0));
});

Deno.test("IOEither throwError", () => {
  assertEqualsIO(I.throwError(0), I.left(0));
});

Deno.test("IOEither bimap", () => {
  const bimap = I.bimap((n: number) => n + 1, (n: number) => n + 1);

  assertEqualsIO(bimap(I.left(0)), I.left(1));
  assertEqualsIO(bimap(I.right(0)), I.right(1));
});

Deno.test("IOEither mapLeft", () => {
  const mapLeft = I.mapLeft((n: number) => n + 1);

  assertEqualsIO(mapLeft(I.left(0)), I.left(1));
  assertEqualsIO(mapLeft(I.right(0)), I.right(0));
});

Deno.test("IOEither reduce", () => {
  const reduce = I.reduce((a: number, c: number) => a + c, 0);

  assertEquals(reduce(I.left(-1)), 0);
  assertEquals(reduce(I.right(1)), 1);
});

Deno.test("IOEither extend", () => {
  const extend = I.extend((ta: I.IOEither<number, number>) =>
    pipe(ta(), E.fold((n) => n, (n) => n + 1))
  );

  assertEqualsIO(extend(I.left(0)), I.right(0));
  assertEqualsIO(extend(I.right(0)), I.right(1));
});

Deno.test("IOEither alt", () => {
  assertEqualsIO(pipe(I.right(0), I.alt(I.right(1))), I.right(0));
  assertEqualsIO(pipe(I.right(0), I.alt(I.left(1))), I.right(0));
  assertEqualsIO(pipe(I.left(0), I.alt(I.right(1))), I.right(1));
  assertEqualsIO(pipe(I.left(0), I.alt(I.left(1))), I.left(1));
});

Deno.test("IOEither chainLeft", () => {
  const chainLeft = I.chainLeft((n: number) =>
    n === 0 ? I.left(n + 1) : I.right(n + 1)
  );

  assertEqualsIO(chainLeft(I.right(0)), I.right(0));
  assertEqualsIO(chainLeft(I.right(1)), I.right(1));
  assertEqualsIO(chainLeft(I.left(0)), I.left(1));
  assertEqualsIO(chainLeft(I.left(1)), I.right(2));
});

Deno.test("IOEither sequenceTuple", () => {
  assertEqualsIO(I.sequenceTuple(I.right(0), I.right(0)), I.right([0, 0]));
  assertEqualsIO(I.sequenceTuple(I.right(0), I.left(0)), I.left(0));
  assertEqualsIO(I.sequenceTuple(I.left(0), I.right(0)), I.left(0));
  assertEqualsIO(I.sequenceTuple(I.left(0), I.left(1)), I.left(1));
});

Deno.test("IOEither sequenceStruct", () => {
  assertEqualsIO(
    I.sequenceStruct({ a: I.right(0), b: I.right(0) }),
    I.right({ a: 0, b: 0 }),
  );
  assertEqualsIO(I.sequenceStruct({ a: I.right(0), b: I.left(0) }), I.left(0));
  assertEqualsIO(I.sequenceStruct({ a: I.left(0), b: I.right(0) }), I.left(0));
  assertEqualsIO(I.sequenceStruct({ a: I.left(0), b: I.left(1) }), I.left(1));
});

// Deno.test("Datum Do, bind, bindTo", () => {
//   assertEqualsIO(
//     pipe(
//       I.Do(),
//       I.bind("one", () => I.right(1)),
//       I.bind("two", ({ one }) => I.right(one + one)),
//       I.map(({ one, two }) => one + two),
//     ),
//     I.right(3),
//   );
//   assertEqualsIO(
//     pipe(
//       I.right(1),
//       I.bindTo("one"),
//     ),
//     I.right({ one: 1 }),
//   );
// });
