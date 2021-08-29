import * as AI from "../async_iterable.ts";
import { pipe, resolve } from "../fns.ts";

await resolve(console.log("Repeat"));

await pipe(
  AI.of(1, 2, 3, 4),
  AI.repeat(100),
  AI.forEach(console.log),
);

await resolve(console.log("Sequence"));

await pipe(
  AI.sequenceTuple(AI.of(1, 2, 3), AI.of("a", "b", "c")),
  AI.forEach(console.log),
);
