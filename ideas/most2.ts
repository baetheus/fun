import type { Intersect } from "../kind.ts";
import { isNotNil } from "../nil.ts";
import { pipe, todo } from "../fn.ts";

export type Stream<A, R = never> = {
  run(sink: Sink<A>, env: R): Disposable;
};

export type Sink<A> = {
  event(a: A): void;
  end(): void;
};

export type TypeOf<U> = U extends Stream<infer A> ? A : never;

export type EnvOf<U> = U extends Stream<infer _, infer R> ? R : never;

export function stream<A, R = never>(
  run: (sink: Sink<A>, env: R) => Disposable,
): Stream<A> {
  return { run };
}

export function sink<A>(
  event: (a: A) => void,
  end: () => void,
): Sink<A> {
  return { event, end };
}

export function disposable(dispose: () => void): Disposable {
  return { [Symbol.dispose]: dispose };
}

export function dispose(disposable: Disposable): void {
  disposable[Symbol.dispose]();
}

export const DISPOSE_NONE: Disposable = disposable(() => undefined);

export const EMPTY: Stream<never> = stream(
  (sink) => {
    sink.end();
    return DISPOSE_NONE;
  },
);

export const NEVER: Stream<never> = stream(() => DISPOSE_NONE);

export type Timeout = {
  // deno-lint-ignore no-explicit-any
  setTimeout<Args extends any[]>(
    f: (...a: Args) => void,
    timeoutMillis: number,
    ...a: Args
  ): Disposable;
};

export function at(time: number): Stream<unknown, Timeout> {
  return stream((sink: Sink<unknown>, { setTimeout }: Timeout) =>
    setTimeout(
      ({ event, end }) => {
        event(undefined);
        end();
      },
      time,
      sink,
    )
  );
}

export function continueWith<A2, R2>(
  second: () => Stream<A2, R2>,
): <A1, R1>(first: Stream<A1, R1>) => Stream<A1 | A2, R1 & R2> {
  return (first) =>
    stream((snk, env) => {
      let d = first.run(
        sink(snk.event, () => {
          d = second().run(snk, env);
        }),
        env,
      );
      return d;
    });
}

export function periodic(period: number): Stream<undefined, Timeout> {
  return pipe(
    at(period),
    continueWith(() => periodic(period)),
  );
}

export function map<A, I>(
  fai: (a: A) => I,
): <R>(ua: Stream<A, R>) => Stream<I, R> {
  return (ua) =>
    stream(({ event, end }, env) =>
      ua.run(sink((a) => event(fai(a)), end), env)
    );
}

export function tap<A>(
  fa: (a: A) => void,
): <R>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) =>
    stream(({ event, end }, env) =>
      ua.run(
        sink((a) => {
          fa(a);
          event(a);
        }, end),
        env,
      )
    );
}

export function filter<A, B extends A>(
  refinement: (a: A) => a is B,
): <R>(s: Stream<A, R>) => Stream<B, R>;
export function filter<A>(
  predicate: (a: A) => boolean,
): <R>(s: Stream<A, R>) => Stream<A, R>;
export function filter<A>(
  predicate: (a: A) => boolean,
): <R>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) =>
    stream(({ event, end }, env) =>
      ua.run(
        sink((a) => {
          if (predicate(a)) {
            event(a);
          }
        }, end),
        env,
      )
    );
}

export function scan<A, O>(
  foao: (o: O, a: A) => O,
  init: O,
): <R>(ua: Stream<A, R>) => Stream<O, R> {
  return (ua) =>
    stream(({ event, end }, env) => {
      let hold = init;
      return ua.run(
        sink((a) => {
          hold = foao(hold, a);
          event(hold);
        }, end),
        env,
      );
    });
}

// deno-lint-ignore no-explicit-any
export function merge<Streams extends readonly Stream<unknown, any>[]>(
  ...streams: Streams
): Stream<
  TypeOf<Streams[number]>,
  Intersect<Parameters<EnvOf<Streams[number]>>[0]>
> {
  return stream(({ event, end }, env) => {
    let count = streams.length;
    const disposables: Disposable[] = [];
    const done = () => disposables.forEach(dispose);

    // last stream disposes and pass an end to the sink
    const snk = sink(event, () => {
      if (--count === 0) {
        done();
        end();
      }
    });

    // dump the merged disposables into our stateful array
    disposables.push(...streams.map((s) => s.run(snk, env)));
    return disposable(done);
  });
}

// deno-lint-ignore no-explicit-any
export function combine<const Streams extends Stream<unknown, any>[]>(
  init: { readonly [K in keyof Streams]: TypeOf<Streams[K]> },
  ...streams: Streams
): Stream<
  { readonly [K in keyof Streams]: TypeOf<Streams[K]> },
  Intersect<Parameters<EnvOf<Streams[number]>>[0]>
> {
  return stream(({ event, end }, env) => {
    let count = streams.length;
    const values = [...init] as { [K in keyof Streams]: TypeOf<Streams[K]> };
    const disposables: Disposable[] = [];
    const done = () => disposables.forEach(dispose);

    disposables.push(
      ...streams.map((s, i) =>
        s.run(
          sink((a: TypeOf<Streams[number]>) => {
            values[i] = a;
            event(values);
          }, () => {
            if (--count === 0) {
              done();
              end();
            }
          }),
          env,
        )
      ),
    );

    return disposable(done);
  });
}

export type SeedValue<S, V> = { readonly seed: S; readonly value: V };

export function loop<A, B, S>(
  stepper: (seed: S, a: A) => SeedValue<S, B>,
  seed: S,
): <R = never>(ua: Stream<A, R>) => Stream<B, R> {
  return (ua) =>
    stream(({ event, end }, env) => {
      let hold: S = seed;
      return ua.run(
        sink((a) => {
          const { seed, value } = stepper(hold, a);
          hold = seed;
          event(value);
        }, end),
        env,
      );
    });
}

export function join(concurrency = 1): <A, R1 = never, R2 = never>(
  ua: Stream<Stream<A, R1>, R2>,
) => Stream<A, R1 & R2> {
  return <A, R1 = never, R2 = never>(
    ua: Stream<Stream<A, R1>, R2>,
  ): Stream<A, R1 & R2> =>
    stream(({ event, end }, env) => {
      let done = false;
      const queue: Stream<A, R1>[] = [];
      const running = new Map<Sink<A>, Disposable>(); // WeakMap?

      function startInner(strm: Stream<A, R1>) {
        const snk = sink<A>(event, () => {
          if (running.has(snk)) {
            running.delete(snk);
          }

          if (queue.length > 0 && running.size < concurrency) {
            startInner(queue.shift() as Stream<A, R1>);
          }

          if (done && queue.length === 0 && running.size === 0) {
            end();
          }
        });

        running.set(snk, strm.run(snk, env));
      }

      return ua.run(
        sink((strm) => {
          if (running.size < concurrency) {
            startInner(strm);
          } else {
            queue.push(strm);
          }
        }, () => {
          done = true;
        }),
        env,
      );
    });
}

export function takeUntil<A>(
  predicate: (a: A) => boolean,
): <R = never>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) =>
    stream(({ event, end }, env) => {
      const dsp = ua.run(
        sink((a) => {
          if (predicate(a)) {
            end();
          } else {
            event(a);
          }
        }, end),
        env,
      );
      return dsp;
    });
}

// export function flatMap<A, I, R2 = never>(
//   faui: (a: A) => Stream<I, R2>,
//   count = 1,
// ): <R1 = never>(ua: Stream<A, R1>) => Stream<I, R1 & R2> {
//   return (ua) =>
//     stream(({ event, end }, env) => {
//       const queue = new Array<Stream<I>>();
//       const running = new Map<Sink<I>, Disposable>();

//       const  = () => {
//         const snk = sink<I>(event, () => {
//           const disposable = running.get(snk);
//           if (isNotNil(disposable)) {
//             dispose(disposable);
//             running.delete(snk);
//           }
//         });

//       };

//       ua.run(
//         sink((a) => {
//           const strm = faui(a);

//           if (running.size < count) {
//             const snk = sink<I>(event, () => {
//               const disposable = running.get(snk);
//               if (isNotNil(disposable)) {
//                 dispose(disposable);
//                 running.delete(snk);
//               }

//             });
//           }
//         }, () => {}),
//         env,
//       );
//     });
// }

export function indexed<S, I>(
  fsi: (s: S) => [I, S],
  init: S,
): <A>(ua: Stream<A>) => Stream<[I, A]> {
  return loop((s, a) => {
    const [index, seed] = fsi(s);
    return { seed, value: [index, a] };
  }, init);
}

export function withIndex(
  start: number = 0,
  step: number = 1,
): <A, R = never>(ua: Stream<A>) => Stream<[number, A], R> {
  return indexed((i) => [i, i + step], start);
}

export function withCount<A, R = never>(
  ua: Stream<A, R>,
): Stream<[number, A], R> {
  return pipe(ua, withIndex(1));
}

export function createAdapter<A, R = never>(): [
  (value: A) => void,
  Stream<A, R>,
] {
  const dispatcher = { dispatch: (_: A) => {} };
  const dispatch = (a: A) => dispatcher.dispatch(a);
  return [
    dispatch,
    stream(({ event, end }) => {
      dispatcher.dispatch = event;
      return disposable(() => {
        dispatcher.dispatch = () => {};
        end();
      });
    }),
  ];
}

export function fromPromise<A>(ua: Promise<A>): Stream<A> {
  return stream((sink) => {
    const dispatcher = { dispatch: sink.event };
    const done = disposable(() => {
      dispatcher.dispatch = () => {};
    });
    ua.then((a) => dispatcher.dispatch(a)).finally(() => dispose(done));
    return done;
  });
}

export function run<A, R = never>(
  sink: Sink<A>,
  env: R,
): (ua: Stream<A, R>) => Disposable {
  return (ua) => ua.run(sink, env);
}

export function runPromise<R>(env: R): <A>(ua: Stream<A, R>) => Promise<void> {
  return (ua) =>
    new Promise<void>((resolve) => run(sink(() => {}, resolve), env)(ua));
}

const test = pipe(
  periodic(1000),
  withCount,
  map(([i]) =>
    pipe(
      periodic(200),
      withCount,
      map(([j]): [number, number] => [i, j]),
      takeUntil(([_, j]) => j > 3),
    )
  ),
  join(Number.POSITIVE_INFINITY),
);

const timeout: Timeout = { setTimeout } as unknown as Timeout;

pipe(test, run(sink(console.log, () => console.log("done")), timeout));
