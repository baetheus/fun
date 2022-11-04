import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../fn.ts";
import * as P from "../pair.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";
import { zip } from "../array.ts";

const add = (n: number) => n + 1;

Deno.test("Fn unary", () => {
  const variadic = (a: number, b: string) => a + b.length;
  const unary = F.unary(variadic);
  assertEquals(unary([1, "Hello"]), variadic(1, "Hello"));
});

Deno.test("Fn tryCatch", () => {
  assertEquals(
    F.tryCatch(F.todo, String),
    "Error: TODO: this function has not been implemented",
  );
  assertEquals(F.tryCatch(() => 1, () => 2), 1);
});

Deno.test("Fn handleThrow", () => {
  const throws = (_: number): number => F.todo();

  assertEquals(
    F.handleThrow(throws, (a, d) => [a, d], (e, d) => [String(e).length, d])(1),
    [51, [1]],
  );
  assertEquals(
    F.handleThrow(
      F.id<number>(),
      (a, d) => [a, d],
      (e, d) => [String(e).length, d],
    )(1),
    [1, [1]],
  );
});

Deno.test("Fn memoize", () => {
  const obj = (n: number) => ({ n });
  const memo = F.memoize(obj);

  assertEquals(memo(1), memo(1));
});

Deno.test("Fn apply", () => {
  const fab = (n: number) => n + 1;
  const apply = F.apply(1);
  assertEquals(apply(fab), 2);
});

Deno.test("Fn todo", () => {
  assertThrows(F.todo);
});

Deno.test("Fn unsafeCoerce", () => {
  const a = { n: 1 };
  assertStrictEquals(F.unsafeCoerce(a), a);
});

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

Deno.test("Fn of", () => {
  const a = F.of(1);
  assertEquals(a(), 1);
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

Deno.test("Fn contramap", () => {
  assertEquals(
    pipe(
      F.id<number>(),
      F.contramap((s: string) => s.length),
      F.apply("Hello"),
    ),
    5,
  );
});

Deno.test("Fn dimap", () => {
  assertEquals(
    pipe(
      F.id<number>(),
      F.dimap((s: string) => s.length, (n) => 2 * n),
      F.apply("Hello"),
    ),
    10,
  );
});

Deno.test("Fn identity", () => {
  [0, "hello", undefined, null, {}].forEach((v) => {
    assertEquals(F.identity(v), v);
  });
});

Deno.test("Fn id", () => {
  assertStrictEquals(F.id<number>(), F.identity);
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

Deno.test("Fn first", () => {
  assertEquals(
    pipe(
      P.dup<number>,
      F.map(F.first((n) => n + 1)),
      F.apply(1),
    ),
    P.pair(2, 1),
  );
});

Deno.test("Fn second", () => {
  assertEquals(
    pipe(
      P.dup<number>,
      F.map(F.second((n) => n + 1)),
      F.apply(1),
    ),
    P.pair(1, 2),
  );
});

Deno.test("Fn left", () => {
  assertEquals(
    pipe(
      E.left<number>,
      F.map(F.left((n) => n + 1)),
      F.apply(1),
    ),
    E.left(2),
  );
});

Deno.test("Fn right", () => {
  assertEquals(
    pipe(
      E.right<number, number>,
      F.map(F.right((n) => n + 1)),
      F.apply(1),
    ),
    E.right(2),
  );
});
