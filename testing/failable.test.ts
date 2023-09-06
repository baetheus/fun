import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../failable.ts";
import * as E from "../either.ts";

Deno.test("Failable createTryAll", () => {
  const tryAll = F.createTryAll(E.FailableEither);

  assertEquals(
    tryAll(
      E.right(1),
      E.right(2),
      E.right(3),
    ),
    E.right(1),
  );
  assertEquals(
    tryAll(
      E.left(1),
      E.right(2),
      E.right(3),
    ),
    E.right(2),
  );
  assertEquals(
    tryAll(
      E.left(1),
      E.left(2),
      E.right(3),
    ),
    E.right(3),
  );
  assertEquals(
    tryAll(
      E.left(1),
      E.left(2),
      E.left(3),
    ),
    E.left(3),
  );
});
