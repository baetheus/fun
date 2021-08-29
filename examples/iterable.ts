import * as A from "../array.ts";
import * as AI from "../async_iterable.ts";
import * as I from "../iterable.ts";
import { pipe } from "../fns.ts";

export function* range(start = 0, end = 100, step = 1) {
  const inRange = step < 0 ? (i: number) => i >= end : (i: number) => i <= end;
  let index = start;

  while (inRange(index)) {
    yield index;
    index += step;
  }
}

const noop = (..._args: unknown[]) => {};

const testAsync = async (count: number) => {
  console.log("Testing AsyncIterator");

  const start = performance.now();
  await pipe(
    range(0, count),
    AI.fromIterable,
    AI.forEach(noop),
  );
  const end = performance.now();
  console.log(`AsyncIterator Count ${count} in ${end - start}ms`);
};

const testSync = (count: number) => {
  console.log("Testing Iterator");

  const start = performance.now();
  pipe(
    range(0, count),
    I.forEach(noop),
  );
  const end = performance.now();
  console.log(`Iterator Count ${count} in ${end - start}ms`);
};

const testArray = (count: number) => {
  console.log("Testing Array");

  const start = performance.now();
  for (let i = 0; i < count; i++) {
    noop(i);
  }
  const end = performance.now();
  console.log(`Array Count ${count} in ${end - start}ms`);
};

const count = 10_000_000;

await testAsync(count);

testSync(count);

testArray(count);
