import { tee } from "https://raw.githubusercontent.com/denoland/deno_std/0.136.0/async/tee.ts";
import * as A from "../async_iterable.ts";
import { pipe } from "../fns.ts";

// Creates a stateful AsyncIterable
const makeTest = (value: number) => ({
  value,
  async *[Symbol.asyncIterator]() {
    while (true) {
      yield this.value;
      this.value++;
    }
  },
});

// Iterates over an asyncIterable logging (with a name)
// every entry
async function run(name: string, ta: AsyncIterable<number>) {
  for await (const a of ta) {
    console.log(name, a);
  }
}

// A stateful asyncIterable
const test = makeTest(0);

// Create a "stateless" asyncIterable
const cloned = pipe(
  A.clone(test),
  A.take(5),
);

// Take a few off the top of the orig
await run("[orig-pre]", pipe(test, A.take(5)));

// Run three copies of the stateless asyncIterables simultaineously
run("[one]", cloned);
run("[two]", cloned);

await run("[twe]", cloned);

// Run the original (it should pick up at 5
await run("[orig]", pipe(test, A.take(5)));

// Let's try the same with tee
const test2 = makeTest(0);
const [branch1, branch2] = tee(test2);

await run("[tee-orig-pre]", pipe(test2, A.take(5)));

run("[tee-branch1]", pipe(branch1, A.take(5)));
await run("[tee-branch2]", pipe(branch2, A.take(5)));

run("[tee-orig]", pipe(test2, A.take(5)));

// Let's see about a bug
const test3 = makeTest(0);
const syncTest = A.clone(test3);
const iter = syncTest[Symbol.asyncIterator]();
console.log(await Promise.all([iter.next(), iter.next()]));
