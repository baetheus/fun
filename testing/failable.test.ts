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
