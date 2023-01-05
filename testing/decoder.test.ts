import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as D from "../decoder.ts";
import * as R from "../refinement.ts";
import * as E from "../either.ts";
import * as A from "../array.ts";
import { flow, pipe } from "../fn.ts";

const out = flow(
  D.extract,
  E.match((s: string) => s, (a) => JSON.stringify(a)),
);

const value: Record<string, unknown> = {};
value.value = value;

const brokenleaf = D.leafErr(value, "string");
const leaf = D.leafErr(1, "string");
const wrap = D.wrapErr("decoding password", leaf);
const key = D.keyErr("title", leaf, D.required);
const index = D.indexErr(1, leaf, D.required);
const union = D.unionErr(leaf, leaf);
const intersection = D.intersectionErr(leaf, leaf);
const many = D.manyErr(leaf, wrap);

Deno.test("DecodeError isLeaf", () => {
  assertEquals(D.isLeaf(leaf), true);
  assertEquals(D.isLeaf(wrap), false);
  assertEquals(D.isLeaf(key), false);
  assertEquals(D.isLeaf(index), false);
  assertEquals(D.isLeaf(union), false);
  assertEquals(D.isLeaf(intersection), false);
  assertEquals(D.isLeaf(many), false);
});

Deno.test("DecodeError isWrap", () => {
  assertEquals(D.isWrap(leaf), false);
  assertEquals(D.isWrap(wrap), true);
  assertEquals(D.isWrap(key), false);
  assertEquals(D.isWrap(index), false);
  assertEquals(D.isWrap(union), false);
  assertEquals(D.isWrap(intersection), false);
  assertEquals(D.isWrap(many), false);
});

Deno.test("DecodeError isKey", () => {
  assertEquals(D.isKey(leaf), false);
  assertEquals(D.isKey(wrap), false);
  assertEquals(D.isKey(key), true);
  assertEquals(D.isKey(index), false);
  assertEquals(D.isKey(union), false);
  assertEquals(D.isKey(intersection), false);
  assertEquals(D.isKey(many), false);
});

Deno.test("DecodeError isIndex", () => {
  assertEquals(D.isIndex(leaf), false);
  assertEquals(D.isIndex(wrap), false);
  assertEquals(D.isIndex(key), false);
  assertEquals(D.isIndex(index), true);
  assertEquals(D.isIndex(union), false);
  assertEquals(D.isIndex(intersection), false);
  assertEquals(D.isIndex(many), false);
});

Deno.test("DecodeError isUnion", () => {
  assertEquals(D.isUnion(leaf), false);
  assertEquals(D.isUnion(wrap), false);
  assertEquals(D.isUnion(key), false);
  assertEquals(D.isUnion(index), false);
  assertEquals(D.isUnion(union), true);
  assertEquals(D.isUnion(intersection), false);
  assertEquals(D.isUnion(many), false);
});

Deno.test("DecodeError isIntersection", () => {
  assertEquals(D.isIntersection(leaf), false);
  assertEquals(D.isIntersection(wrap), false);
  assertEquals(D.isIntersection(key), false);
  assertEquals(D.isIntersection(index), false);
  assertEquals(D.isIntersection(union), false);
  assertEquals(D.isIntersection(intersection), true);
  assertEquals(D.isIntersection(many), false);
});

Deno.test("DecodeError isMany", () => {
  assertEquals(D.isMany(leaf), false);
  assertEquals(D.isMany(wrap), false);
  assertEquals(D.isMany(key), false);
  assertEquals(D.isMany(index), false);
  assertEquals(D.isMany(union), false);
  assertEquals(D.isMany(intersection), false);
  assertEquals(D.isMany(many), true);
});

Deno.test("DecodeError leaf", () => {
  assertEquals(leaf, { tag: "Leaf", value: 1, reason: "string" });
});

Deno.test("DecodeError wrap", () => {
  assertEquals(wrap, {
    tag: "Wrap",
    context: "decoding password",
    error: { tag: "Leaf", value: 1, reason: "string" },
  });
});

Deno.test("DecodeError key", () => {
  assertEquals(key, {
    tag: "Key",
    key: "title",
    property: D.required,
    error: { tag: "Leaf", value: 1, reason: "string" },
  });
});

Deno.test("DecodeError index", () => {
  assertEquals(index, {
    tag: "Index",
    index: 1,
    property: D.required,
    error: { tag: "Leaf", value: 1, reason: "string" },
  });
});

Deno.test("DecodeError union", () => {
  assertEquals(union, {
    tag: "Union",
    errors: [{ tag: "Leaf", value: 1, reason: "string" }, {
      tag: "Leaf",
      value: 1,
      reason: "string",
    }],
  });
});

Deno.test("DecodeError intersection", () => {
  assertEquals(intersection, {
    tag: "Intersection",
    errors: [{ tag: "Leaf", value: 1, reason: "string" }, {
      tag: "Leaf",
      value: 1,
      reason: "string",
    }],
  });
});

Deno.test("DecodeError many", () => {
  assertEquals(many, {
    tag: "Many",
    errors: [{ tag: "Leaf", value: 1, reason: "string" }, {
      tag: "Wrap",
      context: "decoding password",
      error: { tag: "Leaf", value: 1, reason: "string" },
    }],
  });
});

Deno.test("DecodeError match", () => {
  const countErrors: (err: D.DecodeError) => number = D.match(
    () => 1,
    (_, err) => countErrors(err),
    (_, __, err) => countErrors(err),
    (_, __, err) => countErrors(err),
    A.reduce((acc, err) => acc + countErrors(err), 0),
    A.reduce((acc, err) => acc + countErrors(err), 0),
    A.reduce((acc, err) => acc + countErrors(err), 0),
  );

  assertEquals(countErrors(leaf), 1);
  assertEquals(countErrors(wrap), 1);
  assertEquals(countErrors(key), 1);
  assertEquals(countErrors(index), 1);
  assertEquals(countErrors(union), 2);
  assertEquals(countErrors(intersection), 2);
  assertEquals(countErrors(many), 2);
});

Deno.test("DecodeError draw", () => {
  assertEquals(
    D.draw(brokenleaf),
    "cannot decode or render, should be string",
  );
  assertEquals(D.draw(leaf), "cannot decode 1, should be string");
  assertEquals(
    D.draw(wrap),
    `decoding password
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    D.draw(key),
    `required property "title"
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    D.draw(index),
    `required index 1
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    D.draw(union),
    `cannot decode union (any of)
├─ cannot decode 1, should be string
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    D.draw(intersection),
    `cannot decode intersection (all of)
├─ cannot decode 1, should be string
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    D.draw(many),
    `cannot decode 1, should be string
decoding password
└─ cannot decode 1, should be string`,
  );
});

Deno.test("DecodeError empty", () => {
  assertEquals(D.empty(), D.manyErr());
});

Deno.test("DecodeError concat", () => {
  assertEquals(pipe(leaf, D.concat(leaf)), D.manyErr(leaf, leaf));
  assertEquals(pipe(leaf, D.concat(wrap)), D.manyErr(leaf, wrap));
  assertEquals(pipe(leaf, D.concat(key)), D.manyErr(leaf, key));
  assertEquals(pipe(leaf, D.concat(index)), D.manyErr(leaf, index));
  assertEquals(pipe(leaf, D.concat(union)), D.manyErr(leaf, union));
  assertEquals(
    pipe(leaf, D.concat(intersection)),
    D.manyErr(leaf, intersection),
  );
  assertEquals(pipe(leaf, D.concat(many)), D.manyErr(leaf, leaf, wrap));
  assertEquals(
    pipe(union, D.concat(union)),
    D.unionErr(leaf, leaf, leaf, leaf),
  );
  assertEquals(
    pipe(intersection, D.concat(intersection)),
    D.intersectionErr(leaf, leaf, leaf, leaf),
  );
});
Deno.test("Decoder success", () => {
  assertEquals(D.success(1), E.right(1));
});

Deno.test("Decoder failure", () => {
  assertEquals(D.failure(1, "1"), E.left(D.leafErr(1, "1")));
});

Deno.test("Decoder fromPredicate", () => {
  const decoder = D.fromPredicate(R.number, "number");
  assertEquals(typeof decoder, "function");
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(true), D.failure(true, "number"));
});

Deno.test("Decoder of", () => {
  const decoder = D.of(1);
  assertEquals(decoder(null), D.success(1));
});

Deno.test("Decoder ap", () => {
  const fn = D.of((s: string) => s.length);
  const val = D.string;
  const decoder = pipe(fn, D.ap(val));
  assertEquals(decoder("Hello World"), D.success(11));
});

Deno.test("Decoder map", () => {
  const map = pipe(D.string, D.map((s: string) => s + s));
  assertEquals(map("Hello"), D.success("HelloHello"));
});

Deno.test("Decoder join", () => {
  const join = D.join(D.of(D.string));
  assertEquals(join("Hello World"), D.success("Hello World"));
});

Deno.test("Decoder chain", () => {
  const fatArray = D.struct({ length: D.number, values: D.array(D.number) });
  const chain = pipe(
    fatArray,
    D.chain(({ length }) =>
      D.struct({
        length: D.literal(length),
        values: D.tuple(...A.range(length).map((i) => D.literal(i))),
      })
    ),
  );

  assertEquals(
    chain({ length: 2, values: [0, 1] }),
    D.success({ length: 2, values: [0, 1] }),
  );
  assertEquals(chain({ length: 2, values: [] }), {
    left: {
      context: "cannot decode struct",
      error: {
        error: {
          context: "cannot decode tuple",
          error: {
            reason: "tuple of length 2",
            tag: "Leaf",
            value: [],
          },
          tag: "Wrap",
        },
        key: "values",
        property: "required",
        tag: "Key",
      },
      tag: "Wrap",
    },
    tag: "Left",
  });
});

Deno.test("Decoder annotate", () => {
  const annotate = pipe(D.string, D.annotate("first name"));

  assertEquals(annotate("Brandon"), D.success("Brandon"));
  assertEquals(
    annotate(1),
    E.left(D.wrapErr("first name", D.leafErr(1, "string"))),
  );
});

Deno.test("Decoder compose", () => {
  const composed = pipe(
    D.string,
    D.compose((s: string) =>
      s.length > 5 ? D.success(s) : D.failure(s, "string of length > 5")
    ),
  );

  assertEquals(composed("Hello World"), D.success("Hello World"));
  assertEquals(composed("Hello"), D.failure("Hello", "string of length > 5"));
});

Deno.test("Decoder contramap", () => {
  type Person = { name: string; age: number; other: unknown };
  const contra = pipe(
    D.string,
    D.contramap((p: Person) => p.other),
  );

  assertEquals(
    contra({ name: "Brandon", age: 37, other: 1 }),
    D.failure(1, "string"),
  );
  assertEquals(
    contra({ name: "Brandon", age: 37, other: "wat" }),
    D.success("wat"),
  );
});

Deno.test("Decoder dimap", () => {
  type Person = { name: string; age: number; other: unknown };
  const dimap = pipe(
    D.string,
    D.dimap(
      (p: Person) => p.other,
      (s) => s.length,
    ),
  );

  assertEquals(
    dimap({ name: "Brandon", age: 37, other: 1 }),
    D.failure(1, "string"),
  );
  assertEquals(
    dimap({ name: "Brandon", age: 37, other: "wat" }),
    D.success(3),
  );
});

Deno.test("Decoder refine", () => {
  const refine = pipe(
    D.string,
    D.refine((s) => s.length > 5, "string length > 5"),
  );

  assertEquals(refine("Hello"), D.failure("Hello", "string length > 5"));
  assertEquals(refine("Hello World"), D.success("Hello World"));
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

Deno.test("Decoder date", () => {
  const value = new Date();
  assertEquals(D.date("1990"), D.success(new Date("1990")));
  assertEquals(D.date(value), D.success(value));
  assertEquals(D.date(0), D.success(new Date(0)));
  assertEquals(D.date(NaN), D.failure(NaN, "date"));

  const handler = {
    get() {
      throw new Error("No touchy!");
    },
  };
  const val = {};
  const proxy = new Proxy(val, handler);
  assertEquals(D.date(proxy), D.failure(proxy, "date"));
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
    `cannot decode union (any of)
├─ cannot decode true, should be null
└─ cannot decode true, should be number`,
  );
});

Deno.test("Decoder undefinable", () => {
  const decoder = D.undefinable(D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(decoder(undefined), D.success(undefined));
  assertEquals(
    out(decoder(true)),
    `cannot decode union (any of)
├─ cannot decode true, should be undefined
└─ cannot decode true, should be number`,
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
    `cannot decode record
└─ optional property "one"
   └─ cannot decode "one", should be number`,
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
    `cannot decode array
└─ optional index 0
   └─ cannot decode "one", should be number`,
  );
});

Deno.test("Decoder tuple", () => {
  const decoder = D.tuple(D.number, D.string);
  assertEquals(decoder([1, "one"]), D.success([1, "one"] as const));
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
    `cannot decode tuple
├─ required index 0
│  └─ cannot decode "one", should be number
└─ required index 1
   └─ cannot decode 1, should be string`,
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
    `cannot decode struct
├─ required property "one"
│  └─ cannot decode undefined, should be number
└─ required property "two"
   └─ cannot decode undefined, should be string`,
  );
  assertEquals(
    out(decoder({ one: 1 })),
    `cannot decode struct
└─ required property "two"
   └─ cannot decode undefined, should be string`,
  );
  assertEquals(
    out(decoder({ one: "one" })),
    `cannot decode struct
├─ required property "one"
│  └─ cannot decode "one", should be number
└─ required property "two"
   └─ cannot decode undefined, should be string`,
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    `cannot decode struct
├─ required property "one"
│  └─ cannot decode "one", should be number
└─ required property "two"
   └─ cannot decode 2, should be string`,
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
    `cannot decode partial struct
└─ optional property "one"
   └─ cannot decode "one", should be number`,
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    `cannot decode partial struct
├─ optional property "one"
│  └─ cannot decode "one", should be number
└─ optional property "two"
   └─ cannot decode 2, should be string`,
  );
});

Deno.test("Decoder json", () => {
  const decoder = D.json(D.struct({ name: D.string }));
  assertEquals(
    decoder({ name: "Brandon" }),
    D.failure({ name: "Brandon" }, "string"),
  );
  assertEquals(
    decoder("{}"),
    E.left(
      D.wrapErr(
        "cannot decode struct",
        D.keyErr("name", D.leafErr(undefined, "string"), "required"),
      ),
    ),
  );
  assertEquals(decoder("1{"), D.failure("1{", "json"));
  assertEquals(decoder('{"name": "Brandon"}'), D.success({ name: "Brandon" }));
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
    `cannot decode intersection (all of)
├─ cannot decode struct
│  └─ cannot decode null, should be record
└─ cannot decode partial struct
   └─ cannot decode null, should be record`,
  );
  assertEquals(
    out(decoder({ one: "one", two: 2 })),
    `cannot decode intersection (all of)
├─ cannot decode struct
│  └─ required property "one"
│     └─ cannot decode "one", should be number
└─ cannot decode partial struct
   └─ optional property "two"
      └─ cannot decode 2, should be string`,
  );

  const decoder2 = pipe(D.number, D.intersect(D.string));
  assertEquals(decoder2(1), D.failure(1, "string"));
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
    `cannot decode union (any of)
├─ cannot decode null, should be number
└─ cannot decode null, should be string`,
  );
});

Deno.test("Decoder lazy", () => {
  const decoder = D.lazy("MyDecoder", () => D.number);
  assertEquals(decoder(0), D.success(0));
  assertEquals(
    out(decoder(null)),
    `lazy type MyDecoder
└─ cannot decode null, should be number`,
  );
});
