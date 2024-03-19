import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../promise.ts";
import * as E from "../either.ts";
import * as N from "../number.ts";
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

  {
    using _ = P.wait(100);
  }
});

Deno.test("Promise delay", async () => {
  const start = Date.now();
  const waiter = pipe(P.wrap(1), P.delay(200));
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
  assertEquals(await pipe(P.wrap(1), P.then((n) => n + 1)), 2);
  assertEquals(await pipe(P.wrap(1), P.then((n) => P.wrap(n + 1))), 2);
});

Deno.test("Promise catchError", async () => {
  assertEquals(await pipe(P.reject(1), P.catchError(() => 2)), 2);
});

Deno.test("Promise all", async () => {
  assertEquals(await P.all(P.wrap(1), P.wrap("Hello")), [1, "Hello"]);
  assertEquals(
    await pipe(
      P.all(P.wrap(1), P.reject("Hello")),
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
  assertEquals(await P.wrap(1), 1);
});

Deno.test("Promise ap", async () => {
  assertEquals(
    await pipe(
      P.wrap((n: number) => n + 1),
      P.apply(P.wrap(1)),
    ),
    2,
  );
});

Deno.test("Promise map", async () => {
  assertEquals(await pipe(P.wrap(1), P.map((n) => n + 1)), 2);
});

Deno.test("Promise flatmap", async () => {
  assertEquals(await pipe(P.wrap(1), P.flatmap((n) => P.wrap(n + 1))), 2);
});

Deno.test("Promise fail", async () => {
  assertEquals(await pipe(P.fail(1), P.catchError(P.wrap)), await P.wrap(1));
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

Deno.test("Promise getCombinablePromise", async () => {
  const { combine } = P.getCombinablePromise(N.CombinableNumberSum);
  assertEquals(await combine(P.wrap(1))(P.wrap(2)), await P.wrap(3));
});

Deno.test("Promise getInitializablePromise", async () => {
  const { combine, init } = P.getInitializablePromise(N.InitializableNumberSum);
  assertEquals(await init(), await P.wrap(0));
  assertEquals(await combine(P.wrap(1))(P.wrap(2)), await P.wrap(3));
});

Deno.test("Promise MappablePromise", () => {
  assertStrictEquals(P.MappablePromise.map, P.map);
});

Deno.test("Promise ApplicablePromise", () => {
  assertStrictEquals(P.ApplicablePromise.apply, P.apply);
  assertStrictEquals(P.ApplicablePromise.map, P.map);
  assertStrictEquals(P.ApplicablePromise.wrap, P.wrap);
});

Deno.test("Promise FlatmappablePromise", () => {
  assertStrictEquals(P.FlatmappablePromise.wrap, P.wrap);
  assertStrictEquals(P.FlatmappablePromise.apply, P.apply);
  assertStrictEquals(P.FlatmappablePromise.map, P.map);
  assertStrictEquals(P.FlatmappablePromise.flatmap, P.flatmap);
});
