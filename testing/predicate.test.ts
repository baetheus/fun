import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as P from "../predicate.ts";
import * as R from "../refinement.ts";
import { pipe } from "../fn.ts";

Deno.test("Predicate contramap", () => {
  const isGreaterThan3 = (n: number) => n > 3;
  const isLongerThan3 = pipe(
    isGreaterThan3,
    P.contramap((s: string) => s.length),
  );

  assertEquals(isLongerThan3("Hello"), true);
  assertEquals(isLongerThan3("Hi"), false);
});

Deno.test("Predicate not", () => {
  const isGreaterThan3 = (n: number) => n > 3;
  const isLongerThan3 = pipe(
    isGreaterThan3,
    P.contramap((s: string) => s.length),
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

Deno.test("Predicate ContravariantPredicate", () => {
  assertStrictEquals(P.ContravariantPredicate.contramap, P.contramap);
});

Deno.test("Predicate getSemigroupAny", () => {
  assertStrictEquals(P.getSemigroupAny().concat, P.or);
});

Deno.test("Predicate getSemigroupAll", () => {
  assertStrictEquals(P.getSemigroupAll().concat, P.and);
});

Deno.test("Predicate getMonoidAny", () => {
  assertStrictEquals(P.getMonoidAny().concat, P.or);
  assertEquals(P.getMonoidAny<number>().empty()(0), false);
});

Deno.test("Predicate getMonoidAll", () => {
  assertStrictEquals(P.getMonoidAll().concat, P.and);
  assertEquals(P.getMonoidAll<number>().empty()(0), true);
});
