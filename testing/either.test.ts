import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as E from "../either.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("Either left", () => {
  assertEquals(E.left(1), { tag: "Left", left: 1 });
});

Deno.test("Either throwError", () => {
  assertEquals(E.throwError(1), { tag: "Left", left: 1 });
});

Deno.test("Either right", () => {
  assertEquals(E.right(1), { tag: "Right", right: 1 });
});

Deno.test("Either fromNullable", () => {
  const fromNullable = E.fromNullable(() => 1);
  assertEquals(fromNullable(1), E.right(1));
  assertEquals(fromNullable(null), E.left(1));
  assertEquals(fromNullable(undefined), E.left(1));
});

Deno.test("Either tryCatch", () => {
  assertEquals(E.tryCatch(() => 1, () => 1), E.right(1));
  assertEquals(
    E.tryCatch(() => {
      throw new Error();
    }, () => 1),
    E.left(1),
  );
});

Deno.test("Either tryCatchWrap", () => {
  const fn = E.tryCatchWrap((n: number) => {
    if (n === 0) {
      throw new Error("0");
    }
    return n;
  }, String);

  assertEquals(fn(0), E.left("Error: 0"));
  assertEquals(fn(1), E.right(1));
});

Deno.test("Either fromPredicate", () => {
  const fromPredicate = E.fromPredicate(
    (n: unknown): n is number => typeof n === "number",
    () => "unknown",
  );

  assertEquals(fromPredicate(0), E.right(0));
  assertEquals(fromPredicate("asdf"), E.left("unknown"));
});

Deno.test("Either fold", () => {
  const fold = E.fold((l: string) => l, (r: number) => r.toString());

  assertEquals(fold(E.right(1)), "1");
  assertEquals(fold(E.left("asdf")), "asdf");
});

Deno.test("Either getOrElse", () => {
  const getOrElse = E.getOrElse((n: string) => n.length);

  assertEquals(getOrElse(E.right(1)), 1);
  assertEquals(getOrElse(E.left("four")), 4);
});

Deno.test("Either getRight", () => {
  assertEquals(E.getRight(E.right(1)), O.some(1));
  assertEquals(E.getRight(E.left(1)), O.none);
});

Deno.test("Either getLeft", () => {
  assertEquals(E.getLeft(E.right(1)), O.none);
  assertEquals(E.getLeft(E.left(1)), O.some(1));
});

Deno.test("Either swap", () => {
  assertEquals(E.swap(E.right(1)), E.left(1));
  assertEquals(E.swap(E.left(1)), E.right(1));
});

Deno.test("Either stringifyJSON", () => {
  const circular: Record<string, unknown> = {};
  circular.circular = circular;

  assertEquals(E.stringifyJSON(null, String), E.right("null"));
  assertEquals(E.stringifyJSON(circular, () => "Circular"), E.left("Circular"));
});

Deno.test("Either isLeft", () => {
  assertEquals(E.isLeft(E.left(1)), true);
  assertEquals(E.isLeft(E.right(1)), false);
});

Deno.test("Either isRight", () => {
  assertEquals(E.isRight(E.left(1)), false);
  assertEquals(E.isRight(E.right(1)), true);
});

Deno.test("Either getShow", () => {
  const Show = E.getShow(
    { show: (n: number) => n.toString() },
    { show: (n: number) => n.toString() },
  );

  assertEquals(Show.show(E.left(1)), "Left(1)");
  assertEquals(Show.show(E.right(1)), "Right(1)");
});

Deno.test("Either getSetoid", () => {
  const Setoid = E.getSetoid(N.SetoidNumber, N.SetoidNumber);
  const right = Setoid.equals(E.right(1));
  const left = Setoid.equals(E.left(1));

  assertEquals(right(E.right(1)), true);
  assertEquals(right(E.right(2)), false);
  assertEquals(right(E.left(1)), false);
  assertEquals(right(E.left(2)), false);

  assertEquals(left(E.right(1)), false);
  assertEquals(left(E.right(2)), false);
  assertEquals(left(E.left(1)), true);
  assertEquals(left(E.left(2)), false);
});

Deno.test("Either getOrd", () => {
  const Ord = E.getOrd(N.OrdNumber, N.OrdNumber);
  const right = Ord.lte(E.right(2));
  const left = Ord.lte(E.left(2));

  assertEquals(right(E.right(1)), true);
  assertEquals(right(E.right(2)), true);
  assertEquals(right(E.right(3)), false);
  assertEquals(right(E.left(1)), true);
  assertEquals(right(E.left(2)), true);
  assertEquals(right(E.left(3)), true);

  assertEquals(left(E.right(1)), false);
  assertEquals(left(E.right(2)), false);
  assertEquals(left(E.right(3)), false);
  assertEquals(left(E.left(1)), true);
  assertEquals(left(E.left(2)), true);
  assertEquals(left(E.left(3)), false);
});

Deno.test("Either getLeftSemigroup", () => {
  const Semigroup = E.getLeftSemigroup<number, number>(N.SemigroupNumberSum);
  const right = Semigroup.concat(E.right(1));
  const left = Semigroup.concat(E.left(1));

  assertEquals(right(E.right(1)), E.right(1));
  assertEquals(right(E.left(1)), E.right(1));
  assertEquals(left(E.right(1)), E.right(1));
  assertEquals(left(E.left(1)), E.left(2));
});

Deno.test("Either getRightSemigroup", () => {
  const Semigroup = E.getRightSemigroup<number, number>(N.SemigroupNumberSum);
  const right = Semigroup.concat(E.right(1));
  const left = Semigroup.concat(E.left(1));

  assertEquals(right(E.right(1)), E.right(2));
  assertEquals(right(E.left(1)), E.left(1));
  assertEquals(left(E.right(1)), E.left(1));
  assertEquals(left(E.left(1)), E.left(1));
});

Deno.test("Either getRightMonoid", () => {
  const Monoid = E.getRightMonoid<number, number>(N.MonoidNumberSum);

  assertEquals(Monoid.empty(), E.right(N.MonoidNumberSum.empty()));
});

Deno.test("Either reduce", () => {
  const reduce = E.reduce((o: number, i: number) => o + i, 0);

  assertEquals(reduce(E.left("adsf")), 0);
  assertEquals(reduce(E.right(1)), 1);
});

Deno.test("Either alt", () => {
  assertEquals(pipe(E.left(1), E.alt(E.left(2))), E.left(2));
  assertEquals(pipe(E.left(1), E.alt(E.right(1))), E.right(1));
  assertEquals(pipe(E.right(1), E.alt(E.left(1))), E.right(1));
  assertEquals(pipe(E.right(1), E.alt(E.right(2))), E.right(1));
});

Deno.test("Either join", () => {
  assertEquals(E.join(E.left(1)), E.left(1));
  assertEquals(E.join(E.right(E.left(1))), E.left(1));
  assertEquals(E.join(E.right(E.right(1))), E.right(1));
});

Deno.test("Either chainLeft", () => {
  const chainLeft = E.chainLeft((n: number) =>
    n === 0 ? E.left(n) : E.right(n)
  );

  assertEquals(chainLeft(E.right(0)), E.right(0));
  assertEquals(chainLeft(E.right(1)), E.right(1));
  assertEquals(chainLeft(E.left(0)), E.left(0));
  assertEquals(chainLeft(E.left(1)), E.right(1));
});

Deno.test("Either sequenceTuple", () => {
  assertEquals(E.sequenceTuple(E.right(0), E.right("a")), E.right([0, "a"]));
  assertEquals(E.sequenceTuple(E.right(0), E.left("a")), E.left("a"));
  assertEquals(E.sequenceTuple(E.left(0), E.right("a")), E.left(0));
  assertEquals(E.sequenceTuple(E.left(0), E.left("a")), E.left("a"));
});

Deno.test("Either sequenceStruct", () => {
  assertEquals(
    E.sequenceStruct({ a: E.right(1), b: E.right(2) }),
    E.right({ a: 1, b: 2 }),
  );
  assertEquals(E.sequenceStruct({ a: E.right(1), b: E.left(2) }), E.left(2));
  assertEquals(E.sequenceStruct({ a: E.left(1), b: E.right(2) }), E.left(1));
  assertEquals(E.sequenceStruct({ a: E.left(1), b: E.left(2) }), E.left(2));
});

// Deno.test("Datum Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       E.Do(),
//       E.bind("one", () => E.right(1)),
//       E.bind("two", ({ one }) => E.right(one + one)),
//       E.map(({ one, two }) => one + two),
//     ),
//     E.right(3),
//   );
//   assertEquals(
//     pipe(
//       E.right(1),
//       E.bindTo("one"),
//     ),
//     E.right({ one: 1 }),
//   );
// });
