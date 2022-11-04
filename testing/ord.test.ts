import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as O from "../ord.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";
import { pipe } from "../fn.ts";

Deno.test("Ord sign", () => {
  assertEquals(O.sign(Number.NEGATIVE_INFINITY), -1);
  assertEquals(O.sign(Number.POSITIVE_INFINITY), 1);
  assertEquals(O.sign(0), 0);
  assertEquals(O.sign(-56), -1);
  assertEquals(O.sign(56), 1);
  assertEquals(O.sign(-0.34), -1);
  assertEquals(O.sign(0.45), 1);
});

Deno.test("Ord fromCompare", () => {
  const { compare, equals } = O.fromCompare(N.compare);
  // compare
  assertEquals(compare(0, 0), 0);
  assertEquals(compare(0, 1), -1);
  assertEquals(compare(1, 0), 1);
  // equals
  assertEquals(equals(0)(0), true);
  assertEquals(equals(0)(1), false);
  assertEquals(equals(1)(0), false);
});

Deno.test("Ord lt", () => {
  const lt = O.lt(N.OrdNumber);
  assertEquals(lt(0)(0), false);
  assertEquals(lt(0)(1), false);
  assertEquals(lt(1)(0), true);
});

Deno.test("Ord gt", () => {
  const gt = O.gt(N.OrdNumber);
  assertEquals(gt(0)(0), false);
  assertEquals(gt(0)(1), true);
  assertEquals(gt(1)(0), false);
});

Deno.test("Ord lte", () => {
  const lte = O.lte(N.OrdNumber);
  assertEquals(lte(0)(0), true);
  assertEquals(lte(0)(1), false);
  assertEquals(lte(1)(0), true);
});

Deno.test("Ord gte", () => {
  const gte = O.gte(N.OrdNumber);
  assertEquals(gte(0)(0), true);
  assertEquals(gte(1)(0), false);
  assertEquals(gte(0)(1), true);
});

Deno.test("Ord min", () => {
  const min = O.min(N.OrdNumber);
  assertEquals(min(0)(0), 0);
  assertEquals(min(0)(1), 0);
  assertEquals(min(1)(0), 0);
});

Deno.test("Ord max", () => {
  const max = O.max(N.OrdNumber);
  assertEquals(max(0)(0), 0);
  assertEquals(max(0)(1), 1);
  assertEquals(max(1)(0), 1);
});

Deno.test("Ord clamp", () => {
  const clamp = O.clamp(N.OrdNumber);
  assertEquals(clamp(0, 2)(-1), 0);
  assertEquals(clamp(0, 2)(0), 0);
  assertEquals(clamp(0, 2)(1), 1);
  assertEquals(clamp(0, 2)(2), 2);
  assertEquals(clamp(0, 2)(3), 2);
});

Deno.test("Ord between", () => {
  const between = O.between(N.OrdNumber);
  assertEquals(between(0, 2)(-1), false);
  assertEquals(between(0, 2)(0), false);
  assertEquals(between(0, 2)(1), true);
  assertEquals(between(0, 10)(5), true);
  assertEquals(between(0, 2)(2), false);
  assertEquals(between(0, 2)(3), false);
});

Deno.test("Ord trivial", () => {
  // Every Date is the same!
  const trivial = O.trivial<Date>();
  const now = new Date();
  const later = new Date(Date.now() + 60 * 60 * 1000);

  assertEquals(trivial.compare(now, later), 0);
  assertEquals(trivial.compare(later, now), 0);
  assertEquals(trivial.compare(later, later), 0);
  assertEquals(trivial.compare(now, now), 0);
});

Deno.test("Ord reverse", () => {
  const reverse = O.reverse(N.OrdNumber);

  assertEquals(reverse.compare(0, 0), 0);
  assertEquals(reverse.compare(0, 1), 1);
  assertEquals(reverse.compare(1, 0), -1);
});

Deno.test("Ord tuple", () => {
  const tuple = O.tuple(N.OrdNumber, N.OrdNumber);

  assertEquals(tuple.compare([1, 1], [2, 1]), -1);
  assertEquals(tuple.compare([1, 1], [1, 2]), -1);
  assertEquals(tuple.compare([1, 1], [1, 1]), 0);
  assertEquals(tuple.compare([1, 1], [1, 0]), 1);
  assertEquals(tuple.compare([1, 1], [0, 1]), 1);
});

Deno.test("Ord struct", () => {
  const tuple = O.struct({
    name: S.OrdString,
    age: N.OrdNumber,
  });

  assertEquals(
    tuple.compare({ name: "Brandon", age: 37 }, { name: "Emily", age: 32 }),
    -1,
  );
  assertEquals(
    tuple.compare({ name: "Brandon", age: 37 }, { name: "Brandon", age: 32 }),
    1,
  );
  assertEquals(
    tuple.compare({ name: "Brandon", age: 37 }, { name: "Emily", age: 0 }),
    -1,
  );
  assertEquals(
    tuple.compare({ name: "Brandon", age: 37 }, { name: "Brandon", age: 37 }),
    0,
  );
});

Deno.test("Ord contramap", () => {
  type Person = { name: string; age: number };
  const byAge = pipe(
    N.OrdNumber,
    O.contramap((p: Person) => p.age),
  );

  assertEquals(
    byAge.compare({ name: "Brandon", age: 37 }, { name: "Emily", age: 32 }),
    1,
  );
  assertEquals(
    byAge.compare({ name: "Brandon", age: 37 }, { name: "Brandon", age: 37 }),
    0,
  );
  assertEquals(
    byAge.compare({ name: "Brandon", age: 37 }, { name: "Brian", age: 37 }),
    0,
  );
  assertEquals(
    byAge.compare({ name: "Brandon", age: 37 }, { name: "Patrick", age: 50 }),
    -1,
  );
});

Deno.test("Ord ContravariantOrd", () => {
  assertStrictEquals(O.ContravariantOrd.contramap, O.contramap);
});
