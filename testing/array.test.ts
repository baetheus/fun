import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import type * as HKT from "../hkt.ts";

import * as A from "../array.ts";
import * as O from "../option.ts";
import { setoidBoolean } from "../setoid.ts";
import { ordNumber } from "../ord.ts";
import { semigroupSum } from "../semigroup.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

/*******************************************************************************
 * Constructors
 ******************************************************************************/

Deno.test("Array zero", () => assertEquals(A.zero, []));

Deno.test("Array empty", () => assertEquals(A.empty(), []));

/*******************************************************************************
 * Modules
 ******************************************************************************/

Deno.test("Array Functor", () => {
  AS.assertFunctor(
    A.Functor,
    {
      ta: [1, 2, 3],
      fai: (n: number) => n + 1,
      fij: (n: number) => n + 2,
    },
  );
});

Deno.test("Array Apply", () => {
  AS.assertApply(A.Apply, {
    ta: A.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: [AS.add, AS.multiply],
    tfij: [AS.multiply, AS.add],
  });
});

Deno.test("Array Applicative", () => {
  AS.assertApplicative(A.Applicative, {
    a: 1,
    ta: A.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: [AS.add, AS.multiply],
    tfij: [AS.multiply, AS.add],
  });
});

Deno.test("Array Chain", () => {
  AS.assertChain(A.Chain, {
    a: 1,
    ta: A.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: [AS.add, AS.multiply],
    tfij: [AS.multiply, AS.add],
    fati: AS.wrapAdd(A.Applicative),
    fitj: AS.wrapMultiply(A.Applicative),
  });
});

Deno.test("Array Monad", () => {
  AS.assertMonad(A.Monad, {
    a: 1,
    ta: A.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: [AS.add, AS.multiply],
    tfij: [AS.multiply, AS.add],
    fati: AS.wrapAdd(A.Applicative),
    fitj: AS.wrapMultiply(A.Applicative),
  });
});

Deno.test("Array Alt", () => {
  AS.assertAlt(A.Alt, {
    ta: A.of(1),
    tb: [],
    tc: [1, 2, 3],
    fai: AS.add,
    fij: AS.multiply,
  });
});

Deno.test("Array Filterable", () => {
  AS.assertFilterable(A.Filterable, {
    a: [1, 2, 3, 4, 5],
    b: [5, 4, 3, 2, 1],
    f: (n: number): boolean => n < 2,
    g: (n: number): boolean => n > 4,
  });
});

Deno.test("Array Foldable", () => {
  AS.assertFoldable(A.Foldable, {
    a: 1,
    tb: [1, 2, 3],
    faia: (a: number, i: number) => a + i,
  });
});

Deno.test("Array IndexedFoldable", () => {
  AS.assertIndexedFoldable<
    A.URI,
    number,
    number,
    number,
    number,
    number,
    number
  >(A.IndexedFoldable, {
    a: 1,
    tb: [1, 2, 3],
    faia: (a: number, i: number, index: number) => a + i + index,
  });
});

Deno.test("Array IndexedTraversable", () => {
  const traverseOption = A.IndexedTraversable.traverse(O.Applicative);
  const sequence = traverseOption((a: O.Option<number>) => a);
  const add = traverseOption((a: number, i: number) => O.some(a + i));

  assertEquals(sequence([O.some(1), O.some(2), O.some(3)]), O.some([1, 2, 3]));
  assertEquals(sequence([O.some(1), O.some(2), O.none]), O.none);

  assertEquals(add([1, 2, 3]), O.some([1, 3, 5]));
});

Deno.test("Array getSetoid", () => {
  const setoid = A.getSetoid(setoidBoolean);

  assertEquals(setoid.equals([])([]), true);
  assertEquals(setoid.equals([true])([]), false);
  assertEquals(setoid.equals([true])([false]), false);
  assertEquals(setoid.equals([true])([false, true]), false);
  assertEquals(setoid.equals([true, false])([true, false]), true);
});

Deno.test("Array getOrd", () => {
  const ord = A.getOrd(ordNumber);

  assertEquals(ord.lte([])([]), true);
  assertEquals(ord.lte([])([1]), true);
  assertEquals(ord.lte([1])([1, 2]), true);
});

Deno.test("Array getSemigroup", () => {
  const semigroup = A.getSemigroup<number>();

  assertEquals(semigroup.concat([] as number[])([] as number[]), []);
  assertEquals(semigroup.concat([1, 2, 3])([4, 5, 6]), [1, 2, 3, 4, 5, 6]);
});

Deno.test("Array getShow", () => {
  const show = A.getShow({ show: (n: number) => n.toString() });

  assertEquals(show.show([]), "ReadonlyArray[]");
  assertEquals(show.show([1, 2, 3]), "ReadonlyArray[1, 2, 3]");
});

Deno.test("Array getMonoid", () => {
  const monoid = A.getMonoid<number>();

  assertEquals(monoid.empty(), []);
  assertEquals(monoid.concat([1, 2])([3, 4]), [1, 2, 3, 4]);
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

Deno.test("Array map", () => {
  assertEquals(pipe([1, 2, 3], A.map((n) => n + 1)), [2, 3, 4]);
});

Deno.test("Array join", () => {
  assertEquals(pipe([[1], [2], [3]], A.join), [1, 2, 3]);
});

Deno.test("Array chain", () => {
  assertEquals(pipe([1, 2, 3], A.chain((n) => [n, n + 1])), [1, 2, 2, 3, 3, 4]);
});

Deno.test("Array reduce", () => {
  assertEquals(pipe([1, 2, 3], A.reduce((a, b) => a + b, 0)), 6);
});

Deno.test("Array traverse", () => {
  const traverse = A.traverse(A.Applicative);

  assertEquals(pipe([1, 2, 3], traverse((n) => [n])), [[1, 2, 3]]);
});

Deno.test("Array indexedMap", () => {
  assertEquals(pipe([1, 2, 3], A.indexedMap((n, i) => n + i)), [1, 3, 5]);
});

Deno.test("Array indexedReduce", () => {
  assertEquals(pipe([1, 2, 3], A.indexedReduce((a, b, i) => a + b + i, 0)), 9);
});

Deno.test("Array indexedTraverse", () => {
  const traverse = A.indexedTraverse(A.Applicative);

  assertEquals(pipe([1, 2, 3], traverse((n, i) => [n + i])), [[1, 3, 5]]);
});

Deno.test("Array filter", () => {
  assertEquals(pipe([1, 2, 3], A.filter((n) => n > 1)), [2, 3]);
});

Deno.test("Array lookup", () => {
  assertEquals(pipe([1, 2, 3], A.lookup(1)), O.some(2));
  assertEquals(pipe([], A.lookup(1)), O.none);
});

Deno.test("Array insertAt", () => {
  assertEquals(pipe([1, 2, 3], A.insertAt(0, 10)), O.some([10, 1, 2, 3]));
  assertEquals(pipe([1, 2, 3], A.insertAt(3, 10)), O.some([1, 2, 3, 10]));
  assertEquals(pipe([1, 2, 3], A.insertAt(5, 10)), O.none);
});

Deno.test("Array updateAt", () => {
  assertEquals(pipe([1, 2, 3], A.updateAt(0, 10)), O.some([10, 2, 3]));
  assertEquals(pipe([1, 2, 3], A.updateAt(2, 10)), O.some([1, 2, 10]));
  assertEquals(pipe([1, 2, 3], A.updateAt(5, 10)), O.none);
});

Deno.test("Array deleteAt", () => {
  assertEquals(pipe([1, 2, 3], A.deleteAt(0)), O.some([2, 3]));
  assertEquals(pipe([1, 2, 3], A.deleteAt(2)), O.some([1, 2]));
  assertEquals(pipe([1, 2, 3], A.deleteAt(5)), O.none);
});
