import type { Filterable } from "./filterable.ts";
import type { Option } from "./option.ts";
import type { Kind, Out } from "./kind.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Either } from "./either.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

import { isLeft, isRight } from "./either.ts";
import { isSome } from "./option.ts";
import { wait } from "./promise.ts";

export interface KindAsyncIterable extends Kind {
  readonly kind: AsyncIterable<Out<this, 0>>;
}

export function asyncIterable<A>(
  fa: () => AsyncIterator<A>,
): AsyncIterable<A> {
  return { [Symbol.asyncIterator]: fa };
}

export function fromIterable<A>(ta: Iterable<A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    for (const a of ta) {
      yield a;
    }
  });
}

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

export function wrap<A>(a: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield a;
  });
}

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

export function delay(
  ms: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return map((a) => wait(ms).then(() => a));
}

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

export async function collect<A>(
  ta: AsyncIterable<A>,
): Promise<ReadonlyArray<A>> {
  const result = new Array<A>();
  for await (const a of ta) {
    result.push(a);
  }
  return result;
}

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

export function takeWhile<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return takeUntil((a) => !predicate(a));
}

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

export function tap<A>(
  fa: (a: A) => void,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    asyncIterable(async function* () {
      for await (const a of ta) {
        fa(a);
        yield a;
      }
    });
}

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

export const FlatmappableAsyncIterable: Flatmappable<KindAsyncIterable> = {
  apply,
  flatmap,
  map,
  wrap,
};

export const FilterableAsyncIterable: Filterable<KindAsyncIterable> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};
