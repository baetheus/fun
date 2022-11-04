import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as N from "../newtype.ts";
import * as I from "../iso.ts";
import * as O from "../ord.ts";
import * as Num from "../number.ts";

type Real = N.Newtype<"Real", number>;
const isoReal = I.iso((n: number): Real => n, (n: Real): number => n);

Deno.test("Newtype getSetoid", () => {
  const { equals } = N.getEq<Real>(Num.EqNumber);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(equals(int1)(int1), true);
  assertEquals(equals(int1)(int2), false);
});

Deno.test("Newtype viewOrd", () => {
  const ord = N.getOrd<Real>(Num.OrdNumber);
  const { equals } = ord;
  const lte = O.lte(ord);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(equals(int1)(int1), true);
  assertEquals(equals(int1)(int2), false);
  assertEquals(lte(int1)(int1), true);
  assertEquals(lte(int1)(int2), false);
  assertEquals(lte(int2)(int1), true);
});

Deno.test("Newtype viewSemigroup", () => {
  const { concat } = N.getSemigroup<Real>(Num.SemigroupNumberSum);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(concat(int1)(int1), int2);
});

Deno.test("Newtype viewMonoid", () => {
  const { concat, empty } = N.getMonoid<Real>(Num.MonoidNumberSum);
  const int0 = isoReal.view(0);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(concat(int1)(int1), int2);
  assertEquals(empty(), int0);
});
