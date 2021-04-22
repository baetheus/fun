import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import type * as HKT from "../hkt.ts";

import * as C from "../const.ts";
import { setoidBoolean } from "../setoid.ts";
import { ordNumber } from "../ord.ts";
import { semigroupSum } from "../semigroup.ts";
import { monoidSum } from "../monoid.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

Deno.test("Const make", () => {
  assertEquals(C.make(1), 1);
});

Deno.test("Const getShow", () => {
  const show = C.getShow({ show: (n: number) => n.toString() });

  assertEquals(show.show(C.make(1)), "Const(1)");
});

Deno.test("Const getSetoid", () => {
  const setoid = C.getSetoid(setoidBoolean);

  assertEquals(setoid.equals(C.make(true))(C.make(true)), true);
  assertEquals(setoid.equals(C.make(false))(C.make(true)), false);
});

Deno.test("Const getOrd", () => {
  const ord = C.getOrd(ordNumber);

  assertEquals(ord.lte(C.make(1))(C.make(1)), true);
  assertEquals(ord.lte(C.make(2))(C.make(1)), false);
  assertEquals(ord.lte(C.make(0))(C.make(1)), true);
});

Deno.test("Const getSemigroup", () => {
  const semigroup = C.getSemigroup(semigroupSum);

  assertEquals(semigroup.concat(C.make(1))(C.make(1)), 2);
});

Deno.test("Const getApply", () => {
  const apply = C.getApply(monoidSum);

  assertEquals(pipe(C.make(1), apply.ap(1)), 2);
  assertEquals(pipe(C.make(1), apply.map((n: number) => n + 1)), 1);
});

Deno.test("Const getApplicative", () => {
  const applicative = C.getApplicative(monoidSum);

  assertEquals(pipe(C.make(1), applicative.ap(1)), 2);
  assertEquals(pipe(C.make(1), applicative.map((n: number) => n + 1)), 1);
  assertEquals(applicative.of(1), 0);
});

Deno.test("Const Functor", () => {
  AS.assertFunctor(C.Functor, {
    ta: C.make(1) as never,
    fai: (n: number) => n + 1,
    fij: (n: number) => 2 * n,
  });
});

Deno.test("Const Contravariant", () => {
  AS.assertContravariant(C.Contravariant, {
    ti: C.make(1) as never,
    tj: C.make(2) as never,
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
  });
});

Deno.test("Const Bifunctor", () => {
  AS.assertBifunctor(C.Bifunctor, {
    tab: C.make(2) as C.Const<number, number>,
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    fbx: (n: number) => n + 1,
    fxy: (n: number) => n + 2,
  });
});
