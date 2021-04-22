import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as L from "../../optics/lens.ts";
import * as I from "../../optics/iso.ts";
import * as P from "../../optics/prism.ts";
import * as O from "../../option.ts";
import * as E from "../../either.ts";
import { pipe } from "../../fns.ts";

type Test = {
  one: number;
  two: {
    two?: number;
  };
  three: readonly number[];
};

const makeTest = (one: number, two?: number, three: number[] = []): Test => ({
  one,
  two: { two },
  three,
});

const lens = pipe(L.id<Test>(), L.prop("one"));

const test = makeTest(1, 1);

Deno.test("Lens make", () => {
  const { get, set } = L.make(
    (s: Test) => s.one,
    (one) => (s) => ({ ...s, one }),
  );

  assertEquals(get(makeTest(1, 1)), 1);
  assertEquals(set(2)(makeTest(1, 1)), makeTest(2, 1));
});

Deno.test("Lens asOptional", () => {
  const { getOption, set } = L.asOptional(lens);

  assertEquals(getOption(test), O.some(1));
  assertEquals(set(2)(test), makeTest(2, 1));
});

Deno.test("Lens asTraveral", () => {
  const { traverse } = L.asTraversal(lens);
  const t0 = traverse(O.Applicative);
  const t1 = t0((n) => n === 0 ? O.none : O.some(n));

  assertEquals(t1(test), O.some(test));
  assertEquals(t1(makeTest(0, 1)), O.none);
});

Deno.test("Lens fromNullable", () => {
  const { getOption, set } = pipe(
    L.id<Test>(),
    L.prop("two"),
    L.prop("two"),
    L.fromNullable,
  );

  assertEquals(getOption(test), O.some(1));
  assertEquals(getOption(makeTest(1)), O.none);
  assertEquals(set(1)(test), makeTest(1, 1));
  assertEquals(set(2)(makeTest(1)), makeTest(1, 2));
});

Deno.test("Lens id", () => {
  const { get, set } = L.id<number>();

  assertEquals(get(1), 1);
  assertEquals(set(2)(1), 2);
});

Deno.test("Lens compose", () => {
  const l1 = pipe(L.id<Test>(), L.prop("two"));
  const l2 = pipe(L.id<{ two?: number }>(), L.prop("two"));
  const { get, set } = pipe(l1, L.compose(l2));

  assertEquals(get(test), 1);
  assertEquals(set(2)(test), makeTest(1, 2));
});

Deno.test("Lens composeIso", () => {
  const { get, set } = pipe(lens, L.composeIso(I.id<number>()));

  assertEquals(get(test), 1);
  assertEquals(set(2)(test), makeTest(2, 1));
});

Deno.test("Lens composePrism", () => {
  const { getOption, set } = pipe(lens, L.composePrism(P.id<number>()));

  assertEquals(getOption(test), O.some(1));
  assertEquals(set(2)(test), makeTest(2, 1));
});

Deno.test("Lens composeOptional", () => {
  const { getOption, set } = pipe(
    L.id<Test>(),
    L.composeOptional(L.asOptional(lens)),
  );

  assertEquals(getOption(test), O.some(1));
  assertEquals(set(2)(test), makeTest(2, 1));
});

Deno.test("Lens composeTraversal", () => {
  const { traverse } = pipe(
    L.id<Test>(),
    L.composeTraversal(L.asTraversal(lens)),
  );
  const t1 = traverse(O.Applicative);
  const t2 = t1((n) => n === 0 ? O.none : O.some(n));

  assertEquals(t2(makeTest(0)), O.none);
  assertEquals(t2(test), O.some(test));
});

Deno.test("Lens filter", () => {
  const { getOption, set } = pipe(lens, L.filter((n) => n > 0));
  assertEquals(getOption(test), O.some(1));
  assertEquals(getOption(makeTest(0)), O.none);
  assertEquals(set(0)(test), makeTest(0, 1));
});

Deno.test("Lens modify", () => {
  const modify = pipe(lens, L.modify((n) => n + 1));
  assertEquals(modify(test), makeTest(2, 1));
});

Deno.test("Lens traverse", () => {
  const l0 = pipe(
    L.id<Test>(),
    L.prop("two"),
    L.prop("two"),
    L.composeIso(I.make(O.fromNullable, O.getOrElse(() => 0))),
  );
  const l1 = pipe(l0, L.traverse(O.Traversable));
  const l2 = l1.traverse(O.Applicative)((n) => n === 0 ? O.none : O.some(n));

  assertEquals(l2(makeTest(0)), O.some(makeTest(0, 0)));
  assertEquals(l2(makeTest(1)), O.some(makeTest(1, 0)));
  assertEquals(l2(makeTest(0, 0)), O.none);
  assertEquals(l2(makeTest(0, 1)), O.some(makeTest(0, 1)));
  assertEquals(l2(makeTest(1, 0)), O.none);
  assertEquals(l2(makeTest(1, 1)), O.some(makeTest(1, 1)));
});

Deno.test("Lens prop", () => {
  const { get, set } = pipe(L.id<Test>(), L.prop("one"));
  assertEquals(get(test), 1);
  assertEquals(set(2)(test), makeTest(2, 1));
});

Deno.test("Lens props", () => {
  const { get, set } = pipe(L.id<Test>(), L.props("one", "two"));
  assertEquals(get(test), { one: 1, two: { two: 1 } });
  assertEquals(set({ one: 2, two: { two: undefined } })(test), makeTest(2));
});

Deno.test("Lens index", () => {
  const { getOption, set } = pipe(L.id<Test>(), L.prop("three"), L.index(1));
  assertEquals(getOption(test), O.none);
  assertEquals(getOption(makeTest(1, 1, [1])), O.none);
  assertEquals(getOption(makeTest(1, 1, [1, 2])), O.some(2));
  assertEquals(set(10)(test), test);
  assertEquals(set(10)(makeTest(1, 1, [1, 2])), makeTest(1, 1, [1, 10]));
});

Deno.test("Lens key", () => {
  const { getOption, set } = pipe(L.id<Record<string, number>>(), L.key("one"));
  assertEquals(getOption({}), O.none);
  assertEquals(getOption({ two: 2 }), O.none);
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(getOption({ one: 1, two: 2 }), O.some(1));
  assertEquals(set(2)({}), {});
  assertEquals(set(2)({ two: 2 }), { two: 2 });
  assertEquals(set(2)({ one: 1 }), { one: 2 });
  assertEquals(set(2)({ one: 2 }), { one: 2 });
});

Deno.test("Lens atKey", () => {
  const { get, set } = pipe(L.id<Record<string, number>>(), L.atKey("one"));
  assertEquals(get({}), O.none);
  assertEquals(get({ one: 1 }), O.some(1));
  assertEquals(set(O.some(1))({}), { one: 1 });
  assertEquals(set(O.some(1))({ one: 1 }), { one: 1 });
  assertEquals(set(O.some(1))({ one: 2 }), { one: 1 });
  assertEquals(set(O.none)({}), {});
  assertEquals(set(O.none)({ one: 1 }), {});
  assertEquals(set(O.none)({ two: 2 }), { two: 2 });
  assertEquals(set(O.none)({ one: 1, two: 2 }), { two: 2 });
});

Deno.test("Lens some", () => {
  type T1 = { one: O.Option<number> };
  const { getOption, set } = pipe(L.id<T1>(), L.prop("one"), L.some);
  assertEquals(getOption({ one: O.none }), O.none);
  assertEquals(getOption({ one: O.some(1) }), O.some(1));
  assertEquals(set(1)({ one: O.none }), { one: O.some(1) });
  assertEquals(set(1)({ one: O.some(1) }), { one: O.some(1) });
  assertEquals(set(2)({ one: O.some(2) }), { one: O.some(2) });
});

Deno.test("Lens right", () => {
  type T1 = { one: E.Either<number, number> };
  const { getOption, set } = pipe(L.id<T1>(), L.prop("one"), L.right);
  assertEquals(getOption({ one: E.left(1) }), O.none);
  assertEquals(getOption({ one: E.right(1) }), O.some(1));
  assertEquals(set(1)({ one: E.left(1) }), { one: E.right(1) });
  assertEquals(set(1)({ one: E.right(1) }), { one: E.right(1) });
  assertEquals(set(2)({ one: E.right(1) }), { one: E.right(2) });
});

Deno.test("Lens left", () => {
  type T1 = { one: E.Either<number, number> };
  const { getOption, set } = pipe(L.id<T1>(), L.prop("one"), L.left);
  assertEquals(getOption({ one: E.left(1) }), O.some(1));
  assertEquals(getOption({ one: E.right(1) }), O.none);
  assertEquals(set(1)({ one: E.right(1) }), { one: E.left(1) });
  assertEquals(set(1)({ one: E.left(1) }), { one: E.left(1) });
  assertEquals(set(2)({ one: E.left(1) }), { one: E.left(2) });
});
