import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as SG from "../combinable.ts";
import * as S from "../string.ts";
import * as N from "../number.ts";
import * as B from "../boolean.ts";
import { pipe } from "../fn.ts";

// const toArray: (a: SG.Free<number>) => number[] = SG.Free.combineAll(
//   (value: number) => [value],
//   (left, right) => toArray(left).combine(toArray(right)),
// );
//
// Deno.test("Combinable Free", () => {
//   const ta = SG.Free.wrap(1);
//   const tb = SG.Free.combine(ta)(ta);
//   assertEquals(ta, { tag: "Of", value: 1 });
//   assertEquals(tb, { tag: "Concat", left: ta, right: ta });
//   assertEquals(toArray(ta), [1]);
//   assertEquals(toArray(tb), [1, 1]);
// });
//
// Deno.test("Combinable semigroupAll", () => {
//   const combine = B.CombinableBooleanAll.combine;
//   const combineTrue = combine(true);
//   const combineFalse = combine(false);
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineTrue, "function");
//
//   assertEquals(typeof combineFalse, "function");
//   assertEquals(combineTrue(true), true);
//   assertEquals(combineTrue(false), false);
//   assertEquals(combineFalse(true), false);
//   assertEquals(combineFalse(false), false);
// });
//
// Deno.test("Combinable semigroupAny", () => {
//   const combine = SG.semigroupAny.combine;
//   const combineTrue = combine(true);
//   const combineFalse = combine(false);
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineTrue, "function");
//   assertEquals(typeof combineFalse, "function");
//
//   assertEquals(combineTrue(true), true);
//   assertEquals(combineTrue(false), true);
//   assertEquals(combineFalse(true), true);
//   assertEquals(combineFalse(false), false);
// });
//
// Deno.test("Combinable semigroupSum", () => {
//   const combine = N.InitializableNumberSum.combine;
//   const combineZero = combine(0);
//   const combineOne = combine(1);
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineZero, "function");
//   assertEquals(typeof combineOne, "function");
//
//   assertEquals(combineOne(1), 2);
//   assertEquals(combineZero(1), 1);
//   assertEquals(combineOne(0), 1);
//   assertEquals(combineZero(0), 0);
// });
//
// Deno.test("Combinable semigroupProduct", () => {
//   const combine = SG.semigroupProduct.combine;
//   const combineOne = combine(1);
//   const combineTwo = combine(2);
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineOne, "function");
//   assertEquals(typeof combineTwo, "function");
//
//   assertEquals(combineOne(2), 2);
//   assertEquals(combineTwo(2), 4);
// });
//
// Deno.test("Combinable semigroupString", () => {
//   const combine = S.Combinable.combine;
//   const combineEmpty = combine("");
//   const combineHello = combine("Hello");
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineEmpty, "function");
//   assertEquals(typeof combineHello, "function");
//
//   assertEquals(combineEmpty("World"), "World");
//   assertEquals(combineHello("World"), "HelloWorld");
// });
//
// Deno.test("Combinable semigroupVoid", () => {
//   const combine = SG.semigroupVoid.combine;
//   const combineUndefined = combine(undefined);
//
//   assertEquals(typeof combine, "function");
//   assertEquals(typeof combineUndefined, "function");
//
//   assertEquals(combineUndefined(undefined), undefined);
// });
//
// Deno.test("Combinable getFreeCombinable", () => {
//   const { combine } = SG.getFreeCombinable<number>();
//   const ta = SG.Free.wrap(1);
//   const tb = SG.Free.wrap(2);
//   const tc = combine(ta)(tb);
//   const td = combine(tc)(tb);
//   assertEquals(toArray(td), [1, 2, 2]);
// });

Deno.test("Combinable first", () => {
  const { combine } = SG.first<number>();
  assertEquals(combine(1)(2), 2);
});

Deno.test("Combinable last", () => {
  const { combine } = SG.last<number>();
  assertEquals(combine(1)(2), 1);
});

Deno.test("Combinable tuple", () => {
  const { combine } = SG.tuple(
    N.InitializableNumberSum,
    pipe(S.InitializableString, SG.intercalcate(" ")),
  );
  assertEquals(pipe([1, "Hello"], combine([2, "World"])), [3, "Hello World"]);
});

Deno.test("Combinable dual", () => {
  const { combine } = SG.dual(SG.first<number>());
  assertEquals(combine(1)(2), 1);
});

Deno.test("Combinable struct", () => {
  const { combine } = SG.struct({
    a: N.InitializableNumberSum,
    b: B.InitializableBooleanAll,
  });
  assertEquals(combine({ a: 1, b: true })({ a: 2, b: false }), {
    a: 3,
    b: false,
  });
});

Deno.test("Combinable min", () => {
  const { combine } = SG.min(N.SortableNumber);
  assertEquals(combine(0)(0), 0);
  assertEquals(combine(0)(1), 0);
  assertEquals(combine(1)(0), 0);
  assertEquals(combine(1)(1), 1);
});

Deno.test("Combinable max", () => {
  const { combine } = SG.max(N.SortableNumber);
  assertEquals(combine(0)(0), 0);
  assertEquals(combine(0)(1), 1);
  assertEquals(combine(1)(0), 1);
  assertEquals(combine(1)(1), 1);
});

Deno.test("Combinable constant", () => {
  const { combine } = SG.constant("cake");
  assertEquals(pipe("apple", combine("banana")), "cake");
});

Deno.test("Combinable combineAll", () => {
  const combineAllSum = SG.getCombineAll(N.InitializableNumberSum);

  assertEquals(typeof combineAllSum, "function");

  assertEquals(combineAllSum(1, 2, 3), 6);
});
