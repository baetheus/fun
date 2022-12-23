import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as DE from "../decode_error.ts";
import * as A from "../array.ts";
import { pipe } from "../fn.ts";

const value: Record<string, unknown> = {};
value.value = value;

const brokenleaf = DE.leaf(value, "string");
const leaf = DE.leaf(1, "string");
const wrap = DE.wrap("decoding password", leaf);
const key = DE.key("title", leaf, DE.required);
const index = DE.index(1, leaf, DE.required);
const union = DE.union(leaf, leaf);
const intersection = DE.intersection(leaf, leaf);
const many = DE.many(leaf, wrap);

Deno.test("DecodeError isLeaf", () => {
  assertEquals(DE.isLeaf(leaf), true);
  assertEquals(DE.isLeaf(wrap), false);
  assertEquals(DE.isLeaf(key), false);
  assertEquals(DE.isLeaf(index), false);
  assertEquals(DE.isLeaf(union), false);
  assertEquals(DE.isLeaf(intersection), false);
  assertEquals(DE.isLeaf(many), false);
});

Deno.test("DecodeError isWrap", () => {
  assertEquals(DE.isWrap(leaf), false);
  assertEquals(DE.isWrap(wrap), true);
  assertEquals(DE.isWrap(key), false);
  assertEquals(DE.isWrap(index), false);
  assertEquals(DE.isWrap(union), false);
  assertEquals(DE.isWrap(intersection), false);
  assertEquals(DE.isWrap(many), false);
});

Deno.test("DecodeError isKey", () => {
  assertEquals(DE.isKey(leaf), false);
  assertEquals(DE.isKey(wrap), false);
  assertEquals(DE.isKey(key), true);
  assertEquals(DE.isKey(index), false);
  assertEquals(DE.isKey(union), false);
  assertEquals(DE.isKey(intersection), false);
  assertEquals(DE.isKey(many), false);
});

Deno.test("DecodeError isIndex", () => {
  assertEquals(DE.isIndex(leaf), false);
  assertEquals(DE.isIndex(wrap), false);
  assertEquals(DE.isIndex(key), false);
  assertEquals(DE.isIndex(index), true);
  assertEquals(DE.isIndex(union), false);
  assertEquals(DE.isIndex(intersection), false);
  assertEquals(DE.isIndex(many), false);
});

Deno.test("DecodeError isUnion", () => {
  assertEquals(DE.isUnion(leaf), false);
  assertEquals(DE.isUnion(wrap), false);
  assertEquals(DE.isUnion(key), false);
  assertEquals(DE.isUnion(index), false);
  assertEquals(DE.isUnion(union), true);
  assertEquals(DE.isUnion(intersection), false);
  assertEquals(DE.isUnion(many), false);
});

Deno.test("DecodeError isIntersection", () => {
  assertEquals(DE.isIntersection(leaf), false);
  assertEquals(DE.isIntersection(wrap), false);
  assertEquals(DE.isIntersection(key), false);
  assertEquals(DE.isIntersection(index), false);
  assertEquals(DE.isIntersection(union), false);
  assertEquals(DE.isIntersection(intersection), true);
  assertEquals(DE.isIntersection(many), false);
});

Deno.test("DecodeError isMany", () => {
  assertEquals(DE.isMany(leaf), false);
  assertEquals(DE.isMany(wrap), false);
  assertEquals(DE.isMany(key), false);
  assertEquals(DE.isMany(index), false);
  assertEquals(DE.isMany(union), false);
  assertEquals(DE.isMany(intersection), false);
  assertEquals(DE.isMany(many), true);
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
    property: DE.required,
    error: { tag: "Leaf", value: 1, reason: "string" },
  });
});

Deno.test("DecodeError index", () => {
  assertEquals(index, {
    tag: "Index",
    index: 1,
    property: DE.required,
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
  const countErrors: (err: DE.DecodeError) => number = DE.match(
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
    DE.draw(brokenleaf),
    "cannot decode or render, should be string",
  );
  assertEquals(DE.draw(leaf), "cannot decode 1, should be string");
  assertEquals(
    DE.draw(wrap),
    `decoding password
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    DE.draw(key),
    `required property "title"
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    DE.draw(index),
    `required index 1
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    DE.draw(union),
    `cannot decode union (any of)
├─ cannot decode 1, should be string
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    DE.draw(intersection),
    `cannot decode intersection (all of)
├─ cannot decode 1, should be string
└─ cannot decode 1, should be string`,
  );
  assertEquals(
    DE.draw(many),
    `cannot decode 1, should be string
decoding password
└─ cannot decode 1, should be string`,
  );
});

Deno.test("DecodeError empty", () => {
  assertEquals(DE.empty(), DE.many());
});

Deno.test("DecodeError concat", () => {
  assertEquals(pipe(leaf, DE.concat(leaf)), DE.many(leaf, leaf));
  assertEquals(pipe(leaf, DE.concat(wrap)), DE.many(leaf, wrap));
  assertEquals(pipe(leaf, DE.concat(key)), DE.many(leaf, key));
  assertEquals(pipe(leaf, DE.concat(index)), DE.many(leaf, index));
  assertEquals(pipe(leaf, DE.concat(union)), DE.many(leaf, union));
  assertEquals(
    pipe(leaf, DE.concat(intersection)),
    DE.many(leaf, intersection),
  );
  assertEquals(pipe(leaf, DE.concat(many)), DE.many(leaf, leaf, wrap));
  assertEquals(pipe(union, DE.concat(union)), DE.union(leaf, leaf, leaf, leaf));
  assertEquals(
    pipe(intersection, DE.concat(intersection)),
    DE.intersection(leaf, leaf, leaf, leaf),
  );
});
