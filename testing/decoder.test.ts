import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../decoder.ts";
import * as G from "../guard.ts";
import * as R from "../result.ts";
import * as E from "../either.ts";
import { flow, pipe } from "../fns.ts";

const out = flow(
  D.extract,
  E.fold((s: string) => s, (a) => JSON.stringify(a)),
);

Deno.test("Decoder success", () => {
  assertEquals(D.success(1), E.right(1));
});

Deno.test("Decoder failure", () => {
  assertEquals(D.failure(1, "1"), E.left(R.ofLeaf(1, "1")));
});

Deno.test("Decoder fromGuard", () => {
  const decoder = D.fromGuard(G.number, "number");
  assertEquals(typeof decoder, "function");
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(true), D.failure(true, "number"));
});

Deno.test("Decoder extract", () => {
  const decoder = D.literal(null);
  assertEquals(D.extract(decoder(null)), E.right(null));
  assertEquals(
    D.extract(decoder(1)),
    E.left("cannot decode 1, should be null"),
  );
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
  assertEquals(literal(false), D.failure(false, "1, 2, 3"));

  const l2 = D.literal(null);
  assertEquals(l2(null), D.success(null));
  assertEquals(l2(1), D.failure(1, "null"));

  const l3 = D.literal(1, 2);
  assertEquals(l3(1), D.success(1));
  assertEquals(l3(2), D.success(2));
  assertEquals(l3(null), D.failure(null, "1, 2"));

  const l4 = D.literal("one");
  assertEquals(l4(null), D.failure(null, '"one"'));
  assertEquals(l4("one"), D.success("one"));
});

Deno.test("Decoder nullable", () => {
  const decoder = D.nullable(D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(null), D.success(null));
  assertEquals(
    out(decoder(true)),
    `cannot decode nullable
├─ cannot decode true, should be number
└─ cannot decode true, should be null`,
  );
});

Deno.test("Decoder undefinable", () => {
  const decoder = D.undefinable(D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(undefined), D.success(undefined));
  assertEquals(
    out(decoder(true)),
    `cannot decode undefinable
├─ cannot decode true, should be number
└─ cannot decode true, should be undefined`,
  );
});

Deno.test("Decoder record", () => {
  const decoder = D.record(D.number);
  assertEquals(decoder({}), D.success({}));
  assertEquals(decoder({ one: 1 }), D.success({ one: 1 }));
  assertEquals(decoder({ one: 1, two: 2 }), D.success({ one: 1, two: 2 }));
  assertEquals(out(decoder(null)), "cannot decode null, should be record");
  assertEquals(
    out(decoder({ one: "one" })),
    'cannot decode record\n└─ optional property "one"\n   └─ cannot decode "one", should be number',
  );
});

Deno.test("Decoder array", () => {
  const decoder = D.array(D.number);
  assertEquals(decoder([]), D.success([]));
  assertEquals(decoder([1]), D.success([1]));
  assertEquals(decoder([1, 2]), D.success([1, 2]));
  assertEquals(out(decoder(null)), "cannot decode null, should be array");
  assertEquals(
    out(decoder(["one"])),
    'cannot decode array\n└─ optional index 0\n   └─ cannot decode "one", should be number',
  );
});

Deno.test("Decoder tuple", () => {
  const decoder = D.tuple(D.number, D.string);
  assertEquals(decoder([1, "one"]), D.success([1, "one"]));
  assertEquals(
    out(decoder(null)),
    `cannot decode tuple
└─ cannot decode null, should be tuple of length 2`,
  );
  assertEquals(
    out(decoder([])),
    `cannot decode tuple
└─ cannot decode [], should be tuple of length 2`,
  );
  assertEquals(
    out(decoder(["one", 1])),
    'cannot decode tuple\n├─ required index 0\n│  └─ cannot decode "one", should be number\n└─ required index 1\n   └─ cannot decode 1, should be string',
  );
});

Deno.test("Decoder struct", () => {
  const decoder = D.struct({
    one: D.number,
    two: D.string,
  });
  assertEquals(
    decoder({ one: 1, two: "two" }),
    D.success({ one: 1, two: "two" }),
  );
  assertEquals(
    out(decoder(null)),
    `cannot decode struct
└─ cannot decode null, should be record`,
  );
  assertEquals(
    out(decoder({})),
    'cannot decode struct\n├─ required property "one"\n│  └─ cannot decode undefined, should be number\n└─ required property "two"\n   └─ cannot decode undefined, should be string',
  );
  assertEquals(
    out(decoder({ one: 1 })),
    'cannot decode struct\n└─ required property "two"\n   └─ cannot decode undefined, should be string',
  );
  assertEquals(
    out(decoder({ one: "one" })),
    'cannot decode struct\n├─ required property "one"\n│  └─ cannot decode "one", should be number\n└─ required property "two"\n   └─ cannot decode undefined, should be string',
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    'cannot decode struct\n├─ required property "one"\n│  └─ cannot decode "one", should be number\n└─ required property "two"\n   └─ cannot decode 2, should be string',
  );
  assertEquals(
    decoder({ one: 1, two: "two", three: true }),
    D.success({ one: 1, two: "two" }),
  );
});

Deno.test("Decoder partial", () => {
  const decoder = D.partial({
    one: D.number,
    two: D.string,
  });
  assertEquals(decoder({}), D.success({}));
  assertEquals(decoder({ one: 1 }), D.success({ one: 1 }));
  assertEquals(
    decoder({ one: 1, two: undefined }),
    D.success({ one: 1, two: undefined }),
  );
  assertEquals(
    decoder({ one: 1, two: "two" }),
    D.success({ one: 1, two: "two" }),
  );
  assertEquals(
    out(decoder({ one: "one" })),
    'cannot decode partial\n└─ optional property "one"\n   └─ cannot decode "one", should be number',
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    'cannot decode partial\n├─ optional property "one"\n│  └─ cannot decode "one", should be number\n└─ optional property "two"\n   └─ cannot decode 2, should be string',
  );
});

Deno.test("Decoder intersect", () => {
  const decoder = pipe(
    D.struct({ one: D.number }),
    D.intersect(D.partial({ two: D.string })),
  );
  assertEquals(decoder({ one: 1 }), D.success({ one: 1 }));
  assertEquals(
    decoder({ one: 1, two: "two" }),
    D.success({ one: 1, two: "two" }),
  );
  assertEquals(
    out(decoder(null)),
    "cannot decode intersection\n├─ cannot decode struct\n│  └─ cannot decode null, should be record\n└─ cannot decode partial\n   └─ cannot decode null, should be record",
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    `cannot decode intersection
├─ cannot decode struct
│  └─ required property "one"
│     └─ cannot decode "one", should be number
└─ cannot decode partial
   └─ optional property "two"
      └─ cannot decode 2, should be string`,
  );
});

Deno.test("Decoder union", () => {
  const decoder = pipe(
    D.number,
    D.union(D.string),
  );
  assertEquals(decoder(1), D.success(1));
  assertEquals(decoder("one"), D.success("one"));
  assertEquals(
    out(decoder(null)),
    "cannot decode union\n├─ cannot decode null, should be number\n└─ cannot decode null, should be string",
  );
});

Deno.test("Decoder lazy", () => {
  const decoder = D.lazy("MyDecoder", () => D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(
    out(decoder(null)),
    "lazy type MyDecoder\n└─ cannot decode null, should be number",
  );
});
