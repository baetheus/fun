import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as S from "../set.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import * as M from "../combinable.ts";
import { ComparableNumber } from "../number.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;
const set = S.set(1, 2, 3);

Deno.test("Set init", () => {
  assertEquals(S.init(), new Set());
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
  const elem = S.elem(ComparableNumber);
  assertEquals(pipe(S.set(1), elem(1)), true);
  assertEquals(pipe(S.set(1), elem(2)), false);
});

Deno.test("Set elemOf", () => {
  const elemOf = S.elemOf(ComparableNumber);
  assertEquals(pipe(1, elemOf(S.set(1))), true);
  assertEquals(pipe(2, elemOf(S.set(1))), false);
});

Deno.test("Set isSubset", () => {
  const isSubset = S.isSubset(ComparableNumber);
  const ta = S.set(1);
  const tb = S.set(1, 2);
  assertEquals(pipe(ta, isSubset(tb)), true);
  assertEquals(pipe(tb, isSubset(ta)), false);
});

Deno.test("Set union", () => {
  const union = S.union(ComparableNumber);
  assertEquals(pipe(S.set(1), union(S.set(2))), S.set(1, 2));
});

Deno.test("Set intersection", () => {
  const intersection = S.intersection(ComparableNumber);
  assertEquals(pipe(S.set(1), intersection(S.set(2))), S.init());
  assertEquals(pipe(S.set(1, 2), intersection(S.set(2, 3))), S.set(2));
});

Deno.test("Set compact", () => {
  const compact = S.compact(ComparableNumber);
  assertEquals(compact(S.set(1, 2, 3)), S.set(1, 2, 3));
});

Deno.test("Set of", () => {
  assertEquals(S.wrap(1), S.set(1));
});

Deno.test("Set map", () => {
  assertEquals(pipe(S.init(), S.map(add)), S.init());
  assertEquals(pipe(S.set(1, 2, 3), S.map(add)), S.set(2, 3, 4));
});

Deno.test("Set ap", () => {
  const add = (n: number) => n + 1;
  assertEquals(pipe(S.wrap(add), S.apply(S.wrap(1))), S.wrap(2));
  assertEquals(pipe(S.init(), S.apply(S.wrap(1))), S.init());
  assertEquals(pipe(S.wrap(add), S.apply(S.init())), S.init());
  assertEquals(pipe(S.init(), S.apply(S.init())), S.init());
  assertEquals(pipe(S.wrap(add), S.apply(S.set(1, 2))), S.set(2, 3));
});

Deno.test("Set flatmap", () => {
  const fn = (n: number) => S.set(n - 1, n, n + 1);
  assertEquals(pipe(S.init<number>(), S.flatmap(fn)), S.init());
  assertEquals(pipe(set, S.flatmap(fn)), S.set(0, 1, 2, 3, 4));
});

Deno.test("Set join", () => {
  assertEquals(S.join(S.init()), S.init());
  assertEquals(S.join(S.set(S.init())), S.init());
  assertEquals(S.join(S.set(S.set(1, 2), S.set(2, 3))), S.set(1, 2, 3));
});

Deno.test("Set filter", () => {
  const filter = S.filter((n: number) => n > 0);
  assertEquals(filter(S.set(1, 2, 3)), S.set(1, 2, 3));
  assertEquals(filter(S.set(-1, 0, 1)), S.set(1));
});

Deno.test("Set filterMap", () => {
  const filterMap = S.filterMap(O.fromPredicate((n: number) => n > 1));
  assertEquals(filterMap(S.init()), S.init());
  assertEquals(filterMap(set), S.set(2, 3));
});

Deno.test("Set partition", () => {
  const partition = S.partition((n: number) => n > 1);
  assertEquals(partition(S.init()), [S.init(), S.init()]);
  assertEquals(partition(set), [S.set(2, 3), S.set(1)]);
});

Deno.test("Set partitionMap", () => {
  const partitionMap = S.partitionMap((n: number) =>
    n > 1 ? E.right(n) : E.left(n)
  );
  assertEquals(partitionMap(S.init()), [S.init(), S.init()]);
  assertEquals(partitionMap(set), [S.set(2, 3), S.set(1)]);
});

Deno.test("Set fold", () => {
  const fold = S.fold((n: number, o: number) => n + o, 0);
  assertEquals(fold(S.init()), 0);
  assertEquals(fold(S.set(1, 2, 3)), 6);
});

Deno.test("Set traverse", () => {
  const t1 = S.traverse(O.FlatmappableOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(S.init()), O.some(S.init()));
  assertEquals(t2(S.set(1, 2, 3)), O.some(S.set(1, 2, 3)));
  assertEquals(t2(S.set(0, 1, 2)), O.none);
});

Deno.test("Set MappableSet", () => {
  assertStrictEquals(S.MappableSet.map, S.map);
});

Deno.test("Set ApplicableSet", () => {
  assertStrictEquals(S.ApplicableSet.wrap, S.wrap);
  assertStrictEquals(S.ApplicableSet.apply, S.apply);
  assertStrictEquals(S.ApplicableSet.map, S.map);
});

Deno.test("Set FlatmappableSet", () => {
  assertStrictEquals(S.FlatmappableSet.wrap, S.wrap);
  assertStrictEquals(S.FlatmappableSet.apply, S.apply);
  assertStrictEquals(S.FlatmappableSet.map, S.map);
  assertStrictEquals(S.FlatmappableSet.flatmap, S.flatmap);
});

Deno.test("Set FilterableSet", () => {
  assertStrictEquals(S.FilterableSet.filter, S.filter);
  assertStrictEquals(S.FilterableSet.filterMap, S.filterMap);
  assertStrictEquals(S.FilterableSet.partition, S.partition);
  assertStrictEquals(S.FilterableSet.partitionMap, S.partitionMap);
});

Deno.test("Set TraversableSet", () => {
  assertStrictEquals(S.TraversableSet.map, S.map);
  assertStrictEquals(S.TraversableSet.fold, S.fold);
  assertStrictEquals(S.TraversableSet.traverse, S.traverse);
});

Deno.test("Set getShowableSet", () => {
  const { show } = S.getShowableSet({ show: (n: number) => n.toString() });
  assertEquals(show(S.init()), "Set([])");
  assertEquals(show(S.set(1, 2, 3)), "Set([1, 2, 3])");
});

Deno.test("Set getComparableSet", () => {
  const eq = S.getComparableSet(ComparableNumber);
  assertEquals(pipe(S.init(), eq.compare(S.init())), true);
  assertEquals(pipe(set, eq.compare(S.init())), false);
  assertEquals(pipe(set, eq.compare(S.set(3, 2, 2, 1))), true);
});

Deno.test("Set getCombinableSet", () => {
  const monoid = S.getCombinableSet(ComparableNumber);
  const combineAll = M.getCombineAll(monoid);

  assertEquals(combineAll(S.init()), S.init());
  assertEquals(
    combineAll(
      S.set(1, 2, 3),
      S.set(4, 5, 6),
      S.set(1, 3, 5, 7),
    ),
    S.set(1, 2, 3, 4, 5, 6, 7),
  );
});

Deno.test("Set getInitializableSet", () => {
  const monoid = S.getInitializableSet(ComparableNumber);
  const combineAll = M.getCombineAll(monoid);

  assertEquals(monoid.init(), S.init());
  assertEquals(combineAll(S.init()), S.init());
  assertEquals(
    combineAll(
      S.set(1, 2, 3),
      S.set(4, 5, 6),
      S.set(1, 3, 5, 7),
    ),
    S.set(1, 2, 3, 4, 5, 6, 7),
  );
});
