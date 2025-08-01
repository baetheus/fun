/**
 * This file contains the AsyncIterable algebraic data type. AsyncIterable is
 * the generic type for javascripts built in AsyncIterator type.
 *
 * @module AsyncIterable
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Wrappable } from "./wrappable.ts";

import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { isLeft, isRight } from "./either.ts";
import { isSome } from "./option.ts";
import { wait } from "./promise.ts";

/**
 * Specifies AsyncIterable as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindAsyncIterable extends Kind {
  readonly kind: AsyncIterable<Out<this, 0>>;
}

/**
 * Create an AsyncIterable from an AsyncIterator factory function.
 *
 * @example
 * ```ts
 * import { asyncIterable } from "./async_iterable.ts";
 *
 * const asyncIter = asyncIterable(async function* () {
 *   yield 1;
 *   yield 2;
 *   yield 3;
 * });
 *
 * for await (const value of asyncIter) {
 *   console.log(value); // 1, 2, 3
 * }
 * ```
 *
 * @since 2.0.0
 */
export function asyncIterable<A>(
  fa: () => AsyncIterator<A>,
): AsyncIterable<A> {
  return { [Symbol.asyncIterator]: fa };
}

/**
 * Convert a synchronous Iterable to an AsyncIterable.
 *
 * @example
 * ```ts
 * import { fromIterable } from "./async_iterable.ts";
 *
 * const syncArray = [1, 2, 3, 4, 5];
 * const asyncIter = fromIterable(syncArray);
 *
 * for await (const value of asyncIter) {
 *   console.log(value); // 1, 2, 3, 4, 5
 * }
 * ```
 *
 * @since 2.0.0
 */
export function fromIterable<A>(ta: Iterable<A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    for (const a of ta) {
      yield a;
    }
  });
}

/**
 * Create an AsyncIterable from a Promise that resolves to a single value.
 *
 * @example
 * ```ts
 * import { fromPromise } from "./async_iterable.ts";
 *
 * const promise = Promise.resolve("Hello");
 * const asyncIter = fromPromise(promise);
 *
 * for await (const value of asyncIter) {
 *   console.log(value); // "Hello"
 * }
 * ```
 *
 * @since 2.2.0
 */
export function fromPromise<A>(ua: Promise<A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield await ua;
  });
}

/**
 * Create an AsyncIterable that yields numbers in a range.
 *
 * @example
 * ```ts
 * import { range } from "./async_iterable.ts";
 *
 * const numberRange = range(5, 1, 2); // yields 1, 3, 5, 7, 9
 *
 * for await (const value of numberRange) {
 *   console.log(value); // 1, 3, 5, 7, 9
 * }
 * ```
 *
 * @since 2.0.0
 */
export function range(
  count: number = Number.POSITIVE_INFINITY,
  start = 0,
  step = 1,
): AsyncIterable<number> {
  return asyncIterable(async function* () {
    let index = Math.floor(count);
    let value = start;
    while (index > 0) {
      yield value;
      index--;
      value += step;
    }
  });
}

/**
 * Transform an AsyncIterable using a stateful stepper function.
 *
 * @example
 * ```ts
 * import { loop, collect } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * const runningSum = loop(
 *   (sum: number, value: number) => [sum + value, sum + value],
 *   0
 * );
 *
 * const result = await pipe(
 *   numbers,
 *   runningSum,
 *   collect
 * );
 *
 * console.log(result); // [1, 3, 6, 10, 15]
 * ```
 *
 * @since 2.0.0
 */
export function loop<A, B, S>(
  stepper: (state: S, value: A) => [S, B],
  seed: S,
): (ua: AsyncIterable<A>) => AsyncIterable<B> {
  return (ua) =>
    asyncIterable(async function* () {
      let hold: S = seed;
      for await (const a of ua) {
        const [next, value] = stepper(hold, a);
        hold = next;
        yield value;
      }
    });
}

/**
 * Create a clone of an AsyncIterable that can be consumed multiple times.
 *
 * @example
 * ```ts
 * import { clone } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 *
 * const original = fromIterable([1, 2, 3]);
 * const cloned = clone(original);
 *
 * // Both can be consumed independently
 * for await (const value of original) {
 *   console.log(value); // 1, 2, 3
 * }
 * for await (const value of cloned) {
 *   console.log(value); // 1, 2, 3
 * }
 * ```
 *
 * @since 2.0.0
 */
export function clone<A>(ta: AsyncIterable<A>): AsyncIterable<A> {
  const cache: Promise<IteratorResult<A>>[] = [];
  let iterator: AsyncIterator<A>;

  return asyncIterable(async function* () {
    if (iterator === undefined) {
      iterator = ta[Symbol.asyncIterator]();
    }

    let index = 0;

    while (true) {
      if (index === cache.length) {
        cache.push(iterator.next());
      } else {
        const { value, done } = await cache[index++];
        if (done) {
          break;
        }
        yield value;
      }
    }
  });
}

/**
 * Wrap a single value in an AsyncIterable.
 *
 * @example
 * ```ts
 * import { wrap } from "./async_iterable.ts";
 *
 * const singleValue = wrap("Hello");
 *
 * for await (const value of singleValue) {
 *   console.log(value); // "Hello"
 * }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield a;
  });
}

/**
 * Apply a function wrapped in an AsyncIterable to a value wrapped in an AsyncIterable.
 *
 * @example
 * ```ts
 * import { apply, collect } from "./async_iterable.ts";
 * import { wrap } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const asyncIterFn = wrap((n: number) => n * 2);
 * const asyncIterValue = wrap(5);
 *
 * const result = await pipe(
 *   asyncIterFn,
 *   apply(asyncIterValue),
 *   collect
 * );
 *
 * console.log(result); // [10]
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: AsyncIterable<A>,
): <I>(ufai: AsyncIterable<(a: A) => I>) => AsyncIterable<I> {
  return (ufai) =>
    asyncIterable(async function* () {
      for await (const fai of ufai) {
        for await (const a of ua) {
          yield fai(a);
        }
      }
    });
}

/**
 * Apply a function to each value in an AsyncIterable.
 *
 * @example
 * ```ts
 * import { map } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * const doubled = pipe(
 *   numbers,
 *   map(n => n * 2)
 * );
 *
 * for await (const value of doubled) {
 *   console.log(value); // 2, 4, 6, 8, 10
 * }
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I | PromiseLike<I>,
): (ta: AsyncIterable<A>) => AsyncIterable<I> {
  return (ta) =>
    asyncIterable(async function* () {
      for await (const a of ta) {
        yield await fai(a);
      }
    });
}

/**
 * Chain AsyncIterable computations together.
 *
 * @example
 * ```ts
 * import { flatmap } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3]);
 * const expanded = pipe(
 *   numbers,
 *   flatmap(n => fromIterable([n, n * 2]))
 * );
 *
 * for await (const value of expanded) {
 *   console.log(value); // 1, 2, 2, 4, 3, 6
 * }
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => AsyncIterable<I>,
): (ta: AsyncIterable<A>) => AsyncIterable<I> {
  return (ta) =>
    asyncIterable(async function* () {
      for await (const a of ta) {
        for await (const i of fati(a)) {
          yield i;
        }
      }
    });
}

/**
 * Execute side effects for each value in an AsyncIterable.
 *
 * @example
 * ```ts
 * import { forEach } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * await forEach(
 *   (n) => console.log(`Processing: ${n}`),
 *   () => console.log("Done!")
 * )(numbers);
 * ```
 *
 * @since 2.0.0
 */
export function forEach<A>(
  onValue: (a: A) => unknown | PromiseLike<unknown>,
  onDone: () => unknown | PromiseLike<unknown> = () => {},
): (ta: AsyncIterable<A>) => PromiseLike<void> {
  return async (ta) => {
    for await (const a of ta) {
      await onValue(a);
    }
    await onDone();
  };
}

/**
 * Add a delay between each value in an AsyncIterable.
 *
 * @example
 * ```ts
 * import { delay } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3]);
 * const delayed = pipe(
 *   numbers,
 *   delay(1000) // 1 second delay between each value
 * );
 *
 * for await (const value of delayed) {
 *   console.log(value); // 1 (after 1s), 2 (after 2s), 3 (after 3s)
 * }
 * ```
 *
 * @since 2.0.0
 */
export function delay(
  ms: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return map((a) => wait(ms).then(() => a));
}

/**
 * Filter values in an AsyncIterable based on a predicate.
 *
 * @example
 * ```ts
 * import { filter } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const evens = pipe(
 *   numbers,
 *   filter(n => n % 2 === 0)
 * );
 *
 * for await (const value of evens) {
 *   console.log(value); // 2, 4, 6, 8, 10
 * }
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: AsyncIterable<A>) => AsyncIterable<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: AsyncIterable<A>) => AsyncIterable<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    asyncIterable(async function* filter() {
      for await (const a of ta) {
        if (predicate(a)) {
          yield a;
        }
      }
    });
}

/**
 * Filter and map values in an AsyncIterable simultaneously.
 *
 * @example
 * ```ts
 * import { filterMap } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const strings = fromIterable(["1", "2", "abc", "3", "def"]);
 * const numbers = pipe(
 *   strings,
 *   filterMap(str => {
 *     const num = parseInt(str);
 *     return isNaN(num) ? O.none : O.some(num);
 *   })
 * );
 *
 * for await (const value of numbers) {
 *   console.log(value); // 1, 2, 3
 * }
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  predicate: (a: A) => Option<I>,
): (ua: AsyncIterable<A>) => AsyncIterable<I> {
  return (ua) =>
    asyncIterable(
      async function* filterMap() {
        for await (const a of ua) {
          const result = predicate(a);
          if (isSome(result)) {
            yield result.value;
          }
        }
      },
    );
}

/**
 * Partition an AsyncIterable into two based on a predicate.
 *
 * @example
 * ```ts
 * import { partition } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const [evens, odds] = pipe(
 *   numbers,
 *   partition(n => n % 2 === 0)
 * );
 *
 * for await (const value of evens) {
 *   console.log(`Even: ${value}`); // Even: 2, Even: 4, Even: 6, Even: 8, Even: 10
 * }
 * for await (const value of odds) {
 *   console.log(`Odd: ${value}`); // Odd: 1, Odd: 3, Odd: 5, Odd: 7, Odd: 9
 * }
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: (a: A) => a is B,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<B>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<A>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      asyncIterable(async function* partitionFirst() {
        for await (const a of cloned) {
          if (predicate(a)) {
            yield a;
          }
        }
      }),
      asyncIterable(async function* partitionFirst() {
        for await (const a of cloned) {
          if (!predicate(a)) {
            yield a;
          }
        }
      }),
    ];
  };
}

/**
 * Partition and map an AsyncIterable based on an Either-returning function.
 *
 * @example
 * ```ts
 * import { partitionMap } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const strings = fromIterable(["1", "2", "abc", "3", "def"]);
 * const [numbers, errors] = pipe(
 *   strings,
 *   partitionMap(str => {
 *     const num = parseInt(str);
 *     return isNaN(num) ? E.left(str) : E.right(num);
 *   })
 * );
 *
 * for await (const value of numbers) {
 *   console.log(`Number: ${value}`); // Number: 1, Number: 2, Number: 3
 * }
 * for await (const value of errors) {
 *   console.log(`Error: ${value}`); // Error: abc, Error: def
 * }
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  predicate: (a: A) => Either<J, I>,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<I>, AsyncIterable<J>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      asyncIterable(async function* partitionFirst() {
        for await (const a of cloned) {
          const result = predicate(a);
          if (isRight(result)) {
            yield result.right;
          }
        }
      }),
      asyncIterable(async function* partitionSecond() {
        for await (const a of cloned) {
          const result = predicate(a);
          if (isLeft(result)) {
            yield result.left;
          }
        }
      }),
    ];
  };
}

/**
 * Fold over an AsyncIterable to produce a single value.
 *
 * @example
 * ```ts
 * import { fold } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * const sum = await pipe(
 *   numbers,
 *   fold((acc, value) => acc + value, 0)
 * );
 *
 * console.log(sum); // 15
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foldr: (value: O, accumulator: A, index: number) => O,
  initial: O,
): (ta: AsyncIterable<A>) => Promise<O> {
  return async (ta) => {
    let index = 0;
    let result = initial;
    for await (const value of ta) {
      result = foldr(result, value, index++);
    }
    return result;
  };
}

/**
 * Collect all values from an AsyncIterable into an array.
 *
 * @example
 * ```ts
 * import { collect } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * const array = await collect(numbers);
 *
 * console.log(array); // [1, 2, 3, 4, 5]
 * ```
 *
 * @since 2.0.0
 */
export async function collect<A>(
  ta: AsyncIterable<A>,
): Promise<ReadonlyArray<A>> {
  const result: A[] = [];
  for await (const a of ta) {
    result.push(a);
  }
  return result;
}

/**
 * Take values from an AsyncIterable until a predicate is true.
 *
 * @example
 * ```ts
 * import { takeUntil } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const result = pipe(
 *   numbers,
 *   takeUntil(n => n > 5)
 * );
 *
 * for await (const value of result) {
 *   console.log(value); // 1, 2, 3, 4, 5
 * }
 * ```
 *
 * @since 2.0.0
 */
export function takeUntil<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    asyncIterable(async function* () {
      for await (const a of ta) {
        if (predicate(a)) {
          return;
        }
        yield a;
      }
    });
}

/**
 * Take values from an AsyncIterable while a predicate is true.
 *
 * @example
 * ```ts
 * import { takeWhile } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const result = pipe(
 *   numbers,
 *   takeWhile(n => n <= 5)
 * );
 *
 * for await (const value of result) {
 *   console.log(value); // 1, 2, 3, 4, 5
 * }
 * ```
 *
 * @since 2.0.0
 */
export function takeWhile<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return takeUntil((a) => !predicate(a));
}

/**
 * Scan over an AsyncIterable, yielding intermediate results.
 *
 * @example
 * ```ts
 * import { scan } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5]);
 * const runningSum = pipe(
 *   numbers,
 *   scan((acc, value) => acc + value, 0)
 * );
 *
 * for await (const value of runningSum) {
 *   console.log(value); // 0, 1, 3, 6, 10, 15
 * }
 * ```
 *
 * @since 2.0.0
 */
export function scan<A, O>(
  scanner: (accumulator: O, value: A) => O,
  seed: O,
): (ta: AsyncIterable<A>) => AsyncIterable<O> {
  return loop((accumulator, value) => {
    const result = scanner(accumulator, value);
    return [result, result];
  }, seed);
}

/**
 * Repeat an AsyncIterable a specified number of times.
 *
 * @example
 * ```ts
 * import { repeat } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3]);
 * const repeated = pipe(
 *   numbers,
 *   repeat(3)
 * );
 *
 * for await (const value of repeated) {
 *   console.log(value); // 1, 2, 3, 1, 2, 3, 1, 2, 3
 * }
 * ```
 *
 * @since 2.0.0
 */
export function repeat(
  n: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return <A>(ta: AsyncIterable<A>) =>
    asyncIterable(async function* () {
      let index = n;
      while (index-- > 0) {
        for await (const a of ta) {
          yield a;
        }
      }
    });
}

/**
 * Take the first n values from an AsyncIterable.
 *
 * @example
 * ```ts
 * import { take } from "./async_iterable.ts";
 * import { fromIterable } from "./async_iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numbers = fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * const firstThree = pipe(
 *   numbers,
 *   take(3)
 * );
 *
 * for await (const value of firstThree) {
 *   console.log(value); // 1, 2, 3
 * }
 * ```
 *
 * @since 2.0.0
 */
export function take(n: number): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return <A>(ta: AsyncIterable<A>) =>
    asyncIterable(async function* () {
      let count = Math.floor(n);
      for await (const a of ta) {
        if (count-- <= 0) {
          return;
        }
        yield a;
      }
    });
}

/**
 * @since 2.0.0
 */
export const ApplicableAsyncIterable: Applicable<KindAsyncIterable> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableAsyncIterable: Mappable<KindAsyncIterable> = { map };

/**
 * @since 2.0.0
 */
export const FlatmappableAsyncIterable: Flatmappable<KindAsyncIterable> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FilterableAsyncIterable: Filterable<KindAsyncIterable> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * @since 2.0.0
 */
export const WrappableAsyncIterable: Wrappable<KindAsyncIterable> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindAsyncIterable> = createTap(FlatmappableAsyncIterable);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindAsyncIterable> = createBind(
  FlatmappableAsyncIterable,
);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindAsyncIterable> = createBindTo(
  MappableAsyncIterable,
);
