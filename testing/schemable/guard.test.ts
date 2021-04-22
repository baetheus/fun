import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as G from "../../schemable/guard.ts";
import { pipe } from "../../fns.ts";

Deno.test("Guard unknown", () => {
  assertEquals(G.unknown(1), true);
});

Deno.test("Guard string", () => {
  assertEquals(G.string("asdf"), true);
  assertEquals(G.string(1), false);
});

Deno.test("Guard number", () => {
  assertEquals(G.number("asdf"), false);
  assertEquals(G.number(1), true);
});

Deno.test("Guard boolean", () => {
  assertEquals(G.boolean(true), true);
  assertEquals(G.boolean(false), true);
  assertEquals(G.boolean("asdf"), false);
});

Deno.test("Guard literal", () => {
  const literal = G.literal(1, 2, 3);
  assertEquals(literal(1), true);
  assertEquals(literal(2), true);
  assertEquals(literal(3), true);
  assertEquals(literal(4), false);
});

Deno.test("Guard undefinable", () => {
  const guard = G.undefinable(G.literal(1));
  assertEquals(guard(1), true);
  assertEquals(guard(undefined), true);
  assertEquals(guard(null), false);
});

Deno.test("Guard nullable", () => {
  const guard = G.nullable(G.literal(1));
  assertEquals(guard(1), true);
  assertEquals(guard(undefined), false);
  assertEquals(guard(null), true);
});

Deno.test("Guard record", () => {
  const guard = G.record(G.number);
  assertEquals(guard({}), true);
  assertEquals(guard({ "one": 1 }), true);
  assertEquals(guard({ "one": false }), false);
  assertEquals(guard(1), false);
});

Deno.test("Guard array", () => {
  const guard = G.array(G.boolean);
  assertEquals(guard(true), false);
  assertEquals(guard([]), true);
  assertEquals(guard([true]), true);
  assertEquals(guard(["asdf"]), false);
});

Deno.test("Guard tuple", () => {
  const guard = G.tuple(G.literal("Left", "Right"), G.number);
  assertEquals(guard(["Left", 1]), true);
  assertEquals(guard(["Right", 1]), true);
  assertEquals(guard(false), false);
  assertEquals(guard(["Left"]), false);
});

Deno.test("Guard struct", () => {
  const guard = G.struct({ one: G.number });
  assertEquals(guard({}), false);
  assertEquals(guard(1), false);
  assertEquals(guard({ one: false }), false);
  assertEquals(guard({ one: 1 }), true);
});

Deno.test("Guard partial", () => {
  const guard = G.partial({ one: G.number });
  assertEquals(guard({}), true);
  assertEquals(guard(1), false);
  assertEquals(guard({ one: false }), false);
  assertEquals(guard({ one: 1 }), true);
});

Deno.test("Guard intersect", () => {
  const guard = pipe(
    G.struct({ two: G.boolean }),
    G.intersect(G.struct({ one: G.number })),
  );
  assertEquals(guard({}), false);
  assertEquals(guard(1), false);
  assertEquals(guard({ two: true }), false);
  assertEquals(guard({ one: 1 }), false);
  assertEquals(guard({ one: 1, two: true }), true);
});

Deno.test("Guard union", () => {
  const guard = pipe(
    G.number,
    G.union(G.boolean),
  );
  assertEquals(guard(null), false);
  assertEquals(guard("asdf"), false);
  assertEquals(guard(1), true);
  assertEquals(guard(true), true);
});

Deno.test("Guard lazy", () => {
  const guard = G.lazy("One", () => G.number);
  assertEquals(guard(1), true);
  assertEquals(guard(true), false);
});
