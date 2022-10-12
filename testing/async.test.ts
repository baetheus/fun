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
  assertEquals(await A.of(0)(), 0);
});

Deno.test("Async delay", async () => {
  assertEquals(await pipe(A.of(0), A.delay(200))(), 0);
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
  assertEquals(await A.of(1)(), 1);
});

Deno.test("Async apParallel", async () => {
  assertEquals(await pipe(A.of(1), A.apParallel(A.of(add)))(), 2);
});

Deno.test("Async map", async () => {
  assertEquals(await pipe(A.of(1), A.map(add))(), 2);
});

Deno.test("Async join", async () => {
  assertEquals(await A.join(A.of(A.of(1)))(), 1);
});

Deno.test("Async chain", async () => {
  assertEquals(await pipe(A.of(1), A.chain((n) => A.of(n + 1)))(), 2);
});

Deno.test("Async apSeq", async () => {
  assertEquals(await pipe(A.of(1), A.apSequential(A.of(add)))(), 2);
});

// Deno.test("Async Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       A.Do<number, number, number>(),
//       A.bind("one", () => A.of(1)),
//       A.bind("two", ({ one }) => A.of(one + one)),
//       A.map(({ one, two }) => one + two),
//     ),
//     A.of(3),
//   );
//   assertEquals(
//     pipe(
//       A.of(1),
//       A.bindTo("one"),
//     ),
//     A.of({ one: 1 }),
//   );
// });
