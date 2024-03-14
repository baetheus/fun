import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as M from "../mappable.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

Deno.test("Mappable createBindTo", () => {
  const bindTo = M.createBindTo(O.MappableOption);

  const resultSome = pipe(
    O.some(1),
    bindTo("hello"),
  );
  const resultNone = pipe(
    O.constNone<number>(),
    bindTo("hello"),
  );

  assertEquals(resultSome, O.some({ "hello": 1 }));
  assertEquals(resultNone, O.none);
});
