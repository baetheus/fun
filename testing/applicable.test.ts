import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as A from "../applicable.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as C from "../combinable.ts";

Deno.test("Applicable getApplicableCombinable", () => {
  const getCombinableNumber = A.getApplicableCombinable(O.ApplicableOption);
  const CombinableOptionNumber = getCombinableNumber(N.InitializableNumberSum);
  const combineAll = C.getCombineAll(CombinableOptionNumber);

  assertEquals(combineAll(O.none), O.none);
  assertEquals(combineAll(O.some(1)), O.some(1));
  assertEquals(combineAll(O.none, O.none), O.none);
  assertEquals(combineAll(O.none, O.some(1)), O.none);
  assertEquals(combineAll(O.some(1), O.none), O.none);
  assertEquals(combineAll(O.some(1), O.some(1)), O.some(2));
});

Deno.test("Applicable apply", () => {
  const apply = A.apply(O.ApplicableOption, O.ApplicableOption);
  const o1: O.Option<O.Option<number>> = O.none;
  const o2: O.Option<O.Option<number>> = O.some(O.none);
  const o3: O.Option<O.Option<number>> = O.some(O.some(1));
  const f1: O.Option<O.Option<(n: number) => [number, number]>> = O.none;
  const f2: O.Option<O.Option<(n: number) => [number, number]>> = O.some(
    O.none,
  );
  const f3: O.Option<O.Option<(n: number) => [number, number]>> = O.some(
    O.some((n) => [n, n + 1]),
  );

  assertEquals(apply(o1)(f1), O.none);
  assertEquals(apply(o1)(f2), O.none);
  assertEquals(apply(o1)(f3), O.none);
  assertEquals(apply(o2)(f1), O.none);
  assertEquals(apply(o2)(f2), O.some(O.none));
  assertEquals(apply(o2)(f3), O.some(O.none));
  assertEquals(apply(o3)(f1), O.none);
  assertEquals(apply(o3)(f2), O.some(O.none));
  assertEquals(apply(o3)(f3), O.some(O.some([1, 2])));
});

Deno.test("Applicable applyFirst", () => {
  const applyFirst = A.applyFirst(O.ApplicableOption);
  assertEquals(applyFirst(O.none)(O.none), O.none);
  assertEquals(applyFirst(O.none)(O.some(1)), O.none);
  assertEquals(applyFirst(O.some(2))(O.none), O.none);
  assertEquals(applyFirst(O.some(2))(O.some(1)), O.some(1));
});

Deno.test("Applicable applySecond", () => {
  const applySecond = A.applySecond(O.ApplicableOption);
  assertEquals(applySecond(O.none)(O.none), O.none);
  assertEquals(applySecond(O.none)(O.some(1)), O.none);
  assertEquals(applySecond(O.some(2))(O.none), O.none);
  assertEquals(applySecond(O.some(2))(O.some(1)), O.some(2));
});
