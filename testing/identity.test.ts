import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../identity.ts";

import * as AS from "./assert.ts";

Deno.test("Identity Functor", () => {
  AS.assertFunctor(I.Functor, { ta: I.of(1), fai: AS.add, fij: AS.multiply });
});

Deno.test("Identity Apply", () => {
  AS.assertApply(I.Apply, {
    ta: I.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: I.of(AS.add),
    tfij: I.of(AS.multiply),
  });
});

Deno.test("Identity Applicative", () => {
  AS.assertApplicative(I.Applicative, {
    a: 1,
    ta: I.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: I.of(AS.add),
    tfij: I.of(AS.multiply),
  });
});

Deno.test("Identity Chain", () => {
  AS.assertChain(I.Chain, {
    a: 1,
    ta: I.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: I.of(AS.add),
    tfij: I.of(AS.multiply),
    fati: (n: number) => I.of(n),
    fitj: (n: number) => I.of(n),
  });
});

Deno.test("Identity Monad", () => {
  AS.assertMonad(I.Monad, {
    a: 1,
    ta: I.of(1),
    fai: AS.add,
    fij: AS.multiply,
    tfai: I.of(AS.add),
    tfij: I.of(AS.multiply),
    fati: (n: number) => I.of(n),
    fitj: (n: number) => I.of(n),
  });
});

Deno.test("Identity of", () => {
  assertEquals(I.of(1), 1);
});

Deno.test("Identity ap", () => {
  const ap = I.ap(I.of(AS.add));
  assertEquals(ap(I.of(1)), I.of(2));
});

Deno.test("Identity map", () => {
  const map = I.map(AS.add);
  assertEquals(map(I.of(1)), I.of(2));
});

Deno.test("Identity join", () => {
  assertEquals(I.join(I.of(I.of(1))), I.of(1));
});

Deno.test("Identity chain", () => {
  const chain = I.chain((n: number) => I.of(n + 1));
  assertEquals(chain(I.of(1)), I.of(2));
});
