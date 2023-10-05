import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as T from "../tree.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Tree wrap", () => {
  assertEquals(T.wrap(1), { value: 1, forest: [] });
  assertEquals(T.wrap(1, [T.wrap(2)]), {
    value: 1,
    forest: [{ value: 2, forest: [] }],
  });
  assertEquals(T.wrap(1), T.wrap(1));
});

Deno.test("Tree unwrap", () => {
  assertEquals(pipe(T.wrap(1), T.unwrap), 1);
});

Deno.test("Tree getShowable", () => {
  const { show } = T.getShowable(N.ShowableNumber);
  assertEquals(show(T.wrap(1)), "1");
  assertEquals(
    show(T.wrap(1, [T.wrap(2)])),
    `1
└─ 2`,
  );
});

Deno.test("Tree apply", () => {
  assertEquals(
    pipe(T.wrap((n: number) => n + 1), T.apply(T.wrap(1))),
    T.wrap(2),
  );
  assertEquals(
    pipe(
      T.wrap((n: number) => n + 1, [T.wrap((n: number) => n + n)]),
      T.apply(T.wrap(2)),
    ),
    T.wrap(3, [T.wrap(4)]),
  );
});

Deno.test("Tree map", () => {
  assertEquals(pipe(T.wrap(1), T.map(add)), T.wrap(2));
});

Deno.test("Tree flatmap", () => {
  const flatmap = T.flatmap((n: number) =>
    n === 0 ? T.wrap(0) : T.wrap(n, [T.wrap(1)])
  );
  assertEquals(flatmap(T.wrap(2)), T.wrap(2, [T.wrap(1)]));
  assertEquals(flatmap(T.wrap(0)), T.wrap(0));
});

Deno.test("Tree fold", () => {
  const fold = T.fold((n: number, i: number) => n + i, 0);
  assertEquals(fold(T.wrap(1)), 1);
  assertEquals(fold(T.wrap(1, [T.wrap(2)])), 3);
});

Deno.test("Tree traverse", () => {
  const t1 = T.traverse(O.FlatmappableOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(T.wrap(0)), O.none);
  assertEquals(t2(T.wrap(1)), O.some(T.wrap(1)));
  assertEquals(t2(T.wrap(1, [T.wrap(0)])), O.none);
  assertEquals(t2(T.wrap(1, [T.wrap(2)])), O.some(T.wrap(1, [T.wrap(2)])));
});

Deno.test("Tree drawForest", () => {
  const ta = T.wrap(1, [T.wrap(2), T.wrap(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawForest(tb.forest), "\n├─ 2\n└─ 3");
});

Deno.test("Tree drawTree", () => {
  const ta = T.wrap(1, [T.wrap(2), T.wrap(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawTree(tb), "1\n├─ 2\n└─ 3");
});

Deno.test("Tree match", () => {
  const match = T.match((a: number, bs: number[]) =>
    bs.reduce((n: number, m: number) => n + m, a)
  );
  assertEquals(match(T.wrap(1)), 1);
  assertEquals(match(T.wrap(1, [T.wrap(2, [T.wrap(3)])])), 6);
});

Deno.test("Tree getComparableTree", () => {
  const { compare } = T.getComparableTree(N.ComparableNumber);
  const tree = T.tree(0);
  assertEquals(pipe(tree, compare(tree)), true);
  assertEquals(pipe(T.tree(0), compare(T.tree(0))), true);
  assertEquals(
    pipe(T.tree(0, [T.tree(1)]), compare(T.tree(0, [T.tree(1)]))),
    true,
  );
  assertEquals(
    pipe(T.tree(0), compare(T.tree(0, [T.tree(1)]))),
    false,
  );
  assertEquals(pipe(T.tree(0), compare(T.tree(1))), false);
  assertEquals(pipe(T.tree(1), compare(T.tree(0))), false);
});

Deno.test("Tree bind, bindTo", () => {
  assertEquals(
    pipe(
      T.wrap(1),
      T.bindTo("one"),
      T.bind("two", ({ one }) => T.wrap(one + one)),
      T.map(({ one, two }) => one + two),
    ),
    T.wrap(3),
  );
  assertEquals(
    pipe(
      T.wrap(1),
      T.bindTo("one"),
    ),
    T.wrap({ one: 1 }),
  );
});
