import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as T from "../tree.ts";
import * as O from "../option.ts";
import { _, pipe } from "../fns.ts";

import * as AS from "./assert.ts";

Deno.test("Tree make", () => {
  assertEquals(T.make(1), { value: 1, forest: [] });
  assertEquals(T.make(1, [T.make(2)]), {
    value: 1,
    forest: [{ value: 2, forest: [] }],
  });
});

Deno.test("Tree Functor", () => {
  AS.assertFunctor(T.Functor, {
    ta: T.make(1, [T.make(2)]),
    fai: AS.add,
    fij: AS.multiply,
  });
});

Deno.test("Tree Apply", () => {
  AS.assertApply(T.Apply, {
    ta: T.make(1, [T.make(2)]),
    fai: AS.add,
    fij: AS.multiply,
    tfai: T.make(AS.add, [T.make(AS.multiply)]),
    tfij: T.make(AS.multiply, [T.make(AS.add)]),
  });
});

Deno.test("Tree Applcative", () => {
  AS.assertApplicative(T.Applicative, {
    a: 1,
    ta: T.make(1, [T.make(2)]),
    fai: AS.add,
    fij: AS.multiply,
    tfai: T.make(AS.add, [T.make(AS.multiply)]),
    tfij: T.make(AS.multiply, [T.make(AS.add)]),
  });
});

Deno.test("Tree Chain", () => {
  AS.assertChain(T.Chain, {
    a: 1,
    ta: T.make(1, [T.make(2)]),
    fai: AS.add,
    fij: AS.multiply,
    tfai: T.make(AS.add, [T.make(AS.multiply)]),
    tfij: T.make(AS.multiply, [T.make(AS.add)]),
    fati: (n: number) => T.make(n + 1),
    fitj: (n: number) => T.make(n * 2, [T.make(n)]),
  });
});

Deno.test("Tree Monad", () => {
  AS.assertMonad(T.Monad, {
    a: 1,
    ta: T.make(1, [T.make(2)]),
    fai: AS.add,
    fij: AS.multiply,
    tfai: T.make(AS.add, [T.make(AS.multiply)]),
    tfij: T.make(AS.multiply, [T.make(AS.add)]),
    fati: (n: number) => T.make(n + 1),
    fitj: (n: number) => T.make(n * 2, [T.make(n)]),
  });
});

Deno.test("Tree getShow", () => {
  const { show } = T.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(T.make(1)), "Tree(1)");
  assertEquals(show(T.make(1, [T.make(2)])), "Tree(1, [Tree(2)])");
});

Deno.test("Tree of", () => {
  assertEquals(T.of(1), T.make(1));
});

Deno.test("Tree ap", () => {
  assertEquals(pipe(T.make(1), T.ap(T.make(AS.add))), T.make(2));
  assertEquals(
    pipe(T.make(1), T.ap(T.make(AS.add, [T.make(AS.add)]))),
    T.make(2, [T.make(2)]),
  );
});

Deno.test("Tree map", () => {
  assertEquals(pipe(T.make(1), T.map(AS.add)), T.make(2));
});

Deno.test("Tree join", () => {
  assertEquals(T.join(T.make(T.make(1))), T.make(1));
});

Deno.test("Tree chain", () => {
  const chain = T.chain((n: number) =>
    n === 0 ? T.make(0) : T.make(n, [T.make(1)])
  );
  assertEquals(chain(T.make(2)), T.make(2, [T.make(1)]));
  assertEquals(chain(T.make(0)), T.make(0));
});

Deno.test("Tree reduce", () => {
  const reduce = T.reduce((n: number, i: number) => n + i, 0);
  assertEquals(reduce(T.make(1)), 1);
  assertEquals(reduce(T.make(1, [T.make(2)])), 3);
});

Deno.test("Tree traverse", () => {
  const t1 = T.traverse(O.Applicative);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(T.make(0)), O.none);
  assertEquals(t2(T.make(1)), O.some(T.make(1)));
  assertEquals(t2(T.make(1, [T.make(0)])), O.none);
  assertEquals(t2(T.make(1, [T.make(2)])), O.some(T.make(1, [T.make(2)])));
});

Deno.test("Tree drawForest", () => {
  const ta = T.make(1, [T.make(2), T.make(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawForest(tb.forest), "\n├─ 2\n└─ 3");
});

Deno.test("Tree drawTree", () => {
  const ta = T.make(1, [T.make(2), T.make(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawTree(tb), "1\n├─ 2\n└─ 3");
});

Deno.test("Tree fold", () => {
  const fold = T.fold((a: number, bs: number[]) =>
    bs.reduce((n: number, m: number) => n + m, a)
  );
  assertEquals(fold(T.make(1)), 1);
  assertEquals(fold(T.make(1, [T.make(2, [T.make(3)])])), 6);
});

Deno.test("Tree Do, bind, bindTo", () => {
  assertEquals(
    pipe(
      T.Do<number, number, number>(),
      T.bind("one", () => T.make(1)),
      T.bind("two", ({ one }) => T.make(one + one)),
      T.map(({ one, two }) => one + two),
    ),
    T.make(3),
  );
  assertEquals(
    pipe(
      T.make(1),
      T.bindTo("one"),
    ),
    T.make({ one: 1 }),
  );
});
