/**
 * This file contains the Iterable algebraic data type. Iterable is a lazy,
 * synchronous, and native structure defined by ecmascript. Generally, one
 * interacts with the Iterator structure directly, but the Iterable type, being
 * more generic, is a better target for functional. Any data structure that
 * implements Iterable (ie. Array, Map, Set, etc) can use the iterable methods
 * contained here if neeeded.
 *
 * Something to keep in mind here is that Iterables can have nasty edge cases
 * that don't exist for non-lazy data structures. Specifically, an iterable can
 * generate a theoretically infinite number of values, making the draining of an
 * iterable potentially impossible (trying it will cause the runtime to hang).
 * Additionally, many iterables are constructed using generators, which cannot
 * be easily cloned. This makes the process of chaining iterables a resource
 * intensive operation. As always, use these combinators with care.
 *
 * @module Iterable
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Wrappable } from "./wrappable.ts";

import { isSome } from "./option.ts";
import { isLeft, isRight } from "./either.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * @since 2.0.0
 */
export interface KindIterable extends Kind {
  readonly kind: Iterable<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function iterable<A>(
  fa: () => Iterator<A>,
): Iterable<A> {
  return { [Symbol.iterator]: fa };
}

/**
 * @since 2.0.0
 */
export function clone<A>(ta: Iterable<A>): Iterable<A> {
  const cache: IteratorResult<A>[] = [];
  let _iterator: Iterator<A>;

  return iterable(function* () {
    if (_iterator === undefined) {
      _iterator = ta[Symbol.iterator]();
    }

    let index = 0;

    while (true) {
      if (index === cache.length) {
        cache.push(_iterator.next());
      } else {
        const { value, done } = cache[index++];
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
export function range(
  count: number = Number.POSITIVE_INFINITY,
  start = 0,
  step = 1,
): Iterable<number> {
  return iterable(function* () {
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
export function wrap<A>(...a: A[]): Iterable<A> {
  return iterable(function* () {
    let index = -1;
    const length = a.length;
    while (++index < length) {
      yield a[index];
    }
  });
}

/**
 * @since 2.0.0
 */
export function apply<A>(
  ua: Iterable<A>,
): <I>(ufai: Iterable<(a: A) => I>) => Iterable<I> {
  return (ufai) =>
    iterable(function* () {
      for (const fai of ufai) {
        for (const a of ua) {
          yield fai(a);
        }
      }
    });
}

/**
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        yield fai(a);
      }
    });
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Iterable<I>,
): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        for (const i of fati(a)) {
          yield i;
        }
      }
    });
}

/**
 * @since 2.0.0
 */
export function forEach<A>(fa: (a: A) => void): (ta: Iterable<A>) => void {
  return (ta) => {
    for (const a of ta) {
      fa(a);
    }
  };
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foldr: (accumulator: O, value: A) => O,
  initial: O,
): (ua: Iterable<A>) => O {
  return (ua) => {
    let out = initial;
    for (const a of ua) {
      out = foldr(out, a);
    }
    return out;
  };
}

/**
 * @since 2.0.0
 */
export function scan<A, O>(
  foldr: (accumulator: O, value: A, index: number) => O,
  initial: O,
): (ta: Iterable<A>) => Iterable<O> {
  return (ta) =>
    iterable(function* () {
      let result = initial;
      let index = 0;
      for (const a of ta) {
        result = foldr(result, a, index++);
        yield result;
      }
    });
}

/**
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Iterable<A>) => Iterable<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: Iterable<A>) => Iterable<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Iterable<A>) => Iterable<A> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
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
): (ua: Iterable<A>) => Iterable<I> {
  return (ua) =>
    iterable(
      function* filterMap() {
        for (const a of ua) {
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
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<B>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<A>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      iterable(function* partitionFirst() {
        for (const a of cloned) {
          if (predicate(a)) {
            yield a;
          }
        }
      }),
      iterable(function* partitionSecond() {
        for (const a of cloned) {
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
): (ua: Iterable<A>) => Pair<Iterable<I>, Iterable<J>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      iterable(function* partitionFirst() {
        for (const a of cloned) {
          const result = predicate(a);
          if (isRight(result)) {
            yield result.right;
          }
        }
      }),
      iterable(function* partitionSecond() {
        for (const a of cloned) {
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
 * Collect all values of an iterable into an array. WARNING: If the iterable is
 * infinite then this will cause the program to hang indefinitely.
 *
 * @since 2.0.0
 */
export function collect<A>(
  ta: Iterable<A>,
): ReadonlyArray<A> {
  const result = new Array<A>();
  for (const a of ta) {
    result.push(a);
  }
  return result;
}

/**
 * @since 2.0.0
 */
export function take(n: number): <A>(ta: Iterable<A>) => Iterable<A> {
  return <A>(ta: Iterable<A>) =>
    iterable(function* () {
      let count = Math.floor(n);
      for (const a of ta) {
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
export function takeUntil<A>(
  predicate: Predicate<A>,
): (ta: Iterable<A>) => Iterable<A> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
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
): (ta: Iterable<A>) => Iterable<A> {
  return takeUntil((a) => !predicate(a));
}

/**
 * @since 2.0.0
 */
export function repeat(
  n: number,
): <A>(ta: Iterable<A>) => Iterable<A> {
  return <A>(ta: Iterable<A>) =>
    iterable(function* () {
      let index = n;
      while (index-- > 0) {
        for (const a of ta) {
          yield a;
        }
      }
    });
}

/**
 * @since 2.0.0
 */
export function init<A>(): Iterable<A> {
  return iterable(function* () {});
}

/**
 * @since 2.0.0
 */
export function combine<A>(
  second: Iterable<A>,
): (first: Iterable<A>) => Iterable<A> {
  return (first) =>
    iterable(function* () {
      for (const fst of first) {
        yield fst;
      }
      for (const snd of second) {
        yield snd;
      }
    });
}

/**
 * @since 2.0.0
 */
export function getCombinable<A>(): Combinable<Iterable<A>> {
  return { combine };
}

/**
 * @since 2.0.0
 */
export function getInitializable<A>(): Initializable<Iterable<A>> {
  return { init, combine };
}

/**
 * @since 2.0.0
 */
export function getShowable<A>(S: Showable<A>): Showable<Iterable<A>> {
  return {
    show: (ua) => `Iterable[${Array.from(ua).map(S.show).join(", ")}]`,
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableIterable: Applicable<KindIterable> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FlatmappableIterable: Flatmappable<KindIterable> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FilterableIterable: Filterable<KindIterable> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * @since 2.0.0
 */
export const FoldableIterable: Foldable<KindIterable> = { fold };

/**
 * @since 2.0.0
 */
export const MappableIterable: Mappable<KindIterable> = {
  map,
};

/**
 * @since 2.0.0
 */
export const WrappableIterable: Wrappable<KindIterable> = {
  wrap,
};

/**
 * @since 2.0.0
 */
export const tap: Tap<KindIterable> = createTap(FlatmappableIterable);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindIterable> = createBind(FlatmappableIterable);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindIterable> = createBindTo(FlatmappableIterable);
