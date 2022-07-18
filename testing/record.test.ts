import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as R from "../record.ts";
import * as O from "../option.ts";
import { pipe } from "../fns.ts";

import * as AS from "./assert.ts";

Deno.test("Record reduce", () => {
  assertEquals(
    pipe({ a: 1, b: 2 }, R.reduce((a: number, b: number) => a + b, 0)),
    3,
  );
  assertEquals(pipe({}, R.reduce(AS.add, 0)), 0);
});

Deno.test("Record Functor", () => {
  AS.assertFunctor(R.Functor, {
    ta: { a: 1, b: 2 },
    fai: AS.add,
    fij: AS.multiply,
  });
});

Deno.test("Record IndexedFoldable", () => {
  AS.assertIndexedFoldable(R.IndexedFoldable, {
    a: 0,
    tb: { a: 1, b: 2 },
    faia: (a: number, i: number) => a + i,
  });
});

Deno.test("Record Foldable", () => {
  AS.assertFoldable(R.Foldable, {
    a: 0,
    tb: { a: 1, b: 2 },
    faia: (a: number, i: number) => a + i,
  });
});

Deno.test("Record getShow", () => {
  const { show } = R.getShow({ show: (n: number) => n.toString() });
  assertEquals(show({}), "{}");
  assertEquals(show({ a: 1, b: 2 }), "{a: 1, b: 2}");
});

Deno.test("Record traverse", () => {
  const t1 = R.traverse(O.Applicative);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2({}), O.some({}));
  assertEquals(t2({ a: 0, b: 1 }), O.none);
  assertEquals(t2({ a: 1, b: 2 }), O.some({ a: 1, b: 2 }));
});

Deno.test("Record reduce", () => {
  const reduce = R.reduce((a: number, c: number) => a + c, 0);
  assertEquals(reduce({}), 0);
  assertEquals(reduce({ a: 1, b: 2 }), 3);
});

Deno.test("Record map", () => {
  assertEquals(pipe({ a: 1, b: 2 }, R.map(AS.add)), { a: 2, b: 3 });
  assertEquals(pipe({}, R.map(AS.add)), {});

  assertEquals(
    pipe({ a: [1, 2, 3] }, R.map((numbers) => numbers.slice())),
    { a: [1, 2, 3] },
  );

  const map = R.map(AS.add);
  assertEquals(map({}), {});
  assertEquals(map({ a: 1, b: 2 }), { a: 2, b: 3 });

  type Foo = { bar: number; baz?: number };
  const foo: Foo = { bar: 1 };
  assertEquals<Foo>(map(foo), { bar: 2 });
});

Deno.test("Record indexedTraverse", () => {
  const t1 = R.traverse(O.Applicative);
  const t2 = t1((a: number, i: string) =>
    a === 0 ? O.some(i) : O.some(a.toString())
  );
  assertEquals(t2({}), O.some({}));
  assertEquals(t2({ a: 1, b: 2 }), O.some({ a: "1", b: "2" }));
  assertEquals(t2({ a: 0, b: 2 }), O.some({ a: "a", b: "2" }));
});

Deno.test("Record indexedReduce", () => {
  const indexedReduce = R.reduce(
    (o: string[], a: number, i: string) =>
      a === 0 ? [...o, i] : [...o, a.toString()],
    [],
  );
  assertEquals(indexedReduce({}), []);
  assertEquals(indexedReduce({ a: 1, b: 2 }), ["1", "2"]);
  assertEquals(indexedReduce({ a: 0, b: 2 }), ["a", "2"]);
});

Deno.test("Record indexedMap", () => {
  const indexedMap = R.map((a: number, i: string) =>
    a === 0 ? i.length : a + 1
  );
  assertEquals(indexedMap({}), {});
  assertEquals(indexedMap({ a: 1, b: 2 }), { a: 2, b: 3 });
  assertEquals(indexedMap({ a: 0, b: 2 }), { a: 1, b: 3 });
});

Deno.test("Record insertAt", () => {
  assertEquals(pipe({ a: 1, b: 2 }, R.insertAt("b", 3)), { a: 1, b: 3 });
  assertEquals(pipe({ a: 1, b: 2 }, R.insertAt("a", 1)), { a: 1, b: 2 });
});

Deno.test("Record deleteAt", () => {
  assertEquals(pipe({ a: 1, b: 2 }, R.deleteAt("a")), { b: 2 });
  assertEquals(pipe({ a: 1 } as Record<string, number>, R.deleteAt("b")), {
    a: 1,
  });
});

Deno.test("Record omit", () => {
  assertEquals(R.omit(["a", "c"] as const)({ a: 1, b: 2 }), { b: 2 });
  const foo = Symbol();
  const bar = Symbol();
  assertEquals(
    R.omit([foo] as const)({ [foo]: "foo", [bar]: "bar" }),
    { [bar]: "bar" },
  );
});

Deno.test("Record pick", () => {
  assertEquals(pipe({ a: 1, b: 2, c: 3 }, R.pick(["a", "b"])), { a: 1, b: 2 });
  const r: { a: number; b?: number; c?: number } = { a: 1, b: 2 };
  assertEquals(pipe(r, R.pick([] as const)), {});
  assertEquals(pipe(r, R.pick(["a", "b"])), { a: 1, b: 2 });
  assertEquals(pipe(r, R.pick(["a", "c"])), { a: 1 });
});

Deno.test("Record keys", () => {
  assertEquals(R.keys({}), []);
});
