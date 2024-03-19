/**
 * The stream module includes construction and combinator functions for a push
 * stream datatype. Streams in fun are very close to the Streams of mostjs as
 * well as the Observables of rxjs. There are few differences that come from
 * a nuanced selection of invariants. Those invariants are:
 *
 * 1. Streams are lazy by default, and will not start collecting or emitting
 * events until they are run.
 * 2. A stream must be connected to a sink for events to be consumed. A sink is
 * an object with a notion of accepting an event message and an end message.
 * 3. When a stream is run by linking it with a sink it will return a
 * Disposable, which can be used to cancel the operation of the stream early.
 * 4. Once a stream is started it must call end when it completes. If the stream
 * is disposed it will not call end.
 *
 * @module Stream
 * @experimental
 * @since 2.2.0
 */
import type { In, Kind, Out } from "./kind.ts";
import type { Wrappable } from "./wrappable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Applicable } from "./applicable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Option } from "./option.ts";
import type { Either } from "./either.ts";
import type { Pair } from "./pair.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import * as A from "./array.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { pair } from "./pair.ts";
import { flow, pipe } from "./fn.ts";

/**
 * Represents a sink for receiving values emitted by a stream.
 *
 * @since 2.2.0
 */
export type Sink<A> = {
  readonly event: (value: A) => void;
  readonly end: (reason?: unknown) => void;
};

/**
 * Represents a stream that emits values of type `A`.
 *
 * @since 2.2.0
 */
export type Stream<A, R = unknown> = (sink: Sink<A>, env: R) => Disposable;

/**
 * Specifies Stream as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.2.0
 */
export interface KindStream extends Kind {
  readonly kind: Stream<Out<this, 0>, In<this, 0>>;
}

/**
 * Represents a stream with unknown value type and any environment.
 *
 * @since 2.2.0
 */
// deno-lint-ignore no-explicit-any
export type AnyStream = Stream<any, any>;

/**
 * Extracts the value type from a stream type.
 *
 * @since 2.2.0
 */
export type TypeOf<U> = U extends Stream<infer A, infer _> ? A : never;

/**
 * Extracts the environment type from a stream type.
 *
 * @since 2.2.0
 */
export type EnvOf<U> = U extends Stream<infer _, infer R> ? R : never;

/**
 * Represents a timeout object with `setTimeout` and `clearTimeout` methods.
 *
 * @since 2.2.0
 */
export type Timeout = {
  readonly setTimeout: typeof setTimeout;
  readonly clearTimeout: typeof clearTimeout;
};

/**
 * Represents an interval object with `setInterval` and `clearInterval` methods.
 */
export type Interval = {
  readonly setInterval: typeof setInterval;
  readonly clearInterval: typeof clearInterval;
};

/**
 * @since 2.2.0
 */
export type DefaultEnv = Timeout & Interval;

/**
 * Creates a disposable resource with a dispose function. The resource can be disposed of
 * by calling the `dispose` method. If `dispose` is called more than once, an error will be thrown.
 *
 * @param dispose A function that disposes of the resource.
 * @returns A Disposable object with a dispose method.
 *
 * @since 2.2.0
 */
export function disposable(dispose: () => void): Disposable {
  return { [Symbol.dispose]: dispose };
}

/**
 * Disposes of a disposable resource by calling its dispose method.
 *
 * @since 2.2.0
 */
export function dispose(disposable: Disposable): void {
  return disposable[Symbol.dispose]();
}

/**
 * Creates a `Disposable` that does nothing when disposed.
 *
 * @since 2.0.0
 */
export function disposeNone(): Disposable {
  return disposable(() => {});
}

/**
 * @since 2.2.0
 */
export function sink<A>(
  event: (value: A) => void,
  end: (reason?: unknown) => void,
): Sink<A> {
  return { event, end };
}

/**
 * Creates a sink that does nothing when receiving events or ends
 *
 * @since 2.2.0
 */
export function emptySink(): Sink<unknown> {
  return sink(NOOP, NOOP);
}

/**
 * Creates a stream with a run function. The run function is responsible for
 * managing the interaction with the provided sink and environment. It returns
 * a Disposable object that can be used to clean up any resources associated
 * with the stream.
 *
 * @since 2.2.0
 */
export function stream<A, R = unknown>(
  run: (sink: Sink<A>, env: R) => Disposable,
): Stream<A, R> {
  return run;
}

/**
 * Runs a stream  until completion, returning a disposable to stop the stream
 * early.
 *
 * @param stream The stream to run.
 * @param sink The sink to send event and end messages to.
 * @param env The environment to run the stream in.
 * @returns A disposable that can cancel the stream.
 *
 * @since 2.2.0
 */
export function run(): <A>(stream: Stream<A, typeof DefaultEnv>) => Disposable;
export function run<R>(env: R): <A>(stream: Stream<A, R>) => Disposable;
export function run<A, R>(
  env: R,
  sink: Sink<A>,
): (stream: Stream<A, R>) => Disposable;
export function run<A, R>(
  env: R = DefaultEnv as R,
  sink: Sink<A> = emptySink(),
): (stream: Stream<A, R>) => Disposable {
  return (stream) => stream(sink, env);
}

/**
 * Runs a stream until completion, returning a promise that resolves when the stream ends.
 *
 * @param stream The stream to run.
 * @param env The environment to run the stream in.
 * @returns A promise that resolves when the stream ends.
 *
 * @since 2.2.0
 */
export function runPromise(): <A>(
  stream: Stream<A, typeof DefaultEnv>,
) => Promise<unknown>;
export function runPromise<R>(
  env: R,
): <A>(stream: Stream<A, R>) => Promise<unknown>;
export function runPromise<R>(
  env: R = DefaultEnv as R,
): <A>(stream: Stream<A, R>) => Promise<unknown> {
  return (stream) =>
    new Promise<unknown>((resolve) =>
      pipe(stream, run(env, sink(NOOP, resolve)))
    );
}

/**
 * Runs a stream until completion, calling the onEvent when events arrive and
 * onEnd when the stream ends.
 *
 * @param onEvent The function to run on each stream event.
 * @param onEnd The function to run on stream end.
 * @returns A function that takes a stream and returns a disposable
 *
 * @since 2.2.0
 */
export function forEach<A>(
  onEvent: (value: A) => void,
  onEnd?: (reason?: unknown) => void,
): (ua: Stream<A, typeof DefaultEnv>) => Disposable;
export function forEach<A, R>(
  onEvent: (value: A) => void,
  onEnd: (reason?: unknown) => void,
  env: R,
): (ua: Stream<A, R>) => Disposable;
export function forEach<A, R = unknown>(
  onEvent: (value: A) => void = NOOP,
  onEnd: (reason?: unknown) => void = NOOP,
  env: R = DefaultEnv as R,
): (ua: Stream<A, R>) => Disposable {
  return run(env, sink(onEvent, onEnd));
}

/**
 * Runs a stream, collecting eny events into an array, then returning the array
 * once the stream ends.
 *
 * @since 2.2.0
 */
export function collect(): <A>(
  stream: Stream<A, typeof DefaultEnv>,
) => Promise<ReadonlyArray<A>>;
export function collect<R>(
  env: R,
): <A>(stream: Stream<A, R>) => Promise<ReadonlyArray<A>>;
export function collect<R>(
  env: R = DefaultEnv as R,
): <A>(stream: Stream<A, R>) => Promise<ReadonlyArray<A>> {
  return <A = never>(stream: Stream<A, R>): Promise<ReadonlyArray<A>> =>
    new Promise((resolve) => {
      const result: A[] = [];
      pipe(
        stream,
        run(
          env,
          sink((value) => result.push(value), () => resolve(result)),
        ),
      );
    });
}

const NOOP: () => void = () => {};

/**
 * A Stream instance that emits no values and immediately ends.
 */
const EMPTY: Stream<never, unknown> = stream(
  (snk) => {
    let open = true;
    const close = () => open = false;
    queueMicrotask(() => open && snk.end());
    return disposable(close);
  },
);

/**
 * Creates an empty `Stream`, which emits no events and ends immediately.
 *
 * @since 2.2.0
 */
export function empty<A = never, R = unknown>(): Stream<A, R> {
  return EMPTY;
}

/**
 * Creates a `Stream` that never emits any events and never ends.
 *
 * @since 2.2.0
 */
export function never<A = never, R = unknown>(): Stream<A, R> {
  return stream(() => disposable(NOOP));
}

/**
 * Creates a `Stream` that emits a single event when the provided promise resolves, and then ends.
 *
 * @param ua The promise to convert into a stream.
 * @returns A `Stream` that emits the resolved value of the provided promise and then ends.
 *
 * @since 2.0.0
 */
export function fromPromise<A>(ua: Promise<A>): Stream<A> {
  return stream((snk) => {
    let open = true;
    const close = () => open = false;
    ua.then((value) => {
      if (open) {
        close();
        snk.event(value);
        snk.end();
      }
    });
    return disposable(close);
  });
}

/**
 * Creates a `Stream` that emits events from the provided iterable and then ends.
 *
 * @param values The iterable whose values will be emitted by the stream.
 * @returns A `Stream` that emits each value from the provided iterable and then ends.
 *
 * @since 2.0.0
 */
export function fromIterable<A>(values: Iterable<A>): Stream<A> {
  return stream((snk) => {
    let open = true;
    const close = () => open = false;
    queueMicrotask(() => {
      if (open) {
        for (const value of values) {
          snk.event(value);
        }
        snk.end();
      }
    });
    return disposable(close);
  });
}

/**
 * Creates a stream that emits a single value after a specified delay.
 *
 * @param time The time in milliseconds after which the value should be emitted.
 * @returns A stream that emits a single value after the specified delay.
 *
 * @since 2.2.0
 */
export function at(time: number): Stream<number, Timeout> {
  return stream(
    (snk: Sink<number>, { setTimeout, clearTimeout }: Timeout) => {
      const handle = setTimeout(
        () => {
          snk.event(time);
          snk.end();
        },
        time,
      );
      return disposable(() => {
        clearTimeout(handle);
      });
    },
  );
}

/**
 * Creates a stream that emits incremental values at regular intervals.
 *
 * @param period The time interval in milliseconds between each emitted value.
 * @returns A stream that emits incremental values at regular intervals.
 *
 * @since 2.2.0
 */
export function periodic(period: number): Stream<number, Interval> {
  return stream((snk: Sink<number>, env: Interval) => {
    let start = 0;
    const { setInterval, clearInterval } = env;
    const handle = setInterval(
      () => {
        snk.event(start += period);
      },
      period,
    );
    return disposable(() => {
      clearInterval(handle);
    });
  });
}

/**
 * Combines two streams, emitting events from the first stream until it
 * ends, and then continuing with events from the second stream.
 *
 * @param second A function that returns the second stream to be concatenated.
 * @returns A function that takes the first stream and returns a new stream concatenating events from both streams.
 *
 * @since 2.0.0
 */
export function combine<A2, R2>(
  second: Stream<A2, R2>,
): <A1, R1>(first: Stream<A1, R1>) => Stream<A1 | A2, R1 & R2> {
  return <A1, R1>(first: Stream<A1, R1>): Stream<A1 | A2, R1 & R2> =>
    pipe(
      fromIterable<Stream<A1 | A2, R1 & R2>>([first, second]),
      join(1),
    );
}

/**
 * Maps the values of a stream from one type to another using a provided function.
 *
 * @param fai A function that maps values from type `A` to type `I`.
 * @returns A higher-order function that takes a stream of type `A` and returns a new stream of type `I`.
 *
 * @since 2.2.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <R>(ua: Stream<A, R>) => Stream<I, R> {
  return (ua) =>
    stream((snk, env) => ua(sink((a) => snk.event(fai(a)), snk.end), env));
}

/**
 * Wraps a single value into a stream.
 *
 * @param value The value to be wrapped into the stream.
 * @returns A stream containing the provided value.
 *
 * @since 2.2.0
 */
export function wrap<A, R = unknown>(value: A): Stream<A, R> {
  return stream((snk) => {
    let open = true;
    const close = () => open = false;
    queueMicrotask(() => {
      if (open) {
        snk.event(value);
        snk.end();
      }
    });
    return disposable(close);
  });
}

/**
 * Creates a new stream that only emits values from the original stream that satisfy the provided predicate function.
 *
 * @param predicate A function that determines whether a value should be emitted (`true`) or filtered out (`false`).
 * @returns A higher-order function that takes a stream and returns a new stream containing only the values that satisfy the predicate.
 *
 * @since 2.2.0
 */
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
    stream((snk, env) =>
      ua(
        sink((value) => {
          if (predicate(value)) {
            snk.event(value);
          }
        }, snk.end),
        env,
      )
    );
}

/**
 * Apply a filter and mapping operation at the same time against a Stream.
 *
 * @since 2.2.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): <R = unknown>(ua: Stream<A, R>) => Stream<I, R> {
  return (ua) =>
    stream((snk, env) =>
      pipe(
        ua,
        run(
          env,
          sink((value) => {
            const oi = fai(value);
            if (O.isSome(oi)) {
              snk.event(oi.value);
            }
          }, snk.end),
        ),
      )
    );
}

/**
 * Given a refinement or predicate, return a function that splits an Stream into
 * a Pair<Stream<A>, Stream<B>>.
 *
 * @since 2.2.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): <R = unknown>(ua: Stream<A, R>) => Pair<Stream<B, R>, Stream<A, R>>;
export function partition<A>(
  predicate: Predicate<A>,
): <R = unknown>(ua: Stream<A, R>) => Pair<Stream<A, R>, Stream<A, R>>;
export function partition<A>(
  predicate: Predicate<A>,
): <R = unknown>(ua: Stream<A, R>) => Pair<Stream<A, R>, Stream<A, R>> {
  return (ua) =>
    pair(pipe(ua, filter(predicate)), pipe(ua, filter((a) => !predicate(a))));
}

/**
 * Map and partition over the inner value of an Stream<A> at the same time.
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): <R = unknown>(ua: Stream<A, R>) => Pair<Stream<I, R>, Stream<J, R>> {
  return (ua) =>
    pair(
      pipe(ua, filterMap(flow(fai, E.getRight))),
      pipe(ua, filterMap(flow(fai, E.getLeft))),
    );
}

/**
 * Creates a new stream by continuously applying a function to a seed value and the values of the original stream.
 *
 * @param stepper A function that takes the current state and a value from the original stream, and returns an array containing the new state and the value to be emitted by the new stream.
 * @param seed The initial state value.
 * @returns A higher-order function that takes a stream and returns a new stream resulting from applying the stepper function to each value of the original stream.
 *
 * @since 2.2.0
 */
export function loop<A, B, S>(
  stepper: (state: S, value: A) => [S, B],
  seed: S,
): <R = unknown>(ua: Stream<A, R>) => Stream<B, R> {
  return (ua) =>
    stream((snk, env) => {
      let hold: S = seed;
      return pipe(
        ua,
        run(
          env,
          sink((a) => {
            const [seed, value] = stepper(hold, a);
            hold = seed;
            snk.event(value);
          }, snk.end),
        ),
      );
    });
}

/**
 * Creates a new stream by accumulating values from the original stream using a provided scanning function.
 *
 * @param scanner A function that takes the current accumulator value and a value from the original stream, and returns the new accumulator value.
 * @param seed The initial accumulator value.
 * @returns A higher-order function that takes a stream and returns a new stream with accumulated values.
 *
 * @since 2.2.0
 */
export function scan<A, O>(
  scanner: (accumulator: O, value: A) => O,
  seed: O,
): <R>(ua: Stream<A, R>) => Stream<O, R> {
  return (ua) =>
    stream((snk, env) => {
      let state = seed;
      return ua(
        sink(
          (value) => {
            state = scanner(state, value);
            snk.event(state);
          },
          snk.end,
        ),
        env,
      );
    });
}

/**
 * Creates a new stream by concurrently merging multiple streams into one stream.
 * The concurrency of the join can be set and defaults to positive infinity,
 * indicating unbounded join. A strategy can also be supplied, which controls
 * how inner streams are handled when maximum concurrency is met.
 *
 * *Hold Strategy*: This strategy keeps an ordered queue of streams to pull from
 * when running inner streams end. This strategy has no loss of data.
 *
 * *Swap Strategy*: This strategy will dispose the oldest running inner stream
 * when a new stream arrives to make space for the newest stream. In this
 * strategy the oldest streams are where we lose data.
 *
 * *Drop Strategy": This strategy will ignore any new streams once concurrency
 * is maxed. In this strategy newest streams are where we lose data.
 *
 * There is room for a combination of strategies in the future, but the vast
 * majority of behaviors are representable with these three.
 *
 * @param concurrency The maximum number of inner streams to be running concurrently.
 * @param strategy The strategy to use once concurrency is saturated.
 * @returns A higher-order function that takes a stream of streams and returns a new stream containing values from all inner streams.
 *
 * @since 2.2.0
 */
export function join(
  concurrency = Number.POSITIVE_INFINITY,
  strategy: "hold" | "swap" | "drop" = "hold",
): <A, R1, R2>(
  ua: Stream<Stream<A, R1>, R2>,
) => Stream<A, R1 & R2> {
  return <A, R1, R2>(
    ua: Stream<Stream<A, R1>, R2>,
  ): Stream<A, R1 & R2> =>
    stream((outerSnk, env) => {
      let outerClosed = false;
      const queue: Stream<A, R1>[] = [];
      const running = new Map<Sink<A>, Disposable>(); // WeakMap?

      /**
       * Start inner should only be called when there is enough concurrency to
       * support starting a new stream.
       */
      function startInner(strm: Stream<A, R1>) {
        const innerSnk = sink<A>(outerSnk.event, () => {
          /**
           * We know that this inner stream has ended so we no longer need to
           * dispose of it. Thus we start by removing the sink/disposable pair
           * from our running map.
           */
          if (running.has(innerSnk)) {
            running.delete(innerSnk);
          }

          /**
           * Next we decide if we should start a new stream by checking the
           * concurrency and the queue. There might be a bug here but I haven't
           * desk checked it yet. If the call to startInner here leads to a
           * sync stream and that stream calls end it might lead to a double
           * end call.
           *
           * I don't think it will because the inner stream started here should
           * see running.size === 1, but I'm not entirely sure.
           */
          if (running.size < concurrency && queue.length > 0) {
            startInner(queue.shift() as Stream<A, R1>);
          }

          /**
           * Lastly, we check to see if we are the last end call by looking at
           * whether the outer stream is closed and whether we are running any
           * inner streams still.
           */
          if (outerClosed && running.size === 0) {
            outerSnk.end();
          }
        });

        /**
         * Lastly, we start the innerStream and store it's disposable in
         * running, indexed by the innerSnk created above.
         */
        running.set(innerSnk, run(env, innerSnk)(strm));
      }

      const dsp = ua(
        sink((strm) => {
          /**
           * If there is enough concurrency to start an inner stream then we
           * start it. Otherwise we move on to queueing using the provided
           * strategy.
           */
          if (running.size < concurrency) {
            return startInner(strm);
          }

          /**
           * For the hold strategy we queue up any inner streams above
           * concurrency. As running inner streams end they will be pulled from
           * the queue.
           */
          if (strategy === "hold") {
            return queue.push(strm);
          }

          /**
           * For the swap strategy we use the unique property of Map that when
           * converted to an array it will be put into insertion order. This may
           * have some performance impacts, in which case switching to another
           * data structure may benefit. For now, the simplicity of this
           * implementation wins.
           *
           * We start by finding the oldest running inner stream, disposing it,
           * and starting the new stream. In other libraries this behavior is
           * called left switch.
           */
          if (strategy === "swap") {
            pipe(
              Array.from(running),
              A.lookup(0),
              O.match(
                // If there is no running stream then something is likely wrong?
                NOOP,
                ([oldestSink, oldestDsp]) => {
                  running.delete(oldestSink);
                  dispose(oldestDsp);
                  startInner(strm);
                },
              ),
            );
          }

          /**
           * The drop strategy would  go here, however its behavior is
           * to ignore new streams so it is a noop.
           */
        }, () => {
          /**
           * There are two cases for end coming from the outer stream. There are
           * either inner streams left to process or not. When there are inner
           * streams then the startInner function will handle end. If there
           * aren't then end must be called here.
           */
          outerClosed = true;

          if (running.size === 0 && queue.length == 0) {
            outerSnk.end();
          }
        }),
        env,
      );

      /**
       * In join both the outer and inner streams must be disposed. By design,
       * disposed streams call end after their cleanup is complete. For join
       * the process of dispose is to first dispose of the outer stream if it
       * isn't closed, then to clear the queue, and last dispose of the inner
       * streams. The last inner stream to be disposed is expected to call end,
       * so the machinery of streams should lead to a single call to end.
       */
      return disposable(() => {
        queue.length = 0;
        running.forEach(dispose);
        if (!outerClosed) {
          dispose(dsp);
        }
      });
    });
}

/**
 * Maps each value of the input stream to a new stream using a provided function,
 * then flattens the resulting streams into a single stream.
 *
 * @param faui A function that maps each value of the input stream to a new stream.
 * @param count The maximum number of inner streams to be running concurrently.
 * @returns A higher-order function that takes a stream and returns a new stream
 * containing values from all mapped streams
 *
 * @since 2.2.0
 */
export function flatmap<A, I, R2 = unknown>(
  faui: (a: A) => Stream<I, R2>,
  concurrency = Number.POSITIVE_INFINITY,
): <R1>(ua: Stream<A, R1>) => Stream<I, R1 & R2> {
  return (ua) => pipe(ua, map(faui), join(concurrency));
}

export function switchmap<A, I, R2>(
  faui: (a: A) => Stream<I, R2>,
  concurrency = 1,
): <R1>(ua: Stream<A, R1>) => Stream<I, R1 & R2> {
  return <R1>(ua: Stream<A, R1>): Stream<I, R1 & R2> =>
    pipe(ua, map(faui), join(concurrency, "swap"));
}

export function exhaustmap<A, I, R2>(
  faui: (a: A) => Stream<I, R2>,
  concurrency = 1,
): <R1>(ua: Stream<A, R1>) => Stream<I, R1 & R2> {
  return <R1>(ua: Stream<A, R1>): Stream<I, R1 & R2> =>
    pipe(ua, map(faui), join(concurrency, "drop"));
}

/**
 * Applies each value of the input stream to a stream of functions,
 * producing a stream of results. Apply may lose data if the underlying streams
 * push events in a tight loop. This is because in a tight loop the runtime does
 * not allow pausing between events from one of the two streams.
 *
 * @param ua The input stream.
 * @returns A higher-order function that takes a stream of functions and returns
 * a new stream containing the results of applying each value of the input stream
 * to the corresponding function.
 *
 * @since 2.2.0
 */
export function apply<A, R2 = never>(
  ua: Stream<A, R2>,
): <I, R1>(ufai: Stream<(a: A) => I, R1>) => Stream<I, R2 & R1> {
  return <I, R1>(ufai: Stream<(a: A) => I, R1>): Stream<I, R1 & R2> =>
    stream((snk, env) => {
      let valueDone = false;
      let fnDone = false;
      let fai: Option<(a: A) => I> = O.none;
      let a: Option<A> = O.none;

      function send() {
        pipe(fai, O.apply(a), O.tap((i) => snk.event(i)));
      }

      const dsp_ufai = ufai(
        sink((fn) => {
          fai = O.some(fn);
          send();
        }, () => {
          fnDone = true;
          if (valueDone) {
            snk.end();
          }
        }),
        env,
      );

      const dsp_ua = ua(
        sink((value) => {
          a = O.some(value);
          send();
        }, () => {
          valueDone = true;
          if (fnDone) {
            snk.end();
          }
        }),
        env,
      );

      return disposable(() => {
        if (!valueDone) {
          dispose(dsp_ua);
        }
        if (!fnDone) {
          dispose(dsp_ufai);
        }
      });
    });
}

/**
 * Creates a new stream by combining each value of the input stream with an index value generated by a provided indexing function.
 *
 * @param indexer A function that takes the current state and returns an array containing the index value and the new state.
 * @param seed The initial state value.
 * @returns A higher-order function that takes a stream and returns a new stream containing tuples of index-value pairs.
 *
 * @since 2.2.0
 */
export function indexed<S, I>(
  indexer: (seed: S) => [I, S],
  seed: S,
): <A, R = unknown>(ua: Stream<A, R>) => Stream<[I, A], R> {
  return loop((previous, value) => {
    const [index, next] = indexer(previous);
    return [next, [index, value]];
  }, seed);
}

/**
 * Creates a new stream by combining each value of the input stream with an index value.
 *
 * @param start The starting index value.
 * @param step The increment step for generating index values.
 * @returns A higher-order function that takes a stream and returns a new stream containing tuples of index-value pairs.
 *
 * @since 2.2.0
 */
export function withIndex(
  start: number = 0,
  step: number = 1,
): <A, R = unknown>(ua: Stream<A, R>) => Stream<[number, A], R> {
  return indexed((i) => [i, i + step], start);
}

/**
 * Creates a new stream by combining each value of the input stream with a count index starting from 1.
 *
 * @param ua The input stream.
 * @returns A stream containing tuples of count-value pairs.
 *
 * @since 2.2.0
 */
export function withCount<A, R = unknown>(
  ua: Stream<A, R>,
): Stream<[number, A], R> {
  return withIndex(1)(ua);
}

/**
 * Creates a new stream by counting the number of values emitted by the input stream.
 *
 * @param ua The input stream.
 * @returns A stream containing the count of values emitted by the input stream.
 *
 * @since 2.2.0
 */
export function count<A, R = unknown>(ua: Stream<A, R>): Stream<number, R> {
  return pipe(ua, withCount, map(([i]) => i));
}

/**
 * Creates a new stream that emits values from the input stream until a condition specified by the predicate function is met.
 *
 * @param predicate A function that determines whether to continue emitting values (`true`) or stop emitting values (`false`).
 * @returns A higher-order function that takes a stream and returns a new stream containing values until the condition specified by the predicate function is met.
 *
 * @since 2.2.0
 */
export function takeUntil<A>(
  predicate: (a: A) => boolean,
): <R = unknown>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) =>
    stream((snk, env) => {
      const dsp = ua(
        sink((a) => {
          if (predicate(a)) {
            snk.event(a);
            dispose(dsp);
          } else {
            snk.event(a);
          }
        }, snk.end),
        env,
      );
      return dsp;
    });
}

/**
 * Creates a new stream that emits a specified number of values from the input stream.
 *
 * @param count The number of values to emit.
 * @returns A higher-order function that takes a stream and returns a new stream containing the specified number of values.
 *
 * @since 2.2.0
 */
export function take(count: number): <A, R>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) => {
    if (count <= 0) {
      return empty();
    }

    return stream((snk, env) => {
      let index = Math.max(0, count);
      const dsp = ua(
        sink(
          (value) => {
            snk.event(value);
            if (--index <= 0) {
              dispose(dsp);
              snk.end();
            }
          },
          snk.end,
        ),
        env,
      );
      return dsp;
    });
  };
}

/**
 * Creates a new stream that emits a sequence of numbers starting from a specified value, with a specified step, and up to a specified count.
 *
 * @param count The number of values to emit. Defaults to positive infinity, emitting an infinite sequence.
 * @param start The starting value of the sequence. Defaults to 0.
 * @param step The increment step between each value of the sequence. Defaults to 1.
 * @returns A stream containing the sequence of numbers.
 *
 * @since 2.2.0
 */
export function range(
  count: number = Number.POSITIVE_INFINITY,
  start = 0,
  step = 1,
): Stream<number> {
  return stream((snk) => {
    let open = true;
    const close = () => open = false;

    queueMicrotask(() => {
      const length = Math.max(0, Math.floor(count));
      let index = -1;
      let value = start;

      while (++index < length) {
        if (open) {
          snk.event(value);
          value += step;
        } else {
          break;
        }
      }
      snk.end();
    });

    return disposable(close);
  });
}

/**
 * Creates a new stream by repeating the values emitted by the input stream a specified number of times.
 *
 * @param count The number of times to repeat the values emitted by the input stream.
 * @returns A higher-order function that takes a stream and returns a new stream containing the repeated values.
 *
 * @since 2.2.0
 */
export function repeat(
  count: number,
): <A, R>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) =>
    stream((snk, env) => {
      let index = Math.floor(Math.max(0, count));
      let dsp = disposeNone();
      let open = true;
      const close = () => open = false;
      const innerSink = sink(snk.event, () => {
        if (open) index-- > 0 ? queueMicrotask(startInner) : snk.end();
      });

      function startInner() {
        if (open) {
          dsp = ua(innerSink, env);
        }
      }

      queueMicrotask(startInner);

      return disposable(() => {
        if (open) {
          close();
          dispose(dsp);
        }
      });
    });
}

/**
 * Shares a parent stream with many sinks. Each parent event is sent to all
 * child sinks. When the parent ends, all children sinks receive an end event
 * and are cleared from internal structure. If all children sinks are disposed
 * the parent is also disposed.
 *
 * @since 2.2.0
 * @experimental
 */
export function multicast<R>(env: R): <A>(ua: Stream<A, R>) => Stream<A> {
  return <A>(ua: Stream<A, R>): Stream<A> => {
    let dsp = disposeNone();
    const sinks = new Map<Sink<A>, Disposable>();

    return (snk) => {
      // Sinks with object equality only get added once.
      if (sinks.has(snk)) {
        return sinks.get(snk)!;
      }

      // The last sink to be disposed disposes the source.
      const innerDsp = disposable(() => {
        sinks.delete(snk);
        if (sinks.size === 0) {
          dispose(dsp);
          dsp = disposeNone();
        }
      });

      sinks.set(snk, innerDsp);

      // On the first sink addition we start the source
      if (sinks.size === 1) {
        dsp = ua(
          sink(
            (value) => sinks.forEach((_, snk) => snk.event(value)),
            (reason) => sinks.forEach((_, snk) => snk.end(reason)),
          ),
          env,
        );
      }

      return innerDsp;
    };
  };
}

/**
 * Opens the parent stream only once and multicasts events to all sinks. Only
 * the first env is used to start the parent stream. Once all sinks are
 * disposed the parent stream is disposed but the last event is still held.
 *
 * @since 2.2.0
 * @experimental
 */
export function hold<A, R>(ua: Stream<A, R>): Stream<A, R> {
  const sinks = new Map<Sink<A>, Disposable>();
  let outerDsp: Option<Disposable> = O.none;
  let last: Option<A> = O.none;

  return (snk, env) => {
    if (sinks.has(snk)) {
      return sinks.get(snk)!;
    }

    const dsp = disposable(() => {
      sinks.delete(snk);
      if (sinks.size === 0 && O.isSome(outerDsp)) {
        dispose(outerDsp.value);
        outerDsp = O.none;
      }
    });

    sinks.set(snk, dsp);

    if (O.isNone(outerDsp)) {
      outerDsp = O.some(ua(
        sink(
          (value) => {
            last = O.some(value);
            sinks.forEach((_, s) => s.event(value));
          },
          (reason) => {
            outerDsp = O.none;
            sinks.forEach((_, s) => s.end(reason));
            sinks.clear();
          },
        ),
        env,
      ));
    }

    if (O.isSome(last)) {
      snk.event(last.value);
    }

    return dsp;
  };
}

export function withLatest<A2, R2>(
  second: Stream<A2, R2>,
): <A1, R1>(first: Stream<A1, R1>) => Stream<[A1, A2], R1 & R2> {
  return (first) => (snk, env) => {
    let latest: Option<A2> = O.none;
    let open = true;
    const close = () => open = false;
    let secondOpen = true;
    const closeSecond = () => secondOpen = false;

    const dspSecond = second(
      sink((value) => latest = O.some(value), closeSecond),
      env,
    );

    const dspFirst = first(
      sink(
        (value) => O.isSome(latest) ? snk.event([value, latest.value]) : null,
        (reason) => {
          close();
          snk.end(reason);
          if (secondOpen) {
            closeSecond();
            dispose(dspSecond);
          }
        },
      ),
      env,
    );

    return disposable(() => {
      if (open) {
        close();
        dispose(dspFirst);
      }
      if (secondOpen) {
        closeSecond();
        dispose(dspSecond);
      }
    });
  };
}

export function distinct<A, R>(
  compare: (first: A, second: A) => boolean = (f, s) => f === s,
): (ua: Stream<A, R>) => Stream<A, R> {
  return (ua) => (snk, env) => {
    let last: Option<A> = O.none;
    const event = (value: A) => {
      last = O.some(value);
      snk.event(value);
    };
    return ua(
      sink(
        (value) => {
          if (O.isNone(last) || !compare(last.value, value)) {
            event(value);
          }
        },
        snk.end,
      ),
      env,
    );
  };
}

/**
 * Creates an adapter for creating streams and dispatching values to them.
 *
 * @returns An array containing a function to dispatch values and a corresponding stream.
 *
 * @since 2.2.0
 */
export function createAdapter<A>(): [
  (value: A) => void,
  Stream<A>,
] {
  const dispatcher = { dispatch: (_: A) => {} };
  const dispatch = (a: A) => dispatcher.dispatch(a);
  return [
    dispatch,
    pipe(
      stream<A>((snk) => {
        dispatcher.dispatch = snk.event;
        return disposable(() => dispatcher.dispatch = NOOP);
      }),
      multicast({}),
    ),
  ];
}

/**
 * The canonical implementation of Wrappable for Stream.
 *
 * @since 2.0.0
 */
export const WrappableStream: Wrappable<KindStream> = { wrap };

/**
 * The canonical implementation of Mappable for Stream.
 *
 * @since 2.0.0
 */
export const MappableStream: Mappable<KindStream> = { map };

/**
 * The canonical implementation of Applicable for Stream.
 *
 * @since 2.0.0
 */
export const ApplicableStream: Applicable<KindStream> = { apply, map, wrap };

/**
 * The canonical implementation of Flatmappable for Stream.
 *
 * @since 2.0.0
 */
export const FlatmappableStream: Flatmappable<KindStream> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * The canonical implementation of Timeout for Stream Environments.
 *
 * @since 2.0.0
 */
export const TimeoutEnv: Timeout = { setTimeout, clearTimeout };

/**
 * The canonical implementation of Interval for Stream Environments.
 *
 * @since 2.0.0
 */
export const IntervalEnv: Interval = { setInterval, clearInterval };

export const DefaultEnv: Interval & Timeout = { ...TimeoutEnv, ...IntervalEnv };

export const tap: Tap<KindStream> = createTap(FlatmappableStream);

export const bind: Bind<KindStream> = createBind(FlatmappableStream);

export const bindTo: BindTo<KindStream> = createBindTo(MappableStream);
