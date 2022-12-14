import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "../refinement.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

Deno.test("Refinement fromOption", () => {
  const refine = R.fromOption((u: unknown) =>
    typeof u === "number" ? O.some(u) : O.none
  );
  assertEquals(refine(null), false);
  assertEquals(refine(1), true);
});

Deno.test("Refinement fromEither", () => {
  const refine = R.fromEither((u: unknown) =>
    typeof u === "number" ? E.right(u) : E.left(u)
  );
  assertEquals(refine(0), true);
  assertEquals(refine(null), false);
});

Deno.test("Refinement and", () => {
  const refine = pipe(
    R.struct({ two: R.boolean }),
    R.and(R.struct({ one: R.number })),
  );
  assertEquals(refine({}), false);
  assertEquals(refine(1), false);
  assertEquals(refine({ two: true }), false);
  assertEquals(refine({ one: 1 }), false);
  assertEquals(refine({ one: 1, two: true }), true);
});

Deno.test("Refinement or", () => {
  const refine = pipe(
    R.number,
    R.or(R.boolean),
  );
  assertEquals(refine(null), false);
  assertEquals(refine("asdf"), false);
  assertEquals(refine(1), true);
  assertEquals(refine(true), true);
});

Deno.test("Refinement id", () => {
  assertEquals(R.id()(1), true);
});

Deno.test("Refinement compose", () => {
  const isBig = (s: string): s is "Big" => s === "Big";
  const composed = pipe(R.string, R.compose(isBig));
  assertEquals(composed(null), false);
  assertEquals(composed("Big"), true);
});

Deno.test("Refinement unknown", () => {
  assertEquals(R.unknown(1), true);
});

Deno.test("Refinement string", () => {
  assertEquals(R.string("asdf"), true);
  assertEquals(R.string(1), false);
});

Deno.test("Refinement number", () => {
  assertEquals(R.number("asdf"), false);
  assertEquals(R.number(1), true);
});

Deno.test("Refinement boolean", () => {
  assertEquals(R.boolean(true), true);
  assertEquals(R.boolean(false), true);
  assertEquals(R.boolean("asdf"), false);
});

Deno.test("Refinement literal", () => {
  const literal = R.literal(1, 2, 3);
  assertEquals(literal(1), true);
  assertEquals(literal(2), true);
  assertEquals(literal(3), true);
  assertEquals(literal(4), false);
});

Deno.test("Refinement undefinable", () => {
  const refine = R.undefinable(R.literal(1));
  assertEquals(refine(1), true);
  assertEquals(refine(undefined), true);
  assertEquals(refine(null), false);
});

Deno.test("Refinement nullable", () => {
  const refine = R.nullable(R.literal(1));
  assertEquals(refine(1), true);
  assertEquals(refine(undefined), false);
  assertEquals(refine(null), true);
});

Deno.test("Refinement record", () => {
  const refine = R.record(R.number);
  assertEquals(refine({}), true);
  assertEquals(refine({ "one": 1 }), true);
  assertEquals(refine({ "one": false }), false);
  assertEquals(refine(1), false);
});

Deno.test("Refinement array", () => {
  const refine = R.array(R.boolean);
  assertEquals(refine(true), false);
  assertEquals(refine([]), true);
  assertEquals(refine([true]), true);
  assertEquals(refine(["asdf"]), false);
});

Deno.test("Refinement tuple", () => {
  const refine = R.tuple(R.literal("Left", "Right"), R.number);
  assertEquals(refine(["Left", 1]), true);
  assertEquals(refine(["Right", 1]), true);
  assertEquals(refine(false), false);
  assertEquals(refine(["Left"]), false);
});

Deno.test("Refinement struct", () => {
  const refine = R.struct({ one: R.number });
  assertEquals(refine({}), false);
  assertEquals(refine(1), false);
  assertEquals(refine({ one: false }), false);
  assertEquals(refine({ one: 1 }), true);
});

Deno.test("Refinement partial", () => {
  const refine = R.partial({ one: R.number });
  assertEquals(refine({}), true);
  assertEquals(refine(1), false);
  assertEquals(refine({ one: false }), false);
  assertEquals(refine({ one: 1 }), true);
});

Deno.test("Refinement intersect", () => {
  const refine = pipe(
    R.struct({ two: R.boolean }),
    R.intersect(R.struct({ one: R.number })),
  );
  assertEquals(refine({}), false);
  assertEquals(refine(1), false);
  assertEquals(refine({ two: true }), false);
  assertEquals(refine({ one: 1 }), false);
  assertEquals(refine({ one: 1, two: true }), true);
});

Deno.test("Refinement union", () => {
  const refine = pipe(
    R.number,
    R.union(R.boolean),
  );
  assertEquals(refine(null), false);
  assertEquals(refine("asdf"), false);
  assertEquals(refine(1), true);
  assertEquals(refine(true), true);
});

Deno.test("Refinement lazy", () => {
  const refine = R.lazy("One", () => R.number);
  assertEquals(refine(1), true);
  assertEquals(refine(true), false);
});
