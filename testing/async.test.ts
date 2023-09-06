import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as A from "../async.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

function throwSync(n: number): number {
  if (n % 2 === 0) {
    throw new Error(`Number '${n}' is divisible by 2`);
  }
  return n;
}

function throwAsync(n: number): Promise<number> {
  if (n % 2 === 0) {
    return Promise.reject(`Number '${n}' is divisible by 2`);
  }
  return Promise.resolve(n);
}

Deno.test("Async of", async () => {
  assertEquals(await A.wrap(0)(), 0);
});

Deno.test("Async delay", async () => {
  assertEquals(await pipe(A.wrap(0), A.delay(200))(), 0);
});

Deno.test("Async fromSync", async () => {
  assertEquals(await A.fromSync(() => 0)(), 0);
});

Deno.test("Async tryCatch", async () => {
  assertEquals(await A.tryCatch(throwSync, () => 0)(1)(), 1);
  assertEquals(await A.tryCatch(throwSync, () => 0)(2)(), 0);
  assertEquals(await A.tryCatch(throwAsync, () => 0)(1)(), 1);
  assertEquals(await A.tryCatch(throwAsync, () => 0)(2)(), 0);
});

Deno.test("Async of", async () => {
  assertEquals(await A.wrap(1)(), 1);
});

Deno.test("Async apply", async () => {
  assertEquals(
    await pipe(A.wrap((n: number) => n + 1), A.apply(A.wrap(1)))(),
    2,
  );
});

Deno.test("Async map", async () => {
  assertEquals(await pipe(A.wrap(1), A.map(add))(), 2);
});

Deno.test("Async flatmap", async () => {
  assertEquals(await pipe(A.wrap(1), A.flatmap((n) => A.wrap(n + 1)))(), 2);
});

Deno.test("Async apSeq", async () => {
  assertEquals(
    await pipe(A.wrap((n: number) => n + 1), A.applySequential(A.wrap(1)))(),
    2,
  );
});

// Deno.test("Async Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       A.Do<number, number, number>(),
//       A.bind("one", () => A.wrap(1)),
//       A.bind("two", ({ one }) => A.wrap(one + one)),
//       A.map(({ one, two }) => one + two),
//     ),
//     A.wrap(3),
//   );
//   assertEquals(
//     pipe(
//       A.wrap(1),
//       A.bindTo("one"),
//     ),
//     A.wrap({ one: 1 }),
//   );
// });
