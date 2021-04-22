import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as A from "../../optics/at.ts";
import * as O from "../../option.ts";

Deno.test("At atRecord", () => {
  const at = A.atRecord<number>();
  const { get, set } = at.at("one");

  assertEquals(get({}), O.none);
  assertEquals(get({ two: 1 }), O.none);
  assertEquals(get({ one: 1 }), O.some(1));

  assertEquals(set(O.none)({}), {});
  assertEquals(set(O.none)({ one: 1 }), {});
  assertEquals(set(O.some(1))({}), { one: 1 });
  assertEquals(set(O.some(1))({ one: 2 }), { one: 1 });
  assertEquals(set(O.some(1))({ one: 1 }), { one: 1 });
});

Deno.test("At atMap", () => {
  const at = A.atMap<number>();
  const { get, set } = at.at("one");

  assertEquals(get(new Map()), O.none);
  assertEquals(get(new Map([["one", 1]])), O.some(1));
  assertEquals(get(new Map([["two", 1]])), O.none);

  assertEquals(set(O.none)(new Map()), new Map());
  assertEquals(set(O.none)(new Map([["one", 1]])), new Map());
  assertEquals(set(O.some(1))(new Map()), new Map([["one", 1]]));
  assertEquals(set(O.some(1))(new Map([["one", 2]])), new Map([["one", 1]]));
  assertEquals(set(O.some(1))(new Map([["one", 1]])), new Map([["one", 1]]));
});
