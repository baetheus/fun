import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../showable.ts";
import * as N from "../number.ts";
import * as St from "../string.ts";

Deno.test("Showable struct", () => {
  const struct1 = S.struct({
    number: N.ShowableNumber,
    string: St.ShowableString,
  });
  const struct2 = S.struct({});

  assertEquals(
    struct1.show({ number: 1, string: "Hello" }),
    '{ number: 1, string: "Hello" }',
  );
  assertEquals(struct2.show({}), "{}");
});

Deno.test("Showable tuple", () => {
  const tuple1 = S.tuple(N.ShowableNumber, St.ShowableString);
  const tuple2 = S.tuple();

  assertEquals(tuple1.show([1, "Hello"]), '[1, "Hello"]');
  assertEquals(tuple2.show([]), "[]");
});
