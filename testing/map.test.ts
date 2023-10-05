import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as M from "../map.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as R from "../foldable.ts";
import { pipe } from "../fn.ts";

Deno.test("Map init", () => {
  assertEquals(M.init(), new Map());
});

Deno.test("Map singleton", () => {
  assertEquals(M.singleton(1, 1), new Map([[1, 1]]));
});

Deno.test("Map readonlyMap", () => {
  assertEquals(M.readonlyMap(), new Map<never, never>());
  assertEquals(M.readonlyMap([1, 1]), new Map([[1, 1]]));
});

Deno.test("Map map", () => {
  assertEquals(
    pipe(M.singleton("one", 1), M.map((n) => n + 1)),
    M.singleton("one", 2),
  );
});

Deno.test("Map mapSecond", () => {
  assertEquals(
    pipe(M.singleton(1, 1), M.mapSecond((n) => n + 1)),
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
  assertEquals(M.size(M.singleton(1, 1)), 1);
});

Deno.test("Map isEmpty", () => {
  assertEquals(M.isEmpty(M.init()), true);
  assertEquals(M.isEmpty(M.singleton(1, 1)), false);
});

Deno.test("Map lookupWithKey", () => {
  const lookupWithKey = M.lookupWithKey(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), lookupWithKey(1)), O.some([1, 1]));
  assertEquals(pipe(M.singleton(2, 2), lookupWithKey(1)), O.none);
});

Deno.test("Map lookup", () => {
  const lookup = M.lookup(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), lookup(1)), O.some(1));
  assertEquals(pipe(M.singleton(1, 1), lookup(2)), O.none);
});

Deno.test("Map member", () => {
  const member = M.member(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), member(1)), true);
  assertEquals(pipe(M.singleton(1, 1), member(2)), false);
});

Deno.test("Map elem", () => {
  const elem = M.elem(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), elem(1)), true);
  assertEquals(pipe(M.singleton(1, 1), elem(2)), false);
});

Deno.test("Map keys", () => {
  const keys = M.keys(N.SortableNumber);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.init<number, number>();

  assertEquals(pipe(ta, keys), [1, 2, 3]);
  assertEquals(pipe(tb, keys), []);
});

Deno.test("Map values", () => {
  const values = M.values(N.SortableNumber);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.init<number, number>();

  assertEquals(pipe(ta, values), [1, 2, 3]);
  assertEquals(pipe(tb, values), []);
});

Deno.test("Map fold", () => {
  const collect = R.collect(M.FoldableMap, N.InitializableNumberSum);
  assertEquals(collect(M.readonlyMap()), 0);
  assertEquals(collect(M.readonlyMap([1, 1], [2, 2], [3, 3])), 6);
});

Deno.test("Map collect", () => {
  const collect = M.collect(N.SortableNumber);
  const c = collect((k: number, v: number) => k + v);

  const ta = new Map<number, number>([[1, 1], [2, 2], [3, 3]]);
  const tb = M.init<number, number>();

  assertEquals(pipe(ta, c), [2, 4, 6]);
  assertEquals(pipe(tb, c), []);
});

Deno.test("Map insertAt", () => {
  const insertAt = M.insertAt(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), insertAt(1)(2)), M.singleton(1, 2));
  assertEquals(
    pipe(M.init<number, number>(), insertAt(1)(1)),
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
  const deleteAt = M.deleteAt(N.ComparableNumber);

  assertEquals(pipe(M.init<number, number>(), deleteAt(1)), M.init());
  assertEquals(pipe(M.singleton(1, 1), deleteAt(1)), M.init());
});

Deno.test("Map updateAt", () => {
  const updateAt = M.updateAt(N.ComparableNumber);

  assertEquals(
    pipe(M.singleton(1, 1), updateAt(1)(2)),
    M.singleton(1, 2),
  );
  assertEquals(pipe(M.singleton(1, 1), updateAt(2)(2)), M.singleton(1, 1));
});

Deno.test("Map modifyAt", () => {
  const modifyAt = M.modifyAt(N.ComparableNumber);

  assertEquals(
    pipe(M.singleton(1, 1), modifyAt(1)((n) => n + 1)),
    M.singleton(1, 2),
  );
  assertEquals(
    pipe(M.singleton(1, 1), modifyAt(2)((n) => n + 1)),
    M.singleton(1, 1),
  );
});

Deno.test("Map update", () => {
  const update = M.update(N.ComparableNumber);
  assertEquals(
    pipe(
      M.readonlyMap(),
      update(1)(1),
    ),
    M.readonlyMap(),
  );
  assertEquals(
    pipe(
      M.readonlyMap([1, 1]),
      update(100)(1),
    ),
    M.readonlyMap([1, 100]),
  );
  assertEquals(
    pipe(
      M.readonlyMap([1, 1], [2, 2]),
      update(100)(1),
    ),
    M.readonlyMap([1, 100], [2, 2]),
  );
});

Deno.test("Map pop", () => {
  const pop = M.pop(N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), pop(1)), O.some([1, M.init()]));
  assertEquals(pipe(M.singleton(1, 1), pop(2)), O.none);
});

Deno.test("Map isSubmap", () => {
  const isSubmap = M.isSubmap(N.ComparableNumber, N.ComparableNumber);

  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.init())), true);
  assertEquals(pipe(M.singleton(1, 1), isSubmap(M.singleton(2, 2))), false);
});

Deno.test("Map getShowable", () => {
  const showNumber = { show: (n: number) => n.toString() };
  const Showable = M.getShowable(showNumber, showNumber);

  assertEquals(Showable.show(M.singleton(1, 1)), "new ReadonlyMap([[1, 1]])");
});

Deno.test("Map getComparable", () => {
  const { compare } = M.getComparable(N.ComparableNumber, N.ComparableNumber);
  assertEquals(pipe(M.readonlyMap(), compare(M.readonlyMap())), true);
  assertEquals(
    pipe(M.readonlyMap([1, 1]), compare(M.readonlyMap([1, 1]))),
    true,
  );
  assertEquals(
    pipe(M.readonlyMap([1, 2]), compare(M.readonlyMap([1, 1]))),
    false,
  );
  assertEquals(
    pipe(M.readonlyMap([1, 1]), compare(M.readonlyMap([1, 1], [2, 2]))),
    false,
  );
});

Deno.test("Map getCombinable", () => {
  const Combinable = M.getCombinable(
    N.ComparableNumber,
    N.InitializableNumberSum,
  );
  const { combine } = Combinable;

  assertEquals(
    pipe(M.readonlyMap(), combine(M.readonlyMap([1, 1]))),
    M.readonlyMap([1, 1]),
  );
  assertEquals(
    pipe(M.readonlyMap([1, 1]), combine(M.readonlyMap())),
    M.readonlyMap([1, 1]),
  );
  assertEquals(
    pipe(M.singleton(1, 1), combine(M.singleton(2, 2))),
    new Map([[1, 1], [2, 2]]),
  );
  assertEquals(
    pipe(M.singleton(1, 1), combine(M.singleton(1, 1))),
    M.singleton(1, 2),
  );
});
