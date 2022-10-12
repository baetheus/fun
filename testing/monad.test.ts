import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../monad.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

Deno.test("Monad createMonad", () => {
  const M = D.createMonad<O.URI>({ of: O.of, chain: O.chain });

  // ap
  const f1 = O.some((n: number) => n + 1);
  const f2: typeof f1 = O.none;
  assertEquals(pipe(O.some(1), M.ap(f1)), O.some(2));
  assertEquals(pipe(O.none, M.ap(f1)), O.none);
  assertEquals(pipe(O.some(1), M.ap(f2)), O.none);
  assertEquals(pipe(O.none, M.ap(f2)), O.none);

  // map
  assertEquals(pipe(O.some(1), M.map((n) => n + 1)), O.some(2));
  assertEquals(pipe(O.constNone<number>(), M.map((n) => n + 1)), O.none);

  // join
  assertEquals(M.join(O.none), O.none);
  assertEquals(M.join(O.some(O.none)), O.none);
  assertEquals(M.join(O.some(O.some(1))), O.some(1));
});
