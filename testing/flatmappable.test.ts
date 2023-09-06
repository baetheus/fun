import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as D from "../flatmappable.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

Deno.test("Flatmappable createTap", () => {
  const tap = D.createTap(O.FlatmappableOption);
  let result: unknown = 0;
  pipe(O.some(1), tap((n) => result = n));
  assertEquals(result, 1);
});

Deno.test("Flatmappable createBind", () => {
  const bind = D.createBind(O.FlatmappableOption);
  assertEquals(
    pipe(
      O.some({}),
      bind("one", () => O.some(1)),
    ),
    O.some({ one: 1 }),
  );
});

Deno.test("Flatmappable createFlatmappable", () => {
  const M = D.createFlatmappable<O.KindOption>({
    wrap: O.wrap,
    flatmap: O.flatmap,
  });

  // wrap
  assertStrictEquals(O.wrap, M.wrap);

  // flatmap
  assertStrictEquals(O.flatmap, M.flatmap);

  // apply
  const add = (n: number) => n + 1;
  assertEquals(pipe(O.some(add), M.apply(O.some(1))), O.some(2));
  assertEquals(pipe(O.some(add), M.apply(O.none)), O.none);
  assertEquals(pipe(O.none, M.apply(O.some(1))), O.none);
  assertEquals(pipe(O.none, M.apply(O.none)), O.none);

  // map
  assertEquals(pipe(O.some(1), M.map((n) => n + 1)), O.some(2));
  assertEquals(pipe(O.constNone<number>(), M.map((n) => n + 1)), O.none);
});
