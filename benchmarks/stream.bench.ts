import * as S from "../stream.ts";
import * as CB from "../ideas/callbag.ts";
import * as M from "npm:@most/core@1.6.1";
import * as MS from "npm:@most/scheduler@1.3.0";
import * as R from "npm:rxjs@7.8.1";
import { pipe } from "../fn.ts";

const count = 1_000_000;
const add = (a: number, b: number) => a + b;
const passthrough = (_: number, value: number) => value;
const runRx = <A>(obs: R.Observable<A>): Promise<void> =>
  new Promise((resolve, reject) => {
    obs.subscribe({ complete: resolve, error: reject });
  });
function mostRange(count: number) {
  return M.newStream<number>((snk) => {
    let ended = false;
    let index = -1;
    while (++index < count) {
      if (ended) {
        break;
      }
      snk.event(0, index);
    }
    if (!ended) {
      snk.end(0);
    }
    return {
      dispose: () => {
        ended = true;
      },
    };
  });
}

Deno.bench("stream scan", { group: "scan" }, async () => {
  await pipe(
    S.range(count),
    S.scan(add, 0),
    S.scan(passthrough, 0),
    S.runPromise(S.DefaultEnv),
  );
});

Deno.bench("callbag scan", { group: "scan" }, async () =>
  await pipe(
    CB.range(count),
    CB.scan(add, 0),
    CB.scan(passthrough, 0),
    CB.runPromise({ queueMicrotask }),
  ));

Deno.bench("most scan", { group: "scan" }, async () =>
  await pipe(
    mostRange(count),
    M.scan(add, 0),
    M.scan(passthrough, 0),
    (stream) =>
      M.runEffects(
        stream,
        MS.newDefaultScheduler(),
      ),
  ));

Deno.bench("rxjs scan", { group: "scan" }, async () => {
  await pipe(
    R.range(0, count),
    R.scan(add, 0),
    R.scan(passthrough, 0),
    runRx,
  );
});

const JOIN_COUNT = 1_000;

Deno.bench("stream join", { group: "join" }, async () => {
  await pipe(
    S.range(JOIN_COUNT),
    S.flatmap(() => S.range(JOIN_COUNT)),
    S.runPromise(S.DefaultEnv),
  );
});

Deno.bench("most join", { group: "join" }, async () => {
  await pipe(
    mostRange(JOIN_COUNT),
    M.chain(() => mostRange(JOIN_COUNT)),
    (stream) =>
      M.runEffects(
        stream,
        MS.newDefaultScheduler(),
      ),
  );
});

Deno.bench("rxjs join", { group: "join" }, async () => {
  await pipe(
    R.range(0, JOIN_COUNT),
    R.mergeMap(() => R.range(0, JOIN_COUNT)),
    runRx,
  );
});
