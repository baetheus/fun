import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as T from "../task.ts";
import { pipe } from "../fns.ts";

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

Deno.test("Task of", async () => {
  assertEquals(await T.of(0)(), 0);
});

Deno.test("Task delay", async () => {
  assertEquals(await pipe(T.of(0), T.delay(200))(), 0);
});

Deno.test("Task fromThunk", async () => {
  assertEquals(await T.fromThunk(() => 0)(), 0);
});

Deno.test("Task tryCatch", async () => {
  assertEquals(await T.tryCatch(throwSync, () => 0)(1)(), 1);
  assertEquals(await T.tryCatch(throwSync, () => 0)(2)(), 0);
  assertEquals(await T.tryCatch(throwAsync, () => 0)(1)(), 1);
  assertEquals(await T.tryCatch(throwAsync, () => 0)(2)(), 0);
});

Deno.test("Task of", async () => {
  assertEquals(await T.of(1)(), 1);
});

Deno.test("Task apParallel", async () => {
  assertEquals(await pipe(T.of(1), T.apParallel(T.of(add)))(), 2);
});

Deno.test("Task map", async () => {
  assertEquals(await pipe(T.of(1), T.map(add))(), 2);
});

Deno.test("Task join", async () => {
  assertEquals(await T.join(T.of(T.of(1)))(), 1);
});

Deno.test("Task chain", async () => {
  assertEquals(await pipe(T.of(1), T.chain((n) => T.of(n + 1)))(), 2);
});

Deno.test("Task apSeq", async () => {
  assertEquals(await pipe(T.of(1), T.apSequential(T.of(add)))(), 2);
});

// Deno.test("Task Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       T.Do<number, number, number>(),
//       T.bind("one", () => T.of(1)),
//       T.bind("two", ({ one }) => T.of(one + one)),
//       T.map(({ one, two }) => one + two),
//     ),
//     T.of(3),
//   );
//   assertEquals(
//     pipe(
//       T.of(1),
//       T.bindTo("one"),
//     ),
//     T.of({ one: 1 }),
//   );
// });
