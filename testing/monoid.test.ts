import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as M from "../monoid.ts";
import * as O from "../option.ts";

Deno.test("Monoid monoidAll", () => {
  AS.assertMonoid(M.monoidAll, { a: true, b: true, c: true });
});

Deno.test("Monoid monoidAny", () => {
  AS.assertMonoid(M.monoidAny, { a: true, b: true, c: true });
});

Deno.test("Monoid monoidSum", () => {
  AS.assertMonoid(M.monoidSum, { a: 1, b: 1, c: 1 });
});

Deno.test("Monoid monoidProduct", () => {
  AS.assertMonoid(M.monoidProduct, { a: 2, b: 1, c: 1 });
});

Deno.test("Monoid monoidString", () => {
  AS.assertMonoid(M.monoidString, { a: "a", b: "b", c: "c" });
});

Deno.test("Monoid monoidVoid", () => {
  AS.assertMonoid(M.monoidVoid, { a: undefined, b: undefined, c: undefined });
});

Deno.test("Monoid getTupleMonoid", () => {
  const Semigroup = M.getTupleMonoid(M.monoidSum, M.monoidString);

  AS.assertSemigroup(Semigroup, { a: [1, "a"], b: [2, "b"], c: [3, "c"] });

  assertEquals(Semigroup.empty(), [0, ""]);
});

Deno.test("Monoid getDualMonoid", () => {
  const Monoid = M.getDualMonoid(M.monoidSum);

  AS.assertMonoid(Monoid, { a: 1, b: 2, c: 3 });
});

Deno.test("Monoid getStructMonoid", () => {
  const Monoid = M.getStructMonoid({ a: M.monoidSum, b: M.monoidString });

  AS.assertMonoid(Monoid, {
    a: { a: 1, b: "1" },
    b: { a: 2, b: "2" },
    c: { a: 3, b: "3" },
  });
});

Deno.test("Monoid fold", () => {
  const fold = M.fold(M.monoidSum);

  assertEquals(fold([]), M.monoidSum.empty());
  assertEquals(fold([1, 2, 3]), 6);
});
