import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as TE from "../async_either.ts";
import * as A from "../async.ts";
import { flow, identity } from "../fn.ts";

const hello = flow(
  TE.match(() => "World", identity),
  A.map((name) => `Hello ${name}!`),
);

assertEquals(await hello(TE.right("Functional!"))(), "Hello Functional!!");
assertEquals(await hello(TE.left(Error))(), "Hello World!");
