import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../sync.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

// deno-lint-ignore no-explicit-any
const assertEqualsSync = (a: S.Sync<any>, b: S.Sync<any>) =>
  assertEquals(a(), b());

Deno.test("Sync wrap", () => {
  assertEqualsSync(S.wrap(1), S.wrap(1));
});

Deno.test("Sync apply", () => {
  assertEquals(pipe(S.wrap(add), S.apply(S.wrap(1)))(), S.wrap(2)());
});

Deno.test("Sync map", () => {
  const map = S.map(add);
  assertEqualsSync(map(S.wrap(1)), S.wrap(2));
});

Deno.test("Sync flatmap", () => {
  const flatmap = S.flatmap((n: number) => S.wrap(n + 1));
  assertEqualsSync(flatmap(S.wrap(1)), S.wrap(2));
});

Deno.test("Sync fold", () => {
  const fold = S.fold((acc: number, cur: number) => acc + cur, 0);
  assertEquals(fold(S.wrap(1)), 1);
});

Deno.test("Sync traverse", () => {
  const fold = O.match(() => -1, (n: S.Sync<number>) => n());
  const t0 = S.traverse(O.FlatmappableOption);
  const t1 = t0((n: number) => n === 0 ? O.none : O.some(n));
  const t2 = fold(t1(S.wrap(0)));
  const t3 = fold(t1(S.wrap(1)));

  assertEquals(t2, -1);
  assertEquals(t3, 1);
});

// Deno.test("Sync Do, bind, bindTo", () => {
//   assertEqualsSync(
//     pipe(
//       S.Do(),
//       S.bind("one", () => S.wrap(1)),
//       S.bind("two", ({ one }) => S.wrap(one + one)),
//       S.map(({ one, two }) => one + two),
//     ),
//     S.wrap(3),
//   );
//   assertEqualsSync(
//     pipe(
//       S.wrap(1),
//       S.bindTo("one"),
//     ),
//     S.wrap({ one: 1 }),
//   );
// });
