import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../../schemable/decode_error.ts";
import { draw } from "../../schemable/decoder.ts";
import { Free } from "../../semigroup.ts";
import { pipe } from "../../fns.ts";

const { leaf, key, index, member, lazy, wrap } = D.make;

Deno.test("DecodeError leaf", () => {
  assertEquals(leaf(1, 1), {
    tag: "Of",
    value: { tag: "Leaf", actual: 1, error: 1 },
  });
});

Deno.test("DecodeError key", () => {
  assertEquals(key("one", D.required, leaf(1, 1)), {
    tag: "Of",
    value: {
      tag: "Key",
      key: "one",
      kind: D.required,
      errors: {
        tag: "Of",
        value: {
          tag: "Leaf",
          actual: 1,
          error: 1,
        },
      },
    },
  });
});

Deno.test("DecodeError index", () => {
  assertEquals(index(0, D.optional, leaf(1, 1)), {
    tag: "Of",
    value: {
      tag: "Index",
      index: 0,
      kind: D.optional,
      errors: {
        tag: "Of",
        value: { tag: "Leaf", actual: 1, error: 1 },
      },
    },
  });
});

Deno.test("DecodeError member", () => {
  assertEquals(member(0, leaf(1, 1)), {
    tag: "Of",
    value: {
      tag: "Member",
      index: 0,
      errors: {
        tag: "Of",
        value: { tag: "Leaf", actual: 1, error: 1 },
      },
    },
  });
});

Deno.test("DecodeError lazy", () => {
  assertEquals(lazy("one", leaf(1, 1)), {
    tag: "Of",
    value: {
      tag: "Lazy",
      id: "one",
      errors: {
        tag: "Of",
        value: { tag: "Leaf", actual: 1, error: 1 },
      },
    },
  });
});

Deno.test("DecodeError wrap", () => {
  assertEquals(wrap(1, leaf(1, 1)), {
    tag: "Of",
    value: {
      tag: "Wrap",
      error: 1,
      errors: {
        tag: "Of",
        value: { tag: "Leaf", actual: 1, error: 1 },
      },
    },
  });
});

Deno.test("DecodeError fold", () => {
  assertEquals(draw(leaf(1, "1")), "cannot decode 1, should be 1");
  assertEquals(
    draw(key("one", D.required, leaf(1, "1"))),
    'required property "one"\n└─ cannot decode 1, should be 1',
  );
  assertEquals(
    draw(index(1, D.required, leaf(1, "1"))),
    "required index 1\n└─ cannot decode 1, should be 1",
  );
  assertEquals(
    draw(member(0, leaf(1, "1"))),
    "member 0\n└─ cannot decode 1, should be 1",
  );
  assertEquals(
    draw(lazy("One", leaf(1, "1"))),
    "lazy type One\n└─ cannot decode 1, should be 1",
  );
  assertEquals(
    draw(wrap("2", leaf(1, "1"))),
    "2\n└─ cannot decode 1, should be 1",
  );
  assertEquals(
    draw(pipe(leaf(1, "1"), Free.concat(leaf(2, "2")))),
    "cannot decode 2, should be 2\ncannot decode 1, should be 1",
  );
});

Deno.test("DecodeError getSemigroup", () => {
  const { concat } = D.getSemigroup<string>();
  assertEquals(
    pipe(leaf(1, "1"), concat(leaf(2, "2"))),
    {
      left: {
        tag: "Of",
        value: {
          actual: 2,
          error: "2",
          tag: "Leaf",
        },
      },
      right: {
        tag: "Of",
        value: {
          actual: 1,
          error: "1",
          tag: "Leaf",
        },
      },
      tag: "Concat",
    },
  );
});


