import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as C from "../composable.ts";
import * as F from "../fn.ts";

Deno.test("Composable interface", () => {
  const ComposableFn: C.Composable<F.KindFn> = {
    id: F.id,
    compose: F.compose,
  };
  assertEquals(ComposableFn, ComposableFn);
});
