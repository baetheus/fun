import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as R from "../foldable.ts";
import * as A from "../array.ts";
import * as N from "../number.ts";

Deno.test("Foldable collect", () => {
  const collect = R.collect(A.FoldableArray, N.InitializableNumberSum);
  assertEquals(collect([]), 0);
  assertEquals(collect([1, 2, 3, 4]), 10);
});
