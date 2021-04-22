import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../../schemable/decoder.ts";
import * as G from "../../schemable/guard.ts";
import * as DE from "../../schemable/decode_error.ts";
import * as E from "../../either.ts";

Deno.test("Decoder success", () => {
  assertEquals(D.success(1), E.right(1));
});

Deno.test("Decoder failure", () => {
  assertEquals(D.failure(1, "1"), E.left(DE.make.leaf(1, "1")));
});

Deno.test("Decoder fromGuard", () => {
  const decoder = D.fromGuard(G.number, "number");
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(true), D.failure(true, "number"));
});

Deno.test("Decoder unknown", () => {
  assertEquals(D.unknown(1), D.success(1));
});

Deno.test("Decoder string", () => {
  assertEquals(D.string("asdf"), D.success("asdf"));
  assertEquals(D.string(1), D.failure(1, "string"));
});

Deno.test("Decoder number", () => {
  assertEquals(D.number(1), D.success(1));
  assertEquals(D.number(false), D.failure(false, "number"));
});

Deno.test("Decoder boolean", () => {
  assertEquals(D.boolean(true), D.success(true));
  assertEquals(D.boolean(false), D.success(false));
  assertEquals(D.boolean(0), D.failure(0, "boolean"));
});

Deno.test("Decoder literal", () => {
  const literal = D.literal(1, 2, 3);
  assertEquals(literal(1), D.success(1));
  assertEquals(literal(false), D.failure(false, "literal 1, 2, or 3"));
});

Deno.test("Decoder nullable", () => {
  const decoder = D.undefinable(D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(undefined), D.success(undefined));
  // assertEquals(decoder(true), D.failure(true, ""));
});
