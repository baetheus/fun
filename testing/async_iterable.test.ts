import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as AI from "../async_iterable.ts";
import * as I from "../iterable.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { resolve } from "../promise.ts";
import { pipe } from "../fn.ts";

Deno.test("AsyncIterable asyncIterable", async () => {
  const iterable = AI.asyncIterable(async function* () {
    let value = 0;
    while (value < 5) {
      yield ++value;
    }
  });

  assertEquals(await AI.collect(iterable), [1, 2, 3, 4, 5]);
});

Deno.test("AsyncIterable fromIterable", async () => {
  const iterable = I.range(3);
  const asyncIterable = AI.fromIterable(iterable);

  assertEquals(await AI.collect(asyncIterable), [0, 1, 2]);
});

Deno.test("AsyncIterable fromPromise", async () => {
  const asyncIterable = AI.fromPromise(Promise.resolve(1));
  assertEquals(await pipe(AI.collect(asyncIterable)), [1]);
});

Deno.test("AsyncIterable range", async () => {
  assertEquals(await pipe(AI.range(3), AI.collect), [0, 1, 2]);
});

Deno.test("AsyncIterable clone", async () => {
  const first = AI.range(3);
  const second = AI.clone(first);

  assertEquals(await AI.collect(first), [0, 1, 2]);
  assertEquals(await AI.collect(second), [0, 1, 2]);
});

Deno.test("AsyncIterable wrap", async () => {
  assertEquals(await pipe(AI.wrap(1), AI.collect), [1]);
});

Deno.test("AsyncIterable apply", async () => {
  assertEquals(
    await pipe(
      AI.wrap((n: number) => n + 1),
      AI.apply(AI.range(3)),
      AI.collect,
    ),
    [1, 2, 3],
  );
});

Deno.test("AsyncIterable map", async () => {
  assertEquals(
    await pipe(
      AI.range(3),
      AI.map((n) => n + 1),
      AI.collect,
    ),
    [1, 2, 3],
  );
});

Deno.test("AsyncIterable flatmap", async () => {
  assertEquals(
    await pipe(
      AI.range(3),
      AI.map((n) => n + 1),
      AI.flatmap(AI.range),
      AI.collect,
    ),
    [0, 0, 1, 0, 1, 2],
  );
});

Deno.test("AsyncIterable forEach", async () => {
  const result = new Array<number>();
  await pipe(
    AI.range(3),
    AI.forEach(
      async (n) => await resolve(result.push(n)),
      async () => await resolve(result.push(100)),
    ),
  );
  assertEquals(result, [0, 1, 2, 100]);

  const result2 = new Array<number>();
  await pipe(
    AI.range(3),
    AI.forEach(
      async (n) => await resolve(result2.push(n)),
    ),
  );
  assertEquals(result2, [0, 1, 2]);
});

Deno.test("AsyncIterable delay", async () => {
  assertEquals(
    await pipe(
      AI.range(3),
      AI.delay(100),
      AI.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("AsyncIterable filter", async () => {
  assertEquals(
    await pipe(
      AI.range(4),
      AI.filter((n) => n > 1),
      AI.collect,
    ),
    [2, 3],
  );
});

Deno.test("AsyncIterable filterMap", async () => {
  assertEquals(
    await pipe(
      AI.range(4),
      AI.filterMap(O.fromPredicate((n) => n > 1)),
      AI.collect,
    ),
    [2, 3],
  );
});

Deno.test("AsyncIterable partition", async () => {
  const [first, second] = pipe(
    AI.range(4),
    AI.partition((n) => n > 1),
  );

  assertEquals(await AI.collect(first), [2, 3]);
  assertEquals(await AI.collect(second), [0, 1]);
});

Deno.test("AsyncIterable partitionMap", async () => {
  const [first, second] = pipe(
    AI.range(4),
    AI.partitionMap((n) => n > 1 ? E.right(n + 10) : E.left(n)),
  );

  assertEquals(await AI.collect(first), [12, 13]);
  assertEquals(await AI.collect(second), [0, 1]);
});

Deno.test("AsyncIterable fold", async () => {
  assertEquals(
    await pipe(
      AI.range(3),
      AI.fold((value, sum) => value + sum, 0),
    ),
    3,
  );
});

Deno.test("AsyncIterable takeUntil", async () => {
  assertEquals(
    await pipe(
      AI.range(),
      AI.takeUntil((n) => n > 3),
      AI.collect,
    ),
    [0, 1, 2, 3],
  );
});

Deno.test("AsyncIterable takeWhile", async () => {
  assertEquals(
    await pipe(
      AI.range(),
      AI.takeWhile((n) => n < 3),
      AI.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("AsyncIterable scan", async () => {
  assertEquals(
    await pipe(
      AI.range(5),
      AI.scan((value, sum) => value + sum, 0),
      AI.collect,
    ),
    [0, 1, 3, 6, 10],
  );
});

Deno.test("AsyncIterable tap", async () => {
  let value = 0;
  await pipe(
    AI.range(3),
    AI.tap((n) => value = n),
    AI.collect,
  );
  assertEquals(value, 2);
});

Deno.test("AsyncIterable repeat", async () => {
  assertEquals(
    await pipe(
      AI.range(3),
      AI.repeat(2),
      AI.collect,
    ),
    [0, 1, 2, 0, 1, 2],
  );
});

Deno.test("AsyncIterable take", async () => {
  assertEquals(
    await pipe(
      AI.range(),
      AI.take(3),
      AI.collect,
    ),
    [0, 1, 2],
  );
});
