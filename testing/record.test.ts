import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import type { ReadonlyRecord } from "../record.ts";
import type { Predicate } from "../predicate.ts";

import * as R from "../record.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as P from "../pair.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;
const value1: ReadonlyRecord<number> = { one: 1, two: 2, three: 3 };
const value2: ReadonlyRecord<number> = { one: 1, two: 2 };
const value3: ReadonlyRecord<string> = {
  one: "one",
  two: "two",
  three: "three",
};
const value4: ReadonlyRecord<string> = { one: "one", two: "two" };

const greaterThanZero: Predicate<number> = (n: number) => n > 0;

Deno.test("Record entries", () => {
  assertEquals(pipe(value1, R.entries), Object.entries(value1));
  assertEquals(pipe(value1, R.entries), [["one", 1], ["two", 2], ["three", 3]]);
  assertEquals(pipe({}, R.entries), []);
});

Deno.test("Record keys", () => {
  assertEquals(pipe(value1, R.keys), Object.keys(value1));
  assertEquals(pipe(value1, R.keys), ["one", "two", "three"]);
  assertEquals(pipe({}, R.keys), []);
});

Deno.test("Record omit", () => {
  assertEquals(pipe(value1, R.omit("three")), value2);
});

Deno.test("Record pick", () => {
  assertEquals(pipe(value1, R.pick("one", "two")), value2);
  assertEquals(pipe(value1, R.pick("foo")), {} as typeof value1);
});

Deno.test("Record map", () => {
  assertEquals(pipe({ a: 1, b: 2 }, R.map(add)), { a: 2, b: 3 });
  assertEquals(pipe({}, R.map(add)), {});

  assertEquals(
    pipe({ a: [1, 2, 3] }, R.map((numbers: number[]) => numbers.slice())),
    { a: [1, 2, 3] },
  );

  type Foo = { bar: number; baz?: number };
  const foo: Foo = { bar: 2 };
  assertEquals(pipe(foo, R.map(add)), { bar: 3 });

  const indexedMap = R.map((a: number, i: string) =>
    a === 0 ? i.length : a + 1
  );
  assertEquals(indexedMap({}), {});
  assertEquals(indexedMap({ a: 1, b: 2 }), { a: 2, b: 3 });
  assertEquals(indexedMap({ a: 0, b: 2 }), { a: 1, b: 3 });
});

Deno.test("Record fold", () => {
  assertEquals(
    pipe({ a: 1, b: 2 }, R.fold((a: number, b: number) => a + b, 0)),
    3,
  );
  assertEquals(pipe({}, R.fold(add, 0)), 0);

  const fold = R.fold((a: number, c: number) => a + c, 0);
  assertEquals(fold({}), 0);
  assertEquals(fold({ a: 1, b: 2 }), 3);

  const indexedReduce = R.fold(
    (o: string[], a: number, i: string) =>
      a === 0 ? [...o, i] : [...o, a.toString()],
    [],
  );
  assertEquals(indexedReduce({}), []);
  assertEquals(indexedReduce({ a: 1, b: 2 }), ["1", "2"]);
  assertEquals(indexedReduce({ a: 0, b: 2 }), ["a", "2"]);
});

Deno.test("Record collect", () => {
  const collect = pipe(
    (s: string) => s.length,
    R.collect(N.InitializableNumberMax),
  );

  assertEquals(collect({}), N.InitializableNumberMax.init());
  assertEquals(collect(value3), 5);
  assertEquals(collect(value4), 3);
});

Deno.test("Record collapse", () => {
  const collapse = pipe(
    R.collapse(N.InitializableNumberMax),
  );

  assertEquals(collapse({}), N.InitializableNumberMax.init());
  assertEquals(collapse(value1), 3);
  assertEquals(collapse(value2), 2);
});

Deno.test("Record traverse", () => {
  const t1 = R.traverse(O.FlatmappableOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2({}), O.some({}));
  assertEquals(t2({ a: 0, b: 1 }), O.none);
  assertEquals(t2({ a: 1, b: 2 }), O.some({ a: 1, b: 2 }));

  const it1 = R.traverse(O.FlatmappableOption);
  const it2 = it1((a: number, i: string) =>
    a === 0 ? O.some(i) : O.some(a.toString())
  );
  assertEquals(it2({}), O.some({}));
  assertEquals(it2({ a: 1, b: 2 }), O.some({ a: "1", b: "2" }));
  assertEquals(it2({ a: 0, b: 2 }), O.some({ a: "a", b: "2" }));
});

Deno.test("Record insert", () => {
  const insertTwo = R.insert(2);
  assertEquals(pipe({}, insertTwo("one")), { one: 2 });
  assertEquals(pipe(value1, insertTwo("one")), { one: 2, two: 2, three: 3 });
  assertStrictEquals(pipe(value1, insertTwo("two")), value1);
});

Deno.test("Record insertAt", () => {
  const atOne = R.insertAt("one");
  assertEquals(pipe({}, atOne(2)), { one: 2 });
  assertEquals(pipe(value1, atOne(2)), { one: 2, two: 2, three: 3 });
  assertStrictEquals(pipe(value1, atOne(1)), value1);
});

Deno.test("Record modify", () => {
  const incAt = R.modify(add);
  assertEquals(pipe({}, incAt("one")), {});
  assertStrictEquals(pipe(value1, incAt("foo")), value1);
  assertEquals(pipe(value1, incAt("one")), { one: 2, two: 2, three: 3 });
});

Deno.test("Record modifyAt", () => {
  const atOne = R.modifyAt("one");
  const atFoo = R.modifyAt("foo");
  assertEquals(pipe({}, atOne(add)), {});
  assertStrictEquals(pipe(value1, atFoo(add)), value1);
  assertEquals(pipe(value1, atOne(add)), { one: 2, two: 2, three: 3 });
});

Deno.test("Record update", () => {
  const upTwo = R.update(2);
  assertEquals(pipe({}, upTwo("one")), {});
  assertStrictEquals(pipe(value1, upTwo("foo")), value1);
  assertEquals(pipe(value1, upTwo("one")), { one: 2, two: 2, three: 3 });
});

Deno.test("Record updateAt", () => {
  const atOne = R.updateAt("one");
  const atFoo = R.updateAt("foo");
  assertEquals(pipe({}, atOne(add)), {});
  assertStrictEquals(pipe(value1, atFoo(2)), value1);
  assertEquals(pipe(value1, atOne(2)), { one: 2, two: 2, three: 3 });
});

Deno.test("Record lookupAt", () => {
  const atOne = R.lookupAt("one");
  assertEquals(atOne({}), O.none);
  assertEquals(atOne(value1), O.some(1));
});

Deno.test("Record lookupWithKey", () => {
  const atOne = R.lookupWithKey("one");
  assertEquals(atOne({}), O.none);
  assertEquals(atOne(value1), O.some(P.pair("one", 1)));
});

Deno.test("Record deleteAt", () => {
  assertEquals(pipe({ a: 1, b: 2 }, R.deleteAt("a")), { b: 2 });
  assertEquals(pipe({ a: 1 } as Record<string, number>, R.deleteAt("b")), {
    a: 1,
  });
});

Deno.test("Record deleteAt", () => {
  const delOne = R.deleteAt("one");
  const delFoo = R.deleteAt("foo");
  assertEquals(delOne({}), {});
  assertEquals(delOne(value1), { two: 2, three: 3 });
  assertStrictEquals(delFoo(value1), value1);
});

Deno.test("Record deleteAtWithValue", () => {
  const delOne = R.deleteAtWithValue("one");
  assertEquals(delOne({}), P.pair({}, O.none));
  assertEquals(delOne(value1), P.pair({ two: 2, three: 3 }, O.some(1)));
});

Deno.test("Record isSubrecord", () => {
  const isSub = R.isSubrecord(N.ComparableNumber);
  assertEquals(pipe(value1, isSub(value2)), false);
  assertEquals(pipe(value2, isSub(value1)), true);
});

Deno.test("Record filter", () => {
  const pred = R.filter(greaterThanZero);
  const refine = R.filter((s: string): s is "Big" => s === "Big");

  assertEquals(pred({}), {});
  assertEquals(refine({}), {});
  assertEquals(pred({ zero: 0, one: 1 }), { one: 1 });
  assertEquals(refine({ zero: "Hi", one: "Big" }), { one: "Big" });
});

Deno.test("Record filterMap", () => {
  const filterMap = R.filterMap((a: number) => a > 1 ? O.some(`${a}`) : O.none);

  assertEquals(filterMap({}), {});
  assertEquals(filterMap(value1), { two: "2", three: "3" });
});

Deno.test("Record partition", () => {
  const guard = R.partition(greaterThanZero);
  const refine = R.partition((s: string): s is "Big" => s === "Big");

  const given = { zero: 0, one: 1 };

  assertEquals(guard({}), P.pair({}, {}));
  assertEquals(refine({}), P.pair({}, {}));
  assertEquals(guard(given), P.pair({ one: 1 }, { zero: 0 }));
  assertEquals(
    refine({ one: "Hi", two: "Big" }),
    [{ two: "Big" }, { one: "Hi" }],
  );
});

Deno.test("Record partitionMap", () => {
  const partitionMap = R.partitionMap((n: number) =>
    n > 1 ? E.right(n) : E.left(n)
  );

  assertEquals(partitionMap({}), P.pair({}, {}));
  assertEquals(partitionMap(value1), P.pair({ two: 2, three: 3 }, { one: 1 }));
});

Deno.test("Record getShowableRecord", () => {
  const { show } = R.getShowableRecord({
    show: (n: number) => n.toString(),
  });
  assertEquals(show({}), "{}");
  assertEquals(show({ a: 1, b: 2 }), "{a: 1, b: 2}");
});

Deno.test("Record getCombinableRecord", () => {
  const { combine } = R.getCombinableRecord(N.CombinableNumberSum);
  assertEquals(combine({})({}), {});
  assertEquals(combine({ one: 1 })({}), { one: 1 });
  assertEquals(combine({})({ one: 1 }), { one: 1 });
  assertEquals(combine({ one: 1 })({ two: 1 }), { one: 1, two: 1 });
  assertEquals(combine({ one: 1 })({ one: 1 }), { one: 2 });
  assertEquals(combine({ one: 1, two: 1 })({ one: 1 }), { one: 2, two: 1 });
  assertEquals(combine({ one: 1 })({ one: 1, two: 1 }), { one: 2, two: 1 });
  assertEquals(combine({ one: 1, two: 1 })({ one: 1, two: 1 }), {
    one: 2,
    two: 2,
  });
});

Deno.test("Record getInitializableRecord", () => {
  const { combine, init } = R.getInitializableRecord(N.InitializableNumberSum);
  assertEquals(init(), {});
  assertEquals(combine({})({}), {});
  assertEquals(combine({ one: 1 })({}), { one: 1 });
  assertEquals(combine({})({ one: 1 }), { one: 1 });
  assertEquals(combine({ one: 1 })({ two: 1 }), { one: 1, two: 1 });
  assertEquals(combine({ one: 1 })({ one: 1 }), { one: 2 });
  assertEquals(combine({ one: 1, two: 1 })({ one: 1 }), { one: 2, two: 1 });
  assertEquals(combine({ one: 1 })({ one: 1, two: 1 }), { one: 2, two: 1 });
  assertEquals(combine({ one: 1, two: 1 })({ one: 1, two: 1 }), {
    one: 2,
    two: 2,
  });
});

Deno.test("Record getComparableRecord", () => {
  const { compare } = R.getComparableRecord(N.ComparableNumber);
  assertEquals(compare({})({}), true);
  assertEquals(compare({ one: 1 })({}), false);
  assertEquals(compare({})({ one: 1 }), false);
  assertEquals(compare({ one: 1 })({ one: 1 }), true);
  assertEquals(compare({ one: 1 })({ one: 2 }), false);
  assertEquals(compare({ one: 2 })({ one: 1 }), false);
});

Deno.test("Record FilterableRecord", () => {
  assertStrictEquals(R.FilterableRecord.filter, R.filter);
  assertStrictEquals(R.FilterableRecord.filterMap, R.filterMap);
  assertStrictEquals(R.FilterableRecord.partition, R.partition);
  assertStrictEquals(R.FilterableRecord.partitionMap, R.partitionMap);
});

Deno.test("Record FunctoRecord", () => {
  assertStrictEquals(R.MappableRecord.map, R.map);
});

Deno.test("Record TraversableRecord", () => {
  assertStrictEquals(R.TraversableRecord.map, R.map);
  assertStrictEquals(R.TraversableRecord.fold, R.fold);
  assertStrictEquals(R.TraversableRecord.traverse, R.traverse);
});
