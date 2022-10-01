import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as C from "../const.ts";
import * as B from "../boolean.ts";
import * as N from "../number.ts";
import { pipe } from "../fns.ts";

Deno.test("Const make", () => {
  assertEquals(C.make(1), 1);
});

Deno.test("Const getShow", () => {
  const show = C.getShow({ show: (n: number) => n.toString() });

  assertEquals(show.show(C.make(1)), "Const(1)");
});

Deno.test("Const getSetoid", () => {
  const setoid = C.getSetoid(B.SetoidBoolean);

  assertEquals(setoid.equals(C.make(true))(C.make(true)), true);
  assertEquals(setoid.equals(C.make(false))(C.make(true)), false);
});

Deno.test("Const getOrd", () => {
  const ord = C.getOrd(N.OrdNumber);

  assertEquals(ord.lte(C.make(1))(C.make(1)), true);
  assertEquals(ord.lte(C.make(2))(C.make(1)), true);
  assertEquals(ord.lte(C.make(0))(C.make(1)), false);
});

Deno.test("Const getSemigroup", () => {
  const semigroup = C.getSemigroup(N.SemigroupNumberSum);

  assertEquals(semigroup.concat(C.make(1))(C.make(1)), 2);
});

Deno.test("Const getApply", () => {
  const apply = C.getApply(N.MonoidNumberSum);

  assertEquals(pipe(C.make(1), apply.ap(1)), 2);
  assertEquals(pipe(C.make(1), apply.map((n: number) => n + 1)), 1);
});

Deno.test("Const getApplicative", () => {
  const applicative = C.getApplicative(N.MonoidNumberSum);

  assertEquals(pipe(C.make(1), applicative.ap(1)), 2);
  assertEquals(pipe(C.make(1), applicative.map((n: number) => n + 1)), 1);
  assertEquals(applicative.of(1), 0);
});

Deno.test("Const map", () => {
  assertEquals(pipe(C.make(0), C.map((n: number) => n + 1)), C.make(0));
});

Deno.test("Const contramap", () => {
  assertEquals(pipe(C.make(0), C.contramap((n: number) => n + 1)), C.make(0));
});

Deno.test("Const bimap", () => {
  assertEquals(
    pipe(C.make(0), C.bimap((n: number) => n + 1, (n: number) => n - 1)),
    C.make(1),
  );
});

Deno.test("Const mapLeft", () => {
  assertEquals(pipe(C.make(0), C.mapLeft((n: number) => n + 1)), C.make(1));
});
