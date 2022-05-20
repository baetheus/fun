import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as I from "../io.ts";
import * as O from "../option.ts";
import { semigroupSum } from "../semigroup.ts";
import { monoidSum } from "../monoid.ts";
import { pipe } from "../fns.ts";

// deno-lint-ignore no-explicit-any
const assertEqualsIO = (a: I.IO<any>, b: I.IO<any>) => assertEquals(a(), b());

Deno.test("IO getSemigroup", () => {
  const Semigroup = I.getSemigroup(semigroupSum);
  const concat = Semigroup.concat(I.of(1));

  assertEqualsIO(concat(I.of(1)), I.of(2));
});

Deno.test("IO getMonoid", () => {
  const Monoid = I.getMonoid(monoidSum);
  const empty = Monoid.empty();

  assertEqualsIO(empty, I.of(0));
});

Deno.test("IO of", () => {
  assertEqualsIO(I.of(1), I.of(1));
});

Deno.test("IO ap", () => {
  const ap = I.ap(I.of(AS.add));
  assertEqualsIO(ap(I.of(1)), I.of(2));
});

Deno.test("IO map", () => {
  const map = I.map(AS.add);
  assertEqualsIO(map(I.of(1)), I.of(2));
});

Deno.test("IO join", () => {
  assertEqualsIO(I.join(I.of(I.of(1))), I.of(1));
});

Deno.test("IO chain", () => {
  const chain = I.chain((n: number) => I.of(n + 1));
  assertEqualsIO(chain(I.of(1)), I.of(2));
});

Deno.test("IO reduce", () => {
  const reduce = I.reduce((acc: number, cur: number) => acc + cur, 0);
  assertEquals(reduce(I.of(1)), 1);
});

Deno.test("IO traverse", () => {
  const fold = O.fold(() => -1, (n: I.IO<number>) => n());
  const t0 = I.traverse(O.Applicative);
  const t1 = t0((n: number) => n === 0 ? O.none : O.some(n));
  const t2 = fold(t1(I.of(0)));
  const t3 = fold(t1(I.of(1)));

  assertEquals(t2, -1);
  assertEquals(t3, 1);
});

Deno.test("IO extend", () => {
  const extend = I.extend((ta: I.IO<number>) => ta() + 1);
  assertEqualsIO(extend(I.of(1)), I.of(2));
});

Deno.test("IO sequenceTuple", () => {
  const r1 = I.sequenceTuple(I.of(1), I.of("Hello World"));
  assertEqualsIO(r1, I.of([1, "Hello World"]));
});

Deno.test("IO sequenceStruct", () => {
  const r1 = I.sequenceStruct({ a: I.of(1), b: I.of("Hello World") });
  assertEqualsIO(r1, I.of({ a: 1, b: "Hello World" }));
});

// Deno.test("IO Do, bind, bindTo", () => {
//   assertEqualsIO(
//     pipe(
//       I.Do(),
//       I.bind("one", () => I.of(1)),
//       I.bind("two", ({ one }) => I.of(one + one)),
//       I.map(({ one, two }) => one + two),
//     ),
//     I.of(3),
//   );
//   assertEqualsIO(
//     pipe(
//       I.of(1),
//       I.bindTo("one"),
//     ),
//     I.of({ one: 1 }),
//   );
// });
