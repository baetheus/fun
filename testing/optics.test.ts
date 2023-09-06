import {
  assertEquals,
  assertExists,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import type { ReadonlyRecord } from "../record.ts";
import type { Option } from "../option.ts";
import type { Either } from "../either.ts";
import type { Pair } from "../pair.ts";

import * as O from "../optics.ts";
import * as A from "../array.ts";
import * as Op from "../option.ts";
import * as E from "../either.ts";
import * as P from "../pair.ts";
import * as R from "../record.ts";
import * as N from "../number.ts";
import * as T from "../tree.ts";
import * as S from "../set.ts";
import { identity, pipe } from "../fn.ts";

const inc = (n: number) => n + 1;

Deno.test("Optics _unsafeCast", () => {
  const lens = O.lens<number, number>(identity, identity);
  const affine = O.affineFold<number, number>(Op.wrap, identity);
  const fold = O.fold<number, number>(A.wrap, identity);

  assertExists(O._unsafeCast(lens, O.LensTag));
  assertExists(O._unsafeCast(lens, O.AffineTag));
  assertExists(O._unsafeCast(lens, O.FoldTag));

  assertThrows(() => O._unsafeCast(affine, O.LensTag));
  assertExists(O._unsafeCast(affine, O.AffineTag));
  assertExists(O._unsafeCast(affine, O.FoldTag));

  assertThrows(() => O._unsafeCast(fold, O.LensTag));
  assertThrows(() => O._unsafeCast(fold, O.AffineTag));
  assertExists(O._unsafeCast(fold, O.FoldTag));
});

Deno.test("Optics viewer", () => {
  const lens = O.viewer(O.LensTag, (n: number) => n);
  const affine = O.viewer(
    O.AffineTag,
    (n: number) => n > 0 ? Op.some(n) : Op.none,
  );
  const fold = O.viewer(O.FoldTag, (n: number[]) => n);

  assertEquals(lens.view(1), 1);
  assertEquals(affine.view(0), Op.none);
  assertEquals(affine.view(1), Op.some(1));
  assertEquals(fold.view([1]), [1]);
});

Deno.test("Optics modifier", () => {
  const mod = O.modifier(E.map);
  assertStrictEquals(mod.modify, E.map);
});

Deno.test("Optics reviewer", () => {
  const rev = O.reviewer(E.wrap);
  assertStrictEquals(rev.review, E.wrap);
});

Deno.test("Optics optic", () => {
  const optic = O.optic<O.LensTag, P.Pair<number, number>, number>(
    O.LensTag,
    P.getFirst,
    P.map,
  );

  assertStrictEquals(optic.tag, O.LensTag);
  assertStrictEquals(optic.view, P.getFirst);
  assertStrictEquals(optic.modify, P.map);

  const optic2 = O.optic<O.AffineTag, Op.Option<number>, number>(
    O.AffineTag,
    identity,
    Op.map,
    Op.wrap,
  );

  assertStrictEquals(optic2.tag, O.AffineTag);
  assertStrictEquals(optic2.view, identity);
  assertStrictEquals(optic2.modify, Op.map);
  assertStrictEquals(optic2.review, Op.wrap);
});

Deno.test("Optic lens", () => {
  const lens = O.lens<{ one: number }, number>(
    (s) => s.one,
    (mod) => ({ one }) => ({ one: mod(one) }),
  );

  assertEquals(lens.view({ one: 1 }), 1);
  assertEquals(lens.modify(inc)({ one: 1 }), { one: 2 });
  assertStrictEquals(lens.tag, O.LensTag);
});

Deno.test("Optic iso", () => {
  const iso = O.iso<{ one: number }, number>(
    (s) => s.one,
    (one) => ({ one }),
    (mod) => ({ one }) => ({ one: mod(one) }),
  );

  assertEquals(iso.view({ one: 1 }), 1);
  assertEquals(iso.modify(inc)({ one: 1 }), { one: 2 });
  assertEquals(iso.review(1), { one: 1 });
  assertStrictEquals(iso.tag, O.LensTag);
});

Deno.test("Optic affineFold", () => {
  const affine = O.affineFold<{ one?: number }, number>(
    (s) => Op.fromNullable(s.one),
    R.map,
  );

  assertEquals(affine.view({}), Op.none);
  assertEquals(affine.view({ one: 1 }), Op.some(1));
  assertEquals(affine.modify(inc)({}), {});
  assertEquals(affine.modify(inc)({ one: 1 }), { one: 2 });
  assertStrictEquals(affine.tag, O.AffineTag);
});

Deno.test("Optic prism", () => {
  const prism = O.prism<{ one?: number }, number>(
    (s) => Op.fromNullable(s.one),
    (one) => ({ one }),
    R.map,
  );

  assertEquals(prism.view({}), Op.none);
  assertEquals(prism.view({ one: 1 }), Op.some(1));
  assertEquals(prism.modify(inc)({}), {});
  assertEquals(prism.modify(inc)({ one: 1 }), { one: 2 });
  assertEquals(prism.review(1), { one: 1 });
  assertStrictEquals(prism.tag, O.AffineTag);
});

Deno.test("Optic fold", () => {
  const fold = O.fold<Record<string, number>, number>(
    Object.values,
    R.map,
  );

  assertEquals(fold.view({}), []);
  assertEquals(fold.view({ one: 1, two: 2 }), [1, 2]);
  assertEquals(fold.modify(inc)({}), {});
  assertEquals(fold.modify(inc)({ one: 1, two: 2 }), {
    one: 2,
    two: 3,
  });
  assertStrictEquals(fold.tag, O.FoldTag);
});

Deno.test("Optic refold", () => {
  const fold = O.refold<Record<string, number>, number>(
    Object.values,
    (value) => ({ [value]: value }),
    R.map,
  );

  assertEquals(fold.view({}), []);
  assertEquals(fold.view({ one: 1, two: 2 }), [1, 2]);
  assertEquals(fold.modify(inc)({}), {});
  assertEquals(fold.modify(inc)({ one: 1, two: 2 }), {
    one: 2,
    two: 3,
  });
  assertEquals(fold.review(1), { 1: 1 });
  assertStrictEquals(fold.tag, O.FoldTag);
});

Deno.test("Optic fromPredicate", () => {
  const positive = O.fromPredicate((n: number) => n > 0);

  assertEquals(positive.view(0), Op.none);
  assertEquals(positive.view(1), Op.some(1));
  assertEquals(positive.modify(inc)(0), 0);
  assertEquals(positive.modify(inc)(1), 2);
  assertEquals(positive.review(0), 0);
  assertEquals(positive.review(1), 1);

  const noninit = O.fromPredicate((
    arr: number[],
  ): arr is [number, ...number[]] => arr.length > 0);

  assertEquals(noninit.view([]), Op.none);
  assertEquals(noninit.view([1]), Op.some([1]));
  assertEquals(
    noninit.modify(([head, ...rest]) => [inc(head), ...rest.map(inc)])([]),
    [],
  );
  assertEquals(
    noninit.modify(([head, ...rest]) => [inc(head), ...rest.map(inc)])([1, 2]),
    [2, 3],
  );
  assertEquals(noninit.review([1, 2]), [1, 2]);
  assertStrictEquals(noninit.tag, O.AffineTag);
});

Deno.test("Optic view", () => {
  assertEquals(pipe(O.id<number>(), O.view(1)), 1);
});

Deno.test("Optic modify", () => {
  const mod = pipe(O.id<number>(), O.modify(inc));
  assertEquals(mod(1), 2);
});

Deno.test("Optic replace", () => {
  const set = pipe(O.id<number>(), O.replace(0));
  assertEquals(set(1), 0);
});

Deno.test("Optic review", () => {
  const shift = O.iso((n: number) => n + 1, (n) => n - 1);
  assertEquals(pipe(shift, O.review(1)), 0);
});

Deno.test("Optic id", () => {
  const id = O.id<number>();

  assertStrictEquals(id.tag, O.LensTag);
  assertStrictEquals(id.view, identity);
  assertStrictEquals(id.review, identity);
});

Deno.test("Optic compost", () => {
  const lens = O.id<number>();
  const affine = O.affineFold<number, number>(Op.wrap, identity);
  const fold = O.fold<number, number>(A.wrap, identity);

  const ll = pipe(lens, O.compose(lens));
  const la = pipe(lens, O.compose(affine));
  const lf = pipe(lens, O.compose(fold));
  const al = pipe(affine, O.compose(lens));
  const aa = pipe(affine, O.compose(affine));
  const af = pipe(affine, O.compose(fold));
  const fl = pipe(fold, O.compose(lens));
  const fa = pipe(fold, O.compose(affine));
  const ff = pipe(fold, O.compose(fold));

  assertEquals(ll.view(1), 1);
  assertEquals(ll.modify(inc)(1), 2);
  assertStrictEquals(ll.tag, O.LensTag);

  assertEquals(la.view(1), Op.some(1));
  assertEquals(la.modify(inc)(1), 2);
  assertStrictEquals(la.tag, O.AffineTag);

  assertEquals(lf.view(1), [1]);
  assertEquals(lf.modify(inc)(1), 2);
  assertStrictEquals(lf.tag, O.FoldTag);

  assertEquals(al.view(1), Op.some(1));
  assertEquals(al.modify(inc)(1), 2);
  assertStrictEquals(al.tag, O.AffineTag);

  assertEquals(aa.view(1), Op.some(1));
  assertEquals(aa.modify(inc)(1), 2);
  assertStrictEquals(aa.tag, O.AffineTag);

  assertEquals(af.view(1), [1]);
  assertEquals(af.modify(inc)(1), 2);
  assertStrictEquals(af.tag, O.FoldTag);

  assertEquals(fl.view(1), [1]);
  assertEquals(fl.modify(inc)(1), 2);
  assertStrictEquals(fl.tag, O.FoldTag);

  assertEquals(fa.view(1), [1]);
  assertEquals(fa.modify(inc)(1), 2);
  assertStrictEquals(fa.tag, O.FoldTag);

  assertEquals(ff.view(1), [1]);
  assertEquals(ff.modify(inc)(1), 2);
  assertStrictEquals(ff.tag, O.FoldTag);
});

Deno.test("Optic composeReviewer", () => {
  const trivial = pipe(O.id<number>(), O.composeReviewer(O.id<number>()));

  assertEquals(trivial.review(1), 1);

  const some = <A>() => O.prism<Op.Option<A>, A>(identity, Op.wrap, Op.map);
  const arr = <A>() => O.refold<ReadonlyArray<A>, A>(identity, A.wrap, A.map);
  const opArr = pipe(some<ReadonlyArray<number>>(), O.composeReviewer(arr()));

  assertEquals(opArr.review(1), Op.some([1]));
});

Deno.test("Optic wrap", () => {
  const value = { one: 1 };
  assertStrictEquals(O.wrap(value).view(null), value);
});

Deno.test("Optic imap", () => {
  const optic = pipe(O.id<number>(), O.imap((n) => n + 100, (n) => n - 100));
  assertEquals(optic.view(1), 101);
});

Deno.test("Optic map", () => {
  const optic = pipe(O.id<number>(), O.map((n) => n + 1));
  assertEquals(optic.view(1), 2);
});

Deno.test("Optic ap", () => {
  type Person = { name: string; age: number };
  type State = { people: readonly Person[]; format: (p: Person) => string };

  const fmt = pipe(O.id<State>(), O.prop("format"));
  const adults = pipe(
    O.id<State>(),
    O.prop("people"),
    O.array,
    O.filter((p) => p.age > 18),
  );

  const formatted = pipe(fmt, O.apply(adults));

  const fmt1 = (p: Person) => `${p.name} is ${p.age}`;
  const fmt2 = (p: Person) => `At ${p.age} we have ${p.name}`;
  const people1: readonly Person[] = [];
  const people2: readonly Person[] = [
    { name: "Brandon", age: 37 },
    { name: "Rufus", age: 1 },
  ];

  const state1: State = { format: fmt1, people: people1 };
  const state2: State = { format: fmt1, people: people2 };
  const state3: State = { format: fmt2, people: people1 };
  const state4: State = { format: fmt2, people: people2 };

  assertEquals(formatted.view(state1), []);
  assertEquals(formatted.view(state2), ["Brandon is 37"]);
  assertEquals(formatted.view(state3), []);
  assertEquals(formatted.view(state4), ["At 37 we have Brandon"]);
});

Deno.test("Optic prop", () => {
  type Foo = { one: number; two: string };
  const one = pipe(O.id<Foo>(), O.prop("one"));

  assertEquals(one.view({ one: 1, two: "two" }), 1);
  assertEquals(one.modify((n) => n + 1)({ one: 1, two: "two" }), {
    one: 2,
    two: "two",
  });
});

Deno.test("Optic prop", () => {
  type Foo = { one: number; two: string; three: null };
  const one = pipe(O.id<Foo>(), O.props("one", "two"));

  const value = { one: 1, two: "two", three: null };

  assertEquals(one.view(value), { one: 1, two: "two" });
  assertEquals(
    one.modify(({ one, two }) => ({ one: one + one, two: two + two }))(value),
    {
      one: 2,
      two: "twotwo",
      three: null,
    },
  );
  assertStrictEquals(one.modify(identity)(value), value);
});

Deno.test("Optic index", () => {
  const atOne = pipe(O.id<readonly string[]>(), O.index(1));
  const double = pipe(atOne, O.modify((s) => s + s));

  const value = ["Hello", "World"];

  assertEquals(atOne.view([]), Op.none);
  assertEquals(atOne.view(value), Op.some("World"));
  assertEquals(double([]), []);
  assertEquals(double(value), ["Hello", "WorldWorld"]);
  assertStrictEquals(atOne.modify(identity)(value), value);
});

Deno.test("Optic key", () => {
  const atOne = pipe(O.id<Record<string, string>>(), O.key("one"));
  const double = pipe(atOne, O.modify((s) => s + s));

  const value = { one: "one", two: "two" };

  assertEquals(atOne.view({}), Op.none);
  assertEquals(atOne.view(value), Op.some("one"));
  assertEquals(double({}), {});
  assertEquals(double({ two: "two" }), { two: "two" });
  assertEquals(double({ one: "one" }), { one: "oneone" });
  assertEquals(double(value), { one: "oneone", two: "two" });
  assertStrictEquals(atOne.modify(identity)(value), value);
});

Deno.test("Optic atKey", () => {
  const atOne = pipe(O.id<Record<string, number>>(), O.atKey("one"));
  const double = pipe(atOne, O.modify(Op.map(inc)));
  const remove = pipe(atOne, O.replace(Op.constNone()));

  const value = { one: 1, two: 2 };

  assertEquals(atOne.view({}), Op.none);
  assertEquals(atOne.view({ two: 2 }), Op.none);
  assertEquals(atOne.view({ one: 1 }), Op.some(1));
  assertEquals(atOne.view({ one: 1, two: 2 }), Op.some(1));
  assertEquals(double({}), {});
  assertEquals(double({ two: 2 }), { two: 2 });
  assertEquals(double({ one: 1 }), { one: 2 });
  assertEquals(double({ one: 1, two: 2 }), { one: 2, two: 2 });
  assertEquals(remove({}), {});
  assertEquals(remove({ two: 2 }), { two: 2 });
  assertEquals(remove({ one: 1 }), {});
  assertEquals(remove({ one: 2, two: 2 }), { two: 2 });
  assertStrictEquals(atOne.modify(identity)(value), value);
});

Deno.test("Optic filter", () => {
  const refine = (a: Array<number>): a is [number] => a.length === 1;
  const pred = (n: number) => n > 0;

  const filterRefine = pipe(O.id<Array<number>>(), O.filter(refine));
  const filterPred = pipe(O.id<number>(), O.filter(pred));

  const refineInc = pipe(
    filterRefine,
    O.modify(([val]): [number] => [inc(val)]),
  );
  const predInc = pipe(filterPred, O.modify(inc));

  assertEquals(filterRefine.view([]), Op.none);
  assertEquals(filterRefine.view([1]), Op.some([1]));
  assertEquals(filterRefine.view([1, 2]), Op.none);
  assertEquals(refineInc([]), []);
  assertEquals(refineInc([1]), [2]);
  assertEquals(refineInc([1, 2]), [1, 2]);
  assertEquals(predInc(0), 0);
  assertEquals(predInc(1), 2);
});

Deno.test("Optic atMap", () => {
  const atMap = O.atMap(N.ComparableNumber);
  const one = pipe(O.id<ReadonlyMap<number, number>>(), atMap(1));

  const double = pipe(one, O.modify(Op.map(inc)));
  const remove = pipe(one, O.replace(Op.constNone()));

  const m1 = new Map<number, number>();
  const m2 = new Map([[1, 1]]);
  const m3 = new Map([[2, 2]]);
  const m4 = new Map([[1, 1], [2, 2]]);

  assertEquals(one.view(m1), Op.none);
  assertEquals(one.view(m2), Op.some(1));
  assertEquals(one.view(m3), Op.none);
  assertEquals(one.view(m4), Op.some(1));
  assertEquals(double(m1), m1);
  assertEquals(double(m2), new Map([[1, 2]]));
  assertEquals(double(m3), m3);
  assertEquals(double(m4), new Map([[1, 2], [2, 2]]));
  assertEquals(remove(m1), m1);
  assertEquals(remove(m2), m1);
  assertEquals(remove(m3), m3);
  assertEquals(remove(m4), m3);
});

Deno.test("Optic traverse", () => {
  type State = { tree: T.Tree<number> };

  const num = pipe(
    O.id<State>(),
    O.prop("tree"),
    O.traverse(T.TraversableTree),
  );
  const increase = pipe(num, O.modify(inc));

  const s1: State = { tree: T.tree(1) };
  const s2: State = { tree: T.tree(1, [T.tree(2, [T.tree(3)])]) };

  assertEquals(num.view(s1), [1]);
  assertEquals(num.view(s2), [1, 2, 3]);
  assertEquals(increase(s1), { tree: T.tree(2) });
  assertEquals(increase(s2), { tree: T.tree(2, [T.tree(3, [T.tree(4)])]) });
});

Deno.test("Optic combineAll", () => {
  type Person = { name: string; age: number };
  type People = readonly Person[];

  const cumulativeAge = pipe(
    O.id<People>(),
    O.array,
    O.prop("age"),
    O.combineAll(N.InitializableNumberSum, identity),
  );

  const people: People = [
    { name: "Brandon", age: 37 },
    { name: "Emily", age: 22 },
    { name: "Jackie", age: 47 },
    { name: "Rufus", age: 1 },
  ];

  assertEquals(cumulativeAge(people), 107);
  assertEquals(cumulativeAge([]), 0);
});

Deno.test("Optic record", () => {
  const optic = pipe(O.id<ReadonlyRecord<number>>(), O.record);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view({}), []);
  assertEquals(optic.view({ one: 1, two: 2 }), [1, 2]);
  assertEquals(incr({}), {});
  assertEquals(incr({ one: 1, two: 2 }), { one: 2, two: 3 });
});

Deno.test("Optic array", () => {
  const optic = pipe(O.id<ReadonlyArray<number>>(), O.array);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view([]), []);
  assertEquals(optic.view([1, 2]), [1, 2]);
  assertEquals(incr([]), []);
  assertEquals(incr([1, 2]), [2, 3]);
});

Deno.test("Optic set", () => {
  const optic = pipe(O.id<ReadonlySet<number>>(), O.set);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(S.init()), []);
  assertEquals(optic.view(S.set(1, 2)), [1, 2]);
  assertEquals(incr(S.init()), S.init());
  assertEquals(incr(S.set(1, 2)), S.set(2, 3));
});

Deno.test("Optic tree", () => {
  const optic = pipe(O.id<T.Tree<number>>(), O.tree);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(T.tree(1)), [1]);
  assertEquals(optic.view(T.tree(1, [T.tree(2)])), [1, 2]);
  assertEquals(incr(T.tree(1)), T.tree(2));
  assertEquals(incr(T.tree(1, [T.tree(2)])), T.tree(2, [T.tree(3)]));
});

Deno.test("Optic nilable", () => {
  const optic = pipe(O.id<number | null | undefined>(), O.nilable);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(undefined), Op.none);
  assertEquals(optic.view(null), Op.none);
  assertEquals(optic.view(1), Op.some(1));
  assertEquals(incr(undefined), undefined);
  assertEquals(incr(null), null);
  assertEquals(incr(1), 2);
});

Deno.test("Optic some", () => {
  const optic = pipe(O.id<Option<number>>(), O.some);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(Op.none), Op.none);
  assertEquals(optic.view(Op.some(1)), Op.some(1));
  assertEquals(incr(Op.none), Op.none);
  assertEquals(incr(Op.some(1)), Op.some(2));
});

Deno.test("Optic right", () => {
  const optic = pipe(O.id<Either<number, number>>(), O.right);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(E.left(1)), Op.none);
  assertEquals(optic.view(E.right(1)), Op.some(1));
  assertEquals(incr(E.left(1)), E.left(1));
  assertEquals(incr(E.right(1)), E.right(2));
});

Deno.test("Optic left", () => {
  const optic = pipe(O.id<Either<number, number>>(), O.left);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(E.right(1)), Op.none);
  assertEquals(optic.view(E.left(1)), Op.some(1));
  assertEquals(incr(E.right(1)), E.right(1));
  assertEquals(incr(E.left(1)), E.left(2));
});

Deno.test("Optic first", () => {
  const optic = pipe(O.id<Pair<number, number>>(), O.first);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(P.pair(1, 2)), 1);
  assertEquals(incr(P.pair(1, 2)), P.pair(2, 2));
});

Deno.test("Optic second", () => {
  const optic = pipe(O.id<Pair<number, number>>(), O.second);
  const incr = pipe(optic, O.modify(inc));

  assertEquals(optic.view(P.pair(1, 2)), 2);
  assertEquals(incr(P.pair(1, 2)), P.pair(1, 3));
});
