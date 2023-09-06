import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as C from "../comparable.ts";
import { constant, pipe } from "../fn.ts";

Deno.test("Comparable fromCompare", () => {
  type HasId = { id: number };
  const { compare } = C.fromCompare<HasId>((second) => (first) =>
    first.id === second.id
  );

  assertEquals(compare({ id: 0 })({ id: 1 }), false);
  assertEquals(compare({ id: 0 })({ id: 0 }), true);
});

Deno.test("Comparable readonly", () => {
  const ComparableMutableArray = C.fromCompare<Array<number>>(
    (second) => (first) =>
      first.length === second.length &&
      first.every((value, index) => value === second[index]),
  );

  // This has type Comparable<Readonly<Array<string>>>
  const { compare } = C.readonly(ComparableMutableArray);

  assertEquals(compare([1, 2])([1]), false);
  assertEquals(compare([])([]), true);
  assertEquals(compare([1, 2, 3])([1, 2, 3]), true);
});

Deno.test("Comparable unknown", () => {
  const { compare } = C.unknown;

  assertEquals(compare([1, 2])([1]), false);
  assertEquals(compare([])([]), false);
  assertEquals(compare(1)(1), true);
});

Deno.test("Comparable string", () => {
  const { compare } = C.string;

  assertEquals(compare("")("Hello"), false);
  assertEquals(compare("Hello")("Hello"), true);
  assertEquals(compare("")(""), true);
});

Deno.test("Comparable number", () => {
  const { compare } = C.number;

  assertEquals(compare(1)(2), false);
  assertEquals(compare(1)(1), true);
});

Deno.test("Comparable boolean", () => {
  const { compare } = C.boolean;

  assertEquals(compare(true)(false), false);
  assertEquals(compare(true)(true), true);
});

Deno.test("Comparable literal", () => {
  const { compare } = C.literal(true, 1);

  assertEquals(compare(true)(1), false);
  assertEquals(compare(true)(true), true);
});

Deno.test("Comparable nullable", () => {
  const { compare } = C.nullable(C.boolean);

  assertEquals(compare(true)(null), false);
  assertEquals(compare(true)(true), true);
  assertEquals(compare(null)(null), true);
});

Deno.test("Comparable undefinable", () => {
  const { compare } = C.undefinable(C.boolean);

  assertEquals(compare(true)(undefined), false);
  assertEquals(compare(true)(true), true);
  assertEquals(compare(undefined)(undefined), true);
});

Deno.test("Comparable record", () => {
  const { compare } = C.record(C.boolean);

  assertEquals(compare({ one: true })({ two: true }), false);
  assertEquals(compare({ one: true })({ one: false }), false);
  assertEquals(compare({ one: true })({ one: true }), true);
  assertEquals(compare({})({}), true);
});

Deno.test("Comparable array", () => {
  const { compare } = C.array(C.boolean);

  assertEquals(compare([true])([false]), false);
  assertEquals(compare([true])([true, false]), false);
  assertEquals(compare([true, false])([true, false]), true);
  assertEquals(compare([])([]), true);
});

Deno.test("Comparable tuple", () => {
  const { compare } = C.tuple(C.boolean, C.number);

  assertEquals(compare([true, 1])([false, 2]), false);
  assertEquals(compare([true, 1])([true, 2]), false);
  assertEquals(compare([true, 1])([true, 1]), true);
  assertEquals(compare([false, 0])([false, 0]), true);
});

Deno.test("Comparable struct", () => {
  const { compare } = C.struct({ one: C.boolean, two: C.number });

  assertEquals(compare({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(compare({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Comparable partial", () => {
  const { compare } = C.partial({ one: C.boolean, two: C.number });

  assertEquals(compare({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true }), false);
  assertEquals(compare({ one: false })({ one: false }), true);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(compare({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Comparable intersect", () => {
  const { compare } = pipe(
    C.struct({ one: C.boolean }),
    C.intersect(C.partial({ two: C.number })),
  );

  assertEquals(compare({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(compare({ one: true, two: 1 })({ one: true }), false);
  assertEquals(compare({ one: false })({ one: false }), true);
  assertEquals(compare({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(compare({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Comparable union", () => {
  const { compare } = pipe(
    C.number,
    C.union(C.string),
    C.union(C.array(C.string)),
  );

  assertEquals(compare(0)(""), false);
  assertEquals(compare(0)(1), false);
  assertEquals(compare("")("Hello"), false);
  assertEquals(compare(1)(1), true);
  assertEquals(compare("")(""), true);

  // Some throwing examples
  const other = pipe(
    C.array(C.array(C.number)),
    C.union(C.number),
  );

  assertEquals(other.compare([])(0), false);
  assertEquals(other.compare(0)([]), false);
  assertEquals(other.compare([[0], []])([]), false);
  assertEquals(other.compare([[0]])([[0], [0]]), false);
  assertEquals(other.compare([[0], [0]])([[0], [0]]), true);

  // Force ua to throw
  const throws: C.Comparable<number> = C.fromCompare(() => {
    throw new Error("Ouch!");
  });
  const throwUnion1 = pipe(throws, C.union(C.number));
  const throwUnion2 = pipe(C.number, C.union(throws));

  assertEquals(throwUnion1.compare(0)(1), false);
  assertEquals(throwUnion1.compare(1)(1), true);
  assertEquals(throwUnion2.compare(0)(1), false);
  assertEquals(throwUnion2.compare(1)(1), true);
});

Deno.test("Comparable lazy", () => {
  type Tree = number | readonly Tree[];
  const tree: C.Comparable<Tree> = C.lazy("Tree", () =>
    pipe(
      C.number,
      C.union(C.array(tree)),
    ));

  const { compare } = tree;

  assertEquals(compare(1)([]), false);
  assertEquals(compare([])(1), false);
  assertEquals(compare(1)(2), false);
  assertEquals(compare([])([]), true);
  assertEquals(compare([1, [2]])([1, [2]]), true);
  assertEquals(compare([1, []])([1, [1]]), false);
});

Deno.test("Comparable thunk", () => {
  const { compare } = C.thunk(C.string);

  const one = constant("one");
  const two = constant("two");

  assertEquals(compare(one)(two), false);
  assertEquals(compare(one)(one), true);
});

Deno.test("Comparable method", () => {
  const { compare } = C.method("valueOf", C.number);

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(compare(now)(later), false);
  assertEquals(compare(now)(now), true);
});

Deno.test("Comparable premap", () => {
  const { compare } = pipe(
    C.number,
    C.premap((d: Date) => d.valueOf()),
  );

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(compare(now)(later), false);
  assertEquals(compare(now)(now), true);
});

Deno.test("Comparable PremappableComparable", () => {
  assertEquals(C.PremappableComparable.premap, C.premap);
});

Deno.test("Comparable SchemableComparable", () => {
  assertEquals(C.SchemableComparable.unknown(), C.unknown);
  assertEquals(C.SchemableComparable.string(), C.string);
  assertEquals(C.SchemableComparable.number(), C.number);
  assertEquals(C.SchemableComparable.boolean(), C.boolean);
  assertEquals(C.SchemableComparable.literal, C.literal);
  assertEquals(C.SchemableComparable.nullable, C.nullable);
  assertEquals(C.SchemableComparable.undefinable, C.undefinable);
  assertEquals(C.SchemableComparable.record, C.record);
  assertEquals(C.SchemableComparable.array, C.array);
  assertEquals(C.SchemableComparable.tuple, C.tuple);
  assertEquals(C.SchemableComparable.struct, C.struct);
  assertEquals(C.SchemableComparable.partial, C.partial);
  assertEquals(C.SchemableComparable.intersect, C.intersect);
  assertEquals(C.SchemableComparable.union, C.union);
  assertEquals(C.SchemableComparable.lazy, C.lazy);
});
