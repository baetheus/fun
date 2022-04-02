import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import { of as taskOf } from "../task.ts";
import * as T from "../task_either.ts";
import * as E from "../either.ts";
import { _, pipe, resolve, then } from "../fns.ts";

import * as AS from "./assert.ts";

const assertEqualsT = async (
  a: T.TaskEither<unknown, unknown>,
  b: T.TaskEither<unknown, unknown>,
) => assertEquals(await a(), await b());

Deno.test("TaskEither left", async () => {
  await assertEqualsT(T.left(1), T.left(1));
});

Deno.test("TaskEither right", async () => {
  await assertEqualsT(T.right(1), T.right(1));
});

Deno.test("TaskEither tryCatch", async (t) => {
  const expectedRight = 2;
  const expectedLeft = "Bad";
  const throws = () => {
    throw new Error("Boom");
  };

  // Sync computations
  await assertEqualsT(
    T.tryCatch(throws, () => expectedLeft)(),
    T.left(expectedLeft),
  );
  await assertEqualsT(
    T.tryCatch((n: number) => n * 2, String)(1),
    T.right(expectedRight),
  );
  await assertEqualsT(
    T.tryCatch(taskOf(2), String)(),
    T.right(expectedRight),
  );
  await assertEqualsT(
    T.tryCatch(
      (..._args: [string, ...string[]]) => throws(),
      (_err, ...args) => args.join(" "),
    )("Pass", "all", "them", "args"),
    T.left("Pass all them args"),
  );

  // Async Computations
  await assertEqualsT(
    T.tryCatch(async () => await throws(), () => expectedLeft)(),
    T.left(expectedLeft),
  );
  await assertEqualsT(
    T.tryCatch(async (n: number) => await resolve(n * 2), String)(1),
    T.right(expectedRight),
  );
  await assertEqualsT(
    T.tryCatch(
      async (..._args: [string, ...string[]]) => await throws(),
      (_, ...args) => args.join(" "),
    )("Pass", "all", "them", "args"),
    T.left("Pass all them args"),
  );
});

Deno.test("TaskEither fromFailableTask", async () => {
  const fromFailableTask = T.fromFailableTask(() => "Bad");
  await assertEqualsT(fromFailableTask(() => Promise.reject()), T.left("Bad"));
  await assertEqualsT(fromFailableTask(() => Promise.resolve(1)), T.right(1));
});

Deno.test("TaskEither fromEither", async () => {
  await assertEqualsT(T.fromEither(E.left(1)), T.left(1));
  await assertEqualsT(T.fromEither(E.right(1)), T.right(1));
});

Deno.test("TaskEither then", async () => {
  assertEquals(
    await pipe(Promise.resolve(1), then(AS.add)),
    await Promise.resolve(2),
  );
});

Deno.test("TaskEither of", async () => {
  await assertEqualsT(T.of(1), T.of(1));
});

Deno.test("TaskEither ap", async () => {
  await assertEqualsT(pipe(T.right(1), T.ap(T.right(AS.add))), T.right(2));
  await assertEqualsT(pipe(T.left(1), T.ap(T.right(AS.add))), T.left(1));
  await assertEqualsT(pipe(T.right(1), T.ap(T.left(1))), T.left(1));
  await assertEqualsT(pipe(T.left(1), T.ap(T.left(2))), T.left(1));
});

Deno.test("TaskEither map", async () => {
  await assertEqualsT(pipe(T.right(1), T.map(AS.add)), T.right(2));
  await assertEqualsT(pipe(T.left(1), T.map(AS.add)), T.left(1));
});

Deno.test("TaskEither join", async () => {
  await assertEqualsT(T.join(T.right(T.right(1))), T.right(1));
  await assertEqualsT(T.join(T.right(T.left(1))), T.left(1));
  await assertEqualsT(T.join(T.left(1)), T.left(1));
});

Deno.test("TaskEither chain", async () => {
  const chain = T.chain((n: number) => n === 0 ? T.left(0) : T.right(1));
  await assertEqualsT(chain(T.right(0)), T.left(0));
  await assertEqualsT(chain(T.right(1)), T.right(1));
  await assertEqualsT(chain(T.left(1)), T.left(1));
});

Deno.test("TaskEither bimap", async () => {
  const bimap = T.bimap(AS.add, AS.add);
  await assertEqualsT(bimap(T.right(1)), T.right(2));
  await assertEqualsT(bimap(T.left(1)), T.left(2));
});

Deno.test("TaskEither mapLeft", async () => {
  await assertEqualsT(pipe(T.right(1), T.mapLeft(AS.add)), T.right(1));
  await assertEqualsT(pipe(T.left(1), T.mapLeft(AS.add)), T.left(2));
});

Deno.test("TaskEither apSeq", async () => {
  await assertEqualsT(pipe(T.right(1), T.apSeq(T.right(AS.add))), T.right(2));
  await assertEqualsT(pipe(T.left(1), T.apSeq(T.right(AS.add))), T.left(1));
  await assertEqualsT(pipe(T.right(1), T.apSeq(T.left(1))), T.left(1));
  await assertEqualsT(pipe(T.left(1), T.apSeq(T.left(2))), T.left(1));
});

Deno.test("TaskEither alt", async () => {
  await assertEqualsT(pipe(T.left(1), T.alt(T.left(2))), T.left(2));
  await assertEqualsT(pipe(T.left(1), T.alt(T.right(2))), T.right(2));
  await assertEqualsT(pipe(T.right(1), T.alt(T.left(2))), T.right(1));
  await assertEqualsT(pipe(T.right(1), T.alt(T.right(2))), T.right(1));
});

Deno.test("TaskEither chainLeft", async () => {
  const chainLeft = T.chainLeft((n: number) =>
    n === 0 ? T.right(n) : T.left(n)
  );
  await assertEqualsT(chainLeft(T.right(0)), T.right(0));
  await assertEqualsT(chainLeft(T.left(0)), T.right(0));
  await assertEqualsT(chainLeft(T.left(1)), T.left(1));
});

Deno.test("TaskEither widen", async () => {
  await assertEqualsT(pipe(T.right(1), T.widen<number>()), T.right(1));
});

Deno.test("TaskEither fold", async () => {
  const fold = T.fold((l: string) => l, String);

  assertEquals(await fold(T.right(1))(), "1");
  assertEquals(await fold(T.left("asdf"))(), "asdf");
});

Deno.test("TaskEither Do, bind, bindTo", () => {
  assertEqualsT(
    pipe(
      T.Do<number, number, number>(),
      T.bind("one", () => T.right(1)),
      T.bind("two", ({ one }) => T.right(one + one)),
      T.map(({ one, two }) => one + two),
    ),
    T.right(3),
  );
  assertEqualsT(
    pipe(
      T.right(1),
      T.bindTo("one"),
    ),
    T.right({ one: 1 }),
  );
});
