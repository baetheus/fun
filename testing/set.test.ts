import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as S from "../set.ts";
import * as O from "../option.ts";
import { Setoid as setoidNumber } from "../number.ts";
import { pipe } from "../fns.ts";

Deno.test("Set zero", () => {
  assertEquals(S.zero(), new Set());
});

Deno.test("Set empty", () => {
  assertEquals(S.empty(), S.zero());
});

Deno.test("Set set", () => {
  assertEquals(S.set(1), new Set([1]));
});

Deno.test("Set elem", () => {
  const elem = S.elem(setoidNumber);
  assertEquals(pipe(S.set(1), elem(1)), true);
  assertEquals(pipe(S.set(1), elem(2)), false);
});

Deno.test("Set elemOf", () => {
  const elemOf = S.elemOf(setoidNumber);
  assertEquals(pipe(1, elemOf(S.set(1))), true);
  assertEquals(pipe(2, elemOf(S.set(1))), false);
});

Deno.test("Set isSubset", () => {
  const isSubset = S.isSubset(setoidNumber);
  const ta = S.set(1);
  const tb = S.set(1, 2);
  assertEquals(pipe(ta, isSubset(tb)), true);
  assertEquals(pipe(tb, isSubset(ta)), false);
});

Deno.test("Set union", () => {
  const union = S.union(setoidNumber);
  assertEquals(pipe(S.set(1), union(S.set(2))), S.set(1, 2));
});

Deno.test("Set intersection", () => {
  const intersection = S.intersection(setoidNumber);
  assertEquals(pipe(S.set(1), intersection(S.set(2))), S.empty());
  assertEquals(pipe(S.set(1, 2), intersection(S.set(2, 3))), S.set(2));
});

Deno.test("Set compact", () => {
  const compact = S.compact(setoidNumber);
  assertEquals(compact(S.set(1, 2, 3)), S.set(1, 2, 3));
});

Deno.test("Set join", () => {
  assertEquals(S.join(S.set(S.set(1, 2), S.set(2, 3))), S.set(1, 2, 3));
});

Deno.test("Set Functor", () => {
  AS.assertFunctor(S.Functor, {
    ta: S.set(1, 2, 3),
    fai: AS.add,
    fij: AS.multiply,
  });
});

Deno.test("Set Apply", () => {
  AS.assertApply(S.Apply, {
    ta: S.set(1, 2, 3),
    fai: AS.add,
    fij: AS.multiply,
    tfai: S.set(AS.add, AS.multiply),
    tfij: S.set(AS.multiply, AS.add),
  });
});

Deno.test("Set Filterable", () => {
  AS.assertFilterable(S.Filterable, {
    a: S.set(1, 2, 3),
    b: S.set(2, 3, 4),
    f: (n: number) => n < 2,
    g: (n: number) => n > 4,
  });
});

Deno.test("Set Foldable", () => {
  AS.assertFoldable(S.Foldable, {
    a: 0,
    tb: S.set(1, 2, 3),
    faia: (n: number, i: number) => n + i,
  });
});

Deno.test("Set getShow", () => {
  const { show } = S.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(S.empty()), "Set([])");
  assertEquals(show(S.set(1, 2, 3)), "Set([1, 2, 3])");
});

Deno.test("Set getSetoid", () => {
  const Setoid = S.getSetoid(setoidNumber);
  AS.assertSetoid(Setoid, {
    a: S.set(1),
    b: S.set(1),
    c: S.set(1),
    z: S.set(1, 2, 3),
  });
});

Deno.test("Set getUnionMonoid", () => {
  const Monoid = S.getUnionMonoid(setoidNumber);
  AS.assertMonoid(Monoid, {
    a: S.set(1, 2),
    b: S.set(2, 3),
    c: S.set(3, 4),
  });
});

Deno.test("Set filter", () => {
  const filter = S.filter((n: number) => n > 0);
  assertEquals(filter(S.set(1, 2, 3)), S.set(1, 2, 3));
  assertEquals(filter(S.set(-1, 0, 1)), S.set(1));
});

Deno.test("Set map", () => {
  assertEquals(pipe(S.set(1, 2, 3), S.map(AS.add)), S.set(2, 3, 4));
});

Deno.test("Set reduce", () => {
  const reduce = S.reduce((n: number, o: number) => n + o, 0);
  assertEquals(reduce(S.zero()), 0);
  assertEquals(reduce(S.set(1, 2, 3)), 6);
});

Deno.test("Set traverse", () => {
  const t1 = S.traverse(O.Applicative);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(S.empty()), O.some(S.empty()));
  assertEquals(t2(S.set(1, 2, 3)), O.some(S.set(1, 2, 3)));
  assertEquals(t2(S.set(0, 1, 2)), O.none);
});
