import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as A from "../array.ts";
import * as O from "../option.ts";
import * as P from "../pair.ts";
import * as N from "../number.ts";
import * as E from "../either.ts";
import { ComparableBoolean } from "../boolean.ts";
import { pipe } from "../fn.ts";

Deno.test("Array init", () => assertEquals(A.init(), []));

Deno.test("Array _unsafeUpdateAt", () => {
  const t1 = [1, 2, 3];
  const r1 = A._unsafeUpdateAt(0, 1, t1);
  assertStrictEquals(t1, r1);
});

Deno.test("Array _unsafeAppend", () => {
  const f1 = A._unsafeAppend(0);
  const t1 = [1, 2, 3];
  const r1 = f1(t1);
  assertEquals(r1, [1, 2, 3, 0]);
  assertStrictEquals(t1, r1);
});

Deno.test("Array _unsafePush", () => {
  const value = [1, 2, 3];
  const result = A._unsafePush(value, 4);
  assertEquals(result, [1, 2, 3, 4]);
  assertStrictEquals(value, result);
});

Deno.test("Array _unsafePrepend", () => {
  const f1 = A._unsafePrepend(0);
  const t1 = [1, 2, 3];
  const r1 = f1(t1);
  assertEquals(r1, [0, 1, 2, 3]);
  assertStrictEquals(t1, r1);
});

Deno.test("Array isEmpty", () => {
  const t1: never[] = [];
  const t2 = [1, 2, 3];
  assertEquals(A.isEmpty(t1), true);
  assertEquals(A.isEmpty(t2), false);
});

Deno.test("Array traverse", () => {
  const traverseOption = A.traverse(O.FlatmappableOption);

  assertEquals(typeof traverseOption, "function");

  const sequence = traverseOption((a: O.Option<number>) => a);
  const add = traverseOption((a: number, i: number) => O.some(a + i));

  assertEquals(typeof sequence, "function");

  assertEquals(
    sequence([O.some(1), O.some(2), O.some(3)]),
    O.some([1, 2, 3]),
  );
  assertEquals(sequence([O.some(1), O.some(2), O.none]), O.none);

  assertEquals(add([1, 2, 3]), O.some([1, 3, 5]));
  assertEquals(add([]), O.some([]));
});

Deno.test("Array wrap", () => {
  assertEquals(A.wrap(1), [1]);
});

Deno.test("Array alt", () => {
  const full = [1, 2, 3];
  const init1 = [] as number[];
  const init2 = [] as number[];
  assertStrictEquals(pipe(full, A.alt(init1)), full);
  assertStrictEquals(pipe(init1, A.alt(init2)), init2);
  assertStrictEquals(pipe(init1, A.alt(full)), full);
});

Deno.test("Array ap", () => {
  const add = (n: number) => n + 1;
  const badd = (n: number) => n + 100;
  assertEquals(pipe(A.wrap(add), A.apply(A.wrap(1))), A.wrap(2));
  assertEquals(pipe(A.wrap(add), A.apply(A.init())), A.init());
  assertEquals(pipe(A.init(), A.apply(A.wrap(1))), A.init());
  assertEquals(pipe(A.init(), A.apply(A.init())), A.init());
  assertEquals(
    pipe(A.array(add, badd), A.apply(A.array(1, 2))),
    A.array(2, 3, 101, 102),
  );
});

Deno.test("Array join", () => {
  assertEquals(A.join([]), []);
  assertEquals(pipe([[1], [2], [3]], A.join), [1, 2, 3]);
});

Deno.test("Array flatmap", () => {
  assertEquals(pipe([], A.flatmap((n: number) => [n, n + 1])), []);
  assertEquals(pipe([1, 2, 3], A.flatmap((n) => [n, n + 1])), [
    1,
    2,
    2,
    3,
    3,
    4,
  ]);
});

Deno.test("Array reduce", () => {
  assertEquals(pipe([1, 2, 3], A.reduce((a, b) => a + b, 0)), 6);
});

Deno.test("Array traverse", () => {
  const traverse = A.traverse(A.FlatmappableArray);

  assertEquals(pipe([1, 2, 3], traverse((n) => [n])), [[1, 2, 3]]);
});

Deno.test("Array indexedMap", () => {
  assertEquals(pipe([1, 2, 3], A.map((n, i) => n + i)), [1, 3, 5]);
});

Deno.test("Array indexedReduce", () => {
  assertEquals(pipe([1, 2, 3], A.reduce((a, b, i) => a + b + i, 0)), 9);
});

Deno.test("Array indexedTraverse", () => {
  const traverse = A.traverse(A.FlatmappableArray);

  assertEquals(pipe([1, 2, 3], traverse((n, i) => [n + i])), [[
    1,
    3,
    5,
  ]]);
});

Deno.test("Array filter", () => {
  assertEquals(pipe([], A.filter((n: number) => n > 1)), []);
  assertEquals(pipe([1, 2, 3], A.filter((n) => n > 1)), [2, 3]);
});

Deno.test("Array filterMap", () => {
  const fn = (str: string) =>
    str.length % 2 === 0 ? O.some(str.length) : O.none;
  assertEquals(pipe([], A.filterMap(fn)), []);
  assertEquals(
    pipe(["H", "He", "Hel", "Hell", "Hello"], A.filterMap(fn)),
    [
      2,
      4,
    ],
  );
});

Deno.test("Array partition", () => {
  const values = A.range(10);
  const even = A.range(5, 0, 2);
  const odd = A.range(5, 1, 2);
  const filter = (n: number) => n % 2 === 0;
  assertEquals(pipe([], A.partition(filter)), P.pair([], []));
  assertEquals(pipe(values, A.partition(filter)), P.pair(even, odd));
});

Deno.test("Array partitionMap", () => {
  const values = A.range(10);
  const even = A.range(5, 10, 2);
  const odd = A.range(5, 11, 2);
  const filter = (n: number) => n % 2 === 0 ? E.right(10 + n) : E.left(10 + n);
  assertEquals(pipe([], A.partitionMap(filter)), P.pair([], []));
  assertEquals(pipe(values, A.partitionMap(filter)), P.pair(even, odd));
});

Deno.test("Array append", () => {
  const f1 = A.append(0);
  const t1 = [1, 2, 3];
  const r1 = f1(t1);
  assertEquals(r1, [1, 2, 3, 0]);
  assertNotStrictEquals(t1, r1);
});

Deno.test("Array prepend", () => {
  const f1 = A.prepend(0);
  const t1 = [1, 2, 3];
  const r1 = f1(t1);
  assertEquals(r1, [0, 1, 2, 3]);
  assertNotStrictEquals(t1, r1);
});

Deno.test("Array insert", () => {
  assertEquals(pipe([1, 2, 3], A.insert(10)(0)), [10, 1, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.insert(10)(3)), [1, 2, 3, 10]);
  assertEquals(pipe([1, 2, 3], A.insert(10)(5)), [1, 2, 3]);
});

Deno.test("Array insertAt", () => {
  assertEquals(pipe([1, 2, 3], A.insertAt(0)(10)), [10, 1, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.insertAt(3)(10)), [1, 2, 3, 10]);
  assertEquals(pipe([1, 2, 3], A.insertAt(5)(10)), [1, 2, 3]);
});

Deno.test("Array update", () => {
  assertEquals(pipe([1, 2, 3], A.update(10)(0)), [10, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.update(10)(2)), [1, 2, 10]);
  assertEquals(pipe([1, 2, 3], A.update(10)(5)), [1, 2, 3]);
});

Deno.test("Array updateAt", () => {
  assertEquals(pipe([1, 2, 3], A.updateAt(0)(10)), [10, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.updateAt(2)(10)), [1, 2, 10]);
  assertEquals(pipe([1, 2, 3], A.updateAt(5)(10)), [1, 2, 3]);
});

Deno.test("Array modify", () => {
  const fn = (n: number) => n + 1;
  const mod = A.modify(fn);
  assertEquals(pipe([1, 2, 3], mod(-1)), [1, 2, 3]);
  assertEquals(pipe([1, 2, 3], mod(0)), [2, 2, 3]);
  assertEquals(pipe([1, 2, 3], mod(2)), [1, 2, 4]);
  assertEquals(pipe([1, 2, 3], mod(10)), [1, 2, 3]);
});

Deno.test("Array modifyAt", () => {
  const fn = (n: number) => n + 1;
  assertEquals(pipe([1, 2, 3], A.modifyAt(-1)(fn)), [1, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.modifyAt(0)(fn)), [2, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.modifyAt(2)(fn)), [1, 2, 4]);
  assertEquals(pipe([1, 2, 3], A.modifyAt(10)(fn)), [1, 2, 3]);
});

Deno.test("Array lookup", () => {
  assertEquals(pipe([1, 2, 3], A.lookup(1)), O.some(2));
  assertEquals(pipe([], A.lookup(1)), O.none);
});

Deno.test("Array deleteAt", () => {
  assertEquals(pipe([1, 2, 3], A.deleteAt(0)), [2, 3]);
  assertEquals(pipe([1, 2, 3], A.deleteAt(2)), [1, 2]);
  assertEquals(pipe([1, 2, 3], A.deleteAt(5)), [1, 2, 3]);
});

Deno.test("Array sort", () => {
  const t1 = [] as number[];
  const r1 = pipe(t1, A.sort(N.SortableNumber));
  assertEquals(r1, t1);
  assertNotStrictEquals(r1, t1);

  const t2 = [1];
  const r2 = pipe(t2, A.sort(N.SortableNumber));
  assertEquals(r2, t2);
  assertNotStrictEquals(r2, t2);

  const t3 = [3, 1, 2];
  const r3 = pipe(t3, A.sort(N.SortableNumber));
  assertEquals(r3, [1, 2, 3]);
  assertEquals(t3, [3, 1, 2]);

  const t4 = A.range(0, 1_000);
  const r4 = pipe(t4, A.sort(N.SortableNumber));
  assertEquals(r4, t4);
  assertNotStrictEquals(r4, t4);
});

Deno.test("Array binarySearch", () => {
  const sorted = A.range(100);
  const search = A.binarySearch(N.SortableNumber);
  assertEquals(search(0, sorted), 0);
  assertEquals(search(50, sorted), 50);
  assertEquals(search(100, sorted), 100);
  assertEquals(search(1000, sorted), 100);
});

Deno.test("Array orderedInsert", () => {
  const even = A.range(5, 0, 2);
  const ins = A.orderedInsert(N.SortableNumber);
  assertEquals(pipe(even, ins(7, 5, 3, 1, 9)), A.range(10));
  assertEquals(pipe([], ins(3, 5, 1)), [1, 3, 5]);
});

Deno.test("Array zip", () => {
  const arr = [1, 2, 3];
  assertEquals(A.zip(), []);
  assertStrictEquals(A.zip(arr), arr);
  assertEquals(A.zip([], A.range(100)), []);
  assertEquals(A.zip([1], A.range(100)), [[1, 0]]);
  assertEquals(A.zip([1, 2, 3], ["a", "b", "c"]), [[1, "a"], [2, "b"], [
    3,
    "c",
  ]]);
});

Deno.test("Array range", () => {
  assertEquals(A.range(0), []);
  assertEquals(A.range(1), [0]);
  assertEquals(A.range(2), [0, 1]);
  assertEquals(A.range(0, 1), []);
  assertEquals(A.range(1, 1), [1]);
  assertEquals(A.range(2, 1), [1, 2]);
  assertEquals(A.range(0, 1, -1), []);
  assertEquals(A.range(1, 1, -1), [1]);
  assertEquals(A.range(2, 1, -1), [1, 0]);
  assertEquals(A.range(-1, 1, 1), []);
});

Deno.test("Array getComparableArray", () => {
  const eq = A.getComparableArray(ComparableBoolean);
  const values = [true, false];

  assertEquals(eq.compare(values)(values), true);
  assertEquals(eq.compare([])([]), true);
  assertEquals(eq.compare([true])([]), false);
  assertEquals(eq.compare([true])([false]), false);
  assertEquals(eq.compare([true])([false, true]), false);
  assertEquals(eq.compare([true, false])([true, false]), true);
});

Deno.test("Array getSortableArray", () => {
  const ord = A.getSortableArray(N.SortableNumber);

  assertEquals(ord.sort([], []), 0);
  assertEquals(ord.sort([1], []), 1);
  assertEquals(ord.sort([1, 2], [1]), 1);
  assertEquals(ord.sort([1, 2], [1, 1]), 1);
  assertEquals(ord.sort([], [1]), -1);
  assertEquals(ord.sort([1], [1, 2]), -1);
  assertEquals(ord.sort([1, 2], [2, 1]), -1);
});

Deno.test("Array getInitializableArray", () => {
  const semigroup = A.getInitializableArray<number>();

  assertEquals(semigroup.combine([])([]), []);
  assertEquals(semigroup.combine([1])([]), [1]);
  assertEquals(semigroup.combine([])([1]), [1]);
  assertEquals(semigroup.combine([4, 5, 6])([1, 2, 3]), [
    1,
    2,
    3,
    4,
    5,
    6,
  ]);
});

Deno.test("Array getShowableArray", () => {
  const show = A.getShowableArray({ show: (n: number) => n.toString() });

  assertEquals(show.show([]), "ReadonlyArray[]");
  assertEquals(show.show([1, 2, 3]), "ReadonlyArray[1, 2, 3]");
});
