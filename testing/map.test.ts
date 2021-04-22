import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as M from "../map.ts";
import * as O from "../option.ts";
import { setoidNumber } from "../setoid.ts";
import { monoidSum } from "../monoid.ts";
import { ordNumber } from "../ord.ts";
import { semigroupSum } from "../semigroup.ts";
import { pipe } from "../fns.ts";

Deno.test("Map zero", () => {
  assertEquals(M.zero, new Map());
});

Deno.test("Map empty", () => {
  assertEquals(M.empty(), new Map());
});

Deno.test("Map singleton", () => {
  assertEquals(M.singleton(1, 1), new Map([[1, 1]]));
});

Deno.test("Map Functor", () => {
  AS.assertFunctor(M.Functor, {
    ta: M.singleton(1, 1) as Map<never, number>,
    fai: AS.add,
    fij: AS.multiply,
  });
});

Deno.test("Map Bifunctor", () => {
  AS.assertBifunctor(M.Bifunctor, {
    tab: M.singleton(1, 1),
    fai: AS.add,
    fij: AS.multiply,
    fbx: AS.add,
    fxy: AS.multiply,
  });
});

Deno.test("Map getShow", () => {
  const showNumber = { show: (n: number) => n.toString() };
  const Show = M.getShow(showNumber, showNumber);

  assertEquals(Show.show(M.singleton(1, 1)), "new Map([[1, 1]])");
});

Deno.test("Map getSetoid", () => {
  const Setoid = M.getSetoid(setoidNumber, setoidNumber);

  AS.assertSetoid(Setoid, {
    a: M.singleton(1, 1),
    b: M.singleton(1, 1),
    c: M.singleton(1, 1),
    z: M.singleton(2, 2),
  });
});

Deno.test("Map getMonoid", () => {
  const Monoid = M.getMonoid(setoidNumber, semigroupSum);

  AS.assertMonoid(Monoid, {
    a: M.singleton(1, 1),
    b: M.singleton(2, 2),
    c: M.singleton(3, 3),
  });
});

Deno.test("Map size", () => {
  assertEquals(M.size(M.zero), 0);
  assertEquals(M.size(M.singleton(1, 1)), 1);
});

Deno.test("Map isEmpty", () => {
  assertEquals(M.isEmpty(M.empty()), true);
  assertEquals(M.isEmpty(M.singleton(1, 1)), false);
});

Deno.test("Map lookupWithKey", () => {
  const lookupWithKey = M.lookupWithKey(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), lookupWithKey(1)), O.some([1, 1]));
  assertEquals(pipe(M.singleton(2, 2), lookupWithKey(1)), O.none);
});

Deno.test("Map lookup", () => {
  const lookup = M.lookup(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), lookup(1)), O.some(1));
  assertEquals(pipe(M.singleton(1, 1), lookup(2)), O.none);
});

Deno.test("Map member", () => {
  const member = M.member(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), member(1)), true);
  assertEquals(pipe(M.singleton(1, 1), member(2)), false);
});

Deno.test("Map elem", () => {
  const elem = M.elem(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), elem(1)), true);
  assertEquals(pipe(M.singleton(1, 1), elem(2)), false);
});

Deno.test("Map keys", () => {
  const keys = M.keys(ordNumber);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, keys), [1, 2, 3]);
  assertEquals(pipe(tb, keys), []);
});

Deno.test("Map values", () => {
  const values = M.values(ordNumber);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, values), [1, 2, 3]);
  assertEquals(pipe(tb, values), []);
});

Deno.test("Map collect", () => {
  const collect = M.collect(ordNumber);
  const c = collect((k: number, v: number) => k + v);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, c), [2, 4, 6]);
  assertEquals(pipe(tb, c), []);
});

Deno.test("Map insertAt", () => {
  const insertAt = M.insertAt(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), insertAt(1, 2)), M.singleton(1, 2));
  assertEquals(
    pipe(M.empty<number, number>(), insertAt(1, 1)),
    M.singleton(1, 1),
  );
});

Deno.test("Map deleteAt", () => {
  const deleteAt = M.deleteAt(setoidNumber);

  assertEquals(pipe(M.empty<number, number>(), deleteAt(1)), M.zero);
  assertEquals(pipe(M.singleton(1, 1), deleteAt(1)), M.zero);
});

Deno.test("Map updateAt", () => {
  const updateAt = M.updateAt(setoidNumber);

  assertEquals(
    pipe(M.singleton(1, 1), updateAt(1, 2)),
    O.some(M.singleton(1, 2)),
  );
  assertEquals(pipe(M.singleton(1, 1), updateAt(2, 2)), O.none);
});

Deno.test("Map modifyAt", () => {
  const modifyAt = M.modifyAt(setoidNumber);

  assertEquals(
    pipe(M.singleton(1, 1), modifyAt(1, (n) => n + 1)),
    O.some(M.singleton(1, 2)),
  );
  assertEquals(pipe(M.singleton(1, 1), modifyAt(2, (n) => n + 1)), O.none);
});

Deno.test("Map pop", () => {
  const pop = M.pop(setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), pop(1)), O.some([1, M.empty()]));
  assertEquals(pipe(M.singleton(1, 1), pop(2)), O.none);
});

Deno.test("Map isSubmap", () => {
  const isSubmap = M.isSubmap(setoidNumber, setoidNumber);

  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.empty())), true);
  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.singleton(2, 2))), false);
});
