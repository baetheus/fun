import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as T from "../task.ts";
import { _, pipe } from "../fns.ts";

import * as AS from "./assert.ts";

const assertEqualsT = async (a: T.Task<unknown>, b: T.Task<unknown>) =>
  assertEquals(await a(), await b());

Deno.test("Task make", async () => {
  await assertEqualsT(T.make(0), T.make(0));
});

Deno.test("Task delay", async () => {
  await assertEqualsT(pipe(T.make(0), T.delay(200)), T.make(0));
});

Deno.test("Task fromThunk", async () => {
  await assertEqualsT(T.fromThunk(() => 0), T.make(0));
});

Deno.test("Task tryCatch", async () => {
  await assertEqualsT(T.tryCatch(_, () => 0), T.make(0));
  await assertEqualsT(T.tryCatch(() => 1, () => 0), T.make(1));
});

Deno.test("Task of", async () => {
  await assertEqualsT(T.of(1), T.make(1));
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

Deno.test("Task Do, bind, bindTo", () => {
  assertEqualsT(
    pipe(
      T.Do<number, number, number>(),
      T.bind("one", () => T.make(1)),
      T.bind("two", ({ one }) => T.make(one + one)),
      T.map(({ one, two }) => one + two),
    ),
    T.make(3),
  );
  assertEqualsT(
    pipe(
      T.make(1),
      T.bindTo("one"),
    ),
    T.make({ one: 1 }),
  );
});
