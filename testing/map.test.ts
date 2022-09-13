import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as M from "../map.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import { pipe } from "../fns.ts";

Deno.test("Map zero", () => {
  assertEquals(M.zero(), new Map() as unknown as ReadonlyMap<never, never>);
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

  assertEquals(Show.show(M.singleton(1, 1)), "new ReadonlyMap([[1, 1]])");
});

Deno.test("Map getSetoid", () => {
  const Setoid = M.getSetoid(N.Setoid, N.Setoid);

  AS.assertSetoid(Setoid, {
    a: M.singleton(1, 1),
    b: M.singleton(1, 1),
    c: M.singleton(1, 1),
    z: M.singleton(2, 2),
  });
});

Deno.test("Map getMonoid", () => {
  const Monoid = M.getMonoid(N.Setoid, N.SemigroupSum);
  const { concat, empty } = Monoid;

  AS.assertMonoid(Monoid, {
    a: M.singleton(1, 1),
    b: M.singleton(2, 2),
    c: M.singleton(3, 3),
  });

  assertEquals(pipe(empty(), concat(M.singleton(1, 1))), M.singleton(1, 1));
  assertEquals(pipe(M.singleton(1, 1), concat(empty())), M.singleton(1, 1));
  assertEquals(
    pipe(M.singleton(1, 1), concat(M.singleton(2, 2))),
    new Map([[1, 1], [2, 2]]),
  );
  assertEquals(
    pipe(M.singleton(1, 1), concat(M.singleton(1, 1))),
    M.singleton(1, 2),
  );
});

Deno.test("Map map", () => {
  assertEquals(
    pipe(M.singleton("one", 1), M.map((n) => n + 1)),
    M.singleton("one", 2),
  );
});

Deno.test("Map mapLeft", () => {
  assertEquals(
    pipe(M.singleton(1, 1), M.mapLeft((n) => n + 1)),
    M.singleton(2, 1),
  );
});

Deno.test("Map bimap", () => {
  assertEquals(
    pipe(M.singleton(1, 1), M.bimap((n) => n + 1, (n) => n + 1)),
    M.singleton(2, 2),
  );
});

Deno.test("Map size", () => {
  assertEquals(M.size(M.zero()), 0);
  assertEquals(M.size(M.singleton(1, 1)), 1);
});

Deno.test("Map isEmpty", () => {
  assertEquals(M.isEmpty(M.empty()), true);
  assertEquals(M.isEmpty(M.singleton(1, 1)), false);
});

Deno.test("Map lookupWithKey", () => {
  const lookupWithKey = M.lookupWithKey(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), lookupWithKey(1)), O.some([1, 1]));
  assertEquals(pipe(M.singleton(2, 2), lookupWithKey(1)), O.none);
});

Deno.test("Map lookup", () => {
  const lookup = M.lookup(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), lookup(1)), O.some(1));
  assertEquals(pipe(M.singleton(1, 1), lookup(2)), O.none);
});

Deno.test("Map member", () => {
  const member = M.member(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), member(1)), true);
  assertEquals(pipe(M.singleton(1, 1), member(2)), false);
});

Deno.test("Map elem", () => {
  const elem = M.elem(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), elem(1)), true);
  assertEquals(pipe(M.singleton(1, 1), elem(2)), false);
});

Deno.test("Map keys", () => {
  const keys = M.keys(N.Ord);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, keys), [1, 2, 3]);
  assertEquals(pipe(tb, keys), []);
});

Deno.test("Map values", () => {
  const values = M.values(N.Ord);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, values), [1, 2, 3]);
  assertEquals(pipe(tb, values), []);
});

Deno.test("Map collect", () => {
  const collect = M.collect(N.Ord);
  const c = collect((k: number, v: number) => k + v);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.empty<number, number>();

  assertEquals(pipe(ta, c), [2, 4, 6]);
  assertEquals(pipe(tb, c), []);
});

Deno.test("Map insertAt", () => {
  const insertAt = M.insertAt(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), insertAt(1)(2)), M.singleton(1, 2));
  assertEquals(
    pipe(M.empty<number, number>(), insertAt(1)(1)),
    M.singleton(1, 1),
  );
  assertEquals(
    pipe(M.singleton(1, 1), insertAt(1)(1)),
    M.singleton(1, 1),
  );
  assertEquals(
    pipe(M.singleton(1, 1), insertAt(1)(2)),
    M.singleton(1, 2),
  );
});

Deno.test("Map deleteAt", () => {
  const deleteAt = M.deleteAt(N.Setoid);

  assertEquals(pipe(M.empty<number, number>(), deleteAt(1)), M.zero());
  assertEquals(pipe(M.singleton(1, 1), deleteAt(1)), M.zero());
});

Deno.test("Map updateAt", () => {
  const updateAt = M.updateAt(N.Setoid);

  assertEquals(
    pipe(M.singleton(1, 1), updateAt(1)(2)),
    M.singleton(1, 2),
  );
  assertEquals(pipe(M.singleton(1, 1), updateAt(2)(2)), M.singleton(1, 1));
});

Deno.test("Map modifyAt", () => {
  const modifyAt = M.modifyAt(N.Setoid);

  assertEquals(
    pipe(M.singleton(1, 1), modifyAt(1)((n) => n + 1)),
    M.singleton(1, 2),
  );
  assertEquals(
    pipe(M.singleton(1, 1), modifyAt(2)((n) => n + 1)),
    M.singleton(1, 1),
  );
});

Deno.test("Map pop", () => {
  const pop = M.pop(N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), pop(1)), O.some([1, M.empty()]));
  assertEquals(pipe(M.singleton(1, 1), pop(2)), O.none);
});

Deno.test("Map isSubmap", () => {
  const isSubmap = M.isSubmap(N.Setoid, N.Setoid);

  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.empty())), true);
  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.singleton(2, 2))), false);
});
