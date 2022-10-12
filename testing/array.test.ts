import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as A from "../array.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import { SetoidBoolean } from "../boolean.ts";
import { pipe } from "../fn.ts";

Deno.test("Array empty", () => assertEquals(A.empty(), []));

Deno.test("Array unsafeUpdateAt", () => {
  const t1 = [1, 2, 3];
  const r1 = A.unsafeUpdateAt(0, 1, t1);
  assertStrictEquals(t1, r1);
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

Deno.test("Array unsafeAppend", () => {
  const f1 = A.unsafeAppend(0);
  const t1 = [1, 2, 3];
  const r1 = f1(t1);
  assertEquals(r1, [1, 2, 3, 0]);
  assertStrictEquals(t1, r1);
});

Deno.test("Array unsafePrepend", () => {
  const f1 = A.unsafePrepend(0);
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
  const traverseOption = A.traverse(O.MonadThrowOption);

  assertEquals(typeof traverseOption, "function");

  const sequence = traverseOption((a: O.Option<number>) => a);
  const add = traverseOption((a: number, i: number) => O.some(a + i));

  assertEquals(typeof sequence, "function");

  assertEquals(sequence([O.some(1), O.some(2), O.some(3)]), O.some([1, 2, 3]));
  assertEquals(sequence([O.some(1), O.some(2), O.none]), O.none);

  assertEquals(add([1, 2, 3]), O.some([1, 3, 5]));
  assertEquals(add([]), O.some([]));
});

Deno.test("Array getSetoid", () => {
  const setoid = A.getSetoid(SetoidBoolean);

  assertEquals(setoid.equals([])([]), true);
  assertEquals(setoid.equals([true])([]), false);
  assertEquals(setoid.equals([true])([false]), false);
  assertEquals(setoid.equals([true])([false, true]), false);
  assertEquals(setoid.equals([true, false])([true, false]), true);
});

Deno.test("Array getOrd", () => {
  const ord = A.getOrd(N.OrdNumber);

  assertEquals(ord.lte([])([]), true);
  assertEquals(ord.lte([1])([]), true);
  assertEquals(ord.lte([1, 2])([1]), true);
  assertEquals(ord.lte([1, 2])([1, 1]), true);
  assertEquals(ord.lte([])([1]), false);
  assertEquals(ord.lte([1])([1, 2]), false);
  assertEquals(ord.lte([1, 2])([2, 1]), false);
});

Deno.test("Array getSemigroup", () => {
  const semigroup = A.getSemigroup<number>();

  assertEquals(semigroup.concat([] as number[])([] as number[]), []);
  assertEquals(semigroup.concat([4, 5, 6])([1, 2, 3]), [1, 2, 3, 4, 5, 6]);
});

Deno.test("Array getShow", () => {
  const show = A.getShow({ show: (n: number) => n.toString() });

  assertEquals(show.show([]), "ReadonlyArray[]");
  assertEquals(show.show([1, 2, 3]), "ReadonlyArray[1, 2, 3]");
});

Deno.test("Array getMonoid", () => {
  const monoid = A.getMonoid<number>();

  assertEquals(monoid.empty(), []);
  assertEquals(monoid.concat([3, 4])([1, 2]), [1, 2, 3, 4]);
});

Deno.test("Array of", () => {
  assertEquals(A.of(1), [1]);
});

Deno.test("Array ap", () => {
  assertEquals(pipe([], A.ap([(n: number) => 2 * n])), []);
  assertEquals(pipe([1, 2, 3], A.ap([])), []);
  assertEquals(
    pipe([1, 2, 3], A.ap([(n: number) => 2 * n, (n: number) => n])),
    [2, 4, 6, 1, 2, 3],
  );
});

Deno.test("Array join", () => {
  assertEquals(A.join([]), []);
  assertEquals(pipe([[1], [2], [3]], A.join), [1, 2, 3]);
});

Deno.test("Array chain", () => {
  assertEquals(pipe([], A.chain((n: number) => [n, n + 1])), []);
  assertEquals(pipe([1, 2, 3], A.chain((n) => [n, n + 1])), [1, 2, 2, 3, 3, 4]);
});

Deno.test("Array reduce", () => {
  assertEquals(pipe([1, 2, 3], A.reduce((a, b) => a + b, 0)), 6);
});

Deno.test("Array traverse", () => {
  const traverse = A.traverse(A.MonadArray);

  assertEquals(pipe([1, 2, 3], traverse((n) => [n])), [[1, 2, 3]]);
});

Deno.test("Array indexedMap", () => {
  assertEquals(pipe([1, 2, 3], A.map((n, i) => n + i)), [1, 3, 5]);
});

Deno.test("Array indexedReduce", () => {
  assertEquals(pipe([1, 2, 3], A.reduce((a, b, i) => a + b + i, 0)), 9);
});

Deno.test("Array indexedTraverse", () => {
  const traverse = A.traverse(A.MonadArray);

  assertEquals(pipe([1, 2, 3], traverse((n, i) => [n + i])), [[1, 3, 5]]);
});

Deno.test("Array filter", () => {
  assertEquals(pipe([], A.filter((n: number) => n > 1)), []);
  assertEquals(pipe([1, 2, 3], A.filter((n) => n > 1)), [2, 3]);
});

Deno.test("Array createSequence", () => {
  const sequence = A.createSequence(A.MonadArray);
  assertEquals(sequence([]), [[]]);
  assertEquals(sequence([[1]]), [[1]]);
  assertEquals(sequence([[], [1]]), []);
  assertEquals(sequence([[1], [2], [3]]), [[1, 2, 3]]);
  assertEquals(sequence([[1, 2], [3, 4]]), [[1, 3], [1, 4], [2, 3], [2, 4]]);
});

Deno.test("Array lookup", () => {
  assertEquals(pipe([1, 2, 3], A.lookup(1)), O.some(2));
  assertEquals(pipe([], A.lookup(1)), O.none);
});

Deno.test("Array insertAt", () => {
  assertEquals(pipe([1, 2, 3], A.insertAt(0)(10)), [10, 1, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.insertAt(3)(10)), [1, 2, 3, 10]);
  assertEquals(pipe([1, 2, 3], A.insertAt(5)(10)), [1, 2, 3]);
});

Deno.test("Array updateAt", () => {
  assertEquals(pipe([1, 2, 3], A.updateAt(0)(10)), [10, 2, 3]);
  assertEquals(pipe([1, 2, 3], A.updateAt(2)(10)), [1, 2, 10]);
  assertEquals(pipe([1, 2, 3], A.updateAt(5)(10)), [1, 2, 3]);
});

Deno.test("Array deleteAt", () => {
  assertEquals(pipe([1, 2, 3], A.deleteAt(0)), [2, 3]);
  assertEquals(pipe([1, 2, 3], A.deleteAt(2)), [1, 2]);
  assertEquals(pipe([1, 2, 3], A.deleteAt(5)), [1, 2, 3]);
});

Deno.test("Array range", () => {
  assertEquals(A.range(0, 0), []);
  assertEquals(A.range(0, 1), [0, 1]);
  assertEquals(A.range(1, 5), [1, 2, 3, 4, 5]);
  assertEquals(A.range(10, 15), [10, 11, 12, 13, 14, 15]);
  assertEquals(A.range(-1, 0), [-1, 0]);
  assertEquals(A.range(-5, -1), [-5, -4, -3, -2, -1]);
  // out of bound
  assertEquals(A.range(2, 1), []);
  assertEquals(A.range(-1, -2), []);
});

Deno.test("Array zipWith", () => {
  assertEquals(
    pipe([1, 2, 3], A.zipWith(["a", "b", "c", "d"], (n, s) => s + n)),
    ["a1", "b2", "c3"],
  );
});

Deno.test("Array zip", () => {
  assertEquals(pipe([], A.zip(["a", "b", "c", "d"])), []);
  assertEquals(pipe(["a", "b", "c", "d"], A.zip([])), []);
  assertEquals(
    pipe([1, 2, 3], A.zip(["a", "b", "c", "d"])),
    [[1, "a"], [2, "b"], [3, "c"]],
  );
  assertEquals(
    pipe([1, 2, 3, 4], A.zip(["a", "b", "c"])),
    [[1, "a"], [2, "b"], [3, "c"]],
  );
  const largeArray = A.range(0, 10000);
  assertEquals(
    pipe(largeArray, A.zip(largeArray)),
    pipe(largeArray, A.map((n) => [n, n])),
  );
});

Deno.test("Array unzip", () => {
  assertEquals(
    A.unzip([[1, "a"], [2, "b"], [3, "c"]]),
    [[1, 2, 3], ["a", "b", "c"]],
  );
});

Deno.test("Array sort", () => {
  const t1 = [] as number[];
  const r1 = pipe(t1, A.sort(N.OrdNumber));
  assertEquals(r1, t1);
  assertNotStrictEquals(r1, t1);

  const t2 = [1];
  const r2 = pipe(t2, A.sort(N.OrdNumber));
  assertEquals(r2, t2);
  assertNotStrictEquals(r2, t2);

  const t3 = [3, 1, 2];
  const r3 = pipe(t3, A.sort(N.OrdNumber));
  assertEquals(r3, [1, 2, 3]);
  assertEquals(t3, [3, 1, 2]);

  const t4 = A.range(0, 1_000);
  const r4 = pipe(t4, A.sort(N.OrdNumber));
  assertEquals(r4, t4);
  assertNotStrictEquals(r4, t4);
});
