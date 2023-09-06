import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../pair.ts";
import { InitializableNumberSum, ShowableNumber } from "../number.ts";
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

Deno.test("Pair reduce", () => {
  assertEquals(
    pipe(P.pair(10, 20), P.reduce(Math.max, Number.NEGATIVE_INFINITY)),
    20,
  );
});

Deno.test("Pair traverse", () => {
  const M = P.getRightFlatmappable(InitializableNumberSum);
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

Deno.test("Pair ReduciblePair", () => {
  assertStrictEquals(P.ReduciblePair.reduce, P.reduce);
});

Deno.test("Pair TraversablePair", () => {
  assertStrictEquals(P.TraversablePair.reduce, P.reduce);
  assertStrictEquals(P.TraversablePair.traverse, P.traverse);
  assertStrictEquals(P.TraversablePair.map, P.map);
});

Deno.test("Pair getRightFlatmappable", () => {
  // TODO Work on generic Flatmappable tests
  const { apply, flatmap, map, wrap } = P.getRightFlatmappable(
    InitializableNumberSum,
  );

  assertEquals(wrap(1), [1, InitializableNumberSum.init()]);
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

Deno.test("Pair getShowable", () => {
  const { show } = P.getShowable(ShowableNumber, ShowableNumber);
  assertEquals(show(P.pair(1, 2)), "Pair(1, 2)");
});
