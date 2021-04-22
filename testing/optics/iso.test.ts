import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as I from "../../optics/iso.ts";
import * as O from "../../option.ts";
import * as E from "../../either.ts";
import { pipe } from "../../fns.ts";

const iso = I.make(
  (n: number) => n.toString(),
  (s: string) => parseFloat(s),
);
const i0 = I.make(
  (n: number) => n === 0 ? O.none : O.some(n),
  O.fold(() => 0, (n) => n),
);
const i1 = I.make(
  (n: number): E.Either<number, number> => n === 0 ? E.left(n) : E.right(n),
  E.fold((n) => n, (n) => n),
);

Deno.test("Iso make", () => {
  const { get, reverseGet } = iso;

  const nums = [-1, 0, 1, 1.1, 0.0000000900];

  nums.forEach((n) => {
    assertEquals(reverseGet(get(n)), n);
  });
});

Deno.test("Iso asLens", () => {
  const { set } = I.asLens(iso);

  assertEquals(set("10")(1), 10);
});

Deno.test("Iso asPrism", () => {
  const { getOption } = I.asPrism(iso);

  assertEquals(getOption(1), O.some("1"));
});

Deno.test("Iso asOptional", () => {
  const { getOption, set } = I.asOptional(iso);

  assertEquals(getOption(1), O.some("1"));
  assertEquals(set("1")(2), 1);
});

Deno.test("Iso asTraversal", () => {
  const { traverse } = I.asTraversal(iso);
  const t0 = traverse(O.Applicative);
  const t1 = t0((s) => s === "0" ? O.none : O.some(s));

  assertEquals(t1(0), O.none);
  assertEquals(t1(1), O.some(1));
});

Deno.test("Iso id", () => {
  const { get, reverseGet } = I.id<number>();

  assertEquals(get(1), 1);
  assertEquals(reverseGet(1), 1);
});

Deno.test("Iso compose", () => {
  const { get, reverseGet } = pipe(I.id<number>(), I.compose(iso));

  const nums = [-1, 0, 1, 1.1, 0.0000000900];
  nums.forEach((n) => {
    assertEquals(reverseGet(get(n)), n);
  });
});

Deno.test("Iso composeLens", () => {
  const { get, set } = pipe(I.id<number>(), I.composeLens(I.asLens(iso)));

  assertEquals(get(1), "1");
  assertEquals(set("2")(1), 2);
});

Deno.test("Iso composePrism", () => {
  const { getOption, reverseGet } = pipe(
    I.id<number>(),
    I.composePrism(I.asPrism(iso)),
  );

  assertEquals(getOption(1), O.some("1"));
  assertEquals(reverseGet("1"), 1);
});

Deno.test("Iso composeOptional", () => {
  const { getOption, set } = pipe(
    I.id<number>(),
    I.composeOptional(I.asOptional(iso)),
  );

  assertEquals(getOption(1), O.some("1"));
  assertEquals(set("2")(1), 2);
});

Deno.test("Iso composeTraversal", () => {
  const { traverse } = pipe(
    I.id<number>(),
    I.composeTraversal(I.asTraversal(iso)),
  );
  const t0 = traverse(O.Applicative);
  const t1 = t0(O.some);

  assertEquals(t1(0), O.some(0));
});

Deno.test("Iso modify", () => {
  const modify = I.modify((n: string) => n.includes(".") ? n : `${n}.01`);
  const m0 = modify(iso);

  assertEquals(m0(0), 0.01);
  assertEquals(m0(0.1), 0.1);
});

Deno.test("Iso map", () => {
  const map = I.map((n: number) => n + 1, (n: number) => n - 1);
  const { get, reverseGet } = map(I.id());

  assertEquals(get(1), 2);
  assertEquals(reverseGet(2), 1);
});

Deno.test("Iso reverse", () => {
  const { get, reverseGet } = I.reverse(iso);

  assertEquals(get("1"), 1);
  assertEquals(reverseGet(1), "1");
});

Deno.test("Iso traverse", () => {
  const { traverse } = pipe(i0, I.traverse(O.Traversable));
  const t0 = traverse(O.Applicative);
  const t1 = t0((n) => n === 0 ? O.none : O.some(n));

  assertEquals(t1(0), O.some(0));
  assertEquals(t1(1), O.some(1));
});

Deno.test("Iso some", () => {
  const { getOption, reverseGet } = I.some(i0);

  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
  assertEquals(reverseGet(1), 1);
});

Deno.test("Iso right", () => {
  const { getOption, reverseGet } = I.right(i1);

  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
  assertEquals(reverseGet(1), 1);
});

Deno.test("Iso left", () => {
  const { getOption, reverseGet } = I.left(i1);

  assertEquals(getOption(0), O.some(0));
  assertEquals(getOption(1), O.none);
  assertEquals(reverseGet(0), 0);
  assertEquals(reverseGet(1), 1);
});
