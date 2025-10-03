import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as Effect from "../effect.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

Deno.test("Effect id", async () => {
  const id = Effect.id<[number]>();
  const result = await id(42);
  assertEquals(result, [E.right([42]), 42]);
});

Deno.test("Effect delay", async () => {
  const start = Date.now();
  const delayed = Effect.delay(100)(Effect.wrap(42));
  const result = await delayed(0);
  const elapsed = Date.now() - start;

  assertEquals(result, [E.right(42), 0]);
  assertEquals(elapsed >= 100, true);
});

Deno.test("Effect fromPromise with Promise", async () => {
  const wrapped = Effect.fromPromise(Promise.resolve(42));
  const result = await wrapped("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect fromPromise with rejected Promise", async () => {
  const wrapped = Effect.fromPromise(Promise.reject("error"));
  const result = await wrapped("state");
  assertEquals(result, [E.left("error"), "state"]);
});

Deno.test("Effect fromEither with right value", async () => {
  const fromRight = Effect.fromEither(E.right(42));
  const result = await fromRight("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect fromEither with left value", async () => {
  const fromLeft = Effect.fromEither(E.left("error"));
  const result = await fromLeft("state");
  assertEquals(result, [E.left("error"), "state"]);
});

Deno.test("Effect wrap with value", async () => {
  const wrapped = Effect.wrap(42);
  const result = await wrapped("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect right", async () => {
  const right = Effect.right(42);
  const result = await right("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect left", async () => {
  const left = Effect.left("error");
  const result = await left("state");
  assertEquals(result, [E.left("error"), "state"]);
});

Deno.test("Effect premap", async () => {
  const effect = Effect.gets((n: number) => n * 2);
  const premapped = Effect.premap((s: string) => [parseInt(s)])(effect);
  const result = await premapped("42");
  assertEquals(result, [E.right(84), 42]);
});

Deno.test("Effect map with right value", async () => {
  const effect = Effect.wrap<number>(5);
  const mapped = pipe(
    effect,
    Effect.map((n) => n * 2),
  );
  const result = await mapped("state");
  assertEquals(result, [E.right(10), "state"]);
});

Deno.test("Effect map with left value", async () => {
  const effect = Effect.left("error");
  const mapped = pipe(
    effect,
    Effect.map((n: number) => n * 2),
  );
  const result = await mapped("state");
  assertEquals(result, [E.left("error"), "state"]);
});

Deno.test("Effect map with Promise function", async () => {
  const effect = Effect.wrap<number>(5);
  const mapped = pipe(
    effect,
    Effect.map((n) => Promise.resolve(n * 2)),
  );
  const result = await mapped("state");
  assertEquals(result, [E.right(10), "state"]);
});

Deno.test("Effect mapSecond with left value", async () => {
  const effect = Effect.left("error");
  const mapped = pipe(
    effect,
    Effect.mapSecond((e: string) => `Error: ${e}`),
  );
  const result = await mapped("state");
  assertEquals(result, [E.left("Error: error"), "state"]);
});

Deno.test("Effect mapSecond with right value", async () => {
  const effect = Effect.wrap(42);
  const mapped = pipe(
    effect,
    Effect.mapSecond((e: string) => `Error: ${e}`),
  );
  const result = await mapped("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect mapSecond with Promise function", async () => {
  const effect = Effect.left("error");
  const mapped = pipe(
    effect,
    Effect.mapSecond((e: string) => Promise.resolve(`Error: ${e}`)),
  );
  const result = await mapped("state");
  assertEquals(result, [E.left("Error: error"), "state"]);
});

Deno.test("Effect apply with right values", async () => {
  const effectFn = Effect.wrap<(n: number) => number>((n) => n * 2);
  const effectValue = Effect.wrap<number>(21);
  const applied = pipe(
    effectFn,
    Effect.apply(effectValue),
  );
  const result = await applied("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect apply with left function", async () => {
  const effectFn = Effect.left("fn error");
  const effectValue = Effect.wrap<number>(21);
  const applied = pipe(
    effectFn,
    Effect.apply(effectValue),
  );
  const result = await applied("state");
  assertEquals(result, [E.left("fn error"), "state"]);
});

Deno.test("Effect apply with left value", async () => {
  const effectFn = Effect.wrap<(n: number) => number>((n) => n * 2);
  const effectValue = Effect.left("value error");
  const applied = pipe(
    effectFn,
    Effect.apply(effectValue),
  );
  const result = await applied("state");
  assertEquals(result, [E.left("value error"), "state"]);
});

Deno.test("Effect apply with Promise function result", async () => {
  const effectFn = Effect.wrap<(n: number) => Promise<number>>((n) =>
    Promise.resolve(n * 2)
  );
  const effectValue = Effect.wrap<number>(21);
  const applied = pipe(
    effectFn,
    Effect.apply(effectValue),
  );
  const result = await applied("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect flatmap with right value", async () => {
  const effect = Effect.wrap<number>(5);
  const flatmapped = pipe(
    effect,
    Effect.flatmap((n) => Effect.wrap(n * 2)),
  );
  const result = await flatmapped("state");
  assertEquals(result, [E.right(10), "state"]);
});

Deno.test("Effect flatmap with left value", async () => {
  const effect = Effect.left("error");
  const flatmapped = pipe(
    effect,
    Effect.flatmap((n: number) => Effect.wrap(n * 2)),
  );
  const result = await flatmapped("state");
  assertEquals(result, [E.left("error"), "state"]);
});

Deno.test("Effect flatmap returning left", async () => {
  const effect = Effect.wrap(5);
  const flatmapped = pipe(
    effect,
    Effect.flatmap((n: number) => Effect.left(`Error: ${n}`)),
  );
  const result = await flatmapped("state");
  assertEquals(result, [E.left("Error: 5"), "state"]);
});

Deno.test("Effect get", async () => {
  const get = Effect.get<[string]>();
  const result = await get("hello");
  assertEquals(result, [E.right(["hello"]), "hello"]);
});

Deno.test("Effect put", async () => {
  const put = Effect.put("new state");
  const result = await put("old state");
  assertEquals(result, [E.right(["new state"]), "new state"]);
});

Deno.test("Effect gets with function", async () => {
  const gets = Effect.gets((s: number) => s * 2);
  const result = await gets(21);
  assertEquals(result, [E.right(42), 21]);
});

Deno.test("Effect gets with Promise function", async () => {
  const gets = Effect.gets((s: number) => Promise.resolve(s * 2));
  const result = await gets(21);
  assertEquals(result, [E.right(42), 21]);
});

Deno.test("Effect evaluate", async () => {
  const evaluate = Effect.evaluate("state");
  const rightResult = await evaluate(Effect.wrap(42));
  assertEquals(rightResult, E.right(42));

  const leftResult = await evaluate(Effect.left("error"));
  assertEquals(leftResult, E.left("error"));
});

Deno.test("Effect execute", async () => {
  const execute = Effect.execute("initial");

  const rightResult = await execute(Effect.wrap(42));
  assertEquals(rightResult, ["initial"]);

  const stateChangingEffect = pipe(
    Effect.get<[string]>(),
    Effect.flatmap((_) => Effect.put("modified")),
  );
  const modifiedResult = await execute(stateChangingEffect);
  assertEquals(modifiedResult, ["modified"]);
});

Deno.test("Effect tap", async () => {
  let sideEffect = 0;
  const tapped = pipe(
    Effect.wrap(42),
    Effect.tap((n) => {
      sideEffect = n;
    }),
  );
  const result = await tapped("state");

  assertEquals(result, [E.right(42), "state"]);
  assertEquals(sideEffect, 42);
});

Deno.test("Effect bind", async () => {
  const computation = pipe(
    Effect.wrap({ initial: 10 }),
    Effect.bind("doubled", ({ initial }) => Effect.wrap(initial * 2)),
    Effect.bind("tripled", ({ initial }) => Effect.wrap(initial * 3)),
  );

  const result = await computation("state");
  assertEquals(result, [
    E.right({ initial: 10, doubled: 20, tripled: 30 }),
    "state",
  ]);
});

Deno.test("Effect bind with left value", async () => {
  const computation = pipe(
    Effect.wrap<number, [string]>(10),
    Effect.bindTo("initial"),
    Effect.bind(
      "error",
      () => Effect.left("bind error"),
    ),
  );

  const result = await computation("state");
  assertEquals(result, [E.left("bind error"), "state"]);
});

Deno.test("Effect bindTo", async () => {
  const bound = pipe(
    Effect.wrap(42),
    Effect.bindTo("value"),
  );

  const result = await bound("state");
  assertEquals(result, [E.right({ value: 42 }), "state"]);
});

Deno.test("Effect getFlatmappableEffect", () => {
  const flatmappable = Effect.getFlatmappableEffect<[string]>();

  assertEquals(typeof flatmappable.wrap, "function");
  assertEquals(typeof flatmappable.apply, "function");
  assertEquals(typeof flatmappable.map, "function");
  assertEquals(typeof flatmappable.flatmap, "function");
});

Deno.test("Effect getFlatmappableEffect methods work", async () => {
  const flatmappable = Effect.getFlatmappableEffect<[string]>();

  // Test wrap
  const wrapped = flatmappable.wrap(42);
  const wrapResult = await wrapped("state");
  assertEquals(wrapResult, [E.right(42), "state"]);

  // Test map
  const mapped = flatmappable.map((n: number) => n * 2)(Effect.wrap(21));
  const mapResult = await mapped("state");
  assertEquals(mapResult, [E.right(42), "state"]);

  // Test flatmap
  const flatmapped = flatmappable.flatmap((n: number) => Effect.wrap(n * 2))(
    Effect.wrap(21),
  );
  const flatmapResult = await flatmapped("state");
  assertEquals(flatmapResult, [E.right(42), "state"]);

  // Test apply
  const fn = flatmappable.wrap((n: number) => n * 2);
  const value = flatmappable.wrap(21);
  const applied = pipe(
    fn,
    flatmappable.apply(value),
  );
  const applyResult = await applied("state");
  assertEquals(applyResult, [E.right(42), "state"]);
});

Deno.test("Effect complex stateful computation", async () => {
  const computation = pipe(
    Effect.get<[number]>(),
    Effect.flatmap(([n]) =>
      n > 0
        ? Effect.gets((s: number) => s + 10)
        : Effect.left("Negative number")
    ),
    Effect.flatmap((result) =>
      result > 20 ? Effect.wrap(result) : Effect.left("Result too small")
    ),
  );

  const result1 = await computation(15); // 15 > 0, 15 + 10 = 25, 25 > 20
  assertEquals(result1, [E.right(25), 15]);

  const result2 = await computation(5); // 5 > 0, 5 + 10 = 15, 15 <= 20
  assertEquals(result2, [E.left("Result too small"), 5]);

  const result3 = await computation(-1); // -1 <= 0
  assertEquals(result3, [E.left("Negative number"), -1]);
});

Deno.test("Effect error propagation in chain", async () => {
  const computation = pipe(
    Effect.wrap(10),
    Effect.flatmap((n: number) =>
      n > 5 ? Effect.wrap(n * 2) : Effect.left("Too small")
    ),
    Effect.map((n: number) => n + 1),
    Effect.flatmap((n: number) =>
      n > 15 ? Effect.wrap(`Result: ${n}`) : Effect.left("Final check failed")
    ),
  );

  const result = await computation("state");
  assertEquals(result, [E.right("Result: 21"), "state"]);

  // Test early failure
  const earlyFailure = pipe(
    Effect.wrap(3),
    Effect.flatmap((n: number) =>
      n > 5 ? Effect.wrap(n * 2) : Effect.left("Too small")
    ),
    Effect.map((n: number) => n + 1),
  );

  const earlyResult = await earlyFailure("state");
  assertEquals(earlyResult, [E.left("Too small"), "state"]);
});

Deno.test("Effect state threading", async () => {
  const computation = pipe(
    Effect.get<[number]>(),
    Effect.flatmap(([n]) => Effect.put(n + 10)),
    Effect.flatmap(() => Effect.get<[number]>()),
    Effect.map((n) => `Final: ${n}`),
  );

  const result = await computation(5);
  assertEquals(result, [E.right("Final: 15"), 15]);
});

Deno.test("Effect tryCatch with successful execution", async () => {
  const safeFunction = Effect.tryCatch(
    (n: number) => n * 2,
    (error, args) => `Error with args ${args}: ${error}`,
  );

  const result = await safeFunction(21);
  assertEquals(result, [E.right(42), 21]);
});

Deno.test("Effect tryCatch with Promise successful execution", async () => {
  const safeFunction = Effect.tryCatch(
    (n: number) => Promise.resolve(n * 2),
    (error, args) => `Error with args ${args}: ${error}`,
  );

  const result = await safeFunction(21);
  assertEquals(result, [E.right(42), 21]);
});

Deno.test("Effect tryCatch with error", async () => {
  const throwingFunction = Effect.tryCatch(
    (n: number) => {
      if (n < 0) throw new Error("Negative number");
      return n * 2;
    },
    (error, args) => `Caught error with args [${args}]: ${error}`,
  );

  const result = await throwingFunction(-5);
  assertEquals(result, [
    E.left("Caught error with args [-5]: Error: Negative number"),
    -5,
  ]);
});

Deno.test("Effect tryCatch with Promise that rejects", async () => {
  const rejectingFunction = Effect.tryCatch(
    (n: number) => Promise.reject(`Promise rejected with ${n}`),
    (error, args) => `Caught promise rejection with args [${args}]: ${error}`,
  );

  const result = await rejectingFunction(10);
  assertEquals(result, [
    E.left("Caught promise rejection with args [10]: Promise rejected with 10"),
    10,
  ]);
});

Deno.test("Effect recover with left value", async () => {
  const effect = Effect.left<string, [number]>("original error");
  const recovered = pipe(
    effect,
    Effect.recover((error: string) => Effect.wrap(`Recovered from: ${error}`)),
  );

  const result = await recovered(42);
  assertEquals(result, [E.right("Recovered from: original error"), 42]);
});

Deno.test("Effect recover with right value (no recovery needed)", async () => {
  const effect = Effect.wrap(42);
  const recovered = pipe(
    effect,
    Effect.recover((error: string) => Effect.wrap(`Recovered from: ${error}`)),
  );

  const result = await recovered("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect recover with recovery function that fails", async () => {
  const effect = Effect.left("original error");
  const recovered = pipe(
    effect,
    Effect.recover((error: string) =>
      Effect.left(`Recovery failed for: ${error}`)
    ),
  );

  const result = await recovered("state");
  assertEquals(result, [
    E.left("Recovery failed for: original error"),
    "state",
  ]);
});

Deno.test("Effect alt with first effect succeeding", async () => {
  const first = Effect.wrap(42);
  const second = Effect.wrap(24);
  const alternative = Effect.alt(second)(first);

  const result = await alternative("state");
  assertEquals(result, [E.right(42), "state"]);
});

Deno.test("Effect alt with first effect failing", async () => {
  const first = Effect.left("first error");
  const second = Effect.wrap(42);
  const alternative = Effect.alt(second)(first);

  const result = await alternative(1);
  assertEquals(result, [E.right(42), 1]);
});

Deno.test("Effect alt with both effects failing", async () => {
  const first = Effect.left("first error");
  const second = Effect.left("second error");
  const alternative = Effect.alt(second)(first);

  const result = await alternative("original");
  assertEquals(result, [E.left("second error"), "original"]);
});

Deno.test("Effect puts with sync function", async () => {
  const putsEffect = Effect.puts((n: number) => [n * 2]);
  const result = await putsEffect(21);
  assertEquals(result, [E.right([42]), 42]);
});

Deno.test("Effect puts with async function", async () => {
  const putsEffect = Effect.puts((n: number) => Promise.resolve([n * 2]));
  const result = await putsEffect(21);
  assertEquals(result, [E.right([42]), 42]);
});

Deno.test("Effect puts with identity function", async () => {
  const putsEffect = Effect.puts((s: string) => [s]);
  const result = await putsEffect("test");
  assertEquals(result, [E.right(["test"]), "test"]);
});

Deno.test("Effect fail", async () => {
  const errorEffect = Effect.fail("Something went wrong");
  const result = await errorEffect("state");
  assertEquals(result, [E.left("Something went wrong"), "state"]);
});

Deno.test("Effect swap with right value", async () => {
  const successEffect = Effect.right("success");
  const swappedSuccess = Effect.swap(successEffect);

  const result = await swappedSuccess("state");
  assertEquals(result, [E.left("success"), "state"]);
});

Deno.test("Effect swap with left value", async () => {
  const errorEffect = Effect.left("error");
  const swappedError = Effect.swap(errorEffect);

  const result = await swappedError("state");
  assertEquals(result, [E.right("error"), "state"]);
});

Deno.test("Effect getSecond", async () => {
  const getErrorState = Effect.getSecond<[string]>();
  const result = await getErrorState("hello");
  assertEquals(result, [E.left(["hello"]), "hello"]);
});

Deno.test("Effect putSecond", async () => {
  const putErrorState = Effect.putSecond("new error state");

  const result = await putErrorState("old state");
  assertEquals(result, [E.left(["new error state"]), "new error state"]);
});

Deno.test("Effect getsSecond with function", async () => {
  const getDoubledError = Effect.getsSecond((s: number) => s * 2);
  const result = await getDoubledError(21);
  assertEquals(result, [E.left(42), 21]);
});

Deno.test("Effect getsSecond with Promise function", async () => {
  const getAsyncError = Effect.getsSecond((s: number) =>
    Promise.resolve(s * 2)
  );
  const result = await getAsyncError(21);
  assertEquals(result, [E.left(42), 21]);
});

Deno.test("Effect putsSecond with sync function", async () => {
  const putsErrorEffect = Effect.putsSecond((n: number) => [n * 2]);
  const result = await putsErrorEffect(21);
  assertEquals(result, [E.left([42]), 42]);
});

Deno.test("Effect putsSecond with async function", async () => {
  const putsAsyncError = Effect.putsSecond((n: number) =>
    Promise.resolve([n * 2])
  );
  const result = await putsAsyncError(21);
  assertEquals(result, [E.left([42]), 42]);
});

Deno.test("Effect putsSecond with identity function", async () => {
  const putsErrorEffect = Effect.putsSecond((s: string) => [s]);
  const result = await putsErrorEffect("test");
  assertEquals(result, [E.left(["test"]), "test"]);
});
