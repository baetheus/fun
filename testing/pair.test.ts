import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../pair.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("Pair pair", () => {
  assertEquals(P.pair(1, 2), [1, 2]);
});

Deno.test("Pair dup", () => {
  assertEquals(P.dup(1), [1, 1]);
});

Deno.test("Pair merge", () => {
  assertEquals(
    pipe(
      P.pair((n: number) => n + 1, 1),
      P.merge,
    ),
    2,
  );
});

Deno.test("Pair mergeSecond", () => {
  assertEquals(
    pipe(
      P.pair(1, (n: number) => n + 1),
      P.mergeSecond,
    ),
    2,
  );
});

Deno.test("Pair getFirst", () => {
  assertEquals(P.getFirst(P.pair(1, 2)), 1);
});

Deno.test("Pair getSecond", () => {
  assertEquals(P.getSecond(P.pair(1, 2)), 2);
});

Deno.test("Pair first", () => {
  assertEquals(pipe(1, P.first(2)), [2, 1]);
});

Deno.test("Pair second", () => {
  assertEquals(pipe(1, P.second(2)), [1, 2]);
});

Deno.test("Pair swap", () => {
  assertEquals(P.swap(P.pair(1, 2)), [2, 1]);
});

Deno.test("Pair map", () => {
  assertEquals(pipe(P.pair(1, 2), P.map((n) => n + 1)), [2, 2]);
});

Deno.test("Pair mapSecond", () => {
  assertEquals(pipe(P.pair(1, 2), P.mapSecond((n) => n + 1)), [1, 3]);
});

Deno.test("Pair bimap", () => {
  assertEquals(pipe(P.pair(1, 2), P.bimap((n) => n + 1, (n) => n + 1)), [2, 3]);
});

Deno.test("Pair unwrap", () => {
  assertEquals(P.unwrap(P.pair(1, 2)), 1);
});

Deno.test("Pair fold", () => {
  assertEquals(
    pipe(P.pair(10, 20), P.fold(Math.max, Number.NEGATIVE_INFINITY)),
    20,
  );
});

Deno.test("Pair traverse", () => {
  const M = P.getRightFlatmappable(N.InitializableNumberSum);
  const traversePair = P.traverse(M);
  assertEquals(
    pipe(
      P.pair("Brandon", "Blaylock"),
      traversePair((name) => P.pair(name, 37)),
    ),
    [["Brandon", "Blaylock"], 37],
  );
});

Deno.test("Pair MappablePair", () => {
  assertStrictEquals(P.MappablePair.map, P.map);
});

Deno.test("Pair BimappablePair", () => {
  assertStrictEquals(P.BimappablePair.map, P.map);
  assertStrictEquals(P.BimappablePair.mapSecond, P.mapSecond);
});

Deno.test("Pair FoldablePair", () => {
  assertStrictEquals(P.FoldablePair.fold, P.fold);
});

Deno.test("Pair TraversablePair", () => {
  assertStrictEquals(P.TraversablePair.fold, P.fold);
  assertStrictEquals(P.TraversablePair.traverse, P.traverse);
  assertStrictEquals(P.TraversablePair.map, P.map);
});

Deno.test("Pair getRightFlatmappable", () => {
  // TODO Work on generic Flatmappable tests
  const { apply, flatmap, map, wrap } = P.getRightFlatmappable(
    N.InitializableNumberSum,
  );

  assertEquals(wrap(1), [1, N.InitializableNumberSum.init()]);
  assertEquals(
    pipe(
      P.pair((s: string) => s.toUpperCase(), 5),
      apply(P.pair("brandon", 10)),
    ),
    [
      "BRANDON",
      15,
    ],
  );
  assertEquals(pipe(P.pair("brandon", 10), map((s) => s.toUpperCase())), [
    "BRANDON",
    10,
  ]);
  assertEquals(
    pipe(
      P.pair("brandon", 10),
      flatmap((name) => P.pair(name.toUpperCase(), -5)),
    ),
    ["BRANDON", 5],
  );
});

Deno.test("Pair getShowablePair", () => {
  const { show } = P.getShowablePair(N.ShowableNumber, N.ShowableNumber);
  assertEquals(show(P.pair(1, 2)), "Pair(1, 2)");
});

Deno.test("Pair getCombinablePair", () => {
  const { combine } = P.getCombinablePair(
    N.CombinableNumberMax,
    N.CombinableNumberMin,
  );
  assertEquals(combine(P.pair(1, 1))(P.pair(2, 2)), P.pair(2, 1));
  assertEquals(combine(P.pair(2, 2))(P.pair(1, 1)), P.pair(2, 1));
});

Deno.test("Pair getInitializablePair", () => {
  const { init, combine } = P.getInitializablePair(
    N.InitializableNumberMax,
    N.InitializableNumberMin,
  );
  assertEquals(
    init(),
    P.pair(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY),
  );
  assertEquals(combine(P.pair(1, 1))(P.pair(2, 2)), P.pair(2, 1));
  assertEquals(combine(P.pair(2, 2))(P.pair(1, 1)), P.pair(2, 1));
});

Deno.test("Pair getComparablePair", () => {
  const { compare } = P.getComparablePair(
    N.ComparableNumber,
    N.ComparableNumber,
  );
  assertEquals(compare(P.pair(1, 1))(P.pair(1, 1)), true);
  assertEquals(compare(P.pair(1, 1))(P.pair(2, 2)), false);
  assertEquals(compare(P.pair(2, 2))(P.pair(1, 1)), false);
  assertEquals(compare(P.pair(1, 1))(P.pair(1, 2)), false);
  assertEquals(compare(P.pair(1, 2))(P.pair(1, 1)), false);
  assertEquals(compare(P.pair(2, 1))(P.pair(1, 1)), false);
  assertEquals(compare(P.pair(1, 1))(P.pair(2, 1)), false);
});

Deno.test("Pair getSortablePair", () => {
  const { sort } = P.getSortablePair(N.SortableNumber, N.SortableNumber);
  assertEquals(sort(P.pair(0, 0), P.pair(0, 0)), 0);
  assertEquals(sort(P.pair(0, 0), P.pair(0, 1)), -1);
  assertEquals(sort(P.pair(0, 1), P.pair(0, 0)), 1);
  assertEquals(sort(P.pair(0, 0), P.pair(1, 0)), -1);
  assertEquals(sort(P.pair(1, 0), P.pair(0, 0)), 1);
});
