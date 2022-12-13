import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as T from "../these.ts";
import * as O from "../option.ts";
import { SemigroupNumberSum } from "../number.ts";

const add = (n: number) => n + 1;

Deno.test("These left", () => {
  assertEquals(T.left(1), { tag: "Left", left: 1 });
});

Deno.test("These right", () => {
  assertEquals(T.right(1), { tag: "Right", right: 1 });
});

Deno.test("These both", () => {
  assertEquals(T.both(0, 1), { tag: "Both", left: 0, right: 1 });
});

Deno.test("These fold", () => {
  const fold = T.match(add, add, (a, b) => a + b);
  assertEquals(fold(T.left(1)), 2);
  assertEquals(fold(T.right(2)), 3);
  assertEquals(fold(T.both(2, 2)), 4);
});

Deno.test("These isLeft", () => {
  assertEquals(T.isLeft(T.left(1)), true);
  assertEquals(T.isLeft(T.right(1)), false);
  assertEquals(T.isLeft(T.both(1, 1)), false);
});

Deno.test("These isRight", () => {
  assertEquals(T.isRight(T.left(1)), false);
  assertEquals(T.isRight(T.right(1)), true);
  assertEquals(T.isRight(T.both(1, 1)), false);
});

Deno.test("These isBoth", () => {
  assertEquals(T.isBoth(T.left(1)), false);
  assertEquals(T.isBoth(T.right(1)), false);
  assertEquals(T.isBoth(T.both(1, 1)), true);
});

Deno.test("These getShow", () => {
  const f = { show: (n: number) => n.toString() };
  const { show } = T.getShow(f, f);
  assertEquals(show(T.left(1)), "Left(1)");
  assertEquals(show(T.right(1)), "Right(1)");
  assertEquals(show(T.both(1, 1)), "Both(1, 1)");
});

Deno.test("These getSemigroup", () => {
  const Semigroup = T.getSemigroup(SemigroupNumberSum, SemigroupNumberSum);
  const concat = Semigroup.concat;
  const cl = concat(T.left(1));
  const cr = concat(T.right(1));
  const cb = concat(T.both(1, 1));
  assertEquals(cl(T.left(1)), T.left(2));
  assertEquals(cl(T.right(1)), T.both(1, 1));
  assertEquals(cl(T.both(1, 1)), T.both(2, 1));
  assertEquals(cr(T.left(1)), T.both(1, 1));
  assertEquals(cr(T.right(1)), T.right(2));
  assertEquals(cr(T.both(1, 1)), T.both(1, 2));
  assertEquals(cb(T.left(1)), T.both(2, 1));
  assertEquals(cb(T.right(1)), T.both(1, 2));
  assertEquals(cb(T.both(1, 1)), T.both(2, 2));
});

Deno.test("These bimap", () => {
  const bimap = T.bimap(add, add);
  assertEquals(bimap(T.left(1)), T.left(2));
  assertEquals(bimap(T.right(1)), T.right(2));
  assertEquals(bimap(T.both(1, 1)), T.both(2, 2));
});

Deno.test("These mapLeft", () => {
  const mapLeft = T.mapLeft(add);
  assertEquals(mapLeft(T.left(1)), T.left(2));
  assertEquals(mapLeft(T.right(1)), T.right(1));
  assertEquals(mapLeft(T.both(1, 1)), T.both(2, 1));
});

Deno.test("These map", () => {
  const map = T.map(add);
  assertEquals(map(T.left(1)), T.left(1));
  assertEquals(map(T.right(1)), T.right(2));
  assertEquals(map(T.both(1, 1)), T.both(1, 2));
});

Deno.test("These reduce", () => {
  const reduce = T.reduce((n: number, m: number) => n + m, 0);
  assertEquals(reduce(T.left(1)), 0);
  assertEquals(reduce(T.right(1)), 1);
  assertEquals(reduce(T.both(1, 1)), 1);
});

Deno.test("These traverse", () => {
  const t1 = T.traverse(O.MonadOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(T.left(1)), O.some(T.left(1)));
  assertEquals(t2(T.right(0)), O.none);
  assertEquals(t2(T.right(1)), O.some(T.right(1)));
  assertEquals(t2(T.both(1, 0)), O.none);
  assertEquals(t2(T.both(1, 1)), O.some(T.both(1, 1)));
});
