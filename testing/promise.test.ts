import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../promise.ts";
import * as E from "../either.ts";
import * as N from "../number.ts";
import { concatAll } from "../semigroup.ts";
import { pipe, todo } from "../fn.ts";

Deno.test("Promise deferred", async () => {
  const promise = P.deferred<number>();
  setTimeout(() => promise.resolve(1), 100);

  assertEquals(await promise, 1);
});

Deno.test({
  name: "Promise abortable aborted",
  async fn() {
    const controller = new AbortController();
    const slow = P.wait(100).then(() => 1);
    const wrapped = pipe(
      slow,
      P.abortable(controller.signal, (msg) => msg),
    );
    setTimeout(() => controller.abort("Hi"), 50);

    assertEquals(await wrapped, E.left("Hi"));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "Promise abortable early",
  async fn() {
    const controller = new AbortController();
    controller.abort("Hi");
    const slow = P.wait(100).then(() => 1);
    const wrapped = pipe(
      slow,
      P.abortable(controller.signal, (msg) => msg),
    );

    assertEquals(await wrapped, E.left("Hi"));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "Promise abortable ok",
  async fn() {
    const controller = new AbortController();
    const slow = P.wait(100).then(() => 1);
    const wrapped = pipe(
      slow,
      P.abortable(controller.signal, (msg) => msg),
    );

    assertEquals(await wrapped, E.right(1));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test("Promise wait", async () => {
  const start = Date.now();
  const waiter = P.wait(200);
  await waiter;
  const end = Date.now();
  assertEquals(end - start >= 100, true);
});

Deno.test("Promise delay", async () => {
  const start = Date.now();
  const waiter = pipe(P.of(1), P.delay(200));
  await waiter;
  const end = Date.now();
  assertEquals(end - start >= 100, true);
  assertEquals(await waiter, 1);
});

Deno.test("Promise resolve", async () => {
  assertEquals(await P.resolve(1), 1);
});

Deno.test("Promise reject", async () => {
  assertEquals(await pipe(P.reject(1), P.catchError(() => 2)), 2);
});

Deno.test("Promise then", async () => {
  assertEquals(await pipe(P.of(1), P.then((n) => n + 1)), 2);
  assertEquals(await pipe(P.of(1), P.then((n) => P.of(n + 1))), 2);
});

Deno.test("Promise catchError", async () => {
  assertEquals(await pipe(P.reject(1), P.catchError(() => 2)), 2);
});

Deno.test("Promise all", async () => {
  assertEquals(await P.all(P.of(1), P.of("Hello")), [1, "Hello"]);
  assertEquals(
    await pipe(
      P.all(P.of(1), P.reject("Hello")),
      P.catchError(() => [0, "Goodbye"]),
    ),
    [0, "Goodbye"],
  );
});

Deno.test({
  name: "Promise race",
  async fn() {
    const one = pipe(P.wait(200), P.map(() => "one"));
    const two = pipe(P.wait(300), P.map(() => "two"));
    assertEquals(await P.race(one, two), "one");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test("Promise of", async () => {
  assertEquals(await P.of(1), 1);
});

Deno.test("Promise ap", async () => {
  assertEquals(
    await pipe(
      P.of(1),
      P.ap(P.of((n) => n + 1)),
    ),
    2,
  );
});

Deno.test("Promise map", async () => {
  assertEquals(await pipe(P.of(1), P.map((n) => n + 1)), 2);
});

Deno.test("Promise chain", async () => {
  assertEquals(await pipe(P.of(1), P.chain((n) => P.of(n + 1))), 2);
});

Deno.test("Promise join", async () => {
  // This is a farce
  const fake = P.of(1) as unknown as Promise<Promise<number>>;

  assertEquals(await P.join(fake), 1);
});

Deno.test("Promise tryCatch", async () => {
  const add = (n: number) => n + 1;
  const throwSync = (_: number): number => todo();
  const throwAsync = (_: number): Promise<number> => P.reject("Ha!");

  const catchAdd = P.tryCatch(add, () => -1);
  const catchSync = P.tryCatch(throwSync, () => -1);
  const catchAsync = P.tryCatch(throwAsync, () => -1);

  assertEquals(await catchAdd(1), 2);
  assertEquals(await catchSync(1), -1);
  assertEquals(await catchAsync(1), -1);
});

Deno.test("Promise FunctorPromise", () => {
  assertStrictEquals(P.FunctorPromise.map, P.map);
});

Deno.test("Promise ApplyPromise", () => {
  assertStrictEquals(P.ApplyPromise.ap, P.ap);
  assertStrictEquals(P.ApplyPromise.map, P.map);
});

Deno.test("Promise ApplicativePromise", () => {
  assertStrictEquals(P.ApplicativePromise.ap, P.ap);
  assertStrictEquals(P.ApplicativePromise.map, P.map);
  assertStrictEquals(P.ApplicativePromise.of, P.of);
});

Deno.test("Promise ChainPromise", () => {
  assertStrictEquals(P.ChainPromise.ap, P.ap);
  assertStrictEquals(P.ChainPromise.map, P.map);
  assertStrictEquals(P.ChainPromise.chain, P.chain);
});

Deno.test("Promise MonadPromise", () => {
  assertStrictEquals(P.MonadPromise.of, P.of);
  assertStrictEquals(P.MonadPromise.ap, P.ap);
  assertStrictEquals(P.MonadPromise.map, P.map);
  assertStrictEquals(P.MonadPromise.join, P.join);
  assertStrictEquals(P.MonadPromise.chain, P.chain);
});

Deno.test("Promise sequenceTuple", async () => {
  assertEquals(await P.sequenceTuple(P.of(1), P.of("Hello")), [1, "Hello"]);
});

Deno.test("Promise sequenceStruct", async () => {
  assertEquals(await P.sequenceStruct({ one: P.of(1), two: P.of("Hello") }), {
    one: 1,
    two: "Hello",
  });
});

Deno.test("Promise getApplySemigroup", async () => {
  const S = P.getApplySemigroup(N.SemigroupNumberSum);
  const concat = concatAll(S);

  assertEquals(
    await pipe([P.of(1), P.of(2), P.of(3), P.of(4)], concat(P.of(0))),
    10,
  );
});
