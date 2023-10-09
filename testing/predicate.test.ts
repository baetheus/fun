import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../predicate.ts";
import * as R from "../refinement.ts";
import { pipe } from "../fn.ts";

Deno.test("Predicate premap", () => {
  const isGreaterThan3 = (n: number) => n > 3;
  const isLongerThan3 = pipe(
    isGreaterThan3,
    P.premap((s: string) => s.length),
  );

  assertEquals(isLongerThan3("Hello"), true);
  assertEquals(isLongerThan3("Hi"), false);
});

Deno.test("Predicate not", () => {
  const isGreaterThan3 = (n: number) => n > 3;
  const isLongerThan3 = pipe(
    isGreaterThan3,
    P.premap((s: string) => s.length),
  );
  const isNotLongerThan3 = P.not(isLongerThan3);

  assertEquals(isNotLongerThan3("Hello"), false);
  assertEquals(isNotLongerThan3("Hi"), true);
});

Deno.test("Predicate or", () => {
  const stringOrNumber = pipe(
    R.string,
    P.or(R.number),
  );

  assertEquals(stringOrNumber("Hello"), true);
  assertEquals(stringOrNumber(1), true);
  assertEquals(stringOrNumber({}), false);
});

Deno.test("Predicate and", () => {
  const isPositive = (n: number) => n > 0;
  const isInteger = (n: number) => Number.isInteger(n);

  const isPositiveInteger = pipe(
    isPositive,
    P.and(isInteger),
  );

  assertEquals(isPositiveInteger(0), false);
  assertEquals(isPositiveInteger(1), true);
  assertEquals(isPositiveInteger(2.2), false);
  assertEquals(isPositiveInteger(-2.2), false);
});

Deno.test("Predicate getCombinableAny", () => {
  assertStrictEquals(P.getCombinableAny().combine, P.or);
});

Deno.test("Predicate getCombinableAll", () => {
  assertStrictEquals(P.getCombinableAll().combine, P.and);
});

Deno.test("Predicate getInitializableAny", () => {
  assertStrictEquals(P.getInitializableAny().combine, P.or);
  assertEquals(P.getInitializableAny<number>().init()(0), false);
});

Deno.test("Predicate getInitializableAll", () => {
  assertStrictEquals(P.getInitializableAll().combine, P.and);
  assertEquals(P.getInitializableAll<number>().init()(0), true);
});
