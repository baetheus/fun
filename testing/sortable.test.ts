import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as O from "../sortable.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";
import { pipe } from "../fn.ts";

Deno.test("Sortable sign", () => {
  assertEquals(O.sign(Number.NEGATIVE_INFINITY), -1);
  assertEquals(O.sign(Number.POSITIVE_INFINITY), 1);
  assertEquals(O.sign(0), 0);
  assertEquals(O.sign(-56), -1);
  assertEquals(O.sign(56), 1);
  assertEquals(O.sign(-0.34), -1);
  assertEquals(O.sign(0.45), 1);
});

Deno.test("Sortable fromSort", () => {
  const { sort } = O.fromSort(N.sort);
  // sort
  assertEquals(sort(0, 0), 0);
  assertEquals(sort(0, 1), -1);
  assertEquals(sort(1, 0), 1);
});

Deno.test("Sortable fromCurriedSort", () => {
  const { sort } = O.fromCurriedSort<number>((second) => (first) =>
    N.sort(first, second)
  );
  // sort
  assertEquals(sort(0, 0), 0);
  assertEquals(sort(0, 1), -1);
  assertEquals(sort(1, 0), 1);
});

Deno.test("Sortable lt", () => {
  const lt = O.lt(N.SortableNumber);
  assertEquals(lt(0)(0), false);
  assertEquals(lt(0)(1), false);
  assertEquals(lt(1)(0), true);
});

Deno.test("Sortable gt", () => {
  const gt = O.gt(N.SortableNumber);
  assertEquals(gt(0)(0), false);
  assertEquals(gt(0)(1), true);
  assertEquals(gt(1)(0), false);
});

Deno.test("Sortable lte", () => {
  const lte = O.lte(N.SortableNumber);
  assertEquals(lte(0)(0), true);
  assertEquals(lte(0)(1), false);
  assertEquals(lte(1)(0), true);
});

Deno.test("Sortable gte", () => {
  const gte = O.gte(N.SortableNumber);
  assertEquals(gte(0)(0), true);
  assertEquals(gte(1)(0), false);
  assertEquals(gte(0)(1), true);
});

Deno.test("Sortable min", () => {
  const min = O.min(N.SortableNumber);
  assertEquals(min(0)(0), 0);
  assertEquals(min(0)(1), 0);
  assertEquals(min(1)(0), 0);
});

Deno.test("Sortable max", () => {
  const max = O.max(N.SortableNumber);
  assertEquals(max(0)(0), 0);
  assertEquals(max(0)(1), 1);
  assertEquals(max(1)(0), 1);
});

Deno.test("Sortable clamp", () => {
  const clamp = O.clamp(N.SortableNumber);
  assertEquals(clamp(0, 2)(-1), 0);
  assertEquals(clamp(0, 2)(0), 0);
  assertEquals(clamp(0, 2)(1), 1);
  assertEquals(clamp(0, 2)(2), 2);
  assertEquals(clamp(0, 2)(3), 2);
});

Deno.test("Sortable between", () => {
  const between = O.between(N.SortableNumber);
  assertEquals(between(0, 2)(-1), false);
  assertEquals(between(0, 2)(0), false);
  assertEquals(between(0, 2)(1), true);
  assertEquals(between(0, 10)(5), true);
  assertEquals(between(0, 2)(2), false);
  assertEquals(between(0, 2)(3), false);
});

Deno.test("Sortable trivial", () => {
  // Every Date is the same!
  const trivial = O.trivial<Date>();
  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(trivial.sort(now, later), 0);
  assertEquals(trivial.sort(later, now), 0);
  assertEquals(trivial.sort(later, later), 0);
  assertEquals(trivial.sort(now, now), 0);
});

Deno.test("Sortable reverse", () => {
  const reverse = O.reverse(N.SortableNumber);

  assertEquals(reverse.sort(0, 0), 0);
  assertEquals(reverse.sort(0, 1), 1);
  assertEquals(reverse.sort(1, 0), -1);
});

Deno.test("Sortable tuple", () => {
  const tuple = O.tuple(N.SortableNumber, N.SortableNumber);

  assertEquals(tuple.sort([1, 1], [2, 1]), -1);
  assertEquals(tuple.sort([1, 1], [1, 2]), -1);
  assertEquals(tuple.sort([1, 1], [1, 1]), 0);
  assertEquals(tuple.sort([1, 1], [1, 0]), 1);
  assertEquals(tuple.sort([1, 1], [0, 1]), 1);
});

Deno.test("Sortable struct", () => {
  const tuple = O.struct({
    name: S.SortableString,
    age: N.SortableNumber,
  });

  assertEquals(
    tuple.sort({ name: "Brandon", age: 37 }, { name: "Emily", age: 32 }),
    -1,
  );
  assertEquals(
    tuple.sort({ name: "Brandon", age: 37 }, { name: "Brandon", age: 32 }),
    1,
  );
  assertEquals(
    tuple.sort({ name: "Brandon", age: 37 }, { name: "Emily", age: 0 }),
    -1,
  );
  assertEquals(
    tuple.sort({ name: "Brandon", age: 37 }, { name: "Brandon", age: 37 }),
    0,
  );
});

Deno.test("Sortable premap", () => {
  type Person = { name: string; age: number };
  const byAge = pipe(
    N.SortableNumber,
    O.premap((p: Person) => p.age),
  );

  assertEquals(
    byAge.sort({ name: "Brandon", age: 37 }, { name: "Emily", age: 32 }),
    1,
  );
  assertEquals(
    byAge.sort({ name: "Brandon", age: 37 }, { name: "Brandon", age: 37 }),
    0,
  );
  assertEquals(
    byAge.sort({ name: "Brandon", age: 37 }, { name: "Brian", age: 37 }),
    0,
  );
  assertEquals(
    byAge.sort({ name: "Brandon", age: 37 }, { name: "Patrick", age: 50 }),
    -1,
  );
});

Deno.test("Sortable PremappableSortable", () => {
  assertStrictEquals(O.PremappableSortable.premap, O.premap);
});
