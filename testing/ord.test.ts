import {
  assertEquals,
  assertExists,
} from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as O from "../ord.ts";

Deno.test("Ord ordString", () => {
  AS.assertOrd(O.ordString, { a: "a", b: "b" });
});

Deno.test("Ord ordNumber", () => {
  AS.assertOrd(O.ordNumber, { a: 0, b: 1 });
});

Deno.test("Ord ordBoolean", () => {
  AS.assertOrd(O.ordBoolean, { a: true, b: false });
});

Deno.test("Ord compare", () => {
  const compare = O.compare(O.ordNumber);
  assertEquals(compare(0, 0), 0);
  assertEquals(compare(0, 1), -1);
  assertEquals(compare(1, 0), 1);
});

Deno.test("Ord lt", () => {
  const lt = O.lt(O.ordNumber);
  assertEquals(lt(0)(0), false);
  assertEquals(lt(0)(1), true);
  assertEquals(lt(1)(0), false);
});

Deno.test("Ord gt", () => {
  const gt = O.gt(O.ordNumber);
  assertEquals(gt(0)(0), false);
  assertEquals(gt(0)(1), false);
  assertEquals(gt(1)(0), true);
});

Deno.test("Ord lte", () => {
  const lte = O.lte(O.ordNumber);
  assertEquals(lte(0)(0), true);
  assertEquals(lte(0)(1), true);
  assertEquals(lte(1)(0), false);
});

Deno.test("Ord gte", () => {
  const gte = O.gte(O.ordNumber);
  assertEquals(gte(0)(0), true);
  assertEquals(gte(0)(1), false);
  assertEquals(gte(1)(0), true);
});

Deno.test("Ord eq", () => {
  const eq = O.eq(O.ordNumber);
  assertEquals(eq(0)(0), true);
  assertEquals(eq(0)(1), false);
  assertEquals(eq(1)(0), false);
});

Deno.test("Ord min", () => {
  const min = O.min(O.ordNumber);
  assertEquals(min(0)(0), 0);
  assertEquals(min(0)(1), 0);
  assertEquals(min(1)(0), 0);
});

Deno.test("Ord max", () => {
  const max = O.max(O.ordNumber);
  assertEquals(max(0)(0), 0);
  assertEquals(max(0)(1), 1);
  assertEquals(max(1)(0), 1);
});

Deno.test("Ord clamp", () => {
  const clamp = O.clamp(O.ordNumber);
  assertEquals(clamp(0, 2)(-1), 0);
  assertEquals(clamp(0, 2)(0), 0);
  assertEquals(clamp(0, 2)(1), 1);
  assertEquals(clamp(0, 2)(2), 2);
  assertEquals(clamp(0, 2)(3), 2);
});

Deno.test("Ord between", () => {
  const between = O.between(O.ordNumber);
  assertEquals(between(0, 2)(-1), false);
  assertEquals(between(0, 2)(0), false);
  assertEquals(between(0, 2)(1), true);
  assertEquals(between(0, 2)(2), false);
  assertEquals(between(0, 2)(3), false);
});

Deno.test("Ord getOrdUtilities", () => {
  assertExists(O.getOrdUtilities(O.ordNumber));
});
