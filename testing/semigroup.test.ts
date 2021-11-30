import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as S from "../semigroup.ts";
import { ordNumber } from "../ord.ts";

const toArray: (a: S.Free<number>) => number[] = S.Free.fold(
  (value: number) => [value],
  (left, right) => toArray(left).concat(toArray(right)),
);

Deno.test("Semigroup Free", () => {
  const ta = S.Free.of(1);
  const tb = S.Free.concat(ta)(ta);
  assertEquals(ta, { tag: "Of", value: 1 });
  assertEquals(tb, { tag: "Concat", left: ta, right: ta });
  assertEquals(toArray(ta), [1]);
  assertEquals(toArray(tb), [1, 1]);
});

Deno.test("Semigroup semigroupAll", () => {
  const concat = S.semigroupAll.concat;
  const concatTrue = concat(true);
  const concatFalse = concat(false);

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatTrue, "function");

  assertEquals(typeof concatFalse, "function");
  assertEquals(concatTrue(true), true);
  assertEquals(concatTrue(false), false);
  assertEquals(concatFalse(true), false);
  assertEquals(concatFalse(false), false);
});

Deno.test("Semigroup semigroupAny", () => {
  const concat = S.semigroupAny.concat;
  const concatTrue = concat(true);
  const concatFalse = concat(false);

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatTrue, "function");
  assertEquals(typeof concatFalse, "function");

  assertEquals(concatTrue(true), true);
  assertEquals(concatTrue(false), true);
  assertEquals(concatFalse(true), true);
  assertEquals(concatFalse(false), false);
});

Deno.test("Semigroup semigroupSum", () => {
  const concat = S.semigroupSum.concat;
  const concatZero = concat(0);
  const concatOne = concat(1);

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatZero, "function");
  assertEquals(typeof concatOne, "function");

  assertEquals(concatOne(1), 2);
  assertEquals(concatZero(1), 1);
  assertEquals(concatOne(0), 1);
  assertEquals(concatZero(0), 0);
});

Deno.test("Semigroup semigroupProduct", () => {
  const concat = S.semigroupProduct.concat;
  const concatOne = concat(1);
  const concatTwo = concat(2);

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatOne, "function");
  assertEquals(typeof concatTwo, "function");

  assertEquals(concatOne(2), 2);
  assertEquals(concatTwo(2), 4);
});

Deno.test("Semigroup semigroupString", () => {
  const concat = S.semigroupString.concat;
  const concatEmpty = concat("");
  const concatHello = concat("Hello");

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatEmpty, "function");
  assertEquals(typeof concatHello, "function");

  assertEquals(concatEmpty("World"), "World");
  assertEquals(concatHello("World"), "HelloWorld");
});

Deno.test("Semigroup semigroupVoid", () => {
  const concat = S.semigroupVoid.concat;
  const concatUndefined = concat(undefined);

  assertEquals(typeof concat, "function");
  assertEquals(typeof concatUndefined, "function");

  assertEquals(concatUndefined(undefined), undefined);
});

Deno.test("Semigroup getFreeSemigroup", () => {
  const { concat } = S.getFreeSemigroup<number>();
  const ta = S.Free.of(1);
  const tb = S.Free.of(2);
  const tc = concat(ta)(tb);
  const td = concat(tc)(tb);
  assertEquals(toArray(td), [1, 2, 2]);
});

Deno.test("Semigroup getFirstSemigroup", () => {
  const { concat } = S.getFirstSemigroup<number>();
  assertEquals(concat(1)(2), 1);
});

Deno.test("Semigroup getLastSemigroup", () => {
  const { concat } = S.getLastSemigroup<number>();
  assertEquals(concat(1)(2), 2);
});

Deno.test("Semigroup getTupleSemigroup", () => {
  const { concat } = S.getTupleSemigroup(S.semigroupSum, S.semigroupString);
  assertEquals(concat([1, "Hello "])([2, "World"]), [3, "Hello World"]);
});

Deno.test("Semigroup getDualSemigroup", () => {
  const { concat } = S.getDualSemigroup(S.getFirstSemigroup<number>());
  assertEquals(concat(1)(2), 2);
});

Deno.test("Semigroup getStrucSemigroup", () => {
  const { concat } = S.getStructSemigroup({
    a: S.semigroupSum,
    b: S.semigroupAll,
  });
  assertEquals(concat({ a: 1, b: true })({ a: 2, b: false }), {
    a: 3,
    b: false,
  });
});

Deno.test("Semigroup getMeetSemigroup", () => {
  const { concat } = S.getMeetSemigroup(ordNumber);
  assertEquals(concat(0)(0), 0);
  assertEquals(concat(0)(1), 0);
  assertEquals(concat(1)(0), 0);
  assertEquals(concat(1)(1), 1);
});

Deno.test("Semigroup getJoinSemigroup", () => {
  const { concat } = S.getJoinSemigroup(ordNumber);
  assertEquals(concat(0)(0), 0);
  assertEquals(concat(0)(1), 1);
  assertEquals(concat(1)(0), 1);
  assertEquals(concat(1)(1), 1);
});

Deno.test("Semigroup fold", () => {
  const foldSum = S.fold(S.semigroupSum);
  const foldArray = foldSum(0);

  assertEquals(typeof foldSum, "function");
  assertEquals(typeof foldArray, "function");

  assertEquals(foldArray([]), 0);
  assertEquals(foldArray([1, 2, 3]), 6);
});
