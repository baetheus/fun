import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as N from "../newtype.ts";
import * as O from "../sortable.ts";
import * as Num from "../number.ts";
import { none, some } from "../option.ts";

type Real = N.Newtype<"Real", number>;
const isoReal = N.iso<Real>();

Deno.test("Newtype getSetoid", () => {
  const { compare } = N.getComparable<Real>(Num.ComparableNumber);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(compare(int1)(int1), true);
  assertEquals(compare(int1)(int2), false);
});

Deno.test("Newtype getSortable", () => {
  const ord = N.getSortable<Real>(Num.SortableNumber);
  const lte = O.lte(ord);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(lte(int1)(int1), true);
  assertEquals(lte(int1)(int2), false);
  assertEquals(lte(int2)(int1), true);
});

Deno.test("Newtype getInitializable", () => {
  const { combine, init } = N.getInitializable<Real>(
    Num.InitializableNumberSum,
  );
  const int0 = isoReal.view(0);
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(combine(int1)(int1), int2);
  assertEquals(init(), int0);
});

Deno.test("Newtype getCombinable", () => {
  const { combine } = N.getCombinable<Real>(
    Num.InitializableNumberSum,
  );
  const int1 = isoReal.view(1);
  const int2 = isoReal.view(2);

  assertEquals(combine(int1)(int1), int2);
});

Deno.test("Newtype iso", () => {
  const real = isoReal.view(1);
  assertEquals(real, 1 as unknown);
  assertEquals(isoReal.review(real), 1);
});

Deno.test("Newtype prism", () => {
  type Integer = N.Newtype<"Integer", number>;
  const prism = N.prism<Integer>(Number.isInteger);
  const int = 1 as unknown as Integer; // Cheating
  assertEquals(prism.view(1), some(int));
  assertEquals(prism.view(1.1), none);
  assertEquals(prism.review(int), 1);
});
