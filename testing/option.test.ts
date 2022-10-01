import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as O from "../option.ts";
import * as N from "../number.ts";
import { _, pipe } from "../fns.ts";

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
  assertEquals(O.tryCatch(_), O.none);
  assertEquals(O.tryCatch(() => 1), O.some(1));
});

Deno.test("Option fold", () => {
  const fold = O.fold(() => 0, (n: number) => n);
  assertEquals(fold(O.none), 0);
  assertEquals(fold(O.some(1)), 1);
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

Deno.test("Option getShow", () => {
  const { show } = O.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(O.none), "None");
  assertEquals(show(O.some(1)), "Some(1)");
});

Deno.test("Option getOrd", () => {
  const Ord = O.getOrd(N.OrdNumber);
  const { lte } = Ord;
  assertEquals(lte(O.none)(O.none), true);
  assertEquals(lte(O.none)(O.some(1)), false);
  assertEquals(lte(O.some(1))(O.none), true);
  assertEquals(lte(O.some(1))(O.some(1)), true);
  assertEquals(lte(O.some(1))(O.some(2)), false);
  assertEquals(lte(O.some(2))(O.some(1)), true);
});

Deno.test("Option of", () => {
  assertEquals(O.of(1), O.some(1));
});

Deno.test("Option ap", () => {
  assertEquals(pipe(O.some(1), O.ap(O.some(add))), O.some(2));
  assertEquals(pipe(O.some(1), O.ap(O.none)), O.none);
  assertEquals(pipe(O.none, O.ap(O.some(add))), O.none);
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
  const t1 = O.traverse(O.MonadThrowOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(1));
  assertEquals(t2(O.none), O.some(O.none));
  assertEquals(t2(O.some(0)), O.none);
  assertEquals(t2(O.some(1)), O.some(O.some(1)));
});

Deno.test("Option empty", () => {
  assertEquals(O.empty(), O.none);
});

Deno.test("Option throwError", () => {
  assertEquals(O.throwError(), O.none);
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

Deno.test("Option extend", () => {
  const extend = O.extend(O.fold(() => -1, (n: number) => n + 1));
  assertEquals(extend(O.some(0)), O.some(1));
  assertEquals(extend(O.none), O.some(-1));
});

Deno.test("Option sequenceTuple", () => {
  assertEquals(O.sequenceTuple(O.some(0), O.some(1)), O.some([0, 1]));
  assertEquals(O.sequenceTuple(O.some(0), O.none), O.none);
  assertEquals(O.sequenceTuple(O.none, O.some(1)), O.none);
  assertEquals(O.sequenceTuple(O.none, O.none), O.none);
});

Deno.test("Option sequenceStruct", () => {
  assertEquals(
    O.sequenceStruct({ a: O.some(0), b: O.some(1) }),
    O.some({ a: 0, b: 1 }),
  );
  assertEquals(O.sequenceStruct({ a: O.some(0), b: O.none }), O.none);
  assertEquals(O.sequenceStruct({ a: O.none, b: O.some(1) }), O.none);
  assertEquals(O.sequenceStruct({ a: O.none, b: O.none }), O.none);
});

Deno.test("Option exists", () => {
  const exists = O.exists((n: number) => n > 0);
  assertEquals(exists(O.some(0)), false);
  assertEquals(exists(O.some(1)), true);
  assertEquals(exists(O.none), false);
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
