import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as M from "../monoid.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";

Deno.test("Monoid tuple", () => {
  const Semigroup = M.tuple(N.MonoidSum, S.Monoid);

  AS.assertSemigroup(Semigroup, { a: [1, "a"], b: [2, "b"], c: [3, "c"] });

  assertEquals(Semigroup.empty(), [0, ""]);
});

Deno.test("Monoid getDualMonoid", () => {
  const Monoid = M.dual(N.MonoidSum);

  AS.assertMonoid(Monoid, { a: 1, b: 2, c: 3 });
});

Deno.test("Monoid getStructMonoid", () => {
  const Monoid = M.struct({ a: N.MonoidSum, b: S.Monoid });

  AS.assertMonoid(Monoid, {
    a: { a: 1, b: "1" },
    b: { a: 2, b: "2" },
    c: { a: 3, b: "3" },
  });
});

Deno.test("Monoid fold", () => {
  const fold = M.concatAll(N.MonoidSum);

  assertEquals(fold([]), N.MonoidSum.empty());
  assertEquals(fold([1, 2, 3]), 6);
});
