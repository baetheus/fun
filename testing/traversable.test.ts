import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as F from "../traversable.ts";
import * as O from "../option.ts";

Deno.test("Traversable toTraversal", () => {
  const createTraversal = F.toTraversal(O.TraversableOption);
  const traversal = createTraversal<number>();

  assertEquals(O.TraversableOption.traverse, traversal.traverse);
});
