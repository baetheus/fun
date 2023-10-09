import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as I from "../iterable.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import * as P from "../pair.ts";
import * as B from "../bimappable.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

const bimap = B.bimap(P.BimappablePair);

Deno.test("Iterable iterable", () => {
  const iterable = I.iterable(function* () {
    yield 1;
  });
  assertEquals(I.collect(iterable), [1]);
});

Deno.test("Iterable clone", () => {
  const iterable = I.range(5, 1);
  const cloned = I.clone(iterable);
  assertEquals(I.collect(cloned), [1, 2, 3, 4, 5]);
  assertEquals(I.collect(cloned), [1, 2, 3, 4, 5]);
});

Deno.test("Iterable range", () => {
  assertEquals(pipe(I.range(3), I.collect), [0, 1, 2]);
  assertEquals(pipe(I.range(), I.take(3), I.collect), [0, 1, 2]);
  assertEquals(pipe(I.range(3, 1), I.collect), [1, 2, 3]);
  assertEquals(pipe(I.range(3, 1, 2), I.collect), [1, 3, 5]);
});

Deno.test("Iterable wrap", () => {
  assertEquals(pipe(I.wrap(1), I.collect), [1]);
});

Deno.test("Iterable apply", () => {
  assertEquals(
    pipe(
      I.wrap((n: number) => n + 1),
      I.apply(I.range(3)),
      I.collect,
    ),
    [1, 2, 3],
  );
});

Deno.test("Iterable map", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.map((n) => n + 1),
      I.collect,
    ),
    [1, 2, 3],
  );
});

Deno.test("Iterable flatmap", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.flatmap((n) => I.range(3, n)),
      I.collect,
    ),
    [0, 1, 2, 1, 2, 3, 2, 3, 4],
  );
});

Deno.test("Iterable forEach", () => {
  const results: number[] = [];
  pipe(I.range(3), I.forEach((n) => results.push(n)));
  assertEquals(results, [0, 1, 2]);
});

Deno.test("Iterable fold", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.fold((n, m) => n + m, 0),
    ),
    3,
  );
});

Deno.test("Iterable scan", () => {
  assertEquals(
    pipe(
      I.range(5),
      I.scan((sum, value) => sum + value, 0),
      I.collect,
    ),
    [0, 1, 3, 6, 10],
  );
});

Deno.test("Iterable filter", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.filter((n) => n % 2 === 0),
      I.collect,
    ),
    [0, 2],
  );
});

Deno.test("Iterable filterMap", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.filterMap(O.fromPredicate((n) => n % 2 === 0)),
      I.collect,
    ),
    [0, 2],
  );
});

Deno.test("Iterable partition", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.partition((n) => n % 2 === 0),
      bimap(I.collect, I.collect),
    ),
    P.pair([0, 2], [1]),
  );
});

Deno.test("Iterable partition", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.partition((n) => n % 2 === 0),
      bimap(I.collect, I.collect),
    ),
    P.pair([0, 2], [1]),
  );
});

Deno.test("Iterable partitionMap", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.partitionMap(E.fromPredicate((n) => n % 2 === 0)),
      bimap(I.collect, I.collect),
    ),
    P.pair([0, 2], [1]),
  );
});

Deno.test("Iterable collect", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("Iterable take", () => {
  assertEquals(
    pipe(
      I.range(Number.POSITIVE_INFINITY),
      I.take(3),
      I.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("Iterable takeUntil", () => {
  assertEquals(
    pipe(
      I.range(Number.POSITIVE_INFINITY),
      I.takeUntil((n) => n > 2),
      I.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("Iterable takeWhile", () => {
  assertEquals(
    pipe(
      I.range(Number.POSITIVE_INFINITY),
      I.takeWhile((n) => n < 3),
      I.collect,
    ),
    [0, 1, 2],
  );
});

Deno.test("Iterable tap", () => {
  const result: number[] = [];
  pipe(
    I.range(3),
    I.tap((n) => result.push(n)),
    I.collect,
  );
  assertEquals(result, [0, 1, 2]);
});

Deno.test("Iterable repeat", () => {
  assertEquals(
    pipe(
      I.range(3),
      I.repeat(3),
      I.collect,
    ),
    [0, 1, 2, 0, 1, 2, 0, 1, 2],
  );
});

Deno.test("Iterable init", () => {
  assertEquals(
    pipe(
      I.init(),
      I.collect,
    ),
    [],
  );
});

Deno.test("Iterable combine", () => {
  assertEquals(pipe(I.range(2), I.combine(I.range(2, 2)), I.collect), [
    0,
    1,
    2,
    3,
  ]);
});

Deno.test("Iterable getCombinable", () => {
  const { combine } = I.getCombinable<number>();
  assertStrictEquals(combine, I.combine);
});

Deno.test("Iterable getInitializable", () => {
  const { init, combine } = I.getInitializable<number>();
  assertStrictEquals(combine, I.combine);
  assertStrictEquals(init, I.init);
});

Deno.test("Iterable getShowable", () => {
  const { show } = I.getShowable(N.ShowableNumber);
  assertEquals(pipe(I.range(2), show), "Iterable[0, 1]");
});
