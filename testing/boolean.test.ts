import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as B from "../boolean.ts";

Deno.test("Boolean constTrue", () => {
  assertEquals(B.constTrue(), true);
});

Deno.test("Boolean constFalse", () => {
  assertEquals(B.constFalse(), false);
});

Deno.test("Boolean isBoolean", () => {
  assertEquals(B.isBoolean(1), false);
  assertEquals(B.isBoolean(true), true);
  assertEquals(B.isBoolean(false), true);
});

Deno.test("Boolean match", () => {
  const match = B.match(() => 1, () => 2);
  assertEquals(match(true), 1);
  assertEquals(match(false), 2);
});

Deno.test("Boolean not", () => {
  assertEquals(B.not(true), false);
  assertEquals(B.not(false), true);
});

Deno.test("Boolean compare", () => {
  assertEquals(B.compare(true)(true), true);
  assertEquals(B.compare(true)(false), false);
  assertEquals(B.compare(false)(true), false);
  assertEquals(B.compare(false)(false), true);
});

Deno.test("Boolean sort", () => {
  assertEquals(B.sort(true, true), 0);
  assertEquals(B.sort(true, false), 1);
  assertEquals(B.sort(false, true), -1);
  assertEquals(B.sort(false, false), 0);
});

Deno.test("Boolean or", () => {
  assertEquals(B.or(true)(true), true);
  assertEquals(B.or(true)(false), true);
  assertEquals(B.or(false)(true), true);
  assertEquals(B.or(false)(false), false);
});

Deno.test("Boolean and", () => {
  assertEquals(B.and(true)(true), true);
  assertEquals(B.and(true)(false), false);
  assertEquals(B.and(false)(true), false);
  assertEquals(B.and(false)(false), false);
});
