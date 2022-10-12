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

Deno.test("Nilable fold", () => {
  const fold = N.fold(() => 0, (n: number) => n);
  assertEquals(fold(null), 0);
  assertEquals(fold(undefined), 0);
  assertEquals(fold(1), 1);
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

Deno.test("Nilable getShow", () => {
  const { show } = N.getShow({ show: (n: number) => n.toString() });
  assertEquals(show(undefined), "nil");
  assertEquals(show(null), "nil");
  assertEquals(show(1), "1");
});

Deno.test("Nilable of", () => {
  assertEquals(N.of(1), 1);
});

Deno.test("Nilable throwError", () => {
  assertEquals(N.throwError(), N.nil);
});

Deno.test("Nilable ap", () => {
  const ap1 = N.ap(N.make(add));
  const ap2 = N.ap(N.constNil<typeof add>());

  assertEquals(ap1(null), N.nil);
  assertEquals(ap1(undefined), N.nil);
  assertEquals(ap1(1), 2);
  assertEquals(ap2(null), N.nil);
  assertEquals(ap2(undefined), N.nil);
  assertEquals(ap2(1), N.nil);
});

Deno.test("Nilable map", () => {
  const map = N.map(add);
  assertEquals(map(null), N.nil);
  assertEquals(map(undefined), N.nil);
  assertEquals(map(1), 2);
});

Deno.test("Nilable join", () => {
  assertEquals(N.join(undefined), N.nil);
  assertEquals(N.join(null), N.nil);
  assertEquals(N.of(1), 1);
});

Deno.test("Nilable alt", () => {
  assertEquals(pipe(N.of(1), N.alt(N.of(2))), N.of(1));
  assertEquals(pipe(N.of(1), N.alt(N.throwError())), N.of(1));
  assertEquals(pipe(N.throwError(), N.alt(N.of(1))), N.of(1));
  assertEquals(pipe(N.throwError(), N.alt(N.throwError())), N.throwError());
});

Deno.test("Nilable chain", () => {
  const chain = N.chain((n: number) => n === 0 ? N.nil : n);
  assertEquals(chain(undefined), N.nil);
  assertEquals(chain(null), N.nil);
  assertEquals(chain(1), 1);
});

Deno.test("Nilable sequenceStruct", () => {
  assertEquals(N.sequenceStruct({ a: N.make(0), b: N.make(1) }), {
    a: 0,
    b: 1,
  });
  assertEquals(N.sequenceStruct({ a: N.make(0), b: N.nil }), N.nil);
  assertEquals(N.sequenceStruct({ a: N.nil, b: N.make(1) }), N.nil);
  assertEquals(N.sequenceStruct({ a: N.nil, b: N.nil }), N.nil);
});

Deno.test("Nilable sequenceTuple", () => {
  assertEquals(N.sequenceTuple(N.make(0), N.make(1)), [0, 1]);
  assertEquals(N.sequenceTuple(N.make(0), N.nil), N.nil);
  assertEquals(N.sequenceTuple(N.nil, N.make(1)), N.nil);
  assertEquals(N.sequenceTuple(N.nil, N.nil), N.nil);
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
