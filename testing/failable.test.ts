import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../failable.ts";
import * as E from "../either.ts";

Deno.test("Failable createTap", () => {
  const tap = F.createTap(E.FailableEither);

  let success: number | undefined;
  let failure: number | undefined;

  const _tap = tap((s: number) => {
    success = s;
  }, (f: number) => {
    failure = f;
  });

  _tap(E.right(1));
  _tap(E.left(2));

  assertEquals([success, failure], [1, 2]);
});
