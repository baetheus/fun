import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as C from "../const.ts";
import * as B from "../boolean.ts";
import * as N from "../number.ts";
import * as O from "../sortable.ts";
import { pipe } from "../fn.ts";

Deno.test("Const make", () => {
  assertEquals(C.make(1), 1);
});

Deno.test("Const getShowable", () => {
  const show = C.getShowable({ show: (n: number) => n.toString() });

  assertEquals(show.show(C.make(1)), "Const(1)");
});

Deno.test("Const getComparableConst", () => {
  const setoid = C.getComparableConst(B.ComparableBoolean);

  assertEquals(setoid.compare(C.make(true))(C.make(true)), true);
  assertEquals(setoid.compare(C.make(false))(C.make(true)), false);
});

Deno.test("Const getSortable", () => {
  const ord = C.getSortable(N.SortableNumber);
  const lte = O.lte(ord);

  assertEquals(lte(C.make(1))(C.make(1)), true);
  assertEquals(lte(C.make(2))(C.make(1)), true);
  assertEquals(lte(C.make(0))(C.make(1)), false);
});

Deno.test("Const getInitializableConst", () => {
  const semigroup = C.getInitializableConst(N.InitializableNumberSum);

  assertEquals(semigroup.combine(C.make(1))(C.make(1)), 2);
});

Deno.test("Const getApplicable", () => {
  const apply = C.getApplicable(N.InitializableNumberSum);

  assertEquals(pipe(C.make(1), apply.apply(1)), 2);
  assertEquals(pipe(C.make(1), apply.map((n: number) => n + 1)), 1);
});

Deno.test("Const getApplicable", () => {
  const applicative = C.getApplicable(N.InitializableNumberSum);

  assertEquals(pipe(C.make(1), applicative.apply(1)), 2);
  assertEquals(pipe(C.make(1), applicative.map((n: number) => n + 1)), 1);
  assertEquals(applicative.wrap(1), 0);
});

Deno.test("Const map", () => {
  assertEquals(pipe(C.make(0), C.map((n: number) => n + 1)), C.make(0));
});

Deno.test("Const premap", () => {
  assertEquals(pipe(C.make(0), C.premap((n: number) => n + 1)), C.make(0));
});

Deno.test("Const bimap", () => {
  assertEquals(
    pipe(C.make(0), C.bimap((n: number) => n + 1, (n: number) => n - 1)),
    C.make(1),
  );
});

Deno.test("Const mapSecond", () => {
  assertEquals(pipe(C.make(0), C.mapSecond((n: number) => n + 1)), C.make(1));
});
