import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import * as A from "../affect.ts";
import * as E from "../either.ts";
import { pipe } from "../fns.ts";

const addOne = (n: number) => n + 1;
const toUpper = (s: string) => s.toUpperCase();

const computation = pipe(
  A.ask<number>(),
  A.ap(A.right(addOne)),
);
const result = await computation(1);

assertEquals(result, E.right(2));

const ta = pipe(
  A.ask<number>(),
  A.bimap(toUpper, addOne),
);

const tb = pipe(
  A.askLeft<string>(),
  A.bimap(toUpper, addOne),
);

const ra = await ta(1);
const rb = await tb("hello");

console.log({ ra, rb });

const ca = pipe(
  A.ask<number, string>(),
  A.chain((n) => n > 0 ? A.right(n) : A.left("Number must be greater than 0")),
);

const rc = await ca(1);
const rd = await ca(-1);

console.log({ rc, rd });

const td = A.fromEither(E.right("hello"));

const re = await td();

console.log({ re });
