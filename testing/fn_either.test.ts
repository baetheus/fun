import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as FE from "../fn_either.ts";
import * as E from "../either.ts";
import * as F from "../fn.ts";
import { InitializableNumberSum } from "../number.ts";
import { pipe } from "../fn.ts";

const fn = FE.fromPredicate(Number.isInteger);

Deno.test("FnEither tryCatch", () => {
  const throwOnZero = FE.tryCatch(
    (n: number) => {
      if (n === 0) {
        throw new Error("Zero");
      }
      return n;
    },
    (_, [n]) => n,
  );
  assertEquals(throwOnZero(0)(0), E.left(0));
  assertEquals(throwOnZero(1)(0), E.right(1));
});

Deno.test("FnEither left", () => {
  assertEquals(FE.left("Hello")(0), E.left("Hello"));
});

Deno.test("FnEither right", () => {
  assertEquals(FE.right("Hello")(0), E.right("Hello"));
});

Deno.test("FnEither fromEither", () => {
  assertEquals(FE.fromEither(E.left(0))(0), E.left(0));
  assertEquals(FE.fromEither(E.right(0))(0), E.right(0));
});

Deno.test("FnEither fromFn", () => {
  assertEquals(FE.fromFn(F.id<number>())(1), E.right(1));
});

Deno.test("FnEither fromPredicate", () => {
  const pred = FE.fromPredicate((n: number) => n > 0);
  const refine = FE.fromPredicate((s: string): s is "Big" => s === "Big");

  assertEquals(pred(0), E.left(0));
  assertEquals(pred(1), E.right(1));
  assertEquals(refine("Hello"), E.left("Hello"));
  assertEquals(refine("Big"), E.right("Big"));
});

Deno.test("FnEither wrap", () => {
  assertEquals(FE.wrap(0)(0), E.right(0));
});

Deno.test("FnEither fail", () => {
  assertEquals(FE.fail(1)(1), E.left(1));
});

Deno.test("FnEither apply", () => {
  const add = (n: number) => n + 1;
  assertEquals(pipe(FE.right(add), FE.apply(FE.right(1)))(0), FE.right(2)(0));
  assertEquals(pipe(FE.right(add), FE.apply(FE.left(1)))(0), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), FE.apply(FE.right(1)))(0), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), FE.apply(FE.left(2)))(0), FE.left(2)(0));
});

Deno.test("FnEither alt", () => {
  assertEquals(pipe(FE.right(0), FE.alt(FE.right(1)))(0), FE.right(0)(0));
  assertEquals(pipe(FE.right(0), FE.alt(FE.left(1)))(0), FE.right(0)(0));
  assertEquals(pipe(FE.left(0), FE.alt(FE.right(1)))(0), FE.right(1)(0));
  assertEquals(pipe(FE.left(0), FE.alt(FE.left(1)))(0), FE.left(1)(0));
});

Deno.test("FnEither bimap", () => {
  const bimap = FE.bimap((n: number) => n + n, (n: number) => n * n);
  assertEquals(bimap(FE.left(1))(0), E.left(2));
  assertEquals(bimap(FE.right(1))(0), E.right(1));
});

Deno.test("FnEither map", () => {
  assertEquals(pipe(FE.right(1), FE.map((n) => n + 1))(0), E.right(2));
  assertEquals(pipe(FE.left(1), FE.map((n: number) => n + 1))(0), E.left(1));
});

Deno.test("FnEither mapSecond", () => {
  assertEquals(
    pipe(FE.right(1), FE.mapSecond((n: number) => n + 1))(0),
    E.right(1),
  );
  assertEquals(
    pipe(FE.left(1), FE.mapSecond((n: number) => n + 1))(0),
    E.left(2),
  );
});

Deno.test("FnEither join", () => {
  assertEquals(pipe(FE.wrap(FE.wrap(0)), FE.join)(0), FE.wrap(0)(0));
  assertEquals(pipe(FE.wrap(FE.left(0)), FE.join)(0), FE.left(0)(0));
  assertEquals(pipe(FE.left(0), FE.join)(0), FE.left(0)(0));
});

Deno.test("FnEither flatmap", () => {
  assertEquals(
    pipe(
      FE.wrap(0),
      FE.flatmap((n: number) => n === 0 ? FE.left(n) : FE.right(n)),
    )(0),
    FE.left(0)(0),
  );
  assertEquals(
    pipe(FE.right(1), FE.flatmap((n) => n === 0 ? FE.left(n) : FE.right(n)))(0),
    FE.right(1)(0),
  );
  assertEquals(
    pipe(FE.left(1), FE.flatmap((n) => n === 0 ? FE.left(n) : FE.right(n)))(0),
    FE.left(1)(0),
  );
});

Deno.test("FnEither recover", () => {
  const recover = FE.recover((n: number) =>
    n > 0 ? FE.id<number>() : FE.idLeft<number>()
  );
  assertEquals(pipe(recover(FE.id<number>()))(0), E.right(0));
  assertEquals(pipe(recover(FE.id<number>()))(1), E.right(1));
  assertEquals(pipe(recover(FE.idLeft<number>()))(0), E.left(0));
  assertEquals(pipe(recover(FE.idLeft<number>()))(1), E.right(1));
});

Deno.test("FnEither premap", () => {
  const premap = pipe(
    FE.id<number>(),
    FE.premap((d: Date) => d.valueOf()),
  );
  assertEquals(premap(new Date(0)), E.right(0));
});

Deno.test("FnEither dimap", () => {
  const dimap = pipe(
    FE.id<number>(),
    FE.dimap((d: Date) => d.valueOf(), (n) => n > 0),
  );
  assertEquals(dimap(new Date(0)), E.right(false));
  assertEquals(dimap(new Date(1)), E.right(true));
});

Deno.test("FnEither id", () => {
  assertEquals(FE.id<number>()(1), E.right(1));
});

Deno.test("FnEither idLeft", () => {
  assertEquals(FE.idLeft<number>()(1), E.left(1));
});

Deno.test("FnEither compose", () => {
  const isPositive = FE.fromPredicate((n: number) => n > 0);
  const composition = pipe(isPositive, FE.compose(fn));

  assertEquals(composition(0), E.left(0));
  assertEquals(composition(1), E.right(1));
  assertEquals(composition(1.5), E.left(1.5));
});

Deno.test("FnEither BimappableFnEither", () => {
  assertStrictEquals(FE.BimappableFnEither.map, FE.map);
  assertStrictEquals(FE.BimappableFnEither.mapSecond, FE.mapSecond);
});

Deno.test("FnEither FlatmappableFnEither", () => {
  assertStrictEquals(FE.FlatmappableFnEither.wrap, FE.wrap);
  assertStrictEquals(FE.FlatmappableFnEither.apply, FE.apply);
  assertStrictEquals(FE.FlatmappableFnEither.map, FE.map);
  assertStrictEquals(FE.FlatmappableFnEither.flatmap, FE.flatmap);
});

Deno.test("FnEither PremappableFnEither", () => {
  assertStrictEquals(FE.PremappableFnEither.premap, FE.premap);
});

Deno.test("FnEither getRightFlatmappable", () => {
  const { wrap, apply, map, flatmap } = FE.getRightFlatmappable(
    InitializableNumberSum,
  );
  assertStrictEquals(wrap, FE.wrap);
  assertStrictEquals(map, FE.map);
  assertStrictEquals(flatmap, FE.flatmap);

  const add = (n: number) => n + 1;
  assertEquals(pipe(FE.right(add), apply(FE.right(1)))(1), FE.right(2)(0));
  assertEquals(pipe(FE.right(add), apply(FE.left(1)))(1), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), apply(FE.right(1)))(1), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), apply(FE.left(2)))(1), FE.left(3)(0));
});
