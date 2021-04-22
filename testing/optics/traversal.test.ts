import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as T from "../../optics/traversal.ts";
import * as I from "../../optics/iso.ts";
import * as L from "../../optics/lens.ts";
import * as M from "../../optics/optional.ts";
import * as P from "../../optics/prism.ts";
import * as O from "../../option.ts";
import * as E from "../../either.ts";
import * as A from "../../array.ts";
import { monoidSum } from "../../monoid.ts";
import { pipe } from "../../fns.ts";

const positive = O.fromPredicate((n: number) => n > 0);

const iso = I.make((n: number) => n.toString(), (s: string) => parseFloat(s));

type T1 = { one: number };

type T2 = { one: number; two: number; three: number };

Deno.test("Traversal compose", () => {
  const getAll = pipe(T.id<number>(), T.compose(I.asTraversal(iso)), T.getAll);
  assertEquals(getAll(0), ["0"]);
});

Deno.test("Traversal composeIso", () => {
  const getAll = pipe(T.id<number>(), T.composeIso(iso), T.getAll);
  assertEquals(getAll(1), ["1"]);
});

Deno.test("Traversal composeLens", () => {
  const lens = L.make(
    (n: number) => n.toString(),
    (a: string) => (_) => parseFloat(a),
  );
  const getAll = pipe(T.id<number>(), T.composeLens(lens), T.getAll);
  assertEquals(getAll(0), ["0"]);
});

Deno.test("Traversal composePrism", () => {
  const getAll = pipe(
    T.id<O.Option<number>>(),
    T.composePrism(P.some()),
    T.getAll,
  );
  assertEquals(getAll(O.none), []);
  assertEquals(getAll(O.some(1)), [1]);
});

Deno.test("Traversal composeOptional", () => {
  const optional = M.id<number>();
  const getAll = pipe(T.id<number>(), T.composeOptional(optional), T.getAll);
  assertEquals(getAll(0), [0]);
});

Deno.test("Traversal id", () => {
  const getAll = pipe(T.id<number>(), T.getAll);
  assertEquals(getAll(0), [0]);
});

Deno.test("Traversal modify", () => {
  const modify = pipe(T.id<number>(), T.modify((n) => n + 1));
  assertEquals(modify(1), 2);
});

Deno.test("Traversal filter", () => {
  const getAll = pipe(
    T.fromTraversable(A.Traversable)<number>(),
    T.filter((n) => n > 0),
    T.getAll,
  );
  assertEquals(getAll([]), []);
  assertEquals(getAll([0]), []);
  assertEquals(getAll([0, 2, 3]), [2, 3]);
  assertEquals(getAll([1, 2, 3]), [1, 2, 3]);
});

Deno.test("Traversal set", () => {
  const set = pipe(T.id<number>(), T.set(1));
  assertEquals(set(0), 1);
});

Deno.test("Traversal prop", () => {
  const getAll = pipe(T.id<T1>(), T.prop("one"), T.getAll);
  assertEquals(getAll({ one: 1 }), [1]);
});

Deno.test("Traversal props", () => {
  const getAll = pipe(T.id<T2>(), T.props("one", "two"), T.getAll);
  assertEquals(getAll({ one: 1, two: 2, three: 3 }), [{ one: 1, two: 2 }]);
});

Deno.test("Traversal index", () => {
  const getAll = pipe(T.id<ReadonlyArray<number>>(), T.index(0), T.getAll);
  assertEquals(getAll([]), []);
  assertEquals(getAll([1]), [1]);
  assertEquals(getAll([1, 2]), [1]);
});

Deno.test("Traversal key", () => {
  const getAll = pipe(
    T.id<Readonly<Record<string, number>>>(),
    T.key("one"),
    T.getAll,
  );
  assertEquals(getAll({}), []);
  assertEquals(getAll({ one: 1 }), [1]);
  assertEquals(getAll({ one: 1, two: 2 }), [1]);
  assertEquals(getAll({ two: 2 }), []);
});

Deno.test("Traversal atKey", () => {
  const getAll = pipe(
    T.id<Readonly<Record<string, number>>>(),
    T.atKey("one"),
    T.getAll,
  );
  assertEquals(getAll({}), [O.none]);
  assertEquals(getAll({ one: 1 }), [O.some(1)]);
});

Deno.test("Traversal traverse", () => {
  const getAll = pipe(
    T.id<ReadonlyArray<number>>(),
    T.traverse(A.Traversable),
    T.getAll,
  );
  assertEquals(getAll([1, 2, 3]), [1, 2, 3]);
  assertEquals(getAll([]), []);
});

Deno.test("Traversal foldMap", () => {
  const foldMapSum = T.foldMap(monoidSum);
  const traverseNumberArray = pipe(T.fromTraversable(A.Traversable)<number>());
  const foldMap = pipe(traverseNumberArray, foldMapSum((n) => n));
  assertEquals(foldMap([]), 0);
  assertEquals(foldMap([1, 2, 3]), 6);
});

Deno.test("Traversal getAll", () => {
  const getAll = pipe(T.fromTraversable(A.Traversable)<number>(), T.getAll);
  assertEquals(getAll([]), []);
  assertEquals(getAll([1, 2, 3]), [1, 2, 3]);
});

Deno.test("Traversal some", () => {
  const getAll = pipe(T.id<O.Option<number>>(), T.some, T.getAll);
  assertEquals(getAll(O.none), []);
  assertEquals(getAll(O.some(1)), [1]);
});

Deno.test("Traversal right", () => {
  const getAll = pipe(T.id<E.Either<number, number>>(), T.right, T.getAll);
  assertEquals(getAll(E.left(1)), []);
  assertEquals(getAll(E.right(1)), [1]);
});

Deno.test("Traversal left", () => {
  const getAll = pipe(T.id<E.Either<number, number>>(), T.left, T.getAll);
  assertEquals(getAll(E.right(1)), []);
  assertEquals(getAll(E.left(1)), [1]);
});
