/**
 * The Stream module includes construction and combinator functions for a push
 * stream datatype. Streams in fun are very close to the Streams of mostjs as
 * well as the Observables of rxjs, providing a powerful way to handle
 * asynchronous data flows and event streams.
 *
 * Streams provide a functional approach to handling sequences of events over time,
 * with built-in support for transformation, filtering, combination, and resource
 * management. They are particularly useful for handling user interactions,
 * network requests, and other asynchronous operations.
 *
 * **Key Invariants:**
 * 1. **Lazy by default**: Streams will not start collecting or emitting events
 *    until they are explicitly run
 * 2. **Sink-based consumption**: A stream must be connected to a sink for events
 *    to be consumed. A sink is an object with methods for accepting events and
 *    handling stream completion
 * 3. **Disposable resources**: When a stream is run, it returns a Disposable
 *    which can be used to cancel the operation early and clean up resources
 * 4. **Completion guarantee**: Once started, a stream must call end when it
 *    completes, unless it has been disposed
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
 * The canonical implementation of Timeout for Stream Environments.
 * Provides the standard setTimeout and clearTimeout functions.
 *
 * @since 2.0.0
 */
export const TimeoutEnv: Timeout = { setTimeout, clearTimeout };

/**
 * The canonical implementation of Interval for Stream Environments.
 * Provides the standard setInterval and clearInterval functions.
 *
 * @since 2.0.0
 */
export const IntervalEnv: Interval = { setInterval, clearInterval };

/**
 * The default environment for streams, combining both timeout and interval capabilities.
 * This is used when no specific environment is provided to stream functions.
 *
 * @since 2.0.0
 */
export const DefaultEnv: Interval & Timeout = { ...TimeoutEnv, ...IntervalEnv };

/**
 * Represents a disposable resource that can be cleaned up.
 * This type uses the Symbol.dispose pattern for automatic resource management.
 *
 * @since 2.2.0
 */
export interface Disposable {
  [Symbol.dispose](): void;
}

/**
 * Represents a sink for receiving values emitted by a stream.
 * A sink is an object with methods for handling stream events and completion.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const sink = S.sink(
 *   (value: number) => console.log(`Received: ${value}`),
 *   (reason) => console.log(`Stream ended: ${reason}`)
 * );
 * ```
 *
 * @since 2.2.0
 */
export type Sink<A> = {
  readonly event: (value: A) => void;
  readonly end: (reason?: unknown) => void;
};

/**
 * Represents a stream that emits values of type `A` and requires an environment `R`.
 * A stream is a function that takes a sink and environment, and returns a disposable
 * for resource cleanup.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const numberStream: S.Stream<number> = S.wrap(42);
 * const disposable = S.run()(numberStream);
 * // Stream emits 42 and ends
 * S.dispose(disposable);
 * ```
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
 * This is useful for type-erased stream operations.
 *
 * @since 2.2.0
 */
// deno-lint-ignore no-explicit-any
export type AnyStream = Stream<any, any>;

/**
 * Extracts the value type from a stream type.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * type MyStream = S.Stream<number>;
 * type ValueType = S.TypeOf<MyStream>; // number
 * ```
 *
 * @since 2.2.0
 */
export type TypeOf<U> = U extends Stream<infer A, infer _> ? A : never;

/**
 * Extracts the environment type from a stream type.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * type MyStream = S.Stream<number, { timeout: number }>;
 * type EnvType = S.EnvOf<MyStream>; // { timeout: number }
 * ```
 *
 * @since 2.2.0
 */
export type EnvOf<U> = U extends Stream<infer _, infer R> ? R : never;

/**
 * Represents a timeout object with `setTimeout` and `clearTimeout` methods.
 * This is used as part of the default environment for streams that need
 * timing capabilities.
 *
 * @since 2.2.0
 */
export type Timeout = {
  readonly setTimeout: typeof setTimeout;
  readonly clearTimeout: typeof clearTimeout;
};

/**
 * Represents an interval object with `setInterval` and `clearInterval` methods.
 * This is used as part of the default environment for streams that need
 * periodic timing capabilities.
 *
 * @since 2.2.0
 */
export type Interval = {
  readonly setInterval: typeof setInterval;
  readonly clearInterval: typeof clearInterval;
};

/**
 * The default environment for streams, providing both timeout and interval
 * capabilities. This is used when no specific environment is provided.
 *
 * @since 2.2.0
 */
export type DefaultEnv = Timeout & Interval;

/**
 * Creates a disposable resource with a dispose function. The resource can be disposed of
 * by calling the `dispose` method. If `dispose` is called more than once, an error will be thrown.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * let cleanedUp = false;
 * const disposable = S.disposable(() => {
 *   cleanedUp = true;
 * });
 *
 * S.dispose(disposable);
 * console.log(cleanedUp); // true
 * ```
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
 * This is a utility function for manually disposing of resources.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const disposable = S.disposable(() => console.log("Cleaned up"));
 * S.dispose(disposable); // Logs: "Cleaned up"
 * ```
 *
 * @since 2.2.0
 */
export function dispose(disposable: Disposable): void {
  return disposable[Symbol.dispose]();
}

/**
 * Creates a `Disposable` that does nothing when disposed.
 * This is useful as a default or placeholder disposable.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const noOp = S.disposeNone();
 * S.dispose(noOp); // Does nothing
 * ```
 *
 * @since 2.0.0
 */
export function disposeNone(): Disposable {
  return disposable(() => {});
}

/**
 * Creates a sink with event and end handlers.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const sink = S.sink(
 *   (value: number) => console.log(`Event: ${value}`),
 *   (reason) => console.log(`End: ${reason}`)
 * );
 *
 * sink.event(42); // Logs: "Event: 42"
 * sink.end("completed"); // Logs: "End: completed"
 * ```
 *
 * @since 2.2.0
 */
export function sink<A>(
  event: (value: A) => void,
  end: (reason?: unknown) => void,
): Sink<A> {
  return { event, end };
}

/**
 * Creates a sink that does nothing when receiving events or ends.
 * This is useful as a default sink when you don't need to handle events.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const emptySink = S.emptySink();
 * emptySink.event("anything"); // Does nothing
 * emptySink.end("reason"); // Does nothing
 * ```
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
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const numberStream = S.stream<number>((sink, env) => {
 *   sink.event(1);
 *   sink.event(2);
 *   sink.event(3);
 *   sink.end();
 *
 *   return S.disposable(() => {
 *     console.log("Stream cleaned up");
 *   });
 * });
 *
 * const disposable = S.run()(numberStream);
 * // Stream emits: 1, 2, 3, then ends
 * S.dispose(disposable); // Logs: "Stream cleaned up"
 * ```
 *
 * @since 2.2.0
 */
export function stream<A, R = unknown>(
  run: (sink: Sink<A>, env: R) => Disposable,
): Stream<A, R> {
  return run;
}

/**
 * Runs a stream until completion, returning a disposable to stop the stream
 * early. This function has multiple overloads to support different use cases.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const numberStream = S.wrap(42);
 *
 * // Using default environment and empty sink
 * const disposable1 = S.run()(numberStream);
 * S.dispose(disposable1);
 *
 * // Using custom environment
 * const customEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const disposable2 = S.run(customEnv)(numberStream);
 * S.dispose(disposable2);
 *
 * // Using custom sink and environment
 * const sink = S.sink(
 *   (value) => console.log(`Received: ${value}`),
 *   (reason) => console.log(`Ended: ${reason}`)
 * );
 * const disposable3 = S.run(customEnv, sink)(numberStream);
 * S.dispose(disposable3);
 * ```
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
 * This is useful for converting streams to promises for async/await usage.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const numberStream = S.wrap(42);
 *
 * // Using default environment
 * const promise1 = S.runPromise()(numberStream);
 * await promise1; // Resolves when stream ends
 *
 * // Using custom environment
 * const customEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const promise2 = S.runPromise(customEnv)(numberStream);
 * await promise2; // Resolves when stream ends
 * ```
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
 * onEnd when the stream ends. This provides a convenient way to handle stream
 * events with callback functions.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const numberStream = S.wrap(42);
 *
 * // Using default environment
 * const disposable1 = S.forEach(
 *   (value) => console.log(`Event: ${value}`),
 *   (reason) => console.log(`End: ${reason}`)
 * )(numberStream);
 * S.dispose(disposable1);
 *
 * // Using custom environment
 * const customEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const disposable2 = S.forEach(
 *   (value) => console.log(`Event: ${value}`),
 *   (reason) => console.log(`End: ${reason}`),
 *   customEnv
 * )(numberStream);
 * S.dispose(disposable2);
 * ```
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
 * Runs a stream, collecting any events into an array, then returning the array
 * once the stream ends. This is useful for converting streams to arrays.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5]);
 *
 * // Using default environment
 * const array1 = await pipe(numberStream, S.collect());
 * console.log(array1); // [1, 2, 3, 4, 5]
 *
 * // Using custom environment
 * const customEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const array2 = await pipe(numberStream, S.collect(customEnv));
 * console.log(array2); // [1, 2, 3, 4, 5]
 * ```
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
 * This is useful as a default or placeholder stream.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const emptyStream = S.empty<number>();
 * const disposable = S.run()(emptyStream);
 * // Stream ends immediately without emitting any events
 * S.dispose(disposable);
 * ```
 *
 * @since 2.2.0
 */
export function empty<A = never, R = unknown>(): Stream<A, R> {
  return EMPTY;
}

/**
 * Creates a `Stream` that never emits any events and never ends.
 * This is useful for representing infinite streams or as a placeholder
 * for streams that should never complete.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const neverStream = S.never<number>();
 * const disposable = S.run()(neverStream);
 * // Stream never emits events or ends
 * // You must manually dispose to stop it
 * S.dispose(disposable);
 * ```
 *
 * @since 2.2.0
 */
export function never<A = never, R = unknown>(): Stream<A, R> {
  return stream(() => disposable(NOOP));
}

/**
 * Creates a `Stream` that emits a single event when the provided promise resolves, and then ends.
 * This is useful for converting promises to streams.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const promise = Promise.resolve("Hello World");
 * const stream = S.fromPromise(promise);
 *
 * const result = await pipe(stream, S.collect());
 * console.log(result); // ["Hello World"]
 * ```
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
 * This is useful for converting arrays, sets, or other iterables to streams.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const array = [1, 2, 3, 4, 5];
 * const stream = S.fromIterable(array);
 *
 * const result = await pipe(stream, S.collect());
 * console.log(result); // [1, 2, 3, 4, 5]
 * ```
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
 * This requires a Timeout environment to function properly.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const timeoutEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const delayedStream = S.at(1000); // 1 second delay
 *
 * const result = await pipe(delayedStream, S.collect());
 * console.log(result); // [1000]
 * ```
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
 * This requires an Interval environment to function properly.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const intervalEnv = { setTimeout, clearTimeout, setInterval, clearInterval };
 * const periodicStream = S.periodic(1000); // Every 1 second
 *
 * const result = await pipe(periodicStream, S.collect());
 * console.log(result); // [1000, 2000, 3000, ...] (until stopped)
 * ```
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
 * This is useful for concatenating streams sequentially.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stream1 = S.fromIterable([1, 2, 3]);
 * const stream2 = S.fromIterable([4, 5, 6]);
 *
 * const combined = S.combine(stream2)(stream1);
 * const result = await pipe(combined, S.collect());
 * console.log(result); // [1, 2, 3, 4, 5, 6]
 * ```
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
 * This is one of the most fundamental stream transformations.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const stringStream = pipe(
 *   numberStream,
 *   S.map(n => `Number: ${n}`)
 * );
 *
 * const strings = await pipe(stringStream, S.collect()); // ["Number: 1", "Number: 2", "Number: 3", "Number: 4", "Number: 5"]
 * ```
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
 * This is useful for creating streams from individual values.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const wrappedStream = S.wrap("Hello World");
 * const result = await pipe(wrappedStream, S.collect());
 * console.log(result); // ["Hello World"]
 * ```
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
 * This is useful for filtering out unwanted values from a stream.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const evenStream = pipe(
 *   numberStream,
 *   S.filter(n => n % 2 === 0)
 * );
 *
 * const evens = await pipe(evenStream, S.collect()); // [2, 4, 6, 8, 10]
 * ```
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
 * This is more efficient than chaining filter and map operations separately.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stringStream = S.fromIterable(["1", "2", "abc", "3", "def", "4"]);
 * const numberStream = pipe(
 *   stringStream,
 *   S.filterMap((str: string) => {
 *     const num = parseInt(str);
 *     return isNaN(num) ? O.none : O.some(num);
 *   })
 * );
 *
 * const numbers = await pipe(numberStream, S.collect()); // [1, 2, 3, 4]
 * ```
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
 * a Pair<Stream<A>, Stream<B>>. This is useful for separating a stream into two
 * streams based on a condition.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const partitioned = pipe(
 *   numberStream,
 *   S.partition(n => n % 2 === 0)
 * );
 *
 * // Get even and odd streams
 * const evenStream = P.getFirst(partitioned);
 * const oddStream = P.getSecond(partitioned);
 *
 * const evens = await pipe(evenStream, S.collect()); // [2, 4, 6, 8, 10]
 * const odds = await pipe(oddStream, S.collect()); // [1, 3, 5, 7, 9]
 * ```
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
 * This is useful when you want to both transform and separate values based on
 * the transformation result.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import * as E from "./either.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const source = S.fromIterable(["1", "2", "abc", "3", "def", "4"]);
 * const partitioned = pipe(
 *   source,
 *   S.partitionMap((str: string) => {
 *     const num = parseInt(str);
 *     return isNaN(num) ? E.left(str) : E.right(num);
 *   })
 * );
 *
 * // Get success and error streams
 * const numberStream = P.getFirst(partitioned); // numbers
 * const stringStream = P.getSecond(partitioned);   // strings
 *
 * const numbers = await pipe(numberStream, S.collect()); // [1, 2, 3, 4]
 * const strings = await pipe(stringStream, S.collect()); // ["abc", "def"]
 * ```
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
 * This is useful for maintaining state across stream events.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const runningTotalStream = pipe(
 *   numberStream,
 *   S.loop(
 *     (sum, value) => [sum + value, sum + value], // [newState, output]
 *     0 // initial state
 *   )
 * );
 *
 * const runningTotal = await pipe(runningTotalStream, S.collect()); // [1, 3, 6, 10, 15]
 * ```
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
 * This is similar to `loop` but emits the accumulated state rather than a separate output value.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const accumulatedStream = pipe(
 *   numberStream,
 *   S.scan((sum, value) => sum + value, 0)
 * );
 *
 * const accumulated = await pipe(accumulatedStream, S.collect()); // [1, 3, 6, 10, 15]
 * ```
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
 * **Strategies:**
 * - **Hold Strategy**: This strategy keeps an ordered queue of streams to pull from
 *   when running inner streams end. This strategy has no loss of data.
 * - **Swap Strategy**: This strategy will dispose the oldest running inner stream
 *   when a new stream arrives to make space for the newest stream. In this
 *   strategy the oldest streams are where we lose data.
 * - **Drop Strategy**: This strategy will ignore any new streams once concurrency
 *   is maxed. In this strategy newest streams are where we lose data.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stream1 = S.fromIterable([1, 2, 3]);
 * const stream2 = S.fromIterable([4, 5, 6]);
 * const stream3 = S.fromIterable([7, 8, 9]);
 *
 * const streamOfStreams = S.fromIterable([stream1, stream2, stream3]);
 * const joinedStream = pipe(
 *   streamOfStreams,
 *   S.join(2, "hold") // Max 2 concurrent streams, hold strategy
 * );
 *
 * const joined = await pipe(joinedStream, S.collect()); // [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * ```
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
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = pipe(S.periodic(100), S.take(3));
 * const flattenedStream = pipe(
 *   numberStream,
 *   S.flatmap(n => pipe(S.periodic(40), S.map(m => [n, m]), S.take(3)))
 * );
 *
 * const result = await pipe(flattenedStream, S.collect());
 * // [[100, 40], [100, 80], [100, 120], [200, 40], [200, 80], [200, 120], [300, 40], [300, 80], [300, 120]]
 * ```
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

/**
 * Creates a stream that switches to a new inner stream whenever a new value
 * arrives from the outer stream, disposing of the previous inner stream.
 * This is useful for scenarios where you only want the latest stream's values.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const triggerStream = S.fromIterable([1, 2, 3]);
 * const switchedStream = pipe(
 *   triggerStream,
 *   S.switchmap(n => S.periodic(100)) // Switch to new periodic stream for each trigger
 * );
 *
 * const switched = await pipe(switchedStream, S.collect()); // [1, 2, 3]
 * ```
 *
 * @since 2.2.0
 */
export function switchmap<A, I, R2>(
  faui: (a: A) => Stream<I, R2>,
  concurrency = 1,
): <R1>(ua: Stream<A, R1>) => Stream<I, R1 & R2> {
  return <R1>(ua: Stream<A, R1>): Stream<I, R1 & R2> =>
    pipe(ua, map(faui), join(concurrency, "swap"));
}

/**
 * Creates a stream that exhausts each inner stream before moving to the next one.
 * New values from the outer stream are ignored while an inner stream is running.
 * This is useful when you want to process streams sequentially.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const triggerStream = pipe(S.periodic(100), S.take(3));
 * const exhaustedStream = pipe(
 *   triggerStream,
 *   S.exhaustmap(n => pipe(S.periodic(40), S.map(m => [n, m]), S.take(3)))
 * );
 *
 * const exhausted = await pipe(exhaustedStream, S.collect()); // [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]]
 * ```
 *
 * @since 2.2.0
 */
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
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const valueStream = S.fromIterable([1, 2, 3]);
 * const functionStream = S.wrap((x: number) => x * 2);
 *
 * const appliedStream = pipe(
 *   functionStream,
 *   S.apply(valueStream)
 * );
 *
 * const applied = await pipe(appliedStream, S.collect()); // [2, 4, 6]
 * ```
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
 * This is useful for adding metadata to stream values.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stringStream = S.fromIterable(["a", "b", "c"]);
 * const indexedStream = pipe(
 *   stringStream,
 *   S.indexed(
 *     (index) => [index, index + 1], // [currentIndex, nextIndex]
 *     0 // start index
 *   )
 * );
 *
 * const indexed = await pipe(indexedStream, S.collect()); // [[0, "a"], [1, "b"], [2, "c"]]
 * ```
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
 * This is a simpler version of `indexed` that uses numeric indices.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stringStream = S.fromIterable(["a", "b", "c"]);
 * const withIndexStream = pipe(
 *   stringStream,
 *   S.withIndex(0, 1) // start at 0, increment by 1
 * );
 *
 * const index = await pipe(withIndexStream, S.collect()); // [[0, "a"], [1, "b"], [2, "c"]]
 * ```
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
 * This is useful for counting stream events.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stringStream = S.fromIterable(["a", "b", "c"]);
 * const withCountStream = S.withCount(stringStream);
 *
 * const count = await pipe(withCountStream, S.collect()); // [[1, "a"], [2, "b"], [3, "c"]]
 * ```
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
 * This is useful for tracking stream event counts.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const countStream = S.count(numberStream);
 *
 * const result = await pipe(countStream, S.collect());
 * console.log(result); // [1, 2, 3, 4, 5]
 * ```
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
 * This is useful for limiting stream output based on a condition.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const untilStream = pipe(
 *   numberStream,
 *   S.takeUntil(n => n > 5)
 * );
 *
 * const result = await pipe(untilStream, S.collect());
 * console.log(result); // [1, 2, 3, 4, 5, 6]
 * ```
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
 * This is useful for limiting the number of events from a stream.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const limitedStream = pipe(
 *   numberStream,
 *   S.take(3)
 * );
 *
 * const result = await pipe(limitedStream, S.collect());
 * console.log(result); // [1, 2, 3]
 * ```
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
 * This is useful for generating numeric sequences.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const rangeStream = S.range(5, 10, 2); // 5 values, starting at 10, step by 2
 * const result = await pipe(rangeStream, S.collect());
 * console.log(result); // [10, 12, 14, 16, 18]
 * ```
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
 * This is useful for replaying stream events multiple times.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 2, 3]);
 * const repeatedStream = pipe(
 *   numberStream,
 *   S.repeat(2) // repeat 2 times
 * );
 *
 * const result = await pipe(repeatedStream, S.collect());
 * console.log(result); // [1, 2, 3, 1, 2, 3, 1, 2, 3]
 * ```
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
 * This is useful for broadcasting a single stream to multiple consumers.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sourceStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const sharedStream = pipe(
 *   sourceStream,
 *   S.multicast(S.DefaultEnv)
 * );
 *
 * const shared = await pipe(sharedStream, S.collect()); // [1, 2, 3, 4, 5]
 * const shared2 = await pipe(sharedStream, S.collect()); // [1, 2, 3, 4, 5]
 * ```
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
 * This is useful for caching stream events and replaying them to new subscribers.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const sourceStream = S.fromIterable([1, 2, 3, 4, 5]);
 * const heldStream = S.hold(sourceStream);
 *
 * // First consumer gets all events
 * const disposable1 = S.forEach(
 *   (value) => console.log(`Consumer 1: ${value}`),
 *   () => console.log("Consumer 1 ended")
 * )(heldStream);
 *
 * // Second consumer gets all events (including past ones)
 * const disposable2 = S.forEach(
 *   (value) => console.log(`Consumer 2: ${value}`),
 *   () => console.log("Consumer 2 ended")
 * )(heldStream);
 *
 * // Both consumers receive all events, even if they subscribe after events have been emitted
 * S.dispose(disposable1);
 * S.dispose(disposable2);
 * ```
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

/**
 * Creates a new stream by combining each value from the first stream with the latest value from the second stream.
 * This is useful for combining streams where you only care about the most recent value from the second stream.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const valueStream = pipe(
 *    S.wrap(1),
 *    S.combine(pipe(S.at(200), S.map(() => 2)))
 * );
 * const configStream = pipe(
 *    S.fromIterable(["A", "B"]),
 *    S.flatmap((config: string) => pipe(S.at(100), S.map(() => config)))
 * );
 *
 * const combinedStream = pipe(
 *   valueStream,
 *   S.withLatest(configStream)
 * );
 *
 * const combined = await pipe(combinedStream, S.collect()); // [[1, "A"], [2, "B"]]
 * ```
 *
 * @since 2.2.0
 */
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

/**
 * Creates a new stream that only emits values that are different from the previous value.
 * This is useful for removing consecutive duplicate values from a stream.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberStream = S.fromIterable([1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4]);
 * const distinctStream = pipe(
 *   numberStream,
 *   S.distinct()
 * );
 *
 * const distinct = await pipe(distinctStream, S.collect()); // [1, 2, 3, 4]
 * ```
 *
 * @since 2.2.0
 */
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
 * This is useful for creating streams that can be controlled externally.
 *
 * @example
 * ```ts
 * import * as S from "./stream.ts";
 *
 * const [dispatch, stream] = S.createAdapter<number>();
 *
 * const disposable = S.forEach(
 *   (value) => console.log(`Dispatched: ${value}`),
 *   () => console.log("Stream ended")
 * )(stream);
 *
 * // Dispatch values to the stream
 * dispatch(1); // Logs: "Dispatched: 1"
 * dispatch(2); // Logs: "Dispatched: 2"
 * dispatch(3); // Logs: "Dispatched: 3"
 *
 * S.dispose(disposable);
 * ```
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
 * Provides the `wrap` function for wrapping values into streams.
 *
 * @since 2.0.0
 */
export const WrappableStream: Wrappable<KindStream> = { wrap };

/**
 * The canonical implementation of Mappable for Stream.
 * Provides the `map` function for transforming stream values.
 *
 * @since 2.0.0
 */
export const MappableStream: Mappable<KindStream> = { map };

/**
 * The canonical implementation of Applicable for Stream.
 * Provides the `apply`, `map`, and `wrap` functions for applying functions to streams.
 *
 * @since 2.0.0
 */
export const ApplicableStream: Applicable<KindStream> = { apply, map, wrap };

/**
 * The canonical implementation of Flatmappable for Stream.
 * Provides the `apply`, `flatmap`, `map`, and `wrap` functions for flatmapping streams.
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
 * The canonical implementation of Tap for Stream.
 * Provides the `tap` function for performing side effects on stream values.
 *
 * @since 2.0.0
 */
export const tap: Tap<KindStream> = createTap(FlatmappableStream);

/**
 * The canonical implementation of Bind for Stream.
 * Provides the `bind` function for chaining stream operations.
 *
 * @since 2.0.0
 */
export const bind: Bind<KindStream> = createBind(FlatmappableStream);

/**
 * The canonical implementation of BindTo for Stream.
 * Provides the `bindTo` function for binding stream values to names.
 *
 * @since 2.0.0
 */
export const bindTo: BindTo<KindStream> = createBindTo(MappableStream);
