import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as B from "../bimappable.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

Deno.test("Bimappable bimap", () => {
  const bimap = B.bimap(E.BimappableEither);
  assertEquals(
    pipe(E.right(1), bimap((n) => n + 1, (n: number) => n - 1)),
    E.right(2),
  );
  assertEquals(
    pipe(E.left(1), bimap((n) => n + 1, (n: number) => n - 1)),
    E.left(0),
  );
});
