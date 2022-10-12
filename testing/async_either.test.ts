import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as AE from "../async_either.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";
import { then, wait } from "../promise.ts";

const add = (n: number) => n + 1;

const assertEqualsT = async (
  a: AE.AsyncEither<unknown, unknown>,
  b: AE.AsyncEither<unknown, unknown>,
) => assertEquals(await a(), await b());

function throwSync(n: number): number {
  if (n % 2 === 0) {
    throw new Error(`Number '${n}' is divisible by 2`);
  }
  return n;
}

async function throwAsync(n: number): Promise<number> {
  await wait(200);
  if (n % 2 === 0) {
    return Promise.reject(`Number '${n}' is divisible by 2`);
  }
  return n;
}

Deno.test("AsyncEither left", async () => {
  await assertEqualsT(AE.left(1), AE.left(1));
});

Deno.test("AsyncEither right", async () => {
  await assertEqualsT(AE.right(1), AE.right(1));
});

Deno.test("AsyncEither tryCatch", async (t) => {
  await t.step("Sync", async () => {
    await assertEqualsT(AE.tryCatch(throwSync, () => "Bad")(1), AE.right(1));
    await assertEqualsT(AE.tryCatch(throwSync, () => "Bad")(2), AE.left("Bad"));
    await assertEqualsT(AE.tryCatch(throwAsync, () => "Bad")(1), AE.right(1));
    await assertEqualsT(
      AE.tryCatch(throwAsync, () => "Bad")(2),
      AE.left("Bad"),
    );
  });
});

Deno.test("AsyncEither fromEither", async () => {
  await assertEqualsT(AE.fromEither(E.left(1)), AE.left(1));
  await assertEqualsT(AE.fromEither(E.right(1)), AE.right(1));
});

Deno.test("AsyncEither then", async () => {
  assertEquals(
    await pipe(Promise.resolve(1), then(add)),
    await Promise.resolve(2),
  );
});

Deno.test("AsyncEither of", async () => {
  await assertEqualsT(AE.of(1), AE.of(1));
});

Deno.test("AsyncEither apParallel", async () => {
  await assertEqualsT(
    pipe(AE.right(1), AE.apParallel(AE.right(add))),
    AE.right(2),
  );
  await assertEqualsT(
    pipe(AE.left(1), AE.apParallel(AE.right(add))),
    AE.left(1),
  );
  await assertEqualsT(pipe(AE.right(1), AE.apParallel(AE.left(1))), AE.left(1));
  await assertEqualsT(pipe(AE.left(1), AE.apParallel(AE.left(2))), AE.left(1));
});

Deno.test("AsyncEither map", async () => {
  await assertEqualsT(pipe(AE.right(1), AE.map(add)), AE.right(2));
  await assertEqualsT(pipe(AE.left(1), AE.map(add)), AE.left(1));
});

Deno.test("AsyncEither join", async () => {
  await assertEqualsT(AE.join(AE.right(AE.right(1))), AE.right(1));
  await assertEqualsT(AE.join(AE.right(AE.left(1))), AE.left(1));
  await assertEqualsT(AE.join(AE.left(1)), AE.left(1));
});

Deno.test("AsyncEither chain", async () => {
  const chain = AE.chain((n: number) => n === 0 ? AE.left(0) : AE.right(1));
  await assertEqualsT(chain(AE.right(0)), AE.left(0));
  await assertEqualsT(chain(AE.right(1)), AE.right(1));
  await assertEqualsT(chain(AE.left(1)), AE.left(1));
});

Deno.test("AsyncEither bimap", async () => {
  const bimap = AE.bimap(add, add);
  await assertEqualsT(bimap(AE.right(1)), AE.right(2));
  await assertEqualsT(bimap(AE.left(1)), AE.left(2));
});

Deno.test("AsyncEither mapLeft", async () => {
  await assertEqualsT(pipe(AE.right(1), AE.mapLeft(add)), AE.right(1));
  await assertEqualsT(pipe(AE.left(1), AE.mapLeft(add)), AE.left(2));
});

Deno.test("AsyncEither apSequential", async () => {
  await assertEqualsT(
    pipe(AE.right(1), AE.apSequential(AE.right(add))),
    AE.right(2),
  );
  await assertEqualsT(
    pipe(AE.left(1), AE.apSequential(AE.right(add))),
    AE.left(1),
  );
  await assertEqualsT(
    pipe(AE.right(1), AE.apSequential(AE.left(1))),
    AE.left(1),
  );
  await assertEqualsT(
    pipe(AE.left(1), AE.apSequential(AE.left(2))),
    AE.left(1),
  );
});

Deno.test("AsyncEither alt", async () => {
  await assertEqualsT(pipe(AE.left(1), AE.alt(AE.left(2))), AE.left(2));
  await assertEqualsT(pipe(AE.left(1), AE.alt(AE.right(2))), AE.right(2));
  await assertEqualsT(pipe(AE.right(1), AE.alt(AE.left(2))), AE.right(1));
  await assertEqualsT(pipe(AE.right(1), AE.alt(AE.right(2))), AE.right(1));
});

Deno.test("AsyncEither chainLeft", async () => {
  const chainLeft = AE.chainLeft((n: number) =>
    n === 0 ? AE.right(n) : AE.left(n)
  );
  await assertEqualsT(chainLeft(AE.right(0)), AE.right(0));
  await assertEqualsT(chainLeft(AE.left(0)), AE.right(0));
  await assertEqualsT(chainLeft(AE.left(1)), AE.left(1));
});

Deno.test("AsyncEither fold", async () => {
  const fold = AE.fold((l: string) => l, String);

  assertEquals(await fold(AE.right(1))(), "1");
  assertEquals(await fold(AE.left("asdf"))(), "asdf");
});

// Deno.test("AsyncEither Do, bind, bindTo", () => {
//   assertEqualsT(
//     pipe(
//       AE.Do<number, number, number>(),
//       AE.bind("one", () => AE.right(1)),
//       AE.bind("two", ({ one }) => AE.right(one + one)),
//       AE.map(({ one, two }) => one + two),
//     ),
//     AE.right(3),
//   );
//   assertEqualsT(
//     pipe(
//       AE.right(1),
//       AE.bindTo("one"),
//     ),
//     AE.right({ one: 1 }),
//   );
// });
