import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as S from "../set.ts";
import * as O from "../option.ts";
import { SetoidNumber } from "../number.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Set empty", () => {
  assertEquals(S.empty(), new Set());
});

Deno.test("Set set", () => {
  assertEquals(S.set(1), new Set([1]));
});

Deno.test("Set elem", () => {
  const elem = S.elem(SetoidNumber);
  assertEquals(pipe(S.set(1), elem(1)), true);
  assertEquals(pipe(S.set(1), elem(2)), false);
});

Deno.test("Set elemOf", () => {
  const elemOf = S.elemOf(SetoidNumber);
  assertEquals(pipe(1, elemOf(S.set(1))), true);
  assertEquals(pipe(2, elemOf(S.set(1))), false);
});

Deno.test("Set isSubset", () => {
  const isSubset = S.isSubset(SetoidNumber);
  const ta = S.set(1);
  const tb = S.set(1, 2);
  assertEquals(pipe(ta, isSubset(tb)), true);
  assertEquals(pipe(tb, isSubset(ta)), false);
});

Deno.test("Set union", () => {
  const union = S.union(SetoidNumber);
  assertEquals(pipe(S.set(1), union(S.set(2))), S.set(1, 2));
});

Deno.test("Set intersection", () => {
  const intersection = S.intersection(SetoidNumber);
  assertEquals(pipe(S.set(1), intersection(S.set(2))), S.empty());
  assertEquals(pipe(S.set(1, 2), intersection(S.set(2, 3))), S.set(2));
});

Deno.test("Set compact", () => {
  const compact = S.compact(SetoidNumber);
  assertEquals(compact(S.set(1, 2, 3)), S.set(1, 2, 3));
});

Deno.test("Set join", () => {
  assertEquals(S.join(S.set(S.set(1, 2), S.set(2, 3))), S.set(1, 2, 3));
});

Deno.test("Set getShow", () => {
  const { show } = S.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(S.empty()), "Set([])");
  assertEquals(show(S.set(1, 2, 3)), "Set([1, 2, 3])");
});

Deno.test("Set filter", () => {
  const filter = S.filter((n: number) => n > 0);
  assertEquals(filter(S.set(1, 2, 3)), S.set(1, 2, 3));
  assertEquals(filter(S.set(-1, 0, 1)), S.set(1));
});

Deno.test("Set map", () => {
  assertEquals(pipe(S.set(1, 2, 3), S.map(add)), S.set(2, 3, 4));
});

Deno.test("Set reduce", () => {
  const reduce = S.reduce((n: number, o: number) => n + o, 0);
  assertEquals(reduce(S.empty()), 0);
  assertEquals(reduce(S.set(1, 2, 3)), 6);
});

Deno.test("Set traverse", () => {
  const t1 = S.traverse(O.MonadThrowOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(S.empty()), O.some(S.empty()));
  assertEquals(t2(S.set(1, 2, 3)), O.some(S.set(1, 2, 3)));
  assertEquals(t2(S.set(0, 1, 2)), O.none);
});
