import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../fn.ts";
import { pipe } from "../fn.ts";
import { zip } from "../array.ts";

const add = (n: number) => n + 1;

const assertEqualsR = (
  // deno-lint-ignore no-explicit-any
  a: F.Fn<[number], any>,
  // deno-lint-ignore no-explicit-any
  b: F.Fn<[number], any>,
) => assertEquals(a(0), b(0));

Deno.test("Fn ask", () => {
  assertEqualsR(F.ask<number>(), F.ask<number>());
});

Deno.test("Fn of", () => {
  const id = (n: number) => n;
  assertEqualsR(F.of(0), id);
});

Deno.test("Fn ap", () => {
  assertEquals(pipe(F.of(0), F.ap(F.of(add)))(), F.of(1)());
});

Deno.test("Fn map", () => {
  assertEquals(pipe(F.of(0), F.map(add))(), F.of(1)());
});

Deno.test("Fn join", () => {
  assertEquals(pipe(F.of(F.of(0)), F.join)(), F.of(0)());
});

Deno.test("Fn chain", () => {
  const chain = F.chain((n: number) => F.of(n + 1));
  assertEquals(chain(F.of(0))(), F.of(1)());
});

Deno.test("Fn identity", () => {
  [0, "hello", undefined, null, {}].forEach((v) => {
    assertEquals(F.identity(v), v);
  });
});

Deno.test("Fn compose", () => {
  const fab = (n: number) => n + 1;
  const comp0 = F.compose(fab);
  const comp1 = comp0(fab);
  assertEquals(comp1(1), 3);

  const comp2 = comp0(parseInt);
  assertEquals(comp2("ff", 16), 256);

  const template = (add: number) =>
  (
    [start, ...segments]: TemplateStringsArray,
    ...numbers: number[]
  ): string =>
    [
      start,
      ...zip(segments)(numbers)
        .map(([number, segment]) => `${number + add}${segment}`),
    ].join("");
  const repeated = F.flow(template, F.compose((a) => [a, a]));
  assertEquals(repeated(1)`a${2}b${3}`, ["a3b4", "a3b4"]);
});

Deno.test("Fn memoize", () => {
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

Deno.test("Fn apply", () => {
  const fab = (n: number) => n + 1;
  const apply = F.apply(1);
  assertEquals(apply(fab), 2);
});

Deno.test("Fn todo", () => {
  assertThrows(F.todo);
});

// Deno.test("Fn wait", async () => {
//   const within = (high: number, low: number) => (value: number): boolean =>
//     value >= low && value <= high;
//   const target = 100;
//   const high = 900; // github actions on macos tend to drag
//   const low = 50;

//   const test = within(high, low);
//   const start = Date.now();
//   const result = await F.wait(target).then(() => 1);
//   const end = Date.now();

//   const diff = end - start;

//   assertEquals(result, 1);
//   assertEquals(
//     test(diff),
//     true,
//     `wait of ${target}ms took ${diff}ms. Acceptable range ${low}-${high}ms`,
//   );
// });

// Deno.test("Fn resolve", async () => {
//   const ta = await F.resolve(1);
//   assertEquals(ta, 1);
// });

// Deno.test("Fn reject", async () => {
//   const ta = await F.reject(1).catch((n) => n);
//   assertEquals(ta, 1);
// });

// Deno.test("Fn then", async () => {
//   const ta = await F.pipe(
//     F.resolve(1),
//     F.then((n) => n + 1),
//   );
//   assertEquals(ta, 2);
// });

// Deno.test("Fn recover", async () => {
//   const ta = await F.pipe(
//     F.reject(1),
//     F.recover((n) => n),
//   );
//   assertEquals(ta, 1);
// });

Deno.test("Fn pipe", () => {
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

Deno.test("Fn flow", () => {
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

// Deno.test("Fn Do, bind, bindTo", () => {
//   assertEqualsR(
//     pipe(
//       F.Do<number, number, number>(),
//       F.bind("one", () => F.make(1)),
//       F.bind("two", ({ one }) => F.make(one + one)),
//       F.map(({ one, two }) => one + two),
//     ),
//     F.make(3),
//   );
//   assertEqualsR(
//     pipe(
//       F.make(1),
//       F.bindTo("one"),
//     ),
//     F.asks((_: number) => ({ one: 1 })),
//   );
// });
