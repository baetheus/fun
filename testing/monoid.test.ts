import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as M from "../monoid.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";
import { pipe } from "../fn.ts";

Deno.test("Monoid tuple", () => {
  const monoid = M.tuple(
    N.MonoidNumberSum,
    N.MonoidNumberProduct,
  );
  const concat = M.concatAll(monoid);

  assertEquals(concat([[1, 2], [3, 4]]), [4, 8]);
  assertEquals(concat([]), [0, 1]);
  assertEquals(concat([[1, 2]]), [1, 2]);
  assertEquals(concat([[1, 0], [1, 100], [1, -1]]), [3, 0]);
});

Deno.test("Monoid dual", () => {
  const reverseAll = pipe(
    S.MonoidString,
    M.intercalcate(" "),
    M.dual,
    M.concatAll,
  );

  assertEquals(reverseAll(["Hello", "World"]), "World Hello ");
});

Deno.test("Monoid intercalcate", () => {
  const { concat: toList } = pipe(
    S.MonoidString,
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

Deno.test("Monoid struct", () => {
  const monoid = M.struct({
    sum: N.MonoidNumberSum,
    mult: N.MonoidNumberProduct,
  });
  const concat = M.concatAll(monoid);

  assertEquals(concat([{ sum: 1, mult: 2 }, { sum: 3, mult: 4 }]), {
    sum: 4,
    mult: 8,
  });
  assertEquals(concat([]), { sum: 0, mult: 1 });
  assertEquals(concat([{ sum: 1, mult: 2 }]), { sum: 1, mult: 2 });
});

Deno.test("Monoid concatAll", () => {
  const fold = M.concatAll(N.MonoidNumberSum);

  assertEquals(fold([]), N.MonoidNumberSum.empty());
  assertEquals(fold([1, 2, 3]), 6);
});
