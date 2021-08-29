import { pipe, then, wait } from "../fns.ts";

const a = new AbortController();

a.signal.addEventListener(
  "abort",
  () => console.log("Abort Event"),
);

const start = performance.now();

wait(3000, a.signal).then(() =>
  console.log(`Waited ${performance.now() - start}ms`)
);

setTimeout(() => a.abort(), 500);

class MyPromise<B, A> extends Promise<A> {
  constructor(
    executor: (resolve: (a: A) => void, reject: (b: B) => void) => void,
  ) {
    super(executor);
  }
}

function delay(
  ms: number,
): <A>(ta: () => PromiseLike<A>) => () => PromiseLike<A> {
  return (ta) => () => wait(ms).then(ta);
}

const myPromiseThunk = () => new MyPromise((res) => res(1));

await pipe(
  myPromiseThunk,
  delay(100),
)().then(console.log);
