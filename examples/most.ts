import * as M from "../contrib/most.ts";
import { pipe } from "../fn.ts";

const stream = pipe(
  pipe(M.periodic(1000), M.scan((a) => a + 1, 0)),
  M.bindTo("seconds"),
  M.bind("timestamps", () => M.wrap(Date.now())),
  M.tap((a) => console.log(a)),
  M.take(10),
);

// Strangely, this emits the first two events quickly.
await M.runEffects(stream)(M.newDefaultScheduler());
