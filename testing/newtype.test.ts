import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as N from "../newtype.ts";
import * as O from "../option.ts";
import * as Num from "../number.ts";

type Real = N.Newtype<"Real", number>;
type Integer = N.Newtype<"Integer", number>;

Deno.test("Newtype iso", () => {
  const isoReal = N.iso<Real>();
  const real = isoReal.view(1);
  const num: unknown = isoReal.review(real);

  assertEquals(real, num);
});

Deno.test("Newtype prism", () => {
  const prismInteger = N.prism<Integer>(Number.isInteger);

  const int1 = prismInteger.view(1);
  assertEquals(int1, O.some(1 as unknown as Integer));

  const int2 = prismInteger.view(1.1);
  assertEquals(int2, O.constNone());

  const int3 = 1 as unknown as Integer;
  const num = prismInteger.modify((a) => a + a);
  assertEquals(num(int3), 2);
});

Deno.test("Newtype getSetoid", () => {
  const isoReal = N.iso<Real>();
  const { equals } = N.getSetoid<Real>(Num.SetoidNumber);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(equals(int1)(int1), true);
  assertEquals(equals(int1)(int2), false);
});

Deno.test("Newtype viewOrd", () => {
  const isoReal = N.iso<Real>();
  const { equals, lte } = N.getOrd<Real>(Num.OrdNumber);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(equals(int1)(int1), true);
  assertEquals(equals(int1)(int2), false);
  assertEquals(lte(int1)(int1), true);
  assertEquals(lte(int1)(int2), false);
  assertEquals(lte(int2)(int1), true);
});

Deno.test("Newtype viewSemigroup", () => {
  const isoReal = N.iso<Real>();
  const { concat } = N.getSemigroup<Real>(Num.SemigroupNumberSum);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(concat(int1)(int1), int2);
});

Deno.test("Newtype viewMonoid", () => {
  const isoReal = N.iso<Real>();
  const { concat, empty } = N.getMonoid<Real>(Num.MonoidNumberSum);
  const int0 = isoReal.view(0);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(concat(int1)(int1), int2);
  assertEquals(empty(), int0);
});
