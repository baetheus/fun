import {
  assertEquals,
  assertExists,
} from "https://deno.land/std/testing/asserts.ts";

import type { Compare } from "../ord.ts";

import * as O from "../ord.ts";
import * as N from "../number.ts";

Deno.test("Ord toCompare", () => {
  const compare = O.toCompare(N.OrdNumber);
  assertEquals(typeof compare, "function");
  assertEquals(compare(0, 0), 0);
  assertEquals(compare(0, 1), -1);
  assertEquals(compare(1, 0), 1);
});

Deno.test("Ord lt", () => {
  const lt = O.lt(N.OrdNumber);
  assertEquals(lt(0)(0), false);
  assertEquals(lt(0)(1), false);
  assertEquals(lt(1)(0), true);
});

Deno.test("Ord gt", () => {
  const gt = O.gt(N.OrdNumber);
  assertEquals(gt(0)(0), false);
  assertEquals(gt(0)(1), true);
  assertEquals(gt(1)(0), false);
});

Deno.test("Ord lte", () => {
  const lte = O.lte(N.OrdNumber);
  assertEquals(lte(0)(0), true);
  assertEquals(lte(0)(1), false);
  assertEquals(lte(1)(0), true);
});

Deno.test("Ord gte", () => {
  const gte = O.gte(N.OrdNumber);
  assertEquals(gte(0)(0), true);
  assertEquals(gte(1)(0), false);
  assertEquals(gte(0)(1), true);
});

Deno.test("Ord eq", () => {
  const eq = O.eq(N.OrdNumber);
  assertEquals(eq(0)(0), true);
  assertEquals(eq(0)(1), false);
  assertEquals(eq(1)(0), false);
});

Deno.test("Ord min", () => {
  const min = O.min(N.OrdNumber);
  assertEquals(min(0)(0), 0);
  assertEquals(min(0)(1), 0);
  assertEquals(min(1)(0), 0);
});

Deno.test("Ord max", () => {
  const max = O.max(N.OrdNumber);
  assertEquals(max(0)(0), 0);
  assertEquals(max(0)(1), 1);
  assertEquals(max(1)(0), 1);
});

Deno.test("Ord clamp", () => {
  const clamp = O.clamp(N.OrdNumber);
  assertEquals(clamp(0, 2)(-1), 0);
  assertEquals(clamp(0, 2)(0), 0);
  assertEquals(clamp(0, 2)(1), 1);
  assertEquals(clamp(0, 2)(2), 2);
  assertEquals(clamp(0, 2)(3), 2);
});

Deno.test("Ord between", () => {
  const between = O.between(N.OrdNumber);
  assertEquals(between(0, 2)(-1), false);
  assertEquals(between(0, 2)(0), false);
  assertEquals(between(0, 2)(1), true);
  assertEquals(between(0, 10)(5), true);
  assertEquals(between(0, 2)(2), false);
  assertEquals(between(0, 2)(3), false);
});

Deno.test("Ord getOrdUtilities", () => {
  assertExists(O.getOrdUtilities(N.OrdNumber));
});

Deno.test("Ord fromCompare", () => {
  type Foo = { foo: number };
  const compareFoo: Compare<Foo> = (left, right) =>
    left.foo < right.foo ? -1 : left.foo > right.foo ? 1 : 0;

  const a = { foo: 0 };
  const b = { foo: 0 };
  const c = { foo: 2 };

  const { equals, lte } = O.fromCompare(compareFoo);

  assertEquals(equals(a)(a), true);
  assertEquals(equals(a)(b), true);
  assertEquals(equals(a)(c), false);
  assertEquals(lte(c)(b), true);
  assertEquals(lte(b)(c), false);
});

Deno.test("Ord createOrdTuple", () => {
  const ordTuple = O.createOrdTuple(N.OrdNumber, N.OrdNumber);

  assertEquals(O.toCompare(ordTuple)([1, 1], [2, 1]), -1);
  assertEquals(O.toCompare(ordTuple)([1, 1], [1, 2]), -1);
  assertEquals(O.toCompare(ordTuple)([1, 1], [1, 1]), 0);
  assertEquals(O.toCompare(ordTuple)([1, 1], [1, 0]), 1);
  assertEquals(O.toCompare(ordTuple)([1, 1], [0, 1]), 1);
});

Deno.test("Ord contramap", () => {
  const ordFoo = O.contramap((foo: { foo: number }) => foo.foo)(N.OrdNumber);

  assertEquals(O.toCompare(ordFoo)({ foo: 1 }, { foo: 0 }), 1);
  assertEquals(O.toCompare(ordFoo)({ foo: 1 }, { foo: 1 }), 0);
  assertEquals(O.toCompare(ordFoo)({ foo: 1 }, { foo: 2 }), -1);
});
