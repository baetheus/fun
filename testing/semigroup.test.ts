import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as SG from "../semigroup.ts";
import * as S from "../string.ts";
import * as N from "../number.ts";
import * as B from "../boolean.ts";
import { pipe } from "../fns.ts";

// const toArray: (a: SG.Free<number>) => number[] = SG.Free.concatAll(
//   (value: number) => [value],
//   (left, right) => toArray(left).concat(toArray(right)),
// );
//
// Deno.test("Semigroup Free", () => {
//   const ta = SG.Free.of(1);
//   const tb = SG.Free.concat(ta)(ta);
//   assertEquals(ta, { tag: "Of", value: 1 });
//   assertEquals(tb, { tag: "Concat", left: ta, right: ta });
//   assertEquals(toArray(ta), [1]);
//   assertEquals(toArray(tb), [1, 1]);
// });
//
// Deno.test("Semigroup semigroupAll", () => {
//   const concat = B.SemigroupAll.concat;
//   const concatTrue = concat(true);
//   const concatFalse = concat(false);
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatTrue, "function");
//
//   assertEquals(typeof concatFalse, "function");
//   assertEquals(concatTrue(true), true);
//   assertEquals(concatTrue(false), false);
//   assertEquals(concatFalse(true), false);
//   assertEquals(concatFalse(false), false);
// });
//
// Deno.test("Semigroup semigroupAny", () => {
//   const concat = SG.semigroupAny.concat;
//   const concatTrue = concat(true);
//   const concatFalse = concat(false);
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatTrue, "function");
//   assertEquals(typeof concatFalse, "function");
//
//   assertEquals(concatTrue(true), true);
//   assertEquals(concatTrue(false), true);
//   assertEquals(concatFalse(true), true);
//   assertEquals(concatFalse(false), false);
// });
//
// Deno.test("Semigroup semigroupSum", () => {
//   const concat = N.SemigroupSum.concat;
//   const concatZero = concat(0);
//   const concatOne = concat(1);
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatZero, "function");
//   assertEquals(typeof concatOne, "function");
//
//   assertEquals(concatOne(1), 2);
//   assertEquals(concatZero(1), 1);
//   assertEquals(concatOne(0), 1);
//   assertEquals(concatZero(0), 0);
// });
//
// Deno.test("Semigroup semigroupProduct", () => {
//   const concat = SG.semigroupProduct.concat;
//   const concatOne = concat(1);
//   const concatTwo = concat(2);
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatOne, "function");
//   assertEquals(typeof concatTwo, "function");
//
//   assertEquals(concatOne(2), 2);
//   assertEquals(concatTwo(2), 4);
// });
//
// Deno.test("Semigroup semigroupString", () => {
//   const concat = S.Semigroup.concat;
//   const concatEmpty = concat("");
//   const concatHello = concat("Hello");
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatEmpty, "function");
//   assertEquals(typeof concatHello, "function");
//
//   assertEquals(concatEmpty("World"), "World");
//   assertEquals(concatHello("World"), "HelloWorld");
// });
//
// Deno.test("Semigroup semigroupVoid", () => {
//   const concat = SG.semigroupVoid.concat;
//   const concatUndefined = concat(undefined);
//
//   assertEquals(typeof concat, "function");
//   assertEquals(typeof concatUndefined, "function");
//
//   assertEquals(concatUndefined(undefined), undefined);
// });
//
// Deno.test("Semigroup getFreeSemigroup", () => {
//   const { concat } = SG.getFreeSemigroup<number>();
//   const ta = SG.Free.of(1);
//   const tb = SG.Free.of(2);
//   const tc = concat(ta)(tb);
//   const td = concat(tc)(tb);
//   assertEquals(toArray(td), [1, 2, 2]);
// });

Deno.test("Semigroup first", () => {
  const { concat } = SG.first<number>();
  assertEquals(concat(1)(2), 2);
});

Deno.test("Semigroup last", () => {
  const { concat } = SG.last<number>();
  assertEquals(concat(1)(2), 1);
});

Deno.test("Semigroup tuple", () => {
  const { concat } = SG.tuple(
    N.SemigroupSum,
    pipe(S.Semigroup, SG.intercalcate(" ")),
  );
  assertEquals(pipe([1, "Hello"], concat([2, "World"])), [3, "Hello World"]);
});

Deno.test("Semigroup dual", () => {
  const { concat } = SG.dual(SG.first<number>());
  assertEquals(concat(1)(2), 1);
});

Deno.test("Semigroup struct", () => {
  const { concat } = SG.struct({
    a: N.SemigroupSum,
    b: B.SemigroupAll,
  });
  assertEquals(concat({ a: 1, b: true })({ a: 2, b: false }), {
    a: 3,
    b: false,
  });
});

Deno.test("Semigroup min", () => {
  const { concat } = SG.min(N.Ord);
  assertEquals(concat(0)(0), 0);
  assertEquals(concat(0)(1), 0);
  assertEquals(concat(1)(0), 0);
  assertEquals(concat(1)(1), 1);
});

Deno.test("Semigroup max", () => {
  const { concat } = SG.max(N.Ord);
  assertEquals(concat(0)(0), 0);
  assertEquals(concat(0)(1), 1);
  assertEquals(concat(1)(0), 1);
  assertEquals(concat(1)(1), 1);
});

Deno.test("Semigroup constant", () => {
  const { concat } = SG.constant("cake");
  assertEquals(pipe("apple", concat("banana")), "cake");
});

Deno.test("Semigroup concatAll", () => {
  const concatAllSum = SG.concatAll(N.SemigroupSum);
  const concatAllArray = concatAllSum(0);

  assertEquals(typeof concatAllSum, "function");
  assertEquals(typeof concatAllArray, "function");

  assertEquals(concatAllArray([]), 0);
  assertEquals(concatAllArray([1, 2, 3]), 6);
});
