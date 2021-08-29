import * as A from "../async_iterable.ts";
import { pipe } from "../fns.ts";

// Create an One Shot AsyncIterable
const makeTest = (value: number) => ({
  value,
  async *[Symbol.asyncIterator]() {
    while (true) {
      yield this.value;
      this.value++;
    }
  },
});

const test = makeTest(0);

// Share that iterable by caching return promises
const cloned = A.clone(test);

await pipe(
  cloned,
  A.take(10),
  A.filter((n) => n % 2 === 0),
  A.forEach((n) => {
    console.log(`First run ${n}, test value sync: ${test.value}`);
  }),
);

await pipe(
  cloned,
  A.take(20),
  A.forEach((n) => {
    console.log(`Second run ${n}, test value sync: ${test.value}`);
  }),
);

await pipe(
  cloned,
  A.repeat(3),
  A.take(5),
  A.forEach((n) => console.log(`Repeat ${n}`)),
);

await pipe(
  makeTest(1),
  A.repeat(3),
  A.take(3),
  A.forEach((n) => console.log(`Repeat2 ${n}`)),
);
