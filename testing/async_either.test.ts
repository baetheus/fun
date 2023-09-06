import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as A from "../async.ts";
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

Deno.test("AsyncEither fromAsync", async () => {
  assertEquals(await pipe(A.wrap(1), AE.fromAsync)(), await AE.wrap(1)());
});

Deno.test("AsyncEither then", async () => {
  assertEquals(
    await pipe(Promise.resolve(1), then(add)),
    await Promise.resolve(2),
  );
});

Deno.test("AsyncEither wrap", async () => {
  await assertEqualsT(AE.wrap(1), AE.wrap(1));
});

Deno.test("AsyncEither fail", async () => {
  assertEquals(await AE.fail(1)(), E.fail(1));
});

Deno.test("AsyncEither apply", async () => {
  const add = (n: number) => n + 1;
  assertEquals(
    await pipe(AE.wrap(add), AE.apply(AE.wrap(1)))(),
    await AE.wrap(2)(),
  );
  assertEquals(
    await pipe(AE.left(1), AE.apply(AE.wrap(1)))(),
    await AE.left(1)(),
  );
  assertEquals(
    await pipe(AE.wrap(add), AE.apply(AE.left(1)))(),
    await AE.left(1)(),
  );
  assertEquals(
    await pipe(AE.left(1), AE.apply(AE.left(2)))(),
    await AE.left(2)(),
  );
});

Deno.test("AsyncEither map", async () => {
  await assertEqualsT(pipe(AE.right(1), AE.map(add)), AE.right(2));
  await assertEqualsT(pipe(AE.left(1), AE.map(add)), AE.left(1));
});

Deno.test("AsyncEither flatmap", async () => {
  const flatmap = AE.flatmap((n: number) => n === 0 ? AE.left(0) : AE.right(1));
  await assertEqualsT(flatmap(AE.right(0)), AE.left(0));
  await assertEqualsT(flatmap(AE.right(1)), AE.right(1));
  await assertEqualsT(flatmap(AE.left(1)), AE.left(1));
});

Deno.test("AsyncEither flatmapFirst", async () => {
  assertEquals(
    await pipe(
      AE.wrap(1),
      AE.flatmapFirst((n) => AE.wrap(n + 1)),
    )(),
    E.right(1),
  );
  assertEquals(
    await pipe(
      AE.wrap(1),
      AE.flatmapFirst((n) => AE.fail(n + 1)),
    )(),
    E.left(2),
  );
  assertEquals(
    await pipe(
      AE.fail(1),
      AE.flatmapFirst((n) => AE.fail(n + 1)),
    )(),
    E.left(1),
  );
});

Deno.test("AsyncEither mapSecond", async () => {
  await assertEqualsT(pipe(AE.right(1), AE.mapSecond(add)), AE.right(1));
  await assertEqualsT(pipe(AE.left(1), AE.mapSecond(add)), AE.left(2));
});

Deno.test("AsyncEither applySequential", async () => {
  const add = (n: number) => n + 1;
  assertEquals(
    await pipe(AE.wrap(add), AE.applySequential(AE.wrap(1)))(),
    await AE.wrap(2)(),
  );
  assertEquals(
    await pipe(AE.left(1), AE.applySequential(AE.wrap(1)))(),
    await AE.left(1)(),
  );
  assertEquals(
    await pipe(AE.wrap(add), AE.applySequential(AE.left(1)))(),
    await AE.left(1)(),
  );
  assertEquals(
    await pipe(AE.left(1), AE.applySequential(AE.left(2)))(),
    await AE.left(2)(),
  );
});

Deno.test("AsyncEither alt", async () => {
  await assertEqualsT(pipe(AE.left(1), AE.alt(AE.left(2))), AE.left(2));
  await assertEqualsT(pipe(AE.left(1), AE.alt(AE.right(2))), AE.right(2));
  await assertEqualsT(pipe(AE.right(1), AE.alt(AE.left(2))), AE.right(1));
  await assertEqualsT(pipe(AE.right(1), AE.alt(AE.right(2))), AE.right(1));
});

Deno.test("AsyncEither recover", async () => {
  const recover = AE.recover((n: number) => n === 0 ? AE.right(n) : AE.left(n));
  await assertEqualsT(recover(AE.right(0)), AE.right(0));
  await assertEqualsT(recover(AE.left(0)), AE.right(0));
  await assertEqualsT(recover(AE.left(1)), AE.left(1));
});

Deno.test("AsyncEither match", async () => {
  const fold = AE.match((l: string) => l, String);

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
