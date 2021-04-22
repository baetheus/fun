import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as M from "../../optics/optional.ts";
import * as I from "../../optics/iso.ts";
import * as L from "../../optics/lens.ts";
import * as P from "../../optics/prism.ts";
import * as O from "../../option.ts";
import * as E from "../../either.ts";
import { pipe } from "../../fns.ts";

type T1 = { one: number };

type T2 = { one: number; two: number; three: number };

const optional = M.make(
  (n: number | undefined) => n === undefined ? O.none : O.some(n),
  (a: number | undefined) => (_: number | undefined) => a,
);

Deno.test("Optional make", () => {
  const { getOption, set } = optional;
  assertEquals(getOption(0), O.some(0));
  assertEquals(getOption(undefined), O.none);
  assertEquals(set(0)(0), 0);
  assertEquals(set(0)(1), 0);
  assertEquals(set(1)(undefined), 1);
});

Deno.test("Optional asTraversal", () => {
  const traversal = M.asTraversal(optional);
  const t1 = traversal.traverse(O.Applicative);
  const t2 = t1((n) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(0), O.none);
  assertEquals(t2(1), O.some(1));
  assertEquals(t2(undefined), O.some(undefined));
});

Deno.test("Optional fromNullable", () => {
  const { getOption, set } = M.fromNullable(M.id<number | undefined>());
  assertEquals(getOption(0), O.some(0));
  assertEquals(getOption(undefined), O.none);
  assertEquals(set(0)(0), 0);
  assertEquals(set(1)(0), 1);
  assertEquals(set(1)(undefined), 1);
});

Deno.test("Optional id", () => {
  const { getOption, set } = M.id<number>();
  assertEquals(getOption(0), O.some(0));
  assertEquals(set(0)(0), 0);
  assertEquals(set(1)(0), 1);
});

Deno.test("Optional compose", () => {
  const o1 = M.make<T1, number>(
    (r) => O.some(r.one),
    (a) => (s) => ({ ...s, one: a }),
  );
  const { getOption, set } = pipe(M.id<T1>(), M.compose(o1));
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(set(2)({ one: 1 }), { one: 2 });
});

Deno.test("Optional composeIso", () => {
  const iso = I.make((n: number) => n.toString(), (s: string) => parseFloat(s));
  const { getOption, set } = pipe(optional, M.composeIso(iso));

  assertEquals(getOption(undefined), O.none);
  assertEquals(getOption(1), O.some("1"));
});

Deno.test("Optional composeLens", () => {
  const lens = L.make(
    (n: number) => n.toString(),
    (a: string) => (_: number) => parseFloat(a),
  );
  const { getOption, set } = pipe(optional, M.composeLens(lens));

  assertEquals(getOption(undefined), O.none);
  assertEquals(getOption(1), O.some("1"));
  assertEquals(set("1")(undefined), undefined);
  assertEquals(set("1")(1), 1);
  assertEquals(set("1")(2), 1);
});

Deno.test("Optional composePrism", () => {
  const prism = P.id<number>();
  const { getOption, set } = pipe(optional, M.composePrism(prism));

  assertEquals(getOption(0), O.some(0));
  assertEquals(getOption(undefined), O.none);
  assertEquals(set(1)(undefined), 1);
  assertEquals(set(1)(1), 1);
  assertEquals(set(2)(1), 2);
});

Deno.test("Optional composeTraversal", () => {
  const { traverse } = pipe(
    optional,
    M.composeTraversal(M.asTraversal(M.id<number>())),
  );
  const t1 = traverse(O.Applicative);
  const t2 = t1((n) => n === 0 ? O.none : O.some(n));

  assertEquals(t2(undefined), O.some(undefined));
  assertEquals(t2(0), O.none);
  assertEquals(t2(1), O.some(1));
});

Deno.test("Optional filter", () => {
  const { getOption, set } = pipe(M.id<number>(), M.filter((n) => n > 0));
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(set(0)(0), 0);
  assertEquals(set(1)(0), 1);
});

Deno.test("Optional modify", () => {
  const modify = pipe(M.id<number>(), M.modify((n) => n + 1));
  assertEquals(modify(0), 1);
});

Deno.test("Optional traverse", () => {
  const { traverse } = pipe(
    M.make(
      (n: number): O.Option<E.Either<number, number>> =>
        O.some(n > 0 ? E.right(n) : E.left(n)),
      (a: E.Either<number, number>) =>
        (s: number) => pipe(a, E.fold((n) => n, (n) => n)),
    ),
    M.traverse(E.Traversable),
  );
  const t1 = traverse(O.Applicative);
  const t2 = t1((n) => n === 0 ? O.none : O.some(n));

  assertEquals(t2(0), O.some(0));
  assertEquals(t2(1), O.some(1));
});

Deno.test("Optional prop", () => {
  const { getOption, set } = pipe(M.id<T1>(), M.prop("one"));
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(set(1)({ one: 1 }), { one: 1 });
  assertEquals(set(2)({ one: 1 }), { one: 2 });
});

Deno.test("Optional props", () => {
  const { getOption, set } = pipe(M.id<T2>(), M.props("one", "two"));
  const t2 = { one: 1, two: 2, three: 3 };
  assertEquals(getOption(t2), O.some({ one: 1, two: 2 }));
  assertEquals(set({ one: 1, two: 2 })(t2), t2);
  assertEquals(set({ one: 2, two: 1 })(t2), { one: 2, two: 1, three: 3 });
});

Deno.test("Optional index", () => {
  const { getOption, set } = pipe(M.id<ReadonlyArray<number>>(), M.index(1));
  assertEquals(getOption([]), O.none);
  assertEquals(getOption([1]), O.none);
  assertEquals(getOption([1, 2]), O.some(2));
  assertEquals(set(3)([]), []);
  assertEquals(set(3)([1]), [1]);
  assertEquals(set(3)([1, 2]), [1, 3]);
  assertEquals(set(3)([1, 3]), [1, 3]);
});

Deno.test("Optional key", () => {
  const { getOption, set } = pipe(
    M.id<Readonly<Record<string, number>>>(),
    M.key("one"),
  );
  assertEquals(getOption({}), O.none);
  assertEquals(getOption({ two: 2 }), O.none);
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(set(1)({}), {});
  assertEquals(set(1)({ one: 1 }), { one: 1 });
  assertEquals(set(1)({ one: 2 }), { one: 1 });
});

Deno.test("Optional atKey", () => {
  const { getOption, set } = pipe(
    M.id<Readonly<Record<string, number>>>(),
    M.atKey("one"),
  );
  assertEquals(getOption({}), O.some(O.none));
  assertEquals(getOption({ one: 1 }), O.some(O.some(1)));
  assertEquals(set(O.none)({}), {});
  assertEquals(set(O.none)({ one: 1 }), {});
  assertEquals(set(O.some(1))({}), { one: 1 });
  assertEquals(set(O.some(1))({ one: 1 }), { one: 1 });
  assertEquals(set(O.some(2))({ one: 1 }), { one: 2 });
});

Deno.test("Optional some", () => {
  const { getOption, set } = pipe(M.id<O.Option<number>>(), M.some);
  assertEquals(getOption(O.none), O.none);
  assertEquals(getOption(O.some(1)), O.some(1));
  assertEquals(set(0)(O.none), O.some(0));
  assertEquals(set(0)(O.some(0)), O.some(0));
  assertEquals(set(0)(O.some(1)), O.some(0));
});

Deno.test("Optional right", () => {
  const { getOption, set } = pipe(M.id<E.Either<number, number>>(), M.right);
  assertEquals(getOption(E.left(0)), O.none);
  assertEquals(getOption(E.right(0)), O.some(0));
  assertEquals(set(0)(E.left(0)), E.right(0));
  assertEquals(set(0)(E.right(0)), E.right(0));
  assertEquals(set(0)(E.right(1)), E.right(0));
});

Deno.test("Optional left", () => {
  const { getOption, set } = pipe(M.id<E.Either<number, number>>(), M.left);
  assertEquals(getOption(E.left(0)), O.some(0));
  assertEquals(getOption(E.right(0)), O.none);
  assertEquals(set(0)(E.right(0)), E.left(0));
  assertEquals(set(0)(E.left(0)), E.left(0));
  assertEquals(set(0)(E.left(1)), E.left(0));
});
