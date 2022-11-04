import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../eq.ts";
import { of, pipe } from "../fn.ts";

Deno.test("Eq fromEquals", () => {
  type HasId = { id: number };
  const { equals } = S.fromEquals<HasId>((first, second) =>
    first.id === second.id
  );

  assertEquals(equals({ id: 0 })({ id: 1 }), false);
  assertEquals(equals({ id: 0 })({ id: 0 }), true);
});

Deno.test("Eq readonly", () => {
  const EqMutableArray = S.fromEquals<Array<number>>(
    (first, second) =>
      first.length === second.length &&
      first.every((value, index) => value === second[index]),
  );

  // This has type Eq<Readonly<Array<string>>>
  const { equals } = S.readonly(EqMutableArray);

  assertEquals(equals([1, 2])([1]), false);
  assertEquals(equals([])([]), true);
  assertEquals(equals([1, 2, 3])([1, 2, 3]), true);
});

Deno.test("Eq unknown", () => {
  const { equals } = S.unknown;

  assertEquals(equals([1, 2])([1]), false);
  assertEquals(equals([])([]), false);
  assertEquals(equals(1)(1), true);
});

Deno.test("Eq string", () => {
  const { equals } = S.string;

  assertEquals(equals("")("Hello"), false);
  assertEquals(equals("Hello")("Hello"), true);
  assertEquals(equals("")(""), true);
});

Deno.test("Eq number", () => {
  const { equals } = S.number;

  assertEquals(equals(1)(2), false);
  assertEquals(equals(1)(1), true);
});

Deno.test("Eq boolean", () => {
  const { equals } = S.boolean;

  assertEquals(equals(true)(false), false);
  assertEquals(equals(true)(true), true);
});

Deno.test("Eq literal", () => {
  const { equals } = S.literal(true, 1);

  assertEquals(equals(true)(1), false);
  assertEquals(equals(true)(true), true);
});

Deno.test("Eq nullable", () => {
  const { equals } = S.nullable(S.boolean);

  assertEquals(equals(true)(null), false);
  assertEquals(equals(true)(true), true);
  assertEquals(equals(null)(null), true);
});

Deno.test("Eq undefinable", () => {
  const { equals } = S.undefinable(S.boolean);

  assertEquals(equals(true)(undefined), false);
  assertEquals(equals(true)(true), true);
  assertEquals(equals(undefined)(undefined), true);
});

Deno.test("Eq record", () => {
  const { equals } = S.record(S.boolean);

  assertEquals(equals({ one: true })({ two: true }), false);
  assertEquals(equals({ one: true })({ one: false }), false);
  assertEquals(equals({ one: true })({ one: true }), true);
  assertEquals(equals({})({}), true);
});

Deno.test("Eq array", () => {
  const { equals } = S.array(S.boolean);

  assertEquals(equals([true])([false]), false);
  assertEquals(equals([true])([true, false]), false);
  assertEquals(equals([true, false])([true, false]), true);
  assertEquals(equals([])([]), true);
});

Deno.test("Eq tuple", () => {
  const { equals } = S.tuple(S.boolean, S.number);

  assertEquals(equals([true, 1])([false, 2]), false);
  assertEquals(equals([true, 1])([true, 2]), false);
  assertEquals(equals([true, 1])([true, 1]), true);
  assertEquals(equals([false, 0])([false, 0]), true);
});

Deno.test("Eq struct", () => {
  const { equals } = S.struct({ one: S.boolean, two: S.number });

  assertEquals(equals({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(equals({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Eq partial", () => {
  const { equals } = S.partial({ one: S.boolean, two: S.number });

  assertEquals(equals({ one: true, two: 1 })({ one: false, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 2 }), false);
  assertEquals(equals({ one: true, two: 1 })({ one: true }), false);
  assertEquals(equals({ one: false })({ one: false }), true);
  assertEquals(equals({ one: true, two: 1 })({ one: true, two: 1 }), true);
  assertEquals(equals({ one: false, two: 1 })({ one: false, two: 1 }), true);
});

Deno.test("Eq intersect", () => {
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

Deno.test("Eq union", () => {
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
  const throws: S.Eq<number> = S.fromEquals(() => {
    throw new Error("Ouch!");
  });
  const throwUnion = pipe(throws, S.union(S.number));

  assertEquals(throwUnion.equals(0)(1), false);
  assertEquals(throwUnion.equals(1)(1), true);
});

Deno.test("Eq lazy", () => {
  type Tree = number | Tree[];
  const tree: S.Eq<Tree> = S.lazy("Tree", () =>
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

Deno.test("Eq io", () => {
  const { equals } = S.io(S.string);

  const one = of("one");
  const two = of("two");

  assertEquals(equals(one)(two), false);
  assertEquals(equals(one)(one), true);
});

Deno.test("Eq method", () => {
  const { equals } = S.method("valueOf", S.number);

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(equals(now)(later), false);
  assertEquals(equals(now)(now), true);
});

Deno.test("Eq contramap", () => {
  const { equals } = pipe(
    S.number,
    S.contramap((d: Date) => d.valueOf()),
  );

  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(equals(now)(later), false);
  assertEquals(equals(now)(now), true);
});

Deno.test("Eq ContravariantEq", () => {
  assertEquals(S.ContravariantEq.contramap, S.contramap);
});

Deno.test("Eq SchemableEq", () => {
  assertEquals(S.SchemableEq.unknown(), S.unknown);
  assertEquals(S.SchemableEq.string(), S.string);
  assertEquals(S.SchemableEq.number(), S.number);
  assertEquals(S.SchemableEq.boolean(), S.boolean);
  assertEquals(S.SchemableEq.literal, S.literal);
  assertEquals(S.SchemableEq.nullable, S.nullable);
  assertEquals(S.SchemableEq.undefinable, S.undefinable);
  assertEquals(S.SchemableEq.record, S.record);
  assertEquals(S.SchemableEq.array, S.array);
  assertEquals(S.SchemableEq.tuple, S.tuple);
  assertEquals(S.SchemableEq.struct, S.struct);
  assertEquals(S.SchemableEq.partial, S.partial);
  assertEquals(S.SchemableEq.intersect, S.intersect);
  assertEquals(S.SchemableEq.union, S.union);
  assertEquals(S.SchemableEq.lazy, S.lazy);
});
