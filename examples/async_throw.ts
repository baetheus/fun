import * as AI from "../async_iterable.ts";
import { range } from "../iterable.ts";
import { pipe } from "../fns.ts";

const test = () =>
  pipe(
    range(Number.POSITIVE_INFINITY),
    AI.fromIterable,
    AI.map((n) => n + 0.5),
    AI.tap((n) => {
      if (n > 20) {
        // Note that fun will not catch errors for you!
        // This is because aside from either none of the
        // data structures that fun exports could do anything
        // with an error other than rethrow it.
        throw new Error("Oh gosh oh golly!");
      }
    }),
    AI.forEach(console.log, () => console.log("Done")),
  );

export async function run() {
  await test();
}

await run();
