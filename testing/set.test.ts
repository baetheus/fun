import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as S from "../set.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import * as M from "../monoid.ts";
import { EqNumber } from "../number.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;
const set = S.set(1, 2, 3);

Deno.test("Set empty", () => {
  assertEquals(S.empty(), new Set());
});

Deno.test("Set set", () => {
  assertEquals(S.set(1), new Set([1]));
  assertEquals(S.set(1, 2, 3), new Set([1, 2, 3]));
});

Deno.test("Set copy", () => {
  const orig = S.set(1, 2, 3);
  assertEquals(S.copy(orig), orig);
});

Deno.test("Set some", () => {
  assertEquals(pipe(set, S.some((n) => n > 0)), true);
  assertEquals(pipe(set, S.some((n) => n < 0)), false);
});

Deno.test("Set some", () => {
  assertEquals(pipe(set, S.every((n) => n > 0)), true);
  assertEquals(pipe(set, S.every((n) => n > 2)), false);
  assertEquals(pipe(set, S.every((n) => n < 0)), false);
});

Deno.test("Set elem", () => {
  const elem = S.elem(EqNumber);
  assertEquals(pipe(S.set(1), elem(1)), true);
  assertEquals(pipe(S.set(1), elem(2)), false);
});

Deno.test("Set elemOf", () => {
  const elemOf = S.elemOf(EqNumber);
  assertEquals(pipe(1, elemOf(S.set(1))), true);
  assertEquals(pipe(2, elemOf(S.set(1))), false);
});

Deno.test("Set isSubset", () => {
  const isSubset = S.isSubset(EqNumber);
  const ta = S.set(1);
  const tb = S.set(1, 2);
  assertEquals(pipe(ta, isSubset(tb)), true);
  assertEquals(pipe(tb, isSubset(ta)), false);
});

Deno.test("Set union", () => {
  const union = S.union(EqNumber);
  assertEquals(pipe(S.set(1), union(S.set(2))), S.set(1, 2));
});

Deno.test("Set intersection", () => {
  const intersection = S.intersection(EqNumber);
  assertEquals(pipe(S.set(1), intersection(S.set(2))), S.empty());
  assertEquals(pipe(S.set(1, 2), intersection(S.set(2, 3))), S.set(2));
});

Deno.test("Set compact", () => {
  const compact = S.compact(EqNumber);
  assertEquals(compact(S.set(1, 2, 3)), S.set(1, 2, 3));
});

Deno.test("Set of", () => {
  assertEquals(S.of(1), S.set(1));
});

Deno.test("Set map", () => {
  assertEquals(pipe(S.empty(), S.map(add)), S.empty());
  assertEquals(pipe(S.set(1, 2, 3), S.map(add)), S.set(2, 3, 4));
});

Deno.test("Set ap", () => {
  const setfn = S.set((n: number) => n, add);
  assertEquals(pipe(S.empty(), S.ap(setfn)), S.empty());
  assertEquals(pipe(set, S.ap(S.empty<typeof add>())), S.empty());
  assertEquals(pipe(set, S.ap(setfn)), S.set(1, 2, 3, 4));
});

Deno.test("Set chain", () => {
  const fn = (n: number) => S.set(n - 1, n, n + 1);
  assertEquals(pipe(S.empty<number>(), S.chain(fn)), S.empty());
  assertEquals(pipe(set, S.chain(fn)), S.set(0, 1, 2, 3, 4));
});

Deno.test("Set join", () => {
  assertEquals(S.join(S.empty()), S.empty());
  assertEquals(S.join(S.set(S.empty())), S.empty());
  assertEquals(S.join(S.set(S.set(1, 2), S.set(2, 3))), S.set(1, 2, 3));
});

Deno.test("Set filter", () => {
  const filter = S.filter((n: number) => n > 0);
  assertEquals(filter(S.set(1, 2, 3)), S.set(1, 2, 3));
  assertEquals(filter(S.set(-1, 0, 1)), S.set(1));
});

Deno.test("Set filterMap", () => {
  const filterMap = S.filterMap(O.fromPredicate((n: number) => n > 1));
  assertEquals(filterMap(S.empty()), S.empty());
  assertEquals(filterMap(set), S.set(2, 3));
});

Deno.test("Set partition", () => {
  const partition = S.partition((n: number) => n > 1);
  assertEquals(partition(S.empty()), [S.empty(), S.empty()]);
  assertEquals(partition(set), [S.set(2, 3), S.set(1)]);
});

Deno.test("Set partitionMap", () => {
  const partitionMap = S.partitionMap((n: number) =>
    n > 1 ? E.right(n) : E.left(n)
  );
  assertEquals(partitionMap(S.empty()), [S.empty(), S.empty()]);
  assertEquals(partitionMap(set), [S.set(2, 3), S.set(1)]);
});

Deno.test("Set reduce", () => {
  const reduce = S.reduce((n: number, o: number) => n + o, 0);
  assertEquals(reduce(S.empty()), 0);
  assertEquals(reduce(S.set(1, 2, 3)), 6);
});

Deno.test("Set traverse", () => {
  const t1 = S.traverse(O.MonadOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(S.empty()), O.some(S.empty()));
  assertEquals(t2(S.set(1, 2, 3)), O.some(S.set(1, 2, 3)));
  assertEquals(t2(S.set(0, 1, 2)), O.none);
});

Deno.test("Set FunctorSet", () => {
  assertStrictEquals(S.FunctorSet.map, S.map);
});

Deno.test("Set ApplySet", () => {
  assertStrictEquals(S.ApplySet.map, S.map);
  assertStrictEquals(S.ApplySet.ap, S.ap);
});

Deno.test("Set ApplicativeSet", () => {
  assertStrictEquals(S.ApplicativeSet.of, S.of);
  assertStrictEquals(S.ApplicativeSet.ap, S.ap);
  assertStrictEquals(S.ApplicativeSet.map, S.map);
});

Deno.test("Set ChainSet", () => {
  assertStrictEquals(S.ChainSet.ap, S.ap);
  assertStrictEquals(S.ChainSet.map, S.map);
  assertStrictEquals(S.ChainSet.chain, S.chain);
});

Deno.test("Set MonadSet", () => {
  assertStrictEquals(S.MonadSet.of, S.of);
  assertStrictEquals(S.MonadSet.ap, S.ap);
  assertStrictEquals(S.MonadSet.map, S.map);
  assertStrictEquals(S.MonadSet.join, S.join);
  assertStrictEquals(S.MonadSet.chain, S.chain);
});

Deno.test("Set FilterableSet", () => {
  assertStrictEquals(S.FilterableSet.filter, S.filter);
  assertStrictEquals(S.FilterableSet.filterMap, S.filterMap);
  assertStrictEquals(S.FilterableSet.partition, S.partition);
  assertStrictEquals(S.FilterableSet.partitionMap, S.partitionMap);
});

Deno.test("Set TraversableSet", () => {
  assertStrictEquals(S.TraversableSet.map, S.map);
  assertStrictEquals(S.TraversableSet.reduce, S.reduce);
  assertStrictEquals(S.TraversableSet.traverse, S.traverse);
});

Deno.test("Set getShow", () => {
  const { show } = S.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(S.empty()), "Set([])");
  assertEquals(show(S.set(1, 2, 3)), "Set([1, 2, 3])");
});

Deno.test("Set getEq", () => {
  const eq = S.getEq(EqNumber);
  assertEquals(pipe(S.empty(), eq.equals(S.empty())), true);
  assertEquals(pipe(set, eq.equals(S.empty())), false);
  assertEquals(pipe(set, eq.equals(S.set(3, 2, 2, 1))), true);
});

Deno.test("Set getUnionMonoid", () => {
  const monoid = S.getUnionMonoid(EqNumber);
  const concatAll = M.concatAll(monoid);

  assertEquals(concatAll([]), S.empty());
  assertEquals(concatAll([S.empty()]), S.empty());
  assertEquals(
    concatAll([
      S.set(1, 2, 3),
      S.set(4, 5, 6),
      S.set(1, 3, 5, 7),
    ]),
    S.set(1, 2, 3, 4, 5, 6, 7),
  );
});
