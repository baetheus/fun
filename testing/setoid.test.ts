import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as AS from "./assert.ts";

import * as S from "../setoid.ts";
import { pipe } from "../fns.ts";

Deno.test("Setoid fromEquals", () => {
  const Setoid = S.fromEquals((a: number) => (b: number) => a === b);
  AS.assertSetoid(Setoid, { a: 1, b: 1, c: 1, z: 2 });
});

Deno.test("Setoid setoidStrict", () => {
  AS.assertSetoid(S.setoidStrict, { a: 1, b: 1, c: 1, z: 2 });
});

Deno.test("Setoid setoidString", () => {
  AS.assertSetoid(S.setoidString, { a: "a", b: "a", c: "a", z: "b" });
});

Deno.test("Setoid setoidNumber", () => {
  AS.assertSetoid(S.setoidNumber, { a: 1, b: 1, c: 1, z: 2 });
});

Deno.test("Setoid setoidBoolean", () => {
  AS.assertSetoid(S.setoidBoolean, { a: true, b: true, c: true, z: false });
});

Deno.test("Setoid setoidDate", () => {
  const ta = new Date(0);
  const tb = new Date(1);
  AS.assertSetoid(S.setoidDate, { a: ta, b: ta, c: ta, z: tb });
});

Deno.test("Setoid getStructSetoid", () => {
  const Setoid = S.getStructSetoid({ a: S.setoidString, b: S.setoidNumber });
  AS.assertSetoid(Setoid, {
    a: { a: "a", b: 1 },
    b: { a: "a", b: 1 },
    c: { a: "a", b: 1 },
    z: { a: "b", b: 2 },
  });
});

Deno.test("Setoid getTupleSetoid", () => {
  const Setoid = S.getTupleSetoid(S.setoidNumber, S.setoidBoolean);
  AS.assertSetoid(Setoid, {
    a: [1, true],
    b: [1, true],
    c: [1, true],
    z: [2, false],
  });
});
