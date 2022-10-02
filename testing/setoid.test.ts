import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../setoid.ts";
import { constant, pipe } from "../fns.ts";

Deno.test("Setoid fromEquals", () => {
  type HasId = { id: number };
  const { equals } = S.fromEquals<HasId>((first, second) =>
    first.id === second.id
  );

  assertEquals(equals({ id: 0 })({ id: 1 }), false);
  assertEquals(equals({ id: 0 })({ id: 0 }), true);
});

Deno.test("Setoid readonly", () => {
  const SetoidMutableArray = S.fromEquals<Array<number>>(
    (first, second) =>
      first.length === second.length &&
      first.every((value, index) => value === second[index]),
  );

  // This has type Setoid<Readonly<Array<string>>>
  const { equals } = S.readonly(SetoidMutableArray);

  assertEquals(equals([1, 2])([1]), false);
  assertEquals(equals([])([]), true);
  assertEquals(equals([1, 2, 3])([1, 2, 3]), true);
});

Deno.test("Setoid unknown", () => {
  const { equals } = S.unknown;

  assertEquals(equals([1, 2])([1]), false);
  assertEquals(equals([])([]), false);
  assertEquals(equals(1)(1), true);
});

Deno.test("Setoid string", () => {
  const { equals } = S.string;

  assertEquals(equals("")("Hello"), false);
  assertEquals(equals("Hello")("Hello"), true);
  assertEquals(equals("")(""), true);
});

Deno.test("Setoid number", () => {
  const { equals } = S.number;

  assertEquals(equals(1)(2), false);
  assertEquals(equals(1)(1), true);
});

Deno.test("Setoid boolean", () => {
  const { equals } = S.boolean;

  assertEquals(equals(true)(false), false);
  assertEquals(equals(true)(true), true);
});

Deno.test("Setoid literal", () => {
  const { equals } = S.literal(true, 1);

  assertEquals(equals(true)(1), false);
  assertEquals(equals(true)(true), true);
});

Deno.test("Setoid nullable", () => {
  const { equals } = S.nullable(S.boolean);

  assertEquals(equals(true)(null), false);
  assertEquals(equals(true)(true), true);
  assertEquals(equals(null)(null), true);
});

Deno.test("Setoid undefinable", () => {
  const { equals } = S.undefinable(S.boolean);

  assertEquals(equals(true)(undefined), false);
  assertEquals(equals(true)(true), true);
  assertEquals(equals(undefined)(undefined), true);
});

Deno.test("Setoid record", () => {
  const { equals } = S.record(S.boolean);

  assertEquals(equals({ one: true })({ two: true }), false);
  assertEquals(equals({ one: true })({ one: false }), false);
  assertEquals(equals({ one: true })({ one: true }), true);
  assertEquals(equals({})({}), true);
});

Deno.test("Setoid array", () => {
  const { equals } = S.array(S.boolean);

  assertEquals(equals([true])([false]), false);
  assertEquals(equals([true])([true, false]), false);
  assertEquals(equals([true, false])([true, false]), true);
  assertEquals(equals([])([]), true);
});

Deno.test("Setoid tuple", () => {
  const { equals } = S.tuple(S.boolean, S.number);

  assertEquals(equals([true, 1])([false, 2]), false);
  assertEquals(equals([true, 1])([true, 2]), false);
  assertEquals(equals([true, 1])([true, 1]), true);
  assertEquals(equals([false, 0])([false, 0]), true);
});

Deno.test("Setoid struct", () => {
  const { equals } = S.struct({ one: S.boolean, two: S.number });

  assertEquals(equals({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(equals({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Setoid partial", () => {
  const { equals } = S.partial({ one: S.boolean, two: S.number });

  assertEquals(equals({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true }), false);
  assertEquals(equals({ one: false })({ one: false }), true);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(equals({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Setoid intersect", () => {
  const { equals } = pipe(
    S.struct({ one: S.boolean }),
    S.intersect(S.partial({ two: S.number })),
  );

  assertEquals(equals({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true }), false);
  assertEquals(equals({ one: false })({ one: false }), true);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(equals({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Setoid union", () => {
  const { equals } = pipe(
    S.number,
    S.union(S.string),
    S.union(S.array(S.string)),
  );

  assertEquals(equals(0)(""), false);
  assertEquals(equals(0)(1), false);
  assertEquals(equals("")("Hello"), false);
  assertEquals(equals(1)(1), true);
  assertEquals(equals("")(""), true);

  // Some throwing examples
  const other = pipe(
    S.array(S.array(S.number)),
    S.union(S.number),
  );

  assertEquals(other.equals([])(0), false);
  assertEquals(other.equals(0)([]), false);
  assertEquals(other.equals([[0], []])([]), false);
  assertEquals(other.equals([[0]])([[0], [0]]), false);
  assertEquals(other.equals([[0], [0]])([[0], [0]]), true);

  // Force ua to throw
  const throws: S.Setoid<number> = S.fromEquals(() => {
    throw new Error("Ouch!");
  });
  const throwUnion = pipe(throws, S.union(S.number));

  assertEquals(throwUnion.equals(0)(1), false);
  assertEquals(throwUnion.equals(1)(1), true);
});

Deno.test("Setoid lazy", () => {
  type Tree = number | Tree[];
  const tree: S.Setoid<Tree> = S.lazy("Tree", () =>
    pipe(
      S.number,
      S.union(S.array(tree)),
    ));

  const { equals } = tree;

  assertEquals(equals(1)([]), false);
  assertEquals(equals([])(1), false);
  assertEquals(equals(1)(2), false);
  assertEquals(equals([])([]), true);
  assertEquals(equals([1, [2]])([1, [2]]), true);
  assertEquals(equals([1, []])([1, [1]]), false);
});

Deno.test("Setoid io", () => {
  const { equals } = S.io(S.string);

  const one = constant("one");
  const two = constant("two");

  assertEquals(equals(one)(two), false);
  assertEquals(equals(one)(one), true);
});

Deno.test("Setoid method", () => {
  const { equals } = S.method("valueOf", S.number);

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(equals(now)(later), false);
  assertEquals(equals(now)(now), true);
});

Deno.test("Setoid contramap", () => {
  const { equals } = pipe(
    S.number,
    S.contramap((d: Date) => d.valueOf()),
  );

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(equals(now)(later), false);
  assertEquals(equals(now)(now), true);
});

Deno.test("Setoid ContravariantSetoid", () => {
  assertEquals(S.ContravariantSetoid.contramap, S.contramap);
});

Deno.test("Setoid SchemableSetoid", () => {
  assertEquals(S.SchemableSetoid.unknown(), S.unknown);
  assertEquals(S.SchemableSetoid.string(), S.string);
  assertEquals(S.SchemableSetoid.number(), S.number);
  assertEquals(S.SchemableSetoid.boolean(), S.boolean);
  assertEquals(S.SchemableSetoid.literal, S.literal);
  assertEquals(S.SchemableSetoid.nullable, S.nullable);
  assertEquals(S.SchemableSetoid.undefinable, S.undefinable);
  assertEquals(S.SchemableSetoid.record, S.record);
  assertEquals(S.SchemableSetoid.array, S.array);
  assertEquals(S.SchemableSetoid.tuple, S.tuple);
  assertEquals(S.SchemableSetoid.struct, S.struct);
  assertEquals(S.SchemableSetoid.partial, S.partial);
  assertEquals(S.SchemableSetoid.intersect, S.intersect);
  assertEquals(S.SchemableSetoid.union, S.union);
  assertEquals(S.SchemableSetoid.lazy, S.lazy);
});
