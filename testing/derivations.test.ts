import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../derivations.ts";
import * as O from "../option.ts";
import { semigroupSum } from "../semigroup.ts";
import { pipe } from "../fns.ts";

Deno.test("Derivations createMonad", () => {
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

// Deno.test("Derivations createDo", () => {
//   const M = D.createMonad<O.URI>({ of: O.of, chain: O.chain });
//   const { Do, bindTo, bind } = D.createDo(M);

//   // Do
//   assertEquals(Do(), O.some({}));

//   // bindTo
//   assertEquals(pipe(O.some(1), bindTo("one")), O.some({ one: 1 }));

//   // bind
//   assertEquals(
//     pipe(O.some(1), bindTo("one"), bind("two", ({ one }) => O.some(one + 1))),
//     O.some({ one: 1, two: 2 }),
//   );
// });

// Deno.test("Derivations createApplySemigroup", () => {
//   const getSemigroup = D.createApplySemigroup(O.Apply);
//   const { concat } = getSemigroup(semigroupSum);

//   assertEquals(pipe(O.some(1), concat(O.some(1))), O.some(2));
//   assertEquals(pipe(O.some(1), concat(O.none)), O.none);
//   assertEquals(pipe(O.none, concat(O.some(1))), O.none);
//   assertEquals(pipe(O.none, concat(O.none)), O.none);
// });
