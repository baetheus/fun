import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import * as F from "../fns.ts";

Deno.test("fns isNotNil", () => {
  assertEquals(F.isNotNil(undefined), false);
  assertEquals(F.isNotNil(null), false);
  assertEquals(F.isNotNil(1), true);
  assertEquals(F.isNotNil(0), true);
  assertEquals(F.isNotNil("Hello"), true);
  assertEquals(F.isNotNil(""), true);
});

Deno.test("fns isNil", () => {
  assertEquals(F.isNil(undefined), true);
  assertEquals(F.isNil(null), true);
  assertEquals(F.isNil(1), false);
  assertEquals(F.isNil(0), false);
  assertEquals(F.isNil("Hello"), false);
  assertEquals(F.isNil(""), false);
});

Deno.test("fns isRecord", () => {
  assertEquals(F.isRecord(null), false);
  assertEquals(F.isRecord(undefined), false);
  assertEquals(F.isRecord(0), false);
  assertEquals(F.isRecord({}), true);
  assertEquals(F.isRecord({ a: 1 }), true);
});

Deno.test("fns identity", () => {
  [0, "hello", undefined, null, {}].forEach((v) => {
    assertEquals(F.identity(v), v);
  });
});

Deno.test("fns compose", () => {
  const fab = (n: number) => n + 1;
  const comp0 = F.compose(fab);
  const comp1 = comp0(fab);
  assertEquals(comp1(1), 3);
});

Deno.test("fns constant", () => {
  [0, "hello", undefined, null, {}].forEach((v) => {
    const lazy = F.constant(v);
    assertEquals(lazy(), v);
  });
});

Deno.test("fns memoize", () => {
  let count = 0;
  const fn = (n: number) => {
    if (count > 0) {
      throw new Error("Should not throw");
    }
    count += 1;
    return n;
  };
  const memo = F.memoize(fn);
  assertEquals(memo(1), 1);
  assertEquals(memo(1), 1);
  assertEquals(memo(1), 1);
});

Deno.test("fns typeof", () => {
  assertEquals(F.typeOf("Hello"), "string");
  assertEquals(F.typeOf(0), "number");
  assertEquals(F.typeOf(BigInt(0)), "bigint");
  assertEquals(F.typeOf(true), "boolean");
  assertEquals(F.typeOf(undefined), "undefined");
  assertEquals(F.typeOf({}), "object");
  assertEquals(F.typeOf((n: number) => n + 1), "function");
  assertEquals(F.typeOf(null), "null");
});

Deno.test("fns intesrsect", () => {
  const a = { a: 1 };
  const b = { b: 2 };
  const c = { a: 2, b: 2 };
  const ab = { a: 1, b: 2 };
  const ac = { a: 2, b: 2 };
  assertEquals(F.intersect(a, b), ab);
  assertEquals(F.intersect(a, c), ac);
  assertEquals(F.intersect(null, b), b);
  assertEquals(F.intersect(b, null), b);
});

Deno.test("fns hasOwnProperty", () => {
  assertEquals(F.hasOwnProperty("a"), false);
});

Deno.test("fns apply", () => {
  const fab = (n: number) => n + 1;
  const apply = F.apply(1);
  assertEquals(apply(fab), 2);
});

Deno.test("fns call", () => {
  const fab = (n: number) => n + 1;
  const call = F.call(fab);
  assertEquals(call(1), 2);
});

Deno.test("fns apply1", () => {
  const fab = (n: number) => n + 1;
  assertEquals(F.apply1(1, fab), 2);
});

Deno.test("fns absurd", () => {
  assertThrows(() => F.absurd(null as never));
});

Deno.test("fns _", () => {
  assertThrows(F._);
});

Deno.test("fns wait", async () => {
  const within = (high: number, low: number) =>
    (value: number): boolean => value >= low && value <= high;
  const target = 100;
  const high = 900; // github actions on macos tend to drag
  const low = 50;

  const test = within(high, low);
  const start = Date.now();
  const result = await F.wait(target).then(() => 1);
  const end = Date.now();

  const diff = end - start;

  assertEquals(result, 1);
  assertEquals(
    test(diff),
    true,
    `wait of ${target}ms took ${diff}ms. Acceptable range ${low}-${high}ms`,
  );
});

Deno.test("fns pipe", () => {
  const fab = (n: number) => n + 1;

  const r0 = F.pipe(0);
  const r1 = F.pipe(0, fab);
  const r2 = F.pipe(0, fab, fab);
  const r3 = F.pipe(0, fab, fab, fab);
  const r4 = F.pipe(0, fab, fab, fab, fab);
  const r5 = F.pipe(0, fab, fab, fab, fab, fab);
  const r6 = F.pipe(0, fab, fab, fab, fab, fab, fab);
  const r7 = F.pipe(0, fab, fab, fab, fab, fab, fab, fab);
  const r8 = F.pipe(0, fab, fab, fab, fab, fab, fab, fab, fab);
  const r9 = F.pipe(0, fab, fab, fab, fab, fab, fab, fab, fab, fab);

  assertEquals([r0, r1, r2, r3, r4, r5, r6, r7, r8, r9], [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
  ]);
});

Deno.test("fns flow", () => {
  const fab = (n: number) => n + 1;

  const r1 = F.flow(fab);
  const r2 = F.flow(fab, fab);
  const r3 = F.flow(fab, fab, fab);
  const r4 = F.flow(fab, fab, fab, fab);
  const r5 = F.flow(fab, fab, fab, fab, fab);
  const r6 = F.flow(fab, fab, fab, fab, fab, fab);
  const r7 = F.flow(fab, fab, fab, fab, fab, fab, fab);
  const r8 = F.flow(fab, fab, fab, fab, fab, fab, fab, fab);
  const r9 = F.flow(fab, fab, fab, fab, fab, fab, fab, fab, fab);

  assertEquals(r1(0), 1);
  assertEquals(r2(0), 2);
  assertEquals(r3(0), 3);
  assertEquals(r4(0), 4);
  assertEquals(r5(0), 5);
  assertEquals(r6(0), 6);
  assertEquals(r7(0), 7);
  assertEquals(r8(0), 8);
  assertEquals(r9(0), 9);
});
