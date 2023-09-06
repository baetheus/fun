import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as N from "../nilable.ts";
import { pipe, todo } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("Nilable nil", () => {
  assertEquals(N.nil, undefined);
});

Deno.test("Nilable constNil", () => {
  assertEquals(N.constNil(), N.nil);
});

Deno.test("Nilable make", () => {
  assertEquals(N.make(null), N.nil);
  assertEquals(N.make(undefined), N.nil);
  assertEquals(N.make(1), 1);
});

Deno.test("Nilable fromPredicate", () => {
  const fromPredicate = N.fromPredicate((n: number) => n > 0);

  assertEquals(fromPredicate(null), N.nil);
  assertEquals(fromPredicate(undefined), N.nil);
  assertEquals(fromPredicate(0), N.nil);
  assertEquals(fromPredicate(1), 1);
});

Deno.test("Nilable tryCatch", () => {
  assertEquals(N.tryCatch(todo), N.nil);
  assertEquals(N.tryCatch(() => 1), 1);
});

Deno.test("Nilable match", () => {
  const match = N.match(() => 0, (n: number) => n);
  assertEquals(match(null), 0);
  assertEquals(match(undefined), 0);
  assertEquals(match(1), 1);
});

Deno.test("Nilable getOrElse", () => {
  const getOrElse = N.getOrElse(() => 0);
  assertEquals(getOrElse(null), 0);
  assertEquals(getOrElse(undefined), 0);
  assertEquals(getOrElse(1), 1);
});

Deno.test("Nilable toNull", () => {
  assertEquals(N.toNull(null), null);
  assertEquals(N.toNull(undefined), null);
  assertEquals(N.toNull(1), 1);
});

Deno.test("Nilable toUndefined", () => {
  assertEquals(N.toUndefined(null), undefined);
  assertEquals(N.toUndefined(undefined), undefined);
  assertEquals(N.toUndefined(1), 1);
});

Deno.test("Nilable isNil", () => {
  assertEquals(N.isNil(undefined), true);
  assertEquals(N.isNil(null), true);
  assertEquals(N.isNil(0), false);
  assertEquals(N.isNil(""), false);
});

Deno.test("Nilable isNotNil", () => {
  assertEquals(N.isNotNil(undefined), false);
  assertEquals(N.isNotNil(null), false);
  assertEquals(N.isNotNil(0), true);
  assertEquals(N.isNotNil(""), true);
});

Deno.test("Nilable getShowable", () => {
  const { show } = N.getShowable({ show: (n: number) => n.toString() });
  assertEquals(show(undefined), "nil");
  assertEquals(show(null), "nil");
  assertEquals(show(1), "1");
});

Deno.test("Nilable wrap", () => {
  assertEquals(N.wrap(1), 1);
});

Deno.test("Nilable fail", () => {
  assertEquals(N.fail(), N.nil);
});

Deno.test("Nilable apply", () => {
  const add = (n: number) => n + 1;

  assertEquals(pipe(N.wrap(add), N.apply(N.wrap(1))), N.wrap(2));
  assertEquals(pipe(N.wrap(add), N.apply(N.constNil())), N.nil);
  assertEquals(pipe(N.constNil(), N.apply(N.wrap(1))), N.nil);
  assertEquals(pipe(N.constNil(), N.apply(N.constNil())), N.nil);
});

Deno.test("Nilable map", () => {
  const map = N.map(add);
  assertEquals(map(null), N.nil);
  assertEquals(map(undefined), N.nil);
  assertEquals(map(1), 2);
});

Deno.test("Nilable alt", () => {
  assertEquals(pipe(N.wrap(1), N.alt(N.wrap(2))), N.wrap(1));
  assertEquals(pipe(N.wrap(1), N.alt(N.fail())), N.wrap(1));
  assertEquals(pipe(N.fail(), N.alt(N.wrap(1))), N.wrap(1));
  assertEquals(pipe(N.fail(), N.alt(N.fail())), N.fail());
});

Deno.test("Nilable flatmap", () => {
  const flatmap = N.flatmap((n: number) => n === 0 ? N.nil : n);
  assertEquals(flatmap(undefined), N.nil);
  assertEquals(flatmap(null), N.nil);
  assertEquals(flatmap(1), 1);
});

// Deno.test("Nilable Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       N.Do(),
//       N.bind("one", () => N.make(1)),
//       N.bind("two", ({ one }) => N.make(one + one)),
//       N.map(({ one, two }) => one + two),
//     ),
//     N.make(3),
//   );
//   assertEquals(
//     pipe(
//       N.make(1),
//       N.bindTo("one"),
//     ),
//     N.make({ one: 1 }),
//   );
// });
