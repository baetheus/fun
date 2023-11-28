import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import type { Stream } from "../../contrib/most.ts";
import * as M from "../../contrib/most.ts";

const scheduler = M.newDefaultScheduler();
const run = <A>(s: Stream<A>): Promise<readonly A[]> => M.collect(s, scheduler);

Deno.test("Most wrap", async () => {
  assertEquals(await run(M.wrap(1)), [1]);
});
