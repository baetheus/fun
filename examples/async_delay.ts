import * as AI from "../async_iterable.ts";
import { range } from "../iterable.ts";
import { pipe } from "../fns.ts";

console.log("Take Until");

await pipe(
  AI.fromIterable(range(Number.POSITIVE_INFINITY)),
  AI.tap((n) => console.log(`Got original value ${n}`)),
  AI.takeUntil((n) => n >= 10),
  AI.scan((o, a) => o + a, 0),
  AI.delay(250),
  AI.forEach(console.log),
);

console.log("Take");

await pipe(
  AI.fromIterable(range(Number.POSITIVE_INFINITY)),
  AI.tap((n) => console.log(`Got original value ${n}`)),
  AI.take(10),
  AI.scan((o, a) => o + a, 0),
  AI.delay(250),
  AI.forEach(console.log),
);
