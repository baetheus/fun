import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as E from "../either.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as Sortable from "../sortable.ts";
import { pipe } from "../fn.ts";

Deno.test("Either left", () => {
  assertEquals(E.left(1), { tag: "Left", left: 1 });
});

Deno.test("Either fail", () => {
  assertEquals(E.fail(1), { tag: "Left", left: 1 });
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
  );

  assertEquals(fromPredicate(0), E.right(0));
  assertEquals(fromPredicate("asdf"), E.left("asdf"));
});

Deno.test("Either match", () => {
  const match = E.match((l: string) => l, (r: number) => r.toString());

  assertEquals(match(E.right(1)), "1");
  assertEquals(match(E.left("asdf")), "asdf");
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

Deno.test("Either getShowable", () => {
  const Showable = E.getShowable(
    { show: (n: number) => n.toString() },
    { show: (n: number) => n.toString() },
  );

  assertEquals(Showable.show(E.left(1)), "Left(1)");
  assertEquals(Showable.show(E.right(1)), "Right(1)");
});

Deno.test("Either getSetoid", () => {
  const Setoid = E.getComparable(N.ComparableNumber, N.ComparableNumber);
  const right = Setoid.compare(E.right(1));
  const left = Setoid.compare(E.left(1));

  assertEquals(right(E.right(1)), true);
  assertEquals(right(E.right(2)), false);
  assertEquals(right(E.left(1)), false);
  assertEquals(right(E.left(2)), false);

  assertEquals(left(E.right(1)), false);
  assertEquals(left(E.right(2)), false);
  assertEquals(left(E.left(1)), true);
  assertEquals(left(E.left(2)), false);
});

Deno.test("Either getSortable", () => {
  const ord = E.getSortable(N.SortableNumber, N.SortableNumber);
  const lte = Sortable.lte(ord);
  const right = lte(E.right(2));
  const left = lte(E.left(2));

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

Deno.test("Either getLeftInitializable", () => {
  const Initializable = E.getLeftInitializable<number, number>(
    N.InitializableNumberSum,
  );
  const right = Initializable.combine(E.right(1));
  const left = Initializable.combine(E.left(1));

  assertEquals(right(E.right(1)), E.right(1));
  assertEquals(right(E.left(1)), E.right(1));
  assertEquals(left(E.right(1)), E.right(1));
  assertEquals(left(E.left(1)), E.left(2));
  assertEquals(Initializable.init(), E.left(0));
});

Deno.test("Either getRightInitializable", () => {
  const Initializable = E.getRightInitializable<number, number>(
    N.InitializableNumberSum,
  );
  const right = Initializable.combine(E.right(1));
  const left = Initializable.combine(E.left(1));

  assertEquals(right(E.right(1)), E.right(2));
  assertEquals(right(E.left(1)), E.left(1));
  assertEquals(left(E.right(1)), E.left(1));
  assertEquals(left(E.left(1)), E.left(1));
});

Deno.test("Either getRightInitializable", () => {
  const Initializable = E.getRightInitializable<number, number>(
    N.InitializableNumberSum,
  );

  assertEquals(Initializable.init(), E.right(N.InitializableNumberSum.init()));
});

Deno.test("Either reduce", () => {
  const reduce = E.reduce((o: number, i: number) => o + i, 0);

  assertEquals(reduce(E.left("adsf")), 0);
  assertEquals(reduce(E.right(1)), 1);
});

Deno.test("Either map", () => {
  assertEquals(pipe(E.right(1), E.map((n) => n + 1)), E.right(2));
  assertEquals(pipe(E.left(1), E.map((n: number) => n + 1)), E.left(1));
});

Deno.test("Either mapSecond", () => {
  assertEquals(pipe(E.right(1), E.mapSecond((n: number) => n + 1)), E.right(1));
  assertEquals(pipe(E.left(1), E.mapSecond((n: number) => n + 1)), E.left(2));
});

Deno.test("Either apply", () => {
  assertEquals(pipe(E.left(1), E.apply(E.left(2))), E.left(2));
  assertEquals(pipe(E.left(1), E.apply(E.right(2))), E.left(1));
  assertEquals(
    pipe(E.right((n: number) => n + 1), E.apply(E.left(1))),
    E.left(1),
  );
  assertEquals(
    pipe(E.right((n: number) => n + 1), E.apply(E.right(2))),
    E.right(3),
  );
});

Deno.test("Either flatmap", () => {
  assertEquals(pipe(E.right(1), E.flatmap((n) => E.right(n + 1))), E.right(2));
  assertEquals(pipe(E.right(1), E.flatmap((n) => E.left(n + 1))), E.left(2));
  assertEquals(pipe(E.left(1), E.flatmap((n) => E.right(n + 1))), E.left(1));
  assertEquals(pipe(E.left(1), E.flatmap((n) => E.left(n + 1))), E.left(1));
});

Deno.test("Either flatmapFirst", () => {
  assertEquals(
    pipe(E.right(1), E.flatmapFirst((n) => E.right(n + 1))),
    E.right(1),
  );
  assertEquals(
    pipe(E.right(1), E.flatmapFirst((n) => E.left(n + 1))),
    E.left(2),
  );
  assertEquals(
    pipe(E.left(1), E.flatmapFirst((n) => E.right(n + 1))),
    E.left(1),
  );
  assertEquals(
    pipe(E.left(1), E.flatmapFirst((n) => E.left(n + 1))),
    E.left(1),
  );
});

Deno.test("Either alt", () => {
  assertEquals(pipe(E.left(1), E.alt(E.left(2))), E.left(2));
  assertEquals(pipe(E.left(1), E.alt(E.right(1))), E.right(1));
  assertEquals(pipe(E.right(1), E.alt(E.left(1))), E.right(1));
  assertEquals(pipe(E.right(1), E.alt(E.right(2))), E.right(1));
});

Deno.test("Either recover", () => {
  const recover = E.recover((n: number) => n === 0 ? E.left(n) : E.right(n));

  assertEquals(recover(E.right(0)), E.right(0));
  assertEquals(recover(E.right(1)), E.right(1));
  assertEquals(recover(E.left(0)), E.left(0));
  assertEquals(recover(E.left(1)), E.right(1));
});

Deno.test("Either traverse", () => {
  const traverse = E.traverse(O.ApplicableOption);
  assertEquals(
    pipe(E.right(1), traverse((n) => O.some(n))),
    O.some(E.right(1)),
  );
  assertEquals(
    pipe(E.left(1), traverse((n) => O.some(n))),
    O.some(E.left(1)),
  );
  assertEquals(
    pipe(E.right(1), traverse(() => O.none)),
    O.none,
  );
  assertEquals(
    pipe(E.left(1), traverse(() => O.none)),
    O.some(E.left(1)),
  );
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
