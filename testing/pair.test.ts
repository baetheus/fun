import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../pair.ts";
import { MonoidNumberSum, ShowNumber } from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("Pair pair", () => {
  assertEquals(P.pair(1, 2), [1, 2]);
});

Deno.test("Pair dup", () => {
  assertEquals(P.dup(1), [1, 1]);
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

Deno.test("Pair mapLeft", () => {
  assertEquals(pipe(P.pair(1, 2), P.mapLeft((n) => n + 1)), [1, 3]);
});

Deno.test("Pair bimap", () => {
  assertEquals(pipe(P.pair(1, 2), P.bimap((n) => n + 1, (n) => n + 1)), [2, 3]);
});

Deno.test("Pair extract", () => {
  assertEquals(P.extract(P.pair(1, 2)), 1);
});

Deno.test("Pair extend", () => {
  assertEquals(
    pipe(
      P.pair(1, 2),
      P.extend(([first, second]) => first + second),
    ),
    [3, 2],
  );
});

Deno.test("Pair reduce", () => {
  assertEquals(
    pipe(P.pair(10, 20), P.reduce(Math.max, Number.NEGATIVE_INFINITY)),
    20,
  );
});

Deno.test("Pair traverse", () => {
  const M = P.getRightMonad(MonoidNumberSum);
  const traversePair = P.traverse(M);
  assertEquals(
    pipe(
      P.pair("Brandon", "Blaylock"),
      traversePair((name) => P.pair(name, 37)),
    ),
    [["Brandon", "Blaylock"], 37],
  );
});

Deno.test("Pair FunctorPair", () => {
  assertStrictEquals(P.FunctorPair.map, P.map);
});

Deno.test("Pair BifunctorPair", () => {
  assertStrictEquals(P.BifunctorPair.bimap, P.bimap);
  assertStrictEquals(P.BifunctorPair.mapLeft, P.mapLeft);
});

Deno.test("Pair ComonadPair", () => {
  assertStrictEquals(P.ComonadPair.extract, P.extract);
  assertStrictEquals(P.ComonadPair.extend, P.extend);
  assertStrictEquals(P.ComonadPair.map, P.map);
});

Deno.test("Pair ExtendPair", () => {
  assertStrictEquals(P.ExtendPair.extend, P.extend);
  assertStrictEquals(P.ExtendPair.map, P.map);
});

Deno.test("Pair FoldablePair", () => {
  assertStrictEquals(P.FoldablePair.reduce, P.reduce);
});

Deno.test("Pair TraversablePair", () => {
  assertStrictEquals(P.TraversablePair.reduce, P.reduce);
  assertStrictEquals(P.TraversablePair.traverse, P.traverse);
  assertStrictEquals(P.TraversablePair.map, P.map);
});

Deno.test("Pair getRightMonad", () => {
  // TODO Work on generic Monad tests
  const { of, ap, map, join, chain } = P.getRightMonad(MonoidNumberSum);

  assertEquals(of(1), [1, MonoidNumberSum.empty()]);
  assertEquals(
    pipe(P.pair((s: string) => s.toUpperCase(), 5), ap(P.pair("brandon", 10))),
    [
      "BRANDON",
      15,
    ],
  );
  assertEquals(pipe(P.pair("brandon", 10), map((s) => s.toUpperCase())), [
    "BRANDON",
    10,
  ]);
  assertEquals(pipe(P.pair(P.pair("brandon", 10), 5), join), ["brandon", 15]);
  assertEquals(
    pipe(
      P.pair("brandon", 10),
      chain((name) => P.pair(name.toUpperCase(), -5)),
    ),
    ["BRANDON", 5],
  );
});

Deno.test("Pair getShow", () => {
  const { show } = P.getShow(ShowNumber, ShowNumber);
  assertEquals(show(P.pair(1, 2)), "Pair(1, 2)");
});
