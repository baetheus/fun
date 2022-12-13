import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as O from "../option.ts";
import * as P from "../pair.ts";
import * as E from "../either.ts";
import * as N from "../number.ts";
import * as Ord from "../ord.ts";
import { pipe, todo } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Option none", () => {
  assertEquals(O.none, { tag: "None" });
});

Deno.test("Option some", () => {
  assertEquals(O.some(1), { tag: "Some", value: 1 });
});

Deno.test("Option constNone", () => {
  assertEquals(O.constNone(), O.none);
});

Deno.test("Option fromNullable", () => {
  assertEquals(O.fromNullable(undefined), O.none);
  assertEquals(O.fromNullable(null), O.none);
  assertEquals(O.fromNullable(1), O.some(1));
});

Deno.test("Option fromPredicate", () => {
  const fromPredicate = O.fromPredicate((n: number) => n > 0);
  assertEquals(fromPredicate(0), O.none);
  assertEquals(fromPredicate(1), O.some(1));
});

Deno.test("Option tryCatch", () => {
  assertEquals(O.tryCatch(todo)(), O.none);
  assertEquals(O.tryCatch(() => 1)(), O.some(1));
});

Deno.test("Option match", () => {
  const match = O.match(() => 0, (n: number) => n);
  assertEquals(match(O.none), 0);
  assertEquals(match(O.some(1)), 1);
});

Deno.test("Option getOrElse", () => {
  const getOrElse = O.getOrElse(() => 0);
  assertEquals(getOrElse(O.none), 0);
  assertEquals(getOrElse(O.some(1)), 1);
});

Deno.test("Option toNull", () => {
  assertEquals(O.toNull(O.none), null);
  assertEquals(O.toNull(O.some(1)), 1);
});

Deno.test("Option toUndefined", () => {
  assertEquals(O.toUndefined(O.none), undefined);
  assertEquals(O.toUndefined(O.some(1)), 1);
});

Deno.test("Option mapNullable", () => {
  const mapNullable = O.mapNullable((n: number[]) =>
    n.length === 1 ? n[0] : n[10]
  );
  assertEquals(mapNullable(O.some([0])), O.some(0));
  assertEquals(mapNullable(O.some([1, 2])), O.none);
  assertEquals(mapNullable(O.none), O.none);
});

Deno.test("Option isNone", () => {
  assertEquals(O.isNone(O.none), true);
  assertEquals(O.isNone(O.some(1)), false);
});

Deno.test("Option isSome", () => {
  assertEquals(O.isSome(O.none), false);
  assertEquals(O.isSome(O.some(1)), true);
});

Deno.test("Option of", () => {
  assertEquals(O.of(1), O.some(1));
});

Deno.test("Option ap", () => {
  assertEquals(pipe(O.of(add), O.ap(O.of(1))), O.some(2));
  assertEquals(pipe(O.of(add), O.ap(O.none)), O.none);
  assertEquals(pipe(O.none, O.ap(O.of(1))), O.none);
  assertEquals(pipe(O.none, O.ap(O.none)), O.none);
});

Deno.test("Option map", () => {
  const f1 = O.map(add);
  assertEquals(typeof f1, "function");
  assertEquals(pipe(O.some(1), O.map(add)), O.some(2));
  assertEquals(pipe(O.none, O.map(add)), O.none);
});

Deno.test("Option join", () => {
  assertEquals(O.join(O.some(O.some(1))), O.some(1));
  assertEquals(O.join(O.some(O.none)), O.none);
  assertEquals(O.join(O.none), O.none);
});

Deno.test("Option chain", () => {
  const fati = (n: number) => n === 0 ? O.none : O.some(n);
  assertEquals(pipe(O.some(0), O.chain(fati)), O.none);
  assertEquals(pipe(O.some(1), O.chain(fati)), O.some(1));
  assertEquals(pipe(O.none, O.chain(fati)), O.none);
});

Deno.test("Option reduce", () => {
  const reduce = O.reduce((n: number, o: number) => n + o, 0);
  assertEquals(reduce(O.some(1)), 1);
  assertEquals(reduce(O.none), 0);
});

Deno.test("Option traverse", () => {
  const t1 = O.traverse(O.MonadOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(1));
  assertEquals(t2(O.none), O.some(O.none));
  assertEquals(t2(O.some(0)), O.none);
  assertEquals(t2(O.some(1)), O.some(O.some(1)));
});

Deno.test("Option empty", () => {
  assertEquals(O.empty(), O.none);
});

Deno.test("Option alt", () => {
  assertEquals(pipe(O.some(0), O.alt(O.some(1))), O.some(0));
  assertEquals(pipe(O.some(0), O.alt(O.constNone<number>())), O.some(0));
  assertEquals(pipe(O.none, O.alt(O.some(1))), O.some(1));
  assertEquals(pipe(O.none, O.alt(O.none)), O.none);
});

Deno.test("Option filter", () => {
  const filter = O.filter((n: number) => n > 0);
  assertEquals(filter(O.some(0)), O.none);
  assertEquals(filter(O.some(1)), O.some(1));
  assertEquals(filter(O.none), O.none);
});

Deno.test("Option filterMap", () => {
  const filterMap = O.filterMap((s: string) =>
    s.length % 2 === 0 ? O.some(s.length) : O.none
  );
  assertEquals(filterMap(O.some("")), O.some(0));
  assertEquals(filterMap(O.some("Hello")), O.none);
  assertEquals(filterMap(O.none), O.none);
});

Deno.test("Option partition", () => {
  const partition = O.partition((n: number) => n > 0);
  assertEquals(partition(O.some(0)), P.pair(O.none, O.some(0)));
  assertEquals(partition(O.some(1)), P.pair(O.some(1), O.none));
  assertEquals(partition(O.none), P.pair(O.none, O.none));
});

Deno.test("Option partitionMap", () => {
  const partitionMap = O.partitionMap((s: string) =>
    s.length % 2 === 0 ? E.right(s.length) : E.left(s)
  );
  assertEquals(partitionMap(O.some("")), P.pair(O.some(0), O.none));
  assertEquals(partitionMap(O.some("Hello")), P.pair(O.none, O.some("Hello")));
  assertEquals(partitionMap(O.none), P.pair(O.none, O.none));
});

Deno.test("Option extend", () => {
  const extend = O.extend(O.match(() => -1, (n: number) => n + 1));
  assertEquals(extend(O.some(0)), O.some(1));
  assertEquals(extend(O.none), O.some(-1));
});

Deno.test("Option exists", () => {
  const exists = O.exists((n: number) => n > 0);
  assertEquals(exists(O.some(0)), false);
  assertEquals(exists(O.some(1)), true);
  assertEquals(exists(O.none), false);
});

Deno.test("Option getShow", () => {
  const { show } = O.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(O.none), "None");
  assertEquals(show(O.some(1)), "Some(1)");
});

Deno.test("Option getEq", () => {
  const { equals } = O.getEq(N.EqNumber);
  assertEquals(equals(O.some(1))(O.some(1)), true);
  assertEquals(equals(O.some(1))(O.some(2)), false);
  assertEquals(equals(O.some(1))(O.none), false);
  assertEquals(equals(O.none)(O.some(1)), false);
  assertEquals(equals(O.none)(O.none), true);
});

Deno.test("Option getOrd", () => {
  const ord = O.getOrd(N.OrdNumber);
  const lte = Ord.lte(ord);
  assertEquals(lte(O.none)(O.none), true);
  assertEquals(lte(O.none)(O.some(1)), false);
  assertEquals(lte(O.some(1))(O.none), true);
  assertEquals(lte(O.some(1))(O.some(1)), true);
  assertEquals(lte(O.some(1))(O.some(2)), false);
  assertEquals(lte(O.some(2))(O.some(1)), true);
});

Deno.test("Option getSemigroup", () => {
  const { concat } = O.getSemigroup(N.SemigroupNumberSum);
  assertEquals(concat(O.some(1))(O.some(1)), O.some(2));
  assertEquals(concat(O.some(1))(O.none), O.some(1));
  assertEquals(concat(O.none)(O.some(1)), O.some(1));
  assertEquals(concat(O.none)(O.none), O.none);
});

Deno.test("Option getMonoid", () => {
  const { concat, empty } = O.getMonoid(N.MonoidNumberSum);
  assertEquals(concat(O.some(1))(O.some(1)), O.some(2));
  assertEquals(concat(O.some(1))(O.none), O.some(1));
  assertEquals(concat(O.none)(O.some(1)), O.some(1));
  assertEquals(concat(O.none)(O.none), O.none);
  assertEquals(empty(), O.none);
});

// Deno.test("Option Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       O.Do(),
//       O.bind("one", () => O.some(1)),
//       O.bind("two", ({ one }) => O.some(one + one)),
//       O.map(({ one, two }) => one + two),
//     ),
//     O.some(3),
//   );
//   assertEquals(
//     pipe(
//       O.some(1),
//       O.bindTo("one"),
//     ),
//     O.some({ one: 1 }),
//   );
// });
