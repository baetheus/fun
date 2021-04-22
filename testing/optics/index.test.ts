import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../../optics/index.ts";
import * as O from "../../option.ts";

Deno.test("Index indexArray", () => {
  const index = I.indexArray<number>();
  const { getOption, set } = index.index(1);

  assertEquals(getOption([]), O.none);
  assertEquals(getOption([1]), O.none);
  assertEquals(getOption([1, 2]), O.some(2));

  assertEquals(set(1)([]), []);
  assertEquals(set(1)([1]), [1]);
  assertEquals(set(1)([1, 2]), [1, 1]);
});

Deno.test("Index indexRecord", () => {
  const index = I.indexRecord<number>();
  const { getOption, set } = index.index("one");

  assertEquals(getOption({}), O.none);
  assertEquals(getOption({ two: 2 }), O.none);
  assertEquals(getOption({ one: 1 }), O.some(1));

  assertEquals(set(2)({}), {});
  assertEquals(set(2)({ two: 2 }), { two: 2 });
  assertEquals(set(2)({ one: 1 }), { one: 2 });
  assertEquals(set(1)({ one: 1 }), { one: 1 });
});
