import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as D from "../datum.ts";
import * as O from "../option.ts";
import { Setoid as setoidNumber } from "../number.ts";
import { monoidSum } from "../monoid.ts";
import { ordNumber } from "../ord.ts";
import { semigroupSum } from "../semigroup.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

Deno.test("Datum initial", () => {
  assertEquals(D.initial, { tag: "Initial" });
});

Deno.test("Datum pending", () => {
  assertEquals(D.pending, { tag: "Pending" });
});

Deno.test("Datum refresh", () => {
  assertEquals(D.refresh(1), { tag: "Refresh", value: 1 });
});

Deno.test("Datum replete", () => {
  assertEquals(D.replete(1), { tag: "Replete", value: 1 });
});

Deno.test("Datum constInitial", () => {
  assertEquals(D.constInitial(), D.initial);
});

Deno.test("Datum constPending", () => {
  assertEquals(D.constPending(), D.pending);
});

Deno.test("Datum fromNullable", () => {
  assertEquals(D.fromNullable(1), D.replete(1));
  assertEquals(D.fromNullable(null), D.initial);
  assertEquals(D.fromNullable(undefined), D.initial);
});

Deno.test("Datum tryCatch", () => {
  assertEquals(D.tryCatch(() => 1), D.replete(1));
  assertEquals(
    D.tryCatch(() => {
      throw new Error();
    }),
    D.initial,
  );
});

Deno.test("Datum toLoading", () => {
  assertEquals(D.toLoading(D.initial), D.pending);
  assertEquals(D.toLoading(D.pending), D.pending);
  assertEquals(D.toLoading(D.replete(1)), D.refresh(1));
  assertEquals(D.toLoading(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum isInitial", () => {
  assertEquals(D.isInitial(D.initial), true);
  assertEquals(D.isInitial(D.pending), false);
  assertEquals(D.isInitial(D.replete(1)), false);
  assertEquals(D.isInitial(D.refresh(1)), false);
});

Deno.test("Datum isPending", () => {
  assertEquals(D.isPending(D.initial), false);
  assertEquals(D.isPending(D.pending), true);
  assertEquals(D.isPending(D.replete(1)), false);
  assertEquals(D.isPending(D.refresh(1)), false);
});

Deno.test("Datum isReplete", () => {
  assertEquals(D.isReplete(D.initial), false);
  assertEquals(D.isReplete(D.pending), false);
  assertEquals(D.isReplete(D.replete(1)), true);
  assertEquals(D.isReplete(D.refresh(1)), false);
});

Deno.test("Datum isRefresh", () => {
  assertEquals(D.isRefresh(D.initial), false);
  assertEquals(D.isRefresh(D.pending), false);
  assertEquals(D.isRefresh(D.replete(1)), false);
  assertEquals(D.isRefresh(D.refresh(1)), true);
});

Deno.test("Datum isNone", () => {
  assertEquals(D.isNone(D.initial), true);
  assertEquals(D.isNone(D.pending), true);
  assertEquals(D.isNone(D.replete(1)), false);
  assertEquals(D.isNone(D.refresh(1)), false);
});

Deno.test("Datum isSome", () => {
  assertEquals(D.isSome(D.initial), false);
  assertEquals(D.isSome(D.pending), false);
  assertEquals(D.isSome(D.replete(1)), true);
  assertEquals(D.isSome(D.refresh(1)), true);
});

Deno.test("Datum isLoading", () => {
  assertEquals(D.isLoading(D.initial), false);
  assertEquals(D.isLoading(D.pending), true);
  assertEquals(D.isLoading(D.replete(1)), false);
  assertEquals(D.isLoading(D.refresh(1)), true);
});

Deno.test("Datum fold", () => {
  const fold = D.fold(() => 1, () => 2, (v: number) => v, (v: number) => v);

  assertEquals(fold(D.initial), 1);
  assertEquals(fold(D.pending), 2);
  assertEquals(fold(D.replete(3)), 3);
  assertEquals(fold(D.refresh(4)), 4);
});

Deno.test("Datum getOrElse", () => {
  const get = D.getOrElse(() => 0);

  assertEquals(get(D.initial), 0);
  assertEquals(get(D.pending), 0);
  assertEquals(get(D.replete(1)), 1);
  assertEquals(get(D.refresh(2)), 2);
});

Deno.test("Datum getShow", () => {
  const { show } = D.getShow({ show: (n: number) => n.toString() });

  assertEquals(show(D.initial), "Initial");
  assertEquals(show(D.pending), "Pending");
  assertEquals(show(D.replete(1)), "Replete(1)");
  assertEquals(show(D.refresh(1)), "Refresh(1)");
});

Deno.test("Datum getSemigroup", () => {
  const Semigroup = D.getSemigroup(semigroupSum);
  const initial = Semigroup.concat(D.initial);
  const pending = Semigroup.concat(D.pending);
  const replete = Semigroup.concat(D.replete(1));
  const refresh = Semigroup.concat(D.refresh(1));

  assertEquals(initial(D.initial), D.initial);
  assertEquals(initial(D.pending), D.pending);
  assertEquals(initial(D.replete(1)), D.replete(1));
  assertEquals(initial(D.refresh(1)), D.refresh(1));

  assertEquals(pending(D.initial), D.pending);
  assertEquals(pending(D.pending), D.pending);
  assertEquals(pending(D.replete(1)), D.refresh(1));
  assertEquals(pending(D.refresh(1)), D.refresh(1));

  assertEquals(replete(D.initial), D.replete(1));
  assertEquals(replete(D.pending), D.refresh(1));
  assertEquals(replete(D.replete(1)), D.replete(2));
  assertEquals(replete(D.refresh(1)), D.refresh(2));

  assertEquals(refresh(D.initial), D.refresh(1));
  assertEquals(refresh(D.pending), D.refresh(1));
  assertEquals(refresh(D.replete(1)), D.refresh(2));
  assertEquals(refresh(D.refresh(1)), D.refresh(2));

  AS.assertSemigroup(Semigroup, {
    a: D.replete(1),
    b: D.replete(2),
    c: D.replete(3),
  });
});

Deno.test("Datum getMonoid", () => {
  const Monoid = D.getMonoid(monoidSum);

  assertEquals(Monoid.empty(), D.initial);

  AS.assertMonoid(Monoid, {
    a: D.replete(1),
    b: D.replete(1),
    c: D.replete(1),
  });

  AS.assertMonoid(Monoid, {
    a: D.replete(1),
    b: D.refresh(1),
    c: D.replete(1),
  });
});

Deno.test("Datum getSetoid", () => {
  const Setoid = D.getSetoid(setoidNumber);
  const initial = Setoid.equals(D.initial);
  const pending = Setoid.equals(D.pending);
  const replete = Setoid.equals(D.replete(1));
  const refresh = Setoid.equals(D.refresh(1));

  assertEquals(initial(D.initial), true);
  assertEquals(initial(D.pending), false);
  assertEquals(initial(D.replete(1)), false);
  assertEquals(initial(D.refresh(1)), false);

  assertEquals(pending(D.initial), false);
  assertEquals(pending(D.pending), true);
  assertEquals(pending(D.replete(1)), false);
  assertEquals(pending(D.refresh(1)), false);

  assertEquals(replete(D.initial), false);
  assertEquals(replete(D.pending), false);
  assertEquals(replete(D.replete(1)), true);
  assertEquals(replete(D.replete(2)), false);
  assertEquals(replete(D.refresh(1)), false);

  assertEquals(refresh(D.initial), false);
  assertEquals(refresh(D.pending), false);
  assertEquals(refresh(D.replete(1)), false);
  assertEquals(refresh(D.refresh(1)), true);
  assertEquals(refresh(D.refresh(2)), false);

  AS.assertSetoid(Setoid, {
    a: D.replete(1),
    b: D.replete(1),
    c: D.replete(1),
    z: D.refresh(2),
  });
});

Deno.test("Datum getOrd", () => {
  const Ord = D.getOrd(ordNumber);
  const initial = Ord.lte(D.initial);
  const pending = Ord.lte(D.pending);
  const replete = Ord.lte(D.replete(1));
  const refresh = Ord.lte(D.refresh(1));

  assertEquals(initial(D.initial), true);
  assertEquals(initial(D.pending), false);
  assertEquals(initial(D.replete(1)), false);
  assertEquals(initial(D.refresh(1)), false);

  assertEquals(pending(D.initial), true);
  assertEquals(pending(D.pending), true);
  assertEquals(pending(D.replete(1)), false);
  assertEquals(pending(D.refresh(1)), false);

  assertEquals(replete(D.initial), true);
  assertEquals(replete(D.pending), true);
  assertEquals(replete(D.replete(1)), true);
  assertEquals(replete(D.replete(0)), true);
  assertEquals(replete(D.replete(2)), false);
  assertEquals(replete(D.refresh(1)), false);

  assertEquals(refresh(D.initial), true);
  assertEquals(refresh(D.pending), true);
  assertEquals(refresh(D.replete(1)), true);
  assertEquals(refresh(D.refresh(1)), true);
  assertEquals(refresh(D.refresh(0)), true);
  assertEquals(refresh(D.refresh(2)), false);

  AS.assertOrd(Ord, { a: D.constInitial(), b: D.constPending() });
  AS.assertOrd(Ord, { a: D.constPending(), b: D.constInitial() });
  AS.assertOrd(Ord, { a: D.refresh(1), b: D.replete(1) });
  AS.assertOrd(Ord, { a: D.replete(2), b: D.replete(1) });
});

Deno.test("Datum Functor", () => {
  AS.assertFunctor(D.Functor, {
    ta: D.refresh(1),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
  });
});

Deno.test("Datum Apply", () => {
  AS.assertApply(D.Apply, {
    ta: D.refresh(1),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    tfai: D.replete((n: number) => n + 1),
    tfij: D.refresh((n: number) => 2 * n),
  });
});

Deno.test("Datum Applicative", () => {
  AS.assertApplicative(D.Applicative, {
    a: 1,
    ta: D.refresh(1),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    tfai: D.replete((n: number) => n + 1),
    tfij: D.refresh((n: number) => 2 * n),
  });
});

Deno.test("Datum Chain", () => {
  AS.assertChain(D.Chain, {
    a: 1,
    ta: D.refresh(1),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    tfai: D.replete((n: number) => n + 1),
    tfij: D.refresh((n: number) => 2 * n),
    fati: (n: number) => n > 1 ? D.replete(n / 2) : D.constInitial(),
    fitj: (n: number) => n === 1 ? D.replete(1) : D.refresh(n / 2),
  });
});

Deno.test("Datum Monad", () => {
  AS.assertMonad(D.Monad, {
    a: 1,
    ta: D.refresh(1),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    tfai: D.replete((n: number) => n + 1),
    tfij: D.refresh((n: number) => 2 * n),
    fati: (n: number) => n > 1 ? D.replete(n / 2) : D.constInitial(),
    fitj: (n: number) => n === 1 ? D.replete(1) : D.refresh(n / 2),
  });
});

Deno.test("Datum Alternative", () => {
  AS.assertAlternative(D.Alternative, {
    a: 1,
    ta: D.constInitial(),
    tb: D.replete(1),
    tc: D.refresh(2),
    fai: (n: number) => n + 1,
    fij: (n: number) => n + 2,
    tfai: D.replete((n: number) => n + 1),
    tfij: D.refresh((n: number) => 2 * n),
  });
});

Deno.test("Datum Foldable", () => {
  AS.assertFoldable(D.Foldable, {
    a: 1,
    tb: D.replete(1),
    faia: (a: number, i: number) => a + i,
  });
});

Deno.test("Datum of", () => {
  assertEquals(D.of(1), D.replete(1));
});

Deno.test("Datum ap", () => {
  assertEquals(
    pipe(D.refresh(1), D.ap(D.of((n: number) => n + 1))),
    D.refresh(2),
  );
  assertEquals(
    pipe(D.initial, D.ap(D.of((n: number) => n + 1))),
    D.initial,
  );
  assertEquals(
    pipe(D.pending, D.ap(D.of((n: number) => n + 1))),
    D.pending,
  );
});

Deno.test("Datum map", () => {
  const map = D.map((n: number) => n + 1);

  assertEquals(map(D.initial), D.initial);
  assertEquals(map(D.pending), D.pending);
  assertEquals(map(D.replete(1)), D.replete(2));
  assertEquals(map(D.refresh(1)), D.refresh(2));
});

Deno.test("Datum join", () => {
  assertEquals(D.join(D.initial), D.initial);
  assertEquals(D.join(D.pending), D.pending);
  assertEquals(D.join(D.replete(D.initial)), D.initial);
  assertEquals(D.join(D.replete(D.pending)), D.pending);
  assertEquals(D.join(D.replete(D.replete(1))), D.replete(1));
  assertEquals(D.join(D.replete(D.refresh(1))), D.refresh(1));
  assertEquals(D.join(D.refresh(D.initial)), D.pending);
  assertEquals(D.join(D.refresh(D.pending)), D.pending);
  assertEquals(D.join(D.refresh(D.replete(1))), D.refresh(1));
  assertEquals(D.join(D.refresh(D.refresh(1))), D.refresh(1));
});

Deno.test("Datum chain", () => {
  const chain = D.chain((n: number) => n === 0 ? D.initial : D.replete(n));

  assertEquals(chain(D.initial), D.initial);
  assertEquals(chain(D.pending), D.pending);
  assertEquals(chain(D.replete(0)), D.initial);
  assertEquals(chain(D.replete(1)), D.replete(1));
  assertEquals(chain(D.refresh(0)), D.pending);
  assertEquals(chain(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum reduce", () => {
  const reduce = D.reduce((o: number, a: number) => o + a, 0);

  assertEquals(reduce(D.initial), 0);
  assertEquals(reduce(D.pending), 0);
  assertEquals(reduce(D.replete(1)), 1);
  assertEquals(reduce(D.refresh(1)), 1);
});

Deno.test("Datum traverse", () => {
  const traverse = D.traverse(O.Applicative);
  const add = traverse(O.fromPredicate((n: number) => n > 0));

  assertEquals(add(D.initial), O.some(D.initial));
  assertEquals(add(D.pending), O.some(D.pending));
  assertEquals(add(D.replete(0)), O.none);
  assertEquals(add(D.replete(1)), O.some(D.replete(1)));
  assertEquals(add(D.refresh(0)), O.none);
  assertEquals(add(D.refresh(1)), O.some(D.refresh(1)));
});

// Deno.test("Datum Do, bind, bindTo", () => {
//   assertEquals(
//     pipe(
//       D.Do(),
//       D.bind("one", () => D.replete(1)),
//       D.bind("two", ({ one }) => D.refresh(one + one)),
//       D.map(({ one, two }) => one + two),
//     ),
//     D.refresh(3),
//   );
//   assertEquals(
//     pipe(
//       D.replete(1),
//       D.bindTo("one"),
//     ),
//     D.replete({ one: 1 }),
//   );
// });
