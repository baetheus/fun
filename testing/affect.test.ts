import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as A from "../affect.ts";
import * as E from "../either.ts";
import { pipe } from "../fns.ts";

Deno.test("Affect make", async () => {
  const a = await A.make(1);
  assertEquals(a, 1);
});

Deno.test("Affect then", async () => {
  const t1 = await pipe(
    A.make(1),
    A.then((n) => n + 1),
  );
  assertEquals(t1, 2);
});

Deno.test("Affect ask", async () => {
  const t1 = A.ask<number>();
  assertEquals(await t1(1), E.right(1));
});

Deno.test("Affect askLeft", async () => {
  const t1 = A.askLeft<number>();
  assertEquals(await t1(1), E.left(1));
});

Deno.test("Affect asks", async () => {
  const t1 = A.asks((r: number) => A.make(r + 1));
  assertEquals(await t1(1), E.right(2));
});

Deno.test("Affect asksLeft", async () => {
  const t1 = A.asksLeft((r: number) => A.make(r + 1));
  assertEquals(await t1(1), E.left(2));
});

Deno.test("Affect right", async () => {
  const t1 = A.right(1);
  assertEquals(await t1(1 as never), E.right(1));
});

Deno.test("Affect left", async () => {
  const t1 = A.left(1);
  assertEquals(await t1(1 as never), E.left(1));
});

Deno.test("Affect of", async () => {
  const t1 = A.of(1);
  assertEquals(await t1(1 as never), E.right(1));
});

Deno.test("Affect ap", async () => {
  const ta1 = A.ask<number>();
  const ta2 = A.asksLeft<number, string, number>((_: number) => A.make("ta2"));
  const f1 = A.asks<number, string, (n: number) => number>((n: number) =>
    A.make((m: number) => m + n)
  );
  const f2: typeof f1 = A.asksLeft((_: number) => A.make("f2"));
  const ap1 = A.ap(f1);
  const ap2 = A.ap(f2);

  assertEquals(await ap1(ta1)(1), E.right(2));
  assertEquals(await ap1(ta2)(1), E.left("ta2"));
  assertEquals(await ap2(ta1)(1), E.left("f2"));
  assertEquals(await ap2(ta2)(1), E.left("ta2"));
});

Deno.test("Affect map", async () => {
  const ta1 = A.ask<number>();
  const ta2 = A.asksLeft<number, string, number>((_) => A.make("ta2"));
  const map = A.map((n: number) => n + 1);

  assertEquals(await map(ta1)(1), E.right(2));
  assertEquals(await map(ta2)(1), E.left("ta2"));
});

Deno.test("Affect join", async () => {
  const ta1 = A.right(A.right(1));
  const ta2 = A.right(A.left(1));

  assertEquals(await A.join(ta1)(undefined as never), E.right(1));
  assertEquals(await A.join(ta2)(undefined as never), E.left(1));
});

Deno.test("Affect chain", async () => {
  const chain = A.chain((n: number) => n < 0 ? A.left(n) : A.right(n));
  const ta1 = A.right<number, number, number>(1);
  const ta2 = A.right<number, number, number>(-1);
  const ta3 = A.left<number, number, number>(1);

  assertEquals(await chain(ta1)(null as never), E.right(1));
  assertEquals(await chain(ta2)(null as never), E.left(-1));
  assertEquals(await chain(ta3)(null as never), E.left(1));
});

Deno.test("Affect throwError", async () => {
  assertEquals(await A.throwError(1)(1), E.left(1));
});

Deno.test("Affect bimap", async () => {
  const bimap = A.bimap((n: number) => n + 1, (n: number) => n + 1);
  const ta1 = A.right(1);
  const ta2 = A.left(1);

  assertEquals(await bimap(ta1)(1 as never), E.right(2));
  assertEquals(await bimap(ta2)(1 as never), E.left(2));
});

Deno.test("Affect mapLeft", async () => {
  const mapLeft = A.mapLeft((n: number) => n + 1);
  const ta1 = A.right(1);
  const ta2 = A.left(1);

  assertEquals(await mapLeft(ta1)(1 as never), E.right(1));
  assertEquals(await mapLeft(ta2)(1 as never), E.left(2));
});

Deno.test("Affect sequenceTuple", async () => {
  const ta1 = A.sequenceTuple(A.ask<number>(), A.ask<number>());
  const ta2 = A.sequenceTuple(A.ask<number>(), A.askLeft<number>());
  const ta3 = A.sequenceTuple(A.askLeft<number>(), A.ask<number>());
  const ta4 = A.sequenceTuple(A.askLeft<number>(), A.askLeft<number>());

  assertEquals(await ta1(1), E.right([1, 1]));
  assertEquals(await ta2(1), E.left(1));
  assertEquals(await ta3(1), E.left(1));
  assertEquals(await ta4(1), E.left(1));
});

Deno.test("Affect sequenceStruct", async () => {
  const ta1 = A.sequenceStruct({ one: A.ask<number>(), two: A.ask<number>() });
  const ta2 = A.sequenceStruct({
    one: A.ask<number>(),
    two: A.askLeft<number>(),
  });
  const ta3 = A.sequenceStruct({
    one: A.askLeft<number>(),
    two: A.ask<number>(),
  });
  const ta4 = A.sequenceStruct({
    one: A.askLeft<number>(),
    two: A.askLeft<number>(),
  });

  assertEquals(await ta1(1), E.right({ one: 1, two: 1 }));
  assertEquals(await ta2(1), E.left(1));
  assertEquals(await ta3(1), E.left(1));
  assertEquals(await ta4(1), E.left(1));
});

Deno.test("Affect compose", async () => {
  const ta1 = A.ask<number>();
  const ta2 = A.askLeft<number>();
  const ta3 = A.asks<number, number, number>((n: number) => A.make(n + 1));

  assertEquals(await pipe(ta1, A.compose(ta2))(1), E.left(1));
  assertEquals(await pipe(ta1, A.compose(ta3))(1), E.right(2));
  assertEquals(await pipe(ta2, A.compose(ta3))(1), E.left(1));
});

Deno.test("Affect recover", async () => {
  const ta1 = A.ask<number>();
  const ta2 = A.askLeft<number>();
  const recover = A.recover((n: number) => n + 1);

  assertEquals(await recover(ta1)(1), E.right(1));
  assertEquals(await recover(ta2)(1), E.right(2));
});

Deno.test("Affect Do, bind, bindTo", async () => {
  const ta1 = pipe(
    A.Do<number, number, never>(),
    A.bind("one", () => A.ask<number, number>()),
  );
  const ta2 = pipe(
    A.ask<number>(),
    A.bindTo("one"),
  );
  const ta3 = pipe(
    A.askLeft<number>(),
    A.bindTo("one"),
  );

  assertEquals(await ta1(1), E.right({ one: 1 }));
  assertEquals(await ta2(1), E.right({ one: 1 }));
  assertEquals(await ta3(1), E.left(1));
});
