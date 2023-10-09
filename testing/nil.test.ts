import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as N from "../nil.ts";
import * as E from "../either.ts";
import * as O from "../option.ts";
import * as B from "../boolean.ts";
import { pipe, todo } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Nil fail", () => {
  assertEquals(N.fail(), null);
});

Deno.test("Nil nil", () => {
  assertEquals(N.nil(null), null);
  assertEquals(N.nil(undefined), null);
  assertEquals(N.nil(1), 1);
});

Deno.test("Nil init", () => {
  assertEquals(N.init(), null);
});

Deno.test("Nil fromPredicate", () => {
  const fromPredicate = N.fromPredicate((n: number) => n > 0);

  assertEquals(fromPredicate(null), null);
  assertEquals(fromPredicate(undefined), null);
  assertEquals(fromPredicate(0), null);
  assertEquals(fromPredicate(1), 1);
});

Deno.test("Nil fromOption", () => {
  assertEquals(N.fromOption(O.none), null);
  assertEquals(N.fromOption(O.some(1)), 1);
});

Deno.test("Nil tryCatch", () => {
  assertEquals(N.tryCatch(todo)(), null);
  assertEquals(N.tryCatch((n: number) => n + 1)(1), 2);
});

Deno.test("Nil match", () => {
  const match = N.match(() => 0, (n: number) => n);
  assertEquals(match(null), 0);
  assertEquals(match(undefined), 0);
  assertEquals(match(1), 1);
});

Deno.test("Nil getOrElse", () => {
  const getOrElse = N.getOrElse(() => 0);
  assertEquals(getOrElse(null), 0);
  assertEquals(getOrElse(undefined), 0);
  assertEquals(getOrElse(1), 1);
});

Deno.test("Nil toNull", () => {
  assertEquals(N.toNull(null), null);
  assertEquals(N.toNull(undefined), null);
  assertEquals(N.toNull(1), 1);
});

Deno.test("Nil toUndefined", () => {
  assertEquals(N.toUndefined(null), undefined);
  assertEquals(N.toUndefined(undefined), undefined);
  assertEquals(N.toUndefined(1), 1);
});

Deno.test("Nil isNil", () => {
  assertEquals(N.isNil(undefined), true);
  assertEquals(N.isNil(null), true);
  assertEquals(N.isNil(0), false);
  assertEquals(N.isNil(""), false);
});

Deno.test("Nil isNotNil", () => {
  assertEquals(N.isNotNil(undefined), false);
  assertEquals(N.isNotNil(null), false);
  assertEquals(N.isNotNil(0), true);
  assertEquals(N.isNotNil(""), true);
});

Deno.test("Nil getShowable", () => {
  const { show } = N.getShowableNil({ show: (n: number) => n.toString() });
  assertEquals(show(undefined), "nil");
  assertEquals(show(null), "nil");
  assertEquals(show(1), "1");
});

Deno.test("Nil wrap", () => {
  assertEquals(N.wrap(1), 1);
});

Deno.test("Nil fail", () => {
  assertEquals(N.fail(), null);
});

Deno.test("Nil apply", () => {
  const add = (n: number) => n + 1;

  assertEquals(pipe(N.wrap(add), N.apply(N.wrap(1))), N.wrap(2));
  assertEquals(pipe(N.wrap(add), N.apply(N.fail())), null);
  assertEquals(pipe(N.fail(), N.apply(N.wrap(1))), null);
  assertEquals(pipe(N.fail(), N.apply(N.fail())), null);
});

Deno.test("Nil map", () => {
  const map = N.map(add);
  assertEquals(map(null), null);
  assertEquals(map(undefined), null);
  assertEquals(map(1), 2);
});

Deno.test("Nil alt", () => {
  assertEquals(pipe(N.wrap(1), N.alt(N.wrap(2))), N.wrap(1));
  assertEquals(pipe(N.wrap(1), N.alt(N.fail())), N.wrap(1));
  assertEquals(pipe(N.fail(), N.alt(N.wrap(1))), N.wrap(1));
  assertEquals(pipe(N.fail(), N.alt(N.fail())), N.fail());
});

Deno.test("Nil exists", () => {
  const exists = N.exists((n: number) => n > 0);
  assertEquals(exists(null), false);
  assertEquals(exists(undefined), false);
  assertEquals(exists(0), false);
  assertEquals(exists(1), true);
});

Deno.test("Nil filter", () => {
  const filter = N.filter((n: number) => n > 0);
  assertEquals(filter(null), null);
  assertEquals(filter(undefined), null);
  assertEquals(filter(0), null);
  assertEquals(filter(1), 1);
});

Deno.test("Nil filterMap", () => {
  const filterMap = N.filterMap(O.fromPredicate((n: number) => n > 0));
  assertEquals(filterMap(null), null);
  assertEquals(filterMap(undefined), null);
  assertEquals(filterMap(0), null);
  assertEquals(filterMap(1), 1);
});

Deno.test("Nil partition", () => {
  const partition = N.partition((n: number) => n > 0);
  assertEquals(partition(null), [null, null]);
  assertEquals(partition(undefined), [null, null]);
  assertEquals(partition(0), [null, 0]);
  assertEquals(partition(1), [1, null]);
});

Deno.test("Nil partitionMap", () => {
  const partition = N.partitionMap(E.fromPredicate((n: number) => n > 0));
  assertEquals(partition(null), [null, null]);
  assertEquals(partition(undefined), [null, null]);
  assertEquals(partition(0), [null, 0]);
  assertEquals(partition(1), [1, null]);
});

Deno.test("Nil traverse", () => {
  const traverse = N.traverse(O.ApplicableOption)(
    O.fromPredicate((n: number) => n > 0),
  );
  assertEquals(traverse(null), O.some(null));
  assertEquals(traverse(undefined), O.some(null));
  assertEquals(traverse(0), O.none);
  assertEquals(traverse(1), O.some(1));
});

Deno.test("Nil fold", () => {
  const fold = N.fold((n: number, m: number) => n + m, 1);
  assertEquals(fold(null), 1);
  assertEquals(fold(undefined), 1);
  assertEquals(fold(1), 2);
});

Deno.test("Nil getComparableNil", () => {
  const { compare } = N.getComparableNil(B.ComparableBoolean);
  assertEquals(compare(null)(null), true);
  assertEquals(compare(null)(undefined), true);
  assertEquals(compare(undefined)(undefined), true);
  assertEquals(compare(undefined)(null), true);
  assertEquals(compare(true)(false), false);
  assertEquals(compare(true)(true), true);
  assertEquals(compare(false)(true), false);
  assertEquals(compare(false)(false), true);
});

Deno.test("Nil getSortableNil", () => {
  const { sort } = N.getSortableNil(B.SortableBoolean);
  assertEquals(sort(null, null), 0);
  assertEquals(sort(null, undefined), 0);
  assertEquals(sort(undefined, null), 0);
  assertEquals(sort(undefined, undefined), 0);
  assertEquals(sort(null, true), -1);
  assertEquals(sort(true, null), 1);
  assertEquals(sort(true, true), 0);
  assertEquals(sort(true, false), 1);
  assertEquals(sort(false, true), -1);
  assertEquals(sort(false, false), 0);
});

Deno.test("Nil getCombinableNil", () => {
  const { combine } = N.getCombinableNil(B.CombinableBooleanAll);
  assertEquals(combine(null)(null), null);
  assertEquals(combine(null)(undefined), null);
  assertEquals(combine(undefined)(null), null);
  assertEquals(combine(null)(undefined), null);
  assertEquals(combine(null)(true), true);
  assertEquals(combine(true)(null), true);
  assertEquals(combine(true)(true), true);
  assertEquals(combine(true)(false), false);
  assertEquals(combine(false)(true), false);
  assertEquals(combine(false)(false), false);
});

Deno.test("Nil getInitializableNil", () => {
  const { init, combine } = N.getInitializableNil(B.InitializableBooleanAll);
  assertEquals(init(), true);
  assertEquals(combine(null)(null), null);
  assertEquals(combine(null)(undefined), null);
  assertEquals(combine(undefined)(null), null);
  assertEquals(combine(null)(undefined), null);
  assertEquals(combine(null)(true), true);
  assertEquals(combine(true)(null), true);
  assertEquals(combine(true)(true), true);
  assertEquals(combine(true)(false), false);
  assertEquals(combine(false)(true), false);
  assertEquals(combine(false)(false), false);
});

Deno.test("Nil flatmap", () => {
  const flatmap = N.flatmap((n: number) => n === 0 ? null : n);
  assertEquals(flatmap(undefined), null);
  assertEquals(flatmap(null), null);
  assertEquals(flatmap(1), 1);
});

Deno.test("Nil Do, bind, bindTo", () => {
  assertEquals(
    pipe(
      {},
      N.bind("one", () => 1),
      N.bind("two", ({ one }) => one + one),
      N.map(({ one, two }) => one + two),
    ),
    3,
  );
  assertEquals(
    pipe(
      N.nil(1),
      N.bindTo("one"),
    ),
    N.nil({ one: 1 }),
  );
});
