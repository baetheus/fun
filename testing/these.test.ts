import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as T from "../these.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { InitializableNumberSum } from "../number.ts";
import { pipe } from "../fn.ts";

const add = (n: number) => n + 1;

Deno.test("These left", () => {
  assertEquals(T.left(1), { tag: "Left", left: 1 });
});

Deno.test("These right", () => {
  assertEquals(T.right(1), { tag: "Right", right: 1 });
});

Deno.test("These both", () => {
  assertEquals(T.both(0, 1), { tag: "Both", left: 0, right: 1 });
});

Deno.test("These fold", () => {
  const fold = T.match(add, add, (a, b) => a + b);
  assertEquals(fold(T.left(1)), 2);
  assertEquals(fold(T.right(2)), 3);
  assertEquals(fold(T.both(2, 2)), 4);
});

Deno.test("These isLeft", () => {
  assertEquals(T.isLeft(T.left(1)), true);
  assertEquals(T.isLeft(T.right(1)), false);
  assertEquals(T.isLeft(T.both(1, 1)), false);
});

Deno.test("These isRight", () => {
  assertEquals(T.isRight(T.left(1)), false);
  assertEquals(T.isRight(T.right(1)), true);
  assertEquals(T.isRight(T.both(1, 1)), false);
});

Deno.test("These isBoth", () => {
  assertEquals(T.isBoth(T.left(1)), false);
  assertEquals(T.isBoth(T.right(1)), false);
  assertEquals(T.isBoth(T.both(1, 1)), true);
});

Deno.test("These wrap", () => {
  assertEquals(T.wrap(1), E.right(1));
});

Deno.test("These fail", () => {
  assertEquals(T.fail(1), E.left(1));
});

Deno.test("These mapSecond", () => {
  const mapSecond = T.mapSecond(add);
  assertEquals(mapSecond(T.left(1)), T.left(2));
  assertEquals(mapSecond(T.right(1)), T.right(1));
  assertEquals(mapSecond(T.both(1, 1)), T.both(2, 1));
});

Deno.test("These map", () => {
  const map = T.map(add);
  assertEquals(map(T.left(1)), T.left(1));
  assertEquals(map(T.right(1)), T.right(2));
  assertEquals(map(T.both(1, 1)), T.both(1, 2));
});

Deno.test("These fold", () => {
  const fold = T.fold((n: number, m: number) => n + m, 0);
  assertEquals(fold(T.left(1)), 0);
  assertEquals(fold(T.right(1)), 1);
  assertEquals(fold(T.both(1, 1)), 1);
});

Deno.test("These traverse", () => {
  const t1 = T.traverse(O.FlatmappableOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(T.left(1)), O.some(T.left(1)));
  assertEquals(t2(T.right(0)), O.none);
  assertEquals(t2(T.right(1)), O.some(T.right(1)));
  assertEquals(t2(T.both(1, 0)), O.none);
  assertEquals(t2(T.both(1, 1)), O.some(T.both(1, 1)));
});

Deno.test("These getShowableThese", () => {
  const f = { show: (n: number) => n.toString() };
  const { show } = T.getShowableThese(f, f);
  assertEquals(show(T.left(1)), "Left(1)");
  assertEquals(show(T.right(1)), "Right(1)");
  assertEquals(show(T.both(1, 1)), "Both(1, 1)");
});

Deno.test("These getCombinableThese", () => {
  const Combinable = T.getCombinableThese(
    InitializableNumberSum,
    InitializableNumberSum,
  );
  const combine = Combinable.combine;
  const cl = combine(T.left(1));
  const cr = combine(T.right(1));
  const cb = combine(T.both(1, 1));
  assertEquals(cl(T.left(1)), T.left(2));
  assertEquals(cl(T.right(1)), T.both(1, 1));
  assertEquals(cl(T.both(1, 1)), T.both(2, 1));
  assertEquals(cr(T.left(1)), T.both(1, 1));
  assertEquals(cr(T.right(1)), T.right(2));
  assertEquals(cr(T.both(1, 1)), T.both(1, 2));
  assertEquals(cb(T.left(1)), T.both(2, 1));
  assertEquals(cb(T.right(1)), T.both(1, 2));
  assertEquals(cb(T.both(1, 1)), T.both(2, 2));
});

Deno.test("These getInitializableThese", () => {
  const Combinable = T.getInitializableThese(
    InitializableNumberSum,
    InitializableNumberSum,
  );
  const combine = Combinable.combine;
  const cl = combine(T.left(1));
  const cr = combine(T.right(1));
  const cb = combine(T.both(1, 1));

  assertEquals(Combinable.init(), T.both(0, 0));
  assertEquals(cl(T.left(1)), T.left(2));
  assertEquals(cl(T.right(1)), T.both(1, 1));
  assertEquals(cl(T.both(1, 1)), T.both(2, 1));
  assertEquals(cr(T.left(1)), T.both(1, 1));
  assertEquals(cr(T.right(1)), T.right(2));
  assertEquals(cr(T.both(1, 1)), T.both(1, 2));
  assertEquals(cb(T.left(1)), T.both(2, 1));
  assertEquals(cb(T.right(1)), T.both(1, 2));
  assertEquals(cb(T.both(1, 1)), T.both(2, 2));
});

Deno.test("These getFlatmappableRight", () => {
  const INC = (n: number) => n + 1;
  type INC = typeof INC;

  const { apply, flatmap, map, wrap } = T.getFlatmappableRight(
    InitializableNumberSum,
  );

  // wrap
  assertEquals(wrap(1), T.right(1));

  // map
  assertEquals(pipe(T.right(1), map((n) => n + 1)), T.right(2));
  assertEquals(pipe(T.left(1), map((n) => n + 1)), T.left(1));
  assertEquals(pipe(T.both(1, 1), map((n) => n + 1)), T.both(1, 2));

  // flatmap
  assertEquals(pipe(T.right(1), flatmap((n) => T.right(n + 1))), T.right(2));
  assertEquals(pipe(T.right(1), flatmap((n) => T.left(n + 1))), T.left(2));
  assertEquals(
    pipe(T.right(1), flatmap((n) => T.both(n, n + 1))),
    T.both(1, 2),
  );

  assertEquals(pipe(T.left(1), flatmap((n) => T.right(n + 1))), T.left(1));
  assertEquals(pipe(T.left(1), flatmap((n) => T.left(n + 1))), T.left(1));
  assertEquals(pipe(T.left(1), flatmap((n) => T.both(n, n + 1))), T.left(1));

  assertEquals(
    pipe(T.both(1, 1), flatmap((n) => T.right(n + 1))),
    T.both(1, 2),
  );
  assertEquals(pipe(T.both(1, 1), flatmap((n) => T.left(n + 1))), T.left(3));
  assertEquals(
    pipe(T.both(1, 1), flatmap((n) => T.both(n, n + 1))),
    T.both(2, 2),
  );

  // apply
  assertEquals(
    pipe(T.right((n: number) => n + 1), apply(T.right(1))),
    T.right(2),
  );
  assertEquals(
    pipe(T.right((n: number) => n + 1), apply(T.left(1))),
    T.left(1),
  );
  assertEquals(
    pipe(T.right((n: number) => n + 1), apply(T.both(1, 1))),
    T.both(1, 2),
  );

  assertEquals(
    pipe(T.left<INC, number>(1), apply(T.right(1))),
    T.left(1),
  );
  assertEquals(
    pipe(T.left<INC, number>(1), apply(T.left(1))),
    T.left(2),
  );
  assertEquals(
    pipe(T.left<INC, number>(1), apply(T.both(1, 1))),
    T.left(2),
  );

  assertEquals(
    pipe(T.both(1, INC), apply(T.right(1))),
    T.both(1, 2),
  );
  assertEquals(
    pipe(T.both(1, INC), apply(T.left(1))),
    T.left(2),
  );
  assertEquals(
    pipe(T.both(1, INC), apply(T.both(1, 1))),
    T.both(2, 2),
  );
});
