import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as A from "../applicable.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as C from "../combinable.ts";

Deno.test("Applicable getApplicableCombinable", () => {
  const getCombinableNumber = A.getApplicableCombinable(O.ApplicableOption);
  const CombinableOptionNumber = getCombinableNumber(N.InitializableNumberSum);
  const combineAll = C.getCombineAll(CombinableOptionNumber);

  assertEquals(combineAll(O.none), O.none);
  assertEquals(combineAll(O.some(1)), O.some(1));
  assertEquals(combineAll(O.none, O.none), O.none);
  assertEquals(combineAll(O.none, O.some(1)), O.none);
  assertEquals(combineAll(O.some(1), O.none), O.none);
  assertEquals(combineAll(O.some(1), O.some(1)), O.some(2));
});
