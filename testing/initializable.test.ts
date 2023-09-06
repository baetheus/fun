import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as M from "../initializable.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";
import { pipe } from "../fn.ts";

Deno.test("Initializable constant", () => {
  const { combine, init } = M.constant(0);
  assertEquals(init(), 0);
  assertEquals(pipe(1, combine(2)), 0);
});

Deno.test("Initializable tuple", () => {
  const monoid = M.tuple(
    N.InitializableNumberSum,
    N.InitializableNumberProduct,
  );
  const combine = M.getCombineAll(monoid);

  assertEquals(combine([1, 2], [3, 4]), [4, 8]);
  assertEquals(combine([1, 2]), [1, 2]);
  assertEquals(combine([1, 0], [1, 100], [1, -1]), [3, 0]);
});

Deno.test("Initializable dual", () => {
  const reverseAll = pipe(
    S.InitializableString,
    M.intercalcate(" "),
    M.dual,
    M.getCombineAll,
  );

  assertEquals(reverseAll("Hello", "World"), "World Hello ");
});

Deno.test("Initializable intercalcate", () => {
  const { combine: toList } = pipe(
    S.InitializableString,
    M.intercalcate(", "),
  );

  assertEquals(
    pipe(
      "apples",
      toList("oranges"),
      toList("and bananas"),
    ),
    "apples, oranges, and bananas",
  );
});

Deno.test("Initializable struct", () => {
  const monoid = M.struct({
    sum: N.InitializableNumberSum,
    mult: N.InitializableNumberProduct,
  });
  const combine = M.getCombineAll(monoid);

  assertEquals(combine({ sum: 1, mult: 2 }, { sum: 3, mult: 4 }), {
    sum: 4,
    mult: 8,
  });
  assertEquals(combine(), { sum: 0, mult: 1 });
  assertEquals(combine({ sum: 1, mult: 2 }), { sum: 1, mult: 2 });
});

Deno.test("Initializable getCombineAll", () => {
  const fold = M.getCombineAll(N.InitializableNumberSum);

  assertEquals(fold(), N.InitializableNumberSum.init());
  assertEquals(fold(1, 2, 3), 6);
});
