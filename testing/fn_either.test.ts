import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std/testing/asserts.ts";

import * as FE from "../fn_either.ts";
import * as E from "../either.ts";
import { SemigroupNumberSum } from "../number.ts";
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

Deno.test("FnEither fromPredicate", () => {
  const pred = FE.fromPredicate((n: number) => n > 0);
  const refine = FE.fromPredicate((s: string): s is "Big" => s === "Big");

  assertEquals(pred(0), E.left(0));
  assertEquals(pred(1), E.right(1));
  assertEquals(refine("Hello"), E.left("Hello"));
  assertEquals(refine("Big"), E.right("Big"));
});

Deno.test("FnEither of", () => {
  assertEquals(FE.of(0)(0), E.right(0));
});

Deno.test("FnEither ap", () => {
  const add = (n: number) => n + 1;
  assertEquals(pipe(FE.right(add), FE.ap(FE.right(1)))(0), FE.right(2)(0));
  assertEquals(pipe(FE.right(add), FE.ap(FE.left(1)))(0), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), FE.ap(FE.right(1)))(0), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), FE.ap(FE.left(2)))(0), FE.left(2)(0));
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

Deno.test("FnEither mapLeft", () => {
  assertEquals(
    pipe(FE.right(1), FE.mapLeft((n: number) => n + 1))(0),
    E.right(1),
  );
  assertEquals(
    pipe(FE.left(1), FE.mapLeft((n: number) => n + 1))(0),
    E.left(2),
  );
});

Deno.test("FnEither join", () => {
  assertEquals(pipe(FE.of(FE.of(0)), FE.join)(0), FE.of(0)(0));
  assertEquals(pipe(FE.of(FE.left(0)), FE.join)(0), FE.left(0)(0));
  assertEquals(pipe(FE.left(0), FE.join)(0), FE.left(0)(0));
});

Deno.test("FnEither chain", () => {
  assertEquals(
    pipe(
      FE.of(0),
      FE.chain((n: number) => n === 0 ? FE.left(n) : FE.right(n)),
    )(0),
    FE.left(0)(0),
  );
  assertEquals(
    pipe(FE.right(1), FE.chain((n) => n === 0 ? FE.left(n) : FE.right(n)))(0),
    FE.right(1)(0),
  );
  assertEquals(
    pipe(FE.left(1), FE.chain((n) => n === 0 ? FE.left(n) : FE.right(n)))(0),
    FE.left(1)(0),
  );
});

Deno.test("FnEither chainLeft", () => {
  const chainLeft = FE.chainLeft((n: number) =>
    n > 0 ? FE.id<number>() : FE.idLeft<number>()
  );
  assertEquals(pipe(chainLeft(FE.id<number>()))(0), E.right(0));
  assertEquals(pipe(chainLeft(FE.id<number>()))(1), E.right(1));
  assertEquals(pipe(chainLeft(FE.idLeft<number>()))(0), E.left(0));
  assertEquals(pipe(chainLeft(FE.idLeft<number>()))(1), E.right(1));
});

Deno.test("FnEither contramap", () => {
  const contramap = pipe(
    FE.id<number>(),
    FE.contramap((d: Date) => d.valueOf()),
  );
  assertEquals(contramap(new Date(0)), E.right(0));
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

Deno.test("FnEither BifunctorFnEither", () => {
  assertStrictEquals(FE.BifunctorFnEither.bimap, FE.bimap);
  assertStrictEquals(FE.BifunctorFnEither.mapLeft, FE.mapLeft);
});

Deno.test("FnEither MonadFnEither", () => {
  assertStrictEquals(FE.MonadFnEither.of, FE.of);
  assertStrictEquals(FE.MonadFnEither.ap, FE.ap);
  assertStrictEquals(FE.MonadFnEither.map, FE.map);
  assertStrictEquals(FE.MonadFnEither.join, FE.join);
  assertStrictEquals(FE.MonadFnEither.chain, FE.chain);
});

Deno.test("FnEither AltFnEither", () => {
  assertStrictEquals(FE.AltFnEither.alt, FE.alt);
  assertStrictEquals(FE.AltFnEither.map, FE.map);
});

Deno.test("FnEither ContravariantFnEither", () => {
  assertStrictEquals(FE.ContravariantFnEither.contramap, FE.contramap);
});

Deno.test("FnEither ProfunctorFnEither", () => {
  assertStrictEquals(FE.ProfunctorFnEither.dimap, FE.dimap);
});

Deno.test("FnEither CategoryFnEither", () => {
  assertStrictEquals(FE.CategoryFnEither.id, FE.id);
  assertStrictEquals(FE.CategoryFnEither.compose, FE.compose);
});

Deno.test("FnEither getRightMonad", () => {
  const { of, ap, map, join, chain } = FE.getRightMonad(SemigroupNumberSum);
  assertStrictEquals(of, FE.of);
  assertStrictEquals(map, FE.map);
  assertStrictEquals(join, FE.join);
  assertStrictEquals(chain, FE.chain);

  const add = (n: number) => n + 1;
  assertEquals(pipe(FE.right(add), ap(FE.right(1)))(1), FE.right(2)(0));
  assertEquals(pipe(FE.right(add), ap(FE.left(1)))(1), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), ap(FE.right(1)))(1), FE.left(1)(0));
  assertEquals(pipe(FE.left(1), ap(FE.left(2)))(1), FE.left(3)(0));
});
