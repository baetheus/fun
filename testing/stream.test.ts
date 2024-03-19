import { assertEquals, assertStrictEquals } from "jsr:@std/assert@0.222.1";

import * as S from "../stream.ts";
import * as P from "../promise.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

Deno.test("Stream disposable", () => {
  let value = 0;
  const disposable = S.disposable(() => value++);
  S.dispose(disposable);
  assertEquals(value, 1);
});

Deno.test("Stream dispose", () => {
  let value = 0;
  const disposable = S.disposable(() => value = 1);

  {
    using _ = disposable;
  }

  assertEquals(value, 1);
});

Deno.test("Stream disposeNone", () => {
  {
    using _ = S.disposeNone();
  }
});

Deno.test("Stream sink", () => {
  const events: number[] = [];
  const sink = S.sink(
    (e: number) => events.push(e),
    () => events.push(100),
  );

  sink.event(1);
  sink.event(2);

  assertEquals(events, [1, 2]);

  sink.end();

  assertEquals(events, [1, 2, 100]);
});

Deno.test("Stream emptySink", () => {
  S.emptySink();
});

Deno.test("Stream empty", async () => {
  let ended = false;
  let value = 0;
  await pipe(
    S.empty<number>(),
    S.tap((n) => value = n),
    S.runPromise({}),
    P.then(() => ended = true),
  );
  assertEquals(value, 0);
  assertEquals(ended, true);
});

Deno.test("Stream never", () => {
  let value: number = 0;
  const disposable = pipe(
    S.never(),
    S.run({}, S.sink(() => {}, () => value++)),
  );
  S.dispose(disposable);
  assertEquals(value, 0);
});

Deno.test("Stream run", async () => {
  let value = 0;
  pipe(
    S.wrap(1),
    S.run(
      {},
      S.sink((v) => {
        value = v;
      }, () => {}),
    ),
  );
  await P.wait(10);
  assertEquals(value, 1);
});

Deno.test("Stream runPromise", async () => {
  let value = 0;
  await pipe(
    S.at(1000),
    S.tap((v) => value = v),
    S.runPromise(),
  );
  assertEquals(value, 1000);
});

Deno.test("Stream forEach", async () => {
  const deferred = P.deferred<null>();
  const values: number[] = [];
  let done = false;
  pipe(
    S.range(3),
    S.forEach((n) => values.push(n), () => {
      deferred.resolve(null);
      done = true;
    }),
  );
  await deferred;
  assertEquals([done, values], [true, [0, 1, 2]]);
});

Deno.test("Stream collect", async () => {
  const values = await pipe(
    S.periodic(100),
    S.take(3),
    S.collect(S.DefaultEnv),
  );
  assertEquals(values, [100, 200, 300]);
});

Deno.test("Stream fromPromise", async () => {
  const result1 = await pipe(
    S.fromPromise(P.wrap(1)),
    S.collect({}),
  );
  assertEquals(result1, [1]);

  const result2 = await pipe(
    S.fromPromise(P.wait(1000)),
    S.collect({}),
  );
  assertEquals(result2, [1000]);
});

Deno.test("Stream fromIterable", async () => {
  const result1 = await pipe(
    S.fromIterable([1, 2, 3]),
    S.collect({}),
  );
  assertEquals(result1, [1, 2, 3]);

  const result2 = await pipe(
    S.fromIterable(new Set([1, 2, 3])),
    S.collect({}),
  );
  assertEquals(result2, [1, 2, 3]);

  pipe(
    S.fromIterable([1, 2, 3]),
    S.run({}),
    S.dispose,
  );
});

Deno.test("Stream at", async () => {
  const result1 = await pipe(
    S.at(1000),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result1, [1000]);
});

Deno.test("Stream periodic", async () => {
  const result1 = await pipe(
    S.periodic(100),
    S.take(3),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result1, [100, 200, 300]);

  const values: number[] = [];
  const disposable = pipe(
    S.periodic(300),
    S.tap((v) => values.push(v)),
    S.run(S.DefaultEnv),
  );
  await P.wait(1000).then(() => S.dispose(disposable));
  assertEquals(values, [300, 600, 900]);
});

Deno.test("Stream combine", async () => {
  const result1 = await pipe(
    S.wrap(1),
    S.combine(S.wrap(2)),
    S.collect({}),
  );
  assertEquals(result1, [1, 2]);

  const result2 = await pipe(
    S.periodic(10),
    S.take(3),
    S.combine(S.at(10)),
    S.take(3),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result2, [10, 20, 30]);
});

Deno.test("Stream filter", async () => {
  const result = await pipe(
    S.range(10),
    S.filter((n) => n % 2 === 0),
    S.collect({}),
  );
  assertEquals(result, [0, 2, 4, 6, 8]);
});

Deno.test("Stream filterMap", async () => {
  const result = await pipe(
    S.range(10),
    S.filterMap(O.fromPredicate((n) => n % 2 === 0)),
    S.collect({}),
  );
  assertEquals(result, [0, 2, 4, 6, 8]);
});

Deno.test("Stream partition", async () => {
  const [stream1, stream2] = pipe(
    S.range(10),
    S.partition((n) => n % 2 === 0),
  );
  const result1 = await pipe(stream1, S.collect({}));
  assertEquals(result1, [0, 2, 4, 6, 8]);
  const result2 = await pipe(stream2, S.collect({}));
  assertEquals(result2, [1, 3, 5, 7, 9]);
});

Deno.test("Stream partitionMap", async () => {
  const [stream1, stream2] = pipe(
    S.range(10),
    S.partitionMap(E.fromPredicate((n) => n % 2 === 0)),
  );
  const result1 = await pipe(stream1, S.collect({}));
  assertEquals(result1, [0, 2, 4, 6, 8]);
  const result2 = await pipe(stream2, S.collect({}));
  assertEquals(result2, [1, 3, 5, 7, 9]);
});

Deno.test("Stream loop", async () => {
  const result = await pipe(
    S.range(3),
    S.loop((sum, value) => {
      const next = sum + value;
      return [next, [next, value]];
    }, 0),
    S.collect({}),
  );
  assertEquals(result, [[0, 0], [1, 1], [3, 2]]);
});

Deno.test("Stream scan", async () => {
  const result = await pipe(
    S.range(5),
    S.scan((a, b) => a + b, 0),
    S.collect({}),
  );
  assertEquals(result, [0, 1, 3, 6, 10]);
});

/**
 * @todo Could use many more tests here
 */
Deno.test("Stream join", async () => {
  const result1 = await pipe(
    S.fromIterable([S.at(100), S.at(200)]),
    S.join(),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result1, [100, 200]);

  const result2 = await pipe(
    S.empty(),
    S.join(),
    S.collect({}),
  );
  assertEquals(result2, []);

  const dispose1 = pipe(
    S.empty(),
    S.join(),
    S.run({}),
  );
  S.dispose(dispose1);

  const dispose2 = pipe(
    S.stream<S.Stream<number>, S.Timeout>(
      (snk, { setTimeout, clearTimeout }) => {
        let open = true;
        snk.event(S.wrap(1));
        const handle = setTimeout(() => {
          open = false;
          snk.event(S.wrap(2));
          snk.end();
        }, 1000);
        return S.disposable(() => {
          if (open) {
            clearTimeout(handle);
            snk.end();
          }
        });
      },
    ),
    S.join(1),
    S.run(S.DefaultEnv),
  );
  S.dispose(dispose2);
});

Deno.test("Stream flatmap", async () => {
  const result = await pipe(
    S.periodic(10),
    S.take(3),
    S.flatmap((n) => pipe(S.at(15), S.map((m) => [n, m]), S.take(3))),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result, [[10, 15], [20, 15], [30, 15]]);
});

Deno.test("Stream switchmap", async () => {
  const result1 = await pipe(
    S.periodic(10),
    S.take(3),
    S.switchmap((n) => pipe(S.periodic(8), S.map((m) => [n, m]), S.take(3))),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result1, [[10, 8], [20, 8], [30, 8], [30, 16], [30, 24]]);

  const result2 = await pipe(
    S.periodic(10),
    S.take(3),
    S.switchmap((n) => pipe(S.periodic(8), S.map((m) => [n, m]), S.take(3)), 2),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result2, [
    [10, 8],
    [10, 16],
    [20, 8],
    [20, 16],
    [30, 8],
    [20, 24],
    [30, 16],
    [30, 24],
  ]);
});

Deno.test("Stream exhaustmap", async () => {
  const result1 = await pipe(
    S.periodic(10),
    S.take(3),
    S.exhaustmap((n) => pipe(S.periodic(8), S.map((m) => [n, m]), S.take(3))),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result1, [[10, 8], [10, 16], [10, 24]]);

  const result2 = await pipe(
    S.periodic(10),
    S.take(3),
    S.exhaustmap(
      (n) => pipe(S.periodic(8), S.map((m) => [n, m]), S.take(3)),
      2,
    ),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result2, [[10, 8], [10, 16], [20, 8], [10, 24], [20, 16], [
    20,
    24,
  ]]);
});

Deno.test("Stream apply", async () => {
  const result1 = await pipe(
    S.wrap((n: number) => n + 1),
    S.apply(S.wrap(1)),
    S.collect({}),
  );
  assertEquals(result1, [2]);

  const result2 = await pipe(
    S.at(100),
    S.map((n) => (m: number) => n + m),
    S.apply(S.wrap(1)),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result2, [101]);

  const disposable1 = pipe(
    S.at(100),
    S.map((n) => (m: number) => n + m),
    S.apply(S.wrap(1)),
    S.run(S.DefaultEnv),
  );
  S.dispose(disposable1);

  const disposable2 = pipe(
    S.wrap((n: number) => n + 1),
    S.apply(S.at(1)),
    S.run(S.DefaultEnv),
  );
  S.dispose(disposable2);
});

Deno.test("Stream indexed", async () => {
  const result = await pipe(
    S.range(3),
    S.indexed((n) => [n, n + n], 1),
    S.collect({}),
  );
  assertEquals(result, [[1, 0], [2, 1], [4, 2]]);
});

Deno.test("Stream withIndex", async () => {
  const result = await pipe(
    S.range(3),
    S.withIndex(10, 2),
    S.collect({}),
  );
  assertEquals(result, [[10, 0], [12, 1], [14, 2]]);
});

Deno.test("Stream withCount", async () => {
  const result = await pipe(
    S.range(3),
    S.withCount,
    S.collect({}),
  );
  assertEquals(result, [[1, 0], [2, 1], [3, 2]]);
});

Deno.test("Stream count", async () => {
  const result = await pipe(
    S.fromIterable(["One", "Two", "Three"]),
    S.count,
    S.collect({}),
  );
  assertEquals(result, [1, 2, 3]);
});

Deno.test("Stream takeUntil", async () => {
  const result = await pipe(
    S.range(100),
    S.takeUntil((n) => n >= 2),
    S.collect({}),
  );
  assertEquals(result, [0, 1, 2]);
});

Deno.test("Stream take", async () => {
  const result1 = await pipe(
    S.range(100),
    S.take(0),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result1, []);

  const result2 = await pipe(
    S.range(100),
    S.take(3),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result2, [0, 1, 2]);
});

Deno.test("Stream repeat", async () => {
  const result1 = await pipe(
    S.periodic(10),
    S.take(3),
    S.repeat(0),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result1, [10, 20, 30]);

  const result2 = await pipe(
    S.periodic(10),
    S.take(3),
    S.repeat(1),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result2, [10, 20, 30, 10, 20, 30]);

  let disposed = false;
  const dsp = pipe(
    S.stream(() => S.disposable(() => disposed = true)),
    S.repeat(2),
    S.run(),
  );

  await pipe(
    P.wait(1),
    P.then(() => {
      S.dispose(dsp);
      assertEquals(disposed, true);
    }),
  );
});

Deno.test("Stream multicast", async () => {
  const stream = pipe(
    S.range(10),
    S.multicast(S.DefaultEnv),
  );

  const values = new Array<number>();
  pipe(
    stream,
    S.forEach((value) => values.push(value)),
  );

  const result = await pipe(
    stream,
    S.collect({}),
  );

  assertEquals(values, result);

  const stream2 = pipe(S.periodic(10), S.multicast(S.DefaultEnv));
  const dsp1 = pipe(stream2, S.run({}));
  const dsp2 = pipe(stream2, S.run({}));
  S.dispose(dsp1);
  S.dispose(dsp2);

  const stream3 = pipe(S.periodic(10), S.multicast(S.DefaultEnv));
  const snk = S.sink(() => {}, () => {});
  const dsp3 = pipe(stream3, S.run({}, snk));
  const dsp4 = pipe(stream3, S.run({}, snk));
  S.dispose(dsp3);
  S.dispose(dsp4);
});

Deno.test("Stream hold", async () => {
  const strm = pipe(
    S.at(100),
    S.map(() => ({ one: 1 })),
    S.hold,
  );

  let first: { one: number };
  pipe(
    strm,
    S.take(1),
    S.forEach((value) => first = value),
  );

  let second: { one: number };
  pipe(
    strm,
    S.take(1),
    S.forEach((value) => second = value),
  );

  await pipe(
    P.wait(200),
    P.then(() => assertStrictEquals(first, second)),
  );

  let count = 0;
  const snk = S.sink(() => count++, () => {});
  const dsp1 = pipe(strm, S.run(S.DefaultEnv, snk));
  const dsp2 = pipe(strm, S.run(S.DefaultEnv, snk));
  assertEquals(count, 1);
  S.dispose(dsp1);
  S.dispose(dsp2);

  const strm2 = await pipe(
    S.wrap(1),
    S.hold,
    S.collect(S.DefaultEnv),
  );
  assertEquals(strm2, [1]);
});

Deno.test("Stream withLatest", async () => {
  const result = await pipe(
    S.periodic(100),
    S.take(2),
    S.withLatest(S.periodic(60)),
    S.collect(S.DefaultEnv),
  );
  assertEquals(result, [[100, 60], [200, 180]]);

  const dsp = pipe(
    S.periodic(100),
    S.withLatest(S.periodic(60)),
    S.run(S.DefaultEnv),
  );
  S.dispose(dsp);
});

Deno.test("Stream distinct", async () => {
  const result = await pipe(
    S.fromIterable([1, 2, 3, 3, 3, 4]),
    S.distinct(),
    S.collect(S.DefaultEnv),
  );

  assertEquals(result, [1, 2, 3, 4]);
});

Deno.test("Stream createAdapter", async () => {
  const [dispatch, strm] = S.createAdapter<number>();

  const values = new Array<number>();
  pipe(
    strm,
    S.forEach((value) => values.push(value)),
  );

  dispatch(1);
  dispatch(2);
  dispatch(3);

  assertEquals(values, [1, 2, 3]);

  const [_, strm2] = S.createAdapter<unknown>();
  const dsp = pipe(strm2, S.run());

  await pipe(
    P.wait(1),
    P.then(() => {
      S.dispose(dsp);
    }),
  );
});
