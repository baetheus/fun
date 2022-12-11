import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as T from "../tree.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Tree of", () => {
  assertEquals(T.of(1), { value: 1, forest: [] });
  assertEquals(T.of(1, [T.of(2)]), {
    value: 1,
    forest: [{ value: 2, forest: [] }],
  });
});

Deno.test("Tree getShow", () => {
  const { show } = T.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(T.of(1)), "Tree(1)");
  assertEquals(show(T.of(1, [T.of(2)])), "Tree(1, [Tree(2)])");
});

Deno.test("Tree of", () => {
  assertEquals(T.of(1), T.of(1));
});

Deno.test("Tree ap", () => {
  assertEquals(pipe(T.of((n: number) => n + 1), T.ap(T.of(1))), T.of(2));
  assertEquals(
    pipe(
      T.of((n: number) => n + 1, [T.of((n: number) => n + n)]),
      T.ap(T.of(2)),
    ),
    T.of(3, [T.of(4)]),
  );
});

Deno.test("Tree map", () => {
  assertEquals(pipe(T.of(1), T.map(add)), T.of(2));
});

Deno.test("Tree join", () => {
  assertEquals(T.join(T.of(T.of(1))), T.of(1));
});

Deno.test("Tree chain", () => {
  const chain = T.chain((n: number) => n === 0 ? T.of(0) : T.of(n, [T.of(1)]));
  assertEquals(chain(T.of(2)), T.of(2, [T.of(1)]));
  assertEquals(chain(T.of(0)), T.of(0));
});

Deno.test("Tree reduce", () => {
  const reduce = T.reduce((n: number, i: number) => n + i, 0);
  assertEquals(reduce(T.of(1)), 1);
  assertEquals(reduce(T.of(1, [T.of(2)])), 3);
});

Deno.test("Tree traverse", () => {
  const t1 = T.traverse(O.MonadOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(T.of(0)), O.none);
  assertEquals(t2(T.of(1)), O.some(T.of(1)));
  assertEquals(t2(T.of(1, [T.of(0)])), O.none);
  assertEquals(t2(T.of(1, [T.of(2)])), O.some(T.of(1, [T.of(2)])));
});

Deno.test("Tree drawForest", () => {
  const ta = T.of(1, [T.of(2), T.of(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawForest(tb.forest), "\n├─ 2\n└─ 3");
});

Deno.test("Tree drawTree", () => {
  const ta = T.of(1, [T.of(2), T.of(3)]);
  const tb = pipe(ta, T.map((n) => n.toString()));
  assertEquals(T.drawTree(tb), "1\n├─ 2\n└─ 3");
});

Deno.test("Tree fold", () => {
  const fold = T.fold((a: number, bs: number[]) =>
    bs.reduce((n: number, m: number) => n + m, a)
  );
  assertEquals(fold(T.of(1)), 1);
  assertEquals(fold(T.of(1, [T.of(2, [T.of(3)])])), 6);
});

// Deno.test("Tree Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       T.Do<number, number, number>(),
//       T.bind("one", () => T.of(1)),
//       T.bind("two", ({ one }) => T.of(one + one)),
//       T.map(({ one, two }) => one + two),
//     ),
//     T.of(3),
//   );
//   assertEquals(
//     pipe(
//       T.of(1),
//       T.bindTo("one"),
//     ),
//     T.of({ one: 1 }),
//   );
// });
