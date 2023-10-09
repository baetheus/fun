/**
 * This file contains the AsyncIterable algebraic data type. AsyncIterable is
 * the generic type for javascripts built in AsyncIterator type.
 *
 * @module AsyncIterable
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Wrappable } from "./wrappable.ts";
import type { Filterable } from "./filterable.ts";
import type { Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Either } from "./either.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { isLeft, isRight } from "./either.ts";
import { isSome } from "./option.ts";
import { wait } from "./promise.ts";

/**
 * @since 2.0.0
 */
export interface KindAsyncIterable extends Kind {
  readonly kind: AsyncIterable<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function asyncIterable<A>(
  fa: () => AsyncIterator<A>,
): AsyncIterable<A> {
  return { [Symbol.asyncIterator]: fa };
}

/**
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
 * @since 2.0.0
 */
export function wrap<A>(a: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield a;
  });
}

/**
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
    onDone();
  };
}

/**
 * @since 2.0.0
 */
export function delay(
  ms: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return map((a) => wait(ms).then(() => a));
}

/**
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
 * @since 2.0.0
 */
export async function collect<A>(
  ta: AsyncIterable<A>,
): Promise<ReadonlyArray<A>> {
  const result = new Array<A>();
  for await (const a of ta) {
    result.push(a);
  }
  return result;
}

/**
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
 * @since 2.0.0
 */
export function takeWhile<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return takeUntil((a) => !predicate(a));
}

/**
 * @since 2.0.0
 */
export function scan<A, O>(
  foldr: (accumulator: O, value: A, index: number) => O,
  initial: O,
): (ta: AsyncIterable<A>) => AsyncIterable<O> {
  return (ta) =>
    asyncIterable(async function* () {
      let result = initial;
      let index = 0;
      for await (const a of ta) {
        result = foldr(result, a, index++);
        yield result;
      }
    });
}

/**
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
export const tap = createTap(FlatmappableAsyncIterable);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableAsyncIterable);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableAsyncIterable);
