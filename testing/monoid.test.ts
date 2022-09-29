import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as M from "../monoid.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";

Deno.test("Monoid tuple", () => {
  const Semigroup = M.tuple(N.MonoidNumberSum, S.MonoidString);

  assertEquals(Semigroup.empty(), [0, ""]);
});

Deno.test("Monoid fold", () => {
  const fold = M.concatAll(N.MonoidNumberSum);

  assertEquals(fold([]), N.MonoidNumberSum.empty());
  assertEquals(fold([1, 2, 3]), 6);
});
