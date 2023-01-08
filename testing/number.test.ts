import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as N from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("Number equals", () => {
  assertEquals(pipe(1, N.equals(1)), true);
  assertEquals(pipe(1, N.equals(2)), false);
});

Deno.test("Number lte", () => {
  assertEquals(pipe(1, N.lte(1)), true);
  assertEquals(pipe(1, N.lte(2)), true);
  assertEquals(pipe(2, N.lte(1)), false);
});

Deno.test("Number multiply", () => {
  assertEquals(pipe(1, N.multiply(1)), 1);
  assertEquals(pipe(1, N.multiply(2)), 2);
  assertEquals(pipe(2, N.multiply(1)), 2);
  assertEquals(pipe(2, N.multiply(2)), 4);
});

Deno.test("Number add", () => {
  assertEquals(pipe(1, N.add(1)), 2);
  assertEquals(pipe(1, N.add(2)), 3);
  assertEquals(pipe(2, N.add(1)), 3);
  assertEquals(pipe(2, N.add(2)), 4);
});

Deno.test("Number mod", () => {
  assertEquals(pipe(1, N.mod(1)), 0);
  assertEquals(pipe(1, N.mod(2)), 1);
  assertEquals(pipe(2, N.mod(1)), 0);
  assertEquals(pipe(2, N.mod(2)), 0);
});

Deno.test("Number divides", () => {
  assertEquals(pipe(1, N.divides(2)), true);
  assertEquals(pipe(2, N.divides(3)), false);
  assertEquals(pipe(1, N.divides(1)), true);
  assertEquals(pipe(10, N.divides(100)), true);
  assertEquals(pipe(0, N.divides(10)), false);
});

Deno.test("Number compare", () => {
  assertEquals(N.compare(1, 1), 0);
  assertEquals(N.compare(2, 1), 1);
  assertEquals(N.compare(1, 2), -1);
});

Deno.test("Number emptyZero", () => {
  assertEquals(N.emptyZero(), 0);
});

Deno.test("Number emptyOne", () => {
  assertEquals(N.emptyOne(), 1);
});

Deno.test("Number emptyPosInf", () => {
  assertEquals(N.emptyPosInf(), Number.POSITIVE_INFINITY);
});

Deno.test("Number emptyNegInf", () => {
  assertEquals(N.emptyNegInf(), Number.NEGATIVE_INFINITY);
});
