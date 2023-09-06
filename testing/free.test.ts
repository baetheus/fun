import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../free.ts";
import { pipe } from "../fn.ts";

Deno.test("Free node", () => {
  assertEquals(F.node(1), { tag: "Node", value: 1 });
});

Deno.test("Free link", () => {
  assertEquals(F.link(F.node(1), F.node(2)), {
    tag: "Link",
    first: { tag: "Node", value: 1 },
    second: { tag: "Node", value: 2 },
  });
});

Deno.test("Free isNode", () => {
  assertEquals(F.isNode(F.node(1)), true);
  assertEquals(F.isNode(F.link(F.node(1), F.node(2))), false);
});

Deno.test("Free isLink", () => {
  assertEquals(F.isLink(F.node(1)), false);
  assertEquals(F.isLink(F.link(F.node(1), F.node(2))), true);
});

Deno.test("Free match", () => {
  const sum = F.match(
    (n: number): number => n,
    (first: F.Free<number>, second: F.Free<number>): number =>
      sum(first) + sum(second),
  );

  assertEquals(sum(F.node(1)), 1);
  assertEquals(sum(F.link(F.node(1), F.node(1))), 2);
});

Deno.test("Free combine", () => {
  assertEquals(
    pipe(F.node(1), F.combine(F.node(2))),
    F.link(F.node(1), F.node(2)),
  );
});

Deno.test("Free wrap", () => {
  assertEquals(F.wrap(1), F.node(1));
});

Deno.test("Free map", () => {
  assertEquals(pipe(F.node(1), F.map((n) => n + 1)), F.node(2));
  assertEquals(
    pipe(F.link(F.node(1), F.node(2)), F.map((n) => n + 1)),
    F.link(F.node(2), F.node(3)),
  );
});

Deno.test("Free flatmap", () => {
  assertEquals(
    pipe(
      F.node(1),
      F.flatmap((n) => F.node(n + 1)),
    ),
    F.node(2),
  );
  assertEquals(
    pipe(
      F.link(F.node(1), F.link(F.node(2), F.node(3))),
      F.flatmap((n) => F.link(F.node(n), F.node(n + 100))),
    ),
    F.link(
      F.link(F.node(1), F.node(101)),
      F.link(F.link(F.node(2), F.node(102)), F.link(F.node(3), F.node(103))),
    ),
  );
});

Deno.test("Free apply", () => {
  assertEquals(
    pipe(
      F.node((n: number) => n + 1),
      F.apply(F.node(1)),
    ),
    F.node(2),
  );
  assertEquals(
    pipe(
      F.link(F.node((n: number) => n + 1), F.node((n) => n - 1)),
      F.apply(F.node(1)),
    ),
    F.link(F.node(2), F.node(0)),
  );
  assertEquals(
    pipe(
      F.node((n: number) => n + 1),
      F.apply(F.link(F.node(1), F.node(2))),
    ),
    F.link(F.node(2), F.node(3)),
  );
  assertEquals(
    pipe(
      F.link(F.node((n: number) => n + 1), F.node((n) => n + 10)),
      F.apply(F.link(F.node(1), F.node(2))),
    ),
    F.link(
      F.link(F.node(2), F.node(3)),
      F.link(F.node(11), F.node(12)),
    ),
  );
});

Deno.test("Free reduce", () => {
  assertEquals(
    pipe(F.link(F.node(1), F.node(1)), F.reduce((n, m) => n + m, 0)),
    2,
  );
});

Deno.test("Free getCombinable", () => {
  const Combinable = F.getCombinable<number>();
  assertStrictEquals(Combinable.combine, F.combine);
});
