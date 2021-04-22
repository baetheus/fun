import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as F from "../../optics/from_traversable.ts";
import * as O from "../../option.ts";

Deno.test("FromTraversable fromTraversable", () => {
  const createTraversal = F.fromTraversable(O.Traversable);
  const traversal = createTraversal<number>();

  assertEquals(O.Traversable, traversal);
});
