import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as D from "../monad.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

Deno.test("Monad createMonad", () => {
  const M = D.createMonad<O.URI>({ of: O.of, chain: O.chain });

  // of
  assertStrictEquals(O.of, M.of);

  // chain
  assertStrictEquals(O.chain, M.chain);

  // ap
  const add = (n: number) => n + 1;
  assertEquals(pipe(O.some(add), M.ap(O.some(1))), O.some(2));
  assertEquals(pipe(O.some(add), M.ap(O.none)), O.none);
  assertEquals(pipe(O.none, M.ap(O.some(1))), O.none);
  assertEquals(pipe(O.none, M.ap(O.none)), O.none);

  // map
  assertEquals(pipe(O.some(1), M.map((n) => n + 1)), O.some(2));
  assertEquals(pipe(O.constNone<number>(), M.map((n) => n + 1)), O.none);

  // join
  assertEquals(M.join(O.none), O.none);
  assertEquals(M.join(O.some(O.none)), O.none);
  assertEquals(M.join(O.some(O.some(1))), O.some(1));
});
