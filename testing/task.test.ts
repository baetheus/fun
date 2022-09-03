import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as T from "../task.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

// deno-lint-ignore no-explicit-any
const assertEqualsT = async (a: T.Task<any>, b: T.Task<any>) =>
  assertEquals(await a(), await b());

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

Deno.test("Task make", async () => {
  await assertEqualsT(T.of(0), T.of(0));
});

Deno.test("Task delay", async () => {
  await assertEqualsT(pipe(T.of(0), T.delay(200)), T.of(0));
});

Deno.test("Task fromThunk", async () => {
  await assertEqualsT(T.fromThunk(() => 0), T.of(0));
});

Deno.test("Task tryCatch", async () => {
  await assertEqualsT(T.tryCatch(throwSync, () => 0)(1), T.of(1));
  await assertEqualsT(T.tryCatch(throwSync, () => 0)(2), T.of(0));
  await assertEqualsT(T.tryCatch(throwAsync, () => 0)(1), T.of(1));
  await assertEqualsT(T.tryCatch(throwAsync, () => 0)(2), T.of(0));
});

Deno.test("Task of", async () => {
  await assertEqualsT(T.of(1), T.of(1));
});

Deno.test("Task ap", async () => {
  await assertEqualsT(pipe(T.of(1), T.ap(T.of(AS.add))), T.of(2));
});

Deno.test("Task map", async () => {
  await assertEqualsT(pipe(T.of(1), T.map(AS.add)), T.of(2));
});

Deno.test("Task join", async () => {
  await assertEqualsT(T.join(T.of(T.of(1))), T.of(1));
});

Deno.test("Task chain", async () => {
  await assertEqualsT(pipe(T.of(1), T.chain((n) => T.of(n + 1))), T.of(2));
});

Deno.test("Task apSeq", async () => {
  await assertEqualsT(pipe(T.of(1), T.apSeq(T.of(AS.add))), T.of(2));
});

// Deno.test("Task Do, bind, bindTo", () => {
//   assertEqualsT(
//     pipe(
//       T.Do<number, number, number>(),
//       T.bind("one", () => T.of(1)),
//       T.bind("two", ({ one }) => T.of(one + one)),
//       T.map(({ one, two }) => one + two),
//     ),
//     T.of(3),
//   );
//   assertEqualsT(
//     pipe(
//       T.of(1),
//       T.bindTo("one"),
//     ),
//     T.of({ one: 1 }),
//   );
// });
